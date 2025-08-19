import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Dimensions,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import AdminCredentialsModal from "../components/AdminCredentialsModal"
import { AdminService } from "../services/adminService"
import { useTheme } from "../contexts/ThemeContext"
import CustomHeader from "../components/CustomHeader"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
} from "../utils/responsive"

const { width } = Dimensions.get("window")

type RootStackParamList = {
  Login: undefined
  Register: undefined
  Home: undefined
  AdminLogin: undefined
  AdminHome: undefined
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function AdminProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { isDarkMode, setDarkMode } = useTheme()
  const [adminEmail, setAdminEmail] = useState("admin@gmail.com")
  const [adminPassword, setAdminPassword] = useState("••••••")
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false)

  useEffect(() => {
    loadAdminCredentials()
  }, [])

  const loadAdminCredentials = async () => {
    try {
      const credentials = await AdminService.getAdminCredentials()
      if (credentials) {
        setAdminEmail(credentials.email)
        setAdminPassword("••••••")
      }
    } catch (error) {
      console.error("Error loading admin credentials:", error)
    }
  }

  const handleCredentialsUpdated = () => {
    loadAdminCredentials()
    // Navigate back to login screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'AdminLogin' }],
    })
  }

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'AdminLogin' }],
            })
          }
        }
      ]
    )
  }

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#E2EBDD",
    },
    accountCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    accountRow: {
      borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0",
    },
    accountLabelText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    accountValue: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    sectionTitle: {
      color: isDarkMode ? "#81C784" : "#2E7D32",
    },
    profileCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    profileName: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    profileEmail: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    settingItem: {
      borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0",
    },
    settingLabel: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    settingIcon: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
    },
    settingButton: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
    }
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <CustomHeader showLogo={true} isDatabaseScreen={false} isAdmin={true} />
      
      <View style={styles.contentContainer}>
        {/* Profile Summary */}
        <View style={[styles.profileCard, dynamicStyles.profileCard]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>A</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, dynamicStyles.profileName]}>Administrator</Text>
              <Text style={[styles.profileEmail, dynamicStyles.profileEmail]}>{adminEmail}</Text>
              <Text style={styles.profileRole}>Super Admin</Text>
            </View>
            <Pressable 
              style={[styles.editButton, { backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA" }]}
              onPress={() => setCredentialsModalVisible(true)}
            >
              <Ionicons name="create" size={20} color="#4CAF50" />
            </Pressable>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.accountSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Account Details</Text>
          <View style={[styles.accountCard, dynamicStyles.accountCard]}>
            <View style={styles.accountRow}>
              <View style={styles.accountLabel}>
                <Ionicons name="person" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Full Name</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>Administrator</Text>
            </View>
            <View style={styles.accountRow}>
              <View style={styles.accountLabel}>
                <Ionicons name="mail" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Email</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>{adminEmail}</Text>
            </View>
            <View style={styles.accountRow}>
              <View style={styles.accountLabel}>
                <Ionicons name="shield" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Role</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>Super Administrator</Text>
            </View>
            <View style={styles.accountRow}>
              <View style={styles.accountLabel}>
                <Ionicons name="calendar" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Member Since</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>January 2024</Text>
            </View>
            <View style={styles.accountRow}>
              <View style={styles.accountLabel}>
                <Ionicons name="location" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Location</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>Global</Text>
            </View>
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>System Settings</Text>
          <View style={[styles.accountCard, dynamicStyles.accountCard]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, dynamicStyles.settingIcon]}>
                  <Ionicons name="moon" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Dark Mode</Text>
              </View>
              <View style={styles.settingRight}>
                <Switch
                  value={isDarkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ 
                    false: isDarkMode ? "#404040" : "#E0E0E0", 
                    true: "#4CAF50" 
                  }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={["#F44336", "#D32F2F"]}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out" size={20} color="#FFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <AdminCredentialsModal
        visible={credentialsModalVisible}
        onClose={() => setCredentialsModalVisible(false)}
        onCredentialsUpdated={handleCredentialsUpdated}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E2EBDD",
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 160 : 140,
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.huge,
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.medium,
    marginBottom: spacing.large,
    ...getShadow(4),
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
  },
  profileInfo: {
    flex: 1,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  accountSection: {
    marginBottom: spacing.large,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.medium,
  },
  accountCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.medium,
    ...getShadow(4),
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  accountLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountLabelText: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: "#666",
    marginLeft: spacing.small,
  },
  accountValue: {
    fontSize: fontSize.small,
    color: "#333",
    fontWeight: "600",
  },
  settingsSection: {
    marginBottom: spacing.large,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
  },
  settingLabel: {
    fontSize: fontSize.small,
    color: "#333",
    flex: 1,
  },
  settingRight: {
    alignItems: "center",
  },
  logoutButton: {
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(4),
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: fontSize.medium,
    marginLeft: spacing.small,
  },
  profileInitial: {
    color: "#FFF",
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
  },
  profileName: {
    color: "#FFF",
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    marginBottom: spacing.tiny,
  },
  profileRole: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: fontSize.large,
    marginBottom: spacing.tiny,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: fontSize.medium,
  },
})
