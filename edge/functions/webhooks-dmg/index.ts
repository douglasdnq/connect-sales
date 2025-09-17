import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateDMGSignature, generateEventHash } from '../../lib/crypto.ts';
import { getSupabaseClient, getPlatformId, saveRawEvent, isEventProcessed, saveEventError } from '../../lib/db.ts';
import { createLogger, logMiddleware } from '../../lib/logger.ts';

const logger = createLogger({ platform: 'dmg' });

async function handler(req: Request): Promise<Response> {
  // Retornar sucesso temporariamente para parar reenvios do DMG
  console.log('DMG Webhook recebido - método:', req.method);

  // Validar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    console.log('DMG Webhook body recebido:', body);

    // Retornar sucesso para parar o reenvio
    return new Response(JSON.stringify({
      status: 'accepted',
      message: 'Webhook recebido com sucesso',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro ao processar webhook DMG:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
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