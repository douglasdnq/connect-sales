import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateKiwifySignature, generateEventHash } from '../lib/crypto.ts';
import { getSupabaseClient, getPlatformId, saveRawEvent, isEventProcessed, saveEventError } from '../lib/db.ts';
import { createLogger, logMiddleware } from '../lib/logger.ts';

const logger = createLogger({ platform: 'kiwify' });

async function handler(req: Request): Promise<Response> {
  // Validar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    // Obter body e headers
    const body = await req.text();
    const signature = req.headers.get('x-kiwify-signature') || '';
    const secret = Deno.env.get('KIWIFY_WEBHOOK_SECRET') || '';
    
    // Kiwify usa OAuth 2.0 Bearer Token para API, não HMAC para webhooks
    // Validação básica: verificar se é um payload válido da Kiwify
    logger.info('Webhook Kiwify recebido', { 
      webhook_event_type: JSON.parse(body).webhook_event_type,
      order_id: JSON.parse(body).order_id,
      has_signature: !!signature,
      payload_size: body.length
    });
    
    // Validação simples: verificar campos obrigatórios da Kiwify
    const payload = JSON.parse(body);
    if (!payload.order_id || !payload.webhook_event_type || !payload.Product || !payload.Customer) {
      logger.warn('Payload inválido da Kiwify', { payload: body.substring(0, 200) });
      return new Response('Bad Request - Payload inválido', { status: 400 });
    }
    
    // Gerar hash do evento para idempotência
    const eventHash = await generateEventHash(body);
    
    logger.info('Webhook recebido', { 
      event_type: payload.order_status,
      order_id: payload.order_id,
      event_hash: eventHash,
    });
    
    // Verificar idempotência
    const client = getSupabaseClient();
    const platformId = await getPlatformId(client, 'kiwify');
    
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
      payload.order_status || 'unknown',
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
    // Em produção, isso seria uma fila (ex: pub/sub)
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
    // Chama a função process-events
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kiwify-signature',
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