import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { PixelPayloadSchema } from '../lib/zod-schemas.ts';
import { savePixelTouch } from '../lib/attribution.ts';
import { createLogger, logMiddleware } from '../lib/logger.ts';

const logger = createLogger({ function: 'ingest-pixel' });

async function handler(req: Request): Promise<Response> {
  // Validar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    // Validar origem
    const origin = req.headers.get('origin') || '';
    const allowedOrigins = (Deno.env.get('PIXEL_ALLOWED_ORIGINS') || '').split(',');
    
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      logger.warn('Origem não permitida', { origin, allowed: allowedOrigins });
      return new Response('Forbidden', { status: 403 });
    }
    
    // Parse e validação do payload
    const body = await req.json();
    const validation = PixelPayloadSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('Payload inválido', { 
        errors: validation.error.errors,
        body,
      });
      
      return new Response(JSON.stringify({ 
        error: 'Invalid payload',
        details: validation.error.errors,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const data = validation.data;
    
    logger.info('Pixel recebido', {
      visitor_id: data.visitor_id,
      has_email: !!data.email,
      has_cpf: !!data.cpf,
      utm_source: data.utm_source,
      utm_campaign: data.utm_campaign,
    });
    
    // Salvar toque
    await savePixelTouch(
      data.visitor_id,
      {
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        fbclid: data.fbclid,
        gclid: data.gclid,
        landing_page: data.landing_page,
        timestamp: data.timestamp,
      },
      data.email,
      data.cpf
    );
    
    logger.info('Toque salvo com sucesso', {
      visitor_id: data.visitor_id,
    });
    
    // Retornar pixel transparente 1x1
    const pixelGif = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
      0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21,
      0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
      0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);
    
    return new Response(pixelGif, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error: any) {
    logger.error('Erro ao processar pixel', { 
      error: error.message,
      stack: error.stack,
    });
    
    // Retorna pixel mesmo em caso de erro (não quebra o site)
    const pixelGif = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
      0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21,
      0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
      0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);
    
    return new Response(pixelGif, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

// CORS headers configuráveis
function getCorsHeaders(origin: string): Record<string, string> {
  const allowedOrigins = (Deno.env.get('PIXEL_ALLOWED_ORIGINS') || '*').split(',');
  const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Wrapper com CORS
serve(logMiddleware(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders,
    });
  }
  
  const response = await handler(req);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  
  return response;
}));