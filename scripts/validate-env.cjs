#!/usr/bin/env node

/**
 * Environment Validation Script for Yeşer App
 * Validates environment variables and configuration for different deployment environments
 */

const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Log with colors
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  
  switch (level) {
    case 'error':
      console.error(`${colors.red}${colors.bold}❌ ERROR:${colors.reset} ${colors.red}${message}${colors.reset}`);
      break;
    case 'warn':
      console.warn(`${colors.yellow}${colors.bold}⚠️  WARN:${colors.reset} ${colors.yellow}${message}${colors.reset}`);
      break;
    case 'info':
      console.info(`${colors.blue}${colors.bold}ℹ️  INFO:${colors.reset} ${colors.blue}${message}${colors.reset}`);
      break;
    case 'success':
      console.log(`${colors.green}${colors.bold}✅ SUCCESS:${colors.reset} ${colors.green}${message}${colors.reset}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

/**
 * Check if a required environment variable exists
 */
function checkEnvVar(name, required = true, environment = 'all') {
  const value = process.env[name];
  const exists = value && value.trim() !== '';
  
  if (required && !exists) {
    log('error', `Missing required environment variable: ${name} (for ${environment})`);
    return false;
  } else if (!exists) {
    log('warn', `Optional environment variable not set: ${name}`);
    return true; // Not required, so it's okay
  } else {
    log('info', `${name}: ${name.includes('KEY') || name.includes('SECRET') ? '***REDACTED***' : value}`);
    return true;
  }
}

/**
 * Check if a file exists
 */
function checkFile(filePath, description) {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    log('success', `${description}: ${filePath} ✓`);
    return true;
  } else {
    log('error', `Missing ${description}: ${filePath}`);
    return false;
  }
}

/**
 * Validate development environment
 */
function validateDevelopment() {
  log('info', '🔍 Validating Development Environment...');
  let valid = true;
  
  // Development environment variables (more lenient)
  valid &= checkEnvVar('EXPO_PUBLIC_SUPABASE_URL', false, 'development');
  valid &= checkEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', false, 'development');
  valid &= checkEnvVar('EXPO_PUBLIC_ENV', false, 'development');
  
  // Check development files
  valid &= checkFile('app.config.js', 'App Configuration');
  valid &= checkFile('package.json', 'Package Configuration');
  
  return valid;
}

/**
 * Validate preview environment
 */
function validatePreview() {
  log('info', '🔍 Validating Preview Environment...');
  let valid = true;
  
  // Preview environment variables
  valid &= checkEnvVar('EXPO_PUBLIC_SUPABASE_URL', true, 'preview');
  valid &= checkEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', true, 'preview');
  valid &= checkEnvVar('EXPO_PUBLIC_ENV', false, 'preview');
  
  // Build configuration
  valid &= checkFile('eas.json', 'EAS Build Configuration');
  valid &= checkFile('app.config.js', 'App Configuration');
  
  return valid;
}

/**
 * Validate production environment
 */
function validateProduction() {
  log('info', '🔍 Validating Production Environment...');
  let valid = true;
  
  // Production environment variables (all required)
  valid &= checkEnvVar('EXPO_PUBLIC_SUPABASE_URL', true, 'production');
  valid &= checkEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', true, 'production');
  valid &= checkEnvVar('EXPO_PUBLIC_ENV', true, 'production');
  
  // Build and deployment configuration
  valid &= checkFile('eas.json', 'EAS Build Configuration');
  valid &= checkFile('app.config.js', 'App Configuration');
  
  // Check for app icons and assets
  valid &= checkFile('src/assets/assets/icon.png', 'App Icon');
  valid &= checkFile('src/assets/assets/adaptive-icon.png', 'Android Adaptive Icon');
  valid &= checkFile('src/assets/assets/splash-icon.png', 'Splash Screen Icon');
  
  return valid;
}

/**
 * Validate EAS configuration
 */
function validateEASConfig() {
  try {
    const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
    
    // Check required profiles
    if (!easConfig.build) {
      log('error', 'EAS configuration missing build profiles');
      return false;
    }
    
    const requiredProfiles = ['development', 'preview', 'production'];
    for (const profile of requiredProfiles) {
      if (!easConfig.build[profile]) {
        log('error', `EAS configuration missing ${profile} build profile`);
        return false;
      }
    }
    
    log('success', 'EAS configuration is valid');
    return true;
  } catch (error) {
    log('error', `Failed to validate EAS configuration: ${error.message}`);
    return false;
  }
}

/**
 * Main validation function
 */
function main() {
  const environment = process.argv[2] || 'development';
  
  console.log(`${colors.cyan}${colors.bold}🚀 Yeşer Environment Validation${colors.reset}`);
  console.log(`${colors.cyan}Environment: ${environment}${colors.reset}`);
  console.log(`${colors.cyan}Working Directory: ${process.cwd()}${colors.reset}`);
  console.log('');
  
  let valid = true;
  
  // Common validations
  valid &= validateEASConfig();
  
  // Environment-specific validations
  switch (environment) {
    case 'development':
    case 'dev':
      valid &= validateDevelopment();
      break;
    case 'preview':
      valid &= validatePreview();
      break;
    case 'production':
    case 'prod':
      valid &= validateProduction();
      break;
    default:
      log('error', `Unknown environment: ${environment}`);
      valid = false;
  }
  
  console.log('');
  if (valid) {
    log('success', `🎉 Environment validation passed for ${environment}!`);
    log('info', 'Ready to proceed with build/deployment');
  } else {
    log('error', `❌ Environment validation failed for ${environment}`);
    log('error', 'Please fix the issues above before proceeding');
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateDevelopment,
  validatePreview,
  validateProduction,
  validateEASConfig,
  checkEnvVar,
  checkFile,
}; 