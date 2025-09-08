{{ config(
    materialized='view'
) }}

WITH insights_base AS (
    SELECT
        id AS insight_id,
        date,
        account_id,
        campaign_id,
        adset_id,
        ad_id,
        spend,
        impressions,
        clicks,
        leads,
        created_at,
        EXTRACT(YEAR FROM date) AS year,
        EXTRACT(MONTH FROM date) AS month,
        EXTRACT(WEEK FROM date) AS week
    FROM {{ source('public', 'ad_insights_daily') }}
    WHERE date >= '{{ var("start_date") }}'
)

SELECT 
    *,
    CASE 
        WHEN impressions > 0 THEN ROUND(clicks::NUMERIC / impressions * 100, 2)
        ELSE 0 
    END AS ctr,
    CASE 
        WHEN clicks > 0 THEN ROUND(spend / clicks, 2)
        ELSE NULL 
    END AS cpc,
    CASE 
        WHEN impressions > 0 THEN ROUND(spend / impressions * 1000, 2)
        ELSE NULL 
    END AS cpm,
    CASE 
        WHEN leads > 0 THEN ROUND(spend / leads, 2)
        ELSE NULL 
    END AS cpl
FROM insights_base