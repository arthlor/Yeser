#!/usr/bin/env node
/* eslint-env node */
 
const fs = require('fs');
const path = require('path');

const ANDROID_CONFIG = 'android/app/google-services.json';
const IOS_CONFIG = 'ios/YeerDev/GoogleService-Info.plist';
const BACKUP_DIR = '.firebase-backup';

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backupConfigs() {
  console.log('🔄 Backing up Firebase configurations...');
  ensureBackupDir();
  
  // Backup Android config
  if (fs.existsSync(ANDROID_CONFIG)) {
    fs.copyFileSync(ANDROID_CONFIG, path.join(BACKUP_DIR, 'google-services.json'));
    console.log('✅ Android config backed up');
  } else {
    console.log('⚠️ Android config not found');
  }
  
  // Backup iOS config
  if (fs.existsSync(IOS_CONFIG)) {
    fs.copyFileSync(IOS_CONFIG, path.join(BACKUP_DIR, 'GoogleService-Info.plist'));
    console.log('✅ iOS config backed up');
  } else {
    console.log('⚠️ iOS config not found');
  }
}

function restoreConfigs() {
  console.log('🔄 Restoring Firebase configurations...');
  
  // Restore Android config
  const androidBackup = path.join(BACKUP_DIR, 'google-services.json');
  if (fs.existsSync(androidBackup)) {
    // Ensure directory exists
    const androidDir = path.dirname(ANDROID_CONFIG);
    if (!fs.existsSync(androidDir)) {
      fs.mkdirSync(androidDir, { recursive: true });
    }
    fs.copyFileSync(androidBackup, ANDROID_CONFIG);
    console.log('✅ Android config restored');
  }
  
  // Restore iOS config
  const iosBackup = path.join(BACKUP_DIR, 'GoogleService-Info.plist');
  if (fs.existsSync(iosBackup)) {
    // Ensure directory exists
    const iosDir = path.dirname(IOS_CONFIG);
    if (!fs.existsSync(iosDir)) {
      fs.mkdirSync(iosDir, { recursive: true });
    }
    fs.copyFileSync(iosBackup, IOS_CONFIG);
    console.log('✅ iOS config restored');
  }
}

const action = process.argv[2];

if (action === 'backup') {
  backupConfigs();
} else if (action === 'restore') {
  restoreConfigs();
} else {
  console.log('Usage: node preserve-firebase-config.js [backup|restore]');
  process.exit(1);
} 