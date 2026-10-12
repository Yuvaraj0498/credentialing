-- Payers an organization admin adds themselves (Payers → Add Payer). Such a payer is on for that organization and
-- off for every other organization until the super admin switches it on (Organizations → Payers).
ALTER TABLE payer
  ADD COLUMN added_by_org_id BIGINT NULL,
  ADD CONSTRAINT fk_payer_added_by_org FOREIGN KEY (added_by_org_id) REFERENCES organization(id) ON DELETE SET NULL;
