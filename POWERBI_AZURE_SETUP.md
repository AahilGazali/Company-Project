# PowerBI Azure App Registration Setup Guide

## Step-by-Step Azure Portal Configuration

### 1. Create Azure App Registration

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com
   - Sign in with your Azure account

2. **Navigate to App Registrations**
   - Search for "App registrations" in the top search bar
   - Click on "App registrations" service

3. **Create New Registration**
   - Click "New registration"
   - Fill in the details:
     - **Name**: `Company-Project-PowerBI-App`
     - **Supported account types**: Select "Accounts in this organizational directory only"
     - **Redirect URI**: Leave blank for now
   - Click "Register"

4. **Copy Important Values**
   After registration, you'll see the app overview page. Copy these values:
   ```
   Application (client) ID: [COPY THIS VALUE]
   Directory (tenant) ID: [COPY THIS VALUE]
   ```

### 2. Create Client Secret

1. **Go to Certificates & secrets**
   - In your app's left sidebar, click "Certificates & secrets"

2. **Create New Secret**
   - Click "New client secret"
   - **Description**: `PowerBI Service Secret`
   - **Expires**: Choose "24 months" (recommended)
   - Click "Add"

3. **Copy Secret Value**
   ```
   Client Secret: [COPY THIS VALUE IMMEDIATELY - IT WON'T SHOW AGAIN]
   ```

### 3. Configure API Permissions

1. **Go to API permissions**
   - Click "API permissions" in left sidebar

2. **Add PowerBI Permissions**
   - Click "Add a permission"
   - Select "Power BI Service"
   - Choose "Delegated permissions"
   - Select these permissions:
     - `Dataset.ReadWrite.All`
     - `Report.ReadWrite.All`
     - `Workspace.ReadWrite.All`
     - `Content.Create`
   - Click "Add permissions"

3. **Grant Admin Consent**
   - Click "Grant admin consent for [Your Organization]"
   - Click "Yes" to confirm

### 4. PowerBI Service Principal Setup

1. **Go to PowerBI Admin Portal**
   - Visit: https://app.powerbi.com
   - Sign in with admin account
   - Click gear icon → "Admin portal"

2. **Enable Service Principal**
   - Go to "Tenant settings"
   - Find "Developer settings"
   - Enable "Service principals can use Fabric APIs"
   - Add your App ID to the allowed list
   - Click "Apply"

3. **Create PowerBI Workspace**
   - Go back to PowerBI main page
   - Click "Workspaces" → "Create a workspace"
   - **Name**: `Company-Project-Workspace`
   - **Description**: `Workspace for Excel dashboard generation`
   - Set workspace to "Pro" if available
   - Click "Save"

4. **Add App to Workspace**
   - In your new workspace, click "Access"
   - Click "Add people or groups"
   - Enter your App ID (Application client ID)
   - Set role to "Admin"
   - Click "Add"

### 5. Required Information Summary

After completing the setup, you should have:

```env
POWERBI_CLIENT_ID=your_application_client_id
POWERBI_CLIENT_SECRET=your_client_secret_value
POWERBI_TENANT_ID=your_directory_tenant_id
POWERBI_WORKSPACE_ID=your_workspace_id (get from workspace URL)
```

### 6. Get Workspace ID

1. **Go to your PowerBI workspace**
2. **Check the URL**: 
   - URL format: `https://app.powerbi.com/groups/WORKSPACE_ID/home`
   - Copy the WORKSPACE_ID from the URL

### 7. Test Connection

Use PowerBI REST API to test:
```bash
# Get access token
curl -X POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id={client-id}&scope=https://analysis.windows.net/powerbi/api/.default&client_secret={client-secret}&grant_type=client_credentials"
```

## Troubleshooting

### Common Issues:
1. **Permission Errors**: Ensure admin consent is granted
2. **Workspace Access**: Verify app is added to workspace with proper permissions
3. **Service Principal**: Check if service principal access is enabled in tenant settings

### Next Steps:
- Add environment variables to your project
- Implement PowerBI service authentication
- Create dataset upload functionality
