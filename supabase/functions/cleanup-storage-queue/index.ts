import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CleanupJob {
  id: string;
  bucket_id: string;
  storage_path: string;
  attempts: number;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function assertAuthorized(req: Request): Response | null {
  const configuredSecret = Deno.env.get('EDGE_INTERNAL_SECRET');
  const providedSecret = req.headers.get('x-internal-secret');

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const unauthorized = assertAuthorized(req);
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = getSupabaseAdmin();

  const { data: jobs, error: fetchError } = await supabase
    .from('storage_cleanup_queue')
    .select('id, bucket_id, storage_path, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);

  if (fetchError) {
    console.error('[cleanup-storage-queue] Failed to fetch jobs:', fetchError);
    return jsonResponse({ error: 'Failed to fetch cleanup jobs' }, 500);
  }

  let deleted = 0;
  let failed = 0;

  for (const job of (jobs ?? []) as CleanupJob[]) {
    const { error: removeError } = await supabase.storage
      .from(job.bucket_id)
      .remove([job.storage_path]);

    if (removeError) {
      failed += 1;
      const attempts = job.attempts + 1;
      const terminalFailure = attempts >= 5;
      await supabase
        .from('storage_cleanup_queue')
        .update({
          status: terminalFailure ? 'failed' : 'pending',
          attempts,
          last_error: removeError.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      continue;
    }

    const { error: deleteError } = await supabase
      .from('storage_cleanup_queue')
      .delete()
      .eq('id', job.id);

    if (deleteError) {
      failed += 1;
      console.error('[cleanup-storage-queue] Removed object but failed to clear job:', deleteError);
      continue;
    }

    deleted += 1;
  }

  return jsonResponse({
    processed: jobs?.length ?? 0,
    deleted,
    failed,
  });
});
