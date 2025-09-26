-- Check what research tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%research%' 
OR table_name LIKE '%company%' 
OR table_name LIKE '%website%' 
OR table_name LIKE '%intelligence%')
ORDER BY table_name;
