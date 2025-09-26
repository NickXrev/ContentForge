-- Check what's actually in each research table individually

-- 1. Check company_research table
SELECT 'company_research' as table_name, * FROM company_research ORDER BY created_at DESC;

-- 2. Check website_analysis table  
SELECT 'website_analysis' as table_name, * FROM website_analysis ORDER BY analyzed_at DESC;

-- 3. Check company_intelligence table
SELECT 'company_intelligence' as table_name, * FROM company_intelligence ORDER BY extracted_at DESC;
