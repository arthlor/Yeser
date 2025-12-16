import { serve } from 'https://deno.land/std@0.214.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_JOB_LIMIT = 200;
const MAX_ATTEMPTS = 5;

const loadConfig = () => {
  const config = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    EDGE_INTERNAL_SECRET: Deno.env.get('EDGE_INTERNAL_SECRET') ?? '',
    CRON_AUTH_TOKEN: Deno.env.get('CRON_AUTH_TOKEN') ?? undefined,
    EXPO_ACCESS_TOKEN: Deno.env.get('EXPO_ACCESS_TOKEN') ?? '',
    JOB_LIMIT: Number(Deno.env.get('JOB_PROCESS_LIMIT') ?? DEFAULT_JOB_LIMIT),
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => (key === 'CRON_AUTH_TOKEN' ? false : !value))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return config;
};

const authorizeRequest = (request, edgeSecret, cronToken) => {
  const bearer = request.headers.get('authorization');
  const internal = request.headers.get('x-internal-secret');
  const cron = request.headers.get('x-cron-token');

  const hasBearer = Boolean(bearer?.startsWith('Bearer '));
  const hasInternal = internal === edgeSecret;
  const hasCron = cronToken ? cron === cronToken : true;

  return hasBearer && hasInternal && hasCron;
};

const isExpoToken = (token) => {
  if (!token) return false;
  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[') ||
    /^[A-Za-z0-9_-]{22,}$/.test(token)
  );
};

const chunk = (items, size) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const buildMessages = (job) => {
  const tokens = job.tokens.filter(isExpoToken);
  if (tokens.length === 0) return [];

  // Use variant from metadata to select the appropriate message
  const variant = job.metadata?.variant || 'midday';

  const copy = {
    tr: {
      midday: {
        title: 'Yeşerme Zamanı! ✨',
        body: 'Bugün neye minnettar olduğunu yazmayı unutma.',
      },
      evening: {
        title: 'Günün Nasıl Geçti? 🌙',
        body: 'Günü kapatırken minnettar olduğun anları hatırla.',
      },
    },
    en: {
      midday: {
        title: 'Time to Blossom! ✨',
        body: 'Don’t forget to note what you’re grateful for today.',
      },
      evening: {
        title: 'How was your day? 🌙',
        body: 'Reflect on the moments you are grateful for as you end the day.',
      },
    },
    es: {
      midday: {
        title: '¡Es Hora de Florecer! ✨',
        body: 'No olvides anotar aquello por lo que te sientes agradecido hoy.',
      },
      evening: {
        title: '¿Qué tal tu día? 🌙',
        body: 'Reflexiona sobre los momentos de gratitud al terminar el día.',
      },
    },
  };

  const jobLanguage = job.language?.toLowerCase();
  const language = jobLanguage === 'tr' || jobLanguage === 'es' ? jobLanguage : 'en';
  const content = copy[language][variant] || copy[language]['midday'];

  return tokens.map((token) => ({
    to: token,
    title: content.title,
    body: content.body,
    priority: 'high',
    sound: 'default',
    ttl: 600,
    data: {
      screen: 'DailyEntryTab',
      userId: job.user_id,
      language,
      metadata: job.metadata,
      ts: Date.now(),
    },
  }));
};

const dispatchExpo = async (messages, accessToken) => {
  const batches = chunk(messages, DEFAULT_BATCH_LIMIT);
  const tickets = [];

  for (const batch of batches) {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const message = await response.text();
      batch.forEach((_, index) => {
        tickets.push({
          ticket: {
            status: 'error',
            message,
          },
          index,
        });
      });
      continue;
    }

    const body = await response.json();
    body.data?.forEach((ticket, index) =>
      tickets.push({
        ticket,
        index,
      })
    );
  }
  return tickets;
};

const updateJobStatus = async (supabase, jobId, status, lastError) => {
  await supabase
    .from('notification_jobs')
    .update({
      status,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
};

const insertLogs = async (supabase, logs) => {
  if (logs.length === 0) return;
  await supabase.rpc('insert_notification_logs', {
    p_logs: logs,
  });
};

const removeInvalidTokens = async (supabase, tokens) => {
  if (tokens.size === 0) return;
  await supabase.from('push_tokens').delete().in('token', Array.from(tokens));
};

serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
    });
  }

  let config;
  try {
    config = loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown configuration error';
    console.error('[process-jobs] Configuration error:', message);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (!authorizeRequest(request, config.EDGE_INTERNAL_SECRET, config.CRON_AUTH_TOKEN)) {
    console.warn('[process-jobs] Unauthorized request blocked');
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  const { data: jobs, error: lockError } = await supabase.rpc('lock_notification_jobs', {
    p_limit: config.JOB_LIMIT,
  });

  if (lockError) {
    console.error('[process-jobs] lock_notification_jobs failed:', lockError.message);
    return new Response(
      JSON.stringify({
        error: lockError.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const claimedJobs = Array.isArray(jobs) ? jobs : [];
  if (claimedJobs.length === 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        jobs_processed: 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const logs = [];
  const invalidTokens = new Set();

  for (const job of claimedJobs) {
    if (job.attempts >= MAX_ATTEMPTS) {
      await updateJobStatus(supabase, job.id, 'failed', 'Max attempts reached');
      continue;
    }

    const messages = buildMessages(job);
    if (messages.length === 0) {
      await updateJobStatus(supabase, job.id, 'failed', 'No valid Expo tokens');
      continue;
    }

    const tickets = await dispatchExpo(messages, config.EXPO_ACCESS_TOKEN);
    let successCount = 0;
    let failureCount = 0;
    let lastError = null;

    for (const { ticket, index } of tickets) {
      const token = messages[index]?.to ?? null;
      const isOk = ticket.status === 'ok';

      if (isOk) {
        successCount += 1;
      } else {
        failureCount += 1;
        lastError = ticket.message ?? 'Unknown Expo error';
        if (
          token &&
          (ticket.details?.error === 'DeviceNotRegistered' ||
            ticket.details?.error === 'InvalidCredentials' ||
            /(invalid|not registered)/i.test(ticket.message ?? ''))
        ) {
          invalidTokens.add(token);
        }
      }

      logs.push({
        job_id: job.id,
        token,
        expo_status: ticket.status ?? null,
        expo_message: ticket.message ?? null,
        expo_ticket_id: ticket.id ?? null,
        error_detail: ticket.details ? JSON.stringify(ticket.details) : null,
      });
    }

    const statusUpdate = successCount > 0 && failureCount === 0 ? 'sent' : 'failed';
    await updateJobStatus(supabase, job.id, statusUpdate, lastError);
  }

  await insertLogs(supabase, logs);
  await removeInvalidTokens(supabase, invalidTokens);

  return new Response(
    JSON.stringify({
      ok: true,
      jobs_processed: claimedJobs.length,
      invalid_tokens: invalidTokens.size,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
});
