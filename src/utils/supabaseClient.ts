import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '@/utils/config';
import { logger } from '@/utils/debugConfig';

import type { Database } from '../types/supabase.types.ts';

// Use the centralized config instead of direct process.env access
const supabaseUrl = config.supabase.url || '';
const supabaseAnonKey = config.supabase.anonKey || '';

// Quiet prod build by avoiding environment spam; validation below will throw if missing

// Validate required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    '🚨 Supabase configuration missing! Check your environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).';
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

// 🚨 COLD START FIX: Lazy Supabase Client Initialization
class SupabaseService {
  private client: SupabaseClient<Database> | null = null;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize Supabase client lazily - call this before using the client
   */
  async initializeLazy(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.createClient();
    return this.initializationPromise;
  }

  /**
   * Create the Supabase client with AsyncStorage protection
   */
  private async createClient(): Promise<void> {
    try {
      // Verify AsyncStorage readiness before Supabase client creation

      // Test AsyncStorage readiness with timeout
      await this.testAsyncStorage();
      // Create the Supabase client
      this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    } catch (error) {
      logger.error('[COLD START] Failed to create Supabase client:', error as Error);
      throw error;
    }
  }

  /**
   * Test AsyncStorage readiness with timeout
   */
  private async testAsyncStorage(): Promise<void> {
    const testKey = '__supabase_async_storage_test__';
    const testValue = Date.now().toString();

    const asyncStorageTest = async (): Promise<void> => {
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      if (retrieved !== testValue) {
        throw new Error('AsyncStorage test value mismatch');
      }
      await AsyncStorage.removeItem(testKey);
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('AsyncStorage readiness test timeout after 3 seconds'));
      }, 3000);
    });

    await Promise.race([asyncStorageTest(), timeoutPromise]);
  }

  /**
   * Get the Supabase client - throws if not initialized
   */
  getClient(): SupabaseClient<Database> {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call initializeLazy() first.');
    }
    return this.client;
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

// Export the service for lazy initialization
export { supabaseService };

// Export legacy client getter for backward compatibility
// This will throw if used before initialization
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    const client = supabaseService.getClient();
    return client[prop as keyof SupabaseClient<Database>];
  },
});
