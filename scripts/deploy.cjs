#!/usr/bin/env node

/* eslint-disable no-undef, no-console, no-case-declarations */

/**
 * Deployment Management Script
 * 
 * This script provides an interactive CLI for managing deployments
 * across development, preview, and production environments.
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Execute command with error handling
const execCommand = (command, description) => {
  try {
    log.info(`${description}...`);
    execSync(command, { stdio: 'inherit' });
    log.success(`${description} completed successfully`);
    return true;
  } catch (error) {
    log.error(`${description} failed: ${error.message}`);
    return false;
  }
};

// Validate environment setup
const validateEnvironment = (env) => {
  log.info(`Validating ${env} environment...`);
  return execCommand(`npm run validate-env:${env}`, `Environment validation for ${env}`);
};

// Build functions
const buildDevelopment = () => {
  log.header('🛠️  Building Development Version');
  return execCommand('eas build --platform all --profile development --local', 'Development build');
};

const buildPreview = () => {
  log.header('🔍 Building Preview Version');
  return validateEnvironment('preview') && 
         execCommand('eas build --platform all --profile preview', 'Preview build');
};

const buildProduction = () => {
  log.header('🚀 Building Production Version');
  return validateEnvironment('prod') && 
         execCommand('eas build --platform all --profile production', 'Production build');
};

// Submit functions
const submitPreview = () => {
  log.header('📤 Submitting Preview to Internal Testing');
  return execCommand('eas submit --platform all --profile preview', 'Preview submission');
};

const submitProduction = () => {
  log.header('🏪 Submitting Production to App Stores');
  return execCommand('eas submit --platform all --profile production', 'Production submission');
};

// Update functions
const updatePreview = () => {
  return new Promise((resolve) => {
    rl.question('Enter update message for preview: ', (message) => {
      log.header('📱 Deploying Preview OTA Update');
      const success = execCommand(`eas update --branch preview --message "${message}"`, 'Preview OTA update');
      resolve(success);
    });
  });
};

const updateProduction = () => {
  return new Promise((resolve) => {
    rl.question('Enter update message for production: ', (message) => {
      log.header('🌟 Deploying Production OTA Update');
      const success = execCommand(`eas update --branch production --message "${message}"`, 'Production OTA update');
      resolve(success);
    });
  });
};

// Status functions
const checkBuildStatus = () => {
  log.header('📊 Recent Build Status');
  return execCommand('eas build:list --platform all --limit 10', 'Build status check');
};

const checkSubmissionStatus = () => {
  log.header('📋 Submission Status');
  return execCommand('eas submission:list --platform all --limit 5', 'Submission status check');
};

// Main menu
const showMainMenu = () => {
  console.clear();
  log.header('🚀 Yeser Deployment Manager');
  
  console.log('📦 Build Options:');
  console.log('  1. Build Development (Local)');
  console.log('  2. Build Preview (Internal Testing)');
  console.log('  3. Build Production (App Stores)');
  
  console.log('\n📤 Submit Options:');
  console.log('  4. Submit Preview to Internal Testing');
  console.log('  5. Submit Production to App Stores');
  
  console.log('\n📱 OTA Update Options:');
  console.log('  6. Deploy Preview OTA Update');
  console.log('  7. Deploy Production OTA Update');
  
  console.log('\n📊 Status Options:');
  console.log('  8. Check Build Status');
  console.log('  9. Check Submission Status');
  
  console.log('\n🔧 Utility Options:');
  console.log('  10. Validate Environment');
  console.log('  11. Run Quality Checks');
  
  console.log('\n  0. Exit');
  console.log('\n' + '='.repeat(50));
};

// Handle menu selection
const handleMenuSelection = async (choice) => {
  switch (choice.trim()) {
    case '1':
      await buildDevelopment();
      break;
    case '2':
      await buildPreview();
      break;
    case '3':
      await buildProduction();
      break;
    case '4':
      await submitPreview();
      break;
    case '5':
      await submitProduction();
      break;
    case '6':
      await updatePreview();
      break;
    case '7':
      await updateProduction();
      break;
    case '8':
      await checkBuildStatus();
      break;
    case '9':
      await checkSubmissionStatus();
      break;
    case '10':
      await validateAllEnvironments();
      break;
    case '11':
      await runQualityChecks();
      break;
    case '0':
      log.success('Goodbye! 👋');
      rl.close();
      return;
    default:
      log.warning('Invalid selection. Please try again.');
  }
  
  console.log('\nPress Enter to continue...');
  await new Promise(resolve => rl.question('', resolve));
  showMenu();
};

// Validate all environments
const validateAllEnvironments = async () => {
  log.header('🔍 Validating All Environments');
  validateEnvironment('dev');
  validateEnvironment('preview');
  validateEnvironment('prod');
};

// Run quality checks
const runQualityChecks = async () => {
  log.header('🧪 Running Quality Checks');
  execCommand('npm run type-check', 'TypeScript check');
  execCommand('npm run lint:check', 'ESLint check');
  execCommand('npm run test:coverage', 'Test coverage');
  execCommand('npm run audit:security', 'Security audit');
};

// Show menu and handle input
const showMenu = () => {
  showMainMenu();
  rl.question('\nSelect an option: ', handleMenuSelection);
};

// Emergency deployment function
const emergencyDeploy = () => {
  return new Promise((resolve) => {
    log.header('🚨 Emergency Deployment');
    log.warning('This will deploy immediately to production!');
    
    rl.question('Enter emergency fix description: ', (description) => {
      rl.question('Are you sure you want to proceed? (yes/no): ', (confirmation) => {
        if (confirmation.toLowerCase() === 'yes') {
          log.info('Proceeding with emergency deployment...');
          const success = execCommand(`eas update --branch production --message "EMERGENCY: ${description}"`, 'Emergency deployment');
          resolve(success);
        } else {
          log.info('Emergency deployment cancelled.');
          resolve(false);
        }
      });
    });
  });
};

// Check for command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  switch (args[0]) {
    case 'build':
      const profile = args[1] || 'development';
      execCommand(`eas build --platform all --profile ${profile}`, `Build ${profile}`);
      break;
    case 'submit':
      const submitProfile = args[1] || 'production';
      execCommand(`eas submit --platform all --profile ${submitProfile}`, `Submit ${submitProfile}`);
      break;
    case 'update':
      const updateBranch = args[1] || 'production';
      const updateMessage = args[2] || 'OTA Update';
      execCommand(`eas update --branch ${updateBranch} --message "${updateMessage}"`, `OTA Update ${updateBranch}`);
      break;
    case 'emergency':
      emergencyDeploy().then(() => process.exit(0));
      break;
    case 'status':
      checkBuildStatus();
      break;
    case 'validate':
      validateAllEnvironments();
      break;
    case 'quality':
      runQualityChecks();
      break;
    default:
      log.error(`Unknown command: ${args[0]}`);
      console.log('\nAvailable commands:');
      console.log('  build [profile]     - Build app');
      console.log('  submit [profile]    - Submit to app stores');
      console.log('  update [branch] [message] - Deploy OTA update');
      console.log('  emergency          - Emergency deployment');
      console.log('  status             - Check build status');
      console.log('  validate           - Validate environments');
      console.log('  quality            - Run quality checks');
  }
} else {
  // Show interactive menu
  showMenu();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('\nShutting down gracefully...');
  rl.close();
  process.exit(0);
}); 