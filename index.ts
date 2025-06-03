import 'react-native-gesture-handler';
import 'expo-dev-client';

import { registerRootComponent } from 'expo';
// Removed Firebase JS SDK initialization

import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
