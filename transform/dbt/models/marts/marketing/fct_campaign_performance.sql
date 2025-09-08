{{ config(
    materialized='table',
    indexes=[
        {'columns': ['date', 'campaign_id'], 'unique': False}
    ]
) }}

WITH campaign_insights AS (
    SELECT
        date,
        campaign_id,
        SUM(spend) AS spend,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(leads) AS leads,
        AVG(ctr) AS avg_ctr,
        AVG(cpc) AS avg_cpc,
        AVG(cpm) AS avg_cpm,
        AVG(cpl) AS avg_cpl
    FROM {{ ref('stg_ad_insights') }}
    GROUP BY 1, 2
),

campaign_conversions AS (
    SELECT
        o.order_date_day AS date,
        a.utm_campaign AS campaign_id,
        COUNT(*) AS conversions,
        SUM(CASE WHEN o.status = 'paid' THEN o.net_amount ELSE 0 END) AS revenue
    FROM {{ ref('stg_orders') }} o
    INNER JOIN {{ source('public', 'attribution') }} a ON o.order_id = a.order_id
    WHERE a.utm_campaign IS NOT NULL
    GROUP BY 1, 2
)

SELECT
    COALESCE(i.date, c.date) AS date,
    COALESCE(i.campaign_id, c.campaign_id) AS campaign_id,
    COALESCE(i.spend, 0) AS spend,
    COALESCE(i.impressions, 0) AS impressions,
    COALESCE(i.clicks, 0) AS clicks,
    COALESCE(i.leads, 0) AS leads,
    COALESCE(c.conversions, 0) AS conversions,
    COALESCE(c.revenue, 0) AS revenue,
    i.avg_ctr,
    i.avg_cpc,
    i.avg_cpm,
    i.avg_cpl,
    CASE 
        WHEN i.spend > 0 THEN ROUND(c.revenue / i.spend, 2)
        ELSE NULL 
    END AS roas,
    CASE 
        WHEN c.conversions > 0 THEN ROUND(i.spend / c.conversions, 2)
        ELSE NULL 
    END AS cpa,
    CASE 
        WHEN i.clicks > 0 THEN ROUND(c.conversions::NUMERIC / i.clicks * 100, 2)
        ELSE 0 
    END AS conversion_rate
FROM campaign_insights i
FULL OUTER JOIN campaign_conversions c 
    ON i.date = c.date AND i.campaign_id = c.campaign_id