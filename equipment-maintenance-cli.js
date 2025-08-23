#!/usr/bin/env node

/**
 * Equipment Maintenance Data CLI
 * This script displays the equipment maintenance data from your uploaded Excel file
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Equipment Maintenance Data Viewer');
console.log('=====================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project root directory');
  process.exit(1);
}

// Check if the component files exist
const componentPath = path.join(__dirname, 'components', 'EquipmentMaintenanceData.tsx');
const screenPath = path.join(__dirname, 'screens', 'EquipmentMaintenanceScreen.tsx');

if (!fs.existsSync(componentPath)) {
  console.error('❌ Error: EquipmentMaintenanceData component not found');
  process.exit(1);
}

if (!fs.existsSync(screenPath)) {
  console.error('❌ Error: EquipmentMaintenanceScreen not found');
  process.exit(1);
}

console.log('✅ Equipment maintenance components found');
console.log('📱 To view your equipment maintenance data:');
console.log('');
console.log('1. Start the development server:');
console.log('   npm start');
console.log('');
console.log('2. Navigate to the Equipment Maintenance screen in your app');
console.log('');
console.log('3. The app will automatically:');
console.log('   - Load your latest uploaded Excel file');
console.log('   - Analyze equipment maintenance data');
console.log('   - Display equipment types and their occurrence counts');
console.log('');
console.log('📊 The data will show:');
console.log('   - Compressor maintenance/replacement counts');
console.log('   - Unit (AC/HVAC) maintenance counts');
console.log('   - Coil maintenance counts');
console.log('   - Motor maintenance counts');
console.log('   - Filter cleaning/replacement counts');
console.log('');
console.log('🔄 You can refresh the data anytime using the refresh button');
console.log('');
console.log('💡 If no equipment data is found, make sure your Excel file contains:');
console.log('   - Action columns with equipment-related text');
console.log('   - Description columns with maintenance details');
console.log('   - Keywords like "compressor", "unit", "coil", "motor", "filter"');
console.log('');

// Check if there are any existing dashboard files
try {
  const files = fs.readdirSync(path.join(__dirname, 'services'));
  const hasDashboardService = files.some(file => file.includes('dashboard'));
  
  if (hasDashboardService) {
    console.log('✅ Dashboard services are available');
    console.log('📈 Your equipment maintenance data will be displayed in charts and tables');
  }
} catch (error) {
  console.log('⚠️  Could not verify dashboard services');
}

console.log('🚀 Ready to view your equipment maintenance data!');
console.log('');
console.log('Press Ctrl+C to exit');

