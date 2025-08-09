import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatMessage } from '../services/geminiService';
import { spacing, fontSize, borderRadius, getShadow } from '../utils/responsive';

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
    marginVertical: spacing.tiny,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: borderRadius.xLarge,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
    ...getShadow(3),
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
    borderRadius: borderRadius.xLarge,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
  },
  userText: {
    color: '#FFF',
    fontSize: fontSize.large,
    fontWeight: '500',
  },
  botText: {
    color: '#333',
    fontSize: fontSize.large,
    fontWeight: '400',
  },
  timestamp: {
    fontSize: fontSize.small,
    marginTop: spacing.tiny,
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