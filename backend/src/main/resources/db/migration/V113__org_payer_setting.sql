-- Super admin → Organizations → Payers: payers switched off for one organization (admin).
-- Every payer is available to every organization unless a row here has enabled = 0.
CREATE TABLE org_payer_setting (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id      BIGINT NOT NULL,
  payer_id    BIGINT NOT NULL,
  enabled     TINYINT(1) NOT NULL DEFAULT 1,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_payer (org_id, payer_id),
  CONSTRAINT fk_ops_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
  CONSTRAINT fk_ops_payer FOREIGN KEY (payer_id) REFERENCES payer(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
