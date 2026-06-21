-- Player notes: free-form text the player writes during play, persisted across sessions
ALTER TABLE campaigns ADD COLUMN player_notes TEXT DEFAULT '';
