import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  getIconSize
} from "../utils/responsive"

export default function AdminSettingsScreen() {
  const [notifications, setNotifications] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [twoFactor, setTwoFactor] = useState(true)

  const settingsSections = [
    {
      title: "System Settings",
      items: [
        { icon: "notifications", label: "Push Notifications", type: "switch", value: notifications, onValueChange: setNotifications },
        { icon: "cloud-upload", label: "Auto Backup", type: "switch", value: autoBackup, onValueChange: setAutoBackup },
        { icon: "moon", label: "Dark Mode", type: "switch", value: darkMode, onValueChange: setDarkMode },
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={["#4CAF50", "#2E7D32", "#1B5E20"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>System configuration & preferences</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Summary */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>A</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Administrator</Text>
              <Text style={styles.profileEmail}>admin@gmail.com</Text>
              <Text style={styles.profileRole}>Super Admin</Text>
            </View>
            <Pressable style={styles.editButton}>
              <Ionicons name="create" size={20} color="#4CAF50" />
            </Pressable>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <Ionicons name={item.icon as any} size={20} color="#4CAF50" />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.settingRight}>
                    {item.type === "switch" && 'value' in item && 'onValueChange' in item ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onValueChange}
                        trackColor={{ false: "#E0E0E0", true: "#4CAF50" }}
                        thumbColor="#FFF"
                      />
                    ) : (
                      <Pressable style={styles.settingButton}>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
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
          <Text style={styles.sectionTitle}>System Information</Text>
          <View style={styles.systemInfoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Number</Text>
              <Text style={styles.infoValue}>2024.1.15</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>2 days ago</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device</Text>
              <Text style={styles.infoValue}>React Native</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton}>
          <LinearGradient
            colors={["#F44336", "#D32F2F"]}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out" size={20} color="#FFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
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
