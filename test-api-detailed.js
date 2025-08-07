const { GoogleGenerativeAI } = require('@google/generative-ai');

const CURRENT_API_KEY = 'AIzaSyDu_wap3pW-9FkLc7FHXZ2DuDsjmz-v-Zo';

const testApiKeyDetailed = async () => {
  console.log('🔍 Testing API key with detailed error reporting...');
  console.log('API Key (last 4 chars):', CURRENT_API_KEY.slice(-4));
  
  try {
    // Test 1: Basic initialization
    console.log('\n1. Testing basic initialization...');
    const genAI = new GoogleGenerativeAI(CURRENT_API_KEY);
    console.log('✅ Basic initialization successful');
    
    // Test 2: Model initialization
    console.log('\n2. Testing model initialization...');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log('✅ Model initialization successful');
    
    // Test 3: Generate content
    console.log('\n3. Testing content generation...');
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Content generation successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.log('❌ Error occurred:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check if Gemini API is enabled in Google Cloud Console');
      console.log('2. Verify API key restrictions in Google AI Studio');
      console.log('3. Make sure the API key is not restricted to specific domains');
      console.log('4. Try creating a new API key');
    }
    
    if (error.message.includes('quota')) {
      console.log('\n🔧 Quota issue detected:');
      console.log('1. Check your usage limits in Google AI Studio');
      console.log('2. Consider setting up billing if on free tier');
    }
  }
};

testApiKeyDetailed(); 