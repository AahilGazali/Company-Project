import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  useColorScheme,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import AsyncStorage from "@react-native-async-storage/async-storage"
import AdminCredentialsModal from "../components/AdminCredentialsModal"
import { AdminService } from "../services/adminService"
import { useTheme } from "../contexts/ThemeContext"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  getIconSize
} from "../utils/responsive"

type RootStackParamList = {
  Login: undefined
  Register: undefined
  Home: undefined
  AdminLogin: undefined
  AdminHome: undefined
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function AdminSettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { isDarkMode, setDarkMode } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [twoFactor, setTwoFactor] = useState(true)
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false)
  const [adminEmail, setAdminEmail] = useState("admin@gmail.com")
  const [adminPassword, setAdminPassword] = useState("••••••")

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

  const handleSecurityAction = (action: string) => {
    switch (action) {
      case "Change Password":
        setCredentialsModalVisible(true)
        break
      case "API Keys":
        Alert.alert("Info", "API Keys management coming soon!")
        break
      case "Security Audit":
        Alert.alert("Info", "Security Audit feature coming soon!")
        break
      case "Privacy Policy":
        Alert.alert("Info", "Privacy Policy feature coming soon!")
        break
      default:
        break
    }
  }

  const handleDataAction = (action: string) => {
    switch (action) {
      case "Export Data":
        Alert.alert("Info", "Data export feature coming soon!")
        break
      case "Clear Cache":
        Alert.alert("Info", "Cache cleared successfully!")
        break
      case "Reset Settings":
        Alert.alert("Info", "Settings reset feature coming soon!")
        break
      case "Help & Support":
        Alert.alert("Info", "Help & Support feature coming soon!")
        break
      default:
        break
    }
  }

  const settingsSections = [
    {
      title: "System Settings",
      items: [
        { icon: "notifications", label: "Push Notifications", type: "switch", value: notifications, onValueChange: setNotifications },
        { icon: "cloud-upload", label: "Auto Backup", type: "switch", value: autoBackup, onValueChange: setAutoBackup },
        { icon: "moon", label: "Dark Mode", type: "switch", value: isDarkMode, onValueChange: setDarkMode },
        { icon: "shield-checkmark", label: "Two-Factor Auth", type: "switch", value: twoFactor, onValueChange: setTwoFactor },
      ]
    },
    {
      title: "Security",
      items: [
        { icon: "lock-closed", label: "Change Password", type: "button" },
        { icon: "key", label: "API Keys", type: "button" },
        { icon: "shield", label: "Security Audit", type: "button" },
        { icon: "warning", label: "Privacy Policy", type: "button" },
      ]
    },
    {
      title: "Data Management",
      items: [
        { icon: "download", label: "Export Data", type: "button" },
        { icon: "trash", label: "Clear Cache", type: "button" },
        { icon: "refresh", label: "Reset Settings", type: "button" },
        { icon: "help-circle", label: "Help & Support", type: "button" },
      ]
    }
  ]

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#F8F9FA",
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
    sectionContent: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    settingLabel: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    settingIcon: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
    },
    settingButton: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
    },
    systemInfoCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    infoLabel: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    infoValue: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    sectionTitle: {
      color: isDarkMode ? "#81C784" : "#2E7D32",
    },
    headerSubtitle: {
      color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.8)",
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
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={[styles.headerSubtitle, dynamicStyles.headerSubtitle]}>
              System configuration & preferences
            </Text>
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

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>{section.title}</Text>
            <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={[styles.settingItem, { 
                  borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0" 
                }]}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, dynamicStyles.settingIcon]}>
                      <Ionicons name={item.icon as any} size={20} color="#4CAF50" />
                    </View>
                    <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>{item.label}</Text>
                  </View>
                  <View style={styles.settingRight}>
                    {item.type === "switch" && 'value' in item && 'onValueChange' in item ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onValueChange}
                        trackColor={{ 
                          false: isDarkMode ? "#404040" : "#E0E0E0", 
                          true: "#4CAF50" 
                        }}
                        thumbColor="#FFF"
                      />
                    ) : (
                      <Pressable 
                        style={[styles.settingButton, dynamicStyles.settingButton]}
                        onPress={() => {
                          if (section.title === "Security") {
                            handleSecurityAction(item.label)
                          } else if (section.title === "Data Management") {
                            handleDataAction(item.label)
                          }
                        }}
                      >
                        <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#B0B0B0" : "#999"} />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* System Info */}
        <View style={styles.systemInfoSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>System Information</Text>
          <View style={[styles.systemInfoCard, dynamicStyles.systemInfoCard]}>
            <View style={[styles.infoRow, { borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0" }]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>App Version</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>1.0.0</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0" }]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Build Number</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>2024.1.15</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0" }]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Last Updated</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>2 days ago</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: isDarkMode ? "#2D2D2D" : "#F0F0F0" }]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Device</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>React Native</Text>
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
    height: 120,
    marginBottom: spacing.large,
  },
  headerGradient: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.large,
    paddingHorizontal: spacing.large,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: fontSize.huge,
    fontWeight: "bold",
    marginBottom: spacing.tiny,
  },
  headerSubtitle: {
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
  profileInitial: {
    color: "#FFF",
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#333",
    marginBottom: spacing.tiny,
  },
  profileEmail: {
    fontSize: fontSize.medium,
    color: "#666",
    marginBottom: spacing.tiny,
  },
  profileRole: {
    fontSize: fontSize.small,
    color: "#4CAF50",
    fontWeight: "600",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: spacing.xxxLarge,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.large,
  },
  sectionContent: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(4),
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.large,
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
  settingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  systemInfoSection: {
    marginBottom: spacing.xxxLarge,
  },
  systemInfoCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    ...getShadow(4),
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    fontSize: fontSize.medium,
    color: "#666",
  },
  infoValue: {
    fontSize: fontSize.medium,
    color: "#333",
    fontWeight: "600",
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
