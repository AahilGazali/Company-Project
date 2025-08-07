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

const { width, height } = Dimensions.get('window');

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
        <View style={styles.mainContainer}>
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
                      <Ionicons name="person" size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{userData.name || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="mail" size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{userData.email || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="id-card" size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Employee ID</Text>
                      <Text style={styles.infoValue}>{userData.employeeId || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="location" size={20} color="#2E7D32" />
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
                      <Ionicons name="log-out" size={20} color="#F44336" />
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
          </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    width: width * 0.9,
    maxWidth: 500,
    maxHeight: height * 0.8,
    alignSelf: 'center',
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
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  profileInfo: {
    width: '100%',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionsSection: {
    marginBottom: 8,
  },
  actionButton: {
    marginBottom: 16,
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
  actionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
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