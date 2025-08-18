import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useUser } from '../contexts/UserContext';
import CustomHeader from '../components/CustomHeader';
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
  const [greeting, setGreeting] = useState<string>('');
  const { user: contextUser, logout: contextLogout, isAuthenticated } = useUser();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const firestoreData = userDoc.data();
            setUserData({
              name: firestoreData.fullName || firestoreData.name || 'User',
              email: firestoreData.email || currentUser.email || '',
              projectName: firestoreData.projectName || '',
              employeeId: firestoreData.employeeId || '',
              createdAt: firestoreData.createdAt
            });
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

  // Set greeting when user is authenticated
  useEffect(() => {
    if (contextUser && isAuthenticated) {
      const userName = contextUser.fullName || 'User';
      setGreeting(`Hello ${userName}!`);
    } else if (user) {
      const userName = user.displayName || userData.name || 'User';
      setGreeting(`Hello ${userName}!`);
    } else {
      setGreeting('');
    }
  }, [contextUser, user, userData.name, isAuthenticated]);

  // Use context user data if available (for admin-created users)
  const displayUser = contextUser || user;
  const displayUserData = contextUser ? {
    name: contextUser.fullName,
    email: contextUser.email,
    projectName: contextUser.projectName,
    employeeId: contextUser.employeeId,
    createdAt: contextUser.createdAt
  } : userData;

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
              if (contextUser) {
                // Logout from context (admin-created user)
                await contextLogout();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else if (user) {
                // Logout from Firebase Auth
                await signOut(auth);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
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

  if (!displayUser) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please login to view your profile</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader showLogo={true} isDatabaseScreen={false} />
      {/* Background */}
      <View style={styles.background} />

      <View style={styles.contentContainer}>
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
                  {displayUserData.name ? displayUserData.name.charAt(0).toUpperCase() : 'U'}
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
                  <Text style={styles.infoValue}>{displayUserData.name || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail" size={getIconSize(20)} color="#2E7D32" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{displayUserData.email || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="id-card" size={getIconSize(20)} color="#2E7D32" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Employee ID</Text>
                  <Text style={styles.infoValue}>{displayUserData.employeeId || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={getIconSize(20)} color="#2E7D32" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Project Name</Text>
                  <Text style={styles.infoValue}>{displayUserData.projectName || 'Not provided'}</Text>
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
      </View>
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
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#E2EBDD',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.large,
    paddingTop: Platform.OS === 'ios' ? 258 : 250,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.xxxLarge,
    padding: isSmallDevice() ? spacing.medium : isTablet() ? spacing.large : spacing.medium,
    paddingBottom: isSmallDevice() ? spacing.large : isTablet() ? spacing.xLarge : spacing.large,
    width: getContainerWidth(0.9),
    alignSelf: 'center',
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: screenDimensions.height * 0.5,
    ...getShadow(10),
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice() ? spacing.medium : spacing.large,
  },
  avatarContainer: {
    marginBottom: spacing.medium,
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
    marginBottom: spacing.tiny,
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
    marginBottom: spacing.medium,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.small,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
    paddingVertical: spacing.tiny,
    paddingHorizontal: spacing.medium,
    backgroundColor: '#F8F9FA',
    borderRadius: borderRadius.large,
    minHeight: isSmallDevice() ? 45 : 50,
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