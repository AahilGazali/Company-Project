import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Svg width={140} height={160} viewBox="0 0 200.05 230.07">
          <Defs>
            <LinearGradient id="linear-gradient" x1="116.37" y1="-14.98" x2="176.11" y2="78.14" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#6dcf75"/>
              <Stop offset="1" stopColor="#008163"/>
            </LinearGradient>
          </Defs>
          <G>
            <G>
              <G>
                <Polygon fill="url(#linear-gradient)" points="172.82 73.01 172.82 73.02 172.81 73.01 172.82 73.01"/>
                <G>
                  <Path fill="url(#linear-gradient)" d="M187.5,95.82l11.05-6.37c.93-.54,1.5-1.53,1.5-2.6v-27.83c0-1.07-.57-2.06-1.5-2.6L101.52.4c-.93-.54-2.07-.54-3,0l-24.1,13.91c-.93.54-1.5,1.53-1.5,2.6v12.77c0,1.07-.58,2.06-1.51,2.6l-28.77,16.6c-.93.54-2.07.54-3,0l-11.05-6.37c-.93-.54-2.07-.54-3,0L1.5,56.41c-.93.54-1.5,1.53-1.5,2.6v112.04c0,1.07.57,2.06,1.5,2.6l24.1,13.91c.93.54,2.07.54,3,0l11.06-6.37c.93.54,2.07.54,3,0l28.77,16.61c.93.54,1.5,1.53,1.5,2.6v12.76c0,1.07.57,2.06,1.5,2.6l24.1,13.9c.93.54,2.07.54,3,0l97.02-56.01c.93.54,1.5,1.53,1.5,2.6v-27.83c0-1.07-.57-2.06-1.5-2.6l-11.05-6.38c-.93-.54-1.5-1.53-1.5-2.6v-33.23c0-1.07.57-2.06,1.5-2.6ZM170.4,153.94c0,1.07-.58,2.06-1.5,2.6l-67.38,38.9c-.93.53-2.07.53-3,0l-67.38-38.9c-.92-.54-1.5,1.53-1.5,2.6v-77.8c0,1.07.58-2.06,1.5-2.6l67.38-38.9c.93.53,2.07.53,3,0l67.38,38.9c.92.54,1.5,1.53,1.5,2.6v77.8ZM172.82,73.02h-.01s.01-.01.01-.01h0Z"/>
                </G>
              </G>
            </G>
          </G>
        </Svg>
      </Animated.View>
      <Animated.Text
        style={[
          styles.appName,
          {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          },
        ]}
      >
        OpsManager
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 1,
  },
});

export default SplashScreen;
