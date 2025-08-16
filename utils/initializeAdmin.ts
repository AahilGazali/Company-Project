import { AdminService } from '../services/adminService';

/**
 * Initialize admin credentials in Firebase
 * This should be called once when setting up the app
 */
export const initializeAdminCredentials = async () => {
  try {
    console.log('Initializing admin credentials...');
    
    // Check if credentials already exist
    const hasCredentials = await AdminService.hasAdminCredentials();
    
    if (!hasCredentials) {
      console.log('No admin credentials found, creating default ones...');
      // Set default credentials
      await AdminService.setInitialAdminCredentials(
        'admin@gmail.com',
        '123456'
      );
      console.log('Admin credentials initialized successfully');
    } else {
      console.log('Admin credentials already exist, skipping initialization');
    }
  } catch (error) {
    console.error('Failed to initialize admin credentials:', error);
    // Don't throw error to prevent app crash
  }
};

/**
 * Update admin credentials
 * This can be called from the admin settings
 */
export const updateAdminCredentials = async (email: string, password: string) => {
  try {
    await AdminService.updateAdminCredentials(email, password);
    console.log('Admin credentials updated successfully');
    return true;
  } catch (error) {
    console.error('Failed to update admin credentials:', error);
    return false;
  }
};

/**
 * Get current admin credentials
 */
export const getCurrentAdminCredentials = async () => {
  try {
    return await AdminService.getAdminCredentials();
  } catch (error) {
    console.error('Failed to get admin credentials:', error);
    return null;
  }
};
