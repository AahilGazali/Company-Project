import React, { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import { db } from "../firebaseConfig"
import { collection, getDocs, query, orderBy, limit, where, onSnapshot } from "firebase/firestore"
import { QueryService, QueryWithUser } from "../services/queryService"
import { Alert } from "react-native"
import { useTheme } from "../contexts/ThemeContext"
import CustomHeader from "../components/CustomHeader"
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
  const [employeeQueries, setEmployeeQueries] = useState<QueryWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [greeting, setGreeting] = useState<string>('');
  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Set greeting for admin users
  useEffect(() => {
    setGreeting('HELLO ADMIN!');
  }, []);

  const setupRealTimeListeners = () => {
    try {
      setIsLoading(true)
      
      // Set up real-time listener for users
      const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
      const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const fetchedUsers: User[] = []
        snapshot.forEach((doc) => {
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
      }, (error) => {
        console.error("Error listening to users:", error)
      })

      // Store the unsubscribe function in ref
      unsubscribeRef.current = unsubscribeUsers

      // Fetch programs (if programs collection exists)
      const fetchPrograms = async () => {
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
      }

      // Fetch employee queries
      const fetchQueries = async () => {
        try {
          const queries = await QueryService.getQueriesWithUsers(5);
          console.log('Fetched employee queries:', queries.map(q => ({ 
            id: q.id, 
            userFullName: q.userFullName, 
            query: q.query ? (q.query.substring(0, 30) + '...') : 'No query text'
          })));
          setEmployeeQueries(queries);
        } catch (error) {
          console.error("Error fetching employee queries:", error);
        }
      }

      // Execute async operations
      fetchPrograms();
      fetchQueries();

    } catch (error) {
      console.error("Error setting up real-time listeners:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    // Refresh employee queries
    try {
      const queries = await QueryService.getQueriesWithUsers(5);
      setEmployeeQueries(queries);
    } catch (error) {
      console.error("Error refreshing employee queries:", error);
    }
    setRefreshing(false)
  }

  const handleDeleteQuery = async (queryId: string, userFullName: string, queryText: string) => {
    console.log('Attempting to delete query:', { queryId, userFullName, queryText });
    
    // Validate queryId
    if (!queryId || queryId.trim() === '') {
      console.error('Invalid queryId:', queryId);
      Alert.alert('Error', 'Invalid query ID. Cannot delete.');
      return;
    }
    
    Alert.alert(
      'Delete Query',
      `Are you sure you want to delete this query from ${userFullName}?\n\n"${queryText.substring(0, 50)}${queryText.length > 50 ? '...' : ''}"`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Delete confirmed for queryId:', queryId);
              setDeletingQueryId(queryId);
              
              await QueryService.deleteQuery(queryId);
              console.log('QueryService.deleteQuery completed successfully');
              
              // Remove the query from local state
              setEmployeeQueries(prev => {
                const filtered = prev.filter(query => query.id !== queryId);
                console.log('Updated queries list, removed queryId:', queryId);
                console.log('Remaining queries:', filtered.length);
                return filtered;
              });
              
              Alert.alert('Success', 'Query deleted successfully!');
            } catch (error) {
              console.error('Error deleting query:', error);
              Alert.alert('Error', `Failed to delete query: ${error.message}`);
            } finally {
              setDeletingQueryId(null);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    setupRealTimeListeners();
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [])

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Unknown time"
    
    const now = new Date()
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const statsData = [
    {
      title: "Total Employees",
      value: users.filter(u => u.role === "Employee").length.toString(),
      change: users.filter(u => u.role === "Employee" && u.status === "Active").length > 0 ? 
        `+${users.filter(u => u.role === "Employee" && u.status === "Active").length} active` : "No active employees",
      icon: "people",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#2E7D32"] as const
    },
    {
      title: "Active Employees",
      value: users.filter(u => u.role === "Employee" && u.status === "Active").length.toString(),
      change: users.filter(u => u.role === "Employee" && u.status === "Inactive").length > 0 ? 
        `${users.filter(u => u.role === "Employee" && u.status === "Inactive").length} inactive` : "All employees active",
      icon: "checkmark-circle",
      color: "#4CAF50",
      gradient: ["#4CAF50", "#2E7D32"] as const
    },
    {
      title: "Total Managers",
      value: users.filter(u => u.role === "Manager").length.toString(),
      change: users.filter(u => u.role === "Manager" && u.status === "Active").length > 0 ? 
        `+${users.filter(u => u.role === "Manager" && u.status === "Active").length} active` : "No active managers",
      icon: "person",
      color: "#71A7C8",
      gradient: ["#71A7C8", "#3A948C", "#23716B"] as const
    },
    {
      title: "Active Managers",
      value: users.filter(u => u.role === "Manager" && u.status === "Active").length.toString(),
      change: users.filter(u => u.role === "Manager" && u.status === "Inactive").length > 0 ? 
        `${users.filter(u => u.role === "Manager" && u.status === "Inactive").length} inactive` : "All managers active",
      icon: "person-circle",
      color: "#71A7C8",
      gradient: ["#71A7C8", "#3A948C", "#23716B"] as const
    }
  ]



  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#E2EBDD",
    },
    card: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    cardHeader: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
    },
    cardTitle: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    cardSubtitle: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    cardValue: {
      color: isDarkMode ? "#81C784" : "#2E7D32",
    },
    cardChange: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    activityItem: {
      borderBottomColor: isDarkMode ? "#2D2D2D" : "#E0E0E0",
    },
    activityText: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    activityTime: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    activityCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    activityIcon: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
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
      <CustomHeader showLogo={true} isDatabaseScreen={true} greeting={greeting} isAdmin={true} />

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



            {/* Employees Query Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Employees Query</Text>
              <View style={[styles.activityCard, dynamicStyles.activityCard]}>
                {employeeQueries.length === 0 ? (
                  <Text style={[styles.noActivityText, dynamicStyles.noActivityText]}>No employee queries to show.</Text>
                ) : (
                  employeeQueries
                    .filter(query => query.id && query.id !== 'queries' && query.query) // Filter out invalid queries
                    .map((query, index) => (
                    <View key={query.id} style={styles.activityItem}>
                      <View style={[styles.activityIcon, dynamicStyles.activityIcon]}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#2196F3" />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityText, dynamicStyles.activityText]}>
                          <Text style={{ fontWeight: 'bold', color: isDarkMode ? '#81C784' : '#2E7D32' }}>
                            {query.userFullName || 'Unknown User'}:
                          </Text> {query.query || 'No query text'}
                        </Text>
                        <Text style={[styles.activityTime, dynamicStyles.activityTime]}>
                          {getTimeAgo(query.createdAt)} • {query.status || 'unknown'}
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          styles.deleteButton,
                          deletingQueryId === query.id && styles.deleteButtonDisabled
                        ]}
                        onPress={() => {
                          console.log('Delete button pressed for query:', {
                            id: query.id,
                            userFullName: query.userFullName,
                            query: query.query,
                            index: index
                          });
                          handleDeleteQuery(query.id, query.userFullName || 'Unknown User', query.query || '');
                        }}
                        disabled={deletingQueryId === query.id}
                      >
                        {deletingQueryId === query.id ? (
                          <Ionicons name="refresh" size={16} color="#FFF" style={styles.spinningIcon} />
                        ) : (
                          <Ionicons name="trash" size={16} color="#FFF" />
                        )}
                      </Pressable>
                    </View>
                  ))
                )}
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
    backgroundColor: "#E2EBDD",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 140 : 120,
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
    backgroundColor: "#E2EBDD",
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
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.small,
    ...getShadow(2),
  },
  deleteButtonDisabled: {
    backgroundColor: "#9E9E9E",
  },
  spinningIcon: {
    transform: [{ rotate: '360deg' }],
  },
})


