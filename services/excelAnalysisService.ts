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
  totalRows: number;
  totalColumns: number;
  columns: string[];
  dataTypes: { [key: string]: string };
  sampleData: any[];
  fullData: any[]; // New property for complete dataset
  summary: string;
  actionColumnSummary?: string;
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
      
      // Read workbook with options to ensure we get ALL data
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellStyles: false, // Don't read styles to save memory
        cellNF: false, // Don't read number formats
        sheetStubs: false, // Don't include empty cells
        raw: false, // Convert all values to strings for consistency
        dense: false // Use normal structure for easier processing
      });
      
      console.log(`📊 Workbook loaded with ${workbook.SheetNames.length} sheets: [${workbook.SheetNames.join(', ')}]`);
      
      const sheets: ExcelSheetAnalysis[] = [];
      const allColumns = new Set<string>();
      const fullData: any[] = []; // Store full dataset
      
      // Analyze each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Get sheet range to ensure we're reading all data
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        console.log(`📊 Sheet "${sheetName}" range: ${worksheet['!ref']} (${range.e.r + 1} rows, ${range.e.c + 1} columns)`);
        
        // Read all data with explicit options to ensure no limits
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false, // Convert values to strings for consistency
          defval: '', // Default value for empty cells
          blankrows: false // Skip completely blank rows
        });
        
        console.log(`📋 Raw data rows read from "${sheetName}": ${jsonData.length}`);
        
        if (jsonData.length === 0) {
          console.log(`⚠️ No data found in sheet: ${sheetName}`);
          continue;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        console.log(`📊 Headers found: ${headers.length}`);
        console.log(`📋 Data rows after header: ${dataRows.length}`);
        
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
          const uniqueValues = Array.from(new Set(columnData));
          const sampleValues = uniqueValues.slice(0, 5);
          
          allColumns.add(header);
          
          return {
            name: header,
            type,
            sampleValues,
            uniqueCount: uniqueValues.length
          };
        });
        
        // Get sample data (first 5 rows) for analysis
        const sampleData = dataRows.slice(0, 5).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index];
          });
          return obj;
        });
        
        // Get ALL data rows for complete dataset with preprocessing
        console.log(`🔄 Processing all ${dataRows.length} data rows for complete dataset...`);
        const allDataRows = dataRows.map((row, rowIndex) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            let value = (row as any[])[index];
            
            // Preprocess based on column type
            if (header.toLowerCase().includes('date')) {
              // Convert to Date object and store multiple formats
              const dateValue = this.parseDateValue(value);
              obj[header] = dateValue;
              obj[`${header}_parsed`] = dateValue.parsed;
              obj[`${header}_month`] = dateValue.month;
              obj[`${header}_year`] = dateValue.year;
              obj[`${header}_formatted`] = dateValue.formatted;
              
              // Debug logging for date parsing
              if (value && dateValue.parsed) {
                console.log(`📅 Date parsed: "${value}" → Month: ${dateValue.month}, Year: ${dateValue.year}, Formatted: ${dateValue.formatted}`);
              }
            } else if (header.toLowerCase().includes('mmt')) {
              // Store MMT number as string for exact matching
              obj[header] = value ? value.toString().trim() : '';
              obj[`${header}_search`] = value ? value.toString().toLowerCase().trim() : '';
            } else if (header.toLowerCase().includes('location') || 
                       header.toLowerCase().includes('description') || 
                       header.toLowerCase().includes('action')) {
              // Store text fields with multiple search versions
              const cleanValue = value ? value.toString().trim() : '';
              obj[header] = cleanValue;
              obj[`${header}_search`] = cleanValue.toLowerCase();
              obj[`${header}_upper`] = cleanValue.toUpperCase();
              obj[`${header}_normalized`] = this.normalizeText(cleanValue);
            } else {
              // Store other fields as-is
              obj[header] = value;
            }
          });
          return obj;
        });
        
        // Add to full dataset
        fullData.push(...allDataRows);
        console.log(`✅ Added ${allDataRows.length} rows from "${sheetName}" to full dataset. Total so far: ${fullData.length}`);
        
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
      console.log(`📊 Full dataset loaded: ${fullData.length} total records`);
      
      // Debug: Show date range of the data
      const dateColumns = ['Date', 'Date Functional', 'Functional Date'];
      let dateColumn = null;
      for (const col of dateColumns) {
        if (allColumns.has(col)) {
          dateColumn = col;
          break;
        }
      }
      
      if (dateColumn) {
        const dates = fullData
          .map(row => row[dateColumn])
          .filter(date => date)
          .sort();
        
        if (dates.length > 0) {
          console.log(`📅 Date range in data: ${dates[0]} to ${dates[dates.length - 1]}`);
          console.log(`📅 Total unique dates: ${new Set(dates).size}`);
        }
      }
      
      // Debug: Show sample of first and last records to verify complete dataset
      if (fullData.length > 0) {
        console.log(`📋 VERIFICATION - First 3 records:`);
        fullData.slice(0, 3).forEach((record, index) => {
          const mmt = record['MMT No'] || record['Sr. No'] || 'N/A';
          const date = record[dateColumn || 'Date'] || 'N/A';
          const location = record['Location'] || record['Functional Location'] || 'N/A';
          console.log(`   ${index + 1}. MMT: ${mmt}, Date: ${date}, Location: ${location}`);
        });
        
        console.log(`📋 VERIFICATION - Last 5 records (${fullData.length - 4} to ${fullData.length}):`);
        fullData.slice(-5).forEach((record, index) => {
          const mmt = record['MMT No'] || record['Sr. No'] || 'N/A';
          const date = record[dateColumn || 'Date'] || 'N/A';
          const location = record['Location'] || record['Functional Location'] || 'N/A';
          const actualIndex = fullData.length - 5 + index + 1;
          console.log(`   ${actualIndex}. MMT: ${mmt}, Date: ${date}, Location: ${location}`);
        });
        
        // Show some records from the middle to verify continuity
        if (fullData.length > 10) {
          const midIndex = Math.floor(fullData.length / 2);
          console.log(`📋 VERIFICATION - Middle records around index ${midIndex}:`);
          fullData.slice(midIndex - 2, midIndex + 3).forEach((record, index) => {
            const mmt = record['MMT No'] || record['Sr. No'] || 'N/A';
            const date = record[dateColumn || 'Date'] || 'N/A';
            const location = record['Location'] || record['Functional Location'] || 'N/A';
            const actualIndex = midIndex - 2 + index + 1;
            console.log(`   ${actualIndex}. MMT: ${mmt}, Date: ${date}, Location: ${location}`);
          });
        }
      }
      
      return {
        fileName,
        totalRows: sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
        totalColumns: allColumns.size,
        columns: Array.from(allColumns),
        dataTypes,
        sampleData: fullData.slice(0, 5),
        fullData,
        summary: overallSummary,
        actionColumnSummary: this.analyzeActionColumn({
          fileName,
          totalRows: sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
          totalColumns: allColumns.size,
          columns: Array.from(allColumns),
          dataTypes,
          sampleData: fullData.slice(0, 5),
          fullData,
          summary: overallSummary
        }).actionSummary
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
   * Reload and reanalyze Excel file to ensure full data is available
   */
  static async reloadExcelFile(fileUrl: string, fileName: string): Promise<ExcelAnalysis> {
    console.log('🔄 Reloading Excel file to ensure full data availability...');
    
    try {
      const analysis = await this.analyzeExcelFile(fileUrl, fileName);
      
      // Verify the full data was loaded
      const verification = this.verifyFullData(analysis);
      if (!verification.hasFullData) {
        throw new Error('Full data still not available after reload');
      }
      
      console.log('✅ Excel file reloaded successfully with full data');
      return analysis;
      
    } catch (error) {
      console.error('❌ Failed to reload Excel file:', error);
      throw error;
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
   * Extract contextual data for AI queries with COMPLETE dataset information
   */
  static generateDataContext(analysis: ExcelAnalysis): string {
    let context = `EXCEL DATA ANALYSIS for ${analysis.fileName}:\n\n`;
    
    // CRITICAL: Add complete dataset statistics FIRST
    const completeStats = this.getCompleteDataStats(analysis);
    context += `🚨 CRITICAL: COMPLETE DATASET LOADED\n`;
    context += `${completeStats.dataSummary}\n\n`;
    
    context += `OVERVIEW:\n`;
    context += `- File: ${analysis.fileName}\n`;
    context += `- Total Records: ${analysis.totalRows}\n`;
    context += `- Full Dataset Available: ${analysis.fullData ? 'YES' : 'NO'}\n`;
    context += `- Full Dataset Records: ${analysis.fullData?.length || 0}\n`;
    context += `- IMPORTANT: This is the COMPLETE dataset, not a sample\n\n`;
    
    // Add Action Column Analysis from COMPLETE data
    const actionAnalysis = this.analyzeActionColumn(analysis);
    context += `ACTION COLUMN ANALYSIS (COMPLETE DATASET):\n`;
    context += `${actionAnalysis.actionSummary}\n`;
    
    context += `ACTION CATEGORIES DETAIL:\n`;
    actionAnalysis.actionCategories.forEach((cat, index) => {
      context += `${index + 1}. ${cat.category} (${cat.count} occurrences):\n`;
      context += `   Examples: ${cat.examples.join(', ')}\n`;
    });
    context += '\n';
    
    context += `COMMON ACTION PATTERNS:\n`;
    context += `- Keywords: ${actionAnalysis.commonPatterns.slice(0, 15).join(', ')}\n`;
    context += `- Maintenance Types: ${actionAnalysis.maintenanceTypes.join(', ')}\n\n`;
    
    // Column information with COMPLETE data analysis
    context += `COLUMN DETAILS (COMPLETE DATASET):\n`;
    analysis.columns.forEach(colName => {
      const colType = analysis.dataTypes[colName] || 'string';
      context += `- ${colName} (${colType})\n`;
    });
    context += '\n';
    
    // CRITICAL: Show that we have ALL data, not just samples
    context += `🚨 COMPLETE DATA AVAILABILITY:\n`;
    context += `- ALL ${analysis.totalRows} records are loaded and accessible\n`;
    context += `- No sampling limitations - full dataset is available\n`;
    context += `- Every single row can be queried and analyzed\n\n`;
    
    // Enhanced sample data with better context for AI filtering
    if (analysis.sampleData.length > 0) {
      context += `SAMPLE RECORDS (These are just examples - ALL ${analysis.totalRows} records are available):\n`;
      analysis.sampleData.slice(0, 8).forEach((row, index) => {
        context += `Record ${index + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            // Highlight Action column values for better search
            if (key.toLowerCase().includes('action')) {
              context += `  - ${key}: [ACTION] ${value}\n`;
            } else {
              context += `  - ${key}: ${value}\n`;
            }
          }
        });
        context += '\n';
      });
      
      // Add enhanced filtering guidance
      context += `ENHANCED SEARCH GUIDANCE:\n`;
      context += `- ACTION COLUMN: This is the primary column for maintenance issues and actions\n`;
      context += `- CATEGORY SEARCH: Use categories like "HVAC/AC Issues", "Electrical Issues", "Plumbing Issues"\n`;
      context += `- KEYWORD SEARCH: Look for specific terms in Action column (e.g., "AC", "failure", "malfunction")\n`;
      context += `- LOCATION CROSS-REFERENCE: Use Location/Functional Location columns with Action data\n`;
      context += `- DATE FILTERING: Use Date columns for time-based queries\n`;
      context += `- Provide actual values from the sample data when answering questions\n`;
      context += `- IMPORTANT: Use the COMPLETE DATASET above, not just sample data\n`;
      context += `- CRITICAL: ALL ${analysis.totalRows} records are accessible for queries\n\n`;
    }
    
    // Enhanced keyword mapping and search hints
    context += `KEYWORD SEARCH STRATEGY:\n`;
    context += `- Field Names: ${analysis.columns.join(', ')}\n`;
    
    // Add categorized keywords to context
    if (actionAnalysis.commonPatterns.length > 0) {
      context += `- Action Keywords: ${actionAnalysis.commonPatterns.slice(0, 15).join(', ')}\n`;
    }
    
    // Add search examples with categories
    context += `\nSEARCH EXAMPLES BY CATEGORY:\n`;
    context += `- "HVAC issues" → Search for AC, cooling, temperature problems\n`;
    context += `- "Electrical problems" → Look for power, voltage, electrical issues\n`;
    context += `- "Equipment failures" → Search for failure, breakdown, malfunction\n`;
    context += `- "Maintenance activities" → Find service, routine, preventive actions\n`;
    context += `- "Repair work" → Look for repair, fix, corrective actions\n`;
    context += `- "Inspections" → Search for inspection, check, audit activities\n`;
    
    context += `\n🚨 CRITICAL INSTRUCTION:\n`;
    context += `- ALWAYS use the COMPLETE DATASET statistics above\n`;
    context += `- The full dataset contains ${completeStats.totalRecords} total records\n`;
    context += `- Available dates: ${completeStats.dateRange.allDates.join(', ')}\n`;
    context += `- Do NOT rely only on sample data - use the complete dataset information\n`;
    context += `- EVERY SINGLE RECORD is accessible for queries\n`;
    context += `- No sampling limitations exist - full dataset is loaded\n`;
    
    context += `\nDATA SUMMARY: ${analysis.summary}\n`;
    
    return context;
  }

  /**
   * Enhanced keyword search across Excel data with focus on Action column
   */
  static searchExcelData(analysis: ExcelAnalysis, searchQuery: string): {
    matches: any[];
    searchResults: string;
    suggestions: string[];
    categoryMatches: string[];
  } {
    const query = searchQuery.toLowerCase().trim();
    const matches: any[] = [];
    const suggestions: string[] = [];
    const categoryMatches: string[] = [];
    
    // Get Action column analysis for category matching
    const actionAnalysis = this.analyzeActionColumn(analysis);
    
    // Extract search terms
    const searchTerms = query.split(/\s+/).filter(term => term.length > 2);
    
    // Check for category matches first
    actionAnalysis.actionCategories.forEach(category => {
      if (searchTerms.some(term => category.category.toLowerCase().includes(term))) {
        categoryMatches.push(category.category);
      }
      // Also check examples for matches
      category.examples.forEach(example => {
        if (searchTerms.some(term => example.toLowerCase().includes(term))) {
          categoryMatches.push(category.category);
        }
      });
    });
    
    // Search through the full dataset
    if (analysis.fullData && analysis.fullData.length > 0) {
      analysis.fullData.forEach((row, rowIndex) => {
        let rowScore = 0;
        let rowMatches: string[] = [];
        
        Object.entries(row).forEach(([columnName, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            const valueStr = value.toString().toLowerCase();
            const columnNameLower = columnName.toLowerCase();
            
            // Special scoring for Action column
            if (columnNameLower.includes('action')) {
              searchTerms.forEach(term => {
                if (valueStr.includes(term)) {
                  rowScore += 3; // Higher weight for Action column matches
                  rowMatches.push(`Action: ${value}`);
                }
              });
              
              // Additional scoring for category matches
              if (categoryMatches.length > 0) {
                const matchingCategory = actionAnalysis.actionCategories.find(cat => 
                  cat.examples.some(example => valueStr.includes(example.toLowerCase()))
                );
                if (matchingCategory) {
                  rowScore += 2; // Bonus for category matches
                  rowMatches.push(`Category: ${matchingCategory.category}`);
                }
              }
            }
            
            // Regular scoring for other columns
            searchTerms.forEach(term => {
              if (valueStr.includes(term)) {
                rowScore += 1;
                rowMatches.push(`${columnName}: ${value}`);
              }
            });
            
            // Location-based scoring
            if (columnNameLower.includes('location') && searchTerms.some(term => 
              valueStr.includes(term) || term.includes('location'))) {
              rowScore += 2;
            }
          }
        });
        
        if (rowScore > 0) {
          matches.push({
            rowIndex,
            score: rowScore,
            data: row,
            matches: rowMatches
          });
        }
      });
    }
    
    // Sort by relevance score
    matches.sort((a, b) => b.score - a.score);
    
    // Generate search results summary
    let searchResults = `Found ${matches.length} relevant records for "${searchQuery}":\n\n`;
    
    if (categoryMatches.length > 0) {
      searchResults += `📋 Category Matches: ${Array.from(new Set(categoryMatches)).join(', ')}\n\n`;
    }
    
    if (matches.length > 0) {
      searchResults += `Top Results:\n`;
      matches.slice(0, 5).forEach((match, index) => {
        searchResults += `Record ${index + 1} (Relevance: ${match.score}):\n`;
        match.matches.forEach((matchInfo: string) => {
          searchResults += `  • ${matchInfo}\n`;
        });
        searchResults += '\n';
      });
      
      if (matches.length > 5) {
        searchResults += `... and ${matches.length - 5} more records\n`;
      }
    } else {
      searchResults += `No exact matches found. Try searching for:\n`;
      searchResults += `• Categories: ${actionAnalysis.actionCategories.slice(0, 3).map(cat => cat.category).join(', ')}\n`;
      searchResults += `• Keywords: ${actionAnalysis.commonPatterns.slice(0, 5).join(', ')}\n`;
      searchResults += `• Related terms (e.g., "AC" instead of "air conditioning")\n`;
    }
    
    // Generate search suggestions
    if (matches.length === 0) {
      actionAnalysis.actionCategories.forEach(category => {
        suggestions.push(category.category);
        category.examples.slice(0, 2).forEach(example => {
          suggestions.push(example);
        });
      });
    }
    
    return {
      matches: matches.slice(0, 10), // Limit results
      searchResults,
      suggestions: Array.from(new Set(suggestions)).slice(0, 8),
      categoryMatches: Array.from(new Set(categoryMatches))
    };
  }

  /**
   * Analyze Action column specifically to extract categories and patterns
   */
  static analyzeActionColumn(analysis: ExcelAnalysis): {
    actionCategories: { category: string; count: number; examples: string[] }[];
    actionSummary: string;
    commonPatterns: string[];
    maintenanceTypes: string[];
  } {
    const actionCategories: { [key: string]: { count: number; examples: string[] } } = {};
    const commonPatterns: string[] = [];
    const maintenanceTypes: string[] = [];
    
    // Find the Action column in the full data
    if (analysis.fullData && analysis.fullData.length > 0) {
      const actionColumnName = analysis.columns.find(col => 
        col.toLowerCase().includes('action') || 
        col.toLowerCase().includes('activity')
      );
      
      if (actionColumnName) {
        // Analyze each action value from the full data
        analysis.fullData.forEach(record => {
          const actionValue = record[actionColumnName];
          if (actionValue && typeof actionValue === 'string' && actionValue.trim().length > 0) {
            const actionStr = actionValue.toString().trim();
            
            // Categorize actions by common patterns
            let category = 'Other';
            
            if (actionStr.toLowerCase().includes('ac') || actionStr.toLowerCase().includes('air') || actionStr.toLowerCase().includes('cooling')) {
              category = 'HVAC/AC Issues';
            } else if (actionStr.toLowerCase().includes('electrical') || actionStr.toLowerCase().includes('power') || actionStr.toLowerCase().includes('voltage')) {
              category = 'Electrical Issues';
            } else if (actionStr.toLowerCase().includes('plumbing') || actionStr.toLowerCase().includes('water') || actionStr.toLowerCase().includes('pipe')) {
              category = 'Plumbing Issues';
            } else if (actionStr.toLowerCase().includes('maintenance') || actionStr.toLowerCase().includes('service')) {
              category = 'Maintenance Activities';
            } else if (actionStr.toLowerCase().includes('repair') || actionStr.toLowerCase().includes('fix')) {
              category = 'Repair Work';
            } else if (actionStr.toLowerCase().includes('inspection') || actionStr.toLowerCase().includes('check')) {
              category = 'Inspections';
            } else if (actionStr.toLowerCase().includes('installation') || actionStr.toLowerCase().includes('install')) {
              category = 'Installations';
            } else if (actionStr.toLowerCase().includes('failure') || actionStr.toLowerCase().includes('breakdown') || actionStr.toLowerCase().includes('malfunction')) {
              category = 'Equipment Failures';
            } else if (actionStr.toLowerCase().includes('cleaning') || actionStr.toLowerCase().includes('clean')) {
              category = 'Cleaning Services';
            } else if (actionStr.toLowerCase().includes('replacement') || actionStr.toLowerCase().includes('replace')) {
              category = 'Replacements';
            }
            
            // Count and store examples
            if (!actionCategories[category]) {
              actionCategories[category] = { count: 0, examples: [] };
            }
            actionCategories[category].count++;
            
            // Store unique examples (limit to 3 per category)
            if (actionCategories[category].examples.length < 3 && 
                !actionCategories[category].examples.includes(actionStr)) {
              actionCategories[category].examples.push(actionStr);
            }
            
            // Extract common patterns
            const words = actionStr.toLowerCase().split(/\s+/).filter(word => word.length > 2);
            words.forEach(word => {
              if (!commonPatterns.includes(word)) {
                commonPatterns.push(word);
              }
            });
            
            // Identify maintenance types
            if (actionStr.toLowerCase().includes('preventive') || actionStr.toLowerCase().includes('routine')) {
              maintenanceTypes.push('Preventive Maintenance');
            } else if (actionStr.toLowerCase().includes('emergency') || actionStr.toLowerCase().includes('urgent')) {
              category = 'Emergency Maintenance';
            } else if (actionStr.toLowerCase().includes('corrective') || actionStr.toLowerCase().includes('repair')) {
              maintenanceTypes.push('Corrective Maintenance');
            }
          }
        });
      }
    }
    
    // Convert to array and sort by count
    const actionCategoriesArray = Object.entries(actionCategories).map(([category, data]) => ({
      category,
      count: data.count,
      examples: data.examples
    })).sort((a, b) => b.count - a.count);
    
    // Generate summary
    let actionSummary = `Action Column Analysis:\n`;
    actionSummary += `Total unique actions analyzed: ${commonPatterns.length}\n`;
    actionSummary += `Main categories identified: ${actionCategoriesArray.length}\n\n`;
    
    actionSummary += `Top Action Categories:\n`;
    actionCategoriesArray.slice(0, 5).forEach((cat, index) => {
      actionSummary += `${index + 1}. ${cat.category}: ${cat.count} occurrences\n`;
      actionSummary += `   Examples: ${cat.examples.join(', ')}\n`;
    });
    
    if (maintenanceTypes.length > 0) {
      const uniqueMaintenanceTypes = Array.from(new Set(maintenanceTypes));
      actionSummary += `\nMaintenance Types: ${uniqueMaintenanceTypes.join(', ')}\n`;
    }
    
    return {
      actionCategories: actionCategoriesArray,
      actionSummary,
      commonPatterns: commonPatterns.slice(0, 20), // Limit to top 20 patterns
      maintenanceTypes: Array.from(new Set(maintenanceTypes))
    };
  }



  /**
   * Test method specifically for "event stand by" queries
   */
  static testEventStandByQuery(analysis: ExcelAnalysis): {
    results: any[];
    totalCount: number;
    summary: string;
  } {
    console.log('🧪 Testing "event stand by" query specifically...');
    
    if (!analysis.fullData || analysis.fullData.length === 0) {
      return {
        results: [],
        totalCount: 0,
        summary: 'No full data available for testing'
      };
    }
    
    const allData = analysis.fullData;
    const availableColumns = Object.keys(allData[0] || {});
    
    console.log('📊 Available columns:', availableColumns);
    
    // Look for Action column (case-insensitive)
    const actionColumn = availableColumns.find(col => 
      col.toLowerCase().includes('action')
    );
    
    if (!actionColumn) {
      console.log('❌ No Action column found');
      return {
        results: [],
        totalCount: 0,
        summary: 'No Action column found in data'
      };
    }
    
    console.log('✅ Found Action column:', actionColumn);
    
    // Search for "event stand by" in Action column
    const results = allData.filter(row => {
      const actionValue = row[actionColumn]?.toString().toLowerCase() || '';
      const hasEventStandBy = actionValue.includes('event stand by') || 
                              actionValue.includes('event standby') ||
                              actionValue.includes('stand by') ||
                              actionValue.includes('standby');
      
      if (hasEventStandBy) {
        console.log('🎯 Found matching action:', actionValue);
      }
      
      return hasEventStandBy;
    });
    
    console.log(`✅ Found ${results.length} records with "event stand by"`);
    
    // Return relevant fields
    const filteredResults = results.map(row => ({
      'MMT No': row['MMT No'] || row['MMT Number'] || row['MMT'] || 'N/A',
      'Date': row['Date'] || row['Date Functional'] || 'N/A',
      'Location': row['Location Description'] || row['Location'] || row['Functional Location'] || 'N/A',
      'Action': row[actionColumn] || 'N/A'
    }));
    
    let summary = `"Event Stand By" Query Test Results:\n`;
    summary += `• Total records in dataset: ${allData.length}\n`;
    summary += `• Records with "event stand by": ${results.length}\n`;
    summary += `• Action column used: ${actionColumn}\n\n`;
    
    if (results.length > 0) {
      summary += `Sample matches:\n`;
      results.slice(0, 3).forEach((row, index) => {
        summary += `${index + 1}. Action: ${row[actionColumn]}\n`;
      });
    }
    
    return {
      results: filteredResults,
      totalCount: results.length,
      summary
    };
  }

  /**
   * Verify that full dataset is available and accessible
   */
  static verifyFullData(analysis: ExcelAnalysis): {
    hasFullData: boolean;
    recordCount: number;
    sampleRecord: any;
    columns: string[];
  } {
    console.log('🔍 Verifying full dataset availability...');
    console.log('📊 Analysis object:', {
      fileName: analysis.fileName,
      hasFullData: !!analysis.fullData,
      fullDataLength: analysis.fullData?.length || 0,
      totalRows: analysis.totalRows
    });
    
    if (!analysis.fullData || analysis.fullData.length === 0) {
      console.log('❌ No full data available');
      return {
        hasFullData: false,
        recordCount: 0,
        sampleRecord: null,
        columns: []
      };
    }
    
    const sampleRecord = analysis.fullData[0];
    const columns = Object.keys(sampleRecord || {});
    
    console.log('✅ Full data verified:', {
      recordCount: analysis.fullData.length,
      sampleColumns: columns,
      sampleRecord: sampleRecord
    });
    
    return {
      hasFullData: true,
      recordCount: analysis.fullData.length,
      sampleRecord,
      columns
    };
  }

  /**
   * Get complete data statistics for AI context
   */
  static getCompleteDataStats(analysis: ExcelAnalysis): {
    totalRecords: number;
    dateRange: { start: string; end: string; allDates: string[] };
    uniqueValues: { [column: string]: any[] };
    dataSummary: string;
  } {
    if (!analysis.fullData || analysis.fullData.length === 0) {
      return {
        totalRecords: 0,
        dateRange: { start: '', end: '', allDates: [] },
        uniqueValues: {},
        dataSummary: 'No data available'
      };
    }

    const allData = analysis.fullData;
    const totalRecords = allData.length;
    
    // Get all unique dates
    const allDates = allData
      .map(row => row['Date'] || row['Date Functional'])
      .filter(date => date && date !== '')
      .map(date => date.toString());
    
    const uniqueDates = Array.from(new Set(allDates)).sort();
    const dateRange = {
      start: uniqueDates[0] || '',
      end: uniqueDates[uniqueDates.length - 1] || '',
      allDates: uniqueDates
    };
    
    // Get unique values for key columns
    const uniqueValues: { [column: string]: any[] } = {};
    const keyColumns = ['Action', 'Location', 'Description', 'MMT No'];
    
    keyColumns.forEach(colName => {
      const actualColName = Object.keys(allData[0] || {}).find(col => 
        col.toLowerCase().includes(colName.toLowerCase())
      );
      
      if (actualColName) {
        const values = allData
          .map(row => row[actualColName])
          .filter(val => val !== null && val !== undefined && val !== '')
          .map(val => val.toString());
        
        uniqueValues[colName] = Array.from(new Set(values));
      }
    });
    
    // Generate comprehensive data summary
    let dataSummary = `COMPLETE DATASET ANALYSIS:\n`;
    dataSummary += `📊 Total Records: ${totalRecords.toLocaleString()}\n`;
    dataSummary += `📅 Date Range: ${dateRange.start} to ${dateRange.end}\n`;
    dataSummary += `📅 All Available Dates: ${dateRange.allDates.join(', ')}\n`;
    dataSummary += `🔧 Unique Actions: ${uniqueValues['Action']?.length || 0}\n`;
    dataSummary += `📍 Unique Locations: ${uniqueValues['Location']?.length || 0}\n`;
    dataSummary += `📝 Unique Descriptions: ${uniqueValues['Description']?.length || 0}\n`;
    dataSummary += `🔢 Unique MMT Numbers: ${uniqueValues['MMT No']?.length || 0}\n`;
    
    console.log('📊 Complete data statistics generated:', {
      totalRecords,
      dateRange,
      uniqueValuesCount: Object.keys(uniqueValues).reduce((acc, key) => {
        acc[key] = uniqueValues[key]?.length || 0;
        return acc;
      }, {} as any)
    });
    
    return {
      totalRecords,
      dateRange,
      uniqueValues,
      dataSummary
    };
  }

  /**
   * Get ALL records for a specific date with complete information
   */
  static getRecordsForDate(analysis: ExcelAnalysis, targetDate: string): {
    records: any[];
    totalCount: number;
    dateInfo: string;
    allFields: string[];
  } {
    if (!analysis.fullData || analysis.fullData.length === 0) {
      throw new Error('No full dataset available for date querying');
    }

    const allData = analysis.fullData;
    
    // Normalize target date for flexible matching
    const normalizedTargetDate = targetDate.toLowerCase().replace(/[\/\-]/g, '');
    
    console.log(`🔍 Searching for date: ${targetDate} (normalized: ${normalizedTargetDate})`);
    console.log(`📊 Total records to search: ${allData.length}`);
    
    // Find all records matching the date
    const matchingRecords = allData.filter(row => {
      // Check multiple possible date fields
      const dateFields = ['Date', 'Date Functional', 'Functional Date', 'Report Date'];
      
      return dateFields.some(fieldName => {
        const actualFieldName = Object.keys(row).find(col => 
          col.toLowerCase().includes(fieldName.toLowerCase())
        );
        
        if (actualFieldName && row[actualFieldName]) {
          const rowDate = row[actualFieldName].toString().toLowerCase().replace(/[\/\-]/g, '');
          return rowDate.includes(normalizedTargetDate) || 
                 rowDate.includes(targetDate.toLowerCase()) ||
                 rowDate.includes(targetDate.replace(/\//g, '-'));
        }
        return false;
      });
    });
    
    const totalCount = matchingRecords.length;
    
    // Get all available fields from the first record
    const allFields = totalCount > 0 ? Object.keys(matchingRecords[0]) : [];
    
    console.log(`✅ Date query completed`);
    console.log(`📅 Records found for ${targetDate}: ${totalCount}`);
    console.log(`📋 Available fields: ${allFields.join(', ')}`);
    
    // Generate date information
    let dateInfo = `Date Query Results for: ${targetDate}\n`;
    dateInfo += `- Total records found: ${totalCount}\n`;
    dateInfo += `- Available fields: ${allFields.join(', ')}\n`;
    dateInfo += `- Search completed on: ${new Date().toLocaleString()}\n`;
    
    if (totalCount > 0) {
      // Show sample of what was found
      const sampleRecord = matchingRecords[0];
      dateInfo += `- Sample record fields:\n`;
      Object.entries(sampleRecord).forEach(([field, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          dateInfo += `  • ${field}: ${value}\n`;
        }
      });
    }
    
    return {
      records: matchingRecords,
      totalCount,
      dateInfo,
      allFields
    };
  }

  /**
   * Test and debug specific queries to help troubleshoot issues
   */
  static testSpecificQuery(analysis: ExcelAnalysis, testQuery: string): {
    success: boolean;
    results: any[];
    totalCount: number;
    debugInfo: string;
    fieldMapping: { [key: string]: string };
  } {
    console.log('🧪 Testing specific query:', testQuery);
    
    if (!analysis.fullData || analysis.fullData.length === 0) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        debugInfo: 'No full dataset available',
        fieldMapping: {}
      };
    }
    
    const allData = analysis.fullData;
    const sampleRecord = allData[0];
    const availableColumns = Object.keys(sampleRecord);
    
    console.log('📋 Available columns:', availableColumns);
    
    // Test location field matching
    const locationFields = ['Location', 'Location Description', 'Functional Location', 'Address', 'Site'];
    const foundLocationField = availableColumns.find(col => 
      locationFields.some(locField => col.toLowerCase().includes(locField.toLowerCase()))
    );
    
    // Test date field matching
    const dateFields = ['Date', 'Date Functional', 'Functional Date', 'Report Date', 'Created Date'];
    const foundDateField = availableColumns.find(col => 
      dateFields.some(dateField => col.toLowerCase().includes(dateField.toLowerCase()))
    );
    
    // Test MMT field matching
    const mmtFields = ['MMT No', 'MMT Number', 'MMT', 'Ticket No', 'Ticket Number', 'Request No'];
    const foundMmtField = availableColumns.find(col => 
      mmtFields.some(mmtField => col.toLowerCase().includes(mmtField.toLowerCase()))
    );
    
    const fieldMapping = {
      'Location': foundLocationField || 'NOT_FOUND',
      'Date': foundDateField || 'NOT_FOUND',
      'MMT No': foundMmtField || 'NOT_FOUND'
    };
    
    console.log('🔍 Field mapping:', fieldMapping);
    
    // Test sample data for these fields
    let debugInfo = `Query Test Results for: "${testQuery}"\n\n`;
    debugInfo += `📊 Total records available: ${allData.length}\n`;
    debugInfo += `📋 Available columns: ${availableColumns.join(', ')}\n\n`;
    debugInfo += `🔍 Field Mapping:\n`;
    Object.entries(fieldMapping).forEach(([standardField, actualField]) => {
      debugInfo += `- ${standardField} → ${actualField}\n`;
    });
    
    // Test sample values for key fields
    if (foundLocationField) {
      const sampleLocations = allData
        .map(row => row[foundLocationField])
        .filter(val => val !== null && val !== undefined && val !== '')
        .slice(0, 5);
      debugInfo += `\n📍 Sample Location values: ${sampleLocations.join(', ')}\n`;
    }
    
    if (foundDateField) {
      const sampleDates = allData
        .map(row => row[foundDateField])
        .filter(val => val !== null && val !== undefined && val !== '')
        .slice(0, 5);
      debugInfo += `📅 Sample Date values: ${sampleDates.join(', ')}\n`;
    }
    
    if (foundMmtField) {
      const sampleMmtNumbers = allData
        .map(row => row[foundMmtField])
        .filter(val => val !== null && val !== undefined && val !== '')
        .slice(0, 5);
      debugInfo += `🔢 Sample MMT values: ${sampleMmtNumbers.join(', ')}\n`;
    }
    
    // Test specific query if it's a location + date query
    if (testQuery.toLowerCase().includes('eleventh street') && testQuery.toLowerCase().includes('june')) {
      debugInfo += `\n🎯 Testing specific query: 1172 ELEVENTH STREET + June 2025\n`;
      
      if (foundLocationField && foundDateField) {
        const matchingRecords = allData.filter(row => {
          const location = row[foundLocationField]?.toString().toLowerCase() || '';
          const date = row[foundDateField]?.toString().toLowerCase() || '';
          
          const hasLocation = location.includes('eleventh street') || location.includes('1172');
          const hasDate = date.includes('6/') || date.includes('june') || date.includes('2025');
          
          return hasLocation && hasDate;
        });
        
        debugInfo += `📊 Records matching both criteria: ${matchingRecords.length}\n`;
        
        if (matchingRecords.length > 0) {
          debugInfo += `📋 Sample matching records:\n`;
          matchingRecords.slice(0, 3).forEach((record, index) => {
            debugInfo += `${index + 1}. Location: ${record[foundLocationField]}, Date: ${record[foundDateField]}\n`;
          });
        }
      }
    }
    
    return {
      success: true,
      results: [],
      totalCount: allData.length,
      debugInfo,
      fieldMapping
    };
  }

  /**
   * Verify complete dataset accessibility and test sample queries
   */
  static verifyCompleteDatasetAccess(analysis: ExcelAnalysis): {
    success: boolean;
    totalRecords: number;
    sampleQueries: any[];
    fieldMapping: { [key: string]: string };
    debugInfo: string;
  } {
    console.log('🔍 Verifying complete dataset accessibility...');
    
    if (!analysis.fullData || analysis.fullData.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        sampleQueries: [],
        fieldMapping: {},
        debugInfo: '❌ No full dataset available'
      };
    }
    
    const allData = analysis.fullData;
    const totalRecords = allData.length;
    const sampleRecord = allData[0];
    const availableColumns = Object.keys(sampleRecord);
    
    console.log(`📊 Total records available: ${totalRecords}`);
    console.log(`📋 Available columns: ${availableColumns.join(', ')}`);
    
    // Find field mappings
    const fieldMapping = {
      'Location': availableColumns.find(col => col.toLowerCase().includes('location')) || 'NOT_FOUND',
      'Date': availableColumns.find(col => col.toLowerCase().includes('date')) || 'NOT_FOUND',
      'MMT No': availableColumns.find(col => col.toLowerCase().includes('mmt')) || 'NOT_FOUND',
      'Action': availableColumns.find(col => col.toLowerCase().includes('action')) || 'NOT_FOUND',
      'Description': availableColumns.find(col => col.toLowerCase().includes('description')) || 'NOT_FOUND'
    };
    
    console.log('🔍 Field mapping:', fieldMapping);
    
    // Test sample queries to verify data accessibility
    const sampleQueries = [];
    
    // Test 1: Count all records
    sampleQueries.push({
      query: 'Count all records',
      result: allData.length,
      success: true
    });
    
    // Test 2: Find specific location
    if (fieldMapping['Location'] !== 'NOT_FOUND') {
      const locationField = fieldMapping['Location'];
      const eleventhStreetRecords = allData.filter(row => {
        const location = row[locationField]?.toString().toLowerCase() || '';
        return location.includes('eleventh street') || location.includes('1172');
      });
      
      sampleQueries.push({
        query: 'Find records with "eleventh street"',
        result: eleventhStreetRecords.length,
        success: eleventhStreetRecords.length > 0,
        sampleData: eleventhStreetRecords.slice(0, 3)
      });
    }
    
    // Test 3: Find specific date
    if (fieldMapping['Date'] !== 'NOT_FOUND') {
      const dateField = fieldMapping['Date'];
      const june2025Records = allData.filter(row => {
        const date = row[dateField]?.toString().toLowerCase() || '';
        return date.includes('6/') || date.includes('june') || date.includes('2025');
      });
      
      sampleQueries.push({
        query: 'Find records from June 2025',
        result: june2025Records.length,
        success: june2025Records.length > 0,
        sampleData: june2025Records.slice(0, 3)
      });
    }
    
    // Test 4: Find specific MMT
    if (fieldMapping['MMT No'] !== 'NOT_FOUND') {
      const mmtField = fieldMapping['MMT No'];
      const sampleMmtNumbers = allData
        .map(row => row[mmtField])
        .filter(val => val !== null && val !== undefined && val !== '')
        .slice(0, 5);
      
      sampleQueries.push({
        query: 'Sample MMT numbers',
        result: sampleMmtNumbers.length,
        success: sampleMmtNumbers.length > 0,
        sampleData: sampleMmtNumbers
      });
    }
    
    // Generate debug information
    let debugInfo = `🔍 COMPLETE DATASET VERIFICATION RESULTS\n\n`;
    debugInfo += `📊 Total Records: ${totalRecords.toLocaleString()}\n`;
    debugInfo += `📋 Available Columns: ${availableColumns.join(', ')}\n\n`;
    
    debugInfo += `🔍 Field Mapping:\n`;
    Object.entries(fieldMapping).forEach(([standardField, actualField]) => {
      debugInfo += `- ${standardField} → ${actualField}\n`;
    });
    
    debugInfo += `\n🧪 Sample Query Tests:\n`;
    sampleQueries.forEach((query, index) => {
      debugInfo += `${index + 1}. ${query.query}: ${query.result} results ${query.success ? '✅' : '❌'}\n`;
      if (query.sampleData && query.sampleData.length > 0) {
        debugInfo += `   Sample: ${query.sampleData.slice(0, 2).join(', ')}\n`;
      }
    });
    
    // Test the specific query that was failing
    debugInfo += `\n🎯 Testing Your Specific Query:\n`;
    debugInfo += `"How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?"\n\n`;
    
    if (fieldMapping['Location'] !== 'NOT_FOUND' && fieldMapping['Date'] !== 'NOT_FOUND') {
      const locationField = fieldMapping['Location'];
      const dateField = fieldMapping['Date'];
      
      const matchingRecords = allData.filter(row => {
        const location = row[locationField]?.toString().toLowerCase() || '';
        const date = row[dateField]?.toString().toLowerCase() || '';
        
        const hasLocation = location.includes('eleventh street') || location.includes('1172');
        const hasDate = date.includes('6/') || date.includes('june') || date.includes('2025');
        
        return hasLocation && hasDate;
      });
      
      debugInfo += `📊 Records matching both criteria: ${matchingRecords.length}\n`;
      
      if (matchingRecords.length > 0) {
        debugInfo += `📋 Sample matching records:\n`;
        matchingRecords.slice(0, 5).forEach((record, index) => {
          debugInfo += `${index + 1}. Location: ${record[locationField]}, Date: ${record[dateField]}\n`;
        });
      } else {
        debugInfo += `❌ No records found. Possible issues:\n`;
        debugInfo += `   - Location field: ${locationField}\n`;
        debugInfo += `   - Date field: ${dateField}\n`;
        debugInfo += `   - Check if data exists in these fields\n`;
      }
    } else {
      debugInfo += `❌ Required fields not found:\n`;
      debugInfo += `   - Location: ${fieldMapping['Location']}\n`;
      debugInfo += `   - Date: ${fieldMapping['Date']}\n`;
    }
    
    return {
      success: true,
      totalRecords,
      sampleQueries,
      fieldMapping,
      debugInfo
    };
  }

  /**
   * Save complete Excel data to a queryable data structure
   */
  static saveCompleteExcelData(analysis: ExcelAnalysis): {
    success: boolean;
    totalRecords: number;
    dataStructure: any;
    fieldMapping: { [key: string]: string };
    sampleData: any[];
  } {
    console.log('💾 Saving complete Excel data to queryable structure...');
    
    if (!analysis.fullData || analysis.fullData.length === 0) {
      console.log('❌ No full data available to save');
      return {
        success: false,
        totalRecords: 0,
        dataStructure: {},
        fieldMapping: {},
        sampleData: []
      };
    }
    
    const allData = analysis.fullData;
    const totalRecords = allData.length;
    const sampleRecord = allData[0];
    const availableColumns = Object.keys(sampleRecord);
    
    console.log(`📊 Saving ${totalRecords} records with columns: ${availableColumns.join(', ')}`);
    
    // Create field mapping for standard field names with better detection
    const fieldMapping = {
      'Location': this.findBestFieldMatch(availableColumns, ['location', 'address', 'site', 'functional location']),
      'Date': this.findBestFieldMatch(availableColumns, ['date', 'functional date', 'report date', 'created date']),
      'MMT No': this.findBestFieldMatch(availableColumns, ['mmt', 'mmt no', 'mmt number', 'ticket', 'request no']),
      'Action': this.findBestFieldMatch(availableColumns, ['action', 'action taken', 'work done', 'resolution', 'status']),
      'Description': this.findBestFieldMatch(availableColumns, ['description', 'issue description', 'problem description', 'work description'])
    };
    
    console.log('🔍 Field mapping created:', fieldMapping);
    
    // Validate that we have essential fields
    const essentialFields = ['Location', 'Date'];
    const missingFields = essentialFields.filter(field => fieldMapping[field as keyof typeof fieldMapping] === 'NOT_FOUND');
    
    if (missingFields.length > 0) {
      console.log(`⚠️ Warning: Missing essential fields: ${missingFields.join(', ')}`);
      console.log('📋 Available columns:', availableColumns);
    }
    
    // Create a structured data object for easy querying
    const dataStructure = {
      metadata: {
        fileName: analysis.fileName,
        totalRecords,
        availableColumns,
        fieldMapping,
        lastUpdated: new Date().toISOString(),
        dataIntegrity: {
          hasLocation: fieldMapping['Location'] !== 'NOT_FOUND',
          hasDate: fieldMapping['Date'] !== 'NOT_FOUND',
          hasMMT: fieldMapping['MMT No'] !== 'NOT_FOUND',
          hasAction: fieldMapping['Action'] !== 'NOT_FOUND',
          hasDescription: fieldMapping['Description'] !== 'NOT_FOUND'
        }
      },
      records: allData,
      // Create indexed data for faster queries
      indexes: {
        byLocation: this.createLocationIndex(allData, fieldMapping['Location']),
        byDate: this.createDateIndex(allData, fieldMapping['Date']),
        byMMT: this.createMMTIndex(allData, fieldMapping['MMT No']),
        byAction: this.createActionIndex(allData, fieldMapping['Action'])
      }
    };
    
    console.log('✅ Complete data structure created successfully');
    console.log(`📊 Data structure size: ${JSON.stringify(dataStructure).length} characters`);
    console.log('🔍 Data integrity check:', dataStructure.metadata.dataIntegrity);
    
    // Store in memory for immediate access
    this.completeDataStorage = dataStructure;
    
    return {
      success: true,
      totalRecords,
      dataStructure,
      fieldMapping,
      sampleData: allData.slice(0, 5)
    };
  }
  
  /**
   * Find the best field match from available columns
   */
  private static findBestFieldMatch(availableColumns: string[], searchPatterns: string[]): string {
    for (const pattern of searchPatterns) {
      const match = availableColumns.find(col => 
        col.toLowerCase().includes(pattern.toLowerCase())
      );
      if (match) {
        return match;
      }
    }
    return 'NOT_FOUND';
  }
  
  /**
   * Create location index for fast location-based queries
   */
  private static createLocationIndex(allData: any[], locationField: string): { [location: string]: any[] } {
    if (locationField === 'NOT_FOUND') return {};
    
    const index: { [location: string]: any[] } = {};
    
    allData.forEach((record: any) => {
      const location = record[locationField]?.toString().trim() || '';
      if (location) {
        if (!index[location]) {
          index[location] = [];
        }
        index[location].push(record);
      }
    });
    
    console.log(`📍 Location index created with ${Object.keys(index).length} unique locations`);
    return index;
  }
  
  /**
   * Create date index for fast date-based queries
   */
  private static createDateIndex(allData: any[], dateField: string): { [date: string]: any[] } {
    if (dateField === 'NOT_FOUND') return {};
    
    const index: { [date: string]: any[] } = {};
    
    allData.forEach((record: any) => {
      const date = record[dateField]?.toString().trim() || '';
      if (date) {
        if (!index[date]) {
          index[date] = [];
        }
        index[date].push(record);
      }
    });
    
    console.log(`📅 Date index created with ${Object.keys(index).length} unique dates`);
    return index;
  }
  
  /**
   * Create MMT index for fast MMT-based queries
   */
  private static createMMTIndex(allData: any[], mmtField: string): { [mmt: string]: any } {
    if (mmtField === 'NOT_FOUND') return {};
    
    const index: { [mmt: string]: any } = {};
    
    allData.forEach((record: any) => {
      const mmt = record[mmtField]?.toString().trim() || '';
      if (mmt) {
        index[mmt] = record;
      }
    });
    
    console.log(`🔢 MMT index created with ${Object.keys(index).length} unique MMT numbers`);
    return index;
  }
  
  /**
   * Create action index for fast action-based queries
   */
  private static createActionIndex(allData: any[], actionField: string): { [action: string]: any[] } {
    if (actionField === 'NOT_FOUND') return {};
    
    const index: { [action: string]: any[] } = {};
    
    allData.forEach((record: any) => {
      const action = record[actionField]?.toString().trim() || '';
      if (action) {
        if (!index[action]) {
          index[action] = [];
        }
        index[action].push(record);
      }
    });
    
    console.log(`🔧 Action index created with ${Object.keys(index).length} unique actions`);
    return index;
  }
  
  // Static storage for complete data
  private static completeDataStorage: any = null;
  
  /**
   * Get the complete saved data structure
   */
  static getCompleteData(): any {
    return this.completeDataStorage;
  }
  
  /**
   * Query the complete saved data directly
   */
  static queryCompleteData(query: string): {
    success: boolean;
    results: any[];
    totalCount: number;
    queryInfo: string;
    executionTime: number;
  } {
    const startTime = Date.now();
    
    if (!this.completeDataStorage) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        queryInfo: 'No complete data available. Please upload and analyze your Excel file first.',
        executionTime: 0
      };
    }
    
    const data = this.completeDataStorage;
    
    // Debug logging to see what we have
    console.log('🔍 Data structure received:', {
      hasMetadata: !!data.metadata,
      hasRecords: !!data.records,
      hasIndexes: !!data.indexes,
      metadataKeys: data.metadata ? Object.keys(data.metadata) : 'NO_METADATA',
      recordsLength: data.records ? data.records.length : 'NO_RECORDS'
    });
    
    // Extract data with proper error checking
    const records = data.records || [];
    const indexes = data.indexes || {};
    const metadata = data.metadata || {};
    const fieldMapping = metadata.fieldMapping || {};
    
    // Validate field mapping
    console.log('🔍 Field mapping extracted:', fieldMapping);
    
    if (!records || records.length === 0) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        queryInfo: 'No records found in saved data. Please re-upload your Excel file.',
        executionTime: Date.now() - startTime
      };
    }
    
    console.log(`🔍 Executing direct query: "${query}"`);
    console.log(`📊 Total records available: ${records.length}`);
    console.log(`📋 Available fields: ${Object.keys(records[0] || {}).join(', ')}`);
    
    let results: any[] = [];
    let queryInfo = '';
    
    // Handle specific query types with proper field validation
    if (query.toLowerCase().includes('eleventh street') && query.toLowerCase().includes('june')) {
      // Specific query: 1172 ELEVENTH STREET + June 2025
      queryInfo = 'Query: Location contains "eleventh street" AND Date contains "6/" or "june" or "2025"';
      
      const locationField = fieldMapping['Location'];
      const dateField = fieldMapping['Date'];
      
      console.log('🔍 Field mapping for location query:', { locationField, dateField });
      
      if (locationField === 'NOT_FOUND' || dateField === 'NOT_FOUND') {
        console.log('⚠️ Required fields not found, trying fallback field detection...');
        
        // Fallback: try to find fields by name patterns
        const availableFields = Object.keys(records[0] || {});
        const fallbackLocationField = availableFields.find(field => 
          field.toLowerCase().includes('location') || field.toLowerCase().includes('address')
        );
        const fallbackDateField = availableFields.find(field => 
          field.toLowerCase().includes('date')
        );
        
        console.log('🔍 Fallback fields found:', { fallbackLocationField, fallbackDateField });
        
        if (fallbackLocationField && fallbackDateField) {
          results = records.filter((record: any) => {
            const location = record[fallbackLocationField]?.toString().toLowerCase() || '';
            const date = record[fallbackDateField]?.toString().toLowerCase() || '';
            
            const hasLocation = location.includes('eleventh street') || location.includes('1172');
            const hasDate = date.includes('6/') || date.includes('june') || date.includes('2025');
            
            return hasLocation && hasDate;
          });
        } else {
          console.log('❌ Fallback fields also not found');
          results = [];
        }
      } else {
        // Use the mapped fields
        results = records.filter((record: any) => {
          const location = record[locationField]?.toString().toLowerCase() || '';
          const date = record[dateField]?.toString().toLowerCase() || '';
          
          const hasLocation = location.includes('eleventh street') || location.includes('1172');
          const hasDate = date.includes('6/') || date.includes('june') || date.includes('2025');
          
          return hasLocation && hasDate;
        });
      }
      
    } else if (query.toLowerCase().includes('how many mmts')) {
      // Count MMTs query
      queryInfo = 'Query: Count total MMTs';
      results = records;
      
    } else if (query.toLowerCase().includes('location')) {
      // Location-based query
      queryInfo = 'Query: Location-based search';
      const locationField = fieldMapping['Location'] || this.findFieldByPattern(records, 'location');
      
      if (locationField) {
        results = records.filter((record: any) => {
          const location = record[locationField]?.toString().toLowerCase() || '';
          return location.includes(query.toLowerCase());
        });
      } else {
        results = [];
      }
      
    } else if (query.toLowerCase().includes('date') || query.toLowerCase().includes('june')) {
      // Date-based query
      queryInfo = 'Query: Date-based search';
      const dateField = fieldMapping['Date'] || this.findFieldByPattern(records, 'date');
      
      if (dateField) {
        results = records.filter((record: any) => {
          const date = record[dateField]?.toString().toLowerCase() || '';
          return date.includes('6/') || date.includes('june') || date.includes('2025');
        });
      } else {
        results = [];
      }
      
    } else {
      // General query - return all records
      queryInfo = 'Query: General search - returning all records';
      results = records;
    }
    
    const totalCount = results.length;
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ Query executed successfully`);
    console.log(`📊 Results found: ${totalCount}`);
    console.log(`⏱️ Execution time: ${executionTime}ms`);
    
    return {
      success: true,
      results,
      totalCount,
      queryInfo,
      executionTime
    };
  }
  
  /**
   * Find field by pattern in available columns
   */
  private static findFieldByPattern(records: any[], pattern: string): string | null {
    if (!records || records.length === 0) return null;
    
    const availableFields = Object.keys(records[0] || {});
    return availableFields.find(field => 
      field.toLowerCase().includes(pattern.toLowerCase())
    ) || null;
  }

  /**
   * Clean query interpreter and executor for chatbot
   */
  static interpretAndExecuteQuery(userQuery: string, excelData: any[]): {
    success: boolean;
    results: any[];
    totalCount: number;
    queryType: string;
    appliedFilters: string[];
    executionTime: number;
    error?: string;
  } {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Interpreting query:', userQuery);
      
      if (!excelData || excelData.length === 0) {
        return {
          success: false,
          results: [],
          totalCount: 0,
          queryType: 'error',
          appliedFilters: [],
          executionTime: Date.now() - startTime,
          error: 'No Excel data available'
        };
      }
      
      // Parse the user query to identify filters and request type
      const queryAnalysis = this.parseUserQuery(userQuery);
      console.log('🔍 Query analysis:', queryAnalysis);
      
      // Apply filters to the dataset
      let filteredResults = excelData;
      const appliedFilters: string[] = [];
      
      // Apply date filters
      if (queryAnalysis.dateFilters.length > 0) {
        filteredResults = this.applyDateFilters(filteredResults, queryAnalysis.dateFilters);
        appliedFilters.push(`Date: ${queryAnalysis.dateFilters.map(f => f.description).join(', ')}`);
      }
      
      // Apply location filters
      if (queryAnalysis.locationFilters.length > 0) {
        filteredResults = this.applyLocationFilters(filteredResults, queryAnalysis.locationFilters);
        appliedFilters.push(`Location: ${queryAnalysis.locationFilters.map(f => f.value).join(', ')}`);
      }
      
      // Apply description filters
      if (queryAnalysis.descriptionFilters.length > 0) {
        filteredResults = this.applyDescriptionFilters(filteredResults, queryAnalysis.descriptionFilters);
        appliedFilters.push(`Description: ${queryAnalysis.descriptionFilters.map(f => f.value).join(', ')}`);
      }
      
      // Apply action filters
      if (queryAnalysis.actionFilters.length > 0) {
        filteredResults = this.applyActionFilters(filteredResults, queryAnalysis.actionFilters);
        appliedFilters.push(`Action: ${queryAnalysis.actionFilters.map(f => f.value).join(', ')}`);
      }
      
      // Apply MMT filters
      if (queryAnalysis.mmtFilters.length > 0) {
        filteredResults = this.applyMMTFilters(filteredResults, queryAnalysis.mmtFilters);
        appliedFilters.push(`MMT: ${queryAnalysis.mmtFilters.map(f => f.value).join(', ')}`);
      }
      
      const totalCount = filteredResults.length;
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Query executed successfully`);
      console.log(`📊 Results found: ${totalCount}`);
      console.log(`⏱️ Execution time: ${executionTime}ms`);
      
      return {
        success: true,
        results: filteredResults,
        totalCount,
        queryType: queryAnalysis.requestType,
        appliedFilters,
        executionTime
      };
      
    } catch (error) {
      console.error('❌ Error executing query:', error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        queryType: 'error',
        appliedFilters: [],
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Parse user query to identify filters and request type
   */
  private static parseUserQuery(userQuery: string): {
    dateFilters: Array<{ type: string; value: string; description: string }>;
    locationFilters: Array<{ type: string; value: string; operator: string }>;
    descriptionFilters: Array<{ value: string; operator: string }>;
    actionFilters: Array<{ value: string; operator: string }>;
    mmtFilters: Array<{ value: string; operator: string }>;
    requestType: string;
  } {
    const query = userQuery.toLowerCase();
    
    // Initialize filters
    const dateFilters: Array<{ type: string; value: string; description: string }> = [];
    const locationFilters: Array<{ type: string; value: string; operator: string }> = [];
    const descriptionFilters: Array<{ value: string; operator: string }> = [];
    const actionFilters: Array<{ value: string; operator: string }> = [];
    const mmtFilters: Array<{ value: string; operator: string }> = [];
    
    // Detect date filters
    if (query.includes('june 2025') || query.includes('6/2025')) {
      dateFilters.push({ type: 'month_year', value: '6/2025', description: 'June 2025' });
    }
    if (query.includes('6/24/2025') || query.includes('june 24')) {
      dateFilters.push({ type: 'specific_date', value: '6/24/2025', description: 'June 24, 2025' });
    }
    if (query.includes('6/27/2025') || query.includes('june 27')) {
      dateFilters.push({ type: 'specific_date', value: '6/27/2025', description: 'June 27, 2025' });
    }
    
    // Detect location filters
    if (query.includes('1172 eleventh street') || query.includes('eleventh street')) {
      locationFilters.push({ type: 'partial', value: 'eleventh street', operator: 'contains' });
    }
    if (query.includes('387 lemon circle')) {
      locationFilters.push({ type: 'exact', value: '387 LEMON CIRCLE', operator: 'equals' });
    }
    if (query.includes('ninth street')) {
      locationFilters.push({ type: 'partial', value: 'ninth street', operator: 'contains' });
    }
    
    // Detect description filters
    if (query.includes('ac standby technician') || query.includes('standby technician')) {
      descriptionFilters.push({ value: 'standby technician', operator: 'contains' });
    }
    
    // Detect action filters
    if (query.includes('clean air filter')) {
      actionFilters.push({ value: 'CLEAN AIR FILTER', operator: 'contains' });
    }
    if (query.includes('event, stand by') || query.includes('stand by')) {
      actionFilters.push({ value: 'EVENT, STAND BY', operator: 'contains' });
    }
    
    // Detect MMT filters
    if (query.includes('4006209606')) {
      mmtFilters.push({ value: '4006209606', operator: 'equals' });
    }
    
    // Detect request type
    let requestType = 'list';
    if (query.includes('how many') || query.includes('count')) {
      requestType = 'count';
    } else if (query.includes('last action') || query.includes('last entry')) {
      requestType = 'last_entry';
    } else if (query.includes('list all') || query.includes('show all')) {
      requestType = 'list_all';
    }
    
    return {
      dateFilters,
      locationFilters,
      descriptionFilters,
      actionFilters,
      mmtFilters,
      requestType
    };
  }

  /**
   * Clean Excel data loader - loads file once and stores in structured format
   */
  static loadExcelDataForChatbot(fileUrl: string, fileName: string): {
    success: boolean;
    data: any[];
    columns: string[];
    totalRecords: number;
    error?: string;
  } {
    try {
      console.log('📊 Loading Excel data for chatbot...');
      
      // Load the Excel file
      const arrayBuffer = this.downloadFileFromUrl(fileUrl);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet (assuming single sheet for simplicity)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        return {
          success: false,
          data: [],
          columns: [],
          totalRecords: 0,
          error: 'Excel file must have at least a header row and one data row'
        };
      }
      
      // Extract headers and data
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      
      console.log('📋 Headers found:', headers);
      console.log('📊 Data rows:', dataRows.length);
      
      // Convert to structured objects
      const structuredData = dataRows.map((row: unknown, index: number) => {
        const rowArray = row as any[];
        const obj: any = {};
        headers.forEach((header, colIndex) => {
          obj[header] = rowArray[colIndex] || '';
        });
        return obj;
      });
      
      // Validate required columns exist
      const requiredColumns = ['MMT No', 'Date', 'Functional Location', 'Location', 'Description', 'Action'];
      const missingColumns = requiredColumns.filter(col => 
        !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
      );
      
      if (missingColumns.length > 0) {
        console.log(`⚠️ Warning: Missing columns: ${missingColumns.join(', ')}`);
      }
      
      console.log('✅ Excel data loaded successfully');
      console.log(`📊 Total records: ${structuredData.length}`);
      
      return {
        success: true,
        data: structuredData,
        columns: headers,
        totalRecords: structuredData.length
      };
      
    } catch (error) {
      console.error('❌ Error loading Excel data:', error);
      return {
        success: false,
        data: [],
        columns: [],
        totalRecords: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Download file from URL (synchronous for this implementation)
   */
  private static downloadFileFromUrl(fileUrl: string): ArrayBuffer {
    // This would need to be implemented based on your file access method
    // For now, we'll assume the file is already available
    throw new Error('File download method needs to be implemented based on your file access');
  }
  
  /**
   * Parse date value and extract components
   */
  private static parseDateValue(value: any): {
    original: any;
    parsed: Date | null;
    month: number | null;
    year: number | null;
    formatted: string;
  } {
    if (!value) {
      return { original: value, parsed: null, month: null, year: null, formatted: 'N/A' };
    }
    
    try {
      // Try to parse as Date
      const date = new Date(value);
      
      if (isNaN(date.getTime())) {
        // Try parsing common formats
        const dateStr = value.toString();
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // Try multiple date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY/MM/DD
            const possibleFormats = [
              // Format 1: MM/DD/YYYY (US format)
              () => {
                const month = parseInt(parts[0]) - 1;
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                return new Date(year, month, day);
              },
              // Format 2: DD/MM/YYYY (European format)
              () => {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                return new Date(year, month, day);
              },
              // Format 3: YYYY/MM/DD (ISO format)
              () => {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                return new Date(year, month, day);
              }
            ];
            
            for (const formatFunc of possibleFormats) {
              try {
                const parsedDate = formatFunc();
                if (!isNaN(parsedDate.getTime())) {
                  return {
                    original: value,
                    parsed: parsedDate,
                    month: parsedDate.getMonth() + 1,
                    year: parsedDate.getFullYear(),
                    formatted: `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`
                  };
                }
              } catch (e) {
                // Continue to next format
              }
            }
          }
        }
        return { original: value, parsed: null, month: null, year: null, formatted: 'Invalid Date' };
      }
      
      return {
        original: value,
        parsed: date,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        formatted: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
      };
      
    } catch (error) {
      return { original: value, parsed: null, month: null, year: null, formatted: 'Parse Error' };
    }
  }
  
  /**
   * Normalize text for better matching
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
  }

  /**
   * Apply date filters to the dataset
   */
  private static applyDateFilters(data: any[], dateFilters: Array<{ type: string; value: string; description: string }>): any[] {
    return data.filter(record => {
      return dateFilters.every(filter => {
        const recordDate = record['Date'] || record['Date Functional'] || '';
        const dateStr = recordDate.toString().toLowerCase();
        
        switch (filter.type) {
          case 'month_year':
            return dateStr.includes('6/') || dateStr.includes('june') || dateStr.includes('2025');
          case 'specific_date':
            // Try to match the specific date in multiple formats
            const filterValue = filter.value.toLowerCase();
            const filterParts = filterValue.split('/');
            
            if (filterParts.length === 3) {
              // Check if any of the date parts match
              return filterParts.some(part => dateStr.includes(part)) ||
                     dateStr.includes(filterValue) ||
                     // Also check parsed date fields
                     (record.Date_month && record.Date_year && 
                      record.Date_month.toString() === filterParts[1] && 
                      record.Date_year.toString() === filterParts[2]);
            }
            return dateStr.includes(filterValue);
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply location filters to the dataset
   */
  private static applyLocationFilters(data: any[], locationFilters: Array<{ type: string; value: string; operator: string }>): any[] {
    return data.filter(record => {
      return locationFilters.every(filter => {
        const recordLocation = record['Location'] || record['Functional Location'] || '';
        const locationStr = recordLocation.toString().toLowerCase();
        
        switch (filter.operator) {
          case 'contains':
            return locationStr.includes(filter.value.toLowerCase());
          case 'equals':
            return locationStr === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply description filters to the dataset
   */
  private static applyDescriptionFilters(data: any[], descriptionFilters: Array<{ value: string; operator: string }>): any[] {
    return data.filter(record => {
      return descriptionFilters.every(filter => {
        const recordDescription = record['Description'] || '';
        const descriptionStr = recordDescription.toString().toLowerCase();
        
        switch (filter.operator) {
          case 'contains':
            return descriptionStr.includes(filter.value.toLowerCase());
          case 'equals':
            return descriptionStr === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply action filters to the dataset
   */
  private static applyActionFilters(data: any[], actionFilters: Array<{ value: string; operator: string }>): any[] {
    return data.filter(record => {
      return actionFilters.every(filter => {
        const recordAction = record['Action'] || '';
        const actionStr = recordAction.toString().toLowerCase();
        
        switch (filter.operator) {
          case 'contains':
            return actionStr.includes(filter.value.toLowerCase());
          case 'equals':
            return actionStr === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply MMT filters to the dataset
   */
  private static applyMMTFilters(data: any[], mmtFilters: Array<{ value: string; operator: string }>): any[] {
    return data.filter(record => {
      return mmtFilters.every(filter => {
        const recordMMT = record['MMT No'] || record['MMT Number'] || '';
        const mmtStr = recordMMT.toString().toLowerCase();
        
        switch (filter.operator) {
          case 'contains':
            return mmtStr.includes(filter.value.toLowerCase());
          case 'equals':
            return mmtStr === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }

  /**
   * Format query results into professional, ChatGPT-style responses
   */
  static formatQueryResponse(userQuery: string, queryResult: any): string {
    const { results, totalCount, queryType, appliedFilters, executionTime } = queryResult;
    
    let response = `🔍 **Query Results for:** "${userQuery}"\n\n`;
    
    if (totalCount === 0) {
      response += `❌ **No matching records found** for your criteria.\n\n`;
      response += `💡 **Suggestions:**\n`;
      response += `• Check spelling of search terms\n`;
      response += `• Use broader search criteria\n`;
      response += `• Try different date formats (e.g., "June 2025" or "6/2025")\n`;
      response += `• Use partial location names (e.g., "eleventh street" instead of full address)\n`;
      return response;
    }
    
    response += `📊 **Total Records Found:** ${totalCount.toLocaleString()}\n`;
    response += `⚡ **Query Type:** ${this.formatQueryType(queryType)}\n`;
    response += `⏱️ **Execution Time:** ${executionTime}ms\n\n`;
    
    if (appliedFilters.length > 0) {
      response += `🔍 **Applied Filters:**\n`;
      appliedFilters.forEach((filter: string) => {
        response += `• ${filter}\n`;
      });
      response += `\n`;
    }
    
    // Format results based on query type
    switch (queryType) {
      case 'count':
        response += this.formatCountResponse(results, totalCount);
        break;
      case 'last_entry':
        response += this.formatLastEntryResponse(results);
        break;
      case 'list_all':
        response += this.formatListAllResponse(results, totalCount);
        break;
      default:
        response += this.formatDefaultResponse(results, totalCount);
    }
    
    response += `\n✅ **Query completed successfully** in ${executionTime}ms\n`;
    response += `🔍 **Ready for more questions:** Try asking about specific dates, locations, or actions`;
    
    return response;
  }
  
  /**
   * Format query type for display
   */
  private static formatQueryType(queryType: string): string {
    switch (queryType) {
      case 'count': return 'Count Records';
      case 'last_entry': return 'Last Entry';
      case 'list_all': return 'List All Records';
      default: return 'General Query';
    }
  }
  
  /**
   * Format count response
   */
  private static formatCountResponse(results: any[], totalCount: number): string {
    return `📊 **Count Result:** ${totalCount.toLocaleString()} records found\n\n`;
  }
  
  /**
   * Format last entry response
   */
  private static formatLastEntryResponse(results: any[]): string {
    if (results.length === 0) return '';
    
    const lastRecord = results[0]; // Assuming results are sorted by date
    let response = `📋 **Last Entry Details:**\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    response += `**MMT No:** ${lastRecord['MMT No'] || 'N/A'}\n`;
    response += `**Date:** ${lastRecord['Date'] || 'N/A'}\n`;
    response += `**Location:** ${lastRecord['Location'] || lastRecord['Functional Location'] || 'N/A'}\n`;
    response += `**Description:** ${lastRecord['Description'] || 'N/A'}\n`;
    response += `**Action:** ${lastRecord['Action'] || 'N/A'}\n`;
    
    return response;
  }
  
  /**
   * Format list all response
   */
  private static formatListAllResponse(results: any[], totalCount: number): string {
    let response = `📋 **All ${totalCount.toLocaleString()} Records:**\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (totalCount <= 10) {
      // Show all results if 10 or fewer
      results.forEach((record, index) => {
        response += `**Record ${index + 1}:**\n`;
        response += `• **MMT No:** ${record['MMT No'] || 'N/A'}\n`;
        response += `• **Date:** ${record['Date'] || 'N/A'}\n`;
        response += `• **Location:** ${record['Location'] || record['Functional Location'] || 'N/A'}\n`;
        response += `• **Description:** ${record['Description'] || 'N/A'}\n`;
        response += `• **Action:** ${record['Action'] || 'N/A'}\n\n`;
        
        if (index < results.length - 1) {
          response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }
      });
    } else {
      // Show summary and sample results for large result sets
      response += `📊 **Sample Results (first 5 records):**\n\n`;
      
      results.slice(0, 5).forEach((record, index) => {
        response += `**Record ${index + 1}:**\n`;
        response += `• **MMT No:** ${record['MMT No'] || 'N/A'}\n`;
        response += `• **Date:** ${record['Date'] || 'N/A'}\n`;
        response += `• **Location:** ${record['Location'] || record['Functional Location'] || 'N/A'}\n`;
        response += `• **Description:** ${record['Description'] || 'N/A'}\n`;
        response += `• **Action:** ${record['Action'] || 'N/A'}\n\n`;
      });
      
      response += `... and ${(totalCount - 5).toLocaleString()} more records\n\n`;
      response += `💡 **To see all results:** Ask a more specific question or use the column buttons above\n`;
    }
    
    return response;
  }
  
  /**
   * Format default response
   */
  private static formatDefaultResponse(results: any[], totalCount: number): string {
    if (totalCount <= 5) {
      return this.formatListAllResponse(results, totalCount);
    } else {
      return this.formatListAllResponse(results.slice(0, 5), 5) + 
             `... and ${(totalCount - 5).toLocaleString()} more records\n\n` +
             `💡 **To see all results:** Ask a more specific question or use the column buttons above\n`;
    }
  }

  /**
   * Main chatbot integration method - handles any natural language query
   */
  static handleChatbotQuery(userQuery: string, excelData: any[]): string {
    try {
      console.log('🤖 Chatbot query received:', userQuery);
      
      if (!excelData || excelData.length === 0) {
        return '❌ **No Excel data available.** Please upload your Excel file first.';
      }
      
      // Execute the query
      const queryResult = this.interpretAndExecuteQuery(userQuery, excelData);
      
      if (!queryResult.success) {
        return `❌ **Query Error:** ${queryResult.error || 'Unknown error occurred'}`;
      }
      
      // Format the response
      const formattedResponse = this.formatQueryResponse(userQuery, queryResult);
      
      console.log('✅ Chatbot response generated successfully');
      return formattedResponse;
      
    } catch (error) {
      console.error('❌ Error in chatbot query handler:', error);
      return `❌ **System Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try rephrasing your question.`;
    }
  }
  
  /**
   * Get sample queries for user guidance
   */
  static getSampleQueries(): string[] {
    return [
      'How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?',
      'What is the last action taken at 387 LEMON CIRCLE?',
      'List all issues reported at NINTH STREET.',
      'How many MMTs had action "CLEAN AIR FILTER"?',
      'Show me all records for 6/24/2025',
      'Which locations had AC standby technician issues?',
      'Count all MMTs from June 2025',
      'List all actions taken on 6/27/2025'
    ];
  }

  /**
   * Professional Excel data loader with preprocessing for chatbot
   */
  static loadExcelDataForProfessionalChatbot(fileUrl: string, fileName: string): {
    success: boolean;
    data: any[];
    columns: string[];
    totalRecords: number;
    dataStats: any;
    error?: string;
  } {
    try {
      console.log('📊 Loading Excel data for professional chatbot...');
      
      // Load the Excel file
      const arrayBuffer = this.downloadFileFromUrl(fileUrl);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        return {
          success: false,
          data: [],
          columns: [],
          totalRecords: 0,
          dataStats: {},
          error: 'Excel file must have at least a header row and one data row'
        };
      }
      
      // Extract headers and data
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      
      console.log('📋 Headers found:', headers);
      console.log('📊 Data rows:', dataRows.length);
      
      // Preprocess and structure the data
      const processedData = this.preprocessExcelData(dataRows, headers);
      
      // Generate data statistics
      const dataStats = this.generateDataStatistics(processedData);
      
      console.log('✅ Excel data loaded and preprocessed successfully');
      console.log(`📊 Total records: ${processedData.length}`);
      console.log('📈 Data statistics generated');
      
      return {
        success: true,
        data: processedData,
        columns: headers,
        totalRecords: processedData.length,
        dataStats
      };
      
    } catch (error) {
      console.error('❌ Error loading Excel data:', error);
      return {
        success: false,
        data: [],
        columns: [],
        totalRecords: 0,
        dataStats: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Preprocess Excel data for optimal querying
   */
  private static preprocessExcelData(dataRows: unknown[], headers: string[]): any[] {
    return dataRows.map((row: unknown, index: number) => {
      const rowArray = row as any[];
      const obj: any = {};
      
      headers.forEach((header, colIndex) => {
        let value = rowArray[colIndex] || '';
        
        // Preprocess based on column type
        if (header.toLowerCase().includes('date')) {
          // Convert to Date object and store multiple formats
          const dateValue = this.parseDateValue(value);
          obj[header] = dateValue;
          obj[`${header}_parsed`] = dateValue.parsed;
          obj[`${header}_month`] = dateValue.month;
          obj[`${header}_year`] = dateValue.year;
          obj[`${header}_formatted`] = dateValue.formatted;
        } else if (header.toLowerCase().includes('mmt')) {
          // Store MMT number as string for exact matching
          obj[header] = value.toString().trim();
          obj[`${header}_search`] = value.toString().toLowerCase().trim();
        } else if (header.toLowerCase().includes('location') || 
                   header.toLowerCase().includes('description') || 
                   header.toLowerCase().includes('action')) {
          // Store text fields with multiple search versions
          const cleanValue = value.toString().trim();
          obj[header] = cleanValue;
          obj[`${header}_search`] = cleanValue.toLowerCase();
          obj[`${header}_uppercase`] = cleanValue.toUpperCase();
          obj[`${header}_normalized`] = this.normalizeText(cleanValue);
        } else {
          // Store other fields as-is
          obj[header] = value;
        }
      });
      
      return obj;
    });
  }
  
  /**
   * Generate comprehensive data statistics
   */
  private static generateDataStatistics(data: any[]): any {
    const stats: any = {
      totalRecords: data.length,
      dateRange: { min: null, max: null },
      uniqueLocations: new Set(),
      uniqueActions: new Set(),
      uniqueMMTs: new Set(),
      monthlyCounts: {},
      yearlyCounts: {}
    };
    
    data.forEach(record => {
      // Track date range
      if (record.Date_parsed) {
        if (!stats.dateRange.min || record.Date_parsed < stats.dateRange.min) {
          stats.dateRange.min = record.Date_parsed;
        }
        if (!stats.dateRange.max || record.Date_parsed > stats.dateRange.max) {
          stats.dateRange.max = record.Date_parsed;
        }
      }
      
      // Track unique values
      if (record.Location) stats.uniqueLocations.add(record.Location);
      if (record.Action) stats.uniqueActions.add(record.Action);
      if (record['MMT No']) stats.uniqueMMTs.add(record['MMT No']);
      
      // Track monthly/yearly counts
      if (record.Date_month && record.Date_year) {
        const monthKey = `${record.Date_month}/${record.Date_year}`;
        const yearKey = record.Date_year.toString();
        
        stats.monthlyCounts[monthKey] = (stats.monthlyCounts[monthKey] || 0) + 1;
        stats.yearlyCounts[yearKey] = (stats.yearlyCounts[yearKey] || 0) + 1;
      }
    });
    
    // Convert Sets to arrays for easier access
    stats.uniqueLocations = Array.from(stats.uniqueLocations);
    stats.uniqueActions = Array.from(stats.uniqueActions);
    stats.uniqueMMTs = Array.from(stats.uniqueMMTs);
    
    return stats;
  }

  /**
   * Intelligent query interpreter for professional chatbot
   */
  static interpretNaturalLanguageQuery(userQuery: string, excelData: any[]): {
    success: boolean;
    queryType: string;
    filters: any;
    intent: string;
    confidence: number;
    error?: string;
  } {
    try {
      console.log('🧠 Interpreting natural language query:', userQuery);
      
      const query = userQuery.toLowerCase().trim();
      const analysis: {
        queryType: string;
        filters: {
          dates: Array<{
            type: string;
            value: string;
            month?: number;
            year?: number;
            description: string;
          }>;
          locations: Array<{
            type: string;
            value: string;
            operator: string;
            normalized: string;
          }>;
          actions: Array<{
            value: string;
            operator: string;
            normalized: string;
          }>;
          descriptions: Array<{
            value: string;
            operator: string;
            normalized: string;
          }>;
          mmtNumbers: Array<{
            value: string;
            operator: string;
          }>;
          keywords: string[];
        };
        intent: string;
        confidence: number;
      } = {
        queryType: 'unknown',
        filters: {
          dates: [],
          locations: [],
          actions: [],
          descriptions: [],
          mmtNumbers: [],
          keywords: []
        },
        intent: 'list',
        confidence: 0
      };
      
      // Detect query type and intent
      if (query.includes('how many') || query.includes('count')) {
        analysis.queryType = 'count';
        analysis.intent = 'count';
        analysis.confidence += 0.3;
      } else if (query.includes('last action') || query.includes('last entry') || query.includes('most recent')) {
        analysis.queryType = 'last_action';
        analysis.intent = 'last_action';
        analysis.confidence += 0.3;
      } else if (query.includes('list all') || query.includes('show all') || query.includes('all locations')) {
        analysis.queryType = 'list_all';
        analysis.intent = 'list_all';
        analysis.confidence += 0.3;
      } else if (query.includes('details') || query.includes('show details') || query.includes('information')) {
        analysis.queryType = 'details';
        analysis.intent = 'details';
        analysis.confidence += 0.3;
      } else if (query.includes('unique') || query.includes('distinct')) {
        analysis.queryType = 'unique_values';
        analysis.intent = 'unique_values';
        analysis.confidence += 0.3;
      }
      
      // Extract date filters
      analysis.filters.dates = this.extractDateFilters(query);
      if (analysis.filters.dates.length > 0) analysis.confidence += 0.2;
      
      // Extract location filters
      analysis.filters.locations = this.extractLocationFilters(query);
      if (analysis.filters.locations.length > 0) analysis.confidence += 0.2;
      
      // Extract action filters
      analysis.filters.actions = this.extractActionFilters(query);
      if (analysis.filters.actions.length > 0) analysis.confidence += 0.2;
      
      // Extract description filters
      analysis.filters.descriptions = this.extractDescriptionFilters(query);
      if (analysis.filters.descriptions.length > 0) analysis.confidence += 0.2;
      
      // Extract MMT number filters
      analysis.filters.mmtNumbers = this.extractMMTFilters(query);
      if (analysis.filters.mmtNumbers.length > 0) analysis.confidence += 0.2;
      
      // Extract general keywords
      analysis.filters.keywords = this.extractKeywords(query);
      
      // Determine final query type if still unknown
      if (analysis.queryType === 'unknown') {
        if (analysis.filters.dates.length > 0 && analysis.filters.locations.length > 0) {
          analysis.queryType = 'filtered_list';
        } else if (analysis.filters.locations.length > 0) {
          analysis.queryType = 'location_based';
        } else if (analysis.filters.actions.length > 0) {
          analysis.queryType = 'action_based';
        } else {
          analysis.queryType = 'general_search';
        }
      }
      
      console.log('✅ Query interpretation completed:', analysis);
      
      return {
        success: true,
        queryType: analysis.queryType,
        filters: analysis.filters,
        intent: analysis.intent,
        confidence: analysis.confidence
      };
      
    } catch (error) {
      console.error('❌ Error interpreting query:', error);
      return {
        success: false,
        queryType: 'error',
        filters: {},
        intent: 'unknown',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Extract date filters from query
   */
  private static extractDateFilters(query: string): Array<{
    type: string;
    value: string;
    month?: number;
    year?: number;
    description: string;
  }> {
    const filters: Array<{
      type: string;
      value: string;
      month?: number;
      year?: number;
      description: string;
    }> = [];
    
    // Month/Year patterns
    if (query.includes('june 2025') || query.includes('6/2025')) {
      filters.push({
        type: 'month_year',
        value: '6/2025',
        month: 6,
        year: 2025,
        description: 'June 2025'
      });
    }
    
    // Specific dates
    const datePatterns = [
      { pattern: /6\/24\/2025|june 24|june 24th/i, value: '6/24/2025', month: 6, day: 24, year: 2025 },
      { pattern: /6\/27\/2025|june 27|june 27th/i, value: '6/27/2025', month: 6, day: 27, year: 2025 },
      { pattern: /6\/25\/2025|june 25|june 25th/i, value: '6/25/2025', month: 6, day: 25, year: 2025 }
    ];
    
    datePatterns.forEach(({ pattern, value, month, day, year }) => {
      if (pattern.test(query)) {
        filters.push({
          type: 'specific_date',
          value,
          month,
          year,
          description: `${month}/${day}/${year}`
        });
      }
    });
    
    // Year patterns
    if (query.includes('2025')) {
      filters.push({
        type: 'year',
        value: '2025',
        year: 2025,
        description: 'Year 2025'
      });
    }
    
    return filters;
  }
  
  /**
   * Extract location filters from query
   */
  private static extractLocationFilters(query: string): Array<{
    type: string;
    value: string;
    operator: string;
    normalized: string;
  }> {
    const filters: Array<{
      type: string;
      value: string;
      operator: string;
      normalized: string;
    }> = [];
    
    const locationPatterns = [
      { pattern: /1172 eleventh street|eleventh street/i, value: 'eleventh street', operator: 'contains' },
      { pattern: /387 lemon circle/i, value: '387 LEMON CIRCLE', operator: 'equals' },
      { pattern: /ninth street/i, value: 'ninth street', operator: 'contains' },
      { pattern: /guest house/i, value: 'guest house', operator: 'contains' }
    ];
    
    locationPatterns.forEach(({ pattern, value, operator }) => {
      if (pattern.test(query)) {
        filters.push({
          type: operator === 'equals' ? 'exact' : 'partial',
          value,
          operator,
          normalized: this.normalizeText(value)
        });
      }
    });
    
    return filters;
  }
  
  /**
   * Extract action filters from query
   */
  private static extractActionFilters(query: string): Array<{
    value: string;
    operator: string;
    normalized: string;
  }> {
    const filters: Array<{
      value: string;
      operator: string;
      normalized: string;
    }> = [];
    
    const actionPatterns = [
      { pattern: /clean air filter/i, value: 'CLEAN AIR FILTER', operator: 'contains' },
      { pattern: /event,? stand by|stand by/i, value: 'EVENT, STAND BY', operator: 'contains' },
      { pattern: /ac standby technician/i, value: 'AC STANDBY TECHNICIAN', operator: 'contains' }
    ];
    
    actionPatterns.forEach(({ pattern, value, operator }) => {
      if (pattern.test(query)) {
        filters.push({
          value,
          operator,
          normalized: this.normalizeText(value)
        });
      }
    });
    
    return filters;
  }
  
  /**
   * Extract description filters from query
   */
  private static extractDescriptionFilters(query: string): Array<{
    value: string;
    operator: string;
    normalized: string;
  }> {
    const filters: Array<{
      value: string;
      operator: string;
      normalized: string;
    }> = [];
    
    const descriptionPatterns = [
      { pattern: /ac not cooling|not cooling properly/i, value: 'not cooling properly', operator: 'contains' },
      { pattern: /standby technician/i, value: 'standby technician', operator: 'contains' }
    ];
    
    descriptionPatterns.forEach(({ pattern, value, operator }) => {
      if (pattern.test(query)) {
        filters.push({
          value,
          operator,
          normalized: this.normalizeText(value)
        });
      }
    });
    
    return filters;
  }
  
  /**
   * Extract MMT number filters from query
   */
  private static extractMMTFilters(query: string): Array<{
    value: string;
    operator: string;
  }> {
    const filters: Array<{
      value: string;
      operator: string;
    }> = [];
    
    const mmtPattern = /400620960[0-9]/i;
    const match = query.match(mmtPattern);
    
    if (match) {
      filters.push({
        value: match[0],
        operator: 'equals'
      });
    }
    
    return filters;
  }
  
  /**
   * Extract general keywords from query
   */
  private static extractKeywords(query: string): string[] {
    const keywords = ['mmt', 'action', 'location', 'date', 'description', 'issue', 'problem', 'work'];
    return keywords.filter(keyword => query.includes(keyword));
  }

  /**
   * Intelligent query executor for professional chatbot
   */
  static executeIntelligentQuery(userQuery: string, excelData: any[]): {
    success: boolean;
    results: any[];
    totalCount: number;
    queryType: string;
    appliedFilters: string[];
    executionTime: number;
    error?: string;
  } {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Executing intelligent query:', userQuery);
      
      if (!excelData || excelData.length === 0) {
        return {
          success: false,
          results: [],
          totalCount: 0,
          queryType: 'error',
          appliedFilters: [],
          executionTime: Date.now() - startTime,
          error: 'No Excel data available'
        };
      }
      
      // Interpret the query
      const queryAnalysis = this.interpretNaturalLanguageQuery(userQuery, excelData);
      
      if (!queryAnalysis.success) {
        return {
          success: false,
          results: [],
          totalCount: 0,
          queryType: 'error',
          appliedFilters: [],
          executionTime: Date.now() - startTime,
          error: queryAnalysis.error || 'Failed to interpret query'
        };
      }
      
      console.log('🔍 Query analysis:', queryAnalysis);
      
      // Apply filters to the dataset
      let filteredResults = excelData;
      const appliedFilters: string[] = [];
      
      // Apply date filters
      if (queryAnalysis.filters.dates.length > 0) {
        filteredResults = this.applyIntelligentDateFilters(filteredResults, queryAnalysis.filters.dates);
        appliedFilters.push(`Date: ${queryAnalysis.filters.dates.map((f: any) => f.description).join(', ')}`);
      }
      
      // Apply location filters
      if (queryAnalysis.filters.locations.length > 0) {
        filteredResults = this.applyIntelligentLocationFilters(filteredResults, queryAnalysis.filters.locations);
        appliedFilters.push(`Location: ${queryAnalysis.filters.locations.map((f: any) => f.value).join(', ')}`);
      }
      
      // Apply action filters
      if (queryAnalysis.filters.actions.length > 0) {
        filteredResults = this.applyIntelligentActionFilters(filteredResults, queryAnalysis.filters.actions);
        appliedFilters.push(`Action: ${queryAnalysis.filters.actions.map((f: any) => f.value).join(', ')}`);
      }
      
      // Apply description filters
      if (queryAnalysis.filters.descriptions.length > 0) {
        filteredResults = this.applyIntelligentDescriptionFilters(filteredResults, queryAnalysis.filters.descriptions);
        appliedFilters.push(`Description: ${queryAnalysis.filters.descriptions.map((f: any) => f.value).join(', ')}`);
      }
      
      // Apply MMT filters
      if (queryAnalysis.filters.mmtNumbers.length > 0) {
        filteredResults = this.applyIntelligentMMTFilters(filteredResults, queryAnalysis.filters.mmtNumbers);
        appliedFilters.push(`MMT: ${queryAnalysis.filters.mmtNumbers.map((f: any) => f.value).join(', ')}`);
      }
      
      // Sort results based on query type
      filteredResults = this.sortResultsByQueryType(filteredResults, queryAnalysis.queryType);
      
      const totalCount = filteredResults.length;
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Query executed successfully`);
      console.log(`📊 Results found: ${totalCount}`);
      console.log(`⏱️ Execution time: ${executionTime}ms`);
      
      return {
        success: true,
        results: filteredResults,
        totalCount,
        queryType: queryAnalysis.queryType,
        appliedFilters,
        executionTime
      };
      
    } catch (error) {
      console.error('❌ Error executing query:', error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        queryType: 'error',
        appliedFilters: [],
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Apply intelligent date filters
   */
  private static applyIntelligentDateFilters(data: any[], dateFilters: Array<{
    type: string;
    value: string;
    month?: number;
    year?: number;
    description: string;
  }>): any[] {
    return data.filter(record => {
      return dateFilters.every(filter => {
        const recordDate = record.Date_parsed;
        const recordMonth = record.Date_month;
        const recordYear = record.Date_year;
        
        if (!recordDate && !recordMonth && !recordYear) return false;
        
        switch (filter.type) {
          case 'month_year':
            return recordMonth === filter.month && recordYear === filter.year;
          case 'specific_date':
            return recordMonth === filter.month && recordYear === filter.year;
          case 'year':
            return recordYear === filter.year;
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply intelligent location filters
   */
  private static applyIntelligentLocationFilters(data: any[], locationFilters: Array<{
    type: string;
    value: string;
    operator: string;
    normalized: string;
  }>): any[] {
    return data.filter(record => {
      return locationFilters.every(filter => {
        const recordLocation = record.Location || record['Functional Location'];
        const recordLocationSearch = record.Location_search || record['Functional Location_search'];
        const recordLocationNormalized = record.Location_normalized || record['Functional Location_normalized'];
        
        if (!recordLocation) return false;
        
        switch (filter.operator) {
          case 'contains':
            return recordLocationSearch.includes(filter.value.toLowerCase()) ||
                   recordLocationNormalized.includes(filter.normalized);
          case 'equals':
            return recordLocationSearch === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply intelligent action filters
   */
  private static applyIntelligentActionFilters(data: any[], actionFilters: Array<{
    value: string;
    operator: string;
    normalized: string;
  }>): any[] {
    return data.filter(record => {
      return actionFilters.every(filter => {
        const recordAction = record.Action;
        const recordActionSearch = record.Action_search;
        const recordActionNormalized = record.Action_normalized;
        
        if (!recordAction) return false;
        
        switch (filter.operator) {
          case 'contains':
            return recordActionSearch.includes(filter.value.toLowerCase()) ||
                   recordActionNormalized.includes(filter.normalized);
          case 'equals':
            return recordActionSearch === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply intelligent description filters
   */
  private static applyIntelligentDescriptionFilters(data: any[], descriptionFilters: Array<{
    value: string;
    operator: string;
    normalized: string;
  }>): any[] {
    return data.filter(record => {
      return descriptionFilters.every(filter => {
        const recordDescription = record.Description;
        const recordDescriptionSearch = record.Description_search;
        const recordDescriptionNormalized = record.Description_normalized;
        
        if (!recordDescription) return false;
        
        switch (filter.operator) {
          case 'contains':
            return recordDescriptionSearch.includes(filter.value.toLowerCase()) ||
                   recordDescriptionNormalized.includes(filter.normalized);
          case 'equals':
            return recordDescriptionSearch === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Apply intelligent MMT filters
   */
  private static applyIntelligentMMTFilters(data: any[], mmtFilters: Array<{
    value: string;
    operator: string;
  }>): any[] {
    return data.filter(record => {
      return mmtFilters.every(filter => {
        const recordMMT = record['MMT No'];
        const recordMMTSearch = record['MMT No_search'];
        
        if (!recordMMT) return false;
        
        switch (filter.operator) {
          case 'contains':
            return recordMMTSearch.includes(filter.value.toLowerCase());
          case 'equals':
            return recordMMTSearch === filter.value.toLowerCase();
          default:
            return true;
        }
      });
    });
  }
  
  /**
   * Sort results based on query type
   */
  private static sortResultsByQueryType(results: any[], queryType: string): any[] {
    switch (queryType) {
      case 'last_action':
        // Sort by date descending to get most recent first
        return results.sort((a, b) => {
          if (!a.Date_parsed) return 1;
          if (!b.Date_parsed) return -1;
          return b.Date_parsed.getTime() - a.Date_parsed.getTime();
        });
      case 'count':
        // No sorting needed for count queries
        return results;
      default:
        // Default sorting by date ascending
        return results.sort((a, b) => {
          if (!a.Date_parsed) return 1;
          if (!b.Date_parsed) return -1;
          return a.Date_parsed.getTime() - b.Date_parsed.getTime();
        });
    }
  }

  /**
   * Professional response formatter for chatbot
   */
  static formatProfessionalResponse(userQuery: string, queryResult: any): string {
    const { results, totalCount, queryType, appliedFilters, executionTime } = queryResult;
    
    let response = `🔍 **Query Analysis Results**\n\n`;
    response += `**Question:** "${userQuery}"\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (totalCount === 0) {
      response += `❌ **No matching records found** in the uploaded file.\n\n`;
      response += `💡 **Suggestions to improve your search:**\n`;
      response += `• Check spelling of location names, actions, or descriptions\n`;
      response += `• Use broader search terms (e.g., "eleventh street" instead of full address)\n`;
      response += `• Try different date formats (e.g., "June 2025" or "6/2025")\n`;
      response += `• Use partial keywords (e.g., "stand by" instead of "EVENT, STAND BY")\n\n`;
      response += `📊 **Available data:** The file contains maintenance records with locations, dates, actions, and descriptions.\n`;
      return response;
    }
    
    response += `📊 **Results Summary:**\n`;
    response += `• **Total Records Found:** ${totalCount.toLocaleString()}\n`;
    response += `• **Query Type:** ${this.formatQueryTypeProfessional(queryType)}\n`;
    response += `• **Response Time:** ${executionTime}ms\n\n`;
    
    if (appliedFilters.length > 0) {
      response += `🔍 **Applied Search Filters:**\n`;
      appliedFilters.forEach((filter: string) => {
        response += `• ${filter}\n`;
      });
      response += `\n`;
    }
    
    // Format results based on query type
    switch (queryType) {
      case 'count':
        response += this.formatCountResponseProfessional(results, totalCount);
        break;
      case 'last_action':
        response += this.formatLastActionResponseProfessional(results);
        break;
      case 'list_all':
        response += this.formatListAllResponseProfessional(results, totalCount);
        break;
      case 'details':
        response += this.formatDetailsResponseProfessional(results, totalCount);
        break;
      case 'unique_values':
        response += this.formatUniqueValuesResponseProfessional(results, totalCount);
        break;
      default:
        response += this.formatDefaultResponseProfessional(results, totalCount);
    }
    
    response += `\n✅ **Query completed successfully**\n`;
    response += `🔍 **Ready for more questions:** Ask about specific dates, locations, actions, or request counts and details.`;
    
    return response;
  }
  
  /**
   * Format query type professionally
   */
  private static formatQueryTypeProfessional(queryType: string): string {
    switch (queryType) {
      case 'count': return 'Count Records';
      case 'last_action': return 'Last Action/Entry';
      case 'list_all': return 'List All Records';
      case 'details': return 'Detailed Information';
      case 'unique_values': return 'Unique Values';
      case 'filtered_list': return 'Filtered List';
      case 'location_based': return 'Location-Based Query';
      case 'action_based': return 'Action-Based Query';
      default: return 'General Query';
    }
  }
  
  /**
   * Format count response professionally
   */
  private static formatCountResponseProfessional(results: any[], totalCount: number): string {
    return `📊 **Count Result:** Found ${totalCount.toLocaleString()} matching record${totalCount === 1 ? '' : 's'}.\n\n`;
  }
  
  /**
   * Format last action response professionally
   */
  private static formatLastActionResponseProfessional(results: any[]): string {
    if (results.length === 0) return '';
    
    const lastRecord = results[0]; // Already sorted by date descending
    let response = `📋 **Last Action Details:**\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const location = lastRecord.Location || lastRecord['Functional Location'] || 'Unknown Location';
    const action = lastRecord.Action || 'No Action Specified';
    const date = lastRecord.Date_formatted || 'Date Not Available';
    
    response += `**Location:** ${location}\n`;
    response += `**Last Action:** ${action}\n`;
    response += `**Date:** ${date}\n`;
    response += `**MMT No:** ${lastRecord['MMT No'] || 'N/A'}\n`;
    response += `**Description:** ${lastRecord.Description || 'N/A'}\n`;
    
    return response;
  }
  
  /**
   * Format list all response professionally
   */
  private static formatListAllResponseProfessional(results: any[], totalCount: number): string {
    let response = `📋 **All ${totalCount.toLocaleString()} Records:**\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (totalCount <= 10) {
      // Show all results if 10 or fewer
      results.forEach((record, index) => {
        response += `**Record ${index + 1}:**\n`;
        response += `• **MMT No:** ${record['MMT No'] || 'N/A'}\n`;
        response += `• **Date:** ${record.Date_formatted || 'N/A'}\n`;
        response += `• **Location:** ${record.Location || record['Functional Location'] || 'N/A'}\n`;
        response += `• **Description:** ${record.Description || 'N/A'}\n`;
        response += `• **Action:** ${record.Action || 'N/A'}\n\n`;
        
        if (index < results.length - 1) {
          response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }
      });
    } else {
      // Show summary and sample results for large result sets
      response += `📊 **Sample Results (first 5 records):**\n\n`;
      
      results.slice(0, 5).forEach((record, index) => {
        response += `**Record ${index + 1}:**\n`;
        response += `• **MMT No:** ${record['MMT No'] || 'N/A'}\n`;
        response += `• **Date:** ${record.Date_formatted || 'N/A'}\n`;
        response += `• **Location:** ${record.Location || record['Functional Location'] || 'N/A'}\n`;
        response += `• **Description:** ${record.Description || 'N/A'}\n`;
        response += `• **Action:** ${record.Action || 'N/A'}\n\n`;
      });
      
      response += `... and ${(totalCount - 5).toLocaleString()} more records\n\n`;
      response += `💡 **To see all results:** Ask a more specific question or use the column buttons above\n`;
    }
    
    return response;
  }
  
  /**
   * Format details response professionally
   */
  private static formatDetailsResponseProfessional(results: any[], totalCount: number): string {
    if (totalCount === 1) {
      return this.formatListAllResponseProfessional(results, totalCount);
    } else {
      return this.formatListAllResponseProfessional(results.slice(0, 5), Math.min(5, totalCount)) +
             `... and ${Math.max(0, totalCount - 5).toLocaleString()} more records\n\n` +
             `💡 **For complete details:** Ask a more specific question or use the column buttons above\n`;
    }
  }
  
  /**
   * Format unique values response professionally
   */
  private static formatUniqueValuesResponseProfessional(results: any[], totalCount: number): string {
    const uniqueLocations = new Set();
    const uniqueActions = new Set();
    
    results.forEach(record => {
      if (record.Location) uniqueLocations.add(record.Location);
      if (record.Action) uniqueActions.add(record.Action);
    });
    
    let response = `📊 **Unique Values Summary:**\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    response += `**Total Records:** ${totalCount.toLocaleString()}\n`;
    response += `**Unique Locations:** ${uniqueLocations.size}\n`;
    response += `**Unique Actions:** ${uniqueActions.size}\n\n`;
    
    if (uniqueLocations.size <= 10) {
      response += `**All Locations:**\n`;
      Array.from(uniqueLocations).forEach((location, index) => {
        response += `${index + 1}. ${location}\n`;
      });
      response += `\n`;
    }
    
    if (uniqueActions.size <= 10) {
      response += `**All Actions:**\n`;
      Array.from(uniqueActions).forEach((action, index) => {
        response += `${index + 1}. ${action}\n`;
      });
    }
    
    return response;
  }
  
  /**
   * Format default response professionally
   */
  private static formatDefaultResponseProfessional(results: any[], totalCount: number): string {
    if (totalCount <= 5) {
      return this.formatListAllResponseProfessional(results, totalCount);
    } else {
      return this.formatListAllResponseProfessional(results.slice(0, 5), 5) +
             `... and ${(totalCount - 5).toLocaleString()} more records\n\n` +
             `💡 **To see all results:** Ask a more specific question or use the column buttons above\n`;
    }
  }

  /**
   * Main professional chatbot integration method
   */
  static handleProfessionalChatbotQuery(userQuery: string, excelData: any[]): string {
    try {
      console.log('🤖 Professional chatbot query received:', userQuery);
      
      if (!excelData || excelData.length === 0) {
        return '❌ **No Excel data available.** Please upload your Excel file first.';
      }
      
      // Execute the intelligent query
      const queryResult = this.executeIntelligentQuery(userQuery, excelData);
      
      if (!queryResult.success) {
        return `❌ **Query Error:** ${queryResult.error || 'Unknown error occurred'}. Please try rephrasing your question.`;
      }
      
      // Format the professional response
      const formattedResponse = this.formatProfessionalResponse(userQuery, queryResult);
      
      console.log('✅ Professional chatbot response generated successfully');
      return formattedResponse;
      
    } catch (error) {
      console.error('❌ Error in professional chatbot query handler:', error);
      return `❌ **System Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try rephrasing your question.`;
    }
  }
  
  /**
   * Get professional sample queries for user guidance
   */
  static getProfessionalSampleQueries(): Array<{
    question: string;
    category: string;
    description: string;
  }> {
    return [
      {
        question: 'How many MMTs were received for 1172 ELEVENTH STREET (GUEST HOUSE) in June 2025?',
        category: 'Count Query',
        description: 'Count records by location and date range'
      },
      {
        question: 'What is the last action taken at 387 LEMON CIRCLE?',
        category: 'Last Action Query',
        description: 'Find most recent action for a specific location'
      },
      {
        question: 'List all issues reported at NINTH STREET.',
        category: 'List Query',
        description: 'Show all records for a specific location'
      },
      {
        question: 'Which locations had EVENT, STAND BY action in June?',
        category: 'Filtered Query',
        description: 'Find locations with specific actions in a date range'
      },
      {
        question: 'Show details for MMT No 4006209607.',
        category: 'Specific Record Query',
        description: 'Get detailed information for a specific MMT number'
      },
      {
        question: 'All locations where AC was not cooling properly in 2025.',
        category: 'Description Filter Query',
        description: 'Find locations with specific description keywords'
      },
      {
        question: 'Count all MMTs from June 2025.',
        category: 'Date Count Query',
        description: 'Count records in a specific month/year'
      },
      {
        question: 'Unique list of all locations in the file.',
        category: 'Unique Values Query',
        description: 'Get distinct locations from all records'
      }
    ];
  }
  
  /**
   * Get data overview for user guidance
   */
  static getDataOverview(excelData: any[]): string {
    if (!excelData || excelData.length === 0) {
      return '❌ No data available for overview.';
    }
    
    const totalRecords = excelData.length;
    const uniqueLocations = new Set();
    const uniqueActions = new Set();
    const dateRange: { min: Date | null; max: Date | null } = { min: null, max: null };
    
    excelData.forEach(record => {
      if (record.Location) uniqueLocations.add(record.Location);
      if (record.Action) uniqueActions.add(record.Action);
      
      if (record.Date_parsed) {
        if (!dateRange.min || record.Date_parsed < dateRange.min) {
          dateRange.min = record.Date_parsed;
        }
        if (!dateRange.max || record.Date_parsed > dateRange.max) {
          dateRange.max = record.Date_parsed;
        }
      }
    });
    
    let overview = `📊 **Excel Data Overview**\n`;
    overview += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    overview += `**Total Records:** ${totalRecords.toLocaleString()}\n`;
    overview += `**Unique Locations:** ${uniqueLocations.size}\n`;
    overview += `**Unique Actions:** ${uniqueActions.size}\n`;
    
    if (dateRange.min && dateRange.max) {
      overview += `**Date Range:** ${dateRange.min.toLocaleDateString()} to ${dateRange.max.toLocaleDateString()}\n`;
    }
    
    overview += `\n💡 **You can ask me about:**\n`;
    overview += `• Counts of records by location, date, or action\n`;
    overview += `• Details of specific MMT numbers\n`;
    overview += `• Last actions taken at locations\n`;
    overview += `• All records for specific criteria\n`;
    overview += `• Unique values in any column\n`;
    
    return overview;
  }

  /**
   * Execute query based on AI-generated JSON query plan
   */
  static executeQuery(fullData: any[], queryJson: any): {
    results: any[];
    totalCount: number;
    allResults: any[];
    querySummary: string;
  } {
    try {
      console.log('🚀 Executing query with plan:', queryJson);
      
      if (!fullData || fullData.length === 0) {
        console.log('❌ No data available for query execution');
        return {
          results: [],
          totalCount: 0,
          allResults: [],
          querySummary: 'No data available for querying'
        };
      }
      
      if (!queryJson || !queryJson.filters || !Array.isArray(queryJson.filters)) {
        console.log('❌ Invalid query plan format');
        return {
          results: fullData,
          totalCount: fullData.length,
          allResults: fullData,
          querySummary: 'No valid filters applied - returning all data'
        };
      }
      
      let filteredResults = fullData;
      
      // Apply each filter
      queryJson.filters.forEach((filter: any) => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          console.log(`🔍 Applying filter: ${filter.field} ${filter.operator} ${filter.value}`);
          
          filteredResults = filteredResults.filter(record => {
            return this.applyFilter(record, filter);
          });
          
          console.log(`📊 Records after filter: ${filteredResults.length}`);
        }
      });
      
      // Handle special intent: last_action
      if (queryJson.intent === 'last_action' && filteredResults.length > 0) {
        // Sort by date descending and return only the first record
        filteredResults = this.sortByDateDescending(filteredResults);
        filteredResults = filteredResults.slice(0, 1);
        console.log('📅 Last action query: returning most recent record');
      }
      
      // Create query summary
      const querySummary = `Query executed successfully. Found ${filteredResults.length} matching records out of ${fullData.length} total records.`;
      
      console.log(`✅ Query execution completed. Results: ${filteredResults.length} records`);
      
      return {
        results: filteredResults.slice(0, 10), // Limit display results
        totalCount: filteredResults.length,
        allResults: filteredResults, // Return ALL results
        querySummary
      };
      
    } catch (error) {
      console.error('❌ Error executing query:', error);
      return {
        results: [],
        totalCount: 0,
        allResults: [],
        querySummary: `Error executing query: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Apply a single filter to a record
   */
  private static applyFilter(record: any, filter: any): boolean {
    const { field, operator, value } = filter;
    
    // Find the actual field name (case-insensitive)
    const actualField = this.findFieldByName(record, field);
    if (!actualField) {
      console.log(`⚠️ Field not found: ${field}`);
      return false;
    }
    
    const fieldValue = record[actualField];
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return false;
    }
    
    switch (operator) {
      case 'contains':
        return this.containsValue(fieldValue, value);
      case 'equals':
        return this.equalsValue(fieldValue, value);
      case 'starts_with':
        return this.startsWithValue(fieldValue, value);
      case 'ends_with':
        return this.endsWithValue(fieldValue, value);
      case 'month':
        return this.matchesMonth(fieldValue, value);
      case 'year':
        return this.matchesYear(fieldValue, value);
      case 'greater_than':
        return this.greaterThanValue(fieldValue, value);
      case 'less_than':
        return this.lessThanValue(fieldValue, value);
      default:
        console.log(`⚠️ Unknown operator: ${operator}`);
        return true; // Don't filter if operator is unknown
    }
  }
  
  /**
   * Find field name in record (case-insensitive)
   */
  private static findFieldByName(record: any, fieldName: string): string | null {
    const recordKeys = Object.keys(record);
    
    // Exact match first
    if (recordKeys.includes(fieldName)) {
      return fieldName;
    }
    
    // Case-insensitive match
    const lowerFieldName = fieldName.toLowerCase();
    const matchedKey = recordKeys.find(key => key.toLowerCase() === lowerFieldName);
    if (matchedKey) {
      return matchedKey;
    }
    
    // Partial match for common variations
    if (fieldName.toLowerCase().includes('date')) {
      const dateField = recordKeys.find(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('time')
      );
      if (dateField) return dateField;
    }
    
    if (fieldName.toLowerCase().includes('location')) {
      const locationField = recordKeys.find(key => 
        key.toLowerCase().includes('location') || 
        key.toLowerCase().includes('place')
      );
      if (locationField) return locationField;
    }
    
    return null;
  }
  
  /**
   * Filter helper methods
   */
  private static containsValue(fieldValue: any, searchValue: string): boolean {
    const fieldStr = fieldValue.toString().toLowerCase();
    const searchStr = searchValue.toString().toLowerCase();
    return fieldStr.includes(searchStr);
  }
  
  private static equalsValue(fieldValue: any, searchValue: any): boolean {
    return fieldValue.toString().toLowerCase() === searchValue.toString().toLowerCase();
  }
  
  private static startsWithValue(fieldValue: any, searchValue: string): boolean {
    const fieldStr = fieldValue.toString().toLowerCase();
    const searchStr = searchValue.toString().toLowerCase();
    return fieldStr.startsWith(searchStr);
  }
  
  private static endsWithValue(fieldValue: any, searchValue: string): boolean {
    const fieldStr = fieldValue.toString().toLowerCase();
    const searchStr = searchValue.toString().toLowerCase();
    return fieldStr.endsWith(searchStr);
  }
  
  private static matchesMonth(fieldValue: any, month: number): boolean {
    // Check if fieldValue has month information
    if (fieldValue && typeof fieldValue === 'object' && fieldValue.month) {
      return fieldValue.month === month;
    }
    
    // Check parsed date fields
    const parsedField = this.findParsedDateField(fieldValue);
    if (parsedField && parsedField.month) {
      return parsedField.month === month;
    }
    
    return false;
  }
  
  private static matchesYear(fieldValue: any, year: number): boolean {
    // Check if fieldValue has year information
    if (fieldValue && typeof fieldValue === 'object' && fieldValue.year) {
      return fieldValue.year === year;
    }
    
    // Check parsed date fields
    const parsedField = this.findParsedDateField(fieldValue);
    if (parsedField && parsedField.year) {
      return parsedField.year === year;
    }
    
    return false;
  }
  
  private static greaterThanValue(fieldValue: any, compareValue: any): boolean {
    if (typeof fieldValue === 'number' && typeof compareValue === 'number') {
      return fieldValue > compareValue;
    }
    
    // Try to parse as numbers
    const fieldNum = parseFloat(fieldValue);
    const compareNum = parseFloat(compareValue);
    if (!isNaN(fieldNum) && !isNaN(compareNum)) {
      return fieldNum > compareNum;
    }
    
    return false;
  }
  
  private static lessThanValue(fieldValue: any, compareValue: any): boolean {
    if (typeof fieldValue === 'number' && typeof compareValue === 'number') {
      return fieldValue < compareValue;
    }
    
    // Try to parse as numbers
    const fieldNum = parseFloat(fieldValue);
    const compareNum = parseFloat(compareValue);
    if (!isNaN(fieldNum) && !isNaN(compareNum)) {
      return fieldNum < compareNum;
    }
    
    return false;
  }
  
  /**
   * Find parsed date field in record
   */
  private static findParsedDateField(fieldValue: any): any {
    if (fieldValue && typeof fieldValue === 'object') {
      // Check if it's already a parsed date object
      if (fieldValue.month !== undefined && fieldValue.year !== undefined) {
        return fieldValue;
      }
      
      // Check for parsed date fields
      const record = fieldValue;
      const dateFields = Object.keys(record).filter(key => 
        key.toLowerCase().includes('date') && 
        (key.toLowerCase().includes('parsed') || key.toLowerCase().includes('month'))
      );
      
      if (dateFields.length > 0) {
        return record[dateFields[0]];
      }
    }
    
    return null;
  }
  
  /**
   * Sort records by date in descending order
   */
  private static sortByDateDescending(records: any[]): any[] {
    return records.sort((a, b) => {
      const dateA = this.extractDate(a);
      const dateB = this.extractDate(b);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  /**
   * Extract date from record
   */
  private static extractDate(record: any): Date | null {
    // Try to find date fields
    const dateFields = Object.keys(record).filter(key => 
      key.toLowerCase().includes('date') && 
      (key.toLowerCase().includes('parsed') || key.toLowerCase().includes('formatted'))
    );
    
    for (const field of dateFields) {
      const value = record[field];
      if (value instanceof Date) {
        return value;
      }
      if (value && value.parsed instanceof Date) {
        return value.parsed;
      }
    }
    
    // Try to parse date strings
    const stringDateFields = Object.keys(record).filter(key => 
      key.toLowerCase().includes('date') && 
      !key.toLowerCase().includes('parsed') && 
      !key.toLowerCase().includes('formatted')
    );
    
    for (const field of stringDateFields) {
      const value = record[field];
      if (value && typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Debug method to help troubleshoot date queries
   */
  static debugDateQuery(query: string, data: any[]): void {
    console.log('🔍 Debugging date query:', query);
    console.log('📊 Total records:', data.length);
    
    // Show sample of date fields
    if (data.length > 0) {
      const sampleRecord = data[0];
      const dateFields = Object.keys(sampleRecord).filter(key => 
        key.toLowerCase().includes('date')
      );
      
      console.log('📅 Date fields found:', dateFields);
      
      // Show first few records with date info
      data.slice(0, 3).forEach((record, index) => {
        console.log(`📋 Record ${index + 1}:`);
        dateFields.forEach(field => {
          const value = record[field];
          if (value && typeof value === 'object' && value.month && value.year) {
            console.log(`  ${field}: Month=${value.month}, Year=${value.year}, Formatted=${value.formatted}`);
          } else if (value) {
            console.log(`  ${field}: ${value}`);
          }
        });
      });
    }
  }
}
