import { useProfileStore, ProfileState } from './profileStore';
import { getStreakData } from '../api/profileApi';
import type { Streak } from '../schemas/streakSchema';
import useAuthStore from './authStore';

// Mock dependencies
jest.mock('../api/profileApi', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
  getStreakData: jest.fn(), // Key function to mock for streak tests
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

const mockGetStreakData = getStreakData as jest.Mock;

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
  streakData: null,
  streakDataLoading: true,
  streakDataError: null,
  error: null,
  loading: false,
  initialProfileFetchAttempted: false,
};

const resetStoreAndMocks = () => {
  useProfileStore.setState(testInitialState);
  mockGetStreakData.mockReset();
  (useAuthStore.getState as jest.Mock).mockReset();
};

describe('profileStore - Streak Logic', () => {
  beforeEach(() => {
    resetStoreAndMocks();
    // Default mock for authStore: user is authenticated
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      session: { access_token: 'test-token' },
      loading: false,
      error: null,
      isGuest: false,
    });
    // Set a user ID in the profile store for most tests
    useProfileStore.setState({ id: 'test-user-id' });
  });

  describe('refreshStreak action', () => {
    it('should fetch and update streak data successfully', async () => {
      const mockStreakObject: Streak = {
        id: 'streak-id',
        user_id: 'test-user-id',
        current_streak: 5,
        longest_streak: 10,
        last_entry_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockGetStreakData.mockResolvedValue(mockStreakObject);

      expect(useProfileStore.getState().streakData).toBeNull();
      expect(useProfileStore.getState().streakDataLoading).toBe(true);

      await useProfileStore.getState().refreshStreak();

      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().streakData).toEqual(mockStreakObject);
      expect(useProfileStore.getState().streakDataLoading).toBe(false);
      expect(useProfileStore.getState().streakDataError).toBeNull();
    });

    it('should handle API error when fetching streak data', async () => {
      const errorMessage = 'Network Error';
      mockGetStreakData.mockRejectedValue(new Error(errorMessage));

      await useProfileStore.getState().refreshStreak();

      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().streakData).toBeNull();
      expect(useProfileStore.getState().streakDataLoading).toBe(false);
      expect(useProfileStore.getState().streakDataError).toBe(errorMessage);
    });

    it('should not fetch streak data if no user ID is present in authStore', async () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        user: null, // Simulate no authenticated user
        session: null,
        loading: false,
        error: null,
        isGuest: true,
      });
      // Profile store's own id might still be set from a previous session, 
      // but refreshStreak relies on authStore.getState().user.id primarily.

      await useProfileStore.getState().refreshStreak();

      expect(mockGetStreakData).not.toHaveBeenCalled();
      expect(useProfileStore.getState().streakData).toBeNull();
      expect(useProfileStore.getState().streakDataLoading).toBe(false);
      // The error message comes from refreshStreak's own check
      expect(useProfileStore.getState().streakDataError).toBe('Kullanıcı bulunamadı.');
    });

    it('should handle Zod validation error if API returns invalid streak data format', async () => {
      // getStreakData internally uses Zod. If it throws, it's a Zod error.
      const zodErrorMessage = 'Zod validation failed';
      mockGetStreakData.mockRejectedValue(new Error(zodErrorMessage)); // Simulate Zod error from API layer

      await useProfileStore.getState().refreshStreak();

      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().streakData).toBeNull();
      expect(useProfileStore.getState().streakDataLoading).toBe(false);
      expect(useProfileStore.getState().streakDataError).toBe(zodErrorMessage);
    });

    it('should handle null API response for streak data (no streak record)', async () => {
      mockGetStreakData.mockResolvedValue(null); // API returns null if no streak record

      await useProfileStore.getState().refreshStreak();

      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
      expect(useProfileStore.getState().streakData).toBeNull(); // Correctly sets to null
      expect(useProfileStore.getState().streakDataLoading).toBe(false);
      expect(useProfileStore.getState().streakDataError).toBeNull(); // No error if API returns null as per design
    });

    it('should set streakDataLoading to true while fetching', () => {
      const mockStreakObject: Streak = {
        id: 'streak-id',
        user_id: 'test-user-id',
        current_streak: 3,
        longest_streak: 3,
        last_entry_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockGetStreakData.mockResolvedValue(mockStreakObject);
      // We don't await the promise here, we want to check the state *during* the fetch
      useProfileStore.getState().refreshStreak(); 
      expect(useProfileStore.getState().streakDataLoading).toBe(true);
    });
  });
});
