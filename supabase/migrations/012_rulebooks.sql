-- Central rulebooks: user-level PDFs shared across all campaigns

CREATE TABLE rulebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rulebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rulebooks"
  ON rulebooks FOR ALL
  USING (auth.uid() = user_id);

-- Rulebook chunks — like document_chunks but linked to rulebooks instead of campaigns
CREATE TABLE rulebook_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rulebook_id UUID REFERENCES rulebooks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rulebook_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own rulebook chunks"
  ON rulebook_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rulebook chunks"
  ON rulebook_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rulebook chunks"
  ON rulebook_chunks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX ON rulebook_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Search function that queries BOTH campaign chunks and user's rulebook chunks
CREATE OR REPLACE FUNCTION match_documents_with_rulebooks(
  query_embedding vector(1536),
  match_campaign_id UUID,
  match_user_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (content TEXT, similarity FLOAT, metadata JSONB)
LANGUAGE sql
STABLE
AS $$
  (
    SELECT content, 1 - (embedding <=> query_embedding) AS similarity, metadata
    FROM document_chunks
    WHERE campaign_id = match_campaign_id
  )
  UNION ALL
  (
    SELECT content, 1 - (embedding <=> query_embedding) AS similarity, metadata
    FROM rulebook_chunks
    WHERE user_id = match_user_id
  )
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Standalone rulebook search (for the RAG search endpoint)
CREATE OR REPLACE FUNCTION match_rulebooks(
  query_embedding vector(1536),
  match_user_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (content TEXT, similarity FLOAT, metadata JSONB)
LANGUAGE sql
STABLE
AS $$
  SELECT
    content,
    1 - (embedding <=> query_embedding) AS similarity,
    metadata
  FROM rulebook_chunks
  WHERE user_id = match_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
