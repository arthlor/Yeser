import { getStreakData } from '../streakApi';
import { supabase } from '../../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';

// Mock dependencies
jest.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

jest.mock('@/utils/debugConfig', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create properly typed mocks
const mockGetSession = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

const mockSupabase = {
  auth: {
    getSession: mockGetSession,
  },
  rpc: mockRpc,
  from: mockFrom,
} as any;

// Override the actual imports
(supabase as any).auth.getSession = mockGetSession;
(supabase as any).rpc = mockRpc;
(supabase as any).from = mockFrom;

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('streakApi', () => {
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
  };

  const mockSession = {
    session: {
      user: mockUser,
      access_token: 'mock-token',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: mockSession,
      error: null,
    });
  });

  // REMOVED: fetchUserStreak tests - function deprecated in favor of getStreakData

  describe('getStreakData', () => {
    const mockStreakData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      current_streak: 7,
      longest_streak: 15,
      last_entry_date: '2024-01-15',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };

    beforeEach(() => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStreakData,
              error: null,
              status: 200,
            }),
          }),
        }),
      });
    });

    it('should return parsed streak data when available', async () => {
      const result = await getStreakData();

      expect(result).toBeDefined();
      expect(result?.current_streak).toBe(7);
      expect(result?.longest_streak).toBe(15);
      expect(result?.user_id).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should return null when no streak data exists (406 status)', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('No rows'),
              status: 406,
            }),
          }),
        }),
      });

      const result = await getStreakData();

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      const dbError = new Error('Database connection failed');
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
              status: 500,
            }),
          }),
        }),
      });

      await expect(getStreakData()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching streak data:', dbError);
    });

    it('should handle invalid session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(getStreakData()).rejects.toThrow('No active session');
    });

    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        ...mockStreakData,
        current_streak: 'invalid', // Should be number
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: invalidData,
              error: null,
              status: 200,
            }),
          }),
        }),
      });

      await expect(getStreakData()).rejects.toThrow('Invalid raw streak data from DB');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle missing user in session', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: null,
            access_token: 'token',
          },
        },
        error: null,
      });

      await expect(getStreakData()).rejects.toThrow(
        'No user found in session for fetching streak data'
      );
    });
  });

  // REMOVED: Error handling edge cases for fetchUserStreak - function deprecated
});
