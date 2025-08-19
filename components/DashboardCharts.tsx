import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { 
  DashboardData, 
  LocationChart, 
  ActionChart, 
  MMTChart, 
  TimelineChart 
} from '../services/chartDataService';
import { spacing, fontSize, borderRadius, isTablet } from '../utils/responsive';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardChartsProps {
  dashboardData: DashboardData;
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - (spacing.large * 2);

export default function DashboardCharts({ dashboardData }: DashboardChartsProps) {
  const { isUserDarkMode } = useTheme();

  // Dynamic styles based on dark mode
  const dynamicStyles = {
    container: {
      backgroundColor: isUserDarkMode ? '#121212' : '#ffffff',
    },
    header: {
      backgroundColor: isUserDarkMode ? '#1E1E1E' : '#667eea',
    },
    title: {
      color: isUserDarkMode ? '#ffffff' : '#ffffff',
    },
    subtitle: {
      color: isUserDarkMode ? '#e2e8f0' : '#e2e8f0',
    },
    lastUpdated: {
      color: isUserDarkMode ? '#cbd5e1' : '#cbd5e1',
    },
    chartCard: {
      backgroundColor: isUserDarkMode ? '#1E1E1E' : '#ffffff',
      borderColor: isUserDarkMode ? '#374151' : '#e5e7eb',
    },
    chartTitle: {
      color: isUserDarkMode ? '#ffffff' : '#1f2937',
    },
    chartSubtitle: {
      color: isUserDarkMode ? '#d1d5db' : '#6b7280',
    },
    chartWrapper: {
      backgroundColor: isUserDarkMode ? '#2D2D2D' : '#f8fafc',
    },
    noDataContainer: {
      backgroundColor: isUserDarkMode ? '#1E1E1E' : '#ffffff',
    },
    noDataText: {
      color: isUserDarkMode ? '#ffffff' : '#1f2937',
    },
    noDataSubtext: {
      color: isUserDarkMode ? '#d1d5db' : '#6b7280',
    },
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]} showsVerticalScrollIndicator={false}>
      {/* Dashboard Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.title, dynamicStyles.title]}>Dashboard - {dashboardData.fileName}</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Total Records: {dashboardData.totalRecords.toLocaleString()}
        </Text>
        <Text style={[styles.lastUpdated, dynamicStyles.lastUpdated]}>
          Last Updated: {dashboardData.lastUpdated ? new Date(dashboardData.lastUpdated).toLocaleDateString() : 'Recently'}
        </Text>
      </View>

      {/* Location Charts - Top 10 locations with high repetition */}
      {dashboardData.locationCharts.map((chart, index) => (
        <LocationChartComponent key={`location-${index}`} chart={chart} isDarkMode={isUserDarkMode} />
      ))}

      {/* Action Charts */}
      {dashboardData.actionCharts.map((chart, index) => (
        <ActionChartComponent key={`action-${index}`} chart={chart} isDarkMode={isUserDarkMode} />
      ))}

      {/* MMT Charts - Equipment maintenance and replacement counts */}
      {dashboardData.mmtCharts.map((chart, index) => (
        <MMTChartComponent key={`mmt-${index}`} chart={chart} isDarkMode={isUserDarkMode} />
      ))}

      {/* Timeline Charts */}
      {dashboardData.timelineCharts.map((chart, index) => (
        <TimelineChartComponent key={`timeline-${index}`} chart={chart} isDarkMode={isUserDarkMode} />
      ))}

      {/* No Data Message */}
      {dashboardData.locationCharts.length === 0 && 
       dashboardData.actionCharts.length === 0 && 
       dashboardData.mmtCharts.length === 0 && 
       dashboardData.timelineCharts.length === 0 && (
        <View style={[styles.noDataContainer, dynamicStyles.noDataContainer]}>
          <Text style={[styles.noDataText, dynamicStyles.noDataText]}>
            No chart data found in this Excel file.
          </Text>
          <Text style={[styles.noDataSubtext, dynamicStyles.noDataSubtext]}>
            Make sure your Excel file contains columns like 'Location', 'Action', or 'MMT'.
          </Text>
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

// Location Chart Component
function LocationChartComponent({ chart, isDarkMode }: { chart: LocationChart, isDarkMode: boolean }) {
  
  if (chart.data.length === 0) return null;

  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    },
    header: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#667eea',
    },
    title: {
      color: isDarkMode ? '#ffffff' : '#ffffff',
    },
    subtitle: {
      color: isDarkMode ? '#e2e8f0' : '#e2e8f0',
    },
    lastUpdated: {
      color: isDarkMode ? '#cbd5e1' : '#cbd5e1',
    },
    chartCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    chartTitle: {
      color: isDarkMode ? '#ffffff' : '#1f2937',
    },
    chartSubtitle: {
      color: isDarkMode ? '#d1d5db' : '#6b7280',
    },
    chartWrapper: {
      backgroundColor: isDarkMode ? '#2D2D2D' : '#f8fafc',
    },
    noDataContainer: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    },
    noDataText: {
      color: isDarkMode ? '#ffffff' : '#1f2937',
    },
    noDataSubtext: {
      color: isDarkMode ? '#d1d5db' : '#6b7280',
    },
  };

  const chartConfig = {
    backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    backgroundGradientFrom: isDarkMode ? '#2D2D2D' : '#f8fafc',
    backgroundGradientTo: isDarkMode ? '#1E1E1E' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Bright green
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
    style: {
      borderRadius: borderRadius.medium,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: 'bold',
      fill: isDarkMode ? '#ffffff' : '#1f2937',
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#22c55e'
    },
    formatXLabel: (label: string) => {
      // Truncate long labels and make them more readable
      return label.length > 6 ? label.substring(0, 6) + '...' : label;
    }
  };

  // Prepare data for bar chart - Show all 10 locations
  const barData = {
    labels: chart.data.slice(0, 10).map(item => item.label),
    datasets: [{
      data: chart.data.slice(0, 10).map(item => item.value)
    }]
  };

  return (
    <View style={[styles.chartContainer, dynamicStyles.chartCard]}>
      <Text style={[styles.chartTitle, dynamicStyles.chartTitle]}>{chart.title}</Text>
      <Text style={[styles.chartSubtitle, dynamicStyles.chartSubtitle]}>
        Showing top {Math.min(10, chart.data.length)} locations with high repetition
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.chartWrapper, dynamicStyles.chartWrapper]}>
          <BarChart
            data={barData}
            width={Math.max(chartWidth, 10 * 100)} // Fixed width for 10 locations
            height={320}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            style={styles.chart}
            fromZero={true}
            yAxisLabel=""
            yAxisSuffix=""
            showValuesOnTopOfBars={true}
            withHorizontalLabels={true}
            withVerticalLabels={true}
          />
        </View>
      </ScrollView>
      
      <Text style={styles.chartInfo}>
        Total locations with issues: {chart.data.length}
      </Text>
    </View>
  );
}

// Action Chart Component
function ActionChartComponent({ chart, isDarkMode }: { chart: ActionChart, isDarkMode: boolean }) {
  if (chart.data.length === 0) return null;

  const dynamicStyles = {
    chartCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    chartTitle: {
      color: isDarkMode ? '#ffffff' : '#1f2937',
    },
    chartSubtitle: {
      color: isDarkMode ? '#d1d5db' : '#6b7280',
    },
    chartInfo: {
      color: isDarkMode ? '#d1d5db' : '#374151',
      backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
  };

  const chartConfig = {
    backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    backgroundGradientFrom: isDarkMode ? '#2D2D2D' : '#f8fafc',
    backgroundGradientTo: isDarkMode ? '#1E1E1E' : '#ffffff',
    color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Bright purple
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
    style: {
      borderRadius: borderRadius.medium,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: 'bold',
      fill: isDarkMode ? '#ffffff' : '#1f2937',
    },
    formatXLabel: (label: string) => {
      return label.length > 6 ? label.substring(0, 6) + '...' : label;
    }
  };

  if (chart.data.length <= 6) {
    const vibrantColors = [
      '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    
    const pieData = chart.data.map((item, index) => ({
      name: item.label,
      count: item.value,
      color: vibrantColors[index % vibrantColors.length],
      legendFontColor: isDarkMode ? '#ffffff' : '#374151',
      legendFontSize: fontSize.small,
    }));

    return (
      <View style={[styles.chartContainer, dynamicStyles.chartCard]}>
        <Text style={[styles.chartTitle, dynamicStyles.chartTitle]}>{chart.title}</Text>
        <Text style={[styles.chartSubtitle, dynamicStyles.chartSubtitle]}>
          Distribution of action types
        </Text>
        
        <PieChart
          data={pieData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
        
        <Text style={[styles.chartInfo, dynamicStyles.chartInfo]}>
          Total action types: {chart.data.length}
        </Text>
      </View>
    );
  } else {
    const barData = {
      labels: chart.data.slice(0, 8).map(item => item.label),
      datasets: [{
        data: chart.data.slice(0, 8).map(item => item.value)
      }]
    };

    return (
      <View style={[styles.chartContainer, dynamicStyles.chartCard]}>
        <Text style={[styles.chartTitle, dynamicStyles.chartTitle]}>{chart.title}</Text>
        <Text style={[styles.chartSubtitle, dynamicStyles.chartSubtitle]}>
          Top {Math.min(8, chart.data.length)} action types
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={barData}
            width={Math.max(chartWidth, chart.data.length * 100)}
            height={320}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            style={styles.chart}
            fromZero={true}
            yAxisLabel=""
            yAxisSuffix=""
            showValuesOnTopOfBars={true}
            withHorizontalLabels={true}
            withVerticalLabels={true}
          />
        </ScrollView>
        
        <Text style={[styles.chartInfo, dynamicStyles.chartInfo]}>
          Total action types: {chart.data.length}
        </Text>
      </View>
    );
  }
}

// MMT Chart Component
function MMTChartComponent({ chart, isDarkMode }: { chart: MMTChart, isDarkMode: boolean }) {
  if (chart.data.length === 0) return null;

  const dynamicStyles = {
    chartCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    chartTitle: {
      color: isDarkMode ? '#ffffff' : '#1f2937',
    },
    chartSubtitle: {
      color: isDarkMode ? '#d1d5db' : '#6b7280',
    },
    chartInfo: {
      color: isDarkMode ? '#d1d5db' : '#374151',
      backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
  };

  const chartConfig = {
    backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    backgroundGradientFrom: isDarkMode ? '#2D2D2D' : '#f8fafc',
    backgroundGradientTo: isDarkMode ? '#1E1E1E' : '#ffffff',
    color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Bright purple
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
    style: {
      borderRadius: borderRadius.medium,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: 'bold',
      fill: isDarkMode ? '#ffffff' : '#1f2937',
    },
    formatXLabel: (label: string) => {
      return label.length > 6 ? label.substring(0, 6) + '...' : label;
    }
  };

  const barData = {
    labels: chart.data.slice(0, 6).map(item => item.label),
    datasets: [{
      data: chart.data.slice(0, 6).map(item => item.value)
    }]
  };

  return (
    <View style={[styles.chartContainer, dynamicStyles.chartCard]}>
      <Text style={[styles.chartTitle, dynamicStyles.chartTitle]}>{chart.title}</Text>
      <Text style={[styles.chartSubtitle, dynamicStyles.chartSubtitle]}>
        MMT analysis and distribution
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={barData}
          width={Math.max(chartWidth, chart.data.length * 100)}
          height={320}
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={styles.chart}
          fromZero={true}
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars={true}
          withHorizontalLabels={true}
          withVerticalLabels={true}
        />
      </ScrollView>
      
      <Text style={[styles.chartInfo, dynamicStyles.chartInfo]}>
        Total MMT entries: {chart.totalCount.toLocaleString()}
      </Text>
    </View>
  );
}

// Timeline Chart Component
function TimelineChartComponent({ chart, isDarkMode }: { chart: TimelineChart, isDarkMode: boolean }) {
  if (!chart.data.labels || chart.data.labels.length === 0) return null;

  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    },
    header: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#667eea',
    },
    title: {
      color: isDarkMode ? '#ffffff' : '#ffffff',
    },
    subtitle: {
      color: isDarkMode ? '#e2e8f0' : '#e2e8f0',
    },
    lastUpdated: {
      color: isDarkMode ? '#cbd5e1' : '#cbd5e1',
    },
    chartCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
      borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    },
    chartTitle: {
      color: isDarkMode ? '#ffffff' : '#1f2937',
    },
    chartSubtitle: {
      color: isDarkMode ? '#d1d5db' : '#6b7280',
    },
    chartWrapper: {
      backgroundColor: isDarkMode ? '#2D2D2D' : '#f8fafc',
    },
    noDataContainer: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    },
    noDataText: {
      color: isDarkMode ? '#ffffff' : '#1f2937',
    },
    noDataSubtext: {
      color: isDarkMode ? '#d1d5db' : '#6b7280',
    },
  };

  const chartConfig = {
    backgroundColor: isDarkMode ? '#1E1E1E' : '#ffffff',
    backgroundGradientFrom: isDarkMode ? '#2D2D2D' : '#f8fafc',
    backgroundGradientTo: isDarkMode ? '#1E1E1E' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`, // Bright pink
    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
    style: {
      borderRadius: borderRadius.medium,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: 'bold',
      fill: isDarkMode ? '#ffffff' : '#1f2937',
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ec4899'
    },
  };

  // Add chartInfo style to dynamicStyles
  const updatedDynamicStyles = {
    ...dynamicStyles,
    chartInfo: {
      color: isDarkMode ? '#d1d5db' : '#374151',
      backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
  };

  return (
    <View style={[styles.chartContainer, dynamicStyles.chartCard]}>
      <Text style={[styles.chartTitle, dynamicStyles.chartTitle]}>{chart.title}</Text>
      <Text style={[styles.chartSubtitle, dynamicStyles.chartSubtitle]}>
        Trends over time
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={chart.data}
          width={Math.max(chartWidth, chart.data.labels.length * 100)}
          height={320}
          chartConfig={chartConfig}
          style={styles.chart}
          bezier
          withVerticalLabels={true}
          withHorizontalLabels={true}
        />
      </ScrollView>
      
      <Text style={[styles.chartInfo, updatedDynamicStyles.chartInfo]}>
        Time period: {chart.data.labels.length} months
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Clean white background
  },
  header: {
    backgroundColor: '#667eea',
    padding: spacing.large,
    marginBottom: spacing.medium,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: fontSize.xLarge,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.small,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: fontSize.medium,
    color: '#e2e8f0',
    marginBottom: spacing.xSmall,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: fontSize.small,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: spacing.medium,
    padding: spacing.large,
    paddingBottom: spacing.xLarge,
    borderRadius: borderRadius.large,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartTitle: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.xSmall,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: fontSize.medium,
    color: '#6b7280',
    marginBottom: spacing.medium,
    textAlign: 'center',
    fontWeight: '500',
  },
  chart: {
    marginVertical: spacing.small,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.medium,
    padding: spacing.small,
    overflow: 'hidden',
  },
  chartInfo: {
    fontSize: fontSize.small,
    color: '#374151',
    textAlign: 'center',
    marginTop: spacing.small,
    fontWeight: '600',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: spacing.xSmall,
    paddingHorizontal: spacing.medium,
    borderRadius: borderRadius.small,
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    margin: spacing.large,
    padding: spacing.xLarge,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noDataText: {
    fontSize: fontSize.large,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: spacing.small,
  },
  noDataSubtext: {
    fontSize: fontSize.medium,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: fontSize.medium + 4,
  },
  bottomSpacing: {
    height: isTablet() ? spacing.huge : spacing.huge * 1.5,
  },
});
