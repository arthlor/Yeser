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

const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const DEFAULT_RECEIPT_LIMIT = 5000;
const MAX_RECEIPT_LIMIT = 10000;
const DEFAULT_RECEIPT_MIN_AGE_MINUTES = 15;
const DEFAULT_RECEIPT_MISSING_FINALIZE_MINUTES = 60;
const DEFAULT_RECEIPT_EXPIRES_AFTER_MINUTES = 24 * 60;
const RECEIPT_BATCH_LIMIT = 1000;
const MAX_FAILURE_DETAILS = 20;
const MISSING_RECEIPT_MESSAGE =
  'Expo did not return a receipt for this ticket ID after the finalization window';
const EXPIRED_RECEIPT_MESSAGE =
  "Expo receipt was not available before Expo's receipt retention window expired";

type SupabaseAdminClient = SupabaseClient;

interface NotificationLogRow {
  id: number;
  job_id: string | null;
  token: string | null;
  expo_ticket_id: string;
  delivered_at: string;
}

interface ExpoReceiptDetails {
  error?: string | null;
  [key: string]: unknown;
}

interface ExpoReceipt {
  status?: string;
  message?: string | null;
  details?: ExpoReceiptDetails | null;
}

interface ReceiptFailureDetail {
  log_id: number;
  job_id: string | null;
  token_suffix: string | null;
  receipt_status: string | null;
  receipt_message: string | null;
  receipt_error: string | null;
}

interface JobReceiptLogRow {
  job_id: string | null;
  receipt_status: string | null;
  receipt_message: string | null;
  receipt_details: Record<string, unknown> | null;
  receipt_checked_at: string | null;
}

interface JobOutcomeSummary {
  jobs_marked_failed: number;
  jobs_marked_sent_with_failures: number;
  update_errors: number;
}

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

const positiveIntegerFromEnv = (
  value: string | undefined,
  fallback: number,
  max?: number
): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  const rounded = Math.floor(parsed);
  return max ? Math.min(rounded, max) : rounded;
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
    RECEIPT_LIMIT: positiveIntegerFromEnv(
      Deno.env.get('PUSH_RECEIPT_LIMIT'),
      DEFAULT_RECEIPT_LIMIT,
      MAX_RECEIPT_LIMIT
    ),
    RECEIPT_MIN_AGE_MINUTES: positiveIntegerFromEnv(
      Deno.env.get('PUSH_RECEIPT_MIN_AGE_MINUTES'),
      DEFAULT_RECEIPT_MIN_AGE_MINUTES
    ),
    RECEIPT_MISSING_FINALIZE_MINUTES: positiveIntegerFromEnv(
      Deno.env.get('PUSH_RECEIPT_MISSING_FINALIZE_MINUTES'),
      DEFAULT_RECEIPT_MISSING_FINALIZE_MINUTES
    ),
    RECEIPT_EXPIRES_AFTER_MINUTES: positiveIntegerFromEnv(
      Deno.env.get('PUSH_RECEIPT_EXPIRES_AFTER_MINUTES'),
      DEFAULT_RECEIPT_EXPIRES_AFTER_MINUTES
    ),
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

const chunk = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const getTokenSuffix = (token: string | null): string | null => {
  if (!token) return null;
  return token.slice(-10);
};

const getReceiptError = (receipt: ExpoReceipt): string | null => {
  const error = receipt.details?.error;
  return typeof error === 'string' && error.trim().length > 0 ? error : null;
};

const isCredentialReceiptError = (receipt: ExpoReceipt): boolean => {
  const receiptError = getReceiptError(receipt);
  if (receiptError === 'DeviceNotRegistered') {
    return false;
  }

  return (
    receiptError === 'InvalidCredentials' ||
    receiptError === 'InvalidProviderToken' ||
    receiptError === 'MismatchSenderId' ||
    /invalidcredential|invalidprovider|invalid provider|credential/i.test(receipt.message ?? '')
  );
};

const shouldDeleteTokenForReceipt = (receipt: ExpoReceipt): boolean =>
  getReceiptError(receipt) === 'DeviceNotRegistered' ||
  /not registered/i.test(receipt.message ?? '');

const buildReceiptDetails = (receipt: ExpoReceipt): Json | null => {
  const details = receipt.details ? { ...receipt.details } : {};
  const receiptError = getReceiptError(receipt);

  if (receiptError) {
    details.error = receiptError;
  }

  if (isCredentialReceiptError(receipt)) {
    details.requires_credential_fix = true;
  }

  return Object.keys(details).length > 0 ? (details as Json) : null;
};

const pushFailureDetail = (collection: ReceiptFailureDetail[], detail: ReceiptFailureDetail) => {
  if (collection.length < MAX_FAILURE_DETAILS) {
    collection.push(detail);
  }
};

const loadPendingReceiptLogs = async (
  supabase: SupabaseAdminClient,
  limit: number,
  minAgeMinutes: number
): Promise<{ rows: NotificationLogRow[]; error: string | null }> => {
  const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('notification_logs')
    .select('id, job_id, token, expo_ticket_id, delivered_at')
    .not('expo_ticket_id', 'is', null)
    .is('receipt_checked_at', null)
    .lte('delivered_at', cutoff)
    .order('delivered_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = (data ?? []).filter(
    (row): row is NotificationLogRow =>
      typeof row.id === 'number' &&
      typeof row.expo_ticket_id === 'string' &&
      typeof row.delivered_at === 'string'
  );

  return { rows, error: null };
};

const getReceiptAgeMinutes = (row: NotificationLogRow, nowMs: number): number => {
  const deliveredAtMs = Date.parse(row.delivered_at);
  if (Number.isNaN(deliveredAtMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(Math.floor((nowMs - deliveredAtMs) / 60_000), 0);
};

const buildMissingReceiptDetails = (
  error: 'ReceiptMissing' | 'ReceiptExpired',
  finalizedAfterMinutes: number,
  expiresAfterMinutes: number
): Json => ({
  error,
  missing_receipt: error === 'ReceiptMissing',
  expired_receipt: error === 'ReceiptExpired',
  finalized_after_minutes: finalizedAfterMinutes,
  expo_receipt_retention_minutes: expiresAfterMinutes,
});

const fetchReceipts = async (
  ticketIds: string[],
  accessToken: string
): Promise<Record<string, ExpoReceipt>> => {
  const response = await fetch(EXPO_PUSH_RECEIPTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ ids: ticketIds }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Expo receipt request failed (${response.status}): ${message}`);
  }

  const body = (await response.json()) as {
    data?: Record<string, ExpoReceipt>;
  };
  return body.data ?? {};
};

const getFailureMessage = (row: JobReceiptLogRow): string => {
  const detailError = row.receipt_details?.error;
  if (typeof row.receipt_message === 'string' && row.receipt_message.trim()) {
    return row.receipt_message;
  }
  if (typeof detailError === 'string' && detailError.trim()) {
    return detailError;
  }
  return 'Expo push receipt reported delivery failure';
};

const reconcileTerminalJobOutcomes = async (
  supabase: SupabaseAdminClient,
  jobIds: Set<string>,
  nowIso: string
): Promise<JobOutcomeSummary> => {
  const summary: JobOutcomeSummary = {
    jobs_marked_failed: 0,
    jobs_marked_sent_with_failures: 0,
    update_errors: 0,
  };

  const ids = Array.from(jobIds);
  if (ids.length === 0) {
    return summary;
  }

  const { data, error } = await supabase
    .from('notification_logs')
    .select('job_id, receipt_status, receipt_message, receipt_details, receipt_checked_at')
    .in('job_id', ids)
    .not('expo_ticket_id', 'is', null);

  if (error) {
    console.error('[check-push-receipts] Failed to load job receipt outcomes:', error.message);
    summary.update_errors += ids.length;
    return summary;
  }

  const logsByJobId = new Map<string, JobReceiptLogRow[]>();
  for (const row of (data ?? []) as JobReceiptLogRow[]) {
    if (!row.job_id) continue;
    const rows = logsByJobId.get(row.job_id) ?? [];
    rows.push(row);
    logsByJobId.set(row.job_id, rows);
  }

  for (const [jobId, logs] of logsByJobId.entries()) {
    if (logs.length === 0) continue;

    const hasUncheckedReceipt = logs.some((row) => !row.receipt_checked_at || !row.receipt_status);
    if (hasUncheckedReceipt) {
      continue;
    }

    const okLogs = logs.filter((row) => row.receipt_status === 'ok');
    const failureLogs = logs.filter((row) => row.receipt_status !== 'ok');
    if (failureLogs.length === 0) {
      continue;
    }

    const lastError = getFailureMessage(failureLogs[0]);
    const status = okLogs.length > 0 ? 'sent' : 'failed';
    const { error: updateError } = await supabase
      .from('notification_jobs')
      .update({
        status,
        last_error: lastError,
        updated_at: nowIso,
      })
      .eq('id', jobId);

    if (updateError) {
      summary.update_errors += 1;
      console.error('[check-push-receipts] Failed to update terminal job outcome:', {
        jobId,
        error: updateError.message,
      });
      continue;
    }

    if (status === 'failed') {
      summary.jobs_marked_failed += 1;
    } else {
      summary.jobs_marked_sent_with_failures += 1;
    }
  }

  return summary;
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
    console.error('[check-push-receipts] Configuration error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const auth = authorizeRequest(
    request,
    config.EDGE_INTERNAL_SECRET,
    config.CRON_AUTH_TOKEN,
    config.ACCEPTED_SERVICE_ROLE_KEYS
  );

  if (!auth.authorized) {
    console.warn('[check-push-receipts] Unauthorized request blocked:', auth.failures.join(', '));
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const supabase: SupabaseAdminClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  const pending = await loadPendingReceiptLogs(
    supabase,
    config.RECEIPT_LIMIT,
    config.RECEIPT_MIN_AGE_MINUTES
  );

  if (pending.error) {
    console.error('[check-push-receipts] Failed to load pending logs:', pending.error);
    return new Response(JSON.stringify({ error: pending.error }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  if (pending.rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, receipts_checked: 0 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const invalidTokens = new Set<string>();
  const missingLogIdsToFinalize = new Set<number>();
  const expiredLogIdsToFinalize = new Set<number>();
  const missingJobIdsToAnnotate = new Set<string>();
  const expiredJobIdsToAnnotate = new Set<string>();
  const affectedJobIds = new Set<string>();
  const credentialFailureDetails: ReceiptFailureDetail[] = [];
  const invalidTokenFailureDetails: ReceiptFailureDetail[] = [];
  const deliveryFailureDetails: ReceiptFailureDetail[] = [];
  const staleReceiptFailureDetails: ReceiptFailureDetail[] = [];
  let receiptsChecked = 0;
  let receiptOk = 0;
  let receiptError = 0;
  let credentialErrors = 0;
  let missingReceipts = 0;
  let missingReceiptsFinalized = 0;
  let missingReceiptsPending = 0;
  let expiredReceiptsFinalized = 0;
  let updateErrors = 0;

  const rowsByTicketId = new Map<string, NotificationLogRow[]>();
  for (const row of pending.rows) {
    const rows = rowsByTicketId.get(row.expo_ticket_id) ?? [];
    rows.push(row);
    rowsByTicketId.set(row.expo_ticket_id, rows);
  }

  for (const ticketIdBatch of chunk([...rowsByTicketId.keys()], RECEIPT_BATCH_LIMIT)) {
    let receipts: Record<string, ExpoReceipt>;
    try {
      receipts = await fetchReceipts(ticketIdBatch, config.EXPO_ACCESS_TOKEN);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[check-push-receipts] Expo receipt request failed:', message);
      return new Response(
        JSON.stringify({
          error: message,
          receipts_requested: pending.rows.length,
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    for (const ticketId of ticketIdBatch) {
      const rows = rowsByTicketId.get(ticketId) ?? [];
      const receipt = receipts[ticketId];

      if (!receipt) {
        missingReceipts += rows.length;
        for (const row of rows) {
          const receiptAgeMinutes = getReceiptAgeMinutes(row, nowMs);
          if (receiptAgeMinutes < config.RECEIPT_MISSING_FINALIZE_MINUTES) {
            missingReceiptsPending += 1;
            continue;
          }

          const isExpired = receiptAgeMinutes >= config.RECEIPT_EXPIRES_AFTER_MINUTES;
          const receiptStatus = isExpired ? 'expired' : 'missing';
          const receiptMessage = isExpired ? EXPIRED_RECEIPT_MESSAGE : MISSING_RECEIPT_MESSAGE;
          const receiptError = isExpired ? 'ReceiptExpired' : 'ReceiptMissing';

          if (isExpired) {
            expiredReceiptsFinalized += 1;
            expiredLogIdsToFinalize.add(row.id);
          } else {
            missingReceiptsFinalized += 1;
            missingLogIdsToFinalize.add(row.id);
          }

          if (row.job_id) {
            if (isExpired) {
              expiredJobIdsToAnnotate.add(row.job_id);
            } else {
              missingJobIdsToAnnotate.add(row.job_id);
            }
          }

          pushFailureDetail(staleReceiptFailureDetails, {
            log_id: row.id,
            job_id: row.job_id,
            token_suffix: getTokenSuffix(row.token),
            receipt_status: receiptStatus,
            receipt_message: receiptMessage,
            receipt_error: receiptError,
          });
        }
        continue;
      }

      const isOk = receipt.status === 'ok';
      const receiptDetails = buildReceiptDetails(receipt);

      for (const row of rows) {
        receiptsChecked += 1;
        if (isOk) {
          receiptOk += 1;
        } else {
          receiptError += 1;

          const failureDetail: ReceiptFailureDetail = {
            log_id: row.id,
            job_id: row.job_id,
            token_suffix: getTokenSuffix(row.token),
            receipt_status: receipt.status ?? null,
            receipt_message: receipt.message ?? null,
            receipt_error: getReceiptError(receipt),
          };

          if (isCredentialReceiptError(receipt)) {
            credentialErrors += 1;
            pushFailureDetail(credentialFailureDetails, failureDetail);
          }

          if (row.token && shouldDeleteTokenForReceipt(receipt)) {
            invalidTokens.add(row.token);
            pushFailureDetail(invalidTokenFailureDetails, failureDetail);
          } else if (!isCredentialReceiptError(receipt)) {
            pushFailureDetail(deliveryFailureDetails, failureDetail);
          }
        }

        const { error: updateError } = await supabase
          .from('notification_logs')
          .update({
            receipt_status: receipt.status ?? null,
            receipt_message: receipt.message ?? null,
            receipt_details: receiptDetails,
            receipt_checked_at: nowIso,
          })
          .eq('id', row.id);

        if (updateError) {
          updateErrors += 1;
          console.error('[check-push-receipts] Failed to update receipt log:', {
            logId: row.id,
            error: updateError.message,
          });
        }

        if (row.job_id) {
          affectedJobIds.add(row.job_id);
        }

        if (!isOk && row.job_id) {
          await supabase
            .from('notification_jobs')
            .update({
              last_error:
                receipt.message ??
                getReceiptError(receipt) ??
                'Expo push receipt reported delivery failure',
              updated_at: nowIso,
            })
            .eq('id', row.job_id);
        }
      }
    }
  }

  if (invalidTokens.size > 0) {
    await supabase.from('push_tokens').delete().in('token', Array.from(invalidTokens));
  }

  if (missingLogIdsToFinalize.size > 0) {
    const { error: missingUpdateError } = await supabase
      .from('notification_logs')
      .update({
        receipt_status: 'missing',
        receipt_message: MISSING_RECEIPT_MESSAGE,
        receipt_details: buildMissingReceiptDetails(
          'ReceiptMissing',
          config.RECEIPT_MISSING_FINALIZE_MINUTES,
          config.RECEIPT_EXPIRES_AFTER_MINUTES
        ),
        receipt_checked_at: nowIso,
      })
      .in('id', Array.from(missingLogIdsToFinalize));

    if (missingUpdateError) {
      updateErrors += missingLogIdsToFinalize.size;
      console.error('[check-push-receipts] Failed to finalize missing receipts:', {
        count: missingLogIdsToFinalize.size,
        error: missingUpdateError.message,
      });
    }
  }

  if (expiredLogIdsToFinalize.size > 0) {
    const { error: expiredUpdateError } = await supabase
      .from('notification_logs')
      .update({
        receipt_status: 'expired',
        receipt_message: EXPIRED_RECEIPT_MESSAGE,
        receipt_details: buildMissingReceiptDetails(
          'ReceiptExpired',
          config.RECEIPT_MISSING_FINALIZE_MINUTES,
          config.RECEIPT_EXPIRES_AFTER_MINUTES
        ),
        receipt_checked_at: nowIso,
      })
      .in('id', Array.from(expiredLogIdsToFinalize));

    if (expiredUpdateError) {
      updateErrors += expiredLogIdsToFinalize.size;
      console.error('[check-push-receipts] Failed to finalize expired receipts:', {
        count: expiredLogIdsToFinalize.size,
        error: expiredUpdateError.message,
      });
    }
  }

  if (missingJobIdsToAnnotate.size > 0) {
    for (const jobId of missingJobIdsToAnnotate) {
      affectedJobIds.add(jobId);
    }

    await supabase
      .from('notification_jobs')
      .update({
        last_error: MISSING_RECEIPT_MESSAGE,
        updated_at: nowIso,
      })
      .in('id', Array.from(missingJobIdsToAnnotate));
  }

  if (expiredJobIdsToAnnotate.size > 0) {
    for (const jobId of expiredJobIdsToAnnotate) {
      affectedJobIds.add(jobId);
    }

    await supabase
      .from('notification_jobs')
      .update({
        last_error: EXPIRED_RECEIPT_MESSAGE,
        updated_at: nowIso,
      })
      .in('id', Array.from(expiredJobIdsToAnnotate));
  }

  const jobOutcomeSummary = await reconcileTerminalJobOutcomes(supabase, affectedJobIds, nowIso);
  updateErrors += jobOutcomeSummary.update_errors;

  const failureDetails = [
    ...credentialFailureDetails,
    ...invalidTokenFailureDetails,
    ...deliveryFailureDetails,
    ...staleReceiptFailureDetails,
  ].slice(0, MAX_FAILURE_DETAILS);

  const summary = {
    ok: true,
    receipts_requested: pending.rows.length,
    receipts_checked: receiptsChecked,
    receipt_ok: receiptOk,
    receipt_error: receiptError,
    credential_errors: credentialErrors,
    missing_receipts: missingReceipts,
    missing_receipts_finalized: missingReceiptsFinalized,
    missing_receipts_pending: missingReceiptsPending,
    expired_receipts_finalized: expiredReceiptsFinalized,
    invalid_tokens: invalidTokens.size,
    jobs_marked_failed: jobOutcomeSummary.jobs_marked_failed,
    jobs_marked_sent_with_failures: jobOutcomeSummary.jobs_marked_sent_with_failures,
    update_errors: updateErrors,
    credential_failure_details: credentialFailureDetails,
    invalid_token_failure_details: invalidTokenFailureDetails,
    failure_details: failureDetails,
  };

  if (
    receiptError > 0 ||
    credentialErrors > 0 ||
    missingReceiptsFinalized > 0 ||
    expiredReceiptsFinalized > 0
  ) {
    console.warn('[check-push-receipts] Expo receipt failures:', summary);
  } else {
    console.log('[check-push-receipts] Expo receipt summary:', summary);
  }

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
