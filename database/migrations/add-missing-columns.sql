-- Add missing columns to content_documents table
ALTER TABLE content_documents 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';

ALTER TABLE content_documents 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'blog';

ALTER TABLE content_documents 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE content_documents 
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;

ALTER TABLE content_documents 
ADD COLUMN IF NOT EXISTS collaborators UUID[] DEFAULT '{}';

-- Update existing records to have default values
UPDATE content_documents 
SET category = 'general' 
WHERE category IS NULL;

UPDATE content_documents 
SET platform = 'blog' 
WHERE platform IS NULL;

UPDATE content_documents 
SET metadata = '{}' 
WHERE metadata IS NULL;

UPDATE content_documents 
SET word_count = 0 
WHERE word_count IS NULL;

UPDATE content_documents 
SET collaborators = '{}' 
WHERE collaborators IS NULL;
