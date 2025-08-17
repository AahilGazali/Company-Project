import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserData } from '../services/userAuthService'

interface UserContextType {
  user: UserData | null
  setUser: (user: UserData | null) => void
  isAuthenticated: boolean
  logout: () => void
  loading: boolean
  isAdminCreatedUser: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load user from storage on app start
    loadUserFromStorage()
  }, [])



  const loadUserFromStorage = async () => {
    try {
      const userData = await AsyncStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        
        // Check if stored user data shows deactivated status
        if (parsedUser.status === 'Inactive') {
          console.log('Stored user data shows deactivated status, clearing...')
          await AsyncStorage.removeItem('user')
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(parsedUser)
      }
    } catch (error) {
      console.error('Error loading user from storage:', error)
    } finally {
      setLoading(false)
    }
  }

  const setUserAndStore = async (userData: UserData | null) => {
    setUser(userData)
    try {
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData))
      } else {
        await AsyncStorage.removeItem('user')
      }
    } catch (error) {
      console.error('Error storing user data:', error)
    }
  }

  const logout = async () => {
    try {
      // Clear user state first
      setUser(null)
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('user')
      
      // Reset loading state
      setLoading(false)
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  // Check if current user is an admin-created user
  const isAdminCreatedUser = !!user

  const value: UserContextType = {
    user,
    setUser: setUserAndStore,
    isAuthenticated: !!user,
    logout,
    loading,
    isAdminCreatedUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
