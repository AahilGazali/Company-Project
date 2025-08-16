import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { db } from "../firebaseConfig"
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { useTheme } from "../contexts/ThemeContext"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
} from "../utils/responsive"

interface User {
  id: string
  fullName: string
  email: string
  projectName: string
  employeeId: string
  role: string
  status: string
  lastLogin: string | null
  createdAt: any
}

export default function AdminUsersScreen() {
  const { isDarkMode } = useTheme()
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [addUserModalVisible, setAddUserModalVisible] = useState<boolean>(false)
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false)
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  
  // Form state
  const [formData, setFormData] = useState<{
    fullName: string
    projectName: string
    employeeId: string
    email: string
    password: string
    confirmPassword: string
  }>({
    fullName: "",
    projectName: "",
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  // Fetch users from Firebase
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(usersQuery)
      const fetchedUsers: User[] = []
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data()
        fetchedUsers.push({
          id: doc.id,
          fullName: userData.fullName || "Unknown",
          email: userData.email || "",
          projectName: userData.projectName || "",
          employeeId: userData.employeeId || "",
          role: userData.role || "User",
          status: userData.status || "Active",
          lastLogin: userData.lastLogin || "Never",
          createdAt: userData.createdAt
        })
      })
      
      setUsers(fetchedUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      Alert.alert("Error", "Failed to fetch users. Please try again.")
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      await fetchUsers()
    } catch (error) {
      console.error("Error refreshing users:", error)
      Alert.alert("Error", "Failed to refresh users. Please try again.")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const loadUsers = async () => {
      try {
        await fetchUsers()
      } catch (error) {
        console.error("Error loading users on mount:", error)
        Alert.alert("Error", "Failed to load users. Please restart the app.")
      }
    }
    
    loadUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase().trim()
    
    if (!searchLower) return true
    
    return (
      (user.fullName && typeof user.fullName === 'string' && user.fullName.toLowerCase().includes(searchLower)) ||
      (user.email && typeof user.email === 'string' && user.email.toLowerCase().includes(searchLower)) ||
      (user.projectName && typeof user.projectName === 'string' && user.projectName.toLowerCase().includes(searchLower)) ||
      (user.employeeId && typeof user.employeeId === 'string' && user.employeeId.toLowerCase().includes(searchLower))
    )
  })

  const formatLastLogin = (lastLogin: any) => {
    if (!lastLogin) return "Never"
    
    try {
      // Handle Firestore timestamp
      if (lastLogin.toDate && typeof lastLogin.toDate === 'function') {
        const date = lastLogin.toDate()
        if (!(date instanceof Date) || isNaN(date.getTime())) {
          return "Invalid date"
        }
        
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        
        if (diffInMinutes < 1) return "Just now"
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
        
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      } 
      // Handle timestamp object with seconds
      else if (lastLogin.seconds && typeof lastLogin.seconds === 'number') {
        const date = new Date(lastLogin.seconds * 1000)
        if (isNaN(date.getTime())) {
          return "Invalid date"
        }
        
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        
        if (diffInMinutes < 1) return "Just now"
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
        
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      } 
      // Handle regular Date object
      else if (lastLogin instanceof Date) {
        if (isNaN(lastLogin.getTime())) {
          return "Invalid date"
        }
        
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60))
        
        if (diffInMinutes < 1) return "Just now"
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
        
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      } 
      // Handle string dates
      else if (typeof lastLogin === 'string') {
        const date = new Date(lastLogin)
        if (isNaN(date.getTime())) {
          return "Invalid date"
        }
        
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        
        if (diffInMinutes < 1) return "Just now"
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
        
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      } 
      else {
        console.warn("Unknown lastLogin format:", lastLogin)
        return "Unknown"
      }
    } catch (error) {
      console.error("Error formatting lastLogin:", error, "Value:", lastLogin)
      return "Error"
    }
  }

  const handleAddUser = async () => {
    // Validate form data
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }
    
    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return
    }
    
    try {
      setIsAddingUser(true)
      
      const userData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        projectName: formData.projectName.trim(),
        employeeId: formData.employeeId.trim(),
        password: formData.password,
        role: "User",
        status: "Active",
        lastLogin: null,
        createdAt: serverTimestamp()
      }
      
      await addDoc(collection(db, "users"), userData)
      
      Alert.alert("Success", "User added successfully!")
      setAddUserModalVisible(false)
      resetForm()
      fetchUsers() // Refresh the users list
    } catch (error) {
      console.error("Error adding user:", error)
      Alert.alert("Error", "Failed to add user. Please try again.")
    } finally {
      setIsAddingUser(false)
    }
  }

  const resetForm = () => {
    try {
      setFormData({
        fullName: "",
        projectName: "",
        employeeId: "",
        email: "",
        password: "",
        confirmPassword: ""
      })
    } catch (error) {
      console.error("Error resetting form:", error)
      // Fallback reset
      setFormData({
        fullName: "",
        projectName: "",
        employeeId: "",
        email: "",
        password: "",
        confirmPassword: ""
      })
    }
  }

  const openAddUserModal = () => {
    try {
      setAddUserModalVisible(true)
      resetForm()
    } catch (error) {
      console.error("Error opening add user modal:", error)
      Alert.alert("Error", "Failed to open add user modal. Please try again.")
    }
  }

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#F8F9FA",
    },
    searchInputContainer: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    searchInput: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    userCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    userName: {
      color: isDarkMode ? "#FFFFFF" : "#333",
    },
    userEmail: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    lastLogin: {
      color: isDarkMode ? "#B0B0B0" : "#999",
    },
    actionButton: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
    },
    statCard: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    statLabel: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    noUsersText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    modalContent: {
      backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
    },
    modalHeaderColors: isDarkMode ? ["#2E2E2E", "#1A1A1A"] as const : ["#4CAF50", "#2E7D32"] as const,
    inputLabel: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    modalInput: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FA",
      color: isDarkMode ? "#FFFFFF" : "#333",
      borderColor: isDarkMode ? "#404040" : "#E0E0E0",
    },
    cancelButton: {
      borderColor: isDarkMode ? "#404040" : "#E0E0E0",
    },
    cancelButtonText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      Alert.alert("Error", "Invalid user ID")
      return
    }
    
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this user? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", userId))
              await fetchUsers() // Refresh the list
            } catch (error) {
              console.error("Error deleting user:", error)
              Alert.alert("Error", "Failed to delete user. Please try again.")
            }
          }
        }
      ]
    )
  }

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    if (!userId || typeof userId !== 'string') {
      Alert.alert("Error", "Invalid user ID")
      return
    }
    
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active"
    const action = currentStatus === "Active" ? "deactivate" : "activate"
    
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action} this user?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: action === "deactivate" ? "Deactivate" : "Activate",
          style: action === "deactivate" ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "users", userId), { status: newStatus })
              await fetchUsers() // Refresh the list
            } catch (error) {
              console.error(`Error ${action}ing user:`, error)
              Alert.alert("Error", `Failed to ${action} user. Please try again.`)
            }
          }
        }
      ]
    )
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
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={[styles.headerSubtitle, { 
              color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.8)" 
            }]}>Manage system users and permissions</Text>
            <Pressable style={styles.refreshButton} onPress={() => {
              try {
                onRefresh()
              } catch (error) {
                console.error("Error refreshing:", error)
                Alert.alert("Error", "Failed to refresh. Please try again.")
              }
            }}>
              <Ionicons name="refresh" size={24} color="#FFF" />
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, dynamicStyles.searchInputContainer]}>
            <Ionicons name="search" size={20} color={isDarkMode ? "#B0B0B0" : "#666"} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, dynamicStyles.searchInput]}
              placeholder="Search users..."
              value={searchQuery || ""}
              onChangeText={(text) => {
                try {
                  setSearchQuery(text || "")
                } catch (error) {
                  console.error("Error updating search query:", error)
                  setSearchQuery("")
                }
              }}
              placeholderTextColor={isDarkMode ? "#666" : "#999"}
            />
          </View>
          <Pressable style={styles.addButton} onPress={() => {
            try {
              openAddUserModal()
            } catch (error) {
              console.error("Error opening add user modal:", error)
              Alert.alert("Error", "Failed to open add user modal. Please try again.")
            }
          }}>
            <LinearGradient
              colors={["#4CAF50", "#2E7D32"]}
              style={styles.addButtonGradient}
            >
              <Ionicons name="person-add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add User</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Users List */}
        <View style={styles.usersContainer}>
          {isLoadingUsers ? (
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: spacing.large }} />
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <Text style={[styles.noUsersText, dynamicStyles.noUsersText]}>
              {searchQuery ? "No users found matching your search." : "No users found."}
            </Text>
          ) : (
            filteredUsers.map((user) => {
              if (!user || !user.id) {
                return null // Skip invalid users
              }
              
              return (
                <View key={user.id} style={[styles.userCard, dynamicStyles.userCard]}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitial}>
                        {user.fullName && typeof user.fullName === 'string' && user.fullName.length > 0 
                          ? user.fullName.charAt(0).toUpperCase() 
                          : '?'}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, dynamicStyles.userName]}>
                        {user.fullName && typeof user.fullName === 'string' ? user.fullName : 'Unknown User'}
                      </Text>
                      <Text style={[styles.userEmail, dynamicStyles.userEmail]}>
                        {user.email && typeof user.email === 'string' ? user.email : 'No email'}
                      </Text>
                      <View style={styles.userMeta}>
                        <View style={[styles.roleBadge, { backgroundColor: user.role === 'Admin' ? '#FF5722' : user.role === 'Manager' ? '#2196F3' : '#4CAF50' }]}>
                          <Text style={styles.roleText}>{user.role || 'User'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: user.status === 'Active' ? '#4CAF50' : '#F44336' }]}>
                          <Text style={styles.statusText}>{user.status || 'Active'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.userActions}>
                    <Text style={[styles.lastLogin, dynamicStyles.lastLogin]}>Last: {formatLastLogin(user.lastLogin)}</Text>
                    <View style={styles.actionButtons}>
                      <Pressable 
                        style={[styles.actionButton, { backgroundColor: user.status === 'Active' ? '#4CAF50' : '#F44336' }]}
                        onPress={() => toggleUserStatus(user.id, user.status)}
                      >
                        <Ionicons 
                          name={user.status === 'Active' ? 'checkmark-circle' : 'close-circle'} 
                          size={18} 
                          color="#FFF" 
                        />
                      </Pressable>
                      <Pressable style={[styles.actionButton, dynamicStyles.actionButton]}>
                        <Ionicons name="create" size={18} color="#2196F3" />
                      </Pressable>
                      <Pressable style={[styles.actionButton, dynamicStyles.actionButton]} onPress={() => handleDeleteUser(user.id)}>
                        <Ionicons name="trash" size={18} color="#F44336" />
                      </Pressable>
                    </View>
                    <Text style={[styles.actionHint, { 
                      color: isDarkMode ? "#666" : "#999",
                      textAlign: "center",
                      marginTop: spacing.tiny,
                      fontSize: fontSize.tiny
                    }]}>
                      {user.status === 'Active' ? 'Click to deactivate' : 'Click to activate'} • Edit • Delete
                    </Text>
                  </View>
                </View>
              )
            }).filter(Boolean) // Remove null entries
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, dynamicStyles.statCard]}>
            <Text style={styles.statNumber}>{Array.isArray(users) ? users.length : 0}</Text>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total Users</Text>
          </View>
          <View style={[styles.statCard, dynamicStyles.statCard]}>
            <Text style={styles.statNumber}>
              {Array.isArray(users) ? users.filter(u => u && u.status === 'Active').length : 0}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Active Users</Text>
          </View>
          <View style={[styles.statCard, dynamicStyles.statCard]}>
            <Text style={styles.statNumber}>
              {Array.isArray(users) ? users.filter(u => u && u.role === 'Admin').length : 0}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Admins</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add User Modal */}
      <Modal
        visible={addUserModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <LinearGradient
              colors={dynamicStyles.modalHeaderColors}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Add New User</Text>
              <Pressable 
                style={styles.closeButton} 
                onPress={() => setAddUserModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </Pressable>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Full Name</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={formData.fullName || ""}
                    onChangeText={(text) => {
                      try {
                        setFormData({...formData, fullName: text || ""})
                      } catch (error) {
                        console.error("Error updating fullName:", error)
                      }
                    }}
                    placeholder="Enter full name"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Project Name</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={formData.projectName || ""}
                    onChangeText={(text) => setFormData({...formData, projectName: text || ""})}
                    placeholder="Enter project name"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Employee ID</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={formData.employeeId || ""}
                    onChangeText={(text) => setFormData({...formData, employeeId: text || ""})}
                    placeholder="Enter employee ID"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Email</Text>
                    <TextInput
                      style={[styles.modalInput, dynamicStyles.modalInput]}
                      value={formData.email || ""}
                      onChangeText={(text) => setFormData({...formData, email: text || ""})}
                      placeholder="Enter email"
                      placeholderTextColor={isDarkMode ? "#666" : "#999"}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Create Password</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={formData.password || ""}
                    onChangeText={(text) => setFormData({...formData, password: text || ""})}
                    placeholder="Enter password"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                    secureTextEntry
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Confirm Password</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={formData.confirmPassword || ""}
                    onChangeText={(text) => setFormData({...formData, confirmPassword: text || ""})}
                    placeholder="Confirm password"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable 
                  style={[styles.cancelButton, dynamicStyles.cancelButton]}
                  onPress={() => {
                    try {
                      setAddUserModalVisible(false)
                    } catch (error) {
                      console.error("Error closing modal:", error)
                      setAddUserModalVisible(false) // Force close
                    }
                  }}
                >
                  <Text style={[styles.cancelButtonText, dynamicStyles.cancelButtonText]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={styles.addUserButton}
                  onPress={() => {
                    try {
                      handleAddUser()
                    } catch (error) {
                      console.error("Error handling add user:", error)
                      Alert.alert("Error", "Failed to add user. Please try again.")
                    }
                  }}
                  disabled={isAddingUser}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#2E7D32']}
                    style={styles.addUserButtonGradient}
                  >
                    {isAddingUser ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.addUserButtonText}>Add User</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    position: "relative",
  },
  refreshButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: spacing.small,
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
  searchContainer: {
    flexDirection: "row",
    marginBottom: spacing.large,
    gap: spacing.medium,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.large,
    ...getShadow(4),
  },
  searchIcon: {
    marginRight: spacing.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.large,
    fontSize: fontSize.medium,
    color: "#333",
  },
  addButton: {
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(4),
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.large,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: spacing.small,
  },
  usersContainer: {
    marginBottom: spacing.xxxLarge,
  },
  userCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.medium,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...getShadow(4),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
  },
  userInitial: {
    color: "#FFF",
    fontSize: fontSize.large,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.large,
    fontWeight: "600",
    color: "#333",
    marginBottom: spacing.tiny,
  },
  userEmail: {
    fontSize: fontSize.small,
    color: "#666",
    marginBottom: spacing.small,
  },
  userMeta: {
    flexDirection: "row",
    gap: spacing.small,
  },
  roleBadge: {
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.medium,
  },
  roleText: {
    color: "#FFF",
    fontSize: fontSize.tiny,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.medium,
  },
  statusText: {
    color: "#FFF",
    fontSize: fontSize.tiny,
    fontWeight: "600",
  },
  userActions: {
    alignItems: "flex-end",
  },
  lastLogin: {
    fontSize: fontSize.tiny,
    color: "#999",
    marginBottom: spacing.small,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.small,
    marginTop: spacing.small,
    marginBottom: spacing.tiny,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  actionHint: {
    fontSize: fontSize.tiny,
    color: "#999",
    marginTop: spacing.tiny,
    textAlign: "right",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    alignItems: "center",
    marginHorizontal: spacing.tiny,
    ...getShadow(4),
  },
  statNumber: {
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.tiny,
  },
  statLabel: {
    fontSize: fontSize.small,
    color: "#666",
    textAlign: "center",
  },
  noUsersText: {
    fontSize: fontSize.medium,
    color: "#666",
    textAlign: "center",
    marginTop: spacing.large,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.large,
    width: '90%',
    maxHeight: '80%',
    ...getShadow(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.large,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: fontSize.large,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.small,
  },
  modalBody: {
    padding: spacing.large,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.medium,
    marginBottom: spacing.large,
  },
  formColumn: {
    flex: 1,
  },
  inputLabel: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: '#666',
    marginBottom: spacing.tiny,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: fontSize.medium,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.medium,
    marginTop: spacing.large,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: fontSize.medium,
    fontWeight: '600',
  },
  addUserButton: {
    flex: 2,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  addUserButtonGradient: {
    padding: spacing.medium,
    alignItems: 'center',
  },
  addUserButtonText: {
    color: '#FFF',
    fontSize: fontSize.medium,
    fontWeight: 'bold',
  },
})
