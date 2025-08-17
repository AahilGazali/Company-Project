"use client"

import { useState } from "react"
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "../firebaseConfig"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useUser } from "../contexts/UserContext"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getContainerWidth, 
  getCardPadding, 
  getShadow,
  getIconSize 
} from "../utils/responsive"

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { setUser } = useUser()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required.")
      return
    }

    setIsLoading(true)
    try {
      const trimmedEmail = email.trim()
      
      // Use Firebase Auth for all users (both self-registered and admin-created)
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password)
      const firebaseUser = userCredential.user
      
      // Get user data from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          
          // Check if user account is deactivated
          if (userData.status === 'Inactive') {
            Alert.alert(
              "Account Deactivated", 
              "Your account has been deactivated. Please contact administrator for assistance.",
              [{ text: "OK" }]
            )
            // Sign out the user since they can't access the app
            await auth.signOut()
            return
          }
          
          // Update lastLogin timestamp
          try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastLogin: serverTimestamp()
            })
          } catch (updateError) {
            console.error('Error updating lastLogin:', updateError)
            // Continue with login even if timestamp update fails
          }
          
          // Store user data in context
          const user = {
            id: firebaseUser.uid,
            fullName: userData.fullName,
            email: userData.email,
            projectName: userData.projectName,
            employeeId: userData.employeeId,
            role: userData.role,
            status: userData.status,
            lastLogin: serverTimestamp(), // Use current timestamp
            createdAt: userData.createdAt,
            isAdminCreated: userData.isAdminCreated
          }
          await setUser(user)
          Alert.alert("Success", `Welcome back, ${user.fullName}!`)
          navigation.replace("Home")
        } else {
          Alert.alert("Error", "User data not found. Please contact administrator.")
        }
      } catch (firestoreError) {
        console.error("Error fetching user data:", firestoreError)
        Alert.alert("Error", "Failed to load user data. Please try again.")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      if (error.code === 'auth/user-not-found') {
        Alert.alert("Error", "No user found with this email address.")
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert("Error", "Incorrect password. Please try again.")
      } else if (error.code === 'auth/user-disabled') {
        Alert.alert("Error", "This account has been disabled. Please contact administrator.")
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert("Error", "Please enter a valid email address.")
      } else {
        Alert.alert("Error", "Login failed. Please check your credentials and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminLogin = () => {
    navigation.navigate("AdminLogin")
  }

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#4CAF50", "#2E7D32", "#1B5E20"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background Blur Effect */}
      <BlurView intensity={20} style={styles.blurContainer}>
        <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Login Card */}
            <View style={styles.loginCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🌱</Text>
                </View>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Quality Management System</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={setEmail}
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                  />
                </View>

                <Pressable style={styles.button} onPress={handleLogin} disabled={isLoading}>
                  <LinearGradient
                    colors={["#4CAF50", "#2E7D32"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Login</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable style={styles.adminButton} onPress={handleAdminLogin}>
                  <LinearGradient
                    colors={["#FF9800", "#F57C00"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>Admin Login</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.link}>
                    Don't have an account? <Text style={styles.linkBold}>Register</Text>
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />
          </ScrollView>
        </KeyboardAvoidingView>
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  blurContainer: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.huge,
  },
  loginCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: borderRadius.xxxLarge,
    padding: getCardPadding(),
    width: getContainerWidth(0.9),
    ...getShadow(10),
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxLarge,
  },
  iconContainer: {
    width: getIconSize(80),
    height: getIconSize(80),
    borderRadius: getIconSize(40),
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.large,
  },
  icon: {
    fontSize: getIconSize(40),
  },
  title: {
    fontSize: fontSize.huge,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.small,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.large,
    color: "#666",
    textAlign: "center",
    lineHeight: spacing.xLarge + 6,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: spacing.large,
  },
  inputLabel: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: spacing.small,
  },
  input: {
    backgroundColor: "#F8F9FA",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: fontSize.large,
    color: "#333",
  },
  button: {
    marginTop: spacing.small,
    marginBottom: spacing.medium,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(6),
  },
  adminButton: {
    marginTop: spacing.small,
    marginBottom: spacing.xxLarge,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(6),
  },
  buttonGradient: {
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xxxLarge,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: fontSize.large,
  },
  link: {
    color: "#666",
    textAlign: "center",
    fontSize: fontSize.medium,
    lineHeight: spacing.large + 4,
  },
  linkBold: {
    fontWeight: "bold",
    color: "#2E7D32",
  },
  // Decorative elements
  decorativeCircle1: {
    position: "absolute",
    top: 100,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: 150,
    right: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decorativeCircle3: {
    position: "absolute",
    top: 200,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
})
