# Admin Credentials Management System

This system allows administrators to store and update their login credentials directly in Firebase, eliminating the need for hardcoded credentials in the code.

## Features

- **Secure Storage**: Admin credentials are stored in Firebase Firestore
- **Dynamic Updates**: Admins can change their email and password from the settings screen
- **Automatic Initialization**: Default credentials are automatically set when the app starts
- **Real-time Updates**: All admin screens reflect the current credentials immediately

## How It Works

### 1. Initial Setup
When the app starts, it automatically checks if admin credentials exist in Firebase. If not, it creates default credentials:
- Email: `admin@gmail.com`
- Password: `123456`

### 2. Authentication Flow
- Admin login screen fetches credentials from Firebase
- Validates input against stored credentials
- Provides real-time feedback during login

### 3. Credential Updates
- Admins can access the credentials update modal from:
  - Settings screen → Profile card → Edit button
  - Settings screen → Security section → Change Password
- Updates are immediately saved to Firebase
- After updating, admin is redirected to login screen to use new credentials

## File Structure

```
services/
  adminService.ts          # Firebase operations for admin credentials
components/
  AdminCredentialsModal.tsx # Modal for updating credentials
screens/
  AdminLoginScreen.tsx     # Updated to use Firebase authentication
  AdminSettingsScreen.tsx  # Integrated with credentials modal
  AdminProfileScreen.tsx   # Shows current credentials
utils/
  initializeAdmin.ts       # Initialization utilities
```

## Firebase Structure

### Collection: `admin`
- Document: `admin_credentials`
- Fields:
  - `email`: string
  - `password`: string  
  - `lastUpdated`: timestamp

### Firestore Rules
```javascript
match /admin/{document=**} {
  allow read, write: if request.auth != null;
}
```

## Usage

### For Developers
1. The system automatically initializes on app startup
2. No manual configuration required
3. Credentials are stored securely in Firebase

### For Administrators
1. Login with current credentials
2. Navigate to Settings → Profile → Edit button
3. Update email and/or password
4. Confirm changes
5. Login again with new credentials

## Security Considerations

- Credentials are stored in Firebase (not in code)
- Access requires authentication
- Password validation (minimum 6 characters)
- Confirmation required for password changes
- Automatic logout after credential updates

## Troubleshooting

### Credentials Not Working
1. Check Firebase connection
2. Verify Firestore rules allow admin collection access
3. Check console for initialization errors

### Update Fails
1. Ensure all fields are filled
2. Verify passwords match
3. Check Firebase permissions
4. Ensure stable internet connection

## Future Enhancements

- Password strength requirements
- Email verification for credential changes
- Audit trail for credential updates
- Multi-factor authentication
- Role-based access control
