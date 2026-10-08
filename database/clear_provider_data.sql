-- ============================================================
-- ZmartCredential — start fresh: remove all client / practice / location / provider data
--
-- KEEPS:  organizations, staff user accounts (admins, clerks, auditors), role permissions,
--         subscriptions + payment methods, settings (CAQH config, alert settings, reminder rules),
--         and all built-in data (payers, plans, document types, email templates, pricing, ...).
-- REMOVES: clients, practices, locations, providers and everything attached to them
--         (documents, enrollments, submissions, payer logins, invites, tasks, reminders, notifications,
--         chat, audit log, invoices), plus the provider user accounts.
--
-- Run:  mysql -u admin -p credentialing < clear_provider_data.sql
-- Uploaded document files stay on disk; delete the backend's storage folder too if you want them gone.
-- Everyone has to sign in again afterwards (sessions are cleared).
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

-- Enrollments and payer submissions
TRUNCATE TABLE payer_submission;
TRUNCATE TABLE enrollment_file;
TRUNCATE TABLE enrollment_event;
TRUNCATE TABLE enrollment;

-- Payer portal logins and the credential vault
TRUNCATE TABLE payer_credential_provider;
TRUNCATE TABLE payer_credential;
TRUNCATE TABLE credential_vault;

-- Provider details
TRUNCATE TABLE provider_document;
TRUNCATE TABLE provider_invite;
TRUNCATE TABLE provider_privilege;
TRUNCATE TABLE verification_check;
TRUNCATE TABLE time_entry;
TRUNCATE TABLE follow_up;
TRUNCATE TABLE generated_letter;
TRUNCATE TABLE caqh_payer_authorization;

-- Reminders, CAQH activity, payer rosters
TRUNCATE TABLE reminder_schedule_provider;
TRUNCATE TABLE reminder_schedule;
TRUNCATE TABLE email_log;
TRUNCATE TABLE attestation_reminder_log;
TRUNCATE TABLE caqh_sync_run;
TRUNCATE TABLE payer_roster_entry;
TRUNCATE TABLE payer_roster_upload;

-- Activity: tasks, notifications, chat, audit log, billing history
TRUNCATE TABLE task;
TRUNCATE TABLE notification;
TRUNCATE TABLE chat_read;
TRUNCATE TABLE chat_message;
TRUNCATE TABLE chat_channel;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE invoice_line;
TRUNCATE TABLE invoice;
TRUNCATE TABLE usage_counter;

-- Provider user accounts (staff accounts stay) and all sessions
DELETE FROM app_user WHERE role = 'provider' OR provider_id IS NOT NULL;
TRUNCATE TABLE refresh_token;

-- Organization structure and providers
TRUNCATE TABLE provider;
TRUNCATE TABLE location;
TRUNCATE TABLE practice;
TRUNCATE TABLE client;

SET FOREIGN_KEY_CHECKS = 1;
