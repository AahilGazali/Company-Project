import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../utils/responsive';
import { useTheme } from '../contexts/ThemeContext';

interface ChatActionButtonsProps {
  onDataStatus: () => void;
  onVerifyData: () => void;
  onDebugQuery: () => void;
}

export default function ChatActionButtons({ 
  onDataStatus, 
  onVerifyData, 
  onDebugQuery 
}: ChatActionButtonsProps) {
  const { isUserDarkMode } = useTheme();

  const dynamicStyles = {
    container: {
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#F8F9FA',
      borderColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
    },
    button: {
      backgroundColor: isUserDarkMode ? '#374151' : '#FFFFFF',
      borderColor: isUserDarkMode ? '#4B5563' : '#E0E0E0',
    },
    buttonText: {
      color: isUserDarkMode ? '#FFFFFF' : '#333333',
    },
    buttonSubtext: {
      color: isUserDarkMode ? '#9CA3AF' : '#666666',
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.buttonText]}>
        📊 Quick Actions
      </Text>
      
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, dynamicStyles.button]} 
          onPress={onDataStatus}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="analytics" size={20} color="#2196F3" />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                Data Status
              </Text>
              <Text style={[styles.buttonSubtext, dynamicStyles.buttonSubtext]}>
                Check availability & stats
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.button, dynamicStyles.button]} 
          onPress={onVerifyData}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                Verify Data
              </Text>
              <Text style={[styles.buttonSubtext, dynamicStyles.buttonSubtext]}>
                Complete dataset analysis
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.button, dynamicStyles.button]} 
          onPress={onDebugQuery}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="bug" size={20} color="#FF9800" />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                Debug Query
              </Text>
              <Text style={[styles.buttonSubtext, dynamicStyles.buttonSubtext]}>
                Test specific queries
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.medium,
    padding: spacing.medium,
    borderRadius: borderRadius.large,
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.medium,
    fontWeight: 'bold',
    marginBottom: spacing.medium,
  },
  buttonContainer: {
    gap: spacing.small,
  },
  button: {
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.medium,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: fontSize.medium,
    fontWeight: '600',
  },
  buttonSubtext: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
});
