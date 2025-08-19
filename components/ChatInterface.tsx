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
import ChatInput from './ChatInput';
import { ChatMessage } from '../services/geminiService';
import GeminiService from '../services/geminiService';
import { ExcelAnalysis, ExcelAnalysisService } from '../services/excelAnalysisService';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getSafeAreaPadding,
  getIconSize,
  screenDimensions
} from '../utils/responsive';
import { useResponsiveDimensions } from '../hooks/useResponsiveDimensions';
import TypingIndicator from './TypingIndicator';
import { useTheme } from '../contexts/ThemeContext';

const { height: screenHeight } = screenDimensions;

interface ChatInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  dataAnalysis?: ExcelAnalysis | null;
}

export default function ChatInterface({ isVisible, onClose, dataAnalysis }: ChatInterfaceProps) {
  const { isUserDarkMode } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasDataContext, setHasDataContext] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const welcomeMessageAdded = useRef(false);

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    overlay: {
      backgroundColor: isUserDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      backgroundColor: isUserDarkMode ? '#1E1E1E' : '#FFFFFF',
    },
    header: {
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#667eea',
    },
    headerTitle: {
      color: isUserDarkMode ? '#FFFFFF' : '#FFFFFF',
    },
    headerSubtitle: {
      color: isUserDarkMode ? '#E2E8F0' : '#E2E8F0',
    },
    closeButton: {
      backgroundColor: isUserDarkMode ? '#374151' : 'rgba(255, 255, 255, 0.2)',
    },
    messagesContainer: {
      backgroundColor: isUserDarkMode ? '#1E1E1E' : '#FFFFFF',
    },
    quickActions: {
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#F0F0F0',
      borderBottomColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
    },
    quickActionButton: {
      backgroundColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
    },
    quickActionText: {
      color: isUserDarkMode ? '#FFFFFF' : '#333',
    },
    noDataContainer: {
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#F8F9FA',
    },
    noDataText: {
      color: isUserDarkMode ? '#D1D5DB' : '#6B7280',
    },
    noDataSubtext: {
      color: isUserDarkMode ? '#9CA3AF' : '#9CA3AF',
    },
  };

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
      
      // Add professional welcome message with Action column analysis
      if (!welcomeMessageAdded.current) {
        const actionSummary = GeminiService.getActionColumnSummary();
        if (actionSummary) {
          addMessage(`🤖 Welcome! I'm your AI Business Analyst Assistant. I've loaded and analyzed your ${dataAnalysis.fileName} file.\n\n${actionSummary}`, false);
        } else {
          addMessage(`🤖 Welcome! I'm your AI Business Analyst Assistant. I've loaded and analyzed your ${dataAnalysis.fileName} file. I can help you with data analysis, maintenance tracking, and business insights. What would you like to know about your data?`, false);
        }
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
      let response: any; // Changed from ChatResponse to any as ChatResponse is no longer imported
      
      // Handle debug query command
      if (message.toLowerCase().includes('debug query:')) {
        console.log('🐛 Debug query requested...');
        const actualQuery = message.replace('Debug query:', '').trim();
        
        if (dataAnalysis?.fullData) {
          try {
            const debugResults = ExcelAnalysisService.testSpecificQuery(dataAnalysis, actualQuery);
            addMessage(`🐛 **DEBUG RESULTS**\n\n${debugResults.debugInfo}`, false);
          } catch (error) {
            addMessage(`❌ Debug failed: ${error}`, false);
          }
        } else {
          addMessage('❌ No data available for debugging. Please upload your Excel file first.', false);
        }
        
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
      
      // Handle data verification command
      if (message.toLowerCase().includes('verify') || message.toLowerCase().includes('complete dataset')) {
        console.log('🔍 Data verification requested...');
        response = await GeminiService.verifyCompleteDataAnalysis();
        
        if (response.success && response.message) {
          addMessage(response.message, false);
        } else if (response.error) {
          addMessage(`❌ ${response.error}`, false);
        }
        
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
      
      // Handle complete dataset test
      if (message.toLowerCase().includes('test complete dataset')) {
        console.log('🧪 Testing complete dataset access...');
        
        if (dataAnalysis?.fullData) {
          try {
            const testResults = ExcelAnalysisService.verifyCompleteDatasetAccess(dataAnalysis);
            addMessage(`🧪 **COMPLETE DATASET TEST RESULTS**\n\n${testResults.debugInfo}`, false);
          } catch (error) {
            addMessage(`❌ Dataset test failed: ${error}`, false);
          }
        } else {
          addMessage('❌ No data available for testing. Please upload your Excel file first.', false);
        }
        
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
      
      // Handle save data command
      if (message.toLowerCase().includes('save complete data')) {
        console.log('💾 Save complete data requested...');
        
        if (dataAnalysis?.fullData) {
          try {
            const saveSuccess = GeminiService.saveCompleteData(dataAnalysis);
            
            if (saveSuccess) {
              addMessage('✅ **Complete Data Saved Successfully!**\n\n📊 **All Excel data is now stored and ready for instant querying**\n\n🔍 **Try asking:**\n• "How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?"\n• "Show me all records for 6/27/2025"\n• "Which locations had AC issues?"\n\n⚡ **Responses will be instant and professional, just like ChatGPT!**', false);
            } else {
              addMessage('❌ **Failed to save complete data.** Please try re-uploading your Excel file.', false);
            }
          } catch (error) {
            addMessage(`❌ Save failed: ${error}`, false);
          }
        } else {
          addMessage('❌ No data available to save. Please upload your Excel file first.', false);
        }
        
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
      
      // Handle debug data command
      if (message.toLowerCase().includes('debug data structure')) {
        console.log('🔧 Debug data structure requested...');
        
        if (dataAnalysis?.fullData) {
          try {
            // First save the data to see the structure
            const saveSuccess = GeminiService.saveCompleteData(dataAnalysis);
            
            if (saveSuccess) {
              // Get the saved data structure
              const savedData = ExcelAnalysisService.getCompleteData();
              
              if (savedData) {
                const { metadata, records } = savedData;
                let debugMessage = `🔧 **DATA STRUCTURE DEBUG**\n\n`;
                
                debugMessage += `📁 **File:** ${metadata.fileName}\n`;
                debugMessage += `📊 **Total Records:** ${metadata.totalRecords}\n`;
                debugMessage += `📋 **Available Columns:** ${metadata.availableColumns.join(', ')}\n\n`;
                
                debugMessage += `🔍 **Field Mapping:**\n`;
                Object.entries(metadata.fieldMapping).forEach(([standardField, actualField]) => {
                  debugMessage += `- ${standardField} → ${actualField}\n`;
                });
                
                debugMessage += `\n✅ **Data Integrity:**\n`;
                Object.entries(metadata.dataIntegrity).forEach(([field, hasField]) => {
                  debugMessage += `- ${field}: ${hasField ? '✅' : '❌'}\n`;
                });
                
                if (records && records.length > 0) {
                  debugMessage += `\n📋 **Sample Record Fields:**\n`;
                  const sampleRecord = records[0];
                  Object.entries(sampleRecord).forEach(([field, value]) => {
                    debugMessage += `- ${field}: ${value}\n`;
                  });
                }
                
                addMessage(debugMessage, false);
              } else {
                addMessage('❌ No saved data structure found. Please try saving data first.', false);
              }
            } else {
              addMessage('❌ Failed to save data for debugging. Please try re-uploading your Excel file.', false);
            }
          } catch (error) {
            addMessage(`❌ Debug failed: ${error}`, false);
          }
        } else {
          addMessage('❌ No data available for debugging. Please upload your Excel file first.', false);
        }
        
        setIsLoading(false);
        setIsTyping(false);
        return;
      }
      
      // Check if this is a data-related query
      const dataKeywords = [
        'ac', 'action', 'location', 'maintenance', 'issue', 'problem', 'failure', 'mmt', 'date', 'equipment',
        'show', 'give', 'all', 'data', 'records', 'list', 'find', 'search', 'filter', 'where', 'when', 'how many',
        'hvac', 'electrical', 'plumbing', 'repair', 'inspection', 'installation', 'cleaning', 'replacement',
        '27', '6/27', 'june 27', 'june 27th', 'eleventh street', 'june 2025'
      ];
      const isDataQuery = dataKeywords.some(keyword => message.toLowerCase().includes(keyword));
      
      if (isDataQuery) {
        // Check if complete data is available
        if (!dataAnalysis?.fullData || dataAnalysis.fullData.length === 0) {
          addMessage('❌ **Full dataset not available!** Your Excel file was only partially analyzed.\n\n🔄 **Please re-upload your Excel file** to ensure complete data loading.', false);
          setIsLoading(false);
          setIsTyping(false);
          return;
        }
        
        console.log('🔍 Executing hybrid AI + code query...');
        response = await GeminiService.answerDataQuestion(message);
      } else {
        console.log('💬 Executing general query...');
        response = await GeminiService.sendMessage(message);
      }
      
      if (response.success && response.message) {
        addMessage(response.message, false);
      } else if (response.error) {
        addMessage(`❌ **Error:** ${response.error}`, false);
      }
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      addMessage('❌ **System Error:** I encountered an error processing your request. Please try the "Test Dataset" button to verify data availability.', false);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const welcomeMessage = () => {
    if (messages.length === 0) {
      addMessage('🤖 Hello! I\'m your AI Business Analyst Assistant. I can help you analyze data, answer questions, and provide insights. How can I assist you today?', false);
    }
  };

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      welcomeMessage();
    }
  }, [isVisible]);

  // Handle column button clicks
  const handleColumnButtonClick = (columnName: string) => {
    let query = '';
    
    // Generate appropriate query based on column type
    if (columnName.toLowerCase().includes('action')) {
      query = `Show me all actions from the ${columnName} column`;
    } else if (columnName.toLowerCase().includes('location')) {
      query = `Show me all locations from the ${columnName} column`;
    } else if (columnName.toLowerCase().includes('date')) {
      query = `Show me all dates from the ${columnName} column`;
    } else if (columnName.toLowerCase().includes('mmt')) {
      query = `Show me all MMT numbers from the ${columnName} column`;
    } else if (columnName.toLowerCase().includes('description')) {
      query = `Show me all descriptions from the ${columnName} column`;
    } else if (columnName.toLowerCase().includes('functional')) {
      query = `Show me all functional locations from the ${columnName} column`;
    } else {
      query = `Show me all data from the ${columnName} column`;
    }
    
    handleSendMessage(query);
  };

  // Get appropriate icon for each column
  const getColumnIcon = (columnName: string): string => {
    const name = columnName.toLowerCase();
    
    if (name.includes('action')) return '🔧';
    if (name.includes('location')) return '📍';
    if (name.includes('date')) return '📅';
    if (name.includes('mmt')) return '🔢';
    if (name.includes('description')) return '📝';
    if (name.includes('functional')) return '🏢';
    if (name.includes('sr')) return '📋';
    return '📊';
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay,
        dynamicStyles.overlay,
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
          style={[styles.container, dynamicStyles.container]} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, dynamicStyles.header]}>
            <LinearGradient
              colors={isUserDarkMode ? ['#2D2D2D', '#1E1E1E'] : ['#2196F3', '#1976D2']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.avatar}>
                    <Ionicons name="analytics" size={24} color="#FFF" />
                  </View>
                  <View>
                    <Text style={[styles.title, dynamicStyles.headerTitle]}>AI Business Analyst</Text>
                    <Text style={[styles.subtitle, dynamicStyles.headerSubtitle]}>
                      {hasDataContext ? 'Ready to analyze your Excel data!' : 'Ask me anything!'}
                    </Text>
                  </View>
                </View>
                <Pressable style={[styles.closeButton, dynamicStyles.closeButton]} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </Pressable>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Action Buttons */}
          {hasDataContext && (
            <View style={[styles.quickActions, dynamicStyles.quickActions]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContent}>
                <Pressable 
                  style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                  onPress={() => handleSendMessage("Check data status and availability")}
                >
                  <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>📊 Data Status</Text>
                </Pressable>
                
                                  <Pressable 
                    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                    onPress={() => handleSendMessage("Verify complete dataset analysis")}
                  >
                    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>🔍 Verify Data</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                    onPress={() => handleSendMessage("Debug query: How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?")}
                  >
                    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>🐛 Debug Query</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                    onPress={() => handleSendMessage("Test complete dataset access")}
                  >
                    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>🧪 Test Dataset</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                    onPress={() => handleSendMessage("Save complete data and test querying")}
                  >
                    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>💾 Save Data</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                    onPress={() => handleSendMessage("Debug data structure and field mapping")}
                  >
                    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>🔧 Debug Data</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
                    onPress={() => handleSendMessage("How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?")}
                  >
                    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>🧪 Test Hybrid Query</Text>
                  </Pressable>
                  
                  {/* Dynamic Column Buttons */}
{(dataAnalysis?.columns || []).map((columnName: string, index: number) => (
  <Pressable 
    key={index}
    style={[styles.quickActionButton, dynamicStyles.quickActionButton]} 
    onPress={() => handleColumnButtonClick(columnName)}
  >
    <Text style={[styles.quickActionText, dynamicStyles.quickActionText]}>
      {getColumnIcon(columnName)} {columnName}
    </Text>
  </Pressable>
))}
              </ScrollView>
            </View>
          )}

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesContainer, dynamicStyles.messagesContainer]}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator isVisible={isTyping} />}
          </ScrollView>

          {/* Input */}
          <View style={{ marginBottom: 20 }}>
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </View>
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
    backgroundColor: 'transparent',
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
    fontSize: fontSize.xLarge, // Changed from fontSize.xLarge
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: fontSize.medium, // Changed from fontSize.medium
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
  quickActions: {
    paddingHorizontal: spacing.large,
    paddingTop: spacing.medium, // Add top padding for spacing from header
    paddingBottom: spacing.medium,
    borderBottomWidth: 1,
  },
  quickActionsContent: {
    alignItems: 'center',
    paddingVertical: spacing.small,
    paddingTop: spacing.medium, // Add extra top padding for better visibility
  },
  quickActionButton: {
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    marginHorizontal: spacing.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: fontSize.small, // Changed from fontSize.small
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: spacing.large,
  },
  messagesContent: {
    paddingVertical: spacing.large,
    paddingBottom: 100, // Add extra bottom padding to ensure input is visible
  },
  }); 