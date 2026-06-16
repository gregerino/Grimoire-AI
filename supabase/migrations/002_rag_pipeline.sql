-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- PDF metadata
CREATE TABLE pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row-level security
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own PDFs"
  ON pdfs FOR ALL
  USING (auth.uid() = user_id);

-- Document chunks with embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read chunks from their campaigns"
  ON document_chunks FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Index for fast vector similarity search
CREATE INDEX ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RAG search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_campaign_id UUID,
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
  FROM document_chunks
  WHERE campaign_id = match_campaign_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can upload to their own folder
CREATE POLICY "Users can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
