import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';

import { createHookWrapper } from '@/__mocks__/testUtils';
import { useStreakData } from '../useStreakData';
import { getStreakData } from '@/api/streakApi';
import useAuthStore from '@/store/authStore';

// Mock dependencies
jest.mock('@/api/streakApi', () => ({
  getStreakData: jest.fn(),
}));

jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetStreakData = getStreakData as jest.MockedFunction<typeof getStreakData>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('useStreakData', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockStreakData = {
    id: 'streak-id',
    user_id: 'test-user-id',
    current_streak: 7,
    longest_streak: 15,
    last_entry_date: new Date('2024-01-15'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
      },
    });

    jest.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockUser);
    });

    it('should fetch streak data successfully', async () => {
      mockGetStreakData.mockResolvedValue(mockStreakData);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStreakData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
    });

    it('should return null when no streak data exists', async () => {
      mockGetStreakData.mockResolvedValue(null);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Failed to fetch streak data');
      mockGetStreakData.mockRejectedValue(mockError);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });

    it('should use correct query key and cache queries', async () => {
      mockGetStreakData.mockResolvedValue(mockStreakData);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that the query was registered and data is available
      const queries = queryClient.getQueryCache().findAll();
      expect(queries).toHaveLength(1);
      expect(queries[0].queryKey).toEqual(['yeser', 'streaks', mockUser.id]);
      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockStreakData);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockGetStreakData.mockRejectedValue(networkError);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(networkError);
      expect(result.current.data).toBeUndefined();
    });

    it('should cache data appropriately', async () => {
      mockGetStreakData.mockResolvedValue(mockStreakData);

      const { result: result1 } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook should use cached data
      const { result: result2 } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(result2.current.data).toEqual(mockStreakData);
      // API should only be called once due to caching
      expect(mockGetStreakData).toHaveBeenCalledTimes(1);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(null);
    });

    it('should not fetch when user is null', () => {
      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(mockGetStreakData).not.toHaveBeenCalled();
    });

    it('should not fetch when user ID is missing', () => {
      mockUseAuthStore.mockReturnValue({ email: 'test@example.com' } as any);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(mockGetStreakData).not.toHaveBeenCalled();
    });
  });

  describe('query lifecycle', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockUser);
    });

    it('should show loading state initially', () => {
      mockGetStreakData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockStreakData), 100))
      );

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should transition from loading to success', async () => {
      mockGetStreakData.mockResolvedValue(mockStreakData);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockStreakData);
    });

    it('should transition from loading to error', async () => {
      const error = new Error('API Error');
      mockGetStreakData.mockRejectedValue(error);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(error);
    });
  });

  describe('data validation', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue(mockUser);
    });

    it('should handle different streak values', async () => {
      const testCases = [
        { current_streak: 0, longest_streak: 0 },
        { current_streak: 1, longest_streak: 1 },
        { current_streak: 365, longest_streak: 500 },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const testData = { ...mockStreakData, ...testCase };

        // Create a fresh query client for each test case to avoid cache interference
        const freshQueryClient = new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
          },
        });

        mockGetStreakData.mockResolvedValue(testData);

        const { result } = renderHook(() => useStreakData(), {
          wrapper: createHookWrapper(freshQueryClient),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(testData);
      }
    });

    it('should handle null last_entry_date', async () => {
      const dataWithNullDate = {
        ...mockStreakData,
        last_entry_date: null,
      };
      mockGetStreakData.mockResolvedValue(dataWithNullDate);

      const { result } = renderHook(() => useStreakData(), {
        wrapper: createHookWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.last_entry_date).toBeNull();
    });
  });
});
