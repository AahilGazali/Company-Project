import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GeminiService from '../services/geminiService';

export default function ApiTest() {
  const [isTesting, setIsTesting] = useState(false);

  const testApiConnection = async () => {
    setIsTesting(true);
    try {
      const response = await GeminiService.sendMessage('Hello, can you respond with "API is working!"');
      if (response.success) {
        Alert.alert('Success', 'API connection is working!');
      } else {
        Alert.alert('Error', response.error || 'API test failed');
      }
    } catch (error: any) {
      Alert.alert('Error', 'API connection failed. Please check your API key.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable 
        style={[styles.button, isTesting && styles.buttonDisabled]} 
        onPress={testApiConnection}
        disabled={isTesting}
      >
        <LinearGradient
          colors={isTesting ? ['#9E9E9E', '#757575'] : ['#FF9800', '#F57C00']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>
            {isTesting ? 'Testing...' : 'Test API Connection'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF9800',
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
}); 