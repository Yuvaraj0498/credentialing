-- Super admin, user roles (job titles picked in Users) and forgot-password codes.

-- 1. User roles managed by the super admin; org admins pick one when adding a user.
CREATE TABLE user_role (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO user_role (name) VALUES
  ('Administrator'), ('Credentialing Specialist'), ('Enrollment Coordinator'), ('Billing Specialist'), ('Auditor');

ALTER TABLE app_user
  ADD COLUMN user_role_id BIGINT NULL AFTER role,
  ADD CONSTRAINT fk_user_user_role FOREIGN KEY (user_role_id) REFERENCES user_role(id) ON DELETE SET NULL;

-- 2. Super admin (platform level, no organization): dev@desss.com / Admin@123 (bcrypt hash below).
INSERT INTO app_user (org_id, username, email, password_hash, first_name, last_name, display_name, title, role)
SELECT NULL, 'dev@desss.com', 'dev@desss.com', '$2a$10$9DH0IG81qHuZ8kppWFAihuYZZO1zDNLbgtlw1I528II8pzeJKj0ne',
       'Super', 'Admin', 'Super Admin', 'Super Admin', 'platform_admin'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'dev@desss.com' OR email = 'dev@desss.com');

-- 3. Forgot password: one-time codes emailed to the user (stored hashed), then a short-lived reset token.
CREATE TABLE password_reset (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT       NOT NULL,
  code_hash         VARCHAR(64)  NOT NULL,
  expires_at        DATETIME     NOT NULL,
  attempts          INT          NOT NULL DEFAULT 0,
  reset_token_hash  VARCHAR(64)  NULL,
  token_expires_at  DATETIME     NULL,
  used_at           DATETIME     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  KEY idx_pwreset_user (user_id),
  KEY idx_pwreset_token (reset_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
