-- Análise da estrutura de comissões na Kiwify
-- Execute no SQL Editor do Supabase

-- Ver eventos recentes e sua estrutura
SELECT 
    id,
    event_type,
    payload_json->>'order_id' as order_id,
    payload_json->'Customer'->>'email' as customer_email,
    payload_json->'Product'->>'product_name' as product_name,
    payload_json->'Commissions' as commissions_object,
    received_at
FROM raw_events 
WHERE payload_json IS NOT NULL
ORDER BY received_at DESC 
LIMIT 5;

-- Ver especificamente a estrutura de comissões
SELECT 
    id,
    payload_json->>'order_id' as order_id,
    payload_json->'Commissions' as full_commissions,
    payload_json->'Commissions'->>'settlement_amount' as settlement_amount,
    payload_json->'Commissions'->>'affiliate_amount' as affiliate_amount,
    payload_json->'Commissions'->>'commission_amount' as commission_amount,
    payload_json->'Commissions'->>'net_amount' as net_amount,
    payload_json->'Commissions'->>'product_base_price' as product_base_price,
    payload_json->'Commissions'->>'currency' as currency
FROM raw_events 
WHERE payload_json IS NOT NULL
  AND payload_json->'Product'->>'product_name' NOT LIKE '%Example%'
ORDER BY received_at DESC 
LIMIT 10;

-- Comparar com Example Products (que funcionam)
SELECT 
    'Example Products' as tipo,
    payload_json->'Commissions' as commissions
FROM raw_events 
WHERE payload_json->'Product'->>'product_name' LIKE '%Example%'
LIMIT 2

UNION ALL

SELECT 
    'Real Kiwify Orders' as tipo,
    payload_json->'Commissions' as commissions
FROM raw_events 
WHERE payload_json->'Product'->>'product_name' NOT LIKE '%Example%'
  AND payload_json IS NOT NULL
LIMIT 2;