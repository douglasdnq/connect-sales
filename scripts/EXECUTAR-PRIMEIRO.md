# ⚠️ EXECUTAR PRIMEIRO - Adicionar Coluna import_tag

Para que a funcionalidade de importação CSV funcione completamente, você precisa adicionar a coluna `import_tag` na tabela `raw_events`.

## Como executar:

1. **Acesse o Supabase Dashboard**
2. **Vá em SQL Editor** 
3. **Execute o seguinte comando:**

```sql
-- Adicionar coluna import_tag para identificar dados importados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'raw_events' 
        AND column_name = 'import_tag'
    ) THEN
        ALTER TABLE raw_events 
        ADD COLUMN import_tag TEXT NULL;
        
        -- Criar índice para performance
        CREATE INDEX idx_raw_events_import_tag ON raw_events(import_tag);
        
        RAISE NOTICE 'Coluna import_tag adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna import_tag já existe';
    END IF;
END $$;
```

## ✅ Após executar:

1. **Atualize o código** para usar a coluna (remova os valores temporários)
2. **Teste a importação CSV** - ela funcionará completamente
3. **Tags de importação** aparecerão corretamente na interface

## 📝 O que esta coluna faz:

- **Identifica dados importados** vs dados de webhook
- **Permite filtros** por origem dos dados  
- **Mantém rastreabilidade** do histórico de importações
- **Melhora a performance** com índice dedicado

---
**Importante:** Execute este script antes de usar a funcionalidade de importação CSV!