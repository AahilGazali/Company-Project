import * as XLSX from 'xlsx';

export interface ExcelColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: any[];
  uniqueCount: number;
}

export interface ExcelSheetAnalysis {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ExcelColumn[];
  sampleData: any[];
  summary: string;
}

export interface ExcelAnalysis {
  fileName: string;
  fileSize: number;
  sheets: ExcelSheetAnalysis[];
  overallSummary: string;
  keyFields: string[];
  dataTypes: { [key: string]: string };
}

export class ExcelAnalysisService {
  /**
   * Analyze Excel file from URL and extract structure and sample data
   */
  static async analyzeExcelFile(fileUrl: string, fileName: string): Promise<ExcelAnalysis> {
    try {
      console.log('🔍 Starting Excel analysis for:', fileName);
      console.log('📂 File URL:', fileUrl);
      
      // Validate URL
      if (!fileUrl || fileUrl.trim() === '') {
        throw new Error('File URL is empty or invalid');
      }
      
      // Download the file with better error handling
      console.log('📥 Downloading file from Firebase Storage...');
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*'
        }
      });
      
      console.log('📊 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ Download failed. Status:', response.status, 'Error:', errorText);
        throw new Error(`Failed to download file: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('📦 Downloaded file size:', arrayBuffer.byteLength, 'bytes');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheets: ExcelSheetAnalysis[] = [];
      const allColumns = new Set<string>();
      
      // Analyze each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) continue;
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        // Analyze columns
        const columns: ExcelColumn[] = headers.map((header, index) => {
          const columnData = dataRows.map(row => (row as any[])[index]).filter(val => val !== undefined && val !== null && val !== '');
          
          // Determine data type
          let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
          if (columnData.length > 0) {
            if (columnData.every(val => typeof val === 'number' || !isNaN(Number(val)))) {
              type = 'number';
            } else if (columnData.some(val => this.isDate(val))) {
              type = 'date';
            } else if (columnData.every(val => typeof val === 'boolean' || val === 'true' || val === 'false')) {
              type = 'boolean';
            }
          }
          
          // Get sample values and unique count
          const uniqueValues = [...new Set(columnData)];
          const sampleValues = uniqueValues.slice(0, 5);
          
          allColumns.add(header);
          
          return {
            name: header,
            type,
            sampleValues,
            uniqueCount: uniqueValues.length
          };
        });
        
        // Get sample data (first 5 rows)
        const sampleData = dataRows.slice(0, 5).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index];
          });
          return obj;
        });
        
        // Generate sheet summary
        const summary = this.generateSheetSummary(sheetName, dataRows.length, columns);
        
        sheets.push({
          name: sheetName,
          rowCount: dataRows.length,
          columnCount: headers.length,
          columns,
          sampleData,
          summary
        });
      }
      
      // Generate overall analysis
      const keyFields = this.identifyKeyFields(sheets);
      const dataTypes = this.generateDataTypesMap(sheets);
      const overallSummary = this.generateOverallSummary(fileName, sheets, keyFields);
      
      console.log('✅ Excel analysis completed successfully');
      
      return {
        fileName,
        fileSize: arrayBuffer.byteLength,
        sheets,
        overallSummary,
        keyFields,
        dataTypes
      };
      
    } catch (error) {
      console.error('❌ Error analyzing Excel file:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to download file')) {
          throw new Error(`Could not download Excel file. Please check if the file still exists and you have access permissions. Original error: ${error.message}`);
        } else if (error.message.includes('XLSX')) {
          throw new Error(`Could not parse Excel file. Please ensure the file is a valid Excel format (.xlsx, .xls). Original error: ${error.message}`);
        } else {
          throw new Error(`Analysis failed: ${error.message}`);
        }
      } else {
        throw new Error(`Failed to analyze Excel file: ${error}`);
      }
    }
  }
  
  /**
   * Check if a value could be a date
   */
  private static isDate(value: any): boolean {
    if (typeof value === 'number') {
      // Excel date serial numbers
      return value > 25000 && value < 50000;
    }
    if (typeof value === 'string') {
      return !isNaN(Date.parse(value));
    }
    return false;
  }
  
  /**
   * Generate summary for a sheet
   */
  private static generateSheetSummary(sheetName: string, rowCount: number, columns: ExcelColumn[]): string {
    const numericColumns = columns.filter(col => col.type === 'number').map(col => col.name);
    const dateColumns = columns.filter(col => col.type === 'date').map(col => col.name);
    
    let summary = `Sheet "${sheetName}" contains ${rowCount} rows of data with ${columns.length} columns. `;
    
    if (numericColumns.length > 0) {
      summary += `Numeric fields: ${numericColumns.join(', ')}. `;
    }
    
    if (dateColumns.length > 0) {
      summary += `Date fields: ${dateColumns.join(', ')}. `;
    }
    
    // Identify potential key columns
    const keyColumns = columns.filter(col => 
      col.name.toLowerCase().includes('id') || 
      col.name.toLowerCase().includes('location') ||
      col.name.toLowerCase().includes('name') ||
      col.uniqueCount === rowCount
    ).map(col => col.name);
    
    if (keyColumns.length > 0) {
      summary += `Key identifying fields: ${keyColumns.join(', ')}.`;
    }
    
    return summary;
  }
  
  /**
   * Identify key fields across all sheets
   */
  private static identifyKeyFields(sheets: ExcelSheetAnalysis[]): string[] {
    const keyFields = new Set<string>();
    
    sheets.forEach(sheet => {
      sheet.columns.forEach(column => {
        const name = column.name.toLowerCase();
        // Common key field patterns
        if (
          name.includes('id') ||
          name.includes('location') ||
          name.includes('name') ||
          name.includes('code') ||
          name.includes('mmt') ||
          name.includes('action') ||
          name.includes('date') ||
          name.includes('time') ||
          name.includes('status') ||
          column.uniqueCount === sheet.rowCount // Unique identifier
        ) {
          keyFields.add(column.name);
        }
      });
    });
    
    return Array.from(keyFields);
  }
  
  /**
   * Generate data types mapping
   */
  private static generateDataTypesMap(sheets: ExcelSheetAnalysis[]): { [key: string]: string } {
    const dataTypes: { [key: string]: string } = {};
    
    sheets.forEach(sheet => {
      sheet.columns.forEach(column => {
        dataTypes[column.name] = column.type;
      });
    });
    
    return dataTypes;
  }
  
  /**
   * Generate overall summary
   */
  private static generateOverallSummary(fileName: string, sheets: ExcelSheetAnalysis[], keyFields: string[]): string {
    const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
    const allColumns = new Set<string>();
    
    sheets.forEach(sheet => {
      sheet.columns.forEach(column => {
        allColumns.add(column.name);
      });
    });
    
    let summary = `Excel file "${fileName}" contains ${sheets.length} sheet(s) with a total of ${totalRows} rows of data. `;
    summary += `Available data fields: ${Array.from(allColumns).join(', ')}. `;
    
    if (keyFields.length > 0) {
      summary += `Key fields for querying: ${keyFields.join(', ')}. `;
    }
    
    // Add context about what kind of data this appears to be
    const hasMMT = Array.from(allColumns).some(col => col.toLowerCase().includes('mmt'));
    const hasLocation = Array.from(allColumns).some(col => col.toLowerCase().includes('location'));
    const hasAction = Array.from(allColumns).some(col => col.toLowerCase().includes('action'));
    const hasDate = Array.from(allColumns).some(col => col.toLowerCase().includes('date') || col.toLowerCase().includes('time'));
    
    if (hasMMT && hasLocation) {
      summary += 'This appears to be MMT (Material Management Tool) data with location-based information. ';
    }
    
    if (hasAction) {
      summary += 'Contains action/activity tracking information. ';
    }
    
    if (hasDate) {
      summary += 'Includes time-based data for historical analysis. ';
    }
    
    summary += 'You can ask questions about this data such as counts, summaries, filtering by location, time periods, or specific values.';
    
    return summary;
  }
  
  /**
   * Extract contextual data for AI queries with enhanced keyword detection
   */
  static generateDataContext(analysis: ExcelAnalysis): string {
    let context = `EXCEL DATA ANALYSIS for ${analysis.fileName}:\n\n`;
    
    context += `OVERVIEW:\n`;
    context += `- File: ${analysis.fileName}\n`;
    context += `- Total Records: ${analysis.sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0)}\n`;
    context += `- Sheets: ${analysis.sheets.length}\n\n`;
    
    analysis.sheets.forEach((sheet, sheetIndex) => {
      context += `SHEET ${sheetIndex + 1}: "${sheet.name}"\n`;
      context += `- Record Count: ${sheet.rowCount}\n`;
      context += `- Available Columns: ${sheet.columns.map(col => col.name).join(', ')}\n\n`;
      
      // Detailed column information for better keyword matching
      context += `COLUMN DETAILS:\n`;
      sheet.columns.forEach(col => {
        context += `- ${col.name} (${col.type}): `;
        if (col.sampleValues.length > 0) {
          context += `Sample values: ${col.sampleValues.slice(0, 3).join(', ')}`;
          if (col.uniqueCount > 1) {
            context += ` (${col.uniqueCount} unique values)`;
          }
        }
        context += '\n';
      });
      context += '\n';
      
      // Enhanced sample data with more context for AI filtering
      if (sheet.sampleData.length > 0) {
        context += `SAMPLE RECORDS (Use these for filtering and providing specific results):\n`;
        sheet.sampleData.slice(0, 5).forEach((row, index) => {
          context += `Record ${index + 1}:\n`;
          Object.entries(row).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
              context += `  - ${key}: ${value}\n`;
            }
          });
          context += '\n';
        });
        
        // Add filtering guidance
        context += `FILTERING GUIDANCE:\n`;
        context += `- When user asks for specific conditions, filter these sample records\n`;
        context += `- Provide actual location names, serial numbers, and descriptions from above data\n`;
        context += `- Don't explain how to filter - show the filtered results directly\n\n`;
      }
    });
    
    // Add keyword mapping hints
    context += `KEYWORD HINTS FOR AI:\n`;
    context += `- Field Names: ${analysis.keyFields.join(', ')}\n`;
    
    // Extract common value patterns for better keyword detection
    const valuePatterns: string[] = [];
    analysis.sheets.forEach(sheet => {
      sheet.columns.forEach(col => {
        if (col.sampleValues.length > 0) {
          col.sampleValues.forEach(val => {
            if (typeof val === 'string' && val.length > 2 && val.length < 50) {
              valuePatterns.push(val.toString());
            }
          });
        }
      });
    });
    
    if (valuePatterns.length > 0) {
      const uniquePatterns = [...new Set(valuePatterns)].slice(0, 20);
      context += `- Common Values: ${uniquePatterns.join(', ')}\n`;
    }
    
    context += `\nDATA SUMMARY: ${analysis.overallSummary}\n`;
    
    return context;
  }
}
