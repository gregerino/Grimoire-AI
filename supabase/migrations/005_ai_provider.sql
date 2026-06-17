-- Add AI provider choice to campaigns (defaults to claude)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'claude'
  CHECK (ai_provider IN ('claude', 'openai'));
