import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/debugConfig';

import type { Database } from '../types/supabase.types.ts';

// Ensure you have a .env file at the root of your project with:
// EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// 🚨 DEBUG: Log environment variables for simulator debugging
logger.debug('Supabase Configuration Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlDomain: supabaseUrl ? new URL(supabaseUrl).hostname : 'missing',
  urlProtocol: supabaseUrl ? new URL(supabaseUrl).protocol : 'missing',
  env: __DEV__ ? 'development' : 'production',
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    'Supabase URL or Anon Key is missing. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file and accessible.';
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence in React Native
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});
