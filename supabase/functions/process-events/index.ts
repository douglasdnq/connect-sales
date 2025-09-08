import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { 
  getSupabaseClient, 
  upsertCustomer, 
  upsertProduct, 
  upsertOrder,
  saveEventError 
} from '../lib/db.ts';
import { normalizeWebhookPayload } from '../lib/normalize.ts';
import { applyAttribution } from '../lib/attribution.ts';
import { createLogger, logMiddleware } from '../lib/logger.ts';

const logger = createLogger({ function: 'process-events' });

async function handler(req: Request): Promise<Response> {
  // Validar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { event_id } = await req.json();
    
    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    logger.info('Processando evento', { event_id });
    
    const client = getSupabaseClient();
    
    // Buscar evento bruto
    const { data: rawEvent, error } = await client
      .from('raw_events')
      .select('*, platforms!inner(name)')
      .eq('id', event_id)
      .single();
    
    if (error || !rawEvent) {
      logger.error('Evento não encontrado', { event_id, error: error?.message });
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const platformName = rawEvent.platforms.name;
    const platformId = rawEvent.platform_id;
    
    logger.info('Evento carregado', { 
      platform: platformName,
      event_type: rawEvent.event_type,
    });
    
    // Normalizar payload
    const normalizedEvent = normalizeWebhookPayload(
      platformName as any,
      rawEvent.payload_json
    );
    
    if (!normalizedEvent) {
      logger.warn('Não foi possível normalizar evento', { 
        platform: platformName,
        event_type: rawEvent.event_type,
      });
      
      await saveEventError(
        client,
        platformId,
        'Falha ao normalizar payload',
        rawEvent.payload_json
      );
      
      return new Response(JSON.stringify({ 
        error: 'Failed to normalize event' 
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Processar baseado no tipo de evento
    let result = null;
    
    switch (normalizedEvent.type) {
      case 'order_created':
        result = await processOrderCreated(client, platformId, normalizedEvent);
        break;
        
      case 'order_paid':
        result = await processOrderPaid(client, platformId, normalizedEvent);
        break;
        
      case 'refund':
        result = await processRefund(client, platformId, normalizedEvent);
        break;
        
      case 'chargeback':
        result = await processChargeback(client, platformId, normalizedEvent);
        break;
        
      case 'subscription_renewed':
        result = await processSubscriptionRenewed(client, platformId, normalizedEvent);
        break;
        
      case 'enrollment':
        result = await processEnrollment(client, platformId, normalizedEvent);
        break;
        
      default:
        logger.warn('Tipo de evento não suportado', { 
          type: normalizedEvent.type,
        });
        
        await saveEventError(
          client,
          platformId,
          `Tipo de evento não suportado: ${normalizedEvent.type}`,
          rawEvent.payload_json
        );
    }
    
    logger.info('Evento processado com sucesso', { 
      event_id,
      result,
    });
    
    return new Response(JSON.stringify({ 
      status: 'processed',
      event_id,
      result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    logger.error('Erro ao processar evento', { 
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

// Processar ordem criada
async function processOrderCreated(client: any, platformId: number, event: any) {
  // Upsert cliente
  const customerId = await upsertCustomer(client, event.customer);
  
  // Upsert produtos
  const productIds = [];
  for (const item of event.products) {
    const productId = await upsertProduct(client, platformId, item.product);
    productIds.push({ 
      product_id: productId, 
      qty: item.qty, 
      unit_price: item.unit_price 
    });
  }
  
  // Criar/atualizar pedido
  const orderId = await upsertOrder(client, platformId, {
    platform_order_id: event.platform_order_id,
    customer_id: customerId,
    order_date: event.order_date,
    currency: event.currency,
    gross_amount: event.gross_amount,
    net_amount: event.net_amount,
    status: event.status,
  });
  
  // Criar itens do pedido
  for (const item of productIds) {
    await client.from('order_items').insert({
      order_id: orderId,
      product_id: item.product_id,
      qty: item.qty,
      unit_price: item.unit_price,
    });
  }
  
  // Aplicar atribuição
  const attribution = {
    utm_source: event.utm_source,
    utm_medium: event.utm_medium,
    utm_campaign: event.utm_campaign,
    utm_content: event.utm_content,
    utm_term: event.utm_term,
  };
  
  await applyAttribution(
    orderId,
    event.customer.email,
    event.customer.cpf,
    attribution
  );
  
  // Se já estiver pago, criar registro de pagamento
  if (event.status === 'paid' && event.payment_method) {
    await client.from('payments').insert({
      order_id: orderId,
      method: event.payment_method,
      paid_at: event.order_date,
      amount: event.gross_amount,
      status: 'completed',
    });
  }
  
  return { order_id: orderId, customer_id: customerId };
}

// Processar pagamento aprovado
async function processOrderPaid(client: any, platformId: number, event: any) {
  // Buscar pedido
  const { data: order } = await client
    .from('orders')
    .select('id')
    .eq('platform_id', platformId)
    .eq('platform_order_id', event.platform_order_id)
    .single();
  
  if (!order) {
    throw new Error(`Pedido não encontrado: ${event.platform_order_id}`);
  }
  
  // Atualizar status do pedido
  await client
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', order.id);
  
  // Criar registro de pagamento
  await client.from('payments').insert({
    order_id: order.id,
    method: event.payment_method,
    paid_at: event.paid_at,
    amount: event.amount,
    fee: event.fee,
    tax: event.tax,
    status: 'completed',
  });
  
  return { order_id: order.id };
}

// Processar reembolso
async function processRefund(client: any, platformId: number, event: any) {
  // Buscar pedido
  const { data: order } = await client
    .from('orders')
    .select('id')
    .eq('platform_id', platformId)
    .eq('platform_order_id', event.platform_order_id)
    .single();
  
  if (!order) {
    throw new Error(`Pedido não encontrado para reembolso: ${event.platform_order_id}`);
  }
  
  // Atualizar status do pedido
  await client
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', order.id);
  
  // Criar registro de reembolso
  await client.from('refunds').insert({
    order_id: order.id,
    refund_at: event.refund_at,
    amount: event.amount,
    reason: event.reason,
  });
  
  return { order_id: order.id };
}

// Processar chargeback
async function processChargeback(client: any, platformId: number, event: any) {
  // Buscar pedido
  const { data: order } = await client
    .from('orders')
    .select('id')
    .eq('platform_id', platformId)
    .eq('platform_order_id', event.platform_order_id)
    .single();
  
  if (!order) {
    throw new Error(`Pedido não encontrado para chargeback: ${event.platform_order_id}`);
  }
  
  // Atualizar status do pedido
  await client
    .from('orders')
    .update({ status: 'chargeback' })
    .eq('id', order.id);
  
  // Criar registro de reembolso (chargeback é um tipo de reembolso)
  await client.from('refunds').insert({
    order_id: order.id,
    refund_at: event.chargeback_at,
    amount: event.amount,
    reason: event.reason || 'Chargeback',
  });
  
  return { order_id: order.id };
}

// Processar renovação de assinatura
async function processSubscriptionRenewed(client: any, platformId: number, event: any) {
  // Upsert cliente
  const customerId = await upsertCustomer(client, event.customer);
  
  // Upsert produto
  const productId = await upsertProduct(client, platformId, event.product);
  
  // Upsert assinatura
  await client.from('subscriptions').upsert({
    platform_id: platformId,
    customer_id: customerId,
    product_id: productId,
    started_at: event.renewed_at,
    status: event.status,
    current_period_end: event.period_end,
  });
  
  return { customer_id: customerId, product_id: productId };
}

// Processar matrícula
async function processEnrollment(client: any, platformId: number, event: any) {
  // Upsert cliente
  const customerId = await upsertCustomer(client, event.customer);
  
  // Upsert produto
  const productId = await upsertProduct(client, platformId, event.product);
  
  // Criar matrícula
  await client.from('enrollments').insert({
    platform_id: platformId,
    customer_id: customerId,
    product_id: productId,
    enrolled_at: event.enrolled_at,
  });
  
  return { customer_id: customerId, product_id: productId };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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