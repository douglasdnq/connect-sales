import { supabase } from './supabase'
import type { Order, Customer, RawEvent, EventError, Platform, AdInsight, Goal, Lead } from './supabase'

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

// Buscar faturamento mensal de pedidos reais
export async function getMonthlyRevenue(year: number) {
  try {
    const { data: rawEvents, error } = await supabase
      .from('raw_events')
      .select(`
        id,
        event_type,
        payload_json,
        received_at,
        platforms(name)
      `)
      .gte('received_at', `${year}-01-01`)
      .lt('received_at', `${year + 1}-01-01`)
      .order('received_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar eventos:', error)
      return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0 }))
    }

    // Processar eventos e extrair faturamento por mês
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0 }))

    rawEvents?.forEach(event => {
      try {
        const payload = event.payload_json
        const eventDate = new Date(event.received_at)
        const month = eventDate.getMonth() + 1 // getMonth() retorna 0-11
        
        let revenue = 0

        if (event.event_type === 'paid' || event.event_type === 'imported_paid') {
          // Extrair valor baseado na plataforma
          const platformName = (event.platforms as any)?.name || null
          if (platformName === 'Kiwify' || platformName === 'kiwify') {
            // Kiwify values are in cents, need to convert to reais
            const commissions = payload?.Commissions
            revenue = (commissions?.charge_amount || commissions?.product_base_price || 0) / 100
          } else if (platformName === 'Digital Manager Guru' || platformName === 'dmg') {
            revenue = parseFloat(payload?.valor_liquido || payload?.net_amount || '0')
          }
        }

        if (revenue > 0 && month >= 1 && month <= 12) {
          monthlyData[month - 1].revenue += revenue
        }
      } catch (err) {
        console.error('Erro ao processar evento:', err)
      }
    })

    return monthlyData
  } catch (error) {
    console.error('Erro na função getMonthlyRevenue:', error)
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0 }))
  }
}

// Orders - agora buscando diretamente dos webhooks da Kiwify
export async function getOrders(limit?: number, startDate?: string, endDate?: string, dataSource?: 'all' | 'webhook' | 'imported') {
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

  // Filtrar por fonte de dados
  if (dataSource === 'webhook') {
    query = query.is('import_tag', null)
  } else if (dataSource === 'imported') {
    query = query.not('import_tag', 'is', null)
  }
  // Se dataSource === 'all' ou não especificado, mostra tudo

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

  // Buscar todos os registros com paginação automática
  let allData: any[] = []
  let hasMore = true
  let from = 0
  const pageSize = 1000

  while (hasMore) {
    const { data: pageData, error: pageError } = await query
      .order('received_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (pageError) return { data: null, error: pageError }

    if (pageData && pageData.length > 0) {
      allData = [...allData, ...pageData]
      from += pageSize
      hasMore = pageData.length === pageSize
    } else {
      hasMore = false
    }

    // Limite de segurança para evitar loop infinito
    if (allData.length > 20000) {
      console.warn('Limite de segurança atingido: 20.000 registros')
      break
    }
  }

  const data = allData
  const error = null

  if (error) return { data: null, error }

  // Transformar dados do webhook para formato de pedidos
  const allTransformedData = data?.map(event => {
    
    return {
      id: event.id.toString(),
      platform_order_id: event.payload_json?.order_id || 'N/A',
      order_date: event.received_at,
      created_at: event.received_at,
      status: (() => {
        const currentOrderStatus = event.payload_json?.order_status?.toLowerCase()
        const webhookEvent = event.payload_json?.webhook_event_type?.toLowerCase()
        
        // Mapear status baseado nos campos da Kiwify
        if (currentOrderStatus === 'approved' || webhookEvent?.includes('approved')) return 'paid'
        if (currentOrderStatus === 'paid' || webhookEvent?.includes('paid')) return 'paid'
        if (currentOrderStatus === 'refunded' || webhookEvent?.includes('refund')) return 'refunded'
        if (currentOrderStatus === 'canceled' || webhookEvent?.includes('cancel')) return 'canceled'
        if (currentOrderStatus === 'chargeback' || webhookEvent?.includes('chargeback')) return 'chargeback'
        
        return 'pending' // default
      })(),
      original_status: event.payload_json?.order_status || event.payload_json?.webhook_event_type || 'unknown', // Para debug
      csv_status: event.import_tag ? 'from_csv' : 'from_webhook', // Identificar origem
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
      customer_name: (() => {
        const name = event.payload_json?.Customer?.full_name
        if (name) return name
        if (event.import_tag) return 'Cliente Importado'
        return 'N/A'
      })(),
      customer_email: (() => {
        const email = event.payload_json?.Customer?.email
        if (email) return email
        if (event.import_tag) return 'imported@email.com'
        return 'N/A'
      })(),
      product_name: (() => {
        const product = event.payload_json?.Product?.product_name
        if (product) return product
        if (event.import_tag) return 'Produto Importado'
        return 'N/A'
      })(),
      product_id: (() => {
        const id = event.payload_json?.Product?.product_id
        if (id) return id
        if (event.import_tag) return 'imported'
        return 'N/A'
      })(),
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

  // Para dados importados, não agrupar - mostrar todos os registros
  // Para webhooks, agrupar apenas se necessário
  const transformedData = allTransformedData?.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()) || []

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
    platform: event.platforms?.[0]?.name || 'unknown',
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

// Análise de jornada do cliente (DZA → Mentoria)
export async function getCustomersJourney() {
  // Buscar todos os eventos com paginação automática
  let allData: any[] = []
  let hasMore = true
  let from = 0
  const pageSize = 1000

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from('raw_events')
      .select(`
        id,
        payload_json,
        received_at,
        platforms(name)
      `)
      .order('received_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (pageError) return { data: null, error: pageError }

    if (pageData && pageData.length > 0) {
      allData = [...allData, ...pageData]
      from += pageSize
      hasMore = pageData.length === pageSize
    } else {
      hasMore = false
    }

    // Limite de segurança
    if (allData.length > 20000) {
      console.warn('Limite de segurança atingido: 20.000 registros')
      break
    }
  }

  const data = allData
  const error = null

  // Processar dados para análise de jornada
  const customerMap = new Map()

  data?.forEach(event => {
    try {
      const customer = event.payload_json?.Customer
      if (!customer) return

      // Usar CPF como identificador principal, fallback para email se não houver CPF
      const cpf = customer.cpf?.replace(/[^\d]/g, '') || '' // Limpar formatação do CPF
      const email = customer.email?.toLowerCase().trim() || ''
      
      // Sempre usar email como chave principal se disponível, pois é mais consistente
      // CPF às vezes está null em algumas compras do mesmo cliente
      let primaryKey = ''
      if (email && email.includes('@')) {
        primaryKey = `email:${email}`
      } else if (cpf && cpf.length >= 10) {
        primaryKey = `cpf:${cpf}`
      }
      
      if (!primaryKey) return // Pular se não tiver identificador válido

      const productName = event.payload_json?.Product?.product_name || ''
      const orderDate = new Date(event.received_at)
      const phone = customer.phone_number || ''
      const fullName = customer.full_name || ''
      const platformName = event.platforms?.name?.toLowerCase() || ''

      // Validar se orderDate é válido
      if (isNaN(orderDate.getTime())) return

      if (!customerMap.has(primaryKey)) {
        customerMap.set(primaryKey, {
          name: fullName,
          email: email,
          phone: phone,
          cpf: cpf || null,
          dzaDate: null,
          mentoriaDate: null,
          materials: [],
          daysBetween: null
        })
      }

      const customerData = customerMap.get(primaryKey)
      
      // Atualizar informações do cliente se necessário (manter dados mais completos)
      if (fullName && fullName.length > customerData.name.length) {
        customerData.name = fullName
      }
      if (phone && !customerData.phone) {
        customerData.phone = phone
      }
      if (email && !customerData.email) {
        customerData.email = email
      }
      // Atualizar CPF se estava vazio e agora temos um
      if (cpf && !customerData.cpf) {
        customerData.cpf = cpf
      }

      // Verificar status do pedido
      const orderPaymentStatus = event.payload_json?.order_status?.toLowerCase()
      const webhookEvent = event.payload_json?.webhook_event_type?.toLowerCase()
      
      // Considerar apenas pedidos pagos/aprovados
      const isPaid = orderPaymentStatus === 'approved' || orderPaymentStatus === 'paid' || 
                    webhookEvent?.includes('approved') || webhookEvent?.includes('paid')

      if (isPaid) {
        // DZA vem da Kiwify - detectar todas as variações
        if (platformName === 'kiwify' && 
            (productName.toLowerCase().includes('dza') || 
             productName.toLowerCase().includes('do zero a auditor fiscal') ||
             productName.toLowerCase().includes('treinamento | do zero a auditor fiscal'))) {
          if (!customerData.dzaDate || orderDate < new Date(customerData.dzaDate)) {
            customerData.dzaDate = orderDate.toISOString()
          }
        }

        // Mentoria vem da DMG (Digital Manager) - detectar todas as variações
        if (platformName === 'dmg' && 
            (productName.toLowerCase().includes('mentoria individual') || 
             productName.toLowerCase().includes('mentoria individual (sem material)'))) {
          if (!customerData.mentoriaDate || orderDate < new Date(customerData.mentoriaDate)) {
            customerData.mentoriaDate = orderDate.toISOString()
          }
        }

        // Adicionar material à lista se não existir (comparar por nome e data)
        if (!customerData.materials) {
          customerData.materials = []
        }
        
        const materialExists = customerData.materials.find((m: any) => 
          m.name === productName && m.date === orderDate.toISOString()
        )
        
        if (!materialExists) {
          customerData.materials.push({
            name: productName,
            date: orderDate.toISOString(),
            platform: event.platforms?.name || 'Unknown'
          })
        }
      }
    } catch (error) {
      console.warn('Erro ao processar evento na jornada do cliente:', error)
      // Continuar processamento mesmo com erro
    }
  })

  // Processamento concluído
  
  // Calcular dias entre DZA e Mentoria
  const customers = Array.from(customerMap.values()).map(customer => {
    try {
      if (customer.dzaDate && customer.mentoriaDate) {
        const dzaDate = new Date(customer.dzaDate)
        const mentoriaDate = new Date(customer.mentoriaDate)
        
        // Verificar se as datas são válidas
        if (!isNaN(dzaDate.getTime()) && !isNaN(mentoriaDate.getTime())) {
          const diffTime = Math.abs(mentoriaDate.getTime() - dzaDate.getTime())
          customer.daysBetween = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }
      }
      
      // Ordenar materiais por data com tratamento de erro
      if (customer.materials && Array.isArray(customer.materials)) {
        customer.materials.sort((a: any, b: any) => {
          try {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            if (isNaN(dateA) || isNaN(dateB)) return 0
            return dateA - dateB
          } catch (error) {
            return 0
          }
        })
      }
      
      return customer
    } catch (error) {
      console.warn('Erro ao processar cliente na jornada:', error)
      return customer
    }
  })

  // Ordenar por clientes que têm DZA primeiro, depois por data do DZA
  customers.sort((a, b) => {
    try {
      if (a.dzaDate && !b.dzaDate) return -1
      if (!a.dzaDate && b.dzaDate) return 1
      if (a.dzaDate && b.dzaDate) {
        const dateA = new Date(a.dzaDate).getTime()
        const dateB = new Date(b.dzaDate).getTime()
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateB - dateA
        }
      }
      const nameA = a.name || ''
      const nameB = b.name || ''
      return nameA.localeCompare(nameB)
    } catch (error) {
      return 0
    }
  })

  return { data: customers, error: null }
}

// Goals (Metas) functions
export async function getGoals(month?: number, year?: number) {
  let query = supabase.from('goals').select('*').order('year', { ascending: false }).order('month', { ascending: false })
  
  if (month && year) {
    query = query.eq('month', month).eq('year', year)
  }
  
  return await query
}

export async function getCurrentMonthGoal() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  
  return await supabase
    .from('goals')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .single()
}

export async function saveGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) {
  return await supabase
    .from('goals')
    .upsert(goal, {
      onConflict: 'month,year'
    })
    .select()
    .single()
}

// Função para calcular ascensões reais (clientes que compraram DZA E Mentoria)
export async function getAscensions(month: number, year: number) {
  console.log('=== INICIANDO getAscensions ===', { month, year })
  
  // Buscar dados da jornada do cliente
  const { data: customers, error } = await getCustomersJourney()
  
  if (error || !customers) {
    return { data: 0, error }
  }
  
  // Filtrar apenas clientes que têm tanto DZA quanto Mentoria no período especificado
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)
  
  const ascensions = customers.filter(customer => {
    if (!customer.dzaDate || !customer.mentoriaDate) return false
    
    const mentoriaDate = new Date(customer.mentoriaDate)
    
    // Verificar se a mentoria foi comprada no período especificado
    return mentoriaDate >= startDate && mentoriaDate <= endDate
  })
  
  console.log(`Ascensões encontradas para ${month}/${year}:`, ascensions.length)
  
  return { data: ascensions.length, error: null }
}

export async function getGoalProgress(month: number, year: number) {
  console.log('=== INICIANDO getGoalProgress ===', { month, year })
  
  // Buscar meta do mês
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .single()

  console.log('Resultado da busca da meta:', { goal, goalError })

  if (goalError || !goal) {
    return { 
      error: goalError?.message || 'Meta não encontrada para este período',
      data: null 
    }
  }

  // Usar a mesma lógica da página de pedidos
  const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`
  const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate().toString().padStart(2, '0')}`
  
  // Buscar pedidos usando a função existente
  const { data: orders, error: ordersError } = await getOrders(undefined, startDateStr, endDateStr)

  if (ordersError) {
    return { 
      error: ordersError.message,
      data: null 
    }
  }

  console.log('Goal Progress - Orders found:', {
    totalOrders: orders?.length,
    dateRange: `${startDateStr} to ${endDateStr}`,
    sampleOrder: orders?.[0]
  })

  // Processar apenas pedidos pagos
  const paidOrders = orders?.filter(order => order.status === 'paid') || []

  // Debug: verificar plataformas disponíveis
  const platforms = new Set()
  paidOrders.forEach(order => {
    platforms.add(order.platform_name || 'Sem plataforma')
  })
  console.log('Plataformas encontradas:', Array.from(platforms))

  // Processar dados das vendas
  let dzaSales = 0
  let mentoriaSales = 0 
  let dzaRevenue = 0
  let mentoriaRevenue = 0
  let globalRevenue = 0

  let dzaCount = 0
  let mentoriaCount = 0
  let uncategorizedCount = 0
  const platformBreakdown = new Map()

  paidOrders.forEach(order => {
    const productName = order.product_name?.toLowerCase() || ''
    const amount = order.net_amount || 0
    const platform = order.platform_name?.toLowerCase() || ''

    globalRevenue += amount

    // Contabilizar por plataforma para debug
    if (!platformBreakdown.has(platform)) {
      platformBreakdown.set(platform, { count: 0, revenue: 0 })
    }
    const platformData = platformBreakdown.get(platform)
    platformData.count++
    platformData.revenue += amount

    // DZA = APENAS vendas da Kiwify
    if (platform === 'kiwify') {
      dzaSales++
      dzaRevenue += amount
      dzaCount++
    }
    
    // Mentoria = produtos específicos de mentoria (de qualquer plataforma)
    if (productName.includes('mentoria') || productName.includes('individual')) {
      mentoriaSales++
      mentoriaRevenue += amount
      mentoriaCount++
    }
    
    // Para debug: produtos não da Kiwify
    if (platform !== 'kiwify') {
      uncategorizedCount++
    }
  })

  console.log('=== CONTAGEM DETALHADA ===')
  console.log('Total de pedidos pagos:', paidOrders.length)
  console.log('Vendas Kiwify (DZA):', dzaCount)
  console.log('Mentoria vendas:', mentoriaCount)
  console.log('Outras plataformas:', uncategorizedCount)
  console.log('--- BREAKDOWN POR PLATAFORMA ---')
  platformBreakdown.forEach((data, platform) => {
    console.log(`${platform}: ${data.count} vendas, R$ ${data.revenue.toFixed(2)}`)
  })
  console.log('--- FATURAMENTO ---')
  console.log('DZA Revenue (Kiwify apenas):', dzaRevenue)
  console.log('Mentoria Revenue (todos produtos mentoria):', mentoriaRevenue)
  console.log('Global Revenue (original):', globalRevenue)
  console.log('==========================')

  console.log('Goal Progress - Final results:', {
    dzaSales,
    mentoriaSales,
    dzaRevenue,
    mentoriaRevenue,
    globalRevenue
  })

  return {
    data: {
      goal,
      current: {
        dza_sales: dzaSales, // Vendas apenas da Kiwify
        mentoria_sales: mentoriaSales,
        dza_revenue: dzaRevenue, // Faturamento apenas da Kiwify
        mentoria_revenue: mentoriaRevenue,
        global_revenue: globalRevenue
      },
      progress: {
        dza_sales: goal.dza_sales_target > 0 ? (dzaSales / goal.dza_sales_target) * 100 : 0,
        mentoria_sales: goal.mentoria_sales_target > 0 ? (mentoriaSales / goal.mentoria_sales_target) * 100 : 0,
        dza_revenue: goal.dza_revenue_target > 0 ? (dzaRevenue / goal.dza_revenue_target) * 100 : 0,
        mentoria_revenue: goal.mentoria_revenue_target > 0 ? (mentoriaRevenue / goal.mentoria_revenue_target) * 100 : 0,
        global_revenue: goal.global_revenue_target > 0 ? (globalRevenue / goal.global_revenue_target) * 100 : 0,
      }
    },
    error: null
  }
}

// Leads functions
export async function getLeads(limit = 50, status?: string) {
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  return await query
}

export async function getLeadById(id: string) {
  return await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
}

export async function updateLeadStatus(id: string, status: Lead['status'], notes?: string) {
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString()
  }

  return await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
}

export async function convertLeadToCustomer(leadId: string, customerId: string) {
  return await supabase
    .from('leads')
    .update({
      status: 'converted',
      converted_to_customer_id: customerId,
      converted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)
    .select()
    .single()
}

export async function getLeadStats(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .gte('created_at', startDate)

  if (error) return { data: null, error }

  const stats = {
    totalLeads: data.length,
    newLeads: data.filter(l => l.status === 'new').length,
    contactedLeads: data.filter(l => l.status === 'contacted').length,
    qualifiedLeads: data.filter(l => l.status === 'qualified').length,
    convertedLeads: data.filter(l => l.status === 'converted').length,
    lostLeads: data.filter(l => l.status === 'lost').length,
    conversionRate: data.length > 0 ? ((data.filter(l => l.status === 'converted').length / data.length) * 100).toFixed(1) : '0.0',
    avgScore: data.filter(l => l.score).length > 0 
      ? (data.filter(l => l.score).reduce((sum, l) => sum + (l.score || 0), 0) / data.filter(l => l.score).length).toFixed(1)
      : '0.0',
    sources: data.reduce((acc, lead) => {
      const source = lead.utm_source || 'unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    campaigns: data.reduce((acc, lead) => {
      const campaign = lead.utm_campaign || 'unknown'
      acc[campaign] = (acc[campaign] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return { data: stats, error: null }
}