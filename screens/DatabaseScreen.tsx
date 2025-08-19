import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import StorageService from '../services/storageService';
import ImportedFilesService, { ImportedFile } from '../services/importedFilesService';
import { ExcelAnalysisService, ExcelAnalysis } from '../services/excelAnalysisService';
import ChartDataService from '../services/chartDataService';
import DashboardStorageService from '../services/dashboardStorageService';
import ResponsiveTable from '../components/ResponsiveTable';
import CustomHeader from '../components/CustomHeader';

import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserID } from '../utils/userUtils';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  isSmallDevice,
  isTablet
} from '../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

const initialPrograms: Array<{ program: string; noOfHouses: string; completed: string; remaining: string; percentCompleted: string }> = [];

export default function DatabaseScreen() {
  const { user, isAdminCreatedUser, isAuthenticated } = useUser();
  const { isUserDarkMode } = useTheme();
  const [isImporting, setIsImporting] = useState(false);
  const [showRCM, setShowRCM] = useState(false);
  const [programs, setPrograms] = useState<Array<{ program: string; noOfHouses: string; completed: string; remaining: string; percentCompleted: string }>>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ [key: number]: boolean }>({});
  const [loadingRCM, setLoadingRCM] = useState(false);
  const [greeting, setGreeting] = useState<string>('');

  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [showImportedFiles, setShowImportedFiles] = useState(false);
  const [currentDataAnalysis, setCurrentDataAnalysis] = useState<ExcelAnalysis | null>(null);

  // Set greeting when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated && isAdminCreatedUser) {
      // Get user data from context or user object
      const userName = user.fullName || 'User';
      setGreeting(`Hello ${userName}!`);
    } else {
      setGreeting('');
    }
  }, [user, isAuthenticated, isAdminCreatedUser]);

  // Load RCM data from Firestore when RCM is shown
  useEffect(() => {
    const fetchRCM = async () => {
      if (!showRCM || !user || !isAuthenticated) return;
      setLoadingRCM(true);
      try {
        const userId = getUserID(user, isAdminCreatedUser);
        if (!userId) return;
        const docRef = doc(db, 'rcmPrograms', userId);
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
  }, [showRCM, user, isAuthenticated]);

  // Load imported files when component mounts
  useEffect(() => {
    // Only load files if user is authenticated
    if (user && isAuthenticated) {
      loadImportedFiles();
    }
  }, [user, isAuthenticated]);

  const loadImportedFiles = async () => {
    try {
      setLoadingFiles(true);
      if (!user || !isAuthenticated) return;
      
      const userId = getUserID(user, isAdminCreatedUser);
      if (!userId) return;
      
      const files = await ImportedFilesService.getUserImportedFiles(userId);
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
      if (!user || !isAuthenticated) return;
      
      const userId = getUserID(user, isAdminCreatedUser);
      if (!userId) return;
      
      const docRef = doc(db, 'rcmPrograms', userId);
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
      if (!user || !isAuthenticated) {
        Alert.alert('Error', 'Please login to upload files.');
        return;
      }
      
      const userId = getUserID(user, isAdminCreatedUser);
      if (!userId) {
        Alert.alert('Error', 'Unable to identify user. Please try logging in again.');
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
        userId,
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
            userId: userId,
            status: 'uploaded' as const,
            description: 'Excel file imported via DatabaseScreen'
          };
          
          const savedFileId = await ImportedFilesService.saveImportedFile(fileRecord);
          console.log('File record saved with ID:', savedFileId);
          
          // Analyze Excel file for AI chat context and generate dashboard
          try {
            console.log('🔍 Starting Excel analysis for AI context...');
            const analysis = await ExcelAnalysisService.analyzeExcelFile(uploadResult.url!, file.name);
            setCurrentDataAnalysis(analysis);
            console.log('✅ Excel analysis completed:', analysis.summary);
            
            // Generate dashboard charts from Excel data
            try {
              console.log('📊 Generating dashboard charts...');
              
              console.log('🔄 Starting dashboard data generation...');
              const dashboardData = await ChartDataService.generateDashboardData(
                savedFileId,
                file.name,
                uploadResult.url!,
                analysis
              );
              
              console.log('🔄 Saving dashboard to Firestore...');
              // Save dashboard to Firestore
              try {
                const dashboardId = await DashboardStorageService.saveDashboard(
                  savedFileId,
                  file.name,
                  userId,
                  dashboardData
                );
                              console.log('✅ Dashboard generated and saved successfully with ID:', dashboardId);
              
              // Verify dashboard was created
              const dashboardExists = await DashboardStorageService.dashboardExistsForFile(savedFileId);
              console.log('🔍 Dashboard verification:', dashboardExists ? '✅ Found' : '❌ Not found');
              
              // Get total dashboard count for user
              const dashboardCount = await DashboardStorageService.getUserDashboardCount(userId);
              console.log('📊 Total dashboards for user:', dashboardCount);
            } catch (saveError: any) {
              console.error('❌ Error saving dashboard to Firestore:', saveError);
              if (saveError.code === 'permission-denied' || saveError.message?.includes('permission')) {
                console.warn('⚠️ Permission denied when saving dashboard (checking Firestore rules)');
              }
              // Continue without dashboard - file upload was successful
            }
            } catch (dashboardError: any) {
              console.error('❌ Error generating dashboard data:', dashboardError);
              console.error('❌ Dashboard error details:', dashboardError?.message || 'Unknown error');
              console.error('❌ Dashboard error stack:', dashboardError?.stack || 'No stack trace');
              // Continue without dashboard - file upload was successful
            }
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
          `File "${file.name}" has been uploaded and analyzed!\n\n✅ Dashboard with charts generated\n✅ AI chat context ready\n\nView your dashboard in the Reports screen or ask questions in the Query screen.`,
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
                // First, try to delete the corresponding dashboard
                console.log('🗑️ Attempting to delete dashboard for file:', file.originalName);
                try {
                  // Check if we have access to dashboard collection first
                  const canAccess = await DashboardStorageService.canAccessDashboardCollection();
                  if (canAccess) {
                    const dashboardDeleted = await DashboardStorageService.deleteDashboardByFileId(file.id);
                    if (dashboardDeleted) {
                      console.log('✅ Dashboard deleted successfully');
                    } else {
                      console.log('ℹ️ No dashboard found to delete for this file');
                    }
                  } else {
                    console.log('ℹ️ No access to dashboard collection - skipping dashboard cleanup');
                  }
                } catch (dashboardError) {
                  console.warn('⚠️ Could not delete dashboard (this is normal for new files):', dashboardError);
                  // Continue with file deletion even if dashboard deletion fails
                }
                
                // Then delete the imported file
                await ImportedFilesService.deleteImportedFile(file.id);
                handleFileDeleted(file.id);
                
                Alert.alert(
                  'Success', 
                  `File "${file.originalName}" and its dashboard have been deleted successfully`
                );
              }
            } catch (error) {
              console.error('❌ Error deleting file and dashboard:', error);
              Alert.alert('Error', 'Failed to delete file and dashboard');
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

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isUserDarkMode ? "#121212" : "#F0F4F3",
    },
    scrollContainer: {
      backgroundColor: isUserDarkMode ? "#121212" : "#F0F4F3",
    },
    scrollContent: {
      backgroundColor: isUserDarkMode ? "#121212" : "#F0F4F3",
    },
    importSection: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#FFFFFF",
    },
    sectionTitle: {
      color: isUserDarkMode ? "#FFFFFF" : "#333",
    },
    sectionDescription: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    },
    fileTypeInfo: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    },
    importedFilesSection: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#FFFFFF",
    },
    tableHeader: {
      backgroundColor: isUserDarkMode ? "#2D2D2D" : "#F8F9FA",
    },
    tableHeaderText: {
      color: isUserDarkMode ? "#FFFFFF" : "#333",
    },
    tableRow: {
      backgroundColor: isUserDarkMode ? "#2D2D2D" : "#FFFFFF",
      borderBottomColor: isUserDarkMode ? "#404040" : "#E0E0E0",
    },
    fileName: {
      color: isUserDarkMode ? "#FFFFFF" : "#333",
    },
    fileDate: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    },
    fileSize: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    },
    loadingText: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    },
    emptyFilesText: {
      color: isUserDarkMode ? "#B0B0B0" : "#666",
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <CustomHeader showLogo={true} isDatabaseScreen={true} greeting={greeting} />
      
      <ScrollView 
        style={[styles.scrollContainer, dynamicStyles.scrollContainer]} 
        contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Import Data Section */}
        <View style={[styles.importSection, dynamicStyles.importSection]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Import Data</Text>
          <Text style={[styles.sectionDescription, dynamicStyles.sectionDescription]}>
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
          
          <Text style={[styles.fileTypeInfo, dynamicStyles.fileTypeInfo]}>Supported formats: .xlsx, .xls</Text>
        </View>

        {/* My Imported Files Button */}
        <Pressable 
          style={styles.importedFilesButton} 
          onPress={() => setShowImportedFiles((prev) => !prev)}
        >
          <LinearGradient
            colors={['#1FB515', '#118509', '#0F6C08']}
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
          <View style={[styles.importedFilesSection, dynamicStyles.importedFilesSection]}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Your Imported Files</Text>
            
            {loadingFiles ? (
              <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading files...</Text>
            ) : importedFiles.length === 0 ? (
              <View style={styles.emptyFilesContainer}>
                <Text style={[styles.emptyFilesText, dynamicStyles.emptyFilesText]}>
                  No imported files found. Upload an Excel file to get started!
                </Text>
              </View>
            ) : (
              <View style={styles.filesTable}>
                {/* Table Header */}
                <View style={[styles.tableHeader, dynamicStyles.tableHeader]}>
                  <Text style={[styles.tableHeaderText, dynamicStyles.tableHeaderText, { flex: 2 }]}>File Name</Text>
                  <Text style={[styles.tableHeaderText, dynamicStyles.tableHeaderText, { flex: 1 }]}>Size</Text>
                  <Text style={[styles.tableHeaderText, dynamicStyles.tableHeaderText, { flex: 1 }]}>Action</Text>
                </View>
                
                {/* Table Rows */}
                {importedFiles.map((file) => (
                  <View key={file.id} style={[styles.tableRow, dynamicStyles.tableRow]}>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.fileName, dynamicStyles.fileName]} numberOfLines={1}>
                        {file.originalName}
                      </Text>
                      <Text style={[styles.fileDate, dynamicStyles.fileDate]}>
                        {formatDate(file.uploadedAt)}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fileSize, dynamicStyles.fileSize]}>
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
            <Text style={styles.loadingText}>Loading...</Text>
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

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E2EBDD',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 140 : 120,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  importSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  importButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  fileTypeInfo: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  importedFilesButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  importedFilesSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: isSmallDevice() ? 400 : 500,
    borderWidth: 0,
  },
  rcmButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 18,
    color: '#666',
  },
  emptyFilesContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyFilesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  filesTable: {
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableHeaderText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  fileDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },

});
