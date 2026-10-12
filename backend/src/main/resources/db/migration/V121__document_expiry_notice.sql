-- 30 days before a document expires the provider and their organization's admins are notified (in the app and
-- by email). One row per document and expiration date, so each notice is sent once; a renewed document with a new
-- date is notified again.
CREATE TABLE document_expiry_notice (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id  BIGINT   NOT NULL,
  expires_at   DATE     NOT NULL,
  sent_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_expiry_notice (document_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
