// Simulate the @env import that React Native uses
const { GEMINI_API_KEY } = require('@env');

console.log('Testing @env import:');
console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');

// Test if the API key matches what we expect
const expectedKey = 'AIzaSyAfDQq5Fu_CgpzKgnpWJn1kIOdD6iotDNo';

if (GEMINI_API_KEY === expectedKey) {
  console.log('✅ API key matches expected value');
} else {
  console.log('❌ API key does not match expected value');
  console.log('Expected:', expectedKey.substring(0, 10) + '...');
  console.log('Actual:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
} 