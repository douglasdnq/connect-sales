{{ config(
    materialized='table',
    indexes=[
        {'columns': ['customer_id'], 'unique': True},
        {'columns': ['email'], 'unique': False},
        {'columns': ['customer_segment'], 'unique': False}
    ]
) }}

SELECT
    customer_id,
    email,
    phone_e164,
    cpf,
    name,
    created_at,
    total_orders,
    lifetime_value,
    first_order_date,
    last_order_date,
    customer_segment,
    days_since_last_order,
    CASE 
        WHEN days_since_last_order <= 30 THEN 'active'
        WHEN days_since_last_order <= 90 THEN 'at_risk'
        WHEN days_since_last_order <= 180 THEN 'dormant'
        ELSE 'churned'
    END AS lifecycle_stage,
    CASE
        WHEN lifetime_value >= 1000 THEN 'high'
        WHEN lifetime_value >= 500 THEN 'medium'
        WHEN lifetime_value > 0 THEN 'low'
        ELSE 'none'
    END AS value_tier
FROM {{ ref('stg_customers') }}