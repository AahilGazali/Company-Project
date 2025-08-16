import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, Platform } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeTabs'; // Import Home screen
import AdminTabs from './screens/AdminTabs'; // Import Admin tabs
import AdminLoginScreen from './screens/AdminLoginScreen'; // Import Admin Login screen

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} 
        backgroundColor={Platform.OS === 'android' ? '#2E7D32' : undefined}
        translucent={Platform.OS === 'android'}
      />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
            gestureEnabled: true,
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
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
