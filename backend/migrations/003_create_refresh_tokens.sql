-- Create refresh tokens table for JWT refresh token storage
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_refresh_token UNIQUE (user_id)
);

-- Index for token lookups
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Index for cleanup queries
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Add failed login attempts tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;