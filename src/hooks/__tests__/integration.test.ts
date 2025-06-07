/**
 * Integration test for TanStack Query hooks
 * Validates that all hooks are properly exported and can be imported
 */

import {
  type ThrowbackFrequency,
  useCurrentPrompt,
  useGratitudeEntries,
  useGratitudeEntry,
  useGratitudeMutations,
  useGratitudeTotalCount,
  usePromptMutations,
  usePromptSettings,
  usePromptText,
  useStreakData,
  useThrowback,
  useThrowbackLogic,
  useThrowbackMutations,
  useUserProfile,
} from '../index';

describe('TanStack Query Hooks Integration', () => {
  test('should export all required hooks', () => {
    // User Profile hooks
    expect(typeof useUserProfile).toBe('function');

    // Gratitude hooks
    expect(typeof useGratitudeEntries).toBe('function');
    expect(typeof useGratitudeEntry).toBe('function');
    expect(typeof useGratitudeTotalCount).toBe('function');
    expect(typeof useGratitudeMutations).toBe('function');

    // Streak hooks
    expect(typeof useStreakData).toBe('function');

    // Prompt hooks
    expect(typeof useCurrentPrompt).toBe('function');
    expect(typeof usePromptMutations).toBe('function');
    expect(typeof usePromptText).toBe('function');
    expect(typeof usePromptSettings).toBe('function');

    // Throwback hooks
    expect(typeof useThrowback).toBe('function');
    expect(typeof useThrowbackLogic).toBe('function');
    expect(typeof useThrowbackMutations).toBe('function');
  });

  test('should export ThrowbackFrequency type', () => {
    // TypeScript compilation will catch if this type doesn't exist
    const frequencies: ThrowbackFrequency[] = ['daily', 'weekly', 'monthly'];
    expect(frequencies).toHaveLength(3);
  });

  test('hook functions should be defined', () => {
    const hooks = [
      useUserProfile,
      useGratitudeEntries,
      useGratitudeEntry,
      useGratitudeTotalCount,
      useGratitudeMutations,
      useStreakData,
      useCurrentPrompt,
      usePromptMutations,
      usePromptText,
      usePromptSettings,
      useThrowback,
      useThrowbackLogic,
      useThrowbackMutations,
    ];

    hooks.forEach((hook) => {
      expect(hook).toBeDefined();
      expect(typeof hook).toBe('function');
    });
  });
});

describe('TanStack Query Migration Status', () => {
  test('should have all core infrastructure in place', () => {
    // This test validates that our migration foundation is solid
    const coreHooks = {
      useUserProfile,
      useGratitudeEntries,
      useGratitudeMutations,
      useStreakData,
      useCurrentPrompt,
      useThrowback,
    };

    Object.entries(coreHooks).forEach(([hookName, hook]) => {
      expect(hook).toBeDefined();
      expect(typeof hook).toBe('function');
    });
  });
});
