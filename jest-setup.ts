import 'react-native-gesture-handler/jestSetup';
import 'whatwg-fetch';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import React from 'react';

// TODO: Re-enable MSW when polyfill issues are resolved
// import { server } from './src/__mocks__/server';

// Mock setImmediate for React Native animations
global.setImmediate =
  global.setImmediate ||
  ((fn: (...args: any[]) => void, ...args: any[]) => global.setTimeout(fn, 0, ...args));

// Mock React Native Animated API
jest.mock('react-native', () => {
  // Get the actual React Native module
  const actualRN = jest.requireActual('react-native');

  // Mock just the parts we need to avoid DevMenu issues
  return {
    Platform: actualRN.Platform,
    Dimensions: actualRN.Dimensions,
    StyleSheet: actualRN.StyleSheet,
    View: actualRN.View,
    Text: actualRN.Text,
    TextInput: actualRN.TextInput,
    TouchableOpacity: actualRN.TouchableOpacity,
    TouchableWithoutFeedback: actualRN.TouchableWithoutFeedback,
    Pressable: actualRN.Pressable,
    ScrollView: actualRN.ScrollView,
    Image: actualRN.Image,
    ActivityIndicator: actualRN.ActivityIndicator,
    Alert: {
      alert: jest.fn(),
    },
    AccessibilityInfo: {
      addEventListener: jest.fn(() => ({
        remove: jest.fn(),
      })),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    },
    Animated: {
      timing: jest.fn(() => ({
        start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
          if (callback) {
            callback({ finished: true });
          }
        }),
      })),
      Value: jest.fn(() => ({
        interpolate: jest.fn(() => 'mockInterpolatedValue'),
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      View: actualRN.View,
      Text: actualRN.Text,
    },
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
    key: 'test-route',
    name: 'TestScreen',
  }),
  useFocusEffect: jest.fn(),
}));

// Mock React Navigation Stack
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: 'StackNavigator',
    Screen: 'StackScreen',
  }),
}));

// Mock React Navigation Bottom Tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: 'TabNavigator',
    Screen: 'TabScreen',
  }),
}));

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };

  const MockSafeAreaContext = mockReact.createContext(inset);

  return {
    SafeAreaProvider: ({
      children,
      initialMetrics,
    }: {
      children: React.ReactNode;
      initialMetrics?: any;
    }) => mockReact.createElement(MockSafeAreaContext.Provider, { value: inset }, children),
    SafeAreaContext: MockSafeAreaContext,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: inset,
    },
  };
});

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const actualPaper = jest.requireActual('react-native-paper');

  return {
    ...actualPaper,
    useTheme: () => ({
      ...actualPaper.MD3LightTheme,
      colors: {
        ...(actualPaper.MD3LightTheme?.colors || {}),
        primary: 'mockPrimaryColor',
        surface: 'mockSurfaceColor',
        onSurface: 'mockOnSurfaceColor',
      },
      typography: {
        ...(actualPaper.MD3LightTheme?.typography || {}),
        titleLarge: {
          ...(actualPaper.MD3LightTheme?.typography?.titleLarge || {}),
          fontFamily: 'MockFontFamily-System',
          fontSize: 22,
        },
        // Add other typography variants as needed
        displayLarge: actualPaper.MD3LightTheme?.typography?.displayLarge || {
          fontFamily: '',
          fontSize: 0,
        },
        displayMedium: actualPaper.MD3LightTheme?.typography?.displayMedium || {
          fontFamily: '',
          fontSize: 0,
        },
        displaySmall: actualPaper.MD3LightTheme?.typography?.displaySmall || {
          fontFamily: '',
          fontSize: 0,
        },
        headlineLarge: actualPaper.MD3LightTheme?.typography?.headlineLarge || {
          fontFamily: '',
          fontSize: 0,
        },
        headlineMedium: actualPaper.MD3LightTheme?.typography?.headlineMedium || {
          fontFamily: '',
          fontSize: 0,
        },
        headlineSmall: actualPaper.MD3LightTheme?.typography?.headlineSmall || {
          fontFamily: '',
          fontSize: 0,
        },
        titleMedium: actualPaper.MD3LightTheme?.typography?.titleMedium || {
          fontFamily: '',
          fontSize: 0,
        },
        titleSmall: actualPaper.MD3LightTheme?.typography?.titleSmall || {
          fontFamily: '',
          fontSize: 0,
        },
        labelLarge: actualPaper.MD3LightTheme?.typography?.labelLarge || {
          fontFamily: '',
          fontSize: 0,
        },
        labelMedium: actualPaper.MD3LightTheme?.typography?.labelMedium || {
          fontFamily: '',
          fontSize: 0,
        },
        labelSmall: actualPaper.MD3LightTheme?.typography?.labelSmall || {
          fontFamily: '',
          fontSize: 0,
        },
        bodyLarge: actualPaper.MD3LightTheme?.typography?.bodyLarge || {
          fontFamily: '',
          fontSize: 0,
        },
        bodyMedium: actualPaper.MD3LightTheme?.typography?.bodyMedium || {
          fontFamily: '',
          fontSize: 0,
        },
        bodySmall: actualPaper.MD3LightTheme?.typography?.bodySmall || {
          fontFamily: '',
          fontSize: 0,
        },
      },
      dark: false,
      roundness: 4,
      version: actualPaper.MD3LightTheme?.version || 3,
      isV3: actualPaper.MD3LightTheme?.isV3 !== undefined ? actualPaper.MD3LightTheme.isV3 : true,
      animation: actualPaper.MD3LightTheme?.animation || { scale: 1 },
    }),
  };
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
    },
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
  dismissBrowser: jest.fn(() => Promise.resolve()),
  WebBrowserResult: {
    type: 'opened',
  },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeAllNotificationListeners: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock React Native Calendars
jest.mock('react-native-calendars', () => ({
  Calendar: 'Calendar',
  CalendarList: 'CalendarList',
  Agenda: 'Agenda',
}));

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

// Mock Supabase Client
jest.mock('./src/utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      rpc: jest.fn(),
    })),
  },
}));

// Setup MSW - TODO: Re-enable when polyfill issues are resolved
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error and console.warn in tests unless needed
  error: jest.fn(),
  warn: jest.fn(),
};
