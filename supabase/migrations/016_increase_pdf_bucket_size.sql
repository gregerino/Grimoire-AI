-- Increase PDF bucket file size limit to 500MB for large rulebooks
UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'pdfs';
