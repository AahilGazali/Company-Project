// Deploy updated Firestore rules with chart dashboards support
const { exec } = require('child_process');

console.log('🚀 Deploying updated Firestore rules...');
console.log('📋 New rules include support for chart dashboards collection');

// Check if Firebase CLI is installed
exec('firebase --version', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Firebase CLI not found. Please install it first:');
    console.error('npm install -g firebase-tools');
    console.error('Then run: firebase login');
    return;
  }

  console.log('✅ Firebase CLI found:', stdout.trim());
  
  // Deploy the rules
  exec('firebase deploy --only firestore:rules', (deployError, deployStdout, deployStderr) => {
    if (deployError) {
      console.error('❌ Error deploying rules:', deployError.message);
      console.error('stderr:', deployStderr);
      
      console.log('\n🔧 Manual deployment steps:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
      console.log('2. Select your project');
      console.log('3. Go to Firestore Database → Rules');
      console.log('4. Copy the contents of firestore.rules file');
      console.log('5. Click "Publish"');
      return;
    }

    console.log('✅ Firestore rules deployed successfully!');
    console.log(deployStdout);
    
    console.log('\n🎉 Chart dashboard functionality is now ready!');
    console.log('📊 Users can now generate and view dashboards from Excel files');
    console.log('🔐 Firestore rules updated to allow chart dashboard operations');
  });
});

module.exports = {};
