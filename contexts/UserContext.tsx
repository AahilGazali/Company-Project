import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserData } from '../services/userAuthService'
import { auth, db } from '../firebaseConfig'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'

interface UserContextType {
  user: UserData | null
  setUser: (user: UserData | null) => void
  isAuthenticated: boolean
  logout: () => void
  loading: boolean
  isAdminCreatedUser: boolean
  currentFirebaseUser: FirebaseUser | null
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
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState<FirebaseUser | null>(null)

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentFirebaseUser(firebaseUser)
      
      // If Firebase user exists, try to get user data from Firestore
      if (firebaseUser) {
        loadUserFromFirestore(firebaseUser.uid)
      } else {
        // If no Firebase user, check if we have a stored admin-created user
        loadUserFromStorage()
      }
    })

    return () => unsubscribe()
  }, [])

  const loadUserFromFirestore = async (firebaseUid: string) => {
    try {
      // Get user data from Firestore using Firebase UID
      const { doc, getDoc } = await import('firebase/firestore')
      const userDoc = await getDoc(doc(db, 'users', firebaseUid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        
        // Check if user account is deactivated
        if (userData.status === 'Inactive') {
          console.log('User account is deactivated, signing out...')
          // Sign out the user since they can't access the app
          await auth.signOut()
          setUser(null)
          setLoading(false)
          return
        }
        
        const user = {
          id: firebaseUid,
          fullName: userData.fullName,
          email: userData.email,
          projectName: userData.projectName,
          employeeId: userData.employeeId,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt,
          isAdminCreated: userData.isAdminCreated
        }
        setUser(user)
        // Store in AsyncStorage for offline access
        await AsyncStorage.setItem('user', JSON.stringify(user))
      }
    } catch (error) {
      console.error('Error loading user from Firestore:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserFromStorage = async () => {
    try {
      // Only load from storage if we have a Firebase user
      if (!currentFirebaseUser) {
        setLoading(false)
        return
      }
      
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
      
      // Sign out from Firebase if user is signed in
      if (currentFirebaseUser) {
        try {
          await auth.signOut()
        } catch (error) {
          console.error('Error signing out from Firebase:', error)
        }
      }
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('user')
      
      // Reset loading state
      setLoading(false)
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  // Check if current user is an admin-created user (not Firebase Auth user)
  const isAdminCreatedUser = !!(user && !currentFirebaseUser)

  const value: UserContextType = {
    user,
    setUser: setUserAndStore,
    isAuthenticated: !!user,
    logout,
    loading,
    isAdminCreatedUser,
    currentFirebaseUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
