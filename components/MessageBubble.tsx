import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatMessage } from '../services/geminiService';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.isUser;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {isUser ? (
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.userGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.userText}>{message.text}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.botText}>{message.text}</Text>
        )}
      </View>
      <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: 'transparent',
  },
  botBubble: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userGradient: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  botText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '400',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
  userTimestamp: {
    textAlign: 'right',
    color: '#666',
  },
  botTimestamp: {
    textAlign: 'left',
    color: '#666',
  },
}); 