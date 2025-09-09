# 🔧 Configurar Variáveis de Ambiente no Vercel

## Método 1: Interface Web (Recomendado)

1. Vá para [vercel.com](https://vercel.com)
2. Selecione seu projeto `connect-sales`
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

### Variáveis Obrigatórias:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://camdhrxwfqkxamdxyviv.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbWRocnh3ZnFreGFtZHh5dml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Nzk3MTIsImV4cCI6MjA3MjM1NTcxMn0.NtGdZqfHYHUCjAmOrtrxD4a4pb2riyhjAbQ26aGa-n0` | Production, Preview, Development |

5. Clique **Save** para cada uma
6. Faça um **Redeploy** do projeto

## Método 2: Via Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# No diretório do projeto frontend
cd frontend

# Configurar variáveis
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Cole: https://camdhrxwfqkxamdxyviv.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  
# Cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbWRocnh3ZnFreGFtZHh5dml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Nzk3MTIsImV4cCI6MjA3MjM1NTcxMn0.NtGdZqfHYHUCjAmOrtrxD4a4pb2riyhjAbQ26aGa-n0

# Fazer redeploy
vercel --prod
```

## ✅ Verificar se Funcionou

Após configurar, teste a API:

```bash
curl https://SEU-PROJETO.vercel.app/api/leads
```

Deve retornar:
```json
{
  "message": "Leads API endpoint is working",
  "timestamp": "2025-01-09T..."
}
```

## 🔥 Importante

- Execute o SQL no Supabase ANTES de testar:
```sql
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
```

- Certifique-se que o Root Directory está como `frontend`