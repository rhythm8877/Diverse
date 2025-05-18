import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

const ConnectivityContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  retry: () => {},
  showConnectivityAlert: () => {},
});

export const ConnectivityProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [hasAlerted, setHasAlerted] = useState(false);

  useEffect(() => {
    // Initial check
    const checkConnectivity = async () => {
      try {
        const state = await NetInfo.fetch();
        setIsConnected(state.isConnected);
        setIsInternetReachable(state.isInternetReachable !== false);
      } catch (error) {
        console.error('Error checking connectivity:', error);
      }
    };
    
    checkConnectivity();
    
    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', 
        state.isConnected ? 'Connected' : 'Disconnected', 
        state.isInternetReachable !== false ? 'Internet reachable' : 'Internet unreachable'
      );
      
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable !== false);
      
      // Reset alert state when connection is restored
      if (state.isConnected && state.isInternetReachable !== false) {
        setHasAlerted(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Function to manually retry connection
  const retry = async () => {
    try {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable !== false);
      return state.isConnected && state.isInternetReachable !== false;
    } catch (error) {
      console.error('Error retrying connectivity check:', error);
      return false;
    }
  };

  // Function to show connectivity alert
  const showConnectivityAlert = () => {
    if (hasAlerted) return; // Prevent multiple alerts
    
    setHasAlerted(true);
    Alert.alert(
      'Network Issue',
      'You appear to be offline. Some features may be unavailable. The app will automatically reconnect when your connection is restored.',
      [
        {
          text: 'Retry Now',
          onPress: async () => {
            const connected = await retry();
            if (!connected) {
              Alert.alert('Still Offline', 'Please check your internet connection and try again later.');
            } else {
              Alert.alert('Connected', 'Your connection has been restored.');
            }
          }
        },
        {
          text: 'OK',
          style: 'cancel',
        }
      ]
    );
  };

  // Only show connectivity alert when offline and not previously alerted
  useEffect(() => {
    if (!isConnected || !isInternetReachable) {
      showConnectivityAlert();
    }
  }, [isConnected, isInternetReachable]);

  return (
    <ConnectivityContext.Provider 
      value={{
        isConnected,
        isInternetReachable,
        retry,
        showConnectivityAlert,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
};

export default ConnectivityContext; 