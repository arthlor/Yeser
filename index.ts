import 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import * as ExpoSplashScreen from 'expo-splash-screen';

import { registerRootComponent } from 'expo';
import App from './src/App';
import * as WebBrowser from 'expo-web-browser';

// Enable react-native-screens optimisations globally (avoids off-screen mounts flicker)
enableScreens(true);
enableFreeze(true);

// Prevent the native splash screen from auto-hiding until the first React frame is ready
void ExpoSplashScreen.preventAutoHideAsync();

// Ensure iOS auth sessions complete when returning to the app (typesafe guard)
type MaybeCompleteAuthSession = { maybeCompleteAuthSession?: () => void };
const maybeComplete = (WebBrowser as unknown as MaybeCompleteAuthSession).maybeCompleteAuthSession;
if (typeof maybeComplete === 'function') {
  maybeComplete();
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
