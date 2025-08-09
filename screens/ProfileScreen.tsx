"use client"

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
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

interface UserData {
  name?: string;
  email?: string;
  projectName?: string;
  employeeId?: string;
  createdAt?: any;
}

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<UserData>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            // If no Firestore data, use auth data
            setUserData({
              name: currentUser.displayName || 'User',
              email: currentUser.email || '',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData({
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error: any) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please login to view your profile</Text>
      </View>
    );
  }

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
          >
            {/* Profile Card */}
            <View style={styles.profileCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#4CAF50', '#2E7D32']}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Profile</Text>
                <Text style={styles.subtitle}>Your account information</Text>
              </View>

              {/* Profile Information */}
              <View style={styles.profileInfo}>
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="person" size={getIconSize(20)} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{userData.name || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="mail" size={getIconSize(20)} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{userData.email || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="id-card" size={getIconSize(20)} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Employee ID</Text>
                      <Text style={styles.infoValue}>{userData.employeeId || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="location" size={getIconSize(20)} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Project Name</Text>
                      <Text style={styles.infoValue}>{userData.projectName || 'Not provided'}</Text>
                    </View>
                  </View>
                </View>

                {/* Account Actions */}
                <View style={styles.actionsSection}>
                  <Text style={styles.sectionTitle}>Account Actions</Text>
                  
                  <Pressable style={styles.logoutButton} onPress={handleLogout}>
                    <View style={styles.logoutButtonContent}>
                      <Ionicons name="log-out" size={getIconSize(20)} color="#F44336" />
                      <Text style={styles.logoutButtonText}>Logout</Text>
                    </View>
                  </Pressable>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
    paddingHorizontal: spacing.large,
  },
  loadingText: {
    marginTop: spacing.large,
    fontSize: fontSize.large,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
    paddingHorizontal: spacing.large,
  },
  errorText: {
    fontSize: fontSize.large,
    color: '#666',
    textAlign: 'center',
    lineHeight: fontSize.large + 4,
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
    paddingVertical: spacing.large,
    paddingTop: getSafeAreaPadding().top + spacing.large,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.xxxLarge,
    padding: getCardPadding(),
    width: getContainerWidth(0.9),
    maxHeight: screenDimensions.height * (isSmallDevice() ? 0.85 : 0.8),
    alignSelf: 'center',
    ...getShadow(10),
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice() ? spacing.large : spacing.xLarge,
  },
  avatarContainer: {
    marginBottom: spacing.large,
  },
  avatarGradient: {
    width: getIconSize(60),
    height: getIconSize(60),
    borderRadius: getIconSize(30),
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadow(6),
  },
  avatarText: {
    fontSize: getIconSize(24),
    fontWeight: 'bold',
    color: '#FFF',
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
  },
  profileInfo: {
    width: '100%',
  },
  infoSection: {
    marginBottom: spacing.large,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.medium,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.medium,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    backgroundColor: '#F8F9FA',
    borderRadius: borderRadius.large,
    minHeight: isSmallDevice() ? 50 : 55,
  },
  infoIcon: {
    width: getIconSize(32),
    height: getIconSize(32),
    borderRadius: getIconSize(16),
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.medium,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSize.small,
    color: '#666',
    marginBottom: spacing.tiny,
  },
  infoValue: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: '#333',
    lineHeight: fontSize.medium + 2,
  },
  actionsSection: {
    marginBottom: spacing.small,
  },
  actionButton: {
    marginBottom: spacing.large,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...getShadow(6),
  },
  actionButtonGradient: {
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xxxLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isSmallDevice() ? 44 : 48,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: fontSize.large,
    marginLeft: spacing.small,
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: borderRadius.large,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
    minHeight: isSmallDevice() ? 44 : 48,
    justifyContent: 'center',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: fontSize.medium,
    marginLeft: spacing.small,
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
    top: screenDimensions.height * 0.3,
    right: spacing.large,
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
}); 