// enhance-entry Edge Function
// Enhances gratitude entries with richer, more expressive language
// Self-contained - no shared imports

import { serve } from 'https://deno.land/std@0.214.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from 'npm:@google/generative-ai@0.21.0';

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

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetInSeconds = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);

  if (error) {
    console.error('[enhance-entry] Error checking usage:', error);
    return { allowed: true, remaining: DAILY_LIMIT, used: 0, limit: DAILY_LIMIT, resetInSeconds };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  return {
    allowed: used < DAILY_LIMIT,
    remaining,
    used,
    limit: DAILY_LIMIT,
    resetInSeconds,
  };
}

async function recordUsage(userId: string, feature: AIFeature): Promise<UsageResult> {
  const supabase = getSupabaseAdmin();
  const currentUsage = await checkUsage(userId);

  if (!currentUsage.allowed) {
    return currentUsage;
  }

  const { error } = await supabase.from('ai_usage').insert({
    user_id: userId,
    feature,
  });

  if (error) {
    console.error('[enhance-entry] Error recording usage:', error);
    return currentUsage;
  }

  return {
    allowed: true,
    remaining: Math.max(0, currentUsage.remaining - 1),
    used: currentUsage.used + 1,
    limit: DAILY_LIMIT,
    resetInSeconds: currentUsage.resetInSeconds,
  };
}

// ============================================================================
// Main Function Logic
// ============================================================================

interface EnhanceEntryRequest {
  statement: string;
  language?: 'tr' | 'en';
  style?: 'poetic' | 'detailed' | 'mindful';
}

interface EnhanceEntryResponse {
  enhanced: string;
  original: string;
  remaining: number;
  resetInSeconds: number;
}

function buildPrompt(statement: string, language: string, style: string): string {
  const styleGuides = {
    poetic: 'Use metaphors, sensory details, and emotionally evocative language.',
    detailed: 'Expand with specific observations, context, and deeper reflection.',
    mindful: 'Frame with present-moment awareness and gentle, contemplative language.',
  };

  const styleGuide = styleGuides[style as keyof typeof styleGuides] || styleGuides.detailed;

  const languageName =
    {
      tr: 'Turkish',
      es: 'Spanish',
      en: 'English',
    }[language] || 'English';

  return `You are enhancing a gratitude journal entry to make it richer and more expressive.

Original entry (language: ${languageName}):
"${statement}"

Style: ${style}
${styleGuide}

Guidelines:
- Keep the same core meaning and intent
- Enhance the emotional depth and expressiveness
- Write in the same language as the original (${languageName})
- Keep it personal (first person)
- Maximum 2-3 sentences
- Don't add fictional details, only expand on what's implied

Return ONLY valid JSON in this exact format:
{"enhanced": "your enhanced version here"}`;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
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
          resetInSeconds: usageInfo.resetInSeconds,
        },
        200 // Return 200 to allow client to parse the error body easily
      );
    }

    // Parse request
    const body: EnhanceEntryRequest = await req.json();
    const { statement, language = 'en', style = 'detailed' } = body;

    if (!statement || typeof statement !== 'string' || statement.trim().length < 5) {
      return errorResponse('Statement is required and must be at least 5 characters', 400);
    }

    // Generate enhanced entry
    const prompt = buildPrompt(statement.trim(), language, style);
    const result = await generateJSON<{ enhanced: string }>(prompt);

    // Record usage
    const updatedUsage = await recordUsage(user.id, 'entry_enhance');

    const response: EnhanceEntryResponse = {
      enhanced: result.enhanced,
      original: statement,
      remaining: updatedUsage.remaining,
      resetInSeconds: updatedUsage.resetInSeconds,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[enhance-entry] Error:', error);
    return errorResponse('Failed to enhance entry', 500);
  }
});
