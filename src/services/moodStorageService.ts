import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import type { LogContext } from '@/utils/logger';
import type { MoodEmoji } from '@/types/mood.types';

const STORAGE_PREFIX = 'yeser.mood';
const RECENTS_KEY = `${STORAGE_PREFIX}:recents`;

const buildKey = (entryDate: string, statementIndex: number): string => {
  return `${STORAGE_PREFIX}:${entryDate}:${statementIndex}`;
};

export const moodStorageService = {
  async getMood(entryDate: string, statementIndex: number): Promise<MoodEmoji | null> {
    try {
      const key = buildKey(entryDate, statementIndex);
      const value = await AsyncStorage.getItem(key);
      return value as MoodEmoji | null;
    } catch (error) {
      logger.warn('Failed to get mood from storage', { error: error as Error } as LogContext);
      return null;
    }
  },

  async setMood(entryDate: string, statementIndex: number, mood: MoodEmoji): Promise<void> {
    try {
      const key = buildKey(entryDate, statementIndex);
      await AsyncStorage.setItem(key, mood);
    } catch (error) {
      logger.error('Failed to set mood in storage', { error: error as Error } as LogContext);
    }
  },

  async clearMood(entryDate: string, statementIndex: number): Promise<void> {
    try {
      const key = buildKey(entryDate, statementIndex);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to clear mood from storage', { error: error as Error } as LogContext);
    }
  },

  // Recents handling
  async getRecents(): Promise<MoodEmoji[]> {
    try {
      const raw = await AsyncStorage.getItem(RECENTS_KEY);
      if (!raw) {
        return [];
      }
      const arr = JSON.parse(raw) as string[];
      return Array.isArray(arr) ? (arr.filter(Boolean) as MoodEmoji[]) : [];
    } catch (error) {
      logger.warn('Failed to get mood recents', { error: error as Error } as LogContext);
      return [];
    }
  },

  async addRecent(emoji: MoodEmoji): Promise<void> {
    try {
      const existing = await this.getRecents();
      const without = existing.filter((e) => e !== emoji);
      const next = [emoji, ...without].slice(0, 8);
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch (error) {
      logger.warn('Failed to add mood recent', { error: error as Error } as LogContext);
    }
  },

  async clearRecents(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RECENTS_KEY);
    } catch (error) {
      logger.warn('Failed to clear mood recents', { error: error as Error } as LogContext);
    }
  },
};
