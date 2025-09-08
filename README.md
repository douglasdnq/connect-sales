# 🚀 Data Hub MVP - Integração de Infoprodutos

Sistema completo de integração de plataformas de infoprodutos (Kiwify, Digital Manager Guru, Cademi, Voomp) com sincronização de custos do Meta Ads, normalização em Postgres (Supabase) e dashboards via Metabase.

## 🎯 Objetivo de Negócio

Centralizar dados de múltiplas fontes para fornecer ao time uma visão diária e mensal de:

- **Receita:** Bruta, líquida, pedidos, ticket médio, reembolsos, chargebacks
- **Mídia:** Spend, CPM, CPC, CTR, CPA, ROAS do Meta Ads
- **Margem:** Por plataforma (taxas, comissões) e lucro operacional
- **Atribuição:** Last non-direct via pixel 1st-party com UTMs

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Plataformas   │    │   Supabase Edge  │    │   Postgres DB   │
│                 │───▶│    Functions     │───▶│   (Normalizado) │
│ • Kiwify        │    │                  │    │                 │
│ • DMG           │    │ • Webhooks       │    │ • orders        │
│ • Cademi        │    │ • Process Events │    │ • customers     │
│ • Voomp         │    │ • Meta Sync      │    │ • attribution   │
└─────────────────┘    │ • Pixel Ingest   │    │ • ad_insights   │
                       └──────────────────┘    └─────────────────┘
                                ▲                        │
┌─────────────────┐             │               ┌─────────────────┐
│   Pixel 1st     │─────────────┘               │   Metabase      │
│    Party JS     │                             │   Dashboards    │
│                 │                             │                 │
│ • UTM Tracking  │                             │ • Painel Exec   │
│ • Attribution   │                             │ • Aquisição     │
└─────────────────┘                             │ • Plataformas   │
                                                └─────────────────┘
┌─────────────────┐
│   Meta Ads API  │───────────────────────────────▶ Cron Job
│   (Marketing)   │                                (Diário)
└─────────────────┘
```

## 📁 Estrutura do Projeto

```
/
├── README.md                    # Este arquivo
├── .env.example                # Variáveis de ambiente
├── package.json                # Dependências Node.js
├── vitest.config.ts            # Configuração de testes
│
├── /db                         # Banco de dados
│   ├── /migrations             # Migrações SQL numeradas
│   │   ├── 001_create_dimensions.sql
│   │   ├── 002_create_facts.sql
│   │   ├── 003_create_media_attribution.sql
│   │   └── 004_create_views.sql
│   └── seed.sql                # Dados de exemplo
│
├── /edge                       # Supabase Edge Functions
│   ├── /functions
│   │   ├── /webhooks-kiwify    # Webhook Kiwify
│   │   ├── /webhooks-dmg       # Webhook DMG
│   │   ├── /webhooks-cademi    # Webhook Cademi
│   │   ├── /webhooks-voomp     # Webhook Voomp
│   │   ├── /ingest-pixel       # Pixel 1st-party
│   │   ├── /process-events     # Processamento de eventos
│   │   └── /meta-sync          # Sincronização Meta Ads
│   └── /lib                    # Bibliotecas compartilhadas
│       ├── crypto.ts           # Validação HMAC
│       ├── db.ts               # Helpers Supabase
│       ├── normalize.ts        # Normalização de payloads
│       ├── zod-schemas.ts      # Validação de dados
│       ├── logger.ts           # Sistema de logs
│       └── attribution.ts     # Lógica de atribuição
│
├── /app-pixel                  # Pixel JavaScript
│   ├── index.html              # Exemplo de uso
│   └── /public
│       └── dq_pixel.js         # Script do pixel
│
├── /transform                  # dbt (opcional)
│   └── /dbt
│       ├── dbt_project.yml
│       ├── profiles.yml
│       └── /models
│           ├── /staging        # Camada staging
│           └── /marts          # Camada marts
│
├── /tests                      # Testes unitários
│   ├── normalize.test.ts       # Teste de normalização
│   ├── idempotency.test.ts     # Teste de idempotência
│   └── attribution.test.ts     # Teste de atribuição
│
└── /infra                      # Infraestrutura
    ├── docker-compose.metabase.yml
    └── metabase-setup.md       # Guia de setup do Metabase
```

## 🚦 Pré-requisitos

- **Node.js** 20+ 
- **pnpm** 8+
- **Supabase CLI** ([Instalação](https://supabase.com/docs/guides/cli/getting-started))
- **Docker** (para Metabase)
- **Contas de API:**
  - Meta Ads (Business Manager + Access Token)
  - Webhooks das plataformas configurados

## ⚡ Setup Rápido

### 1. Instalação e Configuração

```bash
# Clonar e instalar dependências
git clone <repo-url>
cd data-hub-mvp
pnpm install

# Configurar ambiente
cp .env.example .env
# Edite .env com suas credenciais
```

### 2. Configurar Supabase Local

```bash
# Inicializar projeto Supabase (se necessário)
supabase init

# Iniciar Supabase local
supabase start

# Aplicar migrações
supabase db reset

# Popular dados de exemplo
pnpm seed
```

### 3. Deploy das Edge Functions

```bash
# Deploy de todas as functions
supabase functions deploy webhooks-kiwify
supabase functions deploy webhooks-dmg  
supabase functions deploy webhooks-cademi
supabase functions deploy webhooks-voomp
supabase functions deploy process-events
supabase functions deploy ingest-pixel
supabase functions deploy meta-sync
```

### 4. Configurar Webhooks nas Plataformas

Configure os webhooks nas plataformas apontando para:

- **Kiwify:** `https://your-project.supabase.co/functions/v1/webhooks-kiwify`
- **DMG:** `https://your-project.supabase.co/functions/v1/webhooks-dmg` 
- **Cademi:** `https://your-project.supabase.co/functions/v1/webhooks-cademi`
- **Voomp:** `https://your-project.supabase.co/functions/v1/webhooks-voomp`

**Headers obrigatórios:**
- `Content-Type: application/json`
- `X-[Platform]-Signature: <hmac-signature>`

### 5. Configurar Pixel no Site

```html
<!-- Adicionar no <head> de todas as páginas -->
<script 
  src="https://your-site.com/dq_pixel.js" 
  data-auto-init="true">
</script>

<script>
  // Configurar endpoint
  DQPixel.init({
    endpoint: 'https://your-project.supabase.co/functions/v1/ingest-pixel'
  });
</script>
```

### 6. Configurar Metabase

```bash
# Subir Metabase
cd infra
docker-compose -f docker-compose.metabase.yml up -d

# Aguardar inicialização e acessar
open http://localhost:3000
```

Siga o guia em `infra/metabase-setup.md` para configuração completa.

### 7. Configurar Meta Ads Sync (Cron)

Configure um cron job ou use o Supabase Edge Scheduler:

```bash
# Teste manual
curl -X POST https://your-project.supabase.co/functions/v1/meta-sync

# Agendar diariamente às 08:00 (America/Recife)
# Via Supabase Dashboard > Database > Cron Jobs
```

## 🧪 Executar Testes

```bash
# Testes unitários
pnpm test

# Testes com watch mode
pnpm test:watch

# Rodar Edge Functions localmente
pnpm dev:edge
```

## 📊 Exemplos de Payloads

### Kiwify Webhook
```json
{
  \"order_id\": \"KIWI_123456\",
  \"order_status\": \"approved\",
  \"product_id\": \"prod_abc\",
  \"product_name\": \"Curso de Marketing\",
  \"customer_email\": \"joao@example.com\",
  \"customer_name\": \"João Silva\",
  \"value\": 497.00,
  \"payment_method\": \"credit_card\",
  \"created_at\": \"2024-01-15T10:30:00Z\",
  \"utm_source\": \"facebook\",
  \"utm_campaign\": \"black_friday\"
}
```

### Digital Manager Guru Webhook
```json
{
  \"transaction_id\": \"DMG_987654\",
  \"status\": \"completed\",
  \"product\": {
    \"id\": \"ebook_001\",
    \"name\": \"E-book Vendas Online\",
    \"price\": 97.00
  },
  \"buyer\": {
    \"email\": \"pedro@example.com\",
    \"name\": \"Pedro Oliveira\",
    \"cpf\": \"11122233344\"
  },
  \"payment\": {
    \"method\": \"boleto\",
    \"amount\": 97.00,
    \"fee\": 3.50
  }
}
```

### Pixel JavaScript Usage
```javascript
// Capturar email no checkout
DQPixel.pushEmail('customer@example.com');

// Capturar CPF
DQPixel.pushCPF('12345678901');

// Rastrear eventos customizados
DQPixel.track('purchase', {
  order_id: 'ORD_123',
  value: 497.00,
  currency: 'BRL'
});
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev:edge              # Rodar Edge Functions localmente
pnpm test                  # Executar testes
pnpm test:watch           # Testes em modo watch

# Banco de dados
pnpm db:migrate           # Aplicar migrações
pnpm seed                 # Inserir dados de exemplo

# Utilitários
pnpm type-check           # Verificar tipos TypeScript
```

## 📈 Monitoramento e Logs

### Logs das Edge Functions
```bash
# Logs em tempo real
supabase functions logs --follow

# Logs de uma function específica
supabase functions logs webhooks-kiwify
```

### Métricas Importantes
- **Taxa de Sucesso:** Webhooks processados vs recebidos
- **Latência:** Tempo de processamento de eventos
- **Errors:** Eventos que falharam na normalização
- **ROAS:** Return on Ad Spend por campanha
- **CAC:** Customer Acquisition Cost

## 🐛 Troubleshooting

### Webhook não está sendo processado
1. Verificar assinatura HMAC no header
2. Validar formato do payload via logs
3. Confirmar se a plataforma está cadastrada em `platforms`

### Meta Ads Sync falhando
1. Verificar `META_ACCESS_TOKEN` nas variáveis
2. Confirmar permissões da conta no Business Manager
3. Verificar rate limits da API

### Pixel não está rastreando
1. Verificar CORS no `PIXEL_ALLOWED_ORIGINS`
2. Confirmar se o endpoint está correto
3. Verificar console do browser para erros

### Performance do Metabase
1. Adicionar índices nas colunas mais consultadas
2. Otimizar queries com agregações
3. Configurar cache adequado

## 🔐 Segurança

- ✅ Validação HMAC obrigatória em todos os webhooks
- ✅ CORS configurável para o pixel
- ✅ Rate limiting básico implementado
- ✅ Logs estruturados com request IDs
- ✅ Dados sensíveis não expostos nos logs
- ✅ Idempotência garantida por hash de eventos

## 📝 Próximos Passos (Roadmap)

### Curto Prazo
- [ ] Webhooks para Google Ads e TikTok Ads
- [ ] Dashboard mobile-friendly  
- [ ] Alertas automáticos (Slack/Email)
- [ ] Backup automatizado dos dados

### Médio Prazo  
- [ ] Machine Learning para previsão de LTV
- [ ] Segmentação automática de clientes
- [ ] A/B testing framework
- [ ] API pública para integrações

### Longo Prazo
- [ ] Real-time streaming com Apache Kafka
- [ ] Data warehouse com BigQuery/Snowflake
- [ ] Advanced attribution modeling
- [ ] Compliance LGPD/GDPR completo

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit suas mudanças: `git commit -m 'feat: adicionar nova feature'`
4. Push para a branch: `git push origin feature/nova-feature`
5. Abra um Pull Request

## 📜 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique a documentação em `/infra/metabase-setup.md`
2. Rode os testes para validar a instalação: `pnpm test`
3. Consulte os logs: `supabase functions logs`
4. Abra uma issue no repositório com detalhes do problema

---

**⚡ Desenvolvido com foco em performance, qualidade e facilidade de uso.**