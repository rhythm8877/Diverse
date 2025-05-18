import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, StatusBar, StyleSheet, Text, View } from 'react-native';
import AppointmentsScreen from './components/AppointmentsScreen';
import AudiologistSignupScreen from './components/AudiologistSignupScreen';
import BlogDetailScreen from './components/BlogDetailScreen';
import BlogsScreen from './components/BlogsScreen';
import BothSLPAudiologistScreen from './components/BothSLPAudiologistScreen';
import CalendarScreen from './components/CalendarScreen';
import ClientSignupScreen from './components/ClientSignupScreen';
import DocumentUploadScreen from './components/DocumentUploadScreen';
import HomeScreen from './components/HomeScreen';
import LoginScreen from './components/LoginScreen';
import NotificationsScreen from './components/NotificationsScreen';
import PermissionCheckScreen from './components/PermissionCheckScreen';
import ProfileScreen from './components/ProfileScreen';
import SLPSignupScreen from './components/SLPSignupScreen';
import SignupScreen from './components/SignupScreen';
import SplashScreen from './components/SplashScreen';
import TherapistsScreen from './components/TherapistsScreen';
import { auth } from './config/firebase';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { NotificationProvider } from './context/NotificationContext';
import { UserProvider, useUser } from './context/UserContext';
import { COLORS } from './utils/theme';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Require cycle',
  'Setting a timer',
  'Non-serializable values were found in the navigation state'
]);

// Create stack and tab navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production, you might want to log this to a service
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text style={styles.errorHint}>
            Please try restarting the app
          </Text>
          <Text style={styles.debugText}>{this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Auth wrapper component to prevent unauthorized access
const AuthenticatedNavigator = ({ children, navigation }) => {
  const { isLoggedIn } = useUser();
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isLoggedIn, navigation]);
  
  return children;
};

// Main tab navigator component
function MainTabNavigator() {
  const { userData } = useUser();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.primaryLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: COLORS.primary + '40',
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 6,
          height: 65,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Blogs"
        component={BlogsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

// Wrapper for MainTabNavigator that ensures authentication
function AuthenticatedMainNavigator({ navigation }) {
  return (
    <AuthenticatedNavigator navigation={navigation}>
      <MainTabNavigator />
    </AuthenticatedNavigator>
  );
}

function App() {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  // Check if Firebase auth is initialized
  useEffect(() => {
    const checkFirebase = () => {
      if (auth) {
        setIsFirebaseInitialized(true);
      } else {
        // Limit retry attempts to avoid infinite loops
        if (initializationAttempts < MAX_ATTEMPTS) {
          setInitializationAttempts(prev => prev + 1);
          setTimeout(checkFirebase, 1000);
        } else {
          // After max attempts, proceed anyway to avoid being stuck
          setIsFirebaseInitialized(true);
        }
      }
    };
    
    checkFirebase();
  }, [initializationAttempts]);

  // If Firebase is not initialized, show a loading state
  if (!isFirebaseInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.debugText}>Waiting for Firebase...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ConnectivityProvider>
        <UserProvider>
          <NotificationProvider>
            <NavigationContainer>
              <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
              <Stack.Navigator 
                initialRouteName="Splash"
                screenOptions={{ 
                  headerShown: false,
                  cardStyle: { backgroundColor: '#F8FAF9' } 
                }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="ClientSignup" component={ClientSignupScreen} />
                <Stack.Screen name="SLPSignup" component={SLPSignupScreen} />
                <Stack.Screen name="AudiologistSignup" component={AudiologistSignupScreen} />
                <Stack.Screen name="BothSLPAudiologist" component={BothSLPAudiologistScreen} />
                <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
                <Stack.Screen name="Main" component={AuthenticatedMainNavigator} />
                <Stack.Screen name="BlogDetail" component={BlogDetailScreen} />
                <Stack.Screen name="Therapists" component={TherapistsScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Appointments" component={AppointmentsScreen} />
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="PermissionCheck" component={PermissionCheckScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </NotificationProvider>
        </UserProvider>
      </ConnectivityProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAF9',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    color: COLORS.textMedium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: 10,
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

export default App;
