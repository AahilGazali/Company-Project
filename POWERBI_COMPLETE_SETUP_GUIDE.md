# Complete PowerBI Setup Guide - Start to End

## Overview
This guide will take you from zero to a fully working PowerBI integration with your React Native app that automatically generates dashboards from Excel files.

## 📋 Prerequisites
- Azure account with PowerBI Pro license
- Administrative access to your organization's PowerBI tenant
- Your React Native project setup

---

## 🎯 Part 1: Azure App Registration Setup

### Step 1: Create Azure App Registration

1. **Navigate to Azure Portal**
   - Go to: https://portal.azure.com
   - Sign in with your Azure account

2. **Create App Registration**
   - Search for "App registrations" → Click the service
   - Click "New registration"
   - Fill in details:
     - **Name**: `Company-Project-PowerBI-App`
     - **Account types**: "Accounts in this organizational directory only"
     - **Redirect URI**: Leave blank
   - Click "Register"

3. **Copy Important Values**
   ```
   Application (client) ID: [SAVE THIS]
   Directory (tenant) ID: [SAVE THIS]
   ```

### Step 2: Create Client Secret

1. **Go to Certificates & secrets**
   - In app sidebar → "Certificates & secrets"

2. **Create Secret**
   - Click "New client secret"
   - Description: `PowerBI Service Secret`
   - Expires: 24 months
   - Click "Add"

3. **Copy Secret Value**
   ```
   Client Secret: [COPY IMMEDIATELY - WON'T SHOW AGAIN]
   ```

### Step 3: Configure API Permissions

1. **Add PowerBI Permissions**
   - Go to "API permissions"
   - Click "Add a permission" → "Power BI Service"
   - Select "Delegated permissions":
     - ✅ `Dataset.ReadWrite.All`
     - ✅ `Report.ReadWrite.All`
     - ✅ `Workspace.ReadWrite.All`
     - ✅ `Content.Create`
   - Click "Add permissions"

2. **Grant Admin Consent**
   - Click "Grant admin consent for [Organization]"
   - Click "Yes"

---

## 🎯 Part 2: PowerBI Service Setup

### Step 4: Configure PowerBI Admin Portal

1. **Access Admin Portal**
   - Go to: https://app.powerbi.com
   - Sign in with admin account
   - Click gear icon → "Admin portal"

2. **Enable Service Principal**
   - Navigate to "Tenant settings"
   - Find "Developer settings"
   - Enable "Service principals can use Fabric APIs"
   - Add your Application (client) ID to allowed list
   - Click "Apply"

### Step 5: Create PowerBI Workspace

1. **Create Workspace**
   - Go back to PowerBI main page
   - Click "Workspaces" → "Create a workspace"
   - Name: `Company-Project-Workspace`
   - Description: `Excel dashboard generation workspace`
   - Click "Save"

2. **Add App to Workspace**
   - In your workspace → Click "Access"
   - Click "Add people or groups"
   - Enter your Application (client) ID
   - Set role to "Admin"
   - Click "Add"

3. **Get Workspace ID**
   - Copy from URL: `https://app.powerbi.com/groups/WORKSPACE_ID/home`

---

## 🎯 Part 3: Environment Configuration

### Step 6: Set Up Environment Variables

Create a `.env` file in your project root:

```env
# Existing Configuration
GEMINI_API_KEY=your_existing_gemini_key

# PowerBI Configuration
POWERBI_CLIENT_ID=your_application_client_id
POWERBI_CLIENT_SECRET=your_client_secret
POWERBI_TENANT_ID=your_directory_tenant_id
POWERBI_WORKSPACE_ID=your_workspace_id

# PowerBI API Endpoints
POWERBI_API_URL=https://api.powerbi.com/v1.0/myorg
POWERBI_LOGIN_URL=https://login.microsoftonline.com
```

**⚠️ Security Note**: Never commit `.env` file to version control!

---

## 🎯 Part 4: Test the Setup

### Step 7: Run Connection Test

1. **Update Test Script**
   ```bash
   # Edit test-powerbi-connection.js
   # Replace placeholder values with your actual credentials
   ```

2. **Run Test**
   ```bash
   node test-powerbi-connection.js
   ```

3. **Expected Output**
   ```
   🧪 Testing PowerBI Connection...
   ✅ Access token obtained successfully
   ✅ API access successful
   ✅ Test dataset created successfully
   ✅ Test data uploaded successfully
   ✅ Test dataset cleaned up successfully
   🎉 PowerBI Connection Test PASSED!
   ```

### Step 8: Test in React Native App

1. **Install Dependencies** (Already done)
   ```bash
   npm install powerbi-client powerbi-client-react axios @azure/msal-node
   ```

2. **Test PowerBI Service**
   ```typescript
   import PowerBIService from './services/powerBIService';
   
   // Test connection
   const result = await PowerBIService.testConnection();
   console.log('PowerBI Test:', result);
   ```

---

## 🎯 Part 5: Integration with Excel Import

### Current Excel Import Flow:
```
1. User selects Excel file
2. File uploads to Firebase Storage
3. File metadata saved to Firestore
4. Excel analyzed by ExcelAnalysisService
```

### Enhanced Flow with PowerBI:
```
1. User selects Excel file
2. File uploads to Firebase Storage
3. File metadata saved to Firestore
4. Excel analyzed by ExcelAnalysisService
5. 🆕 Excel data sent to PowerBI (creates dataset)
6. 🆕 PowerBI generates dashboard/report
7. 🆕 Dashboard metadata saved to Firestore
8. 🆕 User sees dashboard in ReportScreen
```

### Integration Points:

**In DatabaseScreen.tsx** (Excel import handler):
```typescript
// Add after ExcelAnalysisService.analyzeExcelFile()
import ExcelToPowerBIService from '../services/excelToPowerBIService';

// Create PowerBI dashboard
const powerBIResult = await ExcelToPowerBIService.createDashboardFromExcel(
  uploadResult.url!,
  file.name,
  savedFileId,
  user.uid,
  analysis
);

if (powerBIResult.success) {
  console.log('✅ PowerBI dashboard created:', powerBIResult.dashboardId);
}
```

---

## 🎯 Part 6: ReportScreen Implementation

### Dashboard Display in ReportScreen:

1. **Fetch User Dashboards**
   ```typescript
   import DashboardService from '../services/dashboardService';
   
   const dashboards = await DashboardService.getUserDashboards(userId);
   ```

2. **PowerBI Embed Component**
   ```typescript
   import { PowerBIEmbed } from 'powerbi-client-react';
   
   <PowerBIEmbed
     embedConfig={{
       type: 'report',
       id: reportId,
       embedUrl: embedUrl,
       accessToken: embedToken
     }}
   />
   ```

---

## 🎯 Part 7: Error Handling & Troubleshooting

### Common Issues:

1. **Permission Denied**
   - Check admin consent granted
   - Verify service principal enabled
   - Confirm app added to workspace

2. **Authentication Failed**
   - Verify client secret not expired
   - Check tenant ID is correct
   - Ensure client ID matches app registration

3. **API Errors**
   - Check PowerBI workspace permissions
   - Verify workspace ID in URL
   - Ensure PowerBI Pro license active

### Debug Tools:

1. **Connection Test Script**: `node test-powerbi-connection.js`
2. **Azure Portal**: Monitor app registration activity
3. **PowerBI Admin Portal**: Check tenant settings
4. **Browser DevTools**: Monitor API calls

---

## 🎯 Part 8: Production Deployment

### Security Checklist:
- ✅ Client secrets stored securely
- ✅ Environment variables not in source control
- ✅ Regular secret rotation (6-12 months)
- ✅ Separate dev/prod workspaces
- ✅ API usage monitoring

### Performance Optimization:
- ✅ Token caching implemented
- ✅ Data batching for large datasets
- ✅ Error retry logic
- ✅ Dashboard caching in Firestore

---

## 🚀 Next Steps

1. **Complete Azure setup** following Part 1-2
2. **Test connection** using the test script
3. **Integrate with Excel import** in DatabaseScreen
4. **Update ReportScreen** to display dashboards
5. **Test end-to-end flow** with real Excel files

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Run the connection test script
3. Verify all setup steps completed
4. Check Azure/PowerBI service status

---

**🎉 Congratulations!** You now have a complete PowerBI integration that automatically generates dashboards from Excel files!
