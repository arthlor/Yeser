import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import RootNavigator from './RootNavigator';


// AuthStore and ProfileStore will be mocked below with state variables

// Define types for our mock states based on actual store states
// (Simplified here, but ideally import actual AuthState, ProfileState, ProfileActions)
interface MockAuthState {
  user: { id: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Represents isLoadingAuth in RootNavigator
  error: string | null;
  initializeAuth: jest.Mock;
}

interface MockProfileState {
  id: string | null;
  username: string | null;
  onboarded: boolean;
  reminder_enabled: boolean;
  reminder_time: string;
  throwback_reminder_enabled: boolean;
  throwback_reminder_frequency: string;
  streak: number | null;
  streakLoading: boolean;
  streakError: string | null;
  error: string | null;
  loading: boolean; // Represents isLoadingProfile in RootNavigator
  initialProfileFetchAttempted: boolean;
  fetchProfile: jest.Mock; // Action from ProfileActions
}

let mockAuthStoreState: MockAuthState;
let mockProfileStoreState: MockProfileState;

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const mockSafeAreaContext = {
    Consumer: ({ children }: { children: (insets: typeof inset | null) => React.ReactNode }) => children(inset),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children, // This might still be too simple, PaperProvider might need a real context provider
    SafeAreaConsumer: mockSafeAreaContext.Consumer,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    // Provide a mock for the context object itself if PaperProvider or its internals try to access it directly
    SafeAreaContext: mockSafeAreaContext,
  };
});

// Mock ThemeProvider
jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: 'blue',
        surface: 'white',
        surfaceVariant: 'lightgrey',
        onSurfaceVariant: 'grey',
        outlineVariant: 'darkgrey',
        shadow: 'black',
        onBackground: 'black',
        onSurface: 'black',
      },
      spacing: {
        xs: 4,
        xxs: 2,
      },
      typography: {
        titleMedium: { fontFamily: 'System' },
      },
    },
  }),
}));

// Mock hapticFeedback
jest.mock('../utils/hapticFeedback', () => ({
  hapticFeedback: {
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
  },
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock analytics service
jest.mock('../services/analyticsService', () => ({
  analyticsService: {
    logScreenView: jest.fn(),
    logEvent: jest.fn(),
    logAppOpen: jest.fn(),
  },
}));

// Mock Supabase client to prevent actual initialization
jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    // Add other Supabase methods if they are directly or indirectly called during tests
    // For now, a minimal mock should suffice for RootNavigator tests
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      // Add other chainable methods as needed
    })),
  },
}));

// Mock stores with selector-aware functions
jest.mock('../store/authStore', () => ({
  __esModule: true,
  default: (selector: (state: MockAuthState) => any) => selector(mockAuthStoreState),
}));

jest.mock('../store/profileStore', () => ({
  useProfileStore: (selector: (state: MockProfileState) => any) => selector(mockProfileStoreState),
}));

// Mock screen components (lightweight mocks)
jest.mock('../screens/EnhancedSplashScreen', () => 'EnhancedSplashScreen');
jest.mock('./AuthNavigator', () => 'AuthNavigator');
jest.mock('../screens/onboarding/EnhancedOnboardingScreen', () => 'OnboardingScreen');
jest.mock('../screens/EnhancedHomeScreen', () => 'EnhancedHomeScreen'); // Standardized mock name
// Add other screens that are part of RootStackParamList if their direct rendering is tested
jest.mock('../screens/EnhancedEntryDetailScreen', () => 'EntryDetailScreen');
jest.mock('../screens/EnhancedReminderSettingsScreen', () => 'ReminderSettingsScreen');
jest.mock('../screens/EnhancedPrivacyPolicyScreen', () => 'PrivacyPolicyScreen');
jest.mock('../screens/EnhancedTermsOfServiceScreen', () => 'TermsOfServiceScreen');
jest.mock('../screens/EnhancedHelpScreen', () => 'HelpScreen');
jest.mock('../screens/onboarding/EnhancedOnboardingReminderSetupScreen', () => 'OnboardingReminderSetupScreen');

// Mock @react-navigation/native for NavigationContainer and useNavigationState
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNavigationState: jest.fn(() => ({ routes: [], index: 0 })),
  };
});

describe('RootNavigator', () => {
  // Diagnostic test for useTheme mock
  it('should provide the mocked theme structure from useTheme', () => {
    const { useTheme: mockedUseTheme } = require('react-native-paper');
    const themeFromMock = mockedUseTheme();
    // console.log('Theme from test file via require:', JSON.stringify(themeFromMock, null, 2));
    expect(themeFromMock).toBeDefined();
    expect(themeFromMock.colors).toBeDefined();
    expect(themeFromMock.colors.primary).toBe('mockPrimaryColor');
    expect(themeFromMock.typography).toBeDefined();
    expect(themeFromMock.typography.titleLarge).toBeDefined();
    expect(themeFromMock.typography.titleLarge.fontFamily).toBe('MockFontFamily-System');
    expect(themeFromMock.typography.titleLarge.fontSize).toBe(22);
  });

  const mockFetchProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize mock store states
    mockAuthStoreState = {
      user: null,
      isAuthenticated: false,
      isLoading: false, // isLoadingAuth
      error: null,
      initializeAuth: jest.fn(),
    };
    mockProfileStoreState = {
      id: null,
      username: null,
      onboarded: false,
      reminder_enabled: true,
      reminder_time: '20:00:00',
      throwback_reminder_enabled: true,
      throwback_reminder_frequency: 'weekly',
      streak: null,
      streakLoading: false,
      streakError: null,
      error: null,
      loading: false, // isLoadingProfile
      initialProfileFetchAttempted: false,
      fetchProfile: mockFetchProfile,
    };
  });

  it('should render EnhancedSplashScreen when isLoadingAuth is true', () => {
    mockAuthStoreState.isLoading = true; // isLoadingAuth = true

    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(screen.getByTestId('EnhancedSplashScreen')).toBeTruthy();
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
  });

  it('should render EnhancedSplashScreen when isLoadingProfile is true and not isLoadingAuth', () => {
    mockAuthStoreState.isAuthenticated = true; // Or false, doesn't matter for this test as long as isLoadingAuth is false
    mockAuthStoreState.isLoading = false;      // isLoadingAuth = false
    mockProfileStoreState.loading = true;    // isLoadingProfile = true

    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(screen.getByTestId('EnhancedSplashScreen')).toBeTruthy();
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
  });

  it('should render AuthNavigator when not authenticated and not loading', () => {
    // Default state from beforeEach is already unauthenticated and not loading
    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(screen.getByTestId('AuthNavigator')).toBeTruthy();
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
  });

  it('should render OnboardingScreen when authenticated, not onboarded, and not loading', () => {
    mockAuthStoreState.user = { id: 'user123' };
    mockAuthStoreState.isAuthenticated = true;
    mockAuthStoreState.isLoading = false;
    mockProfileStoreState.id = 'user123';
    mockProfileStoreState.onboarded = false; // Not onboarded
    mockProfileStoreState.loading = false;
    mockProfileStoreState.initialProfileFetchAttempted = true;

    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(screen.getByTestId('OnboardingScreen')).toBeTruthy();
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
  });

  it('should render MainAppNavigator when authenticated, onboarded, and not loading', () => {
    mockAuthStoreState.user = { id: 'user123' };
    mockAuthStoreState.isAuthenticated = true;
    mockAuthStoreState.isLoading = false;
    mockProfileStoreState.id = 'user123';
    mockProfileStoreState.onboarded = true; // Onboarded
    mockProfileStoreState.loading = false;
    mockProfileStoreState.initialProfileFetchAttempted = true;

    // We expect MainAppNavigator's screens to be rendered. 
    // Since MainAppNavigator itself isn't a simple string mock, we check for one of its screens.
    // MainAppNavigator should render EnhancedHomeScreen (mocked as 'EnhancedHomeScreen').
    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(screen.getByTestId('EnhancedHomeScreen')).toBeTruthy(); 
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled(); 
  });

  it('should call fetchProfile if authenticated and profile fetch not attempted', () => {
    mockAuthStoreState.user = { id: 'user123' };
    mockAuthStoreState.isAuthenticated = true;
    mockAuthStoreState.isLoading = false;
    mockProfileStoreState.id = null; // Profile not yet loaded
    mockProfileStoreState.initialProfileFetchAttempted = false; // Fetch not attempted
    // fetchProfile mock is part of mockProfileStoreState and initialized in beforeEach

    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
    expect(mockProfileStoreState.fetchProfile).toHaveBeenCalledTimes(1);
  });

  it('should NOT call fetchProfile if not authenticated', () => {
    // Default state from beforeEach is unauthenticated
    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
    expect(mockProfileStoreState.fetchProfile).not.toHaveBeenCalled();
  });

  it('should NOT call fetchProfile if profile fetch already attempted', () => {
    mockAuthStoreState.user = { id: 'user123' };
    mockAuthStoreState.isAuthenticated = true;
    mockAuthStoreState.isLoading = false;
    mockProfileStoreState.id = 'user123';
    mockProfileStoreState.onboarded = true; // or false, doesn't matter for this specific check
    mockProfileStoreState.loading = false;
    mockProfileStoreState.initialProfileFetchAttempted = true; // Fetch WAS attempted

    render(<PaperProvider><RootNavigator /></PaperProvider>);
    expect(mockAuthStoreState.initializeAuth).toHaveBeenCalled();
    expect(mockProfileStoreState.fetchProfile).not.toHaveBeenCalled();
  });
});
