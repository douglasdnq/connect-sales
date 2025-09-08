import { getSupabaseClient } from './db';

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  landing_page?: string;
  timestamp?: string;
}

/**
 * Aplica regras de atribuição last non-direct
 */
export async function applyAttribution(
  orderId: string,
  customerEmail?: string,
  customerCpf?: string,
  directAttribution?: AttributionData,
  windowHours: number = 72
): Promise<AttributionData | null> {
  const client = getSupabaseClient();
  
  // Se tem atribuição direta (veio no webhook), usa ela
  if (directAttribution && (directAttribution.utm_source || directAttribution.fbclid || directAttribution.gclid)) {
    await saveAttributionToOrder(client, orderId, directAttribution);
    return directAttribution;
  }
  
  // Busca último toque por email ou CPF
  const attribution = await findLastTouch(client, customerEmail, customerCpf, windowHours);
  
  if (attribution) {
    await saveAttributionToOrder(client, orderId, attribution);
    return attribution;
  }
  
  return null;
}

/**
 * Busca o último toque de um visitante
 */
async function findLastTouch(
  client: any,
  email?: string,
  cpf?: string,
  windowHours: number = 72
): Promise<AttributionData | null> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - windowHours);
  
  let query = client
    .from('last_touch')
    .select('*')
    .gte('touched_at', cutoffTime.toISOString())
    .order('touched_at', { ascending: false })
    .limit(1);
  
  // Busca por email ou CPF
  if (email) {
    query = query.eq('email', email);
  } else if (cpf) {
    query = query.eq('cpf', cpf);
  } else {
    return null;
  }
  
  const { data } = await query.single();
  
  if (!data) return null;
  
  return {
    utm_source: data.utm_source,
    utm_medium: data.utm_medium,
    utm_campaign: data.utm_campaign,
    utm_content: data.utm_content,
    utm_term: data.utm_term,
    fbclid: data.fbclid,
    gclid: data.gclid,
    landing_page: data.landing_page,
    timestamp: data.touched_at,
  };
}

/**
 * Salva atribuição no pedido
 */
async function saveAttributionToOrder(
  client: any,
  orderId: string,
  attribution: AttributionData
): Promise<void> {
  const now = new Date().toISOString();
  
  await client
    .from('attribution')
    .upsert({
      order_id: orderId,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      fbclid: attribution.fbclid,
      gclid: attribution.gclid,
      first_touch_at: attribution.timestamp || now,
      last_touch_at: now,
    });
}

/**
 * Salva toque do pixel
 */
export async function savePixelTouch(
  visitorId: string,
  attribution: AttributionData,
  email?: string,
  cpf?: string
): Promise<void> {
  const client = getSupabaseClient();
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90); // 90 dias de TTL
  
  // Remove toques antigos do mesmo visitante
  await client
    .from('last_touch')
    .delete()
    .eq('visitor_id', visitorId);
  
  // Insere novo toque
  await client
    .from('last_touch')
    .insert({
      visitor_id: visitorId,
      email: email,
      cpf: cpf,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      fbclid: attribution.fbclid,
      gclid: attribution.gclid,
      landing_page: attribution.landing_page,
      touched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  
  // Limpa toques expirados (housekeeping)
  await client
    .from('last_touch')
    .delete()
    .lt('expires_at', now.toISOString());
}

/**
 * Parse de parâmetros UTM de uma URL
 */
export function parseUTMFromURL(url: string): AttributionData {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      fbclid: params.get('fbclid') || undefined,
      gclid: params.get('gclid') || undefined,
      landing_page: url.split('?')[0],
    };
  } catch {
    return {};
  }
}

/**
 * Merge de atribuições (prioriza a mais recente)
 */
export function mergeAttributions(
  existing: AttributionData,
  incoming: AttributionData
): AttributionData {
  return {
    utm_source: incoming.utm_source || existing.utm_source,
    utm_medium: incoming.utm_medium || existing.utm_medium,
    utm_campaign: incoming.utm_campaign || existing.utm_campaign,
    utm_content: incoming.utm_content || existing.utm_content,
    utm_term: incoming.utm_term || existing.utm_term,
    fbclid: incoming.fbclid || existing.fbclid,
    gclid: incoming.gclid || existing.gclid,
    landing_page: incoming.landing_page || existing.landing_page,
    timestamp: incoming.timestamp || existing.timestamp,
  };
}