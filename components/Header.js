import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { IS_TABLET, responsiveDimension, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';

const Header = ({ noMarginTop }) => {
  const navigation = useNavigation();
  const { isLoggedIn } = useUser();
  const { unreadCount } = useNotifications();
  
  // Responsive dimensions
  const logoSize = responsiveDimension(48, 70);
  const iconSize = responsiveDimension(32, 45);
  const badgeSize = responsiveDimension(18, 22); // Smaller badge size
  
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        <View style={[styles.logoContainer, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
          {/* App logo */}
          <Image 
            source={require('../assets/logo.jpeg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text numberOfLines={1} style={styles.nameText}>Diverse</Text>
      </View>
      {/* Notification Bell Icon */}
      <View style={styles.notificationContainer}>
      <TouchableOpacity 
          onPress={() => navigation.navigate('Notifications')}
      >
          <Ionicons name="notifications-outline" size={iconSize * 1.3} color={COLORS.primary} />
          {unreadCount > 0 && (
          <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: IS_TABLET ? 24 : 12,
    // Fixed position for header with platform-specific adjustments
    marginTop: Platform.OS === 'android' ? 10 : 20,
    height: IS_TABLET ? 70 : 60,
    paddingHorizontal: IS_TABLET ? 10 : 5,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '70%',
  },
  logoContainer: {
    overflow: 'hidden',
    backgroundColor: COLORS.secondaryDark,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  nameText: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginLeft: IS_TABLET ? 16 : 12,
    flexShrink: 1,
  },
  notificationContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
    ...SHADOWS.light,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: scaledFontSize(9),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Header; 