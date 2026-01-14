// chat-message Edge Function
// AI gratitude chatbot for supportive conversations
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
    model: 'gemini-2.0-flash-exp',
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

async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
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
    console.error('[chat-message] Error checking usage:', error);
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
    console.error('[chat-message] Error recording usage:', error);
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageRequest {
  message: string;
  history?: ChatMessage[]; // Previous messages in conversation
  language?: 'tr' | 'en';
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
      ? `\n\nRecent gratitude entries from this user:\n${recentEntries.map((e, i) => `- ${e}`).join('\n')}`
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
    .map((m) => `${m.role === 'user' ? 'User' : 'Yeşer'}: ${m.content}`)
    .join('\n');

  return `${historyText}\nUser: ${message}`;
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
    const body: ChatMessageRequest = await req.json();
    const { message, history = [], language = 'en', recentEntries = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return errorResponse('Message is required', 400);
    }

    // Generate chat response
    const systemPrompt = buildSystemPrompt(language, recentEntries);
    const conversationPrompt = buildConversationPrompt(message.trim(), history);
    const reply = await generateText(conversationPrompt, systemPrompt);

    // Record usage
    const updatedUsage = await recordUsage(user.id, 'chat_message');

    const response: ChatMessageResponse = {
      reply: reply.trim(),
      remaining: updatedUsage.remaining,
      resetInSeconds: updatedUsage.resetInSeconds,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[chat-message] Error:', error);
    return errorResponse('Failed to generate response', 500);
  }
});
