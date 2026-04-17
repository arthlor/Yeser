// suggest-mood Edge Function
// Analyzes gratitude statement and suggests appropriate mood emojis
// Self-contained - no shared imports

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
}

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function checkUsage(userId: string): Promise<UsageResult> {
  const supabase = getSupabaseAdmin();

  // Get today's start in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('[suggest-mood] Error checking usage:', error);
    // On error, allow the request but don't track
    return { allowed: true, remaining: DAILY_LIMIT, used: 0, limit: DAILY_LIMIT };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  return {
    allowed: used < DAILY_LIMIT,
    remaining,
    used,
    limit: DAILY_LIMIT,
  };
}

async function recordUsage(userId: string, feature: AIFeature): Promise<UsageResult> {
  const supabase = getSupabaseAdmin();

  // First check if allowed
  const currentUsage = await checkUsage(userId);

  if (!currentUsage.allowed) {
    return currentUsage;
  }

  // Record the usage
  const { error } = await supabase.from('ai_usage').insert({
    user_id: userId,
    feature,
  });

  if (error) {
    console.error('[suggest-mood] Error recording usage:', error);
    // Still return current usage even if recording failed
    return currentUsage;
  }

  // Return updated usage
  return {
    allowed: true,
    remaining: Math.max(0, currentUsage.remaining - 1),
    used: currentUsage.used + 1,
    limit: DAILY_LIMIT,
  };
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
  language?: 'tr' | 'en';
}

interface MoodSuggestionResponse {
  moods: string[];
  primary: string;
  remaining: number;
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

    // Check rate limit
    const usageInfo = await checkUsage(user.id);
    if (!usageInfo.allowed) {
      return jsonResponse(
        {
          error: 'Daily limit reached',
          remaining: 0,
          limit: usageInfo.limit,
        },
        429
      );
    }

    // Parse request
    const body: SuggestMoodRequest = await req.json();
    const { statement, language = 'en' } = body;

    if (!statement || typeof statement !== 'string' || statement.trim().length < 3) {
      return errorResponse('Statement is required and must be at least 3 characters', 400);
    }

    // Generate mood suggestion using Gemini
    const prompt = buildPrompt(statement.trim(), language);
    const result = await generateJSON<{ moods: string[]; primary: string }>(prompt);

    // Validate response has valid emojis
    const validMoods = result.moods.filter((m: string) =>
      MOOD_EMOJIS.includes(m as (typeof MOOD_EMOJIS)[number])
    );
    const validPrimary = MOOD_EMOJIS.includes(result.primary as (typeof MOOD_EMOJIS)[number])
      ? result.primary
      : validMoods[0] || '🙏';

    // Record usage
    const updatedUsage = await recordUsage(user.id, 'mood_suggest');

    const response: MoodSuggestionResponse = {
      moods: validMoods.length > 0 ? validMoods : ['🙏'],
      primary: validPrimary,
      remaining: updatedUsage.remaining,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[suggest-mood] Error:', error);
    return errorResponse('Failed to suggest mood', 500);
  }
});
