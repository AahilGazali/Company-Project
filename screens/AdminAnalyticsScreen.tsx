import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { db } from "../firebaseConfig"
import { collection, getDocs, query, orderBy, where, onSnapshot } from "firebase/firestore"
import { useTheme } from "../contexts/ThemeContext"
import CustomHeader from "../components/CustomHeader"
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
        console.log('🔍 Raw user data for', doc.id, ':', userData)
        fetchedUsers.push({
          id: doc.id,
          fullName: userData.fullName || "Unknown",
          email: userData.email || "",
          projectName: userData.projectName || "",
          employeeId: userData.employeeId || "",
          role: userData.role || "Employee", // Changed default from "User" to "Employee"
          status: userData.status || "Active",
          lastLogin: userData.lastLogin || null,
          createdAt: userData.createdAt
        })
      })
      console.log('🔍 Processed users:', fetchedUsers.map(u => ({ id: u.id, name: u.fullName, role: u.role })))
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
    
    // Set up real-time listener for users collection
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers: User[] = []
      snapshot.forEach((doc) => {
        const userData = doc.data()
        fetchedUsers.push({
          id: doc.id,
          fullName: userData.fullName || "Unknown",
          email: userData.email || "",
          projectName: userData.projectName || "",
          employeeId: userData.employeeId || "",
          role: userData.role || "Employee",
          status: userData.status || "Active",
          lastLogin: userData.lastLogin || null,
          createdAt: userData.createdAt
        })
      })
      console.log('🔍 Real-time update - Users:', fetchedUsers.map(u => ({ id: u.id, name: u.fullName, role: u.role })))
      setUsers(fetchedUsers)
    }, (error) => {
      console.error("Error in real-time listener:", error)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  // Generate monthly chart data based on user login activity and roles
  const generateChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentYear = new Date().getFullYear()
    const chartData = []

    for (let i = 0; i < 6; i++) {
      const monthIndex = (new Date().getMonth() - 5 + i + 12) % 12
      const month = months[monthIndex]
      
      // Count employees who logged in this month
      const monthEmployees = users.filter(user => {
        if (user.lastLogin && user.role === "Employee") {
          const loginDate = user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)
          return loginDate.getMonth() === monthIndex && loginDate.getFullYear() === currentYear
        }
        return false
      }).length

      // Count managers who logged in this month
      const monthManagers = users.filter(user => {
        if (user.lastLogin && user.role === "Manager") {
          const loginDate = user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)
          return loginDate.getMonth() === monthIndex && loginDate.getFullYear() === currentYear
        }
        return false
      }).length

      chartData.push({
        month,
        employees: monthEmployees,
        managers: monthManagers
      })
    }

    return chartData
  }

  const chartData = generateChartData()
  const maxEmployees = Math.max(...chartData.map(d => d.employees), 1)
  const maxManagers = Math.max(...chartData.map(d => d.managers), 1)

  // Calculate real metrics for employees and managers
  const totalEmployees = users.filter(u => u.role === "Employee").length
  const activeEmployees = users.filter(u => u.role === "Employee" && u.status === "Active").length
  const inactiveEmployees = users.filter(u => u.role === "Employee" && u.status === "Inactive").length
  
  const totalManagers = users.filter(u => u.role === "Manager").length
  const activeManagers = users.filter(u => u.role === "Manager" && u.status === "Active").length
  const inactiveManagers = users.filter(u => u.role === "Manager" && u.status === "Inactive").length

  // Debug logging
  console.log('🔍 Analytics Debug Info:')
  console.log('Total users fetched:', users.length)
  console.log('Users with roles:', users.map(u => ({ id: u.id, name: u.fullName, role: u.role, status: u.status })))
  console.log('Total Employees:', totalEmployees)
  console.log('Total Managers:', totalManagers)
  console.log('Active Employees:', activeEmployees)
  console.log('Active Managers:', activeManagers)

  // Count recent logins (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentEmployeeLogins = users.filter(user => {
    if (user.lastLogin && user.role === "Employee") {
      const loginDate = user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)
      return loginDate >= thirtyDaysAgo
    }
    return false
  }).length

  const recentManagerLogins = users.filter(user => {
    if (user.lastLogin && user.role === "Manager") {
      const loginDate = user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)
      return loginDate >= thirtyDaysAgo
    }
    return false
  }).length

  // For display, show total count if no recent logins, otherwise show recent logins
  const displayEmployeeCount = recentEmployeeLogins > 0 ? recentEmployeeLogins : totalEmployees
  const displayManagerCount = recentManagerLogins > 0 ? recentManagerLogins : totalManagers

  console.log('Recent Employee Logins:', recentEmployeeLogins)
  console.log('Recent Manager Logins:', recentManagerLogins)
  console.log('Display Employee Count:', displayEmployeeCount)
  console.log('Display Manager Count:', displayManagerCount)

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#E2EBDD",
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
      <CustomHeader showLogo={true} isDatabaseScreen={false} isAdmin={true} />
      
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

            {/* Chart Section */}
            <View style={styles.chartSection}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Monthly Login Activity ({new Date().getFullYear()})</Text>
              <View style={[styles.chartContainer, dynamicStyles.chartContainer]}>
                <View style={styles.chartHeader}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
                    <Text style={[styles.legendText, dynamicStyles.legendText]}>Employees</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
                    <Text style={[styles.legendText, dynamicStyles.legendText]}>Managers</Text>
                  </View>
                </View>
                
                <View style={styles.chart}>
                  {chartData.map((data, index) => (
                    <View key={index} style={styles.chartColumn}>
                      <View style={styles.chartBars}>
                        <View style={[styles.bar, { 
                          height: (data.employees / maxEmployees) * 120, 
                          backgroundColor: "#4CAF50" 
                        }]} />
                        <View style={[styles.bar, { 
                          height: (data.managers / maxManagers) * 120, 
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
                    <Ionicons name="people" size={24} color="#4CAF50" />
                    <Text style={[styles.performanceTitle, dynamicStyles.performanceTitle]}>Employee Activity</Text>
                  </View>
                  <Text style={styles.performanceValue}>{displayEmployeeCount}</Text>
                  <Text style={[styles.performanceChange, dynamicStyles.performanceChange]}>
                    {inactiveEmployees > 0 ? `${inactiveEmployees} inactive employees` : "All employees active"}
                  </Text>
                </View>

                <View style={[styles.performanceCard, dynamicStyles.performanceCard]}>
                  <View style={styles.performanceHeader}>
                    <Ionicons name="person" size={24} color="#FF9800" />
                    <Text style={[styles.performanceTitle, dynamicStyles.performanceTitle]}>Manager Activity</Text>
                  </View>
                  <Text style={[styles.performanceValue, { color: "#FF9800" }]}>{displayManagerCount}</Text>
                  <Text style={[styles.performanceChange, dynamicStyles.performanceChange]}>
                    {inactiveManagers > 0 ? `${inactiveManagers} inactive managers` : "All managers active"}
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
    backgroundColor: "#E2EBDD",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 160 : 140,
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
    minHeight: 120,
  },
  performanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.medium,
    flexWrap: 'wrap',
  },
  performanceTitle: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    color: "#333",
    marginLeft: spacing.small,
    flex: 1,
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
    flexWrap: 'wrap',
    flexShrink: 1,
  },
})
