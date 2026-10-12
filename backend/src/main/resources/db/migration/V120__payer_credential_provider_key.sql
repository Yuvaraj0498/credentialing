-- Removed provider links are kept as deleted rows (soft delete), so the same credential/provider pair can occur
-- again once re-added: the primary key becomes an ordinary index.
ALTER TABLE payer_credential_provider ADD KEY idx_pcp_credential_provider (credential_id, provider_id);
ALTER TABLE payer_credential_provider DROP PRIMARY KEY;
