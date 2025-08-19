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
import Svg, { Path, G, Defs, LinearGradient as SvgLinearGradient, Stop, Polygon } from "react-native-svg"
import { auth, db } from "../firebaseConfig"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useUser } from "../contexts/UserContext"
import { UserAuthService } from "../services/userAuthService"
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
      
      // Use custom authentication system that reads from Firestore
      const userData = await UserAuthService.authenticateUser({
        email: trimmedEmail,
        password: password
      })
      
      if (userData) {
        // Check if user account is deactivated
        if (userData.status === 'Inactive') {
          Alert.alert(
            "Account Deactivated", 
            "Your account has been deactivated. Please contact administrator for assistance.",
            [{ text: "OK" }]
          )
          return
        }
        
        // Get complete user data to ensure all fields are loaded
        const completeUserData = await UserAuthService.getCompleteUserData(userData.id)
        
        if (completeUserData) {
          // Store complete user data in context
          const user = {
            id: completeUserData.id,
            fullName: completeUserData.fullName,
            email: completeUserData.email,
            projectName: completeUserData.projectName,
            employeeId: completeUserData.employeeId,
            role: completeUserData.role,
            status: completeUserData.status,
            lastLogin: new Date(), // Use current timestamp
            createdAt: completeUserData.createdAt,
            isAdminCreated: completeUserData.isAdminCreated
          }
          await setUser(user)
          Alert.alert("Success", `Welcome back, ${user.fullName}!`)
          navigation.replace("Home")
        } else {
          Alert.alert("Error", "Failed to load complete user data. Please try again.")
        }
      } else {
        Alert.alert("Error", "Invalid email or password. Please try again.")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      if (error.message === "User account is not active") {
        Alert.alert("Error", "Your account has been deactivated. Please contact administrator for assistance.")
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
                  <Svg width={getIconSize(60)} height={getIconSize(70)} viewBox="0 0 200.05 230.07">
                    <Defs>
                      <SvgLinearGradient id="linear-gradient" x1="116.37" y1="-14.98" x2="176.11" y2="78.14" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor="#6dcf75"/>
                        <Stop offset="1" stopColor="#008163"/>
                      </SvgLinearGradient>

                    </Defs>
                    <G>
                      <G>
                        <G>
                          <Polygon fill="url(#linear-gradient)" points="172.82 73.01 172.82 73.02 172.81 73.01 172.82 73.01"/>
                          <G>
                            <Path fill="url(#linear-gradient)" d="M187.5,95.82l11.05-6.37c.93-.54,1.5-1.53,1.5-2.6v-27.83c0-1.07-.57-2.06-1.5-2.6L101.52.4c-.93-.54-2.07-.54-3,0l-24.1,13.91c-.93.54-1.5,1.53-1.5,2.6v12.77c0,1.07-.58,2.06-1.51,2.6l-28.77,16.6c-.93.54-2.07.54-3,0l-11.05-6.37c-.93-.54-2.07-.54-3,0L1.5,56.41c-.93.54-1.5,1.53-1.5,2.6v112.04c0,1.07.57,2.06,1.5,2.6l24.1,13.91c.93.54,2.07.54,3,0l11.06-6.37c.93.54,2.07.54,3,0l28.77,16.61c.93.54,1.5,1.53,1.5,2.6v12.76c0,1.07.57,2.06,1.5,2.6l24.1,13.9c.93.54,2.07.54,3,0l97.02-56.01c.93.54,1.5,1.53,1.5,2.6v-27.83c0-1.07-.57-2.06-1.5-2.6l-11.05-6.38c-.93-.54-1.5-1.53-1.5-2.6v-33.23c0-1.07.57-2.06,1.5-2.6ZM170.4,153.94c0,1.07-.58,2.06-1.5,2.6l-67.38,38.9c-.93.53-2.07.53-3,0l-67.38-38.9c-.92-.54-1.5,1.53-1.5,2.6v-77.8c0,1.07.58-2.06,1.5-2.6l67.38-38.9c.93.53,2.07.53,3,0l67.38,38.9c.92.54,1.5,1.53,1.5,2.6v77.8ZM172.82,73.02h-.01s.01-.01.01-.01h0Z"/>
                            <Polygon fill="url(#linear-gradient)" points="172.82 73.01 172.82 73.02 172.81 73.01 172.82 73.01"/>
                          </G>
                        </G>
                        <Polygon fill="#165b10" points="172.82 73.01 172.82 73.02 172.81 73.01 172.82 73.01"/>
                      </G>
                      <G>
                        <Path fill="url(#linear-gradient)" d="M92.48,102.84v3.89c0,.69-.32,1.33-.86,1.75l-6.27,4.81-6.27-4.82c-.57-.43-.86-1.03-.86-1.75v-3.98l-.49-.52c-.87-.92-1.4-2.11-1.48-3.37l-.14-2.22h-.03c-.44-.15-.82-.3-1.09-.53-.28-.23-.47-.53-.68-1.12-.21-.6-.45-1.49-.62-2.28-.17-.8-.27-1.5-.32-2.11-.05-.61-.04-1.14.11-1.54s.53-.74.8-.82.41-.03.53-.06-.06-.1-.06-.15v-.09s-.06-.06-.08-.1c-1.01-1.33-1.78-3.92-1.99-6.24-.21-2.33.14-4.37.48-6.42.63.4,1.26.78,2.41.17,1.16-.61,2.84-2.25,4.75-3.37,1.92-1.13,4.07-1.76,6.28-1.66,2.22.11,4.5.95,5.8,2.05,1.29,1.12,1.61,2.49,1.92,3.87,1.01-.03,2.02-.06,2.76,1.12.73,1.18,1.17,3.57,1,5.66-.17,2.09-.96,3.9-1.75,4.83-.07.08-.15.15-.21.23l-.02.07c.2,0,.4.05.57.12.39.15.74.4.91.89.16.48.15,1.19.08,1.89s-.16,1.41-.34,2.12c-.17.71-.4,1.42-.61,1.93-.21.5-.4.8-.68,1.03-.27.23-.65.39-1.09.52-.09.02-.17.06-.26.07l-.14,2.16c-.09,1.3-.57,2.39-1.46,3.34l-.58.61ZM76.31,107.57c.53,2.58,1.04,5.16,1.37,7.38.32,2.21.43,4.07.55,5.92.52-1.1,1.04-2.21,1.62-3.03.58-.82,1.22-1.37,1.86-1.92.81,1.27,1.62,2.55,1.85,3.31.22.77-.15,1.03-.57,3.89-.44,2.85-.95,18.05-1.45,23.49h-22.59c-2.32,0-4.15-1.97-3.98-4.29.52-6.89,1.1-17.34,1.92-20.37,1.03-3.78,2.45-5.78,4.68-7.31s7.88-2.61,10.04-3.71c2.17-1.1,3.43-2.23,4.71-3.36ZM95.47,107.57c-.52,2.58-1.04,5.16-1.36,7.38-.32,2.21-.44,4.07-.55,5.92-.53-1.1-1.04-2.21-1.62-3.03s-1.22-1.37-1.85-1.92c-.82,1.27-1.62,2.55-1.85,3.31s.14,1.03.57,3.89c.44,2.85.94,18.05,1.45,23.49h5l-.55-1.18c-1.17-2.52-.07-5.54,2.44-6.72l.63-.29c-.14-1.19-.19-2.39-.15-3.59l-.63-.23c-2.63-.95-3.99-3.86-3.03-6.49l1.58-4.36c.96-2.63,3.86-3.98,6.49-3.03l.65.24c.74-.94,1.55-1.83,2.42-2.64l-.29-.62c-.79-1.69-.56-3.6.44-5.04-1.99-.61-3.98-1.16-5.08-1.71-2.16-1.1-3.43-2.23-4.71-3.36Z"/>
                        <G>
                          <Path fill="url(#linear-gradient)" d="M116.45,115.98c2.66-.66,5.37-.76,7.98-.35l1.15-3.18c.3-.81,1.2-1.24,2.02-.94l4.36,1.58c.82.3,1.24,1.2.94,2.01l-1.16,3.18c2.26,1.36,4.28,3.18,5.89,5.39l3.06-1.43c.78-.36,1.72-.02,2.09.76l1.96,4.2c.37.78.02,1.73-.76,2.09l-3.06,1.42c.65,2.66.75,5.37.34,7.98l3.18,1.16c.82.29,1.24,1.2.95,2.01l-1.59,4.36c-.29.81-1.2,1.23-2.01.94l-3.18-1.16c-1.37,2.26-3.18,4.28-5.39,5.88l1.43,3.06c.37.78.02,1.72-.76,2.08l-4.21,1.96c-.78.36-1.72.02-2.09-.76l-1.43-3.06c-2.65.66-5.36.76-7.97.35l-1.16,3.18c-.3.81-1.2,1.24-2.01.94l-4.36-1.58c-.82-.3-1.24-1.2-.94-2.02l1.16-3.18c-2.26-1.36-4.28-3.18-5.88-5.39l-3.06,1.43c-.78.36-1.72.02-2.09-.76l-1.96-4.2c-.36-.78-.02-1.72.76-2.09l3.06-1.42c-.66-2.66-.76-5.37-.35-7.98l-3.18-1.16c-.82-.29-1.24-1.2-.94-2.01l1.58-4.36c.3-.82,1.2-1.24,2.01-.95l3.18,1.16c1.37-2.26,3.18-4.28,5.39-5.88l-1.42-3.06c-.37-.78-.02-1.72.76-2.09l4.2-1.96c.78-.36,1.72-.02,2.09.76l1.43,3.06ZM120.49,130.64c3.41-.54,6.31,2.36,5.77,5.77-.31,1.97-1.83,3.61-3.77,4.06-3.68.84-6.9-2.38-6.06-6.06.45-1.94,2.09-3.46,4.06-3.77ZM115.06,122.21c7.39-3.45,16.17-.25,19.62,7.14,3.44,7.4.25,16.18-7.14,19.62-7.39,3.45-16.17.25-19.62-7.14-3.44-7.4-.24-16.18,7.14-19.62Z"/>
                          <Path fill="url(#linear-gradient)" d="M118.9,81.08h4.81l.91,4.63c1.24.43,2.38,1.09,3.35,1.93l4.47-1.52,1.2,2.08,1.2,2.09-3.55,3.11c.12.62.19,1.27.19,1.93s-.06,1.3-.19,1.93l3.55,3.11-1.2,2.08-1.2,2.09-4.47-1.52c-.97.84-2.1,1.5-3.35,1.93l-.91,4.63h-4.81l-.92-4.63c-1.24-.43-2.37-1.09-3.35-1.93l-4.47,1.52-1.2-2.09-1.2-2.08,3.55-3.11c-.12-.63-.19-1.27-.19-1.93s.06-1.31.19-1.93l-3.55-3.11,1.2-2.09,1.2-2.08,4.47,1.52c.98-.84,2.11-1.5,3.35-1.93l.92-4.63ZM119.97,90.58c3.74-.99,7.07,2.34,6.08,6.08-.44,1.64,1.76,2.97-3.41,3.41-3.74.99-7.07-2.34-6.08-6.08.44-1.64,1.76-2.97,3.41-3.41Z"/>
                        </G>
                      </G>
                    </G>
                  </Svg>
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
                    colors={["#71A7C8", "#3A948C", "#23716B"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>Admin Login</Text>
                  </LinearGradient>
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
