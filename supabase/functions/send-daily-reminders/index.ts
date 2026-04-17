import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_JOB_LIMIT = 200;
const MAX_ATTEMPTS = 5;
type NotificationLanguage = 'tr' | 'en' | 'es';
type ReminderVariant = 'midday' | 'evening';

interface ReminderCopy {
  title: string;
  body: string;
}

interface NotificationJobMetadata {
  variant?: ReminderVariant | null;
  memory_statement?: string | null;
  memory_age_days?: number | string | null;
  [key: string]: unknown;
}

interface ClaimedJob {
  id: string;
  user_id: string;
  attempts: number;
  tokens: string[];
  language?: string | null;
  metadata?: NotificationJobMetadata | null;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  priority: 'high';
  sound: 'default';
  ttl: number;
  data: {
    screen: 'DailyEntryTab';
    userId: string;
    language: NotificationLanguage;
    metadata: NotificationJobMetadata | null | undefined;
    ts: number;
  };
}

interface ExpoTicketDetails {
  error?: string | null;
  [key: string]: unknown;
}

interface ExpoTicket {
  status?: string;
  message?: string | null;
  id?: string | null;
  details?: ExpoTicketDetails | null;
}

interface DispatchTicket {
  ticket: ExpoTicket;
  index: number;
}

interface NotificationLogInsert {
  job_id: string;
  token: string | null;
  expo_status: string | null;
  expo_message: string | null;
  expo_ticket_id: string | null;
  error_detail: string | null;
}

type SupabaseAdminClient = SupabaseClient;

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

const authorizeRequest = (
  request: Request,
  edgeSecret: string,
  serviceRoleKey: string,
  cronToken: string | undefined
) => {
  const bearer = request.headers.get('authorization')?.trim();
  const internal = request.headers.get('x-internal-secret');
  const cron = request.headers.get('x-cron-token');

  const bearerToken =
    bearer && bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length).trim() : null;
  const acceptedBearerTokens = [serviceRoleKey, cronToken]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .map((value) => value.trim());

  const hasBearer = Boolean(bearerToken && acceptedBearerTokens.includes(bearerToken));
  const hasInternal = internal === edgeSecret;
  const hasCron = cronToken ? cron === cronToken : true;

  return hasBearer && hasInternal && hasCron;
};

const isExpoToken = (token: string) => {
  if (!token) return false;
  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[') ||
    /^[A-Za-z0-9_-]{22,}$/.test(token)
  );
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const normalizeMemoryStatement = (statement: string | null | undefined) =>
  String(statement ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const truncateMemoryStatement = (statement: string, maxLength: number = 84) => {
  if (statement.length <= maxLength) {
    return statement;
  }

  return `${statement.slice(0, maxLength - 1).trimEnd()}…`;
};

const getRelativeMemoryLabel = (language: NotificationLanguage, ageDays: number) => {
  const safeAgeDays = Math.max(Number(ageDays) || 0, 0);

  if (safeAgeDays >= 30) {
    const months = Math.max(Math.round(safeAgeDays / 30), 1);
    if (language === 'tr') return `${months} ay önce`;
    if (language === 'es') return `hace ${months} meses`;
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  if (safeAgeDays >= 7) {
    const weeks = Math.max(Math.round(safeAgeDays / 7), 1);
    if (language === 'tr') return `${weeks} hafta önce`;
    if (language === 'es') return `hace ${weeks} semana${weeks === 1 ? '' : 's'}`;
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  if (language === 'tr') return `${safeAgeDays} gün önce`;
  if (language === 'es') return `hace ${safeAgeDays} día${safeAgeDays === 1 ? '' : 's'}`;
  return `${safeAgeDays} day${safeAgeDays === 1 ? '' : 's'} ago`;
};

const getPersonalizedReminderCopy = (
  language: NotificationLanguage,
  ageDays: number,
  statement: string
) => {
  const relativeLabel = getRelativeMemoryLabel(language, ageDays);
  const sanitizedStatement = truncateMemoryStatement(normalizeMemoryStatement(statement));

  switch (language) {
    case 'tr':
      return {
        title: 'Uzun zaman oldu...',
        body: `${relativeLabel} şöyle demiştin: "${sanitizedStatement}"`,
      };
    case 'es':
      return {
        title: 'Cuánto tiempo...',
        body: `Recuerda que ${relativeLabel} dijiste: "${sanitizedStatement}"`,
      };
    default:
      return {
        title: 'Long time no see...',
        body: `Remember ${relativeLabel} you said: "${sanitizedStatement}"`,
      };
  }
};

const buildMessages = (job: ClaimedJob): ExpoPushMessage[] => {
  const tokens = job.tokens.filter(isExpoToken);
  if (tokens.length === 0) return [];

  const copy: Record<NotificationLanguage, Record<ReminderVariant, ReminderCopy>> = {
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
  const language: NotificationLanguage =
    jobLanguage === 'tr' || jobLanguage === 'es' ? jobLanguage : 'en';
  const reminderVariant: ReminderVariant =
    job.metadata?.variant === 'evening' ? 'evening' : 'midday';
  const memoryStatement =
    typeof job.metadata?.memory_statement === 'string' ? job.metadata.memory_statement : '';
  const memoryAgeDays = Number(job.metadata?.memory_age_days);
  const hasPersonalizedMemory = memoryStatement.trim().length > 0 && memoryAgeDays >= 14;
  const content = hasPersonalizedMemory
    ? getPersonalizedReminderCopy(language, memoryAgeDays, memoryStatement)
    : copy[language][reminderVariant];

  return tokens.map((token: string) => ({
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

const dispatchExpo = async (
  messages: ExpoPushMessage[],
  accessToken: string
): Promise<DispatchTicket[]> => {
  const batches = chunk(messages, DEFAULT_BATCH_LIMIT);
  const tickets: DispatchTicket[] = [];

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
      batch.forEach((_, index: number) => {
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

    const body = (await response.json()) as { data?: ExpoTicket[] };
    body.data?.forEach((ticket, index: number) =>
      tickets.push({
        ticket,
        index,
      })
    );
  }
  return tickets;
};

const updateJobStatus = async (
  supabase: SupabaseAdminClient,
  jobId: string,
  status: string,
  lastError: string | null
) => {
  await supabase
    .from('notification_jobs')
    .update({
      status,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
};

const insertLogs = async (supabase: SupabaseAdminClient, logs: NotificationLogInsert[]) => {
  if (logs.length === 0) return;
  await supabase.rpc('insert_notification_logs', {
    p_logs: logs as unknown as Json,
  });
};

const removeInvalidTokens = async (supabase: SupabaseAdminClient, tokens: Set<string>) => {
  if (tokens.size === 0) return;
  await supabase.from('push_tokens').delete().in('token', Array.from(tokens));
};

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
    });
  }

  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown configuration error';
    console.error('[send-daily-reminders] Configuration error:', message);
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

  if (
    !authorizeRequest(
      request,
      config.EDGE_INTERNAL_SECRET,
      config.SUPABASE_SERVICE_ROLE_KEY,
      config.CRON_AUTH_TOKEN
    )
  ) {
    console.warn('[send-daily-reminders] Unauthorized request blocked');
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const supabase: SupabaseAdminClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: jobs, error: lockError } = await supabase.rpc('lock_notification_jobs', {
    p_limit: config.JOB_LIMIT,
  });

  if (lockError) {
    console.error('[send-daily-reminders] lock_notification_jobs failed:', lockError.message);
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

  const claimedJobs: ClaimedJob[] = Array.isArray(jobs) ? (jobs as ClaimedJob[]) : [];
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

  const logs: NotificationLogInsert[] = [];
  const invalidTokens = new Set<string>();

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
