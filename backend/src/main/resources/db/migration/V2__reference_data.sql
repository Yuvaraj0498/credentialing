-- ============================================================
-- Required reference data (needed in every environment, incl. production)
-- ============================================================

-- ---------- Document requirements (14) ----------
INSERT INTO document_type (code, label, critical, expires, months_valid, na_for_us, sort_order) VALUES
('diploma',         'Diploma',                 1, 0, NULL, 0, 1),
('medical_license', 'Medical License',         1, 1, 12,   0, 2),
('dea',             'DEA Certificate',         1, 1, 36,   0, 3),
('malpractice',     'Malpractice Insurance',   1, 1, 12,   0, 4),
('cv',              'CV / Resume',             1, 0, NULL, 0, 5),
('board_cert',      'Board Certification',     0, 1, 120,  0, 6),
('w9',              'W-9',                     1, 0, NULL, 0, 7),
('gov_id',          'Government Issued ID',    1, 1, 60,   0, 8),
('csr_license',     'CSR License',             0, 1, 12,   0, 9),
('cme',             'CME',                     0, 0, NULL, 0, 10),
('claim_history',   'Claim History',           0, 0, NULL, 0, 11),
('clia',            'CLIA',                    0, 1, 24,   0, 12),
('collaborative',   'Collaborative Agreement', 0, 0, NULL, 0, 13),
('ecfmg',           'ECFMG Certification',     0, 0, NULL, 1, 14);

-- ---------- Payers (prototype PAYERS + PRIVATE_PAYERS merged) ----------
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, pricing_category, pricing_mult, sort_order) VALUES
('bcbs_tx',  'BCBS',      'Blue Cross Blue Shield TX',    'Commercial',     'PPO/HMO', '#1d4ed8', 'Ambetter Provider Set-up Form', 'caqh',     'partial', 1, 'https://provider.bcbs.com/login',          49, 'commercial', 1.05, 1),
('aetna',    'Aetna',     'Aetna',                        'Commercial',     'PPO/HMO', '#7c2d12', 'CAQH',                          'caqh',     'partial', 1, 'https://provider.aetna.com/login',         52, 'commercial', 1.00, 2),
('cigna',    'Cigna',     'Cigna',                        'Commercial',     'PPO/HMO', '#065f46', 'CAQH',                          'caqh',     'portal',  1, 'https://cignaforhcp.cigna.com',            61, 'commercial', 1.02, 3),
('uhc',      'UHC',       'UnitedHealthcare',             'Commercial',     'PPO/HMO', '#1e3a8a', 'CAQH',                          'caqh',     'full',    1, 'https://uhcprovider.com',                  58, 'commercial', 1.08, 4),
('humana',   'Humana',    'Humana',                       'Commercial',     'PPO/HMO', '#15803d', 'CAQH',                          'availity', 'portal',  1, 'https://provider.humana.com',              64, 'commercial', 0.98, 5),
('medicare', 'Medicare',  'Medicare (CMS)',               'Federal',        NULL,      '#1e40af', 'CMS-855I',                      'pecos',    'portal',  0, 'https://pecos.cms.hhs.gov',                60, 'medicare',   1.00, 6),
('medicaid', 'Medicaid',  'Texas Medicaid (TMHP)',        'State Medicaid', NULL,      '#0f766e', 'TMHP App',                      'portal',   'portal',  0, 'https://www.tmhp.com',                     92, 'medicaid',   1.00, 7),
('superior', 'Superior',  'Superior HealthPlan (TX MCO)', 'Medicaid MCO',   'Managed', '#0369a1', 'MCO App',                       'portal',   'portal',  0, 'https://www.superiorhealthplan.com',       75, 'medicaid',   0.95, 8),
('anthem',   'Anthem',    'Anthem',                       'Commercial',     'PPO/HMO', '#003DA5', 'CAQH',                          'availity', 'partial', 1, 'https://availity.com/anthem',              NULL, NULL,       1.00, 9),
('kaiser',   'Kaiser',    'Kaiser Permanente',            'Commercial',     'HMO',     '#006BA6', NULL,                            'portal',   'portal',  0, 'https://providers.kaiserpermanente.org',   NULL, NULL,       1.00, 10),
('molina',   'Molina',    'Molina Healthcare',            'Medicaid MCO',   'Managed', '#0072BC', 'CAQH',                          'caqh',     'portal',  1, 'https://provider.molinahealthcare.com',    NULL, NULL,       1.00, 11),
('centene',  'Ambetter',  'Centene / Ambetter',           'Commercial',     'Managed', '#009999', 'CAQH',                          'caqh',     'portal',  1, 'https://provider.ambetter.centene.com',    NULL, NULL,       1.00, 12),
('wellcare', 'WellCare',  'WellCare',                     'Commercial',     'Medicare Advantage', '#005A9C', 'CAQH',               'caqh',     'portal',  1, 'https://wellcare.com/provider',            NULL, NULL,       1.00, 13);

-- ---------- Payer application forms ----------
INSERT INTO payer_form (payer_id, code, label, description, sort_order)
SELECT id, 'ambetter', 'Ambetter Network - Practitioner Enrollment Form.011315', 'For Texas-based ambulatory care providers', 1 FROM payer WHERE code='bcbs_tx' UNION ALL
SELECT id, 'blue_card', 'BlueCard Provider Enrollment', 'Standard BCBS enrollment for new providers', 2 FROM payer WHERE code='bcbs_tx' UNION ALL
SELECT id, 'aetna_app', 'Aetna Provider Application', 'Standard Aetna commercial enrollment', 1 FROM payer WHERE code='aetna' UNION ALL
SELECT id, 'cigna_app', 'Cigna Provider Application', 'Standard Cigna commercial enrollment', 1 FROM payer WHERE code='cigna' UNION ALL
SELECT id, 'humana_app', 'Humana Provider Setup', 'Standard Humana commercial enrollment', 1 FROM payer WHERE code='humana' UNION ALL
SELECT id, 'tmhp_app', 'TMHP Provider Enrollment', 'Texas Medicaid Healthcare Partnership', 1 FROM payer WHERE code='medicaid';

-- Default field mapping template (form_id NULL applies to every form).
-- maps_to paths are resolved server-side against the provider / practice / location.
INSERT INTO payer_form_field (form_id, section_name, label, maps_to, confidence, sort_order) VALUES
(NULL, 'Group or Facility Information', 'Tax ID #',                   'practice.taxId',          'high',   1),
(NULL, 'Group or Facility Information', 'Name',                       'practice.name',           'high',   2),
(NULL, 'Group or Facility Information', 'NPI #',                      'provider.npi',            'high',   3),
(NULL, 'Group or Facility Information', 'Billing Address',            'location.address',        'medium', 4),
(NULL, 'Group or Facility Information', 'City, State ZIP',            'location.cityStateZip',   'high',   5),
(NULL, 'Group or Facility Information', 'Physical Address',           'location.address',        'high',   6),
(NULL, 'Group or Facility Information', 'City, State ZIP (physical)', 'location.cityStateZip',   'medium', 7),
(NULL, 'Group or Facility Information', 'Office Phone',               'location.phone',          'high',   8),
(NULL, 'Group or Facility Information', 'Office Fax',                 'location.fax',            'low',    9),
(NULL, 'Practitioner Information',      'Practitioner Type',          'provider.practitionerType','low',   10),
(NULL, 'Practitioner Information',      'Name',                       'provider.fullName',       'high',   11),
(NULL, 'Practitioner Information',      'Email',                      'provider.email',          'high',   12),
(NULL, 'Practitioner Information',      'CAQH #',                     'provider.caqhId',         'high',   13),
(NULL, 'Practitioner Information',      'NPI #',                      'provider.npi',            'high',   14),
(NULL, 'Practitioner Information',      'Provider Gender',            'provider.gender',         'medium', 15),
(NULL, 'Practitioner Information',      'Ethnicity',                  'provider.ethnicity',      'medium', 16),
(NULL, 'Practitioner Information',      'Primary Taxonomy Code',      'provider.taxonomyCode',   'low',    17);

-- ---------- Subscription packages ----------
INSERT INTO subscription_package (code, name, base_price, per_provider, color, color_soft, recommended, provider_cap, payer_cap, ai_uploads_per_month, primary_support, sort_order) VALUES
('starter',      'Starter',      299.00,  19.00, '#3b82f6', '#dbeafe', 0, 10,   5,    50,   'Email',                 1),
('professional', 'Professional', 599.00,  15.00, '#f97316', '#fff7ed', 1, 50,   25,   250,  'Email + Chat',          2),
('enterprise',   'Enterprise',   1499.00, 12.00, '#7c3aed', '#ede9fe', 0, NULL, NULL, NULL, 'Phone + Dedicated CSM', 3);

INSERT INTO package_feature (package_code, label, included, sort_order) VALUES
('starter', 'Up to 10 providers', 1, 1), ('starter', 'Up to 5 payers', 1, 2), ('starter', '50 AI document uploads/month', 1, 3),
('starter', 'CAQH import', 1, 4), ('starter', 'Basic reporting', 1, 5), ('starter', 'Email support', 1, 6),
('starter', 'Send Link to Provider', 0, 7), ('starter', 'Payer portal logins', 0, 8), ('starter', 'Custom rate cards', 0, 9), ('starter', 'Phone support', 0, 10),
('professional', 'Up to 50 providers', 1, 1), ('professional', 'Up to 25 payers', 1, 2), ('professional', '250 AI document uploads/month', 1, 3),
('professional', 'CAQH import', 1, 4), ('professional', 'Send Link to Provider', 1, 5), ('professional', 'Payer portal logins', 1, 6),
('professional', 'Form auto-fill', 1, 7), ('professional', 'Time tracking & follow-ups', 1, 8), ('professional', 'Advanced reporting + export', 1, 9),
('professional', 'Chat support', 1, 10), ('professional', 'Custom rate cards', 0, 11), ('professional', 'API access', 0, 12), ('professional', 'Dedicated CSM', 0, 13),
('enterprise', 'Unlimited providers', 1, 1), ('enterprise', 'Unlimited payers', 1, 2), ('enterprise', 'Unlimited AI uploads', 1, 3),
('enterprise', 'All Professional features', 1, 4), ('enterprise', 'Custom rate cards by state', 1, 5), ('enterprise', 'API access', 1, 6),
('enterprise', 'SSO / SAML', 1, 7), ('enterprise', 'Dedicated Customer Success Manager', 1, 8), ('enterprise', '24/7 phone support', 1, 9),
('enterprise', 'Custom integrations', 1, 10);

-- ---------- Pricing ----------
INSERT INTO pricing_base_rate (category, service_type, amount) VALUES
('medicare', 'new', 425), ('medicare', 'recred', 195),
('medicaid', 'new', 360), ('medicaid', 'recred', 175),
('commercial', 'new', 300), ('commercial', 'recred', 145);

INSERT INTO pricing_state (code, name, mult, region) VALUES
('AL','Alabama',0.92,'south'),('AK','Alaska',1.18,'west'),('AZ','Arizona',0.98,'west'),('AR','Arkansas',0.88,'south'),
('CA','California',1.22,'west'),('CO','Colorado',1.06,'west'),('CT','Connecticut',1.14,'northeast'),('DE','Delaware',1.02,'south'),
('FL','Florida',0.96,'south'),('GA','Georgia',0.94,'south'),('HI','Hawaii',1.16,'west'),('ID','Idaho',0.90,'west'),
('IL','Illinois',1.04,'midwest'),('IN','Indiana',0.91,'midwest'),('IA','Iowa',0.89,'midwest'),('KS','Kansas',0.88,'midwest'),
('KY','Kentucky',0.89,'south'),('LA','Louisiana',0.93,'south'),('ME','Maine',0.99,'northeast'),('MD','Maryland',1.08,'south'),
('MA','Massachusetts',1.12,'northeast'),('MI','Michigan',0.97,'midwest'),('MN','Minnesota',1.02,'midwest'),('MS','Mississippi',0.86,'south'),
('MO','Missouri',0.92,'midwest'),('MT','Montana',0.91,'west'),('NE','Nebraska',0.89,'midwest'),('NV','Nevada',1.00,'west'),
('NH','New Hampshire',1.02,'northeast'),('NJ','New Jersey',1.13,'northeast'),('NM','New Mexico',0.91,'west'),('NY','New York',1.17,'northeast'),
('NC','North Carolina',0.94,'south'),('ND','North Dakota',0.88,'midwest'),('OH','Ohio',0.94,'midwest'),('OK','Oklahoma',0.88,'south'),
('OR','Oregon',1.05,'west'),('PA','Pennsylvania',1.00,'northeast'),('RI','Rhode Island',1.05,'northeast'),('SC','South Carolina',0.91,'south'),
('SD','South Dakota',0.87,'midwest'),('TN','Tennessee',0.92,'south'),('TX','Texas',0.98,'south'),('UT','Utah',0.96,'west'),
('VT','Vermont',1.01,'northeast'),('VA','Virginia',1.01,'south'),('WA','Washington',1.07,'west'),('WV','West Virginia',0.86,'south'),
('WI','Wisconsin',0.95,'midwest'),('WY','Wyoming',0.88,'west');

-- ---------- Default permission matrix (org_id NULL = global) ----------
-- Entities x actions x roles; a row exists for every combination with allowed 0/1.
CREATE TEMPORARY TABLE tmp_perm (entity VARCHAR(40), action VARCHAR(10), roles VARCHAR(200));
INSERT INTO tmp_perm VALUES
('provider','create','platform_admin,org_admin,clerk'), ('provider','read','platform_admin,org_admin,clerk,provider,auditor'),
('provider','update','platform_admin,org_admin,clerk'), ('provider','delete','platform_admin,org_admin'), ('provider','list','platform_admin,org_admin,clerk,auditor'),
('enrollment','create','platform_admin,org_admin,clerk'), ('enrollment','read','platform_admin,org_admin,clerk,provider,auditor'),
('enrollment','update','platform_admin,org_admin,clerk'), ('enrollment','delete','platform_admin,org_admin'), ('enrollment','list','platform_admin,org_admin,clerk,auditor'),
('user','create','platform_admin,org_admin'), ('user','read','platform_admin,org_admin,auditor'),
('user','update','platform_admin,org_admin'), ('user','delete','platform_admin,org_admin'), ('user','list','platform_admin,org_admin,auditor'),
('location','create','platform_admin,org_admin'), ('location','read','platform_admin,org_admin,clerk,auditor'),
('location','update','platform_admin,org_admin'), ('location','delete','platform_admin,org_admin'), ('location','list','platform_admin,org_admin,clerk,auditor'),
('payer','create','platform_admin,org_admin'), ('payer','read','platform_admin,org_admin,clerk,provider,auditor'),
('payer','update','platform_admin,org_admin'), ('payer','delete','platform_admin'), ('payer','list','platform_admin,org_admin,clerk,provider,auditor'),
('document','create','platform_admin,org_admin,clerk,provider'), ('document','read','platform_admin,org_admin,clerk,provider,auditor'),
('document','update','platform_admin,org_admin,clerk,provider'), ('document','delete','platform_admin,org_admin,clerk'), ('document','list','platform_admin,org_admin,clerk,provider,auditor'),
('task','create','platform_admin,org_admin,clerk'), ('task','read','platform_admin,org_admin,clerk,auditor'),
('task','update','platform_admin,org_admin,clerk'), ('task','delete','platform_admin,org_admin,clerk'), ('task','list','platform_admin,org_admin,clerk,auditor'),
('billing','create','platform_admin,org_admin'), ('billing','read','platform_admin,org_admin,auditor'),
('billing','update','platform_admin,org_admin'), ('billing','delete','platform_admin'), ('billing','list','platform_admin,org_admin,auditor'),
('credential_vault','create','platform_admin,org_admin,clerk,provider'), ('credential_vault','read','platform_admin,org_admin,clerk,provider'),
('credential_vault','update','platform_admin,org_admin,clerk,provider'), ('credential_vault','delete','platform_admin,org_admin,clerk,provider'), ('credential_vault','list','platform_admin,org_admin,clerk,provider'),
('payer_submission','create','platform_admin,org_admin,clerk'), ('payer_submission','read','platform_admin,org_admin,clerk,auditor'),
('payer_submission','update',''), ('payer_submission','delete',''), ('payer_submission','list','platform_admin,org_admin,clerk,auditor');

CREATE TEMPORARY TABLE tmp_role (role VARCHAR(20));
INSERT INTO tmp_role VALUES ('platform_admin'),('org_admin'),('clerk'),('provider'),('auditor');

INSERT INTO role_permission (org_id, entity, action, role, allowed)
SELECT NULL, p.entity, p.action, r.role, IF(FIND_IN_SET(r.role, p.roles) > 0, 1, 0)
FROM tmp_perm p CROSS JOIN tmp_role r;

DROP TEMPORARY TABLE tmp_perm;
DROP TEMPORARY TABLE tmp_role;

-- ---------- Clinical privilege catalog ----------
INSERT INTO privilege_category (code, name) VALUES
('cardiology', 'Cardiology'), ('interventional', 'Interventional Cardiology'),
('electrophysiology', 'Electrophysiology'), ('pediatrics', 'Pediatrics');

INSERT INTO privilege_item (category_code, name, sort_order) VALUES
('cardiology','Cardiac Catheterization',1),('cardiology','Echocardiography',2),('cardiology','Stress Testing',3),
('cardiology','Holter Monitor Interpretation',4),('cardiology','Pacemaker Implantation',5),('cardiology','Inpatient Consultation',6),
('interventional','PCI / Angioplasty',1),('interventional','Coronary Stenting',2),('interventional','Peripheral Vascular Intervention',3),
('interventional','Transradial Access',4),('interventional','IVUS / OCT',5),
('electrophysiology','Cardiac EP Study',1),('electrophysiology','Ablation Procedures',2),('electrophysiology','ICD Implantation',3),
('electrophysiology','Loop Recorder Insertion',4),('electrophysiology','Tilt Table Testing',5),
('pediatrics','Well-Child Care',1),('pediatrics','Vaccinations',2),('pediatrics','Newborn Care',3),
('pediatrics','Behavioral Health Screening',4),('pediatrics','Adolescent Medicine',5);

-- ---------- System email templates (org_id NULL) ----------
INSERT INTO email_template (org_id, type, name, subject, body) VALUES
(NULL, 'missing_docs', 'Missing Documents Reminder',
 '{{provider_first_name}}, you have {{pending_document_count}} documents needed to complete your credentialing',
 'Hi {{provider_first_name}},\n\nYour credentialing file is currently incomplete. There are {{pending_document_count}} required document(s) that we still need.\n\nMissing documents may delay your credentialing or affect your network status.\n\nThe following documents are still needed:\n{{missing_document_list}}\n\nSecure Access PIN: {{pin}}\n\nUpload your documents: {{upload_link}}\n\nLink expires: {{link_expires}}\n\nIf the link has expired by the time you access it, please contact {{organization_name}} and we will send you a new one.'),
(NULL, 'expiring', 'Expiring Documents Reminder',
 '{{provider_first_name}}, some of your credentialing documents are expiring soon',
 'Hi {{provider_first_name}},\n\nThe following documents on file are expiring soon:\n{{expiring_document_list}}\n\nPlease upload renewed copies: {{upload_link}}\n\nThank you,\n{{organization_name}}'),
(NULL, 'incomplete', 'Incomplete Profile Reminder',
 '{{provider_first_name}}, please complete your provider profile',
 'Hi {{provider_first_name}},\n\nYour provider profile is incomplete. Please sign in and complete the remaining fields so we can continue your credentialing.\n\n{{upload_link}}\n\nThank you,\n{{organization_name}}');
