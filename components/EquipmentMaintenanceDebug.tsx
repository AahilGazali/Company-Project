"use client"
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useUser } from '../contexts/UserContext'
import { ImportedFilesService, ImportedFile } from '../services/importedFilesService'
import { ExcelAnalysisService } from '../services/excelAnalysisService'
import { spacing, fontSize, borderRadius, isTablet } from '../utils/responsive'
import { useTheme } from '../contexts/ThemeContext'

export default function EquipmentMaintenanceDebug() {
  const { user, isAdminCreatedUser, isAuthenticated } = useUser()
  const { isUserDarkMode } = useTheme()
  
  const [latestFile, setLatestFile] = useState<ImportedFile | null>(null)
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    debugItem: {
      backgroundColor: isUserDarkMode ? "#2D2D2D" : "#f8fafc",
      borderColor: isUserDarkMode ? "#4B5563" : "#e5e7eb",
    },
    keywordMatch: {
      backgroundColor: isUserDarkMode ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
      borderColor: isUserDarkMode ? "#22c55e" : "#22c55e",
    },
    noMatch: {
      backgroundColor: isUserDarkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
      borderColor: isUserDarkMode ? "#ef4444" : "#ef4444",
    },
  }

  const getUserID = (user: any, isAdminCreatedUser: boolean) => {
    if (isAdminCreatedUser && user?.uid) {
      return user.uid
    }
    return user?.email || null
  }

  const analyzeEquipmentData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user || !isAuthenticated) {
        setError("Please log in to view debug data")
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

      // Analyze the Excel file
      const analysis = await ExcelAnalysisService.analyzeExcelFile(latestFile.fileUrl, latestFile.originalName)
      
      if (!analysis.fullData || analysis.fullData.length === 0) {
        setError("No data found in Excel file")
        return
      }

      // Debug equipment counting logic
      const debugResult = debugEquipmentCounting(analysis.fullData, analysis.columns)
      setDebugData(debugResult)

    } catch (error: any) {
      console.error("Error analyzing equipment data:", error)
      setError(`Error analyzing data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const debugEquipmentCounting = (data: any[], columns: string[]) => {
    // Define equipment keywords (same as in chartDataService)
    const equipmentKeywords = {
      'Compressor': ['compressor', 'comp', 'ac compressor', 'air compressor'],
      'Unit': ['unit', 'ac unit', 'air conditioning unit', 'hvac unit'],
      'Coils': ['coil', 'coils', 'evaporator coil', 'condenser coil'],
      'Motors': ['motor', 'motors', 'fan motor', 'blower motor'],
      'Filter Cleaned': ['filter', 'filters', 'filter cleaned', 'filter replacement', 'filter change']
    }

    // Find action and description columns
    const actionColumns = columns.filter(col => 
      col.toLowerCase().includes('action') ||
      col.toLowerCase().includes('task') ||
      col.toLowerCase().includes('work') ||
      col.toLowerCase().includes('activity') ||
      col.toLowerCase().includes('description') ||
      col.toLowerCase().includes('problem')
    )

    const descriptionColumns = columns.filter(col => 
      col.toLowerCase().includes('description') || 
      col.toLowerCase().includes('details') ||
      col.toLowerCase().includes('notes') ||
      col.toLowerCase().includes('comments')
    )

    const searchColumns = [...actionColumns, ...descriptionColumns]

    // Debug counting
    const equipmentCounts: { [key: string]: number } = {}
    const detailedMatches: { [key: string]: any[] } = {}
    
    // Initialize
    Object.keys(equipmentKeywords).forEach(key => {
      equipmentCounts[key] = 0
      detailedMatches[key] = []
    })

    // Analyze each record
    data.forEach((record, recordIndex) => {
      searchColumns.forEach(column => {
        const cellValue = record[column]?.toString().toLowerCase() || ''
        
        Object.entries(equipmentKeywords).forEach(([equipmentType, keywords]) => {
          keywords.forEach(keyword => {
            if (cellValue.includes(keyword)) {
              equipmentCounts[equipmentType]++
              
              // Store detailed match info
              detailedMatches[equipmentType].push({
                recordIndex: recordIndex + 1,
                column: column,
                originalValue: record[column],
                matchedKeyword: keyword,
                fullCellValue: cellValue
              })
            }
          })
        })
      })
    })

    return {
      totalRecords: data.length,
      searchColumns,
      equipmentKeywords,
      equipmentCounts,
      detailedMatches,
      sampleRecords: data.slice(0, 10) // First 10 records for reference
    }
  }

  useEffect(() => {
    if (user && isAuthenticated) {
      analyzeEquipmentData()
    }
  }, [user, isAuthenticated])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={isUserDarkMode ? "#3b82f6" : "#3b82f6"} />
        <Text style={[styles.loadingText, dynamicStyles.text]}>Analyzing equipment data...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.headerTitle, dynamicStyles.headerText]}>Equipment Debug Analysis</Text>
        </View>
        
        <View style={[styles.errorContainer, dynamicStyles.card]}>
          <Text style={[styles.errorText, dynamicStyles.text]}>{error}</Text>
        </View>
      </View>
    )
  }

  if (!debugData) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.headerTitle, dynamicStyles.headerText]}>Equipment Debug Analysis</Text>
        </View>
        
        <View style={[styles.noDataContainer, dynamicStyles.card]}>
          <Text style={[styles.noDataText, dynamicStyles.text]}>
            No debug data available
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.headerTitle, dynamicStyles.headerText]}>Equipment Debug Analysis</Text>
        <Text style={[styles.headerSubtitle, dynamicStyles.headerText]}>
          {latestFile?.originalName}
        </Text>
        <Text style={[styles.headerInfo, dynamicStyles.headerText]}>
          Total Records: {debugData.totalRecords.toLocaleString()}
        </Text>
      </View>

      {/* Summary */}
      <View style={[styles.chartContainer, dynamicStyles.card]}>
        <Text style={[styles.chartTitle, dynamicStyles.title]}>Equipment Count Summary</Text>
        <Text style={[styles.chartSubtitle, dynamicStyles.subtitle]}>
          Why your Excel shows 7 coils but graph shows 28
        </Text>

        <View style={styles.equipmentList}>
          {Object.entries(debugData.equipmentCounts).map(([equipment, count]) => (
            <View key={equipment} style={[styles.equipmentItem, dynamicStyles.equipmentItem]}>
              <Text style={[styles.equipmentLabel, dynamicStyles.text]}>
                {equipment}
              </Text>
              <Text style={[styles.equipmentValue, dynamicStyles.text]}>
                {count} matches found
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            🔍 <Text style={{fontWeight: 'bold'}}>Why the difference?</Text>
          </Text>
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            • The system searches <Text style={{fontWeight: 'bold'}}>multiple columns</Text> (Action, Description, etc.)
          </Text>
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            • Each <Text style={{fontWeight: 'bold'}}>keyword match</Text> in a cell counts as +1
          </Text>
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            • If "coil" appears in both Action AND Description, it counts as +2
          </Text>
          <Text style={[styles.summaryText, dynamicStyles.text]}>
            • Multiple keywords like "evaporator coil" and "coil" both count
          </Text>
        </View>
      </View>

      {/* Detailed Analysis for Coils */}
      <View style={[styles.chartContainer, dynamicStyles.card]}>
        <Text style={[styles.chartTitle, dynamicStyles.title]}>Detailed Coil Analysis</Text>
        <Text style={[styles.chartSubtitle, dynamicStyles.subtitle]}>
          Showing all {debugData.detailedMatches['Coils']?.length || 0} coil matches found
        </Text>

        {debugData.detailedMatches['Coils']?.map((match, index) => (
          <View key={index} style={[styles.debugItem, dynamicStyles.debugItem, styles.keywordMatch]}>
            <Text style={[styles.debugTitle, dynamicStyles.text]}>
              Match #{index + 1} - Row {match.recordIndex}
            </Text>
            <Text style={[styles.debugText, dynamicStyles.text]}>
              <Text style={{fontWeight: 'bold'}}>Column:</Text> {match.column}
            </Text>
            <Text style={[styles.debugText, dynamicStyles.text]}>
              <Text style={{fontWeight: 'bold'}}>Matched Keyword:</Text> "{match.matchedKeyword}"
            </Text>
            <Text style={[styles.debugText, dynamicStyles.text]}>
              <Text style={{fontWeight: 'bold'}}>Original Value:</Text> {match.originalValue}
            </Text>
          </View>
        ))}

        {(!debugData.detailedMatches['Coils'] || debugData.detailedMatches['Coils'].length === 0) && (
          <View style={[styles.debugItem, dynamicStyles.debugItem, styles.noMatch]}>
            <Text style={[styles.debugText, dynamicStyles.text]}>
              No coil matches found in the data
            </Text>
          </View>
        )}
      </View>

      {/* Search Columns */}
      <View style={[styles.chartContainer, dynamicStyles.card]}>
        <Text style={[styles.chartTitle, dynamicStyles.title]}>Columns Being Searched</Text>
        <Text style={[styles.chartSubtitle, dynamicStyles.subtitle]}>
          These columns are analyzed for equipment keywords
        </Text>

        {debugData.searchColumns.map((column, index) => (
          <View key={index} style={[styles.debugItem, dynamicStyles.debugItem]}>
            <Text style={[styles.debugText, dynamicStyles.text]}>
              {index + 1}. {column}
            </Text>
          </View>
        ))}
      </View>

      {/* Keywords */}
      <View style={[styles.chartContainer, dynamicStyles.card]}>
        <Text style={[styles.chartTitle, dynamicStyles.title]}>Equipment Keywords</Text>
        <Text style={[styles.chartSubtitle, dynamicStyles.subtitle]}>
          Keywords used to identify equipment types
        </Text>

        {Object.entries(debugData.equipmentKeywords).map(([equipment, keywords]) => (
          <View key={equipment} style={[styles.debugItem, dynamicStyles.debugItem]}>
            <Text style={[styles.debugTitle, dynamicStyles.text]}>
              {equipment}:
            </Text>
            {keywords.map((keyword, index) => (
              <Text key={index} style={[styles.debugText, dynamicStyles.text]}>
                • "{keyword}"
              </Text>
            ))}
          </View>
        ))}
      </View>

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
  debugItem: {
    padding: spacing.medium,
    marginBottom: spacing.small,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  debugTitle: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
    marginBottom: spacing.xSmall,
  },
  debugText: {
    fontSize: fontSize.small,
    marginBottom: spacing.xSmall,
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
  bottomSpacing: {
    height: isTablet() ? spacing.huge : spacing.huge * 1.5,
  },
})

