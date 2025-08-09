# Environment Variables Setup for PowerBI

## Create .env File

Create a `.env` file in your project root with the following variables:

```env
# Existing Gemini Configuration
GEMINI_API_KEY=your_existing_gemini_key_here

# PowerBI Configuration (Get these from Azure App Registration)
POWERBI_CLIENT_ID=your_application_client_id_here
POWERBI_CLIENT_SECRET=your_client_secret_here
POWERBI_TENANT_ID=your_directory_tenant_id_here
POWERBI_WORKSPACE_ID=your_workspace_id_here

# PowerBI API Endpoints
POWERBI_API_URL=https://api.powerbi.com/v1.0/myorg
POWERBI_LOGIN_URL=https://login.microsoftonline.com
```

## Where to Get These Values

### From Azure App Registration (completed in previous step):
- `POWERBI_CLIENT_ID`: Application (client) ID from Azure app registration
- `POWERBI_CLIENT_SECRET`: Client secret value (copied during secret creation)
- `POWERBI_TENANT_ID`: Directory (tenant) ID from Azure app registration

### From PowerBI Workspace:
- `POWERBI_WORKSPACE_ID`: Get from PowerBI workspace URL
  - Format: `https://app.powerbi.com/groups/WORKSPACE_ID/home`
  - Copy the ID between `/groups/` and `/home`

## Setup Instructions

1. **Create .env file**: Copy the template above
2. **Fill in values**: Replace placeholders with actual values from Azure
3. **Keep secure**: Never commit .env file to version control
4. **Test values**: Use the PowerBI service to validate configuration

## Next Steps

After setting up environment variables:
1. Create PowerBI authentication service
2. Implement dataset upload functionality
3. Build dashboard generation capabilities

## Security Notes

- Never share your client secret
- Use different workspaces for development/production
- Rotate secrets regularly (every 6-12 months)
- Monitor API usage in Azure portal
