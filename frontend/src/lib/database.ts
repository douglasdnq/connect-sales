import { supabase } from './supabase'
import type { Order, Customer, RawEvent, EventError, Platform, AdInsight } from './supabase'

// Dashboard data fetching
export async function getDashboardStats() {
  // Get recent orders count
  const { data: orders } = await supabase
    .from('orders')
    .select('id, gross_amount, status, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  // Get total revenue this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data: monthlyOrders } = await supabase
    .from('orders')
    .select('gross_amount, net_amount')
    .eq('status', 'paid')
    .gte('created_at', startOfMonth)

  // Get recent events
  const { data: recentEvents } = await supabase
    .from('raw_events')
    .select('id, event_type, received_at, platform_id, platforms(name)')
    .order('received_at', { ascending: false })
    .limit(10)

  // Get error count
  const { count: errorCount } = await supabase
    .from('event_errors')
    .select('id', { count: 'exact' })
    .gte('error_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const totalRevenue = monthlyOrders?.reduce((sum, order) => sum + (order.gross_amount || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const paidOrders = orders?.filter(o => o.status === 'paid').length || 0
  
  return {
    totalOrders,
    paidOrders,
    totalRevenue,
    recentEvents: recentEvents || [],
    errorCount: errorCount || 0
  }
}

// Orders - agora buscando diretamente dos webhooks da Kiwify
export async function getOrders(limit?: number, startDate?: string, endDate?: string) {
  let query = supabase
    .from('raw_events')
    .select(`
      id,
      event_type,
      payload_json,
      received_at,
      import_tag,
      platforms(name)
    `)

  // Aplicar filtro de data início se fornecido (ajustar para horário Brasil UTC-3)
  if (startDate) {
    // Criar data no horário local e converter para UTC
    const startDateTime = new Date(`${startDate}T00:00:00.000-03:00`)
    query = query.gte('received_at', startDateTime.toISOString())
    console.log(`Filtro início: ${startDate} -> ${startDateTime.toISOString()}`)
  }

  // Aplicar filtro de data fim se fornecido (ajustar para horário Brasil UTC-3) 
  if (endDate) {
    // Criar data no horário local (final do dia) e converter para UTC
    const endDateTime = new Date(`${endDate}T23:59:59.999-03:00`)
    query = query.lte('received_at', endDateTime.toISOString())
    console.log(`Filtro fim: ${endDate} -> ${endDateTime.toISOString()}`)
  }

  const { data, error } = await query.order('received_at', { ascending: false })

  if (error) return { data: null, error }

  // Transformar dados do webhook para formato de pedidos
  const allTransformedData = data?.map(event => {
    
    return {
      id: event.id.toString(),
      platform_order_id: event.payload_json?.order_id || 'N/A',
      order_date: event.received_at,
      created_at: event.received_at,
      status: (() => {
        const orderStatus = event.payload_json?.order_status?.toLowerCase()
        const webhookEvent = event.payload_json?.webhook_event_type?.toLowerCase()
        
        // Debug do status
        console.log(`Status debug - order_status: ${orderStatus}, webhook_event_type: ${webhookEvent}`)
        
        // Mapear status baseado nos campos da Kiwify
        if (orderStatus === 'approved' || webhookEvent?.includes('approved')) return 'paid'
        if (orderStatus === 'paid' || webhookEvent?.includes('paid')) return 'paid'
        if (orderStatus === 'refunded' || webhookEvent?.includes('refund')) return 'refunded'
        if (orderStatus === 'canceled' || webhookEvent?.includes('cancel')) return 'canceled'
        if (orderStatus === 'chargeback' || webhookEvent?.includes('chargeback')) return 'chargeback'
        
        return 'pending' // default
      })(),
      gross_amount: (() => {
        const rawValue = event.payload_json?.Commissions?.product_base_price || 0
        const convertedValue = rawValue / 100
        return convertedValue
      })(),
      net_amount: (() => {
        const commissions = event.payload_json?.Commissions
        
        // Campo principal para comissões na Kiwify: my_commission
        const myCommission = commissions?.my_commission
        // Campo usado nos Example Products: settlement_amount  
        const settlementAmount = commissions?.settlement_amount
        
        // Priorizar my_commission que é usado nas ordens reais da Kiwify
        const rawValue = myCommission || settlementAmount || 0
        const convertedValue = rawValue / 100
        
        return convertedValue
      })(),
      currency: event.payload_json?.Commissions?.currency || 'BRL',
      customer_name: event.payload_json?.Customer?.full_name || 'N/A',
      customer_email: event.payload_json?.Customer?.email || 'N/A',
      product_name: event.payload_json?.Product?.product_name || 'N/A',
      product_id: event.payload_json?.Product?.product_id || 'N/A',
      platform_name: event.platforms?.name || 'Kiwify',
      webhook_payload: event.payload_json, // Para o modal
      import_tag: event.import_tag, // Tag de importação
      is_imported: !!event.import_tag, // Boolean para identificar se foi importado
      platforms: event.platforms,
      customers: {
        name: event.payload_json?.Customer?.full_name,
        email: event.payload_json?.Customer?.email
      }
    }
  })

  // Agrupar por platform_order_id e manter apenas o mais recente de cada pedido
  const uniqueOrdersMap = new Map()
  
  allTransformedData?.forEach(order => {
    const orderId = order.platform_order_id
    
    // Pular pedidos sem ID válido (para evitar agrupar todos os "N/A")
    if (!orderId || orderId === 'N/A') {
      // Usar o ID do evento como chave única para pedidos sem order_id
      uniqueOrdersMap.set(`event_${order.id}`, order)
      return
    }
    
    // Se já existe um pedido com este ID, verificar qual é mais recente
    if (uniqueOrdersMap.has(orderId)) {
      const existingOrder = uniqueOrdersMap.get(orderId)
      // Comparar datas - manter o mais recente
      if (new Date(order.order_date) > new Date(existingOrder.order_date)) {
        uniqueOrdersMap.set(orderId, order)
      }
    } else {
      // Primeiro registro deste pedido
      uniqueOrdersMap.set(orderId, order)
    }
  })

  // Converter Map de volta para array e ordenar por data (mais recente primeiro)
  const transformedData = Array.from(uniqueOrdersMap.values())
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())

  return { data: transformedData, error }
}

// Função para deletar um evento/pedido
export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from('raw_events')
    .delete()
    .eq('id', eventId)

  return { error }
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      platforms(name),
      customers(*)
    `)
    .eq('id', id)
    .single()

  return { data, error }
}

// Events
export async function getRawEvents(limit = 100) {
  const { data, error } = await supabase
    .from('raw_events')
    .select(`
      *,
      platforms(name)
    `)
    .order('received_at', { ascending: false })
    .limit(limit)

  return { data: data as (RawEvent & { platforms?: Platform })[], error }
}

// Webhook Events (atual) - usando raw_events
export async function getWebhookEvents(limit = 100) {
  const { data, error } = await supabase
    .from('raw_events')
    .select(`
      id,
      event_type,
      payload_json,
      received_at,
      platform_id,
      platforms(name)
    `)
    .order('received_at', { ascending: false })
    .limit(limit)

  // Transformar para formato esperado pela página
  const transformedData = data?.map(event => ({
    id: event.id.toString(),
    platform: event.platforms?.name || 'unknown',
    event_type: event.event_type || 'unknown',
    order_id: event.payload_json?.order_id,
    customer_email: event.payload_json?.Customer?.email,
    processed: true, // Por enquanto assumir como processado
    error_message: null,
    payload: event.payload_json,
    created_at: event.received_at
  }))

  return { data: transformedData, error }
}

export async function getEventErrors(limit = 50) {
  const { data, error } = await supabase
    .from('event_errors')
    .select(`
      *,
      platforms(name)
    `)
    .order('error_at', { ascending: false })
    .limit(limit)

  return { data: data as (EventError & { platforms?: Platform })[], error }
}

// Customers
export async function getCustomers(limit = 50) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data as Customer[], error }
}

// Platforms
export async function getPlatforms() {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .order('name')

  return { data: data as Platform[], error }
}

// Ad Insights
export async function getAdInsights(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('ad_insights_daily')
    .select('*')
    .gte('date', startDate)
    .order('date', { ascending: false })

  return { data: data as AdInsight[], error }
}