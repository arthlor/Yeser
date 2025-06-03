const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable package.json exports field support for compatibility with @supabase and @firebase packages
// as mentioned in Expo SDK 53 changelog: https://expo.dev/changelog/sdk-53
config.resolver.unstable_enablePackageExports = false;

// Add 'stream' and other Node.js core module polyfills
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: path.resolve(__dirname, 'node_modules/readable-stream'),
  http: path.resolve(__dirname, 'node_modules/stream-http'),
  https: path.resolve(__dirname, 'node_modules/stream-http'),
  url: path.resolve(__dirname, 'node_modules/url-lite'),
  crypto: path.resolve(
    __dirname,
    'node_modules/react-native-get-random-values'
  ),
  net: path.resolve(__dirname, 'node_modules/react-native-tcp-socket'),
  tls: path.resolve(__dirname, 'node_modules/react-native-tcp-socket'),
  zlib: path.resolve(__dirname, 'node_modules/pako'),
  // vm: require.resolve('vm-browserify'), // Add if 'vm' module errors appear
};

// If the 'stream' module is requested from within 'ws/lib/'
// if (
//   moduleName === 'stream' &&
//   context.originModulePath &&
//   context.originModulePath.includes('node_modules/ws/lib/')
// ) {
//   console.log(`Attempting to polyfill 'stream' for 'ws' from ${context.originModulePath}`);
//   // Resolve to our polyfill
//   try {
//     return {
//       filePath: path.resolve(__dirname, 'node_modules/readable-stream/lib/ours/browser.js'),
//       // console.log('Polyfill path for stream:', filePath); // Optional: log the resolved path
//       type: 'sourceFile',
//     };
//   } catch (e) {
//     console.error(
//       `[ERROR] Error resolving 'stream' polyfill for 'ws': ${e.message}`,
//     );
//     console.error(e.stack);
//     // Fallback to original resolver if our path is somehow wrong
//     return originalResolveRequest
//       ? originalResolveRequest(context, moduleName, platform)
//       : context.resolveRequest(context, moduleName, platform);
//   }
// }

// Fallback to the default resolver for all other cases
// return originalResolveRequest
//   ? originalResolveRequest(context, moduleName, platform)
//   : context.resolveRequest(context, moduleName, platform);

module.exports = config;
