{{ config(
    materialized='view'
) }}

WITH customers_base AS (
    SELECT
        c.id AS customer_id,
        c.email,
        c.phone_e164,
        c.cpf,
        c.name,
        c.created_at,
        COUNT(DISTINCT o.id) AS total_orders,
        SUM(CASE WHEN o.status = 'paid' THEN o.net_amount ELSE 0 END) AS lifetime_value,
        MIN(o.order_date) AS first_order_date,
        MAX(o.order_date) AS last_order_date
    FROM {{ source('public', 'customers') }} c
    LEFT JOIN {{ source('public', 'orders') }} o ON c.id = o.customer_id
    GROUP BY 1, 2, 3, 4, 5, 6
)

SELECT 
    *,
    CASE 
        WHEN total_orders = 0 THEN 'prospect'
        WHEN total_orders = 1 THEN 'new_customer'
        WHEN total_orders BETWEEN 2 AND 3 THEN 'returning_customer'
        ELSE 'vip_customer'
    END AS customer_segment,
    CURRENT_DATE - last_order_date::date AS days_since_last_order
FROM customers_base