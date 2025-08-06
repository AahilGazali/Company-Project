"use client"

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Alert, 
  StyleSheet, 
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function QueryScreen() {
  const [queryText, setQueryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
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

              {/* Query Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Your Query</Text>
                  <TextInput
                    style={styles.input}
                    value={queryText}
                    onChangeText={setQueryText}
                    placeholder="Type your question or concern here..."
                    placeholderTextColor="#A5A5A5"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>
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
                  <Text style={styles.tipsTitle}>💡 Tips for better queries:</Text>
                  <Text style={styles.tipText}>• Be specific and clear</Text>
                  <Text style={styles.tipText}>• Include relevant details</Text>
                  <Text style={styles.tipText}>• We'll respond within 24 hours</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 40,
    paddingBottom: 100, // Add extra bottom padding for tab bar
  },
  queryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    width: width * 0.9,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  button: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tipsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  // Decorative elements
  decorativeCircle1: {
    position: 'absolute',
    top: 100,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 150,
    right: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 200,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
