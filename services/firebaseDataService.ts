import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  deleteDoc,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as XLSX from 'xlsx';
import { GeminiService } from './geminiService';

export interface FirebaseDataRow {
  [key: string]: any;
  firebaseId?: string;
  uploadTimestamp?: Timestamp;
  fileName?: string;
}

export interface QueryIntent {
  type: 'count' | 'sum' | 'average' | 'filter' | 'list' | 'max' | 'min' | 'trend' | 'location' | 'date' | 'action' | 'mmt';
  field?: string;
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in' | 'location_contains';
    value: any;
  }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  count?: number;
  sum?: number;
  average?: number;
  max?: number;
  min?: number;
  error?: string;
  intent?: QueryIntent;
  naturalResponse?: string;
}

export class FirebaseDataService {
  private static currentCollection: string | null = null;
  private static currentFileName: string | null = null;
  private static columnMapping: { [key: string]: string } = {};

  /**
   * Upload Excel file to Firebase and store all data
   */
  static async uploadExcelToFirebase(fileUrl: string, fileName: string): Promise<{ success: boolean; message: string; collectionName?: string }> {
    try {
      console.log('📤 Starting Firebase upload for:', fileName);
      
      // Download the Excel file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }
      
      // Use first sheet for now (can be extended for multiple sheets)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least headers and one data row');
      }
      
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      
      console.log(`📊 Processing ${dataRows.length} rows with ${headers.length} columns`);
      
      // Create collection name from fileName (sanitized)
      const collectionName = this.sanitizeCollectionName(fileName);
      
      // Clear existing data in collection
      await this.clearCollection(collectionName);
      
      // Process and upload data in batches
      const batchSize = 500; // Firestore batch limit
      let uploadedCount = 0;
      
      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchData = dataRows.slice(i, i + batchSize);
        
        batchData.forEach((row: any, rowIndex: number) => {
          const docId = `${collectionName}_${i + rowIndex + 1}`;
          const docRef = doc(db, collectionName, docId);
          
          // Convert row to object with headers as keys
          const rowData: FirebaseDataRow = {
            firebaseId: docId,
            fileName: fileName,
            uploadTimestamp: Timestamp.now()
          };
          
          headers.forEach((header, colIndex) => {
            if (header && header.trim()) {
              const value = row[colIndex];
              // Clean and process the value
              rowData[header.trim()] = this.cleanValue(value);
            }
          });
          
          batch.set(docRef, rowData);
        });
        
        await batch.commit();
        uploadedCount += batchData.length;
        console.log(`✅ Uploaded batch: ${uploadedCount}/${dataRows.length} rows`);
      }
      
      // Store current context
      this.currentCollection = collectionName;
      this.currentFileName = fileName;
      this.buildColumnMapping(headers);
      
      console.log(`🎉 Successfully uploaded ${uploadedCount} rows to Firebase collection: ${collectionName}`);
      
      return {
        success: true,
        message: `Successfully uploaded ${uploadedCount} rows from ${fileName}`,
        collectionName: collectionName
      };
      
    } catch (error: any) {
      console.error('❌ Firebase upload error:', error);
      return {
        success: false,
        message: `Upload failed: ${error.message}`
      };
    }
  }

  /**
   * Process natural language query and execute Firebase query
   */
  static async processNaturalLanguageQuery(userQuery: string): Promise<QueryResult> {
    try {
      console.log('🔍 Processing natural language query:', userQuery);
      console.log('📂 Current collection:', this.currentCollection);
      console.log('📁 Current filename:', this.currentFileName);
      
      // Check if we have a valid collection
      if (!this.currentCollection || !this.currentFileName) {
        console.log("❌ No Firebase collection loaded! Attempting to load most recent...");
        
        // Try to find and load the most recent collection
        const collections = await this.getAvailableCollections();
        if (collections.length > 0) {
          // Use the first collection (most recent)
          const mostRecentCollection = collections[0];
          this.currentCollection = mostRecentCollection;
          this.currentFileName = mostRecentCollection.replace(/_xlsx$/, '.xlsx');
          
          // Initialize column mapping by reading a sample document
          await this.initializeColumnMapping();
          
          console.log(`✅ Auto-loaded collection: ${this.currentCollection}`);
          console.log(`✅ Auto-loaded filename: ${this.currentFileName}`);
          console.log('🔑 Initialized column mapping:', this.columnMapping);
        } else {
          return {
            success: false,
            error: "No Excel data has been uploaded to Firebase. Please upload an Excel file first in the Database screen.",
            data: []
          }
        }
      }
      
      if (!this.currentCollection) {
        return {
          success: false,
          error: 'No data loaded. Please upload an Excel file first.'
        };
      }
      
      // Use Gemini AI for natural language processing
      console.log('🤖 Using Gemini AI for natural language processing...');
      console.log('📊 Current collection:', this.currentCollection);
      
      // Fetch all data from Firebase
      console.log('📊 Fetching all data from Firebase for Gemini...');
      const firestoreQuery = query(collection(db, this.currentCollection));
      const querySnapshot = await getDocs(firestoreQuery);
      const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      console.log(`📋 Found ${allData.length} records for Gemini analysis`);
      
      // Convert data to context string for Gemini
      const contextString = this.createGeminiContext(allData);
      
            // Create a custom prompt with the Firebase data
      const customPrompt = `${contextString}
      
      User question: ${userQuery}
      
      INSTRUCTIONS:
      
      IF USER ASKS FOR SPECIFIC INFORMATION (exact matches):
      - Search for EXACT matches only
      - If user asks for "2025-06-24", ONLY return records with date "2025-06-24"
      - If user asks for "DHH-DOC-11TH-01172", ONLY return records with functional location "DHH-DOC-11TH-01172"
      - If NO EXACT match is found, respond: "I don't have information about that in my database."
      
      IF USER ASKS FOR ANALYTICAL INSIGHTS (patterns, trends, variety):
      - Analyze ALL data in the database
      - Count, group, and find patterns
      - Look for keywords like "variety", "most", "least", "trends", "patterns", "which", "how many"
      - Provide detailed analysis with specific numbers and insights
      - Group by functional locations, actions, dates, etc. as needed
      
      Provide a clear, conversational answer based on the type of query.`;
      
      // Use Gemini to answer the question
      console.log('🤖 Sending query to Gemini AI...');
      const geminiResponse = await GeminiService.sendMessage(customPrompt, false); // Don't include data context since we're providing it in the prompt
      
      if (!geminiResponse.success) {
        throw new Error(geminiResponse.error || 'Gemini AI failed to respond');
      }
      
      console.log('✅ Gemini response received:', geminiResponse.message?.substring(0, 100) + '...');
      
      // Create result object
      const result = {
        success: true,
        data: [], // We don't need to return the actual data for Gemini approach
        count: 0,
        sum: 0,
        average: 0,
        max: 0,
        min: 0,
        intent: { type: 'list' as const },
        error: undefined,
        naturalResponse: geminiResponse.message || 'No response from Gemini'
      };
      
      return {
        success: result.success,
        data: result.data,
        count: result.count,
        sum: result.sum,
        average: result.average,
        max: result.max,
        min: result.min,
        intent: result.intent,
        error: result.error,
        naturalResponse: result.naturalResponse
      };
      
    } catch (error: any) {
      console.error('❌ Query processing error:', error);
      return {
        success: false,
        error: `Query failed: ${error.message}`
      };
    }
  }

  /**
   * Parse natural language to determine query intent
   */
  private static parseQueryIntent(userQuery: string): QueryIntent {
    const query = userQuery.toLowerCase();
    
    // Detect intent type with better natural language understanding
    let intent: QueryIntent = { type: 'list' };
    
    // MMT number queries - "Give me MMT number of X" or "Show me MMT number"
    if (query.includes('mmt number') || query.includes('mmt no') || query.includes('give me mmt') || 
        query.includes('show me mmt') || query.includes('what is mmt') || query.includes('mmt of')) {
      intent.type = 'mmt';
    }
    // Location queries - "Where is X located?" or "What is the last action at X?"
    else if (query.startsWith('where') || query.includes('where is') || query.includes('where are') || 
        query.includes('location of') || query.includes('located at') ||
        query.includes('at ') && (query.includes('street') || query.includes('circle') || query.includes('lane') || query.includes('avenue'))) {
      intent.type = 'location';
    }
    // Date/Time queries - "When was X reported?" or "What were all issues on X?"
    else if (query.startsWith('when') || query.includes('when was') || query.includes('when were') || 
             query.includes('date of') || query.includes('reported on') ||
             query.includes('on ') && (query.includes('june') || query.includes('july') || query.includes('2025') || query.includes('24') || query.includes('2nd'))) {
      intent.type = 'date';
    }
    // Action/Issue queries - "What issue was X?" or "Find all records where description says X"
    else if (query.startsWith('what issue') || query.startsWith('what problem') || 
             query.includes('what action') || query.includes('what was the issue') ||
             query.includes('what problem occurred') || query.includes('what action was taken') ||
             query.includes('find all records') || query.includes('description says') ||
             query.includes('maintenance activities') || query.includes('service requests') ||
             query.includes('work done') || query.includes('instances of')) {
      intent.type = 'action';
    }
    // Count queries
    else if (query.includes('count') || query.includes('how many') || query.includes('total number') || 
        query.includes('how many issues') || query.includes('how many problems')) {
      intent.type = 'count';
    } 
    // Sum queries
    else if (query.includes('sum') || query.includes('total') || query.includes('add up')) {
      intent.type = 'sum';
    } 
    // Average queries
    else if (query.includes('average') || query.includes('mean') || query.includes('avg')) {
      intent.type = 'average';
    } 
    // Max queries
    else if (query.includes('maximum') || query.includes('max') || query.includes('highest')) {
      intent.type = 'max';
    } 
    // Min queries
    else if (query.includes('minimum') || query.includes('min') || query.includes('lowest')) {
      intent.type = 'min';
    } 
    // Trend queries
    else if (query.includes('trend') || query.includes('over time') || query.includes('chart')) {
      intent.type = 'trend';
    }
    // Generic information queries
    else if (query.includes('what') || query.includes('which') || 
             query.includes('show me') || query.includes('tell me')) {
      intent.type = 'list'; // Will be handled by intelligent response formatting
    }
    
    // Detect filters
    intent.filters = this.extractFilters(userQuery);
    
    // Detect sorting
    if (query.includes('latest') || query.includes('recent') || query.includes('last')) {
      intent.sortBy = 'uploadTimestamp';
      intent.sortOrder = 'desc';
    } else if (query.includes('oldest') || query.includes('first')) {
      intent.sortBy = 'uploadTimestamp';
      intent.sortOrder = 'asc';
    }
    
    // Detect limit for "last N" queries
    const lastMatch = query.match(/last\s+(\d+)/);
    if (lastMatch) {
      intent.limit = parseInt(lastMatch[1]);
      intent.sortBy = 'uploadTimestamp';
      intent.sortOrder = 'desc';
    }
    
    return intent;
  }

  /**
   * Extract filters from natural language query
   */
  private static extractFilters(userQuery: string): Array<{ field: string; operator: any; value: any }> {
    const filters: Array<{ field: string; operator: any; value: any }> = [];
    const query = userQuery.toLowerCase();
    
         // Map common terms to field names
     const fieldMappings = {
       'date': ['Date', 'date', 'DATE'],
       'location': ['Location', 'location', 'LOCATION'],
       'functional_location': ['Functional Location', 'functional location', 'FUNCTIONAL LOCATION'],
       'action': ['Action', 'action', 'ACTION'],
       'description': ['Description', 'description', 'DESCRIPTION'],
       'mmt': ['MMT No', 'MMT', 'mmt'],
       'sr': ['Sr. No', 'Sr', 'sr']
     };
    
         // Extract date filters - support multiple formats
     const datePatterns = [
       /(\d{4}-\d{2}-\d{2})/, // 2025-07-02
       /(\d{1,2}\/\d{1,2}\/\d{4})/, // 07/02/2025
       /(\d{1,2}-\d{1,2}-\d{4})/, // 07-02-2025
     ];
     
     for (const pattern of datePatterns) {
       const dateMatch = query.match(pattern);
       if (dateMatch) {
         const dateField = this.findMatchingField(fieldMappings.date);
         if (dateField) {
           console.log(`📅 Extracted date: "${dateMatch[1]}"`);
           filters.push({
             field: dateField,
             operator: '==',
             value: dateMatch[1]
           });
           break; // Use first match
         }
       }
          }
     
     // Extract functional location filters (e.g., DHH-DSC-LVCR-00408)
     const functionalLocationMatch = query.match(/([A-Z]+-[A-Z]+-[A-Z]+-\d+)/);
     if (functionalLocationMatch) {
       const functionalLocationField = this.findMatchingField(fieldMappings.functional_location);
       if (functionalLocationField) {
         const functionalLocationValue = functionalLocationMatch[1];
         console.log(`🏢 Extracted functional location: "${functionalLocationValue}"`);
         
         filters.push({
           field: functionalLocationField,
           operator: '==',
           value: functionalLocationValue
         });
       }
     }
     
     // Extract location filters - improved to handle various formats
     const locationPatterns = [
       /(\d+\s+[A-Z\s]+(?:STREET|AVENUE|ROAD|CIRCLE))/i,  // "1172 ELEVENTH STREET"
       /([A-Z\s]+(?:STREET|AVENUE|ROAD|CIRCLE))/i,        // "TENTH STREET", "ELEVENTH STREET"
       /(\d+\s+[A-Z]+)/i,                                 // "1172 ELEVENTH"
       /([A-Z]+(?:\s+STREET|\s+AVENUE|\s+ROAD|\s+CIRCLE))/i  // "TENTH STREET", "ELEVENTH AVENUE"
     ];
    
    for (const pattern of locationPatterns) {
      const locationMatch = query.match(pattern);
      if (locationMatch) {
        const locationField = this.findMatchingField(fieldMappings.location);
        if (locationField) {
          const locationValue = locationMatch[1].trim().toUpperCase();
          console.log(`📍 Extracted location: "${locationValue}"`);
          
          // For location queries, we'll need to search more flexibly
          // Since Firestore doesn't support partial string matching directly,
          // we'll store this as a special case and handle it in the query execution
          filters.push({
            field: locationField,
            operator: 'location_contains', // Custom operator for partial matching
            value: locationValue
          });
          break; // Use the first match found
        }
      }
    }
    
         // Extract MMT number filters - support both 10 and 11 digit numbers
     const mmtMatch = query.match(/(\d{10,12})/); // Match 10-12 digit numbers (MMT format)
     if (mmtMatch) {
       const mmtField = this.findMatchingField(fieldMappings.mmt);
       if (mmtField) {
         const mmtValue = mmtMatch[1];
         console.log(`🔢 Extracted MMT number: "${mmtValue}" (${mmtValue.length} digits)`);
         console.log(`🔍 Original query: "${query}"`);
         console.log(`🔍 Full MMT pattern match: "${mmtMatch[0]}"`);
         
         // Check if there are more digits after our match
         const afterMatch = query.substring(mmtMatch.index! + mmtValue.length);
         if (afterMatch.match(/^\d/)) {
           console.log(`⚠️ WARNING: More digits found after MMT number: "${afterMatch}"`);
           console.log(`⚠️ This suggests the MMT number might be longer than expected`);
         }
         
         // Try exact match first
         filters.push({
           field: mmtField,
           operator: '==',
           value: mmtValue
         });
         
         // Also try partial match for longer numbers
         if (mmtValue.length === 10) {
           console.log(`🔍 Also trying partial match for 10-digit number...`);
           // This will be handled in the query execution
         }
       }
     }
    
    // Extract keyword filters for location, action, and description searches
    const searchTerms = this.extractSearchTerms(query);
    if (searchTerms.length > 0) {
      console.log(`🔍 Extracted search terms: "${searchTerms.join(' ')}"`);
      
      // For MMT queries, search in Location field for location names
      if (query.includes('mmt number') || query.includes('mmt no') || query.includes('give me mmt') || 
          query.includes('show me mmt') || query.includes('what is mmt') || query.includes('mmt of')) {
        const locationField = this.findMatchingField(fieldMappings.location);
        const functionalLocationField = this.findMatchingField(fieldMappings.functional_location);
        
        if (locationField || functionalLocationField) {
          searchTerms.forEach(term => {
            if (term.length > 2) { // Only add meaningful terms
              // Search in both Location and Functional Location fields
              if (locationField) {
                filters.push({
                  field: locationField,
                  operator: 'location_contains', // Custom operator for partial matching
                  value: term.toUpperCase()
                });
              }
              if (functionalLocationField) {
                filters.push({
                  field: functionalLocationField,
                  operator: 'location_contains', // Custom operator for partial matching
                  value: term.toUpperCase()
                });
              }
            }
          });
        }
      }
      
      // For location queries, search in Location field
      else if (query.startsWith('where') || query.includes('where is') || query.includes('location of') ||
          query.includes('at ') && (query.includes('street') || query.includes('circle') || query.includes('lane'))) {
        const locationField = this.findMatchingField(fieldMappings.location);
        if (locationField) {
          searchTerms.forEach(term => {
            if (term.length > 2) { // Only add meaningful terms
              filters.push({
                field: locationField,
                operator: 'location_contains', // Custom operator for partial matching
                value: term.toUpperCase()
              });
            }
          });
        }
      }
      
      // For date queries, search in Date field
      if (query.startsWith('when') || query.includes('when was') || query.includes('reported on') ||
          query.includes('on ') && (query.includes('june') || query.includes('july') || query.includes('2025'))) {
        const dateField = this.findMatchingField(fieldMappings.date);
        if (dateField) {
          searchTerms.forEach(term => {
            if (term.length > 2 && (term.includes('june') || term.includes('july') || term.includes('2025') || term.includes('24') || term.includes('2'))) {
              filters.push({
                field: dateField,
                operator: 'location_contains', // Custom operator for partial matching
                value: term.toUpperCase()
              });
            }
          });
        }
      }
      
      // For action queries, search in Action and Description fields
      if (query.startsWith('what issue') || query.startsWith('what problem') || query.includes('what action') ||
          query.includes('find all records') || query.includes('description says') || query.includes('maintenance activities') ||
          query.includes('location of') && (query.includes('replace') || query.includes('belt') || query.includes('clean') || query.includes('repair'))) {
        const actionField = this.findMatchingField(fieldMappings.action);
        const descriptionField = this.findMatchingField(fieldMappings.description);
        
        searchTerms.forEach(term => {
          if (term.length > 2) { // Only add meaningful terms
            if (actionField) {
              filters.push({
                field: actionField,
                operator: 'location_contains', // Custom operator for partial matching
                value: term.toUpperCase()
              });
            }
            if (descriptionField) {
              filters.push({
                field: descriptionField,
                operator: 'location_contains', // Custom operator for partial matching
                value: term.toUpperCase()
              });
            }
          }
        });
      }
    }
    
    // Extract action filters
    const actionMatch = query.match(/(repair|maintenance|inspection|event|standby)/i);
    if (actionMatch) {
      const actionField = this.findMatchingField(fieldMappings.action);
      if (actionField) {
        filters.push({
          field: actionField,
          operator: 'array-contains',
          value: actionMatch[1].toUpperCase()
        });
      }
    }
    
    return filters;
  }

  /**
   * Execute Firebase query based on intent
   */
  private static async executeFirebaseQuery(intent: QueryIntent): Promise<QueryResult> {
    try {
      if (!this.currentCollection) {
        throw new Error('No collection selected');
      }
      
      // Build Firestore query
      let firestoreQuery = query(collection(db, this.currentCollection));
      
      // Apply filters and execute query
      let documents: any[] = [];
      
             if (intent.filters && intent.filters.length > 0) {
         // Handle custom operators first
         const customFilters = intent.filters.filter(filter => filter.operator === 'location_contains');
         const standardFilters = intent.filters.filter(filter => filter.operator !== 'location_contains');
         // MMT filters should be part of standard filters, not separate
         console.log(`🔍 Total filters: ${intent.filters.length}`);
         console.log(`🔍 Standard filters: ${standardFilters.length}`);
         console.log(`🔍 Custom filters: ${customFilters.length}`);
        
                        // Apply standard filters (including MMT number filters)
       standardFilters.forEach(filter => {
         if (filter.operator !== 'location_contains') {
           console.log(`🔍 Applying standard filter: ${filter.field} ${filter.operator} "${filter.value}"`);
           firestoreQuery = query(firestoreQuery, where(filter.field, filter.operator as any, filter.value));
         }
       });
       

        
        // Execute query first
        const querySnapshot = await getDocs(firestoreQuery);
        documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
                           // Apply custom filters in memory
         customFilters.forEach(filter => {
           documents = documents.filter(doc => {
             const fieldValue = doc[filter.field];
             if (typeof fieldValue === 'string') {
               return fieldValue.toUpperCase().includes(filter.value.toUpperCase());
             }
             return false;
           });
         });
         

          
          // Debug: Log what we're searching for
          if (intent.filters && intent.filters.length > 0) {
            console.log('🔍 **DEBUG: Applied Filters**');
            intent.filters.forEach(filter => {
              console.log(`  - Field: ${filter.field}, Operator: ${filter.operator}, Value: "${filter.value}"`);
            });
            console.log(`📊 Documents after filtering: ${documents.length}`);
            
            // Show first few documents for debugging
            if (documents.length > 0) {
              console.log('📋 **Sample Documents Found:**');
              documents.slice(0, 3).forEach((doc, index) => {
                console.log(`  ${index + 1}. MMT: ${doc['MMT No'] || 'N/A'}, Location: ${doc['Location'] || 'N/A'}`);
              });
            }
          }
        
        console.log(`📊 Query returned ${documents.length} documents after custom filtering`);
      } else {
        // Execute query without filters
        const querySnapshot = await getDocs(firestoreQuery);
        documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        console.log(`📊 Query returned ${documents.length} documents`);
      }
      
      // Apply sorting and limiting in memory since we already have the documents
      if (intent.sortBy && documents.length > 0) {
        documents.sort((a, b) => {
          const aVal = a[intent.sortBy!];
          const bVal = b[intent.sortBy!];
          
          if (intent.sortOrder === 'desc') {
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
          } else {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          }
        });
      }
      
      // Apply limit
      if (intent.limit && intent.limit > 0) {
        documents = documents.slice(0, intent.limit);
      }
      
      // Process results based on intent type
      switch (intent.type) {
        case 'count':
          return {
            success: true,
            count: documents.length,
            intent: intent
          };
          
        case 'sum':
          const sumField = this.detectNumericField(documents);
          if (!sumField) {
            return {
              success: false,
              error: 'No numeric field found for sum calculation'
            };
          }
          const sum = documents.reduce((acc, doc) => acc + (parseFloat(doc[sumField]) || 0), 0);
          return {
            success: true,
            sum: sum,
            intent: intent
          };
          
        case 'average':
          const avgField = this.detectNumericField(documents);
          if (!avgField) {
            return {
              success: false,
              error: 'No numeric field found for average calculation'
            };
          }
          const values = documents.map(doc => parseFloat(doc[avgField]) || 0).filter(v => v > 0);
          const average = values.length > 0 ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;
          return {
            success: true,
            average: average,
            intent: intent
          };
          
        case 'max':
          const maxField = this.detectNumericField(documents);
          if (!maxField) {
            return {
              success: false,
              error: 'No numeric field found for maximum calculation'
            };
          }
          const max = Math.max(...documents.map(doc => parseFloat(doc[maxField]) || 0));
          return {
            success: true,
            max: max,
            intent: intent
          };
          
        case 'min':
          const minField = this.detectNumericField(documents);
          if (!minField) {
            return {
              success: false,
              error: 'No numeric field found for minimum calculation'
            };
          }
          const min = Math.min(...documents.map(doc => parseFloat(doc[minField]) || 0).filter(v => v > 0));
          return {
            success: true,
            min: min,
            intent: intent
          };
          
        case 'trend':
          return {
            success: true,
            data: documents,
            intent: intent
          };
          
        default: // 'list' or 'filter'
          return {
            success: true,
            data: documents,
            intent: intent
          };
      }
      
    } catch (error: any) {
      console.error('❌ Firebase query error:', error);
      return {
        success: false,
        error: `Query execution failed: ${error.message}`
      };
    }
  }

    /**
   * Generate a natural, conversational response
   */
  private static generateNaturalResponse(userQuery: string, data: any[], intent?: QueryIntent): string {
    const query = userQuery.toLowerCase();
    const count = data.length;
    
    // Extract query elements
    const dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
    const functionalLocationMatch = query.match(/([A-Z]+-[A-Z]+-[A-Z]+-\d+)/);
    const mmtMatch = query.match(/(\d{10,12})/);
    const locationMatch = query.match(/(\d+\s+[A-Z\s]+(?:street|avenue|road|circle))/i);
    
    // Handle specific intent types
    if (intent?.type === 'mmt') {
      return this.formatMmtResponse(userQuery, data);
    }
    
    if (intent?.type === 'location') {
      return this.formatLocationResponse(userQuery, data);
    }
    
    if (intent?.type === 'date') {
      return this.formatDateResponse(userQuery, data);
    }
    
    if (intent?.type === 'action') {
      return this.formatActionResponse(userQuery, data);
    }
    
    // Single record responses
    if (count === 1) {
      const record = data[0];
      
      // For specific date + functional location queries
      if (dateMatch && functionalLocationMatch) {
        return `On ${record['Date']}, there was an issue logged at ${record['Functional Location']}. The issue was "${record['Description']}" with MMT number ${record['MMT No']}, requiring action: ${record['Action']}.`;
      }
      
      // For MMT location queries
      if (mmtMatch && (query.includes('location') || query.includes('where'))) {
        return `MMT number ${record['MMT No']} is located at ${record['Location']}.`;
      }
      
      // For location-based issue queries
      if (query.includes('issue') || query.includes('problem') || query.includes('what')) {
        const location = record['Location'] || record['Functional Location'];
        return `There was 1 issue reported at ${location}. It was a "${record['Action']}" with the description: "${record['Description']}" (MMT: ${record['MMT No']}).`;
      }
      
      // Generic single record
      return `I found 1 record. It's for MMT ${record['MMT No']} at ${record['Location']}, involving "${record['Action']}" with the description: "${record['Description']}".`;
    }
    
    // Multiple records responses
    if (count > 1) {
      const actions = [...new Set(data.map(r => r['Action']).filter(Boolean))];
      const locations = [...new Set(data.map(r => r['Location']).filter(Boolean))];
      
      // SPECIAL CASE: MMT location queries should return specific location, not summary
      if (mmtMatch && (query.includes('location') || query.includes('where') || query.includes('located'))) {
        const mmtNumber = mmtMatch[1];
        const mmtRecord = data.find(record => record['MMT No'] && record['MMT No'].toString() === mmtNumber);
        if (mmtRecord) {
          return `MMT number ${mmtRecord['MMT No']} is located at ${mmtRecord['Location']}.`;
        } else {
          return `I couldn't find the specific location for MMT number ${mmtNumber}.`;
        }
      }
      
      // For location-specific queries
      if (locationMatch || query.includes('at ') || query.includes('street')) {
        const mainLocation = data[0]['Location'];
        const actionSummary = actions.slice(0, 3).join(', ');
        
        if (count <= 5) {
          return `There were ${count} issues reported at ${mainLocation}. They included: ${actionSummary}${actions.length > 3 ? ', and others' : ''}.`;
        } else {
          return `There were ${count} issues reported at ${mainLocation}. The main types of issues were: ${actionSummary}${actions.length > 3 ? ', among others' : ''}.`;
        }
      }
      
      // For date-specific queries
      if (dateMatch) {
        const date = data[0]['Date'];
        return `On ${date}, there were ${count} issues reported across ${locations.length} different locations. The main actions required were: ${actions.slice(0, 3).join(', ')}.`;
      }
      
      // For functional location queries
      if (functionalLocationMatch) {
        const funcLocation = data[0]['Functional Location'];
        return `At ${funcLocation}, there were ${count} issues reported. The main actions required were: ${actions.slice(0, 3).join(', ')}.`;
      }
      
      // Generic multiple records
      return `I found ${count} records across ${locations.length} locations. The main actions required were: ${actions.slice(0, 3).join(', ')}.`;
    }
    
    return `I couldn't find any records matching your query.`;
  }

  /**
   * Format MMT number responses
   */
  private static formatMmtResponse(userQuery: string, data: any[]): string {
    const query = userQuery.toLowerCase();
    const count = data.length;
    
    // Extract the search term from the query (e.g., "6000 Rock court")
    const searchTerms = this.extractSearchTerms(query);
    
    if (count === 0) {
      return `I couldn't find any MMT numbers for "${searchTerms.join(' ')}".`;
    }
    
    // For MMT queries, we want to show the specific MMT number and its details
    if (count === 1) {
      const record = data[0];
      const mmtNumber = record['MMT No'];
      const location = record['Location'] || record['Functional Location'];
      const action = record['Action'];
      const description = record['Description'];
      
      return `MMT number ${mmtNumber} is located at ${location}. The action required is "${action}" with description: "${description}".`;
    }
    
    // If multiple records found, try to find the most specific match
    const searchLocation = searchTerms.join(' ').toUpperCase();
    const specificMatches = data.filter(record => {
      const recordLocation = (record['Location'] || record['Functional Location'] || '').toUpperCase();
      return recordLocation.includes(searchLocation) || searchLocation.includes(recordLocation);
    });
    
    if (specificMatches.length === 1) {
      const record = specificMatches[0];
      const mmtNumber = record['MMT No'];
      const location = record['Location'] || record['Functional Location'];
      const action = record['Action'];
      const description = record['Description'];
      
      return `MMT number ${mmtNumber} is located at ${location}. The action required is "${action}" with description: "${description}".`;
    }
    
    if (specificMatches.length > 1 && specificMatches.length <= 5) {
      const mmtNumbers = specificMatches.map(r => r['MMT No']).filter(Boolean);
      const locations = [...new Set(specificMatches.map(r => r['Location'] || r['Functional Location']).filter(Boolean))];
      
      return `Found ${specificMatches.length} MMT numbers for "${searchTerms.join(' ')}": ${mmtNumbers.join(', ')} at ${locations.join(', ')}.`;
    }
    
    // If still too many, show the most relevant ones
    const mmtNumbers = [...new Set(data.map(r => r['MMT No']).filter(Boolean))];
    const locations = [...new Set(data.map(r => r['Location'] || r['Functional Location']).filter(Boolean))];
    
    if (mmtNumbers.length === 1) {
      const mmtNumber = mmtNumbers[0];
      const location = locations[0];
      return `MMT number ${mmtNumber} is located at ${location}.`;
    }
    
    if (mmtNumbers.length <= 3) {
      const mmtList = mmtNumbers.join(', ');
      return `Found ${mmtNumbers.length} MMT number${mmtNumbers.length > 1 ? 's' : ''}: ${mmtList}.`;
    }
    
    return `Found ${mmtNumbers.length} MMT numbers. The main ones are: ${mmtNumbers.slice(0, 3).join(', ')} and ${mmtNumbers.length - 3} more.`;
  }

  /**
   * Format location-based responses
   */
  private static formatLocationResponse(userQuery: string, data: any[]): string {
    const query = userQuery.toLowerCase();
    const count = data.length;
    
    // Extract the search term from the query (e.g., "clean air filter")
    const searchTerms = this.extractSearchTerms(query);
    
    if (count === 0) {
      return `I couldn't find any locations for "${searchTerms.join(' ')}".`;
    }
    
    // Get unique locations
    const uniqueLocations = [...new Set(data.map(r => r['Location']).filter(Boolean))];
    
    // Handle specific location queries (e.g., "What is the last action at 387 LEMON CIRCLE?")
    if (query.includes('at ') && (query.includes('street') || query.includes('circle') || query.includes('lane'))) {
      const locationMatch = query.match(/(\d+\s+[A-Z\s]+(?:STREET|AVENUE|ROAD|CIRCLE|LANE|HOUSE))/i);
      if (locationMatch) {
        const specificLocation = locationMatch[1].toUpperCase();
        const locationData = data.filter(r => r['Location'] && r['Location'].toUpperCase().includes(specificLocation));
        
        if (locationData.length === 0) {
          return `I couldn't find any records for ${specificLocation}.`;
        }
        
        if (locationData.length === 1) {
          const record = locationData[0];
          return `At ${record['Location']}, the last action was "${record['Action']}" with description: "${record['Description']}" (MMT: ${record['MMT No']}).`;
        }
        
        const actions = [...new Set(locationData.map(r => r['Action']).filter(Boolean))];
        return `At ${specificLocation}, there were ${locationData.length} maintenance activities. The actions included: ${actions.slice(0, 3).join(', ')}${actions.length > 3 ? ' and others' : ''}.`;
      }
    }
    
    // Handle action-based location queries (e.g., "Give me the location of replace belt")
    if (query.includes('location of') && (query.includes('replace') || query.includes('belt') || query.includes('clean') || query.includes('repair'))) {
      const searchAction = searchTerms.join(' ').toUpperCase();
      
      // Filter data to find records that match the action/description
      const matchingRecords = data.filter(record => {
        const action = (record['Action'] || '').toUpperCase();
        const description = (record['Description'] || '').toUpperCase();
        return action.includes(searchAction) || description.includes(searchAction);
      });
      
      if (matchingRecords.length === 0) {
        return `I couldn't find any locations for "${searchTerms.join(' ')}".`;
      }
      
      if (matchingRecords.length === 1) {
        const record = matchingRecords[0];
        return `The "${searchTerms.join(' ')}" action is located at ${record['Location'] || record['Functional Location']} (MMT: ${record['MMT No']}).`;
      }
      
      // Get unique locations for the specific action
      const uniqueLocations = [...new Set(matchingRecords.map(r => r['Location'] || r['Functional Location']).filter(Boolean))];
      
      if (uniqueLocations.length === 1) {
        return `The "${searchTerms.join(' ')}" action is located at ${uniqueLocations[0]}.`;
      }
      
      if (uniqueLocations.length <= 5) {
        const locationList = uniqueLocations.join(', ');
        return `The "${searchTerms.join(' ')}" action was reported at ${uniqueLocations.length} location${uniqueLocations.length > 1 ? 's' : ''}: ${locationList}.`;
      }
      
      return `The "${searchTerms.join(' ')}" action was reported at ${uniqueLocations.length} different locations. The main locations are: ${uniqueLocations.slice(0, 3).join(', ')} and ${uniqueLocations.length - 3} more.`;
    }
    
    if (count === 1) {
      const location = data[0]['Location'];
      return `The ${searchTerms.join(' ')} is located at ${location}.`;
    }
    
    if (uniqueLocations.length === 1) {
      return `The ${searchTerms.join(' ')} is located at ${uniqueLocations[0]}.`;
    }
    
    if (uniqueLocations.length <= 3) {
      const locationList = uniqueLocations.join(', ');
      return `The ${searchTerms.join(' ')} was reported at ${uniqueLocations.length} location${uniqueLocations.length > 1 ? 's' : ''}: ${locationList}.`;
    }
    
    return `The ${searchTerms.join(' ')} was reported at ${uniqueLocations.length} different locations. The main locations are: ${uniqueLocations.slice(0, 3).join(', ')} and ${uniqueLocations.length - 3} more.`;
  }

  /**
   * Format date-based responses
   */
  private static formatDateResponse(userQuery: string, data: any[]): string {
    const query = userQuery.toLowerCase();
    const count = data.length;
    
    // Extract the search term from the query
    const searchTerms = this.extractSearchTerms(query);
    
    if (count === 0) {
      return `I couldn't find any dates for "${searchTerms.join(' ')}".`;
    }
    
    // Get unique dates
    const uniqueDates = [...new Set(data.map(r => r['Date']).filter(Boolean))];
    
    if (count === 1) {
      const date = data[0]['Date'];
      return `The ${searchTerms.join(' ')} was reported on ${date}.`;
    }
    
    if (uniqueDates.length === 1) {
      return `The ${searchTerms.join(' ')} was reported on ${uniqueDates[0]}.`;
    }
    
    if (uniqueDates.length <= 3) {
      const dateList = uniqueDates.join(', ');
      return `The ${searchTerms.join(' ')} was reported on ${uniqueDates.length} date${uniqueDates.length > 1 ? 's' : ''}: ${dateList}.`;
    }
    
    return `The ${searchTerms.join(' ')} was reported on ${uniqueDates.length} different dates. The main dates are: ${uniqueDates.slice(0, 3).join(', ')} and ${uniqueDates.length - 3} more.`;
  }

  /**
   * Format action-based responses
   */
  private static formatActionResponse(userQuery: string, data: any[]): string {
    const query = userQuery.toLowerCase();
    const count = data.length;
    
    // Extract the search term from the query
    const searchTerms = this.extractSearchTerms(query);
    
    if (count === 0) {
      return `I couldn't find any issues or actions for "${searchTerms.join(' ')}".`;
    }
    
    // Handle specific action queries
    if (query.includes('find all records') || query.includes('description says')) {
      const actions = [...new Set(data.map(r => r['Action']).filter(Boolean))];
      const locations = [...new Set(data.map(r => r['Location']).filter(Boolean))];
      
      if (count === 1) {
        const record = data[0];
        return `Found 1 record where the description mentions "${searchTerms.join(' ')}": "${record['Action']}" at ${record['Location']} (MMT: ${record['MMT No']}).`;
      }
      
      return `Found ${count} records where the description mentions "${searchTerms.join(' ')}". The actions included: ${actions.slice(0, 3).join(', ')}${actions.length > 3 ? ' and others' : ''} across ${locations.length} locations.`;
    }
    
    if (query.includes('maintenance activities') || query.includes('service requests')) {
      const actions = [...new Set(data.map(r => r['Action']).filter(Boolean))];
      const locations = [...new Set(data.map(r => r['Location']).filter(Boolean))];
      
      return `Found ${count} maintenance activities. The actions included: ${actions.slice(0, 3).join(', ')}${actions.length > 3 ? ' and others' : ''} across ${locations.length} locations.`;
    }
    
    if (query.includes('instances of') || query.includes('times did')) {
      const action = searchTerms.find(term => term.includes('EVENT') || term.includes('CLEAN') || term.includes('STAND'));
      if (action) {
        const actionData = data.filter(r => r['Action'] && r['Action'].toUpperCase().includes(action.toUpperCase()));
        return `Found ${actionData.length} instances of "${action}".`;
      }
    }
    
    // Get unique actions
    const uniqueActions = [...new Set(data.map(r => r['Action']).filter(Boolean))];
    
    if (count === 1) {
      const action = data[0]['Action'];
      const location = data[0]['Location'];
      return `The issue with ${searchTerms.join(' ')} was "${action}" at ${location}.`;
    }
    
    if (uniqueActions.length === 1) {
      const action = uniqueActions[0];
      const locations = [...new Set(data.map(r => r['Location']).filter(Boolean))];
      return `The issue with ${searchTerms.join(' ')} was "${action}" at ${locations.length} location${locations.length > 1 ? 's' : ''}.`;
    }
    
    if (uniqueActions.length <= 3) {
      const actionList = uniqueActions.join(', ');
      return `The issues with ${searchTerms.join(' ')} were: ${actionList}.`;
    }
    
    return `The issues with ${searchTerms.join(' ')} included: ${uniqueActions.slice(0, 3).join(', ')} and ${uniqueActions.length - 3} more actions.`;
  }

  /**
   * Extract search terms from query (removes question words and common terms)
   */
  private static extractSearchTerms(query: string): string[] {
    // Remove common question words and prepositions
    const questionWords = [
      'where', 'when', 'what', 'is', 'are', 'was', 'were', 'located', 'at', 'in', 'on', 'the', 'a', 'an', 'of', 'for', 'to', 'with', 'by', 'from', 'about', 'issue', 'problem', 'action', 'reported', 'found', 'located',
      'show', 'me', 'all', 'list', 'find', 'can', 'you', 'give', 'summary', 'work', 'done', 'service', 'requests', 'there', 'times', 'technicians', 'need', 'instances', 'actions', 'taken', 'numbers', 'occurred',
      'were', 'any', 'issues', 'required', 'standby', 'technician', 'details', 'location', 'last', 'maintenance', 'activities', 'happened', 'records', 'lane', 'street', 'circle', 'house', 'guest', 'jubail'
    ];
    
    let cleanQuery = query;
    questionWords.forEach(word => {
      cleanQuery = cleanQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    
    // Split and filter out empty strings, but preserve important terms
    const terms = cleanQuery.split(/\s+/).filter(term => term.length > 0);
    
    // Add back important location terms that might have been removed
    const locationTerms = query.match(/(\d+\s+[A-Z\s]+(?:STREET|AVENUE|ROAD|CIRCLE|LANE|HOUSE|COURT))/gi);
    if (locationTerms) {
      locationTerms.forEach(term => {
        if (!terms.includes(term.trim())) {
          terms.push(term.trim());
        }
      });
    }
    
    // Add back location names that don't follow the standard pattern (like "6000 Rock court")
    const customLocationTerms = query.match(/(\d+\s+[A-Z\s]+(?:ROCK|FADHILI|JUBAIL|LEMON|ELEVENTH|NINTH))/gi);
    if (customLocationTerms) {
      customLocationTerms.forEach(term => {
        if (!terms.includes(term.trim())) {
          terms.push(term.trim());
        }
      });
    }
    
    // Add back important action terms
    const actionTerms = query.match(/(CLEAN\s+AIR\s+FILTER|EVENT,\s+STAND\s+BY|CLEAN\s+ALL\s+UNIT|AC\s+NOT\s+WORKING|REPLACE\s+BELT|CLEANING\s+JOB)/gi);
    if (actionTerms) {
      actionTerms.forEach(term => {
        if (!terms.includes(term.trim())) {
          terms.push(term.trim());
        }
      });
    }
    
    // Add back action terms that don't follow the standard pattern
    const customActionTerms = query.match(/(replace|belt|clean|repair|maintenance|inspection|event|standby)/gi);
    if (customActionTerms) {
      customActionTerms.forEach(term => {
        if (!terms.includes(term.trim())) {
          terms.push(term.trim());
        }
      });
    }
    
    return terms;
  }

  /**
   * Format count responses naturally
   */
  private static formatCountResponse(userQuery: string, count: number): string {
    const query = userQuery.toLowerCase();
    
    if (query.includes('issue') || query.includes('problem')) {
      return count === 0 ? "There are no issues reported." :
             count === 1 ? "There is 1 issue reported." :
             `There are ${count} issues reported.`;
    }
    
    if (query.includes('location')) {
      return count === 0 ? "There are no locations found." :
             count === 1 ? "There is 1 location found." :
             `There are ${count} locations found.`;
    }
    
    return count === 0 ? "There are no records found." :
           count === 1 ? "There is 1 record found." :
           `There are ${count} records found.`;
  }

  /**
   * Format query result into natural language response
   */
   static formatQueryResponse(userQuery: string, result: QueryResult): string {
    if (!result.success) {
      return `I'm sorry, I encountered an error while searching: ${result.error}`;
    }
    
    const query = userQuery.toLowerCase();
    
    // Handle different query types with natural language responses
    switch (result.intent?.type) {
      case 'count':
        return this.formatCountResponse(userQuery, result.count || 0);
        
      case 'sum':
        return `The total sum is ₹${result.sum?.toLocaleString('en-IN')}.`;
        
      case 'average':
        return `The average value is ₹${result.average?.toFixed(2)}.`;
        
      case 'max':
        return `The highest value is ₹${result.max?.toLocaleString('en-IN')}.`;
        
      case 'min':
        return `The lowest value is ₹${result.min?.toLocaleString('en-IN')}.`;
        
      case 'trend':
        return `I found ${result.data?.length} records for trend analysis. This data would be great to visualize in a chart.`;
        
      default:
        if (result.data && result.data.length > 0) {
          return this.generateNaturalResponse(userQuery, result.data, result.intent);
        } else {
          // Provide debugging information when no results found
          let debugInfo = `🔍 **No Results**: No records found matching your query.\n\n`;
          
          if (result.intent?.filters && result.intent.filters.length > 0) {
            debugInfo += `🔍 **Applied Filters:**\n`;
            result.intent.filters.forEach(filter => {
              debugInfo += `- ${filter.field}: ${filter.operator} "${filter.value}"\n`;
            });
            debugInfo += `\n`;
          }
          
          debugInfo += `💡 **Suggestions:**\n`;
          debugInfo += `• Check spelling of location names\n`;
          debugInfo += `• Try different variations (e.g., "TENTH STREET" vs "10TH STREET")\n`;
          debugInfo += `• Use "Show all locations" to see available data\n`;
          
          return debugInfo;
        }
    }
  }

  /**
   * Get current collection info
   */
  static getCurrentCollection(): { collectionName: string | null; fileName: string | null } {
    return {
      collectionName: this.currentCollection,
      fileName: this.currentFileName
    };
  }

  /**
   * Manually set the current collection
   */
  static async setCurrentCollection(collectionName: string, fileName: string): Promise<void> {
    console.log(`🔧 Setting collection to: ${collectionName}`);
    console.log(`🔧 Setting filename to: ${fileName}`);
    
    this.currentCollection = collectionName;
    this.currentFileName = fileName;
    
    console.log(`✅ Collection set successfully`);
  }

  /**
   * Get list of available Excel collections from Firebase
   */
  static async getAvailableCollections(): Promise<string[]> {
    try {
      // Since we can't directly list collections, we'll try to check for known collection patterns
      // Based on your Firebase console, we know there's a collection called "MMT_Database_Compressed_xlsx"
      const possibleCollections = [
        'MMT_Database_Compressed_xlsx', // Current collection from Firebase console
        'MMT_Database_xlsx',
        'MMT_Database_1_xlsx',
        'database_xlsx',
        'data_xlsx'
      ];
      
      const excelCollections: string[] = [];
      
      for (const collectionName of possibleCollections) {
        try {
          const collectionRef = collection(db, collectionName);
          const querySnapshot = await getDocs(query(collectionRef, limit(1)));
          
          if (!querySnapshot.empty) {
            excelCollections.push(collectionName);
            console.log(`✅ Found collection: ${collectionName}`);
          }
        } catch (error) {
          // Collection doesn't exist, continue
        }
      }
      
      return excelCollections;
    } catch (error) {
      console.error('❌ Error getting available collections:', error);
      return [];
    }
  }

  /**
   * Check Firebase collection status and availability
   */
  static async checkCollectionStatus(): Promise<string> {
    try {
      console.log('🔍 Checking Firebase collection status...');
      console.log('📂 Current collection:', this.currentCollection);
      console.log('📁 Current filename:', this.currentFileName);
      console.log('🔑 Column mapping:', this.columnMapping);
      
      if (!this.currentCollection) {
        return "❌ No collection set. Please upload an Excel file first.";
      }
      
      // Try to get a few documents from the collection
      const querySnapshot = await getDocs(collection(db, this.currentCollection));
      const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      let status = `📊 **Firebase Collection Status**\n\n`;
      status += `📂 **Collection:** ${this.currentCollection}\n`;
      status += `📁 **File:** ${this.currentFileName}\n`;
      status += `📊 **Documents:** ${documents.length}\n\n`;
      
      if (documents.length > 0) {
        const sampleDoc = documents[0];
        status += `🔑 **Available Fields:**\n`;
        Object.keys(sampleDoc).forEach(key => {
          if (key !== 'firebaseId' && key !== 'uploadTimestamp' && key !== 'fileName') {
            status += `• ${key}\n`;
          }
        });
        
        status += `\n📋 **Sample Record:**\n`;
        status += `• ID: ${sampleDoc.firebaseId || 'N/A'}\n`;
        if (sampleDoc['MMT No']) status += `• MMT: ${sampleDoc['MMT No']}\n`;
        if (sampleDoc['Location']) status += `• Location: ${sampleDoc['Location']}\n`;
        if (sampleDoc['Date']) status += `• Date: ${sampleDoc['Date']}\n`;
      }
      
      return status;
      
    } catch (error: any) {
      return `❌ Error checking collection status: ${error.message}`;
    }
  }

  /**
   * Debug method to show all available locations in the data
   */
  static async debugAvailableLocations(): Promise<string> {
    try {
      if (!this.currentCollection) {
        return "❌ No data loaded. Please upload an Excel file first.";
      }

      const querySnapshot = await getDocs(collection(db, this.currentCollection));
      const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      if (documents.length === 0) {
        return "❌ No documents found in the collection.";
      }

      // Find location field
      const sampleDoc = documents[0];
      const locationField = Object.keys(sampleDoc).find(key => 
        key.toLowerCase().includes('location') || 
        key.toLowerCase().includes('address') ||
        key.toLowerCase().includes('street')
      );

      if (!locationField) {
        return "❌ No location field found in the data.";
      }

      // Get unique locations
      const locations = [...new Set(documents.map(doc => doc[locationField]).filter(Boolean))];
      locations.sort();

      let response = `📍 **Available Locations** (${locations.length} unique):\n\n`;
      
      locations.forEach((location, index) => {
        response += `**${index + 1}.** ${location}\n`;
      });

      return response;
    } catch (error: any) {
      return `❌ Error retrieving locations: ${error.message}`;
    }
  }

  /**
   * Debug method to check Firebase record count
   */
  static async debugRecordCount(): Promise<string> {
    try {
      if (!this.currentCollection) {
        return "❌ No data loaded. Please upload an Excel file first.";
      }

      const querySnapshot = await getDocs(collection(db, this.currentCollection));
      const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      let response = `📊 **Firebase Records Status**:\n\n`;
      response += `🗄️ **Collection**: ${this.currentCollection}\n`;
      response += `📁 **File**: ${this.currentFileName}\n`;
      response += `📈 **Total Records**: ${documents.length}\n\n`;

      if (documents.length > 0) {
        const sampleDoc = documents[0];
        const fields = Object.keys(sampleDoc).filter(key => 
          !['firebaseId', 'fileName', 'uploadTimestamp'].includes(key)
        );
        
        response += `📋 **Available Fields**: ${fields.join(', ')}\n\n`;
        
        // Show first 3 and last 3 records
        response += `📋 **First 3 Records**:\n`;
        documents.slice(0, 3).forEach((doc, index) => {
          response += `**${index + 1}.** ID: ${doc.firebaseId}`;
          if (doc['MMT No']) response += ` | MMT: ${doc['MMT No']}`;
          if (doc['Location']) response += ` | Location: ${doc['Location']}`;
          response += '\n';
        });
        
        if (documents.length > 3) {
          response += `\n📋 **Last 3 Records**:\n`;
          documents.slice(-3).forEach((doc, index) => {
            response += `**${documents.length - 2 + index}.** ID: ${doc.firebaseId}`;
            if (doc['MMT No']) response += ` | MMT: ${doc['MMT No']}`;
            if (doc['Location']) response += ` | Location: ${doc['Location']}`;
            response += '\n';
          });
        }
      }

      return response;
    } catch (error: any) {
      return `❌ Error retrieving record count: ${error.message}`;
    }
  }

  /**
   * Direct MMT number search - bypasses all complex logic
   */
  static async directMmtSearch(mmtNumber: string): Promise<string> {
    try {
      if (!this.currentCollection) {
        return "❌ No data loaded. Please upload an Excel file first.";
      }

      console.log(`🔍 **DIRECT SEARCH** for MMT: ${mmtNumber}`);
      console.log(`📂 Collection: ${this.currentCollection}`);

      // Get ALL documents from the collection
      const querySnapshot = await getDocs(collection(db, this.currentCollection));
      const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      console.log(`📊 Total documents loaded: ${documents.length}`);

      // Search for MMT number in ALL documents
      const matchingDocs = documents.filter(doc => {
        const docMmt = doc['MMT No'];
        if (!docMmt) return false;
        
        const docMmtString = docMmt.toString();
        const searchMmtString = mmtNumber.toString();
        
        console.log(`🔍 Comparing: "${docMmtString}" with "${searchMmtString}"`);
        
        return docMmtString === searchMmtString;
      });

      console.log(`✅ Found ${matchingDocs.length} matching documents`);

      if (matchingDocs.length > 0) {
        let response = `🎯 **DIRECT SEARCH RESULTS** for MMT: ${mmtNumber}\n\n`;
        
        matchingDocs.forEach((doc, index) => {
          response += `**Record ${index + 1}:**\n`;
          response += `• **MMT No**: ${doc['MMT No']}\n`;
          response += `• **Location**: ${doc['Location']}\n`;
          response += `• **Action**: ${doc['Action']}\n`;
          response += `• **Description**: ${doc['Description']}\n`;
          response += `• **Date**: ${doc['Date']}\n`;
          response += `• **Functional Location**: ${doc['Functional Location']}\n\n`;
        });

        return response;
      } else {
        // Show some sample MMT numbers for debugging
        const sampleMmtNumbers = documents
          .filter(doc => doc['MMT No'])
          .slice(0, 10)
          .map(doc => doc['MMT No']);

        let response = `❌ **NO MATCH FOUND** for MMT: ${mmtNumber}\n\n`;
        response += `🔍 **Sample MMT numbers in database:**\n`;
        sampleMmtNumbers.forEach((mmt, index) => {
          response += `• ${index + 1}. ${mmt}\n`;
        });
        response += `\n💡 **Try one of these MMT numbers instead.**`;

        return response;
      }

    } catch (error: any) {
      return `❌ Direct search error: ${error.message}`;
    }
  }

  /**
   * Clear all documents in a collection
   */
  private static async clearCollection(collectionName: string): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`🗑️ Cleared collection: ${collectionName}`);
    } catch (error) {
      console.error('❌ Error clearing collection:', error);
    }
  }

  /**
   * Sanitize collection name for Firestore
   */
  private static sanitizeCollectionName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  /**
   * Clean and process cell values
   */
  private static cleanValue(value: any): any {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value.trim();
    }
    
    return value;
  }

  /**
   * Initialize column mapping by reading a sample document from Firebase
   */
  private static async initializeColumnMapping(): Promise<void> {
    try {
      if (!this.currentCollection) {
        return;
      }
      
      // Get a sample document to extract column names
      const sampleQuery = query(collection(db, this.currentCollection), limit(1));
      const querySnapshot = await getDocs(sampleQuery);
      
      if (!querySnapshot.empty) {
        const sampleDoc = querySnapshot.docs[0].data();
        const headers = Object.keys(sampleDoc).filter(key => 
          key !== 'firebaseId' && key !== 'fileName' && key !== 'uploadTimestamp'
        );
        
        console.log('📋 Found columns:', headers);
        this.buildColumnMapping(headers);
      }
    } catch (error) {
      console.error('❌ Failed to initialize column mapping:', error);
    }
  }

  /**
   * Build column mapping for field detection
   */
  private static buildColumnMapping(headers: string[]): void {
    this.columnMapping = {};
    headers.forEach(header => {
      if (header && header.trim()) {
        this.columnMapping[header.toLowerCase()] = header.trim();
      }
    });
  }

  /**
   * Find matching field name
   */
  private static findMatchingField(possibleFields: string[]): string | null {
    for (const field of possibleFields) {
      if (this.columnMapping[field.toLowerCase()]) {
        return this.columnMapping[field.toLowerCase()];
      }
    }
    return null;
  }

  /**
   * Detect numeric field in documents
   */
  private static detectNumericField(documents: any[]): string | null {
    if (documents.length === 0) return null;
    
    const sampleDoc = documents[0];
    for (const [key, value] of Object.entries(sampleDoc)) {
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
        return key;
      }
    }
    
    return null;
  }

  /**
   * Create Gemini context from Firebase data
   */
  private static createGeminiContext(allData: any[]): string {
    try {
      console.log('🔄 Creating Gemini context from Firebase data...');
      
      // Convert data to text format for Gemini with better structure
      const dataEntries = allData.map((record, index) => {
        const mmtNo = record['MMT No'] || 'N/A';
        const functionalLocation = record['Functional Location'] || 'N/A';
        const location = record['Location'] || 'N/A';
        const action = record['Action'] || 'N/A';
        const description = record['Description'] || 'N/A';
        const rawDate = record['Date'] || 'N/A';
        
        // Convert Excel serial date to readable format
        let formattedDate = rawDate;
        if (typeof rawDate === 'number' && rawDate > 40000) { // Excel date serial number
          try {
            // Excel date serial number to JavaScript Date
            const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
            const jsDate = new Date(excelEpoch.getTime() + (rawDate - 2) * 24 * 60 * 60 * 1000); // -2 for Excel leap year bug
            formattedDate = jsDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          } catch (error) {
            console.log(`⚠️ Could not convert date ${rawDate}, using as-is`);
            formattedDate = rawDate;
          }
        }
        
        return `Record ${index + 1}:
- MMT Number: ${mmtNo}
- Functional Location: ${functionalLocation}
- Location: ${location}
- Action: ${action}
- Description: ${description}
- Date: ${formattedDate}`;
      });
      
            const contextString = `You are a helpful maintenance assistant with access to ${allData.length} maintenance records from a database. 
      
      RESPONSE RULES:
      
      FOR SPECIFIC QUERIES (exact matches):
      - If user asks for specific date, location, or action → find EXACT matches only
      - If no exact match → respond: "I don't have information about that in my database."
      
      FOR ANALYTICAL QUERIES (patterns, trends, analysis):
      - If user asks about "variety", "most", "least", "trends", "patterns" → analyze ALL data
      - Count, group, and find patterns across the entire dataset
      - Provide insights based on the data analysis
      
      Here is the complete database:
      
      ${dataEntries.join('\n\n')}
      
      IMPORTANT: Determine if the user wants specific information (exact match) or analytical insights (pattern analysis).`;
      
      console.log(`✅ Created Gemini context with ${allData.length} records`);
      
      // Log a sample entry for debugging
      if (dataEntries.length > 0) {
        console.log('📋 Sample entry format:');
        console.log(dataEntries[0]);
      }
      
      return contextString;
      
    } catch (error) {
      console.error('❌ Error creating Gemini context:', error);
      return 'No data available for analysis.';
    }
  }

  /**
   * Create a knowledge base prompt from Firebase data and send to GPT
   */
  private static async createKnowledgeBasePrompt(userQuery: string): Promise<string> {
    try {
      if (!this.currentCollection) {
        return "I don't have access to the maintenance data. Please upload an Excel file first.";
      }

      // Fetch all data from Firebase
      console.log('📊 Fetching all data from Firebase for knowledge base...');
      const firestoreQuery = query(collection(db, this.currentCollection));
      const querySnapshot = await getDocs(firestoreQuery);
      const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      console.log(`📋 Found ${allData.length} records in knowledge base`);

      // Convert data to text format for GPT
      const knowledgeEntries = allData.map((record, index) => {
        const mmtNo = record['MMT No'] || 'N/A';
        const location = record['Location'] || record['Functional Location'] || 'N/A';
        const action = record['Action'] || 'N/A';
        const description = record['Description'] || 'N/A';
        const date = record['Date'] || 'N/A';
        
        return `${index + 1}. MMT: ${mmtNo} - Location: ${location} - Action: ${action} - Description: ${description} - Date: ${date}`;
      });
      
      console.log(`📊 Sample entries from knowledge base:`);
      console.log(knowledgeEntries.slice(0, 3).join('\n'));
      
      // Log entries that contain "REPLACE BELT" for debugging
      const replaceBeltEntries = knowledgeEntries.filter(entry => 
        entry.toLowerCase().includes('replace belt')
      );
      console.log(`🔧 Found ${replaceBeltEntries.length} entries with "REPLACE BELT":`);
      if (replaceBeltEntries.length > 0) {
        console.log(replaceBeltEntries.slice(0, 2).join('\n'));
      }

      // Create the prompt
      const prompt = `You are a helpful maintenance assistant with the following knowledge base of ${allData.length} maintenance records:

${knowledgeEntries.join('\n')}

Answer questions **only using this data**. If the answer is not in the data, respond "I don't have information about that in my database."

User question: ${userQuery}

Provide a natural, conversational answer based on the data above.`;

      return prompt;
    } catch (error) {
      console.error('❌ Error creating knowledge base prompt:', error);
      return "I encountered an error accessing the maintenance data.";
    }
  }

  /**
   * Send prompt to GPT and get response
   */
  private static async getGPTResponse(prompt: string): Promise<string> {
    try {
      // For now, we'll use a simple response since we don't have GPT API integrated
      // In a real implementation, you would send this to OpenAI API
      console.log('🤖 Sending prompt to GPT (simulated)...');
      
      // Simulate GPT processing by analyzing the prompt and data
      const userQuery = prompt.split('User question: ')[1]?.trim() || '';
      const dataSection = prompt.split('User question: ')[0]?.split('\n').slice(2, -1) || [];
      
      // Parse the data back into structured format
      const records = dataSection.map(line => {
        const match = line.match(/(\d+)\. MMT: (.+?) - Location: (.+?) - Action: (.+?) - Description: (.+?) - Date: (.+)/);
        if (match) {
          return {
            mmtNo: match[2],
            location: match[3],
            action: match[4],
            description: match[5],
            date: match[6]
          };
        }
        return null;
      }).filter((record): record is NonNullable<typeof record> => record !== null);

      // Analyze the query and find relevant records
      const query = userQuery.toLowerCase();
      let relevantRecords = records;

      // Filter based on query type
      if (query.includes('mmt') && query.includes('number')) {
        // MMT number query
        const searchTerms = this.extractSearchTerms(query);
        relevantRecords = records.filter(record => 
          searchTerms.some(term => 
            record.location.toLowerCase().includes(term.toLowerCase()) ||
            record.description.toLowerCase().includes(term.toLowerCase())
          )
        );
             } else if (query.includes('location') && query.includes('of')) {
         // Location query - search for exact action matches
         const searchTerms = this.extractSearchTerms(query);
         console.log('🔍 Searching for location of:', searchTerms);
         
         relevantRecords = records.filter(record => {
           const action = record.action.toLowerCase();
           const description = record.description.toLowerCase();
           
           // Check for exact phrase matches first
           if (searchTerms.includes('replace') && searchTerms.includes('belt')) {
             return action.includes('replace belt') || description.includes('replace belt');
           }
           
           // Then check individual terms
           return searchTerms.some(term => 
             action.includes(term.toLowerCase()) ||
             description.includes(term.toLowerCase())
           );
         });
         
         console.log(`📋 Found ${relevantRecords.length} records matching location query`);
      } else if (query.includes('when') || query.includes('date')) {
        // Date query
        const searchTerms = this.extractSearchTerms(query);
        relevantRecords = records.filter(record => 
          searchTerms.some(term => 
            record.date.toLowerCase().includes(term.toLowerCase()) ||
            record.description.toLowerCase().includes(term.toLowerCase())
          )
        );
      } else {
        // General query - search in all fields
        const searchTerms = this.extractSearchTerms(query);
        relevantRecords = records.filter(record => 
          searchTerms.some(term => 
            record.location.toLowerCase().includes(term.toLowerCase()) ||
            record.action.toLowerCase().includes(term.toLowerCase()) ||
            record.description.toLowerCase().includes(term.toLowerCase()) ||
            record.mmtNo.toLowerCase().includes(term.toLowerCase())
          )
        );
      }

      // Generate natural response based on relevant records
      if (relevantRecords.length === 0) {
        return "I don't have information about that in my database.";
      }

      if (relevantRecords.length === 1) {
        const record = relevantRecords[0];
        if (query.includes('mmt') && query.includes('number')) {
          return `MMT number ${record.mmtNo} is located at ${record.location}. The action required is "${record.action}" with description: "${record.description}".`;
        } else if (query.includes('location') && query.includes('of')) {
          return `The "${this.extractSearchTerms(query).join(' ')}" action is located at ${record.location} (MMT: ${record.mmtNo}).`;
        } else {
          return `Based on the data, I found: MMT ${record.mmtNo} at ${record.location} with action "${record.action}" and description "${record.description}".`;
        }
      }

      // Multiple records
      const uniqueLocations = [...new Set(relevantRecords.map(r => r.location))];
      const uniqueActions = [...new Set(relevantRecords.map(r => r.action))];
      
      if (query.includes('location') && query.includes('of')) {
        const searchTerms = this.extractSearchTerms(query);
        const searchPhrase = searchTerms.join(' ');
        
        if (uniqueLocations.length === 0) {
          return `I couldn't find any locations for "${searchPhrase}" in the database.`;
        }
        
        if (uniqueLocations.length === 1) {
          const location = uniqueLocations[0];
          const mmtNumbers = [...new Set(relevantRecords.map(r => r.mmtNo))];
          return `The "${searchPhrase}" action is located at ${location}${mmtNumbers.length > 0 ? ` (MMT: ${mmtNumbers.join(', ')})` : ''}.`;
        }
        
        if (uniqueLocations.length <= 3) {
          return `The "${searchPhrase}" action was reported at ${uniqueLocations.length} location${uniqueLocations.length > 1 ? 's' : ''}: ${uniqueLocations.join(', ')}.`;
        } else {
          return `The "${searchPhrase}" action was reported at ${uniqueLocations.length} different locations. The main locations are: ${uniqueLocations.slice(0, 3).join(', ')} and ${uniqueLocations.length - 3} more.`;
        }
      }

      return `I found ${relevantRecords.length} relevant records. The actions included: ${uniqueActions.slice(0, 3).join(', ')}${uniqueActions.length > 3 ? ' and others' : ''} across ${uniqueLocations.length} locations.`;

    } catch (error) {
      console.error('❌ Error getting GPT response:', error);
      return "I encountered an error processing your question.";
    }
  }
}
