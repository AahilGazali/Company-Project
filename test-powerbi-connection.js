// PowerBI Connection Test Script
// Run this script to test your PowerBI setup before integrating with the app

const axios = require('axios');

// Replace these with your actual values from Azure App Registration
const POWERBI_CLIENT_ID = 'your_application_client_id_here';
const POWERBI_CLIENT_SECRET = 'your_client_secret_here';
const POWERBI_TENANT_ID = 'your_directory_tenant_id_here';
const POWERBI_WORKSPACE_ID = 'your_workspace_id_here';

const POWERBI_API_URL = 'https://api.powerbi.com/v1.0/myorg';
const POWERBI_LOGIN_URL = 'https://login.microsoftonline.com';

async function testPowerBIConnection() {
  console.log('🧪 Testing PowerBI Connection...\n');

  try {
    // Step 1: Get Access Token
    console.log('1️⃣ Getting access token...');
    
    const tokenUrl = `${POWERBI_LOGIN_URL}/${POWERBI_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', POWERBI_CLIENT_ID);
    params.append('client_secret', POWERBI_CLIENT_SECRET);
    params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');
    params.append('grant_type', 'client_credentials');

    const tokenResponse = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Access token obtained successfully');

    // Step 2: Test API Access
    console.log('\n2️⃣ Testing API access...');
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Get Datasets
    const datasetsResponse = await axios.get(
      `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets`,
      { headers }
    );

    console.log('✅ API access successful');
    console.log(`📊 Found ${datasetsResponse.data.value.length} datasets in workspace`);

    // Get Reports
    const reportsResponse = await axios.get(
      `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/reports`,
      { headers }
    );

    console.log(`📈 Found ${reportsResponse.data.value.length} reports in workspace`);

    // Step 3: Test Dataset Creation (optional)
    console.log('\n3️⃣ Testing dataset creation...');
    
    const testDataset = {
      name: `Test_Dataset_${Date.now()}`,
      tables: [
        {
          name: 'TestTable',
          columns: [
            { name: 'ID', dataType: 'String' },
            { name: 'Name', dataType: 'String' },
            { name: 'Value', dataType: 'Double' },
            { name: 'Date', dataType: 'DateTime' }
          ]
        }
      ],
      defaultMode: 'Push'
    };

    const createDatasetResponse = await axios.post(
      `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets`,
      testDataset,
      { headers }
    );

    const testDatasetId = createDatasetResponse.data.id;
    console.log('✅ Test dataset created successfully:', testDatasetId);

    // Step 4: Test Data Upload
    console.log('\n4️⃣ Testing data upload...');
    
    const testData = {
      rows: [
        { ID: '1', Name: 'Test Item 1', Value: 100.5, Date: new Date().toISOString() },
        { ID: '2', Name: 'Test Item 2', Value: 200.3, Date: new Date().toISOString() },
        { ID: '3', Name: 'Test Item 3', Value: 150.7, Date: new Date().toISOString() }
      ]
    };

    await axios.post(
      `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets/${testDatasetId}/tables/TestTable/rows`,
      testData,
      { headers }
    );

    console.log('✅ Test data uploaded successfully');

    // Step 5: Cleanup - Delete Test Dataset
    console.log('\n5️⃣ Cleaning up test dataset...');
    
    await axios.delete(
      `${POWERBI_API_URL}/groups/${POWERBI_WORKSPACE_ID}/datasets/${testDatasetId}`,
      { headers }
    );

    console.log('✅ Test dataset cleaned up successfully');

    console.log('\n🎉 PowerBI Connection Test PASSED!');
    console.log('\n✅ Your PowerBI setup is working correctly');
    console.log('✅ You can now integrate PowerBI with your React Native app');

  } catch (error) {
    console.error('\n❌ PowerBI Connection Test FAILED!');
    console.error('\nError details:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error:', error.message);
    }

    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check your environment variables are correct');
    console.log('2. Verify Azure App Registration has correct permissions');
    console.log('3. Ensure admin consent was granted');
    console.log('4. Check PowerBI workspace permissions');
    console.log('5. Verify service principal is enabled in PowerBI admin portal');
  }
}

// Check if environment variables are set
if (POWERBI_CLIENT_ID === 'your_application_client_id_here') {
  console.log('❌ Please update the environment variables in this script first!');
  console.log('Set your actual values from Azure App Registration:');
  console.log('- POWERBI_CLIENT_ID');
  console.log('- POWERBI_CLIENT_SECRET');
  console.log('- POWERBI_TENANT_ID');
  console.log('- POWERBI_WORKSPACE_ID');
} else {
  // Run the test
  testPowerBIConnection();
}

module.exports = { testPowerBIConnection };
