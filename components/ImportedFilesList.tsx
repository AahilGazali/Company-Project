import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImportedFile, ImportedFilesService } from '../services/importedFilesService';
import StorageService from '../services/storageService';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  getIconSize,
  isSmallDevice,
  isTablet
} from '../utils/responsive';

interface ImportedFilesListProps {
  files: ImportedFile[];
  onRefresh: () => void;
  refreshing: boolean;
  onFileDeleted: (fileId: string) => void;
}

export default function ImportedFilesList({ 
  files, 
  onRefresh, 
  refreshing, 
  onFileDeleted 
}: ImportedFilesListProps) {
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  const handleDeleteFile = async (file: ImportedFile) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.originalName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!file.id) return;
            
            setDeletingFiles(prev => new Set(prev).add(file.id!));
            
            try {
              // Delete from Firestore
              const deleted = await ImportedFilesService.deleteImportedFile(file.id);
              
              if (deleted) {
                // Note: We're not deleting from Firebase Storage to preserve the files
                // You can uncomment the line below if you want to delete from storage too
                // await StorageService.deleteFile(file.fileName);
                
                onFileDeleted(file.id);
                Alert.alert('Success', 'File deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete file');
              }
            } catch (error) {
              console.error('Error deleting file:', error);
              Alert.alert('Error', 'Failed to delete file');
            } finally {
              setDeletingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(file.id!);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const handleDownloadFile = async (file: ImportedFile) => {
    try {
      // In a real app, you might want to implement file download
      Alert.alert(
        'File Info', 
        `File: ${file.originalName}\nSize: ${ImportedFilesService.formatFileSize(file.fileSize)}\nUploaded: ${ImportedFilesService.formatUploadDate(file.uploadedAt)}\n\nURL: ${file.fileUrl}`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to access file');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return 'document-text';
    }
    return 'document';
  };

  const getStatusColor = (status: ImportedFile['status']) => {
    switch (status) {
      case 'uploaded':
        return '#4CAF50';
      case 'processed':
        return '#2196F3';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: ImportedFile['status']) => {
    switch (status) {
      case 'uploaded':
        return 'Uploaded';
      case 'processed':
        return 'Processed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (files.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cloud-upload-outline" size={getIconSize(64)} color="#9E9E9E" />
          </View>
          <Text style={styles.emptyTitle}>No Files Imported</Text>
          <Text style={styles.emptyText}>
            Import your first Excel file to see it here. All your imported files will be saved and accessible after login.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Your Imported Files</Text>
      
      {files.map((file) => (
        <View key={file.id} style={styles.fileCard}>
          <View style={styles.fileHeader}>
            <View style={styles.fileIconContainer}>
              <Ionicons 
                name={getFileIcon(file.fileType)} 
                size={getIconSize(24)} 
                color="#2E7D32" 
              />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.originalName}
              </Text>
              <Text style={styles.fileDetails}>
                {ImportedFilesService.formatFileSize(file.fileSize)} • {' '}
                {ImportedFilesService.formatUploadDate(file.uploadedAt)}
              </Text>
            </View>
            <View style={styles.fileActions}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(file.status) }]}>
                <Text style={styles.statusText}>{getStatusText(file.status)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fileFooter}>
            <Pressable 
              style={styles.actionButton}
              onPress={() => handleDownloadFile(file)}
            >
              <Ionicons name="eye-outline" size={getIconSize(16)} color="#2196F3" />
              <Text style={styles.actionButtonText}>View</Text>
            </Pressable>

            <Pressable 
              style={[
                styles.actionButton, 
                styles.deleteButton,
                deletingFiles.has(file.id || '') && styles.disabledButton
              ]}
              onPress={() => handleDeleteFile(file)}
              disabled={deletingFiles.has(file.id || '')}
            >
              <Ionicons 
                name={deletingFiles.has(file.id || '') ? "hourglass-outline" : "trash-outline"} 
                size={getIconSize(16)} 
                color="#F44336" 
              />
              <Text style={styles.deleteButtonText}>
                {deletingFiles.has(file.id || '') ? 'Deleting...' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.large,
    paddingBottom: spacing.huge,
  },
  sectionTitle: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.large,
    textAlign: 'center',
  },
  fileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.medium,
    ...getShadow(3),
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  fileIconContainer: {
    width: getIconSize(40),
    height: getIconSize(40),
    borderRadius: getIconSize(20),
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.medium,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.tiny,
  },
  fileDetails: {
    fontSize: fontSize.small,
    color: '#666',
  },
  fileActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.medium,
  },
  statusText: {
    fontSize: fontSize.tiny,
    color: '#FFF',
    fontWeight: 'bold',
  },
  fileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: borderRadius.medium,
    backgroundColor: '#F8F9FA',
    minWidth: isSmallDevice() ? 80 : 90,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: fontSize.small,
    color: '#2196F3',
    marginLeft: spacing.tiny,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  deleteButtonText: {
    fontSize: fontSize.small,
    color: '#F44336',
    marginLeft: spacing.tiny,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.huge,
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyIconContainer: {
    marginBottom: spacing.large,
  },
  emptyTitle: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.medium,
    color: '#999',
    textAlign: 'center',
    lineHeight: fontSize.medium + 4,
  },
});
