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

      for (const sheetAnalysis of analysis.sheets) {
        console.log(`📋 Processing sheet: ${sheetAnalysis.name}`);
        
        const sheetData = await this.extractSheetData(workbook, sheetAnalysis);
        totalRecords += sheetData.length;

        // Generate location-based charts
        const locationChart = this.generateLocationChart(sheetAnalysis.name, sheetData);
        if (locationChart) locationCharts.push(locationChart);

        // Generate action-based charts
        const actionChart = this.generateActionChart(sheetAnalysis.name, sheetData);
        if (actionChart) actionCharts.push(actionChart);

        // Generate MMT-based charts
        const mmtChart = this.generateMMTChart(sheetAnalysis.name, sheetData);
        if (mmtChart) mmtCharts.push(mmtChart);

        // Generate timeline charts (if date fields exist)
        const timelineChart = this.generateTimelineChart(sheetAnalysis.name, sheetData, sheetAnalysis);
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
   * Generate location-based chart
   */
  private static generateLocationChart(sheetName: string, data: any[]): LocationChart | null {
    // Find location-related columns
    const locationColumns = this.findLocationColumns(data);
    if (locationColumns.length === 0) return null;

    const locationColumn = locationColumns[0];
    const locationCounts = this.countOccurrences(data, locationColumn);
    
    // Sort by count and take top 15
    const sortedData = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([label, value], index) => ({
        label: this.truncateLabel(label),
        value,
        color: this.getColorForIndex(index)
      }));

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
        label: this.truncateLabel(label),
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
   * Generate MMT-based chart
   */
  private static generateMMTChart(sheetName: string, data: any[]): MMTChart | null {
    // Find MMT-related columns
    const mmtColumns = this.findMMTColumns(data);
    if (mmtColumns.length === 0) return null;

    // Count MMTs by different categories
    const mmtColumn = mmtColumns[0];
    const mmtCounts = this.countOccurrences(data, mmtColumn);
    
    // For MMT analysis, we might want to show distribution or status
    const chartData = Object.entries(mmtCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 12)
      .map(([label, value], index) => ({
        label: this.truncateLabel(label),
        value,
        color: this.getColorForIndex(index)
      }));

    return {
      type: 'mmt',
      title: `${sheetName} - MMT Distribution`,
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
    sheetAnalysis: ExcelSheetAnalysis
  ): TimelineChart | null {
    // Find date columns
    const dateColumns = sheetAnalysis.columns.filter(col => col.type === 'date');
    if (dateColumns.length === 0) return null;

    const dateColumn = dateColumns[0].name;
    
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
    return headers.filter(header => 
      header.toLowerCase().includes('location') ||
      header.toLowerCase().includes('site') ||
      header.toLowerCase().includes('building') ||
      header.toLowerCase().includes('area') ||
      header.toLowerCase().includes('zone') ||
      header.toLowerCase().includes('functional location')
    );
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
