# Configuração do Metabase - Data Hub

## 1. Subir o Metabase

```bash
cd infra
docker-compose -f docker-compose.metabase.yml up -d
```

Aguarde alguns minutos para o Metabase inicializar. Acesse: http://localhost:3000

## 2. Configuração Inicial

1. **Criar conta admin**
   - Nome: Data Hub Admin
   - Email: admin@datahub.local
   - Senha: (escolha uma senha segura)
   - Empresa: Data Hub Analytics

2. **Conectar ao banco de dados principal**
   - Tipo: PostgreSQL
   - Host: host.docker.internal
   - Port: 54322
   - Database: postgres
   - Username: postgres
   - Password: postgres
   - Nome da conexão: "Data Hub - Supabase"

## 3. Dashboards Sugeridos

### Dashboard 1: Painel Executivo (D-1 e MTD)

**Objetivo:** Visão geral de receita, pedidos e performance de mídia

**Cards:**
1. **Receita Líquida (Ontem)**
   ```sql
   SELECT SUM(net_amount) as receita_ontem
   FROM orders 
   WHERE DATE(order_date) = CURRENT_DATE - INTERVAL '1 day'
     AND status = 'paid'
   ```

2. **Receita MTD vs Mês Anterior**
   ```sql
   SELECT 
     'MTD' as periodo,
     SUM(net_amount) as receita
   FROM orders 
   WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE)
     AND status = 'paid'
   
   UNION ALL
   
   SELECT 
     'Mês Anterior' as periodo,
     SUM(net_amount) as receita
   FROM orders 
   WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
     AND status = 'paid'
   ```

3. **Ticket Médio e Volume de Pedidos**
   ```sql
   SELECT * FROM v_revenue_mtd 
   WHERE dia >= CURRENT_DATE - INTERVAL '30 days'
   ORDER BY dia DESC
   ```

4. **ROAS Últimos 7 Dias**
   ```sql
   SELECT * FROM v_roas_7d 
   WHERE roas > 0
   ORDER BY roas DESC
   ```

5. **Lucro Operacional (Ontem)**
   ```sql
   SELECT 
     receita_liquida - ad_spend - operational_expenses as lucro_operacional
   FROM v_daily_performance
   WHERE date = CURRENT_DATE - INTERVAL '1 day'
   ```

### Dashboard 2: Aquisição por Campanha

**Objetivo:** Performance detalhada de campanhas e funil de conversão

**Cards:**
1. **Performance por Campanha (Últimos 30 dias)**
   ```sql
   SELECT 
     utm_campaign,
     SUM(spend) as gasto,
     COUNT(*) as conversoes,
     SUM(revenue) as receita,
     ROUND(SUM(revenue) / SUM(spend), 2) as roas,
     ROUND(SUM(spend) / COUNT(*), 2) as cpa
   FROM fct_campaign_performance
   WHERE date >= CURRENT_DATE - INTERVAL '30 days'
     AND campaign_id IS NOT NULL
   GROUP BY utm_campaign
   ORDER BY receita DESC
   ```

2. **Funil de Conversão Diário**
   ```sql
   SELECT * FROM v_conversion_funnel
   WHERE date >= CURRENT_DATE - INTERVAL '14 days'
   ORDER BY date DESC
   ```

3. **Distribuição por Fonte de Tráfego**
   ```sql
   SELECT 
     a.utm_source,
     COUNT(*) as pedidos,
     SUM(o.net_amount) as receita,
     ROUND(AVG(o.net_amount), 2) as ticket_medio
   FROM orders o
   JOIN attribution a ON o.id = a.order_id
   WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
     AND o.status = 'paid'
   GROUP BY a.utm_source
   ORDER BY receita DESC
   ```

4. **Performance de Adsets Top 10**
   ```sql
   SELECT 
     adset_id,
     SUM(spend) as gasto,
     SUM(clicks) as cliques,
     AVG(cpc) as cpc_medio,
     AVG(ctr) as ctr_medio
   FROM stg_ad_insights
   WHERE date >= CURRENT_DATE - INTERVAL '30 days'
   GROUP BY adset_id
   ORDER BY gasto DESC
   LIMIT 10
   ```

### Dashboard 3: Plataformas (Kiwify/DMG/Cademi/Voomp)

**Objetivo:** Comparativo de performance entre plataformas

**Cards:**
1. **Receita por Plataforma (MTD)**
   ```sql
   SELECT * FROM v_platform_margin
   ORDER BY receita_bruta DESC
   ```

2. **Evolução Mensal por Plataforma**
   ```sql
   SELECT 
     p.name as plataforma,
     DATE_TRUNC('month', o.order_date) as mes,
     COUNT(*) as pedidos,
     SUM(o.net_amount) as receita_liquida
   FROM orders o
   JOIN platforms p ON o.platform_id = p.id
   WHERE o.order_date >= CURRENT_DATE - INTERVAL '12 months'
     AND o.status = 'paid'
   GROUP BY p.name, DATE_TRUNC('month', o.order_date)
   ORDER BY mes DESC, receita_liquida DESC
   ```

3. **Taxa de Conversão por Plataforma**
   ```sql
   SELECT 
     p.name as plataforma,
     COUNT(*) as total_pedidos,
     COUNT(CASE WHEN o.status = 'paid' THEN 1 END) as pedidos_pagos,
     COUNT(CASE WHEN o.status = 'refunded' THEN 1 END) as reembolsos,
     ROUND(
       COUNT(CASE WHEN o.status = 'paid' THEN 1 END)::numeric / 
       COUNT(*)::numeric * 100, 2
     ) as taxa_conversao
   FROM orders o
   JOIN platforms p ON o.platform_id = p.id
   WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
   GROUP BY p.name
   ORDER BY taxa_conversao DESC
   ```

4. **Produtos Mais Vendidos por Plataforma**
   ```sql
   SELECT 
     pl.name as plataforma,
     pr.name as produto,
     COUNT(oi.id) as vendas,
     SUM(oi.qty * oi.unit_price) as receita_produto
   FROM order_items oi
   JOIN orders o ON oi.order_id = o.id
   JOIN products pr ON oi.product_id = pr.id
   JOIN platforms pl ON pr.platform_id = pl.id
   WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
     AND o.status = 'paid'
   GROUP BY pl.name, pr.name
   ORDER BY vendas DESC
   LIMIT 20
   ```

## 4. Configurações Recomendadas

### Filtros Globais
- **Período:** Últimos 30 dias (padrão)
- **Plataforma:** Todas (com opção de filtrar)
- **Status do Pedido:** Apenas 'paid' para métricas de receita

### Refresh de Dados
- Dashboards principais: A cada 1 hora
- Dados de mídia: A cada 4 horas (devido à latência da API Meta)
- Dados financeiros: A cada 30 minutos

### Alertas Sugeridos
1. **Queda de ROAS:** Se ROAS < 2.0 por 2 dias consecutivos
2. **Spike de CAC:** Se CAC aumentar > 50% comparado à média de 7 dias
3. **Queda de conversão:** Se taxa de conversão < 80% da média histórica

## 5. Permissões e Grupos

### Grupo "Executivo"
- Acesso total aos dashboards
- Pode criar/editar perguntas
- Sem acesso ao admin

### Grupo "Marketing"  
- Dashboards de aquisição e campanhas
- Pode criar perguntas sobre mídia e atribuição
- Acesso limitado a dados financeiros sensíveis

### Grupo "Financeiro"
- Dashboards executivo e plataformas
- Acesso completo aos dados de receita/custos
- Pode exportar dados

## 6. Troubleshooting

### Conexão com o banco falha
1. Verifique se o Supabase está rodando: `supabase status`
2. Teste conectividade: `telnet host.docker.internal 54322`
3. Verifique credenciais no `.env`

### Metabase não carrega
1. Verifique logs: `docker logs data-hub-metabase`
2. Restart do container: `docker-compose restart metabase`
3. Verifique se a porta 3000 está livre

### Performance lenta
1. Adicione índices nas colunas mais consultadas
2. Configure cache das perguntas para 1 hora
3. Use agregações pré-calculadas (views materializadas)

## 7. Backup e Manutenção

```bash
# Backup do banco do Metabase
docker exec data-hub-metabase-db pg_dump -U postgres metabase > metabase_backup.sql

# Backup dos dados de configuração
docker cp data-hub-metabase:/metabase-data ./metabase_data_backup

# Limpeza de logs antigos
docker system prune -f
```