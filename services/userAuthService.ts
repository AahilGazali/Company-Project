import { db } from "../firebaseConfig"
import { collection, query, where, getDocs } from "firebase/firestore"

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
        
        return {
          id: userDoc.id,
          fullName: userData.fullName,
          email: userData.email,
          projectName: userData.projectName,
          employeeId: userData.employeeId,
          role: userData.role,
          status: userData.status,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt
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
          createdAt: userData.createdAt
        }
      }
      
      return null
    } catch (error) {
      console.error("Error getting user by ID:", error)
      throw error
    }
  }
}
