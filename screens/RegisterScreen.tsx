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
  Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "../firebaseConfig"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getContainerWidth, 
  getCardPadding, 
  getShadow,
  getIconSize 
} from "../utils/responsive"

export default function RegisterScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    name: "",
    projectName: "",
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors["name"] = "Name is required"
    }

    // Project Name validation (replaced with Address validation)
    if (!formData.projectName.trim()) {
      newErrors["projectName"] = "Project name is required"
    }

    // Employee ID validation
    if (!formData.employeeId.trim()) {
      newErrors["employeeId"] = "Employee ID is required"
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors["email"] = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      newErrors["email"] = "Please enter a valid email"
    }

    // Password validation
    if (!formData.password) {
      newErrors["password"] = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors["password"] = "Password must be at least 6 characters"
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors["confirmPassword"] = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors["confirmPassword"] = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validateForm()) {
      return
    }

    try {
      const trimmedEmail = formData.email.trim()

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, formData.password)

      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: formData.name,
      })

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: trimmedEmail,
        projectName: formData.projectName,
        employeeId: formData.employeeId,
        createdAt: serverTimestamp(),
      })

      Alert.alert("Success", "Account created successfully!")
      navigation.navigate("Login")
    } catch (error: any) {
      Alert.alert("Error", error.message)
    }
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
            {/* Register Card */}
            <View style={styles.registerCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🌿</Text>
                </View>
                <Text style={styles.title}>Join Our Team</Text>
                <Text style={styles.subtitle}>Create your account to get started</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Full Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder="Enter your full name"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={(value) => handleInputChange("name", value)}
                    value={formData.name}
                    autoCapitalize="words"
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                {/* Project Name (replaces Address) */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Project Name</Text>
                  <TextInput
                    style={[styles.input, errors.projectName && styles.inputError]}
                    placeholder="Enter your project name"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={(value) => handleInputChange("projectName", value)}
                    value={formData.projectName}
                    autoCapitalize="words"
                  />
                  {errors.projectName && <Text style={styles.errorText}>{errors.projectName}</Text>}
                </View>

                {/* Employee ID */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Employee ID</Text>
                  <TextInput
                    style={[styles.input, errors.employeeId && styles.inputError]}
                    placeholder="Enter your employee ID"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={(value) => handleInputChange("employeeId", value)}
                    value={formData.employeeId}
                    autoCapitalize="characters"
                  />
                  {errors.employeeId && <Text style={styles.errorText}>{errors.employeeId}</Text>}
                </View>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Enter your email address"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={(value) => handleInputChange("email", value)}
                    value={formData.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Create Password</Text>
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Create a strong password"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={(value) => handleInputChange("password", value)}
                    value={formData.password}
                    secureTextEntry
                  />
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                    placeholder="Confirm your password"
                    placeholderTextColor="#A5A5A5"
                    onChangeText={(value) => handleInputChange("confirmPassword", value)}
                    value={formData.confirmPassword}
                    secureTextEntry
                  />
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </View>

                <Pressable style={styles.button} onPress={handleRegister}>
                  <LinearGradient
                    colors={["#4CAF50", "#2E7D32"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>Create Account</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.link}>
                    Already have an account? <Text style={styles.linkBold}>Login</Text>
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
  registerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: borderRadius.xxxLarge,
    padding: getCardPadding(),
    width: getContainerWidth(0.9),
    ...getShadow(10),
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 80,
    paddingTop: 16,
  },
  inputError: {
    borderColor: "#F44336",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  link: {
    color: "#666",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
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
