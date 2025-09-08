-- LIMPEZA SIMPLES DO BANCO DE DADOS
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Ver dados atuais antes da limpeza
SELECT 
  'raw_events' as tabela, 
  count(*) as total,
  count(*) FILTER (WHERE payload_json->>'order_id' LIKE '%test%' OR payload_json->>'order_id' LIKE '%debug%') as eventos_teste
FROM raw_events
UNION ALL
SELECT 'orders', count(*), 0 FROM orders  
UNION ALL
SELECT 'customers', count(*), 0 FROM customers
UNION ALL
SELECT 'products', count(*), 0 FROM products;

-- 2. Limpar dados de exemplo/teste
DELETE FROM refunds;
DELETE FROM payments; 
DELETE FROM order_items;
DELETE FROM subscriptions;
DELETE FROM enrollments;
DELETE FROM orders;

-- 3. Limpar eventos de teste que criamos
DELETE FROM raw_events 
WHERE payload_json->>'order_id' IN ('test_123', 'debug_456')
   OR payload_json->'Customer'->>'email' IN ('teste@email.com', 'debug@test.com');

-- 4. Limpar erros de teste
DELETE FROM event_errors
WHERE payload_json->>'order_id' IN ('test_123', 'debug_456');

-- 5. Limpar clientes e produtos de exemplo (manter estrutura)
DELETE FROM customers;
DELETE FROM products;

-- 6. Limpar dados de mídia de exemplo
DELETE FROM media_attribution;
DELETE FROM ad_insights_daily;

-- 7. Verificar resultado final
SELECT 
  'raw_events' as tabela, 
  count(*) as total_restante
FROM raw_events
UNION ALL
SELECT 'orders', count(*) FROM orders  
UNION ALL
SELECT 'customers', count(*) FROM customers
UNION ALL
SELECT 'products', count(*) FROM products;