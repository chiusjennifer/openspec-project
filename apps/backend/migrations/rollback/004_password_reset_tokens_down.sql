DROP INDEX IF EXISTS idx_users_reset_password_token_hash;

ALTER TABLE users
DROP COLUMN IF EXISTS reset_password_expires_at,
DROP COLUMN IF EXISTS reset_password_token_hash;
