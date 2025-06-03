import useAuthStore from './authStore';
import { useProfileStore, ProfileState } from './profileStore';

// Mock dependencies
jest.mock('../api/profileApi', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  cancelAllScheduledNotifications: jest.fn(),
  requestNotificationPermissions: jest.fn(),
  scheduleDailyReminder: jest.fn(),
}));

// Mock AsyncStorage for zustand persist middleware
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock authStore
jest.mock('./authStore');

// Mock supabaseClient to prevent errors about missing env variables
jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    // Add other Supabase client methods if they are directly used by modules imported by profileStore
    // For now, this should cover what authService might try to access during import.
  },
}));

// Helper to reset Zustand store and mocks before each test
const testInitialState: ProfileState = {
  id: null,
  username: null,
  onboarded: false,
  reminder_enabled: true,
  reminder_time: '20:00:00',
  theme: 'system', // Updated from theme_preference, using a default value
  throwback_reminder_enabled: true, // Added to match ProfileState
  throwback_reminder_frequency: 'weekly',
  // last_entry_date removed as it's no longer part of ProfileState
  created_at: null,
  updated_at: null,
  daily_gratitude_goal: 3, // Added to match ProfileState
  useVariedPrompts: false, // Added to satisfy ProfileState
  error: null,
  loading: false,
  initialProfileFetchAttempted: false,
};

const resetStoreAndMocks = () => {
  useProfileStore.setState(testInitialState);
  (useAuthStore.getState as jest.Mock).mockReset();
};
