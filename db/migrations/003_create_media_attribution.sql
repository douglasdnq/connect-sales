-- Migração 003: Criar tabelas de mídia e atribuição

-- Tabela de insights diários de anúncios
CREATE TABLE IF NOT EXISTS ad_insights_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    account_id TEXT,
    campaign_id TEXT,
    adset_id TEXT,
    ad_id TEXT,
    spend NUMERIC(12,2),
    impressions BIGINT,
    clicks BIGINT,
    leads BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_insights_daily_date ON ad_insights_daily(date);
CREATE INDEX idx_ad_insights_daily_campaign_id ON ad_insights_daily(campaign_id);
CREATE INDEX idx_ad_insights_daily_adset_id ON ad_insights_daily(adset_id);
CREATE INDEX idx_ad_insights_daily_ad_id ON ad_insights_daily(ad_id);

-- Tabela de atribuição
CREATE TABLE IF NOT EXISTS attribution (
    order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    fbclid TEXT,
    gclid TEXT,
    first_touch_at TIMESTAMPTZ,
    last_touch_at TIMESTAMPTZ
);

-- Tabela de despesas gerais
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category TEXT,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    recurrence TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Tabela de eventos brutos
CREATE TABLE IF NOT EXISTS raw_events (
    id BIGSERIAL PRIMARY KEY,
    platform_id INT NOT NULL REFERENCES platforms(id),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT,
    payload_json JSONB NOT NULL,
    event_hash TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_raw_events_platform_id ON raw_events(platform_id);
CREATE INDEX idx_raw_events_event_type ON raw_events(event_type);
CREATE INDEX idx_raw_events_event_hash ON raw_events(event_hash);

-- Tabela de erros de eventos
CREATE TABLE IF NOT EXISTS event_errors (
    id BIGSERIAL PRIMARY KEY,
    platform_id INT REFERENCES platforms(id),
    error_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    payload_json JSONB
);

CREATE INDEX idx_event_errors_platform_id ON event_errors(platform_id);

-- Tabela auxiliar para último toque (pixel)
CREATE TABLE IF NOT EXISTS last_touch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    email CITEXT,
    cpf TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    fbclid TEXT,
    gclid TEXT,
    landing_page TEXT,
    touched_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_last_touch_visitor_id ON last_touch(visitor_id);
CREATE INDEX idx_last_touch_email ON last_touch(email);
CREATE INDEX idx_last_touch_cpf ON last_touch(cpf);
CREATE INDEX idx_last_touch_expires_at ON last_touch(expires_at);