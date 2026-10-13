-- Required documents for every provider (however the provider is added): Diploma, Medical License, DEA Certificate,
-- Malpractice Insurance, CV / Resume, Board Certification, W-9, IRS Letter, Government Issued ID. The other types
-- stay optional.
UPDATE document_type SET critical = 1 WHERE code IN ('diploma', 'medical_license', 'dea', 'malpractice', 'cv', 'board_cert', 'w9', 'gov_id');
UPDATE document_type SET critical = 0 WHERE code NOT IN ('diploma', 'medical_license', 'dea', 'malpractice', 'cv', 'board_cert', 'w9', 'gov_id');

INSERT INTO document_type (code, label, critical, expires, months_valid, na_for_us, sort_order)
SELECT 'irs_letter', 'IRS Letter', 1, 0, NULL, 0, 8 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM document_type WHERE code = 'irs_letter');

-- order as listed: ... W-9, IRS Letter, Government Issued ID, then the optional ones
UPDATE document_type SET sort_order = 9  WHERE code = 'gov_id';
UPDATE document_type SET sort_order = 10 WHERE code = 'csr_license';
UPDATE document_type SET sort_order = 11 WHERE code = 'cme';
UPDATE document_type SET sort_order = 12 WHERE code = 'claim_history';
UPDATE document_type SET sort_order = 13 WHERE code = 'clia';
UPDATE document_type SET sort_order = 14 WHERE code = 'collaborative';
UPDATE document_type SET sort_order = 15 WHERE code = 'ecfmg';
