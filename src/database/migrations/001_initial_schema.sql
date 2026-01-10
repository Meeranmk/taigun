-- Initial Database Schema for Taigun Application
-- PostgreSQL Migration Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TEAMS TABLE
-- Stores multi-tenant team configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    servicenow_url VARCHAR(500) NOT NULL,
    servicenow_username VARCHAR(255) NOT NULL,
    servicenow_password_encrypted TEXT NOT NULL,
    ticket_check_interval INTEGER DEFAULT 30000,
    enable_ticket_monitor BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- ============================================================================
-- USERS TABLE
-- Stores user authentication and profile information
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- SETTINGS TABLE
-- Stores application-wide settings and API keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    servicenow_url VARCHAR(500),
    servicenow_username VARCHAR(255),
    servicenow_password_encrypted TEXT,
    google_api_key_encrypted TEXT,
    openai_api_key_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================================================
-- KNOWLEDGE BASE TABLE
-- Stores problem-solution pairs metadata (embeddings stored in Qdrant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem TEXT NOT NULL,
    solution JSONB NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    created_by VARCHAR(255) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    effectiveness DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_priority ON knowledge_base(priority);
CREATE INDEX IF NOT EXISTS idx_kb_tags ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_created_by ON knowledge_base(created_by);
CREATE INDEX IF NOT EXISTS idx_kb_created_at ON knowledge_base(created_at DESC);

-- ============================================================================
-- PROCESSED TICKETS TABLE
-- Caches processed ServiceNow tickets to avoid duplicate processing
-- ============================================================================
CREATE TABLE IF NOT EXISTS processed_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_sys_id VARCHAR(255) UNIQUE NOT NULL,
    ticket_number VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    solution_provided TEXT,
    confidence_score DECIMAL(3,2)
);

CREATE INDEX IF NOT EXISTS idx_processed_tickets_sys_id ON processed_tickets(ticket_sys_id);
CREATE INDEX IF NOT EXISTS idx_processed_tickets_number ON processed_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_processed_tickets_date ON processed_tickets(processed_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- Automatically update updated_at timestamp on row modification
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- Create default admin user (password: admin123)
-- ============================================================================
-- Note: This will be handled by the application code to ensure proper bcrypt hashing
