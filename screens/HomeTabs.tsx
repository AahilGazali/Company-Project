import React from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { View, StyleSheet, Platform, Animated, Text, Pressable } from "react-native"
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
            { transform: [{ translateY: translateY }] }
          ]}
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

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets()
  const safeArea = getSafeAreaPadding()

  return (
    <View style={[styles.customTabBar, { paddingBottom: Math.max(insets.bottom, safeArea.bottom) }]}>
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
      
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key]
        const label = options.tabBarLabel || options.title || route.name
        const isFocused = state.index === index

        let iconName = ""
        if (route.name === "Database") iconName = isFocused ? "server" : "server-outline"
        else if (route.name === "Programs") iconName = isFocused ? "list" : "list-outline"
        else if (route.name === "Reports") iconName = isFocused ? "stats-chart" : "stats-chart-outline"
        else if (route.name === "Query") iconName = isFocused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
        else if (route.name === "Profile") iconName = isFocused ? "person" : "person-outline"

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.customTabItem}
          >
            <View style={styles.customTabContent}>
              <TabBarIcon 
                name={iconName} 
                color={isFocused ? "#2E7D32" : "#6B7280"} 
                size={getIconSize(isFocused ? 22 : 18)} 
                focused={isFocused} 
              />
              <Text style={[
                styles.customTabLabel,
                { color: isFocused ? "#2E7D32" : "#6B7280" }
              ]}>
                {label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function HomeTabs() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="Database"
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F3',
  },
  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    paddingTop: spacing.large,
    paddingHorizontal: spacing.medium,
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
    paddingHorizontal: spacing.small,
    minWidth: 80,
    flex: 1,
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
  activeIndicatorDot: {
    position: "absolute",
    bottom: -12,
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
  customTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    paddingTop: spacing.large,
    paddingHorizontal: spacing.medium,
    height: (isTablet() ? 100 : Platform.OS === "ios" ? 95 : 80),
    flexDirection: "row",
    ...getShadow(12),
  },
  customTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.small,
    minWidth: 80,
  },
  customTabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  customTabLabel: {
    fontSize: fontSize.tiny,
    fontWeight: "600",
    marginTop: spacing.tiny,
    letterSpacing: 0.2,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
})
