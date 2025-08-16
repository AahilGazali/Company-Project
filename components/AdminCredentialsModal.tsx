import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AdminService } from '../services/adminService';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
} from '../utils/responsive';

interface AdminCredentialsModalProps {
  visible: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

export default function AdminCredentialsModal({ 
  visible, 
  onClose, 
  onCredentialsUpdated 
}: AdminCredentialsModalProps) {
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrentCredentials();
    }
  }, [visible]);

  const loadCurrentCredentials = async () => {
    try {
      const credentials = await AdminService.getAdminCredentials();
      if (credentials) {
        setCurrentEmail(credentials.email);
        setCurrentPassword(credentials.password);
        setNewEmail(credentials.email);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleUpdateCredentials = async () => {
    if (!newEmail || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsUpdating(true);
    try {
      await AdminService.updateAdminCredentials(newEmail, newPassword);
      Alert.alert(
        'Success', 
        'Admin credentials updated successfully! You will need to login again with the new credentials.',
        [
          {
            text: 'OK',
            onPress: () => {
              onCredentialsUpdated();
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update credentials. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Update Admin Credentials</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFF" />
            </Pressable>
          </LinearGradient>

          <View style={styles.modalBody}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Credentials</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Email</Text>
                <TextInput
                  style={styles.input}
                  value={currentEmail}
                  editable={false}
                  placeholder="Current email"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  editable={false}
                  placeholder="Current password"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New Credentials</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Email</Text>
                <TextInput
                  style={styles.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="Enter new email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.updateButton} 
                onPress={handleUpdateCredentials}
                disabled={isUpdating}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.updateButtonGradient}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Credentials</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.large,
    width: '90%',
    maxHeight: '80%',
    ...getShadow(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.large,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: fontSize.large,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.small,
  },
  modalBody: {
    padding: spacing.large,
  },
  section: {
    marginBottom: spacing.xxxLarge,
  },
  sectionTitle: {
    fontSize: fontSize.medium,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.medium,
  },
  inputContainer: {
    marginBottom: spacing.medium,
  },
  inputLabel: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: '#666',
    marginBottom: spacing.tiny,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: fontSize.medium,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.medium,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: fontSize.medium,
    fontWeight: '600',
  },
  updateButton: {
    flex: 2,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  updateButtonGradient: {
    padding: spacing.medium,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: fontSize.medium,
    fontWeight: 'bold',
  },
});
