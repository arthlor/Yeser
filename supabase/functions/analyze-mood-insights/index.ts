// analyze-mood-insights Edge Function
// Analyzes gratitude entries to provide deep psychological and emotional insights
// and suggestions for the user.

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

// ============================================================================
// Types & Interfaces
// ============================================================================

interface AnalyzeMoodRequest {
  range: '7d' | '15d' | '30d';
  language?: 'tr' | 'en' | 'es';
}

interface GratitudeEntry {
  entry_date: string;
  statements: string[];
  moods?: Record<string, string>;
}

interface InsightResponse {
  narrative: {
    logical: string;
    emotional: string;
    suggestions: string[];
  };
  highlighted_insight: {
    title: string;
    description: string;
    emoji: string;
  } | null;
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
  | 'chat_message'
  | 'mood_insights';

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
    console.error('[analyze-mood] Error checking usage:', error);
    // On error, allow the request but don't track
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
    console.error('[analyze-mood] Error recording usage:', error);
    // Still return current usage even if recording failed
    return currentUsage;
  }

  // Return updated usage
  return {
    allowed: true,
    remaining: Math.max(0, currentUsage.remaining - 1),
    used: currentUsage.used + 1,
    limit: DAILY_LIMIT,
    resetInSeconds: currentUsage.resetInSeconds,
  };
}

// ============================================================================
// Main Logic
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // 1. Auth Check
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

    // 2. Parse Request
    const body: AnalyzeMoodRequest = await req.json();
    const { range = '7d', language = 'en' } = body;

    // 3. Fetch Data
    const daysMap = { '7d': 7, '15d': 15, '30d': 30 };
    const days = daysMap[range] || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: entries, error: dbError } = await supabase
      .from('gratitude_entries')
      .select('entry_date, statements, moods')
      .eq('user_id', user.id)
      .gte('entry_date', startDateStr)
      .order('entry_date', { ascending: true });

    if (dbError) {
      console.error('DB Error:', dbError);
      return errorResponse('Failed to fetch entries', 500);
    }

    if (!entries || entries.length < 3) {
      // Not enough data for AI analysis
      let logicalMsg = 'Not enough data yet.';
      let emotionalMsg = 'Add more entries.';

      if (language === 'tr') {
        logicalMsg = 'Henüz yeterli veri yok.';
        emotionalMsg = 'Daha fazla kayıt ekleyin.';
      } else if (language === 'es') {
        logicalMsg = 'Aún no hay suficientes datos.';
        emotionalMsg = 'Añade más entradas.';
      }

      return jsonResponse({
        narrative: {
          logical: logicalMsg,
          emotional: emotionalMsg,
          suggestions: [],
        },
        highlighted_insight: null,
        remaining: usageInfo.remaining,
      });
    }

    // 4. Prepare Context for AI
    const entriesContext = entries
      .map(
        (e) => `
      Date: ${e.entry_date}
      Statements: ${Array.isArray(e.statements) ? e.statements.join(' | ') : e.statements}
      Moods: ${JSON.stringify(e.moods || {})}
    `
      )
      .join('\n---\n');

    // 5. Build Prompt
    const languageName =
      {
        tr: 'Turkish',
        es: 'Spanish',
        en: 'English',
      }[language] || 'English';

    const prompt = `
      You are an empathetic psychology expert and data analyst for a gratitude journal app.
      Your goal is to provide a DEEP, COMPREHENSIVE, and DETAILED psychological analysis of the user's emotional state based on their gratitude entries.
      Analyze the user's gratitude entries from the last ${days} days.
      Language: ${languageName} (Output MUST be in this language).

      Data:
      ${entriesContext}

      Task:
      1. **Logical Deduction**: Write a DETAILED paragraph (at least 3-4 sentences) connecting the user's entries to broader life themes. Don't just list what they are grateful for; analyze *why* and what it implies about their current life focus (e.g., career growth, family bonding, self-discovery). Avoid generic statements. Deeply interpret the data.
      2. **Emotional Reading**: Write a DETAILED paragraph (at least 3-4 sentences) analyzing the emotional undercurrents. Go beyond surface-level labels. Discuss the nuances of their feelings (e.g., "a sense of relief mixed with pride," "quiet contentment," "energetic anticipation").
      3. **Suggestions**: Provide 3 concrete, actionable, and specific psychological suggestions to help them deepen their practice or address any potential gaps.
      4. **Highlighted Insight**: Identify one specific pattern or standout realization that is unique to this user. Give it a catchy short title and a dedicated emoji.

      Output JSON format:
      {
        "narrative": {
          "logical": "Detailed paragraph exploring logical themes...",
          "emotional": "Detailed paragraph analyzing emotional nuances...",
          "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
        },
        "highlighted_insight": {
          "title": "Short title",
          "description": "One sentence description",
          "emoji": "🌟"
        }
      }
      
      Return ONLY valid JSON.
    `;

    // 6. Generate with Gemini
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      // Fallback or retry logic could go here, for now return error or simple fallback
      return errorResponse('Failed to parse AI response', 500);
    }

    // Record usage
    const updatedUsage = await recordUsage(user.id, 'mood_insights');
    analysis.remaining = updatedUsage.remaining;
    analysis.resetInSeconds = updatedUsage.resetInSeconds;

    return jsonResponse(analysis);
  } catch (error) {
    console.error('Internal Error:', error);
    return errorResponse(error.message || 'Internal Server Error', 500);
  }
});
