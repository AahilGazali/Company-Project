import { collection, doc, addDoc, getDocs, query, where, orderBy, deleteDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Dashboard metadata interface
export interface Dashboard {
  id?: string;
  fileId: string; // Links to ImportedFile
  fileName: string;
  userId: string;
  
  // PowerBI Information
  powerBIDatasetId: string;
  powerBIReportId: string;
  powerBIEmbedUrl: string;
  
  // Dashboard Properties
  dashboardName: string;
  dashboardType: 'auto-generated' | 'custom';
  dataSourceType: 'excel' | 'csv' | 'json';
  
  // Timestamps
  createdAt: any;
  lastRefreshed: any;
  lastViewed?: any;
  
  // Status and Metadata
  status: 'creating' | 'ready' | 'error' | 'refreshing';
  description?: string;
  tags?: string[];
  
  // Statistics
  viewCount: number;
  dataRowCount: number;
  sheetCount: number;
}

export interface DashboardCreationRequest {
  fileId: string;
  fileName: string;
  userId: string;
  powerBIDatasetId: string;
  powerBIReportId: string;
  powerBIEmbedUrl: string;
  dashboardName: string;
  description?: string;
  dataRowCount: number;
  sheetCount: number;
}

export interface DashboardStats {
  totalDashboards: number;
  readyDashboards: number;
  errorDashboards: number;
  totalViews: number;
  recentDashboards: number;
}

export class DashboardService {
  private static COLLECTION_NAME = 'dashboards';

  /**
   * Create a new dashboard record in Firestore
   */
  static async createDashboard(dashboardData: DashboardCreationRequest): Promise<string> {
    try {
      console.log('💾 Saving dashboard metadata to Firestore...');

      const dashboardRecord: Omit<Dashboard, 'id'> = {
        fileId: dashboardData.fileId,
        fileName: dashboardData.fileName,
        userId: dashboardData.userId,
        powerBIDatasetId: dashboardData.powerBIDatasetId,
        powerBIReportId: dashboardData.powerBIReportId,
        powerBIEmbedUrl: dashboardData.powerBIEmbedUrl,
        dashboardName: dashboardData.dashboardName,
        dashboardType: 'auto-generated',
        dataSourceType: 'excel',
        createdAt: serverTimestamp(),
        lastRefreshed: serverTimestamp(),
        status: 'ready',
        description: dashboardData.description || `Auto-generated dashboard for ${dashboardData.fileName}`,
        tags: ['excel', 'auto-generated'],
        viewCount: 0,
        dataRowCount: dashboardData.dataRowCount,
        sheetCount: dashboardData.sheetCount
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), dashboardRecord);
      
      console.log('✅ Dashboard metadata saved with ID:', docRef.id);
      return docRef.id;

    } catch (error) {
      console.error('❌ Error saving dashboard metadata:', error);
      throw new Error('Failed to save dashboard record');
    }
  }

  /**
   * Get all dashboards for a user
   */
  static async getUserDashboards(userId: string): Promise<Dashboard[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const dashboards: Dashboard[] = [];
      
      querySnapshot.forEach((doc) => {
        dashboards.push({
          id: doc.id,
          ...doc.data()
        } as Dashboard);
      });
      
      return dashboards;

    } catch (error) {
      console.error('❌ Error fetching user dashboards:', error);
      return [];
    }
  }

  /**
   * Get dashboard by ID
   */
  static async getDashboardById(dashboardId: string): Promise<Dashboard | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, dashboardId);
      const docSnap = await getDocs(query(collection(db, this.COLLECTION_NAME), where('__name__', '==', dashboardId)));
      
      if (!docSnap.empty) {
        const dashboard = docSnap.docs[0];
        return {
          id: dashboard.id,
          ...dashboard.data()
        } as Dashboard;
      }
      
      return null;

    } catch (error) {
      console.error('❌ Error fetching dashboard by ID:', error);
      return null;
    }
  }

  /**
   * Get dashboard by file ID
   */
  static async getDashboardByFileId(fileId: string): Promise<Dashboard | null> {
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
        } as Dashboard;
      }
      
      return null;

    } catch (error) {
      console.error('❌ Error fetching dashboard by file ID:', error);
      return null;
    }
  }

  /**
   * Update dashboard status
   */
  static async updateDashboardStatus(
    dashboardId: string, 
    status: Dashboard['status'], 
    description?: string
  ): Promise<boolean> {
    try {
      const dashboardRef = doc(db, this.COLLECTION_NAME, dashboardId);
      
      const updateData: any = {
        status,
        lastRefreshed: serverTimestamp(),
      };
      
      if (description) {
        updateData.description = description;
      }
      
      await updateDoc(dashboardRef, updateData);
      
      console.log('✅ Dashboard status updated:', status);
      return true;

    } catch (error) {
      console.error('❌ Error updating dashboard status:', error);
      return false;
    }
  }

  /**
   * Record dashboard view
   */
  static async recordDashboardView(dashboardId: string): Promise<boolean> {
    try {
      const dashboardRef = doc(db, this.COLLECTION_NAME, dashboardId);
      
      await updateDoc(dashboardRef, {
        viewCount: (await this.getDashboardById(dashboardId))?.viewCount || 0 + 1,
        lastViewed: serverTimestamp(),
      });
      
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

    } catch (error) {
      console.error('❌ Error deleting dashboard:', error);
      return false;
    }
  }

  /**
   * Get dashboard statistics for a user
   */
  static async getUserDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      const dashboards = await this.getUserDashboards(userId);
      
      const totalDashboards = dashboards.length;
      const readyDashboards = dashboards.filter(d => d.status === 'ready').length;
      const errorDashboards = dashboards.filter(d => d.status === 'error').length;
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
        readyDashboards,
        errorDashboards,
        totalViews,
        recentDashboards,
      };

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        totalDashboards: 0,
        readyDashboards: 0,
        errorDashboards: 0,
        totalViews: 0,
        recentDashboards: 0,
      };
    }
  }

  /**
   * Search dashboards by name or description
   */
  static async searchUserDashboards(userId: string, searchTerm: string): Promise<Dashboard[]> {
    try {
      const allDashboards = await this.getUserDashboards(userId);
      
      const filteredDashboards = allDashboards.filter(dashboard => 
        dashboard.dashboardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dashboard.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dashboard.description && dashboard.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dashboard.tags && dashboard.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
      
      return filteredDashboards;

    } catch (error) {
      console.error('❌ Error searching dashboards:', error);
      return [];
    }
  }

  /**
   * Get recent dashboards (last 10)
   */
  static async getRecentDashboards(userId: string, limit: number = 10): Promise<Dashboard[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastViewed', 'desc'),
        // limit(limit) // Note: Firestore limit would be imported separately
      );
      
      const querySnapshot = await getDocs(q);
      const dashboards: Dashboard[] = [];
      
      let count = 0;
      querySnapshot.forEach((doc) => {
        if (count < limit) {
          dashboards.push({
            id: doc.id,
            ...doc.data()
          } as Dashboard);
          count++;
        }
      });
      
      return dashboards;

    } catch (error) {
      console.error('❌ Error fetching recent dashboards:', error);
      return [];
    }
  }

  /**
   * Check if dashboard exists for file
   */
  static async dashboardExistsForFile(fileId: string): Promise<boolean> {
    try {
      const dashboard = await this.getDashboardByFileId(fileId);
      return dashboard !== null;

    } catch (error) {
      console.error('❌ Error checking dashboard existence:', error);
      return false;
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

  /**
   * Get dashboard status display text
   */
  static getStatusDisplayText(status: Dashboard['status']): { text: string; color: string } {
    switch (status) {
      case 'ready':
        return { text: 'Ready', color: '#4CAF50' };
      case 'creating':
        return { text: 'Creating...', color: '#FF9800' };
      case 'refreshing':
        return { text: 'Refreshing...', color: '#2196F3' };
      case 'error':
        return { text: 'Error', color: '#F44336' };
      default:
        return { text: 'Unknown', color: '#757575' };
    }
  }
}

export default DashboardService;
