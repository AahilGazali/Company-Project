import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (reference design)
const BASE_WIDTH = 375; // iPhone X/11/12/13 width
const BASE_HEIGHT = 812; // iPhone X/11/12/13 height

// Scale functions
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

export const scaleFont = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  let newSize = size * scale;
  
  // Apply platform-specific adjustments
  if (Platform.OS === 'ios') {
    // iOS tends to render fonts slightly larger
    newSize = Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    // Android adjustment for better readability
    newSize = Math.round(PixelRatio.roundToNearestPixel(newSize * 1.02));
  }
  
  // Ensure minimum readable font size
  return Math.max(newSize, 12);
};

export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scaleWidth(size) - size) * factor;
};

// Device type detection
export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return (SCREEN_WIDTH >= 768 && aspectRatio <= 1.6) || (SCREEN_HEIGHT >= 1024 && aspectRatio >= 1.6);
};

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 350 || SCREEN_HEIGHT < 600;
};

export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH > 414 || SCREEN_HEIGHT > 896;
};

// Responsive spacing
export const spacing = {
  tiny: moderateScale(4),
  small: moderateScale(8),
  medium: moderateScale(12),
  large: moderateScale(16),
  xLarge: moderateScale(20),
  xxLarge: moderateScale(24),
  xxxLarge: moderateScale(32),
  huge: moderateScale(40),
};

// Responsive font sizes
export const fontSize = {
  tiny: scaleFont(10),
  small: scaleFont(12),
  medium: scaleFont(14),
  large: scaleFont(16),
  xLarge: scaleFont(18),
  xxLarge: scaleFont(20),
  xxxLarge: scaleFont(24),
  huge: scaleFont(28),
  massive: scaleFont(32),
};

// Responsive border radius
export const borderRadius = {
  small: moderateScale(4),
  medium: moderateScale(8),
  large: moderateScale(12),
  xLarge: moderateScale(16),
  xxLarge: moderateScale(20),
  xxxLarge: moderateScale(24),
  round: moderateScale(50),
};

// Safe area helper with device-specific optimizations
export const getSafeAreaPadding = () => {
  if (Platform.OS === 'ios') {
    if (SCREEN_HEIGHT >= 896) {
      // iPhone 11 Pro Max, 12 Pro Max, 13 Pro Max, 14 Plus, 14 Pro Max
      return {
        top: 47,
        bottom: 34,
      };
    } else if (SCREEN_HEIGHT >= 812) {
      // iPhone X, XS, 11 Pro, 12, 12 Pro, 13, 13 Pro, 14, 14 Pro
      return {
        top: 44,
        bottom: 34,
      };
    } else if (SCREEN_HEIGHT >= 736) {
      // iPhone 6 Plus, 6s Plus, 7 Plus, 8 Plus
      return {
        top: 20,
        bottom: 0,
      };
    } else {
      // iPhone 6, 6s, 7, 8, SE
      return {
        top: 20,
        bottom: 0,
      };
    }
  } else {
    // Android with dynamic padding based on screen size
    if (SCREEN_HEIGHT >= 900) {
      // Large Android phones
      return {
        top: spacing.xLarge,
        bottom: spacing.large,
      };
    } else if (SCREEN_HEIGHT >= 700) {
      // Medium Android phones
      return {
        top: spacing.large,
        bottom: spacing.medium,
      };
    } else {
      // Small Android phones
      return {
        top: spacing.medium,
        bottom: spacing.small,
      };
    }
  }
};

// Screen dimensions
export const screenDimensions = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isTablet: isTablet(),
  isSmallDevice: isSmallDevice(),
  isLargeDevice: isLargeDevice(),
};

// Container width helper
export const getContainerWidth = (percentage: number = 0.9): number => {
  const maxWidth = isTablet() ? 600 : 450;
  const calculatedWidth = SCREEN_WIDTH * percentage;
  return Math.min(calculatedWidth, maxWidth);
};

// Card padding helper
export const getCardPadding = (): number => {
  if (isSmallDevice()) {
    return spacing.large;
  } else if (isTablet()) {
    return spacing.huge;
  } else {
    return spacing.xxxLarge;
  }
};

// Icon size helper
export const getIconSize = (baseSize: number): number => {
  if (isSmallDevice()) {
    return baseSize * 0.8;
  } else if (isTablet()) {
    return baseSize * 1.2;
  } else {
    return baseSize;
  }
};

// Elevation/shadow helper
export const getShadow = (elevation: number = 5) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: elevation * 0.6,
      },
      shadowOpacity: 0.1 + (elevation * 0.02),
      shadowRadius: elevation * 1.2,
    };
  } else {
    return {
      elevation: elevation,
    };
  }
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFont,
  moderateScale,
  isTablet,
  isSmallDevice,
  isLargeDevice,
  spacing,
  fontSize,
  borderRadius,
  getSafeAreaPadding,
  screenDimensions,
  getContainerWidth,
  getCardPadding,
  getIconSize,
  getShadow,
};
