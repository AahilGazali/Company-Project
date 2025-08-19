import React from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ChatButtonProps {
  onPress: () => void;
  isOpen: boolean;
  hasUnreadMessages?: boolean;
  variant?: 'default' | 'queryScreen';
}

export default function ChatButton({ onPress, isOpen, hasUnreadMessages = false, variant = 'default' }: ChatButtonProps) {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: isOpen ? 0.8 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isOpen]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleValue }] }]}>
      <Pressable style={[
        styles.button, 
        variant === 'queryScreen' && styles.queryScreenButton
      ]} onPress={onPress}>
        <LinearGradient
          colors={variant === 'queryScreen' ? ['#2196F3', '#1976D2', '#0D47A1'] : ['#2196F3', '#1976D2', '#0D47A1']}
          style={[
            styles.gradient,
            variant === 'queryScreen' && styles.queryScreenGradient
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons 
            name="chatbubble-ellipses" 
            size={variant === 'queryScreen' ? 20 : 22} 
            color="#FFF" 
          />
        </LinearGradient>
      </Pressable>
      
      {/* Unread message indicator */}
      {hasUnreadMessages && !isOpen && (
        <View style={styles.unreadIndicator}>
          <View style={styles.unreadDot} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container positioning handled by parent
  },
  button: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F44336',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
  },
  queryScreenButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  queryScreenGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 