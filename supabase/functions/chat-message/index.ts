// chat-message Edge Function
// AI gratitude chatbot for supportive conversations
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

async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    systemInstruction,
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

  const result = await model.generateContent(prompt);
  return result.response.text();
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
    console.error('[chat-message] Error consuming usage:', error);
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
    console.error('[chat-message] Error refunding usage:', error);
  }
}

// ============================================================================
// Main Function Logic
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageRequest {
  message: string;
  history?: ChatMessage[]; // Previous messages in conversation
  language?: 'tr' | 'en' | 'es';
  recentEntries?: string[]; // Recent gratitude entries for context
}

interface ChatMessageResponse {
  reply: string;
  remaining: number;
  resetInSeconds: number;
}

function buildSystemPrompt(language: string, recentEntries: string[]): string {
  const entriesContext =
    recentEntries.length > 0
      ? `\n\nRecent gratitude entries from this user:\n${recentEntries.map((e: string) => `- ${e}`).join('\n')}`
      : '';

  let languageNote = 'Respond in English.';
  if (language === 'tr') {
    languageNote =
      "Respond in Turkish. IMPORTANT: Always use the word 'minnet' instead of 'şükran' or 'teşekkür' when referring to gratitude.";
  } else if (language === 'es') {
    languageNote =
      "Respond in Spanish. IMPORTANT: Use warm, empathetic tone. Use 'gratitud' for gratitude.";
  }

  return `You are Yeşer, a warm and supportive AI companion in a gratitude journal app. Your name means "to flourish" or "to blossom" in Turkish.

Your personality:
- Warm, empathetic, and encouraging
- Gently guide users toward gratitude and positive reflection
- Ask thoughtful follow-up questions
- Celebrate their gratitude insights
- Keep responses concise (2-4 sentences usually)
- Use occasional emojis to add warmth (but not excessively)

${languageNote}
${entriesContext}

Important:
- Never provide medical, legal, or financial advice
- If someone shares distress, be supportive and suggest professional help
- Focus on gratitude, reflection, and positive psychology
- You're a companion, not a therapist`;
}

function buildConversationPrompt(message: string, history: ChatMessage[]): string {
  if (history.length === 0) {
    return message;
  }

  const historyText = history
    .slice(-6) // Keep last 6 messages for context
    .map((m: ChatMessage) => `${m.role === 'user' ? 'User' : 'Yeşer'}: ${m.content}`)
    .join('\n');

  return `${historyText}\nUser: ${message}`;
}

Deno.serve(async (req: Request) => {
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
    const usageInfo = await consumeUsage(user.id, 'chat_message', adminClient);
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
    const body: ChatMessageRequest = await req.json();
    const { message, history = [], language = 'en', recentEntries = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return errorResponse('Message is required', 400);
    }

    const systemPrompt = buildSystemPrompt(language, recentEntries);
    const conversationPrompt = buildConversationPrompt(message.trim(), history);
    try {
      const reply = await generateText(conversationPrompt, systemPrompt);

      const response: ChatMessageResponse = {
        reply: reply.trim(),
        remaining: usageInfo.remaining,
        resetInSeconds: usageInfo.resetInSeconds,
      };

      return jsonResponse(response);
    } catch (error) {
      await refundUsage(usageInfo.usageId, adminClient);
      throw error;
    }
  } catch (error) {
    console.error('[chat-message] Error:', error);
    return errorResponse('Failed to generate response', 500);
  }
});
