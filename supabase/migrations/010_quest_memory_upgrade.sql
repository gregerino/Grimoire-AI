-- Sprint 6: Quest & Rumor System + DM Memory Controls

-- Add rumor status to quests
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_status_check;
ALTER TABLE quests ADD CONSTRAINT quests_status_check
  CHECK (status IN ('rumor', 'active', 'completed', 'failed', 'abandoned'));

-- Add new quest columns
ALTER TABLE quests ADD COLUMN IF NOT EXISTS source_npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS target_location_id UUID REFERENCES world_locations(id) ON DELETE SET NULL;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS reward JSONB;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS updates JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add memory categorization columns
ALTER TABLE campaign_memories ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'plot'
  CHECK (category IN ('plot', 'npc', 'world', 'character', 'item'));
ALTER TABLE campaign_memories ADD COLUMN IF NOT EXISTS importance TEXT NOT NULL DEFAULT 'medium'
  CHECK (importance IN ('high', 'medium', 'low'));
ALTER TABLE campaign_memories ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai'
  CHECK (source IN ('ai', 'user'));

-- Index for memory queries
CREATE INDEX IF NOT EXISTS idx_campaign_memories_category
  ON campaign_memories(campaign_id, category);
CREATE INDEX IF NOT EXISTS idx_campaign_memories_importance
  ON campaign_memories(campaign_id, importance);

-- Index for quest queries
CREATE INDEX IF NOT EXISTS idx_quests_status
  ON quests(campaign_id, status);

-- Enable realtime for campaign_memories
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_memories;
