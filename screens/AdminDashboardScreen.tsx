import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import { db } from "../firebaseConfig"
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore"
import { useTheme } from "../contexts/ThemeContext"
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

interface User {
  id: string
  fullName: string
  email: string
  projectName: string
  employeeId: string
  role: string
  status: string
  lastLogin: any
  createdAt: any
}

interface Program {
  id: string
  name: string
  status: string
  createdAt: any
}

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: any
  userFullName?: string
}

export default function AdminDashboardScreen() {
  const { isDarkMode } = useTheme()
  const [users, setUsers] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch users
      const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
      const usersSnapshot = await getDocs(usersQuery)
      const fetchedUsers: User[] = []
      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        fetchedUsers.push({
          id: doc.id,
          fullName: userData.fullName || "Unknown",
          email: userData.email || "",
          projectName: userData.projectName || "",
          employeeId: userData.employeeId || "",
          role: userData.role || "User",
          status: userData.status || "Active",
          lastLogin: userData.lastLogin || null,
          createdAt: userData.createdAt
        })
      })
      setUsers(fetchedUsers)

      // Fetch programs (if programs collection exists)
      try {
        const programsQuery = query(collection(db, "programs"), orderBy("createdAt", "desc"))
        const programsSnapshot = await getDocs(programsQuery)
        const fetchedPrograms: Program[] = []
        programsSnapshot.forEach((doc) => {
          const programData = doc.data()
          fetchedPrograms.push({
            id: doc.id,
            name: programData.name || "Unknown Program",
            status: programData.status || "Active",
            createdAt: programData.createdAt
          })
        })
        setPrograms(fetchedPrograms)
      } catch (error) {
        console.log("Programs collection not found, using default")
        setPrograms([])
      }

      // Generate recent activities from user data
      const activities: RecentActivity[] = []
      
      // Add recent user registrations
      fetchedUsers.slice(0, 5).forEach((user) => {
        if (user.createdAt) {
          activities.push({
            id: `user-${user.id}`,
            type: "user-registration",
            description: `New user registered: ${user.fullName}`,
            timestamp: user.createdAt,
            userFullName: user.fullName
          })
        }
      })

      // Add recent status changes (if any users were recently deactivated/activated)
      fetchedUsers.forEach((user) => {
        if (user.status === "Inactive") {
          activities.push({
            id: `status-${user.id}`,
            type: "status-change",
            description: `User deactivated: ${user.fullName}`,
            timestamp: user.createdAt,
            userFullName: user.fullName
          })
        }
      })

      // Sort activities by timestamp
      activities.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.toDate() - a.timestamp.toDate()
        }
        return 0
      })

      setRecentActivities(activities.slice(0, 5))

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Unknown time"
    
    const now = new Date()
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const statsData = [
    {
      title: "Total Users",
      value: users.length.toString(),
      change: users.filter(u => u.status === "Active").length > 0 ? 
        `+${users.filter(u => u.status === "Active").length} active` : "No active users",
      icon: "people",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#2E7D32"] as const
    },
    {
      title: "Active Programs",
      value: programs.filter(p => p.status === "Active").length.toString(),
      change: programs.length > 0 ? `${programs.length} total` : "No programs",
      icon: "list",
      color: "#2196F3",
      gradient: ["#2196F3", "#1976D2"] as const
    },
    {
      title: "Active Users",
      value: users.filter(u => u.status === "Active").length.toString(),
      change: users.filter(u => u.status === "Inactive").length > 0 ? 
        `${users.filter(u => u.status === "Inactive").length} inactive` : "All users active",
      icon: "checkmark-circle",
      color: "#FF9800",
      gradient: ["#FF9800", "#F57C00"] as const
    },
    {
      title: "System Health",
      value: users.length > 0 ? `${Math.round((users.filter(u => u.status === "Active").length / users.length) * 100)}%` : "100%",
      change: users.length > 0 ? `${users.filter(u => u.status === "Active").length}/${users.length} users` : "No users",
      icon: "shield-checkmark",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#2E7D32"] as const
    }
  ]

  const quickActions = [
    { title: "Generate Report", icon: "document-text", color: "#2196F3" },
    { title: "System Settings", icon: "settings", color: "#FF9800" },
    { title: "View Logs", icon: "list", color: "#9C27B0" }
  ]

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#F8F9FA",
    },
    actionCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    actionTitle: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    activityCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    activityText: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    activityTime: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    activityIcon: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
    },
    sectionTitle: {
      color: isDarkMode ? "#81C784" : "#2E7D32",
    },
    headerSubtitle: {
      color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.8)",
    },
    loadingText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    noActivityText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading dashboard data...</Text>
          </View>
        ) : (
          <>
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
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
                  <Pressable key={index} style={[styles.actionCard, dynamicStyles.actionCard]}>
                    <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                      <Ionicons name={action.icon as any} size={24} color="#FFF" />
                    </View>
                    <Text style={[styles.actionTitle, dynamicStyles.actionTitle]}>{action.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Recent Activity</Text>
              <View style={[styles.activityCard, dynamicStyles.activityCard]}>
                {recentActivities.length === 0 ? (
                  <Text style={[styles.noActivityText, dynamicStyles.noActivityText]}>No recent activity to show.</Text>
                ) : (
                  recentActivities.map((activity, index) => (
                    <View key={activity.id} style={styles.activityItem}>
                      <View style={[styles.activityIcon, dynamicStyles.activityIcon]}>
                        {activity.type === "user-registration" && (
                          <Ionicons name="person-add" size={20} color="#4CAF50" />
                        )}
                        {activity.type === "status-change" && (
                          <Ionicons name="person-remove" size={20} color="#FF5722" />
                        )}
                        {activity.type === "document-text" && (
                          <Ionicons name="document-text" size={20} color="#2196F3" />
                        )}
                        {activity.type === "settings" && (
                          <Ionicons name="settings" size={20} color="#FF9800" />
                        )}
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityText, dynamicStyles.activityText]}>
                          {activity.userFullName ? `${activity.userFullName}: ` : ""}
                          {activity.description}
                        </Text>
                        <Text style={[styles.activityTime, dynamicStyles.activityTime]}>{getTimeAgo(activity.timestamp)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.huge,
  },
  loadingText: {
    marginTop: spacing.medium,
    fontSize: fontSize.medium,
    color: "#666",
  },
  noActivityText: {
    textAlign: "center",
    color: "#666",
    paddingVertical: spacing.large,
    fontSize: fontSize.medium,
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
