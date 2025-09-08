-- Seed de dados para teste

-- Inserir plataformas
INSERT INTO platforms (name) VALUES 
    ('kiwify'),
    ('dmg'),
    ('cademi'),
    ('voomp')
ON CONFLICT (name) DO NOTHING;

-- Inserir produtos de exemplo
INSERT INTO products (platform_id, platform_product_id, name, sku, is_subscription, list_price) VALUES
    (1, 'kiwify_prod_001', 'Curso de Marketing Digital', 'MKT-001', false, 497.00),
    (1, 'kiwify_prod_002', 'Mentoria Premium', 'MENT-001', true, 197.00),
    (2, 'dmg_prod_001', 'Ebook Vendas Online', 'EBOOK-001', false, 97.00),
    (3, 'cademi_course_001', 'Formação em Gestão', 'GEST-001', false, 1997.00),
    (4, 'voomp_prod_001', 'Acesso Vitalício', 'VIT-001', false, 997.00)
ON CONFLICT DO NOTHING;

-- Inserir clientes de exemplo
INSERT INTO customers (email, phone_e164, cpf, name) VALUES
    ('joao.silva@example.com', '+5511999887766', '12345678901', 'João Silva'),
    ('maria.santos@example.com', '+5521998776655', '98765432101', 'Maria Santos'),
    ('pedro.oliveira@example.com', '+5531987654321', '11122233344', 'Pedro Oliveira')
ON CONFLICT DO NOTHING;

-- Inserir campanhas do Meta
INSERT INTO campaigns (platform, campaign_id, name) VALUES
    ('meta', 'camp_123456', 'Black Friday 2024'),
    ('meta', 'camp_789012', 'Lançamento Produto')
ON CONFLICT DO NOTHING;

-- Inserir adsets
INSERT INTO adsets (platform, adset_id, name) VALUES
    ('meta', 'adset_111', 'Audiência Lookalike'),
    ('meta', 'adset_222', 'Retargeting 30 dias')
ON CONFLICT DO NOTHING;

-- Inserir ads
INSERT INTO ads (platform, ad_id, name) VALUES
    ('meta', 'ad_aaa', 'Video VSL Principal'),
    ('meta', 'ad_bbb', 'Carrossel Benefícios')
ON CONFLICT DO NOTHING;

-- Inserir pedidos de exemplo
WITH customer_ids AS (
    SELECT id FROM customers LIMIT 3
),
product_ids AS (
    SELECT id FROM products LIMIT 5
)
INSERT INTO orders (platform_id, platform_order_id, customer_id, order_date, gross_amount, net_amount, status)
SELECT 
    (random() * 3 + 1)::int,
    'ORDER_' || generate_series,
    (SELECT id FROM customer_ids ORDER BY random() LIMIT 1),
    NOW() - INTERVAL '1 day' * (random() * 30)::int,
    (random() * 1000 + 100)::numeric(12,2),
    (random() * 900 + 90)::numeric(12,2),
    CASE 
        WHEN random() < 0.8 THEN 'paid'
        WHEN random() < 0.9 THEN 'pending'
        ELSE 'refunded'
    END
FROM generate_series(1, 50)
ON CONFLICT DO NOTHING;

-- Inserir insights de mídia
INSERT INTO ad_insights_daily (date, account_id, campaign_id, adset_id, ad_id, spend, impressions, clicks, leads)
SELECT 
    CURRENT_DATE - INTERVAL '1 day' * generate_series,
    'act_123456789',
    CASE WHEN random() < 0.5 THEN 'camp_123456' ELSE 'camp_789012' END,
    CASE WHEN random() < 0.5 THEN 'adset_111' ELSE 'adset_222' END,
    CASE WHEN random() < 0.5 THEN 'ad_aaa' ELSE 'ad_bbb' END,
    (random() * 500 + 50)::numeric(12,2),
    (random() * 10000 + 1000)::bigint,
    (random() * 500 + 50)::bigint,
    (random() * 50 + 5)::bigint
FROM generate_series(0, 30)
ON CONFLICT DO NOTHING;

-- Inserir despesas operacionais
INSERT INTO expenses (date, category, description, amount, recurrence, source) VALUES
    (CURRENT_DATE, 'infraestrutura', 'Servidor AWS', 1200.00, 'mensal', 'AWS'),
    (CURRENT_DATE, 'software', 'Licenças Software', 500.00, 'mensal', 'Microsoft'),
    (CURRENT_DATE - INTERVAL '15 days', 'marketing', 'Influenciador', 3000.00, 'única', 'Manual'),
    (CURRENT_DATE - INTERVAL '7 days', 'operacional', 'Freelancer', 1500.00, 'única', 'Manual')
ON CONFLICT DO NOTHING;

-- Inserir atribuições de exemplo para alguns pedidos
INSERT INTO attribution (order_id, utm_source, utm_medium, utm_campaign, first_touch_at, last_touch_at)
SELECT 
    id,
    CASE WHEN random() < 0.5 THEN 'facebook' ELSE 'instagram' END,
    'paid',
    CASE WHEN random() < 0.5 THEN 'camp_123456' ELSE 'camp_789012' END,
    order_date - INTERVAL '2 hours',
    order_date - INTERVAL '30 minutes'
FROM orders
WHERE status = 'paid'
LIMIT 30
ON CONFLICT DO NOTHING;