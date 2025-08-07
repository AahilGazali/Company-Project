const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test with a new API key - replace this with your new key
const NEW_API_KEY = 'YOUR_NEW_API_KEY_HERE'; // Replace this with your new API key

const testNewApiKey = async () => {
  try {
    console.log('Testing new API key...');
    const genAI = new GoogleGenerativeAI(NEW_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ New API Key is working!');
    console.log('Response:', text);
    console.log('\nNow update your .env file with this API key!');
  } catch (error) {
    console.log('❌ New API Key failed:');
    console.log(error.message);
    console.log('\nPlease check:');
    console.log('1. API key is correct');
    console.log('2. API key has proper permissions');
    console.log('3. You have billing enabled (if required)');
  }
};

testNewApiKey(); 