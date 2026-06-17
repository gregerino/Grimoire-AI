-- Character sheets stored as JSONB, one per campaign
CREATE TABLE IF NOT EXISTS character_sheets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id)
);

-- Index for fast lookup by campaign
CREATE INDEX IF NOT EXISTS idx_character_sheets_campaign
  ON character_sheets(campaign_id);

-- RLS
ALTER TABLE character_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their campaign character sheets"
  ON character_sheets
  FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );
