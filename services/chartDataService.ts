import { ExcelAnalysis, ExcelSheetAnalysis } from './excelAnalysisService';
import * as XLSX from 'xlsx';

// Chart data interfaces
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface LocationChart {
  type: 'location';
  title: string;
  data: ChartDataPoint[];
  totalCount: number;
}

export interface ActionChart {
  type: 'action';
  title: string;
  data: ChartDataPoint[];
  totalCount: number;
}

export interface MMTChart {
  type: 'mmt';
  title: string;
  data: ChartDataPoint[];
  totalCount: number;
}

export interface TimelineChart {
  type: 'timeline';
  title: string;
  data: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
}

export interface DashboardData {
  fileId: string;
  fileName: string;
  locationCharts: LocationChart[];
  actionCharts: ActionChart[];
  mmtCharts: MMTChart[];
  timelineCharts: TimelineChart[];
  totalRecords: number;
  lastUpdated: Date;
}

export class ChartDataService {
  /**
   * Generate all dashboard charts from Excel file URL and analysis
   */
  static async generateDashboardData(
    fileId: string,
    fileName: string,
    fileUrl: string,
    analysis: ExcelAnalysis
  ): Promise<DashboardData> {
    try {
      console.log('📊 Generating dashboard data for:', fileName);

      // Download and parse Excel file
      const workbook = await this.downloadAndParseExcel(fileUrl);
      
      // Process each sheet and generate charts
      const locationCharts: LocationChart[] = [];
      const actionCharts: ActionChart[] = [];
      const mmtCharts: MMTChart[] = [];
      const timelineCharts: TimelineChart[] = [];
      
      let totalRecords = 0;

      // Process the full dataset instead of individual sheets
      if (analysis.fullData && analysis.fullData.length > 0) {
        console.log(`📋 Processing full dataset: ${analysis.fullData.length} records`);
        
        const fullData = analysis.fullData;
        totalRecords = fullData.length;

        // Generate location-based charts
        const locationChart = this.generateLocationChart('Main Dataset', fullData);
        if (locationChart) locationCharts.push(locationChart);

        // Generate action-based charts
        const actionChart = this.generateActionChart('Main Dataset', fullData);
        if (actionChart) actionCharts.push(actionChart);

        // Generate MMT-based charts
        const mmtChart = this.generateMMTChart('Main Dataset', fullData);
        if (mmtChart) mmtCharts.push(mmtChart);

        // Generate timeline charts (if date fields exist)
        const timelineChart = this.generateTimelineChart('Main Dataset', fullData, analysis);
        if (timelineChart) timelineCharts.push(timelineChart);
      }

      const dashboardData: DashboardData = {
        fileId,
        fileName,
        locationCharts,
        actionCharts,
        mmtCharts,
        timelineCharts,
        totalRecords,
        lastUpdated: new Date()
      };

      console.log('✅ Dashboard data generated successfully');
      console.log(`📊 Generated ${locationCharts.length} location charts, ${actionCharts.length} action charts, ${mmtCharts.length} MMT charts`);

      return dashboardData;

    } catch (error: any) {
      console.error('❌ Error generating dashboard data:', error);
      throw new Error(`Failed to generate dashboard data: ${error.message}`);
    }
  }

  /**
   * Download and parse Excel file
   */
  private static async downloadAndParseExcel(fileUrl: string): Promise<XLSX.WorkBook> {
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    return XLSX.read(arrayBuffer, { type: 'array' });
  }

  /**
   * Extract data from a specific sheet
   */
  private static async extractSheetData(workbook: XLSX.WorkBook, sheetAnalysis: ExcelSheetAnalysis): Promise<any[]> {
    const worksheet = workbook.Sheets[sheetAnalysis.name];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length <= 1) return [];

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    return dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = (row as any[])[index];
      });
      return obj;
    }).filter(row => Object.values(row).some(val => val !== null && val !== undefined && val !== ''));
  }

  /**
   * Generate location-based chart - Top 10 locations with high repetition
   */
  private static generateLocationChart(sheetName: string, data: any[]): LocationChart | null {
    // Find location-related columns
    const locationColumns = this.findLocationColumns(data);
    if (locationColumns.length === 0) return null;

    const locationColumn = locationColumns[0];
    console.log(`📍 Using location column: "${locationColumn}"`);
    
    const locationCounts = this.countOccurrences(data, locationColumn);
    
    // Debug: Log all unique location values found
    console.log('📍 All unique location values found:');
    Object.keys(locationCounts).forEach((location, index) => {
      console.log(`  ${index + 1}. "${location}" (${locationCounts[location]} occurrences)`);
    });
    
         // Sort by count and take top 10 (as requested)
     const sortedData = Object.entries(locationCounts)
       .sort(([,a], [,b]) => b - a)
       .slice(0, 10)
       .map(([label, value], index) => ({
         label: label, // Show full location names without truncation
         value,
         color: this.getColorForIndex(index)
       }));

    console.log('🏆 Top 10 locations for chart:');
    sortedData.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.label}" (${item.value} occurrences)`);
    });

    return {
      type: 'location',
      title: `${sheetName} - Issues by Location`,
      data: sortedData,
      totalCount: data.length
    };
  }

  /**
   * Generate action-based chart
   */
  private static generateActionChart(sheetName: string, data: any[]): ActionChart | null {
    // Find action-related columns
    const actionColumns = this.findActionColumns(data);
    if (actionColumns.length === 0) return null;

    const actionColumn = actionColumns[0];
    const actionCounts = this.countOccurrences(data, actionColumn);
    
    // Sort by count and take top 10
    const sortedData = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([label, value], index) => ({
        label: label, // Show full action names without truncation
        value,
        color: this.getColorForIndex(index)
      }));

    return {
      type: 'action',
      title: `${sheetName} - Actions Required`,
      data: sortedData,
      totalCount: data.length
    };
  }

  /**
   * Generate MMT-based chart - Equipment replacement and maintenance counts
   */
  private static generateMMTChart(sheetName: string, data: any[]): MMTChart | null {
    // Find action/description columns for equipment analysis
    const actionColumns = this.findActionColumns(data);
    const descriptionColumns = this.findDescriptionColumns(data);
    
    if (actionColumns.length === 0 && descriptionColumns.length === 0) return null;

    // Define equipment keywords to search for
    const equipmentKeywords = {
      'Compressor': ['compressor', 'comp', 'ac compressor', 'air compressor'],
      'Unit': ['unit', 'ac unit', 'air conditioning unit', 'hvac unit'],
      'Coils': ['coil', 'coils', 'evaporator coil', 'condenser coil'],
      'Motors': ['motor', 'motors', 'fan motor', 'blower motor'],
      'Filter Cleaned': ['filter', 'filters', 'filter cleaned', 'filter replacement', 'filter change']
    };

    // Count occurrences of each equipment type
    const equipmentCounts: { [key: string]: number } = {};
    
    // Initialize counts
    Object.keys(equipmentKeywords).forEach(key => {
      equipmentCounts[key] = 0;
    });

    // Search through action and description columns
    const searchColumns = [...actionColumns, ...descriptionColumns];
    
    data.forEach(record => {
      searchColumns.forEach(column => {
        const cellValue = record[column]?.toString().toLowerCase() || '';
        
        Object.entries(equipmentKeywords).forEach(([equipmentType, keywords]) => {
          keywords.forEach(keyword => {
            if (cellValue.includes(keyword)) {
              equipmentCounts[equipmentType]++;
            }
          });
        });
      });
    });

    // Convert to chart data format
    const chartData = Object.entries(equipmentCounts)
      .filter(([, count]) => count > 0) // Only show equipment types with counts > 0
      .map(([label, value], index) => ({
        label,
        value,
        color: this.getColorForIndex(index)
      }));

    return {
      type: 'mmt',
      title: `${sheetName} - Equipment Maintenance & Replacement`,
      data: chartData,
      totalCount: data.length
    };
  }

  /**
   * Generate timeline chart (if date columns exist)
   */
  private static generateTimelineChart(
    sheetName: string, 
    data: any[], 
    analysis: ExcelAnalysis
  ): TimelineChart | null {
    // Find date columns from the analysis
    const dateColumns = analysis.columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('functional date')
    );
    if (dateColumns.length === 0) return null;

    const dateColumn = dateColumns[0];
    
    // Group data by month
    const monthCounts: { [key: string]: number } = {};
    
    data.forEach(row => {
      const dateValue = row[dateColumn];
      if (dateValue) {
        let date: Date;
        
        if (typeof dateValue === 'number') {
          // Excel date serial number
          const excelEpoch = new Date(1900, 0, 1);
          date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
        } else {
          date = new Date(dateValue);
        }
        
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        }
      }
    });

    // Sort by date and prepare chart data
    const sortedMonths = Object.keys(monthCounts).sort();
    const chartData = {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      datasets: [{
        data: sortedMonths.map(month => monthCounts[month])
      }]
    };

    return {
      type: 'timeline',
      title: `${sheetName} - Timeline Analysis`,
      data: chartData
    };
  }

  /**
   * Find location-related columns
   */
  private static findLocationColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    const locationColumns = headers.filter(header => 
      header.toLowerCase().includes('location') ||
      header.toLowerCase().includes('site') ||
      header.toLowerCase().includes('building') ||
      header.toLowerCase().includes('area') ||
      header.toLowerCase().includes('zone') ||
      header.toLowerCase().includes('functional location')
    );
    
    // Sort to prioritize "Location" over "Functional Location"
    return locationColumns.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // If one is exactly "location" and the other isn't, prioritize "location"
      if (aLower === 'location' && bLower !== 'location') return -1;
      if (bLower === 'location' && aLower !== 'location') return 1;
      
      // If one contains "functional location" and the other doesn't, prioritize the non-functional one
      if (aLower.includes('functional location') && !bLower.includes('functional location')) return 1;
      if (bLower.includes('functional location') && !aLower.includes('functional location')) return -1;
      
      // Otherwise, maintain alphabetical order
      return aLower.localeCompare(bLower);
    });
  }

  /**
   * Find action-related columns
   */
  private static findActionColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    return headers.filter(header => 
      header.toLowerCase().includes('action') ||
      header.toLowerCase().includes('task') ||
      header.toLowerCase().includes('work') ||
      header.toLowerCase().includes('activity') ||
      header.toLowerCase().includes('description') ||
      header.toLowerCase().includes('problem')
    );
  }

  /**
   * Find MMT-related columns
   */
  private static findMMTColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    return headers.filter(header => 
      header.toLowerCase().includes('mmt') ||
      header.toLowerCase().includes('maintenance') ||
      header.toLowerCase().includes('order') ||
      header.toLowerCase().includes('ticket') ||
      header.toLowerCase().includes('id') ||
      header.toLowerCase().includes('number')
    );
  }

  /**
   * Find description-related columns
   */
  private static findDescriptionColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    return headers.filter(header => 
      header.toLowerCase().includes('description') || 
      header.toLowerCase().includes('details') ||
      header.toLowerCase().includes('notes') ||
      header.toLowerCase().includes('comments')
    );
  }

  /**
   * Count occurrences of values in a column
   */
  private static countOccurrences(data: any[], columnName: string): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    
    data.forEach(row => {
      let value = row[columnName];
      if (value !== null && value !== undefined && value !== '') {
        // Convert to string and clean up
        value = String(value).trim();
        if (value.length > 0) {
          counts[value] = (counts[value] || 0) + 1;
        }
      }
    });
    
    return counts;
  }

  /**
   * Truncate long labels for better chart display
   */
  private static truncateLabel(label: string, maxLength: number = 25): string {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get color for chart index - PowerBI inspired vibrant colors
   */
  private static getColorForIndex(index: number): string {
    const colors = [
      '#3b82f6', // Blue
      '#ef4444', // Red  
      '#22c55e', // Green
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f97316', // Orange
      '#6366f1', // Indigo
      '#14b8a6', // Teal
      '#f43f5e', // Rose
      '#a855f7', // Purple
      '#10b981', // Emerald
      '#eab308'  // Yellow
    ];
    return colors[index % colors.length];
  }

  /**
   * Get summary statistics for dashboard
   */
  static getDashboardSummary(dashboardData: DashboardData): {
    totalCharts: number;
    totalRecords: number;
    hasLocationData: boolean;
    hasActionData: boolean;
    hasMMTData: boolean;
    hasTimelineData: boolean;
  } {
    return {
      totalCharts: dashboardData.locationCharts.length + 
                  dashboardData.actionCharts.length + 
                  dashboardData.mmtCharts.length + 
                  dashboardData.timelineCharts.length,
      totalRecords: dashboardData.totalRecords,
      hasLocationData: dashboardData.locationCharts.length > 0,
      hasActionData: dashboardData.actionCharts.length > 0,
      hasMMTData: dashboardData.mmtCharts.length > 0,
      hasTimelineData: dashboardData.timelineCharts.length > 0
    };
  }
}

export default ChartDataService;
