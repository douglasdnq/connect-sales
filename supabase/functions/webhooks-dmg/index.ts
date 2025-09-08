import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateDMGSignature, generateEventHash } from '../lib/crypto.ts';
import { getSupabaseClient, getPlatformId, saveRawEvent, isEventProcessed, saveEventError } from '../lib/db.ts';
import { createLogger, logMiddleware } from '../lib/logger.ts';

const logger = createLogger({ platform: 'dmg' });

async function handler(req: Request): Promise<Response> {
  // Validar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    // Obter body e headers
    const body = await req.text();
    const signature = req.headers.get('x-dmg-signature') || '';
    const secret = Deno.env.get('DMG_WEBHOOK_SECRET') || '';
    
    // Validar assinatura
    if (!(await validateDMGSignature(body, signature, secret))) {
      logger.warn('Assinatura inválida', { signature });
      const client = getSupabaseClient();
      const platformId = await getPlatformId(client, 'dmg');
      await saveEventError(client, platformId, 'Assinatura HMAC inválida', JSON.parse(body));
      
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Gerar hash do evento para idempotência
    const eventHash = await generateEventHash(body);
    const payload = JSON.parse(body);
    
    logger.info('Webhook recebido', { 
      event_type: payload.status,
      transaction_id: payload.transaction_id,
      event_hash: eventHash,
    });
    
    // Verificar idempotência
    const client = getSupabaseClient();
    const platformId = await getPlatformId(client, 'dmg');
    
    if (await isEventProcessed(client, eventHash)) {
      logger.info('Evento já processado (idempotente)', { event_hash: eventHash });
      return new Response(JSON.stringify({ 
        status: 'already_processed',
        event_hash: eventHash 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Salvar evento bruto
    const eventId = await saveRawEvent(
      client,
      platformId,
      payload.status || 'unknown',
      payload,
      eventHash
    );
    
    if (eventId === 0) {
      logger.info('Evento duplicado detectado', { event_hash: eventHash });
      return new Response(JSON.stringify({ 
        status: 'duplicate',
        event_hash: eventHash 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Processar evento de forma assíncrona
    processEventAsync(eventId);
    
    logger.info('Evento enfileirado para processamento', { 
      event_id: eventId,
      event_hash: eventHash,
    });
    
    return new Response(JSON.stringify({ 
      status: 'accepted',
      event_id: eventId,
      event_hash: eventHash,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    logger.error('Erro ao processar webhook', { 
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Processar evento de forma assíncrona
async function processEventAsync(eventId: number) {
  try {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    await fetch(`${baseUrl}/functions/v1/process-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ event_id: eventId }),
    });
  } catch (error: any) {
    logger.error('Erro ao chamar process-events', {
      event_id: eventId,
      error: error.message,
    });
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dmg-signature',
};

// Wrapper com CORS
serve(logMiddleware(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const response = await handler(req);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}));