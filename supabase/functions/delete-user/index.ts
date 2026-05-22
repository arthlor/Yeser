import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const errorResponse = (message: string, status = 400, code?: string): Response =>
  jsonResponse({ success: false, error: message, code }, status);

const getServiceRoleKey = (): string => {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (legacyKey) {
    return legacyKey;
  }

  const keyList = Deno.env.get('SUPABASE_SECRET_KEYS') ?? '';
  const [firstKey] = keyList
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  if (!firstKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS');
  }

  return firstKey;
};

const createUserClient = (authHeader: string): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
};

const createAdminClient = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL');
  }

  return createClient(supabaseUrl, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const listBucketPaths = async (
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> => {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    const items = data ?? [];
    for (const item of items) {
      const path = `${prefix}/${item.name}`;
      if (item.id) {
        paths.push(path);
      } else {
        paths.push(...(await listBucketPaths(supabase, bucket, path)));
      }
    }

    if (items.length < limit) {
      break;
    }
    offset += limit;
  }

  return paths;
};

const removeBucketFolder = async (
  supabase: SupabaseClient,
  bucket: string,
  userId: string
): Promise<void> => {
  try {
    const paths = await listBucketPaths(supabase, bucket, userId);
    for (let index = 0; index < paths.length; index += 1000) {
      const chunk = paths.slice(index, index + 1000);
      if (chunk.length === 0) {
        continue;
      }
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.warn(`[delete-user] Failed to remove ${bucket}/${userId}`, error);
  }
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const adminClient = createAdminClient();

    const { error: cascadeError } = await userClient.rpc('delete_current_user_cascade');
    if (cascadeError) {
      console.error('[delete-user] delete_current_user_cascade failed:', cascadeError);
      return errorResponse('Account data deletion failed', 500, 'DELETE_DATA_FAILED');
    }

    await Promise.all([
      removeBucketFolder(adminClient, 'avatars', user.id),
      removeBucketFolder(adminClient, 'gratitude-media', user.id),
    ]);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      console.error('[delete-user] auth.admin.deleteUser failed:', deleteError);
      return errorResponse('Authentication user deletion failed', 500, 'DELETE_AUTH_USER_FAILED');
    }

    return jsonResponse({
      success: true,
      message: 'Hesabınız ve tüm verileriniz kalıcı olarak silindi.',
    });
  } catch (error) {
    console.error('[delete-user] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Account deletion failed';
    return errorResponse(message, 500);
  }
});
