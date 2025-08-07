import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import { ChatMessage } from '../services/geminiService';
import GeminiService from '../services/geminiService';

const { height: screenHeight } = Dimensions.get('window');

interface ChatInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ChatInterface({ isVisible, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isVisible]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    scrollToBottom();
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    addMessage(message, true);
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Send to Gemini API
      const response = await GeminiService.sendMessage(message);
      
      if (response.success && response.message) {
        // Add bot response
        addMessage(response.message, false);
      } else {
        // Add error message
        addMessage('Sorry, I encountered an error. Please try again.', false);
      }
    } catch (error) {
      addMessage('Sorry, I encountered an error. Please try again.', false);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const welcomeMessage = () => {
    if (messages.length === 0) {
      addMessage('Hello! I\'m your AI assistant. How can I help you today?', false);
    }
  };

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      welcomeMessage();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [screenHeight, 0],
            })
          }]
        }
      ]}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.avatar}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.title}>AI Assistant</Text>
                    <Text style={styles.subtitle}>Ask me anything!</Text>
                  </View>
                </View>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </Pressable>
              </View>
            </LinearGradient>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator isVisible={isTyping} />}
          </ScrollView>

          {/* Input */}
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </KeyboardAvoidingView>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  blurContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
}); 