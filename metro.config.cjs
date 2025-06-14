/* eslint-env node */
/* eslint-disable no-undef */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: require.resolve('react-native-get-random-values'),
  stream: require.resolve('readable-stream'),
  http: require.resolve('stream-http'),
  https: require.resolve('stream-http'),
  url: require.resolve('url-lite'),
  zlib: require.resolve('pako'),
};

// Configure asset extensions
config.resolver.assetExts.push('lottie');

// Disable unstable package exports for compatibility
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
