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
