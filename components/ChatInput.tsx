import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const { isUserDarkMode } = useTheme();
  const [message, setMessage] = useState('');

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isUserDarkMode ? '#1E1E1E' : '#FFF',
      borderTopColor: isUserDarkMode ? '#374151' : '#E0E0E0',
      paddingBottom: 80, // Add bottom padding to avoid overlap with navigation tabs
    },
    input: {
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#F8F9FA',
      color: isUserDarkMode ? '#FFFFFF' : '#333',
      borderColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
    },
    inputPlaceholder: {
      color: isUserDarkMode ? '#9CA3AF' : '#A5A5A5',
    },
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          placeholderTextColor={dynamicStyles.inputPlaceholder.color}
          multiline
          maxLength={500}
          editable={!isLoading}
          onKeyPress={handleKeyPress}
        />
        <Pressable 
          style={[styles.sendButton, (!message.trim() || isLoading) && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!message.trim() || isLoading}
        >
          <LinearGradient
            colors={(!message.trim() || isLoading) ? ['#9E9E9E', '#757575'] : ['#4CAF50', '#2E7D32']}
            style={styles.sendGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color="#FFF" 
            />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  sendGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 