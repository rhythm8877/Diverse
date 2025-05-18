import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, ActivityIndicator, TextInput, Modal, Alert, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../utils/theme';
import { useNotifications } from '../context/NotificationContext';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IS_TABLET, scaledFontSize } from '../utils/responsive';
import { firestore } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

const NotificationsScreen = ({ navigation }) => {
  const { notifications, unreadCount, loading: contextLoading, markAsRead, markAllAsRead, acceptAppointmentRequest, rejectAppointmentRequest, refreshNotifications } = useNotifications();
  const { user } = useUser();
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 1)));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPicker, setCurrentPicker] = useState('date');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localNotifications, setLocalNotifications] = useState([]);

  // Fetch notifications directly when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchNotificationsDirectly = async () => {
        if (!user?.uid) return;

        if (isMounted) setLoading(true);
        
        // Create a direct Firestore query
        try {
          const q = query(
            collection(firestore, 'notifications'),
            where('recipientId', '==', user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const notificationsData = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Make sure we handle any potentially missing fields
            const notification = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
              // Ensure these fields exist, even if empty
              message: data.message || "New notification",
              type: data.type || "default",
              status: data.status || "unread"
            };
            
            notificationsData.push(notification);
          });
          
          // Sort notifications by creation date (newest first)
          notificationsData.sort((a, b) => b.createdAt - a.createdAt);
          
          if (isMounted) {
            setLocalNotifications(notificationsData);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching notifications directly:', error);
          if (isMounted) {
            Alert.alert('Error', 'Failed to load notifications. Please try again.');
            setLoading(false);
          }
        }
      };
      
      fetchNotificationsDirectly();
      if (isMounted) markAllAsRead();
      
      // Set a safety timeout
      const timeoutId = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 3000);
      
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }, [user?.uid])
  );

  // Handler for pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    
    if (user?.uid) {
      try {
        const q = query(
          collection(firestore, 'notifications'),
          where('recipientId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const notificationsData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Make sure we handle any potentially missing fields
          const notification = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            // Ensure these fields exist, even if empty
            message: data.message || "New notification",
            type: data.type || "default",
            status: data.status || "unread"
          };
          
          notificationsData.push(notification);
        });
        
        // Sort notifications by creation date (newest first)
        notificationsData.sort((a, b) => b.createdAt - a.createdAt);
        
        setLocalNotifications(notificationsData);
    } catch (error) {
        console.error('Error refreshing notifications:', error);
      }
    }
    
    // Also refresh notifications in context
    refreshNotifications();
    
    // Ensure refreshing state is reset
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  
  // Handler for manual refresh via long press
  const handleHeaderLongPress = () => {
    Alert.alert(
      'Refresh Notifications',
      'Do you want to manually refresh your notifications?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Refresh',
          onPress: () => {
            Alert.alert('Refreshing', 'Refreshing your notifications...');
            onRefresh();
          }
        }
      ]
    );
  };

  // Set minimum valid time (can't schedule in the past)
  const getMinimumValidTime = () => {
                  const now = new Date();
    const selectedIsToday = scheduledDate.getDate() === now.getDate() && 
                            scheduledDate.getMonth() === now.getMonth() && 
                            scheduledDate.getFullYear() === now.getFullYear();
    
    // If selected date is today, time should be at least current time
    // Otherwise, any time is valid for future dates
    return selectedIsToday ? now : null;
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    
    // Handle appointment requests for therapists
    if (notification.type === 'appointment_request') {
      // No specific action needed when pressing the notification itself
    }
  };

  const handleAccept = (notification) => {
    setSelectedNotification(notification);
    
    // Set initial date to today
    const today = new Date();
    setScheduledDate(today);
    
    // Set initial time to next hour
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    setScheduledTime(nextHour);
    
    // Set end time to 1 hour after start time
    const endTimeValue = new Date(nextHour);
    endTimeValue.setHours(endTimeValue.getHours() + 1);
    setEndTime(endTimeValue);
    
    setShowScheduleModal(true);
  };

  const handleReject = (notification) => {
    setSelectedNotification(notification);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejecting the appointment.');
                    return;
                  }

    setSubmitting(true);
    try {
      const success = await rejectAppointmentRequest(selectedNotification.id, rejectionReason.trim());
      if (success) {
        Alert.alert('Success', 'The appointment request has been rejected.');
        setShowRejectionModal(false);
      } else {
        Alert.alert('Error', 'Failed to reject the appointment request. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
      setScheduledDate(selectedDate);
      
      // Reset time if the new date is today and the currently set time is in the past
              const now = new Date();
      const isToday = selectedDate.getDate() === now.getDate() && 
                      selectedDate.getMonth() === now.getMonth() && 
                      selectedDate.getFullYear() === now.getFullYear();
      
      if (isToday) {
        const currentTime = scheduledTime;
        if (currentTime < now) {
          // If time is in the past, set to next hour
          const nextHour = new Date();
          nextHour.setHours(nextHour.getHours() + 1);
          nextHour.setMinutes(0);
          setScheduledTime(nextHour);
          
          // Adjust end time accordingly
          const newEndTime = new Date(nextHour);
          newEndTime.setHours(newEndTime.getHours() + 1);
          setEndTime(newEndTime);
        }
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
            if (selectedTime) {
      setScheduledTime(selectedTime);
      
      // Auto-adjust end time to be 1 hour after start time
      const newEndTime = new Date(selectedTime);
      newEndTime.setHours(newEndTime.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              // Ensure end time is after start time
      if (selectedTime <= scheduledTime) {
        Alert.alert(
          'Invalid Time', 
          'End time must be after the start time',
          [{ text: 'OK' }]
        );
        
        // Set end time to 1 hour after start time as fallback
        const newEndTime = new Date(scheduledTime);
        newEndTime.setHours(newEndTime.getHours() + 1);
        setEndTime(newEndTime);
              } else {
        setEndTime(selectedTime);
      }
    }
  };

  const submitSchedule = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      // Combine date and time
      const combinedDateTime = new Date(scheduledDate);
      combinedDateTime.setHours(
        scheduledTime.getHours(),
        scheduledTime.getMinutes(),
        0,
        0
      );
      
      // Combine date and end time
      const combinedEndDateTime = new Date(scheduledDate);
      combinedEndDateTime.setHours(
        endTime.getHours(),
        endTime.getMinutes(),
        0,
        0
      );
      
      // Validate time
      const now = new Date();
      if (combinedDateTime < now) {
        Alert.alert('Invalid Time', 'Please select a future date and time.');
        setSubmitting(false);
        return;
      };
      
      // Validate that end time is after start time
      if (combinedEndDateTime <= combinedDateTime) {
        Alert.alert('Invalid End Time', 'End time must be after the start time.');
        setSubmitting(false);
        return;
      };
      
      const success = await acceptAppointmentRequest(selectedNotification.id, combinedDateTime, combinedEndDateTime);
      if (success) {
        Alert.alert('Success', 'The appointment has been scheduled.');
        setShowScheduleModal(false);
      } else {
        Alert.alert('Error', 'Failed to schedule the appointment. Please try again.');
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderNotificationItem = ({ item }) => {
    let icon, iconColor;
    
    switch (item.type) {
      case 'appointment_request':
        icon = 'calendar-outline';
        iconColor = COLORS.primary;
        break;
      case 'appointment_accepted':
        icon = 'checkmark-circle';
        iconColor = COLORS.success;
        break;
      case 'appointment_rejected':
        icon = 'close-circle';
        iconColor = COLORS.error;
        break;
      default:
        icon = 'notifications';
        iconColor = COLORS.primary;
    }

    const formattedDate = item.createdAt 
      ? format(new Date(item.createdAt), 'MMM dd, yyyy • h:mm a')
      : '';

    // Calculate status label for therapist view
    let statusLabel = '';
    let statusColor = '';
    if (item.requestStatus === 'accepted') {
      statusLabel = 'Accepted';
      statusColor = COLORS.success;
    } else if (item.requestStatus === 'rejected') {
      statusLabel = 'Rejected';
      statusColor = COLORS.error;
    }

    return (
      <View 
        style={[
          styles.notificationItem,
          item.status === 'unread' && styles.unreadNotification
        ]}
      >
        <TouchableOpacity 
          style={styles.notificationContent}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={28} color={iconColor} style={styles.notificationIcon} />
              </View>
          <View style={styles.notificationTextContainer}>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationDate}>{formattedDate}</Text>
            
            {/* Status label for accepted/rejected */}
            {statusLabel && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
                </View>
              )}
              
            {/* For appointment requests, show accept/reject buttons for therapists */}
            {item.type === 'appointment_request' && !item.requestStatus && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAccept(item)}
                >
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
            <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(item)}
            >
                  <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
            )}
            
            {/* For accepted requests, show scheduled time */}
            {item.scheduledTime && (
              <View style={styles.scheduledTimeContainer}>
                <MaterialIcons name="schedule" size={16} color={COLORS.textMedium} />
                <Text style={styles.scheduledTimeText}>
                  <Text style={styles.scheduledTimeLabel}>Scheduled Time: </Text>
                  {format(new Date(item.scheduledTime.seconds * 1000), 'MMM dd, yyyy • h:mm a')}
                  {item.endTime && (
                    <Text> - {format(new Date(item.endTime.seconds * 1000), 'h:mm a')}</Text>
                  )}
                </Text>
          </View>
            )}
            
            {/* For rejected requests, show reason */}
            {item.rejectionReason && (
              <View style={styles.rejectionReasonContainer}>
                <Text style={styles.rejectionReasonText}>
                  <Text style={styles.rejectionReasonLabel}>Reason: </Text>
                  {item.rejectionReason}
                </Text>
              </View>
            )}
          </View>
          {item.status === 'unread' && (
            <View style={styles.unreadDot} />
          )}
            </TouchableOpacity>
        </View>
      );
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text 
          style={styles.headerTitle}
          onLongPress={handleHeaderLongPress}
        >
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : localNotifications.length === 0 ? (
        <View style={styles.contentContainer}>
          {/* Centered Notification Icon */}
          <Ionicons name="notifications" size={120} color={COLORS.primaryLight} style={styles.icon} />
          
          {/* No Notifications Text */}
          <Text style={styles.noNotificationsText}>No new notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={localNotifications.map(notification => ({
            ...notification,
            // Ensure all notifications have required fields to prevent UI issues
            type: notification.type || 'default',
            message: notification.message || 'New notification',
            status: notification.status || 'read'
          }))}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notificationList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
      
      {/* Rejection Modal */}
      <Modal
        visible={showRejectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reject Appointment Request</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter reason here..."
              multiline={true}
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowRejectionModal(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={submitRejection}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Schedule Appointment Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Schedule Appointment</Text>
            <Text style={styles.modalSubtitle}>Please select a date and time:</Text>
            
              <TouchableOpacity 
              style={styles.datePickerButton}
                onPress={() => {
                setCurrentPicker('date');
                    setShowDatePicker(true);
              }}
            >
              <Text style={styles.datePickerButtonText}>
                Date: {format(scheduledDate, 'MMM dd, yyyy')}
              </Text>
              <Ionicons name="calendar" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              
            <View style={styles.timeRangeContainer}>
                  <TouchableOpacity 
                style={[styles.timePickerButton, { marginRight: 8 }]}
                    onPress={() => {
                  setCurrentPicker('startTime');
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timePickerButtonText}>
                  Start: {format(scheduledTime, 'h:mm a')}
                </Text>
                    <Ionicons name="time" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                
                  <TouchableOpacity 
                style={[styles.timePickerButton, { marginLeft: 8 }]}
                    onPress={() => {
                  setCurrentPicker('endTime');
                        setShowEndTimePicker(true);
                }}
              >
                <Text style={styles.timePickerButtonText}>
                  End: {format(endTime, 'h:mm a')}
                </Text>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
              </View>
              
            {showDatePicker && (
              <DateTimePicker
                value={scheduledDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={scheduledTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
                minimumDate={getMinimumValidTime()}
              />
            )}
            
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display="default"
                onChange={handleEndTimeChange}
                minimumDate={scheduledTime}
              />
            )}
            
            <View style={styles.modalButtonsContainer}>
            <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowScheduleModal(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={submitSchedule}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Submit</Text>
                )}
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: COLORS.secondary,
  },
  headerTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryDark,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100, // Offset for visual balance
  },
  icon: {
    marginBottom: 20,
  },
  noNotificationsText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textMedium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textMedium,
    marginTop: 12,
  },
  notificationList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    // No specific styling needed
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
    ...SHADOWS.small,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 14,
  },
  scheduledTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 0,
    alignSelf: 'flex-start',
    ...SHADOWS.small,
  },
  scheduledTimeText: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginLeft: 6,
  },
  scheduledTimeLabel: {
    fontWeight: '600',
    color: COLORS.textDark,
  },
  rejectionReasonContainer: {
    backgroundColor: COLORS.secondaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 0,
    alignSelf: 'flex-start',
    ...SHADOWS.small,
  },
  rejectionReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: COLORS.textMedium,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: IS_TABLET ? '50%' : '90%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.textDark,
    backgroundColor: COLORS.secondaryLight,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  modalCancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelButtonText: {
    color: COLORS.textDark,
    fontWeight: '500',
    fontSize: 16,
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  modalButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.secondaryLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.secondaryLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  timePickerButtonText: {
    fontSize: 14,
    color: COLORS.textDark,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: COLORS.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default NotificationsScreen; 