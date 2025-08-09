import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow,
  isSmallDevice,
  isTablet,
  screenDimensions
} from '../utils/responsive';

interface ProgramRow {
  program: string;
  noOfHouses?: string;
  completed?: string;
  remaining?: string;
  percentCompleted?: string;
}

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
          <Pressable key={`program-${idx}-${row.program}`} onPress={() => handleRowPress(row)}>
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
    padding: spacing.large,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  title: {
    fontSize: fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.large,
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginTop: spacing.medium,
    ...getShadow(4),
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: spacing.small,
  },
  tableHeaderCell: {
    fontSize: fontSize.medium,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.small,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: spacing.medium,
    minHeight: isSmallDevice() ? 44 : 50,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: fontSize.large,
    color: '#2E7D32',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: spacing.tiny,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.large,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.large,
    padding: spacing.xxxLarge,
    width: '100%',
    maxWidth: isTablet() ? 500 : screenDimensions.width * 0.9,
    alignItems: 'center',
    ...getShadow(8),
  },
  modalTitle: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  chartContainer: {
    width: '100%',
    marginVertical: spacing.large,
  },
  chartTitle: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: spacing.large,
  },
  barContainer: {
    marginBottom: spacing.large,
    width: '100%',
  },
  barLabel: {
    fontSize: fontSize.medium,
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing.tiny,
  },
  barBackground: {
    height: isSmallDevice() ? 18 : 22,
    backgroundColor: '#E0E0E0',
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: borderRadius.medium,
  },
  barValue: {
    fontSize: fontSize.small,
    color: '#666',
    marginTop: spacing.tiny,
    textAlign: 'right',
  },
  closeButton: {
    marginTop: spacing.medium,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
    ...getShadow(4),
  },
  closeButtonGradient: {
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.xxxLarge,
    alignItems: 'center',
    minHeight: isSmallDevice() ? 44 : 48,
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: fontSize.medium,
  },
});

export default ProgramScreen;