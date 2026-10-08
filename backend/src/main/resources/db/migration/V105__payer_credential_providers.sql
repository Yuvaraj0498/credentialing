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
