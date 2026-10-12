-- Soft delete: rows deleted from the app are kept and marked is_deleted = 1 (left out of every list and lookup).
ALTER TABLE app_user ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE chat_message ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE client ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE enrollment ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE enrollment_file ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE hospital ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE location ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE notification ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE payer ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE payer_credential ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE payer_submission ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE payment_method ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE practice ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE provider ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE provider_document ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE provider_invite ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE provider_privilege ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE reminder_schedule ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE task ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE time_entry ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE user_role ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE attestation_reminder_rule ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE follow_up ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE generated_letter ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE verification_check ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE caqh_payer_authorization ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE attestation_reminder_log ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

-- Unique values can be used again after a delete: del_token is 0 for live rows and the row id once deleted.
ALTER TABLE app_user ADD COLUMN del_token BIGINT NOT NULL DEFAULT 0;
ALTER TABLE app_user ADD UNIQUE KEY uk_user_email_del (email, del_token), ADD UNIQUE KEY uk_user_username_del (username, del_token);
ALTER TABLE app_user DROP INDEX uk_user_email, DROP INDEX uk_user_username;
ALTER TABLE user_role ADD COLUMN del_token BIGINT NOT NULL DEFAULT 0;
ALTER TABLE user_role ADD UNIQUE KEY uk_user_role_name_del (name, del_token);
ALTER TABLE user_role DROP INDEX uk_user_role_name;
ALTER TABLE payer ADD COLUMN del_token BIGINT NOT NULL DEFAULT 0;
ALTER TABLE payer ADD UNIQUE KEY uk_payer_code_del (code, del_token);
ALTER TABLE payer DROP INDEX uk_payer_code;
ALTER TABLE provider ADD COLUMN del_token BIGINT NOT NULL DEFAULT 0;
ALTER TABLE provider ADD UNIQUE KEY uk_provider_org_npi_del (org_id, npi, del_token);
ALTER TABLE provider DROP INDEX uk_provider_org_npi;

-- Mail templates: deleted flag, and an organization's own copy of a built-in template it edited or deleted.
ALTER TABLE email_template
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN base_template_id BIGINT NULL;
