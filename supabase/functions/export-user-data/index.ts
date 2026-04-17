import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupportedLanguage = 'tr' | 'en' | 'es';
type LanguageDetectionMethod = 'header' | 'body' | 'profile' | 'accept-language' | 'fallback';
type DetectionConfidence = 'high' | 'medium' | 'low';

type RequestLanguageField = 'language' | 'lang' | 'locale' | 'userLanguage';
type RequestBody = Partial<Record<RequestLanguageField, string>> & Record<string, unknown>;

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface LanguageDetectionResult {
  language: SupportedLanguage;
  method: LanguageDetectionMethod;
  confidence: DetectionConfidence;
}

interface LocalizedGratitudeBenefit {
  id: number;
  icon: string | null;
  title: string;
  description: string;
  stat: string | null;
  cta_prompt: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface LocalizedDailyPrompt {
  id: string;
  prompt_text: string;
  category: string | null;
}

interface ExportMetadata {
  total_entries: number;
  total_statements: number;
  active_months: number;
  first_entry_date: string | null;
  last_entry_date: string | null;
  export_language: SupportedLanguage;
  localized_content_included: boolean;
  language_detection_method: LanguageDetectionMethod;
  language_detection_confidence: DetectionConfidence;
}

interface Database {
  public: {
    Tables: {
      gratitude_benefits: {
        Row: {
          id: number;
          icon: string | null;
          title_tr: string;
          title_en: string | null;
          title_es?: string | null;
          description_tr: string;
          description_en: string | null;
          description_es?: string | null;
          stat_tr: string | null;
          stat_en: string | null;
          stat_es?: string | null;
          cta_prompt_tr: string | null;
          cta_prompt_en: string | null;
          cta_prompt_es?: string | null;
          display_order: number;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      daily_prompts: {
        Row: {
          id: string;
          prompt_text_tr: string;
          prompt_text_en: string | null;
          prompt_text_es?: string | null;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          language: string | null;
          daily_gratitude_goal: number | null;
          notification_time: string | null;
          timezone: string | null;
          use_varied_prompts: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      gratitude_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          statements: Json | null;
          created_at: string;
          updated_at: string | null;
        };
      };
    };
  };
}

type SupabaseEdgeClient = SupabaseClient<Database>;

const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['tr', 'en', 'es'];
const DEFAULT_LANGUAGE: SupportedLanguage = 'tr';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, accept-language, x-user-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXPORT_LIMITS = {
  DAILY_PROMPTS_SAMPLE_SIZE: 20,
  MAX_ENTRIES_PER_REQUEST: 10000,
};

const logger = {
  info: (message: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.log(message, payload);
      return;
    }
    console.log(message);
  },
  warn: (message: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.warn(message, payload);
      return;
    }
    console.warn(message);
  },
  error: (message: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.error(message, payload);
      return;
    }
    console.error(message);
  },
};

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });

const matchSupportedLanguage = (value: string | null | undefined): SupportedLanguage | null => {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().trim();
  const directMatch = SUPPORTED_LANGUAGES.find((lang) => normalized === lang);
  if (directMatch) {
    return directMatch;
  }

  const prefixMatch = SUPPORTED_LANGUAGES.find((lang) => normalized.startsWith(`${lang}-`));
  return prefixMatch ?? null;
};

const parseAcceptLanguage = (acceptLanguage: string | null): SupportedLanguage | null => {
  if (!acceptLanguage) {
    return null;
  }

  const candidates = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0]?.trim() ?? '')
    .filter(Boolean);

  for (const candidate of candidates) {
    const resolved = matchSupportedLanguage(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const detectUserLanguage = (
  userLanguageHeader: string | null,
  requestBody: RequestBody | null,
  acceptLanguage: string | null,
  profileLanguage: string | null
): LanguageDetectionResult => {
  const headerLanguage = matchSupportedLanguage(userLanguageHeader);
  if (headerLanguage) {
    return { language: headerLanguage, method: 'header', confidence: 'high' };
  }

  if (requestBody) {
    const bodyLanguageFields: RequestLanguageField[] = [
      'language',
      'lang',
      'locale',
      'userLanguage',
    ];
    for (const field of bodyLanguageFields) {
      const potentialLanguage = requestBody[field];
      const resolvedLanguage =
        typeof potentialLanguage === 'string' ? matchSupportedLanguage(potentialLanguage) : null;
      if (resolvedLanguage) {
        return { language: resolvedLanguage, method: 'body', confidence: 'high' };
      }
    }
  }

  const resolvedProfileLanguage = matchSupportedLanguage(profileLanguage);
  if (resolvedProfileLanguage) {
    return { language: resolvedProfileLanguage, method: 'profile', confidence: 'high' };
  }

  const acceptLanguageMatch = parseAcceptLanguage(acceptLanguage);
  if (acceptLanguageMatch) {
    return { language: acceptLanguageMatch, method: 'accept-language', confidence: 'medium' };
  }

  return { language: DEFAULT_LANGUAGE, method: 'fallback', confidence: 'low' };
};

const parseRequestBody = async (req: Request): Promise<RequestBody | null> => {
  try {
    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return null;
    }
    return JSON.parse(rawBody) as RequestBody;
  } catch {
    logger.info('No valid JSON body provided; continuing with headers only');
    return null;
  }
};

const pickLocalizedText = (
  language: SupportedLanguage,
  tr: string | null | undefined,
  en: string | null | undefined,
  es: string | null | undefined
): string => {
  const safeTr = (tr ?? '').trim();
  const safeEn = (en ?? '').trim();
  const safeEs = (es ?? '').trim();

  if (language === 'es') {
    return safeEs || safeEn || safeTr;
  }
  if (language === 'en') {
    return safeEn || safeTr;
  }
  return safeTr;
};

const localizeGratitudeBenefit = (
  benefit: Database['public']['Tables']['gratitude_benefits']['Row'],
  language: SupportedLanguage
): LocalizedGratitudeBenefit => ({
  id: benefit.id,
  icon: benefit.icon,
  title: pickLocalizedText(language, benefit.title_tr, benefit.title_en, benefit.title_es),
  description: pickLocalizedText(
    language,
    benefit.description_tr,
    benefit.description_en,
    benefit.description_es
  ),
  stat: pickLocalizedText(language, benefit.stat_tr, benefit.stat_en, benefit.stat_es) || null,
  cta_prompt:
    pickLocalizedText(
      language,
      benefit.cta_prompt_tr,
      benefit.cta_prompt_en,
      benefit.cta_prompt_es
    ) || null,
  display_order: benefit.display_order,
  is_active: benefit.is_active ?? true,
  created_at: benefit.created_at,
  updated_at: benefit.updated_at,
});

const localizeDailyPrompt = (
  prompt: Database['public']['Tables']['daily_prompts']['Row'],
  language: SupportedLanguage
): LocalizedDailyPrompt => ({
  id: prompt.id,
  prompt_text: pickLocalizedText(
    language,
    prompt.prompt_text_tr,
    prompt.prompt_text_en,
    prompt.prompt_text_es
  ),
  category: prompt.category,
});

const fetchLocalizedBenefits = async (
  supabaseClient: SupabaseEdgeClient,
  language: SupportedLanguage
): Promise<LocalizedGratitudeBenefit[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('gratitude_benefits')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logger.warn('Error fetching gratitude benefits', error);
      return [];
    }

    return (data ?? []).map((benefit: Database['public']['Tables']['gratitude_benefits']['Row']) =>
      localizeGratitudeBenefit(benefit, language)
    );
  } catch (error) {
    logger.warn('Unexpected error while fetching gratitude benefits', error);
    return [];
  }
};

const fetchLocalizedPrompts = async (
  supabaseClient: SupabaseEdgeClient,
  language: SupportedLanguage
): Promise<LocalizedDailyPrompt[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('daily_prompts')
      .select('*')
      .eq('is_active', true)
      .limit(EXPORT_LIMITS.DAILY_PROMPTS_SAMPLE_SIZE);

    if (error) {
      logger.warn('Error fetching daily prompts', error);
      return [];
    }

    return (data ?? []).map((prompt: Database['public']['Tables']['daily_prompts']['Row']) =>
      localizeDailyPrompt(prompt, language)
    );
  } catch (error) {
    logger.warn('Unexpected error while fetching daily prompts', error);
    return [];
  }
};

const toStringArray = (value: Json | null): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

interface SanitizedEntry {
  id: string;
  entry_date: string;
  statements: string[];
  created_at: string;
  updated_at: string | null;
}

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type GratitudeEntryRow = Database['public']['Tables']['gratitude_entries']['Row'];

const calculateExportMetadata = (
  entries: SanitizedEntry[],
  languageDetection: LanguageDetectionResult
): ExportMetadata => {
  const totalEntries = entries.length;
  const totalStatements = entries.reduce((total, entry) => total + entry.statements.length, 0);

  const uniqueMonths = new Set(
    entries.map((entry) => {
      const date = new Date(entry.entry_date);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  );
  uniqueMonths.delete(null);

  return {
    total_entries: totalEntries,
    total_statements: totalStatements,
    active_months: uniqueMonths.size,
    first_entry_date: totalEntries > 0 ? entries[entries.length - 1].entry_date : null,
    last_entry_date: totalEntries > 0 ? entries[0].entry_date : null,
    export_language: languageDetection.language,
    localized_content_included: true,
    language_detection_method: languageDetection.method,
    language_detection_confidence: languageDetection.confidence,
  };
};

const getFullName = (userMetadata: unknown): string | null => {
  if (!userMetadata || typeof userMetadata !== 'object') {
    return null;
  }

  const metadataRecord = userMetadata as Record<string, unknown>;
  const fullName = metadataRecord.full_name;
  if (typeof fullName === 'string' && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const fallbackName = metadataRecord.name;
  if (typeof fallbackName === 'string' && fallbackName.trim().length > 0) {
    return fallbackName.trim();
  }

  return null;
};

logger.info('Edge Function "export-user-data" is ready with tr/en/es localization support');

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const requestBody = await parseRequestBody(req);
    const userLanguageHeader =
      req.headers.get('X-User-Language') ?? req.headers.get('x-user-language');
    const acceptLanguage = req.headers.get('Accept-Language') ?? req.headers.get('accept-language');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Supabase environment variables are missing.' }, 500);
    }

    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const supabaseClient: SupabaseEdgeClient = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User authentication error', userError);
      return jsonResponse({ error: 'User not authenticated.' }, 401);
    }

    const user = userData.user;

    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select(
        `
          id,
          username,
          language,
          daily_gratitude_goal,
          notification_time,
          timezone,
          use_varied_prompts,
          created_at,
          updated_at
        `
      )
      .eq('id', user.id)
      .maybeSingle();

    const profile = (profileData ?? null) as ProfileRow | null;

    if (profileError) {
      logger.warn(
        'Error fetching profile, continuing with fallback language detection',
        profileError
      );
    }

    const languageDetection = detectUserLanguage(
      userLanguageHeader,
      requestBody,
      acceptLanguage,
      profile?.language ?? null
    );

    const { data: entriesData, error: entriesError } = await supabaseClient
      .from('gratitude_entries')
      .select('id, user_id, entry_date, statements, created_at, updated_at')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(EXPORT_LIMITS.MAX_ENTRIES_PER_REQUEST);

    const entries = (entriesData ?? []) as GratitudeEntryRow[];

    if (entriesError) {
      logger.error('Error fetching gratitude entries', entriesError);
      return jsonResponse({ error: `Database error: ${entriesError.message}` }, 500);
    }

    const sanitizedEntries: SanitizedEntry[] = entries.map((entry) => ({
      id: entry.id,
      entry_date: entry.entry_date,
      statements: toStringArray(entry.statements),
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    }));

    const [localizedBenefits, localizedPrompts] = await Promise.all([
      fetchLocalizedBenefits(supabaseClient, languageDetection.language),
      fetchLocalizedPrompts(supabaseClient, languageDetection.language),
    ]);

    const metadata = calculateExportMetadata(sanitizedEntries, languageDetection);
    const fullName = getFullName(user.user_metadata);

    const exportData = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      language: languageDetection.language,
      profile: {
        full_name: fullName,
        email: user.email ?? null,
        username: profile?.username ?? null,
        language: matchSupportedLanguage(profile?.language ?? null) ?? languageDetection.language,
        daily_gratitude_goal: profile?.daily_gratitude_goal ?? 3,
        notification_time: profile?.notification_time ?? null,
        timezone: profile?.timezone ?? null,
        use_varied_prompts: profile?.use_varied_prompts ?? false,
        created_at: profile?.created_at ?? null,
        updated_at: profile?.updated_at ?? null,
      },
      gratitude_entries: sanitizedEntries,
      reference_data: {
        gratitude_benefits: localizedBenefits,
        daily_prompts_sample: localizedPrompts,
      },
      metadata,
    };

    logger.info('Localized export prepared', {
      userId: user.id,
      language: languageDetection.language,
      method: languageDetection.method,
      confidence: languageDetection.confidence,
      entries: sanitizedEntries.length,
      prompts: localizedPrompts.length,
      benefits: localizedBenefits.length,
    });

    return jsonResponse(exportData, 200);
  } catch (error) {
    logger.error('Unexpected error in export-user-data', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      500
    );
  }
});
