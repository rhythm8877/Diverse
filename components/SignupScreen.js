import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS, SHADOWS } from '../utils/theme';
import { getBottomSpacing, getKeyboardBehavior, getKeyboardVerticalOffset, scaledFontSize } from '../utils/responsive';

const { width } = Dimensions.get('window');

// User types
const USER_TYPES = {
  CLIENT: 'Client/Patient',
  SLP: 'Speech-language Pathologist',
  AUDIOLOGIST: 'Audiologist',
  BOTH: 'Both SLP & Audiologist'
};

const SignupScreen = ({ navigation }) => {
  // Only need state for user type selection in this simplified version
  const [userType, setUserType] = useState(null);

  // Handle user type selection and navigate to appropriate screen
  const handleUserTypeSelect = (type) => {
    setUserType(type);
    
    switch(type) {
      case 'CLIENT':
        navigation.navigate('ClientSignup');
        break;
      case 'SLP':
        navigation.navigate('SLPSignup');
        break;
      case 'AUDIOLOGIST':
        navigation.navigate('AudiologistSignup');
        break;
      case 'BOTH':
        // Navigate directly to the combined SLP & Audiologist screen
        navigation.navigate('BothSLPAudiologist');
        break;
    }
  };
  
  // Navigate to login screen
  const goToLogin = () => {
    navigation.navigate('Login');
  };
  
  // Render user type selection screen
  const renderUserTypeSelection = () => {
    return (
      <View style={styles.userTypeContainer}>
        <Text style={styles.userTypeTitle}>Select User Type</Text>
        <Text style={styles.userTypeSubtitle}>Please select the category that best describes you</Text>
        
        {Object.entries(USER_TYPES).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={styles.userTypeButton}
            onPress={() => handleUserTypeSelect(key)}
          >
            <Text style={styles.userTypeButtonText}>{value}</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // Render content based on user type
  const renderContent = () => {
    // Always show user type selection
    return renderUserTypeSelection();
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
          <TouchableOpacity onPress={goToLogin} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {renderContent()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={goToLogin}>
            <Text style={styles.loginLink}>Login</Text>
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
  userTypeContainer: {
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  userTypeTitle: {
    fontSize: scaledFontSize(22),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  userTypeSubtitle: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    marginBottom: 30,
    textAlign: 'center',
  },
  userTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 15,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  userTypeButtonText: {
    fontSize: scaledFontSize(16),
    fontWeight: '500',
    color: COLORS.textDark,
  },
  formContainer: {
    padding: 20,
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
  backButtonText: {
    fontSize: scaledFontSize(14),
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
  },
  loginLink: {
    fontSize: scaledFontSize(14),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 5,
  }
});

export default SignupScreen;
