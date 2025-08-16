import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface AdminCredentials {
  email: string;
  password: string;
  lastUpdated: Date;
}

export class AdminService {
  private static readonly ADMIN_DOC_ID = 'admin_credentials';
  private static readonly FALLBACK_CREDENTIALS: AdminCredentials = {
    email: 'admin@gmail.com',
    password: '123456',
    lastUpdated: new Date()
  };

  // Get admin credentials from Firestore
  static async getAdminCredentials(): Promise<AdminCredentials | null> {
    try {
      const adminDoc = await getDoc(doc(db, 'admin', this.ADMIN_DOC_ID));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        return {
          email: data.email,
          password: data.password,
          lastUpdated: data.lastUpdated.toDate()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching admin credentials from Firebase:', error);
      console.log('Falling back to default credentials');
      return this.FALLBACK_CREDENTIALS;
    }
  }

  // Set initial admin credentials
  static async setInitialAdminCredentials(email: string, password: string): Promise<void> {
    try {
      const credentials = {
        email,
        password,
        lastUpdated: new Date()
      };
      
      await setDoc(doc(db, 'admin', this.ADMIN_DOC_ID), credentials);
      console.log('Admin credentials set successfully in Firebase');
    } catch (error) {
      console.error('Error setting initial admin credentials in Firebase:', error);
      console.log('Credentials will be stored locally only');
      // Update fallback credentials
      this.FALLBACK_CREDENTIALS.email = email;
      this.FALLBACK_CREDENTIALS.password = password;
      this.FALLBACK_CREDENTIALS.lastUpdated = new Date();
    }
  }

  // Update admin credentials
  static async updateAdminCredentials(email: string, password: string): Promise<void> {
    try {
      const updateData = {
        email,
        password,
        lastUpdated: new Date()
      };
      
      await updateDoc(doc(db, 'admin', this.ADMIN_DOC_ID), updateData);
      console.log('Admin credentials updated successfully in Firebase');
      
      // Also update fallback credentials
      this.FALLBACK_CREDENTIALS.email = email;
      this.FALLBACK_CREDENTIALS.password = password;
      this.FALLBACK_CREDENTIALS.lastUpdated = new Date();
    } catch (error) {
      console.error('Error updating admin credentials in Firebase:', error);
      // Update fallback credentials even if Firebase fails
      this.FALLBACK_CREDENTIALS.email = email;
      this.FALLBACK_CREDENTIALS.password = password;
      this.FALLBACK_CREDENTIALS.lastUpdated = new Date();
      throw new Error('Failed to update credentials in Firebase, but local update succeeded');
    }
  }

  // Verify admin credentials
  static async verifyAdminCredentials(email: string, password: string): Promise<boolean> {
    try {
      const credentials = await this.getAdminCredentials();
      if (!credentials) {
        console.log('No admin credentials found');
        return false;
      }
      
      const isValid = credentials.email === email && credentials.password === password;
      console.log('Credential verification result:', isValid);
      return isValid;
    } catch (error) {
      console.error('Error verifying admin credentials:', error);
      return false;
    }
  }

  // Check if admin credentials exist
  static async hasAdminCredentials(): Promise<boolean> {
    try {
      const credentials = await this.getAdminCredentials();
      return credentials !== null;
    } catch (error) {
      console.error('Error checking admin credentials existence:', error);
      return true; // Return true if we have fallback credentials
    }
  }

  // Get fallback credentials (for offline mode)
  static getFallbackCredentials(): AdminCredentials {
    return { ...this.FALLBACK_CREDENTIALS };
  }
}
