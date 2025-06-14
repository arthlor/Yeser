import 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Silence Firebase deprecation warnings during migration to v22
declare global {
  // eslint-disable-next-line no-var
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Import Firebase app module to ensure proper initialization
// 🚨 COLD START DEBUG: Commenting this out to prevent native-level auto-initialization.
// We will initialize Firebase manually inside our application logic.
// import '@react-native-firebase/app';

import { registerRootComponent } from 'expo';
import App from './src/App';

// Enable react-native-screens optimisations globally (avoids off-screen mounts flicker)
enableScreens(true);
enableFreeze(true);

// Prevent the native splash screen from auto-hiding until the first React frame is ready
void ExpoSplashScreen.preventAutoHideAsync();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
