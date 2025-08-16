import React from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getContainerWidth, 
  getCardPadding, 
  getShadow,
  getIconSize 
} from "../utils/responsive"

const { width } = Dimensions.get("window")

export default function AdminDashboardScreen() {
  const statsData = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      icon: "people",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#2E7D32"]
    },
    {
      title: "Active Programs",
      value: "89",
      change: "+5%",
      icon: "list",
      color: "#2196F3",
      gradient: ["#2196F3", "#1976D2"]
    },
    {
      title: "Reports Generated",
      value: "456",
      change: "+23%",
      icon: "document-text",
      color: "#FF9800",
      gradient: ["#FF9800", "#F57C00"]
    },
    {
      title: "System Health",
      value: "98%",
      change: "+2%",
      icon: "checkmark-circle",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#2E7D32"]
    }
  ]

  const quickActions = [
    { title: "Add User", icon: "person-add", color: "#4CAF50" },
    { title: "Generate Report", icon: "document-text", color: "#2196F3" },
    { title: "System Settings", icon: "settings", color: "#FF9800" },
    { title: "View Logs", icon: "list", color: "#9C27B0" }
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
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.adminName}>Administrator</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.notificationBadge}>
                <Ionicons name="notifications" size={24} color="#FFF" />
                <View style={styles.badge} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statsData.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <LinearGradient
                colors={stat.gradient}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon as any} size={24} color="#FFF" />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <View style={styles.statChange}>
                    <Ionicons name="trending-up" size={16} color="#FFF" />
                    <Text style={styles.statChangeText}>{stat.change}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <Pressable key={index} style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#FFF" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="person-add" size={20} color="#4CAF50" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>New user registered: John Doe</Text>
                <Text style={styles.activityTime}>2 minutes ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="document-text" size={20} color="#2196F3" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Monthly report generated</Text>
                <Text style={styles.activityTime}>1 hour ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="settings" size={20} color="#FF9800" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>System settings updated</Text>
                <Text style={styles.activityTime}>3 hours ago</Text>
              </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: fontSize.medium,
    marginBottom: spacing.tiny,
  },
  adminName: {
    color: "#FFF",
    fontSize: fontSize.huge,
    fontWeight: "bold",
  },
  headerRight: {
    alignItems: "center",
  },
  notificationBadge: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5722",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.huge,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.xxxLarge,
  },
  statCard: {
    width: (width - spacing.large * 3) / 2,
    marginBottom: spacing.large,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(8),
  },
  statGradient: {
    padding: spacing.large,
  },
  statContent: {
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.medium,
  },
  statValue: {
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: spacing.tiny,
  },
  statTitle: {
    fontSize: fontSize.small,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: spacing.small,
  },
  statChange: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.medium,
  },
  statChangeText: {
    color: "#FFF",
    fontSize: fontSize.tiny,
    fontWeight: "600",
    marginLeft: spacing.tiny,
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
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: (width - spacing.large * 3) / 2,
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    alignItems: "center",
    marginBottom: spacing.large,
    ...getShadow(4),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.medium,
  },
  actionTitle: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  activityCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    ...getShadow(4),
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.large,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: fontSize.medium,
    color: "#333",
    marginBottom: spacing.tiny,
  },
  activityTime: {
    fontSize: fontSize.small,
    color: "#666",
  },
})
