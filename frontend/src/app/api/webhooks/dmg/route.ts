import { NextRequest, NextResponse } from 'next/server';

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

    // Here you could forward to the Supabase function with auth header
    // or process directly in the database

    // For now, just return success to stop DMG retries
    const response = {
      status: 'success',
      message: 'Webhook DMG processado com sucesso via API route',
      order_id: payload.id,
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