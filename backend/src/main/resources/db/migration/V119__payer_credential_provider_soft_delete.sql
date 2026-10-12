-- Payer portal logins are soft-deleted (V118): Hibernate also reads the deleted flag on their provider links.
ALTER TABLE payer_credential_provider ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
