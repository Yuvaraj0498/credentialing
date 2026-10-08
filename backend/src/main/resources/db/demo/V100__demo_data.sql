-- ============================================================
-- DEMO / SEED DATA — taken from the prototype's sample records.
-- Loaded only when app.demo-data=true (Flyway location classpath:db/demo).
-- Never enable on a production database.
--
-- Demo logins (password):
--   admin / admin123        org_admin   (Jake Zebaida)
--   clerk / clerk123        clerk       (Maria Rodriguez)
--   erizzo / rizzo123       provider    (Erin Rizzo)
--   platform.admin / test123  platform_admin
--   org.admin.1 / test123   org_admin
--   clerk.1 / test123       clerk
--   auditor / test123       auditor
--   test.provider / test123 provider
-- ============================================================

INSERT INTO organization (id, name, org_type, address, city, state, zip, phone, email, invite_code, status) VALUES
(1, 'ZmartCredential Billing Solutions', 'cred_service', '215 Ayer Road #797', 'Harvard', 'MA', '01451', '(852) 518-6353', 'billing@zmartcredential.com', 'ZMART-2026', 'active');

INSERT INTO client (id, org_id, name) VALUES
(1, 1, 'Brickell Dental'),
(2, 1, 'Precision ABA');

INSERT INTO practice (id, org_id, client_id, name, tax_id, address, phone, email) VALUES
(1, 1, 1, 'SANITAS CARE, PA',           '121212121',  '100 Main St, Miami, FL 33101', NULL, NULL),
(2, 1, 1, 'Brickell Dental',            '270746053',  '200 Brickell Ave, Miami, FL 33131', NULL, NULL),
(3, 1, 1, 'Brickell Dental Associates', '270746054',  NULL, NULL, NULL),
(4, 1, 2, 'Precision Connecticut',      '12345678',   '55 Springfield Rd, Springfield, CT 06105', '(860) 555-0100', NULL),
(5, 1, 2, 'Precision Massachusetts',    '1234567890', '30 Pearly Lane, Gardner, MA, 01440', '978-635-9090', 'info@senciosystems.com');

INSERT INTO location (id, org_id, practice_id, name, legal_name, npi, location_type, address, city, state, zip, phone, lat, lng) VALUES
(1, 1, 1, 'SANITAS CARE, PA', 'SANITAS CARE, PA',       '1578009445', 'Primary',   '100 Main St',                             'Miami',       'FL', '33101', NULL,             25.775400, -80.194700),
(2, 1, 2, 'Brickell Dental',  'BRICKELL DENTAL, INC',   '1578009446', 'Primary',   '200 Brickell Ave',                        'Miami',       'FL', '33131', NULL,             25.761700, -80.191800),
(3, 1, 4, 'Springfield',      'PRECISION ABA CT, INC',  '1578009447', 'Primary',   '55 Springfield Rd',                       'Springfield', 'CT', '06105', '(860) 555-0100', 41.763700, -72.685100),
(4, 1, 4, 'New Haven',        'PRECISION ABA CT, INC',  '1578009448', 'Satellite', '120 New Haven Ave',                       'New Haven',   'CT', '06511', '(203) 555-0101', 41.308300, -72.927900),
(5, 1, 5, 'Harvard',          'SENSCIO SYSTEMS, INC.',  '1578009444', 'Primary',   '215 Ayer Road #797',                      'Harvard',     'MA', '01451', '(852) 518-6353', 42.500600, -71.584800),
(6, 1, 5, 'Boxborough',       'SENSCIO SYSTEMS, INC.',  '1578009444', 'Satellite', '133 East Brush Hill Road, Suite 202',     'Boxborough',  'MA', '01719', '978-635-9090',   42.486600, -71.518900);

INSERT INTO provider (id, org_id, first_name, last_name, suffix, specialty, npi, email, phone, license_number, license_state, license_expires, dea_number, dea_expires, caqh_id, caqh_username, caqh_last_attested, board_cert, malpractice_carrier, client_id, practice_id, location_id, status, telemed, source, date_added) VALUES
(1,  1, 'Erin',    'Rizzo',     'MD', 'Cardiology',                          '1912429051', 'erin.rizzo@zmartcredential.com',      '(852) 518-6353', 'MA12345', 'MA', '2027-03-15', 'BS2444850', '2017-02-28', '15454546', 'erizzo1234', '2026-02-10', 'ABIM Cardiology', 'Gotham Mutual Insurance Co.', 2, 5, 5, 'active',     1, 'manual', '2025-09-12'),
(2,  1, 'Philip',  'Christian', 'MD', 'Pediatrics',                          '1234567890', NULL,                                   NULL,             'TX87654', 'TX', '2027-06-30', NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'draft',      0, 'manual', '2026-04-01'),
(3,  1, 'Apoor',   'Gami',      'MD', 'Electrophysiology',                   '2028567012', 'apoor.gami@zmartcredential.com',      '(617) 555-0123', 'MA22113', 'MA', '2027-01-15', 'BG3344521', '2027-08-20', '12334987', NULL,         '2026-01-20', 'ABIM EP',         NULL,                          2, 5, 6, 'active',     0, 'caqh',   '2024-08-20'),
(4,  1, 'Alicia',  'Aguilar',   'MD', 'Cardiology',                          '1195679266', 'alicia.aguilar@zmartcredential.com',  NULL,             'MA45612', 'MA', '2026-08-30', 'BA7821336', '2027-05-15', NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'on_hold',    0, 'manual', '2025-01-15'),
(5,  1, 'Becky',   'Hagensee',  'MD', 'Cardiology',                          '1972885743', 'becky.hagensee@zmartcredential.com',  '(617) 555-2244', 'MA55887', 'MA', '2027-04-12', 'BH8821443', '2028-09-10', '10987654', NULL,         '2025-12-15', NULL,              'MedPro Group',                2, 5, 6, 'active',     0, 'manual', '2024-06-10'),
(6,  1, 'Michael', 'Trybula',   'MD', 'Cardiologist',                        '2481919133', 'michael.trybula@zmartcredential.com', NULL,             'MA33445', 'MA', '2027-02-28', 'BT5566778', '2027-11-30', NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'on_hold',    0, 'manual', '2025-03-20'),
(7,  1, 'John',    'Cahill',    'MD', 'Interventional Cardiology',           '1151270736', 'john.cahill@zmartcredential.com',     '(617) 555-9981', 'MA77123', 'MA', '2027-09-18', 'BC9981002', '2028-04-25', '11223344', NULL,         '2026-03-01', NULL,              NULL,                          2, 5, 6, 'active',     0, 'manual', '2024-11-05'),
(8,  1, 'Joseph',  'Danavi',    'MD', 'Cardiologist',                        '2285570923', 'joseph.danavi@zmartcredential.com',   '(617) 555-3344', 'MA22334', 'MA', '2027-11-30', NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'active',     0, 'manual', '2024-09-30'),
(9,  1, 'Anish',   'Amin',      'MD', 'Interventional Cardiology',           '1711750566', 'anish.amin@zmartcredential.com',      '(617) 555-7766', 'MA88990', 'MA', '2028-01-20', 'BA1122334', '2027-07-15', NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'active',     0, 'manual', '2024-12-12'),
(10, 1, 'Pratik',  'Parikh',    'MD', 'Interventional Cardiology',           '2827760835', 'pratik.parikh@zmartcredential.com',   '(617) 555-8899', 'MA66554', 'MA', '2027-08-22', NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'active',     0, 'manual', '2025-02-18'),
(11, 1, 'Cash',    'Casey',     'MD', 'Electrophysiology',                   '2092959381', 'cash.casey@zmartcredential.com',      NULL,             'MA11220', 'MA', '2026-12-01', NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'on_hold',    0, 'manual', '2025-05-08'),
(12, 1, 'Cathy',   'Adamson',   'MD', 'Cardiology',                          '2142869642', 'cathy.adamson@zmartcredential.com',   '(617) 555-4422', 'MA77881', 'MA', '2027-05-17', 'BA3344556', '2028-06-25', NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 6, 'active',     0, 'manual', '2024-07-22'),
(13, 1, 'Deep',    'Shah',      'MD', 'Advanced HF & Transplant Cardiology', '1220858602', 'deep.shah@zmartcredential.com',       '(617) 555-5566', 'MA99776', 'MA', '2027-10-08', NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 5, 'active',     0, 'manual', '2024-10-14'),
(14, 1, 'Tony',    'DeMartini', 'MD', 'Interventional Cardiology',           '1917179718', 'tony.demartini@zmartcredential.com',  NULL,             'MA45567', 'MA', '2025-12-15', NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          2, 5, 5, 'terminated', 0, 'manual', '2024-01-10'),
(15, 1, 'Test',    'Provider',  'MD', 'Family Medicine',                     '1003000126', 'test.provider@zmartcredential.com',   NULL,             NULL,      'TX', NULL,         NULL,        NULL,         NULL,       NULL,         NULL,         NULL,              NULL,                          NULL, NULL, NULL, 'draft',  0, 'manual', '2026-05-01');

UPDATE provider SET caqh_attestation_status = 'attested' WHERE caqh_last_attested IS NOT NULL;

-- Every provider gets one row per document requirement: 'missing', or 'na' where na_for_us.
INSERT INTO provider_document (org_id, provider_id, doc_type, status)
SELECT p.org_id, p.id, d.code, IF(d.na_for_us = 1, 'na', 'missing') FROM provider p CROSS JOIN document_type d;

-- Erin Rizzo
UPDATE provider_document SET status='approved', file_name='Erin-Rizzo-Diploma.pdf', uploaded_at='2025-09-12 10:00:00' WHERE provider_id=1 AND doc_type='diploma';
UPDATE provider_document SET status='approved', file_name='Erin-Rizzo-insurance.pdf', expires_at='2026-07-08', uploaded_at='2025-09-12 10:00:00' WHERE provider_id=1 AND doc_type='malpractice';
UPDATE provider_document SET status='expired', file_name='Erin-Rizzo-DEA-Certificate.pdf', expires_at='2017-02-28', uploaded_at='2025-09-12 10:00:00' WHERE provider_id=1 AND doc_type='dea';
-- Apoor Gami
UPDATE provider_document SET status='approved' WHERE provider_id=3 AND doc_type IN ('diploma','medical_license','dea','malpractice','cv','w9','board_cert');
-- Alicia Aguilar
UPDATE provider_document SET status='approved' WHERE provider_id=4 AND doc_type IN ('diploma','medical_license','cv');
UPDATE provider_document SET status='pending_review' WHERE provider_id=4 AND doc_type='malpractice';
-- Becky Hagensee
UPDATE provider_document SET status='approved' WHERE provider_id=5 AND doc_type IN ('diploma','medical_license','dea','malpractice','cv','board_cert','w9','gov_id','cme');
-- Michael Trybula
UPDATE provider_document SET status='approved' WHERE provider_id=6 AND doc_type IN ('diploma','cv','w9');
UPDATE provider_document SET status='pending_review' WHERE provider_id=6 AND doc_type='medical_license';
-- John Cahill
UPDATE provider_document SET status='approved' WHERE provider_id=7 AND doc_type IN ('diploma','medical_license','dea','malpractice','cv','board_cert','w9','gov_id');
-- Joseph Danavi, Pratik Parikh, Deep Shah
UPDATE provider_document SET status='approved' WHERE provider_id IN (8,10,13) AND doc_type IN ('diploma','medical_license','cv');
-- Anish Amin
UPDATE provider_document SET status='approved' WHERE provider_id=9 AND doc_type IN ('diploma','medical_license','dea','malpractice','cv');
-- Cash Casey
UPDATE provider_document SET status='approved' WHERE provider_id=11 AND doc_type IN ('diploma','cv');
-- Cathy Adamson
UPDATE provider_document SET status='approved' WHERE provider_id=12 AND doc_type IN ('diploma','medical_license','dea','malpractice','cv','board_cert','w9','gov_id','cme','claim_history','clia','csr_license','collaborative');

-- ---------- Users ----------
INSERT INTO app_user (id, org_id, username, email, password_hash, first_name, last_name, display_name, title, role, provider_id) VALUES
(1, 1,    'admin',          'jake@zmartcredential.com',          '$2a$10$tH57uFPRBTimB.4ZciyCuOxtkFZ7rAO5O0ITK8NZnzTnR4YDXTV6W', 'Jake',   'Zebaida',   'Jake Zebaida',      'Super Admin',                 'org_admin',      NULL),
(2, 1,    'clerk',          'maria@zmartcredential.com',         '$2a$10$F7Bu.dLTO5UsKJyBfLH4CeyO9y81OhbCR/A1dcSr7aBqKuF2yDxfy', 'Maria',  'Rodriguez', 'Maria Rodriguez',   'Credentialing Specialist',    'clerk',          NULL),
(3, 1,    'erizzo',         'erin.rizzo@zmartcredential.com',    '$2a$10$.AtJwvEw0k0Qn53oZLxJ8uWG4kqAit/vDUoJcg2qOeLmR/d3ddqZy', 'Erin',   'Rizzo',     'Erin Rizzo',        'Cardiology MD',               'provider',       1),
(4, NULL, 'platform.admin', 'pat@zmartcredential.com',           '$2a$10$11YhCPhQ8xxnLNtfNJfbC.rQRhM9VxqBlBQH4KvkZ0r28qCVsK0i2', 'Pat',    'Platform',  'Pat Platform',      'Platform Admin',              'platform_admin', NULL),
(5, 1,    'org.admin.1',    'owen@zmartcredential.com',          '$2a$10$11YhCPhQ8xxnLNtfNJfbC.rQRhM9VxqBlBQH4KvkZ0r28qCVsK0i2', 'Owen',   'Admin',     'Owen Admin',        'Executive Director',          'org_admin',      NULL),
(6, 1,    'clerk.1',        'carla@zmartcredential.com',         '$2a$10$11YhCPhQ8xxnLNtfNJfbC.rQRhM9VxqBlBQH4KvkZ0r28qCVsK0i2', 'Carla',  'Clerk',     'Carla Clerk',       'Sr Credentialing Specialist', 'clerk',          NULL),
(7, 1,    'auditor',        'audrey@zmartcredential.com',        '$2a$10$11YhCPhQ8xxnLNtfNJfbC.rQRhM9VxqBlBQH4KvkZ0r28qCVsK0i2', 'Audrey', 'Auditor',   'Audrey Auditor',    'Compliance Reviewer',         'auditor',        NULL),
(8, 1,    'test.provider',  'test.provider@zmartcredential.com', '$2a$10$11YhCPhQ8xxnLNtfNJfbC.rQRhM9VxqBlBQH4KvkZ0r28qCVsK0i2', 'Test',   'Provider',  'Dr. Test Provider', 'MD',                          'provider',       15);

-- ---------- Enrollments ----------
SET @bcbs = (SELECT id FROM payer WHERE code='bcbs_tx');
SET @aetna = (SELECT id FROM payer WHERE code='aetna');
SET @cigna = (SELECT id FROM payer WHERE code='cigna');
SET @uhc = (SELECT id FROM payer WHERE code='uhc');
SET @humana = (SELECT id FROM payer WHERE code='humana');
SET @medicare = (SELECT id FROM payer WHERE code='medicare');
SET @medicaid = (SELECT id FROM payer WHERE code='medicaid');

INSERT INTO enrollment (id, org_id, provider_id, payer_id, practice_id, status, submitted_date, effective_date, tat_days) VALUES
(1,  1, 1,  @bcbs,     5, 'approved',    '2025-11-14', '2026-01-13', 49),
(2,  1, 1,  @cigna,    5, 'approved',    '2025-11-15', '2026-01-14', 63),
(3,  1, 1,  @humana,   5, 'approved',    '2025-11-27', '2026-01-12', 36),
(4,  1, 1,  @medicaid, 5, 'submitted',   NULL,         NULL,         NULL),
(5,  1, 5,  @bcbs,     5, 'approved',    '2025-10-01', '2025-12-15', 75),
(6,  1, 5,  @aetna,    5, 'approved',    '2025-09-20', '2025-11-30', 71),
(7,  1, 5,  @cigna,    5, 'in_progress', NULL,         NULL,         NULL),
(8,  1, 5,  @uhc,      5, 'in_progress', NULL,         NULL,         NULL),
(9,  1, 7,  @bcbs,     5, 'approved',    '2025-08-15', '2025-10-20', 66),
(10, 1, 7,  @aetna,    5, 'approved',    '2025-08-22', '2025-11-05', 75),
(11, 1, 12, @bcbs,     5, 'approved',    '2025-08-01', '2025-10-15', 75),
(12, 1, 12, @humana,   5, 'approved',    '2025-08-30', '2025-10-25', 56),
(13, 1, 12, @medicare, 5, 'approved',    '2025-07-15', '2025-09-30', 77),
(14, 1, 3,  @bcbs,     5, 'submitted',   '2026-04-10', NULL,         NULL),
(15, 1, 3,  @aetna,    5, 'submitted',   '2026-04-12', NULL,         NULL),
(16, 1, 13, @bcbs,     5, 'in_progress', NULL,         NULL,         NULL),
(17, 1, 13, @uhc,      5, 'in_progress', NULL,         NULL,         NULL);

INSERT INTO enrollment_file (enrollment_id, name, file_type, uploaded_at) VALUES
(1, 'Carroll, Steven BCBS welcome letter Medicare.pdf', 'welcome_letter',   '2026-02-09 17:57:00'),
(1, 'Carroll, Steven BCBS update form.pdf',             'application_form', '2026-02-09 17:56:56'),
(1, 'Carroll, Steven BCBS Attest.pdf',                  'contract',         '2026-02-09 17:56:30');

-- Enrollment timeline events derived from the seed dates
INSERT INTO enrollment_event (enrollment_id, event_type, occurred_at, actor_label, note)
SELECT id, 'created', DATE_SUB(COALESCE(submitted_date, '2026-04-01'), INTERVAL 14 DAY), 'System', 'Enrollment created' FROM enrollment;
INSERT INTO enrollment_event (enrollment_id, event_type, occurred_at, actor_label, note)
SELECT id, 'submitted', submitted_date, 'System', 'Application submitted to payer' FROM enrollment WHERE submitted_date IS NOT NULL;
INSERT INTO enrollment_event (enrollment_id, event_type, occurred_at, actor_label, note)
SELECT id, 'approved', effective_date, 'Payer', 'Enrollment approved' FROM enrollment WHERE status='approved' AND effective_date IS NOT NULL;

-- ---------- Tasks, notifications, activity ----------
INSERT INTO task (org_id, title, description, priority, status, due_date, provider_id, created_by, created_at) VALUES
(1, 'Follow up with Aetna on Rizzo enrollment', 'Submitted 5/10, no response yet', 'high', 'open', '2026-05-20', 1, 1, '2026-05-15 09:30:00'),
(1, 'Verify Adamson DEA renewal', NULL, 'medium', 'in_progress', '2026-05-22', 12, 1, '2026-05-16 14:20:00'),
(1, 'Submit Becky Hagensee to BCBS', NULL, 'medium', 'done', NULL, 5, 1, '2026-05-10 11:00:00');

INSERT INTO notification (org_id, title, body, icon, color, is_read, created_at) VALUES
(1, 'DEA Certificate expired', 'Erin Rizzo''s DEA certificate expired on 2017-02-28. Schedule renewal.', 'AlertCircle', 'var(--danger)', 0, '2026-05-19 08:00:00'),
(1, 'BCBS approved Cathy Adamson', 'Effective date: 2025-10-15. TAT 75 days.', 'CheckCircle2', 'var(--success)', 0, '2026-05-18 15:30:00'),
(1, 'Cigna submission pending', 'Becky Hagensee''s Cigna application has been in review for 14 days.', 'Clock', 'var(--warn)', 1, '2026-05-17 10:00:00'),
(1, 'New provider imported', 'Apoor Gami imported from CAQH on 2024-08-20.', 'UserPlus', 'var(--info)', 1, '2026-05-16 09:15:00');

INSERT INTO time_entry (org_id, provider_id, user_id, started_at, ended_at, seconds, note) VALUES
(1, 1, 2, '2026-05-18 09:00:00', '2026-05-18 09:45:00', 2700, 'Phone call with provider about missing DEA cert'),
(1, 1, 2, '2026-05-15 14:00:00', '2026-05-15 14:20:00', 1200, 'Reviewed BCBS application packet');

INSERT INTO follow_up (org_id, provider_id, user_id, type, subject, outcome, occurred_at, next_date) VALUES
(1, 1, 2, 'phone_call', 'DEA renewal discussion', 'Provider will fax updated DEA cert by 5/25', '2026-05-18 09:45:00', '2026-05-25');

-- ---------- Chat ----------
INSERT INTO chat_channel (id, org_id, name, description, icon, created_at) VALUES
(1, 1, 'general',       'Company-wide discussion',                         'Hash',        '2026-01-01 00:00:00'),
(2, 1, 'credentialing', 'Credentialing workflows and questions',           'ShieldCheck', '2026-01-01 00:00:00'),
(3, 1, 'payers',        'Payer updates, portal issues, submission notes',  'CreditCard',  '2026-01-01 00:00:00'),
(4, 1, 'announcements', 'Important company announcements',                 'Megaphone',   '2026-01-01 00:00:00');

INSERT INTO chat_message (org_id, conversation_id, author_id, body, created_at) VALUES
(1, 'ch_1', 1, 'Welcome to ZmartCredential chat! Feel free to drop questions here.', NOW() - INTERVAL 3 DAY),
(1, 'ch_1', 2, 'Thanks Jake! Looking forward to using this.', NOW() - INTERVAL 2 DAY),
(1, 'ch_2', 1, 'Reminder: Dr. Patel''s DEA renewal is due end of month. Please confirm submission.', NOW() - INTERVAL 1 DAY),
(1, 'ch_3', 2, 'BCBS portal was down for ~30 min this morning. Confirmed back up now.', NOW() - INTERVAL 2 HOUR),
(1, 'ch_4', 1, 'Quarterly credentialing audit scheduled for next Tuesday. All clerks please prepare your files.', NOW() - INTERVAL 5 HOUR);

-- ---------- Billing ----------
INSERT INTO subscription (org_id, package_code, provider_count, status, started_at, next_renewal_date) VALUES
(1, 'professional', 14, 'active', '2026-05-01 00:00:00', '2026-06-01');

INSERT INTO payment_method (id, org_id, brand, last4, exp, billing_name, is_default) VALUES
(1, 1, 'Visa', '4242', '12/27', 'Jake Zebaida', 1);

INSERT INTO invoice (id, org_id, number, invoice_date, due_date, status, paid_date, payment_method_id, paid_method_label, subtotal, tax, total) VALUES
(1, 1, 'INV-2026-061', '2026-06-01', '2026-06-30', 'due',  NULL,         NULL, NULL,          1754.00, 0, 1754.00),
(2, 1, 'INV-2026-051', '2026-05-01', '2026-05-31', 'paid', '2026-05-03', 1,    'Visa •••• 4242', 1894.00, 0, 1894.00),
(3, 1, 'INV-2026-042', '2026-04-01', '2026-04-30', 'paid', '2026-04-02', 1,    'Visa •••• 4242', 1409.00, 0, 1409.00);

INSERT INTO invoice_line (invoice_id, line_type, description, package_code, base_price, per_provider, provider_count, period_start, period_end, amount, sort_order) VALUES
(1, 'subscription', 'Professional plan', 'professional', 599, 15, 14, '2026-06-01', '2026-06-30', 809, 0),
(2, 'subscription', 'Professional plan', 'professional', 599, 15, 14, '2026-05-01', '2026-05-31', 809, 0),
(3, 'subscription', 'Professional plan', 'professional', 599, 15, 12, '2026-04-01', '2026-04-30', 779, 0);

INSERT INTO invoice_line (invoice_id, line_type, provider_id, provider_name, payer_id, payer_name, state_code, service_type, amount, sort_order) VALUES
(1, 'service', 13, 'Deep Shah',      @bcbs,     'BCBS',     'MA', 'new', 315, 1),
(1, 'service', 13, 'Deep Shah',      @uhc,      'UHC',      'MA', 'new', 315, 2),
(1, 'service', 3,  'Apoor Gami',     @aetna,    'Aetna',    'MA', 'new', 315, 3),
(2, 'service', 1,  'Erin Rizzo',     @bcbs,     'BCBS',     'MA', 'new', 315, 1),
(2, 'service', 5,  'Becky Hagensee', @aetna,    'Aetna',    'MA', 'new', 315, 2),
(2, 'service', 12, 'Cathy Adamson',  @medicare, 'Medicare', 'MA', 'new', 455, 3),
(3, 'service', 7,  'John Cahill',    @bcbs,     'BCBS',     'MA', 'new', 315, 1),
(3, 'service', 7,  'John Cahill',    @aetna,    'Aetna',    'MA', 'new', 315, 2);

INSERT INTO usage_counter (org_id, period, ai_uploads) VALUES (1, DATE_FORMAT(NOW(), '%Y-%m'), 87);

-- ---------- Credentialing operations ----------
INSERT INTO hospital (id, org_id, name, city, state) VALUES
(1, 1, 'Massachusetts General Hospital',   'Boston',     'MA'),
(2, 1, 'Emerson Hospital',                 'Concord',    'MA'),
(3, 1, 'Lahey Hospital & Medical Center',  'Burlington', 'MA');

INSERT INTO expiration_alert_config (org_id) VALUES (1);
INSERT INTO expiration_alert_doc_type (org_id, doc_type) VALUES
(1,'dea'),(1,'medical_license'),(1,'malpractice'),(1,'board_cert'),(1,'csr_license'),(1,'clia'),(1,'gov_id');

INSERT INTO caqh_config (org_id, path) VALUES (1, 'csv');

INSERT INTO caqh_sync_run (org_id, trigger_type, status, providers_checked, providers_updated, changes, duration_sec, started_at) VALUES
(1, 'scheduled', 'success', 14, 3, 'Erin Rizzo: malpractice policy updated\nApoor Gami: practice address updated\nBecky Hagensee: attestation renewed', 42, '2026-05-18 02:00:00'),
(1, 'scheduled', 'partial', 14, 1, 'John Cahill: board certification updated\n2 providers failed: authorization required', 51, '2026-05-11 02:00:00'),
(1, 'scheduled', 'success', 14, 0, NULL, 38, '2026-05-04 02:00:00'),
(1, 'scheduled', 'failed',  0,  0, 'CAQH API returned 503 Service Unavailable', 5, '2026-04-27 02:00:00');

INSERT INTO attestation_reminder_rule (org_id, name, days_before, channel, template, enabled) VALUES
(1, 'First heads-up',          30, 'email',          'friendly',   1),
(1, 'Two-week reminder',       14, 'email',          'standard',   1),
(1, 'One-week urgent',          7, 'email+sms',      'urgent',     1),
(1, 'Final 24-hour notice',     1, 'email+sms+call', 'final',      1),
(1, 'Post-expiry escalation',  -1, 'email+manager',  'escalation', 0);
