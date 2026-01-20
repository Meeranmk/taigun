-- Migration: Add registration fields and email verification
-- Date: 2026-01-20
-- Description: Add new fields to organizations and users tables, create email_verification_tokens table

-- ============================================================
-- 1. Add new columns to organizations table
-- ============================================================

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS website VARCHAR,
ADD COLUMN IF NOT EXISTS industry VARCHAR NOT NULL DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS size VARCHAR NOT NULL DEFAULT '1-10',
ADD COLUMN IF NOT EXISTS country VARCHAR NOT NULL DEFAULT 'United States',
ADD COLUMN IF NOT EXISTS timezone VARCHAR NOT NULL DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing organizations to have active status
UPDATE organizations SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE organizations SET email_verified = TRUE WHERE email_verified IS NULL;

-- Make contact_email NOT NULL (if not already)
ALTER TABLE organizations ALTER COLUMN contact_email SET NOT NULL;

-- ============================================================
-- 2. Add new columns to users table
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name VARCHAR,
ADD COLUMN IF NOT EXISTS last_name VARCHAR,
ADD COLUMN IF NOT EXISTS phone VARCHAR,
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Update existing users to have active status and verified email
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;
UPDATE users SET requires_password_change = FALSE WHERE requires_password_change IS NULL;

-- ============================================================
-- 3. Create email_verification_tokens table
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id UUID NOT NULL,
    purpose VARCHAR NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_entity ON email_verification_tokens(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);

-- ============================================================
-- 4. Add comments for documentation
-- ============================================================

COMMENT ON COLUMN organizations.website IS 'Organization website URL';
COMMENT ON COLUMN organizations.industry IS 'Industry type (Technology, Healthcare, Finance, etc.)';
COMMENT ON COLUMN organizations.size IS 'Organization size (1-10, 11-50, 51-200, 201-500, 500+)';
COMMENT ON COLUMN organizations.country IS 'Country where organization is located';
COMMENT ON COLUMN organizations.timezone IS 'Organization timezone';
COMMENT ON COLUMN organizations.status IS 'Organization status (pending, active, inactive, suspended)';
COMMENT ON COLUMN organizations.email_verified IS 'Whether organization email has been verified';

COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.status IS 'User status (active, inactive, suspended)';
COMMENT ON COLUMN users.email_verified IS 'Whether user email has been verified';
COMMENT ON COLUMN users.requires_password_change IS 'Whether user must change password on next login';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last login';

COMMENT ON TABLE email_verification_tokens IS 'Reusable email verification tokens for organizations, users, teams, etc.';
COMMENT ON COLUMN email_verification_tokens.entity_type IS 'Type of entity (organization, user, team)';
COMMENT ON COLUMN email_verification_tokens.entity_id IS 'ID of the entity being verified';
COMMENT ON COLUMN email_verification_tokens.purpose IS 'Purpose of verification (registration, email_change, invitation)';

-- ============================================================
-- Migration complete
-- ============================================================

SELECT 'Migration completed successfully!' as status;
