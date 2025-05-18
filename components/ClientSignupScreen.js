import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { allStatesAndUTs, isUnionTerritory, statesAndDistricts } from '../utils/locationData';
import { getBottomSpacing, getKeyboardBehavior, getKeyboardVerticalOffset, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import SearchableDropdown from './SearchableDropdown';
import { auth, firestore, storage } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, deleteUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { useUser } from '../context/UserContext';
import NetInfo from '@react-native-community/netinfo';

const { width } = Dimensions.get('window');

// Languages commonly spoken in India
const indianLanguages = [
  'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu',
  'Gujarati', 'Kannada', 'Malayalam', 'Tulu', 'Punjabi', 'Other'
];

const ClientSignupScreen = ({ navigation, route }) => {
  // Refs for scrolling to error fields
  const scrollViewRef = useRef(null);
  const nameRef = useRef(null);
  const ageRef = useRef(null);
  const genderRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const stateRef = useRef(null);
  const districtRef = useRef(null);
  const languagesRef = useRef(null);
  const complaintRef = useRef(null);
  const medicalRef = useRef(null);
  
  // Client form state
  const [clientForm, setClientForm] = useState({
    photo: null,
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    password: '',
    state: '',
    district: '',
    languagesKnown: [],
    otherLanguage: '',
    complaint: {
      hearingIssues: false,
      hearingDetails: '',
      speakingIssues: false,
      speakingDetails: '',
      eatingIssues: false,
      eatingDetails: ''
    },
    medicalIssues: '',
    reports: null
  });
  
  // Field-specific errors
  const [errors, setErrors] = useState({
    photo: '',
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    password: '',
    state: '',
    district: '',
    languagesKnown: '',
    otherLanguage: '',
    complaint: '',
    medicalIssues: ''
  });
  
  // Common state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Pick image from camera or gallery
  const pickImage = async (fromCamera) => {
    try {
      let result;
      if (fromCamera) {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please allow camera access to take photos');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      } else {
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please allow access to your photo library');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      }
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleClientInputChange('photo', result.assets[0].uri);
      }
      setShowPhotoOptions(false);
    } catch (error) {
      Alert.alert('Error', 'Could not access image. Please try again.');
      setShowPhotoOptions(false);
    }
  };
  
  // Handle document upload
  const handleDocumentUpload = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow media library access to upload documents');
        return;
      }
      
      // Use ImagePicker to select files
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        
        // Create a simplified report object
        const reportFile = {
          uri: fileUri,
          name: fileUri.split('/').pop() || 'medical_report.pdf',
          type: 'application/pdf' // Assuming PDF, though we can't verify the type
        };
        
        handleClientInputChange('reports', reportFile);
        Alert.alert('Success', 'Medical report uploaded successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };
  
  // Handle state selection for Client
  const handleStateChange = (state) => {
    setClientForm(prev => ({
      ...prev,
      state,
      district: '' // Reset district when state changes
    }));
  };
  
  // Check if selected state is a union territory
  const isSelectedStateUT = clientForm.state ? isUnionTerritory(clientForm.state) : false;
  
  // Get districts for selected state
  const districtsForSelectedState = clientForm.state ? statesAndDistricts[clientForm.state] || [] : [];
  
  // Handle client form input changes
  const handleClientInputChange = (field, value) => {
    setClientForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle complaint checkbox changes
  const handleComplaintChange = (complaintType, value) => {
    setClientForm(prev => ({
      ...prev,
      complaint: {
        ...prev.complaint,
        [complaintType]: value
      }
    }));
  };
  
  // Handle complaint details changes
  const handleComplaintDetailsChange = (complaintType, value) => {
    setClientForm(prev => ({
      ...prev,
      complaint: {
        ...prev.complaint,
        [`${complaintType}Details`]: value
      }
    }));
  };
  
  // Handle language selection
  const handleLanguageToggle = (language) => {
    setClientForm(prev => {
      const currentLanguages = [...prev.languagesKnown];
      if (currentLanguages.includes(language)) {
        return {
          ...prev,
          languagesKnown: currentLanguages.filter(lang => lang !== language)
        };
      } else {
        return {
          ...prev,
          languagesKnown: [...currentLanguages, language]
        };
      }
    });
  };
  
  // Scroll to a specific field with error
  const scrollToField = (ref) => {
    if (ref && ref.current) {
      ref.current.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 50, animated: true });
        },
        () => {}
      );
    }
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Perform a connectivity check with retries
  const checkConnectivity = async (retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        // First use NetInfo - more reliable on mobile devices
        const networkState = await NetInfo.fetch();
        
        if (!networkState.isConnected) {
          throw new Error('Device shows no network connection.');
        }
        
        // Even if NetInfo says we're connected, test Firebase connection directly
        // This is more reliable than general internet connectivity checks
        
        // Test lightweight fetch to Firebase domain
        try {
          // Adding a cache buster query parameter to avoid cached responses
          const timestamp = new Date().getTime();
          const testUrl = `https://firebasestorage.googleapis.com/v0/b/diverse-b521b.firebasestorage.app?cacheTest=${timestamp}`;
          
          const response = await Promise.race([
            fetch(testUrl, { method: 'HEAD' }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Firebase connection timeout')), 7000)
            )
          ]);
          
          if (response.status < 500) { // 2xx, 3xx, 4xx status codes indicate the server is responding
            return true; // Successfully connected to Firebase
          } else {
            throw new Error('Firebase servers returned an error');
          }
        } catch (firebaseError) {
          // If Firebase test fails, try a general internet connectivity test
          try {
            const googleResponse = await Promise.race([
              fetch('https://www.google.com/generate_204'),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Google connectivity timeout')), 5000)
              )
            ]);
            
            if (googleResponse.status === 204) {
              // Internet is working, but Firebase seems to be having issues
              throw new Error('Internet connection is working, but the app servers appear to be unavailable.');
            } else {
              throw new Error('Internet connection unstable or limited.');
            }
          } catch (googleError) {
            throw new Error('Internet connection unstable or unavailable.');
          }
        }
      } catch (error) {
        if (i < retries) {
          // Wait before retrying, increasing the wait time with each retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } else {
          throw error;
        }
      }
    }
    
    // This code should not be reached if all retries fail
    return false;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Reset all errors
    const newErrors = {
      photo: '',
      name: '',
      age: '',
      gender: '',
      phone: '',
      email: '',
      password: '',
      state: '',
      district: '',
      languagesKnown: '',
      otherLanguage: '',
      complaint: '',
      medicalIssues: ''
    };
    
    let isValid = true;
    let firstErrorRef = null;
    
    // Validate photo
    if (!clientForm.photo) {
      newErrors.photo = 'Please upload a photo';
      isValid = false;
      // Photo doesn't have a ref to scroll to, we'll use nameRef as it's close
      if (!firstErrorRef) firstErrorRef = nameRef;
    }
    
    // Validate name
    if (!clientForm.name.trim()) {
      newErrors.name = 'Please fill your name';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = nameRef;
    }
    
    // Validate age
    if (!clientForm.age) {
      newErrors.age = 'Please fill your age';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = ageRef;
    } else if (isNaN(clientForm.age) || parseInt(clientForm.age) <= 0) {
      newErrors.age = 'Please enter a valid age';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = ageRef;
    }
    
    // Validate gender
    if (!clientForm.gender) {
      newErrors.gender = 'Please select your gender';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = genderRef;
    }
    
    // Validate phone
    if (!clientForm.phone) {
      newErrors.phone = 'Please fill your phone number';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = phoneRef;
    } else if (clientForm.phone.length !== 10 || !/^\d+$/.test(clientForm.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = phoneRef;
    }
    
    // Validate email
    if (!clientForm.email) {
      newErrors.email = 'Please fill your email';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = emailRef;
    } else if (!isValidEmail(clientForm.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = emailRef;
    }
    
    // Validate password
    if (!clientForm.password) {
      newErrors.password = 'Please fill your password';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = passwordRef;
    } else if (clientForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = passwordRef;
    }
    
    // Validate state
    if (!clientForm.state) {
      newErrors.state = 'Please select your state';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = stateRef;
    }
    
    // Validate district (only if state is not a union territory)
    if (!isSelectedStateUT && !clientForm.district) {
      newErrors.district = 'Please select your district';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = districtRef;
    }
    
    // Validate languages
    if (clientForm.languagesKnown.length === 0) {
      newErrors.languagesKnown = 'Please select at least one language';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = languagesRef;
    }
    
    // Validate other language if selected
    if (clientForm.languagesKnown.includes('Other') && !clientForm.otherLanguage.trim()) {
      newErrors.otherLanguage = 'Please specify the other language';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = languagesRef;
    }
    
    // Validate complaint details if any complaint is selected
    if (clientForm.complaint.hearingIssues && !clientForm.complaint.hearingDetails) {
      newErrors.complaint = 'Please provide details for your hearing issues';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = complaintRef;
    } else if (clientForm.complaint.speakingIssues && !clientForm.complaint.speakingDetails) {
      newErrors.complaint = 'Please provide details for your speaking issues';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = complaintRef;
    } else if (clientForm.complaint.eatingIssues && !clientForm.complaint.eatingDetails) {
      newErrors.complaint = 'Please provide details for your eating issues';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = complaintRef;
    }
    
    // Validate medical issues
    if (!clientForm.medicalIssues.trim()) {
      newErrors.medicalIssues = 'Please provide information about your medical issues';
      isValid = false;
      if (!firstErrorRef) firstErrorRef = medicalRef;
    }
    
    // Update errors state
    setErrors(newErrors);
    
    // If validation fails, scroll to the first error field
    if (!isValid && firstErrorRef) {
      setTimeout(() => scrollToField(firstErrorRef), 100);
      return;
    }
    
    // If validation passes, proceed with form submission
    setLoading(true);
    
    // Authentication and profile data creation should happen in a transactional way
    let user = null;
    let profileImageUrl = null;
    let reportsUrl = null;
    let uploadedFiles = [];
    
    try {
      // Check for internet connectivity with multiple retries
      try {
        await checkConnectivity();
      } catch (connectivityError) {
        setLoading(false);
        Alert.alert(
          'Connection Issue',
          'Please check your internet connection and try again. Make sure you have stable internet access.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // If we have network connectivity, proceed with registration
      try {
        // 1. Create user account with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          clientForm.email,
          clientForm.password
        );
        
        user = userCredential.user;
        
        // 2. Upload profile photo to Firebase Storage if exists
        if (clientForm.photo) {
          try {
            const photoRef = ref(storage, `usersProfilePic/${user.uid}/profile.jpg`);
            const response = await fetch(clientForm.photo);
            const blob = await response.blob();
            await uploadBytes(photoRef, blob);
            profileImageUrl = await getDownloadURL(photoRef);
            uploadedFiles.push(`usersProfilePic/${user.uid}/profile.jpg`);
          } catch (storageError) {
            // Retry upload once with a delay if it's a network error
            if (storageError.code === 'storage/network-request-failed') {
              try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const photoRef = ref(storage, `usersProfilePic/${user.uid}/profile.jpg`);
                const response = await fetch(clientForm.photo);
                const blob = await response.blob();
                await uploadBytes(photoRef, blob);
                profileImageUrl = await getDownloadURL(photoRef);
                uploadedFiles.push(`usersProfilePic/${user.uid}/profile.jpg`);
              } catch (retryError) {
                throw new Error('Failed to upload profile photo: ' + retryError.message);
              }
            } else {
              throw new Error('Failed to upload profile photo: ' + storageError.message);
            }
          }
        }
        
        // 3. Upload medical reports if exists
        if (clientForm.reports) {
          try {
            const reportsRef = ref(storage, `userDocs/${user.uid}/reports.pdf`);
            const response = await fetch(clientForm.reports.uri);
            const blob = await response.blob();
            await uploadBytes(reportsRef, blob);
            reportsUrl = await getDownloadURL(reportsRef);
            uploadedFiles.push(`userDocs/${user.uid}/reports.pdf`);
          } catch (storageError) {
            // Non-critical error, can proceed without reports
          }
        }
        
        // 4. Create user document in Firestore
        const userData = {
          uid: user.uid,
          userType: 'CLIENT',
          name: clientForm.name,
          age: parseInt(clientForm.age),
          gender: clientForm.gender,
          phone: clientForm.phone,
          email: clientForm.email,
          state: clientForm.state,
          district: clientForm.district,
          languagesKnown: clientForm.languagesKnown,
          otherLanguage: clientForm.otherLanguage,
          complaint: clientForm.complaint,
          medicalIssues: clientForm.medicalIssues,
          profileImageUrl,
          reportsUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Create document with more robust error handling
        try {
          // First attempt to create the user document
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, userData);
          
          // Verify the document was actually created by reading it back
          try {
            const docSnapshot = await getDoc(userRef);
            if (!docSnapshot.exists()) {
              throw new Error('User document was not found after creation');
            }
            
            // 5. Navigate to HomeScreen (Main tab navigator)
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          } catch (verifyError) {
            throw new Error('Failed to verify user document: ' + verifyError.message);
          }
        } catch (firestoreError) {
          // Retry with a longer delay for Firestore errors
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Use a different approach on retry - set with merge option
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, userData, { merge: true });
            
            // Verify again
            const docSnapshot = await getDoc(userRef);
            if (!docSnapshot.exists()) {
              throw new Error('User document still not found after retry');
            }
            
            // Navigate to HomeScreen after successful retry
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
            return; // Exit function after successful retry
          } catch (retryError) {
            // More detailed error message for debugging
            throw new Error('Failed to create user profile after retry: ' + retryError.message);
          }
        }
      } catch (error) {
        // If any part of the signup process fails, clean up and show error
        throw error; // Rethrow to be caught by the outer catch block
      }
    } catch (error) {
      // Cleanup uploaded files if registration fails
      if (uploadedFiles.length > 0) {
        try {
          for (const path of uploadedFiles) {
            try {
              const fileRef = ref(storage, path);
              await deleteObject(fileRef);
            } catch (deleteError) {
              // Skip any errors during cleanup
            }
          }
        } catch (cleanupError) {
          // Skip any errors during cleanup
        }
      }
      
      // Cleanup auth user if it was created
      if (user) {
        try {
          await deleteUser(user);
        } catch (deleteError) {
          // Skip any errors during cleanup
        }
      }
      
      let errorMessage = 'An error occurred during registration';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account already exists with this email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error: The app is having trouble connecting to our servers. Please check your internet connection, try switching networks, or try again later.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
            
            // Make Firebase error messages more user-friendly
            if (errorMessage.includes('network')) {
              errorMessage = 'Network error: The app is having trouble connecting to our servers. Please check your internet connection and try again.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
              errorMessage = 'Connection timeout: Please check your internet speed and try again.';
            } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
              errorMessage = 'Permission error: The app does not have sufficient permissions. Please try again later.';
            }
          }
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Go back to previous screen
  const goBack = () => {
    navigation.goBack();
  };
  
  return (
    <KeyboardAvoidingView
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getKeyboardVerticalOffset()}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Registration</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.formContainer}>
          
          {/* Global error messages removed in favor of field-specific errors */}
          
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {/* Profile Photo */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Profile Photo <Text style={styles.requiredStar}>*</Text></Text>
              <View style={styles.photoUploadContainer}>
                <TouchableOpacity 
                  onPress={() => setShowPhotoOptions(true)}
                >
                  {clientForm.photo ? (
                    <View>
                      <Image 
                        source={{ uri: clientForm.photo }} 
                        style={styles.profileImage} 
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        style={styles.removePhotoButton}
                        onPress={() => handleClientInputChange('photo', null)}
                      >
                        <Ionicons name="close-circle" size={28} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoUpload}>
                      <Ionicons name="image" size={40} color={COLORS.primary} />
                      <Text style={styles.photoUploadText}>IMG</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {errors.photo ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.photo}</Text>
                </View>
              ) : null}
            </View>
            
            {/* Photo Options Modal */}
            <Modal
              visible={showPhotoOptions}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowPhotoOptions(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <TouchableOpacity 
                    style={styles.modalBtn} 
                    onPress={() => pickImage(true)}
                  >
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                    <Text style={styles.modalBtnText}>Camera</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalBtn} 
                    onPress={() => pickImage(false)}
                  >
                    <Ionicons name="image" size={24} color={COLORS.primary} />
                    <Text style={styles.modalBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalCancel} 
                    onPress={() => setShowPhotoOptions(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            
            <View style={styles.inputContainer} ref={nameRef}>
              <Text style={styles.inputLabel}>Name <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                placeholder="Enter your full name"
                value={clientForm.name}
                onChangeText={(text) => {
                  handleClientInputChange('name', text);
                  if (errors.name) setErrors({...errors, name: ''});
                }}
              />
              {errors.name ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.name}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.inputContainer} ref={ageRef}>
              <Text style={styles.inputLabel}>Age <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.age ? styles.inputError : null]}
                placeholder="Enter your age"
                keyboardType="numeric"
                maxLength={3}
                value={clientForm.age}
                onChangeText={(text) => {
                  handleClientInputChange('age', text.replace(/[^0-9]/g, ''));
                  if (errors.age) setErrors({...errors, age: ''});
                }}
              />
              {errors.age ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.age}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.inputContainer} ref={genderRef}>
              <Text style={styles.inputLabel}>Gender <Text style={styles.requiredStar}>*</Text></Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity 
                  style={[styles.radioButton, clientForm.gender === 'Male' && styles.radioButtonSelected]}
                  onPress={() => handleClientInputChange('gender', 'Male')}
                >
                  <View style={[styles.radioCircle, clientForm.gender === 'Male' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Male</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioButton, clientForm.gender === 'Female' && styles.radioButtonSelected]}
                  onPress={() => handleClientInputChange('gender', 'Female')}
                >
                  <View style={[styles.radioCircle, clientForm.gender === 'Female' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Female</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioButton, clientForm.gender === 'Other' && styles.radioButtonSelected]}
                  onPress={() => handleClientInputChange('gender', 'Other')}
                >
                  <View style={[styles.radioCircle, clientForm.gender === 'Other' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Other</Text>
                </TouchableOpacity>
              </View>
              {errors.gender ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.gender}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.inputContainer} ref={phoneRef}>
              <Text style={styles.inputLabel}>Phone Number <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.phone ? styles.inputError : null]}
                placeholder="Enter your 10-digit phone number"
                keyboardType="phone-pad"
                maxLength={10}
                value={clientForm.phone}
                onChangeText={(text) => {
                  handleClientInputChange('phone', text.replace(/[^0-9]/g, ''));
                  if (errors.phone) setErrors({...errors, phone: ''});
                }}
              />
              {errors.phone ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.phone}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.inputContainer} ref={emailRef}>
              <Text style={styles.inputLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={clientForm.email}
                onChangeText={(text) => {
                  handleClientInputChange('email', text);
                  if (errors.email) setErrors({...errors, email: ''});
                }}
              />
              {errors.email ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.inputContainer} ref={passwordRef}>
              <Text style={styles.inputLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
              <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  secureTextEntry={!showPassword}
                  value={clientForm.password}
                  onChangeText={(text) => {
                    handleClientInputChange('password', text);
                    if (errors.password) setErrors({...errors, password: ''});
                  }}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={togglePasswordVisibility}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={COLORS.textMedium} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.password}</Text>
                </View>
              ) : null}
            </View>
          </View>
          

          
          {/* Location Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.inputContainer} ref={stateRef}>
              <SearchableDropdown
                label="State"
                placeholder="Select your state"
                items={allStatesAndUTs}
                selectedItem={clientForm.state}
                onItemSelect={(state) => {
                  handleStateChange(state);
                  if (errors.state) setErrors({...errors, state: ''});
                }}
                required
              />
            </View>
            
            <View style={styles.inputContainer} ref={districtRef}>
              <SearchableDropdown
                label="District"
                placeholder={isSelectedStateUT ? "Not applicable for Union Territory" : "Select your district"}
                items={districtsForSelectedState}
                selectedItem={clientForm.district}
                onItemSelect={(district) => {
                  handleClientInputChange('district', district);
                  if (errors.district) setErrors({...errors, district: ''});
                }}
                disabled={isSelectedStateUT || !clientForm.state}
                required={!isSelectedStateUT}
              />
            </View>
          </View>
          
          {/* Languages */}
          <View style={styles.formSection} ref={languagesRef}>
            <Text style={styles.sectionTitle}>Languages Known <Text style={styles.requiredStar}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>Select all the languages you know</Text>
            
            <View style={styles.languageContainer}>
              {indianLanguages.map(language => (
                <TouchableOpacity 
                  key={language}
                  style={[styles.languageChip, clientForm.languagesKnown.includes(language) && styles.languageChipSelected]}
                  onPress={() => handleLanguageToggle(language)}
                >
                  <Text style={[styles.languageChipText, clientForm.languagesKnown.includes(language) && styles.languageChipTextSelected]}>
                    {language}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {clientForm.languagesKnown.includes('Other') && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Specify Other Language</Text>
                <TextInput
                  style={[styles.input, errors.otherLanguage ? styles.inputError : null]}
                  placeholder="Enter the language"
                  value={clientForm.otherLanguage}
                  onChangeText={(text) => handleClientInputChange('otherLanguage', text)}
                />
                {errors.otherLanguage ? (
                  <View style={styles.fieldErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.fieldErrorText}>{errors.otherLanguage}</Text>
                  </View>
                ) : null}
              </View>
            )}
            {errors.languagesKnown ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.languagesKnown}</Text>
              </View>
            ) : null}
          </View>
          
          {/* Complaints */}
          <View style={styles.formSection} ref={complaintRef}>
            <Text style={styles.sectionTitle}>Complaints <Text style={styles.requiredStar}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleComplaintChange('hearingIssues', !clientForm.complaint.hearingIssues)}
              >
                <View style={[styles.checkboxBox, clientForm.complaint.hearingIssues && styles.checkboxBoxChecked]}>
                  {clientForm.complaint.hearingIssues && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Hearing Issues</Text>
              </TouchableOpacity>
              
              {clientForm.complaint.hearingIssues && (
                <TextInput
                  style={styles.complaintInput}
                  placeholder="Please specify your hearing issues"
                  multiline
                  numberOfLines={2}
                  value={clientForm.complaint.hearingDetails}
                  onChangeText={(text) => handleComplaintDetailsChange('hearing', text)}
                />
              )}
            </View>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleComplaintChange('speakingIssues', !clientForm.complaint.speakingIssues)}
              >
                <View style={[styles.checkboxBox, clientForm.complaint.speakingIssues && styles.checkboxBoxChecked]}>
                  {clientForm.complaint.speakingIssues && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Speaking Issues</Text>
              </TouchableOpacity>
              
              {clientForm.complaint.speakingIssues && (
                <TextInput
                  style={styles.complaintInput}
                  placeholder="Please specify your speaking issues"
                  multiline
                  numberOfLines={2}
                  value={clientForm.complaint.speakingDetails}
                  onChangeText={(text) => handleComplaintDetailsChange('speaking', text)}
                />
              )}
            </View>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleComplaintChange('eatingIssues', !clientForm.complaint.eatingIssues)}
              >
                <View style={[styles.checkboxBox, clientForm.complaint.eatingIssues && styles.checkboxBoxChecked]}>
                  {clientForm.complaint.eatingIssues && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Eating Issues</Text>
              </TouchableOpacity>
              
              {clientForm.complaint.eatingIssues && (
                <TextInput
                  style={styles.complaintInput}
                  placeholder="Please specify your eating issues"
                  multiline
                  numberOfLines={2}
                  value={clientForm.complaint.eatingDetails}
                  onChangeText={(text) => handleComplaintDetailsChange('eating', text)}
                />
              )}
            </View>
            {errors.complaint ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.complaint}</Text>
              </View>
            ) : null}
          </View>
          
          {/* Medical Issues */}
          <View style={styles.formSection} ref={medicalRef}>
            <Text style={styles.sectionTitle}>Medical Issues <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.medicalIssues ? styles.inputError : null]}
              placeholder="Describe any medical issues you have"
              multiline
              numberOfLines={4}
              value={clientForm.medicalIssues}
              onChangeText={(text) => {
                handleClientInputChange('medicalIssues', text);
                if (errors.medicalIssues) setErrors({...errors, medicalIssues: ''});
              }}
            />
            {errors.medicalIssues ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.medicalIssues}</Text>
              </View>
            ) : null}
            
            <View style={styles.reportUploadContainer}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleDocumentUpload}
              >
                <Ionicons name="document-outline" size={20} color={COLORS.white} />
                <Text style={styles.uploadButtonText}>
                  {clientForm.reports ? 'Reports Uploaded' : 'Upload Medical Reports (PDF)'}
                </Text>
              </TouchableOpacity>
              
              {clientForm.reports && (
                <TouchableOpacity 
                  style={styles.removeReportButton}
                  onPress={() => handleClientInputChange('reports', null)}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.optionalText}>Optional</Text>
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: getBottomSpacing() + 20,
  },
  contentContainer: {
    padding: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  photoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0e7ff',
    borderWidth: 1,
    borderColor: '#d8c8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  modalBtnText: {
    marginLeft: 12,
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  optionalText: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: scaledFontSize(20),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryDark,
  },
  formContainer: {
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    ...SHADOWS.medium,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: scaledFontSize(20),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: scaledFontSize(14),
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  fieldErrorText: {
    color: COLORS.error,
    fontSize: scaledFontSize(12),
    marginLeft: 4,
  },
  requiredStar: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    marginBottom: 12,
  },
  photoUploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  photoUploadContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
    alignSelf: 'center',
  },
  photoUploadWrapper: {
    position: 'relative',
  },
  photoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  photoUploadText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 10,
  },
  reportUploadContainer: {
    position: 'relative',
    marginTop: 20,
    marginBottom: 8,
  },
  removeReportButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 10,
  },
  reportUploadedText: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryLight,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMedium,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: 10,
  },
  dropdownContainer: {
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
  },
  dropdownPlaceholder: {
    fontSize: scaledFontSize(14),
    color: COLORS.textLight,
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  languageChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryLight,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  languageChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  languageChipText: {
    fontSize: scaledFontSize(12),
    color: COLORS.textDark,
  },
  languageChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.textMedium,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
  },
  complaintInput: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
    marginLeft: 32,
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  uploadButtonText: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.white,
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
    ...SHADOWS.medium,
  },
  submitButtonText: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.white,
    marginRight: 8,
  },
});

export default ClientSignupScreen;
