#!/usr/bin/env node

/**
 * Pre-build Environment Validation Script
 * 
 * This script validates that all required environment variables are present
 * before the build process starts. This prevents deployment failures due to
 * missing configuration.
 * 
 * Usage: node scripts/validate-env.js [environment]
 * Environment: development, preview, production (default: production)
 */

const fs = require('fs');
const path = require('path');

// Define required environment variables for each build type
const REQUIRED_ENV_VARS = {
  development: [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_LOG_LEVEL',
  ],
  preview: [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_LOG_LEVEL',
    'EXPO_PUBLIC_ENVIRONMENT',
  ],
  production: [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_LOG_LEVEL',
    'EXPO_PUBLIC_ENVIRONMENT',
    'EXPO_PUBLIC_ANALYTICS_ENABLED',
  ],
};

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  EXPO_PUBLIC_LOG_LEVEL: 'warn',
  EXPO_PUBLIC_ENVIRONMENT: 'production',
  EXPO_PUBLIC_ANALYTICS_ENABLED: 'true',
};

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return envVars;
  }
  return {};
}

function validateEnvironment(buildType = 'production') {
  console.log(`🔍 Validating environment variables for ${buildType} build...`);
  
  // Load .env file
  const envFileVars = loadEnvFile();
  
  // Combine process.env with .env file variables
  const allEnvVars = { ...envFileVars, ...process.env };
  
  const requiredVars = REQUIRED_ENV_VARS[buildType] || REQUIRED_ENV_VARS.production;
  const missingVars = [];
  const presentVars = [];
  
  // Check required variables
  requiredVars.forEach(varName => {
    const value = allEnvVars[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    } else {
      presentVars.push(varName);
    }
  });
  
  // Report results
  console.log(`✅ Found ${presentVars.length} required environment variables:`);
  presentVars.forEach(varName => {
    const value = allEnvVars[varName];
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`   ${varName}=${displayValue}`);
  });
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing ${missingVars.length} required environment variables:`);
    missingVars.forEach(varName => {
      const defaultValue = OPTIONAL_ENV_VARS[varName];
      if (defaultValue) {
        console.error(`   ${varName} (will use default: ${defaultValue})`);
      } else {
        console.error(`   ${varName} (REQUIRED)`);
      }
    });
    
    // Only fail if there are truly required variables missing (no defaults)
    const criticalMissing = missingVars.filter(varName => !OPTIONAL_ENV_VARS[varName]);
    if (criticalMissing.length > 0) {
      console.error('\n💥 Build cannot proceed without these critical environment variables.');
      console.error('Please create a .env file or set these environment variables:');
      criticalMissing.forEach(varName => {
        console.error(`   export ${varName}="your_value_here"`);
      });
      process.exit(1);
    } else {
      console.warn('\n⚠️  Some optional environment variables are missing but have defaults.');
      console.warn('Consider setting them explicitly for better control.');
    }
  }
  
  // Validate specific values
  const environment = allEnvVars.EXPO_PUBLIC_ENVIRONMENT;
  if (environment && !['development', 'staging', 'production'].includes(environment)) {
    console.error(`❌ Invalid EXPO_PUBLIC_ENVIRONMENT value: ${environment}`);
    console.error('   Must be one of: development, staging, production');
    process.exit(1);
  }
  
  const logLevel = allEnvVars.EXPO_PUBLIC_LOG_LEVEL;
  if (logLevel && !['debug', 'info', 'warn', 'error', 'silent'].includes(logLevel)) {
    console.error(`❌ Invalid EXPO_PUBLIC_LOG_LEVEL value: ${logLevel}`);
    console.error('   Must be one of: debug, info, warn, error, silent');
    process.exit(1);
  }
  
  console.log(`\n🎉 Environment validation passed for ${buildType} build!`);
  console.log('Build can proceed safely.\n');
}

// Main execution
const buildType = process.argv[2] || 'production';

if (!REQUIRED_ENV_VARS[buildType]) {
  console.error(`❌ Unknown build type: ${buildType}`);
  console.error('Available build types:', Object.keys(REQUIRED_ENV_VARS).join(', '));
  process.exit(1);
}

try {
  validateEnvironment(buildType);
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
} 