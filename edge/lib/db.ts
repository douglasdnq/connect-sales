import { createClient } from '@supabase/supabase-js';

// Tipos do banco de dados
export interface Platform {
  id: number;
  name: string;
}

export interface Customer {
  id: string;
  email?: string;
  phone_e164?: string;
  cpf?: string;
  name?: string;
  created_at: string;
}

export interface Product {
  id: string;
  platform_id: number;
  platform_product_id: string;
  name: string;
  sku?: string;
  is_subscription: boolean;
  list_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  platform_id: number;
  platform_order_id: string;
  customer_id: string;
  order_date: string;
  currency: string;
  gross_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

// Cliente Supabase
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || Deno.env.get('SUPABASE_URL');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Funções auxiliares para operações comuns

/**
 * Busca ou cria um cliente
 */
export async function upsertCustomer(client: any, customer: any): Promise<string> {
  // Primeiro tenta encontrar por email ou CPF
  let existingCustomer = null;
  
  if (customer.email) {
    const { data } = await client
      .from('customers')
      .select('id')
      .eq('email', customer.email)
      .single();
    existingCustomer = data;
  }
  
  if (!existingCustomer && customer.cpf) {
    const { data } = await client
      .from('customers')
      .select('id')
      .eq('cpf', customer.cpf)
      .single();
    existingCustomer = data;
  }
  
  if (existingCustomer) {
    // Atualiza dados do cliente existente
    await client
      .from('customers')
      .update({
        name: customer.name || undefined,
        phone_e164: customer.phone_e164 || undefined,
      })
      .eq('id', existingCustomer.id);
    
    return existingCustomer.id;
  }
  
  // Cria novo cliente
  const { data, error } = await client
    .from('customers')
    .insert(customer)
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

/**
 * Busca ou cria um produto
 */
export async function upsertProduct(
  client: any,
  platformId: number,
  product: any
): Promise<string> {
  // Verifica se produto já existe
  const { data: existing } = await client
    .from('products')
    .select('id')
    .eq('platform_id', platformId)
    .eq('platform_product_id', product.platform_product_id)
    .single();
  
  if (existing) {
    // Atualiza informações do produto
    await client
      .from('products')
      .update({
        name: product.name,
        list_price: product.list_price,
        is_subscription: product.is_subscription,
      })
      .eq('id', existing.id);
    
    return existing.id;
  }
  
  // Cria novo produto
  const { data, error } = await client
    .from('products')
    .insert({
      ...product,
      platform_id: platformId,
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

/**
 * Busca ID da plataforma pelo nome
 */
export async function getPlatformId(client: any, platformName: string): Promise<number> {
  const { data, error } = await client
    .from('platforms')
    .select('id')
    .eq('name', platformName)
    .single();
  
  if (error || !data) {
    throw new Error(`Plataforma não encontrada: ${platformName}`);
  }
  
  return data.id;
}

/**
 * Verifica se evento já foi processado (idempotência)
 */
export async function isEventProcessed(client: any, eventHash: string): Promise<boolean> {
  const { data } = await client
    .from('raw_events')
    .select('id')
    .eq('event_hash', eventHash)
    .single();
  
  return !!data;
}

/**
 * Salva evento bruto
 */
export async function saveRawEvent(
  client: any,
  platformId: number,
  eventType: string,
  payload: any,
  eventHash: string
): Promise<number> {
  const { data, error } = await client
    .from('raw_events')
    .insert({
      platform_id: platformId,
      event_type: eventType,
      payload_json: payload,
      event_hash: eventHash,
    })
    .select('id')
    .single();
  
  if (error) {
    // Se for erro de duplicação, retorna 0
    if (error.code === '23505') {
      return 0;
    }
    throw error;
  }
  
  return data.id;
}

/**
 * Salva erro de processamento
 */
export async function saveEventError(
  client: any,
  platformId: number,
  reason: string,
  payload: any
): Promise<void> {
  await client
    .from('event_errors')
    .insert({
      platform_id: platformId,
      reason: reason,
      payload_json: payload,
    });
}

/**
 * Cria ou atualiza pedido
 */
export async function upsertOrder(
  client: any,
  platformId: number,
  order: any
): Promise<string> {
  // Verifica se pedido já existe
  const { data: existing } = await client
    .from('orders')
    .select('id')
    .eq('platform_id', platformId)
    .eq('platform_order_id', order.platform_order_id)
    .single();
  
  if (existing) {
    // Atualiza pedido existente
    await client
      .from('orders')
      .update({
        status: order.status,
        net_amount: order.net_amount,
        gross_amount: order.gross_amount,
      })
      .eq('id', existing.id);
    
    return existing.id;
  }
  
  // Cria novo pedido
  const { data, error } = await client
    .from('orders')
    .insert({
      ...order,
      platform_id: platformId,
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

/**
 * Salva atribuição
 */
export async function saveAttribution(
  client: any,
  orderId: string,
  attribution: any
): Promise<void> {
  await client
    .from('attribution')
    .upsert({
      order_id: orderId,
      ...attribution,
    });
}