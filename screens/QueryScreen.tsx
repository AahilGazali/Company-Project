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
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import ChatButton from '../components/ChatButton';
import ChatInterface from '../components/ChatInterface';
import { ExcelAnalysisService, ExcelAnalysis } from '../services/excelAnalysisService';
import { ImportedFile, ImportedFilesService } from '../services/importedFilesService';
import GeminiService from '../services/geminiService';
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
      const user = auth.currentUser;
      if (!user) {
        setLoadingLatestFile(false);
        return;
      }

      console.log('🔍 Loading latest Excel file for QueryScreen...');
      setLoadingLatestFile(true);
      const files = await ImportedFilesService.getUserImportedFiles(user.uid);
      
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
    loadLatestExcelFile();
  }, []);

  // Refresh latest file whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 QueryScreen focused, refreshing latest file...');
      loadLatestExcelFile();
    }, [])
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
      {/* Gradient Background */}
      <LinearGradient
        colors={['#4CAF50', '#2E7D32', '#1B5E20']}
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
                  <Text style={styles.icon}>💬</Text>
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
                      <Text style={styles.dataStatusIcon}>📊</Text>
                      <View style={styles.dataStatusText}>
                        <Text style={styles.dataStatusTitle}>Excel Data Connected</Text>
                        <Text style={styles.dataStatusSubtitle}>
                          Latest File: {currentDataAnalysis.fileName} • {currentDataAnalysis.keyFields.length} fields
                        </Text>
                      </View>
                    </View>
                  ) : latestFile ? (
                    <View style={styles.dataDisconnected}>
                      <Text style={styles.dataStatusIcon}>⚠️</Text>
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
                        <Text style={styles.retryButtonText}>
                          {retryingAnalysis ? '🔄' : '🔄 Retry'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.dataDisconnected}>
                      <Text style={styles.dataStatusIcon}>📄</Text>
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
                      queryText.length > 500 && { borderColor: '#F44336', borderWidth: 2 }
                    ]}
                    value={queryText}
                    onChangeText={(text) => {
                      // Limit to 500 characters
                      if (text.length <= 500) {
                        setQueryText(text);
                      }
                    }}
                    placeholder="Type your question or concern here..."
                    placeholderTextColor="#A5A5A5"
                    multiline
                    numberOfLines={isSmallDevice() ? 4 : isTablet() ? 8 : 6}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  <Text style={[
                    styles.characterCount,
                    queryText.length > 450 && { color: '#FF9800' },
                    queryText.length > 500 && { color: '#F44336' }
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
                    colors={isSubmitting ? ['#9E9E9E', '#757575'] : ['#4CAF50', '#2E7D32']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>
                      {isSubmitting ? 'Submitting...' : 'Submit Query'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Tips Section */}
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>
                    {currentDataAnalysis ? '🤖 AI will analyze your Excel data automatically' : '💡 Tips for better queries:'}
                  </Text>
                  {currentDataAnalysis ? (
                    <Text style={styles.tipText}>
                      Ask any question about your data - the AI will automatically detect keywords, 
                      field names, and context from your Excel file to provide intelligent answers.
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.tipText}>• Be specific and clear</Text>
                      <Text style={styles.tipText}>• Include relevant details</Text>
                      <Text style={styles.tipText}>• We'll respond within 24 hours</Text>
                    </>
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
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.huge,
    paddingTop: getSafeAreaPadding().top + spacing.large,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  queryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.xxxLarge,
    padding: getCardPadding(),
    width: getContainerWidth(0.9),
    maxHeight: screenDimensions.height * (isSmallDevice() ? 0.8 : 0.7),
    ...getShadow(10),
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice() ? spacing.large : spacing.xLarge,
  },
  iconContainer: {
    width: getIconSize(60),
    height: getIconSize(60),
    borderRadius: getIconSize(30),
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  icon: {
    fontSize: getIconSize(30),
  },
  title: {
    fontSize: fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: fontSize.medium + 4,
    paddingHorizontal: isSmallDevice() ? 0 : spacing.medium,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.large,
  },
  inputLabel: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: spacing.small,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: spacing.medium,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: fontSize.medium,
    color: '#333',
    minHeight: isSmallDevice() ? 100 : isTablet() ? 120 : 110,
    textAlignVertical: 'top',
    maxHeight: 200,
  },
  characterCount: {
    fontSize: fontSize.small,
    color: '#999',
    textAlign: 'right',
    marginTop: spacing.small,
  },
  button: {
    marginBottom: spacing.large,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...getShadow(6),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.xxxLarge,
    alignItems: 'center',
    minHeight: isSmallDevice() ? 44 : 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: fontSize.large,
  },
  tipsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: borderRadius.large,
    padding: spacing.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginTop: isSmallDevice() ? 0 : spacing.small,
  },
  tipsTitle: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: spacing.small,
  },
  tipText: {
    fontSize: fontSize.small,
    color: '#666',
    marginBottom: spacing.tiny,
    lineHeight: fontSize.small + 4,
  },
  chatbotContainer: {
    position: 'absolute',
    bottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
    right: spacing.large,
    zIndex: 1000,
  },
  // Decorative elements - responsive positioning
  decorativeCircle1: {
    position: 'absolute',
    top: screenDimensions.height * 0.15,
    left: -spacing.huge - spacing.medium,
    width: getIconSize(100),
    height: getIconSize(100),
    borderRadius: getIconSize(50),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: screenDimensions.height * 0.2,
    right: -spacing.xLarge - spacing.medium,
    width: getIconSize(60),
    height: getIconSize(60),
    borderRadius: getIconSize(30),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: screenDimensions.height * 0.25,
    right: spacing.large,
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dataStatus: {
    marginTop: spacing.medium,
    marginBottom: spacing.small,
  },
  dataConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: borderRadius.medium,
    padding: spacing.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  dataDisconnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(158, 158, 158, 0.1)',
    borderRadius: borderRadius.medium,
    padding: spacing.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#9E9E9E',
  },
  dataStatusIcon: {
    fontSize: fontSize.xLarge,
    marginRight: spacing.medium,
  },
  dataStatusText: {
    flex: 1,
  },
  dataStatusTitle: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  dataStatusSubtitle: {
    fontSize: fontSize.small,
    color: '#666',
    lineHeight: fontSize.small + 4,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    marginLeft: spacing.small,
    minWidth: 60,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: fontSize.small,
    fontWeight: '600',
  },
});
