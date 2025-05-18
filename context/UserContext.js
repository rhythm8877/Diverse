import NetInfo from '@react-native-community/netinfo';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    doc,
    getDoc,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, firestore } from '../config/firebase';

// Create the user context with default values
const UserContext = createContext({
  isLoggedIn: false,
  user: null,
  userData: null,
  loading: true,
  error: null,
  isOnline: true,
  login: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
});

// Provider component that wraps the app
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [dataFetchAttempted, setDataFetchAttempted] = useState(false);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newIsOnline = state.isConnected && (state.isInternetReachable !== false);
      setIsOnline(newIsOnline);
      
      // If coming back online and we have user auth but no data, try to fetch data
      if (newIsOnline && user && !userData) {
        fetchUserData(user.uid);
      }
    });

    // Initial check
    NetInfo.fetch().then(state => {
      const initialIsOnline = state.isConnected && (state.isInternetReachable !== false);
      setIsOnline(initialIsOnline);
    });

    return () => unsubscribe();
  }, [user, userData]);

  // This function is used to fetch user data with retries
  const fetchUserProfileWithRetry = async (uid, maxRetries = 3) => {
    let lastError = null;
    
    // For newly registered users, add extra initial delay
    // This helps when a user has just registered and Firebase hasn't fully propagated the data
    const isNewRegistration = !userData && user && user.uid === uid;
    if (isNewRegistration) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const userDocRef = doc(firestore, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          return userDoc.data();
        } else {
          // On the last attempt, check if the user might be in the process of being created
          if (attempt === maxRetries) {
            // Give the system extra time to complete registration if this is a new user
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const finalDoc = await getDoc(userDocRef);
            if (finalDoc.exists()) {
              return finalDoc.data();
            }
          } else {
            // Wait a bit longer between retries
            const delay = attempt * 1500; // Increase delay with each retry
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        lastError = error;
        
        // Only retry on network errors or resource exhausted, not permission errors
        if (error.code === 'unavailable' || 
            error.code === 'network-request-failed' ||
            error.code === 'resource-exhausted') {
          const delay = attempt * 1500;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (error.code === 'permission-denied') {
          // Don't retry on permission errors - it will likely fail again
          throw new Error('You do not have permission to access this profile. Please try logging out and back in.');
        } else {
          break; // Don't retry on other errors
        }
      }
    }
    
    // If we got here, all retries failed
    // For new registrations, try one last time with a very long delay
    if (isNewRegistration) {
      try {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const userDocRef = doc(firestore, 'users', uid);
        const finalDoc = await getDoc(userDocRef);
        if (finalDoc.exists()) {
          return finalDoc.data();
        }
      } catch (finalError) {
        // Silent error handling
      }
    }
    
    throw lastError || new Error('Failed to fetch user profile after multiple attempts');
  };

  // Function to fetch user data that can be called when network reconnects
  const fetchUserData = async (uid) => {
    if (!uid || !firestore) return;
    
    try {
      const userData = await fetchUserProfileWithRetry(uid);
      setUserData(userData);
      setError(null);
      return userData; // Return the data so callers can use it
    } catch (error) {
      setError('User profile not found. Please try signing in again.');
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setError('Firebase authentication is not available');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        // Always update the user state immediately
        setUser(user);
        
        if (user) {
          try {
            // Check online status before attempting Firestore fetch
            const netInfoState = await NetInfo.fetch();
            const online = netInfoState.isConnected && netInfoState.isInternetReachable;
            
            if (!online) {
              setError('You appear to be offline. Some features may be unavailable.');
              
              // If we have cached user data, stay logged in
              if (userData) {
                setDataFetchAttempted(true);
                setLoading(false);
                return;
              }
              
              // Only force logout if no cached data
              setUser(null);
              setDataFetchAttempted(true);
              setLoading(false);
              return;
            }
            
            // Fetch user data from Firestore with retry
            try {
              const userData = await fetchUserProfileWithRetry(user.uid);
              setUserData(userData);
              setDataFetchAttempted(true);
              setError(null); // Clear any previous errors
            } catch (fetchError) {
              setUserData(null);
              setDataFetchAttempted(true);
              
              // Check if this is a permission error or a "not found" error
              if (fetchError.code === 'permission-denied') {
                setError('Permission error: Unable to access your profile data. Please log out and log in again.');
              } else {
                // More user-friendly message for "profile not found" case
                if (fetchError.message && fetchError.message.includes('not found')) {
                  setError('Your profile is still being set up. Please wait a moment and try again, or log out and log back in.');
                  
                  // Schedule one more profile fetch attempt after a few seconds
                  setTimeout(() => {
                    if (auth.currentUser) {
                      fetchUserData(auth.currentUser.uid);
                    }
                  }, 5000);
                } else {
                  setError('Unable to load your profile data. Please try again later.');
                }
              }
            }
          } catch (error) {
            setDataFetchAttempted(true);
            setLoading(false);
            
            if (error.code === 'unavailable' || error.code === 'failed-precondition') {
              setError('Cannot access your profile data while offline');
              if (!userData) {
                setUser(null);
              }
            } else {
              setError('Error loading profile: ' + error.message);
            }
          }
        } else {
          // User logged out or no user
          setUserData(null);
          setDataFetchAttempted(true);
        }
        
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      setError('Error setting up authentication listener');
      setLoading(false);
    }
  }, []);

  // Retry fetching user data when coming back online
  useEffect(() => {
    if (isOnline && user && dataFetchAttempted && !userData) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserData(userData);
            setError(null);
          } else {
            setError('User profile not found. Please contact support.');
          }
        } catch (error) {
          setError('Failed to fetch user data: ' + error.message);
        }
      };
      
      fetchUserData();
    }
  }, [isOnline, user, dataFetchAttempted, userData]);
  
  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check internet connection before attempting login
      const netInfoState = await NetInfo.fetch();
      if (!netInfoState.isConnected || !netInfoState.isInternetReachable) {
        // Try up to 3 times with exponential backoff instead of failing immediately
        let retryCount = 0;
        const maxRetries = 3;
        let networkAvailable = false;
        
        while (retryCount < maxRetries && !networkAvailable) {
          // Wait longer between each retry
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Check connection again
          const retryNetInfo = await NetInfo.fetch();
          networkAvailable = retryNetInfo.isConnected && retryNetInfo.isInternetReachable !== false;
          
          if (networkAvailable) {
            break;
          }
          
          retryCount++;
        }
      }
      
      // Attempt to sign in
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Set user right away to avoid race conditions
      setUser(result.user);
      
      // Verify we can access user data
      const userDocRef = doc(firestore, 'users', result.user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // User authenticated but no profile data exists
          setLoading(false);
          throw new Error('profile-not-found');
        }
        
        // Manually set user data to avoid waiting for onAuthStateChanged
        const userData = userDoc.data();
        setUserData(userData);
      } catch (docError) {
        // If this is a network error, we'll still allow the login to proceed
        // The auth state listener will try to fetch the profile later when online
        if (docError.code === 'unavailable' || docError.code === 'failed-precondition') {
          // We still consider this a successful login since the user authenticated
          setLoading(false);
          return result;
        }
        // Otherwise, rethrow the original error
        setLoading(false);
        throw docError;
      }
      
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      
      // If this is a network error during auth, we'll throw a more specific error
      if (error.code === 'auth/network-request-failed') {
        throw new Error('network-error');
      }
      
      throw error;
    }
  };
  
  // Logout function
  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase authentication is not available');
    }

    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };
  
  // Update profile function
  const updateProfile = async (profileData) => {
    if (!auth || !user) {
      throw new Error('User not authenticated');
    }

    if (!firestore) {
      throw new Error('Firestore is not available');
    }
    
    // Check connection before attempting to update
    const netInfoState = await NetInfo.fetch();
    if (!netInfoState.isConnected || !netInfoState.isInternetReachable) {
      throw new Error('You are offline. Please connect to the internet and try again.');
    }

    try {
      setError(null);
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });
        
      setUserData(prevData => ({
        ...prevData,
        ...profileData
      }));
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };
  
  // Context value
  const value = {
    isLoggedIn: !!user && !!userData, // Only consider logged in if we have user data
    user,
    userData,
    loading,
    error,
    isOnline,
    login,
    logout,
    updateProfile,
    fetchUserData,
  };
  
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
