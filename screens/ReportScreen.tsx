import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, RefreshControl, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebaseConfig';
import DashboardStorageService, { StoredDashboard } from '../services/dashboardStorageService';
import ImportedFilesService from '../services/importedFilesService';
import DashboardCharts from '../components/DashboardCharts';
import { useUser } from '../contexts/UserContext';
import { getUserID } from '../utils/userUtils';
import { spacing, fontSize, isTablet, borderRadius, getShadow } from '../utils/responsive';

export default function ReportsScreen() {
  const { user, isAdminCreatedUser } = useUser();
  const [dashboards, setDashboards] = useState<StoredDashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<StoredDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load user dashboards
  const loadDashboards = async () => {
    try {
      if (!user) return;
      
      const userId = getUserID(user, isAdminCreatedUser);
      if (!userId) return;

      console.log('📊 Loading user dashboards...');
      
      // Try to get user dashboards directly - if this fails, we'll handle it gracefully
      let userDashboards: StoredDashboard[] = [];
      try {
        userDashboards = await DashboardStorageService.getUserDashboards(userId);
        console.log('✅ Successfully loaded user dashboards');
      } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          console.log('ℹ️ No permission to access dashboards - showing empty state');
          setDashboards([]);
          setLoading(false);
          setRefreshing(false);
          return;
        } else {
          console.warn('⚠️ Error loading dashboards (continuing with empty state):', error.message);
          userDashboards = [];
        }
      }
      
             // Clean up orphaned dashboards (files that no longer exist)
       const cleanedDashboards = [];
       const orphanedDashboards = [];
       
               for (const dashboard of userDashboards) {
          try {
            // Check if the file still exists
            const fileExists = await ImportedFilesService.fileExists(dashboard.fileId);
            if (fileExists) {
              cleanedDashboards.push(dashboard);
            } else {
              console.log('🗑️ Found orphaned dashboard for deleted file:', dashboard.fileName);
              orphanedDashboards.push(dashboard);
            }
          } catch (error: any) {
            // Handle permission errors gracefully
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
              console.warn('⚠️ Permission denied when checking file existence for dashboard:', dashboard.fileName);
              // If we can't check due to permissions, keep the dashboard to be safe
              cleanedDashboards.push(dashboard);
            } else {
              console.error('❌ Error checking file existence for dashboard:', dashboard.fileName, error);
              // For other errors, also keep the dashboard to be safe
              cleanedDashboards.push(dashboard);
            }
          }
        }
       
               // Try to delete orphaned dashboards (but don't fail if we can't)
        if (orphanedDashboards.length > 0) {
          console.log(`🗑️ Found ${orphanedDashboards.length} potentially orphaned dashboards`);
          
          // Only attempt cleanup if we have permission to access files
          const hasFileAccess = await ImportedFilesService.canAccessImportedFilesCollection();
          if (!hasFileAccess) {
            console.log('ℹ️ No permission to access files - skipping orphaned dashboard cleanup');
          }
          
          if (hasFileAccess) {
            console.log('🗑️ Attempting to clean up orphaned dashboards...');
            for (const dashboard of orphanedDashboards) {
              if (dashboard.id) {
                try {
                  const canDelete = await DashboardStorageService.canDeleteDashboard(dashboard.id);
                  if (canDelete) {
                    await DashboardStorageService.deleteDashboard(dashboard.id);
                    console.log('✅ Orphaned dashboard deleted:', dashboard.fileName);
                  } else {
                    console.log('ℹ️ Dashboard cannot be deleted due to permissions:', dashboard.fileName);
                  }
                } catch (deleteError: any) {
                  if (deleteError.code === 'permission-denied' || deleteError.message?.includes('permission')) {
                    console.warn('⚠️ Permission denied for dashboard (this is normal):', dashboard.fileName);
                  } else {
                    console.error('❌ Error deleting orphaned dashboard:', dashboard.fileName, deleteError);
                  }
                }
              }
            }
          } else {
            // If we don't have file access, just keep all dashboards
            console.log('ℹ️ Keeping all dashboards due to permission restrictions');
            cleanedDashboards.push(...orphanedDashboards);
          }
        }
      
      setDashboards(cleanedDashboards);
      
      // Auto-select first dashboard if available
      if (cleanedDashboards.length > 0 && !selectedDashboard) {
        setSelectedDashboard(cleanedDashboards[0]);
        // Record view
        if (cleanedDashboards[0].id) {
          await DashboardStorageService.recordDashboardView(cleanedDashboards[0].id);
        }
      }

      console.log('✅ Loaded', cleanedDashboards.length, 'dashboards (cleaned up', userDashboards.length - cleanedDashboards.length, 'orphaned)');
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

  // Force refresh dashboards (can be called from other screens)
  const forceRefreshDashboards = () => {
    console.log('🔄 Force refreshing dashboards...');
    setLoading(true);
    setSelectedDashboard(null);
    loadDashboards();
  };

  // Refresh dashboards when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ReportScreen focused, refreshing dashboards...');
      loadDashboards();
    }, [])
  );

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
          <Text style={[styles.emptySubtext, { marginTop: spacing.medium, fontStyle: 'italic' }]}>
            Note: If you recently deleted files, dashboards may take a moment to update.
          </Text>
          <Text style={[styles.emptySubtext, { marginTop: spacing.medium, fontStyle: 'italic', color: '#d97706' }]}>
            💡 Upload Excel files in the Database tab to generate dashboards with charts and graphs.
          </Text>
        </View>
      </ScrollView>
    );
  }

    return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dashboard Content */}
        {selectedDashboard ? (
          <View style={styles.dashboardContent}>
            <View style={styles.dashboardHeader}>
              <View style={styles.dashboardHeaderContent}>
                <Text style={styles.dashboardHeaderTitle}>
                  📊 {selectedDashboard.fileName.replace(/\.[^/.]+$/, '')}
                </Text>
              </View>
            </View>
            <DashboardCharts dashboardData={selectedDashboard.dashboardData} />
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Select a dashboard to view</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.huge,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet() ? spacing.xLarge : spacing.large,
    minHeight: 200,
  },
  loadingText: {
    fontSize: isTablet() ? fontSize.xLarge : fontSize.large,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: spacing.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet() ? spacing.huge : spacing.xLarge,
    paddingBottom: isTablet() ? spacing.huge + spacing.large : spacing.huge * 2.5,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: isTablet() ? fontSize.huge : fontSize.xxxLarge,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.medium,
    textAlign: 'center',
    paddingHorizontal: spacing.medium,
  },
  emptyText: {
    fontSize: isTablet() ? fontSize.xLarge : fontSize.large,
    textAlign: 'center',
    color: '#374151',
    lineHeight: isTablet() ? fontSize.xLarge + 8 : fontSize.large + 8,
    marginBottom: spacing.large,
    paddingHorizontal: spacing.medium,
  },
  emptySubtext: {
    fontSize: isTablet() ? fontSize.large : fontSize.medium,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: isTablet() ? fontSize.large + 6 : fontSize.medium + 6,
    paddingHorizontal: spacing.medium,
  },

  dashboardContent: {
    flex: 1,
  },
  dashboardHeader: {
    backgroundColor: '#3b82f6',
    padding: isTablet() ? spacing.xLarge : spacing.large,
    margin: isTablet() ? spacing.large : spacing.medium,
    marginTop: isTablet() ? spacing.xLarge : spacing.large,
    borderRadius: borderRadius.large,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...getShadow(6),
    elevation: isTablet() ? 8 : 6,
  },
  dashboardHeaderContent: {
    flex: 1,
  },
  dashboardHeaderTitle: {
    fontSize: isTablet() ? fontSize.xxxLarge : fontSize.xLarge,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: spacing.tiny,
    textAlign: 'center',
    flex: 1,
  },


});
