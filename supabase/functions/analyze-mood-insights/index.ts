// analyze-mood-insights Edge Function
// Analyzes gratitude entries to provide deep psychological and emotional insights
// and suggestions for the user.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from 'npm:@google/generative-ai';

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
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 2400,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          narrative: {
            type: SchemaType.OBJECT,
            properties: {
              logical: { type: SchemaType.STRING },
              emotional: { type: SchemaType.STRING },
              suggestions: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ['logical', 'emotional', 'suggestions'],
          },
          highlighted_insight: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              emoji: { type: SchemaType.STRING },
            },
            required: ['title', 'description', 'emoji'],
          },
        },
        required: ['narrative', 'highlighted_insight'],
      },
    },
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
  range: '15d' | '30d' | '90d';
  language?: 'tr' | 'en' | 'es';
}

const VALID_RANGES = ['15d', '30d', '90d'] as const;

const isValidRange = (range: unknown): range is AnalyzeMoodRequest['range'] =>
  typeof range === 'string' && VALID_RANGES.includes(range as AnalyzeMoodRequest['range']);

interface GratitudeEntry {
  entry_date: string;
  statements: string[];
  moods?: Record<string, string>;
}

interface FlattenedStatement {
  entry_date: string;
  statement: string;
  mood: string | null;
}

const flattenStatements = (entries: GratitudeEntry[]): FlattenedStatement[] =>
  entries.flatMap((entry) => {
    const statements = Array.isArray(entry.statements) ? entry.statements : [];

    return statements.flatMap((value, index) => {
      if (typeof value !== 'string') {
        return [];
      }

      const statement = value.trim();

      if (!statement) {
        return [];
      }

      return [
        {
          entry_date: entry.entry_date,
          statement,
          mood: entry.moods?.[String(index)] ?? null,
        },
      ];
    });
  });

interface InsightResponse {
  narrative: {
    logical: string;
    emotional: string;
    suggestions: string[];
  } | null;
  highlighted_insight: {
    title: string;
    description: string;
    emoji: string;
  } | null;
  generated_at?: string;
  entry_count_at_generation?: number;
  is_preview_only?: boolean;
}

// ============================================================================
// Usage Tracker
// ============================================================================

const DAILY_LIMIT = 25;
const MIN_GRATITUDE_STATEMENTS_FOR_INSIGHTS = 3;

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

Deno.serve(async (req: Request) => {
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

    const adminClient = getSupabaseAdmin();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    const isPro = Boolean(profile?.is_pro);

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
    const body = (await req.json()) as Partial<AnalyzeMoodRequest>;
    const range = isValidRange(body.range) ? body.range : '30d';
    const language =
      body.language === 'tr' || body.language === 'es' || body.language === 'en'
        ? body.language
        : 'en';

    // 3. Fetch Data
    const daysMap: Record<string, number> = { '15d': 15, '30d': 30, '90d': 90 };
    const days = daysMap[range] ?? 30;

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
      return jsonResponse({ error: 'Failed to fetch entries' }, 200);
    }

    const flattenedStatements = flattenStatements(entries ?? []);
    const statementCount = flattenedStatements.length;

    if (!entries || statementCount < MIN_GRATITUDE_STATEMENTS_FOR_INSIGHTS) {
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
        is_preview_only: !isPro,
        remaining: usageInfo.remaining,
      });
    }

    // 4. Prepare Context for AI
    const entriesContext = entries
      .map(
        (e: GratitudeEntry) => `
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

    const shouldUseLightweightRead = statementCount <= 5;
    const suggestionsTargetCount = shouldUseLightweightRead ? 3 : 5;
    const logicalLengthInstruction = shouldUseLightweightRead
      ? 'Write 1 well-developed paragraph (~90-130 words, around 4-6 sentences).'
      : 'Write a deep synthesis (~150-220 words) across 2 short paragraphs.';
    const emotionalLengthInstruction = shouldUseLightweightRead
      ? 'Write 1 warm paragraph (~90-130 words, around 4-6 sentences).'
      : 'Write a nuanced emotional read (~150-220 words) across 2 short paragraphs.';
    const analysisStyleInstruction = shouldUseLightweightRead
      ? `
      Important context:
      - The user only has ${statementCount} gratitude statements in this range.
      - Treat this as an early emerging pattern, not a firm conclusion.
      - Be warm, cautiously phrased, and specific without over-claiming certainty.
      - Keep logical and emotional sections to 2-3 sentences each.
      - Suggestions should be simple, gentle, and realistic for an early-stage habit.
      - Still make the language vivid and emotionally meaningful, even with limited data.
      `
      : `
      Important context:
      - The user has ${statementCount} gratitude statements in this range.
      - You can provide a fuller, more confident synthesis while still staying grounded in the data.
      - Aim for emotionally rich, creative synthesis without sounding dramatic or abstract.
      - Explore recurring threads with more depth, examples, and nuance.
      `;

    const prompt = `
      You are an empathetic psychology expert and data analyst for a gratitude journal app.
      Your goal is to provide a deep, emotionally intelligent reflection based on the person's gratitude entries.
      Analyze the gratitude entries from the last ${days} days.
      Language: ${languageName} (Output MUST be in this language).
      ${analysisStyleInstruction}

      Voice and tone rules:
      - Write directly to the person reading, using second-person voice.
      - In Turkish, speak as "sen/sana/senin". In Spanish, speak as "tu/tus/te". In English, speak as "you/your".
      - Never refer to the person as "the user", "kullanıcı", "el usuario", or any third-person label.
      - Sound warm, sincere, gentle, and emotionally attuned.
      - Avoid clinical, academic, overly formal, or distant language.
      - Help the person feel understood, not evaluated from afar.
      - Keep the writing natural and human, not robotic or overly dramatic.
      - Prefer concrete, sensory language over generic labels.
      - If useful, use one subtle metaphor or image per section (max one), rooted in the person's actual entries.
      - Avoid cliches, motivational slogans, and template-like phrasing.
      - Do not repeat the same idea with different words.

      Data:
      ${entriesContext}

      Task:
      1. **Logical Deduction**: Connect these entries to broader life themes. Don't just list what was appreciated; reflect on what it may suggest about the person's current focus, needs, or direction. Keep it grounded and personal.
         - ${logicalLengthInstruction}
         - Refer to at least 2 concrete motifs from the entries.
      2. **Emotional Reading**: Describe the emotional undercurrent with warmth and nuance, going beyond surface labels.
         - ${emotionalLengthInstruction}
         - Include subtle emotional contrasts (e.g., relief vs. pressure, safety vs. uncertainty) when present.
      3. **Suggestions**: Provide ${suggestionsTargetCount} concrete, actionable, and gentle suggestions to deepen gratitude practice or support emotional balance.
         - Each suggestion should be personalized to the observed pattern and at least 1 full sentence.
      4. **Highlighted Insight**: Identify one specific pattern or realization that stands out.
         - The title should feel human, vivid, and emotionally resonant, not technical or analytical.
         - The description should be 2 sincere sentences written directly to the person.
      5. **Creativity constraint**: Keep the writing fresh and non-generic. Avoid repetitive structures like "you are someone who..." in every section.

      Output JSON format:
      {
        "narrative": {
          "logical": "Longer warm analysis...",
          "emotional": "Longer nuanced emotional read...",
          "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]
        },
        "highlighted_insight": {
          "title": "Short resonant title",
          "description": "Two warm sentences written directly to the person",
          "emoji": "🌟"
        }
      }
      
      Return ONLY valid JSON.
    `;

    // 6. Generate with Gemini
    const model = getGeminiModel();
    let text = '';

    try {
      // Use a timeout of 25 seconds for the AI call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const result = await model.generateContent(prompt, { signal: controller.signal });
      clearTimeout(timeoutId);

      // Check if we have candidates
      if (
        !result.response ||
        !result.response.candidates ||
        result.response.candidates.length === 0
      ) {
        console.error('[analyze-mood] No candidates returned from Gemini');
        return jsonResponse({ error: 'No response generated from AI. Please try again.' }, 200);
      }

      // Handle safety blocks
      const firstCandidate = result.response.candidates[0];
      if (firstCandidate.finishReason === 'SAFETY') {
        console.error('[analyze-mood] Response blocked by safety filters');
        return jsonResponse(
          { error: 'The content was flagged by safety filters. Please try again with different entries.' },
          200
        );
      }

      text = result.response.text();
    } catch (genError) {
      console.error('[analyze-mood] Generation Error:', genError);
      const msg = genError instanceof Error ? genError.message : String(genError);

      if (msg.includes('abort') || msg.includes('timeout')) {
        return jsonResponse({ error: 'AI analysis timed out. Please try again.' }, 200);
      }

      return jsonResponse({ error: `AI Generation failed: ${msg}` }, 200);
    }

    // Clean JSON
    let analysis;
    try {
      // First try parsing exactly as returned
      analysis = JSON.parse(text);
    } catch (e1) {
      try {
        // Fallback 1: Strip markdown code blocks
        const cleaned = text.replace(/^```(?:json)?|```$/gm, '').trim();
        analysis = JSON.parse(cleaned);
      } catch (e2) {
        try {
          // Fallback 2: Extract from first { to last }
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            // Also replace any unescaped literal newlines inside strings if they exist
            // (a common LLM JSON error), but doing this safely is hard. 
            // We will just try to parse the extracted block.
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON object found in response');
          }
        } catch (e3) {
          console.error('[analyze-mood] JSON Parse Error:', e3);
          console.error('[analyze-mood] Raw Response content:', text);
          return jsonResponse({ error: 'Failed to parse AI response into the required format.' }, 200);
        }
      }
    }

    const generatedAt = new Date().toISOString();
    const entryCountAtGeneration = statementCount;

    const { error: snapshotError } = await adminClient.from('mood_insight_snapshots').upsert(
      {
        user_id: user.id,
        range,
        language,
        highlighted_insight: analysis.highlighted_insight,
        narrative: analysis.narrative,
        generated_at: generatedAt,
        updated_at: generatedAt,
        entry_count_at_generation: entryCountAtGeneration,
      },
      {
        onConflict: 'user_id,range,language',
      }
    );

    if (snapshotError) {
      console.error('[analyze-mood] Error storing snapshot:', snapshotError);
    }

    // Record usage
    const updatedUsage = await recordUsage(user.id, 'mood_insights');
    const responsePayload: InsightResponse & {
      remaining: number;
      resetInSeconds: number;
    } = {
      narrative: isPro ? analysis.narrative : null,
      highlighted_insight: analysis.highlighted_insight,
      generated_at: generatedAt,
      entry_count_at_generation: entryCountAtGeneration,
      is_preview_only: !isPro,
      remaining: updatedUsage.remaining,
      resetInSeconds: updatedUsage.resetInSeconds,
    };

    return jsonResponse(responsePayload);
  } catch (error) {
    console.error('Internal Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return jsonResponse({ error: message }, 200);
  }
});
