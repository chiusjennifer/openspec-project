ALTER TABLE users
ADD COLUMN reset_password_token_hash TEXT,
ADD COLUMN reset_password_expires_at TIMESTAMPTZ;

CREATE INDEX idx_users_reset_password_token_hash
ON users (reset_password_token_hash);
