const { execSync } = require('child_process');

console.log('Deploying Firebase Storage rules...');

try {
  // Deploy storage rules
  execSync('firebase deploy --only storage', { stdio: 'inherit' });
  console.log('✅ Storage rules deployed successfully!');
} catch (error) {
  console.error('❌ Failed to deploy storage rules:', error.message);
  console.log('\nTo deploy manually, run:');
  console.log('firebase deploy --only storage');
} 