{{ config(
    materialized='table',
    indexes=[
        {'columns': ['date'], 'unique': False},
        {'columns': ['platform_name'], 'unique': False}
    ]
) }}

WITH daily_revenue AS (
    SELECT
        order_date_day AS date,
        platform_name,
        COUNT(*) AS total_orders,
        COUNT(CASE WHEN is_confirmed THEN 1 END) AS confirmed_orders,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_orders,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refunded_orders,
        COUNT(CASE WHEN status = 'chargeback' THEN 1 END) AS chargeback_orders,
        SUM(gross_amount) AS gross_revenue,
        SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END) AS net_revenue,
        SUM(CASE WHEN status = 'refunded' THEN net_amount ELSE 0 END) AS refunded_amount,
        SUM(CASE WHEN status = 'chargeback' THEN net_amount ELSE 0 END) AS chargeback_amount,
        AVG(CASE WHEN status = 'paid' THEN net_amount ELSE NULL END) AS avg_order_value
    FROM {{ ref('stg_orders') }}
    GROUP BY 1, 2
),

daily_expenses AS (
    SELECT 
        date,
        'all' AS platform_name,
        SUM(amount) AS operational_expenses
    FROM {{ source('public', 'expenses') }}
    GROUP BY 1
),

daily_ad_spend AS (
    SELECT
        date,
        'all' AS platform_name,
        SUM(spend) AS ad_spend
    FROM {{ ref('stg_ad_insights') }}
    GROUP BY 1
)

SELECT
    r.date,
    r.platform_name,
    r.total_orders,
    r.confirmed_orders,
    r.paid_orders,
    r.refunded_orders,
    r.chargeback_orders,
    r.gross_revenue,
    r.net_revenue,
    r.refunded_amount,
    r.chargeback_amount,
    r.avg_order_value,
    COALESCE(e.operational_expenses, 0) AS operational_expenses,
    COALESCE(s.ad_spend, 0) AS ad_spend,
    r.net_revenue - COALESCE(s.ad_spend, 0) - COALESCE(e.operational_expenses, 0) AS profit,
    CASE 
        WHEN COALESCE(s.ad_spend, 0) > 0 
        THEN ROUND(r.net_revenue / s.ad_spend, 2)
        ELSE NULL 
    END AS roas
FROM daily_revenue r
LEFT JOIN daily_expenses e ON r.date = e.date
LEFT JOIN daily_ad_spend s ON r.date = s.date