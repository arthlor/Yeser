#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Yeşer Production Readiness Validation\n');

const errors = [];
const warnings = [];

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${description}: ${filePath}`);
    return false;
  }
  return true;
}

function runCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe' });
    log(colors.green, '✓', `${description} - PASSED`);
    return true;
  } catch (error) {
    errors.push(`${description} failed: ${error.message}`);
    return false;
  }
}

// 1. Environment Variables Check
console.log(`${colors.bold}${colors.blue}1. Environment Variables${colors.reset}`);
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_APP_NAME',
];

const envFile = '.env';
if (checkFileExists(envFile, '.env file')) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  requiredEnvVars.forEach((envVar) => {
    if (envContent.includes(`${envVar}=`)) {
      log(colors.green, '✓', `${envVar} - FOUND`);
    } else {
      errors.push(`Missing environment variable: ${envVar}`);
    }
  });
} else {
  errors.push('Missing .env file');
}

// 2. Critical Files Check
console.log(`\n${colors.bold}${colors.blue}2. Critical Files${colors.reset}`);
const criticalFiles = [
  ['package.json', 'Package configuration'],
  ['app.config.js', 'App configuration'],
  ['eas.json', 'EAS Build configuration'],
  ['index.ts', 'App entry point'],
  ['src/App.tsx', 'Main app component'],
  ['firebase.json', 'Firebase configuration'],
];

criticalFiles.forEach(([file, desc]) => {
  if (checkFileExists(file, desc)) {
    log(colors.green, '✓', `${desc} - EXISTS`);
  }
});

// 3. Check for Production Blockers
console.log(`\n${colors.bold}${colors.blue}3. Production Blockers${colors.reset}`);

// Check for expo-dev-client import in index.ts (known issue)
if (fs.existsSync('index.ts')) {
  const indexContent = fs.readFileSync('index.ts', 'utf8');
  if (indexContent.includes("import 'expo-dev-client'")) {
    errors.push(
      'CRITICAL: Found expo-dev-client import in index.ts - will cause production APK to hang'
    );
  } else {
    log(colors.green, '✓', 'No expo-dev-client import found in index.ts');
  }
}

// Check app.config.js for proper scheme
if (fs.existsSync('app.config.js')) {
  const configContent = fs.readFileSync('app.config.js', 'utf8');
  if (configContent.includes('scheme:') && configContent.includes('yeser')) {
    log(colors.green, '✓', 'Deep link scheme configured for auth callbacks');
  } else {
    warnings.push('Deep link scheme may not be properly configured for magic link auth');
  }
}

// 4. TypeScript & ESLint Check
console.log(`\n${colors.bold}${colors.blue}4. Code Quality${colors.reset}`);
runCommand('npx tsc --noEmit', 'TypeScript compilation');
runCommand('npx eslint . --ext .ts,.tsx --max-warnings 0', 'ESLint validation');

// 5. Bundle Analysis
console.log(`\n${colors.bold}${colors.blue}5. Bundle Analysis${colors.reset}`);
try {
  // Create a temporary production bundle to analyze
  execSync('npx expo export --platform android,ios --output-dir ./temp-export', { stdio: 'pipe' });

  // Check bundle size
  const bundleStats = fs.statSync('./temp-export/_expo/static/js/web/index-*.js'.replace('*', ''));
  const bundleSizeMB = (bundleStats.size / 1024 / 1024).toFixed(2);

  if (bundleSizeMB < 5) {
    log(colors.green, '✓', `Bundle size: ${bundleSizeMB}MB - GOOD`);
  } else if (bundleSizeMB < 10) {
    log(colors.yellow, '⚠', `Bundle size: ${bundleSizeMB}MB - ACCEPTABLE`);
    warnings.push(`Bundle size is ${bundleSizeMB}MB - consider optimization`);
  } else {
    errors.push(`Bundle size is ${bundleSizeMB}MB - TOO LARGE for production`);
  }

  // Cleanup
  fs.rmSync('./temp-export', { recursive: true, force: true });
} catch (error) {
  warnings.push('Could not analyze bundle size');
}

// 6. Asset Validation
console.log(`\n${colors.bold}${colors.blue}6. Assets${colors.reset}`);
const assetDirs = ['src/assets', 'assets'];
assetDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    log(colors.green, '✓', `${dir} directory exists`);
  }
});

// Check for app icon
const iconPaths = ['src/assets/assets/icon.png', 'src/assets/assets/adaptive-icon.png'];
iconPaths.forEach((iconPath) => {
  if (fs.existsSync(iconPath)) {
    log(colors.green, '✓', `App icon found: ${iconPath}`);
  } else {
    warnings.push(`App icon not found: ${iconPath}`);
  }
});

// Check for splash animation
if (fs.existsSync('src/assets/animations/splash.json')) {
  log(colors.green, '✓', 'Splash animation found: src/assets/animations/splash.json');
} else {
  warnings.push('Splash animation not found: src/assets/animations/splash.json');
}

// Check for notification assets
const notificationAssets = [
  'src/assets/assets/notification-icon.png',
  'src/assets/assets/sounds/notification_sound.wav',
];
notificationAssets.forEach((assetPath) => {
  if (fs.existsSync(assetPath)) {
    log(colors.green, '✓', `Notification asset found: ${assetPath}`);
  } else {
    warnings.push(`Notification asset not found: ${assetPath}`);
  }
});

// 7. Final Report
console.log(`\n${colors.bold}${colors.blue}📊 VALIDATION REPORT${colors.reset}`);

if (errors.length === 0 && warnings.length === 0) {
  log(colors.green, '🎉', 'ALL CHECKS PASSED - READY FOR PRODUCTION BUILD!');
  console.log(`\n${colors.green}${colors.bold}Next steps:${colors.reset}`);
  console.log('1. Run local production build test (see commands below)');
  console.log('2. Test authentication flows');
  console.log('3. Submit to EAS Build with confidence!');
} else {
  if (errors.length > 0) {
    log(colors.red, '❌', `${errors.length} CRITICAL ERRORS - MUST FIX BEFORE BUILD:`);
    errors.forEach((error) => console.log(`   ${colors.red}• ${error}${colors.reset}`));
  }

  if (warnings.length > 0) {
    log(colors.yellow, '⚠️', `${warnings.length} WARNINGS - RECOMMEND FIXING:`);
    warnings.forEach((warning) => console.log(`   ${colors.yellow}• ${warning}${colors.reset}`));
  }

  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ NOT READY FOR PRODUCTION BUILD${colors.reset}`);
    process.exit(1);
  } else {
    console.log(
      `\n${colors.yellow}${colors.bold}⚠️ READY WITH WARNINGS - PROCEED WITH CAUTION${colors.reset}`
    );
  }
}
