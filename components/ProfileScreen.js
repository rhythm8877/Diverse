import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Linking, Platform } from 'react-native';
import { IS_TABLET, getBottomSpacing, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import Header from './Header';
import { useUser } from '../context/UserContext';

const ProfileScreen = ({ navigation }) => {
  const { userData, isLoggedIn, logout } = useUser();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Force redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isLoggedIn, navigation]);

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      // Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Logout Error', error.message || 'Failed to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  // Handle login
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  // Handle register
  const handleRegister = () => {
    navigation.navigate('Signup');
  };

  // Get user's expertise as a formatted string
  const getUserExpertise = () => {
    if (!userData) return '';

    let expertise = [];

    // Handle SLP expertise
    if (userData.userType === 'SLP' || userData.userType === 'BOTH') {
      // Safely check expertiseSLP properties
      if (userData.expertiseSLP && typeof userData.expertiseSLP === 'object') {
        if (userData.expertiseSLP.childLanguageDisorder === true) {
          expertise.push('Child Language Disorders');
          
          // Handle child disorder types if available
          if (userData.expertiseSLP.childDisorderTypes && typeof userData.expertiseSLP.childDisorderTypes === 'object') {
            const childTypes = [];
            for (const key in userData.expertiseSLP.childDisorderTypes) {
              if (userData.expertiseSLP.childDisorderTypes[key] === true) {
                childTypes.push(key);
              }
            }
            if (childTypes.length > 0) {
              expertise.push(`Child Disorder Types: ${childTypes.join(', ')}`);
            }
          }
        }
        
        if (userData.expertiseSLP.adultLanguageDisorder === true) {
          expertise.push('Adult Language Disorders');
          
          // Handle adult disorder types if available
          if (userData.expertiseSLP.adultDisorderTypes && typeof userData.expertiseSLP.adultDisorderTypes === 'object') {
            const adultTypes = [];
            for (const key in userData.expertiseSLP.adultDisorderTypes) {
              if (userData.expertiseSLP.adultDisorderTypes[key] === true) {
                adultTypes.push(key);
              }
            }
            if (adultTypes.length > 0) {
              expertise.push(`Adult Disorder Types: ${adultTypes.join(', ')}`);
            }
          }
        }
      }
    }

    // Handle Audiologist expertise
    if (userData.userType === 'AUDIOLOGIST' || userData.userType === 'BOTH') {
      if (userData.expertiseAudiologist && typeof userData.expertiseAudiologist === 'object') {
        if (userData.expertiseAudiologist.audiologicalTesting) {
          expertise.push('Audiological Testing');
        }
        if (userData.expertiseAudiologist.audioVisualTherapy) {
          expertise.push('Audio-Visual Therapy');
        }
        if (userData.expertiseAudiologist.tinnitus) {
          expertise.push('Tinnitus');
        }
        if (userData.expertiseAudiologist.centralAuditoryProcessingDisorder) {
          expertise.push('Central Auditory Processing Disorder');
        }
        if (userData.expertiseAudiologist.auditoryNeuropathySpectrumDisorder) {
          expertise.push('Auditory Neuropathy Spectrum Disorder');
        }
        if (userData.expertiseAudiologist.vestibularDisorder) {
          expertise.push('Vestibular Disorder');
        }
      }
    }

    return expertise.join(', ');
  };

  // Get user type display text
  const getUserTypeText = () => {
    if (!userData) return '';
    
    switch (userData.userType) {
      case 'CLIENT':
        return 'Client';
      case 'SLP':
        return 'Speech-Language Pathologist';
      case 'AUDIOLOGIST':
        return 'Audiologist';
      case 'BOTH':
        return 'SLP & Audiologist';
      default:
        return '';
    }
  };

  // Render different content based on login state
  const renderContent = () => {
    if (isLoggedIn && userData) {
      // User is logged in - show profile info based on user type
      return (
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileContainer}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {imageLoading && (
                  <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size={IS_TABLET ? "large" : "small"} color={COLORS.primary} />
                  </View>
                )}
                {userData.profileImageUrl ? (
                  <Image 
                    source={{ uri: userData.profileImageUrl }} 
                    style={styles.avatar}
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={() => setImageLoading(false)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <View style={styles.defaultAvatarContainer}>
                    <Ionicons name="person" size={IS_TABLET ? 70 : 50} color={COLORS.primary} />
                  </View>
                )}
                {imageError && (
                  <View style={styles.imageErrorContainer}>
                    <Ionicons name="person" size={IS_TABLET ? 70 : 50} color={COLORS.primary} />
                  </View>
                )}
              </View>
              <Text style={styles.userName}>{userData.name || 'User'}</Text>
              <View style={styles.userTypeTag}>
                <Text style={styles.userTypeText}>{getUserTypeText()}</Text>
              </View>
              <Text style={styles.userEmail}>{userData.email || ''}</Text>
            </View>

            {/* Common Info Section */}
            <View style={styles.infoSection}>
              {userData.phone && (
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={24} color={COLORS.primary} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{userData.phone}</Text>
                  </View>
                </View>
              )}
              
              {(userData.state || userData.district) && (
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={24} color={COLORS.primary} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>
                      {userData.district ? `${userData.district}, ` : ''}
                      {userData.state || ''}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* User Type-Specific Information */}
            {userData.userType === 'CLIENT' ? (
              <View style={styles.bioSection}>
                <Text style={styles.bioTitle}>Client Information</Text>
                {userData.age && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Age:</Text>
                    <Text style={styles.bioItemValue}>{userData.age}</Text>
                  </View>
                )}
                {userData.gender && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Gender:</Text>
                    <Text style={styles.bioItemValue}>{userData.gender}</Text>
                  </View>
                )}
                
                {/* Languages Known */}
                {userData.languagesKnown && userData.languagesKnown.length > 0 && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Languages:</Text>
                    <Text style={styles.bioItemValue}>
                      {userData.languagesKnown.join(', ')}
                      {userData.languagesKnown.includes('Other') && userData.otherLanguage ? 
                        `, ${userData.otherLanguage}` : ''}
                    </Text>
                  </View>
                )}
                
                {/* Complaints Section */}
                <Text style={styles.sectionSubtitle}>Complaints</Text>
                
                {/* Hearing Issues */}
                {userData.complaint?.hearingIssues && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Hearing Issues:</Text>
                    <Text style={styles.bioItemValue}>{userData.complaint.hearingDetails || 'Not specified'}</Text>
                  </View>
                )}
                
                {/* Speaking Issues */}
                {userData.complaint?.speakingIssues && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Speaking Issues:</Text>
                    <Text style={styles.bioItemValue}>{userData.complaint.speakingDetails || 'Not specified'}</Text>
                  </View>
                )}
                
                {/* Eating Issues */}
                {userData.complaint?.eatingIssues && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Eating Issues:</Text>
                    <Text style={styles.bioItemValue}>{userData.complaint.eatingDetails || 'Not specified'}</Text>
                  </View>
                )}
                
                {/* Medical Issues */}
                {userData.medicalIssues && (
                  <View style={styles.bioItem}>
                    <Text style={styles.bioItemLabel}>Medical Issues:</Text>
                    <Text style={styles.bioItemValue}>{userData.medicalIssues}</Text>
                  </View>
                )}
                
                {/* Medical Reports Link */}
                {userData.reportsUrl && (
                  <TouchableOpacity 
                    style={styles.reportButton}
                    onPress={() => Linking.openURL(userData.reportsUrl)}
                  >
                    <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.reportButtonText}>View Medical Reports</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // SLP, Audiologist, or Both
              <View>
                {/* Professional Information */}
                <View style={styles.bioSection}>
                  <Text style={styles.bioTitle}>Professional Information</Text>
                  {userData.designation && (
                    <View style={styles.bioItem}>
                      <Text style={styles.bioItemLabel}>Designation:</Text>
                      <Text style={styles.bioItemValue}>{userData.designation}</Text>
                    </View>
                  )}
                  {userData.qualification && (
                    <View style={styles.bioItem}>
                      <Text style={styles.bioItemLabel}>Qualification:</Text>
                      <Text style={styles.bioItemValue}>{userData.qualification}</Text>
                    </View>
                  )}
                  {userData.workPlace && (
                    <View style={styles.bioItem}>
                      <Text style={styles.bioItemLabel}>Workplace:</Text>
                      <Text style={styles.bioItemValue}>{userData.workPlace}</Text>
                    </View>
                  )}
                </View>

                {/* Expertise Section */}
                {getUserExpertise() && (
                  <View style={styles.bioSection}>
                    <Text style={styles.bioTitle}>Areas of Expertise</Text>
                    <Text style={styles.expertiseText}>{getUserExpertise()}</Text>
                  </View>
                )}

                {/* Availability/Timings */}
                {userData.timings && (
                  <View style={styles.bioSection}>
                    <Text style={styles.bioTitle}>Availability</Text>
                    <Text style={styles.timingsText}>{userData.timings}</Text>
                  </View>
                )}

                {/* Language Section */}
                {userData.languagesKnown && userData.languagesKnown.length > 0 && (
                  <View style={styles.bioSection}>
                    <Text style={styles.bioTitle}>Languages</Text>
                    <View style={styles.languageContainer}>
                      {userData.languagesKnown.map((lang, index) => (
                        <View key={index} style={styles.languageTag}>
                          <Text style={styles.languageText}>{lang}</Text>
                        </View>
                      ))}
                      {userData.otherLanguage && (
                        <View style={styles.languageTag}>
                          <Text style={styles.languageText}>{userData.otherLanguage}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Document Verification Status (for professionals) */}
            {userData.userType !== 'CLIENT' && (
              <View style={styles.documentStatusSection}>
                <Text style={styles.bioTitle}>Verification Status</Text>
                <View style={[
                  styles.verificationStatusTag, 
                  { backgroundColor: 'rgba(39, 174, 96, 0.1)' }
                ]}>
                  <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                  <Text style={[styles.verificationStatusText, { color: '#27AE60' }]}>
                    Documents Verified
                  </Text>
                </View>
              </View>
            )}

            {/* Join Date */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>
                    {userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    }) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.logoutButtonText}>Log Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    } else {
      // User is not logged in - show login/register options
      return (
        <View style={styles.authContainer}>
          <Image 
            source={require('../assets/adaptive-icon.png')} 
            style={styles.authLogo}
          />
          <Text style={styles.authTitle}>Welcome to Diverse</Text>
          <Text style={styles.authSubtitle}>Sign in to access your profile</Text>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: IS_TABLET ? 36 : 18,
    paddingTop: Platform.OS === 'android' ? 0 : 10,
    paddingBottom: getBottomSpacing(),
  },
  scrollContainer: {
    flex: 1,
  },
  profileContainer: {
    flex: 1,
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: IS_TABLET ? 150 : 120,
    height: IS_TABLET ? 150 : 120,
    borderRadius: IS_TABLET ? 75 : 60,
    backgroundColor: COLORS.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultAvatarContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
  },
  imageLoadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
    zIndex: 1,
  },
  imageErrorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
    zIndex: 1,
  },
  userName: {
    fontSize: scaledFontSize(24),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  userTypeTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  userTypeText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: scaledFontSize(14),
  },
  userEmail: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
  },
  bioSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  bioTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  bioItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bioItemLabel: {
    fontSize: scaledFontSize(16),
    fontWeight: '600',
    color: COLORS.textDark,
    width: '35%',
  },
  bioItemValue: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
    flex: 1,
  },
  expertiseText: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
    lineHeight: 24,
  },
  timingsText: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
    lineHeight: 24,
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  languageTag: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  languageText: {
    color: COLORS.textDark,
    fontSize: scaledFontSize(14),
  },
  documentStatusSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  verificationStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verificationStatusText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: scaledFontSize(14),
  },
  infoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
  },
  infoValue: {
    fontSize: scaledFontSize(16),
    fontWeight: '500',
    color: COLORS.textDark,
  },
  logoutButton: {
    backgroundColor: '#DC3545',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: -30, // Offset for the header padding
  },
  authLogo: {
    width: IS_TABLET ? 150 : 120,
    height: IS_TABLET ? 150 : 120,
    marginBottom: 24,
  },
  authTitle: {
    fontSize: scaledFontSize(24),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
    marginBottom: 30,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: scaledFontSize(16),
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: scaledFontSize(16),
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 12,
    marginBottom: 8
  },
  reportButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...SHADOWS.light
  },
  reportButtonText: {
    color: COLORS.primary,
    fontSize: scaledFontSize(14),
    fontWeight: '600',
    marginLeft: 8
  },
});

export default ProfileScreen;
