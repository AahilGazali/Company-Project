# Firebase Storage Setup Instructions

## Issue Fixed
Your Firebase Storage upload was failing due to:
1. **Storage bucket URL mismatch** - Fixed the configuration
2. **Missing security rules** - Created proper rules
3. **Poor error handling** - Added detailed logging and specific error messages

## Steps to Deploy Storage Rules

### Option 1: Using Firebase CLI (Recommended)
1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init storage
   ```

4. Deploy the storage rules:
   ```bash
   firebase deploy --only storage
   ```

### Option 2: Manual Deployment
1. Go to your Firebase Console
2. Navigate to Storage → Rules
3. Replace the existing rules with the content from `storage.rules`
4. Click "Publish"

## What Changed

### 1. Firebase Configuration (`firebaseConfig.ts`)
- Fixed storage bucket URL from `.appspot.com` to `.firebasestorage.app`

### 2. Storage Service (`services/storageService.ts`)
- Added detailed logging for debugging
- Improved error handling with specific error messages
- Better error categorization

### 3. Database Screen (`screens/DatabaseScreen.tsx`)
- Enhanced error messages
- Added file details logging
- Better user feedback

### 4. Storage Rules (`storage.rules`)
- Allow authenticated users to upload to their own directory
- Secure by default - deny all other access
- Structure: `users/{userId}/documents/{filename}`

## Testing the Upload

After deploying the rules:
1. Try uploading an Excel file
2. Check the console logs for detailed information
3. Verify the file appears in Firebase Storage console
4. The file should be stored at: `users/{your-user-id}/documents/{filename}`

## Troubleshooting

If upload still fails:
1. Check console logs for specific error messages
2. Verify you're logged in to the app
3. Ensure Firebase Storage is enabled in your project
4. Check if the file size is within limits (usually 5GB per file)

## File Structure in Storage
```
users/
  {userId}/
    documents/
      excel-file-1.xlsx
      excel-file-2.xls
    images/
      profile-picture.jpg
    rcm_data/
      rcm-program-data.xlsx
``` 