import 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import * as ExpoSplashScreen from 'expo-splash-screen';

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
