-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active TIMESTAMP NOT NULL DEFAULT NOW(),
    challenge VARCHAR(512) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    terminated_at TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'terminated'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- Sanitized outputs
CREATE TABLE IF NOT EXISTS sanitized_outputs (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id),
    processing_id UUID NOT NULL,
    input_type VARCHAR(10) NOT NULL,
    tokenized_content TEXT NOT NULL,
    engine VARCHAR(50) NOT NULL DEFAULT 'gemini',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanitized_processing ON sanitized_outputs(processing_id);
CREATE INDEX IF NOT EXISTS idx_sanitized_session ON sanitized_outputs(session_id);

-- Debates
CREATE TABLE IF NOT EXISTS debates (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    transcript JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debates_session ON debates(session_id);
