import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
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

// Audiologist expertise options
const audiologistExpertiseOptions = [
  'Audiological Testing',
  'Auditory Verbal Therapy',
  'Tinnitus',
  'Central Auditory Processing Disorder',
  'Auditory Neuropathy Spectrum Disorder',
  'Vestibular Disorder',
  'Others'
];

// Designation options
const designationOptions = ['Student', 'Working', 'Professor'];

// Qualification options
const qualificationOptions = ['B.ASLP', 'MSc', 'Phd', 'Others'];


const BothSLPAudiologistScreen = ({ navigation, route }) => {
  // Form state for both SLP and Audiologist
  // Check if returning from document upload screen and reset loading state
  React.useEffect(() => {
    if (route.params?.returnFromDocUpload) {
      setLoading(false);
      
      // If we have preserved form data, restore it
      if (route.params?.preservedFormData) {
        setBothSLPAudiologistForm(route.params.preservedFormData);
      }
    }
  }, [route.params?.returnFromDocUpload, route.params?.preservedFormData]);
  // SLP form state
  const [bothSLPAudiologistForm, setBothSLPAudiologistForm] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    password: '',
    languagesKnown: [],
    otherLanguage: '',
    state: '',
    district: '',
    designation: '',
    workPlace: '',
    semester: '',
    qualification: '',
    otherQualification: '',
    expertiseSLP: {
      childLanguageDisorder: false,
      childDisorderTypes: [],
      adultLanguageDisorder: false,
      adultDisorderTypes: []
    },
    expertiseAudiologist: {
      audiologicalTesting: false,
      audioVisualTherapy: false,
      tinnitus: false,
      centralAuditoryProcessingDisorder: false,
      auditoryNeuropathySpectrumDisorder: false,
      vestibularDisorder: false,
      others: false
    },
    otherExpertiseAudiologist: '',
    timings: ''
  });
  
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
    expertiseSLP: '',
    expertiseAudiologist: '',
    timings: ''
  });
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle state selection for SLP
  const handleStateChange = (state) => {
    setBothSLPAudiologistForm(prev => ({
      ...prev,
      state,
      district: '' // Reset district when state changes
    }));
  };
  
  // Check if selected state is a union territory
  const isSelectedStateUT = bothSLPAudiologistForm.state ? isUnionTerritory(bothSLPAudiologistForm.state) : false;
  
  // Get districts for selected state
  const districtsForSelectedState = bothSLPAudiologistForm.state ? statesAndDistricts[bothSLPAudiologistForm.state] || [] : [];
  
  // Handle SLP form input changes
  const handleBothSLPAudiologistInputChange = (field, value) => {
    setBothSLPAudiologistForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle SLP expertise changes
  const handleBothSLPAudiologistExpertiseChange = (expertiseType, value, expertiseCategory) => {
    setBothSLPAudiologistForm(prev => ({
      ...prev,
      [expertiseCategory]: {
        ...prev[expertiseCategory],
        [expertiseType]: value
      }
    }));
  };
  
  // Handle SLP disorder type selection
  const handleBothSLPAudiologistDisorderTypeToggle = (disorderCategory, disorderType) => {
    setBothSLPAudiologistForm(prev => {
      const currentTypes = [...prev.expertiseSLP[`${disorderCategory}Types`]];
      if (currentTypes.includes(disorderType)) {
        return {
          ...prev,
          expertiseSLP: {
            ...prev.expertiseSLP,
            [`${disorderCategory}Types`]: currentTypes.filter(type => type !== disorderType)
          }
        };
      } else {
        return {
          ...prev,
          expertiseSLP: {
            ...prev.expertiseSLP,
            [`${disorderCategory}Types`]: [...currentTypes, disorderType]
          }
        };
      }
    });
  };
  
  // Handle language selection for SLP
  const handleBothSLPAudiologistLanguageToggle = (language) => {
    setBothSLPAudiologistForm(prev => {
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
  const handleSubmit = () => {
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
      expertiseSLP: '',
      expertiseAudiologist: '',
      timings: ''
    };
    
    let isValid = true;
    
    // Validate name
    if (!bothSLPAudiologistForm.name.trim()) {
      newErrors.name = 'Please fill your name';
      isValid = false;
    }
    
    // Validate age
    if (!bothSLPAudiologistForm.age) {
      newErrors.age = 'Please fill your age';
      isValid = false;
    } else if (isNaN(bothSLPAudiologistForm.age) || parseInt(bothSLPAudiologistForm.age) <= 0) {
      newErrors.age = 'Please enter a valid age';
      isValid = false;
    }
    
    // Validate gender
    if (!bothSLPAudiologistForm.gender) {
      newErrors.gender = 'Please select your gender';
      isValid = false;
    }
    
    // Validate phone
    if (!bothSLPAudiologistForm.phone) {
      newErrors.phone = 'Please fill your phone number';
      isValid = false;
    } else if (bothSLPAudiologistForm.phone.length !== 10 || !/^\d+$/.test(bothSLPAudiologistForm.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }
    
    // Validate email
    if (!bothSLPAudiologistForm.email) {
      newErrors.email = 'Please fill your email';
      isValid = false;
    } else if (!isValidEmail(bothSLPAudiologistForm.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Validate password
    if (!bothSLPAudiologistForm.password) {
      newErrors.password = 'Please fill your password';
      isValid = false;
    } else if (bothSLPAudiologistForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    // Validate state
    if (!bothSLPAudiologistForm.state) {
      newErrors.state = 'Please select your state';
      isValid = false;
    }
    
    // Validate district (only if state is not a union territory)
    if (!isSelectedStateUT && !bothSLPAudiologistForm.district) {
      newErrors.district = 'Please select your district';
      isValid = false;
    }
    
    // Validate languages
    if (bothSLPAudiologistForm.languagesKnown.length === 0) {
      newErrors.languagesKnown = 'Please select at least one language';
      isValid = false;
    }
    
    // Validate other language if selected
    if (bothSLPAudiologistForm.languagesKnown.includes('Other') && !bothSLPAudiologistForm.otherLanguage.trim()) {
      newErrors.otherLanguage = 'Please specify the other language';
      isValid = false;
    }
    
    // Validate designation
    if (!bothSLPAudiologistForm.designation) {
      newErrors.designation = 'Please select your designation';
      isValid = false;
    }
    
    // Validate semester format if provided (but not required)
    if (bothSLPAudiologistForm.designation === 'Student' && bothSLPAudiologistForm.semester.trim() && (isNaN(bothSLPAudiologistForm.semester) || parseInt(bothSLPAudiologistForm.semester) <= 0)) {
      newErrors.semester = 'Please enter a valid semester number';
      isValid = false;
    }
    
    // Validate qualification
    if (!bothSLPAudiologistForm.qualification) {
      newErrors.qualification = 'Please select your qualification';
      isValid = false;
    }
    
    // Validate other qualification if selected
    if (bothSLPAudiologistForm.qualification === 'Others' && !bothSLPAudiologistForm.otherQualification.trim()) {
      newErrors.otherQualification = 'Please specify your qualification';
      isValid = false;
    }
    
    // Validate SLP expertise
    if (!bothSLPAudiologistForm.expertiseSLP.childLanguageDisorder && !bothSLPAudiologistForm.expertiseSLP.adultLanguageDisorder) {
      newErrors.expertiseSLP = 'Please select at least one area of SLP expertise';
      isValid = false;
    } else {
      // Validate child disorder types if child language disorder is selected
      if (bothSLPAudiologistForm.expertiseSLP.childLanguageDisorder && bothSLPAudiologistForm.expertiseSLP.childDisorderTypes.length === 0) {
        newErrors.expertiseSLP = 'Please select at least one child language disorder type';
        isValid = false;
      }
      
      // Validate adult disorder types if adult language disorder is selected
      if (bothSLPAudiologistForm.expertiseSLP.adultLanguageDisorder && bothSLPAudiologistForm.expertiseSLP.adultDisorderTypes.length === 0) {
        newErrors.expertiseSLP = 'Please select at least one adult language disorder type';
        isValid = false;
      }
    }

    // Validate Audiologist expertise
    if (!bothSLPAudiologistForm.expertiseAudiologist.audiologicalTesting && 
        !bothSLPAudiologistForm.expertiseAudiologist.audioVisualTherapy && 
        !bothSLPAudiologistForm.expertiseAudiologist.tinnitus && 
        !bothSLPAudiologistForm.expertiseAudiologist.centralAuditoryProcessingDisorder && 
        !bothSLPAudiologistForm.expertiseAudiologist.auditoryNeuropathySpectrumDisorder && 
        !bothSLPAudiologistForm.expertiseAudiologist.vestibularDisorder &&
        !bothSLPAudiologistForm.expertiseAudiologist.others) {
      newErrors.expertiseAudiologist = 'Please select at least one area of Audiologist expertise';
      isValid = false;
    }
    
    // Validate other expertise for Audiologist if Others is selected
    if (bothSLPAudiologistForm.expertiseAudiologist.others && !bothSLPAudiologistForm.otherExpertiseAudiologist.trim()) {
      newErrors.otherExpertiseAudiologist = 'Please specify your expertise';
      isValid = false;
    }
    
    // Validate timings
    if (!bothSLPAudiologistForm.timings.trim()) {
      newErrors.timings = 'Please provide your preferred timings';
      isValid = false;
    }
    
    // Update errors state
    setErrors(newErrors);
    
    // If validation fails, return
    if (!isValid) {
      return;
    }
    
    // If validation passes, proceed with form submission
    setLoading(true);
    
    // Navigate to DocumentUploadScreen with form data
    navigation.navigate('DocumentUpload', { 
      userType: 'BOTH',
      formData: bothSLPAudiologistForm,
      returnScreen: 'BothSLPAudiologist',
    });
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
          <Text style={styles.headerTitle}>Both Registration</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.formContainer}>
          
          {/* Global error messages removed in favor of field-specific errors */}
          
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name <Text style={styles.requiredStar}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                placeholder="Enter your full name"
                value={bothSLPAudiologistForm.name}
                onChangeText={(text) => {
                  handleBothSLPAudiologistInputChange('name', text);
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
                value={bothSLPAudiologistForm.age}
                onChangeText={(text) => {
                  handleBothSLPAudiologistInputChange('age', text);
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
                  style={[styles.radioButton, bothSLPAudiologistForm.gender === 'Male' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleBothSLPAudiologistInputChange('gender', 'Male');
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <View style={[styles.radioCircle, bothSLPAudiologistForm.gender === 'Male' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Male</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioButton, bothSLPAudiologistForm.gender === 'Female' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleBothSLPAudiologistInputChange('gender', 'Female');
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <View style={[styles.radioCircle, bothSLPAudiologistForm.gender === 'Female' && styles.radioCircleSelected]} />
                  <Text style={styles.radioText}>Female</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioButton, bothSLPAudiologistForm.gender === 'Other' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleBothSLPAudiologistInputChange('gender', 'Other');
                    if (errors.gender) setErrors({...errors, gender: ''});
                  }}
                >
                  <View style={[styles.radioCircle, bothSLPAudiologistForm.gender === 'Other' && styles.radioCircleSelected]} />
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
                value={bothSLPAudiologistForm.phone}
                onChangeText={(text) => {
                  handleBothSLPAudiologistInputChange('phone', text.replace(/[^0-9]/g, ''));
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
                value={bothSLPAudiologistForm.email}
                onChangeText={(text) => {
                  handleBothSLPAudiologistInputChange('email', text);
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
                  value={bothSLPAudiologistForm.password}
                  onChangeText={(text) => {
                    handleBothSLPAudiologistInputChange('password', text);
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
                  style={[styles.languageChip, bothSLPAudiologistForm.languagesKnown.includes(language) && styles.languageChipSelected]}
                  onPress={() => {
                    handleBothSLPAudiologistLanguageToggle(language);
                    if (errors.languagesKnown) setErrors({...errors, languagesKnown: ''});
                  }}
                >
                  <Text style={[styles.languageChipText, bothSLPAudiologistForm.languagesKnown.includes(language) && styles.languageChipTextSelected]}>
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
            
            {bothSLPAudiologistForm.languagesKnown.includes('Other') && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Specify Other Language <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.otherLanguage ? styles.inputError : null]}
                  placeholder="Enter the language"
                  value={bothSLPAudiologistForm.otherLanguage}
                  onChangeText={(text) => {
                    handleBothSLPAudiologistInputChange('otherLanguage', text);
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
                selectedItem={bothSLPAudiologistForm.state}
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
                selectedItem={bothSLPAudiologistForm.district}
                onItemSelect={(district) => {
                  handleBothSLPAudiologistInputChange('district', district);
                  if (errors.district) setErrors({...errors, district: ''});
                }}
                disabled={isSelectedStateUT || !bothSLPAudiologistForm.state}
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
                  style={[styles.radioButton, bothSLPAudiologistForm.designation === option && styles.radioButtonSelected]}
                  onPress={() => {
                    handleBothSLPAudiologistInputChange('designation', option);
                    if (errors.designation) setErrors({...errors, designation: ''});
                  }}
                >
                  <View style={[styles.radioCircle, bothSLPAudiologistForm.designation === option && styles.radioCircleSelected]} />
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
            
            {bothSLPAudiologistForm.designation === 'Working' && (
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Workplace</Text>
                <TextInput
                  style={[styles.input, errors.workPlace ? styles.inputError : null]}
                  placeholder="Enter your workplace"
                  value={bothSLPAudiologistForm.workPlace}
                  onChangeText={(text) => {
                    handleBothSLPAudiologistInputChange('workPlace', text);
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
                    style={[styles.radioButton, bothSLPAudiologistForm.qualification === option && styles.radioButtonSelected]}
                    onPress={() => {
                      handleBothSLPAudiologistInputChange('qualification', option);
                      if (errors.qualification) setErrors({...errors, qualification: ''});
                    }}
                  >
                    <View style={[styles.radioCircle, bothSLPAudiologistForm.qualification === option && styles.radioCircleSelected]} />
                    <Text style={styles.radioText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.qualificationRow}>
                <TouchableOpacity 
                  key="Others"
                  style={[styles.radioButton, bothSLPAudiologistForm.qualification === 'Others' && styles.radioButtonSelected]}
                  onPress={() => {
                    handleBothSLPAudiologistInputChange('qualification', 'Others');
                    if (errors.qualification) setErrors({...errors, qualification: ''});
                  }}
                >
                  <View style={[styles.radioCircle, bothSLPAudiologistForm.qualification === 'Others' && styles.radioCircleSelected]} />
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
            
            {bothSLPAudiologistForm.designation === 'Student' && (
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Semester</Text>
                <TextInput
                  style={[styles.input, errors.semester ? styles.inputError : null]}
                  placeholder="Enter your current semester"
                  keyboardType="numeric"
                  value={bothSLPAudiologistForm.semester}
                  onChangeText={(text) => {
                    handleBothSLPAudiologistInputChange('semester', text);
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
            
            {bothSLPAudiologistForm.qualification === 'Others' && (
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Specify Qualification <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.otherQualification ? styles.inputError : null]}
                  placeholder="Enter your qualification"
                  value={bothSLPAudiologistForm.otherQualification}
                  onChangeText={(text) => {
                    handleBothSLPAudiologistInputChange('otherQualification', text);
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
          
          {/* SLP Expertise */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Expertise in SLP <Text style={styles.requiredStar}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>Select your areas of SLP expertise</Text>
            
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => {
                  handleBothSLPAudiologistExpertiseChange('childLanguageDisorder', !bothSLPAudiologistForm.expertiseSLP.childLanguageDisorder, 'expertiseSLP');
                  if (errors.expertiseSLP) setErrors({...errors, expertiseSLP: ''});
                }}
              >
                <View style={[styles.checkboxBox, bothSLPAudiologistForm.expertiseSLP.childLanguageDisorder && styles.checkboxBoxChecked]}>
                  {bothSLPAudiologistForm.expertiseSLP.childLanguageDisorder && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Child Language Disorder</Text>
              </TouchableOpacity>
              
              {bothSLPAudiologistForm.expertiseSLP.childLanguageDisorder && (
                <View style={styles.disorderTypesContainer}>
                  <Text style={styles.disorderTypesLabel}>Specify: <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.disorderChipsContainer}>
                    {childDisorderTypes.map(type => (
                      <TouchableOpacity 
                        key={type}
                        style={[
                          styles.disorderChip, 
                          bothSLPAudiologistForm.expertiseSLP.childDisorderTypes.includes(type) && styles.disorderChipSelected
                        ]}
                        onPress={() => {
                          handleBothSLPAudiologistDisorderTypeToggle('childDisorder', type);
                          if (errors.expertiseSLP) setErrors({...errors, expertiseSLP: ''});
                        }}
                      >
                        <Text style={[
                          styles.disorderChipText, 
                          bothSLPAudiologistForm.expertiseSLP.childDisorderTypes.includes(type) && styles.disorderChipTextSelected
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
                  handleBothSLPAudiologistExpertiseChange('adultLanguageDisorder', !bothSLPAudiologistForm.expertiseSLP.adultLanguageDisorder, 'expertiseSLP');
                  if (errors.expertiseSLP) setErrors({...errors, expertiseSLP: ''});
                }}
              >
                <View style={[styles.checkboxBox, bothSLPAudiologistForm.expertiseSLP.adultLanguageDisorder && styles.checkboxBoxChecked]}>
                  {bothSLPAudiologistForm.expertiseSLP.adultLanguageDisorder && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Adult Language Disorder</Text>
              </TouchableOpacity>
              
              {bothSLPAudiologistForm.expertiseSLP.adultLanguageDisorder && (
                <View style={styles.disorderTypesContainer}>
                  <Text style={styles.disorderTypesLabel}>Specify: <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.disorderChipsContainer}>
                    {adultDisorderTypes.map(type => (
                      <TouchableOpacity 
                        key={type}
                        style={[
                          styles.disorderChip, 
                          bothSLPAudiologistForm.expertiseSLP.adultDisorderTypes.includes(type) && styles.disorderChipSelected
                        ]}
                        onPress={() => {
                          handleBothSLPAudiologistDisorderTypeToggle('adultDisorder', type);
                          if (errors.expertiseSLP) setErrors({...errors, expertiseSLP: ''});
                        }}
                      >
                        <Text style={[
                          styles.disorderChipText, 
                          bothSLPAudiologistForm.expertiseSLP.adultDisorderTypes.includes(type) && styles.disorderChipTextSelected
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
            {errors.expertiseSLP ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.expertiseSLP}</Text>
              </View>
            ) : null}
          </View>
          
          {/* Audiologist Expertise */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Expertise in Audiology <Text style={styles.requiredStar}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>Select your areas of Audiologist expertise</Text>
            
            {audiologistExpertiseOptions.map(option => {
              const key = option.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').charAt(0).toLowerCase() + 
                option.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(1);
              
              return (
                <View key={option} style={styles.checkboxContainer}>
                  <TouchableOpacity 
                    style={styles.checkbox}
                    onPress={() => {
                      handleBothSLPAudiologistExpertiseChange(key, !bothSLPAudiologistForm.expertiseAudiologist[key], 'expertiseAudiologist');
                      if (errors.expertiseAudiologist) setErrors({...errors, expertiseAudiologist: ''});
                    }}
                  >
                    <View style={[styles.checkboxBox, bothSLPAudiologistForm.expertiseAudiologist[key] && styles.checkboxBoxChecked]}>
                      {bothSLPAudiologistForm.expertiseAudiologist[key] && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                    </View>
                    <Text style={styles.checkboxLabel}>{option}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            
            {/* Other Expertise Input Field for Audiologist */}
            {bothSLPAudiologistForm.expertiseAudiologist.others && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Specify Other Expertise <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.otherExpertiseAudiologist ? styles.inputError : null]}
                  placeholder="Please specify your expertise"
                  value={bothSLPAudiologistForm.otherExpertiseAudiologist}
                  onChangeText={(text) => {
                    setBothSLPAudiologistForm(prev => ({
                      ...prev,
                      otherExpertiseAudiologist: text
                    }));
                    if (errors.otherExpertiseAudiologist) setErrors({...errors, otherExpertiseAudiologist: ''});
                  }}
                />
                {errors.otherExpertiseAudiologist ? (
                  <View style={styles.fieldErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.fieldErrorText}>{errors.otherExpertiseAudiologist}</Text>
                  </View>
                ) : null}
              </View>
            )}
            
            {errors.expertiseAudiologist ? (
              <View style={styles.fieldErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.fieldErrorText}>{errors.expertiseAudiologist}</Text>
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
              value={bothSLPAudiologistForm.timings}
              onChangeText={(text) => {
                handleBothSLPAudiologistInputChange('timings', text);
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


export default BothSLPAudiologistScreen;
