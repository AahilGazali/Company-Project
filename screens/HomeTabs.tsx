"use client"

import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { View, StyleSheet, Platform, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import DatabaseScreen from "./DatabaseScreen"
import ReportsScreen from "./ReportScreen"
import QueryScreen from "./QueryScreen"
import ProfileScreen from "./ProfileScreen"
import ProgramScreen from './ProgramScreen';
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
  const scaleValue = React.useRef(new Animated.Value(focused ? 1.1 : 1)).current

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.1 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()
  }, [focused])

  return (
    <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
      {focused && (
        <LinearGradient
          colors={["rgba(46, 125, 50, 0.15)", "rgba(76, 175, 80, 0.08)"]}
          style={styles.activeIconBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Ionicons name={name as any} size={size} color={color} />
      </Animated.View>
      {focused && <View style={styles.activeIndicatorDot} />}
    </View>
  )
}

export default function HomeTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      initialRouteName="Database"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = ""
          if (route.name === "Database") iconName = focused ? "server" : "server-outline"
          else if (route.name === "Reports") iconName = focused ? "stats-chart" : "stats-chart-outline"
          else if (route.name === "Query") iconName = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline"

          return <TabBarIcon name={iconName} color={color} size={focused ? 26 : 22} focused={focused} />
        },
        tabBarActiveTintColor: "#2E7D32",
        tabBarInactiveTintColor: "#9E9E9E",
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === "ios" ? 20 : 10,
            height: (Platform.OS === "ios" ? 85 : 70) + (insets.bottom > 0 ? insets.bottom : 0),
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <View style={styles.tabBarBackground}>
            <LinearGradient
              colors={["#FFFFFF", "#F8F9FA", "#F5F5F5"]}
              style={styles.tabBarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <BlurView intensity={15} style={styles.tabBarBlur} />
            <View style={styles.tabBarBorder} />
          </View>
        ),
      })}
    >
      <Tab.Screen 
        name="Database" 
        component={DatabaseScreen}
        options={{
          title: "Database",
        }}
      />
      <Tab.Screen 
        name="Programs" 
        component={ProgramScreen}
        options={{
          title: "Programs",
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          title: "Reports",
        }}
      />
      <Tab.Screen 
        name="Query" 
        component={QueryScreen}
        options={{
          title: "Query",
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
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
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  tabBarBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    backgroundColor: "rgba(46, 125, 50, 0.1)",
  },
  tabBarItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 0.3,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    position: "relative",
    minWidth: 60,
    minHeight: 40,
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
  activeIconBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  activeIndicatorDot: {
    position: "absolute",
    bottom: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2E7D32",
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
})
