import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/native';

import { mockEntries, mockProfile, mockStreak } from './mockData';

export const handlers = [
  // Profile API
  http.post('*/rpc/get_profile', () => HttpResponse.json(mockProfile)),

  http.post('*/rpc/update_profile', async ({ request }) => {
    const updates = (await request.json()) as Partial<typeof mockProfile>;
    return HttpResponse.json({ ...mockProfile, ...updates });
  }),

  // Gratitude API
  http.post('*/rpc/get_gratitude_entry_by_date', async ({ request }) => {
    const { entry_date } = (await request.json()) as { entry_date: string };
    const entry = mockEntries.find((e) => e.entry_date === entry_date);
    return HttpResponse.json(entry || null);
  }),

  http.post('*/rpc/get_all_gratitude_entries', () => HttpResponse.json(mockEntries)),

  http.post('*/rpc/add_gratitude_statement', async ({ request }) => {
    const { entry_date, statement_text } = (await request.json()) as {
      entry_date: string;
      statement_text: string;
    };

    const existingEntry = mockEntries.find((e) => e.entry_date === entry_date);

    if (existingEntry) {
      const updatedEntry = {
        ...existingEntry,
        statements: [...existingEntry.statements, statement_text],
      };
      return HttpResponse.json(updatedEntry);
    } else {
      const newEntry = {
        id: `entry-${Date.now()}`,
        user_id: 'user-123',
        entry_date,
        statements: [statement_text],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(newEntry);
    }
  }),

  http.post('*/rpc/remove_gratitude_statement', async ({ request }) => {
    const { entry_date, statement_index } = (await request.json()) as {
      entry_date: string;
      statement_index: number;
    };

    const existingEntry = mockEntries.find((e) => e.entry_date === entry_date);

    if (existingEntry) {
      const updatedStatements = existingEntry.statements.filter(
        (_, index) => index !== statement_index
      );
      const updatedEntry = {
        ...existingEntry,
        statements: updatedStatements,
      };
      return HttpResponse.json(updatedEntry);
    }

    return HttpResponse.json(null, { status: 404 });
  }),

  // Streak API
  http.post('*/rpc/get_user_streak', () => HttpResponse.json(mockStreak)),

  // Throwback API
  http.post(
    '*/rpc/get_throwback_entries',
    () => HttpResponse.json(mockEntries.slice(0, 3)) // Return first 3 entries as throwbacks
  ),

  // Prompts API
  http.post('*/rpc/get_random_prompts', async ({ request }) => {
    const { count } = (await request.json()) as { count: number };
    const prompts = [
      'What made you smile today?',
      'Who are you grateful for?',
      'What challenge helped you grow?',
      'What simple pleasure brought you joy?',
      'What opportunity are you thankful for?',
    ];
    return HttpResponse.json(prompts.slice(0, count));
  }),

  // Auth API mocks
  http.post('*/auth/v1/token', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          confirmed_at: new Date().toISOString(),
        },
      });
    }

    return HttpResponse.json({ error: { message: 'Invalid credentials' } }, { status: 400 });
  }),

  // Error handlers for testing error states
  http.post('*/rpc/get_profile_error', () =>
    HttpResponse.json({ error: { message: 'Profile not found' } }, { status: 500 })
  ),
];

export const server = setupServer(...handlers);
