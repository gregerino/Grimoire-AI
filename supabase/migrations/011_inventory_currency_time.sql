-- Sprint 7: Inventory expansion, currency system, time of day

-- ── Expand inventory_items ───────────────────────────────────
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS weight REAL NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS value_gp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS value_sp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS value_cp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common'
  CHECK (rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary'));
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Update category constraint to match new item types
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_category_check;
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_category_check
  CHECK (category IN ('weapon', 'armor', 'potion', 'scroll', 'gear', 'treasure', 'tool', 'other'));

-- Sort order for drag-and-drop reordering
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ── Campaign currency (party purse) ─────────────────────────
CREATE TABLE IF NOT EXISTS campaign_currency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  gp INTEGER NOT NULL DEFAULT 0,
  sp INTEGER NOT NULL DEFAULT 0,
  cp INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id)
);

ALTER TABLE campaign_currency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaign currency"
  ON campaign_currency FOR ALL
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- ── World time on campaigns ─────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS world_day INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS world_hour INTEGER NOT NULL DEFAULT 8;

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_items_rarity
  ON inventory_items(campaign_id, rarity);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sort
  ON inventory_items(campaign_id, sort_order);
