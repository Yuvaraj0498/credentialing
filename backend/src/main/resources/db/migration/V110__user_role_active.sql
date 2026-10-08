-- User Roles: the super admin can disable a role; users with a disabled role cannot sign in.
ALTER TABLE user_role ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER access_level;

-- Documents whose expiration date has passed are shown as expired.
UPDATE provider_document SET status = 'expired'
 WHERE expires_at IS NOT NULL AND expires_at < CURDATE() AND status IN ('approved', 'pending_review');
