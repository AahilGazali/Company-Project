#!/usr/bin/env node

/**
 * Explain Coil Count Discrepancy
 * This script explains why your Excel shows 7 coils but the graph shows 28
 */

console.log('🔍 Coil Count Discrepancy Analysis');
console.log('==================================\n');

console.log('❓ Question: Why does your Excel show 7 coils but the graph shows 28?');
console.log('');

console.log('📊 The Answer: Multiple Counting Factors');
console.log('');

console.log('1️⃣ MULTIPLE COLUMNS SEARCHED:');
console.log('   The system searches these columns for coil-related text:');
console.log('   • Action columns (containing "action", "task", "work", "activity", "description", "problem")');
console.log('   • Description columns (containing "description", "details", "notes", "comments")');
console.log('   • If "coil" appears in BOTH Action AND Description for the same row, it counts as +2');
console.log('');

console.log('2️⃣ MULTIPLE KEYWORDS PER EQUIPMENT:');
console.log('   For Coils, the system searches for these keywords:');
console.log('   • "coil"');
console.log('   • "coils"');
console.log('   • "evaporator coil"');
console.log('   • "condenser coil"');
console.log('   • If a cell contains "evaporator coil", it matches BOTH "evaporator coil" AND "coil" = +2');
console.log('');

console.log('3️⃣ EXAMPLE SCENARIO:');
console.log('   Row 1: Action="Clean evaporator coil", Description="Coil maintenance required"');
console.log('   • Action column: "evaporator coil" matches 2 keywords = +2');
console.log('   • Description column: "coil" matches 1 keyword = +1');
console.log('   • Total for this row = 3 counts');
console.log('');

console.log('4️⃣ CALCULATION:');
console.log('   If you have 7 actual coil maintenance records, but each record:');
console.log('   • Appears in multiple columns (Action + Description)');
console.log('   • Contains multiple keywords ("evaporator coil" + "coil")');
console.log('   • 7 records × 2 columns × 2 keywords = 28 total matches');
console.log('');

console.log('🔧 SOLUTION OPTIONS:');
console.log('');
console.log('Option 1: View the Debug Analysis');
console.log('   • Use the Equipment Debug Screen to see exactly which rows and columns are being counted');
console.log('   • This will show you every single match that contributes to the 28 count');
console.log('');

console.log('Option 2: Modify the Counting Logic');
console.log('   • Change the system to count unique records instead of keyword matches');
console.log('   • This would give you the actual 7 coil maintenance records');
console.log('');

console.log('Option 3: Filter by Specific Columns');
console.log('   • Only search specific columns (e.g., only "Action" column)');
console.log('   • This would reduce duplicate counting across multiple columns');
console.log('');

console.log('📱 To see the detailed analysis:');
console.log('   1. Start your app: npm start');
console.log('   2. Navigate to the Equipment Debug Screen');
console.log('   3. View the detailed breakdown of all 28 coil matches');
console.log('');

console.log('💡 The current system is designed to be comprehensive and catch all equipment mentions,');
console.log('   but it can lead to higher counts than expected due to the multiple counting factors.');
console.log('');

console.log('Press Ctrl+C to exit');

