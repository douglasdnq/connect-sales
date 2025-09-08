-- Migração 004: Criar views úteis

-- View de receita month-to-date
CREATE OR REPLACE VIEW v_revenue_mtd AS
SELECT 
    DATE_TRUNC('day', order_date) AS dia,
    COUNT(*) AS pedidos,
    SUM(net_amount) AS receita_liquida,
    AVG(net_amount) AS ticket_medio,
    COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS reembolsos,
    COUNT(CASE WHEN status = 'chargeback' THEN 1 END) AS chargebacks
FROM orders
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND status IN ('paid', 'refunded', 'chargeback')
GROUP BY DATE_TRUNC('day', order_date)
ORDER BY dia DESC;

-- View de ROAS últimos 7 dias
CREATE OR REPLACE VIEW v_roas_7d AS
WITH ad_spend AS (
    SELECT 
        campaign_id,
        adset_id,
        ad_id,
        SUM(spend) AS total_spend,
        SUM(clicks) AS total_clicks,
        SUM(impressions) AS total_impressions
    FROM ad_insights_daily
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY campaign_id, adset_id, ad_id
),
attributed_revenue AS (
    SELECT 
        a.utm_campaign AS campaign_id,
        COUNT(o.id) AS conversions,
        SUM(o.net_amount) AS revenue
    FROM orders o
    JOIN attribution a ON o.id = a.order_id
    WHERE o.order_date >= CURRENT_DATE - INTERVAL '7 days'
        AND o.status = 'paid'
    GROUP BY a.utm_campaign
)
SELECT 
    s.campaign_id,
    s.total_spend,
    s.total_clicks,
    s.total_impressions,
    COALESCE(r.conversions, 0) AS conversions,
    COALESCE(r.revenue, 0) AS revenue,
    CASE 
        WHEN s.total_spend > 0 THEN ROUND(COALESCE(r.revenue, 0) / s.total_spend, 2)
        ELSE 0 
    END AS roas,
    CASE 
        WHEN COALESCE(r.conversions, 0) > 0 THEN ROUND(s.total_spend / r.conversions, 2)
        ELSE NULL 
    END AS cpa
FROM ad_spend s
LEFT JOIN attributed_revenue r ON s.campaign_id = r.campaign_id;

-- View de margem por plataforma
CREATE OR REPLACE VIEW v_platform_margin AS
SELECT 
    pl.name AS plataforma,
    COUNT(DISTINCT o.id) AS total_pedidos,
    SUM(o.gross_amount) AS receita_bruta,
    SUM(o.net_amount) AS receita_liquida,
    SUM(p.fee) AS total_taxas,
    SUM(p.tax) AS total_impostos,
    SUM(o.net_amount) - COALESCE(SUM(p.fee), 0) - COALESCE(SUM(p.tax), 0) AS margem_liquida,
    CASE 
        WHEN SUM(o.gross_amount) > 0 
        THEN ROUND(((SUM(o.net_amount) - COALESCE(SUM(p.fee), 0) - COALESCE(SUM(p.tax), 0)) / SUM(o.gross_amount)) * 100, 2)
        ELSE 0 
    END AS margem_percentual
FROM platforms pl
LEFT JOIN orders o ON pl.id = o.platform_id
LEFT JOIN payments p ON o.id = p.order_id
WHERE o.status = 'paid'
GROUP BY pl.name
ORDER BY receita_bruta DESC;

-- View de performance diária consolidada
CREATE OR REPLACE VIEW v_daily_performance AS
WITH daily_revenue AS (
    SELECT 
        DATE_TRUNC('day', order_date) AS date,
        SUM(net_amount) AS revenue,
        COUNT(*) AS orders
    FROM orders
    WHERE status = 'paid'
    GROUP BY DATE_TRUNC('day', order_date)
),
daily_spend AS (
    SELECT 
        date,
        SUM(spend) AS ad_spend,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions
    FROM ad_insights_daily
    GROUP BY date
),
daily_expenses AS (
    SELECT 
        date,
        SUM(amount) AS operational_expenses
    FROM expenses
    GROUP BY date
)
SELECT 
    COALESCE(r.date, s.date, e.date) AS date,
    COALESCE(r.revenue, 0) AS revenue,
    COALESCE(r.orders, 0) AS orders,
    COALESCE(s.ad_spend, 0) AS ad_spend,
    COALESCE(s.clicks, 0) AS clicks,
    COALESCE(s.impressions, 0) AS impressions,
    COALESCE(e.operational_expenses, 0) AS operational_expenses,
    COALESCE(r.revenue, 0) - COALESCE(s.ad_spend, 0) - COALESCE(e.operational_expenses, 0) AS profit,
    CASE 
        WHEN COALESCE(s.ad_spend, 0) > 0 
        THEN ROUND(COALESCE(r.revenue, 0) / s.ad_spend, 2)
        ELSE 0 
    END AS roas
FROM daily_revenue r
FULL OUTER JOIN daily_spend s ON r.date = s.date
FULL OUTER JOIN daily_expenses e ON r.date = e.date
ORDER BY date DESC;

-- View de funil de conversão
CREATE OR REPLACE VIEW v_conversion_funnel AS
WITH funnel AS (
    SELECT 
        DATE_TRUNC('day', date) AS date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(leads) AS leads
    FROM ad_insights_daily
    GROUP BY DATE_TRUNC('day', date)
),
conversions AS (
    SELECT 
        DATE_TRUNC('day', order_date) AS date,
        COUNT(*) AS purchases
    FROM orders
    WHERE status = 'paid'
    GROUP BY DATE_TRUNC('day', order_date)
)
SELECT 
    f.date,
    f.impressions,
    f.clicks,
    f.leads,
    COALESCE(c.purchases, 0) AS purchases,
    CASE WHEN f.impressions > 0 THEN ROUND(f.clicks::NUMERIC / f.impressions * 100, 2) ELSE 0 END AS ctr,
    CASE WHEN f.clicks > 0 THEN ROUND(f.leads::NUMERIC / f.clicks * 100, 2) ELSE 0 END AS lead_rate,
    CASE WHEN f.leads > 0 THEN ROUND(c.purchases::NUMERIC / f.leads * 100, 2) ELSE 0 END AS purchase_rate
FROM funnel f
LEFT JOIN conversions c ON f.date = c.date
ORDER BY f.date DESC;