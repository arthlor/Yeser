/**
 * @fileoverview Bulletproof Expo config plugin for handling Google Services
 * This file runs in Node.js environment during build time
 * Handles: file paths, raw JSON, base64 content, and comprehensive error handling
 */

/* eslint-disable */

const { withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Bulletproof function to get Google Services JSON content
 * Handles multiple input formats and provides detailed debugging
 */
function getGoogleServicesContent(envValue, projectRoot) {
  console.log('🔍 [Google Services] Analyzing environment variable...');
  console.log(`📝 [Google Services] Variable length: ${envValue?.length || 0} characters`);
  console.log(
    `📝 [Google Services] First 50 chars: ${envValue?.substring(0, 50) || 'undefined'}...`
  );

  // Strategy 1: Check if it's a file path
  if (envValue.startsWith('/') || envValue.includes('google-services')) {
    console.log('🔍 [Google Services] Detected file path format');

    // Try absolute path first
    if (fs.existsSync(envValue)) {
      console.log(`✅ [Google Services] Reading from absolute path: ${envValue}`);
      const content = fs.readFileSync(envValue, 'utf8');
      return JSON.parse(content);
    }

    // Try relative to project root
    const relativePath = path.join(projectRoot, envValue);
    if (fs.existsSync(relativePath)) {
      console.log(`✅ [Google Services] Reading from relative path: ${relativePath}`);
      const content = fs.readFileSync(relativePath, 'utf8');
      return JSON.parse(content);
    }

    // Try common locations
    const commonPaths = [
      path.join(projectRoot, 'google-services.json'),
      path.join(projectRoot, 'android', 'app', 'google-services.json'),
      path.join(projectRoot, '.firebase-backup', 'google-services.json'),
    ];

    for (const commonPath of commonPaths) {
      if (fs.existsSync(commonPath)) {
        console.log(`✅ [Google Services] Found at common location: ${commonPath}`);
        const content = fs.readFileSync(commonPath, 'utf8');
        return JSON.parse(content);
      }
    }

    throw new Error(
      `File not found at path: ${envValue}. Tried absolute, relative, and common locations.`
    );
  }

  // Strategy 2: Check if it's base64 encoded
  if (!envValue.includes('{') && envValue.length > 100) {
    console.log('🔍 [Google Services] Detected potential base64 format');
    try {
      const decoded = Buffer.from(envValue, 'base64').toString('utf8');
      if (decoded.includes('{') && decoded.includes('project_id')) {
        console.log('✅ [Google Services] Successfully decoded base64 content');
        return JSON.parse(decoded);
      }
    } catch (error) {
      console.log('❌ [Google Services] Base64 decode failed, trying raw JSON');
    }
  }

  // Strategy 3: Try as raw JSON
  console.log('🔍 [Google Services] Attempting to parse as raw JSON');
  try {
    const parsed = JSON.parse(envValue);
    if (parsed.project_id) {
      console.log('✅ [Google Services] Successfully parsed raw JSON');
      return parsed;
    } else {
      throw new Error('Parsed JSON but missing required project_id field');
    }
  } catch (error) {
    throw new Error(`Failed to parse as JSON: ${error.message}`);
  }
}

/**
 * Bulletproof Google Services plugin with comprehensive error handling
 */
function withGoogleServices(config) {
  return withAndroidManifest(config, async (config) => {
    const googleServicesEnv = process.env.GOOGLE_SERVICES_JSON;
    const isEASBuild = process.env.EAS_BUILD === 'true';

    console.log('🚀 [Google Services] Plugin starting...');
    console.log(`📍 [Google Services] EAS Build: ${isEASBuild}`);
    console.log(`📍 [Google Services] Environment variable exists: ${!!googleServicesEnv}`);

    if (!isEASBuild) {
      console.log('⏭️  [Google Services] Skipping - not an EAS build');
      return config;
    }

    if (!googleServicesEnv) {
      console.warn('⚠️  [Google Services] GOOGLE_SERVICES_JSON environment variable not found');
      console.warn(
        '💡 [Google Services] Set this in EAS Console with your google-services.json content'
      );
      return config;
    }

    try {
      // Get the JSON content using our bulletproof method
      const googleServicesContent = getGoogleServicesContent(
        googleServicesEnv,
        config.modRequest.projectRoot
      );

      // Debug: Show what fields are actually present
      console.log('🔍 [Google Services] Analyzing parsed JSON structure:');
      console.log(
        `   📋 Available top-level fields: ${Object.keys(googleServicesContent).join(', ')}`
      );

      if (googleServicesContent.project_info) {
        console.log(
          `   📋 project_info fields: ${Object.keys(googleServicesContent.project_info).join(', ')}`
        );
      }

      // Validate required fields with detailed info
      const requiredFields = ['project_info', 'client'];
      const requiredProjectInfoFields = ['project_id', 'project_number'];

      // Check top-level fields
      for (const field of requiredFields) {
        if (!googleServicesContent[field]) {
          console.error(`❌ [Google Services] Missing top-level field: ${field}`);
          throw new Error(`Missing required top-level field: ${field}`);
        }
      }

      // Check project_info fields
      for (const field of requiredProjectInfoFields) {
        if (!googleServicesContent.project_info?.[field]) {
          console.error(`❌ [Google Services] Missing project_info.${field}`);
          console.log(
            `💡 [Google Services] Your JSON should have: {"project_info":{"${field}":"value"}}`
          );
          throw new Error(`Missing required field: project_info.${field}`);
        }
      }

      // Extract project info for logging
      const projectId = googleServicesContent.project_info.project_id;
      const projectNumber = googleServicesContent.project_info.project_number;

      console.log(
        `✅ [Google Services] Validated content for project: ${projectId} (${projectNumber})`
      );

      // Create the android directory structure
      const androidDir = path.join(config.modRequest.projectRoot, 'android');
      const appDir = path.join(androidDir, 'app');

      if (!fs.existsSync(androidDir)) {
        fs.mkdirSync(androidDir, { recursive: true });
        console.log('📁 [Google Services] Created android directory');
      }
      if (!fs.existsSync(appDir)) {
        fs.mkdirSync(appDir, { recursive: true });
        console.log('📁 [Google Services] Created android/app directory');
      }

      // Write the google-services.json file
      const googleServicesPath = path.join(appDir, 'google-services.json');
      fs.writeFileSync(googleServicesPath, JSON.stringify(googleServicesContent, null, 2));

      console.log('🎉 [Google Services] Successfully created google-services.json');
      console.log(`📍 [Google Services] File location: ${googleServicesPath}`);
      console.log(`📊 [Google Services] File size: ${fs.statSync(googleServicesPath).size} bytes`);
    } catch (error) {
      console.error('❌ [Google Services] Plugin failed with detailed error:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Project Root: ${config.modRequest.projectRoot}`);
      console.error(`   Environment Variable Type: ${typeof googleServicesEnv}`);
      console.error('💡 [Google Services] Troubleshooting:');
      console.error(
        '   1. Ensure GOOGLE_SERVICES_JSON contains actual JSON content (not a file path)'
      );
      console.error('   2. If using a file path, make sure the file exists and is accessible');
      console.error('   3. Verify the JSON is valid and contains required Firebase fields');
      console.error('   4. Check EAS Console environment variable configuration');

      throw new Error(`Google Services Plugin Error: ${error.message}`);
    }

    return config;
  });
}

module.exports = withGoogleServices;
