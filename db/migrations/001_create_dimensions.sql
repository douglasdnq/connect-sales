-- Migração 001: Criar tabelas de dimensão

-- Habilitar extensão citext para emails case-insensitive
CREATE EXTENSION IF NOT EXISTS citext;

-- Tabela de plataformas
CREATE TABLE IF NOT EXISTS platforms (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id INT REFERENCES platforms(id),
    platform_product_id TEXT,
    name TEXT,
    sku TEXT,
    is_subscription BOOLEAN DEFAULT FALSE,
    list_price NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform_id, platform_product_id)
);

CREATE INDEX idx_products_platform_id ON products(platform_id);
CREATE INDEX idx_products_platform_product_id ON products(platform_product_id);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT,
    phone_e164 TEXT,
    cpf TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_cpf ON customers(cpf);
CREATE INDEX idx_customers_phone ON customers(phone_e164);

-- Tabela de campanhas
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT CHECK (platform IN ('meta', 'google', 'tiktok')),
    campaign_id TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, campaign_id)
);

CREATE INDEX idx_campaigns_platform_campaign_id ON campaigns(platform, campaign_id);

-- Tabela de conjuntos de anúncios
CREATE TABLE IF NOT EXISTS adsets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT,
    adset_id TEXT,
    name TEXT,
    campaign_id UUID REFERENCES campaigns(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, adset_id)
);

CREATE INDEX idx_adsets_platform_adset_id ON adsets(platform, adset_id);

-- Tabela de anúncios
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT,
    ad_id TEXT,
    name TEXT,
    adset_id UUID REFERENCES adsets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, ad_id)
);

CREATE INDEX idx_ads_platform_ad_id ON ads(platform, ad_id);