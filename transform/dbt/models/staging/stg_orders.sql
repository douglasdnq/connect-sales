{{ config(
    materialized='view'
) }}

WITH orders_base AS (
    SELECT
        o.id AS order_id,
        o.platform_id,
        p.name AS platform_name,
        o.platform_order_id,
        o.customer_id,
        o.order_date,
        o.currency,
        o.gross_amount,
        o.net_amount,
        o.status,
        o.created_at,
        o.order_date::date AS order_date_day
    FROM {{ source('public', 'orders') }} o
    LEFT JOIN {{ source('public', 'platforms') }} p ON o.platform_id = p.id
    WHERE o.order_date >= '{{ var("start_date") }}'
)

SELECT 
    *,
    CASE 
        WHEN status IN ('paid', 'refunded', 'chargeback') THEN TRUE
        ELSE FALSE 
    END AS is_confirmed,
    CASE 
        WHEN status = 'paid' THEN net_amount
        WHEN status IN ('refunded', 'chargeback') THEN -net_amount
        ELSE 0
    END AS revenue_impact
FROM orders_base