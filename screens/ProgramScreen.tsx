import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgramRow {
  program: string;
  noOfHouses?: string;
  completed?: string;
  remaining?: string;
  percentCompleted?: string;
}

const screenWidth = Dimensions.get('window').width;

const ProgramScreen = () => {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const docRef = doc(db, 'rcmPrograms', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setPrograms(docSnap.data().programs || []);
      } else {
        setPrograms([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Only show programs with at least one filled data field
  const filledPrograms = programs.filter(
    (row) => row && row.program && (
      row.noOfHouses || row.completed || row.remaining || row.percentCompleted
    )
  );

  const handleRowPress = (program: ProgramRow) => {
    setSelectedProgram(program);
    setModalVisible(true);
  };

  // Simple chart data for placeholder
  const getChartData = (program: ProgramRow) => {
    const houses = Number(program.noOfHouses) || 0;
    const completed = Number(program.completed) || 0;
    const remaining = Number(program.remaining) || 0;
    const maxValue = Math.max(houses, completed, remaining);
    
    return {
      houses: { value: houses, percentage: maxValue > 0 ? (houses / maxValue) * 100 : 0 },
      completed: { value: completed, percentage: maxValue > 0 ? (completed / maxValue) * 100 : 0 },
      remaining: { value: remaining, percentage: maxValue > 0 ? (remaining / maxValue) * 100 : 0 }
    };
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Programs</Text>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Program</Text>
        </View>
        {filledPrograms.map((row, idx) => (
          <Pressable key={idx} onPress={() => handleRowPress(row)}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{row.program}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {/* Modal for program chart */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedProgram?.program}</Text>
            {/* Simple placeholder chart */}
            {selectedProgram && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Program Statistics</Text>
                
                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>No. of Houses</Text>
                  <View style={styles.barBackground}>
                    <View 
                      style={[
                        styles.barFill, 
                        { width: `${getChartData(selectedProgram).houses.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>{getChartData(selectedProgram).houses.value}</Text>
                </View>

                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>Completed</Text>
                  <View style={styles.barBackground}>
                    <View 
                      style={[
                        styles.barFill, 
                        { width: `${getChartData(selectedProgram).completed.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>{getChartData(selectedProgram).completed.value}</Text>
                </View>

                <View style={styles.barContainer}>
                  <Text style={styles.barLabel}>Remaining</Text>
                  <View style={styles.barBackground}>
                    <View 
                      style={[
                        styles.barFill, 
                        { width: `${getChartData(selectedProgram).remaining.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>{getChartData(selectedProgram).remaining.value}</Text>
                </View>
              </View>
            )}
            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.closeButtonGradient}>
                <Text style={styles.closeButtonText}>Close</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

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
    marginBottom: 20,
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
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
    paddingVertical: 12,
  },
  tableCell: {
    fontSize: 16,
    color: '#2E7D32',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  chartContainer: {
    width: '100%',
    marginVertical: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 20,
  },
  barContainer: {
    marginBottom: 16,
    width: '100%',
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  barBackground: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  barValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  closeButton: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProgramScreen;