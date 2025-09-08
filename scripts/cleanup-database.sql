-- Script para limpar dados de exemplo do banco de dados
-- Mantém apenas dados reais da Kiwify

-- Primeiro, vamos verificar quais dados temos
-- (execute este SELECT primeiro para ver os dados antes de deletar)
-- SELECT 'raw_events' as tabela, count(*) as quantidade FROM raw_events
-- UNION ALL
-- SELECT 'orders', count(*) FROM orders  
-- UNION ALL
-- SELECT 'customers', count(*) FROM customers
-- UNION ALL
-- SELECT 'products', count(*) FROM products
-- UNION ALL
-- SELECT 'platforms', count(*) FROM platforms;

-- Limpar tabelas de fatos (dados transacionais)
DELETE FROM refunds;
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM subscriptions;
DELETE FROM enrollments;

-- Limpar tabelas principais
DELETE FROM orders;

-- Limpar clientes de exemplo (manter apenas os da Kiwify que chegaram via webhook)
DELETE FROM customers 
WHERE id NOT IN (
  SELECT DISTINCT (payload_json->>'Customer'->>'email')::UUID 
  FROM raw_events 
  WHERE platform_id = (SELECT id FROM platforms WHERE name = 'Kiwify')
);

-- Limpar produtos de exemplo (manter apenas os da Kiwify)  
DELETE FROM products
WHERE id NOT IN (
  SELECT DISTINCT (payload_json->>'Product'->>'product_id')::UUID
  FROM raw_events 
  WHERE platform_id = (SELECT id FROM platforms WHERE name = 'Kiwify')
);

-- Limpar dados de atribuição de mídia de exemplo
DELETE FROM media_attribution;
DELETE FROM ad_insights_daily;

-- Manter apenas eventos da Kiwify e limpar eventos de teste
DELETE FROM raw_events 
WHERE event_type LIKE '%test%' 
   OR event_type LIKE '%debug%'
   OR payload_json->>'order_id' LIKE '%test%'
   OR payload_json->>'order_id' LIKE '%debug%';

-- Limpar erros de eventos de teste
DELETE FROM event_errors
WHERE payload_json->>'order_id' LIKE '%test%'
   OR payload_json->>'order_id' LIKE '%debug%';

-- Reset sequences (IDs)
SELECT setval('raw_events_id_seq', COALESCE(MAX(id), 1)) FROM raw_events;
SELECT setval('event_errors_id_seq', COALESCE(MAX(id), 1)) FROM event_errors;

-- Verificar dados restantes após limpeza
SELECT 'raw_events' as tabela, count(*) as quantidade FROM raw_events
UNION ALL
SELECT 'orders', count(*) FROM orders  
UNION ALL
SELECT 'customers', count(*) FROM customers
UNION ALL
SELECT 'products', count(*) FROM products
UNION ALL
SELECT 'platforms', count(*) FROM platforms;