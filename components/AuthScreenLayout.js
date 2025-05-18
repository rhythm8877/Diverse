import React from 'react';
import { Dimensions, Image, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { IS_TABLET, getStatusBarHeight, scale, scaledFontSize } from '../utils/responsive';

const { width } = Dimensions.get('window');
const PRIMARY_PURPLE = '#7C3AED';

const AuthScreenLayout = ({ children }) => {
  // Calculate appropriate sizes for different devices
  const logoContainerSize = scale(IS_TABLET ? 90 : 85); // Reduced size for better proportions
  const borderRadius = logoContainerSize / 2;
  
  // Get status bar height and add extra padding
  const statusBarHeight = getStatusBarHeight();
  const extraTopPadding = Platform.OS === 'ios' ? (IS_TABLET ? 30 : 20) : (IS_TABLET ? 25 : 15);
  const totalTopPadding = statusBarHeight + extraTopPadding;
  
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_PURPLE} />
      <View style={[
        styles.headerContainer, 
        { paddingTop: totalTopPadding, paddingBottom: IS_TABLET ? 35 : 25 }
      ]}>
        <View style={styles.headerContent}>
          <View style={[
            styles.logoImgContainer, 
            { width: logoContainerSize, height: logoContainerSize, borderRadius }
          ]}>
            <Image 
              source={require('../assets/rishavsethi.jpeg')} 
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.appTitle, { fontSize: scaledFontSize(IS_TABLET ? 32 : 26) }]}>Er. Rishav Sethi</Text>
        </View>
      </View>
      <View style={styles.formContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PRIMARY_PURPLE,
  },
  headerContainer: {
    width: width,
    backgroundColor: PRIMARY_PURPLE,
    paddingHorizontal: IS_TABLET ? 32 : 16,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: IS_TABLET ? 16 : 8,
  },
  logoImgContainer: {
    overflow: 'hidden',
    marginRight: IS_TABLET ? 20 : 12,
    alignItems: 'center',
  },
  logoImg: {
    width: '100%',
    height: '120%',
    resizeMode: 'cover',
    marginTop: 0,
    marginBottom: -5,
  },
  appTitle: {
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: IS_TABLET ? 25 : 15,
  },
});

export default AuthScreenLayout; 