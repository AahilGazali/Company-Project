import React from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { 
  spacing, 
  fontSize, 
  borderRadius, 
  getShadow 
} from "../utils/responsive"

const { width } = Dimensions.get("window")

export default function AdminAnalyticsScreen() {
  const chartData = [
    { month: "Jan", users: 120, programs: 45, reports: 23 },
    { month: "Feb", users: 135, programs: 52, reports: 28 },
    { month: "Mar", users: 148, programs: 58, reports: 31 },
    { month: "Apr", users: 162, programs: 65, reports: 35 },
    { month: "May", users: 178, programs: 72, reports: 42 },
    { month: "Jun", users: 195, programs: 78, reports: 48 },
  ]

  const maxUsers = Math.max(...chartData.map(d => d.users))
  const maxPrograms = Math.max(...chartData.map(d => d.programs))
  const maxReports = Math.max(...chartData.map(d => d.reports))

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={["#4CAF50", "#2E7D32", "#1B5E20"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <Text style={styles.headerSubtitle}>System performance insights</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={["#4CAF50", "#2E7D32"]}
              style={styles.metricGradient}
            >
              <Ionicons name="trending-up" size={24} color="#FFF" />
              <Text style={styles.metricValue}>+15.2%</Text>
              <Text style={styles.metricLabel}>Growth Rate</Text>
            </LinearGradient>
          </View>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              style={styles.metricGradient}
            >
              <Ionicons name="people" size={24} color="#FFF" />
              <Text style={styles.metricValue}>1,234</Text>
              <Text style={styles.metricLabel}>Total Users</Text>
            </LinearGradient>
          </View>
          <View style={styles.metricCard}>
            <LinearGradient
              colors={["#FF9800", "#F57C00"]}
              style={styles.metricGradient}
            >
              <Ionicons name="analytics" size={24} color="#FFF" />
              <Text style={styles.metricValue}>98.5%</Text>
              <Text style={styles.metricLabel}>Uptime</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Monthly Trends</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
                <Text style={styles.legendText}>Users</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
                <Text style={styles.legendText}>Programs</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
                <Text style={styles.legendText}>Reports</Text>
              </View>
            </View>
            
            <View style={styles.chart}>
              {chartData.map((data, index) => (
                <View key={index} style={styles.chartColumn}>
                  <View style={styles.chartBars}>
                    <View style={[styles.bar, { 
                      height: (data.users / maxUsers) * 120, 
                      backgroundColor: "#4CAF50" 
                    }]} />
                    <View style={[styles.bar, { 
                      height: (data.programs / maxPrograms) * 120, 
                      backgroundColor: "#2196F3" 
                    }]} />
                    <View style={[styles.bar, { 
                      height: (data.reports / maxReports) * 120, 
                      backgroundColor: "#FF9800" 
                    }]} />
                  </View>
                  <Text style={styles.chartLabel}>{data.month}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Performance Cards */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="speedometer" size={24} color="#4CAF50" />
                <Text style={styles.performanceTitle}>Response Time</Text>
              </View>
              <Text style={styles.performanceValue}>245ms</Text>
              <Text style={styles.performanceChange}>↓ 12% from last month</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="server" size={24} color="#2196F3" />
                <Text style={styles.performanceTitle}>Server Load</Text>
              </View>
              <Text style={styles.performanceValue}>67%</Text>
              <Text style={styles.performanceChange}>↑ 8% from last month</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#FF9800" />
                <Text style={styles.performanceTitle}>Security Score</Text>
              </View>
              <Text style={styles.performanceValue}>94/100</Text>
              <Text style={styles.performanceChange}>↑ 3 points</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="cloud" size={24} color="#9C27B0" />
                <Text style={styles.performanceTitle}>Storage Used</Text>
              </View>
              <Text style={styles.performanceValue}>78%</Text>
              <Text style={styles.performanceChange}>↑ 15% from last month</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    height: 120,
    marginBottom: spacing.large,
  },
  headerGradient: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.large,
    paddingHorizontal: spacing.large,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: fontSize.huge,
    fontWeight: "bold",
    marginBottom: spacing.tiny,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: fontSize.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.huge,
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xxxLarge,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: spacing.tiny,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    ...getShadow(8),
  },
  metricGradient: {
    padding: spacing.large,
    alignItems: "center",
  },
  metricValue: {
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    color: "#FFF",
    marginVertical: spacing.small,
  },
  metricLabel: {
    fontSize: fontSize.small,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  chartSection: {
    marginBottom: spacing.xxxLarge,
  },
  sectionTitle: {
    fontSize: fontSize.large,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.large,
  },
  chartContainer: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius.large,
    padding: spacing.large,
    ...getShadow(4),
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.large,
    gap: spacing.large,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.tiny,
  },
  legendText: {
    fontSize: fontSize.small,
    color: "#666",
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
  },
  chartColumn: {
    alignItems: "center",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginBottom: spacing.small,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: fontSize.tiny,
    color: "#666",
  },
  performanceSection: {
    marginBottom: spacing.xxxLarge,
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  performanceCard: {
    width: (width - spacing.large * 3) / 2,
    backgroundColor: "#FFF",
    padding: spacing.large,
    borderRadius: borderRadius.large,
    marginBottom: spacing.large,
    ...getShadow(4),
  },
  performanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.medium,
  },
  performanceTitle: {
    fontSize: fontSize.medium,
    fontWeight: "600",
    color: "#333",
    marginLeft: spacing.small,
  },
  performanceValue: {
    fontSize: fontSize.xxxLarge,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: spacing.tiny,
  },
  performanceChange: {
    fontSize: fontSize.tiny,
    color: "#666",
  },
})
