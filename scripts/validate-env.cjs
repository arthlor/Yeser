/* eslint-env node */
/* eslint-disable no-undef, no-unused-vars */

/**
 * Environment Validation Script for Yeşer App
 * 
 * This script validates that all required environment variables are set
 * before building the app for different environments (development, preview, production).
 * 
 * Usage: node scripts/validate-env.cjs [environment]
 * Example: node scripts/validate-env.cjs production
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const environment = process.argv[2] || 'development';
const isProduction = environment === 'production';
const isPreview = environment === 'preview';
const isDevelopment = environment === 'development';

console.log(`🔍 Validating environment variables for: ${environment}`);

// Required environment variables for all environments
const REQUIRED_BASE_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

// Additional required variables for production
const REQUIRED_PRODUCTION_VARS = [
  'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'EXPO_PUBLIC_SENTRY_DSN', // For error tracking
];

let hasErrors = false;
const warnings = [];

/**
 * Validate that a required environment variable is set
 */
function validateRequired(varName, customMessage) {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.error(`❌ REQUIRED: ${varName} is not set or is empty`);
    if (customMessage) {
      console.error(`   ${customMessage}`);
    }
    hasErrors = true;
    return false;
  }
  console.log(`✅ ${varName}: Set`);
  return true;
}

/**
 * Validate that a recommended environment variable is set
 */
function validateRecommended(varName, customMessage) {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    warnings.push(`⚠️  RECOMMENDED: ${varName} is not set${customMessage ? ` - ${customMessage}` : ''}`);
    return false;
  }
  console.log(`✅ ${varName}: Set`);
  return true;
}

/**
 * Validate URL format
 */
function validateUrl(varName, expectedProtocol = 'https') {
  const value = process.env[varName];
  if (!value) return false;
  
  try {
    const url = new URL(value);
    if (url.protocol !== `${expectedProtocol}:`) {
      console.error(`❌ ${varName}: Expected ${expectedProtocol}:// protocol, got ${url.protocol}`);
      hasErrors = true;
      return false;
    }
    console.log(`✅ ${varName}: Valid URL (${url.hostname})`);
    return true;
  } catch (error) {
    console.error(`❌ ${varName}: Invalid URL format`);
    hasErrors = true;
    return false;
  }
}

console.log('\n📋 Required Environment Variables:');
console.log('================================');

// Validate base required variables
REQUIRED_BASE_VARS.forEach(varName => {
  if (varName.includes('URL')) {
    validateUrl(varName);
  } else {
    validateRequired(varName);
  }
});

// Validate environment-specific variables
if (isProduction || isPreview) {
  console.log('\n📋 Production/Preview Variables:');
  console.log('================================');
  
  REQUIRED_PRODUCTION_VARS.forEach(varName => {
    validateRequired(varName, 'Required for Google OAuth to work properly');
  });
}

// Validate recommended variables
console.log('\n📋 Recommended Variables:');
console.log('=========================');

RECOMMENDED_VARS.forEach(varName => {
  switch (varName) {
    case 'EXPO_PUBLIC_SENTRY_DSN':
      validateRecommended(varName, 'For production error tracking');
      break;
    default:
      validateRecommended(varName);
  }
});

// Environment-specific validations
console.log('\n📋 Environment Configuration:');
console.log('=============================');

// Validate environment variable
const envVar = process.env.EXPO_PUBLIC_ENV;
if (envVar !== environment) {
  console.error(`❌ EXPO_PUBLIC_ENV should be "${environment}" but is "${envVar}"`);
  hasErrors = true;
} else {
  console.log(`✅ EXPO_PUBLIC_ENV: ${environment}`);
}

// Validate Supabase URL matches expected pattern
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  if (isProduction && supabaseUrl.includes('localhost')) {
    console.error('❌ Production build cannot use localhost Supabase URL');
    hasErrors = true;
  } else if (isProduction && !supabaseUrl.includes('supabase.co')) {
    warnings.push('⚠️  Production Supabase URL should typically use supabase.co domain');
  }
}

// Check for .env file existence
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at project root');
  console.error('   Create a .env file with the required environment variables');
  hasErrors = true;
} else {
  console.log('✅ .env file found');
}

// Display warnings
if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  console.log('=============');
  warnings.forEach(warning => console.log(warning));
}

// Final validation result
console.log('\n🎯 Validation Summary:');
console.log('======================');

if (hasErrors) {
  console.error(`❌ Environment validation failed for ${environment}`);
  console.error('   Please fix the errors above before building.');
  process.exit(1);
} else {
  console.log(`✅ Environment validation passed for ${environment}`);
  if (warnings.length > 0) {
    console.log(`   ${warnings.length} warning(s) - consider addressing for production readiness`);
  }
  console.log('   Ready to build! 🚀');
}

// Environment-specific build tips
if (isProduction) {
  console.log('\n💡 Production Build Tips:');
  console.log('=========================');
  console.log('• Ensure all secrets are set in EAS Secrets');
  console.log('• Verify App Store Connect credentials');
  console.log('• Test magic links with production URL scheme');
  console.log('• Configure Supabase production environment');
} 