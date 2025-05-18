import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../utils/theme';
import { IS_TABLET, scaledFontSize, getStatusBarHeight } from '../utils/responsive';
import { firestore } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { format } from 'date-fns';

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData, isLoggedIn, user } = useUser();

  // Ensure user is logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isLoggedIn, navigation]);

  // Fetch appointments when component mounts
  useEffect(() => {
    fetchAppointments();
  }, [user]);

  // Function to fetch appointments
  const fetchAppointments = async () => {
    if (!user?.uid) {
      setLoading(false);
        return;
      }
      
    try {
      setLoading(true);
      
      let q;
      
      // Different queries for clients and therapists
      if (userData?.userType === 'CLIENT') {
        q = query(
          collection(firestore, 'appointments'),
          where('clientId', '==', user.uid),
          orderBy('scheduledTime', 'asc')
        );
                    } else {
        // For therapists (SLP, AUDIOLOGIST, BOTH)
        q = query(
          collection(firestore, 'appointments'),
          where('therapistId', '==', user.uid),
          orderBy('scheduledTime', 'asc')
        );
      }
      
      const appointmentSnapshot = await getDocs(q);
      
      // Process appointments and filter out expired ones
      const currentDate = new Date();
      const appointmentData = [];
      
      appointmentSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Convert Firestore timestamps to JavaScript Dates
        const startTime = data.scheduledTime?.toDate ? 
          data.scheduledTime.toDate() : 
          (data.scheduledTime?.seconds ? new Date(data.scheduledTime.seconds * 1000) : null);
        
        // Get end time if it exists, or default to 1 hour after start time
        let endTime = data.endTime?.toDate ? 
          data.endTime.toDate() : 
          (data.endTime?.seconds ? new Date(data.endTime.seconds * 1000) : null);
          
        if (!endTime && startTime) {
          // If no end time is set, default to 1 hour after start time
          endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);
        }
        
        // Only include appointments that haven't ended yet (using end time)
        if (startTime && endTime && endTime > currentDate) {
          appointmentData.push({
            id: doc.id,
            ...data,
            scheduledTime: startTime,
            endTime: endTime
          });
        }
      });
      
      // Sort by scheduled time (ascending)
      appointmentData.sort((a, b) => a.scheduledTime - b.scheduledTime);
      
      setAppointments(appointmentData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format time range string (start - end)
  const formatTimeRange = (startTime, endTime) => {
    if (!startTime) return '';
    
    const formattedStart = format(startTime, 'MMM dd, yyyy • h:mm a');
    
    if (!endTime) return formattedStart;
    
    // If dates are the same, only show time for end time
    const isSameDay = startTime.getDate() === endTime.getDate() && 
                      startTime.getMonth() === endTime.getMonth() && 
                      startTime.getFullYear() === endTime.getFullYear();
                      
    const formattedEnd = isSameDay ? 
      format(endTime, 'h:mm a') : 
      format(endTime, 'MMM dd, yyyy • h:mm a');
      
    return `${formattedStart} - ${formattedEnd}`;
  };

  // Render appointment card for a client (showing therapist info)
  const renderClientAppointmentCard = (appointment) => {
      return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Appointment with Therapist</Text>
          <Text style={styles.appointmentDate}>
            {formatTimeRange(appointment.scheduledTime, appointment.endTime)}
          </Text>
          </View>
          
        <View style={styles.cardContent}>
          <View style={styles.therapistSection}>
            <View style={styles.profileImageContainer}>
              {appointment.therapistProfileImage ? (
                <Image
                  source={{ uri: appointment.therapistProfileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={40} color={COLORS.primary} />
                </View>
              )}
            </View>
            
            <View style={styles.detailsSection}>
              <Text style={styles.nameText}>{appointment.therapistName || 'Unnamed Therapist'}</Text>
              <Text style={styles.detailText}>Gender: {appointment.therapistGender || 'Not specified'}</Text>
              
              {/* Show different therapist type based on data */}
              <Text style={styles.detailText}>
                Type: {appointment.therapistType || 'Therapist'}
              </Text>
              
              {/* Show expertise if available */}
              {appointment.therapistExpertise && (
                <Text style={styles.detailText}>
                  Expertise: {appointment.therapistExpertise}
                </Text>
              )}
            </View>
          </View>
        </View>
        </View>
      );
  };

  // Render appointment card for a therapist (showing client info)
  const renderTherapistAppointmentCard = (appointment) => {
    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Appointment with Client</Text>
          <Text style={styles.appointmentDate}>
            {formatTimeRange(appointment.scheduledTime, appointment.endTime)}
          </Text>
          </View>
          
        <View style={styles.cardContent}>
          <View style={styles.clientSection}>
            <View style={styles.profileImageContainer}>
              {appointment.clientProfileImage ? (
                <Image
                  source={{ uri: appointment.clientProfileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={40} color={COLORS.primary} />
                  </View>
              )}
            </View>
            
            <View style={styles.detailsSection}>
              <Text style={styles.nameText}>{appointment.clientName || 'Unnamed Client'}</Text>
              <Text style={styles.detailText}>Gender: {appointment.clientGender || 'Not specified'}</Text>
              <Text style={styles.detailText}>Age: {appointment.clientAge || 'Not specified'}</Text>
              
              {/* Show complaint if available */}
              {appointment.clientComplaint && (
                <View style={styles.complaintSection}>
                      <Text style={styles.complaintLabel}>Complaint:</Text>
                  {typeof appointment.clientComplaint === 'string' ? (
                    <Text style={styles.complaintText}>{appointment.clientComplaint}</Text>
                  ) : typeof appointment.clientComplaint === 'object' ? (
                    <View>
                      {appointment.clientComplaint.hearingIssues && (
                        <View>
                          <Text style={styles.complaintText}>Hearing Issues: {String(appointment.clientComplaint.hearingIssues)}</Text>
                          {appointment.clientComplaint.hearingDetails && (
                            <Text style={styles.complaintText}>Hearing Details: {appointment.clientComplaint.hearingDetails}</Text>
                          )}
                    </View>
                      )}
                      
                      {appointment.clientComplaint.speakingIssues && (
                        <View>
                          <Text style={styles.complaintText}>Speaking Issues: {String(appointment.clientComplaint.speakingIssues)}</Text>
                          {appointment.clientComplaint.speakingDetails && (
                            <Text style={styles.complaintText}>Speaking Details: {appointment.clientComplaint.speakingDetails}</Text>
              )}
            </View>
                      )}
                      
                      {appointment.clientComplaint.eatingIssues && (
                        <View>
                          <Text style={styles.complaintText}>Eating Issues: {String(appointment.clientComplaint.eatingIssues)}</Text>
                          {appointment.clientComplaint.eatingDetails && (
                            <Text style={styles.complaintText}>Eating Details: {appointment.clientComplaint.eatingDetails}</Text>
                          )}
            </View>
                      )}
            </View>
                  ) : (
                    <Text style={styles.complaintText}>No detailed complaint information available</Text>
                  )}
              </View>
              )}
            </View>
          </View>
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
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar" size={100} color={COLORS.primaryLight} />
          <Text style={styles.emptyText}>No appointments scheduled</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Upcoming appointments section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            </View>
            
          {/* Render appointment cards based on user type */}
          {appointments.map(appointment => (
            userData?.userType === 'CLIENT'
              ? renderClientAppointmentCard(appointment)
              : renderTherapistAppointmentCard(appointment)
          ))}
            </ScrollView>
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: scaledFontSize(18),
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  cardHeader: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: scaledFontSize(14),
    color: COLORS.white,
    opacity: 0.9,
  },
  cardContent: {
    padding: 16,
  },
  therapistSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondaryLight,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsSection: {
    flex: 1,
  },
  nameText: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  detailText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  complaintSection: {
    backgroundColor: COLORS.secondaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  complaintLabel: {
    fontSize: scaledFontSize(14),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  complaintText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    lineHeight: scaledFontSize(20),
  },
});

export default AppointmentsScreen; 