import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface CSVRow {
  [key: string]: string
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const platform = formData.get('platform') as string || 'kiwify'
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Apenas arquivos CSV são suportados' }, { status: 400 })
    }

    // Ler o conteúdo do arquivo CSV
    const csvContent = await file.text()
    const csvLines = csvContent.split('\n')
    
    if (csvLines.length <= 1) {
      return NextResponse.json({ error: 'CSV deve conter pelo menos um cabeçalho e uma linha de dados' }, { status: 400 })
    }

    // Parse CSV mais robusto para lidar com vírgulas dentro de campos
    const csvData: CSVRow[] = []

    // Parse do cabeçalho
    const headers = parseCSVLine(csvLines[0])
    console.log('Headers encontrados:', headers)

    // Parse das linhas de dados
    for (let i = 1; i < csvLines.length; i++) {
      const line = csvLines[i].trim()
      if (!line) continue // Pular linhas vazias
      
      const values = parseCSVLine(line)
      if (values.length < headers.length * 0.8) { // Permitir algumas colunas faltando
        console.log(`Linha ${i + 1} ignorada - muito poucas colunas (${values.length} vs ${headers.length})`)
        continue
      }
      
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || '' // Usar string vazia se valor não existir
      })
      csvData.push(row)
    }

    console.log(`Processando ${csvData.length} linhas do CSV`)

    // Converter dados do CSV para formato de webhook
    const eventsToInsert = csvData.map(row => {
      let webhookPayload: any

      // Mapear campos baseado na plataforma
      if (platform === 'dmg') {
        // Mapeamento COMPLETO específico para Digital Manager Guru (todos os campos do CSV)
        webhookPayload = {
          order_id: row['id transação'] || generateOrderId(),
          order_status: mapDMGStatus(row['status'] || 'Aprovada'),
          webhook_event_type: mapDMGStatus(row['status'] || 'Aprovada'),
          order_date: (() => {
            const rawDate = row['data pedido']
            if (rawDate) {
              // Formato DMG: DD/MM/YYYY HH:mm:ss
              const dateTimeParts = rawDate.split(' ')
              const datePart = dateTimeParts[0] // DD/MM/YYYY
              const timePart = dateTimeParts[1] || '00:00:00' // HH:mm:ss
              
              const dateParts = datePart.split('/')
              if (dateParts.length === 3) {
                const day = dateParts[0].padStart(2, '0')
                const month = dateParts[1].padStart(2, '0')
                const year = dateParts[2]
                return new Date(`${year}-${month}-${day}T${timePart}`).toISOString()
              }
            }
            return new Date().toISOString()
          })(),
          
          Product: {
            product_id: row['id produto'] || null, // Não usar fallback
            product_name: row['nome produto'] || null, // Não usar fallback
            offer_name: row['nome oferta'] || null
          },
          
          Customer: {
            full_name: row['nome contato'] || null, // Não usar fallback, manter null
            email: row['email contato'] || null, // Não usar fallback, manter null
            cpf: row['doc contato'] || null,
            phone_number: row['telefone contato'] || null,
            address: {
              street: row['logradouro contato'] || null,
              number: row['número contato'] || null,
              complement: row['complemento contato'] || null,
              neighborhood: row['bairro contato'] || null,
              city: row['cidade contato'] || null,
              state: row['estado contato'] || null,
              zipcode: row['cep contato'] || null,
              country: row['país contato'] || 'BR'
            }
          },
          
          Commissions: {
            currency: row['moeda'] || 'BRL',
            marketplace_fee: parseDMGCurrency(row['valor marketplace']) * 100,
            affiliate_fee: parseDMGCurrency(row['valor afiliado']) * 100,
            charge_amount: parseDMGCurrency(row['valor venda']) * 100,
            my_commission: parseDMGCurrency(row['valor líquido']) * 100,
            product_base_price: parseDMGCurrency(row['valor produtos']) * 100,
            settlement_amount: parseDMGCurrency(row['valor líquido']) * 100,
            discount_amount: parseDMGCurrency(row['valor desconto']) * 100,
            tax_amount: parseDMGCurrency(row['valor imposto']) * 100,
            shipping_amount: parseDMGCurrency(row['valor frete']) * 100,
            installment_value: parseDMGCurrency(row['valor parcelas']) * 100
          },
          
          Payment: {
            method: row['pagamento'] || 'unknown',
            installments: parseInt(row['parcelas'] || '1'),
            type: row['tipo'] || 'producer',
            marketplace_name: row['nome marketplace'] || 'DMG',
            marketplace_id: row['id marketplace'] || null,
            gateway_name: row['adquirente nome'] || null,
            gateway_tid: row['adquirente tid'] || null,
            pix_data: row['pix'] || null,
            boleto_url: row['url do boleto'] || null,
            boleto_line: row['linha digitável do boleto'] || null,
            boleto_due_date: row['vencimento do boleto'] || null
          },
          
          Tracking: {
            first_capture: row['primeira captura'] || null,
            first_origin: row['primeira origem'] || null,
            first_capture_date: row['data 1ª captura'] || null,
            last_capture: row['última captura'] || null,
            last_origin: row['última origem'] || null,
            last_capture_date: row['data última captura'] || null,
            rppc_sale: row['rppc venda'] || null,
            rppc_origin: row['origem rppc venda'] || null,
            rppc_utm_campaign: row['rppc utm campaign'] || null,
            rppc_utm_medium: row['rppc utm medium'] || null,
            rppc_utm_term: row['rppc utm term'] || null,
            rppc_utm_content: row['rppc utm content'] || null,
            rppc_checkout: row['rppc checkout'] || null,
            utm_source: row['utm_source'] || null,
            utm_campaign: row['utm_campaign'] || null,
            utm_medium: row['utm_medium'] || null,
            utm_content: row['utm_content'] || null,
            origin_1: row['origem 1'] || null,
            origin_2: row['origem 2'] || null,
            origin_3: row['origem 3'] || null,
            auto_attribution_response: row['resposta auto atribuição'] || null
          },
          
          Dates: {
            order_date: row['data pedido'] || null,
            approval_date: row['data aprovacao'] || null,
            cancellation_date: row['data cancelamento'] || null,
            warranty_date: row['data garantia'] || null,
            unavailable_date: row['data indisponível'] || null
          },
          
          Shipping: {
            company_name: row['nome da transportadora'] || null,
            service: row['serviço da transportadora'] || null,
            tracking_code: row['código de rastreamento'] || null,
            cost: parseDMGCurrency(row['valor da transportadora']) * 100,
            delivery_time: row['tempo de entrega'] || null
          },
          
          Subscription: {
            code: row['assinatura código'] || null,
            cycle: row['assinatura ciclo'] || null
          },
          
          Coupon: {
            code: row['cupom código'] || null,
            value: parseDMGCurrency(row['cupom valor']) * 100
          },
          
          // Campos específicos DMG
          marketplace_return: row['retorno marketplace'] || null,
          refund_reason: row['motivo reembolso'] || null,
          last_sale_marketplace: row['nome martketplace ultima venda'] || null,
          last_sale_marketplace_id: row['id marketplace ultima venda'] || null,
          company_name: row['nome empresa contato'] || null,
          phone_code: row['codigo telefone contato'] || null,
          offer_url: row['url oferta'] || null,
          quantity: parseInt(row['quantidade produto'] || '1'),
          
          // Metadados de importação
          import_source: 'csv_import',
          imported_at: new Date().toISOString(),
          original_csv_row: row // Para debug se necessário
        }
      } else if (platform === 'kiwify') {
        // Mapeamento COMPLETO específico para Kiwify (todos os campos do webhook)
        webhookPayload = {
          order_id: row['ID da venda'] || generateOrderId(),
          order_status: mapKiwifyStatus(row['Status'] || 'approved'),
          webhook_event_type: mapKiwifyStatus(row['Status'] || 'approved'),
          order_date: (() => {
            const rawDate = row['Data de Criação']
            if (rawDate) {
              // Formato da Kiwify: DD/MM/YYYY HH:mm:ss
              const dateTimeParts = rawDate.split(' ')
              const datePart = dateTimeParts[0] // DD/MM/YYYY
              const timePart = dateTimeParts[1] || '00:00:00' // HH:mm:ss
              
              const dateParts = datePart.split('/')
              if (dateParts.length === 3) {
                // Converter DD/MM/YYYY para YYYY-MM-DD
                const day = dateParts[0].padStart(2, '0')
                const month = dateParts[1].padStart(2, '0')
                const year = dateParts[2]
                return new Date(`${year}-${month}-${day}T${timePart}`).toISOString()
              }
              return new Date(rawDate).toISOString()
            }
            return new Date().toISOString()
          })(),
          
          Product: {
            product_id: row['ID da venda'] || 'imported_kiwify',
            product_name: row['Produto'] || 'Produto Importado',
            offer_name: row['Oferta'] || null
          },
          
          Customer: {
            full_name: row['Cliente'] || 'Cliente Importado',
            email: row['Email'] || 'imported@email.com',
            cpf: row['CPF / CNPJ'] || null,
            phone_number: row['Celular'] || null,
            address: {
              street: row['Endereço'] || null,
              number: row['Numero'] || null,
              complement: row['Complemento'] || null,
              neighborhood: row['Bairro'] || null,
              city: row['Cidade'] || null,
              state: row['Estado'] || null,
              zipcode: row['CEP'] || null,
              country: row['País'] || 'BR'
            }
          },
          
          Commissions: {
            currency: row['Moeda'] || 'BRL',
            kiwify_fee: parseFloat(row['Taxas'] || '0') * 100,
            deposit_date: row['Data de Depósito'] || null,
            funds_status: row['Status do recebimento'] || null,
            charge_amount: parseFloat(row['Total com acréscimo'] || '0') * 100,
            my_commission: parseFloat(row['Valor líquido'] || '0') * 100,
            product_base_price: parseFloat(row['Preço base do produto'] || '0') * 100,
            settlement_amount: parseFloat(row['Valor líquido'] || '0') * 100,
            kiwify_fee_currency: row['Moeda das taxas'] || 'BRL',
            estimated_deposit_date: row['Data de liberação estimada'] || null,
            product_base_price_currency: row['Moeda do preço do produto'] || 'BRL',
            settlement_amount_currency: row['Moeda'] || 'BRL'
          },
          
          Payment: {
            method: row['Pagamento'] || 'unknown',
            installments: parseInt(row['Parcelas'] || '1'),
            card_last_digits: row['Últimos dígitos do Cartão'] || null,
            type: row['Tipo'] || 'producer',
            refused_reason: row['Motivo da recusa'] || null
          },
          
          Tracking: {
            ip: row['IP'] || null,
            source: row['Tracking src'] || null,
            utm_source: parseJSON(row['Tracking utm_source']) || row['Tracking utm_source'] || null,
            utm_medium: parseJSON(row['Tracking utm_medium']) || row['Tracking utm_medium'] || null, 
            utm_campaign: parseJSON(row['Tracking utm_campaign']) || row['Tracking utm_campaign'] || null,
            utm_content: parseJSON(row['Tracking utm_content']) || row['Tracking utm_content'] || null,
            utm_term: parseJSON(row['Tracking utm_term']) || row['Tracking utm_term'] || null,
            s1: parseJSON(row['Tracking s1']) || row['Tracking s1'] || null,
            s2: parseJSON(row['Tracking s2']) || row['Tracking s2'] || null,
            s3: parseJSON(row['Tracking s3']) || row['Tracking s3'] || null,
            sck: parseJSON(row['Tracking sck']) || row['Tracking sck'] || null
          },
          
          Tax: {
            tax_amount: parseFloat(row['Imposto'] || '0') * 100,
            invoice_id: row['ID Nota fiscal'] || null,
            invoice_status: row['Status Nota fiscal'] || null,
            invoice_issuer: row['Nota fisca emitada por'] || null,
            invoice_software: row['Software Nota fiscal'] || null,
            invoice_amount: parseFloat(row['Valor Nota fiscal'] || '0') * 100
          },
          
          Network: {
            is_kiwify_network: row['Kiwify Network'] === 'true',
            one_click_provider: row['Provedor de One Click'] || null
          },
          
          Coupon: {
            code: row['Coupon Code'] || null,
            discount_percentage: parseFloat(row['Discount Percentage'] || '0')
          },
          
          Affiliate: {
            name: row['Nome do afiliado'] || null,
            document: row['Documento do afiliado'] || null,
            email: row['Email do afiliado'] || null,
            commission: parseFloat(row['Comissão do afiliado'] || '0') * 100
          },
          
          Coproducers: {
            names: parseJSON(row['Nomes dos coprodutores']) || row['Nomes dos coprodutores'] || null,
            documents: parseJSON(row['Documentos dos coprodutores']) || row['Documentos dos coprodutores'] || null,
            emails: parseJSON(row['Emails dos coprodutores']) || row['Emails dos coprodutores'] || null,
            commissions: parseJSON(row['Comissões dos coprodutores']) || row['Comissões dos coprodutores'] || null
          },
          
          // Metadados de importação
          import_source: 'csv_import',
          imported_at: new Date().toISOString(),
          original_csv_row: row // Para debug se necessário
        }
      } else {
        // Mapeamento genérico para outras plataformas (fallback)
        webhookPayload = {
          order_id: row['Order ID'] || row['order_id'] || generateOrderId(),
          order_status: mapStatus(row['Status'] || row['order_status'] || 'approved'),
          webhook_event_type: mapStatus(row['Status'] || row['order_status'] || 'approved'),
          Product: {
            product_id: row['Product ID'] || row['product_id'] || 'imported',
            product_name: row['Product Name'] || row['product_name'] || 'Produto Importado'
          },
          Customer: {
            full_name: row['Customer Name'] || row['customer_name'] || row['name'] || 'Cliente Importado',
            email: row['Customer Email'] || row['customer_email'] || row['email'] || 'imported@email.com'
          },
          Commissions: {
            currency: 'BRL',
            my_commission: parseFloat(row['Commission'] || row['commission'] || row['net_amount'] || '0') * 100,
            product_base_price: parseFloat(row['Price'] || row['gross_amount'] || row['value'] || '0') * 100,
            charge_amount: parseFloat(row['Price'] || row['gross_amount'] || row['value'] || '0') * 100
          }
        }
      }

      // Data específica por plataforma
      let eventDate: string
      if (platform === 'dmg') {
        // Converter data brasileira (DD/MM/YYYY HH:mm:ss) para formato ISO
        const rawDate = row['data pedido']
        if (rawDate) {
          const dateTimeParts = rawDate.split(' ')
          const datePart = dateTimeParts[0] // DD/MM/YYYY
          const timePart = dateTimeParts[1] || '00:00:00' // HH:mm:ss
          
          const dateParts = datePart.split('/')
          if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0')
            const month = dateParts[1].padStart(2, '0')
            const year = dateParts[2]
            eventDate = new Date(`${year}-${month}-${day}T${timePart}`).toISOString()
          } else {
            eventDate = new Date(rawDate).toISOString()
          }
        } else {
          eventDate = new Date().toISOString()
        }
      } else if (platform === 'kiwify') {
        // Converter data brasileira (DD/MM/YYYY HH:mm:ss) para formato ISO
        const rawDate = row['Data de Criação']
        if (rawDate) {
          const dateTimeParts = rawDate.split(' ')
          const datePart = dateTimeParts[0] // DD/MM/YYYY
          const timePart = dateTimeParts[1] || '00:00:00' // HH:mm:ss
          
          const dateParts = datePart.split('/')
          if (dateParts.length === 3) {
            // Converter DD/MM/YYYY para YYYY-MM-DD
            const day = dateParts[0].padStart(2, '0')
            const month = dateParts[1].padStart(2, '0')
            const year = dateParts[2]
            eventDate = new Date(`${year}-${month}-${day}T${timePart}`).toISOString()
          } else {
            eventDate = new Date(rawDate).toISOString()
          }
        } else {
          eventDate = new Date().toISOString()
        }
      } else {
        eventDate = row['Date'] ? new Date(row['Date']).toISOString() : new Date().toISOString()
      }

      return {
        event_type: 'imported_' + (
          platform === 'dmg' ? mapDMGStatus(row['status'] || 'Aprovada') :
          platform === 'kiwify' ? mapKiwifyStatus(row['Status'] || 'paid') : 
          mapStatus(row['Status'] || row['order_status'] || 'approved')
        ),
        platform_id: platform === 'dmg' ? 2 : 1, // DMG ID 2, Kiwify ID 1
        payload_json: webhookPayload,
        received_at: eventDate,
        import_tag: `imported_${platform}_${Date.now()}`, // Tag para identificar dados importados
        event_hash: generateEventHash(webhookPayload) // Hash único para o evento
      }
    })

    // Inserir no banco de dados
    let insertedCount = 0
    let errors: any[] = []

    // Inserir em lotes para evitar timeout
    const batchSize = 50
    for (let i = 0; i < eventsToInsert.length; i += batchSize) {
      const batch = eventsToInsert.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('raw_events')
        .insert(batch)
        .select('id')

      if (error) {
        console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, error)
        errors.push(error)
      } else {
        insertedCount += data?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${insertedCount} pedidos inseridos`,
      total_processed: csvData.length,
      inserted: insertedCount,
      errors: errors.length,
      platform: platform
    })

  } catch (error) {
    console.error('Erro na importação:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function mapStatus(status: string): string {
  const normalizedStatus = status.toLowerCase()
  
  if (normalizedStatus.includes('approved') || normalizedStatus.includes('paid') || normalizedStatus.includes('pago')) {
    return 'paid'
  }
  if (normalizedStatus.includes('pending') || normalizedStatus.includes('pendente')) {
    return 'pending'
  }
  if (normalizedStatus.includes('refund') || normalizedStatus.includes('reembolso')) {
    return 'refunded'
  }
  if (normalizedStatus.includes('cancel') || normalizedStatus.includes('cancelado')) {
    return 'canceled'
  }
  
  return 'paid' // default para dados importados
}

function mapDMGStatus(status: string): string {
  const normalizedStatus = status.toLowerCase()
  
  // Mapeamento específico para status do Digital Manager Guru
  if (normalizedStatus === 'aprovada') {
    return 'paid'
  }
  if (normalizedStatus === 'pendente' || normalizedStatus === 'aguardando pagamento') {
    return 'pending'
  }
  if (normalizedStatus === 'cancelada' || normalizedStatus === 'cancelado') {
    return 'canceled'
  }
  if (normalizedStatus === 'reembolsada' || normalizedStatus === 'reembolso') {
    return 'refunded'
  }
  if (normalizedStatus === 'chargeback') {
    return 'chargeback'
  }
  
  return 'paid' // default para dados importados
}

function mapKiwifyStatus(status: string): string {
  const normalizedStatus = status.toLowerCase()
  
  // Mapeamento específico para status da Kiwify
  if (normalizedStatus === 'paid' || normalizedStatus === 'pago') {
    return 'paid'
  }
  if (normalizedStatus === 'approved' || normalizedStatus === 'aprovado') {
    return 'paid' // Approved = Paid na Kiwify
  }
  if (normalizedStatus === 'waiting_payment' || normalizedStatus === 'aguardando_pagamento') {
    return 'pending'
  }
  if (normalizedStatus === 'refunded' || normalizedStatus === 'reembolsado') {
    return 'refunded'
  }
  if (normalizedStatus === 'canceled' || normalizedStatus === 'cancelado') {
    return 'canceled'
  }
  if (normalizedStatus === 'chargeback') {
    return 'chargeback'
  }
  
  console.log(`⚠️ Status não reconhecido da Kiwify: "${status}" - mapeando como pending`)
  return 'pending' // Mudança: status não reconhecidos viram pending, não paid
}

function generateOrderId(): string {
  return `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function parseJSON(value: string): any {
  if (!value || value === '') return null
  try {
    return JSON.parse(value)
  } catch {
    return value // Retornar como string se não for JSON válido
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

function parseDMGCurrency(value: string | undefined): number {
  if (!value || value === '') return 0
  
  // Remover aspas e espaços
  let cleanValue = value.replace(/["'\s]/g, '')
  
  // Tratar formato brasileiro: "1.000,00" ou "1000,00"
  // Se tem tanto ponto quanto vírgula, ponto é separador de milhares
  if (cleanValue.includes('.') && cleanValue.includes(',')) {
    // Ex: "1.000,00" -> remove pontos -> "1000,00" -> troca vírgula por ponto -> "1000.00"
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.')
  } else if (cleanValue.includes(',')) {
    // Ex: "992,10" -> troca vírgula por ponto -> "992.10"
    cleanValue = cleanValue.replace(',', '.')
  }
  
  const parsed = parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

function generateEventHash(payload: any): string {
  // Gerar hash simples baseado no conteúdo do payload
  const content = JSON.stringify(payload)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Converter para 32-bit integer
  }
  return `imported_${Math.abs(hash).toString(16)}_${Date.now()}`
}