-- Each User Role (managed by the super admin) maps to an access level, so the Users form shows only these roles
-- and a user's permissions come from the role picked: org_admin (all modules), clerk (staff), auditor (read-only)
-- or provider (provider portal login).
ALTER TABLE user_role
  ADD COLUMN access_level VARCHAR(20) NOT NULL DEFAULT 'clerk' AFTER name;

UPDATE user_role SET access_level = 'org_admin' WHERE name = 'Administrator';
UPDATE user_role SET access_level = 'auditor'   WHERE name = 'Auditor';

INSERT INTO user_role (name, access_level)
SELECT 'Provider', 'provider' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM user_role WHERE name = 'Provider');

-- Existing users get the matching role so every user shows a role from the list.
UPDATE app_user u JOIN user_role r ON r.name = 'Administrator'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role IN ('org_admin', 'admin');
UPDATE app_user u JOIN user_role r ON r.name = 'Auditor'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role = 'auditor';
UPDATE app_user u JOIN user_role r ON r.name = 'Credentialing Specialist'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role = 'clerk';
UPDATE app_user u JOIN user_role r ON r.name = 'Provider'
   SET u.user_role_id = r.id WHERE u.user_role_id IS NULL AND u.role = 'provider';
