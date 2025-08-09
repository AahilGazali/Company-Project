import { collection, doc, addDoc, getDocs, query, where, orderBy, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface ImportedFile {
  id?: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: any;
  userId: string;
  status: 'uploaded' | 'processed' | 'error';
  description?: string;
}

export class ImportedFilesService {
  private static COLLECTION_NAME = 'importedFiles';

  // Save an imported file record to Firestore
  static async saveImportedFile(fileData: Omit<ImportedFile, 'id' | 'uploadedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...fileData,
        uploadedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving imported file:', error);
      throw new Error('Failed to save file record');
    }
  }

  // Get all imported files for a user
  static async getUserImportedFiles(userId: string): Promise<ImportedFile[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const files: ImportedFile[] = [];
      
      querySnapshot.forEach((doc) => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as ImportedFile);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching imported files:', error);
      return [];
    }
  }

  // Delete an imported file record
  static async deleteImportedFile(fileId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, fileId));
      return true;
    } catch (error) {
      console.error('Error deleting imported file:', error);
      return false;
    }
  }

  // Update file status (e.g., when processing is complete)
  static async updateFileStatus(fileId: string, status: ImportedFile['status'], description?: string): Promise<boolean> {
    try {
      const fileRef = doc(db, this.COLLECTION_NAME, fileId);
      await setDoc(fileRef, {
        status,
        ...(description && { description }),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating file status:', error);
      return false;
    }
  }

  // Get file statistics for a user
  static async getUserFileStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    recentFiles: number;
  }> {
    try {
      const files = await this.getUserImportedFiles(userId);
      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
      
      // Count files uploaded in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentFiles = files.filter(file => {
        if (file.uploadedAt && file.uploadedAt.toDate) {
          return file.uploadedAt.toDate() > sevenDaysAgo;
        }
        return false;
      }).length;

      return {
        totalFiles,
        totalSize,
        recentFiles,
      };
    } catch (error) {
      console.error('Error fetching file stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        recentFiles: 0,
      };
    }
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format upload date for display
  static formatUploadDate(timestamp: any): string {
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

export default ImportedFilesService;
