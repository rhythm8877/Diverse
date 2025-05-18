import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../utils/theme';
import { IS_TABLET, scaledFontSize, getStatusBarHeight } from '../utils/responsive';
import { useUser } from '../context/UserContext';

const PermissionCheckScreen = ({ navigation }) => {
  const { isLoggedIn } = useUser();
  const [checkResults, setCheckResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  
  const getSecurityRulesText = () => {
    let notificationsRule = '';
    let therapistsRule = '';
    
    if (checkResults) {
      // Notifications checks
      if (checkResults.notifications.write && checkResults.notifications.read) {
        notificationsRule = "✅ Notifications permissions are correct";
      } else {
        notificationsRule = "❌ Notifications permissions need to be updated:\n";
        if (!checkResults.notifications.write) {
          notificationsRule += "- Can't write to notifications collection\n";
        }
        if (!checkResults.notifications.read) {
          notificationsRule += "- Can't read from notifications collection\n";
        }
        if (checkResults.notifications.error) {
          notificationsRule += `- Error: ${checkResults.notifications.error}\n`;
        }
      }
      
      // Therapists checks
      if (checkResults.therapists.read) {
        therapistsRule = "✅ Therapist read permissions are correct";
      } else {
        therapistsRule = "❌ Therapist read permissions need to be updated\n";
        if (checkResults.therapists.error) {
          therapistsRule += `- Error: ${checkResults.therapists.error}\n`;
        }
      }
    }
    
    return { notificationsRule, therapistsRule };
  };
  
  const renderResults = () => {
    if (!checkResults) return null;
    
    const { notificationsRule, therapistsRule } = getSecurityRulesText();
    
    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Permission Check Results</Text>
        
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Notifications Collection:</Text>
          <Text style={styles.resultValue}>{notificationsRule}</Text>
        </View>
        
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Therapists Data:</Text>
          <Text style={styles.resultValue}>{therapistsRule}</Text>
        </View>
        
        <View style={styles.fixSection}>
          <Text style={styles.fixTitle}>How to Fix</Text>
          <Text style={styles.fixText}>
            1. Go to the Firebase Console{'\n'}
            2. Select your project{'\n'}
            3. Go to Firestore Database{'\n'}
            4. Click on the "Rules" tab{'\n'}
            5. Update the rules (see FirebaseSecurityRules.md){'\n'}
            6. Click "Publish"{'\n'}
          </Text>
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
        <Text style={styles.headerTitle}>Firebase Permissions</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Firebase Security Rules Check</Text>
          <Text style={styles.infoText}>
            This screen helps you check if the Firebase security rules are properly 
            configured for the app. If you're experiencing permission errors, 
            run the check below and update your Firebase rules as needed.
          </Text>
        </View>
        
        {renderResults()}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  infoTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    lineHeight: 20,
  },
  resultsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.light,
  },
  resultsTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: scaledFontSize(14),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    lineHeight: 20,
  },
  fixSection: {
    backgroundColor: COLORS.secondaryDark,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  fixTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  fixText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
    lineHeight: 22,
  },
});

export default PermissionCheckScreen; 