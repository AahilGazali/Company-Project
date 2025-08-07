require('dotenv').config();

console.log('Environment variable test:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');

// Test if the API key matches what we expect
const expectedKey = 'AIzaSyAfDQq5Fu_CgpzKgnpWJn1kIOdD6iotDNo';
const actualKey = process.env.GEMINI_API_KEY;

if (actualKey === expectedKey) {
  console.log('✅ API key matches expected value');
} else {
  console.log('❌ API key does not match expected value');
  console.log('Expected:', expectedKey.substring(0, 10) + '...');
  console.log('Actual:', actualKey ? actualKey.substring(0, 10) + '...' : 'NOT FOUND');
} 