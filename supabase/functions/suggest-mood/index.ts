// suggest-mood Edge Function
// Analyzes gratitude statement and suggests appropriate mood emojis
// Self-contained - no shared imports

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'npm:@google/generative-ai';

// ============================================================================
// CORS Helpers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}

// ============================================================================
// Gemini Client
// ============================================================================

function getGeminiModel() {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in Supabase secrets');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });
}

async function generateJSON<T>(prompt: string): Promise<T> {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Extract JSON from response (handles markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
    text.match(/```\n?([\s\S]*?)\n?```/) || [null, text];

  const jsonString = jsonMatch[1]?.trim() || text.trim();
  return JSON.parse(jsonString) as T;
}

// ============================================================================
// Usage Tracker
// ============================================================================

const DAILY_LIMIT = 25;

type AIFeature =
  | 'mood_suggest'
  | 'entry_enhance'
  | 'coach_prompt'
  | 'memory_curate'
  | 'chat_message';

interface UsageResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  resetInSeconds: number;
  usageId: string | null;
}

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function consumeUsage(
  userId: string,
  feature: AIFeature,
  supabase: SupabaseClient
): Promise<UsageResult> {
  const { data, error } = await supabase.rpc('consume_ai_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_daily_limit: DAILY_LIMIT,
  });

  if (error) {
    console.error('[suggest-mood] Error consuming usage:', error);
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      used: 0,
      limit: DAILY_LIMIT,
      resetInSeconds: 86400,
      usageId: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const record = (row || {}) as Record<string, unknown>;

  return {
    allowed: Boolean(record.allowed),
    remaining: Number(record.remaining ?? DAILY_LIMIT),
    used: Number(record.used ?? 0),
    limit: DAILY_LIMIT,
    resetInSeconds: Number(record.reset_in_seconds ?? 86400),
    usageId: typeof record.usage_id === 'string' ? record.usage_id : null,
  };
}

async function refundUsage(usageId: string | null | undefined, supabase: SupabaseClient) {
  if (!usageId) return;

  const { error } = await supabase.from('ai_usage').delete().eq('id', usageId);
  if (error) {
    console.error('[suggest-mood] Error refunding usage:', error);
  }
}

// ============================================================================
// Main Function Logic
// ============================================================================

const MOOD_EMOJIS = [
  '😊',
  '🙏',
  '🌟',
  '💪',
  '🧘',
  '🥰',
  '😌',
  '🌿',
  '🤔',
  '🌅',
  '🎯',
  '🚀',
] as const;

interface SuggestMoodRequest {
  statement: string;
  language?: 'tr' | 'en' | 'es';
}

interface MoodSuggestionResponse {
  moods: string[];
  primary: string;
  remaining: number;
  resetInSeconds: number;
}

function buildPrompt(statement: string, language: string): string {
  const languageName =
    {
      tr: 'Turkish',
      es: 'Spanish',
      en: 'English',
    }[language] || 'English';

  return `You are analyzing a gratitude journal statement to suggest the most appropriate mood emojis.

Available moods and their meanings:
- 😊 (Joyful): Happy, cheerful, delighted
- 🙏 (Grateful): Thankful, appreciative
- 🌟 (Inspired): Creative, enlightened, motivated by ideas
- 💪 (Empowered): Strong, capable, confident
- 🧘 (Calm): Peaceful, serene, relaxed
- 🥰 (Loving): Affectionate, caring, warm-hearted
- 😌 (Content): Satisfied, at ease, comfortable
- 🌿 (Refreshed): Renewed, revitalized, recharged
- 🤔 (Thoughtful): Reflective, pondering, contemplative
- 🌅 (Hopeful): Optimistic, looking forward, anticipating good
- 🎯 (Focused): Determined, concentrated, goal-oriented
- 🚀 (Motivated): Driven, energized, ready to act

Gratitude statement (language: ${languageName}):
"${statement}"

Analyze the emotional tone and suggest 2-3 mood emojis that best match this statement.

Return ONLY valid JSON in this exact format:
{"moods": ["emoji1", "emoji2"], "primary": "emoji1"}

Rules:
- Use only emojis from the list above
- The "primary" must be the single best match
- Include 2-3 moods total in the "moods" array
- The primary emoji must be included in the moods array`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const adminClient = getSupabaseAdmin();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_pro) {
      return jsonResponse(
        {
          error: 'PRO subscription required',
          code: 'PRO_REQUIRED',
        },
        403
      );
    }

    // Atomically reserve rate-limit usage before the paid downstream call.
    const usageInfo = await consumeUsage(user.id, 'mood_suggest', adminClient);
    if (!usageInfo.allowed) {
      return jsonResponse(
        {
          error: 'Daily limit reached',
          remaining: 0,
          limit: usageInfo.limit,
          resetInSeconds: usageInfo.resetInSeconds,
        },
        200 // Return 200 to allow client to parse the error body easily
      );
    }

    // Parse request
    const body: SuggestMoodRequest = await req.json();
    const { statement, language = 'en' } = body;

    if (!statement || typeof statement !== 'string' || statement.trim().length < 3) {
      return errorResponse('Statement is required and must be at least 3 characters', 400);
    }

    const prompt = buildPrompt(statement.trim(), language);
    try {
      const result = await generateJSON<{ moods: string[]; primary: string }>(prompt);

      const validMoods = result.moods.filter((m: string) =>
        MOOD_EMOJIS.includes(m as (typeof MOOD_EMOJIS)[number])
      );
      const validPrimary = MOOD_EMOJIS.includes(result.primary as (typeof MOOD_EMOJIS)[number])
        ? result.primary
        : validMoods[0] || '🙏';

      const response: MoodSuggestionResponse = {
        moods: validMoods.length > 0 ? validMoods : ['🙏'],
        primary: validPrimary,
        remaining: usageInfo.remaining,
        resetInSeconds: usageInfo.resetInSeconds,
      };

      return jsonResponse(response);
    } catch (error) {
      await refundUsage(usageInfo.usageId, adminClient);
      throw error;
    }
  } catch (error) {
    console.error('[suggest-mood] Error:', error);
    return errorResponse('Failed to suggest mood', 500);
  }
});
