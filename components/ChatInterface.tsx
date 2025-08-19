"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  TextInput,
  Keyboard,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import MessageBubble from "./MessageBubble"
import ChatActionButtons from "./ChatActionButtons"
import type { ChatMessage } from "../services/geminiService"
import GeminiService from "../services/geminiService"
import { type ExcelAnalysis, ExcelAnalysisService } from "../services/excelAnalysisService"
import { spacing, fontSize, borderRadius, getSafeAreaPadding, getIconSize, screenDimensions } from "../utils/responsive"
import TypingIndicator from "./TypingIndicator"
import { useTheme } from "../contexts/ThemeContext"


const { height: screenHeight } = screenDimensions

interface ChatInterfaceProps {
  isVisible: boolean
  onClose: () => void
  dataAnalysis?: ExcelAnalysis | null
}

export default function ChatInterface({ isVisible, onClose, dataAnalysis }: ChatInterfaceProps) {
  const { isUserDarkMode } = useTheme()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasDataContext, setHasDataContext] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [showActionButtons, setShowActionButtons] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const slideAnim = useRef(new Animated.Value(0)).current
  const welcomeMessageAdded = useRef(false)

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 
      () => {
        setIsKeyboardVisible(true)
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      }
    )
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', 
      () => {
        setIsKeyboardVisible(false)
      }
    )

    return () => {
      keyboardDidShowListener?.remove()
      keyboardDidHideListener?.remove()
    }
  }, [])

  // Dynamic styles based on dark mode and keyboard state
  const dynamicStyles = {
    overlay: {
      backgroundColor: isUserDarkMode ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
    },
    container: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#FFFFFF",
    },

    messagesContainer: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#FFFFFF",
    },

    inputContainer: {
      paddingHorizontal: spacing.large,
      paddingVertical: isKeyboardVisible ? spacing.small : spacing.medium,
      paddingBottom: isKeyboardVisible ? 10 : (Platform.OS === 'ios' ? 65 : 25),
      marginBottom: isKeyboardVisible ? 5 : (Platform.OS === 'ios' ? 10 : 20),
      borderTopWidth: 1,
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 8,
      position: 'relative',
      zIndex: 1000,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.medium,
      minHeight: isKeyboardVisible ? 50 : 60,
      paddingVertical: Platform.OS === 'android' ? 5 : 0,
    },
    input: {
      flex: 1,
      backgroundColor: isUserDarkMode ? '#374151' : '#F8F9FA',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: isKeyboardVisible ? 8 : 12,
      fontSize: 16,
      color: isUserDarkMode ? '#FFFFFF' : '#333',
      maxHeight: isKeyboardVisible ? 80 : 100,
      minHeight: isKeyboardVisible ? 40 : 50,
      borderWidth: 1,
      borderColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
      textAlignVertical: 'top', // Important for Android multiline
    },
    inputPlaceholder: {
      color: isUserDarkMode ? "#9CA3AF" : "#A5A5A5",
    },
    floatingInputContainer: {
      position: 'absolute' as const,
      bottom: Platform.OS === 'ios' ? 100 : 80,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.large,
      paddingVertical: spacing.medium,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 8,
      zIndex: 1000,
    },
    floatingInputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.medium,
      minHeight: 50,
    },
    floatingInput: {
      flex: 1,
      backgroundColor: '#F8F9FA',
      borderRadius: 25,
      paddingHorizontal: spacing.large,
      paddingVertical: spacing.medium,
      fontSize: fontSize.large,
      color: '#333',
      maxHeight: 100,
      minHeight: 50,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    floatingInputPlaceholder: {
      color: isUserDarkMode ? "#9CA3AF" : "#A5A5A5",
    },
    floatingSendButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      shadowColor: '#2E7D32',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    floatingSendButtonDisabled: {
      shadowOpacity: 0.1,
      elevation: 2,
    },
    floatingSendGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()
  }, [isVisible])

  // Handle data context changes
  useEffect(() => {
    if (dataAnalysis) {
      GeminiService.setDataContext(dataAnalysis)
      setHasDataContext(true)

      // Add professional welcome message with data status and action buttons
      if (!welcomeMessageAdded.current) {
        const actionSummary = GeminiService.getActionColumnSummary()
        let welcomeText = `🤖 Welcome! I'm your AI Business Analyst Assistant. I've loaded and analyzed your ${dataAnalysis.fileName} file.\n\n`
        
        if (actionSummary) {
          welcomeText += `${actionSummary}\n\n`
        }
        
        welcomeText += `📊 **Data Status & Tools:**\n\n`
        welcomeText += `🔍 **Check your data status and availability**\n`
        welcomeText += `✅ **Verify complete dataset analysis**\n`
        welcomeText += `🐛 **Debug specific queries**\n\n`
        welcomeText += `Click any button below to get started, or ask me anything about your data!`
        
        addMessage(welcomeText, false)
        setShowActionButtons(true)
        welcomeMessageAdded.current = true
      }
    } else {
      GeminiService.setDataContext(null)
      setHasDataContext(false)
    }
  }, [dataAnalysis])

  // Clear messages when chat is closed
  useEffect(() => {
    if (!isVisible) {
      setMessages([])
      setShowActionButtons(false)
      welcomeMessageAdded.current = false // Reset welcome message flag
    }
  }, [isVisible])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true })
      }
    }, Platform.OS === 'android' ? 200 : 100)
  }

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      isUser,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
    scrollToBottom()
  }

  const handleInputSend = () => {
    if (inputMessage.trim() && !isLoading) {
      handleSendMessage(inputMessage.trim())
      setInputMessage("")
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return

    // Add user message
    addMessage(message, true)
    setIsLoading(true)
    setIsTyping(true)

    try {
      let response: any // Changed from ChatResponse to any as ChatResponse is no longer imported

      // Handle debug query command
      if (message.toLowerCase().includes("debug query:")) {
        console.log("🐛 Debug query requested...")
        const actualQuery = message.replace("Debug query:", "").trim()

        if (dataAnalysis?.fullData) {
          try {
            const debugResults = ExcelAnalysisService.testSpecificQuery(dataAnalysis, actualQuery)
            addMessage(`🐛 **DEBUG RESULTS**\n\n${debugResults.debugInfo}`, false)
          } catch (error) {
            addMessage(`❌ Debug failed: ${error}`, false)
          }
        } else {
          addMessage("❌ No data available for debugging. Please upload your Excel file first.", false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle data verification command
      if (message.toLowerCase().includes("verify") || message.toLowerCase().includes("complete dataset")) {
        console.log("🔍 Data verification requested...")
        response = await GeminiService.verifyCompleteDataAnalysis()

        if (response.success && response.message) {
          addMessage(response.message, false)
        } else if (response.error) {
          addMessage(`❌ ${response.error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle complete dataset test
      if (message.toLowerCase().includes("test complete dataset")) {
        console.log("🧪 Testing complete dataset access...")

        if (dataAnalysis?.fullData) {
          try {
            const testResults = ExcelAnalysisService.verifyCompleteDatasetAccess(dataAnalysis)
            addMessage(`🧪 **COMPLETE DATASET TEST RESULTS**\n\n${testResults.debugInfo}`, false)
          } catch (error) {
            addMessage(`❌ Dataset test failed: ${error}`, false)
          }
        } else {
          addMessage("❌ No data available for testing. Please upload your Excel file first.", false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle save data command
      if (message.toLowerCase().includes("save complete data")) {
        console.log("💾 Save complete data requested...")

        if (dataAnalysis?.fullData) {
          try {
            const saveSuccess = GeminiService.saveCompleteData(dataAnalysis)

            if (saveSuccess) {
              addMessage(
                '✅ **Complete Data Saved Successfully!**\n\n📊 **All Excel data is now stored and ready for instant querying**\n\n🔍 **Try asking:**\n• "How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?"\n• "Show me all records for 6/27/2025"\n• "Which locations had AC issues?"\n\n⚡ **Responses will be instant and professional, just like ChatGPT!**',
                false,
              )
            } else {
              addMessage("❌ **Failed to save complete data.** Please try re-uploading your Excel file.", false)
            }
          } catch (error) {
            addMessage(`❌ Save failed: ${error}`, false)
          }
        } else {
          addMessage("❌ No data available to save. Please upload your Excel file first.", false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle debug data command
      if (message.toLowerCase().includes("debug data structure")) {
        console.log("🔧 Debug data structure requested...")

        if (dataAnalysis?.fullData) {
          try {
            // First save the data to see the structure
            const saveSuccess = GeminiService.saveCompleteData(dataAnalysis)

            if (saveSuccess) {
              // Get the saved data structure
              const savedData = ExcelAnalysisService.getCompleteData()

              if (savedData) {
                const { metadata, records } = savedData
                let debugMessage = `🔧 **DATA STRUCTURE DEBUG**\n\n`

                debugMessage += `📁 **File:** ${metadata.fileName}\n`
                debugMessage += `📊 **Total Records:** ${metadata.totalRecords}\n`
                debugMessage += `📋 **Available Columns:** ${metadata.availableColumns.join(", ")}\n\n`

                debugMessage += `🔍 **Field Mapping:**\n`
                Object.entries(metadata.fieldMapping).forEach(([standardField, actualField]) => {
                  debugMessage += `- ${standardField} → ${actualField}\n`
                })

                debugMessage += `\n✅ **Data Integrity:**\n`
                Object.entries(metadata.dataIntegrity).forEach(([field, hasField]) => {
                  debugMessage += `- ${field}: ${hasField ? "✅" : "❌"}\n`
                })

                if (records && records.length > 0) {
                  debugMessage += `\n📋 **Sample Record Fields:**\n`
                  const sampleRecord = records[0]
                  Object.entries(sampleRecord).forEach(([field, value]) => {
                    debugMessage += `- ${field}: ${value}\n`
                  })
                }

                addMessage(debugMessage, false)
              } else {
                addMessage("❌ No saved data structure found. Please try saving data first.", false)
              }
            } else {
              addMessage("❌ Failed to save data for debugging. Please try re-uploading your Excel file.", false)
            }
          } catch (error) {
            addMessage(`❌ Debug failed: ${error}`, false)
          }
        } else {
          addMessage("❌ No data available for debugging. Please upload your Excel file first.", false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Check if this is a data-related query
      const dataKeywords = [
        "ac",
        "action",
        "location",
        "maintenance",
        "issue",
        "problem",
        "failure",
        "mmt",
        "date",
        "equipment",
        "show",
        "give",
        "all",
        "data",
        "records",
        "list",
        "find",
        "search",
        "filter",
        "where",
        "when",
        "how many",
        "hvac",
        "electrical",
        "plumbing",
        "repair",
        "inspection",
        "installation",
        "cleaning",
        "replacement",
        "27",
        "6/27",
        "june 27",
        "june 27th",
        "eleventh street",
        "june 2025",
      ]
      const isDataQuery = dataKeywords.some((keyword) => message.toLowerCase().includes(keyword))

      if (isDataQuery) {
        // Check if complete data is available
        if (!dataAnalysis?.fullData || dataAnalysis.fullData.length === 0) {
          addMessage(
            "❌ **Full dataset not available!** Your Excel file was only partially analyzed.\n\n🔄 **Please re-upload your Excel file** to ensure complete data loading.",
            false,
          )
          setIsLoading(false)
          setIsTyping(false)
          return
        }

        console.log("🔍 Executing hybrid AI + code query...")
        response = await GeminiService.answerDataQuestion(message)
      } else {
        console.log("💬 Executing general query...")
        response = await GeminiService.sendMessage(message)
      }

      if (response.success && response.message) {
        addMessage(response.message, false)
      } else if (response.error) {
        addMessage(`❌ **Error:** ${response.error}`, false)
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error)
      addMessage(
        '❌ **System Error:** I encountered an error processing your request. Please try the "Test Dataset" button to verify data availability.',
        false,
      )
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const welcomeMessage = () => {
    if (messages.length === 0) {
      addMessage(
        "🤖 Hello! I'm your AI Business Analyst Assistant. I can help you analyze data, answer questions, and provide insights. How can I assist you today?",
        false,
      )
    }
  }

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      welcomeMessage()
    }
  }, [isVisible])

  // Handle column button clicks
  const handleColumnButtonClick = (columnName: string) => {
    let query = ""

    // Generate appropriate query based on column type
    if (columnName.toLowerCase().includes("action")) {
      query = `Show me all actions from the ${columnName} column`
    } else if (columnName.toLowerCase().includes("location")) {
      query = `Show me all locations from the ${columnName} column`
    } else if (columnName.toLowerCase().includes("date")) {
      query = `Show me all dates from the ${columnName} column`
    } else if (columnName.toLowerCase().includes("mmt")) {
      query = `Show me all MMT numbers from the ${columnName} column`
    } else if (columnName.toLowerCase().includes("description")) {
      query = `Show me all descriptions from the ${columnName} column`
    } else if (columnName.toLowerCase().includes("functional")) {
      query = `Show me all functional locations from the ${columnName} column`
    } else {
      query = `Show me all data from the ${columnName} column`
    }

    handleSendMessage(query)
  }

  // Get appropriate icon for each column
  const getColumnIcon = (columnName: string): string => {
    const name = columnName.toLowerCase()

    if (name.includes("action")) return "🔧"
    if (name.includes("location")) return "📍"
    if (name.includes("date")) return "📅"
    if (name.includes("mmt")) return "🔢"
    if (name.includes("description")) return "📝"
    if (name.includes("functional")) return "🏢"
    if (name.includes("sr")) return "📋"
    return "📊"
  }

  if (!isVisible) return null

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
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <SafeAreaView style={[styles.container, dynamicStyles.container]}>


            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={[styles.messagesContainer, dynamicStyles.messagesContainer]}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              removeClippedSubviews={Platform.OS === 'android'}
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {/* Action Buttons */}
              {showActionButtons && hasDataContext && (
                <View style={styles.actionButtonsContainer}>
                  <ChatActionButtons
                    onDataStatus={() => handleSendMessage("Check data status and availability")}
                    onVerifyData={() => handleSendMessage("Verify complete dataset analysis")}
                    onDebugQuery={() => handleSendMessage("Debug query: How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?")}
                  />
                </View>
              )}
              
              {isTyping && <TypingIndicator isVisible={isTyping} />}
            </ScrollView>

            {/* Close Button */}
            <Pressable 
              style={styles.floatingCloseButton} 
              onPress={onClose}
            >
              <Ionicons name="close-circle" size={24} color="#FFF" />
            </Pressable>

            {/* Input Container */}
            <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  placeholder="Type your message..."
                  placeholderTextColor={dynamicStyles.inputPlaceholder.color}
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                  onSubmitEditing={handleInputSend}
                  autoFocus={false}
                />
                
                <Pressable 
                  style={[styles.sendButton, (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled]} 
                  onPress={handleInputSend}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  <LinearGradient
                    colors={(!inputMessage.trim() || isLoading) ? ['#9E9E9E', '#757575'] : ['#4CAF50', '#2E7D32']}
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


          </SafeAreaView>
        </KeyboardAvoidingView>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 80,
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 0 : 60,
    zIndex: 999,
  },
  blurContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    position: 'relative',
  },

  headerGradient: {
    paddingTop: getSafeAreaPadding().top + spacing.medium,
    paddingBottom: spacing.large,
    paddingHorizontal: spacing.large,
    backgroundColor: 'transparent',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: spacing.large,
    minHeight: 0, // Important for Android scrolling
  },
  messagesContent: {
    paddingTop: Platform.OS === 'ios' ? getSafeAreaPadding().top + spacing.large : spacing.large + 20,
    paddingVertical: spacing.medium,
    paddingBottom: spacing.medium,
    flexGrow: 1, // Important for Android scrolling
  },
  inputContainer: {
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
    paddingBottom: Platform.OS === 'ios' ? 80 : 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 20,
    borderTopWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.medium,
    minHeight: 50,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.small,
    fontSize: fontSize.large,
    color: '#333',
    maxHeight: 100,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingInputContainer: {
    position: 'absolute' as const,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  floatingInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.medium,
    minHeight: 50,
  },
  floatingInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
    fontSize: fontSize.large,
    color: '#333',
    maxHeight: 100,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  floatingSendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingSendButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  floatingSendGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionButtonsContainer: {
    marginHorizontal: spacing.large,
    marginVertical: spacing.medium,
  },
  floatingCloseButton: {
    position: 'absolute' as const,
    bottom: Platform.OS === 'ios' ? 180 : 120,
    right: spacing.large,
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
}); 