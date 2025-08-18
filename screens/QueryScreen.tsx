"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import ChatButton from '../components/ChatButton';
import ChatInterface from '../components/ChatInterface';
import { ExcelAnalysisService, ExcelAnalysis } from '../services/excelAnalysisService';
import { ImportedFile, ImportedFilesService } from '../services/importedFilesService';
import GeminiService from '../services/geminiService';
import { useUser } from '../contexts/UserContext';
import { getUserID } from '../utils/userUtils';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getContainerWidth, 
  getCardPadding, 
  getShadow,
  getIconSize,
  getSafeAreaPadding,
  isSmallDevice,
  isTablet,
  screenDimensions
} from '../utils/responsive';

export default function QueryScreen() {
  const { user, isAdminCreatedUser, isAuthenticated } = useUser();
  const [queryText, setQueryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentDataAnalysis, setCurrentDataAnalysis] = useState<ExcelAnalysis | null>(null);
  const [latestFile, setLatestFile] = useState<ImportedFile | null>(null);
  const [loadingLatestFile, setLoadingLatestFile] = useState(true);
  const [retryingAnalysis, setRetryingAnalysis] = useState(false);

  // Load the latest imported Excel file for data context
  const loadLatestExcelFile = async () => {
    try {
      if (!user || !isAuthenticated) {
        setLoadingLatestFile(false);
        return;
      }
      
      const userId = getUserID(user, isAdminCreatedUser);
      if (!userId) {
        setLoadingLatestFile(false);
        return;
      }

      console.log('🔍 Loading latest Excel file for QueryScreen...');
      setLoadingLatestFile(true);
      const files = await ImportedFilesService.getUserImportedFiles(userId);
      
      if (files.length > 0) {
        // Get the most recent file
        const latestFile = files[0]; // Files are ordered by uploadedAt desc
        setLatestFile(latestFile);
        
        // Check if this is a different file than what we currently have
        const isDifferentFile = !currentDataAnalysis || 
          currentDataAnalysis.fileName !== latestFile.originalName;
        
        if (isDifferentFile) {
          console.log('📊 New file detected, analyzing:', latestFile.originalName);
          // Clear current analysis first
          setCurrentDataAnalysis(null);
          GeminiService.setDataContext(null);
          
          // Analyze the file for AI context
          try {
            const analysis = await ExcelAnalysisService.analyzeExcelFile(latestFile.fileUrl, latestFile.originalName);
            setCurrentDataAnalysis(analysis);
            
            // Set the context in GeminiService
            GeminiService.setDataContext(analysis);
            
            console.log('✅ Excel analysis loaded for QueryScreen:', latestFile.originalName);
          } catch (analysisError) {
            console.error('❌ Error analyzing file for QueryScreen:', analysisError);
            console.log('ℹ️ Continuing without Excel data analysis. Chat will work in general mode.');
            // Store the file info even if analysis fails so user knows a file exists
            setLatestFile(latestFile);
            // Continue without analysis - chat will work in general mode
          }
        } else {
          console.log('📊 Same file as current, skipping analysis:', latestFile.originalName);
        }
      } else {
        console.log('ℹ️ No imported files found for data context');
        // Clear current data if no files exist
        setLatestFile(null);
        setCurrentDataAnalysis(null);
        GeminiService.setDataContext(null);
      }
    } catch (error) {
      console.error('❌ Error loading latest file:', error);
    } finally {
      setLoadingLatestFile(false);
    }
  };

  // Load latest file on component mount
  useEffect(() => {
    if (user && isAuthenticated) {
      loadLatestExcelFile();
    }
  }, [user, isAuthenticated]);

  // Refresh latest file whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && isAuthenticated) {
        console.log('🔄 QueryScreen focused, refreshing latest file...');
        loadLatestExcelFile();
      }
    }, [user, isAuthenticated])
  );

  // Retry analysis function
  const retryAnalysis = async () => {
    if (!latestFile || retryingAnalysis) return;
    
    setRetryingAnalysis(true);
    try {
      console.log('🔄 Retrying Excel analysis for:', latestFile.originalName);
      const analysis = await ExcelAnalysisService.analyzeExcelFile(latestFile.fileUrl, latestFile.originalName);
      setCurrentDataAnalysis(analysis);
      GeminiService.setDataContext(analysis);
      console.log('✅ Retry successful - Excel analysis loaded');
    } catch (error) {
      console.error('❌ Retry failed:', error);
      Alert.alert('Analysis Failed', 'Could not analyze the Excel file. Please try uploading the file again in the Database tab.');
    } finally {
      setRetryingAnalysis(false);
    }
  };

  const submitQuery = async () => {
    if (!queryText.trim()) {
      Alert.alert('Error', 'Please enter a query.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'queries'), {
        userId: user?.uid || 'anonymous',
        query: queryText.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Your query has been submitted successfully!');
      setQueryText('');
    } catch (error: any) {
      console.error('Error submitting query:', error);
      Alert.alert('Error', 'Failed to submit your query. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <View style={styles.container}>
      {/* Emerald Gradient Background */}
      <LinearGradient
        colors={['#10b981', '#059669', '#047857']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background Blur Effect */}
      <BlurView intensity={20} style={styles.blurContainer}>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Query Card */}
            <View style={styles.queryCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="chatbubble-ellipses" size={isTablet() ? 28 : 20} color="#059669" />
                </View>
                <Text style={styles.title}>Ask a Question</Text>
                <Text style={styles.subtitle}>
                  Submit your queries and get expert assistance
                </Text>
              </View>

              {/* Data Context Status */}
              {!loadingLatestFile && (
                <View style={styles.dataStatus}>
                  {currentDataAnalysis ? (
                    <View style={styles.dataConnected}>
                      <Ionicons name="server" size={isTablet() ? 24 : 20} color="#059669" style={styles.dataStatusIcon} />
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
                      <Ionicons name="warning" size={isTablet() ? 24 : 20} color="#d97706" style={styles.dataStatusIcon} />
                      <View style={styles.dataStatusText}>
                        <Text style={styles.dataStatusTitle}>File Found - Analysis Failed</Text>
                        <Text style={styles.dataStatusSubtitle}>
                          {latestFile.originalName} - Chat works in general mode
                        </Text>
                      </View>
                      <Pressable 
                        style={styles.retryButton} 
                        onPress={retryAnalysis}
                        disabled={retryingAnalysis}
                      >
                        <Ionicons 
                          name="refresh" 
                          size={isTablet() ? 18 : 16} 
                          color="#d97706" 
                          style={retryingAnalysis ? styles.spinningIcon : undefined}
                        />
                        <Text style={styles.retryButtonText}>
                          {retryingAnalysis ? '' : ' Retry'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.dataDisconnected}>
                      <Ionicons name="document-text" size={isTablet() ? 24 : 20} color="#6b7280" style={styles.dataStatusIcon} />
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

              {/* Query Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Your Query</Text>
                  <TextInput
                    style={[
                      styles.input,
                      queryText.length > 500 && { borderColor: '#ef4444', borderWidth: 2 }
                    ]}
                    value={queryText}
                    onChangeText={(text) => {
                      // Limit to 500 characters
                      if (text.length <= 500) {
                        setQueryText(text);
                      }
                    }}
                    placeholder="Type your question or concern here..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={isSmallDevice() ? 4 : isTablet() ? 6 : 5}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  <Text style={[
                    styles.characterCount,
                    queryText.length > 450 && { color: '#f59e0b' },
                    queryText.length > 500 && { color: '#ef4444' }
                  ]}>
                    {queryText.length}/500 characters
                  </Text>
                </View>

                <Pressable 
                  style={[styles.button, isSubmitting && styles.buttonDisabled]} 
                  onPress={submitQuery}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSubmitting ? (
                      <View style={styles.buttonContent}>
                        <Ionicons name="refresh" size={isTablet() ? 20 : 18} color="#ffffff" style={styles.spinningIcon} />
                        <Text style={styles.buttonText}>Submitting...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Submit Query</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Tips Section */}
                <View style={styles.tipsContainer}>
                  <View style={styles.tipsHeader}>
                    <Ionicons name="sparkles" size={isTablet() ? 20 : 18} color="#059669" />
                    <Text style={styles.tipsTitle}>
                      {currentDataAnalysis 
                        ? 'AI will analyze your Excel data automatically'
                        : 'Tips for better queries:'
                      }
                    </Text>
                  </View>
                  {currentDataAnalysis ? (
                    <Text style={styles.tipText}>
                      Ask any question about your data - the AI will automatically detect keywords, 
                      field names, and context from your Excel file to provide intelligent answers.
                    </Text>
                  ) : (
                    <View style={styles.tipsList}>
                      <Text style={styles.tipText}>• Be specific and clear</Text>
                      <Text style={styles.tipText}>• Include relevant details</Text>
                      <Text style={styles.tipText}>• We'll respond within 24 hours</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />
          </ScrollView>
        </KeyboardAvoidingView>
      </BlurView>

      {/* Chatbot Components */}
      <View style={styles.chatbotContainer}>
        <ChatButton 
          onPress={handleChatToggle}
          isOpen={isChatOpen}
          hasUnreadMessages={false}
        />
      </View>
      
      <ChatInterface 
        isVisible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        dataAnalysis={currentDataAnalysis}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  blurContainer: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet() ? spacing.xLarge : spacing.large,
    paddingVertical: spacing.xLarge,
    paddingTop: getSafeAreaPadding().top + spacing.xLarge + spacing.large,
    paddingBottom: spacing.xLarge,
  },
  queryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.xxxLarge,
    padding: isTablet() ? spacing.xLarge : spacing.medium,
    width: getContainerWidth(isTablet() ? 0.75 : 0.85),
    maxWidth: 500,
    ...getShadow(10),
    elevation: Platform.OS === 'android' ? 10 : undefined,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  iconContainer: {
    width: isTablet() ? getIconSize(60) : getIconSize(45),
    height: isTablet() ? getIconSize(60) : getIconSize(45),
    borderRadius: isTablet() ? getIconSize(30) : getIconSize(22.5),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  icon: {
    fontSize: isTablet() ? getIconSize(40) : getIconSize(30),
  },
  title: {
    fontSize: isTablet() ? fontSize.xLarge : fontSize.large,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: spacing.tiny,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.small,
    color: '#666',
    textAlign: 'center',
    lineHeight: fontSize.small + 4,
    paddingHorizontal: spacing.small,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.medium,
  },
  inputLabel: {
    fontSize: isTablet() ? fontSize.large : fontSize.medium,
    fontWeight: '600',
    color: '#047857',
    marginBottom: isTablet() ? spacing.medium : spacing.small,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: spacing.small,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: fontSize.small,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    maxHeight: 120,
  },
  characterCount: {
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    color: '#999',
    textAlign: 'right',
    marginTop: isTablet() ? spacing.medium : spacing.small,
  },
  button: {
    marginBottom: spacing.medium,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...getShadow(6),
    elevation: Platform.OS === 'android' ? 6 : undefined,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.xxLarge,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: isTablet() ? fontSize.xLarge : fontSize.large,
  },
  tipsContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: borderRadius.large,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    marginTop: spacing.small,
  },
  tipsTitle: {
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 0,
    marginLeft: spacing.small,
  },
  tipText: {
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    color: '#666',
    marginBottom: isTablet() ? spacing.small : spacing.tiny,
    lineHeight: (isTablet() ? fontSize.medium : fontSize.small) + 4,
  },
  chatbotContainer: {
    position: 'absolute',
    bottom: spacing.xLarge,
    right: spacing.large,
    zIndex: 1000,
  },
  // Decorative elements - positioned around the card
  decorativeCircle1: {
    position: 'absolute',
    top: -spacing.huge,
    left: -spacing.huge,
    width: getIconSize(80),
    height: getIconSize(80),
    borderRadius: getIconSize(40),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -spacing.xLarge,
    right: -spacing.xLarge,
    width: getIconSize(60),
    height: getIconSize(60),
    borderRadius: getIconSize(30),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: spacing.large,
    right: -spacing.large,
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dataStatus: {
    marginTop: spacing.small,
    marginBottom: spacing.small,
  },
  dataConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  dataWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  dataDisconnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(158, 158, 158, 0.1)',
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    borderLeftWidth: 4,
    borderLeftColor: '#9E9E9E',
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
    fontWeight: '600',
    color: '#047857',
    marginBottom: isTablet() ? 4 : 2,
  },
  dataStatusSubtitle: {
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    color: '#666',
    lineHeight: (isTablet() ? fontSize.medium : fontSize.small) + 4,
  },
  retryButton: {
    backgroundColor: '#d97706',
    borderRadius: borderRadius.small,
    paddingHorizontal: isTablet() ? spacing.medium : spacing.small,
    paddingVertical: isTablet() ? spacing.small : spacing.tiny,
    marginLeft: isTablet() ? spacing.medium : spacing.small,
    minWidth: isTablet() ? 80 : 60,
    alignItems: 'center',
    flexDirection: 'row',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: isTablet() ? fontSize.medium : fontSize.small,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  activeBadgeText: {
    color: '#059669',
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  spinningIcon: {
    marginRight: spacing.small,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  tipsList: {
    marginTop: spacing.small,
  },
});
