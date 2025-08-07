# Setup Gemini API in Your Firebase Project

## Step 1: Enable Gemini API in Firebase Project

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. **IMPORTANT**: Select project "company-project-4f00b" (your Firebase project)
3. Go to "APIs & Services" > "Library"
4. Search for "Gemini API"
5. Click "Gemini API"
6. Click "Enable"
7. Wait for the API to be enabled

## Step 2: Create API Key in Firebase Project

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the new API key
4. Click "Restrict Key"
5. Set restrictions:
   - **API restrictions**: Select "Gemini API"
   - **Application restrictions**: "None" (for testing)
6. Click "Save"

## Step 3: Update Your .env File

Replace your current API key with the new one from the Firebase project.

## Step 4: Test the New API Key

Run the test script to verify it works. 