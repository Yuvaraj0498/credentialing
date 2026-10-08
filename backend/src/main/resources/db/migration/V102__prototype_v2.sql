-- ============================================================
-- Prototype v2 (credentialing 2.html). Numbered V102 so it runs after the demo scripts (V100/V101)
-- on databases that already have them:
--   * payer submission methods for the Payer API Reference page
--   * CAQH lookup settings (mock / real API) for "Import from CAQH" and CAQH Config
--   * secure-link lifecycle (PIN attempts, accessed / submitted timestamps)
--   * clients and practices can be test data (JSON import in Test Data)
-- ============================================================

-- ---------- Payer submission methods ----------
ALTER TABLE payer
  ADD COLUMN submission_method VARCHAR(30)  NOT NULL DEFAULT 'portal_only' AFTER api_support,
  ADD COLUMN api_available     TINYINT(1)   NOT NULL DEFAULT 0 AFTER submission_method,
  ADD COLUMN api_vendor        VARCHAR(255) NULL AFTER api_available,
  ADD COLUMN api_docs_url      VARCHAR(255) NULL AFTER api_vendor,
  ADD COLUMN submission_notes  TEXT         NULL AFTER api_docs_url;

UPDATE payer SET submission_method = 'caqh_roster', api_available = 0,
  app_form = 'Ambetter Provider Set-up Form',
  api_vendor = 'Availity (claims only, not enrollment)', portal_url = 'https://providers.bcbstx.com',
  submission_notes = 'Pull from CAQH ProView. Enrollment via Availity Essentials portal. Direct enrollment API NOT publicly available.'
  WHERE code = 'bcbs_tx';
UPDATE payer SET submission_method = 'caqh_roster', api_available = 0,
  full_name = 'Aetna (CVS Health)', app_form = 'CAQH + Aetna Provider Portal',
  api_vendor = 'Availity', portal_url = 'https://www.aetna.com/health-care-professionals.html',
  submission_notes = 'Uses CAQH ProView for provider demographic data. Enrollment through Aetna Provider Portal or Availity. No direct enrollment API.'
  WHERE code = 'aetna';
UPDATE payer SET submission_method = 'caqh_roster', api_available = 0,
  full_name = 'Cigna Healthcare', app_form = 'CAQH + CignaForHCP',
  api_vendor = 'CignaForHCP (portal)', portal_url = 'https://cignaforhcp.cigna.com',
  submission_notes = 'Pull from CAQH ProView. Enrollment via CignaForHCP portal. API program exists for claims/eligibility but not enrollment.'
  WHERE code = 'cigna';
UPDATE payer SET submission_method = 'caqh_roster', api_available = 1,
  app_form = 'CAQH + UHC Provider Portal',
  api_vendor = 'UHC/Optum Provider APIs', api_docs_url = 'https://developer.uhc.com', portal_url = 'https://uhcprovider.com',
  submission_notes = 'UHC has developer APIs via developer.uhc.com including Provider Directory and some operational APIs. Enrollment itself still goes via CAQH roster + UHC Provider Portal. API access requires UHC vendor relationship.'
  WHERE code = 'uhc';
UPDATE payer SET submission_method = 'availity', api_available = 1,
  app_form = 'CAQH + Availity',
  api_vendor = 'Availity + Humana API Developer Portal', api_docs_url = 'https://developers.humana.com', portal_url = 'https://provider.humana.com',
  submission_notes = 'Humana has a developer API portal (developers.humana.com) with FHIR-based APIs for member/claims/benefits. Provider enrollment is largely roster-based through CAQH or direct via Availity.'
  WHERE code = 'humana';
UPDATE payer SET submission_method = 'pecos', api_available = 0,
  app_form = 'CMS-855I (Individual), CMS-855B (Group)',
  api_vendor = 'PECOS (Provider Enrollment, Chain and Ownership System)', api_docs_url = 'https://data.cms.gov/provider-data/', portal_url = 'https://pecos.cms.hhs.gov',
  submission_notes = 'PECOS is the official CMS system — web portal only, no public enrollment API. CMS has Blue Button 2.0 FHIR API (for claims data), but Medicare enrollment itself is PECOS web submission.'
  WHERE code = 'medicare';
UPDATE payer SET submission_method = 'state_portal', api_available = 0,
  name = 'Medicaid TX', app_form = 'TMHP Provider Enrollment Application',
  api_vendor = 'TMHP (state-specific)', portal_url = 'https://www.tmhp.com',
  submission_notes = 'Each state Medicaid is different. Texas uses TMHP web portal. 50+ different state systems — no national enrollment API. A few states (CA, MN) have piloted FHIR-based APIs.'
  WHERE code = 'medicaid';
UPDATE payer SET submission_method = 'availity', api_available = 1, integration = 'availity',
  app_form = 'MCO App via Availity',
  api_vendor = 'Availity (Centene parent)', api_docs_url = 'https://apigw.availity.com', portal_url = 'https://www.superiorhealthplan.com/providers.html',
  submission_notes = 'Centene subsidiary. Uses Availity for enrollment, claims, and operations. Availity has an API program with REST and X12 EDI endpoints.'
  WHERE code = 'superior';
UPDATE payer SET submission_method = 'availity', api_available = 0, api_vendor = 'Availity',
  submission_notes = 'Anthem BCBS plans route enrollment through Availity Essentials, with CAQH ProView as the data source. No direct enrollment API.'
  WHERE code = 'anthem';
UPDATE payer SET submission_method = 'portal_only', api_available = 0, api_vendor = 'Kaiser provider portal',
  submission_notes = 'Enrollment through the Kaiser Permanente provider portal. No public enrollment API.'
  WHERE code = 'kaiser';
UPDATE payer SET submission_method = 'caqh_roster', api_available = 0, api_vendor = 'CAQH ProView',
  submission_notes = 'Pulls provider data from CAQH ProView; enrollment completed through the Molina provider portal. No direct enrollment API.'
  WHERE code = 'molina';
UPDATE payer SET submission_method = 'availity', api_available = 0, api_vendor = 'Availity (Centene)',
  submission_notes = 'Centene plan. Enrollment through Availity Essentials with CAQH ProView as the data source.'
  WHERE code IN ('centene', 'wellcare');

-- ---------- CAQH lookup (Add Provider -> Import from CAQH) ----------
ALTER TABLE caqh_config
  ADD COLUMN lookup_mode        VARCHAR(10)   NOT NULL DEFAULT 'mock',
  ADD COLUMN lookup_api_url     VARCHAR(255)  NULL,
  ADD COLUMN lookup_api_key_enc VARCHAR(1024) NULL,
  ADD COLUMN lookup_org_id      VARCHAR(100)  NULL;

-- ---------- Secure links ----------
-- status: sent (pending) -> opened (accessed) -> submitted | completed; revoked / expired
ALTER TABLE provider_invite
  ADD COLUMN attempts     INT      NOT NULL DEFAULT 0,
  ADD COLUMN max_attempts INT      NOT NULL DEFAULT 5,
  ADD COLUMN accessed_at  DATETIME NULL,
  ADD COLUMN submitted_at DATETIME NULL;

-- ---------- Test data (JSON import) ----------
ALTER TABLE client   ADD COLUMN is_test_data TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE practice ADD COLUMN is_test_data TINYINT(1) NOT NULL DEFAULT 0;
