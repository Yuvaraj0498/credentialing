-- Provider page "Credentials" block (prototype): CAQH login and PECOS access, entered when the provider is added.
-- The CAQH password is stored encrypted (AES, like payer portal passwords).
ALTER TABLE provider
  ADD COLUMN caqh_password_enc VARCHAR(512) NULL AFTER caqh_username,
  ADD COLUMN pecos_access_granted TINYINT(1) NULL AFTER caqh_password_enc,
  ADD COLUMN pecos_username VARCHAR(100) NULL AFTER pecos_access_granted;
