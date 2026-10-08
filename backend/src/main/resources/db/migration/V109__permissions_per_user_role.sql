-- Permissions are now set per User Role (the roles the super admin creates) instead of per built-in role.
-- A role's permission column is keyed 'ur:<user_role.id>'. Each existing role starts with the permissions of the
-- built-in role it was mapped to (its access level), for the global defaults and every organization's overrides,
-- so no current user loses access. Roles added later start with every permission off.
INSERT INTO role_permission (org_id, entity, action, role, allowed)
SELECT rp.org_id, rp.entity, rp.action, CONCAT('ur:', ur.id), rp.allowed
FROM role_permission rp
JOIN user_role ur ON ur.access_level = rp.role
WHERE NOT EXISTS (
  SELECT 1 FROM role_permission x
  WHERE x.org_id <=> rp.org_id AND x.entity = rp.entity AND x.action = rp.action AND x.role = CONCAT('ur:', ur.id)
);
