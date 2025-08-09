import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExcelAnalysis, ExcelAnalysisService } from './excelAnalysisService';
// import { GEMINI_API_KEY } from '@env';

// Initialize the Gemini API with hardcoded key for testing
const GEMINI_API_KEY = 'AIzaSyAfDQq5Fu_CgpzKgnpWJn1kIOdD6iotDNo';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Get the generative model - use gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DataContext {
  hasData: boolean;
  analysis?: ExcelAnalysis;
  contextString?: string;
}

export class GeminiService {
  private static dataContext: DataContext = { hasData: false };
  
  // Set Excel data context for AI queries
  static setDataContext(analysis: ExcelAnalysis | null) {
    if (analysis) {
      this.dataContext = {
        hasData: true,
        analysis,
        contextString: ExcelAnalysisService.generateDataContext(analysis)
      };
      console.log('📊 Data context set for:', analysis.fileName);
    } else {
      this.dataContext = { hasData: false };
      console.log('🔄 Data context cleared');
    }
  }
  
  // Get current data context
  static getDataContext(): DataContext {
    return this.dataContext;
  }
  
  // Send a message with optional data context
  static async sendMessage(message: string, includeDataContext: boolean = true): Promise<ChatResponse> {
    try {
      let prompt = message;
      
      // Add data context if available and requested
      if (includeDataContext && this.dataContext.hasData && this.dataContext.contextString) {
        prompt = this.buildDataAwarePrompt(message, this.dataContext.contextString);
      }
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        message: text
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }
  
  // Send a message specifically about uploaded data
  static async queryUploadedData(userQuery: string): Promise<ChatResponse> {
    if (!this.dataContext.hasData || !this.dataContext.analysis) {
      return {
        success: false,
        error: 'No Excel data is currently loaded. Please upload an Excel file first to query data.'
      };
    }
    
    try {
      const dataAwarePrompt = this.buildDataQueryPrompt(userQuery, this.dataContext.contextString!);
      
      const result = await model.generateContent(dataAwarePrompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        message: text
      };
    } catch (error: any) {
      console.error('Error querying data:', error);
      return {
        success: false,
        error: error.message || 'Failed to query data'
      };
    }
  }
  
  // Build a data-aware prompt
  private static buildDataAwarePrompt(userMessage: string, dataContext: string): string {
    return `You are a helpful AI assistant who has access to the user's Excel data. Respond naturally and conversationally, like ChatGPT would, but use the specific data provided.

EXCEL DATA AVAILABLE:
${dataContext}

USER QUESTION: ${userMessage}

RESPONSE STYLE:
- Be conversational and helpful, like ChatGPT
- Answer questions directly using the actual data
- Use natural language, not bullet points or structured formats
- When showing results, present them in a friendly, readable way
- If you find specific data, share it naturally in your response

EXAMPLES OF GOOD RESPONSES:

User: "What fields are available?"
You: "Looking at your MMT Database.xlsx file, I can see you have these fields: MMT No, Date, Functional Location, Location, and Action. This gives you a good overview of your maintenance data with 5799 total records."

User: "Give me locations where AC is not working"
You: "I can help you find AC issues in your data. Looking at the records, I found several locations with AC problems. For example, there are entries showing AC malfunctions and cooling issues at different locations. From what I can see in your data, these issues are tracked in the Action field with details about the specific problems."

IMPORTANT:
- Use the actual data and column names from the context above
- Be conversational and natural
- Provide helpful, specific information
- Don't use structured bullet points unless the user specifically asks for a list
- Respond like a knowledgeable friend who has looked at their data

Please respond naturally and helpfully:`;
  }
  
  // Build a specific data query prompt
  private static buildDataQueryPrompt(userQuery: string, dataContext: string): string {
    return `You are a helpful AI assistant analyzing Excel data. Respond like ChatGPT would - naturally and conversationally, but provide specific results from the data.

EXCEL DATA CONTEXT:
${dataContext}

USER QUERY: ${userQuery}

HOW TO RESPOND:
- Be friendly and conversational like ChatGPT
- Look at the sample data and provide actual results
- Use natural language, not structured bullet points
- Share specific findings from the data in a readable way
- Include actual values (locations, numbers, descriptions) when relevant

EXAMPLE NATURAL RESPONSES:

Query: "Where is the AC not working?"
Good Response: "I found several locations in your data with AC issues. Looking through your maintenance records, I can see problems at locations like Building A where there's an AC cooling issue, and at Building C with an AC malfunction. Your data shows these are tracked with specific MMT numbers and action descriptions that detail exactly what's wrong."

Query: "How many maintenance issues are there?"
Good Response: "Based on your MMT Database with 5799 records, I can see quite a few maintenance items tracked. Your data includes various types of actions and issues across different functional locations. The specific count would depend on how you define 'issues' - are you looking for particular types of problems or all maintenance activities?"

IMPORTANT:
- Use the actual sample data provided above
- Reference real column names and values from the user's file
- Be conversational and helpful
- Provide specific information when you find it
- Ask clarifying questions when helpful

Please respond naturally and helpfully using the actual data:`;
  }
  
  // Get data summary for user
  static getDataSummary(): string | null {
    if (!this.dataContext.hasData || !this.dataContext.analysis) {
      return null;
    }
    
    const analysis = this.dataContext.analysis;
    let summary = `Hi! I've loaded your ${analysis.fileName} file and I'm ready to help you analyze it. `;
    
    summary += `I can see you have ${analysis.sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0)} records with fields like ${analysis.keyFields.slice(0, 3).join(', ')}`;
    
    if (analysis.keyFields.length > 3) {
      summary += ` and ${analysis.keyFields.length - 3} others`;
    }
    
    summary += `. Feel free to ask me anything about your data - I can help you find specific information, analyze trends, or answer questions about your maintenance records. What would you like to know?`;
    
    return summary;
  }
  
  // Validate API key
  static async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.sendMessage('Hello', false);
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export default GeminiService; 