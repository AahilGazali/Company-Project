import React from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ChatButtonProps {
  onPress: () => void;
  isOpen: boolean;
  hasUnreadMessages?: boolean;
}

export default function ChatButton({ onPress, isOpen, hasUnreadMessages = false }: ChatButtonProps) {
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
      <Pressable style={styles.button} onPress={onPress}>
        <LinearGradient
          colors={['#2196F3', '#1976D2', '#0D47A1']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons 
            name="chatbubble-ellipses" 
            size={26} 
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
    width: 65,
    height: 65,
    borderRadius: 32.5,
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32.5,
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
}); 