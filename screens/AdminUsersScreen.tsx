import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
} from "../utils/responsive"

export default function AdminUsersScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  
  const users = [
    { id: 1, name: "John Doe", email: "john@example.com", role: "User", status: "Active", lastLogin: "2 hours ago" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Manager", status: "Active", lastLogin: "1 day ago" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User", status: "Inactive", lastLogin: "1 week ago" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", role: "Admin", status: "Active", lastLogin: "3 hours ago" },
    { id: 5, name: "Charlie Wilson", email: "charlie@example.com", role: "User", status: "Active", lastLogin: "5 hours ago" },
  ]

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={["#4CAF50", "#2E7D32", "#1B5E20"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>Manage system users and permissions</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          <Pressable style={styles.addButton}>
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
          {filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitial}>{user.name.charAt(0)}</Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.roleBadge, { backgroundColor: user.role === 'Admin' ? '#FF5722' : user.role === 'Manager' ? '#2196F3' : '#4CAF50' }]}>
                      <Text style={styles.roleText}>{user.role}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: user.status === 'Active' ? '#4CAF50' : '#9E9E9E' }]}>
                      <Text style={styles.statusText}>{user.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.userActions}>
                <Text style={styles.lastLogin}>Last: {user.lastLogin}</Text>
                <View style={styles.actionButtons}>
                  <Pressable style={styles.actionButton}>
                    <Ionicons name="create" size={18} color="#2196F3" />
                  </Pressable>
                  <Pressable style={styles.actionButton}>
                    <Ionicons name="trash" size={18} color="#F44336" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.status === 'Active').length}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === 'Admin').length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
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
    gap: spacing.small,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
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
})
