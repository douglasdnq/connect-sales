-- LIMPEZA DO BANCO PASSO A PASSO
-- Execute um comando por vez no SQL Editor do Supabase

-- Passo 1: Ver dados atuais
SELECT 'raw_events' as tabela, count(*) as total FROM raw_events
UNION ALL
SELECT 'orders', count(*) FROM orders  
UNION ALL
SELECT 'customers', count(*) FROM customers
UNION ALL
SELECT 'products', count(*) FROM products;

-- Passo 2: Limpar tabelas relacionadas (execute um por vez)
DELETE FROM refunds;

-- Passo 3:
DELETE FROM payments;

-- Passo 4: 
DELETE FROM order_items;

-- Passo 5:
DELETE FROM subscriptions;

-- Passo 6:
DELETE FROM enrollments;

-- Passo 7:
DELETE FROM orders;

-- Passo 8: Limpar eventos de teste específicos
DELETE FROM raw_events WHERE payload_json->>'order_id' = 'test_123';

-- Passo 9:
DELETE FROM raw_events WHERE payload_json->>'order_id' = 'debug_456';

-- Passo 10: Limpar por email de teste
DELETE FROM raw_events WHERE payload_json->'Customer'->>'email' = 'teste@email.com';

-- Passo 11:
DELETE FROM raw_events WHERE payload_json->'Customer'->>'email' = 'debug@test.com';

-- Passo 12: Limpar todas as demais tabelas
DELETE FROM customers;

-- Passo 13:
DELETE FROM products;

-- Passo 14:
DELETE FROM media_attribution;

-- Passo 15:
DELETE FROM ad_insights_daily;

-- Passo 16: Verificar resultado final
SELECT 'raw_events' as tabela, count(*) as restante FROM raw_events
UNION ALL
SELECT 'orders', count(*) FROM orders  
UNION ALL  
SELECT 'customers', count(*) FROM customers
UNION ALL
SELECT 'products', count(*) FROM products;