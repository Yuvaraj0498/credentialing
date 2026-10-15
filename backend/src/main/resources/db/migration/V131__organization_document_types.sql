-- Document types per organization: org_id NULL = everyone (the standard list); otherwise only that organization's
-- providers list it. built_in = the standard types (can't be deleted). deleted / active hide a type from the lists.
ALTER TABLE document_type
  ADD COLUMN org_id BIGINT NULL,
  ADD COLUMN created_by_org_id BIGINT NULL,
  ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN built_in TINYINT(1) NOT NULL DEFAULT 1;

-- Suffix: what an organization admin adds is for everyone (like Specialty)
UPDATE master_list_item SET org_id = NULL WHERE list_key = 'suffix';
