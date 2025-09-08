-- Adicionar coluna import_tag para identificar dados importados
-- Execute no SQL Editor do Supabase

-- Verificar se a coluna já existe
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