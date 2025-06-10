import 'react-native-gesture-handler';
import 'expo-dev-client';

// Silence Firebase deprecation warnings during migration to v22
declare global {
  // eslint-disable-next-line no-var
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Import Firebase app module to ensure proper initialization
import '@react-native-firebase/app';

import { registerRootComponent } from 'expo';
// Removed Firebase JS SDK initialization

import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
