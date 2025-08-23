import { ExcelAnalysis } from './excelAnalysisService';
import PowerBIService from './powerBIService';
import DashboardService, { DashboardCreationRequest } from './dashboardService';
import * as XLSX from 'xlsx';

export interface PowerBIIntegrationResult {
  success: boolean;
  dashboardId?: string;
  powerBIDatasetId?: string;
  powerBIReportId?: string;
  embedUrl?: string;
  error?: string;
}

export class ExcelToPowerBIService {
  /**
   * Complete workflow: Excel Analysis → PowerBI Dataset → Dashboard Creation
   */
  static async createDashboardFromExcel(
    fileUrl: string,
    fileName: string,
    fileId: string,
    userId: string,
    excelAnalysis: ExcelAnalysis
  ): Promise<PowerBIIntegrationResult> {
    try {
      console.log('🚀 Starting Excel to PowerBI dashboard creation...');
      console.log('📊 File:', fileName);

      // Step 1: Create PowerBI Dataset from Excel structure
      console.log('1️⃣ Creating PowerBI dataset...');
      
      const datasetName = `${fileName.replace(/\.[^/.]+$/, '')}_${Date.now()}`;
      // Create a single sheet structure from the ExcelAnalysis
      const sheets = [{
        name: 'Sheet1',
        columns: excelAnalysis.columns.map(colName => ({
          name: colName,
          type: excelAnalysis.dataTypes[colName] || 'string'
        }))
      }];

      const datasetResult = await PowerBIService.createDataset(datasetName, sheets);
      
      if (!datasetResult.success || !datasetResult.datasetId) {
        throw new Error(`Failed to create PowerBI dataset: ${datasetResult.error}`);
      }

      const datasetId = datasetResult.datasetId;
      console.log('✅ PowerBI dataset created:', datasetId);

      // Step 2: Upload Excel data to PowerBI
      console.log('2️⃣ Uploading Excel data to PowerBI...');
      
      await this.uploadExcelDataToPowerBI(fileUrl, datasetId, excelAnalysis);
      console.log('✅ Excel data uploaded to PowerBI');

      // Step 3: Create PowerBI Report
      console.log('3️⃣ Creating PowerBI report...');
      
      const reportName = `${fileName} Dashboard`;
      const reportResult = await PowerBIService.createAutoReport(datasetId, reportName);
      
      if (!reportResult.success || !reportResult.reportId) {
        throw new Error(`Failed to create PowerBI report: ${reportResult.error}`);
      }

      const reportId = reportResult.reportId;
      const embedUrl = reportResult.embedUrl || '';
      console.log('✅ PowerBI report created:', reportId);

      // Step 4: Save Dashboard metadata to Firestore
      console.log('4️⃣ Saving dashboard metadata...');
      
      const totalRows = excelAnalysis.totalRows;
      
      const dashboardRequest: DashboardCreationRequest = {
        fileId,
        fileName,
        userId,
        powerBIDatasetId: datasetId,
        powerBIReportId: reportId,
        powerBIEmbedUrl: embedUrl,
        dashboardName: reportName,
        description: `Auto-generated dashboard for ${fileName}`,
        dataRowCount: totalRows,
        sheetCount: 1
      };

      const dashboardId = await DashboardService.createDashboard(dashboardRequest);
      console.log('✅ Dashboard metadata saved:', dashboardId);

      console.log('🎉 Excel to PowerBI dashboard creation completed successfully!');

      return {
        success: true,
        dashboardId,
        powerBIDatasetId: datasetId,
        powerBIReportId: reportId,
        embedUrl
      };

    } catch (error: any) {
      console.error('❌ Error creating PowerBI dashboard from Excel:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload Excel data to PowerBI dataset tables
   */
  private static async uploadExcelDataToPowerBI(
    fileUrl: string,
    datasetId: string,
    excelAnalysis: ExcelAnalysis
  ): Promise<void> {
    try {
      console.log('📤 Downloading and processing Excel file for PowerBI upload...');

      // Download the Excel file
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Process the main sheet (using the first sheet in the workbook)
      const sheetName = workbook.SheetNames[0];
      console.log(`📋 Processing sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length <= 1) {
        console.log(`⚠️ Skipping empty sheet: ${sheetName}`);
        return;
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Convert data to PowerBI format
      const powerBIRows = dataRows.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          let value = (row as any[])[index];
          
          // Handle data type conversion for PowerBI
          if (value !== null && value !== undefined && value !== '') {
            // Find column type from analysis
            const columnType = excelAnalysis.dataTypes[header];
            if (columnType) {
              switch (columnType) {
                case 'number':
                  value = typeof value === 'number' ? value : parseFloat(value) || 0;
                  break;
                case 'date':
                  if (typeof value === 'number') {
                    // Excel date serial number
                    const excelEpoch = new Date(1900, 0, 1);
                    const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
                    value = date.toISOString();
                  } else if (typeof value === 'string') {
                    const parsedDate = new Date(value);
                    value = isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
                  }
                  break;
                case 'boolean':
                  value = Boolean(value);
                  break;
                default:
                  value = String(value);
              }
            } else {
              value = String(value);
            }
          } else {
            value = null;
          }
          
          obj[header] = value;
        });
        return obj;
      });

      // Filter out rows with all null/empty values
      const validRows = powerBIRows.filter(row => 
        Object.values(row).some(val => val !== null && val !== undefined && val !== '')
      );

      console.log(`📊 Uploading ${validRows.length} rows to table: ${sheetName}`);

      // Upload data to PowerBI
      const uploadResult = await PowerBIService.uploadDataToTable(
        datasetId,
        sheetName,
        validRows
      );

      if (!uploadResult.success) {
        throw new Error(`Failed to upload data for sheet ${sheetName}: ${uploadResult.error}`);
      }

      console.log(`✅ Sheet ${sheetName} data uploaded successfully`);

    } catch (error: any) {
      console.error('❌ Error uploading Excel data to PowerBI:', error);
      throw error;
    }
  }

  /**
   * Check if dashboard already exists for a file
   */
  static async dashboardExistsForFile(fileId: string): Promise<boolean> {
    return await DashboardService.dashboardExistsForFile(fileId);
  }

  /**
   * Regenerate dashboard (delete old one and create new)
   */
  static async regenerateDashboard(
    fileUrl: string,
    fileName: string,
    fileId: string,
    userId: string,
    excelAnalysis: ExcelAnalysis
  ): Promise<PowerBIIntegrationResult> {
    try {
      console.log('🔄 Regenerating dashboard...');

      // Get existing dashboard
      const existingDashboard = await DashboardService.getDashboardByFileId(fileId);
      
      if (existingDashboard) {
        console.log('🗑️ Cleaning up existing dashboard...');
        
        // Delete PowerBI dataset (this also deletes associated reports)
        await PowerBIService.deleteDataset(existingDashboard.powerBIDatasetId);
        
        // Delete dashboard metadata
        if (existingDashboard.id) {
          await DashboardService.deleteDashboard(existingDashboard.id);
        }
      }

      // Create new dashboard
      return await this.createDashboardFromExcel(fileUrl, fileName, fileId, userId, excelAnalysis);

    } catch (error: any) {
      console.error('❌ Error regenerating dashboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test PowerBI connection before creating dashboard
   */
  static async testPowerBIConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      return await PowerBIService.testConnection();
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get embed token for viewing dashboard
   */
  static async getDashboardEmbedToken(dashboardId: string): Promise<string | null> {
    try {
      const dashboard = await DashboardService.getDashboardById(dashboardId);
      
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const embedToken = await PowerBIService.getEmbedToken(
        dashboard.powerBIReportId,
        dashboard.powerBIDatasetId
      );

      // Record the view
      await DashboardService.recordDashboardView(dashboardId);

      return embedToken;

    } catch (error: any) {
      console.error('❌ Error getting dashboard embed token:', error);
      return null;
    }
  }

  /**
   * Refresh dashboard data
   */
  static async refreshDashboard(dashboardId: string): Promise<boolean> {
    try {
      console.log('🔄 Refreshing dashboard data...');

      // Update status to refreshing
      await DashboardService.updateDashboardStatus(dashboardId, 'refreshing');

      // Note: PowerBI datasets in Push mode don't need manual refresh
      // The data is refreshed when new data is pushed
      
      // Update status back to ready
      await DashboardService.updateDashboardStatus(dashboardId, 'ready', 'Dashboard refreshed successfully');

      console.log('✅ Dashboard refreshed successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Error refreshing dashboard:', error);
      
      // Update status to error
      await DashboardService.updateDashboardStatus(dashboardId, 'error', `Refresh failed: ${error.message}`);
      
      return false;
    }
  }
}

export default ExcelToPowerBIService;
