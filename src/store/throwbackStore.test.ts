import { getRandomGratitudeEntry } from '../api/gratitudeApi';

import { useThrowbackStore, initialState } from './throwbackStore';

// Mock the gratitudeService
jest.mock('../api/gratitudeApi', () => ({
  getRandomGratitudeEntry: jest.fn(),
}));

// Cast the mock to jest.Mock
const mockGetRandomGratitudeEntry = getRandomGratitudeEntry as jest.Mock;

describe('throwbackStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useThrowbackStore.setState(initialState);
    // Clear mock calls and implementations
    mockGetRandomGratitudeEntry.mockClear();
  });

  describe('fetchRandomEntry action', () => {
    it('should fetch and set a random entry successfully', async () => {
      const mockEntry = {
        id: '1',
        entry_date: '2023-01-01',
        statements: ['A beautiful sunrise'], // Corrected to string[]
        created_at: '2023-01-01T10:00:00Z',
        updated_at: '2023-01-01T10:00:00Z',
        user_id: 'user123',
        is_public: false,
      };
      mockGetRandomGratitudeEntry.mockResolvedValue(mockEntry);
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890000); // Mock Date.now()

      await useThrowbackStore.getState().fetchRandomEntry();

      expect(mockGetRandomGratitudeEntry).toHaveBeenCalledTimes(1);
      expect(useThrowbackStore.getState().randomEntry).toEqual(mockEntry);
      expect(useThrowbackStore.getState().isLoading).toBe(false);
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(true);
      expect(useThrowbackStore.getState().lastThrowbackShownAt).toBe(1234567890000);
      expect(useThrowbackStore.getState().error).toBeNull();

      Date.now = originalDateNow; // Restore Date.now()
    });

    it('should handle no entry found', async () => {
      mockGetRandomGratitudeEntry.mockResolvedValue(null);

      await useThrowbackStore.getState().fetchRandomEntry();

      expect(mockGetRandomGratitudeEntry).toHaveBeenCalledTimes(1);
      expect(useThrowbackStore.getState().randomEntry).toBeNull();
      expect(useThrowbackStore.getState().isLoading).toBe(false);
      // isThrowbackVisible should remain false if no entry is found and it wasn't previously true
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(false);
      expect(useThrowbackStore.getState().error).toBeNull();
    });

    it('should handle API error when fetching entry', async () => {
      const errorMessage = 'Network Error';
      mockGetRandomGratitudeEntry.mockRejectedValue(new Error(errorMessage));

      await useThrowbackStore.getState().fetchRandomEntry();

      expect(mockGetRandomGratitudeEntry).toHaveBeenCalledTimes(1);
      expect(useThrowbackStore.getState().randomEntry).toBeNull(); // Should remain null or be reset
      expect(useThrowbackStore.getState().isLoading).toBe(false);
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(false); // Should be false on error
      expect(useThrowbackStore.getState().error).toBe(errorMessage);
    });
  });

  describe('showThrowback action', () => {
    it('should set isThrowbackVisible to true if an entry exists', () => {
      // Set a mock entry before calling showThrowback
      const mockEntryForShow = {
        id: 'show1',
        entry_date: '2023-03-03',
        statements: ['Showing throwback'], // Corrected to string[]
        created_at: '2023-03-03T10:00:00Z',
        updated_at: '2023-03-03T10:00:00Z',
        user_id: 'user_show',
        is_public: false,
      };
      useThrowbackStore.setState({ randomEntry: mockEntryForShow, isThrowbackVisible: false });
      useThrowbackStore.getState().showThrowback();
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(true);
    });

    it('should NOT set isThrowbackVisible to true if no entry exists', () => {
      useThrowbackStore.setState({ randomEntry: null, isThrowbackVisible: false });
      useThrowbackStore.getState().showThrowback();
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(false);
    });
  });

  describe('hideThrowback action', () => {
    it('should set isThrowbackVisible to false and clear randomEntry', () => {
      useThrowbackStore.setState({
        isThrowbackVisible: true,
        randomEntry: {
          id: '1',
          entry_date: '2023-01-01',
          statements: ['A hidden statement'],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          user_id: 'user_hide',
        },
      });
      useThrowbackStore.getState().hideThrowback();
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(false);
      expect(useThrowbackStore.getState().randomEntry).toBeNull();
    });
  });

  describe('resetThrowbackState action', () => {
    it('should reset the store to its initial state', () => {
      // Modify some state
      useThrowbackStore.setState({
        randomEntry: {
          id: '1',
          entry_date: '2023-01-01',
          statements: ['Another statement'],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          user_id: 'user_reset',
        },
        isThrowbackVisible: true,
        isLoading: true,
        error: 'Some error',
        lastThrowbackShownAt: Date.now(),
      });

      useThrowbackStore.getState().resetThrowback();

      expect(useThrowbackStore.getState().randomEntry).toBeNull();
      expect(useThrowbackStore.getState().isThrowbackVisible).toBe(false);
      expect(useThrowbackStore.getState().isLoading).toBe(false);
      expect(useThrowbackStore.getState().error).toBeNull();
      expect(useThrowbackStore.getState().lastThrowbackShownAt).toBeNull();
      // Check against the imported initialState object
      expect(useThrowbackStore.getState()).toMatchObject(initialState);
    });
  });
});
