import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebaseConfig';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  // Upload a file to Firebase Storage
  static async uploadFile(
    file: File | Blob,
    path: string,
    fileName?: string
  ): Promise<UploadResult> {
    try {
      const fullPath = fileName ? `${path}/${fileName}` : path;
      const storageRef = ref(storage, fullPath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload an image file
  static async uploadImage(
    imageFile: File | Blob,
    userId: string,
    imageName?: string
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const fileName = imageName || `image_${timestamp}`;
    const path = `users/${userId}/images/${fileName}`;
    
    return this.uploadFile(imageFile, path, fileName);
  }

  // Upload a document file
  static async uploadDocument(
    documentFile: File | Blob,
    userId: string,
    documentName?: string
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const fileName = documentName || `document_${timestamp}`;
    const path = `users/${userId}/documents/${fileName}`;
    
    return this.uploadFile(documentFile, path, fileName);
  }

  // Upload RCM program data files
  static async uploadRCMData(
    dataFile: File | Blob,
    userId: string,
    programName: string
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const fileName = `rcm_${programName}_${timestamp}`;
    const path = `users/${userId}/rcm_data/${fileName}`;
    
    return this.uploadFile(dataFile, path, fileName);
  }

  // Get download URL for a file
  static async getDownloadURL(filePath: string): Promise<string> {
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  }

  // Delete a file from storage
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // List all files in a directory
  static async listFiles(directoryPath: string): Promise<string[]> {
    try {
      const storageRef = ref(storage, directoryPath);
      const result = await listAll(storageRef);
      return result.items.map(item => item.fullPath);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Get user's storage usage summary
  static async getUserStorageSummary(userId: string): Promise<{
    images: string[];
    documents: string[];
    rcmData: string[];
  }> {
    const images = await this.listFiles(`users/${userId}/images`);
    const documents = await this.listFiles(`users/${userId}/documents`);
    const rcmData = await this.listFiles(`users/${userId}/rcm_data`);
    
    return {
      images,
      documents,
      rcmData
    };
  }
}

export default StorageService; 