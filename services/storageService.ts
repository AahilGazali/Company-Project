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
      console.log('Starting upload to Firebase Storage...');
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      console.log('Path:', path);
      console.log('FileName:', fileName);
      
      const fullPath = fileName ? `${path}/${fileName}` : path;
      console.log('Full path:', fullPath);
      
      const storageRef = ref(storage, fullPath);
      console.log('Storage reference created');
      
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Upload completed, getting download URL...');
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);
      
      return {
        success: true,
        url: downloadURL
      };
    } catch (error: any) {
      console.error('Firebase Storage upload error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = error.message;
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Upload failed: Unauthorized. Please check your Firebase Storage rules.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Upload failed: Storage quota exceeded.';
      } else if (error.code === 'storage/invalid-format') {
        errorMessage = 'Upload failed: Invalid file format.';
      } else if (error.code === 'storage/retry-limit-exceeded') {
        errorMessage = 'Upload failed: Network error, please try again.';
      }
      
      return {
        success: false,
        error: errorMessage
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