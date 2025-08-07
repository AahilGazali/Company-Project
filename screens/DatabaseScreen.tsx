import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import StorageService from '../services/storageService';

const initialPrograms: Array<{ program: string; noOfHouses: string; completed: string; remaining: string; percentCompleted: string }> = [];

export default function DatabaseScreen() {
  const [isImporting, setIsImporting] = useState(false);
  const [showRCM, setShowRCM] = useState(false);
  const [programs, setPrograms] = useState<Array<{ program: string; noOfHouses: string; completed: string; remaining: string; percentCompleted: string }>>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ [key: number]: boolean }>({});
  const [loadingRCM, setLoadingRCM] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

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
        setUploadedFiles(prev => [...prev, uploadResult.url!]);
        Alert.alert(
          'File Uploaded Successfully',
          `File "${file.name}" has been uploaded to Firebase Storage.\n\nDownload URL: ${uploadResult.url}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Process Data', 
              onPress: () => {
                // Here you can add logic to process the Excel data
                Alert.alert('Success', 'Excel data processed successfully!');
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

  return (
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

        {/* Show uploaded files */}
        {uploadedFiles.length > 0 && (
          <View style={styles.uploadedFilesContainer}>
            <Text style={styles.uploadedFilesTitle}>Uploaded Files:</Text>
            {uploadedFiles.map((url, index) => (
              <Text key={index} style={styles.uploadedFileUrl}>
                File {index + 1}: {url.substring(0, 50)}...
              </Text>
            ))}
          </View>
        )}
      </View>

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
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
        ) : (
          <ScrollView horizontal style={styles.tableScroll}>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.tableBorder]}>Program</Text>
                <Text style={[styles.tableHeaderCell, styles.tableBorder]}>No. of Houses<Text style={{color:'red'}}>*</Text></Text>
                <Text style={[styles.tableHeaderCell, styles.tableBorder]}>Completed</Text>
                <Text style={[styles.tableHeaderCell, styles.tableBorder]}>Remaining</Text>
                <Text style={[styles.tableHeaderCell, styles.tableBorder]}>% Completed</Text>
                <Text style={styles.tableHeaderCell}>Edit</Text>
              </View>
               {programs.map((row, idx) => (
                   <View style={styles.tableRow} key={idx}>
                     {editIndex === idx ? (
                       <TextInput
                         style={[styles.tableInput, styles.tableBorder]}
                         value={row.program}
                         onChangeText={(val) => handleChange(idx, 'program', val)}
                         placeholder="Program Name"
                       />
                     ) : (
                       <Text style={[styles.tableCell, styles.tableBorder]}>{row.program}</Text>
                     )}
                     {editIndex === idx ? (
                       <TextInput
                         style={[styles.tableInput, styles.tableBorder, errors[idx] && { borderColor: 'red' }]}
                         value={row.noOfHouses}
                         onChangeText={(val) => handleChange(idx, 'noOfHouses', val)}
                         keyboardType="numeric"
                         placeholder="Required"
                       />
                     ) : (
                       <Text style={[styles.tableCell, styles.tableBorder]}>{row.noOfHouses}</Text>
                     )}
                     {editIndex === idx ? (
                       <TextInput
                         style={[styles.tableInput, styles.tableBorder]}
                         value={row.completed}
                         onChangeText={(val) => handleChange(idx, 'completed', val)}
                         keyboardType="numeric"
                         placeholder="Completed"
                       />
                     ) : (
                       <Text style={[styles.tableCell, styles.tableBorder]}>{row.completed}</Text>
                     )}
                     <Text style={[styles.tableCell, styles.tableBorder]}>{row.remaining}</Text>
                     <Text style={[styles.tableCell, styles.tableBorder]}>{row.percentCompleted}</Text>
                     {editIndex === idx ? (
                       <Pressable style={styles.saveButton} onPress={() => handleSave(idx)}>
                         <Text style={styles.saveButtonText}>Save</Text>
                       </Pressable>
                     ) : (
                       <Pressable style={styles.editButton} onPress={() => handleEdit(idx)}>
                         <Text style={styles.editButtonText}>Edit</Text>
                       </Pressable>
                     )}
                   </View>
                 ))}
              <Pressable style={styles.addProgramButton} onPress={handleAddProgram}>
                <Text style={styles.addProgramButtonText}>+ Add Program</Text>
              </Pressable>
            </View>
          </ScrollView>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F3',
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 40,
  },
  importSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  importButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fileTypeInfo: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  uploadedFilesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  uploadedFilesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  uploadedFileUrl: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  rcmButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tableScroll: {
    marginTop: 20,
  },
  tableContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  tableInput: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  tableBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addProgramButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    alignItems: 'center',
  },
  addProgramButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

});
