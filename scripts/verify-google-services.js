#!/usr/bin/env node

/**
 * Google Services Configuration Verification Script
 * Run this locally to verify your GOOGLE_SERVICES_JSON environment variable
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Google Services Configuration Verification');
console.log('==============================================');

// Check if environment variable exists
const googleServicesEnv = process.env.GOOGLE_SERVICES_JSON;

if (!googleServicesEnv) {
  console.error('❌ GOOGLE_SERVICES_JSON environment variable not found');
  console.log('💡 Set it with: export GOOGLE_SERVICES_JSON="your-json-content-here"');
  process.exit(1);
}

console.log(`✅ GOOGLE_SERVICES_JSON environment variable found`);
console.log(`📏 Length: ${googleServicesEnv.length} characters`);
console.log(`📝 First 100 chars: ${googleServicesEnv.substring(0, 100)}...`);

// Try to parse as JSON
try {
  const parsed = JSON.parse(googleServicesEnv);

  console.log('✅ Successfully parsed as JSON');
  console.log(`📱 Project ID: ${parsed.project_id || 'MISSING'}`);
  console.log(`🔢 Project Number: ${parsed.project_number || 'MISSING'}`);
  console.log(
    `📦 Package Name: ${parsed.client?.[0]?.android_client_info?.package_name || 'MISSING'}`
  );

  // Validate required fields
  const requiredFields = ['project_id', 'project_number', 'client'];
  let isValid = true;

  for (const field of requiredFields) {
    if (!parsed[field]) {
      console.error(`❌ Missing required field: ${field}`);
      isValid = false;
    }
  }

  if (isValid) {
    console.log('🎉 Google Services JSON is valid and ready for EAS builds!');

    // Write a test file to verify it works
    const testDir = path.join(__dirname, '..', 'temp');
    const testFile = path.join(testDir, 'test-google-services.json');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(testFile, JSON.stringify(parsed, null, 2));
    console.log(`✅ Test file created: ${testFile}`);
    console.log(`📊 File size: ${fs.statSync(testFile).size} bytes`);

    // Clean up
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
    console.log('🧹 Cleaned up test files');
  } else {
    console.error('❌ Google Services JSON is invalid - missing required fields');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to parse GOOGLE_SERVICES_JSON as JSON');
  console.error(`   Error: ${error.message}`);
  console.log('');
  console.log('💡 Common issues and solutions:');
  console.log('   1. If you copied a file path instead of JSON content:');
  console.log('      - Open your google-services.json file');
  console.log('      - Copy the ENTIRE JSON content (starts with { and ends with })');
  console.log('      - Set the environment variable to that content');
  console.log('');
  console.log('   2. If the JSON has syntax errors:');
  console.log('      - Validate your JSON at https://jsonlint.com/');
  console.log('      - Ensure all quotes are properly escaped');
  console.log('');
  console.log('   3. Example of correct format:');
  console.log(
    '      export GOOGLE_SERVICES_JSON=\'{"project_info":{"project_number":"123",...}}\''
  );

  process.exit(1);
}

console.log('');
console.log('🚀 Verification complete! Your configuration should work in EAS builds.');
