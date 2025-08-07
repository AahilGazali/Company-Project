import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface TypingIndicatorProps {
  isVisible: boolean;
}

export default function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      const animate = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot1, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 1,
              duration: 400,
              delay: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 1,
              duration: 400,
              delay: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dot1, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0,
              duration: 400,
              delay: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0,
              duration: 400,
              delay: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          if (isVisible) {
            animate();
          }
        });
      };
      animate();
    } else {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View 
          style={[
            styles.dot, 
            { 
              opacity: dot1,
              transform: [{ scale: dot1.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              })}]
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              opacity: dot2,
              transform: [{ scale: dot2.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              })}]
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              opacity: dot3,
              transform: [{ scale: dot3.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              })}]
            }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  bubble: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9E9E9E',
    marginHorizontal: 2,
  },
}); 