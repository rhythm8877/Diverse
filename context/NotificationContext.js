import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestore } from '../config/firebase';
import { collection, query, where, onSnapshot, getDocs, getDoc, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from './UserContext';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: async () => {},
  sendNotification: async () => {},
  refreshNotifications: () => {},
  acceptAppointmentRequest: async () => {},
  rejectAppointmentRequest: async () => {},
  scheduleAppointment: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  
  // Set up notifications listener when user changes
  useEffect(() => {
    let unsubscribeListener = null;
    let timeoutId = null;
    
    const setupNotifications = () => {
      if (!user?.uid) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Safety timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('Notifications loading timeout - forcing loading state to false');
          setLoading(false);
        }, 5000);
        
        // Query for notifications where user is recipient
        const q = query(
          collection(firestore, 'notifications'),
          where('recipientId', '==', user.uid)
        );
        
        // Set up real-time listener
        unsubscribeListener = onSnapshot(q, (querySnapshot) => {
          clearTimeout(timeoutId);
          const notificationsData = [];
          let unreadCounter = 0;
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const notification = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
            };
            
            notificationsData.push(notification);
            
            // Count unread notifications
            if (data.status === 'unread') {
              unreadCounter++;
            }
          });
          
          // Sort notifications by creation date (newest first)
          notificationsData.sort((a, b) => b.createdAt - a.createdAt);
          
          setNotifications(notificationsData);
          setUnreadCount(unreadCounter);
          setLoading(false);
        }, (error) => {
          console.error('Error in notifications listener:', error);
          setLoading(false);
          clearTimeout(timeoutId);
        });
      } catch (error) {
        console.error('Error setting up notifications:', error);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };
    
    setupNotifications();
    
    // Clean up on unmount
    return () => {
      if (unsubscribeListener) {
        unsubscribeListener();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);
  
  // Function to refresh notifications manually (can be called from outside)
  const refreshNotifications = async () => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    
    console.log('Manually refreshing notifications for user:', user.uid);
    setLoading(true);
    
    // Set a safety timeout first to ensure we don't get stuck in loading state
    const safetyTimeoutId = setTimeout(() => {
      console.log('Safety timeout triggered for notifications refresh');
      setLoading(false);
    }, 3000);
    
    try {
      // Directly fetch from Firestore instead of just changing state
      const q = query(
        collection(firestore, 'notifications'),
        where('recipientId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const notificationsData = [];
      let unreadCounter = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const notification = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        };
        
        notificationsData.push(notification);
        
        // Count unread notifications
        if (data.status === 'unread') {
          unreadCounter++;
        }
      });
      
      // Sort notifications by creation date (newest first)
      notificationsData.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log(`Directly fetched ${notificationsData.length} notifications`);
      setNotifications(notificationsData);
      setUnreadCount(unreadCounter);
      clearTimeout(safetyTimeoutId);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      // On error, just clear the current notifications to avoid stale data
      setNotifications([]);
      setUnreadCount(0);
      clearTimeout(safetyTimeoutId);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to mark a notification as read
  const markAsRead = async (notificationId) => {
    if (!notificationId) return;
    
    try {
      const notificationRef = doc(firestore, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 'read' } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.uid || notifications.length === 0) return;
    
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      
      // Update each unread notification in Firestore
      const updatePromises = unreadNotifications.map(notification => 
        updateDoc(doc(firestore, 'notifications', notification.id), {
          status: 'read',
        })
      );
      
      await Promise.all(updatePromises);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, status: 'read' }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Function to send a notification
  const sendNotification = async (data) => {
    if (!user?.uid) return null;
    
    try {
      const notificationData = {
        ...data,
        senderId: user.uid,
        status: 'unread',
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(firestore, 'notifications'), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  };
  
  // Function for therapist to accept an appointment request
  const acceptAppointmentRequest = async (notificationId, appointmentTime, endTime) => {
    if (!user?.uid || !notificationId) return false;
    
    try {
      // 1. Get the notification data
      const notificationRef = doc(firestore, 'notifications', notificationId);
      const notificationSnap = await getDoc(notificationRef);
      
      if (!notificationSnap.exists()) {
        console.error('Notification not found');
        return false;
      }
      
      const notificationData = notificationSnap.data();
      
      // 2. Update the notification status
      await updateDoc(notificationRef, {
        status: 'read',
        requestStatus: 'accepted',
        scheduledTime: appointmentTime,
        endTime: endTime || null, // Store end time if provided
        updatedAt: serverTimestamp(),
      });
      
      // 3. Create a notification for the client
      const clientNotificationData = {
        type: 'appointment_accepted',
        senderId: user.uid, // therapist
        senderName: notificationData.therapistName,
        recipientId: notificationData.clientId,
        clientName: notificationData.clientName, // Keep for consistency
        status: 'unread',
        message: `Your appointment with ${notificationData.therapistName} has been scheduled`,
        scheduledTime: appointmentTime,
        endTime: endTime || null, // Store end time if provided
        createdAt: serverTimestamp(),
        therapistId: notificationData.therapistId,
        therapistName: notificationData.therapistName,
        clientId: notificationData.clientId,
        originalRequestId: notificationId,
      };
      
      await addDoc(collection(firestore, 'notifications'), clientNotificationData);
      
      // 4. Create an appointment document
      const appointmentData = {
        therapistId: notificationData.therapistId,
        therapistName: notificationData.therapistName,
        therapistGender: notificationData.therapistGender,
        therapistType: notificationData.therapistType,
        therapistExpertise: notificationData.therapistExpertise,
        therapistProfileImage: notificationData.therapistProfileImage,
        clientId: notificationData.clientId,
        clientName: notificationData.clientName,
        clientAge: notificationData.clientAge,
        clientGender: notificationData.clientGender,
        clientComplaint: notificationData.clientComplaint,
        clientProfileImage: notificationData.clientProfileImage,
        scheduledTime: appointmentTime,
        endTime: endTime || null, // Store end time if provided
        status: 'scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await addDoc(collection(firestore, 'appointments'), appointmentData);
      
      return true;
    } catch (error) {
      console.error('Error accepting appointment request:', error);
      return false;
    }
  };
  
  // Function for therapist to reject an appointment request
  const rejectAppointmentRequest = async (notificationId, reason) => {
    if (!user?.uid || !notificationId) return false;
    
    try {
      // 1. Get the notification data
      const notificationRef = doc(firestore, 'notifications', notificationId);
      const notificationSnap = await getDoc(notificationRef);
      
      if (!notificationSnap.exists()) {
        console.error('Notification not found');
        return false;
      }
      
      const notificationData = notificationSnap.data();
      
      // 2. Update the notification status
      await updateDoc(notificationRef, {
        status: 'read',
        requestStatus: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp(),
      });
      
      // 3. Create a notification for the client
      const clientNotificationData = {
        type: 'appointment_rejected',
        senderId: user.uid, // therapist
        senderName: notificationData.therapistName,
        recipientId: notificationData.clientId,
        clientName: notificationData.clientName, // Keep for consistency
        status: 'unread',
        message: `${notificationData.therapistName} has rejected your appointment request`,
        rejectionReason: reason,
        createdAt: serverTimestamp(),
        therapistId: notificationData.therapistId,
        therapistName: notificationData.therapistName,
        clientId: notificationData.clientId,
        originalRequestId: notificationId,
      };
      
      await addDoc(collection(firestore, 'notifications'), clientNotificationData);
      
      return true;
    } catch (error) {
      console.error('Error rejecting appointment request:', error);
      return false;
    }
  };
  
  // Function for therapist to schedule appointment time
  const scheduleAppointment = async (notificationId, scheduledTime, endTime) => {
    if (!user?.uid || !notificationId || !scheduledTime) return false;
    
    try {
      // Accept the appointment with the scheduled time and end time
      return await acceptAppointmentRequest(notificationId, scheduledTime, endTime);
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      return false;
    }
  };
  
  const contextValue = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    sendNotification,
    refreshNotifications,
    acceptAppointmentRequest,
    rejectAppointmentRequest,
    scheduleAppointment,
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 