"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useFocusEffect } from "@react-navigation/native"
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { QueryService } from "../services/queryService"
import ChatButton from "../components/ChatButton"
import ChatInterface from "../components/ChatInterface"
import { ExcelAnalysisService, type ExcelAnalysis } from "../services/excelAnalysisService"
import { type ImportedFile, ImportedFilesService } from "../services/importedFilesService"
import GeminiService from "../services/geminiService"
import { useUser } from "../contexts/UserContext"
import { useTheme } from "../contexts/ThemeContext"
import { getUserID } from "../utils/userUtils"
import CustomHeader from "../components/CustomHeader"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  spacing,
  fontSize,
  borderRadius,
  getContainerWidth,
  getShadow,
  getIconSize,
  isSmallDevice,
  isTablet,
} from "../utils/responsive"

export default function QueryScreen() {
  const { user, isAdminCreatedUser, isAuthenticated } = useUser()
  const { isUserDarkMode } = useTheme()
  const [queryText, setQueryText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [currentDataAnalysis, setCurrentDataAnalysis] = useState<ExcelAnalysis | null>(null)
  const [latestFile, setLatestFile] = useState<ImportedFile | null>(null)
  const [loadingLatestFile, setLoadingLatestFile] = useState(true)
  const [retryingAnalysis, setRetryingAnalysis] = useState(false)
  const insets = useSafeAreaInsets()
  const queryInputRef = useRef<TextInput>(null)

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isUserDarkMode ? "#121212" : "#F0F4F3",
    },
    background: {
      backgroundColor: isUserDarkMode ? "#121212" : "#F0F4F3",
    },
    scrollContainer: {
      paddingBottom: Platform.OS === "ios" ? spacing.medium + 180 : spacing.medium + 100 + insets.bottom,
    },
    chatbotContainer: {
      bottom: Platform.OS === "ios" ? spacing.large + 100 : spacing.xLarge + 120,
    },
    queryCard: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#FFFFFF",
    },
    queryTitle: {
      color: isUserDarkMode ? "#FFFFFF" : "#333",
    },
    querySubtitle: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    },
    queryInput: {
      backgroundColor: isUserDarkMode ? "#2D2D2D" : "#F8F9FA",
      color: isUserDarkMode ? "#FFFFFF" : "#333",
      borderColor: isUserDarkMode ? "#404040" : "#E0E0E0",
    },
    queryInputPlaceholder: {
      color: isUserDarkMode ? "#666" : "#999",
    },
  }

  const loadLatestExcelFile = async () => {
    try {
      if (!user || !isAuthenticated) {
        setLoadingLatestFile(false)
        return
      }

      const userId = getUserID(user, isAdminCreatedUser)
      if (!userId) {
        setLoadingLatestFile(false)
        return
      }

      setLoadingLatestFile(true)
      const files = await ImportedFilesService.getUserImportedFiles(userId)

      if (files.length > 0) {
        const latestFile = files[0]
        setLatestFile(latestFile)

        const isDifferentFile = !currentDataAnalysis || currentDataAnalysis.fileName !== latestFile.originalName

        if (isDifferentFile) {
          setCurrentDataAnalysis(null)
          GeminiService.setDataContext(null)

          try {
            const analysis = await ExcelAnalysisService.analyzeExcelFile(latestFile.fileUrl, latestFile.originalName)
            setCurrentDataAnalysis(analysis)
            GeminiService.setDataContext(analysis)
          } catch (analysisError) {
            setLatestFile(latestFile)
          }
        }
      } else {
        setLatestFile(null)
        setCurrentDataAnalysis(null)
        GeminiService.setDataContext(null)
      }
    } catch (error) {
      console.error("Error loading latest file:", error)
    } finally {
      setLoadingLatestFile(false)
    }
  }

  useEffect(() => {
    if (user && isAuthenticated) {
      loadLatestExcelFile()
    }
  }, [user, isAuthenticated])

  useFocusEffect(
    useCallback(() => {
      if (user && isAuthenticated) {
        loadLatestExcelFile()
      }
    }, [user, isAuthenticated]),
  )

  const retryAnalysis = async () => {
    if (!latestFile || retryingAnalysis) return

    setRetryingAnalysis(true)
    try {
      const analysis = await ExcelAnalysisService.analyzeExcelFile(latestFile.fileUrl, latestFile.originalName)
      setCurrentDataAnalysis(analysis)
      GeminiService.setDataContext(analysis)
    } catch (error) {
      Alert.alert(
        "Analysis Failed",
        "Could not analyze the Excel file. Please try uploading the file again in the Database tab.",
      )
    } finally {
      setRetryingAnalysis(false)
    }
  }

  const submitQuery = async () => {
    if (!queryText.trim()) {
      Alert.alert("Error", "Please enter a query.")
      return
    }

    if (!isAuthenticated || !user) {
      Alert.alert("Error", "Please log in to submit a query.")
      return
    }

    setIsSubmitting(true)
    try {
      const userId = getUserID(user, isAdminCreatedUser)
      if (!userId) {
        throw new Error("Unable to get user ID")
      }

      await QueryService.submitQuery(userId, queryText.trim())
      Alert.alert("Success", "Your query has been submitted successfully!")
      setQueryText("")
    } catch (error: any) {
      Alert.alert("Error", "Failed to submit your query. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen)
  }

  const dismissKeyboard = () => {
    Keyboard.dismiss()
    queryInputRef.current?.blur()
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <CustomHeader showLogo={true} isDatabaseScreen={false} />
      <View style={[styles.background, dynamicStyles.background]} />

      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={[styles.scrollContainer, dynamicStyles.scrollContainer]}>
              <View style={[styles.queryCard, dynamicStyles.queryCard]}>
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="chatbubble-ellipses" size={isTablet() ? 28 : 20} color="#059669" />
                  </View>
                  <Text style={[styles.title, dynamicStyles.queryTitle]}>Ask a Question</Text>
                  <Text style={[styles.subtitle, dynamicStyles.querySubtitle]}>
                    Submit your queries and get expert assistance
                  </Text>
                </View>

                {!loadingLatestFile && (
                  <View style={styles.dataStatus}>
                    {currentDataAnalysis ? (
                      <View style={styles.dataConnected}>
                        <Ionicons
                          name="server"
                          size={isTablet() ? 24 : 20}
                          color="#059669"
                          style={styles.dataStatusIcon}
                        />
                        <View style={styles.dataStatusText}>
                          <Text style={styles.dataStatusTitle}>Excel Data Connected</Text>
                          <Text style={styles.dataStatusSubtitle}>
                            Latest File: {currentDataAnalysis.fileName} • {currentDataAnalysis.columns.length} fields
                          </Text>
                        </View>
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      </View>
                    ) : latestFile ? (
                      <View style={styles.dataWarning}>
                        <Ionicons
                          name="warning"
                          size={isTablet() ? 24 : 20}
                          color="#d97706"
                          style={styles.dataStatusIcon}
                        />
                        <View style={styles.dataStatusText}>
                          <Text style={styles.dataStatusTitle}>File Found - Analysis Failed</Text>
                          <Text style={styles.dataStatusSubtitle}>
                            {latestFile.originalName} - Chat works in general mode
                          </Text>
                        </View>
                        <Pressable style={styles.retryButton} onPress={retryAnalysis} disabled={retryingAnalysis}>
                          <Ionicons
                            name="refresh"
                            size={isTablet() ? 18 : 16}
                            color="#d97706"
                            style={retryingAnalysis ? styles.spinningIcon : undefined}
                          />
                          <Text style={styles.retryButtonText}>{retryingAnalysis ? "" : " Retry"}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.dataDisconnected}>
                        <Ionicons
                          name="document-text"
                          size={isTablet() ? 24 : 20}
                          color="#6b7280"
                          style={styles.dataStatusIcon}
                        />
                        <View style={styles.dataStatusText}>
                          <Text style={styles.dataStatusTitle}>No Data Connected</Text>
                          <Text style={styles.dataStatusSubtitle}>
                            Upload Excel files in Database tab for data-specific questions
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.inputLabel}>Your Query</Text>
                      {queryText.length > 0 && (
                        <Pressable
                          style={styles.clearButton}
                          onPress={() => {
                            setQueryText("")
                            queryInputRef.current?.focus()
                          }}
                        >
                          <Ionicons name="close-circle" size={20} color="#6b7280" />
                        </Pressable>
                      )}
                    </View>
                    <TextInput
                      ref={queryInputRef}
                      style={[
                        styles.input,
                        dynamicStyles.queryInput,
                        queryText.length > 500 && { borderColor: "#ef4444", borderWidth: 2 },
                      ]}
                      value={queryText}
                      onChangeText={(text) => {
                        if (text.length <= 500) {
                          setQueryText(text)
                        }
                      }}
                      placeholder="Type your question or concern here..."
                      placeholderTextColor={dynamicStyles.queryInputPlaceholder.color}
                      multiline
                      numberOfLines={isSmallDevice() ? 4 : isTablet() ? 6 : 5}
                      textAlignVertical="top"
                      maxLength={500}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={dismissKeyboard}
                      autoCorrect={false}
                      autoCapitalize="sentences"
                      enablesReturnKeyAutomatically={true}
                    />
                    <Text
                      style={[
                        styles.characterCount,
                        queryText.length > 450 && { color: "#f59e0b" },
                        queryText.length > 500 && { color: "#ef4444" },
                      ]}
                    >
                      {queryText.length}/500 characters
                    </Text>
                  </View>

                  <View style={styles.buttonContainer}>
                    {queryText.trim() && (
                      <Pressable
                        style={[styles.cancelButton, isSubmitting && styles.buttonDisabled]}
                        onPress={() => {
                          setQueryText("")
                          dismissKeyboard()
                        }}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.button, isSubmitting && styles.buttonDisabled]}
                      onPress={submitQuery}
                      disabled={isSubmitting}
                    >
                      <LinearGradient
                        colors={isSubmitting ? ["#9ca3af", "#6b7280"] : ["#10b981", "#059669"]}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {isSubmitting ? (
                          <View style={styles.buttonContent}>
                            <Ionicons
                              name="refresh"
                              size={isTablet() ? 20 : 18}
                              color="#ffffff"
                              style={styles.spinningIcon}
                            />
                            <Text style={styles.buttonText}>Submitting...</Text>
                          </View>
                        ) : (
                          <Text style={styles.buttonText}>Submit Query</Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
              <View style={styles.decorativeCircle3} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {!isChatOpen && (
        <View style={[styles.chatbotContainer, dynamicStyles.chatbotContainer]}>
          <ChatButton onPress={handleChatToggle} isOpen={isChatOpen} hasUnreadMessages={false} variant="queryScreen" />
        </View>
      )}

      <ChatInterface isVisible={isChatOpen} onClose={() => setIsChatOpen(false)} dataAnalysis={currentDataAnalysis} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#E2EBDD",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: isTablet() ? spacing.xLarge : spacing.large,
    paddingVertical: spacing.small,
    paddingTop: Platform.OS === "ios" ? 120 : 80,
  },
  queryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: borderRadius.xxxLarge,
    padding: isTablet() ? spacing.medium : spacing.small,
    width: getContainerWidth(isTablet() ? 0.7 : 0.8),
    maxWidth: 450,
    ...getShadow(10),
    elevation: Platform.OS === "android" ? 10 : undefined,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.tiny,
  },
  iconContainer: {
    width: isTablet() ? getIconSize(60) : getIconSize(45),
    height: isTablet() ? getIconSize(60) : getIconSize(45),
    borderRadius: isTablet() ? getIconSize(30) : getIconSize(22.5),
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.tiny,
  },
  title: {
    fontSize: isTablet() ? fontSize.xLarge : fontSize.large,
    fontWeight: "bold",
    color: "#047857",
    marginBottom: spacing.tiny,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.small,
    color: "#666",
    textAlign: "center",
    lineHeight: fontSize.small + 4,
    paddingHorizontal: spacing.small,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: spacing.medium,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isTablet() ? spacing.medium : spacing.small,
  },
  inputLabel: {
    fontSize: isTablet() ? fontSize.large : fontSize.medium,
    fontWeight: "600",
    color: "#047857",
  },
  clearButton: {
    padding: spacing.tiny,
  },
  input: {
    backgroundColor: "#F8F9FA",
    padding: spacing.small,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: fontSize.small,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
    maxHeight: 120,
  },
  characterCount: {
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    color: "#999",
    textAlign: "right",
    marginTop: isTablet() ? spacing.medium : spacing.small,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.medium,
    marginBottom: spacing.medium,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(6),
    elevation: Platform.OS === "android" ? 6 : undefined,
  },
  cancelButton: {
    flex: 0.3,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: isTablet() ? fontSize.large : fontSize.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.xxLarge,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: isTablet() ? fontSize.xLarge : fontSize.large,
  },
  chatbotContainer: {
    position: "absolute",
    bottom: spacing.large + 60,
    right: spacing.large,
    zIndex: 1000,
  },
  decorativeCircle1: {
    position: "absolute",
    top: -spacing.huge,
    left: -spacing.huge,
    width: getIconSize(80),
    height: getIconSize(80),
    borderRadius: getIconSize(40),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -spacing.xLarge,
    right: -spacing.xLarge,
    width: getIconSize(60),
    height: getIconSize(60),
    borderRadius: getIconSize(30),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decorativeCircle3: {
    position: "absolute",
    top: spacing.large,
    right: -spacing.large,
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  dataStatus: {
    marginTop: spacing.small,
    marginBottom: spacing.small,
  },
  dataConnected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  dataWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217, 119, 6, 0.1)",
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: "#d97706",
  },
  dataDisconnected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(158, 158, 158, 0.1)",
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: "#9E9E9E",
  },
  dataStatusIcon: {
    fontSize: isTablet() ? fontSize.xxLarge : fontSize.xLarge,
    marginRight: isTablet() ? spacing.large : spacing.medium,
  },
  dataStatusText: {
    flex: 1,
  },
  dataStatusTitle: {
    fontSize: isTablet() ? fontSize.large : fontSize.medium,
    fontWeight: "600",
    color: "#047857",
    marginBottom: isTablet() ? 4 : 2,
  },
  dataStatusSubtitle: {
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    color: "#666",
    lineHeight: (isTablet() ? fontSize.medium : fontSize.small) + 4,
  },
  retryButton: {
    backgroundColor: "#d97706",
    borderRadius: borderRadius.small,
    paddingHorizontal: isTablet() ? spacing.medium : spacing.small,
    paddingVertical: isTablet() ? spacing.small : spacing.tiny,
    marginLeft: isTablet() ? spacing.medium : spacing.small,
    minWidth: isTablet() ? 80 : 60,
    alignItems: "center",
    flexDirection: "row",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    fontWeight: "600",
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  activeBadgeText: {
    color: "#059669",
    fontSize: fontSize.small,
    fontWeight: "bold",
  },
  spinningIcon: {
    marginRight: spacing.small,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
})
