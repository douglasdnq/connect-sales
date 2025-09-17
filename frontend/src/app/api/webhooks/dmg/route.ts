import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('DMG Webhook recebido via API route');

    // Get the request body
    const body = await request.text();

    console.log('DMG Webhook Headers:', Object.fromEntries(request.headers.entries()));
    console.log('DMG Webhook Body:', body.substring(0, 500) + '...');

    // Parse the payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error('Erro ao fazer parse do JSON:', e);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Log important fields from the DMG payload
    console.log('Dados importantes do pedido DMG:', {
      id: payload.id,
      status: payload.status,
      webhook_type: payload.webhook_type,
      customer_email: payload.contact?.email,
      customer_name: payload.contact?.name,
      product_name: payload.product?.name,
      total_value: payload.payment?.total,
      gross_value: payload.payment?.gross,
      created_at: payload.dates?.created_at,
      confirmed_at: payload.dates?.confirmed_at
    });

    // Get or create DMG platform
    let { data: platform, error: platformError } = await supabase
      .from('platforms')
      .select('id')
      .eq('name', 'Digital Manager Guru')
      .single();

    // If platform doesn't exist, create it
    if (platformError || !platform) {
      console.log('Plataforma DMG não encontrada, criando...');
      const { data: newPlatform, error: createError } = await supabase
        .from('platforms')
        .insert({ name: 'Digital Manager Guru' })
        .select('id')
        .single();

      if (createError) {
        console.error('Erro ao criar plataforma DMG:', createError);
        return NextResponse.json(
          { error: 'Erro ao criar plataforma DMG', details: createError.message },
          { status: 500 }
        );
      }

      platform = newPlatform;
      console.log('Plataforma DMG criada com ID:', platform.id);
    }

    // Generate event hash for idempotency (using stable identifiers)
    // Use payload.id + status + webhook_type to create a stable hash that prevents duplicates
    // but allows status updates (like pending -> approved)
    const eventHash = `dmg_${payload.id}_${payload.status}_${payload.webhook_type || 'default'}`;

    // Check if event already exists
    const { data: existingEvent } = await supabase
      .from('raw_events')
      .select('id')
      .eq('event_hash', eventHash)
      .single();

    if (existingEvent) {
      console.log('Evento já processado:', eventHash);
      return NextResponse.json({
        status: 'already_processed',
        message: 'Evento já foi processado anteriormente',
        order_id: payload.id,
        event_hash: eventHash
      }, { status: 200 });
    }

    // Also check for the same DMG order ID with different status to prevent duplicates
    const { data: existingOrderEvents } = await supabase
      .from('raw_events')
      .select('id, event_hash, payload_json')
      .eq('platform_id', platform.id)
      .like('event_hash', `dmg_${payload.id}_%`);

    if (existingOrderEvents && existingOrderEvents.length > 0) {
      console.log(`Encontrados ${existingOrderEvents.length} eventos existentes para o pedido DMG ${payload.id}`);

      // Check if this is exactly the same event (same status)
      const exactMatch = existingOrderEvents.find(event => event.event_hash === eventHash);
      if (exactMatch) {
        console.log('Evento exato já processado:', eventHash);
        return NextResponse.json({
          status: 'already_processed',
          message: 'Evento idêntico já foi processado',
          order_id: payload.id,
          event_hash: eventHash
        }, { status: 200 });
      }
    }

    // Save to raw_events table
    const { data: savedEvent, error: saveError } = await supabase
      .from('raw_events')
      .insert({
        platform_id: platform.id,
        event_type: payload.status,
        payload_json: payload,
        event_hash: eventHash,
        received_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar evento DMG:', saveError);
      return NextResponse.json(
        {
          error: 'Erro ao salvar evento',
          message: saveError.message
        },
        { status: 500 }
      );
    }

    console.log('Evento DMG salvo com sucesso:', savedEvent.id);
    const response = {
      status: 'accepted',
      message: 'Webhook DMG processado e salvo com sucesso',
      order_id: payload.id,
      event_id: savedEvent.id,
      event_hash: eventHash,
      timestamp: new Date().toISOString()
    };

    console.log('Resposta enviada para DMG:', response);

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar webhook DMG via API route:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Handle GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'DMG Webhook Endpoint',
    status: 'active',
    methods: ['POST'],
    description: 'Este endpoint recebe webhooks do Digital Manager Guru via POST',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}