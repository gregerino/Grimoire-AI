-- Add portrait URL to NPCs
ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS portrait_url text;

-- Cache table for all generated images
CREATE TABLE IF NOT EXISTS generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  prompt_hash text NOT NULL,
  image_type text NOT NULL CHECK (image_type IN ('npc_portrait', 'location')),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, prompt_hash)
);

-- Add image generation toggle to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS image_generation_enabled boolean NOT NULL DEFAULT true;
