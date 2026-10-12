-- Payers are now off for an organization until the super admin switches them on (Organizations → Payers); a payer
-- an organization's admin added stays on for that organization. Existing organizations keep exactly the payers
-- they see today: those are saved as switched on.
INSERT INTO org_payer_setting (org_id, payer_id, enabled)
SELECT o.id, p.id, 1
FROM organization o
JOIN payer p ON p.is_deleted = 0 AND p.added_by_org_id IS NULL AND p.portal_available = 1
WHERE NOT EXISTS (SELECT 1 FROM org_payer_setting s WHERE s.org_id = o.id AND s.payer_id = p.id);
