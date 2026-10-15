-- Master Data: the lists behind the dropdowns (Specialty, Suffix, Payer Category, Location Type, Organization Type).
-- org_id NULL = everyone sees the item; otherwise only that organization. created_by_org_id = who added it.
CREATE TABLE master_list_item (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  list_key           VARCHAR(40)  NOT NULL,
  code               VARCHAR(60)  NULL,
  value              VARCHAR(150) NOT NULL,
  sort_order         INT          NOT NULL DEFAULT 0,
  active             TINYINT(1)   NOT NULL DEFAULT 1,
  org_id             BIGINT       NULL,
  created_by_org_id  BIGINT       NULL,
  created_by         BIGINT       NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted         TINYINT(1)   NOT NULL DEFAULT 0,
  KEY idx_mli_list (list_key, org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO master_list_item (list_key, code, value, sort_order) VALUES
('specialty', NULL, 'Family Medicine', 1),
('specialty', NULL, 'Internal Medicine', 2),
('specialty', NULL, 'Pediatrics', 3),
('specialty', NULL, 'Cardiology', 4),
('specialty', NULL, 'Interventional Cardiology', 5),
('specialty', NULL, 'Psychiatry', 6),
('specialty', NULL, 'OB/GYN', 7),
('specialty', NULL, 'Orthopedic Surgery', 8),
('specialty', NULL, 'Emergency Medicine', 9),
('specialty', NULL, 'Anesthesiology', 10),
('specialty', NULL, 'Radiology', 11),
('specialty', NULL, 'Dermatology', 12),
('specialty', NULL, 'Electrophysiology', 13),
('specialty', NULL, 'Cardiologist', 14),
('specialty', NULL, 'Applied Behavior Analysis', 15),
('suffix', NULL, 'MD', 1),
('suffix', NULL, 'DO', 2),
('suffix', NULL, 'NP', 3),
('suffix', NULL, 'PA', 4),
('suffix', NULL, 'DDS', 5),
('suffix', NULL, 'DMD', 6),
('suffix', NULL, 'PhD', 7),
('suffix', NULL, 'LCSW', 8),
('suffix', NULL, 'LPC', 9),
('suffix', NULL, 'LMFT', 10),
('suffix', NULL, 'BCBA', 11),
('suffix', NULL, 'RN', 12),
('payer_category', NULL, 'Commercial', 1),
('payer_category', NULL, 'Commercial (HMO)', 2),
('payer_category', NULL, 'Federal', 3),
('payer_category', NULL, 'State Medicaid', 4),
('payer_category', NULL, 'Medicaid MCO', 5),
('payer_category', NULL, 'Medicare Advantage', 6),
('payer_category', NULL, 'Behavioral Health', 7),
('location_type', NULL, 'Primary', 1),
('location_type', NULL, 'Satellite', 2),
('location_type', NULL, 'Hospital', 3),
('location_type', NULL, 'Admin Office', 4),
('org_type', 'physician_group', 'Physician Group', 1),
('org_type', 'hospital', 'Hospital', 2),
('org_type', 'clinic', 'Clinic', 3),
('org_type', 'aba', 'ABA / Behavioral Health', 4),
('org_type', 'urgent_care', 'Urgent Care', 5),
('org_type', 'cred_service', 'Credentialing Service', 6),
('org_type', 'other', 'Other', 7);

-- values already in use stay selectable (added for everyone, after the standard ones)
INSERT INTO master_list_item (list_key, value, sort_order)
SELECT 'specialty', t.v, 100 FROM (SELECT DISTINCT TRIM(specialty) AS v FROM provider
  WHERE specialty IS NOT NULL AND TRIM(specialty) <> '' AND TRIM(specialty) <> 'Other') t
WHERE NOT EXISTS (SELECT 1 FROM master_list_item m WHERE m.list_key = 'specialty' AND m.value = t.v);
INSERT INTO master_list_item (list_key, value, sort_order)
SELECT 'payer_category', t.v, 100 FROM (SELECT DISTINCT TRIM(category) AS v FROM payer
  WHERE category IS NOT NULL AND TRIM(category) <> '') t
WHERE NOT EXISTS (SELECT 1 FROM master_list_item m WHERE m.list_key = 'payer_category' AND m.value = t.v);
