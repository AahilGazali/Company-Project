import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { auth } from '../firebaseConfig';
import DashboardStorageService, { StoredDashboard } from '../services/dashboardStorageService';
import DashboardCharts from '../components/DashboardCharts';
import { spacing, fontSize, isTablet, borderRadius, getShadow } from '../utils/responsive';

export default function ReportsScreen() {
  const [dashboards, setDashboards] = useState<StoredDashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<StoredDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load user dashboards
  const loadDashboards = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('📊 Loading user dashboards...');
      const userDashboards = await DashboardStorageService.getUserDashboards(user.uid);
      setDashboards(userDashboards);
      
      // Auto-select first dashboard if available
      if (userDashboards.length > 0 && !selectedDashboard) {
        setSelectedDashboard(userDashboards[0]);
        // Record view
        if (userDashboards[0].id) {
          await DashboardStorageService.recordDashboardView(userDashboards[0].id);
        }
      }

      console.log('✅ Loaded', userDashboards.length, 'dashboards');
    } catch (error) {
      console.error('❌ Error loading dashboards:', error);
      Alert.alert('Error', 'Failed to load dashboards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle dashboard selection
  const handleDashboardSelect = async (dashboard: StoredDashboard) => {
    setSelectedDashboard(dashboard);
    
    // Record view
    if (dashboard.id) {
      await DashboardStorageService.recordDashboardView(dashboard.id);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboards();
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading dashboards...</Text>
      </View>
    );
  }

  if (dashboards.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Dashboards Available</Text>
          <Text style={styles.emptyText}>
            Import Excel files in the Database screen to generate dashboards with graphs and charts.
          </Text>
          <Text style={styles.emptySubtext}>
            Your dashboards will show:
            {'\n'}• Location-based analysis
            {'\n'}• Action/task distributions
            {'\n'}• MMT number insights
            {'\n'}• Timeline trends
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dashboard Selection */}
      {dashboards.length > 1 && (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Select Dashboard:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
            {dashboards.map((dashboard) => (
              <Pressable
                key={dashboard.id}
                style={[
                  styles.dashboardTab,
                  selectedDashboard?.id === dashboard.id && styles.dashboardTabActive
                ]}
                onPress={() => handleDashboardSelect(dashboard)}
              >
                <Text style={[
                  styles.dashboardTabText,
                  selectedDashboard?.id === dashboard.id && styles.dashboardTabTextActive
                ]}>
                  {dashboard.fileName.replace(/\.[^/.]+$/, '')}
                </Text>
                <Text style={styles.dashboardTabDate}>
                  {DashboardStorageService.formatCreationDate(dashboard.createdAt)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Dashboard Content */}
      {selectedDashboard ? (
        <DashboardCharts dashboardData={selectedDashboard.dashboardData} />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Select a dashboard to view</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  loadingText: {
    fontSize: fontSize.large,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xLarge,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
  },
  emptyTitle: {
    fontSize: fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.large,
    textAlign: 'center',
    color: '#374151',
    lineHeight: fontSize.large + 8,
    marginBottom: spacing.large,
  },
  emptySubtext: {
    fontSize: fontSize.medium,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: fontSize.medium + 6,
  },
  selectorContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...getShadow(2),
  },
  selectorTitle: {
    fontSize: fontSize.medium,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.small,
  },
  selectorScroll: {
    flexDirection: 'row',
  },
  dashboardTab: {
    backgroundColor: '#f8fafc',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    marginRight: spacing.small,
    borderRadius: borderRadius.medium,
    minWidth: 120,
    alignItems: 'center',
    ...getShadow(2),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dashboardTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    ...getShadow(4),
  },
  dashboardTabText: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  dashboardTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dashboardTabDate: {
    fontSize: fontSize.xSmall,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
});
