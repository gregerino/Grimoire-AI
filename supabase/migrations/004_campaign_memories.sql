-- Campaign memories: AI-generated summaries of important events
CREATE TABLE campaign_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE campaign_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD memories via campaign"
  ON campaign_memories FOR ALL
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

CREATE INDEX idx_campaign_memories_campaign ON campaign_memories(campaign_id, created_at DESC);

-- Add chaos_factor to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS chaos_factor INTEGER NOT NULL DEFAULT 5;

-- Add current_hp to campaigns for tracking
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS current_hp INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_hp INTEGER;
