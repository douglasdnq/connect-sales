-- Script para corrigir fuso horário dos leads existentes
-- Subtrai 3 horas dos form_date para converter UTC para horário de Brasília

-- Primeiro, vamos ver quantos leads serão afetados
SELECT COUNT(*) as total_leads,
       COUNT(CASE WHEN form_date IS NOT NULL THEN 1 END) as leads_with_form_date,
       COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 year' THEN 1 END) as recent_leads
FROM leads;

-- Atualizar apenas leads recentes (últimos 12 meses) com form_date
UPDATE leads 
SET form_date = form_date - INTERVAL '3 hours',
    updated_at = NOW()
WHERE form_date IS NOT NULL 
  AND created_at > NOW() - INTERVAL '1 year'
  AND form_date > NOW() - INTERVAL '1 year';

-- Verificar o resultado
SELECT COUNT(*) as leads_atualizados
FROM leads 
WHERE updated_at > NOW() - INTERVAL '1 minute';