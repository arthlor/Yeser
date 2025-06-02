import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };

  // Create a new mock context object for SafeArea
  const MockSafeAreaContext = React.createContext(inset);

  return {
    // Provide the mocked context's Provider as SafeAreaProvider
    SafeAreaProvider: ({ children, initialMetrics }: { children: React.ReactNode, initialMetrics?: any }) => {
      // initialMetrics is part of the actual SafeAreaProvider props, mock it if necessary or ignore
      return React.createElement(MockSafeAreaContext.Provider, { value: inset }, children);
    },
    // Export the mock context itself as SafeAreaContext
    SafeAreaContext: MockSafeAreaContext,
    // Mock the hooks to return consistent values
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    // Provide initialWindowMetrics as it's often expected by consumers like react-navigation
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: inset,
    },
    // If other specific exports are needed, they can be added here, e.g.:
    // EdgeInsetsPropType: jest.fn(),
    // RectPropType: jest.fn(),
  };
});

// Mock react-native-paper globally using jest.requireActual
jest.mock('react-native-paper', () => {
  const actualPaper = jest.requireActual('react-native-paper');
  // React import might not be needed here anymore if PaperProvider is not explicitly mocked

  return {
    ...actualPaper, // Spread actual exports (this will include the actual PaperProvider)
    // PaperProvider is no longer overridden here, so the actual one will be used.
    useTheme: () => ({ // Override useTheme with our specific mock theme
      ...actualPaper.MD3LightTheme, // Start with a base theme structure if needed, or build from scratch
      colors: {
        ...(actualPaper.MD3LightTheme?.colors || {}),
        primary: 'mockPrimaryColor',
        surface: 'mockSurfaceColor',
        onSurface: 'mockOnSurfaceColor',
      },
      typography: {
        ...(actualPaper.MD3LightTheme?.typography || {}),
        // Ensure all variants are objects, even if empty, to prevent access errors before specific overrides
        displayLarge: actualPaper.MD3LightTheme?.typography?.displayLarge || { fontFamily: '', fontSize: 0 },
        displayMedium: actualPaper.MD3LightTheme?.typography?.displayMedium || { fontFamily: '', fontSize: 0 },
        displaySmall: actualPaper.MD3LightTheme?.typography?.displaySmall || { fontFamily: '', fontSize: 0 },
        headlineLarge: actualPaper.MD3LightTheme?.typography?.headlineLarge || { fontFamily: '', fontSize: 0 },
        headlineMedium: actualPaper.MD3LightTheme?.typography?.headlineMedium || { fontFamily: '', fontSize: 0 },
        headlineSmall: actualPaper.MD3LightTheme?.typography?.headlineSmall || { fontFamily: '', fontSize: 0 },
        titleLarge: { // Our specific override
          ...(actualPaper.MD3LightTheme?.typography?.titleLarge || {}),
          fontFamily: 'MockFontFamily-System',
          fontSize: 22,
        },
        titleMedium: actualPaper.MD3LightTheme?.typography?.titleMedium || { fontFamily: '', fontSize: 0 },
        titleSmall: actualPaper.MD3LightTheme?.typography?.titleSmall || { fontFamily: '', fontSize: 0 },
        labelLarge: actualPaper.MD3LightTheme?.typography?.labelLarge || { fontFamily: '', fontSize: 0 },
        labelMedium: actualPaper.MD3LightTheme?.typography?.labelMedium || { fontFamily: '', fontSize: 0 },
        labelSmall: actualPaper.MD3LightTheme?.typography?.labelSmall || { fontFamily: '', fontSize: 0 },
        bodyLarge: actualPaper.MD3LightTheme?.typography?.bodyLarge || { fontFamily: '', fontSize: 0 },
        bodyMedium: actualPaper.MD3LightTheme?.typography?.bodyMedium || { fontFamily: '', fontSize: 0 },
        bodySmall: actualPaper.MD3LightTheme?.typography?.bodySmall || { fontFamily: '', fontSize: 0 },
      },
      dark: false,
      roundness: 4,
      // Add any other specific theme properties from MD3LightTheme that might be essential
      version: actualPaper.MD3LightTheme?.version || 3,
      isV3: actualPaper.MD3LightTheme?.isV3 !== undefined ? actualPaper.MD3LightTheme.isV3 : true,
      animation: actualPaper.MD3LightTheme?.animation || { scale: 1 },
    }),
  };
});

// You can add other global Jest setup configurations here if needed
