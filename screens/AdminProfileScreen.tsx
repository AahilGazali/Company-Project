import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { AdminService } from "../services/adminService"
import { useTheme } from "../contexts/ThemeContext"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
} from "../utils/responsive"

const { width } = Dimensions.get("window")

export default function AdminProfileScreen() {
  const { isDarkMode } = useTheme()
  const [adminEmail, setAdminEmail] = useState("admin@gmail.com")

  useEffect(() => {
    loadAdminCredentials()
  }, [])

  const loadAdminCredentials = async () => {
    try {
      const credentials = await AdminService.getAdminCredentials()
      if (credentials) {
        setAdminEmail(credentials.email)
      }
    } catch (error) {
      console.error("Error loading admin credentials:", error)
    }
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
  quickActionsSection: {
    marginBottom: spacing.xxxLarge,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.large,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: (width - spacing.large * 3) / 2,
    marginBottom: spacing.large,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(4),
  },
  actionGradient: {
    padding: spacing.large,
    alignItems: "center",
    justifyContent: "center",
    height: 100,
  },
  actionText: {
    color: "#FFF",
    fontWeight: "600",
    marginTop: spacing.small,
    textAlign: "center",
  },
  statsSection: {
    marginBottom: spacing.xxxLarge,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: (width - spacing.large * 3) / 2,
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    alignItems: "center",
    marginBottom: spacing.large,
    ...getShadow(4),
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.medium,
  },
  statValue: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#333",
    marginBottom: spacing.tiny,
  },
  statLabel: {
    fontSize: fontSize.small,
    color: "#666",
    textAlign: "center",
  },
  activitiesSection: {
    marginBottom: spacing.xxxLarge,
  },
  activitiesList: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(4),
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.large,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    color: "#333",
    marginBottom: spacing.tiny,
  },
  activityDescription: {
    fontSize: fontSize.small,
    color: "#666",
    marginBottom: spacing.tiny,
  },
  activityTime: {
    fontSize: fontSize.tiny,
    color: "#999",
  },
  activityButton: {
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
})
