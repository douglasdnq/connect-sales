# 🚀 Deploy no Vercel - Connect Sales

Este guia explica como fazer o deploy do Connect Sales no Vercel para integração com Zapier.

## 📋 Pré-requisitos

1. ✅ Código já commitado no Git
2. ✅ Tabela `leads` criada no Supabase  
3. ✅ API `/api/leads` implementada
4. 🔄 Conta no GitHub (para conectar ao Vercel)
5. 🔄 Conta no Vercel (gratuita)

## 🔧 Passos para Deploy

### 1. Criar Repositório no GitHub

1. Vá para [github.com](https://github.com) 
2. Clique em "New repository"
3. Nome: `racing-lucas` ou `connect-sales`  
4. Deixe como **público** (necessário para Vercel gratuito)
5. Clique "Create repository"

### 2. Conectar Projeto Local ao GitHub

```bash
# Adicionar remote do GitHub (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/racing-lucas.git

# Fazer push inicial
git push -u origin main
```

### 3. Deploy no Vercel

1. Vá para [vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique "New Project"
4. Selecione o repositório `racing-lucas`
5. **Framework**: Next.js (detectado automaticamente)
6. **Root Directory**: `frontend` ⚠️ **IMPORTANTE**
7. Configure variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://camdhrxwfqkxamdxyviv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Configurar Supabase RLS

No SQL Editor do Supabase, execute:
```sql
-- Desabilitar RLS para API de leads
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
```

## 🎯 URLs Após Deploy

Após o deploy, você terá:

- **Site**: `https://seu-projeto.vercel.app`
- **API Leads**: `https://seu-projeto.vercel.app/api/leads`
- **Dashboard**: `https://seu-projeto.vercel.app/dashboard`

## 🔗 Configurar no Zapier

No Zapier, configure um Webhook POST:
- **URL**: `https://seu-projeto.vercel.app/api/leads`
- **Method**: POST
- **Content-Type**: `application/json`

### Exemplo de Payload:
```json
{
  "nome_completo": "João Silva",
  "email": "joao@email.com",
  "whatsapp": "11999999999",
  "idade": "30",
  "utm_source": "Instagram_Feed"
}
```

## ✅ Testar Integração

```bash
curl -X POST https://seu-projeto.vercel.app/api/leads \
  -H "Content-Type: application/json" \
  -d '{"nome_completo":"Teste","email":"teste@email.com"}'
```

Resposta esperada:
```json
{
  "success": true,
  "action": "created", 
  "lead_id": "uuid-aqui"
}
```

## 🎉 Pronto!

Agora você tem:
- ✅ App deployado no Vercel
- ✅ URL pública para Zapier  
- ✅ API de leads funcionando
- ✅ Dashboard completo online

## 💡 Próximos Passos

1. Configurar domínio customizado (opcional)
2. Adicionar dashboard de leads 
3. Configurar automações no Zapier
4. Monitorar logs no Vercel