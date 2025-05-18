import React, { createContext, useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Create a context for network status
const NetworkContext = createContext({
  isOnline: true,
  updateFirebaseStatus: () => {},
  retryConnection: () => {},
});

// Custom hook to use the network context
export const useNetwork = () => useContext(NetworkContext);

// Provider component
export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    // Check initial connection
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  const updateFirebaseStatus = (status) => {
    setFirebaseInitialized(status);
  };

  const retryConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      setIsOnline(state.isConnected && state.isInternetReachable);
    } catch (error) {
      console.log('Error checking connection:', error);
    }
  };

  return (
    <NetworkContext.Provider 
      value={{ 
        isOnline, 
        updateFirebaseStatus,
        retryConnection
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// Error overlay component for Firebase connection issues
export const FirebaseErrorOverlay = ({ onRetry }) => {
  return (
    <View style={styles.errorOverlay}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>
          Unable to connect to the server. Please check your internet connection and try again.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NetworkContext;
