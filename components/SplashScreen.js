import NetInfo from '@react-native-community/netinfo';
import { hideAsync } from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { auth } from '../config/firebase';
import { IS_TABLET, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';

const { width } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigationTimer = useRef(null);
  const fallbackTimer = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');
  const [logoError, setLogoError] = useState(false);

  // Ensure Firebase is initialized before navigating
  const navigateToLogin = () => {
    if (navigationAttempted) return; // Prevent multiple navigation attempts
    
    setNavigationAttempted(true);
    setDebugMessage('Navigating to Login...');
    
    // Try to navigate with various methods
    try {
      navigation.replace('Login');
    } catch (error) {
      setDebugMessage('Navigation error, trying fallback...');
      // First fallback - reset navigation
      setTimeout(() => {
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } catch (fallbackError) {
          setDebugMessage('Fallback navigation failed.');
          // Second fallback - simple navigate
          setTimeout(() => {
            try {
              navigation.navigate('Login');
            } catch (finalError) {
              // Last resort - if all navigation attempts fail
              // Just wait longer and try again
              setTimeout(() => {
                try {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                } catch (e) {
                  // We've tried everything, app may need restart
                }
              }, 2000);
            }
          }, 1000);
        }
      }, 1000);
    }
  };

  // Run the splash screen animations
  useEffect(() => {
    // Check internet connectivity
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    // Hide the native splash screen if it's still visible
    hideAsync().catch(() => {
      // Silently handle error - no need to show to users
    });

    // Start animations
    Animated.sequence([
      // Fade in first
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Then scale up the logo
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Wait longer to ensure Firebase is initialized
    navigationTimer.current = setTimeout(() => {
      // Check if Firebase auth is initialized
      if (auth) {
        navigateToLogin();
      } else {
        setDebugMessage('Firebase not ready, waiting...');
        // Wait a bit longer for Firebase to initialize
        setTimeout(() => {
          navigateToLogin();
        }, 2000);
      }
    }, 3500); // Increased from 2500 to 3500ms
    
    // Fallback: if still on splash after 6 seconds, force navigation
    fallbackTimer.current = setTimeout(() => {
      if (!navigationAttempted) {
        setDebugMessage('Fallback: Forcing navigation to Login.');
        navigateToLogin();
      }
    }, 6000);
    
    return () => {
      if (navigationTimer.current) {
        clearTimeout(navigationTimer.current);
      }
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
      }
    };
  }, [logoAnim, scaleAnim, textAnim, fadeAnim, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.animatedContainer, 
          { 
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: logoAnim }
            ] 
          }
        ]}
      >
        {!logoError ? (
          <Image 
            source={require('../assets/logo.jpeg')} 
            style={styles.logo}
            resizeMode="contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <View style={[styles.logo, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary + '22' }] }>
            <Text style={{ color: COLORS.primary, fontSize: 24 }}>Logo</Text>
          </View>
        )}
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.textContainer,
          {
            opacity: textAnim,
          }
        ]}
      >
        <Text style={styles.title}>Diverse</Text>
        <Text style={styles.subtitle}>Speech Therapy Services</Text>
      </Animated.View>
      
      {!isConnected && (
        <Text style={styles.offlineNotice}>
          You appear to be offline. Some features may be limited.
        </Text>
      )}
      {/* Subtle debug message, only visible if something is wrong */}
      {!!debugMessage && (
        <Text style={styles.debugText}>{debugMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white, // Use white background for clean look
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    ...SHADOWS.medium,
  },
  logo: {
    width: IS_TABLET ? 180 : 140,
    height: IS_TABLET ? 180 : 140,
    borderRadius: IS_TABLET ? 90 : 70,
    backgroundColor: COLORS.white,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: scaledFontSize(36),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: scaledFontSize(18),
    color: COLORS.textMedium,
    textAlign: 'center',
    maxWidth: '80%',
  },
  offlineNotice: {
    position: 'absolute',
    bottom: 30,
    color: COLORS.error,
    fontSize: scaledFontSize(14),
    textAlign: 'center',
    padding: 10,
  },
  debugText: {
    position: 'absolute',
    bottom: 5,
    color: COLORS.textMedium,
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
    width: '100%',
  },
});

export default SplashScreen;
