import axios, { AxiosResponse } from 'axios';
import { 
  POWERBI_CLIENT_ID, 
  POWERBI_CLIENT_SECRET, 
  POWERBI_TENANT_ID, 
  POWERBI_WORKSPACE_ID,
  POWERBI_API_URL,
  POWERBI_LOGIN_URL 
} from '@env';

// PowerBI API Interfaces
export interface PowerBIAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface PowerBIDataset {
  id?: string;
  name: string;
  tables: PowerBITable[];
  defaultMode?: string;
}

export interface PowerBITable {
  name: string;
  columns: PowerBIColumn[];
}

export interface PowerBIColumn {
  name: string;
  dataType: 'String' | 'Int64' | 'Double' | 'DateTime' | 'Boolean';
}

export interface PowerBIReport {
  id: string;
  name: string;
  webUrl: string;
  embedUrl: string;
  datasetId: string;
}

export interface CreateDatasetResult {
  success: boolean;
  datasetId?: string;
  error?: string;
}

export interface UploadDataResult {
  success: boolean;
  error?: string;
}

export interface CreateReportResult {
  success: boolean;
  reportId?: string;
  embedUrl?: string;
  error?: string;
}

export class PowerBIService {
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  /**
   * Get OAuth2 access token for PowerBI API
   */
  static async getAccessToken(): Promise<string> {
    try {
      // Check if current token is still valid (with 5 min buffer)
      const now = Date.now();
      if (this.accessToken && this.tokenExpiry > now + 300000) {
        return this.accessToken;
      }

      console.log('🔐 Getting new PowerBI access token...');

      const tokenUrl = `${POWERBI_LOGIN_URL}/${POWERBI_TENANT_ID}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', POWERBI_CLIENT_ID);
      params.append('client_secret', POWERBI_CLIENT_SECRET);
      params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');
      params.append('grant_type', 'client_credentials');

      const response: AxiosResponse<PowerBIAccessToken> = await axios.post(
        tokenUrl,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + (response.data.expires_in * 1000);

      console.log('✅ PowerBI access token obtained successfully');
      return this.accessToken;

    } catch (error: any) {
      console.error('❌ Error getting PowerBI access token:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      
      throw new Error(`Failed to get PowerBI access token: ${error.message}`);
    }
  }

  /**
   * Create API headers with authorization
   */
  private static async getHeaders(): Promise<{ [key: string]: string }> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Convert Excel column type to PowerBI data type
   */
  private static mapDataType(excelType: string): 'String' | 'Int64' | 'Double' | 'DateTime' | 'Boolean' {
    switch (excelType.toLowerCase()) {
      case 'number':
        return 'Double';
      case 'date':
        return 'DateTime';
      case 'boolean':
        return 'Boolean';
      default:
        return 'String';
    }
  }

  /**
   * Create PowerBI dataset from Excel analysis
   */
  static async createDataset(
    datasetName: string,
    sheets: Array<{
      name: string;
      columns: Array<{ name: string; type: string }>;
    }>
  ): Promise<CreateDatasetResult> {
    try {
      console.log('📊 Creating PowerBI dataset:', datasetName);

      const headers = await this.getHeaders();
      
      // Convert sheets to PowerBI tables
      const tables: PowerBITable[] = sheets.map(sheet => ({
        name: sheet.name,
        columns: sheet.columns.map(col => ({
          name: col.name,
          dataType: this.mapDataType(col.type)
        }))
      }));

      const dataset: PowerBIDataset = {
        name: datasetName,
        tables: tables,
        defaultMode: 'Push'
      };

      const response = await axios.post(
        `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets`,
        dataset,
        { headers }
      );

      console.log('✅ PowerBI dataset created successfully:', response.data.id);

      return {
        success: true,
        datasetId: response.data.id
      };

    } catch (error: any) {
      console.error('❌ Error creating PowerBI dataset:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload data to PowerBI dataset table
   */
  static async uploadDataToTable(
    datasetId: string,
    tableName: string,
    rows: any[]
  ): Promise<UploadDataResult> {
    try {
      console.log(`📤 Uploading ${rows.length} rows to table: ${tableName}`);

      const headers = await this.getHeaders();

      // PowerBI has row limits, so we'll batch the data
      const batchSize = 1000;
      const batches = [];
      
      for (let i = 0; i < rows.length; i += batchSize) {
        batches.push(rows.slice(i, i + batchSize));
      }

      // Upload each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 Uploading batch ${i + 1}/${batches.length} (${batch.length} rows)`);

        await axios.post(
          `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets/${datasetId}/tables/${tableName}/rows`,
          { rows: batch },
          { headers }
        );
      }

      console.log('✅ Data uploaded successfully to PowerBI');

      return { success: true };

    } catch (error: any) {
      console.error('❌ Error uploading data to PowerBI:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create auto-generated report from dataset
   */
  static async createAutoReport(
    datasetId: string,
    reportName: string
  ): Promise<CreateReportResult> {
    try {
      console.log('📊 Creating auto-generated report:', reportName);

      const headers = await this.getHeaders();

      // Create basic report
      const reportData = {
        name: reportName,
        datasetId: datasetId
      };

      const response = await axios.post(
        `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/reports`,
        reportData,
        { headers }
      );

      const reportId = response.data.id;
      const embedUrl = response.data.embedUrl;

      console.log('✅ PowerBI report created successfully:', reportId);

      return {
        success: true,
        reportId: reportId,
        embedUrl: embedUrl
      };

    } catch (error: any) {
      console.error('❌ Error creating PowerBI report:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get embed token for report viewing
   */
  static async getEmbedToken(reportId: string, datasetId: string): Promise<string> {
    try {
      console.log('🔑 Getting embed token for report:', reportId);

      const headers = await this.getHeaders();

      const embedData = {
        reports: [{ id: reportId }],
        datasets: [{ id: datasetId }],
        tokenLifetimeInMinutes: 60
      };

      const response = await axios.post(
        `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/GenerateToken`,
        embedData,
        { headers }
      );

      console.log('✅ Embed token generated successfully');
      return response.data.token;

    } catch (error: any) {
      console.error('❌ Error getting embed token:', error);
      throw new Error(`Failed to get embed token: ${error.message}`);
    }
  }

  /**
   * List all datasets in workspace
   */
  static async getDatasets(): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.get(
        `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets`,
        { headers }
      );

      return response.data.value || [];

    } catch (error: any) {
      console.error('❌ Error getting datasets:', error);
      return [];
    }
  }

  /**
   * List all reports in workspace
   */
  static async getReports(): Promise<PowerBIReport[]> {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.get(
        `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/reports`,
        { headers }
      );

      return response.data.value || [];

    } catch (error: any) {
      console.error('❌ Error getting reports:', error);
      return [];
    }
  }

  /**
   * Delete dataset
   */
  static async deleteDataset(datasetId: string): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      
      await axios.delete(
        `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets/${datasetId}`,
        { headers }
      );

      console.log('✅ Dataset deleted successfully:', datasetId);
      return true;

    } catch (error: any) {
      console.error('❌ Error deleting dataset:', error);
      return false;
    }
  }

  /**
   * Test PowerBI connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing PowerBI connection...');
      
      await this.getAccessToken();
      const datasets = await this.getDatasets();
      
      console.log('✅ PowerBI connection test successful');
      console.log('📊 Found', datasets.length, 'datasets in workspace');
      
      return { success: true };

    } catch (error: any) {
      console.error('❌ PowerBI connection test failed:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

export default PowerBIService;
