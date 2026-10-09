-- The two built-in roles are marked explicitly (instead of "the first role with that access level"):
--   system_key 'org_admin' = the Admin role given to organization admins (Create Admin),
--   system_key 'provider'  = the Provider role given to provider logins (Providers module).
-- Every other role is a staff role the super admin manages.
ALTER TABLE user_role
  ADD COLUMN system_key VARCHAR(20) NULL AFTER access_level,
  ADD UNIQUE KEY uk_user_role_system_key (system_key);

-- Admin role: the one named Admin / Administrator / Org Admin, or a new "Admin" role when it was renamed or removed.
SET @admin := (SELECT MIN(id) FROM user_role
               WHERE LOWER(TRIM(name)) IN ('admin', 'administrator', 'org admin', 'organization admin'));
INSERT INTO user_role (name, access_level) SELECT 'Admin', 'org_admin' FROM DUAL WHERE @admin IS NULL;
SET @admin := COALESCE(@admin, LAST_INSERT_ID());
UPDATE user_role SET access_level = 'org_admin', active = 1, system_key = 'org_admin' WHERE id = @admin;

-- Provider role: the first provider role, or the one named Provider, or a new one.
SET @prov := COALESCE((SELECT MIN(id) FROM user_role WHERE access_level = 'provider'),
                      (SELECT MIN(id) FROM user_role WHERE LOWER(TRIM(name)) = 'provider'));
INSERT INTO user_role (name, access_level) SELECT 'Provider', 'provider' FROM DUAL WHERE @prov IS NULL;
SET @prov := COALESCE(@prov, LAST_INSERT_ID());
UPDATE user_role SET access_level = 'provider', active = 1, system_key = 'provider' WHERE id = @prov;

-- The Admin role has the admin permissions (a newly created one starts with the default admin permissions).
INSERT INTO role_permission (org_id, entity, action, role, allowed)
SELECT rp.org_id, rp.entity, rp.action, CONCAT('ur:', a.id), rp.allowed
FROM role_permission rp
JOIN user_role a ON a.system_key = 'org_admin'
WHERE rp.role = 'org_admin'
  AND NOT EXISTS (SELECT 1 FROM role_permission x
                  WHERE x.org_id <=> rp.org_id AND x.entity = rp.entity AND x.action = rp.action
                    AND x.role = CONCAT('ur:', a.id));

-- Any other role that still gave admin access becomes a staff role (e.g. the old admin role renamed to "Clerk")
-- and gets the default staff permissions instead of the admin ones.
CREATE TEMPORARY TABLE v115_to_staff AS SELECT id FROM user_role WHERE access_level = 'org_admin' AND id <> @admin;
UPDATE user_role SET access_level = 'clerk' WHERE access_level = 'org_admin' AND id <> @admin;
DELETE rp FROM role_permission rp JOIN v115_to_staff s ON rp.role = CONCAT('ur:', s.id);
INSERT INTO role_permission (org_id, entity, action, role, allowed)
SELECT rp.org_id, rp.entity, rp.action, CONCAT('ur:', s.id), rp.allowed
FROM role_permission rp JOIN v115_to_staff s
WHERE rp.role = 'clerk';
DROP TEMPORARY TABLE v115_to_staff;

-- Each organization's own admin (created through Create Admin) has the Admin role.
UPDATE app_user SET user_role_id = @admin, role = 'org_admin' WHERE org_owner = 1;
-- Other users follow their role's access level (users of a former admin-access role become staff).
UPDATE app_user u
  JOIN user_role r ON r.id = u.user_role_id
   SET u.role = r.access_level
 WHERE u.role IN ('org_admin', 'admin') AND u.org_owner = 0 AND r.id <> @admin AND r.access_level IN ('clerk', 'auditor');
-- Users without a role get the matching built-in one.
UPDATE app_user SET user_role_id = @admin WHERE user_role_id IS NULL AND role IN ('org_admin', 'admin');
UPDATE app_user SET user_role_id = @prov WHERE user_role_id IS NULL AND role = 'provider';
