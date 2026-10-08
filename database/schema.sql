-- ============================================================
-- ZmartCredential — full schema + required reference data
-- Generated from backend/src/main/resources/db/migration (V1, V2, V102, V103, V104, V105, V106, V107, V108).
-- Normally Flyway applies these automatically when Spring Boot starts;
-- use this file only to create the database manually (e.g. phpMyAdmin).
-- ============================================================
CREATE DATABASE IF NOT EXISTS credentialing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE credentialing;

-- ============================================================
-- ZmartCredential — core schema (MySQL 8 / MariaDB 10.4+)
-- Flyway owns this schema; Hibernate runs with ddl-auto=none.
-- Conventions:
--   * BIGINT auto-increment surrogate keys; global reference tables use a natural `code` key.
--   * Enum-like columns are VARCHAR and validated by Java enums.
--   * Tenant tables carry org_id; platform_admin users have org_id NULL.
-- ============================================================

-- ---------- Tenancy & identity ----------
CREATE TABLE organization (
  id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
  name                    VARCHAR(200) NOT NULL,
  org_type                VARCHAR(40)  NULL,
  tax_id                  VARCHAR(20)  NULL,
  website                 VARCHAR(255) NULL,
  address                 VARCHAR(255) NULL,
  city                    VARCHAR(100) NULL,
  state                   CHAR(2)      NULL,
  zip                     VARCHAR(10)  NULL,
  phone                   VARCHAR(30)  NULL,
  email                   VARCHAR(255) NULL,
  invite_code             VARCHAR(20)  NULL,
  status                  VARCHAR(20)  NOT NULL DEFAULT 'active',
  is_self_signup          TINYINT(1)   NOT NULL DEFAULT 0,
  sanctions_interval_days INT          NOT NULL DEFAULT 30,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE client (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT       NOT NULL,
  name        VARCHAR(200) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_client_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  KEY idx_client_org (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE practice (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT       NOT NULL,
  client_id   BIGINT       NOT NULL,
  name        VARCHAR(200) NOT NULL,
  tax_id      VARCHAR(20)  NULL,
  address     VARCHAR(255) NULL,
  phone       VARCHAR(30)  NULL,
  email       VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_practice_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE,
  KEY idx_practice_org (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE location (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id        BIGINT       NOT NULL,
  practice_id   BIGINT       NULL,
  name          VARCHAR(150) NOT NULL,
  legal_name    VARCHAR(200) NULL,
  npi           CHAR(10)     NULL,
  location_type VARCHAR(30)  NOT NULL DEFAULT 'Primary',
  address       VARCHAR(255) NULL,
  city          VARCHAR(100) NULL,
  state         CHAR(2)      NULL,
  zip           VARCHAR(10)  NULL,
  phone         VARCHAR(30)  NULL,
  lat           DECIMAL(9,6) NULL,
  lng           DECIMAL(9,6) NULL,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  is_test_data  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_location_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_location_practice FOREIGN KEY (practice_id) REFERENCES practice(id) ON DELETE SET NULL,
  KEY idx_location_org (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider (
  id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id                   BIGINT       NULL,
  first_name               VARCHAR(80)  NOT NULL,
  last_name                VARCHAR(80)  NOT NULL,
  suffix                   VARCHAR(10)  NULL,
  specialty                VARCHAR(120) NULL,
  practitioner_type        VARCHAR(60)  NULL,
  taxonomy_code            VARCHAR(20)  NULL,
  gender                   VARCHAR(20)  NULL,
  ethnicity                VARCHAR(60)  NULL,
  date_of_birth            DATE         NULL,
  npi                      CHAR(10)     NULL,
  email                    VARCHAR(255) NULL,
  phone                    VARCHAR(30)  NULL,
  license_number           VARCHAR(40)  NULL,
  license_state            CHAR(2)      NULL,
  license_expires          DATE         NULL,
  dea_number               VARCHAR(20)  NULL,
  dea_expires              DATE         NULL,
  board_cert               VARCHAR(200) NULL,
  malpractice_carrier      VARCHAR(200) NULL,
  caqh_id                  VARCHAR(20)  NULL,
  caqh_username            VARCHAR(100) NULL,
  caqh_last_attested       DATE         NULL,
  caqh_last_synced         DATETIME     NULL,
  caqh_attestation_status  VARCHAR(30)  NULL,
  client_id                BIGINT       NULL,
  practice_id              BIGINT       NULL,
  location_id              BIGINT       NULL,
  status                   VARCHAR(20)  NOT NULL DEFAULT 'draft',
  telemed                  TINYINT(1)   NOT NULL DEFAULT 0,
  source                   VARCHAR(20)  NOT NULL DEFAULT 'manual',
  date_added               DATE         NOT NULL,
  is_self_signup           TINYINT(1)   NOT NULL DEFAULT 0,
  is_test_data             TINYINT(1)   NOT NULL DEFAULT 0,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_provider_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_practice FOREIGN KEY (practice_id) REFERENCES practice(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_location FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE SET NULL,
  UNIQUE KEY uk_provider_org_npi (org_id, npi),
  KEY idx_provider_org_status (org_id, status),
  KEY idx_provider_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_user (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id          BIGINT       NULL,
  username        VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NULL,
  password_hash   VARCHAR(100) NOT NULL,
  first_name      VARCHAR(100) NULL,
  last_name       VARCHAR(100) NULL,
  display_name    VARCHAR(200) NOT NULL,
  title           VARCHAR(120) NULL,
  phone           VARCHAR(30)  NULL,
  role            VARCHAR(20)  NOT NULL,
  provider_id     BIGINT       NULL,
  disabled        TINYINT(1)   NOT NULL DEFAULT 0,
  is_self_signup  TINYINT(1)   NOT NULL DEFAULT 0,
  is_test_data    TINYINT(1)   NOT NULL DEFAULT 0,
  last_login_at   DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE SET NULL,
  UNIQUE KEY uk_user_username (username),
  UNIQUE KEY uk_user_email (email),
  KEY idx_user_org_role (org_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_token (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT      NOT NULL,
  token_hash  CHAR(64)    NOT NULL,
  expires_at  DATETIME    NOT NULL,
  revoked_at  DATETIME    NULL,
  user_agent  VARCHAR(255) NULL,
  ip          VARCHAR(45) NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  UNIQUE KEY uk_refresh_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permission matrix: org_id NULL = global default; org rows override.
CREATE TABLE role_permission (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id   BIGINT      NULL,
  entity   VARCHAR(40) NOT NULL,
  action   VARCHAR(10) NOT NULL,
  role     VARCHAR(20) NOT NULL,
  allowed  TINYINT(1)  NOT NULL,
  CONSTRAINT fk_perm_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  UNIQUE KEY uk_perm (org_id, entity, action, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Documents ----------
CREATE TABLE document_type (
  code         VARCHAR(40)  PRIMARY KEY,
  label        VARCHAR(100) NOT NULL,
  critical     TINYINT(1)   NOT NULL DEFAULT 0,
  expires      TINYINT(1)   NOT NULL DEFAULT 0,
  months_valid INT          NULL,
  na_for_us    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order   INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_document (
  id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id                 BIGINT       NULL,
  provider_id            BIGINT       NOT NULL,
  doc_type               VARCHAR(40)  NOT NULL,
  status                 VARCHAR(20)  NOT NULL DEFAULT 'missing',
  file_name              VARCHAR(255) NULL,
  storage_key            VARCHAR(500) NULL,
  mime_type              VARCHAR(100) NULL,
  size_bytes             BIGINT       NULL,
  original_relative_path VARCHAR(500) NULL,
  expires_at             DATE         NULL,
  uploaded_at            DATETIME     NULL,
  uploaded_by            BIGINT       NULL,
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pdoc_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_pdoc_type FOREIGN KEY (doc_type) REFERENCES document_type(code),
  CONSTRAINT fk_pdoc_user FOREIGN KEY (uploaded_by) REFERENCES app_user(id) ON DELETE SET NULL,
  UNIQUE KEY uk_pdoc (provider_id, doc_type),
  KEY idx_pdoc_expires (org_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Send Link to Provider" secure upload invites
CREATE TABLE provider_invite (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT       NOT NULL,
  provider_id BIGINT       NOT NULL,
  email       VARCHAR(255) NOT NULL,
  token       CHAR(64)     NOT NULL,
  pin         VARCHAR(10)  NOT NULL,
  expires_at  DATETIME     NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'sent',
  created_by  BIGINT       NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invite_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_invite_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  UNIQUE KEY uk_invite_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE time_entry (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT        NOT NULL,
  provider_id BIGINT        NOT NULL,
  user_id     BIGINT        NULL,
  started_at  DATETIME      NOT NULL,
  ended_at    DATETIME      NULL,
  seconds     INT           NOT NULL,
  note        VARCHAR(1000) NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_te_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_te_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_te_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE follow_up (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT       NOT NULL,
  provider_id  BIGINT       NOT NULL,
  user_id      BIGINT       NULL,
  type         VARCHAR(20)  NOT NULL,
  subject      VARCHAR(255) NOT NULL,
  outcome      TEXT         NULL,
  occurred_at  DATETIME     NOT NULL,
  next_date    DATE         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fu_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_fu_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_fu_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Primary source verification / exclusion checks (NPI, OIG, SAM, state board)
CREATE TABLE verification_check (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT       NOT NULL,
  provider_id  BIGINT       NOT NULL,
  source       VARCHAR(20)  NOT NULL,
  status       VARCHAR(20)  NOT NULL,
  message      VARCHAR(500) NULL,
  checked_at   DATETIME     NOT NULL,
  run_by       BIGINT       NULL,
  CONSTRAINT fk_vc_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_vc_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_vc_user FOREIGN KEY (run_by) REFERENCES app_user(id) ON DELETE SET NULL,
  KEY idx_vc_provider (provider_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Payers ----------
CREATE TABLE payer (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  code                VARCHAR(40)  NOT NULL,
  name                VARCHAR(120) NOT NULL,
  full_name           VARCHAR(200) NULL,
  category            VARCHAR(40)  NOT NULL,
  payer_type          VARCHAR(40)  NULL,
  color               CHAR(7)      NOT NULL DEFAULT '#64748b',
  app_form            VARCHAR(150) NULL,
  integration         VARCHAR(20)  NOT NULL DEFAULT 'portal',
  api_support         VARCHAR(20)  NOT NULL DEFAULT 'portal',
  caqh_participating  TINYINT(1)   NOT NULL DEFAULT 0,
  portal_url          VARCHAR(500) NULL,
  avg_tat_days        INT          NULL,
  pricing_category    VARCHAR(20)  NULL,
  pricing_mult        DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  recred_cycle_months INT          NOT NULL DEFAULT 24,
  sort_order          INT          NOT NULL DEFAULT 0,
  active              TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_payer_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payer_form (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  payer_id     BIGINT       NOT NULL,
  code         VARCHAR(60)  NOT NULL,
  label        VARCHAR(200) NOT NULL,
  description  VARCHAR(500) NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_pform_payer FOREIGN KEY (payer_id) REFERENCES payer(id) ON DELETE CASCADE,
  UNIQUE KEY uk_pform_code (payer_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Field-mapping definitions; NULL form_id = default template applied to any form.
CREATE TABLE payer_form_field (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  form_id      BIGINT       NULL,
  section_name VARCHAR(150) NOT NULL,
  label        VARCHAR(150) NOT NULL,
  maps_to      VARCHAR(200) NOT NULL,
  confidence   VARCHAR(10)  NOT NULL DEFAULT 'high',
  sort_order   INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_pff_form FOREIGN KEY (form_id) REFERENCES payer_form(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payer portal logins. provider_id NULL = organization-level (group) login.
-- Passwords are AES-GCM encrypted server-side (APP_ENCRYPTION_KEY) and never returned in list APIs.
CREATE TABLE payer_credential (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id             BIGINT        NOT NULL,
  provider_id        BIGINT        NULL,
  payer_id           BIGINT        NOT NULL,
  username           VARCHAR(200)  NOT NULL,
  password_enc       VARCHAR(1024) NULL,
  portal_url         VARCHAR(500)  NULL,
  payer_provider_id  VARCHAR(60)   NULL,
  group_tin          VARCHAR(20)   NULL,
  notes              VARCHAR(1000) NULL,
  last_test_at       DATETIME      NULL,
  last_test_ok       TINYINT(1)    NULL,
  updated_by         BIGINT        NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pcred_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcred_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcred_payer FOREIGN KEY (payer_id) REFERENCES payer(id) ON DELETE CASCADE,
  KEY idx_pcred_lookup (org_id, provider_id, payer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Zero-knowledge vault: browser encrypts with a passphrase (PBKDF2 + AES-GCM); server stores ciphertext only.
CREATE TABLE credential_vault (
  org_id      BIGINT     PRIMARY KEY,
  ciphertext  MEDIUMTEXT NOT NULL,
  updated_by  BIGINT     NULL,
  created_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vault_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Enrollments ----------
CREATE TABLE enrollment (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id            BIGINT       NOT NULL,
  provider_id       BIGINT       NOT NULL,
  payer_id          BIGINT       NOT NULL,
  practice_id       BIGINT       NULL,
  form_id           BIGINT       NULL,
  application_type  VARCHAR(20)  NOT NULL DEFAULT 'initial',
  status            VARCHAR(20)  NOT NULL DEFAULT 'draft',
  submitted_date    DATE         NULL,
  effective_date    DATE         NULL,
  tat_days          INT          NULL,
  notes             TEXT         NULL,
  assigned_user_id  BIGINT       NULL,
  is_test_data      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_enr_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_enr_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_enr_payer FOREIGN KEY (payer_id) REFERENCES payer(id),
  CONSTRAINT fk_enr_practice FOREIGN KEY (practice_id) REFERENCES practice(id) ON DELETE SET NULL,
  CONSTRAINT fk_enr_form FOREIGN KEY (form_id) REFERENCES payer_form(id) ON DELETE SET NULL,
  CONSTRAINT fk_enr_user FOREIGN KEY (assigned_user_id) REFERENCES app_user(id) ON DELETE SET NULL,
  KEY idx_enr_org_status (org_id, status),
  KEY idx_enr_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE enrollment_file (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id  BIGINT       NOT NULL,
  name           VARCHAR(255) NOT NULL,
  file_type      VARCHAR(30)  NOT NULL DEFAULT 'other',
  storage_key    VARCHAR(500) NULL,
  mime_type      VARCHAR(100) NULL,
  size_bytes     BIGINT       NULL,
  uploaded_at    DATETIME     NOT NULL,
  uploaded_by    BIGINT       NULL,
  CONSTRAINT fk_efile_enr FOREIGN KEY (enrollment_id) REFERENCES enrollment(id) ON DELETE CASCADE,
  CONSTRAINT fk_efile_user FOREIGN KEY (uploaded_by) REFERENCES app_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE enrollment_event (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id        BIGINT       NOT NULL,
  event_type           VARCHAR(30)  NOT NULL,
  occurred_at          DATETIME     NOT NULL,
  actor_user_id        BIGINT       NULL,
  actor_label          VARCHAR(100) NULL,
  note                 TEXT         NULL,
  confirmation_number  VARCHAR(60)  NULL,
  CONSTRAINT fk_eev_enr FOREIGN KEY (enrollment_id) REFERENCES enrollment(id) ON DELETE CASCADE,
  CONSTRAINT fk_eev_user FOREIGN KEY (actor_user_id) REFERENCES app_user(id) ON DELETE SET NULL,
  KEY idx_eev_enr (enrollment_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payer_submission (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id               BIGINT       NOT NULL,
  provider_id          BIGINT       NOT NULL,
  payer_id             BIGINT       NOT NULL,
  enrollment_id        BIGINT       NULL,
  method               VARCHAR(20)  NOT NULL,
  status               VARCHAR(20)  NOT NULL,
  confirmation_number  VARCHAR(60)  NULL,
  message              VARCHAR(500) NULL,
  document_count       INT          NOT NULL DEFAULT 0,
  submitted_by         BIGINT       NULL,
  submitted_at         DATETIME     NOT NULL,
  CONSTRAINT fk_psub_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_psub_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_psub_payer FOREIGN KEY (payer_id) REFERENCES payer(id),
  CONSTRAINT fk_psub_enr FOREIGN KEY (enrollment_id) REFERENCES enrollment(id) ON DELETE SET NULL,
  CONSTRAINT fk_psub_user FOREIGN KEY (submitted_by) REFERENCES app_user(id) ON DELETE SET NULL,
  KEY idx_psub_org (org_id, submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which payers may view a provider's CAQH profile
CREATE TABLE caqh_payer_authorization (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id          BIGINT     NULL,
  provider_id     BIGINT     NOT NULL,
  payer_id        BIGINT     NOT NULL,
  authorized      TINYINT(1) NOT NULL DEFAULT 0,
  authorized_at   DATETIME   NULL,
  revoked_at      DATETIME   NULL,
  last_data_pull  DATETIME   NULL,
  updated_by      BIGINT     NULL,
  updated_at      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cpa_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpa_payer FOREIGN KEY (payer_id) REFERENCES payer(id) ON DELETE CASCADE,
  UNIQUE KEY uk_cpa (provider_id, payer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Work management ----------
CREATE TABLE task (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id            BIGINT       NOT NULL,
  title             VARCHAR(255) NOT NULL,
  description       TEXT         NULL,
  priority          VARCHAR(10)  NOT NULL DEFAULT 'medium',
  status            VARCHAR(20)  NOT NULL DEFAULT 'open',
  due_date          DATE         NULL,
  provider_id       BIGINT       NULL,
  assignee_user_id  BIGINT       NULL,
  created_by        BIGINT       NULL,
  completed_at      DATETIME     NULL,
  is_test_data      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_user_id) REFERENCES app_user(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_creator FOREIGN KEY (created_by) REFERENCES app_user(id) ON DELETE SET NULL,
  KEY idx_task_org_status (org_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_id NULL = broadcast to every user of the org
CREATE TABLE notification (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT        NULL,
  user_id     BIGINT        NULL,
  title       VARCHAR(255)  NOT NULL,
  body        VARCHAR(1000) NULL,
  icon        VARCHAR(40)   NOT NULL DEFAULT 'Bell',
  color       VARCHAR(40)   NOT NULL DEFAULT 'var(--accent)',
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  KEY idx_notif_org (org_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Chat ----------
CREATE TABLE chat_channel (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT       NOT NULL,
  name         VARCHAR(80)  NOT NULL,
  description  VARCHAR(255) NULL,
  icon         VARCHAR(40)  NOT NULL DEFAULT 'Hash',
  created_by   BIGINT       NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chan_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_chan_user FOREIGN KEY (created_by) REFERENCES app_user(id) ON DELETE SET NULL,
  UNIQUE KEY uk_chan_name (org_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- conversation_id: 'ch_<channelId>' or 'dm_<userIdA>__<userIdB>' (ids sorted ascending)
CREATE TABLE chat_message (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id           BIGINT       NOT NULL,
  conversation_id  VARCHAR(80)  NOT NULL,
  author_id        BIGINT       NOT NULL,
  body             TEXT         NOT NULL,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_msg_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_author FOREIGN KEY (author_id) REFERENCES app_user(id) ON DELETE CASCADE,
  KEY idx_msg_conv (org_id, conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_read (
  user_id          BIGINT      NOT NULL,
  conversation_id  VARCHAR(80) NOT NULL,
  last_read_at     DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, conversation_id),
  CONSTRAINT fk_cread_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Email reminders ----------
CREATE TABLE email_template (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT       NULL,
  type         VARCHAR(30)  NOT NULL,
  name         VARCHAR(150) NOT NULL,
  subject      VARCHAR(255) NOT NULL,
  body         TEXT         NOT NULL,
  CONSTRAINT fk_etpl_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reminder_schedule (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id         BIGINT      NOT NULL,
  reminder_type  VARCHAR(30) NOT NULL,
  template_id    BIGINT      NULL,
  cadence        VARCHAR(20) NOT NULL,
  active         TINYINT(1)  NOT NULL DEFAULT 1,
  next_run_at    DATETIME    NULL,
  last_sent_at   DATETIME    NULL,
  created_by     BIGINT      NULL,
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rsch_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsch_tpl FOREIGN KEY (template_id) REFERENCES email_template(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reminder_schedule_provider (
  schedule_id  BIGINT NOT NULL,
  provider_id  BIGINT NOT NULL,
  PRIMARY KEY (schedule_id, provider_id),
  CONSTRAINT fk_rsp_sched FOREIGN KEY (schedule_id) REFERENCES reminder_schedule(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsp_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Outbound email log. Delivery (SMTP) is a later phase: rows are written with status 'queued'.
CREATE TABLE email_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT       NOT NULL,
  provider_id  BIGINT       NULL,
  schedule_id  BIGINT       NULL,
  to_email     VARCHAR(255) NOT NULL,
  subject      VARCHAR(255) NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'queued',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_elog_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_elog_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE SET NULL,
  CONSTRAINT fk_elog_sched FOREIGN KEY (schedule_id) REFERENCES reminder_schedule(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Billing ----------
CREATE TABLE subscription_package (
  code                  VARCHAR(30)   PRIMARY KEY,
  name                  VARCHAR(50)   NOT NULL,
  base_price            DECIMAL(10,2) NOT NULL,
  per_provider          DECIMAL(10,2) NOT NULL,
  color                 CHAR(7)       NOT NULL,
  color_soft            CHAR(7)       NOT NULL,
  recommended           TINYINT(1)    NOT NULL DEFAULT 0,
  provider_cap          INT           NULL,
  payer_cap             INT           NULL,
  ai_uploads_per_month  INT           NULL,
  primary_support       VARCHAR(100)  NULL,
  sort_order            INT           NOT NULL DEFAULT 0,
  active                TINYINT(1)    NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE package_feature (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  package_code  VARCHAR(30)  NOT NULL,
  label         VARCHAR(150) NOT NULL,
  included      TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order    INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_pfeat_pkg FOREIGN KEY (package_code) REFERENCES subscription_package(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscription (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id             BIGINT      NOT NULL,
  package_code       VARCHAR(30) NOT NULL,
  provider_count     INT         NOT NULL DEFAULT 0,
  status             VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at         DATETIME    NOT NULL,
  next_renewal_date  DATE        NOT NULL,
  updated_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_pkg FOREIGN KEY (package_code) REFERENCES subscription_package(code),
  UNIQUE KEY uk_sub_org (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Card metadata only. No PAN/CVC is ever stored; processor tokens arrive with the payments phase.
CREATE TABLE payment_method (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id        BIGINT       NOT NULL,
  brand         VARCHAR(20)  NOT NULL,
  last4         CHAR(4)      NOT NULL,
  exp           CHAR(5)      NOT NULL,
  billing_name  VARCHAR(150) NOT NULL,
  billing_zip   VARCHAR(10)  NULL,
  is_default    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pm_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id             BIGINT        NOT NULL,
  number             VARCHAR(20)   NOT NULL,
  invoice_date       DATE          NOT NULL,
  due_date           DATE          NOT NULL,
  status             VARCHAR(20)   NOT NULL DEFAULT 'due',
  paid_date          DATE          NULL,
  payment_method_id  BIGINT        NULL,
  paid_method_label  VARCHAR(40)   NULL,
  subtotal           DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax                DECIMAL(10,2) NOT NULL DEFAULT 0,
  total              DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_pm FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE SET NULL,
  UNIQUE KEY uk_inv_number (number),
  KEY idx_inv_org (org_id, invoice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- line_type: 'subscription' (package snapshot) or 'service' (credentialing service charge)
CREATE TABLE invoice_line (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_id      BIGINT        NOT NULL,
  line_type       VARCHAR(20)   NOT NULL,
  description     VARCHAR(255)  NULL,
  package_code    VARCHAR(30)   NULL,
  base_price      DECIMAL(10,2) NULL,
  per_provider    DECIMAL(10,2) NULL,
  provider_count  INT           NULL,
  period_start    DATE          NULL,
  period_end      DATE          NULL,
  provider_id     BIGINT        NULL,
  provider_name   VARCHAR(150)  NULL,
  payer_id        BIGINT        NULL,
  payer_name      VARCHAR(120)  NULL,
  state_code      CHAR(2)       NULL,
  service_type    VARCHAR(10)   NULL,
  amount          DECIMAL(10,2) NOT NULL,
  sort_order      INT           NOT NULL DEFAULT 0,
  CONSTRAINT fk_iline_inv FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE,
  CONSTRAINT fk_iline_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE SET NULL,
  CONSTRAINT fk_iline_payer FOREIGN KEY (payer_id) REFERENCES payer(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usage_counter (
  org_id      BIGINT  NOT NULL,
  period      CHAR(7) NOT NULL,
  ai_uploads  INT     NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, period),
  CONSTRAINT fk_usage_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pricing_state (
  code    CHAR(2)      PRIMARY KEY,
  name    VARCHAR(40)  NOT NULL,
  mult    DECIMAL(4,2) NOT NULL,
  region  VARCHAR(20)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pricing_base_rate (
  category      VARCHAR(20)   NOT NULL,
  service_type  VARCHAR(10)   NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (category, service_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Credentialing operations ----------
CREATE TABLE hospital (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT       NULL,
  name        VARCHAR(200) NOT NULL,
  city        VARCHAR(100) NULL,
  state       CHAR(2)      NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_hosp_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE privilege_category (
  code  VARCHAR(40)  PRIMARY KEY,
  name  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE privilege_item (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_code  VARCHAR(40)  NOT NULL,
  name           VARCHAR(150) NOT NULL,
  sort_order     INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_pitem_cat FOREIGN KEY (category_code) REFERENCES privilege_category(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_privilege (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id             BIGINT      NOT NULL,
  provider_id        BIGINT      NOT NULL,
  hospital_id        BIGINT      NOT NULL,
  privilege_item_id  BIGINT      NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'requested',
  requested_at       DATE        NOT NULL,
  decided_at         DATE        NULL,
  updated_by         BIGINT      NULL,
  CONSTRAINT fk_ppriv_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_ppriv_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_ppriv_hosp FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE CASCADE,
  CONSTRAINT fk_ppriv_item FOREIGN KEY (privilege_item_id) REFERENCES privilege_item(id) ON DELETE CASCADE,
  UNIQUE KEY uk_ppriv (provider_id, hospital_id, privilege_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE generated_letter (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id          BIGINT      NOT NULL,
  provider_id     BIGINT      NOT NULL,
  hospital_id     BIGINT      NULL,
  letter_type     VARCHAR(20) NOT NULL,
  effective_date  DATE        NOT NULL,
  generated_by    BIGINT      NULL,
  generated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_letter_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_letter_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE,
  CONSTRAINT fk_letter_hosp FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payer roster uploads for roster reconciliation
CREATE TABLE payer_roster_upload (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT       NOT NULL,
  payer_id     BIGINT       NOT NULL,
  file_name    VARCHAR(255) NULL,
  row_count    INT          NOT NULL DEFAULT 0,
  uploaded_by  BIGINT       NULL,
  uploaded_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pru_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_pru_payer FOREIGN KEY (payer_id) REFERENCES payer(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payer_roster_entry (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  upload_id      BIGINT       NOT NULL,
  npi            CHAR(10)     NULL,
  first_name     VARCHAR(100) NULL,
  last_name      VARCHAR(100) NULL,
  specialty      VARCHAR(120) NULL,
  action_status  VARCHAR(30)  NOT NULL DEFAULT 'none',
  CONSTRAINT fk_pre_upload FOREIGN KEY (upload_id) REFERENCES payer_roster_upload(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expiration_alert_config (
  org_id            BIGINT      PRIMARY KEY,
  enabled           TINYINT(1)  NOT NULL DEFAULT 1,
  critical_days     INT         NOT NULL DEFAULT 7,
  warning_days      INT         NOT NULL DEFAULT 30,
  info_days         INT         NOT NULL DEFAULT 90,
  notify_email      TINYINT(1)  NOT NULL DEFAULT 1,
  notify_dashboard  TINYINT(1)  NOT NULL DEFAULT 1,
  cadence           VARCHAR(20) NOT NULL DEFAULT 'daily',
  CONSTRAINT fk_eac_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expiration_alert_doc_type (
  org_id    BIGINT      NOT NULL,
  doc_type  VARCHAR(40) NOT NULL,
  PRIMARY KEY (org_id, doc_type),
  CONSTRAINT fk_eadt_org FOREIGN KEY (org_id) REFERENCES expiration_alert_config(org_id) ON DELETE CASCADE,
  CONSTRAINT fk_eadt_type FOREIGN KEY (doc_type) REFERENCES document_type(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CAQH connection + auto-sync settings. Live CAQH/aggregator API calls are a later phase.
CREATE TABLE caqh_config (
  org_id               BIGINT        PRIMARY KEY,
  path                 VARCHAR(20)   NOT NULL DEFAULT 'csv',
  direct_username      VARCHAR(150)  NULL,
  direct_password_enc  VARCHAR(1024) NULL,
  direct_org_id        VARCHAR(50)   NULL,
  direct_environment   VARCHAR(20)   NULL,
  aggregator_vendor    VARCHAR(30)   NULL,
  aggregator_api_key_enc VARCHAR(1024) NULL,
  aggregator_base_url  VARCHAR(255)  NULL,
  sync_enabled         TINYINT(1)    NOT NULL DEFAULT 0,
  sync_cadence         VARCHAR(20)   NOT NULL DEFAULT 'weekly',
  sync_day_of_week     VARCHAR(10)   NOT NULL DEFAULT 'sunday',
  sync_hour            TINYINT       NOT NULL DEFAULT 2,
  sync_only_attested   TINYINT(1)    NOT NULL DEFAULT 1,
  sync_notify_changes  TINYINT(1)    NOT NULL DEFAULT 1,
  sync_rate_limit      INT           NOT NULL DEFAULT 60,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_caqhc_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE caqh_sync_run (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id             BIGINT       NOT NULL,
  trigger_type       VARCHAR(20)  NOT NULL,
  status             VARCHAR(20)  NOT NULL,
  providers_checked  INT          NOT NULL DEFAULT 0,
  providers_updated  INT          NOT NULL DEFAULT 0,
  changes            TEXT         NULL,
  duration_sec       INT          NOT NULL DEFAULT 0,
  started_at         DATETIME     NOT NULL,
  CONSTRAINT fk_csr_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attestation_reminder_rule (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id             BIGINT       NOT NULL,
  name               VARCHAR(100) NOT NULL,
  days_before        INT          NOT NULL,
  channel            VARCHAR(30)  NOT NULL,
  template           VARCHAR(20)  NOT NULL,
  enabled            TINYINT(1)   NOT NULL DEFAULT 1,
  last_triggered_at  DATETIME     NULL,
  sent_count         INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_arr_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attestation_reminder_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       BIGINT      NOT NULL,
  rule_id      BIGINT      NULL,
  provider_id  BIGINT      NOT NULL,
  channel      VARCHAR(30) NOT NULL,
  template     VARCHAR(20) NOT NULL,
  due_date     DATE        NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'queued',
  triggered_by VARCHAR(20) NOT NULL DEFAULT 'manual',
  sent_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_arl_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_arl_rule FOREIGN KEY (rule_id) REFERENCES attestation_reminder_rule(id) ON DELETE SET NULL,
  CONSTRAINT fk_arl_provider FOREIGN KEY (provider_id) REFERENCES provider(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Audit ----------
CREATE TABLE audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT       NULL,
  user_id     BIGINT       NULL,
  entity      VARCHAR(40)  NOT NULL,
  entity_id   BIGINT       NULL,
  action      VARCHAR(20)  NOT NULL,
  summary     VARCHAR(500) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_org (org_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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


-- Chat read markers by message id. Timestamps are not precise enough on MariaDB with the MySQL driver
-- (fractional seconds are dropped), so two messages in the same second were treated as one point in time.
ALTER TABLE chat_read ADD COLUMN last_read_message_id BIGINT NULL;

UPDATE chat_read r
   SET r.last_read_message_id = (SELECT MAX(m.id) FROM chat_message m
                                  WHERE m.conversation_id = r.conversation_id AND m.created_at <= r.last_read_at);


-- ============================================================
-- Prototype v3 (credentialing 3.html): one payer list for Payers, Payer Submissions and the Credential Vault.
-- Updates the 13 existing payers to the v3 data and adds 8 more (21 in total).
-- Existing payer codes are kept (medicaid = Texas Medicaid / TMHP).
-- ============================================================

UPDATE payer SET name = 'BCBS TX', full_name = 'Blue Cross Blue Shield of Texas', category = 'Commercial', payer_type = 'PPO/HMO', color = '#1d4ed8', app_form = 'Ambetter Provider Set-up Form', integration = 'caqh', api_support = 'partial', caqh_participating = 1, portal_url = 'https://providers.bcbstx.com', avg_tat_days = 49, submission_method = 'caqh_roster', api_available = 0, api_vendor = 'Availity (claims only)', api_docs_url = NULL, submission_notes = 'Blue Cross Blue Shield of Texas (HCSC subsidiary). Pulls provider data from CAQH ProView. Enrollment via Availity Essentials or BCBSTX portal. No direct enrollment API.', sort_order = 1, active = 1 WHERE code = 'bcbs_tx';
UPDATE payer SET name = 'Aetna', full_name = 'Aetna (CVS Health)', category = 'Commercial', payer_type = 'PPO/HMO', color = '#7c2d12', app_form = 'CAQH + Aetna Provider Portal', integration = 'caqh', api_support = 'partial', caqh_participating = 1, portal_url = 'https://www.aetna.com/health-care-professionals.html', avg_tat_days = 52, submission_method = 'caqh_roster', api_available = 0, api_vendor = 'Availity + NaviNet', api_docs_url = NULL, submission_notes = 'CVS Health subsidiary. Uses CAQH ProView + Availity. Aetna Provider Portal for direct submissions. No public enrollment API.', sort_order = 3, active = 1 WHERE code = 'aetna';
UPDATE payer SET name = 'Cigna', full_name = 'Cigna Healthcare', category = 'Commercial', payer_type = 'PPO/HMO', color = '#065f46', app_form = 'CAQH + CignaForHCP', integration = 'caqh', api_support = 'portal', caqh_participating = 1, portal_url = 'https://cignaforhcp.cigna.com', avg_tat_days = 61, submission_method = 'caqh_roster', api_available = 0, api_vendor = 'CignaForHCP (portal)', api_docs_url = NULL, submission_notes = 'Enrollment via CignaForHCP portal + CAQH. API program exists for claims and eligibility only.', sort_order = 4, active = 1 WHERE code = 'cigna';
UPDATE payer SET name = 'UHC', full_name = 'UnitedHealthcare (UHG)', category = 'Commercial', payer_type = 'PPO/HMO', color = '#1e3a8a', app_form = 'CAQH + UHC Provider Portal', integration = 'caqh', api_support = 'full', caqh_participating = 1, portal_url = 'https://uhcprovider.com', avg_tat_days = 58, submission_method = 'caqh_roster', api_available = 1, api_vendor = 'UHC/Optum APIs', api_docs_url = 'https://developer.uhc.com', submission_notes = 'UHC/Optum has public developer APIs at developer.uhc.com — Provider Directory, Operations. Enrollment still goes through CAQH roster + UHC Provider Portal.', sort_order = 5, active = 1 WHERE code = 'uhc';
UPDATE payer SET name = 'Humana', full_name = 'Humana', category = 'Commercial', payer_type = 'PPO/HMO', color = '#15803d', app_form = 'CAQH + Availity', integration = 'availity', api_support = 'portal', caqh_participating = 1, portal_url = 'https://provider.humana.com', avg_tat_days = 64, submission_method = 'availity', api_available = 1, api_vendor = 'Availity + Humana Developer', api_docs_url = 'https://developers.humana.com', submission_notes = 'Humana developer portal has FHIR-based APIs for benefits, claims, and member data. Enrollment still goes through CAQH roster + Availity.', sort_order = 6, active = 1 WHERE code = 'humana';
UPDATE payer SET name = 'Anthem', full_name = 'Anthem (Elevance Health) BCBS', category = 'Commercial', payer_type = 'PPO/HMO', color = '#003DA5', app_form = 'CAQH + Availity', integration = 'availity', api_support = 'partial', caqh_participating = 1, portal_url = 'https://availity.com', avg_tat_days = 55, submission_method = 'availity', api_available = 1, api_vendor = 'Availity', api_docs_url = 'https://apigw.availity.com', submission_notes = 'Anthem is now ''Elevance Health''. 14 BCBS state plans. Primary channel is Availity Essentials + API Gateway for X12 and REST.', sort_order = 7, active = 1 WHERE code = 'anthem';
UPDATE payer SET name = 'Kaiser', full_name = 'Kaiser Permanente', category = 'Commercial (HMO)', payer_type = 'HMO', color = '#006BA6', app_form = 'Kaiser Provider Enrollment (internal)', integration = 'portal', api_support = 'portal', caqh_participating = 0, portal_url = 'https://providers.kaiserpermanente.org', avg_tat_days = 90, submission_method = 'portal_only', api_available = 0, api_vendor = 'Kaiser Provider Portal', api_docs_url = NULL, submission_notes = 'Closed network — Kaiser mostly employs physicians directly. External credentialing is limited; contact regional Kaiser office for details.', sort_order = 8, active = 1 WHERE code = 'kaiser';
UPDATE payer SET name = 'Molina', full_name = 'Molina Healthcare', category = 'Medicaid MCO', payer_type = 'Managed', color = '#0072BC', app_form = 'Molina Provider Application', integration = 'availity', api_support = 'portal', caqh_participating = 1, portal_url = 'https://provider.molinahealthcare.com', avg_tat_days = 72, submission_method = 'availity', api_available = 1, api_vendor = 'Availity', api_docs_url = 'https://apigw.availity.com', submission_notes = 'Multi-state Medicaid MCO. Uses Availity for most electronic transactions. Portal-based enrollment with roster support via CAQH.', sort_order = 9, active = 1 WHERE code = 'molina';
UPDATE payer SET name = 'Centene', full_name = 'Centene / Ambetter / WellCare', category = 'Medicaid MCO', payer_type = 'Managed', color = '#009999', app_form = 'Centene Provider Enrollment', integration = 'availity', api_support = 'portal', caqh_participating = 1, portal_url = 'https://provider.ambetter.centene.com', avg_tat_days = 68, submission_method = 'availity', api_available = 1, api_vendor = 'Availity', api_docs_url = 'https://apigw.availity.com', submission_notes = 'Centene operates Ambetter (marketplace), Fidelis NY, Superior TX, Peach State GA, WellCare, and others. Availity is primary channel for enrollment and operations.', sort_order = 10, active = 1 WHERE code = 'centene';
UPDATE payer SET name = 'WellCare', full_name = 'WellCare (Centene)', category = 'Medicare Advantage', payer_type = 'Medicare Advantage', color = '#005A9C', app_form = 'WellCare Provider Enrollment', integration = 'availity', api_support = 'portal', caqh_participating = 1, portal_url = 'https://wellcare.com/provider', avg_tat_days = 70, submission_method = 'availity', api_available = 1, api_vendor = 'Availity', api_docs_url = 'https://apigw.availity.com', submission_notes = 'WellCare is a Centene subsidiary focused on Medicare Advantage and Medicaid. Enrollment via Availity.', sort_order = 11, active = 1 WHERE code = 'wellcare';
UPDATE payer SET name = 'Superior', full_name = 'Superior HealthPlan (TX MCO)', category = 'Medicaid MCO', payer_type = 'Managed', color = '#0369a1', app_form = 'MCO App via Availity', integration = 'availity', api_support = 'portal', caqh_participating = 1, portal_url = 'https://www.superiorhealthplan.com/providers.html', avg_tat_days = 75, submission_method = 'availity', api_available = 1, api_vendor = 'Availity (Centene subsidiary)', api_docs_url = 'https://apigw.availity.com', submission_notes = 'Centene subsidiary covering Texas STAR, STAR+PLUS, CHIP. Uses Availity for enrollment and claims.', sort_order = 12, active = 1 WHERE code = 'superior';
UPDATE payer SET name = 'Medicare', full_name = 'Medicare (CMS)', category = 'Federal', payer_type = 'FFS', color = '#1e40af', app_form = 'CMS-855I (Individual) / CMS-855B (Group) / CMS-855O (Order)', integration = 'pecos', api_support = 'portal', caqh_participating = 0, portal_url = 'https://pecos.cms.hhs.gov', avg_tat_days = 60, submission_method = 'pecos', api_available = 0, api_vendor = 'PECOS', api_docs_url = 'https://data.cms.gov/provider-data/', submission_notes = 'PECOS is CMS''s official enrollment system — web portal only, no public enrollment API. Blue Button 2.0 FHIR API exists for claims data. ~$688 application fee.', sort_order = 15, active = 1 WHERE code = 'medicare';
UPDATE payer SET name = 'Medicaid TX', full_name = 'Texas Medicaid (TMHP)', category = 'State Medicaid', payer_type = 'FFS', color = '#0f766e', app_form = 'TMHP Provider Enrollment', integration = 'portal', api_support = 'portal', caqh_participating = 0, portal_url = 'https://www.tmhp.com', avg_tat_days = 92, submission_method = 'state_portal', api_available = 0, api_vendor = 'TMHP (state-specific)', api_docs_url = NULL, submission_notes = 'Texas Medicaid Healthcare Partnership. Required for Texas Medicaid participation. Portal-based enrollment with state-specific requirements.', sort_order = 17, active = 1 WHERE code = 'medicaid';

INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('bcbs_il', 'BCBS IL', 'Blue Cross Blue Shield of Illinois', 'Commercial', 'PPO/HMO', '#1d4ed8', 'BCBSIL Provider Enrollment', 'caqh', 'partial', 1, 'https://providers.bcbsil.com', 51, 'caqh_roster', 0, 'Availity', NULL, 'Also an HCSC plan. CAQH roster + Availity for enrollment. Common BCBS plan nationwide.', 2, 'commercial', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('magellan', 'Magellan', 'Magellan Health', 'Behavioral Health', 'Managed', '#4a148c', 'Magellan Provider Enrollment', 'portal', 'portal', 1, 'https://www.magellanprovider.com', 80, 'portal_only', 0, 'Magellan Provider Portal', NULL, 'Behavioral health benefits manager (BHO). Portal-based enrollment + CAQH data. Used by many commercial payers for behavioral health carve-outs.', 13, 'commercial', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('carelon', 'Carelon', 'Carelon Behavioral Health (Elevance)', 'Behavioral Health', 'Managed', '#5e35b1', 'Carelon Provider Enrollment', 'availity', 'portal', 1, 'https://providers.carelon.com', 75, 'availity', 0, 'Availity + Carelon Portal', NULL, 'Formerly Beacon Health Options, now part of Elevance Health. Behavioral health carve-out for many commercial plans.', 14, 'commercial', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('medicare_adv', 'Medicare Advantage', 'Medicare Advantage (Various)', 'Medicare Advantage', 'Managed', '#1e3a8a', 'Varies by MA plan', 'caqh', 'portal', 1, NULL, 65, 'caqh_roster', 0, 'Varies (UHC, Humana, Aetna, Anthem, etc.)', NULL, 'Medicare Advantage plans are offered by private payers. Each MA plan (UHC MA, Humana MA, Aetna MA, Kaiser MA) has its own process — usually CAQH + their portal.', 16, 'medicare', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('medicaid_ca', 'Medi-Cal CA', 'California Medicaid (PAVE)', 'State Medicaid', 'FFS', '#0f766e', 'DHCS PAVE Application', 'portal', 'portal', 0, 'https://www.dhcs.ca.gov/provgovpart', 110, 'state_portal', 0, 'DHCS PAVE', NULL, 'California Medi-Cal uses PAVE (Provider Application and Validation for Enrollment). FHIR-based API in development as of 2024-2025.', 18, 'medicaid', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('medicaid_ny', 'Medicaid NY', 'New York Medicaid (eMedNY)', 'State Medicaid', 'FFS', '#0f766e', 'eMedNY Enrollment Application', 'portal', 'portal', 0, 'https://www.emedny.org', 100, 'state_portal', 0, 'eMedNY (CSC State Health)', NULL, 'New York State Medicaid enrollment through eMedNY. Portal-based with required training completion.', 19, 'medicaid', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('tricare', 'TRICARE', 'TRICARE (Military)', 'Federal', 'Managed', '#4a5568', 'TRICARE Provider Enrollment via Humana (East) or Health Net (West)', 'portal', 'portal', 1, 'https://www.tricare.mil/providers', 55, 'portal_only', 0, 'Humana Military (East) + Health Net Federal (West)', NULL, 'US military health benefits. East region administered by Humana Military, West region by Health Net Federal Services. Use their portals + CAQH data.', 20, 'commercial', 1);
INSERT INTO payer (code, name, full_name, category, payer_type, color, app_form, integration, api_support, caqh_participating, portal_url, avg_tat_days, submission_method, api_available, api_vendor, api_docs_url, submission_notes, sort_order, pricing_category, pricing_mult) VALUES ('va_ccn', 'VA CCN', 'VA Community Care Network', 'Federal', 'Managed', '#1b5e20', 'VA CCN Provider Application (via Optum or TriWest)', 'portal', 'portal', 1, 'https://www.va.gov/COMMUNITYCARE', 85, 'portal_only', 0, 'Optum (Regions 1-3) + TriWest (Regions 4-5)', NULL, 'VA Community Care Network for serving veterans. Administered by Optum in regions 1-3 and TriWest in regions 4-5.', 21, 'commercial', 1);

-- ------------------------------------------------------------
-- V105__payer_credential_providers.sql
-- ------------------------------------------------------------
-- ============================================================
-- Organization payer portal logins are assigned to specific providers: a login is only used
-- (and "Submit for {provider}" only offered) for the providers it is assigned to.
-- Provider-level logins (payer_credential.provider_id set) are unaffected.
-- ============================================================
CREATE TABLE payer_credential_provider (
  credential_id BIGINT NOT NULL,
  provider_id   BIGINT NOT NULL,
  PRIMARY KEY (credential_id, provider_id),
  CONSTRAINT fk_pcp_credential FOREIGN KEY (credential_id) REFERENCES payer_credential(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcp_provider   FOREIGN KEY (provider_id)   REFERENCES provider(id)         ON DELETE CASCADE,
  KEY idx_pcp_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing organization logins keep working: assign them to every provider of their organization.
-- Edit a login under Payers -> Portal Login to narrow it down.
INSERT INTO payer_credential_provider (credential_id, provider_id)
SELECT c.id, p.id
  FROM payer_credential c
  JOIN provider p ON p.org_id = c.org_id
 WHERE c.provider_id IS NULL;

-- ------------------------------------------------------------
-- V106__provider_credentials.sql
-- ------------------------------------------------------------
-- Provider page "Credentials" block (prototype): CAQH login and PECOS access, entered when the provider is added.
-- The CAQH password is stored encrypted (AES, like payer portal passwords).
ALTER TABLE provider
  ADD COLUMN caqh_password_enc VARCHAR(512) NULL AFTER caqh_username,
  ADD COLUMN pecos_access_granted TINYINT(1) NULL AFTER caqh_password_enc,
  ADD COLUMN pecos_username VARCHAR(100) NULL AFTER pecos_access_granted;

-- ------------------------------------------------------------
-- V107__super_admin_roles_password_reset.sql
-- ------------------------------------------------------------
-- Super admin, user roles (job titles picked in Users) and forgot-password codes.

-- 1. User roles managed by the super admin; org admins pick one when adding a user.
CREATE TABLE user_role (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO user_role (name) VALUES
  ('Administrator'), ('Credentialing Specialist'), ('Enrollment Coordinator'), ('Billing Specialist'), ('Auditor');

ALTER TABLE app_user
  ADD COLUMN user_role_id BIGINT NULL AFTER role,
  ADD CONSTRAINT fk_user_user_role FOREIGN KEY (user_role_id) REFERENCES user_role(id) ON DELETE SET NULL;

-- 2. Super admin (platform level, no organization): dev@desss.com / Admin@123 (bcrypt hash below).
INSERT INTO app_user (org_id, username, email, password_hash, first_name, last_name, display_name, title, role)
SELECT NULL, 'dev@desss.com', 'dev@desss.com', '$2a$10$9DH0IG81qHuZ8kppWFAihuYZZO1zDNLbgtlw1I528II8pzeJKj0ne',
       'Super', 'Admin', 'Super Admin', 'Super Admin', 'platform_admin'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'dev@desss.com' OR email = 'dev@desss.com');

-- 3. Forgot password: one-time codes emailed to the user (stored hashed), then a short-lived reset token.
CREATE TABLE password_reset (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT       NOT NULL,
  code_hash         VARCHAR(64)  NOT NULL,
  expires_at        DATETIME     NOT NULL,
  attempts          INT          NOT NULL DEFAULT 0,
  reset_token_hash  VARCHAR(64)  NULL,
  token_expires_at  DATETIME     NULL,
  used_at           DATETIME     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  KEY idx_pwreset_user (user_id),
  KEY idx_pwreset_token (reset_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- V108__user_role_access_level.sql
-- ------------------------------------------------------------
-- Each User Role (managed by the super admin) maps to an access level, so the Users form shows only these roles
-- and a user's permissions come from the role picked: org_admin (all modules), clerk (staff), auditor (read-only)
-- or provider (provider portal login).
ALTER TABLE user_role
  ADD COLUMN access_level VARCHAR(20) NOT NULL DEFAULT 'clerk' AFTER name;

UPDATE user_role SET access_level = 'org_admin' WHERE name = 'Administrator';
UPDATE user_role SET access_level = 'auditor'   WHERE name = 'Auditor';

INSERT INTO user_role (name, access_level)
SELECT 'Provider', 'provider' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM user_role WHERE name = 'Provider');

-- Existing users get the matching role so every user shows a role from the list.
UPDATE app_user u JOIN user_role r ON r.name = 'Administrator'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role IN ('org_admin', 'admin');
UPDATE app_user u JOIN user_role r ON r.name = 'Auditor'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role = 'auditor';
UPDATE app_user u JOIN user_role r ON r.name = 'Credentialing Specialist'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role = 'clerk';
UPDATE app_user u JOIN user_role r ON r.name = 'Provider'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role = 'provider';
