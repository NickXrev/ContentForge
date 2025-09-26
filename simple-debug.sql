-- Simple debug for company_research table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'company_research' 
ORDER BY ordinal_position;
