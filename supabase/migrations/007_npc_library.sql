-- Extend NPCs with richer fields for the NPC library
ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS backstory text,
  ADD COLUMN IF NOT EXISTS relationship text,
  ADD COLUMN IF NOT EXISTS last_seen_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL;
