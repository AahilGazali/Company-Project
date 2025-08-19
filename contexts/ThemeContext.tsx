import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'

interface ThemeContextType {
  isDarkMode: boolean
  isUserDarkMode: boolean
  toggleDarkMode: () => void
  toggleUserDarkMode: () => void
  setDarkMode: (value: boolean) => void
  setUserDarkMode: (value: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isUserDarkMode, setIsUserDarkMode] = useState(false)

  useEffect(() => {
    loadThemePreferences()
  }, [])

  const loadThemePreferences = async () => {
    try {
      // Load admin dark mode preference
      const savedAdminTheme = await AsyncStorage.getItem('adminDarkMode')
      if (savedAdminTheme !== null) {
        setIsDarkMode(JSON.parse(savedAdminTheme))
      } else {
        // Default to system preference if no saved setting
        setIsDarkMode(systemColorScheme === 'dark')
      }

      // Load user dark mode preference
      const savedUserTheme = await AsyncStorage.getItem('userDarkMode')
      if (savedUserTheme !== null) {
        setIsUserDarkMode(JSON.parse(savedUserTheme))
      } else {
        // Default to light mode for user screens
        setIsUserDarkMode(false)
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error)
      // Fallback to system preference for admin, light mode for user
      setIsDarkMode(systemColorScheme === 'dark')
      setIsUserDarkMode(false)
    }
  }

  const saveAdminThemePreference = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('adminDarkMode', JSON.stringify(value))
    } catch (error) {
      console.error('Error saving admin theme preference:', error)
    }
  }

  const saveUserThemePreference = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('userDarkMode', JSON.stringify(value))
    } catch (error) {
      console.error('Error saving user theme preference:', error)
    }
  }

  const toggleDarkMode = () => {
    const newValue = !isDarkMode
    setIsDarkMode(newValue)
    saveAdminThemePreference(newValue)
  }

  const toggleUserDarkMode = () => {
    const newValue = !isUserDarkMode
    setIsUserDarkMode(newValue)
    saveUserThemePreference(newValue)
  }

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value)
    saveAdminThemePreference(value)
  }

  const setUserDarkMode = (value: boolean) => {
    setIsUserDarkMode(value)
    saveUserThemePreference(value)
  }

  const value: ThemeContextType = {
    isDarkMode,
    isUserDarkMode,
    toggleDarkMode,
    toggleUserDarkMode,
    setDarkMode,
    setUserDarkMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
