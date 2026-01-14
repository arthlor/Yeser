-- AI Usage tracking table for rate limiting
-- Each row represents one AI feature usage

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('mood_suggest', 'entry_enhance', 'coach_prompt', 'memory_curate', 'chat_message')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient daily usage queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, created_at);

-- RLS policies
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own ai_usage" ON ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (Edge Functions)
CREATE POLICY "Service role can insert ai_usage" ON ai_usage
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON ai_usage TO authenticated;
GRANT INSERT ON ai_usage TO service_role;

COMMENT ON TABLE ai_usage IS 'Tracks AI feature usage for rate limiting (10/day per user)';
COMMENT ON COLUMN ai_usage.feature IS 'AI feature type: mood_suggest, entry_enhance, coach_prompt, memory_curate, chat_message';
