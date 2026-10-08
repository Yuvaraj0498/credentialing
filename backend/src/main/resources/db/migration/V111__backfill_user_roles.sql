-- Every user has a User Role (Users → role filter). Users created without one get the first role
-- with the same access level as their built-in role.
UPDATE app_user u
  JOIN (SELECT access_level, MIN(id) AS id FROM user_role GROUP BY access_level) r
    ON r.access_level = CASE WHEN u.role = 'admin' THEN 'org_admin' ELSE u.role END
   SET u.user_role_id = r.id
 WHERE u.user_role_id IS NULL AND u.role <> 'platform_admin';
