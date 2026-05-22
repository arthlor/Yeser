import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Json | undefined;
    }
  | Json[];

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_JOB_LIMIT = 200;
const MAX_ATTEMPTS = 5;
const MAX_FAILURE_DETAILS = 20;
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
  error_detail: Json | null;
}

interface DeliveryFailureDetail {
  job_id: string;
  token_suffix: string | null;
  expo_status: string | null;
  expo_message: string | null;
  expo_error: string | null;
}

interface DeliveryDiagnostics {
  jobs_processed: number;
  messages_built: number;
  ticket_ok: number;
  ticket_error: number;
  invalid_tokens: number;
  credential_errors: number;
  log_insert_error: string | null;
  failure_details: DeliveryFailureDetail[];
}

type SupabaseAdminClient = SupabaseClient;

const parseSecretKeyDictionary = (raw: string | undefined): string[] => {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.values(parsed)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
  } catch {
    return [];
  }
};

const resolveServiceRoleKeys = (): string[] => {
  const keys = new Set<string>();
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (legacyKey) {
    keys.add(legacyKey);
  }

  for (const key of parseSecretKeyDictionary(Deno.env.get('SUPABASE_SECRET_KEYS'))) {
    keys.add(key);
  }

  return [...keys];
};

const loadConfig = () => {
  const serviceRoleKeys = resolveServiceRoleKeys();
  const config = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKeys[0] ?? '',
    ACCEPTED_SERVICE_ROLE_KEYS: serviceRoleKeys,
    EDGE_INTERNAL_SECRET: Deno.env.get('EDGE_INTERNAL_SECRET') ?? '',
    CRON_AUTH_TOKEN: Deno.env.get('CRON_AUTH_TOKEN')?.trim() || undefined,
    EXPO_ACCESS_TOKEN: Deno.env.get('EXPO_ACCESS_TOKEN') ?? '',
    JOB_LIMIT: Number(Deno.env.get('JOB_PROCESS_LIMIT') ?? DEFAULT_JOB_LIMIT),
  };

  const missing: string[] = [];
  if (!config.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (config.ACCEPTED_SERVICE_ROLE_KEYS.length === 0) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS');
  }
  if (!config.EDGE_INTERNAL_SECRET) missing.push('EDGE_INTERNAL_SECRET');
  if (!config.EXPO_ACCESS_TOKEN) missing.push('EXPO_ACCESS_TOKEN');

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return config;
};

const authorizeRequest = (
  request: Request,
  edgeSecret: string,
  cronToken: string | undefined,
  acceptedServiceRoleKeys: string[]
): { authorized: boolean; failures: string[] } => {
  const internal = request.headers.get('x-internal-secret')?.trim() ?? '';
  const cron = request.headers.get('x-cron-token')?.trim() ?? '';
  const bearer =
    request.headers
      .get('authorization')
      ?.trim()
      .replace(/^Bearer\s+/i, '') ?? '';

  const normalizedEdgeSecret = edgeSecret.trim();
  const hasInternal = internal.length > 0 && internal === normalizedEdgeSecret;
  const hasServiceRoleBearer = bearer.length > 0 && acceptedServiceRoleKeys.includes(bearer);
  const hasCron = hasServiceRoleBearer || (cronToken ? cron === cronToken.trim() : true);

  const failures: string[] = [];
  if (!hasInternal && !hasServiceRoleBearer) {
    failures.push('internal_or_service_role');
  }
  if (!hasCron) failures.push('cron');

  return {
    authorized: failures.length === 0,
    failures,
  };
};

const isExpoToken = (token: string) => {
  if (!token) return false;
  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[') ||
    /^[A-Za-z0-9_-]{22,}$/.test(token)
  );
};

const getTokenSuffix = (token: string | null): string | null => {
  if (!token) return null;
  return token.slice(-10);
};

const getTicketError = (ticket: ExpoTicket): string | null => {
  const error = ticket.details?.error;
  return typeof error === 'string' && error.trim().length > 0 ? error : null;
};

const shouldDeleteTokenForTicket = (ticket: ExpoTicket): boolean =>
  getTicketError(ticket) === 'DeviceNotRegistered' || /not registered/i.test(ticket.message ?? '');

const isCredentialTicketError = (ticket: ExpoTicket): boolean => {
  const ticketError = getTicketError(ticket);
  if (ticketError === 'DeviceNotRegistered') {
    return false;
  }

  return (
    ticketError === 'InvalidCredentials' ||
    ticketError === 'InvalidProviderToken' ||
    ticketError === 'MismatchSenderId' ||
    /invalidcredential|invalidprovider|invalid provider|credential/i.test(ticket.message ?? '')
  );
};

const buildErrorDetail = (ticket: ExpoTicket): Json | null => {
  const details = ticket.details ? { ...ticket.details } : {};
  const ticketError = getTicketError(ticket);

  if (ticketError) {
    details.error = ticketError;
  }

  if (isCredentialTicketError(ticket)) {
    details.requires_credential_fix = true;
  }

  return Object.keys(details).length > 0 ? (details as Json) : null;
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
    if (language === 'es') {
      return `hace ${weeks} semana${weeks === 1 ? '' : 's'}`;
    }
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  if (language === 'tr') return `${safeAgeDays} gün önce`;
  if (language === 'es') {
    return `hace ${safeAgeDays} día${safeAgeDays === 1 ? '' : 's'}`;
  }
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
  let batchStartIndex = 0;

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
          index: batchStartIndex + index,
        });
      });
      batchStartIndex += batch.length;
      continue;
    }

    const body = (await response.json()) as {
      data?: ExpoTicket[];
      errors?: ExpoTicket[];
    };
    if (!body.data || body.data.length === 0) {
      const message = body.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join('; ');
      batch.forEach((_, index: number) => {
        tickets.push({
          ticket: {
            status: 'error',
            message: message || 'Expo push response did not include ticket data',
            details: body.errors?.[0]?.details ?? null,
          },
          index: batchStartIndex + index,
        });
      });
    } else {
      body.data.forEach((ticket, index: number) =>
        tickets.push({
          ticket,
          index: batchStartIndex + index,
        })
      );
    }
    batchStartIndex += batch.length;
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

const insertLogs = async (
  supabase: SupabaseAdminClient,
  logs: NotificationLogInsert[]
): Promise<string | null> => {
  if (logs.length === 0) return null;
  const { error } = await supabase.rpc('insert_notification_logs', {
    p_logs: logs as unknown as Json,
  });

  if (error) {
    console.error('[send-daily-reminders] insert_notification_logs failed:', error.message);
    return error.message;
  }

  return null;
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

  const auth = authorizeRequest(
    request,
    config.EDGE_INTERNAL_SECRET,
    config.CRON_AUTH_TOKEN,
    config.ACCEPTED_SERVICE_ROLE_KEYS
  );

  if (!auth.authorized) {
    console.warn('[send-daily-reminders] Unauthorized request blocked:', auth.failures.join(', '));
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

  const diagnostics: DeliveryDiagnostics = {
    jobs_processed: claimedJobs.length,
    messages_built: 0,
    ticket_ok: 0,
    ticket_error: 0,
    invalid_tokens: 0,
    credential_errors: 0,
    log_insert_error: null,
    failure_details: [],
  };
  const logs: NotificationLogInsert[] = [];
  const invalidTokens = new Set<string>();

  for (const job of claimedJobs) {
    if (job.attempts >= MAX_ATTEMPTS) {
      await updateJobStatus(supabase, job.id, 'failed', 'Max attempts reached');
      continue;
    }

    const messages = buildMessages(job);
    diagnostics.messages_built += messages.length;
    if (messages.length === 0) {
      await updateJobStatus(supabase, job.id, 'failed', 'No valid Expo tokens');
      continue;
    }

    const tickets = await dispatchExpo(messages, config.EXPO_ACCESS_TOKEN);
    let successCount = 0;
    let failureCount = 0;
    let lastError: string | null = tickets.length === 0 ? 'Expo returned no push tickets' : null;

    if (tickets.length === 0) {
      failureCount = messages.length;
      diagnostics.ticket_error += messages.length;
    }

    for (const { ticket, index } of tickets) {
      const token = messages[index]?.to ?? null;
      const isOk = ticket.status === 'ok';
      const ticketError = getTicketError(ticket);

      if (isOk) {
        successCount += 1;
        diagnostics.ticket_ok += 1;
      } else {
        failureCount += 1;
        diagnostics.ticket_error += 1;
        lastError = ticket.message ?? 'Unknown Expo error';

        if (isCredentialTicketError(ticket)) {
          diagnostics.credential_errors += 1;
        }

        if (token && shouldDeleteTokenForTicket(ticket)) {
          invalidTokens.add(token);
        }

        if (diagnostics.failure_details.length < MAX_FAILURE_DETAILS) {
          diagnostics.failure_details.push({
            job_id: job.id,
            token_suffix: getTokenSuffix(token),
            expo_status: ticket.status ?? null,
            expo_message: ticket.message ?? null,
            expo_error: ticketError,
          });
        }
      }

      logs.push({
        job_id: job.id,
        token,
        expo_status: ticket.status ?? null,
        expo_message: ticket.message ?? null,
        expo_ticket_id: ticket.id ?? null,
        error_detail: buildErrorDetail(ticket),
      });
    }

    const statusUpdate = successCount > 0 ? 'sent' : 'failed';
    await updateJobStatus(supabase, job.id, statusUpdate, lastError);
  }

  diagnostics.log_insert_error = await insertLogs(supabase, logs);
  await removeInvalidTokens(supabase, invalidTokens);
  diagnostics.invalid_tokens = invalidTokens.size;

  if (diagnostics.ticket_error > 0 || diagnostics.credential_errors > 0) {
    console.warn('[send-daily-reminders] Expo push ticket failures:', diagnostics);
  } else {
    console.log('[send-daily-reminders] Expo push ticket summary:', diagnostics);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      ...diagnostics,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
});
