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
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import AdminCredentialsModal from "../components/AdminCredentialsModal"
import { AdminService } from "../services/adminService"
import { useTheme } from "../contexts/ThemeContext"
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
      backgroundColor: isDarkMode ? "#121212" : "#F8F9FA",
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
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
    },
    settingButton: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
    }
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={isDarkMode ? ["#2E2E2E", "#1A1A1A", "#0D0D0D"] : ["#4CAF50", "#2E7D32", "#1B5E20"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImage}>
                <Text style={styles.profileInitial}>A</Text>
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.profileName}>Administrator</Text>
            <Text style={styles.profileRole}>Super Admin</Text>
            <Text style={styles.profileEmail}>{adminEmail}</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            <View style={[styles.accountRow, dynamicStyles.accountRow]}>
              <View style={styles.accountLabel}>
                <Ionicons name="person" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Full Name</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>Administrator</Text>
            </View>
            <View style={[styles.accountRow, dynamicStyles.accountRow]}>
              <View style={styles.accountLabel}>
                <Ionicons name="mail" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Email</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>{adminEmail}</Text>
            </View>
            <View style={[styles.accountRow, dynamicStyles.accountRow]}>
              <View style={styles.accountLabel}>
                <Ionicons name="shield" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Role</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>Super Administrator</Text>
            </View>
            <View style={[styles.accountRow, dynamicStyles.accountRow]}>
              <View style={styles.accountLabel}>
                <Ionicons name="calendar" size={20} color="#4CAF50" />
                <Text style={[styles.accountLabelText, dynamicStyles.accountLabelText]}>Member Since</Text>
              </View>
              <Text style={[styles.accountValue, dynamicStyles.accountValue]}>January 2024</Text>
            </View>
            <View style={[styles.accountRow, dynamicStyles.accountRow]}>
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
            <View style={[styles.settingItem, dynamicStyles.settingItem]}>
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
      </ScrollView>

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
    backgroundColor: "#F8F9FA",
  },
  header: {
    height: 200,
    marginBottom: spacing.large,
  },
  headerGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.large,
  },
  headerContent: {
    alignItems: "center",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: spacing.large,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  profileInitial: {
    color: "#FFF",
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    borderWidth: 3,
    borderColor: "#FFF",
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.huge,
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.xxxLarge,
    ...getShadow(4),
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.large,
  },
  profileInfo: {
    flex: 1,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  accountSection: {
    marginBottom: spacing.xxxLarge,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.large,
  },
  accountCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
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
    fontSize: fontSize.medium,
    color: "#666",
    marginLeft: spacing.small,
  },
  accountValue: {
    fontSize: fontSize.medium,
    color: "#333",
    fontWeight: "600",
  },
  settingsSection: {
    marginBottom: spacing.xxxLarge,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
  },
  settingLabel: {
    fontSize: fontSize.medium,
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
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xxxLarge,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: fontSize.large,
    marginLeft: spacing.small,
  },
})
