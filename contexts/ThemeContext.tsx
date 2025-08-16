import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
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

  useEffect(() => {
    loadThemePreference()
  }, [])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode')
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme))
      } else {
        // Default to system preference if no saved setting
        setIsDarkMode(systemColorScheme === 'dark')
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
      // Fallback to system preference
      setIsDarkMode(systemColorScheme === 'dark')
    }
  }

  const saveThemePreference = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('darkMode', JSON.stringify(value))
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const toggleDarkMode = () => {
    const newValue = !isDarkMode
    setIsDarkMode(newValue)
    saveThemePreference(newValue)
  }

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value)
    saveThemePreference(value)
  }

  const value: ThemeContextType = {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
