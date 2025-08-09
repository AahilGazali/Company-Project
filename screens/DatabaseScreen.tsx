import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import StorageService from '../services/storageService';
import ImportedFilesService, { ImportedFile } from '../services/importedFilesService';
import { ExcelAnalysisService, ExcelAnalysis } from '../services/excelAnalysisService';
import ResponsiveTable from '../components/ResponsiveTable';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  isSmallDevice,
  isTablet
} from '../utils/responsive';

const initialPrograms: Array<{ program: string; noOfHouses: string; completed: string; remaining: string; percentCompleted: string }> = [];

export default function DatabaseScreen() {
  const [isImporting, setIsImporting] = useState(false);
  const [showRCM, setShowRCM] = useState(false);
  const [programs, setPrograms] = useState<Array<{ program: string; noOfHouses: string; completed: string; remaining: string; percentCompleted: string }>>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ [key: number]: boolean }>({});
  const [loadingRCM, setLoadingRCM] = useState(false);

  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [showImportedFiles, setShowImportedFiles] = useState(false);
  const [currentDataAnalysis, setCurrentDataAnalysis] = useState<ExcelAnalysis | null>(null);

  // Load RCM data from Firestore when RCM is shown
  useEffect(() => {
    const fetchRCM = async () => {
      if (!showRCM) return;
      setLoadingRCM(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, 'rcmPrograms', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const existingPrograms = docSnap.data().programs || [];
          if (existingPrograms.length === 0) {
            // If no programs exist, create an empty row in edit mode
            setPrograms([{ program: '', noOfHouses: '', completed: '', remaining: '', percentCompleted: '' }]);
            // Use setTimeout to ensure programs state is updated before setting edit mode
            setTimeout(() => setEditIndex(0), 100);
          } else {
            // If programs exist, load them normally
            setPrograms(existingPrograms);
            setEditIndex(null);
          }
        } else {
          // For new users, create an empty row in edit mode
          setPrograms([{ program: '', noOfHouses: '', completed: '', remaining: '', percentCompleted: '' }]);
          // Use setTimeout to ensure programs state is updated before setting edit mode
          setTimeout(() => setEditIndex(0), 100);
        }
      } catch (e) {
        // In case of error, create an empty row in edit mode
        setPrograms([{ program: '', noOfHouses: '', completed: '', remaining: '', percentCompleted: '' }]);
        // Use setTimeout to ensure programs state is updated before setting edit mode
        setTimeout(() => setEditIndex(0), 100);
      } finally {
        setLoadingRCM(false);
      }
    };
    fetchRCM();
  }, [showRCM]);

  // Load imported files when component mounts
  useEffect(() => {
    loadImportedFiles();
  }, []);

  const loadImportedFiles = async () => {
    try {
      setLoadingFiles(true);
      const user = auth.currentUser;
      if (!user) return;
      
      const files = await ImportedFilesService.getUserImportedFiles(user.uid);
      setImportedFiles(files);
    } catch (error) {
      console.error('Error loading imported files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Save RCM data to Firestore
  const saveRCMToFirestore = async (updatedPrograms: typeof programs) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, 'rcmPrograms', user.uid);
      await setDoc(docRef, { programs: updatedPrograms });
    } catch (e) {
      Alert.alert('Error', 'Failed to save data to server.');
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Validate file extension
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        Alert.alert(
          'Invalid File Type',
          'Please select an Excel file (.xlsx or .xls) only.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Upload file to Firebase Storage
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please login to upload files.');
        return;
      }

      // Convert file to blob for upload
      console.log('Converting file to blob...');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      console.log('File details:', {
        name: file.name,
        size: file.size,
        uri: file.uri
      });

      const uploadResult = await StorageService.uploadDocument(
        blob,
        user.uid,
        file.name
      );

      if (uploadResult.success) {
        // Save file record to database
        try {
          const fileRecord = {
            fileName: file.name,
            originalName: file.name,
            fileUrl: uploadResult.url!,
            fileSize: file.size || 0,
            fileType: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            userId: user.uid,
            status: 'uploaded' as const,
            description: 'Excel file imported via DatabaseScreen'
          };
          
          const savedFileId = await ImportedFilesService.saveImportedFile(fileRecord);
          console.log('File record saved with ID:', savedFileId);
          
          // Analyze Excel file for AI chat context
          try {
            console.log('🔍 Starting Excel analysis for AI context...');
            const analysis = await ExcelAnalysisService.analyzeExcelFile(uploadResult.url!, file.name);
            setCurrentDataAnalysis(analysis);
            console.log('✅ Excel analysis completed:', analysis.overallSummary);
          } catch (analysisError) {
            console.error('❌ Error analyzing Excel file:', analysisError);
            // Continue without analysis - chat will work without data context
          }
          
          // Refresh the imported files list
          await loadImportedFiles();
          
        } catch (saveError) {
          console.error('Error saving file record:', saveError);
          // Continue with the success flow even if saving record fails
        }
        
        Alert.alert(
          'File Uploaded Successfully',
          `File "${file.name}" has been uploaded and analyzed!\n\nYou can now ask questions about your data in the Query screen.`,
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'View Files', 
              onPress: () => {
                setShowImportedFiles(true);
              }
            }
          ]
        );
      } else {
        console.error('Upload error details:', uploadResult.error);
        Alert.alert(
          'Upload Failed', 
          `Firebase Storage: ${uploadResult.error || 'An unknown error occurred, please check the error payload for server response. (storage/unknown)'}`
        );
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to pick or upload document. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
  };

  const handleSave = async (index: number) => {
    if (!programs[index].noOfHouses.trim()) {
      setErrors((prev) => ({ ...prev, [index]: true }));
      Alert.alert('Validation Error', 'No. of Houses is required.');
      return;
    }
    setEditIndex(null);
    setErrors((prev) => ({ ...prev, [index]: false }));
    await saveRCMToFirestore(programs);
  };

  const handleChange = (index: number, field: string, value: string) => {
    setPrograms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if ((field === 'completed' || field === 'noOfHouses') && updated[index].noOfHouses && updated[index].completed) {
        const houses = parseInt(updated[index].noOfHouses, 10);
        const completed = parseInt(updated[index].completed, 10);
        if (!isNaN(houses) && houses > 0 && !isNaN(completed)) {
          updated[index].percentCompleted = ((completed / houses) * 100).toFixed(1) + '%';
        } else {
          updated[index].percentCompleted = '';
        }
      }
      if ((field === 'completed' || field === 'noOfHouses') && updated[index].noOfHouses && updated[index].completed) {
        const houses = parseInt(updated[index].noOfHouses, 10);
        const completed = parseInt(updated[index].completed, 10);
        if (!isNaN(houses) && !isNaN(completed)) {
          updated[index].remaining = (houses - completed).toString();
        } else {
          updated[index].remaining = '';
        }
      }
      return updated;
    });
  };

  const handleAddProgram = async () => {
    setPrograms((prev) => {
      const updated = [
        ...prev,
        { program: '', noOfHouses: '', completed: '', remaining: '', percentCompleted: '' },
      ];
      saveRCMToFirestore(updated);
      return updated;
    });
    setEditIndex(programs.length);
  };

  // Format file size function
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date function to handle Firestore Timestamps
  const formatDate = (date: any): string => {
    try {
      console.log('📅 Formatting date:', date, 'Type:', typeof date);
      let dateObj: Date;
      
      // Handle Firestore Timestamp
      if (date && typeof date.toDate === 'function') {
        console.log('📅 Using Firestore Timestamp toDate()');
        dateObj = date.toDate();
      }
      // Handle Firestore Timestamp with seconds
      else if (date && date.seconds) {
        dateObj = new Date(date.seconds * 1000);
      }
      // Handle regular Date object
      else if (date instanceof Date) {
        dateObj = date;
      }
      // Handle date string
      else if (typeof date === 'string') {
        dateObj = new Date(date);
      }
      // Handle timestamp number
      else if (typeof date === 'number') {
        dateObj = new Date(date);
      }
      else {
        return 'Unknown date';
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }

      // Format date with time
      return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Date error';
    }
  };

  const handleFileDeleted = (fileId: string) => {
    setImportedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Handle file deletion
  const handleDeleteFile = async (file: ImportedFile) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.originalName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (file.id) {
                await ImportedFilesService.deleteImportedFile(file.id);
                handleFileDeleted(file.id);
                Alert.alert('Success', 'File deleted successfully');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete file');
            }
          }
        }
      ]
    );
  };

  // Analyze an existing imported file for chat context
  const analyzeImportedFile = async (file: ImportedFile) => {
    try {
      console.log('🔍 Analyzing imported file for chat:', file.originalName);
      const analysis = await ExcelAnalysisService.analyzeExcelFile(file.fileUrl, file.originalName);
      setCurrentDataAnalysis(analysis);
      console.log('✅ Analysis completed for imported file');
      
      Alert.alert(
        'Data Loaded for Analysis',
        `File "${file.originalName}" is now ready for AI questions in the Query screen!`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('❌ Error analyzing imported file:', error);
      Alert.alert('Analysis Error', 'Could not analyze this file for AI chat.');
    }
  };

  return (
    <>
    <ScrollView style={styles.container}>
      {/* Import Section */}
      <View style={styles.importSection}>
        <Text style={styles.sectionTitle}>Import Data</Text>
        <Text style={styles.sectionDescription}>
          Import equipment and maintenance data from Excel files (.xlsx, .xls)
        </Text>
        
        <Pressable 
          style={styles.importButton} 
          onPress={handleImport}
          disabled={isImporting}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>
              {isImporting ? 'Uploading...' : '📁 Import Excel File'}
            </Text>
          </LinearGradient>
        </Pressable>
        
        <Text style={styles.fileTypeInfo}>
          Supported formats: .xlsx, .xls
        </Text>
      </View>

      {/* Imported Files Section */}
      <Pressable 
        style={styles.importedFilesButton} 
        onPress={() => setShowImportedFiles((prev) => !prev)}
      >
        <LinearGradient
          colors={['#FF9800', '#F57C00']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>
            📂 My Imported Files ({importedFiles.length})
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Imported Files List */}
      {showImportedFiles && (
        <View style={styles.importedFilesSection}>
          <Text style={styles.sectionTitle}>Your Imported Files</Text>
          
          {loadingFiles ? (
            <Text style={styles.loadingText}>Loading files...</Text>
          ) : importedFiles.length === 0 ? (
            <View style={styles.emptyFilesContainer}>
              <Text style={styles.emptyFilesText}>
                No imported files found. Upload an Excel file to get started!
              </Text>
            </View>
          ) : (
            <View style={styles.filesTable}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>File Name</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Size</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Action</Text>
              </View>
              
              {/* Table Rows */}
              {importedFiles.map((file) => (
                <View key={file.id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.originalName}
                    </Text>
                    <Text style={styles.fileDate}>
                      {formatDate(file.uploadedAt)}
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileSize}>
                      {formatFileSize(file.fileSize)}
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Pressable 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteFile(file)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* RCM Button */}
      <Pressable style={styles.rcmButton} onPress={() => setShowRCM((prev) => !prev)}>
        <LinearGradient
          colors={['#1976D2', '#64B5F6']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>Reliability Centered Maintenance (RCM)</Text>
        </LinearGradient>
      </Pressable>

      {/* RCM Table */}
      {showRCM && (
        loadingRCM ? (
          <Text style={{ textAlign: 'center', marginTop: spacing.large, fontSize: fontSize.large, color: '#666' }}>Loading...</Text>
        ) : (
          <ResponsiveTable
            columns={[
              { key: 'program', title: 'Program', width: 140 },
              { key: 'noOfHouses', title: 'No. of Houses', width: 120, required: true },
              { key: 'completed', title: 'Completed', width: 100 },
              { key: 'remaining', title: 'Remaining', width: 100 },
              { key: 'percentCompleted', title: '% Completed', width: 120 }
            ]}
            data={programs}
            editIndex={editIndex}
            errors={errors}
            onEdit={handleEdit}
            onSave={handleSave}
            onChange={handleChange}
            onAddRow={handleAddProgram}
            isLoading={loadingRCM}
          />
        )
      )}

    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F3',
    padding: spacing.large,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  title: {
    fontSize: fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  text: {
    fontSize: fontSize.large,
    textAlign: 'center',
    color: '#555',
    marginBottom: spacing.huge,
  },
  importSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.xLarge,
    padding: isSmallDevice() ? spacing.large : spacing.xxLarge,
    marginTop: spacing.large,
    ...getShadow(4),
  },
  sectionTitle: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.small,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: fontSize.medium,
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing.xxLarge,
    lineHeight: spacing.large + 4,
  },
  importButton: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...getShadow(6),
  },
  buttonGradient: {
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xxxLarge,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: fontSize.large,
  },
  fileTypeInfo: {
    fontSize: fontSize.small,
    color: '#888',
    textAlign: 'center',
    marginTop: spacing.medium,
    fontStyle: 'italic',
  },

  importedFilesButton: {
    marginTop: spacing.large,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...getShadow(6),
  },
  importedFilesSection: {
    marginTop: spacing.large,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.xLarge,
    padding: spacing.medium,
    ...getShadow(4),
    maxHeight: isSmallDevice() ? 400 : 500,
  },
  rcmButton: {
    marginTop: spacing.large,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    ...getShadow(6),
  },
  loadingText: {
    textAlign: 'center',
    fontSize: fontSize.medium,
    color: '#666',
    marginTop: spacing.large,
  },
  emptyFilesContainer: {
    padding: spacing.large,
    alignItems: 'center',
  },
  emptyFilesText: {
    fontSize: fontSize.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: fontSize.medium + 4,
  },
  filesTable: {
    marginTop: spacing.medium,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.medium,
    borderTopLeftRadius: borderRadius.medium,
    borderTopRightRadius: borderRadius.medium,
  },
  tableHeaderText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: fontSize.medium,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  fileName: {
    fontSize: fontSize.medium,
    color: '#333',
    fontWeight: '600',
  },
  fileDate: {
    fontSize: fontSize.small,
    color: '#666',
    marginTop: 2,
  },
  fileSize: {
    fontSize: fontSize.medium,
    color: '#666',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.small,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: fontSize.small,
    fontWeight: '600',
  },

});
