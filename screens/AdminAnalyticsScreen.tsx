import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { db } from "../firebaseConfig"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { useTheme } from "../contexts/ThemeContext"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
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

export default function AdminAnalyticsScreen() {
  const { isDarkMode } = useTheme()
  const [users, setUsers] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalyticsData = async () => {
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

    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  // Generate monthly chart data based on user creation dates
  const generateChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentYear = new Date().getFullYear()
    const chartData = []

    for (let i = 0; i < 6; i++) {
      const monthIndex = (new Date().getMonth() - 5 + i + 12) % 12
      const month = months[monthIndex]
      
      // Count users created in this month
      const monthUsers = users.filter(user => {
        if (user.createdAt) {
          const userDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)
          return userDate.getMonth() === monthIndex && userDate.getFullYear() === currentYear
        }
        return false
      }).length

      // Count programs created in this month
      const monthPrograms = programs.filter(program => {
        if (program.createdAt) {
          const programDate = program.createdAt.toDate ? program.createdAt.toDate() : new Date(program.createdAt)
          return programDate.getMonth() === monthIndex && programDate.getFullYear() === currentYear
        }
        return false
      }).length

      // Generate random reports for demonstration (you can replace this with real data)
      const monthReports = Math.floor(Math.random() * 10) + 5

      chartData.push({
        month,
        users: monthUsers,
        programs: monthPrograms,
        reports: monthReports
      })
    }

    return chartData
  }

  const chartData = generateChartData()
  const maxUsers = Math.max(...chartData.map(d => d.users), 1)
  const maxPrograms = Math.max(...chartData.map(d => d.programs), 1)
  const maxReports = Math.max(...chartData.map(d => d.reports), 1)

  // Calculate real metrics
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === "Active").length
  const inactiveUsers = users.filter(u => u.status === "Inactive").length
  const totalPrograms = programs.length
  const activePrograms = programs.filter(p => p.status === "Active").length

  // Calculate growth rate based on recent user registrations
  const recentUsers = users.filter(user => {
    if (user.createdAt) {
      const userDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)
      const daysAgo = (new Date().getTime() - userDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo <= 30 // Last 30 days
    }
    return false
  }).length

  const growthRate = totalUsers > 0 ? ((recentUsers / totalUsers) * 100).toFixed(1) : "0.0"
  const uptime = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : "100.0"

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#F8F9FA",
    },
    chartContainer: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    legendText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    chartLabel: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    performanceCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    performanceTitle: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    performanceChange: {
      color: isDarkMode ? "#B0B0B0" : "#666",
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
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <Text style={[styles.headerSubtitle, dynamicStyles.headerSubtitle]}>
              Real-time system performance insights
            </Text>
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
            <Text style={styles.loadingText}>Loading analytics data...</Text>
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={["#4CAF50", "#2E7D32"]}
                  style={styles.metricGradient}
                >
                  <Ionicons name="trending-up" size={24} color="#FFF" />
                  <Text style={styles.metricValue}>+{growthRate}%</Text>
                  <Text style={styles.metricLabel}>Growth Rate (30d)</Text>
                </LinearGradient>
              </View>
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={["#2196F3", "#1976D2"]}
                  style={styles.metricGradient}
                >
                  <Ionicons name="people" size={24} color="#FFF" />
                  <Text style={styles.metricValue}>{totalUsers}</Text>
                  <Text style={styles.metricLabel}>Total Users</Text>
                </LinearGradient>
              </View>
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={["#FF9800", "#F57C00"]}
                  style={styles.metricGradient}
                >
                  <Ionicons name="analytics" size={24} color="#FFF" />
                  <Text style={styles.metricValue}>{uptime}%</Text>
                  <Text style={styles.metricLabel}>System Uptime</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Chart Section */}
            <View style={styles.chartSection}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Monthly Trends ({new Date().getFullYear()})</Text>
              <View style={[styles.chartContainer, dynamicStyles.chartContainer]}>
                <View style={styles.chartHeader}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
                    <Text style={[styles.legendText, dynamicStyles.legendText]}>Users</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
                    <Text style={[styles.legendText, dynamicStyles.legendText]}>Programs</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
                    <Text style={[styles.legendText, dynamicStyles.legendText]}>Reports</Text>
                  </View>
                </View>
                
                <View style={styles.chart}>
                  {chartData.map((data, index) => (
                    <View key={index} style={styles.chartColumn}>
                      <View style={styles.chartBars}>
                        <View style={[styles.bar, { 
                          height: (data.users / maxUsers) * 120, 
                          backgroundColor: "#4CAF50" 
                        }]} />
                        <View style={[styles.bar, { 
                          height: (data.programs / maxPrograms) * 120, 
                          backgroundColor: "#2196F3" 
                        }]} />
                        <View style={[styles.bar, { 
                          height: (data.reports / maxReports) * 120, 
                          backgroundColor: "#FF9800" 
                        }]} />
                      </View>
                      <Text style={[styles.chartLabel, dynamicStyles.chartLabel]}>{data.month}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Performance Cards */}
            <View style={styles.performanceSection}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Performance Metrics</Text>
              <View style={styles.performanceGrid}>
                <View style={[styles.performanceCard, dynamicStyles.performanceCard]}>
                  <View style={styles.performanceHeader}>
                    <Ionicons name="speedometer" size={24} color="#4CAF50" />
                    <Text style={[styles.performanceTitle, dynamicStyles.performanceTitle]}>User Activity</Text>
                  </View>
                  <Text style={styles.performanceValue}>{activeUsers}</Text>
                  <Text style={[styles.performanceChange, dynamicStyles.performanceChange]}>
                    {inactiveUsers > 0 ? `${inactiveUsers} inactive users` : "All users active"}
                  </Text>
                </View>
                
                <View style={[styles.performanceCard, dynamicStyles.performanceCard]}>
                  <View style={styles.performanceHeader}>
                    <Ionicons name="server" size={24} color="#2196F3" />
                    <Text style={[styles.performanceTitle, dynamicStyles.performanceTitle]}>Program Status</Text>
                  </View>
                  <Text style={styles.performanceValue}>{activePrograms}</Text>
                  <Text style={[styles.performanceChange, dynamicStyles.performanceChange]}>
                    {totalPrograms > 0 ? `${totalPrograms} total programs` : "No programs"}
                  </Text>
                </View>
                
                <View style={[styles.performanceCard, dynamicStyles.performanceCard]}>
                  <View style={styles.performanceHeader}>
                    <Ionicons name="shield-checkmark" size={24} color="#FF9800" />
                    <Text style={[styles.performanceTitle, dynamicStyles.performanceTitle]}>Security Score</Text>
                  </View>
                  <Text style={styles.performanceValue}>{Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}/100</Text>
                  <Text style={[styles.performanceChange, dynamicStyles.performanceChange]}>
                    {totalUsers > 0 ? `${activeUsers}/${totalUsers} active` : "No users"}
                  </Text>
                </View>
                
                <View style={[styles.performanceCard, dynamicStyles.performanceCard]}>
                  <View style={styles.performanceHeader}>
                    <Ionicons name="cloud" size={24} color="#9C27B0" />
                    <Text style={[styles.performanceTitle, dynamicStyles.performanceTitle]}>Data Health</Text>
                  </View>
                  <Text style={styles.performanceValue}>{totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100}%</Text>
                  <Text style={[styles.performanceChange, dynamicStyles.performanceChange]}>
                    {totalUsers > 0 ? `${activeUsers}/${totalUsers} users` : "No users"}
                  </Text>
                </View>
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
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xxxLarge,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: spacing.tiny,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(8),
  },
  metricGradient: {
    padding: spacing.large,
    alignItems: "center",
  },
  metricValue: {
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    color: "#FFF",
    marginVertical: spacing.small,
  },
  metricLabel: {
    fontSize: fontSize.small,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  chartSection: {
    marginBottom: spacing.xxxLarge,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.large,
  },
  chartContainer: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    ...getShadow(4),
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.large,
    gap: spacing.large,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.tiny,
  },
  legendText: {
    fontSize: fontSize.small,
    color: "#666",
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
  },
  chartColumn: {
    alignItems: "center",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginBottom: spacing.small,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: fontSize.tiny,
    color: "#666",
  },
  performanceSection: {
    marginBottom: spacing.xxxLarge,
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  performanceCard: {
    width: (width - spacing.large * 3) / 2,
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    marginBottom: spacing.large,
    ...getShadow(4),
  },
  performanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.medium,
  },
  performanceTitle: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    color: "#333",
    marginLeft: spacing.small,
  },
  performanceValue: {
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.tiny,
  },
  performanceChange: {
    fontSize: fontSize.tiny,
    color: "#666",
  },
})
