import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiService {
  // Send a message and get response
  static async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const result = await model.generateContent(message);
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

  // Validate API key
  static async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.sendMessage('Hello');
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export default GeminiService; 