import { db } from "../firebaseConfig"
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore"

export interface UserCredentials {
  email: string
  password: string
}

export interface UserData {
  id: string
  fullName: string
  email: string
  projectName: string
  employeeId: string
  role: string
  status: string
  lastLogin: any
  createdAt: any
  password?: string
  isAdminCreated?: boolean
}

export class UserAuthService {
  static async authenticateUser(credentials: UserCredentials): Promise<UserData | null> {
    try {
      // Query users collection for matching email and password
      const usersRef = collection(db, "users")
      const q = query(
        usersRef,
        where("email", "==", credentials.email),
        where("password", "==", credentials.password)
      )
      
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data()
        
        // Check if user is active
        if (userData.status !== "Active") {
          throw new Error("User account is not active")
        }
        
        // Note: We're using custom authentication without Firebase Auth
        // This allows us to bypass Firebase Auth credential requirements
        // and use our own Firestore-based authentication system
        
        // Update last login timestamp
        await this.updateLastLogin(userDoc.id)
        
        return {
          id: userDoc.id,
          fullName: userData.fullName,
          email: userData.email,
          projectName: userData.projectName,
          employeeId: userData.employeeId,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt,
          password: userData.password,
          isAdminCreated: userData.isAdminCreated
        }
      }
      
      return null // No matching user found
    } catch (error) {
      console.error("Error authenticating user:", error)
      throw error
    }
  }

  static async getUserById(userId: string): Promise<UserData | null> {
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("__name__", "==", userId))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data()
        
        return {
          id: userDoc.id,
          fullName: userData.fullName,
          email: userData.email,
          projectName: userData.projectName,
          employeeId: userData.employeeId,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt,
          password: userData.password,
          isAdminCreated: userData.isAdminCreated
        }
      }
      
      return null
    } catch (error) {
      console.error("Error getting user by ID:", error)
      throw error
    }
  }

  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        lastLogin: serverTimestamp()
      })
    } catch (error) {
      console.error("Error updating last login:", error)
      // Don't throw error as this is not critical for login
    }
  }

  static async updateUserCredentials(userId: string, email: string, password: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId)
      const { deleteField } = await import('firebase/firestore')
      await updateDoc(userRef, {
        email: email.toLowerCase().trim(),
        password: password,
        lastPasswordChange: serverTimestamp(),
        // Clean up any conflicting password fields
        newPassword: deleteField(),
        passwordUpdateRequired: deleteField(),
        passwordUpdatedAt: deleteField()
      })
    } catch (error) {
      console.error("Error updating user credentials:", error)
      throw error
    }
  }



  static async getCompleteUserData(userId: string): Promise<UserData | null> {
    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        return {
          id: userDoc.id,
          fullName: userData.fullName,
          email: userData.email,
          projectName: userData.projectName,
          employeeId: userData.employeeId,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt,
          password: userData.password,
          isAdminCreated: userData.isAdminCreated
        }
      }
      
      return null
    } catch (error) {
      console.error("Error getting complete user data:", error)
      throw error
    }
  }
}
