# Firebase Rules Setup Guide

## Issue Fixed
The upload error was caused by missing Firestore security rules. The app was trying to save file metadata to Firestore but didn't have permission.

## What Was Added
1. **Firestore Security Rules** (`firestore.rules`)
2. **Updated Firebase Configuration** (`firebase.json`)
3. **Fixed Storage Path Issue** (StorageService.ts)

## How to Deploy the Rules

### Option 1: Using Firebase Console (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `company-project-4f00b`
3. Navigate to **Firestore Database** → **Rules**
4. Copy and paste the rules from `firestore.rules` file
5. Click **Publish**

### Option 2: Using Firebase CLI
```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy the rules
firebase deploy --only firestore:rules
```

## Firestore Rules Explanation

The new rules allow:
- ✅ Users to manage their own user profile data
- ✅ Users to manage their own RCM programs
- ✅ Users to manage their own queries
- ✅ **Users to manage their own imported files** (NEW)
- ❌ Users cannot access other users' data

## Rules Content
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can manage their own imported files
    match /importedFiles/{document} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == request.resource.data.userId);
    }
    
    // Other collections...
  }
}
```

## Testing the Fix

After deploying the rules:
1. Try importing an Excel file again
2. The file should upload successfully
3. The file metadata should save to Firestore
4. You should see the file in "My Imported Files" section
5. The file should persist after logout/login

## Troubleshooting

### If you still get permission errors:
1. **Check Firebase Console**: Make sure rules are published
2. **Check Authentication**: Make sure user is logged in
3. **Check Console Logs**: Look for detailed error messages
4. **Try Logout/Login**: Refresh the authentication token

### If storage path issues persist:
- The storage path duplication has been fixed in `StorageService.ts`
- Files should now upload to: `users/{userId}/documents/{filename}`
- Not: `users/{userId}/documents/{filename}/{filename}`

## Next Steps
Once the rules are deployed, your Excel file import feature will work completely:
- ✅ Files upload to Firebase Storage
- ✅ File metadata saves to Firestore
- ✅ Files persist across user sessions
- ✅ Users can view and manage their imported files

The error you saw should be resolved! 🎉
