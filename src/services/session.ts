import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { supabaseService } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { AuthError, NetworkError, UnknownError } from '@/shared/errors';
import type { Database } from '@/types/supabase.types';

const isNetworkMessage = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('timeout') ||
    lower.includes('offline')
  );
};

export const getSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  try {
    await supabaseService.initializeLazy();
    return supabaseService.getClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize Supabase client:', { message });
    if (isNetworkMessage(message)) {
      throw new NetworkError('Network error', { cause: message });
    }
    throw new UnknownError('Database connection failed', { cause: message });
  }
};

export const getSession = async (): Promise<Session | null> => {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    const message = error.message || 'Authentication error';
    if (isNetworkMessage(message)) {
      throw new NetworkError('Network error', { cause: message });
    }
    throw new AuthError('Authentication required', { cause: message });
  }
  return data.session ?? null;
};

export const requireSession = async (): Promise<Session> => {
  const session = await getSession();
  if (!session?.user) {
    throw new AuthError('User not authenticated');
  }
  return session;
};

export const getAuthedClient = async (): Promise<{
  client: SupabaseClient<Database>;
  session: Session;
}> => {
  const client = await getSupabaseClient();
  const session = await requireSession();
  return { client, session };
};
