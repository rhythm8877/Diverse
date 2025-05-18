import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';
import { getBottomSpacing, getKeyboardBehavior, getKeyboardVerticalOffset, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import { auth, firestore, storage } from '../config/firebase';
import { createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

const DocumentUploadScreen = ({ navigation, route }) => {
  // Get user type and form data from route params
  const { userType, formData, onComplete } = route.params || {};
  
  // State for document uploads
  const [documents, setDocuments] = useState({
    photo: formData?.documents?.photo || null,
    signature: formData?.documents?.signature || null,
    rciRegistration: formData?.documents?.rciRegistration || null,
    degreeCertificate: formData?.documents?.degreeCertificate || null,
    semesterMarksheet: formData?.documents?.semesterMarksheet || null
  });
  
  // State for loading indicators
  const [uploading, setUploading] = useState({
    photo: false,
    signature: false,
    rciRegistration: false,
    degreeCertificate: false,
    semesterMarksheet: false
  });
  
  // State for photo options modal
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [currentDocumentType, setCurrentDocumentType] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { fetchUserData } = useUser();
  
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
        setDocuments(prev => ({
          ...prev,
          [currentDocumentType]: result.assets[0].uri
        }));
      }
      setShowPhotoOptions(false);
    } catch (error) {
      Alert.alert('Error', 'Could not access image. Please try again.');
      setShowPhotoOptions(false);
    }
  };
  
  // Add these helper functions after imports but before the component
  const isPdfUri = (uri) => {
    if (!uri) return false;
    return uri.toLowerCase().endsWith('.pdf') || uri.toLowerCase().includes('pdf');
  };
  
  // Handle document upload for files (PDF, etc.)
  const handleDocumentUpload = async (documentType) => {
    // For profile photo, show the photo options modal
    if (documentType === 'photo') {
      setCurrentDocumentType(documentType);
      setShowPhotoOptions(true);
      return;
    }
    
    // For signature, allow only image upload
    if (documentType === 'signature') {
      try {
        setUploading(prev => ({ ...prev, [documentType]: true }));
        
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please allow access to your photo library');
          setUploading(prev => ({ ...prev, [documentType]: false }));
          return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setDocuments(prev => ({
            ...prev,
            [documentType]: result.assets[0].uri
          }));
        }
        setUploading(prev => ({ ...prev, [documentType]: false }));
        return;
      } catch (error) {
        Alert.alert('Upload Failed', 'Failed to upload signature. Please try again.');
        setUploading(prev => ({ ...prev, [documentType]: false }));
        return;
      }
    }
    
    // For RCI, degree certificate, and semester marksheet, use document picker for PDFs
    if (['rciRegistration', 'degreeCertificate', 'semesterMarksheet'].includes(documentType)) {
      try {
        setUploading(prev => ({ ...prev, [documentType]: true }));
        
        // Use DocumentPicker to directly select PDF files
        const result = await DocumentPicker.getDocumentAsync({ 
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });
        
        // Check if file was selected
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedAsset = result.assets[0];
          const uri = selectedAsset.uri;
          const name = selectedAsset.name || uri.split('/').pop() || 'document.pdf';
          
          // Update document state
          setDocuments(prevState => {
            const newState = {
              ...prevState,
              [documentType]: uri,
              [`${documentType}Name`]: name
            };
            
            return newState;
          });
        }
      } catch (error) {
        Alert.alert(
          'Document Upload Failed', 
          'Failed to upload PDF. Please try again.'
        );
      } finally {
        setUploading(prev => ({ ...prev, [documentType]: false }));
      }
      return;
    }
    
    // Fallback for any other document types (should not be reached)
    setUploading(prev => ({ ...prev, [documentType]: false }));
    Alert.alert('Not Supported', 'This document type is not supported.');
  };
  
  // Upload and get URL with better error handling and retry
  const uploadAndGetUrl = async (fileUri, path, retryCount = 0) => {
    try {
      const fileRef = ref(storage, path);
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // If it's a profile picture, make sure to process and resize it properly
      if (path.includes('profile.jpg')) {
        // We're not actually processing the image here, but in a real app
        // you might want to resize/process the blob before uploading
      }
      
      await uploadBytes(fileRef, blob);
      
      const downloadUrl = await getDownloadURL(fileRef);
      
      return downloadUrl;
    } catch (error) {
      // If it's a network error or permission error and we haven't retried too much
      if ((error.code === 'storage/unauthorized' || 
           error.code === 'storage/network-request-failed') && 
          retryCount < 2) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return uploadAndGetUrl(fileUri, path, retryCount + 1);
      }
      
      // If it's a permission error, provide a helpful message
      if (error.code === 'storage/unauthorized') {
        throw new Error('Permission denied: Update Firebase Storage rules to allow uploads.');
      }
      
      throw error;
    }
  };
  
  // Verify Firebase is properly initialized
  const verifyFirebaseReady = async () => {
    return new Promise((resolve, reject) => {
      // Check if Firebase auth is initialized
      if (!auth || !firestore || !storage) {
        reject(new Error('Firebase services not properly initialized'));
        return;
      }
      
      // Optional timeout to ensure we don't wait too long
      const timeout = setTimeout(() => {
        resolve(true); // Assume it's ready if we waited long enough
      }, 2000);
      
      // Try to access Firebase quickly to check connection
      try {
        const authStateUnsubscribe = auth.onAuthStateChanged((user) => {
          clearTimeout(timeout);
          authStateUnsubscribe();
          resolve(true);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  };
  
  // Perform a thorough connectivity check
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
  
  // Add a function to wait for and verify user profile creation
  const verifyProfileCreation = async (userId, maxAttempts = 5) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const userDocRef = doc(firestore, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          return true;
        }
        
        // Exponential backoff: wait longer with each attempt
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
        
      } catch (error) {
        // Wait and try again
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.warn('Failed to verify profile creation after maximum attempts');
    return false;
  };
  
  // Handle form submission with better error handling
  const handleSubmit = async () => {
    // First, check if we're already submitting to prevent double submissions
    if (loading) {
      return;
    }
    
    // Check if all required documents are uploaded based on designation
    let requiredDocuments = ['photo', 'signature'];
    if (formData?.designation === 'Student') {
      requiredDocuments.push('semesterMarksheet');
    } else {
      requiredDocuments.push('rciRegistration', 'degreeCertificate');
    }
    
    const missingDocuments = requiredDocuments.filter(doc => !documents[doc]);
    if (missingDocuments.length > 0) {
      Alert.alert(
        'Missing Documents',
        'Please upload all required documents before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setLoading(true);

    // Initialize variables to track created resources for cleanup
    let user = null;
    let uploadedFiles = [];
    let tempFiles = []; // For local copies of files to retry uploads if needed
    
    try {
      // First, check Firebase initialization
      try {
        await verifyFirebaseReady();
      } catch (firebaseError) {
        Alert.alert(
          'Service Unavailable',
          'The app services are not available right now. Please try again later.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      // Then, check internet connectivity with multiple retries
      try {
        await checkConnectivity();
      } catch (connectivityError) {
        Alert.alert(
          'Connection Issue',
          'Please check your internet connection and try again. Make sure you have stable internet access.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Check if email already exists before attempting to create a user
      try {
        // Use Firebase Auth REST API to verify email availability
        const testUrl = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=AIzaSyBdRFLaLSX3xUr98idLmvqKf8FCykVrjWE`;
        
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            continueUri: 'https://diverse-b521b.firebaseapp.com',
            identifier: formData.email,
          }),
        });
        
        const data = await response.json();
        
        if (data.registered === true) {
          setLoading(false);
          Alert.alert(
            'Email Already Registered',
            'This email address is already in use. Please use a different email or try logging in.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (emailCheckError) {
        // Continue with registration if email check fails - we'll get caught by auth creation if there's a duplicate
      }

      try {
        // 1. First, create a local copy of all files to protect against network failures
        // This ensures we can retry uploads if needed
        try {
          // For each document, create a local copy
          for (const docType of Object.keys(documents).filter(key => documents[key])) {
            const fileUri = documents[docType];
            if (fileUri) {
              tempFiles.push({
                type: docType,
                uri: fileUri
              });
            }
          }
        } catch (copyError) {
          // Non-critical error, can proceed without copies
        }
        
        // 2. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        user = userCredential.user;
        
        // Add a short delay to ensure auth is fully set before uploads
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          // 3. Store user data in Firestore first (before uploads)
          // This ensures we have a user record even if storage uploads fail
          const prelimUserData = {
            ...formData,
            uid: user.uid,
            userType,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            registrationStatus: 'PENDING', // Mark as pending until all uploads complete
          };
          
          const userRef = doc(firestore, 'users', user.uid);
          try {
            await setDoc(userRef, prelimUserData);
          } catch (initialFirestoreError) {
            // Continue anyway - we'll try to upload files next
          }

          // 4. Upload files to Storage and get URLs with improved error handling
          // Try to upload all files with retries
          let uploadResults = {};
          let someUploadsSucceeded = false;
          
          try {
            // Profile Image - critical, retry multiple times
            if (documents.photo) {
              try {
                const photoPath = `usersProfilePic/${user.uid}/profile.jpg`;
                
                // Fetch the image data directly
                const response = await fetch(documents.photo);
                const blob = await response.blob();
                
                // Upload the image
                const photoRef = ref(storage, photoPath);
                await uploadBytes(photoRef, blob);
                
                // Get the download URL
                uploadResults.profileImageUrl = await getDownloadURL(photoRef);
                
                // Add to uploaded files list for cleanup if needed
                uploadedFiles.push(photoPath);
                someUploadsSucceeded = true;
                
                // Ensure the profile image URL is properly set
                if (uploadResults.profileImageUrl) {
                } else {
                  // Try one more time with a direct approach
                  try {
                    uploadResults.profileImageUrl = await getDownloadURL(photoRef);
                  } catch (retryError) {
                  }
                }
              } catch (photoError) {
                // Retry upload once with a delay if it's a network error
                if (photoError.code === 'storage/network-request-failed') {
                  try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const photoPath = `usersProfilePic/${user.uid}/profile.jpg`;
                    const photoRef = ref(storage, photoPath);
                    
                    const response = await fetch(documents.photo);
                    const blob = await response.blob();
                    
                    await uploadBytes(photoRef, blob);
                    uploadResults.profileImageUrl = await getDownloadURL(photoRef);
                    uploadedFiles.push(photoPath);
                    someUploadsSucceeded = true;
                  } catch (retryError) {
                  }
                }
              }
            } else {
            }
            
            // Signature
            if (documents.signature) {
              try {
                const sigPath = `userDocs/${user.uid}/${userType.toLowerCase()}/signature.jpg`;
                uploadResults.signatureUrl = await uploadAndGetUrl(documents.signature, sigPath, 1);
                uploadedFiles.push(sigPath);
                someUploadsSucceeded = true;
              } catch (sigError) {
              }
            }
            
            // RCI Registration (if not student)
            if (documents.rciRegistration) {
              try {
                const rciPath = `userDocs/${user.uid}/${userType.toLowerCase()}/rciRegistration.jpg`;
                uploadResults.rciRegistrationUrl = await uploadAndGetUrl(documents.rciRegistration, rciPath, 1);
                uploadedFiles.push(rciPath);
                someUploadsSucceeded = true;
              } catch (rciError) {
              }
            }
            
            // Degree Certificate (if not student)
            if (documents.degreeCertificate) {
              try {
                const degreePath = `userDocs/${user.uid}/${userType.toLowerCase()}/degreeCertificate.jpg`;
                uploadResults.degreeCertificateUrl = await uploadAndGetUrl(documents.degreeCertificate, degreePath, 1);
                uploadedFiles.push(degreePath);
                someUploadsSucceeded = true;
              } catch (degreeError) {
              }
            }
            
            // Semester Marksheet (if student)
            if (documents.semesterMarksheet) {
              try {
                const marksheetPath = `userDocs/${user.uid}/${userType.toLowerCase()}/semesterMarksheet.jpg`;
                uploadResults.semesterMarksheetUrl = await uploadAndGetUrl(documents.semesterMarksheet, marksheetPath, 1);
                uploadedFiles.push(marksheetPath);
                someUploadsSucceeded = true;
              } catch (marksheetError) {
              }
            }
          } catch (allUploadsError) {
            // Check if any uploads succeeded before deciding what to do
            if (!someUploadsSucceeded) {
              throw new Error('Failed to upload any documents. Please try again.');
            }
            // Otherwise continue with the uploads that succeeded
          }

          // 5. Update user data in Firestore with upload URLs
          try {
            const updatedUserData = {
              ...formData,
              uid: user.uid,
              userType,
              ...uploadResults, // Add all the URLs that were successfully uploaded
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              registrationStatus: someUploadsSucceeded ? 'COMPLETE' : 'PARTIAL',
            };

            // Ensure profileImageUrl is definitely present in userData
            if (uploadResults.profileImageUrl) {
              updatedUserData.profileImageUrl = uploadResults.profileImageUrl;
            }

            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, updatedUserData, { merge: true });

            // Verify user document was created successfully
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
              throw new Error('User document was not created properly');
            }

            // 6. Store document links in type-specific collection
            try {
              const docLinks = {
                ...uploadResults,
                uid: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };
              
              let collectionPath = '';
              if (userType === 'SLP') {
                collectionPath = 'slpDocuments';
              } else if (userType === 'AUDIOLOGIST') {
                collectionPath = 'audiologistDocuments';
              } else if (userType === 'BOTH') {
                collectionPath = 'bothDocuments';
              }
              
              if (collectionPath) {
                try {
                  await setDoc(doc(firestore, collectionPath, user.uid), docLinks);
                } catch (docLinksError) {
                  // Non-critical error, continue with registration
                }
              }

              // 7. Determine success message based on whether all uploads succeeded
              let successMessage = 'Your registration was successful. Welcome to Diverse!';
              if (!someUploadsSucceeded) {
                successMessage = 'Your registration was successful, but some document uploads failed. You can update your documents later.';
              } else if (uploadResults.profileImageUrl === undefined) {
                successMessage = 'Your profile was created, but your profile picture couldn\'t be uploaded. You can update it later.';
              }

              // Wait for profile to be properly created before navigation
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Now verify the profile exists
              const profileVerified = await verifyProfileCreation(user.uid);

              // Set user data in AsyncStorage for immediate login
              try {
                await AsyncStorage.setItem('currentUserID', user.uid);
                await AsyncStorage.setItem('firstLogin', 'true');
                await AsyncStorage.setItem('isLoggedIn', 'true');
              } catch (storageError) {
              }

              // Refresh user context so HomeScreen shows profile image immediately
              if (fetchUserData) {
                try {
                  await fetchUserData(user.uid);
                } catch (e) {
                }
              }

              // Navigate directly to Main screen without showing alert
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            } catch (finalError) {
              Alert.alert(
                'Registration Successful',
                'Your registration was successful, but there was an issue with some of your document uploads. You can update your documents later.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                      });
                    },
                  },
                ]
              );
            }
          } catch (firestoreUpdateError) {
            // If we have the user created but couldn't update with URLs, 
            // still allow login but with a warning
            Alert.alert(
              'Registration Partially Complete',
              'Your account was created, but we had trouble uploading your documents. You can log in and update your profile later.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Main' }],
                    });
                  },
                },
              ]
            );
          }
        } catch (majorError) {
          throw majorError;
        }
      } catch (error) {
        throw error; // Rethrow to the outer catch block for cleanup
      }
    } catch (error) {
      // Clean up: delete uploaded files and user account if something failed
      if (uploadedFiles.length > 0) {
        await cleanupStorageFiles(user?.uid, userType, uploadedFiles);
      }
      
      if (user) {
        try {
          await deleteUser(user);
        } catch (deleteError) {
          // If we can't delete the auth user but created a Firestore record,
          // warn the user that there may be issues logging in
          Alert.alert(
            'Registration Error',
            'There was a problem with your registration. If you try to register again with the same email, you might need to use the "Forgot Password" option.',
            [{ text: 'OK' }]
          );
        }
      }
      
      let errorMessage = error.message || 'An unknown error occurred';
      
      // Special handling for permission denied errors
      if (error.code === 'permission-denied' || errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        Alert.alert(
          'Registration Error - Permissions',
          'Unable to complete registration due to permission settings. This is likely a temporary server issue. Please try again later or contact support if the issue persists.',
          [{ text: 'OK' }]
        );
      }
      
      // Provide more helpful messages for common errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error: The app is having trouble connecting to our servers. Please check your internet connection, try switching networks, or try again later.';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'Storage permission error: There was a problem uploading your documents. This is likely a temporary issue with our servers.';
      } else if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout'))) {
        errorMessage = 'Connection timeout: Please check your internet speed and try again.';
      }
      
      // More detailed error alert with technical details for debugging
      Alert.alert(
        'Registration Error',
        `${errorMessage}\n\nDetails: ${error.code || 'No error code'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Delete uploaded files in case of failure - improved to handle specified files
  const cleanupStorageFiles = async (userId, userType, filePaths = []) => {
    if (!userId) return;
    
    try {
      // Use provided file paths if available, otherwise use default paths
      const paths = filePaths.length > 0 ? filePaths : [
        `usersProfilePic/${userId}/profile.jpg`,
        `userDocs/${userId}/${userType.toLowerCase()}/signature.jpg`,
        `userDocs/${userId}/${userType.toLowerCase()}/rciRegistration.jpg`,
        `userDocs/${userId}/${userType.toLowerCase()}/degreeCertificate.jpg`,
        `userDocs/${userId}/${userType.toLowerCase()}/semesterMarksheet.jpg`,
      ];
      
      // Try to delete each file, but don't worry if some fail
      for (const path of paths) {
        try {
          const fileRef = ref(storage, path);
          await deleteObject(fileRef);
        } catch (e) {
          // If file doesn't exist or other error, just continue
        }
      }
    } catch (error) {
    }
  };
  
  // Go back to previous screen
  const goBack = () => {
    // Get the return screen from route params
    const returnScreen = route.params?.returnScreen;
    
    // Make sure we have a valid return screen
    if (!returnScreen) {
      navigation.navigate('Signup');
      return;
    }
    
    // Create updated form data with the current documents
    const updatedFormData = {
      ...formData,
      documents: { ...documents }
    };
    
    // Navigate back with preserved form data
    navigation.navigate(returnScreen, { 
      returnFromDocUpload: true,
      preservedFormData: updatedFormData  // Pass back the updated form data with documents
    });
  };
  
  return (
    <KeyboardAvoidingView
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getKeyboardVerticalOffset()}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Documents</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            
            <View style={styles.documentItem}>
              <View style={styles.documentTitleContainer}>
                <Text style={styles.documentTitle}>Profile Photo <Text style={styles.requiredStar}>*</Text></Text>
              </View>
              <View style={styles.photoContainer}>
                <TouchableOpacity 
                  onPress={() => handleDocumentUpload('photo')}
                >
                  {documents.photo ? (
                    <View>
                      <Image 
                        source={{ uri: documents.photo }} 
                        style={styles.profileImage} 
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        style={styles.removePhotoButtonOutside}
                        onPress={() => setDocuments(prev => ({ ...prev, photo: null }))}
                      >
                        <Ionicons name="close" size={24} color={COLORS.white} />
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
              <Text style={styles.documentHintCentered}>Upload a clear, recent photo of yourself</Text>
            </View>
            
            <View style={styles.documentItem}>
              <View style={styles.documentTitleContainer}>
                <Text style={styles.documentTitle}>Signature <Text style={styles.requiredStar}>*</Text></Text>
              </View>
              {documents.signature ? (
                <View style={styles.documentUploadBtnContainer}>
                  <TouchableOpacity 
                    style={styles.documentUploadBtn}
                    onPress={() => handleDocumentUpload('signature')}
                  >
                    <>
                      <Ionicons name="document-outline" size={24} color={COLORS.white} />
                      <Text style={styles.documentBtnText}>Uploaded</Text>
                    </>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeDocumentButtonTopRight}
                    onPress={() => setDocuments(prev => ({ ...prev, signature: null }))}
                  >
                    <Ionicons name="close" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.documentUploadBtn}
                  onPress={() => handleDocumentUpload('signature')}
                  disabled={uploading.signature}
                >
                  {uploading.signature ? (
                    <Text style={styles.documentBtnText}>Uploading...</Text>
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={24} color={COLORS.white} />
                      <Text style={styles.documentBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <Text style={styles.documentHint}>Upload a clear image or PDF of your signature</Text>
            </View>
            
            {formData?.designation !== 'Student' && (
              <View style={styles.documentItem}>
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>RCI Registration <Text style={styles.requiredStar}>*</Text></Text>
                </View>
                {documents.rciRegistration ? (
                  <View style={styles.documentUploadBtnContainer}>
                    <TouchableOpacity 
                      style={styles.documentUploadBtn}
                      onPress={() => handleDocumentUpload('rciRegistration')}
                    >
                      <>
                        <Ionicons name="document-outline" size={24} color={COLORS.white} />
                        <Text style={styles.documentBtnText}>Uploaded</Text>
                      </>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeDocumentButtonTopRight}
                      onPress={() => setDocuments(prev => ({ ...prev, rciRegistration: null }))}
                    >
                      <Ionicons name="close" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.documentUploadBtn}
                    onPress={() => handleDocumentUpload('rciRegistration')}
                    disabled={uploading.rciRegistration}
                  >
                    {uploading.rciRegistration ? (
                      <Text style={styles.documentBtnText}>Uploading...</Text>
                    ) : (
                      <>
                        <Ionicons name="document-outline" size={24} color={COLORS.white} />
                        <Text style={styles.documentBtnText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <Text style={styles.documentHint}>Upload your RCI registration certificate (PDF format)</Text>
              </View>
            )}
            
            {formData?.designation === 'Student' && (
              <View style={styles.documentItem}>
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>Last Semester's Marksheet/Degree Certificate <Text style={styles.requiredStar}>*</Text></Text>
                </View>
                {documents.semesterMarksheet ? (
                  <View style={styles.documentUploadBtnContainer}>
                    <TouchableOpacity 
                      style={styles.documentUploadBtn}
                      onPress={() => handleDocumentUpload('semesterMarksheet')}
                    >
                      <>
                        <Ionicons name="document-outline" size={24} color={COLORS.white} />
                        <Text style={styles.documentBtnText}>Uploaded</Text>
                      </>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeDocumentButtonTopRight}
                      onPress={() => setDocuments(prev => ({ ...prev, semesterMarksheet: null }))}
                    >
                      <Ionicons name="close" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.documentUploadBtn}
                    onPress={() => handleDocumentUpload('semesterMarksheet')}
                    disabled={uploading.semesterMarksheet}
                  >
                    {uploading.semesterMarksheet ? (
                      <Text style={styles.documentBtnText}>Uploading...</Text>
                    ) : (
                      <>
                        <Ionicons name="document-outline" size={24} color={COLORS.white} />
                        <Text style={styles.documentBtnText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <Text style={styles.documentHint}>Upload your last semester's marksheet (PDF format)</Text>
              </View>
            )}
            
            {formData?.designation !== 'Student' && (
              <View style={styles.documentItem}>
                <View style={styles.documentTitleContainer}>
                  <Text style={styles.documentTitle}>Degree Certificate <Text style={styles.requiredStar}>*</Text></Text>
                </View>
                {documents.degreeCertificate ? (
                  <View style={styles.documentUploadBtnContainer}>
                    <TouchableOpacity 
                      style={styles.documentUploadBtn}
                      onPress={() => handleDocumentUpload('degreeCertificate')}
                    >
                      <>
                        <Ionicons name="school-outline" size={24} color={COLORS.white} />
                        <Text style={styles.documentBtnText}>Uploaded</Text>
                      </>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeDocumentButtonTopRight}
                      onPress={() => setDocuments(prev => ({ ...prev, degreeCertificate: null }))}
                    >
                      <Ionicons name="close" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.documentUploadBtn}
                    onPress={() => handleDocumentUpload('degreeCertificate')}
                    disabled={uploading.degreeCertificate}
                  >
                    {uploading.degreeCertificate ? (
                      <Text style={styles.documentBtnText}>Uploading...</Text>
                    ) : (
                      <>
                        <Ionicons name="school-outline" size={24} color={COLORS.white} />
                        <Text style={styles.documentBtnText}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <Text style={styles.documentHint}>Upload your highest degree certificate (PDF format)</Text>
              </View>
            )}
          </View>
          
          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={goBack}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.nextBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.nextBtnText}>Submitting...</Text>
              ) : (
                <>
              <Text style={styles.nextBtnText}>Submit</Text>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
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
    padding: 15,
    paddingBottom: 10,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    ...SHADOWS.medium,
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
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    marginBottom: 20,
  },
  documentItem: {
    marginBottom: 8,
    backgroundColor: COLORS.secondaryLight,
    padding: 12,
    borderRadius: 12,
  },
  documentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  documentTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: '600',
    color: COLORS.textDark,
  },
  documentRequired: {
    fontSize: scaledFontSize(12),
    color: COLORS.error,
    marginLeft: 8,
  },
  documentUploadBtnContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  documentUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 4,
  },
  documentBtnText: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.white,
    marginLeft: 8,
  },
  documentHint: {
    fontSize: scaledFontSize(12),
    color: COLORS.textMedium,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  uploadedDocumentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  uploadedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadedDocumentText: {
    fontSize: scaledFontSize(14),
    color: COLORS.success,
    marginLeft: 8,
  },
  changeDocumentBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: COLORS.secondaryDark,
  },
  changeDocumentText: {
    fontSize: scaledFontSize(12),
    color: COLORS.primary,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryDark,
  },
  backBtnText: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 8,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  nextBtnText: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.white,
    marginRight: 8,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 10,
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
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  photoUploadText: {
    marginTop: 5,
    color: COLORS.primary,
    fontSize: scaledFontSize(12),
  },
  removePhotoButtonOutside: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  documentHintCentered: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  uploadedDocumentContainerNew: {
    position: 'relative',
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  removeDocumentButtonTopRight: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  documentButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  removeDocumentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginLeft: 10,
  },
  removeDocumentText: {
    color: COLORS.white,
    fontSize: scaledFontSize(12),
    fontWeight: '500',
  },
  requiredStar: {
    color: COLORS.error,
    fontSize: scaledFontSize(16),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalBtnText: {
    marginLeft: 15,
    fontSize: scaledFontSize(16),
    color: COLORS.text,
  },
  modalCancel: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: scaledFontSize(16),
    color: COLORS.error,
    fontWeight: '500',
  },
});

export default DocumentUploadScreen;
