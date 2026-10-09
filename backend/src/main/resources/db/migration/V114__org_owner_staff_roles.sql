-- The admin of each organization (created by the super admin through Create Admin, or at sign-up) is its owner;
-- Create Admin and the super admin dashboard list owners only.
ALTER TABLE app_user ADD COLUMN org_owner TINYINT(1) NOT NULL DEFAULT 0;

UPDATE app_user u
  JOIN (SELECT org_id, MIN(id) AS id FROM app_user
         WHERE role IN ('org_admin', 'admin') AND org_id IS NOT NULL GROUP BY org_id) f ON f.id = u.id
   SET u.org_owner = 1;

-- Roles the super admin creates are staff roles: only the built-in Administrator role (the first role with admin
-- access) gives admin rights. What each role may do is set on the Permissions page.
UPDATE user_role r
  JOIN (SELECT MIN(id) AS id FROM user_role WHERE access_level = 'org_admin') a
   SET r.access_level = 'clerk'
 WHERE r.access_level = 'org_admin' AND r.id <> a.id;

UPDATE app_user u
  JOIN user_role r ON r.id = u.user_role_id
   SET u.role = 'clerk'
 WHERE u.role IN ('org_admin', 'admin') AND r.access_level = 'clerk' AND u.org_owner = 0;
