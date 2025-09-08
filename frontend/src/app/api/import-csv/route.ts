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
      if (platform === 'kiwify') {
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
      if (platform === 'kiwify') {
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
        event_type: 'imported_' + (platform === 'kiwify' ? mapKiwifyStatus(row['Status'] || 'paid') : mapStatus(row['Status'] || row['order_status'] || 'approved')),
        platform_id: 1, // Assumindo Kiwify como ID 1
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

function mapKiwifyStatus(status: string): string {
  const normalizedStatus = status.toLowerCase()
  
  // Mapeamento específico para status da Kiwify
  if (normalizedStatus === 'paid') {
    return 'paid'
  }
  if (normalizedStatus === 'waiting_payment') {
    return 'pending'
  }
  if (normalizedStatus === 'refunded') {
    return 'refunded'
  }
  if (normalizedStatus === 'canceled') {
    return 'canceled'
  }
  if (normalizedStatus === 'chargeback') {
    return 'chargeback'
  }
  
  return 'paid' // default
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