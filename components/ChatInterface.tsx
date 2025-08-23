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
import { SearchIndexService } from "../services/searchIndexService"
import { FirebaseDataService } from "../services/firebaseDataService"
import ImportedFilesService from "../services/importedFilesService"
import { getUserID } from "../utils/userUtils"
import { spacing, fontSize, borderRadius, getSafeAreaPadding, getIconSize, screenDimensions } from "../utils/responsive"
import TypingIndicator from "./TypingIndicator"
import { useTheme } from "../contexts/ThemeContext"
import { useUser } from "../contexts/UserContext"


const { height: screenHeight } = screenDimensions

interface ChatInterfaceProps {
  isVisible: boolean
  onClose: () => void
  dataAnalysis?: ExcelAnalysis | null
}

export default function ChatInterface({ isVisible, onClose, dataAnalysis }: ChatInterfaceProps) {
  const { isUserDarkMode } = useTheme()
  const { user, isAdminCreatedUser } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasDataContext, setHasDataContext] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [showActionButtons, setShowActionButtons] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
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
    suggestionsTitle: {
      color: isUserDarkMode ? '#FFFFFF' : '#333333',
    },
    suggestionButton: {
      backgroundColor: isUserDarkMode ? '#374151' : '#F8F9FA',
      borderColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
    },
    suggestionText: {
      color: isUserDarkMode ? '#FFFFFF' : '#333333',
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
      setShowActionButtons(false)
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

    // Hide action buttons once user starts interacting
    if (showActionButtons) {
      setShowActionButtons(false)
    }

    // Add user message
    addMessage(message, true)
    setIsLoading(true)
    setIsTyping(true)

    try {
      let response: any

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

      // Handle location debugging
      if (message.toLowerCase().includes("show all locations") || message.toLowerCase().includes("debug locations")) {
        console.log("📍 Debugging available locations...")
        
        try {
          const locationDebug = await FirebaseDataService.debugAvailableLocations()
          addMessage(locationDebug, false)
        } catch (error) {
          addMessage(`❌ Location debug failed: ${error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle Firebase record count debugging
      if (message.toLowerCase().includes("debug firebase count") || message.toLowerCase().includes("count firebase records")) {
        console.log("📊 Debugging Firebase record count...")
        
        try {
          const countDebug = await FirebaseDataService.debugRecordCount()
          addMessage(countDebug, false)
        } catch (error) {
          addMessage(`❌ Firebase count debug failed: ${error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle Firebase test query
      if (message.toLowerCase().includes("test firebase query")) {
        console.log("🧪 Testing Firebase query system...")
        
        try {
          addMessage("🔍 Testing Firebase query: 'show all records'", false)
          const testResult = await FirebaseDataService.processNaturalLanguageQuery("show all records")
          
          if (testResult.success) {
            const response = testResult.naturalResponse || testResult.error || 'No response generated'
            addMessage(`✅ Firebase query test successful:\n\n${response}`, false)
          } else {
            addMessage(`❌ Firebase query test failed: ${testResult.error}`, false)
          }
        } catch (error) {
          addMessage(`❌ Firebase query test error: ${error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle Firebase status check
      if (message.toLowerCase().includes("check firebase status") || message.toLowerCase().includes("firebase status")) {
        console.log("📊 Checking Firebase collection status...")
        
        try {
          const statusResult = await FirebaseDataService.checkCollectionStatus()
          addMessage(statusResult, false)
        } catch (error) {
          addMessage(`❌ Firebase status check failed: ${error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

      // Handle detailed Firebase upload verification
      if (message.toLowerCase().includes("verify firebase upload") || message.toLowerCase().includes("check upload")) {
        console.log("🔍 Verifying Firebase upload details...")
        
        try {
          addMessage("🔍 **Firebase Upload Verification**\n\nChecking upload process...", false)
          
          // Check if we have current collection info
          const collectionInfo = FirebaseDataService.getCurrentCollection()
          addMessage(`📂 **Collection Info:**\n• Collection: ${collectionInfo.collectionName || 'None'}\n• File: ${collectionInfo.fileName || 'None'}`, false)
          
          // Check collection status
          const statusResult = await FirebaseDataService.checkCollectionStatus()
          addMessage(`📊 **Collection Status:**\n${statusResult}`, false)
          
          // Test a simple query
          addMessage("🧪 **Testing Query System:**\nTesting 'show all records' query...", false)
          const testResult = await FirebaseDataService.processNaturalLanguageQuery("show all records")
          
          if (testResult.success) {
            const response = testResult.naturalResponse || testResult.error || 'No response generated'
            addMessage(`✅ **Query Test Successful:**\n\n${response}`, false)
          } else {
            addMessage(`❌ **Query Test Failed:**\n${testResult.error}`, false)
          }
          
        } catch (error) {
          addMessage(`❌ Verification failed: ${error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

             // Handle MMT number test
       if (message.toLowerCase().includes("test mmt") || message.toLowerCase().includes("debug mmt")) {
         console.log("🔢 Testing MMT number query...")
         
         try {
           addMessage("🔢 **Testing MMT Number Query**\n\nTesting MMT number 4006209606...", false)
           
           const testResult = await FirebaseDataService.processNaturalLanguageQuery("give me the location of 4006209606")
           
           if (testResult.success) {
             const response = testResult.naturalResponse || testResult.error || 'No response generated'
             addMessage(`✅ **MMT Query Test Successful:**\n\n${response}`, false)
           } else {
             addMessage(`❌ **MMT Query Test Failed:**\n${testResult.error}`, false)
           }
           
         } catch (error) {
           addMessage(`❌ MMT test failed: ${error}`, false)
         }

         setIsLoading(false)
         setIsTyping(false)
         return
       }

       // Handle direct MMT search
       if (message.toLowerCase().includes("direct search") || message.toLowerCase().includes("search mmt")) {
         console.log("🔍 Direct MMT search requested...")
         
         // Extract MMT number from message
         const mmtMatch = message.match(/(\d{10,12})/);
         if (mmtMatch) {
           const mmtNumber = mmtMatch[1];
           addMessage(`🔍 **Direct Search** for MMT: ${mmtNumber}`, false)
           
           try {
             const directResult = await FirebaseDataService.directMmtSearch(mmtNumber)
             addMessage(directResult, false)
           } catch (error) {
             addMessage(`❌ Direct search failed: ${error}`, false)
           }
         } else {
           addMessage("❌ Please include an MMT number in your message (e.g., 'Direct search 4006209606')", false)
         }

         setIsLoading(false)
         setIsTyping(false)
         return
       }

       // Handle manual collection setup
       if (message.toLowerCase().includes("setup collection") || message.toLowerCase().includes("load collection")) {
         console.log("🔧 Setting up collection manually...")
         
         try {
           addMessage("🔧 **Setting up Firebase Collection**\n\nTrying to connect to MMT_Database_Compressed_xlsx...", false)
           
           // Force set the collection
           await FirebaseDataService.setCurrentCollection('MMT_Database_Compressed_xlsx', 'MMT_Database_Compressed.xlsx')
           
           const statusResult = await FirebaseDataService.checkCollectionStatus()
           addMessage(`✅ **Collection Setup Complete:**\n${statusResult}`, false)
           
         } catch (error) {
           addMessage(`❌ Collection setup failed: ${error}`, false)
         }

         setIsLoading(false)
         setIsTyping(false)
         return
       }

       // Handle specific MMT number queries - force Firebase
       const mmtNumberMatch = message.match(/(\d{10,12})/);
       if (mmtNumberMatch) {
         console.log(`🔢 MMT number detected (${mmtNumberMatch[1].length} digits), forcing Firebase query...`)
         
         try {
           const firebaseResult = await FirebaseDataService.processNaturalLanguageQuery(message)
           
           if (firebaseResult.success) {
             const response = firebaseResult.naturalResponse || firebaseResult.error || 'No response generated'
             addMessage(response, false)
           } else {
             addMessage(`❌ **MMT Query Failed**: ${firebaseResult.error}`, false)
           }
         } catch (error) {
           addMessage(`❌ **MMT Query Error**: ${error}`, false)
         }

         setIsLoading(false)
         setIsTyping(false)
         return
       }

      // Handle force re-upload to Firebase
      if (message.toLowerCase().includes("force firebase upload") || message.toLowerCase().includes("re-upload to firebase")) {
        console.log("🔄 Force re-uploading data to Firebase...")
        
        if (!dataAnalysis?.fileName || !dataAnalysis?.fullData) {
          addMessage("❌ No Excel data available. Please upload an Excel file first.", false)
          setIsLoading(false)
          setIsTyping(false)
          return
        }

        try {
          // Get the file URL from imported files
          const userId = getUserID(user, isAdminCreatedUser)
          if (!userId) {
            addMessage("❌ User authentication required for re-upload.", false)
            setIsLoading(false)
            setIsTyping(false)
            return
          }

          const files = await ImportedFilesService.getUserImportedFiles(userId)
          const currentFile = files.find(f => f.originalName === dataAnalysis.fileName)
          
          if (!currentFile) {
            addMessage("❌ Original file not found in storage.", false)
            setIsLoading(false)
            setIsTyping(false)
            return
          }

          addMessage(`🔄 Re-uploading ${dataAnalysis.fileName} with ${dataAnalysis.fullData.length} records to Firebase...`, false)
          
          const firebaseResult = await FirebaseDataService.uploadExcelToFirebase(currentFile.fileUrl, currentFile.originalName)
          
          if (firebaseResult.success) {
            addMessage(`✅ ${firebaseResult.message}`, false)
          } else {
            addMessage(`❌ Re-upload failed: ${firebaseResult.message}`, false)
          }
        } catch (error) {
          addMessage(`❌ Re-upload error: ${error}`, false)
        }

        setIsLoading(false)
        setIsTyping(false)
        return
      }

             // Check if this is a data-related query - prioritize Firebase for all data queries
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
         "4006249504", // Add specific MMT number
         "40062209606", // Add the new MMT number
         "tenth street",
         "salamiyah",
         "avenue",
         "street",
       ]
       const isDataQuery = dataKeywords.some((keyword) => message.toLowerCase().includes(keyword))

       if (isDataQuery) {
         // ALWAYS try Firebase first for data queries
         console.log("🔍 Processing Firebase natural language query...")
         try {
           const firebaseResult = await FirebaseDataService.processNaturalLanguageQuery(message)
           
           if (firebaseResult.success) {
             const response = firebaseResult.naturalResponse || firebaseResult.error || 'No response generated'
             addMessage(response, false)
             setIsLoading(false)
             setIsTyping(false)
             return
           } else {
             console.log("❌ Firebase query failed:", firebaseResult.error)
             addMessage(`❌ **Firebase Query Failed**: ${firebaseResult.error}`, false)
             setIsLoading(false)
             setIsTyping(false)
             return
           }
         } catch (firebaseError) {
           console.error("❌ Firebase query error:", firebaseError)
           addMessage(`❌ **Firebase Error**: ${firebaseError}`, false)
           setIsLoading(false)
           setIsTyping(false)
           return
         }
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

  const loadSearchSuggestions = () => {
    if (dataAnalysis?.fullData && dataAnalysis.fullData.length > 0) {
      try {
        const suggestions = SearchIndexService.getSearchSuggestions();
        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to load search suggestions:', error);
      }
    }
  }

  const welcomeMessage = () => {
    if (messages.length === 0) {
      addMessage(
        "🤖 Hello! I'm your AI Business Analyst Assistant. I can help you analyze data, answer questions, and provide insights. How can I assist you today?",
        false,
      )
      
      // Load search suggestions if data is available
      setTimeout(() => {
        loadSearchSuggestions();
      }, 1000);
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
              
              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && messages.length === 1 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionsTitle, dynamicStyles.suggestionsTitle]}>
                    💡 Try asking about your data:
                  </Text>
                  <View style={styles.suggestionsList}>
                    {searchSuggestions.slice(0, 5).map((suggestion, index) => (
                      <Pressable
                        key={index}
                        style={[styles.suggestionButton, dynamicStyles.suggestionButton]}
                        onPress={() => {
                          handleSendMessage(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        <Text style={[styles.suggestionText, dynamicStyles.suggestionText]}>
                          {suggestion}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              
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
  suggestionsContainer: {
    marginHorizontal: spacing.large,
    marginVertical: spacing.medium,
    padding: spacing.medium,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  suggestionsTitle: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    marginBottom: spacing.small,
  },
  suggestionsList: {
    gap: spacing.small,
  },
  suggestionButton: {
    padding: spacing.small,
    borderRadius: borderRadius.small,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  suggestionText: {
    fontSize: fontSize.small,
    textAlign: 'left',
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