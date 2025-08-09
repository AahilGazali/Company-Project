import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ResponsiveDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  isSmallDevice: boolean;
  isLargeDevice: boolean;
}

export const useResponsiveDimensions = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState<ResponsiveDimensions>(() => {
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const aspectRatio = height / width;
    
    return {
      width,
      height,
      isLandscape,
      isTablet: (width >= 768 && aspectRatio <= 1.6) || (height >= 1024 && aspectRatio >= 1.6),
      isSmallDevice: width < 350 || height < 600,
      isLargeDevice: width > 414 || height > 896,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      const { width, height } = window;
      const isLandscape = width > height;
      const aspectRatio = height / width;
      
      setDimensions({
        width,
        height,
        isLandscape,
        isTablet: (width >= 768 && aspectRatio <= 1.6) || (height >= 1024 && aspectRatio >= 1.6),
        isSmallDevice: width < 350 || height < 600,
        isLargeDevice: width > 414 || height > 896,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

export default useResponsiveDimensions;
