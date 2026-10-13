-- My Documents → Add More Document: extra documents a provider adds besides the required list (any number, also a
-- second document of the same type). Visible to staff on the provider's page.
CREATE TABLE provider_additional_document (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id        BIGINT       NULL,
  provider_id   BIGINT       NOT NULL,
  doc_type      VARCHAR(40)  NOT NULL,
  title         VARCHAR(200) NULL,
  notes         VARCHAR(1000) NULL,
  expires_at    DATE         NULL,
  file_name     VARCHAR(255) NULL,
  storage_key   VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NULL,
  size_bytes    BIGINT       NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending_review',
  uploaded_by   BIGINT       NULL,
  uploaded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted    TINYINT(1)   NOT NULL DEFAULT 0,
  KEY idx_pad_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
