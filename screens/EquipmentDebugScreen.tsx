"use client"
import React from 'react'
import { SafeAreaView, StatusBar } from 'react-native'
import EquipmentMaintenanceDebug from '../components/EquipmentMaintenanceDebug'
import { useTheme } from '../contexts/ThemeContext'

export default function EquipmentDebugScreen() {
  const { isUserDarkMode } = useTheme()

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: isUserDarkMode ? "#121212" : "#ffffff" 
    }}>
      <StatusBar 
        barStyle={isUserDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isUserDarkMode ? "#121212" : "#ffffff"}
      />
      <EquipmentMaintenanceDebug />
    </SafeAreaView>
  )
}

