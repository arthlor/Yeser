// Mock data for testing

export interface Profile {
  id: string;
  username: string;
  onboarded: boolean;
  reminder_enabled: boolean;
  reminder_time: string;
  throwback_reminder_enabled: boolean;
  throwback_reminder_frequency: string;
  daily_gratitude_goal: number;
  useVariedPrompts: boolean;
}

export interface GratitudeEntry {
  id: string;
  user_id: string;
  entry_date: string;
  statements: string[];
  created_at: string;
  updated_at: string;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_entry_date: string;
}

export const mockProfile: Profile = {
  id: 'profile-123',
  username: 'Test User',
  onboarded: true,
  reminder_enabled: true,
  reminder_time: '09:00',
  throwback_reminder_enabled: false,
  throwback_reminder_frequency: 'weekly',
  daily_gratitude_goal: 3,
  useVariedPrompts: true,
};

export const mockEntries: GratitudeEntry[] = [
  {
    id: 'entry-1',
    user_id: 'user-123',
    entry_date: '2024-01-15',
    statements: [
      'I am grateful for my family',
      'I am grateful for good health',
      'I am grateful for this beautiful day',
    ],
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
  },
  {
    id: 'entry-2',
    user_id: 'user-123',
    entry_date: '2024-01-14',
    statements: ['I am grateful for my job', 'I am grateful for morning coffee'],
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-14T09:00:00Z',
  },
  {
    id: 'entry-3',
    user_id: 'user-123',
    entry_date: '2024-01-13',
    statements: [
      'I am grateful for my friends',
      'I am grateful for a good book',
      'I am grateful for peaceful moments',
    ],
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-13T09:00:00Z',
  },
];

export const mockStreak: Streak = {
  current_streak: 7,
  longest_streak: 21,
  last_entry_date: '2024-01-15',
};

// Helper functions for creating test data
export const createMockEntry = (overrides: Partial<GratitudeEntry> = {}): GratitudeEntry => ({
  id: `entry-${Date.now()}`,
  user_id: 'user-123',
  entry_date: new Date().toISOString().split('T')[0],
  statements: ['Test gratitude statement'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  ...mockProfile,
  ...overrides,
});

export const createMockStreak = (overrides: Partial<Streak> = {}): Streak => ({
  ...mockStreak,
  ...overrides,
});
