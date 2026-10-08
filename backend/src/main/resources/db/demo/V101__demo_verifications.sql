-- DEMO DATA: primary-source verification history so Sanctions Monitoring and provider PSV rows are populated.
-- (The prototype generated these with Math.random; here they are stored records relative to the load date.)
INSERT INTO verification_check (org_id, provider_id, source, status, message, checked_at, run_by)
SELECT p.org_id, p.id, s.source,
       CASE WHEN p.id = 1 AND s.source = 'oig' THEN 'flagged' ELSE 'clear' END,
       CASE WHEN p.id = 1 AND s.source = 'oig' THEN 'Possible name match on OIG LEIE — manual review required'
            ELSE CONCAT(UPPER(s.source), ' check clear') END,
       NOW() - INTERVAL (10 + (p.id * 7) % 75) DAY,
       2
FROM provider p
CROSS JOIN (SELECT 'npi' AS source UNION ALL SELECT 'oig' UNION ALL SELECT 'sam' UNION ALL SELECT 'state_license') s
WHERE p.org_id = 1 AND p.id <= 14;
