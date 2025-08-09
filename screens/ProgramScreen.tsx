import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-chart-kit';
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

  // PowerBI-style chart data
  const getChartData = (program: ProgramRow) => {
    const houses = Number(program.noOfHouses) || 0;
    const completed = Number(program.completed) || 0;
    const remaining = Number(program.remaining) || 0;
    
    return {
      barData: {
        labels: ['Houses', 'Completed', 'Remaining'],
        datasets: [{
          data: [houses, completed, remaining]
        }]
      },
      pieData: [
        {
          name: 'Completed',
          count: completed,
          color: '#22c55e', // Green
          legendFontColor: '#374151',
          legendFontSize: fontSize.small,
        },
        {
          name: 'Remaining',
          count: remaining,
          color: '#ef4444', // Red
          legendFontColor: '#374151',
          legendFontSize: fontSize.small,
        }
      ],
      values: { houses, completed, remaining }
    };
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#f8fafc',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue
    labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
    style: {
      borderRadius: borderRadius.medium,
    },
    propsForLabels: {
      fontSize: fontSize.small,
      fontWeight: '600',
    },
  };

  const screenWidth = Dimensions.get('window').width;

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
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedProgram?.program}</Text>
              <Text style={styles.modalSubtitle}>Program Analytics Dashboard</Text>
            </LinearGradient>
            
            {/* PowerBI-style charts */}
            {selectedProgram && (
              <ScrollView style={styles.chartScrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Statistics Cards Row */}
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{getChartData(selectedProgram).values.houses}</Text>
                    <Text style={styles.statLabel}>Total Houses</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{getChartData(selectedProgram).values.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{getChartData(selectedProgram).values.remaining}</Text>
                    <Text style={styles.statLabel}>Remaining</Text>
                  </View>
                </View>

                {/* Bar Chart Card */}
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>📊 Program Progress Overview</Text>
                  <View style={styles.chartWrapper}>
                    <BarChart
                      data={getChartData(selectedProgram).barData}
                      width={screenWidth - 120}
                      height={200}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      fromZero={true}
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </View>
                </View>

                {/* Pie Chart Card for Completion Status */}
                {(getChartData(selectedProgram).values.completed > 0 || getChartData(selectedProgram).values.remaining > 0) && (
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>🎯 Completion Status</Text>
                    <View style={styles.chartWrapper}>
                      <PieChart
                        data={getChartData(selectedProgram).pieData}
                        width={screenWidth - 120}
                        height={200}
                        chartConfig={chartConfig}
                        accessor="count"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        style={styles.chart}
                      />
                    </View>
                  </View>
                )}

                {/* Progress Summary Card */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>📈 Progress Summary</Text>
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>Completion Rate</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${getChartData(selectedProgram).values.houses > 0 
                              ? (getChartData(selectedProgram).values.completed / getChartData(selectedProgram).values.houses) * 100 
                              : 0}%` 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {getChartData(selectedProgram).values.houses > 0 
                        ? Math.round((getChartData(selectedProgram).values.completed / getChartData(selectedProgram).values.houses) * 100)
                        : 0}%
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
            
            {/* Close Button */}
            <View style={styles.closeButtonContainer}>
              <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.closeButtonGradient}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: spacing.large,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  title: {
    fontSize: fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.large,
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginTop: spacing.medium,
    ...getShadow(6),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginBottom: spacing.small,
  },
  tableHeaderCell: {
    fontSize: fontSize.medium,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.small,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: spacing.medium,
    minHeight: isSmallDevice() ? 44 : 50,
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: borderRadius.small,
    marginVertical: 2,
  },
  tableCell: {
    fontSize: fontSize.large,
    color: '#3b82f6',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: spacing.tiny,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.medium,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.large,
    width: '100%',
    maxWidth: isTablet() ? 600 : screenDimensions.width * 0.95,
    height: '90%',
    ...getShadow(12),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalHeader: {
    padding: spacing.large,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: fontSize.xxLarge,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: spacing.small,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalSubtitle: {
    fontSize: fontSize.medium,
    color: '#e2e8f0',
    textAlign: 'center',
    fontWeight: '500',
  },
  chartScrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.large,
    paddingBottom: spacing.xxxLarge,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.large,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.medium,
    padding: spacing.medium,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.tiny,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...getShadow(4),
  },
  statValue: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: spacing.tiny,
  },
  statLabel: {
    fontSize: fontSize.small,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.large,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...getShadow(6),
  },
  chartTitle: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: spacing.medium,
  },
  chart: {
    marginVertical: spacing.small,
    borderRadius: borderRadius.medium,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    overflow: 'hidden',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.large,
    padding: spacing.large,
    marginBottom: spacing.large,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...getShadow(6),
  },
  summaryTitle: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: fontSize.medium,
    color: '#6b7280',
    marginBottom: spacing.small,
    fontWeight: '600',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: borderRadius.small,
    width: '100%',
    overflow: 'hidden',
    marginBottom: spacing.small,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: borderRadius.small,
  },
  progressPercentage: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  closeButtonContainer: {
    padding: spacing.medium,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: borderRadius.large,
    borderBottomRightRadius: borderRadius.large,
  },
  closeButton: {
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