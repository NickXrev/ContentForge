-- Check what columns exist in content_documents table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'content_documents' 
AND table_schema = 'public'
ORDER BY ordinal_position;
