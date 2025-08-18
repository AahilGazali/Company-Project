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
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { db, auth } from "../firebaseConfig"
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { UserAuthService } from "../services/userAuthService"
import { useTheme } from "../contexts/ThemeContext"
import CustomHeader from "../components/CustomHeader"
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
  isAdminCreated?: boolean
  password?: string
}

export default function AdminUsersScreen() {
  const { isDarkMode } = useTheme()
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [addUserModalVisible, setAddUserModalVisible] = useState<boolean>(false)
  const [editUserModalVisible, setEditUserModalVisible] = useState<boolean>(false)
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false)
  const [isEditingUser, setIsEditingUser] = useState<boolean>(false)
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<{
    fullName: string
    projectName: string
    employeeId: string
    email: string
    password: string
    confirmPassword: string
    role: string
    status: string
  }>({
    fullName: "",
    projectName: "",
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "User",
    status: "Active"
  })

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    fullName: string
    projectName: string
    employeeId: string
    email: string
    password: string
    confirmPassword: string
    role: string
    status: string
  }>({
    fullName: "",
    projectName: "",
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "User",
    status: "Active"
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
          createdAt: userData.createdAt,
          isAdminCreated: userData.isAdminCreated || false,
          password: userData.password || ""
        })
      })
      
      setUsers(fetchedUsers)
      
      // Clean up conflicting password fields for all users after they're loaded
      for (const user of fetchedUsers) {
        await cleanupUserPasswordFields(user.id)
      }
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

  // Debug useEffect to log formData changes
  useEffect(() => {
    console.log('formData changed:', formData);
  }, [formData])

  // Debug useEffect to log when modal opens
  useEffect(() => {
    if (addUserModalVisible) {
      console.log('Modal opened - Role:', formData.role, 'Status:', formData.status);
    }
  }, [addUserModalVisible, formData.role, formData.status])

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
      let date: Date | null = null
      
      // Handle Firestore timestamp
      if (lastLogin.toDate && typeof lastLogin.toDate === 'function') {
        date = lastLogin.toDate()
      } 
      // Handle timestamp object with seconds
      else if (lastLogin.seconds && typeof lastLogin.seconds === 'number') {
        date = new Date(lastLogin.seconds * 1000)
      } 
      // Handle regular Date object
      else if (lastLogin instanceof Date) {
        date = lastLogin
      } 
      // Handle string dates
      else if (typeof lastLogin === 'string') {
        date = new Date(lastLogin)
      }
      
      // Validate date
      if (!date || isNaN(date.getTime())) {
        return "Never"
      }
      
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      
      if (diffInMinutes < 1) return "Just now"
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`
      
      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours} hr ago`
      
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      
      // For older dates, show the actual date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
      
    } catch (error) {
      console.error("Error formatting lastLogin:", error, "Value:", lastLogin)
      return "Never"
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
      
      // Create Firebase Auth user first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      )
      
      const firebaseUser = userCredential.user
      
      // Store user data in Firestore (without password)
      const userData = {
        id: firebaseUser.uid, // Use Firebase UID as the document ID
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        projectName: formData.projectName.trim(),
        employeeId: formData.employeeId.trim(),
        role: formData.role,
        status: formData.status,
        lastLogin: null,
        createdAt: serverTimestamp(),
        isAdminCreated: true // Flag to identify admin-created users
      }
      
      // Use the Firebase UID as the document ID
      await setDoc(doc(db, "users", firebaseUser.uid), userData)
      
      // Also store the password in Firestore for the custom auth system
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        password: formData.password,
        lastPasswordChange: serverTimestamp()
      })
      
      Alert.alert("Success", "User added successfully!")
      setAddUserModalVisible(false)
      resetForm()
      fetchUsers() // Refresh the users list
    } catch (error: any) {
      console.error("Error adding user:", error)
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert("Error", "A user with this email already exists.")
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert("Error", "Please enter a valid email address.")
      } else if (error.code === 'auth/weak-password') {
        Alert.alert("Error", "Password is too weak. Please use at least 6 characters.")
      } else {
        Alert.alert("Error", "Failed to add user. Please try again.")
      }
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
        confirmPassword: "",
        role: "User",
        status: "Active"
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
        confirmPassword: "",
        role: "User",
        status: "Active"
      })
    }
  }

  const openAddUserModal = () => {
    try {
      resetForm()
      setAddUserModalVisible(true)
    } catch (error) {
      console.error("Error opening add user modal:", error)
      Alert.alert("Error", "Failed to open add user modal. Please try again.")
    }
  }

  const openEditUserModal = (user: User) => {
    try {
      setEditingUser(user)
      setEditFormData({
        fullName: user.fullName || "",
        projectName: user.projectName || "",
        employeeId: user.employeeId || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
        role: user.role || "User",
        status: user.status || "Active"
      })
      setEditUserModalVisible(true)
    } catch (error) {
      console.error("Error opening edit user modal:", error)
      Alert.alert("Error", "Failed to open edit user modal. Please try again.")
    }
  }

  const handleEditUser = async () => {
    // Validate form data
    if (!editFormData.fullName || !editFormData.email) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }
    
    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }
    
    if (editFormData.password && editFormData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return
    }
    
    if (!editingUser) {
      Alert.alert("Error", "No user selected for editing")
      return
    }
    
    try {
      setIsEditingUser(true)
      
      // Check if email is being changed
      const emailChanged = editFormData.email.trim().toLowerCase() !== editingUser.email.toLowerCase()
      
      // Update user data in Firestore
      const updateData: any = {
        fullName: editFormData.fullName.trim(),
        email: editFormData.email.trim().toLowerCase(),
        projectName: editFormData.projectName.trim(),
        employeeId: editFormData.employeeId.trim(),
        role: editFormData.role,
        status: editFormData.status,
      }
      
      // Update Firestore first
      await updateDoc(doc(db, "users", editingUser.id), updateData)
      
      // If password is provided, update it in Firestore
      if (editFormData.password) {
        try {
          // Clean up old password fields and update with new password
          await updateDoc(doc(db, "users", editingUser.id), {
            ...updateData,
            password: editFormData.password, // Store the new password
            passwordUpdatedAt: serverTimestamp(),
            lastPasswordChange: serverTimestamp(),
            // Remove conflicting fields
            newPassword: null,
            passwordUpdateRequired: null
          })
          
          Alert.alert(
            "Success", 
            "User data and password updated successfully! User can now login with new credentials.",
            [{ text: "OK" }]
          )
        } catch (passwordError) {
          console.error("Error updating password:", passwordError)
          Alert.alert(
            "Partial Success", 
            "User data updated, but password change failed. Please try updating the password again.",
            [{ text: "OK" }]
          )
        }
      } else {
        Alert.alert("Success", "User updated successfully!")
      }
      
      setEditUserModalVisible(false)
      resetEditForm()
      fetchUsers() // Refresh the users list
    } catch (error: any) {
      console.error("Error updating user:", error)
      Alert.alert("Error", "Failed to update user. Please try again.")
    } finally {
      setIsEditingUser(false)
    }
  }

  const resetEditForm = () => {
    try {
      setEditFormData({
        fullName: "",
        projectName: "",
        employeeId: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "User",
        status: "Active"
      })
      setEditingUser(null)
    } catch (error) {
      console.error("Error resetting edit form:", error)
      // Fallback reset
      setEditFormData({
        fullName: "",
        projectName: "",
        employeeId: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "User",
        status: "Active"
      })
      setEditingUser(null)
    }
  }

  // Function to clean up conflicting password fields for existing users
  const cleanupUserPasswordFields = async (userId: string) => {
    try {
      // Use deleteField to completely remove the conflicting fields
      const { deleteField } = await import('firebase/firestore')
      await updateDoc(doc(db, "users", userId), {
        newPassword: deleteField(),
        passwordUpdateRequired: deleteField(),
        passwordUpdatedAt: deleteField()
      })
      console.log(`Cleaned up password fields for user: ${userId}`)
    } catch (error) {
      console.error("Error cleaning up password fields:", error)
    }
  }

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? "#121212" : "#E2EBDD",
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
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
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
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
      color: isDarkMode ? "#FFFFFF" : "#333",
      borderColor: isDarkMode ? "#404040" : "#E0E0E0",
    },
    cancelButton: {
      borderColor: isDarkMode ? "#404040" : "#E0E0E0",
    },
    cancelButtonText: {
      color: isDarkMode ? "#B0B0B0" : "#666",
    },
    roleButton: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
      borderColor: isDarkMode ? "#404040" : "#E0E0E0",
    },
    statusButton: {
      backgroundColor: isDarkMode ? "#2D2D2D" : "#E2EBDD",
      borderColor: isDarkMode ? "#404040" : "#E0E0E0",
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
      `Are you sure you want to ${action} this user?${action === "deactivate" ? " They will be immediately signed out if currently logged in." : ""}`,
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
              
              // If deactivating, also sign out the user if they're currently logged in
              if (action === "deactivate") {
                try {
                  // Check if the user being deactivated is currently logged in
                  const currentUser = auth.currentUser
                  if (currentUser && currentUser.uid === userId) {
                    await auth.signOut()
                    Alert.alert(
                      "User Deactivated", 
                      "This user has been deactivated and signed out. They will need to contact an administrator to reactivate their account.",
                      [{ text: "OK" }]
                    )
                  }
                } catch (signOutError) {
                  console.error("Error signing out deactivated user:", signOutError)
                }
              }
              
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
      <CustomHeader showLogo={true} isDatabaseScreen={false} />
      
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
                      <Text style={[styles.userName, dynamicStyles.userName]} numberOfLines={1}>
                        {user.fullName && typeof user.fullName === 'string' ? user.fullName : 'Unknown User'}
                      </Text>
                      <Text style={[styles.userEmail, dynamicStyles.userEmail]} numberOfLines={1}>
                        {user.email && typeof user.email === 'string' ? user.email : 'No email'}
                      </Text>
                      <Text style={[styles.userProject, dynamicStyles.userEmail]} numberOfLines={1}>
                        {user.projectName && typeof user.projectName === 'string' ? user.projectName : 'No project'}
                      </Text>
                      <View style={styles.userMeta}>
                        <View style={[styles.roleBadge, { backgroundColor: user.role === 'Manager' ? '#2196F3' : '#4CAF50' }]}>
                          <Text style={styles.roleText}>{user.role || 'User'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: user.status === 'Active' ? '#4CAF50' : '#F44336' }]}>
                          <Text style={styles.statusText}>{user.status || 'Active'}</Text>
                        </View>

                      </View>
                    </View>
                  </View>
                  <View style={styles.userActions}>
                    <Text style={[styles.lastLogin, dynamicStyles.lastLogin]}>
                      {formatLastLogin(user.lastLogin)}
                    </Text>
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
                      <Pressable 
                        style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                        onPress={() => openEditUserModal(user)}
                      >
                        <Ionicons name="create" size={18} color="#FFF" />
                      </Pressable>
                      <Pressable style={[styles.actionButton, { backgroundColor: '#F44336' }]} onPress={() => handleDeleteUser(user.id)}>
                        <Ionicons name="trash" size={18} color="#FFF" />
                      </Pressable>
                    </View>
                    {/* Removed problematic actionHint text for cleaner display */}
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
              {Array.isArray(users) ? users.filter(u => u && u.role === 'Manager').length : 0}
            </Text>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Managers</Text>
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

              {/* Role Selection */}
              {/* Role Selection */}
              <View style={styles.formColumn}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Role</Text>
                <View style={styles.enhancedRoleContainer}>
                  {["User", "Manager"].map((role) => (
                    <Pressable
                      key={role}
                      style={[
                        styles.enhancedRoleButton,
                        formData.role === role && styles.enhancedRoleButtonActive,
                        formData.role === role && role === "Manager" && styles.managerRoleActive,
                        formData.role === role && role === "User" && styles.userRoleActive,
                      ]}
                      onPress={() => {
                        try {
                          setFormData({ ...formData, role: role })
                        } catch (error) {
                          console.error("Error updating role:", error)
                        }
                      }}
                    >
                      <View style={styles.roleButtonContent}>
                        <Ionicons
                          name={role === "Manager" ? "people" : "person"}
                          size={20}
                          color={formData.role === role ? "#FFF" : isDarkMode ? "#B0B0B0" : "#666"}
                        />
                        <Text
                          style={[
                            styles.enhancedRoleButtonText,
                            formData.role === role && styles.enhancedRoleButtonTextActive,
                          ]}
                        >
                          {role}
                        </Text>
                      </View>
                      {formData.role === role && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Status Selection */}
              <View style={styles.formColumn}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Status</Text>
                <View style={styles.enhancedStatusContainer}>
                  {["Active", "Inactive"].map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.enhancedStatusButton,
                        formData.status === status && styles.enhancedStatusButtonActive,
                        formData.status === status && status === "Active" && styles.activeStatusActive,
                        formData.status === status && status === "Inactive" && styles.inactiveStatusActive,
                      ]}
                      onPress={() => {
                        try {
                          setFormData({ ...formData, status: status })
                        } catch (error) {
                          console.error("Error updating status:", error)
                        }
                      }}
                    >
                      <View style={styles.statusButtonContent}>
                        <View
                          style={[
                            styles.statusIndicatorDot,
                            { backgroundColor: status === "Active" ? "#4CAF50" : "#F44336" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.enhancedStatusButtonText,
                            formData.status === status && styles.enhancedStatusButtonTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </View>
                      {formData.status === status && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.enhancedModalButtons}>
                <Pressable
                  style={[styles.enhancedCancelButton, { borderColor: isDarkMode ? "#404040" : "#E0E0E0" }]}
                  onPress={() => setAddUserModalVisible(false)}
                >
                  <Ionicons name="close-circle-outline" size={20} color={isDarkMode ? "#B0B0B0" : "#666"} />
                  <Text style={[styles.enhancedCancelButtonText, { color: isDarkMode ? "#B0B0B0" : "#666" }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable style={styles.enhancedAddButton} onPress={handleAddUser} disabled={isAddingUser}>
                  <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.enhancedAddButtonGradient}>
                    {isAddingUser ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={20} color="#FFF" />
                        <Text style={styles.enhancedAddButtonText}>Add User</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={editUserModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <LinearGradient
              colors={dynamicStyles.modalHeaderColors}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Edit User</Text>
              <Pressable 
                style={styles.closeButton} 
                onPress={() => setEditUserModalVisible(false)}
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
                    value={editFormData.fullName || ""}
                    onChangeText={(text) => setEditFormData({...editFormData, fullName: text || ""})}
                    placeholder="Enter full name"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Project Name</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={editFormData.projectName || ""}
                    onChangeText={(text) => setEditFormData({...editFormData, projectName: text || ""})}
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
                    value={editFormData.employeeId || ""}
                    onChangeText={(text) => setEditFormData({...editFormData, employeeId: text || ""})}
                    placeholder="Enter employee ID"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Email</Text>
                    <TextInput
                      style={[styles.modalInput, dynamicStyles.modalInput]}
                      value={editFormData.email || ""}
                      onChangeText={(text) => setEditFormData({...editFormData, email: text || ""})}
                      placeholder="Enter email"
                      placeholderTextColor={isDarkMode ? "#666" : "#999"}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>New Password (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={editFormData.password || ""}
                    onChangeText={(text) => setEditFormData({...editFormData, password: text || ""})}
                    placeholder="Leave blank to keep current password"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                    secureTextEntry
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Confirm New Password</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={editFormData.confirmPassword || ""}
                    onChangeText={(text) => setEditFormData({...editFormData, confirmPassword: text || ""})}
                    placeholder="Confirm new password"
                    placeholderTextColor={isDarkMode ? "#666" : "#999"}
                    secureTextEntry
                  />
                </View>
              </View>
              
              {/* Password change note */}
              {editFormData.password && (
                <View style={styles.passwordNote}>
                  <Text style={[styles.passwordNoteText, { color: isDarkMode ? "#FF9800" : "#F57C00" }]}>
                    Note: Password changes are applied immediately
                  </Text>
                </View>
              )}

              {/* Role Selection */}
              <View style={styles.formColumn}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Role</Text>
                <View style={styles.enhancedRoleContainer}>
                  {["User", "Manager"].map((role) => (
                    <Pressable
                      key={role}
                      style={[
                        styles.enhancedRoleButton,
                        editFormData.role === role && styles.enhancedRoleButtonActive,
                        editFormData.role === role && role === "Manager" && styles.managerRoleActive,
                        editFormData.role === role && role === "User" && styles.userRoleActive,
                      ]}
                      onPress={() => {
                        try {
                          setEditFormData({ ...editFormData, role: role })
                        } catch (error) {
                          console.error("Error updating role:", error)
                        }
                      }}
                    >
                      <View style={styles.roleButtonContent}>
                        <Ionicons
                          name={role === "Manager" ? "people" : "person"}
                          size={20}
                          color={editFormData.role === role ? "#FFF" : isDarkMode ? "#B0B0B0" : "#666"}
                        />
                        <Text
                          style={[
                            styles.enhancedRoleButtonText,
                            editFormData.role === role && styles.enhancedRoleButtonTextActive,
                          ]}
                        >
                          {role}
                        </Text>
                      </View>
                      {editFormData.role === role && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Status Selection */}
              <View style={styles.formColumn}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Status</Text>
                <View style={styles.enhancedStatusContainer}>
                  {["Active", "Inactive"].map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.enhancedStatusButton,
                        editFormData.status === status && styles.enhancedStatusButtonActive,
                        editFormData.status === status && status === "Active" && styles.activeStatusActive,
                        editFormData.status === status && status === "Inactive" && styles.inactiveStatusActive,
                      ]}
                      onPress={() => {
                        try {
                          setEditFormData({ ...editFormData, status: status })
                        } catch (error) {
                          console.error("Error updating status:", error)
                        }
                      }}
                    >
                      <View style={styles.statusButtonContent}>
                        <View
                          style={[
                            styles.statusIndicatorDot,
                            { backgroundColor: status === "Active" ? "#4CAF50" : "#F44336" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.enhancedStatusButtonText,
                            editFormData.status === status && styles.enhancedStatusButtonTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </View>
                      {editFormData.status === status && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
              
              {/* Cleanup button for existing users with conflicting fields */}
              <View style={styles.cleanupSection}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Database Cleanup</Text>
                <Pressable 
                  style={styles.cleanupButton}
                  onPress={async () => {
                    if (editingUser) {
                      try {
                        await cleanupUserPasswordFields(editingUser.id)
                        Alert.alert("Cleanup", "Conflicting password fields have been cleaned up.")
                        // Refresh the user data after cleanup
                        await fetchUsers()
                      } catch (error) {
                        Alert.alert("Error", "Failed to clean up password fields.")
                      }
                    }
                  }}
                >
                  <Text style={styles.cleanupButtonText}>Clean Password Fields</Text>
                </Pressable>
              </View>

              <View style={styles.enhancedModalButtons}>
                <Pressable
                  style={[styles.enhancedCancelButton, { borderColor: isDarkMode ? "#404040" : "#E0E0E0" }]}
                  onPress={() => setEditUserModalVisible(false)}
                >
                  <Ionicons name="close-circle-outline" size={20} color={isDarkMode ? "#B0B0B0" : "#666"} />
                  <Text style={[styles.enhancedCancelButtonText, { color: isDarkMode ? "#B0B0B0" : "#666" }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable style={styles.enhancedAddButton} onPress={handleEditUser} disabled={isEditingUser}>
                  <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.enhancedAddButtonGradient}>
                    {isEditingUser ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="save" size={20} color="#FFF" />
                        <Text style={styles.enhancedAddButtonText}>Save Changes</Text>
                      </>
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
    backgroundColor: "#E2EBDD",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 160 : 140,
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.huge,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: spacing.large,
    gap: spacing.medium,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    minWidth: 200,
    maxWidth: 400,
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
    minWidth: 120,
    maxWidth: 200,
    flexShrink: 0,
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
    width: "100%",
  },
  userCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.medium,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 120,
    width: "100%",
    ...getShadow(4),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: spacing.medium,
    minWidth: 0,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.medium,
    flexShrink: 0,
  },
  userInitial: {
    color: "#FFF",
    fontSize: fontSize.large,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
    minWidth: 0, // Allows text to wrap properly
    flexShrink: 1,
  },
  userName: {
    fontSize: fontSize.large,
    fontWeight: "600",
    color: "#333",
    marginBottom: spacing.tiny,
    flexShrink: 1,
  },
  userEmail: {
    fontSize: fontSize.small,
    color: "#666",
    marginBottom: spacing.small,
    flexShrink: 1,
  },
  userProject: {
    fontSize: fontSize.tiny,
    color: "#888",
    marginBottom: spacing.small,
    flexShrink: 1,
  },
  userMeta: {
    flexDirection: "row",
    gap: spacing.small,
    flexWrap: "wrap",
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.medium,
    flexShrink: 0,
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
    flexShrink: 0,
  },
  statusText: {
    color: "#FFF",
    fontSize: fontSize.tiny,
    fontWeight: "600",
  },
  adminCreatedBadge: {
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.medium,
    flexShrink: 0,
  },
  userActions: {
    alignItems: "flex-end",
    minWidth: 120,
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingTop: spacing.tiny,
  },
  lastLogin: {
    fontSize: fontSize.small,
    color: "#666",
    marginBottom: spacing.small,
    textAlign: "right",
    flexShrink: 0,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.small,
    marginTop: spacing.small,
    flexWrap: "wrap",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    ...getShadow(2),
  },
  // Removed actionHint style - no longer needed
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.medium,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    alignItems: "center",
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
    maxWidth: 600,
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
    flexWrap: 'wrap',
  },
  formColumn: {
    flex: 1,
    minWidth: 200,
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
  editUserButtonText: {
    color: '#FFF',
    fontSize: fontSize.medium,
    fontWeight: 'bold',
  },
  passwordNote: {
    marginTop: spacing.medium,
    padding: spacing.medium,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  passwordNoteText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    textAlign: 'center',
  },
  cleanupSection: {
    marginTop: spacing.large,
    padding: spacing.medium,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  cleanupButton: {
    backgroundColor: '#2196F3',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginTop: spacing.small,
  },
  cleanupButtonText: {
    color: '#FFF',
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  // Role and Status button styles
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    minHeight: 40,
  },
  roleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  roleButtonText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#FFF',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    minHeight: 40,
  },
  statusButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  statusButtonText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#FFF',
  },
  debugText: {
    fontSize: fontSize.small,
    color: '#999',
    marginBottom: spacing.small,
    fontStyle: 'italic',
  },
  // Enhanced Role and Status button styles
  enhancedRoleContainer: {
    flexDirection: "row",
    gap: spacing.small,
    marginBottom: spacing.large,
  },
  enhancedRoleButton: {
    flex: 1,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.small,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    minHeight: 60,
    position: "relative",
    ...getShadow(2),
  },
  enhancedRoleButtonActive: {
    borderWidth: 3,
    ...getShadow(6),
    transform: [{ scale: 1.02 }],
  },
  userRoleActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
  },
  managerRoleActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
    shadowColor: "#2196F3",
  },
  roleButtonContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  enhancedRoleButtonText: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: "#666",
    marginTop: spacing.tiny,
  },
  enhancedRoleButtonTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  selectedIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 2,
  },
  enhancedStatusContainer: {
    flexDirection: "row",
    gap: spacing.small,
    marginBottom: spacing.large,
  },
  enhancedStatusButton: {
    flex: 1,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.small,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    minHeight: 60,
    position: "relative",
    ...getShadow(2),
  },
  enhancedStatusButtonActive: {
    borderWidth: 3,
    ...getShadow(6),
    transform: [{ scale: 1.02 }],
  },
  activeStatusActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
  },
  inactiveStatusActive: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
    shadowColor: "#F44336",
  },
  statusButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.tiny,
  },
  enhancedStatusButtonText: {
    fontSize: fontSize.small,
    fontWeight: "600",
    color: "#666",
  },
  enhancedStatusButtonTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  enhancedModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.medium,
    marginTop: spacing.large,
    paddingTop: spacing.large,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  enhancedCancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    backgroundColor: "transparent",
    gap: spacing.small,
  },
  enhancedCancelButtonText: {
    fontSize: fontSize.medium,
    fontWeight: "600",
  },
  enhancedAddButton: {
    flex: 2,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(4),
  },
  enhancedAddButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
    gap: spacing.small,
  },
  enhancedAddButtonText: {
    color: "#FFF",
    fontSize: fontSize.medium,
    fontWeight: "bold",
  },
})
