-- LIMPEZA FINAL DO BANCO - APENAS TABELAS EXISTENTES
-- Execute no SQL Editor do Supabase (um comando por vez)

-- Passo 1: Verificar dados atuais
SELECT 'raw_events' as tabela, count(*) as total FROM raw_events
UNION ALL
SELECT 'orders', count(*) FROM orders  
UNION ALL
SELECT 'customers', count(*) FROM customers
UNION ALL
SELECT 'products', count(*) FROM products
UNION ALL
SELECT 'payments', count(*) FROM payments;

-- Passo 2: Limpar dados transacionais (relacionados)
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

-- Passo 8: Limpar dados de mídia/anúncios
DELETE FROM attribution;

-- Passo 9:
DELETE FROM last_touch;

-- Passo 10:
DELETE FROM ad_insights_daily;

-- Passo 11:
DELETE FROM ads;

-- Passo 12:
DELETE FROM adsets;

-- Passo 13:
DELETE FROM campaigns;

-- Passo 14:
DELETE FROM expenses;

-- Passo 15: Limpar eventos de teste específicos
DELETE FROM raw_events WHERE payload_json->>'order_id' = 'test_123';

-- Passo 16:
DELETE FROM raw_events WHERE payload_json->>'order_id' = 'debug_456';

-- Passo 17: Limpar por email de teste
DELETE FROM raw_events WHERE payload_json->'Customer'->>'email' = 'teste@email.com';

-- Passo 18:
DELETE FROM raw_events WHERE payload_json->'Customer'->>'email' = 'debug@test.com';

-- Passo 19: Limpar clientes e produtos de exemplo
DELETE FROM customers;

-- Passo 20:
DELETE FROM products;

-- Passo 21: Verificar resultado final
SELECT 'raw_events' as tabela, count(*) as restante FROM raw_events
UNION ALL
SELECT 'orders', count(*) FROM orders  
UNION ALL  
SELECT 'customers', count(*) FROM customers
UNION ALL
SELECT 'products', count(*) FROM products
UNION ALL
SELECT 'payments', count(*) FROM payments;

-- Passo 22: Ver eventos restantes da Kiwify (se houver)
SELECT 
    id,
    event_type,
    payload_json->>'order_id' as order_id,
    payload_json->'Customer'->>'email' as customer_email,
    received_at
FROM raw_events 
ORDER BY received_at DESC 
LIMIT 10;