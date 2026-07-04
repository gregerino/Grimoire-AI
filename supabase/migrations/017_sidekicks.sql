-- Sidekicks (Tasha's Cauldron of Everything companion rules)
CREATE TABLE IF NOT EXISTS sidekicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  npc_id uuid REFERENCES npcs(id) ON DELETE SET NULL,

  name text NOT NULL,
  kit text NOT NULL CHECK (kit IN ('expert', 'spellcaster', 'warrior')),
  base_creature text,

  level integer NOT NULL DEFAULT 1,
  proficiency_bonus integer NOT NULL DEFAULT 2,
  stats jsonb NOT NULL DEFAULT '{}',

  current_hp integer NOT NULL,
  max_hp integer NOT NULL,
  ac integer NOT NULL,
  speed integer NOT NULL DEFAULT 30,

  features jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sidekicks_campaign ON sidekicks(campaign_id);

ALTER TABLE sidekicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaign sidekicks"
  ON sidekicks FOR ALL
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
