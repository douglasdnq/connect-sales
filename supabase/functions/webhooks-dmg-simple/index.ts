import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dmg-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Get the request body
    const body = await req.text();

    console.log('DMG Webhook recebido:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body: body.substring(0, 500) + '...' // Log first 500 chars
    });

    // Parse the payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error('Erro ao fazer parse do JSON:', e);
      return new Response(JSON.stringify({
        error: 'Invalid JSON payload'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log important fields
    console.log('Dados do pedido DMG:', {
      id: payload.id,
      status: payload.status,
      customer_email: payload.contact?.email,
      product_name: payload.product?.name,
      total_value: payload.payment?.total,
      created_at: payload.dates?.created_at
    });

    // Return success response
    const response = {
      status: 'success',
      message: 'Webhook processado com sucesso',
      order_id: payload.id,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro ao processar webhook DMG:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});