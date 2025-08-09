// Deploy Firestore security rules
// Run this script to update your Firestore security rules

const { exec } = require('child_process');

console.log('🚀 Deploying Firestore security rules...');

// Deploy only Firestore rules
exec('firebase deploy --only firestore:rules', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error deploying Firestore rules:', error);
    console.error('stderr:', stderr);
    
    console.log('\n📝 Manual deployment instructions:');
    console.log('1. Install Firebase CLI: npm install -g firebase-tools');
    console.log('2. Login to Firebase: firebase login');
    console.log('3. Initialize project: firebase init');
    console.log('4. Deploy rules: firebase deploy --only firestore:rules');
    
    return;
  }
  
  console.log('✅ Firestore rules deployed successfully!');
  console.log(stdout);
  
  if (stderr) {
    console.log('Warnings:', stderr);
  }
});

// Alternative: Deploy all rules
console.log('\n📋 To deploy all rules (Firestore + Storage), run:');
console.log('firebase deploy --only firestore:rules,storage');
