import { auth } from '../firebaseConfig'
import { UserData } from '../services/userAuthService'

/**
 * Get the user ID that works for both Firebase Auth users and admin-created users
 * @param user - User data from context
 * @param isAdminCreatedUser - Whether the user was created by admin
 * @returns User ID string or null if not available
 */
export const getUserID = (user: UserData | null, isAdminCreatedUser: boolean): string | null => {
  if (!user) return null
  
  // Since all users now use Firebase Auth, we can always use the user.id
  // which will be the Firebase UID
  return user.id
}

/**
 * Check if a user is authenticated (either Firebase Auth or admin-created)
 * @param user - User data from context
 * @returns Boolean indicating if user is authenticated
 */
export const isUserAuthenticated = (user: UserData | null): boolean => {
  return !!user
}
