/**
 * @fileoverview Expo config plugin for handling Google Services
 * This file runs in Node.js environment during build time
 */

/* eslint-disable */

const { withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom plugin to handle google-services.json from environment variable
 * This ensures Firebase works properly in EAS builds
 */
function withGoogleServices(config) {
  return withAndroidManifest(config, async (config) => {
    const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;

    if (googleServicesJson && process.env.EAS_BUILD === 'true') {
      try {
        // Parse the JSON to validate it
        const parsedJson = JSON.parse(googleServicesJson);

        // Create the android directory if it doesn't exist
        const androidDir = path.join(config.modRequest.projectRoot, 'android');
        const appDir = path.join(androidDir, 'app');

        if (!fs.existsSync(androidDir)) {
          fs.mkdirSync(androidDir, { recursive: true });
        }
        if (!fs.existsSync(appDir)) {
          fs.mkdirSync(appDir, { recursive: true });
        }

        // Write the google-services.json file
        const googleServicesPath = path.join(appDir, 'google-services.json');
        fs.writeFileSync(googleServicesPath, JSON.stringify(parsedJson, null, 2));

        console.log('✅ Successfully created google-services.json from environment variable');
      } catch (error) {
        console.error('❌ Failed to create google-services.json:', error.message);
        throw new Error(`Invalid GOOGLE_SERVICES_JSON environment variable: ${error.message}`);
      }
    } else if (process.env.EAS_BUILD === 'true') {
      console.warn('⚠️  GOOGLE_SERVICES_JSON environment variable not found in EAS build');
    }

    return config;
  });
}

module.exports = withGoogleServices;
