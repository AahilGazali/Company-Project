import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { View, StyleSheet, Platform, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "../contexts/ThemeContext"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  getSafeAreaPadding,
  getIconSize,
  isTablet
} from "../utils/responsive"
import { Ionicons } from "@expo/vector-icons"
import CustomHeader from "../components/CustomHeader"
import AdminDashboardScreen from "./AdminDashboardScreen"
import AdminUsersScreen from "./AdminUsersScreen"
import AdminAnalyticsScreen from "./AdminAnalyticsScreen"
import AdminProfileScreen from "./AdminProfileScreen"

const Tab = createBottomTabNavigator()

// Custom Tab Bar Icon Component
const TabBarIcon = ({ 
  name, 
  color, 
  size, 
  focused 
}: {
  name: string
  color: string
  size: number
  focused: boolean
}) => {
  const { isDarkMode } = useTheme()
  const scaleValue = React.useRef(new Animated.Value(focused ? 1.2 : 1)).current
  const translateY = React.useRef(new Animated.Value(focused ? -8 : 0)).current

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: focused ? 1.2 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -8 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      })
    ]).start()
  }, [focused])

  return (
    <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
      {focused && (
        <Animated.View 
          style={[
            styles.activeCircleBackground,
            { transform: [{ translateY: translateY }] }]
          }
        >
          <LinearGradient
            colors={isDarkMode ? ["#2E2E2E", "#1A1A1A"] : ["#2E7D32", "#1B5E20", "#0D4A0D"]}
            style={styles.activeIconBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      )}
      <Animated.View style={{ 
        transform: [
          { scale: scaleValue },
          { translateY: translateY }
        ] 
      }}>
        <Ionicons 
          name={name as any} 
          size={size} 
          color={focused ? "#FFFFFF" : color} 
        />
      </Animated.View>
    </View>
  )
}

export default function AdminTabs() {
  const insets = useSafeAreaInsets()
  const safeArea = getSafeAreaPadding()
  const { isDarkMode } = useTheme()

  return (
    <View style={styles.container}>
      <CustomHeader title="Admin Panel" />
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }: { route: any }) => ({
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
            let iconName = ""
            if (route.name === "Dashboard") iconName = focused ? "grid" : "grid-outline"
            else if (route.name === "Users") iconName = focused ? "people" : "people-outline"
            else if (route.name === "Analytics") iconName = focused ? "analytics" : "analytics-outline"
            else if (route.name === "Profile") iconName = focused ? "person" : "person-outline"

            return <TabBarIcon name={iconName} color={color} size={size} focused={focused} />
          },
          tabBarActiveTintColor: "#4CAF50",
          tabBarInactiveTintColor: isDarkMode ? "#B0B0B0" : "#666",
          tabBarStyle: {
            backgroundColor: isDarkMode ? "#1E1E1E" : "#FFF",
            borderTopColor: isDarkMode ? "#2D2D2D" : "#E0E0E0",
            borderTopWidth: 1,
            height: 60 + safeArea.bottom,
            paddingBottom: safeArea.bottom,
            paddingTop: 8,
            ...getShadow(8),
          },
          tabBarLabelStyle: {
            fontSize: fontSize.tiny,
            fontWeight: "600",
            marginTop: 4,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
        <Tab.Screen name="Users" component={AdminUsersScreen} />
        <Tab.Screen name="Analytics" component={AdminAnalyticsScreen} />
        <Tab.Screen name="Profile" component={AdminProfileScreen} />
      </Tab.Navigator>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: isTablet() ? spacing.huge + spacing.xxxLarge : spacing.huge + spacing.xxxLarge + spacing.large,
  },
  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    paddingTop: spacing.large,
    paddingHorizontal: spacing.small,
    ...getShadow(12),
  },
  tabBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.xxxLarge,
    borderTopRightRadius: borderRadius.xxxLarge,
    overflow: "hidden",
  },
  tabBarGradient: {
    flex: 1,
  },
  tabBarBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBarBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(46, 125, 50, 0.08)",
  },
  tabBarItem: {
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.tiny,
  },
  tabBarLabel: {
    fontSize: fontSize.tiny,
    fontWeight: "600",
    marginTop: spacing.tiny,
    letterSpacing: 0.2,
    color: "#2E7D32",
    textAlign: "center",
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    position: "relative",
    minWidth: 50,
    minHeight: 35,
  },
  activeIconWrapper: {
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  activeCircleBackground: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 30,
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeIconBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
  },
})
