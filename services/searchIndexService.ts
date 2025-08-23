import { ExcelAnalysis } from './excelAnalysisService';

export interface SearchIndex {
  keywords: Map<string, string[]>; // keyword -> column names
  columnMetadata: Map<string, ColumnMetadata>;
  dataTypes: Map<string, string>;
  uniqueValues: Map<string, Set<string>>;
}

export interface ColumnMetadata {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  uniqueCount: number;
  sampleValues: any[];
  searchable: boolean;
}

export interface SearchResult {
  success: boolean;
  results: any[];
  totalCount: number;
  query: string;
  matchedColumns: string[];
  error?: string;
}

export class SearchIndexService {
  private static searchIndex: SearchIndex | null = null;
  private static currentAnalysis: ExcelAnalysis | null = null;

  /**
   * Build search index from Excel analysis
   */
  static buildSearchIndex(analysis: ExcelAnalysis): SearchIndex {
    console.log('🔍 Building search index for:', analysis.fileName);
    console.log(`📊 Full dataset size: ${analysis.fullData?.length || 0} records`);
    
    const keywords = new Map<string, string[]>();
    const columnMetadata = new Map<string, ColumnMetadata>();
    const dataTypes = new Map<string, string>();
    const uniqueValues = new Map<string, Set<string>>();

    // Process each column
    analysis.columns.forEach(columnName => {
      const columnData = analysis.fullData.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
      
      // Determine if column is searchable
      const isSearchable = this.isSearchableColumn(columnName, columnData);
      
      // Store column metadata
      columnMetadata.set(columnName, {
        name: columnName,
        type: (analysis.dataTypes[columnName] as 'string' | 'number' | 'date' | 'boolean') || 'string',
        uniqueCount: new Set(columnData).size,
        sampleValues: Array.from(new Set(columnData)).slice(0, 5),
        searchable: isSearchable
      });

      // Store data type
      dataTypes.set(columnName, analysis.dataTypes[columnName] || 'string');

      // Build keyword index for searchable columns
      if (isSearchable) {
        this.buildKeywordIndex(columnName, columnData, keywords);
        
        // Store unique values for exact matching
        uniqueValues.set(columnName, new Set(columnData.map(val => val?.toString().toLowerCase())));
      }
    });

    const searchIndex: SearchIndex = {
      keywords,
      columnMetadata,
      dataTypes,
      uniqueValues
    };

    this.searchIndex = searchIndex;
    this.currentAnalysis = analysis;
    
    console.log('✅ Search index built with', keywords.size, 'keywords across', columnMetadata.size, 'columns');
    return searchIndex;
  }

  /**
   * Check if a column should be searchable
   */
  private static isSearchableColumn(columnName: string, columnData: any[]): boolean {
    const name = columnName.toLowerCase();
    
    // Always searchable columns
    if (name.includes('description') || name.includes('action') || name.includes('location') || 
        name.includes('name') || name.includes('title') || name.includes('comment')) {
      return true;
    }

    // Date columns are searchable
    if (name.includes('date') || name.includes('time')) {
      return true;
    }

    // Numeric columns with reasonable unique count
    const uniqueCount = new Set(columnData).size;
    if (name.includes('amount') || name.includes('count') || name.includes('number') || 
        name.includes('total') || name.includes('sum') || name.includes('average')) {
      return uniqueCount <= 1000; // Don't index if too many unique values
    }

    // Text columns with reasonable unique count
    if (typeof columnData[0] === 'string' && uniqueCount <= 500) {
      return true;
    }

    return false;
  }

  /**
   * Build keyword index for a column
   */
  private static buildKeywordIndex(columnName: string, columnData: any[], keywords: Map<string, string[]>) {
    const uniqueValues = new Set(columnData);
    
    uniqueValues.forEach(value => {
      if (!value) return;
      
      const valueStr = value.toString().toLowerCase();
      const words = this.extractKeywords(valueStr);
      
      words.forEach(word => {
        if (word.length < 2) return; // Skip very short words
        
        if (!keywords.has(word)) {
          keywords.set(word, []);
        }
        
        const columns = keywords.get(word)!;
        if (!columns.includes(columnName)) {
          columns.push(columnName);
        }
      });
    });
  }

  /**
   * Extract keywords from text
   */
  private static extractKeywords(text: string): string[] {
    // Remove special characters and split into words
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());
    
    // Remove common stop words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return words.filter(word => !stopWords.has(word));
  }

  /**
   * Search data using natural language query
   */
  static searchData(query: string): SearchResult {
    if (!this.searchIndex || !this.currentAnalysis) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        query,
        matchedColumns: [],
        error: 'No data indexed for search'
      };
    }

    console.log('🔍 Searching for:', query);
    
    try {
      const queryWords = this.extractKeywords(query.toLowerCase());
      const matchedColumns = new Set<string>();

      // Find matching columns for each query word
      queryWords.forEach(word => {
        if (this.searchIndex!.keywords.has(word)) {
          const columns = this.searchIndex!.keywords.get(word)!;
          columns.forEach(col => matchedColumns.add(col));
        }
      });

      // Build filters based on query
      const filters = this.buildFiltersFromQuery(query, Array.from(matchedColumns));
      
      // Apply filters to data
      let results = this.currentAnalysis.fullData;
      
      // Check for special "last N records" filter
      const lastRecordsFilter = filters.find(f => f.column === '_last_records' && f.operator === 'last_n');
      if (lastRecordsFilter) {
        const count = lastRecordsFilter.value;
        
        // Sort data by date to ensure we get the most recent records
        let sortedData = [...this.currentAnalysis.fullData];
        
        // Try to find date columns for sorting
        const dateColumns = ['Date', 'Date Functional', 'Functional Date'];
        let dateColumn = null;
        
        for (const col of dateColumns) {
          if (this.currentAnalysis.columns.includes(col)) {
            dateColumn = col;
            break;
          }
        }
        
        if (dateColumn) {
          // Sort by date in descending order (most recent first)
          sortedData.sort((a, b) => {
            const dateA = this.parseDateForSorting(a[dateColumn]);
            const dateB = this.parseDateForSorting(b[dateColumn]);
            return dateB - dateA; // Descending order
          });
          console.log(`📅 Sorted data by ${dateColumn} for last ${count} records`);
        } else {
          console.log(`⚠️ No date column found, using original order for last ${count} records`);
        }
        
        results = sortedData.slice(0, count); // Get the first N records (which are now the most recent)
        console.log(`📋 Getting last ${count} records from ${this.currentAnalysis.fullData.length} total records`);
        console.log(`📅 Date range: ${results[0]?.[dateColumn || 'Date']} to ${results[results.length-1]?.[dateColumn || 'Date']}`);
      } else {
        // Apply regular filters
        filters.forEach(filter => {
          results = results.filter(row => {
            const value = row[filter.column];
            if (!value) return false;
            
            const valueStr = value.toString().toLowerCase();
            
            switch (filter.operator) {
              case 'contains':
                return valueStr.includes(filter.value.toLowerCase());
              case 'equals':
                return valueStr === filter.value.toLowerCase();
              case 'starts_with':
                return valueStr.startsWith(filter.value.toLowerCase());
              case 'ends_with':
                return valueStr.endsWith(filter.value.toLowerCase());
              default:
                return true;
            }
          });
        });
      }

      console.log('✅ Search completed:', results.length, 'results found');
      
      // Check if this is a list query to determine result limit
      const isListQuery = query.toLowerCase().includes('list') || 
                         query.toLowerCase().includes('show') || 
                         query.toLowerCase().includes('all') ||
                         query.toLowerCase().includes('display') ||
                         query.toLowerCase().includes('last') ||
                         query.toLowerCase().includes('recent');
      
      // For list queries or when asking for last/recent entries, show ALL results
      const resultLimit = isListQuery ? results.length : 100; // Show all results for list queries
      
      return {
        success: true,
        results: results.slice(0, resultLimit), // Limit results based on query type
        totalCount: results.length,
        query,
        matchedColumns: Array.from(matchedColumns)
      };

    } catch (error: any) {
      console.error('❌ Search error:', error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        query,
        matchedColumns: [],
        error: error.message
      };
    }
  }

  /**
   * Build filters from natural language query
   */
  private static buildFiltersFromQuery(query: string, availableColumns: string[]): any[] {
    const filters: any[] = [];
    const queryLower = query.toLowerCase();

    // Special handling for "last" or "recent" queries
    if (queryLower.includes('last') || queryLower.includes('recent')) {
      // Extract number from query (e.g., "last 5", "recent 10")
      const numberMatch = queryLower.match(/(?:last|recent)\s+(\d+)/);
      if (numberMatch) {
        const count = parseInt(numberMatch[1]);
        // This will be handled in the search method to get the last N records
        filters.push({
          column: '_last_records',
          operator: 'last_n',
          value: count
        });
        return filters;
      }
    }

    // Look for exact matches in column names
    availableColumns.forEach(column => {
      const columnLower = column.toLowerCase();
      
      // Check for exact column name matches
      if (queryLower.includes(columnLower)) {
        // Extract value after column name
        const columnIndex = queryLower.indexOf(columnLower);
        const afterColumn = queryLower.substring(columnIndex + columnLower.length).trim();
        
        if (afterColumn.length > 0) {
          // Look for common patterns like "is", "equals", "contains"
          const patterns = [
            { operator: 'equals', keywords: ['is', 'equals', '='] },
            { operator: 'contains', keywords: ['contains', 'has', 'with'] },
            { operator: 'starts_with', keywords: ['starts with', 'begins with'] },
            { operator: 'ends_with', keywords: ['ends with', 'finishes with'] }
          ];

          patterns.forEach(pattern => {
            pattern.keywords.forEach(keyword => {
              if (afterColumn.includes(keyword)) {
                const valueStart = afterColumn.indexOf(keyword) + keyword.length;
                const value = afterColumn.substring(valueStart).trim();
                if (value.length > 0) {
                  filters.push({
                    column,
                    operator: pattern.operator,
                    value: value
                  });
                }
              }
            });
          });
        }
      }
    });

    return filters;
  }

  /**
   * Get search suggestions based on data structure
   */
  static getSearchSuggestions(): string[] {
    if (!this.searchIndex || !this.currentAnalysis) {
      return [];
    }

    const suggestions: string[] = [];
    const columns = Array.from(this.searchIndex.columnMetadata.keys());

    // Generate suggestions based on column types
    columns.forEach(column => {
      const metadata = this.searchIndex!.columnMetadata.get(column)!;
      
      if (metadata.type === 'date') {
        suggestions.push(`Show entries from ${column}`);
        suggestions.push(`What happened in ${column}?`);
      } else if (metadata.type === 'number') {
        suggestions.push(`What's the average ${column}?`);
        suggestions.push(`Show highest ${column}`);
      } else if (metadata.searchable) {
        suggestions.push(`Find entries with ${column}`);
        suggestions.push(`Show all ${column} values`);
      }
    });

    // Add suggestions for recent/last entries
    suggestions.push(`Show last 5 entries`);
    suggestions.push(`Show last 10 entries`);
    suggestions.push(`Show recent entries`);
    suggestions.push(`What are the latest records?`);

    return suggestions.slice(0, 10); // Limit suggestions
  }

  /**
   * Parse date for sorting purposes
   */
  private static parseDateForSorting(dateValue: any): number {
    if (!dateValue) return 0;
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Try different date formats
      const dateFormats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/    // MM-DD-YYYY
      ];
      
      for (const format of dateFormats) {
        const match = dateValue.match(format);
        if (match) {
          let month, day, year;
          if (format.source.includes('YYYY')) {
            // YYYY-MM-DD format
            year = parseInt(match[1]);
            month = parseInt(match[2]) - 1; // Month is 0-indexed
            day = parseInt(match[3]);
          } else {
            // MM/DD/YYYY or MM-DD-YYYY format
            month = parseInt(match[1]) - 1; // Month is 0-indexed
            day = parseInt(match[2]);
            year = parseInt(match[3]);
          }
          
          const date = new Date(year, month, day);
          return date.getTime();
        }
      }
      
      // Try direct Date parsing
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    
    // If it's a number, assume it's already a timestamp
    if (typeof dateValue === 'number') {
      return dateValue;
    }
    
    return 0; // Return 0 for invalid dates
  }

  /**
   * Verify full dataset is loaded and accessible
   */
  static verifyFullDataset(): boolean {
    if (!this.currentAnalysis || !this.currentAnalysis.fullData) {
      console.log('❌ No full dataset available');
      return false;
    }
    
    const fullData = this.currentAnalysis.fullData;
    console.log(`✅ DATASET VERIFICATION: ${fullData.length} records available`);
    
    // Check for data integrity
    const nonEmptyRecords = fullData.filter(record => {
      return Object.values(record).some(value => 
        value !== null && value !== undefined && value !== ''
      );
    });
    
    console.log(`📊 Records with actual data: ${nonEmptyRecords.length} out of ${fullData.length}`);
    
    // Show sample of data to verify it's complete
    if (fullData.length > 0) {
      console.log(`📋 First record:`, fullData[0]);
      console.log(`📋 Last record:`, fullData[fullData.length - 1]);
      
      // Check for date column
      const dateColumns = ['Date', 'Date Functional', 'Functional Date'];
      let dateColumn = null;
      for (const col of dateColumns) {
        if (this.currentAnalysis.columns.includes(col)) {
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
          console.log(`📅 Date range in full dataset: ${dates[0]} to ${dates[dates.length - 1]}`);
          console.log(`📅 Total unique dates: ${new Set(dates).size}`);
        }
      }
    }
    
    return true;
  }

  /**
   * Debug method to test data completeness - shows records around specific indices
   */
  static debugDataCompleteness(testIndices: number[] = []) {
    if (!this.currentAnalysis || !this.currentAnalysis.fullData) {
      console.log('❌ No dataset available for debugging');
      return;
    }
    
    const fullData = this.currentAnalysis.fullData;
    console.log(`🔍 DEBUG: Dataset completeness check for ${fullData.length} records`);
    
    // Default test indices if none provided
    if (testIndices.length === 0) {
      testIndices = [
        0, 1, 2, // First few
        Math.floor(fullData.length * 0.25), // Quarter way
        Math.floor(fullData.length * 0.5), // Halfway
        Math.floor(fullData.length * 0.75), // Three quarters
        fullData.length - 3, fullData.length - 2, fullData.length - 1 // Last few
      ];
    }
    
    testIndices.forEach(index => {
      if (index >= 0 && index < fullData.length) {
        const record = fullData[index];
        const mmt = record['MMT No'] || record['Sr. No'] || 'N/A';
        const date = record['Date'] || record['Date Functional'] || 'N/A';
        const location = record['Location'] || record['Functional Location'] || 'N/A';
        console.log(`📋 Record ${index + 1}: MMT=${mmt}, Date=${date}, Location=${location.substring(0, 50)}...`);
      } else {
        console.log(`⚠️ Index ${index} is out of range`);
      }
    });
  }

  /**
   * Clear current search index
   */
  static clearIndex() {
    this.searchIndex = null;
    this.currentAnalysis = null;
    console.log('🔄 Search index cleared');
  }
}
