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
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getContainerWidth, 
  getCardPadding, 
  getShadow,
  getIconSize 
} from "../utils/responsive"



export default function AdminLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleAdminLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Admin email and password are required.")
      return
    }

    const trimmedEmail = email.trim()
    
    // Check if it's admin login
    if (trimmedEmail === "admin@gmail.com" && password === "123456") {
      Alert.alert("Success", "Admin login successful!")
      navigation.replace("AdminHome")
    } else {
      Alert.alert("Error", "Invalid admin credentials. Please use admin@gmail.com and password 123456")
    }
  }

  return (
    <View style={styles.container}>
      {/* Orange Background */}
      <LinearGradient
        colors={["#FF9800", "#F57C00", "#E65100"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background Pattern */}
      <View style={styles.patternCircle1} />
      <View style={styles.patternCircle2} />

      {/* Background Blur Effect */}
      <BlurView intensity={20} style={styles.blurContainer}>
        <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Admin Login Card */}
            <View style={styles.loginCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.crownContainer}>
                  <Text style={styles.crownIcon}>👑</Text>
                </View>
                <Text style={styles.title}>Admin Access</Text>
                <Text style={styles.subtitle}>Administrative Control Panel</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Admin Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter admin email"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={setEmail}
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Admin Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter admin password"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                  />
                </View>

                <Pressable style={styles.button} onPress={handleAdminLogin}>
                  <LinearGradient
                    colors={["#FF9800", "#F57C00"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>Admin Login</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => navigation.goBack()}>
                  <Text style={styles.link}>
                    ← Back to Regular Login
                  </Text>
                </Pressable>
              </View>
            </View>
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
  patternCircle1: {
    position: "absolute",
    top: -50,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  patternCircle2: {
    position: "absolute",
    bottom: -30,
    right: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
  crownContainer: {
    width: getIconSize(80),
    height: getIconSize(80),
    borderRadius: getIconSize(40),
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.large,
    borderWidth: 3,
    borderColor: "#FFA000",
  },
  crownIcon: {
    fontSize: getIconSize(40),
  },
  title: {
    fontSize: fontSize.huge,
    fontWeight: "bold",
    color: "#FF9800",
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
    color: "#FF9800",
    marginBottom: spacing.small,
  },
  input: {
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: fontSize.large,
    color: "#333",
  },
  button: {
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
    color: "#FF9800",
    textAlign: "center",
    fontSize: fontSize.medium,
    lineHeight: spacing.large + 4,
    fontWeight: "600",
  },
})

