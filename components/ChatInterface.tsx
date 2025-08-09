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
import { ExcelAnalysis } from '../services/excelAnalysisService';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getSafeAreaPadding,
  getIconSize,
  screenDimensions
} from '../utils/responsive';

const { height: screenHeight } = screenDimensions;

interface ChatInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  dataAnalysis?: ExcelAnalysis | null;
}

export default function ChatInterface({ isVisible, onClose, dataAnalysis }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasDataContext, setHasDataContext] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const welcomeMessageAdded = useRef(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isVisible]);

  // Handle data context changes
  useEffect(() => {
    if (dataAnalysis) {
      GeminiService.setDataContext(dataAnalysis);
      setHasDataContext(true);
      
      // Add welcome message with data summary only once per session
      const dataSummary = GeminiService.getDataSummary();
      if (dataSummary && !welcomeMessageAdded.current) {
        addMessage(`📊 Excel data loaded! ${dataSummary}`, false);
        welcomeMessageAdded.current = true;
      }
    } else {
      GeminiService.setDataContext(null);
      setHasDataContext(false);
    }
  }, [dataAnalysis]);

  // Clear messages when chat is closed
  useEffect(() => {
    if (!isVisible) {
      setMessages([]);
      welcomeMessageAdded.current = false; // Reset welcome message flag
    }
  }, [isVisible]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
                    <Text style={styles.subtitle}>
                      {hasDataContext ? 'Ask about your Excel data!' : 'Ask me anything!'}
                    </Text>
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
    paddingTop: getSafeAreaPadding().top + spacing.medium,
    paddingBottom: spacing.large,
    paddingHorizontal: spacing.large,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.medium,
  },
  avatar: {
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: fontSize.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: spacing.large,
  },
  messagesContent: {
    paddingVertical: spacing.large,
  },
}); 