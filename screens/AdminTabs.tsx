import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { View, StyleSheet, Platform, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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
            colors={["#2E7D32", "#1B5E20", "#0D4A0D"]}
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

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
          let iconName = ""
          if (route.name === "Dashboard") iconName = focused ? "grid" : "grid-outline"
          else if (route.name === "Users") iconName = focused ? "people" : "people-outline"
          else if (route.name === "Analytics") iconName = focused ? "analytics" : "analytics-outline"
          else if (route.name === "Settings") iconName = focused ? "settings" : "settings-outline"
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline"

          return <TabBarIcon 
            name={iconName} 
            color={color} 
            size={getIconSize(focused ? 22 : 18)} 
            focused={focused} 
          />
        },
        tabBarActiveTintColor: "#2E7D32",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, safeArea.bottom),
            height: (isTablet() ? 100 : Platform.OS === "ios" ? 95 : 80) + Math.max(insets.bottom, 0),
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelPosition: "below-icon",
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <View style={styles.tabBarBackground}>
            <LinearGradient
              colors={["#FFFFFF", "#FAFAFA", "#F8F9FA"]}
              style={styles.tabBarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <BlurView intensity={20} style={styles.tabBarBlur} />
            <View style={styles.tabBarBorder} />
          </View>
        ),
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen}
        options={{
          title: "Dashboard",
        }}
      />
      <Tab.Screen 
        name="Users" 
        component={AdminUsersScreen}
        options={{
          title: "Users",
        }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AdminAnalyticsScreen}
        options={{
          title: "Analytics",
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={AdminSettingsScreen}
        options={{
          title: "Settings",
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AdminProfileScreen}
        options={{
          title: "Profile",
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
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

import AdminDashboardScreen from "./AdminDashboardScreen"
import AdminUsersScreen from "./AdminUsersScreen"
import AdminAnalyticsScreen from "./AdminAnalyticsScreen"
import AdminSettingsScreen from "./AdminSettingsScreen"
import AdminProfileScreen from "./AdminProfileScreen"
