import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, Platform } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeTabs'; // Import Home screen
import AdminTabs from './screens/AdminTabs'; // Import Admin tabs
import AdminLoginScreen from './screens/AdminLoginScreen'; // Import Admin Login screen
import SplashScreen from './components/SplashScreen'; // Import SplashScreen
import { initializeAdminCredentials } from './utils/initializeAdmin';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : (Platform.OS === 'ios' ? 'light-content' : 'dark-content')}
        backgroundColor={Platform.OS === 'android' ? (isDarkMode ? '#121212' : '#2E7D32') : undefined}
        translucent={Platform.OS === 'android'}
      />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
            gestureEnabled: true,
          }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />
          <Stack.Screen
            name="AdminLogin"
            component={AdminLoginScreen}
          />
          <Stack.Screen
            name="AdminHome"
            component={AdminTabs}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Initialize admin credentials when app starts
    initializeAdminCredentials();
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}
