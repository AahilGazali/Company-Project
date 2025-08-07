const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use the same API key from your .env file
const API_KEY = 'AIzaSyAfDQq5Fu_CgpzKgnpWJn1kIOdD6iotDNo';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function testAPI() {
  try {
    console.log('Testing API key:', API_KEY.substring(0, 10) + '...');
    
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS! Response:', text);
    return true;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

testAPI(); 