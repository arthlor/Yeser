#!/usr/bin/env node

/**
 * Build Validation Script for Yeşer App
 *
 * This script validates the build environment and configuration
 * before allowing builds to proceed, ensuring a professional
 * and error-free build process.
 */

// Load environment variables from .env file for local development
const isEASBuild = process.env.EAS_BUILD === 'true' || process.env.CI === 'true';

if (!isEASBuild) {
  try {
    require('dotenv').config();
    console.log('🔧 Loaded environment variables from .env file');
  } catch (error) {
    console.log('🔧 No .env file found or dotenv not available, using process.env directly');
  }
}

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Validation functions
function validateEnvironmentVariables(environment) {
  const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

  const recommended = [
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB',
  ];

  let hasErrors = false;
  let hasWarnings = false;

  logInfo(`Validating environment variables for ${environment} environment...`);

  // Check required variables
  for (const varName of required) {
    if (!process.env[varName]) {
      logError(`Missing required environment variable: ${varName}`);
      hasErrors = true;
    } else {
      logSuccess(`${varName} is configured`);
    }
  }

  // Check recommended variables
  for (const varName of recommended) {
    if (!process.env[varName]) {
      logWarning(`Missing recommended environment variable: ${varName}`);
      hasWarnings = true;
    } else {
      logSuccess(`${varName} is configured`);
    }
  }

  return { hasErrors, hasWarnings };
}

function validateFileStructure() {
  logInfo('Validating file structure...');

  const requiredFiles = [
    'package.json',
    'app.config.js',
    'eas.json',
    'src/utils/config.ts',
    'src/App.tsx',
  ];

  let hasErrors = false;

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      logError(`Missing required file: ${file}`);
      hasErrors = true;
    } else {
      logSuccess(`${file} exists`);
    }
  }

  return { hasErrors };
}

function validateDependencies() {
  logInfo('Validating dependencies...');

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'expo',
      'react',
      'react-native',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'zustand',
      'zod',
    ];

    let hasErrors = false;

    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep]) {
        logError(`Missing required dependency: ${dep}`);
        hasErrors = true;
      } else {
        logSuccess(`${dep} is installed`);
      }
    }

    return { hasErrors };
  } catch (error) {
    logError('Failed to read package.json');
    return { hasErrors: true };
  }
}

function validateEASConfiguration() {
  logInfo('Validating EAS configuration...');

  try {
    const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
    let hasErrors = false;

    // Check required build profiles
    const requiredProfiles = ['development', 'preview', 'production'];
    for (const profile of requiredProfiles) {
      if (!easConfig.build[profile]) {
        logError(`Missing EAS build profile: ${profile}`);
        hasErrors = true;
      } else {
        logSuccess(`EAS build profile '${profile}' exists`);
      }
    }

    // Check submit configuration
    if (!easConfig.submit) {
      logWarning('Missing EAS submit configuration');
    } else {
      logSuccess('EAS submit configuration exists');
    }

    return { hasErrors };
  } catch (error) {
    logError('Failed to read eas.json');
    return { hasErrors: true };
  }
}

function validateTypeScript() {
  logInfo('Validating TypeScript configuration...');

  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    logError('Missing tsconfig.json');
    return { hasErrors: true };
  }

  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

    // Check for strict mode
    if (!tsConfig.compilerOptions?.strict) {
      logWarning('TypeScript strict mode is not enabled');
    } else {
      logSuccess('TypeScript strict mode is enabled');
    }

    return { hasErrors: false };
  } catch (error) {
    logError('Invalid tsconfig.json format');
    return { hasErrors: true };
  }
}

function generateBuildReport(environment, results) {
  log('\n' + '='.repeat(60), colors.cyan);
  log(`BUILD VALIDATION REPORT - ${environment.toUpperCase()}`, colors.cyan);
  log('='.repeat(60), colors.cyan);

  const totalErrors = Object.values(results).reduce(
    (sum, result) => sum + (result.hasErrors ? 1 : 0),
    0
  );
  const totalWarnings = Object.values(results).reduce(
    (sum, result) => sum + (result.hasWarnings ? 1 : 0),
    0
  );

  if (totalErrors === 0) {
    logSuccess('✅ BUILD VALIDATION PASSED');
    log('Your build is ready to proceed!', colors.green);
  } else {
    logError('❌ BUILD VALIDATION FAILED');
    log(`Found ${totalErrors} error(s) that must be fixed before building.`, colors.red);
  }

  if (totalWarnings > 0) {
    logWarning(`Found ${totalWarnings} warning(s) that should be addressed.`);
  }

  log('\n' + '='.repeat(60), colors.cyan);

  return totalErrors === 0;
}

// Main validation function
function main() {
  const environment = process.env.EXPO_PUBLIC_ENV || 'development';

  log('🔍 Starting build validation...', colors.cyan);
  log(`Environment: ${environment}`, colors.blue);

  const results = {
    environment: validateEnvironmentVariables(environment),
    fileStructure: validateFileStructure(),
    dependencies: validateDependencies(),
    easConfig: validateEASConfiguration(),
    typescript: validateTypeScript(),
  };

  const passed = generateBuildReport(environment, results);

  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentVariables,
  validateFileStructure,
  validateDependencies,
  validateEASConfiguration,
  validateTypeScript,
};
