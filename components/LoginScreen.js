import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert
} from 'react-native';
import { getBottomSpacing, getKeyboardBehavior, getKeyboardVerticalOffset, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import { useUser } from '../context/UserContext';
import { useConnectivity } from '../context/ConnectivityContext';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation, route }) => {
  const { login, loading: authLoading, isLoggedIn, error: contextError } = useUser();
  const { isConnected, isInternetReachable, retry } = useConnectivity();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Check if user was redirected from successful registration
  useEffect(() => {
    if (route.params?.registrationSuccess) {
      setSuccess('Registration successful! Please login with your credentials.');
      
      // Clear success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [route.params]);

  // Show context errors if they exist
  useEffect(() => {
    if (contextError) {
      console.log('Context error detected:', contextError);
      setError(contextError);
    }
  }, [contextError]);

  // Redirect to HomeScreen after login
  useEffect(() => {
    console.log('Login screen: isLoggedIn =', isLoggedIn);
    if (isLoggedIn) {
      console.log('User is logged in, navigating to Main');
      // Small delay to ensure user context is fully updated
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 500);
    }
  }, [isLoggedIn, navigation]);

  // Check if we're coming from registration with pre-filled email
  useEffect(() => {
    if (route.params?.registeredEmail) {
      console.log('User just registered with email:', route.params.registeredEmail);
      setEmail(route.params.registeredEmail);
      setSuccess('Registration successful! Please sign in with your credentials.');
      
      // Focus password field after a short delay
      setTimeout(() => {
        // We would focus on password input here if we had a ref,
        // but for simplicity we'll just log that we'd do that
        console.log('Would focus password field');
      }, 500);
    }
  }, [route.params?.registeredEmail]);

  // Auto-retry login when network is restored
  useEffect(() => {
    if (isRetrying && isConnected && isInternetReachable) {
      console.log('Network connection restored, retrying login');
      
      const attemptRetry = async () => {
        if (!email || !password) return;
        
        setLoading(true);
        setError('Attempting to reconnect...');
        
        try {
          await login(email, password);
          console.log('Retry login successful');
          setSuccess('Login successful!');
          setError('');
          setIsRetrying(false);
        } catch (retryError) {
          console.error('Retry login failed:', retryError);
          setError('Login failed after reconnecting. Please try again.');
          setIsRetrying(false);
        } finally {
          setLoading(false);
        }
      };
      
      attemptRetry();
    }
  }, [isConnected, isInternetReachable, isRetrying, email, password]);

  const handleLogin = async () => {
    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    // Check connectivity before attempting login
    if (!isConnected || !isInternetReachable) {
      console.log('Device appears to be offline, attempting login anyway');
      setError('You appear to be offline. Attempting login anyway...');
      // Still continue with login as Firebase may have offline capabilities
    }
    
    setLoading(true);
    setError('');
    setLoginAttempts(prevAttempts => prevAttempts + 1);
    
    try {
      console.log('LoginScreen: Attempting to log in...');
      await login(email, password);
      
      // If we get here, login was successful
      console.log('LoginScreen: Login successful');
      setSuccess('Login successful!');
      setIsRetrying(false);
      
      // Clear success message after navigation
      setTimeout(() => {
        setSuccess('');
      }, 2000);
      
      // Navigation will happen via the useEffect when isLoggedIn changes
    } catch (error) {
      console.error('LoginScreen: Login failed:', error);
      let errorMessage = 'An error occurred during login';
      let shouldRetry = false;
      
      // Check for custom errors from UserContext first
      if (error.message === 'offline' || error.message === 'network-error') {
        errorMessage = 'Network issue detected. The app will automatically retry when your connection is restored.';
        shouldRetry = true;
      } else if (error.message === 'profile-not-found') {
        errorMessage = 'Your user profile is missing. Please contact support.';
      } else {
        // Handle Firebase auth errors
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Wrong email or password';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network issue detected. The app will automatically retry when your connection is restored.';
            shouldRetry = true;
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Try again later or reset your password';
            break;
          default:
            console.error('Unhandled login error:', error);
            if (error.message && error.message.includes('network')) {
              errorMessage = 'Network issue detected. The app will automatically retry when your connection is restored.';
              shouldRetry = true;
            } else {
              errorMessage = error.message || 'Authentication failed. Please try again.';
            }
        }
      }
      
      setError(errorMessage);
      
      // Set retrying state so we automatically retry when network is restored
      if (shouldRetry) {
        console.log('Network error detected, will retry login when connection is restored');
        setIsRetrying(true);
      }
      
      // If multiple failed attempts and not network issue, suggest registration
      if (loginAttempts >= 2 && !shouldRetry) {
        setTimeout(() => {
          Alert.alert(
            'Having trouble signing in?',
            'If you don\'t have an account yet, would you like to create one?',
            [
              {
                text: 'No, try again',
                style: 'cancel'
              },
              {
                text: 'Create Account',
                onPress: () => navigation.navigate('Signup')
              }
            ]
          );
        }, 500);
      }
    } finally {
      if (!isRetrying) {
        setLoading(false);
      }
    }
  };
  
  const handleRetryNow = async () => {
    // Manual retry button handler
    await retry(); // Check network status
    
    if (isConnected && isInternetReachable) {
      setError('Connection restored. Attempting login...');
      handleLogin();
    } else {
      setError('Still offline. The app will retry automatically when connection is restored.');
    }
  };
  
  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const navigateToRegister = () => {
    navigation.navigate('Signup');
  };

  return (
    <KeyboardAvoidingView 
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getKeyboardVerticalOffset()}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.jpeg')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.appName}>Diverse</Text>
        </View>
        
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('Network') && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetryNow}>
                <Text style={styles.retryButtonText}>Retry Now</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        
        {!isConnected && !error ? (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>You appear to be offline. Some features may be limited.</Text>
          </View>
        ) : null}
        
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, error && error.includes('email') ? styles.inputError : null]}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.passwordContainer, error && error.includes('password') ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
              />
              <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color={COLORS.textMedium} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading || authLoading}
          >
            {loading || authLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: getBottomSpacing() + 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: scaledFontSize(24),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 10,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: scaledFontSize(24),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
  },
  errorContainer: {
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  warningContainer: {
    backgroundColor: '#FFF8E8',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  warningText: {
    color: '#CC7700',
    fontSize: scaledFontSize(14),
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#E8FFE8',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  successText: {
    color: '#008800',
    fontSize: scaledFontSize(14),
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: scaledFontSize(14),
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: scaledFontSize(12),
    fontWeight: 'bold',
  },
  formContainer: {
    marginHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: scaledFontSize(14),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    ...SHADOWS.light,
  },
  inputError: {
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    ...SHADOWS.light,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: scaledFontSize(16),
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: 12,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
  },
  signupText: {
    fontSize: scaledFontSize(14),
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default LoginScreen;
