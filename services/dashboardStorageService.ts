import { collection, doc, addDoc, getDocs, getDoc, query, where, orderBy, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { DashboardData } from './chartDataService';

export interface StoredDashboard {
  id?: string;
  fileId: string;
  fileName: string;
  userId: string;
  dashboardData: DashboardData;
  createdAt: any;
  lastViewed?: any;
  viewCount: number;
}

export class DashboardStorageService {
  private static COLLECTION_NAME = 'chartDashboards';

  /**
   * Save dashboard data to Firestore
   */
  static async saveDashboard(
    fileId: string,
    fileName: string,
    userId: string,
    dashboardData: DashboardData
  ): Promise<string> {
    try {
      console.log('💾 Saving dashboard to Firestore...');

      const dashboardRecord: Omit<StoredDashboard, 'id'> = {
        fileId,
        fileName,
        userId,
        dashboardData,
        createdAt: serverTimestamp(),
        viewCount: 0
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), dashboardRecord);
      
      console.log('✅ Dashboard saved with ID:', docRef.id);
      return docRef.id;

    } catch (error) {
      console.error('❌ Error saving dashboard:', error);
      throw new Error('Failed to save dashboard');
    }
  }

  /**
   * Get dashboard by file ID
   */
  static async getDashboardByFileId(fileId: string): Promise<StoredDashboard | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('fileId', '==', fileId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as StoredDashboard;
      }
      
      return null;

    } catch (error: any) {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Permission denied when fetching dashboard by file ID (this is normal):', error.message);
        return null;
      }
      console.error('❌ Error fetching dashboard by file ID:', error);
      return null;
    }
  }

  /**
   * Get all dashboards for a user
   */
  static async getUserDashboards(userId: string): Promise<StoredDashboard[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const dashboards: StoredDashboard[] = [];
      
      querySnapshot.forEach((doc) => {
        dashboards.push({
          id: doc.id,
          ...doc.data()
        } as StoredDashboard);
      });
      
      return dashboards;

    } catch (error: any) {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Permission denied when fetching user dashboards (this is normal):', error.message);
        return [];
      }
      console.error('❌ Error fetching user dashboards:', error);
      return [];
    }
  }

  /**
   * Record dashboard view
   */
  static async recordDashboardView(dashboardId: string): Promise<boolean> {
    try {
      const dashboardRef = doc(db, this.COLLECTION_NAME, dashboardId);
      
      // Get current dashboard to increment view count
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('__name__', '==', dashboardId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const currentData = querySnapshot.docs[0].data() as StoredDashboard;
        const newViewCount = (currentData.viewCount || 0) + 1;
        
        await setDoc(dashboardRef, {
          ...currentData,
          viewCount: newViewCount,
          lastViewed: serverTimestamp(),
        });
      }
      
      return true;

    } catch (error) {
      console.error('❌ Error recording dashboard view:', error);
      return false;
    }
  }

  /**
   * Delete dashboard
   */
  static async deleteDashboard(dashboardId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, dashboardId));
      console.log('✅ Dashboard deleted successfully:', dashboardId);
      return true;

    } catch (error: any) {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Permission denied when deleting dashboard (this is normal):', error.message);
        return false;
      }
      console.error('❌ Error deleting dashboard:', error);
      return false;
    }
  }

  /**
   * Delete dashboard by file ID
   */
  static async deleteDashboardByFileId(fileId: string): Promise<boolean> {
    try {
      const dashboard = await this.getDashboardByFileId(fileId);
      if (dashboard && dashboard.id) {
        try {
          await deleteDoc(doc(db, this.COLLECTION_NAME, dashboard.id));
          console.log('✅ Dashboard deleted by file ID:', fileId);
          return true;
        } catch (deleteError: any) {
          // Handle permission errors gracefully
          if (deleteError.code === 'permission-denied' || deleteError.message?.includes('permission')) {
            console.warn('⚠️ Permission denied when deleting dashboard (this is normal):', deleteError.message);
            return false;
          }
          throw deleteError; // Re-throw other errors
        }
      } else {
        // Dashboard not found or permission denied - this is normal
        console.log('ℹ️ No dashboard found or accessible for file ID:', fileId);
        return false;
      }

    } catch (error: any) {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Permission denied when deleting dashboard by file ID (this is normal):', error.message);
        return false;
      }
      console.error('❌ Error deleting dashboard by file ID:', error);
      return false;
    }
  }

  /**
   * Delete all dashboards for a user (cleanup)
   */
  static async deleteAllUserDashboards(userId: string): Promise<boolean> {
    try {
      const userDashboards = await this.getUserDashboards(userId);
      for (const dashboard of userDashboards) {
        if (dashboard.id) {
          await deleteDoc(doc(db, this.COLLECTION_NAME, dashboard.id));
          console.log('🗑️ Deleted dashboard:', dashboard.fileName);
        }
      }
      console.log('✅ All user dashboards deleted');
      return true;

    } catch (error) {
      console.error('❌ Error deleting all user dashboards:', error);
      return false;
    }
  }

  /**
   * Check if dashboard exists for file
   */
  static async dashboardExistsForFile(fileId: string): Promise<boolean> {
    try {
      const dashboard = await this.getDashboardByFileId(fileId);
      return dashboard !== null;

    } catch (error: any) {
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Permission denied when checking dashboard existence (this is normal):', error.message);
        return false;
      }
      console.error('❌ Error checking dashboard existence:', error);
      return false;
    }
  }

  /**
   * Get dashboard count for a user (for debugging)
   */
  static async getUserDashboardCount(userId: string): Promise<number> {
    try {
      const dashboards = await this.getUserDashboards(userId);
      return dashboards.length;
    } catch (error: any) {
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Permission denied when getting dashboard count');
        return 0;
      }
      console.error('❌ Error getting dashboard count:', error);
      return 0;
    }
  }

  /**
   * Check if dashboard can be deleted (permissions check)
   */
  static async canDeleteDashboard(dashboardId: string): Promise<boolean> {
    try {
      // Try to read the dashboard to check permissions
      const dashboardRef = doc(db, this.COLLECTION_NAME, dashboardId);
      await getDoc(dashboardRef);
      return true;
    } catch (error: any) {
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ No permission to access dashboard:', dashboardId);
        return false;
      }
      return false;
    }
  }

  /**
   * Check if we have access to the dashboard collection
   */
  static async canAccessDashboardCollection(): Promise<boolean> {
    try {
      // Try to read the collection without any filters first
      const q = query(collection(db, this.COLLECTION_NAME));
      await getDocs(q);
      return true;
    } catch (error: any) {
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ No permission to access dashboard collection');
        return false;
      }
      // For other errors, assume we have access (they might be network or other issues)
      console.warn('⚠️ Error checking dashboard collection access (assuming access):', error.message);
      return true;
    }
  }

  /**
   * Update dashboard data (regenerate)
   */
  static async updateDashboard(
    fileId: string,
    dashboardData: DashboardData
  ): Promise<boolean> {
    try {
      const existingDashboard = await this.getDashboardByFileId(fileId);
      
      if (!existingDashboard || !existingDashboard.id) {
        throw new Error('Dashboard not found');
      }

      const dashboardRef = doc(db, this.COLLECTION_NAME, existingDashboard.id);
      
      await setDoc(dashboardRef, {
        ...existingDashboard,
        dashboardData,
        lastUpdated: serverTimestamp(),
      });

      console.log('✅ Dashboard updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Error updating dashboard:', error);
      return false;
    }
  }

  /**
   * Get dashboard statistics for a user
   */
  static async getUserDashboardStats(userId: string): Promise<{
    totalDashboards: number;
    totalViews: number;
    recentDashboards: number;
  }> {
    try {
      const dashboards = await this.getUserDashboards(userId);
      
      const totalDashboards = dashboards.length;
      const totalViews = dashboards.reduce((sum, d) => sum + (d.viewCount || 0), 0);
      
      // Count dashboards created in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentDashboards = dashboards.filter(dashboard => {
        if (dashboard.createdAt && dashboard.createdAt.toDate) {
          return dashboard.createdAt.toDate() > sevenDaysAgo;
        }
        return false;
      }).length;

      return {
        totalDashboards,
        totalViews,
        recentDashboards,
      };

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        totalDashboards: 0,
        totalViews: 0,
        recentDashboards: 0,
      };
    }
  }

  /**
   * Format creation date for display
   */
  static formatCreationDate(timestamp: any): string {
    if (!timestamp || !timestamp.toDate) return 'Unknown';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  }
}

export default DashboardStorageService;
