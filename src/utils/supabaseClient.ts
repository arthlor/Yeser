import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { config } from '@/utils/config';
import { logger } from '@/utils/debugConfig';

import type { Database } from '../types/supabase.types.ts';

// Use the centralized config instead of direct process.env access
const supabaseUrl = config.supabase.url || '';
const supabaseAnonKey = config.supabase.anonKey || '';

// 🚨 DEBUG: Log environment variables for debugging
logger.debug('Supabase Configuration Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlDomain: supabaseUrl
    ? (() => {
        try {
          return new URL(supabaseUrl).hostname;
        } catch {
          return 'invalid-url';
        }
      })()
    : 'missing',
  env: __DEV__ ? 'development' : 'production',
});

// Validate required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    '🚨 Supabase configuration missing! Check your environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).';
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

// Create the Supabase client
const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const supabase = supabaseClient;
