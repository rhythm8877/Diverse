import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    FlatList
} from 'react-native';
import { allStatesAndUTs, isUnionTerritory, statesAndDistricts } from '../utils/locationData';
import { getBottomSpacing, getKeyboardBehavior, getKeyboardVerticalOffset, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import SearchableDropdown from './SearchableDropdown';
import NetInfo from '@react-native-community/netinfo';
import { auth, firestore } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const { width } = Dimensions.get('window');

// Languages commonly spoken in India
const indianLanguages = [
  'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Urdu',
  'Gujarati', 'Kannada', 'Malayalam', 'Tulu', 'Punjabi', 'Other'
];

// Child language disorder types
const childDisorderTypes = [
  'ASD', 'ADHD', 'CLP', 'CP', 'Fluency disorder', 'Speech sound disorder (SSD)'
];

// Adult language disorder types
const adultDisorderTypes = [
  'Dysarthria', 'Aphasia', 'Dysphagia'
];

// Designation options
const designationOptions = ['Student', 'Working', 'Professor'];

// Qualification options
const qualificationOptions = ['B.ASLP', 'MSc', 'Phd', 'Others'];

const SLPSignupScreen = ({ navigation, route }) => {
  // SLP form state - check for preserved data from DocumentUploadScreen
  const [slpForm, setSlpForm] = useState({
    name: route.params?.preservedFormData?.name || '',
    age: route.params?.preservedFormData?.age || '',
    gender: route.params?.preservedFormData?.gender || '',
    phone: route.params?.preservedFormData?.phone || '',
    email: route.params?.preservedFormData?.email || '',
    password: route.params?.preservedFormData?.password || '',
    languagesKnown: route.params?.preservedFormData?.languagesKnown || [],
    otherLanguage: route.params?.preservedFormData?.otherLanguage || '',
    state: route.params?.preservedFormData?.state || '',
    district: route.params?.preservedFormData?.district || '',
    designation: route.params?.preservedFormData?.designation || '',
    workPlace: route.params?.preservedFormData?.workPlace || '',
    semester: route.params?.preservedFormData?.semester || '',
    qualification: route.params?.preservedFormData?.qualification || '',
    otherQualification: route.params?.preservedFormData?.otherQualification || '',
    expertise: route.params?.preservedFormData?.expertise || {
      childLanguageDisorder: false,
      childDisorderTypes: [],
      adultLanguageDisorder: false,
      adultDisorderTypes: []
    },
    timings: route.params?.preservedFormData?.timings || '',
    documents: route.params?.preservedFormData?.documents || null
  });
  
  // Effect to update form when returning from DocumentUploadScreen
  useEffect(() => {
    if (route.params?.preservedFormData) {
      setSlpForm(route.params.preservedFormData);
      // Clear the params to avoid issues on rerender
      navigation.setParams({ preservedFormData: null });
    }
  }, [route.params?.preservedFormData]);
  
  // Common state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Field-specific errors
  const [errors, setErrors] = useState({
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
    designation: '',
    semester: '',
    qualification: '',
    otherQualification: '',
    expertise: '',
    timings: ''
  });
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle state selection for SLP
  const handleStateChange = (state) => {
    setSlpForm(prev => ({
      ...prev,
      state,
      district: '' // Reset district when state changes
    }));
  };
  
  // Check if selected state is a union territory
  const isSelectedStateUT = slpForm.state ? isUnionTerritory(slpForm.state) : false;
  
  // Get districts for selected state
  const districtsForSelectedState = slpForm.state ? statesAndDistricts[slpForm.state] || [] : [];
  
  // Handle SLP form input changes
  const handleSlpInputChange = (field, value) => {
    setSlpForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle SLP expertise changes
  const handleSlpExpertiseChange = (expertiseType, value) => {
    setSlpForm(prev => ({
      ...prev,
      expertise: {
        ...prev.expertise,
        [expertiseType]: value
      }
    }));
  };
  
  // Handle SLP disorder type selection
  const handleSlpDisorderTypeToggle = (disorderCategory, disorderType) => {
    setSlpForm(prev => {
      const currentTypes = [...prev.expertise[`${disorderCategory}Types`]];
      if (currentTypes.includes(disorderType)) {
        return {
          ...prev,
          expertise: {
            ...prev.expertise,
            [`${disorderCategory}Types`]: currentTypes.filter(type => type !== disorderType)
          }
        };
      } else {
        return {
          ...prev,
          expertise: {
            ...prev.expertise,
            [`${disorderCategory}Types`]: [...currentTypes, disorderType]
          }
        };
      }
    });
  };
  
  // Handle language selection for SLP
  const handleSlpLanguageToggle = (language) => {
    setSlpForm(prev => {
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
  
  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Reset all errors
    const newErrors = {
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
      designation: '',
      workPlace: '',
      semester: '',
      qualification: '',
      otherQualification: '',
      expertise: '',
      timings: ''
    };
    
    let isValid = true;
    
    // Validate name
    if (!slpForm.name.trim()) {
      newErrors.name = 'Please fill your name';
      isValid = false;
    }
    
    // Validate age
    if (!slpForm.age) {
      newErrors.age = 'Please fill your age';
      isValid = false;
    } else if (isNaN(slpForm.age) || parseInt(slpForm.age) <= 0) {
      newErrors.age = 'Please enter a valid age';
      isValid = false;
    }
    
    // Validate gender
    if (!slpForm.gender) {
      newErrors.gender = 'Please select your gender';
      isValid = false;
    }
    
    // Validate phone
    if (!slpForm.phone) {
      newErrors.phone = 'Please fill your phone number';
      isValid = false;
    } else if (slpForm.phone.length !== 10 || !/^\d+$/.test(slpForm.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }
    
    // Validate email
    if (!slpForm.email) {
      newErrors.email = 'Please fill your email';
      isValid = false;
    } else if (!isValidEmail(slpForm.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Validate password
    if (!slpForm.password) {
      newErrors.password = 'Please fill your password';
      isValid = false;
    } else if (slpForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    // Validate state
    if (!slpForm.state) {
      newErrors.state = 'Please select your state';
      isValid = false;
    }
    
    // Validate district (only if state is not a union territory)
    if (!isSelectedStateUT && !slpForm.district) {
      newErrors.district = 'Please select your district';
      isValid = false;
    }
    
    // Validate languages
    if (slpForm.languagesKnown.length === 0) {
      newErrors.languagesKnown = 'Please select at least one language';
      isValid = false;
    }
    
    // Validate other language if selected
    if (slpForm.languagesKnown.includes('Other') && !slpForm.otherLanguage.trim()) {
      newErrors.otherLanguage = 'Please specify the other language';
      isValid = false;
    }
    
    // Validate designation
    if (!slpForm.designation) {
      newErrors.designation = 'Please select your designation';
      isValid = false;
    }
    
    // Validate semester format if provided (but not required)
    if (slpForm.designation === 'Student' && slpForm.semester.trim() && (isNaN(slpForm.semester) || parseInt(slpForm.semester) <= 0)) {
      newErrors.semester = 'Please enter a valid semester number';
      isValid = false;
    }
    
    // Validate qualification
    if (!slpForm.qualification) {
      newErrors.qualification = 'Please select your qualification';
      isValid = false;
    }
    
    // Validate other qualification if selected
    if (slpForm.qualification === 'Others' && !slpForm.otherQualification.trim()) {
      newErrors.otherQualification = 'Please specify your qualification';
      isValid = false;
    }
    
    // Validate expertise
    if (!slpForm.expertise.childLanguageDisorder && !slpForm.expertise.adultLanguageDisorder) {
      newErrors.expertise = 'Please select at least one area of expertise';
      isValid = false;
    } else {
      // Validate child disorder types if child language disorder is selected
      if (slpForm.expertise.childLanguageDisorder && slpForm.expertise.childDisorderTypes.length === 0) {
        newErrors.expertise = 'Please select at least one child language disorder type';
        isValid = false;
      }
      
      // Validate adult disorder types if adult language disorder is selected
      if (slpForm.expertise.adultLanguageDisorder && slpForm.expertise.adultDisorderTypes.length === 0) {
        newErrors.expertise = 'Please select at least one adult language disorder type';
        isValid = false;
      }
    }
    
    // Validate timings
    if (!slpForm.timings.trim()) {
      newErrors.timings = 'Please provide your preferred timings';
      isValid = false;
    }
    
    // Update errors state
    setErrors(newErrors);
    
    // If validation fails, return
    if (!isValid) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Check for internet connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setLoading(false);
        Alert.alert(
          'Connection Issue',
          'Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Navigate to DocumentUploadScreen with the form data
      navigation.navigate('DocumentUpload', {
        userType: 'SLP',
        formData: slpForm,
        returnScreen: 'SLPSignup'
      });
      
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Error',
        'There was a problem checking your internet connection. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Go back to previous screen
  const goBack = () => {
    navigation.navigate('Signup');
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
          <Text style={styles.headerTitle}>SLP Registration</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.formContainer}>
          
          {/* Global error messages removed in favor of field-specific errors */}
          
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                placeholder="Enter your full name"
                value={slpForm.name}
                onChangeText={(text) => {
                  handleSlpInputChange('name', text);
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.age ? styles.inputError : null]}
                placeholder="Enter your age"
                keyboardType="numeric"
                value={slpForm.age}
                onChangeText={(text) => {
                  handleSlpInputChange('age', text);
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender <Text style={styles.requiredStar}>*</Text></Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity 
                  style={[styles.radioButton, slpForm.gender === 'Male' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleSlpInputChange('gender', 'Male');
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <View style={[styles.radioCircle, slpForm.gender === 'Male' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Male</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioButton, slpForm.gender === 'Female' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleSlpInputChange('gender', 'Female');
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <View style={[styles.radioCircle, slpForm.gender === 'Female' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Female</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioButton, slpForm.gender === 'Other' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleSlpInputChange('gender', 'Other');
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <View style={[styles.radioCircle, slpForm.gender === 'Other' && styles.radioCircleSelected]} />
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.phone ? styles.inputError : null]}
                placeholder="Enter your 10-digit phone number"
                keyboardType="phone-pad"
                maxLength={10}
                value={slpForm.phone}
                onChangeText={(text) => {
                  handleSlpInputChange('phone', text.replace(/[^0-9]/g, ''));
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={slpForm.email}
                onChangeText={(text) => {
                  handleSlpInputChange('email', text);
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
              <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  secureTextEntry={!showPassword}
                  value={slpForm.password}
                  onChangeText={(text) => {
                    handleSlpInputChange('password', text);
                    if (errors.password) setErrors({...errors, password: ''});
                  }}
                />
                <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={COLORS.textMedium} />
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
          
          {/* Languages Known */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Languages Known <Text style={styles.requiredStar}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>Clients will be allotted accordingly</Text>
            <View style={styles.languageContainer}>
              {indianLanguages.map(language => (
                <TouchableOpacity 
                  key={language}
                  style={[styles.languageChip, slpForm.languagesKnown.includes(language) && styles.languageChipSelected]}
                  onPress={() => {
                    handleSlpLanguageToggle(language);
                    if (errors.languagesKnown) setErrors({...errors, languagesKnown: ''});
                  }}
                >
                  <Text style={[styles.languageChipText, slpForm.languagesKnown.includes(language) && styles.languageChipTextSelected]}>
                    {language}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.languagesKnown ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.languagesKnown}</Text>
              </View>
            ) : null}
            
            {slpForm.languagesKnown.includes('Other') && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Specify Other Language <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.otherLanguage ? styles.inputError : null]}
                  placeholder="Enter the language"
                  value={slpForm.otherLanguage}
                  onChangeText={(text) => {
                    handleSlpInputChange('otherLanguage', text);
                    if (errors.otherLanguage) setErrors({...errors, otherLanguage: ''});
                  }}
                />
                {errors.otherLanguage ? (
                  <View style={styles.fieldErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.fieldErrorText}>{errors.otherLanguage}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          
          {/* Location Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.inputContainer}>
              <SearchableDropdown
                label="State"
                placeholder="Select your state"
                items={allStatesAndUTs}
                selectedItem={slpForm.state}
                onItemSelect={(state) => {
                  handleStateChange(state);
                  if (errors.state) setErrors({...errors, state: ''});
                }}
                required
              />
              {errors.state ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.state}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.inputContainer}>
              <SearchableDropdown
                label="District"
                placeholder={isSelectedStateUT ? "Not applicable for Union Territory" : "Select your district"}
                items={districtsForSelectedState}
                selectedItem={slpForm.district}
                onItemSelect={(district) => {
                  handleSlpInputChange('district', district);
                  if (errors.district) setErrors({...errors, district: ''});
                }}
                disabled={isSelectedStateUT || !slpForm.state}
                required={!isSelectedStateUT}
              />
              {!isSelectedStateUT && errors.district ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.fieldErrorText}>{errors.district}</Text>
                </View>
              ) : null}
            </View>
          </View>
          
          {/* Designation */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Designation <Text style={styles.requiredStar}>*</Text></Text>
            <View style={styles.radioGroup}>
              {designationOptions.map(option => (
                <TouchableOpacity 
                  key={option}
                  style={[styles.radioButton, slpForm.designation === option && styles.radioButtonSelected]}
                  onPress={() => {
                    handleSlpInputChange('designation', option);
                    if (errors.designation) setErrors({...errors, designation: ''});
                  }}
                >
                  <View style={[styles.radioCircle, slpForm.designation === option && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.designation ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.designation}</Text>
              </View>
            ) : null}
            
            {slpForm.designation === 'Working' && (
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Workplace</Text>
                <TextInput
                  style={[styles.input, errors.workPlace ? styles.inputError : null]}
                  placeholder="Enter your workplace"
                  value={slpForm.workPlace}
                  onChangeText={(text) => {
                    handleSlpInputChange('workPlace', text);
                    if (errors.workPlace) setErrors({...errors, workPlace: ''});
                  }}
                />
                {errors.workPlace ? (
                  <View style={styles.fieldErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.fieldErrorText}>{errors.workPlace}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          
          {/* Qualification */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Qualification <Text style={styles.requiredStar}>*</Text></Text>
            <View style={styles.qualificationContainer}>
              <View style={styles.qualificationRow}>
                {qualificationOptions.slice(0, 3).map(option => (
                  <TouchableOpacity 
                    key={option}
                    style={[styles.radioButton, slpForm.qualification === option && styles.radioButtonSelected]}
                    onPress={() => {
                      handleSlpInputChange('qualification', option);
                      if (errors.qualification) setErrors({...errors, qualification: ''});
                    }}
                  >
                    <View style={[styles.radioCircle, slpForm.qualification === option && styles.radioCircleSelected]} />
                    <Text style={styles.radioText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.qualificationRow}>
                <TouchableOpacity 
                  key="Others"
                  style={[styles.radioButton, slpForm.qualification === 'Others' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleSlpInputChange('qualification', 'Others');
                    if (errors.qualification) setErrors({...errors, qualification: ''});
                  }}
                >
                  <View style={[styles.radioCircle, slpForm.qualification === 'Others' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Others</Text>
                </TouchableOpacity>
              </View>
            </View>
            {errors.qualification ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.qualification}</Text>
              </View>
            ) : null}
            
            {slpForm.designation === 'Student' && (
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Semester</Text>
                <TextInput
                  style={[styles.input, errors.semester ? styles.inputError : null]}
                  placeholder="Enter your current semester"
                  keyboardType="numeric"
                  value={slpForm.semester}
                  onChangeText={(text) => {
                    handleSlpInputChange('semester', text);
                    if (errors.semester) setErrors({...errors, semester: ''});
                  }}
                />
                {errors.semester ? (
                  <View style={styles.fieldErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.fieldErrorText}>{errors.semester}</Text>
                  </View>
                ) : null}
              </View>
            )}
            
            {slpForm.qualification === 'Others' && (
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Specify Qualification <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.otherQualification ? styles.inputError : null]}
                  placeholder="Enter your qualification"
                  value={slpForm.otherQualification}
                  onChangeText={(text) => {
                    handleSlpInputChange('otherQualification', text);
                    if (errors.otherQualification) setErrors({...errors, otherQualification: ''});
                  }}
                />
                {errors.otherQualification ? (
                  <View style={styles.fieldErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.fieldErrorText}>{errors.otherQualification}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          
          {/* Expertise */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Expertise <Text style={styles.requiredStar}>*</Text></Text>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => {
                  handleSlpExpertiseChange('childLanguageDisorder', !slpForm.expertise.childLanguageDisorder);
                  if (errors.expertise) setErrors({...errors, expertise: ''});
                }}
              >
                <View style={[styles.checkboxBox, slpForm.expertise.childLanguageDisorder && styles.checkboxBoxChecked]}>
                  {slpForm.expertise.childLanguageDisorder && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Child Language Disorder</Text>
              </TouchableOpacity>
              
              {slpForm.expertise.childLanguageDisorder && (
                <View style={styles.disorderTypesContainer}>
                  <Text style={styles.disorderTypesLabel}>Specify: <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.disorderChipsContainer}>
                    {childDisorderTypes.map(type => (
                      <TouchableOpacity 
                        key={type}
                        style={[
                          styles.disorderChip, 
                          slpForm.expertise.childDisorderTypes.includes(type) && styles.disorderChipSelected
                        ]}
                        onPress={() => {
                          handleSlpDisorderTypeToggle('childDisorder', type);
                          if (errors.expertise) setErrors({...errors, expertise: ''});
                        }}
                      >
                        <Text style={[
                          styles.disorderChipText, 
                          slpForm.expertise.childDisorderTypes.includes(type) && styles.disorderChipTextSelected
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => {
                  handleSlpExpertiseChange('adultLanguageDisorder', !slpForm.expertise.adultLanguageDisorder);
                  if (errors.expertise) setErrors({...errors, expertise: ''});
                }}
              >
                <View style={[styles.checkboxBox, slpForm.expertise.adultLanguageDisorder && styles.checkboxBoxChecked]}>
                  {slpForm.expertise.adultLanguageDisorder && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Adult Language Disorder</Text>
              </TouchableOpacity>
              
              {slpForm.expertise.adultLanguageDisorder && (
                <View style={styles.disorderTypesContainer}>
                  <Text style={styles.disorderTypesLabel}>Specify: <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.disorderChipsContainer}>
                    {adultDisorderTypes.map(type => (
                      <TouchableOpacity 
                        key={type}
                        style={[
                          styles.disorderChip, 
                          slpForm.expertise.adultDisorderTypes.includes(type) && styles.disorderChipSelected
                        ]}
                        onPress={() => {
                          handleSlpDisorderTypeToggle('adultDisorder', type);
                          if (errors.expertise) setErrors({...errors, expertise: ''});
                        }}
                      >
                        <Text style={[
                          styles.disorderChipText, 
                          slpForm.expertise.adultDisorderTypes.includes(type) && styles.disorderChipTextSelected
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
            {errors.expertise ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.expertise}</Text>
              </View>
            ) : null}
          </View>
          
          {/* Timings */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Preferred Timings <Text style={styles.requiredStar}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>Timing and days for client interaction preferred</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.timings ? styles.inputError : null]}
              placeholder="E.g. Monday: 5:30 pm to 7:30 pm, Sunday: 12:00 pm to 5 pm"
              multiline
              numberOfLines={3}
              value={slpForm.timings}
              onChangeText={(text) => {
                handleSlpInputChange('timings', text);
                if (errors.timings) setErrors({...errors, timings: ''});
              }}
            />
            {errors.timings ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.timings}</Text>
              </View>
            ) : null}
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
                <Text style={styles.submitButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
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
    backgroundColor: COLORS.secondary,
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
  qualificationContainer: {
    width: '100%',
  },
  qualificationRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
    gap: 12,
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
  disorderTypesContainer: {
    marginLeft: 32,
    marginTop: 8,
  },
  disorderTypesLabel: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  disorderChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  disorderChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.secondaryLight,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.secondaryDark,
  },
  disorderChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  disorderChipText: {
    fontSize: scaledFontSize(12),
    color: COLORS.textDark,
  },
  disorderChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  requiredStar: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldErrorText: {
    color: COLORS.error,
    fontSize: scaledFontSize(12),
    marginLeft: 4,
  },
  inputError: {
    borderColor: COLORS.error,
  },
});

export default SLPSignupScreen;
