import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, AppState } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../utils/theme';
import { IS_TABLET, scaledFontSize, getStatusBarHeight } from '../utils/responsive';
import { firestore } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Key for AsyncStorage
const THERAPIST_REQUEST_STATUS_KEY = 'diverse_therapist_request_status';

// Add this function at the top level, outside of the component
const loadStoredRequestStatuses = async (userId) => {
  if (!userId) {
    return { pendingRequests: {}, acceptedRequests: {}, rejectedTherapists: {} };
  }
  
  try {
    const storedData = await AsyncStorage.getItem(`${THERAPIST_REQUEST_STATUS_KEY}_${userId}`);
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (parsedData && typeof parsedData === 'object') {
          // Ensure all required properties exist
          const result = {
            pendingRequests: parsedData.pendingRequests || {},
            acceptedRequests: parsedData.acceptedRequests || {},
            rejectedTherapists: parsedData.rejectedTherapists || {}
          };
          
          return result;
        }
      } catch (parseError) {
        console.error('Error parsing stored request data:', parseError);
      }
    }
  } catch (error) {
    console.error('Error loading stored request statuses:', error);
  }
  
  // Default state - all therapists will show "Apply" button
  return { 
    pendingRequests: {}, 
    acceptedRequests: {}, 
    rejectedTherapists: {} 
  };
};

const TherapistsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('speech');
  const [speechTherapists, setSpeechTherapists] = useState([]);
  const [audiologists, setAudiologists] = useState([]);
  const [bothTherapists, setBothTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTherapistId, setLoadingTherapistId] = useState('');
  const [therapistStatuses, setTherapistStatuses] = useState({
    pendingRequests: {},
    acceptedRequests: {},
    rejectedTherapists: {}
  });
  const [shouldPreserveTemporaryRequests, setShouldPreserveTemporaryRequests] = useState(true);
  const { userData, isLoggedIn, user } = useUser();
  const { notifications, refreshNotifications } = useNotifications();
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isLoggedIn, navigation]);

  useEffect(() => {
    if (!user?.uid) return;
    
    fetchTherapists();
    
    if (user?.uid) {
      // Show loading while we get the initial data
      setLoading(true);
      
      // First try to load from AsyncStorage for faster initial display
      loadStoredRequestStatuses(user.uid).then(storedStatuses => {
        // Set the initial state from AsyncStorage
        setTherapistStatuses(storedStatuses);
        
        // Then refresh from Firestore to get the latest data
        refreshTherapistStatuses().then(() => {
          // Now specifically check for accepted requests
          checkAcceptedRequests().catch(err => {
            console.error('Error checking accepted requests:', err);
          });
        }).catch(err => {
          console.error('Error during initial Firestore refresh:', err);
        });
      }).catch(err => {
        console.error('Error loading stored statuses:', err);
        
        // If we fail to load from AsyncStorage, just refresh from Firestore
        refreshTherapistStatuses();
      }).finally(() => {
        // Make sure loading is cleared even if there's an error
        setLoading(false);
      });
    }
  }, [user?.uid]);

  // Replace interval check with Firebase listeners for real-time updates
  useEffect(() => {
    if (!user?.uid) return;
    
    // Initial load - do a single refresh on mount
    refreshTherapistStatuses();
    
    // Set up a listener for when notifications change in Firestore
    const notificationsRef = collection(firestore, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('clientId', '==', user.uid)
    );
    
    // Subscribe to notifications changes to update button states
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      // Check if there's a real change (not just a local one)
      let hasRealChange = false;
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
          hasRealChange = true;
        }
      });
      
      if (hasRealChange) {
        refreshTherapistStatuses();
      }
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });
    
    // Set up a listener for when appointments change in Firestore
    const appointmentsRef = collection(firestore, 'appointments');
    const appointmentsQuery = query(
      appointmentsRef,
      where('clientId', '==', user.uid)
    );
    
    // Subscribe to appointments changes 
    const appointmentsUnsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
      // Check if there's a real change (not just a local one)
      let hasRealChange = false;
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
          hasRealChange = true;
        }
      });
      
      if (hasRealChange) {
        refreshTherapistStatuses();
      }
    }, (error) => {
      console.error('Error in appointments listener:', error);
    });
    
    // Return cleanup function
    return () => {
      unsubscribe();
      appointmentsUnsubscribe();
    };
  }, [user?.uid]);
  
  // Only do a refresh when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        refreshTherapistStatuses();
      }
    }, [user?.uid])
  );

  // Handle Apply button click
  const handleApply = async (therapist) => {
    if (!user?.uid || !userData) {
      Alert.alert('Login Required', 'Please login to request an appointment.');
      return;
    }
    
    if (userData.userType !== 'CLIENT') {
      Alert.alert('Client Only', 'Only clients can request appointments with therapists.');
      return;
    }
    
    // Safety check for therapistStatuses
    const safeTherapistStatuses = {
      pendingRequests: therapistStatuses?.pendingRequests || {},
      acceptedRequests: therapistStatuses?.acceptedRequests || {},
      rejectedTherapists: therapistStatuses?.rejectedTherapists || {}
    };
    
    // Check if already pending
    if (safeTherapistStatuses.pendingRequests[therapist.id]) {
      Alert.alert('Request Pending', 'Your appointment request is already pending. The therapist will respond soon.');
      return;
    }
    
    // Check if already accepted (has appointment)
    if (safeTherapistStatuses.acceptedRequests[therapist.id]) {
      Alert.alert('Appointment Scheduled', 'You already have an appointment scheduled with this therapist.');
      navigation.navigate('Appointments');
      return;
    }
    
    // Set loading state for just this therapist's button
    setLoadingTherapistId(String(therapist.id));
    
    try {
      // Create notification data for the therapist
      const notificationData = {
        type: 'appointment_request',
        senderId: user.uid,
        senderName: userData.name || 'A client',
        senderType: userData.userType,
        recipientId: therapist.id,
        status: 'unread',
        message: `${userData.name || 'A client'} has requested an appointment`,
        createdAt: serverTimestamp(),
        therapistId: therapist.id,
        therapistName: therapist.name,
        therapistGender: therapist.gender || 'Not specified',
        therapistType: therapist.userType || 'Therapist',
        therapistExpertise: getExpertiseText(therapist),
        therapistProfileImage: therapist.profileImageUrl,
        clientId: user.uid,
        clientName: userData.name || 'Anonymous Client',
        clientAge: userData.age || 'Not specified',
        clientGender: userData.gender || 'Not specified',
        clientComplaint: userData.complaint || 'Not specified',
        clientProfileImage: userData.profileImageUrl
      };
      
      // Send notification to Firestore
      const notificationRef = await addDoc(collection(firestore, 'notifications'), notificationData);
      
      // Update our local state to immediately reflect the pending status
      const updatedStatuses = { ...safeTherapistStatuses };
      
      // Add to pending
      updatedStatuses.pendingRequests[therapist.id] = {
        requestId: notificationRef.id,
        timestamp: new Date().toISOString(),
        therapistName: therapist.name,
        // Add a flag to indicate this is a new request
        isNewRequest: true
      };
      
      // Remove from rejected if applicable
      if (updatedStatuses.rejectedTherapists[therapist.id]) {
        delete updatedStatuses.rejectedTherapists[therapist.id];
      }
      
      setTherapistStatuses(updatedStatuses);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        `${THERAPIST_REQUEST_STATUS_KEY}_${user.uid}`,
        JSON.stringify(updatedStatuses)
      );
      
      // Show success message
      Alert.alert('Request Sent', 'Your appointment request has been sent to the therapist.');
      
      // After a short delay, do one refresh to ensure we have the latest data
      // This gives Firestore time to update
      setTimeout(() => {
        refreshTherapistStatuses().catch(err => {
          console.error('Background refresh error:', err);
        });
      }, 2000);
    } catch (error) {
      console.error('Error sending appointment request:', error);
      Alert.alert('Error', 'Failed to send appointment request. Please try again.');
    } finally {
      // Reset the loading state for this therapist's button
      setLoadingTherapistId('');
    }
  };

  // Create a single function to refresh all therapist statuses from Firestore
  const refreshTherapistStatuses = async () => {
    if (!user?.uid) return;
    
    try {
      // Create a fresh status object to directly reflect backend state
      const newStatuses = {
        pendingRequests: {},
        acceptedRequests: {},
        rejectedTherapists: {}
      };
      
      // ===== STEP 1: Get the MOST RECENT notification for EACH therapist =====
      
      // Get ALL notifications for this client (request, accepted, rejected)
      const allNotificationsQuery = query(
        collection(firestore, 'notifications'),
        where('clientId', '==', user.uid),
        where('type', 'in', ['appointment_request', 'appointment_accepted', 'appointment_rejected']),
        orderBy('createdAt', 'desc')
      );
      
      const allNotificationsSnapshot = await getDocs(allNotificationsQuery);
      
      // Object to track the most recent notification for each therapist
      const mostRecentNotifications = {};
      
      // Process all notifications to find the most recent for each therapist
      allNotificationsSnapshot.forEach(doc => {
        const notification = doc.data();
        if (!notification.therapistId) return;
        
        const therapistId = notification.therapistId;
        const timestamp = notification.createdAt 
          ? (notification.createdAt.toDate ? notification.createdAt.toDate() : new Date(notification.createdAt.seconds * 1000))
          : new Date();
        
        // If we haven't seen this therapist yet, or this notification is newer
        if (!mostRecentNotifications[therapistId] || 
            timestamp > mostRecentNotifications[therapistId].timestamp) {
          
          mostRecentNotifications[therapistId] = {
            id: doc.id,
            type: notification.type,
            timestamp: timestamp,
            therapistName: notification.therapistName || 'Therapist'
          };
        }
      });
      
      // ===== STEP 2: Process each therapist's most recent notification =====
      // Now map each therapist to the appropriate state based on their most recent notification
      Object.entries(mostRecentNotifications).forEach(([therapistId, data]) => {
        if (data.type === 'appointment_request') {
          // PENDING: If most recent notification is a request
          newStatuses.pendingRequests[therapistId] = {
            requestId: data.id,
            timestamp: data.timestamp.toISOString(),
            therapistName: data.therapistName
          };
        } 
        else if (data.type === 'appointment_accepted') {
          // ACCEPTED: If most recent notification is accepted
          // (We'll check appointments collection later to get full details)
        }
        else if (data.type === 'appointment_rejected') {
          // REJECTED: If most recent notification is rejected
          newStatuses.rejectedTherapists[therapistId] = {
            timestamp: data.timestamp,
            reason: 'Request rejected'
          };
        }
      });
      
      // ===== STEP 3: Check for active appointments (these take precedence) =====
      // If there's an active appointment, it should be VIEW regardless of notifications
      const appointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('clientId', '==', user.uid)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const now = new Date();
      
      // Process all appointments - active ones override any notification state
      appointmentsSnapshot.forEach(doc => {
        const appointment = doc.data();
        if (!appointment.therapistId || !appointment.scheduledTime) return;
        
        const therapistId = appointment.therapistId;
        
        // Convert scheduledTime to Date
        const scheduledTime = appointment.scheduledTime.toDate 
          ? appointment.scheduledTime.toDate() 
          : new Date(appointment.scheduledTime.seconds * 1000);
          
        // Get or calculate end time
        let endTime;
        if (appointment.endTime) {
          endTime = appointment.endTime.toDate 
            ? appointment.endTime.toDate() 
            : new Date(appointment.endTime.seconds * 1000);
        } else {
          // Default to 1 hour after start time if no end time specified
          endTime = new Date(scheduledTime);
          endTime.setHours(endTime.getHours() + 1);
        }
        
        // Only consider appointments that haven't ended yet (using end time)
        if (endTime > now) {
          // Remove from other states if present
          if (newStatuses.pendingRequests[therapistId]) {
            delete newStatuses.pendingRequests[therapistId];
          }
          
          if (newStatuses.rejectedTherapists[therapistId]) {
            delete newStatuses.rejectedTherapists[therapistId];
          }
          
          // Add to accepted
          newStatuses.acceptedRequests[therapistId] = {
            appointmentTime: scheduledTime,
            endTime: endTime,
            therapistName: appointment.therapistName || 'Therapist'
          };
        }
      });
      
      // Update state with the final consolidated status
      setTherapistStatuses(newStatuses);
      
      // Save to AsyncStorage for persistence across app restarts
      await AsyncStorage.setItem(
        `${THERAPIST_REQUEST_STATUS_KEY}_${user.uid}`,
        JSON.stringify(newStatuses)
      );
      
      return newStatuses;
    } catch (error) {
      console.error('Error refreshing therapist statuses:', error);
      throw error;
    }
  };

  // Add this function to check for accepted appointment requests
  const checkAcceptedRequests = async () => {
    if (!user?.uid) return;
    
    try {
      // Query for accepted notifications
      const acceptedQuery = query(
        collection(firestore, 'notifications'),
        where('clientId', '==', user.uid),
        where('type', '==', 'appointment_accepted')
      );
      
      const acceptedSnapshot = await getDocs(acceptedQuery);
      
      if (!acceptedSnapshot.empty) {
        let hasChanges = false;
        const updatedPendingRequests = { ...therapistStatuses.pendingRequests };
        const updatedAcceptedRequests = { ...therapistStatuses.acceptedRequests };
        
        acceptedSnapshot.forEach(doc => {
          const acceptedData = doc.data();
          if (acceptedData.therapistId) {
            const therapistId = acceptedData.therapistId;
            
            // Check if this was a pending request that's now accepted
            if (updatedPendingRequests[therapistId]) {
              delete updatedPendingRequests[therapistId];
              hasChanges = true;
              
              // Check if we need to add to accepted requests (if not already there)
              if (!updatedAcceptedRequests[therapistId]) {
                // Get the appointment time from the notification if available
                let appointmentTime = null;
                let endTime = null;
                
                if (acceptedData.appointmentTime) {
                  appointmentTime = acceptedData.appointmentTime.toDate 
                    ? acceptedData.appointmentTime.toDate() 
                    : new Date(acceptedData.appointmentTime.seconds * 1000);
                  
                  // Set default end time 1 hour after start if not specified
                  if (acceptedData.endTime) {
                    endTime = acceptedData.endTime.toDate 
                      ? acceptedData.endTime.toDate() 
                      : new Date(acceptedData.endTime.seconds * 1000);
                  } else {
                    endTime = new Date(appointmentTime);
                    endTime.setHours(endTime.getHours() + 1);
                  }
                } else {
                  // If no appointment time in notification, use current time + 1 day as placeholder
                  appointmentTime = new Date();
                  appointmentTime.setDate(appointmentTime.getDate() + 1);
                  endTime = new Date(appointmentTime);
                  endTime.setHours(endTime.getHours() + 1);
                }
                
                // Add to accepted requests
                updatedAcceptedRequests[therapistId] = {
                  appointmentTime: appointmentTime,
                  endTime: endTime,
                  therapistName: acceptedData.therapistName || 'Therapist'
                };
                hasChanges = true;
              }
          }
        }
      });
        
        // Update state and save if changes were made
        if (hasChanges) {
          setTherapistStatuses(prev => ({
            ...prev,
            pendingRequests: updatedPendingRequests,
            acceptedRequests: updatedAcceptedRequests
          }));
          
          // Save to AsyncStorage
          await AsyncStorage.setItem(
            `${THERAPIST_REQUEST_STATUS_KEY}_${user.uid}`,
            JSON.stringify({
              pendingRequests: updatedPendingRequests,
              acceptedRequests: updatedAcceptedRequests,
              rejectedTherapists: therapistStatuses.rejectedTherapists
            })
          );
        }
      }
    } catch (error) {
      console.error('Error checking accepted requests:', error);
    }
  };
  
  const fetchTherapists = async () => {
    try {
      setLoading(true);
      
      // Helper function to normalize therapist data and ensure expertise is properly structured
      const normalizeTherapistData = (therapists) => {
        return therapists.map(therapist => {
          // Create a deep copy to avoid reference issues
          const normalizedTherapist = JSON.parse(JSON.stringify(therapist));
          
          // For SLP therapists (also apply to BOTH)
          if (normalizedTherapist.userType === 'SLP' || normalizedTherapist.userType === 'BOTH') {
            if (!normalizedTherapist.expertiseSLP || typeof normalizedTherapist.expertiseSLP !== 'object') {
              normalizedTherapist.expertiseSLP = {};
              
              // Check if there's a top-level expertise object to migrate
              if (normalizedTherapist.expertise && typeof normalizedTherapist.expertise === 'object') {
                // Migrate values to the new structure
                normalizedTherapist.expertiseSLP = {
                  childLanguageDisorder: normalizedTherapist.expertise.childLanguageDisorder || false,
                  adultLanguageDisorder: normalizedTherapist.expertise.adultLanguageDisorder || false,
                  childDisorderTypes: normalizedTherapist.expertise.childDisorderTypes || {},
                  adultDisorderTypes: normalizedTherapist.expertise.adultDisorderTypes || {}
                };
              } else {
                // Initialize with empty values
                normalizedTherapist.expertiseSLP = {
                  childLanguageDisorder: false,
                  adultLanguageDisorder: false,
                  childDisorderTypes: {},
                  adultDisorderTypes: {}
                };
              }
            }
            
            // Remove the document requirement for SLP users
            if (normalizedTherapist.documents) {
              // We don't need the documents field for therapists
              delete normalizedTherapist.documents;
            }
          }
          
          // For AUDIOLOGIST therapists (also apply to BOTH)
          if (normalizedTherapist.userType === 'AUDIOLOGIST' || normalizedTherapist.userType === 'BOTH') {
            if (!normalizedTherapist.expertiseAudiologist || typeof normalizedTherapist.expertiseAudiologist !== 'object') {
              normalizedTherapist.expertiseAudiologist = {};
              
              // Check if there's a top-level expertise object to migrate
              if (normalizedTherapist.expertise && typeof normalizedTherapist.expertise === 'object') {
                // Migrate values to the new structure
                normalizedTherapist.expertiseAudiologist = {
                  audiologicalTesting: normalizedTherapist.expertise.audiologicalTesting || false,
                  audioVisualTherapy: normalizedTherapist.expertise.audioVisualTherapy || false,
                  auditoryVerbalTherapy: normalizedTherapist.expertise.auditoryVerbalTherapy || false,
                  tinnitus: normalizedTherapist.expertise.tinnitus || false,
                  centralAuditoryProcessingDisorder: normalizedTherapist.expertise.centralAuditoryProcessingDisorder || false,
                  auditoryNeuropathySpectrumDisorder: normalizedTherapist.expertise.auditoryNeuropathySpectrumDisorder || false,
                  vestibularDisorder: normalizedTherapist.expertise.vestibularDisorder || false
                };
              } else {
                // Initialize with empty values
                normalizedTherapist.expertiseAudiologist = {
                  audiologicalTesting: false,
                  audioVisualTherapy: false,
                  auditoryVerbalTherapy: false,
                  tinnitus: false,
                  centralAuditoryProcessingDisorder: false,
                  auditoryNeuropathySpectrumDisorder: false,
                  vestibularDisorder: false
                };
              }
            }
          }
          
          return normalizedTherapist;
        });
      };
      
      try {
        // Query for SLPs
        const slpQuery = query(collection(firestore, 'users'), where('userType', '==', 'SLP'));
        const slpSnapshot = await getDocs(slpQuery);
        const slpData = slpSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSpeechTherapists(normalizeTherapistData(slpData));
        
        // Query for Audiologists
        const audioQuery = query(collection(firestore, 'users'), where('userType', '==', 'AUDIOLOGIST'));
        const audioSnapshot = await getDocs(audioQuery);
        const audioData = audioSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAudiologists(normalizeTherapistData(audioData));
        
        // Query for Both
        const bothQuery = query(collection(firestore, 'users'), where('userType', '==', 'BOTH'));
        const bothSnapshot = await getDocs(bothQuery);
        const bothData = bothSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBothTherapists(normalizeTherapistData(bothData));
      } catch (firebaseError) {
        console.error('Firebase error fetching therapists:', firebaseError);
        
        if (firebaseError.code === 'permission-denied') {
          Alert.alert(
            'Permission Error',
            'There is a security configuration issue with the app. Please contact the administrator to update Firebase security rules to allow reading therapist information.',
            [
              {
                text: 'OK',
                style: 'default'
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to load therapists. Please try again later.');
        }
        throw firebaseError; // Re-throw to be caught by outer catch
      }
      
    } catch (error) {
      console.error('Error fetching therapists:', error);
      // Error is already handled above
    } finally {
      setLoading(false);
    }
  };
  
  const getExpertiseText = (therapist) => {
    try {
      if (!therapist) return 'Not specified';
      
      // Create arrays to hold expertise strings
      let expertiseList = [];
      
      // Check if therapist has a top-level 'expertise' object (older format)
      if (therapist.expertise && typeof therapist.expertise === 'object') {
        
        // Handle all boolean expertise properties
        Object.keys(therapist.expertise).forEach(key => {
          if (therapist.expertise[key] === true && key !== 'adultDisorderTypes' && key !== 'childDisorderTypes') {
            // Format the key for better readability
            const formattedKey = key
              .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
              .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
            expertiseList.push(formattedKey);
          }
        });
        
        // Handle adult disorder types
        if (therapist.expertise.adultDisorderTypes && typeof therapist.expertise.adultDisorderTypes === 'object') {
          // Check if it's an array
          if (Array.isArray(therapist.expertise.adultDisorderTypes)) {
            // If it's an array, add each value directly
            therapist.expertise.adultDisorderTypes.forEach(type => {
              if (type && typeof type === 'string') {
                expertiseList.push(type);
              }
            });
          } else {
            // If it's an object with boolean values
            Object.keys(therapist.expertise.adultDisorderTypes).forEach(type => {
              if (therapist.expertise.adultDisorderTypes[type] === true) {
                expertiseList.push(type);
              }
            });
          }
        }
        
        // Handle child disorder types
        if (therapist.expertise.childDisorderTypes && typeof therapist.expertise.childDisorderTypes === 'object') {
          // Check if it's an array
          if (Array.isArray(therapist.expertise.childDisorderTypes)) {
            // If it's an array, add each value directly
            therapist.expertise.childDisorderTypes.forEach(type => {
              if (type && typeof type === 'string') {
                expertiseList.push(type);
              }
            });
          } else {
            // If it's an object with boolean values
            Object.keys(therapist.expertise.childDisorderTypes).forEach(type => {
              if (therapist.expertise.childDisorderTypes[type] === true) {
                expertiseList.push(type);
              }
            });
          }
        }
      }
      
      // Check for SLP expertise (new format)
      if (therapist.expertiseSLP && typeof therapist.expertiseSLP === 'object') {
        
        // Child language disorders
        if (therapist.expertiseSLP.childLanguageDisorder === true) {
          expertiseList.push('Child Language Disorders');
        }
        
        // Adult language disorders
        if (therapist.expertiseSLP.adultLanguageDisorder === true) {
          expertiseList.push('Adult Language Disorders');
        }
        
        // Handle child disorder types
        if (therapist.expertiseSLP.childDisorderTypes && typeof therapist.expertiseSLP.childDisorderTypes === 'object') {
          // Check if it's an array
          if (Array.isArray(therapist.expertiseSLP.childDisorderTypes)) {
            expertiseList.push(...therapist.expertiseSLP.childDisorderTypes.filter(Boolean));
          } else {
            // If it's an object with boolean or string values
            Object.entries(therapist.expertiseSLP.childDisorderTypes).forEach(([key, value]) => {
              if (value === true || (typeof value === 'string' && value.trim() !== '')) {
                expertiseList.push(typeof value === 'string' ? value : key);
              }
            });
          }
        }
        
        // Handle adult disorder types
        if (therapist.expertiseSLP.adultDisorderTypes && typeof therapist.expertiseSLP.adultDisorderTypes === 'object') {
          // Check if it's an array
          if (Array.isArray(therapist.expertiseSLP.adultDisorderTypes)) {
            expertiseList.push(...therapist.expertiseSLP.adultDisorderTypes.filter(Boolean));
          } else {
            // If it's an object with boolean or string values
            Object.entries(therapist.expertiseSLP.adultDisorderTypes).forEach(([key, value]) => {
              if (value === true || (typeof value === 'string' && value.trim() !== '')) {
                expertiseList.push(typeof value === 'string' ? value : key);
              }
            });
          }
        }
      }
      
      // Check for Audiologist expertise (new format)
      if (therapist.expertiseAudiologist && typeof therapist.expertiseAudiologist === 'object') {
        
        // Add all audiologist-specific expertise
        if (therapist.expertiseAudiologist.audiologicalTesting === true) {
          expertiseList.push('Audiological Testing');
        }
        if (therapist.expertiseAudiologist.audioVisualTherapy === true) {
          expertiseList.push('Audio-Visual Therapy');
        }
        if (therapist.expertiseAudiologist.auditoryVerbalTherapy === true) {
          expertiseList.push('Auditory Verbal Therapy');
        }
        if (therapist.expertiseAudiologist.tinnitus === true) {
          expertiseList.push('Tinnitus');
        }
        if (therapist.expertiseAudiologist.centralAuditoryProcessingDisorder === true) {
          expertiseList.push('Central Auditory Processing Disorder');
        }
        if (therapist.expertiseAudiologist.auditoryNeuropathySpectrumDisorder === true) {
          expertiseList.push('Auditory Neuropathy Spectrum Disorder');
        }
        if (therapist.expertiseAudiologist.vestibularDisorder === true) {
          expertiseList.push('Vestibular Disorder');
        }
      }
      
      // Return joined string or default
      if (expertiseList.length > 0) {
        return expertiseList.join(', ');
      }
      
      // Default fallback for string expertise (legacy)
      if (typeof therapist.expertise === 'string') {
        return therapist.expertise;
      }
      
      return 'Not specified';
    } catch (error) {
      console.error("Error in getExpertiseText:", error);
      return 'Not specified';
    }
  };
  
  const renderTherapistCard = (therapist) => {
    if (!therapist || !therapist.id) {
      console.warn('Therapist data invalid:', therapist);
      return null;
    }
    
    const isCurrentUserClient = userData?.userType === 'CLIENT';
    
    // Safety check to ensure we have valid therapistStatuses objects
    const safeTherapistStatuses = {
      pendingRequests: therapistStatuses?.pendingRequests || {},
      acceptedRequests: therapistStatuses?.acceptedRequests || {},
      rejectedTherapists: therapistStatuses?.rejectedTherapists || {}
    };
    
    // Convert to boolean values explicitly and log for debugging
    const isPending = Boolean(safeTherapistStatuses.pendingRequests[therapist.id]);
    const isAccepted = Boolean(safeTherapistStatuses.acceptedRequests[therapist.id]);
    const isRejected = Boolean(safeTherapistStatuses.rejectedTherapists[therapist.id]);
    const isLoading = loadingTherapistId === String(therapist.id);
    
    // Generate button text based on current status directly from backend data
    const getButtonText = () => {
      if (isLoading) return 'Applying...';
      if (isPending) return 'Pending'; // appointment_request
      if (isAccepted) return 'View';    // appointment_accepted + active appointment
      return 'Apply';                  // default or appointment_rejected
    };
    
    // Get button style based on current status
    const getButtonStyle = () => {
      if (isPending) return styles.pendingButton;
      if (isAccepted) return styles.viewButton;
      return styles.applyButton; // Default style is Apply button
    };
    
    // Handle button press based on status
    const handleButtonPress = () => {
      if (isLoading) {
        return;
      } else if (isPending) {
        Alert.alert('Request Pending', 'Your appointment request is pending. The therapist will respond soon.');
      } else if (isAccepted) {
        navigation.navigate('Appointments');
        } else {
        // For new applications or reapplications after rejection, call handleApply
        handleApply(therapist);
      }
    };
    
    // Calculate active opacity as a number
    const buttonActiveOpacity = isPending ? 1.0 : 0.7;
    
    return (
    <View key={therapist.id} style={styles.therapistCard}>
      <View style={styles.cardLeftSection}>
          {therapist.profileImageUrl ? (
        <Image 
              source={{ uri: therapist.profileImageUrl }} 
          style={styles.therapistImage}
              resizeMode="cover"
        />
          ) : (
            <View style={[styles.therapistImage, styles.placeholderImage]}>
              <Ionicons name="person" size={35} color={COLORS.primary} />
            </View>
          )}
        <View style={styles.therapistInfo}>
            <Text style={styles.therapistName}>{therapist.name || 'Unnamed Therapist'}</Text>
            <Text style={styles.therapistDetail}>Gender: {therapist.gender || 'Not specified'}</Text>
            <Text style={styles.therapistDetail}>Expertise: {String(getExpertiseText(therapist))}</Text>
            <Text style={styles.therapistDetail}>Qualification: {therapist.qualification || 'Not specified'}</Text>
          </View>
        </View>
        <View style={styles.cardRightSection}>
          {isCurrentUserClient && (
            <TouchableOpacity 
              style={[styles.applyButton, getButtonStyle()]}
              onPress={handleButtonPress}
              disabled={isLoading}
              activeOpacity={buttonActiveOpacity}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.applyButtonText}>
                  {getButtonText()}
                </Text>
              )}
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Therapists
        </Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'speech' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('speech')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'speech' && styles.activeTabButtonText
          ]}>Speech Therapists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'audio' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('audio')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'audio' && styles.activeTabButtonText
          ]}>Audiologists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'both' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('both')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'both' && styles.activeTabButtonText
          ]}>Both</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading therapists...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'speech' && speechTherapists.length === 0 && (
              <Text style={styles.noDataText}>No speech therapists available at the moment</Text>
            )}
            {activeTab === 'audio' && audiologists.length === 0 && (
              <Text style={styles.noDataText}>No audiologists available at the moment</Text>
            )}
            {activeTab === 'both' && bothTherapists.length === 0 && (
              <Text style={styles.noDataText}>No therapists with both specializations available at the moment</Text>
            )}
            
            {activeTab === 'speech' && speechTherapists.map(therapist => renderTherapistCard(therapist))}
            {activeTab === 'audio' && audiologists.map(therapist => renderTherapistCard(therapist))}
            {activeTab === 'both' && bothTherapists.map(therapist => renderTherapistCard(therapist))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: getStatusBarHeight() + 10,
    paddingBottom: 12,
    backgroundColor: COLORS.secondary,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryDark,
  },
  headerTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.secondaryDark,
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: scaledFontSize(16),
    fontWeight: '500',
    color: COLORS.textMedium,
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 18,
  },
  therapistCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: IS_TABLET ? 20 : 16,
    marginBottom: IS_TABLET ? 24 : 18,
    ...SHADOWS.light,
  },
  cardLeftSection: {
    flex: 3,
    flexDirection: 'row',
    borderRightWidth: 1,
    borderRightColor: COLORS.secondaryDark,
    paddingRight: 12,
    alignItems: 'center',
  },
  therapistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
    backgroundColor: COLORS.secondaryLight,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
  },
  therapistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  therapistName: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  therapistDetail: {
    fontSize: scaledFontSize(12),
    color: COLORS.textMedium,
    marginBottom: 2,
  },
  cardRightSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: scaledFontSize(14),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
  },
  noDataText: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
    alignSelf: 'center',
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
  },
  pendingButton: {
    backgroundColor: '#FFA500', // Orange color for pending
    opacity: 0.8, // Make it look less interactive
  },
  viewButton: {
    backgroundColor: '#28a745', // Green color for View button
  }
});

export default TherapistsScreen;
