// App-wide theme constants

// Color palette for Speech Therapist/Audiologist app - Aesthetic theme
export const COLORS = {
  // Primary colors
  primary: '#5E6EB8', // Soft indigo blue
  primaryLight: '#8A97D2',
  primaryDark: '#3A4A94',
  
  // Secondary colors
  secondary: '#F9F7F7', // Soft off-white background
  secondaryLight: '#FFFFFF',
  secondaryDark: '#EEEEF2',
  
  // Accent colors
  accent: '#E5989B', // Soft coral/pink
  accentLight: '#FFB4B8',
  accentDark: '#C27B7F',
  
  // Text colors
  textDark: '#222222',
  textMedium: '#666666',
  textLight: '#999999',
  
  // Utility colors
  white: '#FFFFFF',
  black: '#000000',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
  info: '#2196F3',
  
  // Shadow for components
  shadow: '#BDBDBD',
};

// Typography
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

// Shadows
export const SHADOWS = {
  light: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dark: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};