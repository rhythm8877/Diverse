import { Dimensions, Platform, StatusBar } from 'react-native';

// Get screen dimensions
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device detection
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
export const HAS_NOTCH = IS_IOS && !Platform.isPad && !Platform.isTV && SCREEN_HEIGHT >= 812;
export const IS_TABLET = (SCREEN_WIDTH > 768) || (IS_IOS && Platform.isPad);

// SafeArea values
export const STATUS_BAR_HEIGHT = IS_IOS ? (HAS_NOTCH ? 44 : 20) : StatusBar.currentHeight || 0;
export const BOTTOM_SPACE = IS_IOS ? (HAS_NOTCH ? 34 : 0) : 0;

// Navigation bar height (Android's bottom navigation)
export const NAVIGATION_BAR_HEIGHT = IS_ANDROID ? 48 : 0;

// Calculate safe content area
export const SAFE_AREA_TOP = STATUS_BAR_HEIGHT;
export const SAFE_AREA_BOTTOM = BOTTOM_SPACE + NAVIGATION_BAR_HEIGHT;

// Screen size categories
export const isSmallDevice = SCREEN_HEIGHT < 700;
export const isMediumDevice = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 800;
export const isLargeDevice = SCREEN_HEIGHT >= 800 && SCREEN_WIDTH < 768;
export const isTablet = IS_TABLET;

// Get responsive dimensions based on screen size
export const responsiveDimension = (smallSize, tabletSize) => {
  return IS_TABLET ? tabletSize : smallSize;
};

// Scale values based on screen size - enhanced for tablet support
export const scale = (size, minSize = size) => {
  // Base width for scaling (iPhone 8)
  const baseWidth = 375;
  
  // For tablets, use a different scaling approach
  if (IS_TABLET) {
    // Minimum size ensures elements don't get too small on large screens
    const tabletMinSize = minSize * 1.2;
    // Use a more moderate scaling for tablets to prevent excessive sizing
    const scaleFactor = Math.min(SCREEN_WIDTH / baseWidth, 1.8);
    return Math.max(Math.round(size * scaleFactor), tabletMinSize);
  }
  
  // For phones, use standard scaling
  const scaleFactor = SCREEN_WIDTH / baseWidth;
  return Math.max(Math.round(size * scaleFactor), minSize);
};

// Get font sizes that scale appropriately
export const scaledFontSize = (size) => {
  if (IS_TABLET) {
    // For tablets, increase font size but cap it to avoid excessive scaling
    return Math.min(Math.round(size * 1.4), size * 1.8);
  }
  
  const scaleFactor = Math.max(SCREEN_WIDTH / 375, 0.85);
  return Math.round(size * scaleFactor);
};

// Detect if device has hardware buttons at bottom
export const hasHardwareButtons = () => {
  // Best guess based on screen ratio and device type
  if (IS_IOS) return false; // iOS X and newer use gestures
  
  // Android - check ratio and height
  const ratio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return ratio < 1.9; // Most devices with hardware buttons have a lower ratio
};

// Get status bar height
export const getStatusBarHeight = () => {
  return StatusBar.currentHeight || (IS_IOS ? (HAS_NOTCH ? 44 : 20) : 0);
};

// Get keyboard-avoiding behavior
export const getKeyboardBehavior = () => {
  return IS_IOS ? 'padding' : 'height';
};

// Get keyboard offset for different devices
export const getKeyboardVerticalOffset = () => {
  if (IS_TABLET) {
    return 80; // Larger offset for tablets
  }
  
  if (IS_IOS) {
    return HAS_NOTCH ? 40 : 20;
  }
  
  return 0;
};

// Get bottom spacing to account for navigation bar
export const getBottomSpacing = () => {
  const hardwareButtonsHeight = hasHardwareButtons() ? NAVIGATION_BAR_HEIGHT : 0;
  return BOTTOM_SPACE + hardwareButtonsHeight;
};

// Text style adjustments for different screens
export const getTextSizes = () => {
  if (IS_TABLET) {
    return {
      heading: 32,
      subheading: 26,
      normal: 20,
      small: 16,
    };
  }
  
  if (isSmallDevice) {
    return {
      heading: 22,
      subheading: 18,
      normal: 14,
      small: 12,
    };
  }
  
  if (isMediumDevice) {
    return {
      heading: 24,
      subheading: 20,
      normal: 16,
      small: 14,
    };
  }
  
  return {
    heading: 26,
    subheading: 22,
    normal: 16,
    small: 14,
  };
};
