"use client"
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useUser } from '../contexts/UserContext'
import { ImportedFilesService, ImportedFile } from '../services/importedFilesService'
import { DashboardStorageService, StoredDashboard } from '../services/dashboardStorageService'
import { ChartDataService, DashboardData } from '../services/chartDataService'
import { ExcelAnalysisService } from '../services/excelAnalysisService'
import { spacing, fontSize, borderRadius, isTablet } from '../utils/responsive'
import { useTheme } from '../contexts/ThemeContext'

export default function EquipmentMaintenanceData() {
  const { user, isAdminCreatedUser, isAuthenticated } = useUser()
  const { isUserDarkMode } = useTheme()
  
  const [latestFile, setLatestFile] = useState<ImportedFile | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const dynamicStyles = {
    container: {
      backgroundColor: isUserDarkMode ? "#121212" : "#ffffff",
    },
    card: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#ffffff",
      borderColor: isUserDarkMode ? "#374151" : "#e5e7eb",
    },
    title: {
      color: isUserDarkMode ? "#ffffff" : "#1f2937",
    },
    subtitle: {
      color: isUserDarkMode ? "#d1d5db" : "#6b7280",
    },
    text: {
      color: isUserDarkMode ? "#e5e7eb" : "#374151",
    },
    header: {
      backgroundColor: isUserDarkMode ? "#1E1E1E" : "#667eea",
    },
    headerText: {
      color: "#ffffff",
    },
    refreshButton: {
      backgroundColor: isUserDarkMode ? "#3b82f6" : "#3b82f6",
    },
    refreshButtonText: {
      color: "#ffffff",
    },
    equipmentItem: {
      backgroundColor: isUserDarkMode ? "#2D2D2D" : "#f8fafc",
      borderColor: isUserDarkMode ? "#4B5563" : "#e5e7eb",
    },
    equipmentLabel: {
      color: isUserDarkMode ? "#ffffff" : "#1f2937",
    },
    equipmentValue: {
      color: isUserDarkMode ? "#3b82f6" : "#3b82f6",
    },
  }

  const getUserID = (user: any, isAdminCreatedUser: boolean) => {
    if (isAdminCreatedUser && user?.uid) {
      return user.uid
    }
    return user?.email || null
  }

  const loadLatestFileAndDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user || !isAuthenticated) {
        setError("Please log in to view your equipment maintenance data")
        return
      }

      const userId = getUserID(user, isAdminCreatedUser)
      if (!userId) {
        setError("Unable to identify user")
        return
      }

      // Get the latest uploaded file
      const files = await ImportedFilesService.getUserImportedFiles(userId)
      
      if (files.length === 0) {
        setError("No Excel files found. Please upload an Excel file first.")
        return
      }

      const latestFile = files[0]
      setLatestFile(latestFile)

      // Try to get existing dashboard data
      let dashboard = await DashboardStorageService.getDashboardByFileId(latestFile.id!)
      
      if (!dashboard) {
        // Generate new dashboard data if none exists
        setError("Generating dashboard data from your Excel file...")
        
        try {
          const analysis = await ExcelAnalysisService.analyzeExcelFile(latestFile.fileUrl, latestFile.originalName)
          
          const newDashboardData = await ChartDataService.generateDashboardData(
            latestFile.id!,
            latestFile.originalName,
            latestFile.fileUrl,
            analysis
          )

          // Save the dashboard
          await DashboardStorageService.saveDashboard(
            latestFile.id!,
            latestFile.originalName,
            userId,
            newDashboardData
          )

          dashboard = {
            dashboardData: newDashboardData,
            fileId: latestFile.id!,
            fileName: latestFile.originalName,
            userId: userId,
            createdAt: new Date(),
            viewCount: 0
          }
        } catch (analysisError: any) {
          setError(`Error analyzing Excel file: ${analysisError.message}`)
          return
        }
      }

      setDashboardData(dashboard.dashboardData)
      setError(null)

    } catch (error: any) {
      console.error("Error loading equipment maintenance data:", error)
      setError(`Error loading data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadLatestFileAndDashboard()
    setRefreshing(false)
  }

  useEffect(() => {
    if (user && isAuthenticated) {
      loadLatestFileAndDashboard()
    }
  }, [user, isAuthenticated])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={isUserDarkMode ? "#3b82f6" : "#3b82f6"} />
        <Text style={[styles.loadingText, dynamicStyles.text]}>Loading equipment maintenance data...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.headerTitle, dynamicStyles.headerText]}>Equipment Maintenance Data</Text>
        </View>
        
        <View style={[styles.errorContainer, dynamicStyles.card]}>
          <Text style={[styles.errorText, dynamicStyles.text]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.refreshButton, dynamicStyles.refreshButton]} 
            onPress={refreshData}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.refreshButtonText, dynamicStyles.refreshButtonText]}>
                Refresh Data
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!dashboardData || !dashboardData.mmtCharts || dashboardData.mmtCharts.length === 0) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.headerTitle, dynamicStyles.headerText]}>Equipment Maintenance Data</Text>
        </View>
        
        <View style={[styles.noDataContainer, dynamicStyles.card]}>
          <Text style={[styles.noDataText, dynamicStyles.text]}>
            No equipment maintenance data found in your Excel file.
          </Text>
          <Text style={[styles.noDataSubtext, dynamicStyles.subtitle]}>
            Make sure your Excel file contains columns with equipment-related information like "Action", "Description", or "MMT".
          </Text>
          <TouchableOpacity 
            style={[styles.refreshButton, dynamicStyles.refreshButton]} 
            onPress={refreshData}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.refreshButtonText, dynamicStyles.refreshButtonText]}>
                Refresh Data
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.headerTitle, dynamicStyles.headerText]}>Equipment Maintenance Data</Text>
        <Text style={[styles.headerSubtitle, dynamicStyles.headerText]}>
          {latestFile?.originalName}
        </Text>
        <Text style={[styles.headerInfo, dynamicStyles.headerText]}>
          Total Records: {dashboardData.totalRecords.toLocaleString()}
        </Text>
      </View>

      {dashboardData.mmtCharts.map((mmtChart, index) => (
        <View key={`mmt-${index}`} style={[styles.chartContainer, dynamicStyles.card]}>
          <Text style={[styles.chartTitle, dynamicStyles.title]}>{mmtChart.title}</Text>
          <Text style={[styles.chartSubtitle, dynamicStyles.subtitle]}>
            Equipment Maintenance & Replacement Analysis
          </Text>

          <View style={styles.equipmentList}>
            {mmtChart.data.map((item, itemIndex) => (
              <View key={itemIndex} style={[styles.equipmentItem, dynamicStyles.equipmentItem]}>
                <Text style={[styles.equipmentLabel, dynamicStyles.equipmentLabel]}>
                  {item.label}
                </Text>
                <Text style={[styles.equipmentValue, dynamicStyles.equipmentValue]}>
                  {item.value.toLocaleString()} occurrences
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
            <Text style={[styles.summaryText, dynamicStyles.text]}>
              📊 Total MMT entries analyzed: {mmtChart.totalCount.toLocaleString()}
            </Text>
            <Text style={[styles.summaryText, dynamicStyles.text]}>
              🔧 Equipment types found: {mmtChart.data.length}
            </Text>
            {mmtChart.data.length > 0 && (
              <Text style={[styles.summaryText, dynamicStyles.text]}>
                🏆 Most common: {mmtChart.data[0].label} ({mmtChart.data[0].value} occurrences)
              </Text>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity 
        style={[styles.refreshButton, dynamicStyles.refreshButton, styles.bottomRefreshButton]} 
        onPress={refreshData}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={[styles.refreshButtonText, dynamicStyles.refreshButtonText]}>
            Refresh Equipment Data
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.large,
  },
  loadingText: {
    fontSize: fontSize.medium,
    marginTop: spacing.medium,
    textAlign: "center",
  },
  header: {
    backgroundColor: "#667eea",
    padding: spacing.large,
    marginBottom: spacing.medium,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: fontSize.xLarge,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: spacing.small,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.medium,
    marginBottom: spacing.xSmall,
    fontWeight: "600",
  },
  headerInfo: {
    fontSize: fontSize.small,
    fontWeight: "500",
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    margin: spacing.medium,
    padding: spacing.large,
    borderRadius: borderRadius.large,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chartTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    marginBottom: spacing.xSmall,
    textAlign: "center",
  },
  chartSubtitle: {
    fontSize: fontSize.medium,
    marginBottom: spacing.medium,
    textAlign: "center",
    fontWeight: "500",
  },
  equipmentList: {
    marginBottom: spacing.medium,
  },
  equipmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.medium,
    marginBottom: spacing.small,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  equipmentLabel: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    flex: 1,
  },
  equipmentValue: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
    marginLeft: spacing.medium,
  },
  summaryContainer: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  summaryText: {
    fontSize: fontSize.small,
    marginBottom: spacing.xSmall,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#ffffff",
    margin: spacing.large,
    padding: spacing.xLarge,
    borderRadius: borderRadius.large,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  errorText: {
    fontSize: fontSize.medium,
    textAlign: "center",
    marginBottom: spacing.medium,
    lineHeight: fontSize.medium + 4,
  },
  noDataContainer: {
    backgroundColor: "#ffffff",
    margin: spacing.large,
    padding: spacing.xLarge,
    borderRadius: borderRadius.large,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  noDataText: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: spacing.small,
  },
  noDataSubtext: {
    fontSize: fontSize.medium,
    textAlign: "center",
    marginBottom: spacing.medium,
    lineHeight: fontSize.medium + 4,
  },
  refreshButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
    borderRadius: borderRadius.medium,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  refreshButtonText: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
    color: "#ffffff",
  },
  bottomRefreshButton: {
    margin: spacing.large,
    marginTop: spacing.medium,
  },
  bottomSpacing: {
    height: isTablet() ? spacing.huge : spacing.huge * 1.5,
  },
})

