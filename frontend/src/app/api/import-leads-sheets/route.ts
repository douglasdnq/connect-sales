import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint para importar leads do Google Sheets
export async function POST(request: NextRequest) {
  try {
    const { sheetsData, customFields = [] } = await request.json()
    
    if (!sheetsData || !Array.isArray(sheetsData)) {
      return NextResponse.json(
        { error: 'Dados da planilha são obrigatórios e devem ser um array' },
        { status: 400 }
      )
    }

    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      processed: sheetsData.length
    }

    for (const row of sheetsData) {
      try {
        // Os dados já vem mapeados do frontend, então podemos usar diretamente
        const leadData = {
          ...row, // Incluir todos os campos mapeados
          lead_source: row.lead_source || 'google-sheets',
          status: row.status || 'new',
          form_date: row.form_date || new Date().toISOString(),
          // Não sobrescrever UTM se já existe no row
          utm_source: row.utm_source || null,
          utm_medium: row.utm_medium || null,
        }

        // Converter idade para número se necessário
        if (leadData.age && typeof leadData.age === 'string') {
          leadData.age = parseInt(leadData.age) || null
        }

        // Verificar se já existe um lead com esse email ou whatsapp
        let existingLead = null
        if (leadData.email) {
          const { data } = await supabase
            .from('leads')
            .select('id')
            .eq('email', leadData.email)
            .single()
          existingLead = data
        }

        if (!existingLead && leadData.whatsapp) {
          const { data } = await supabase
            .from('leads')
            .select('id')
            .eq('whatsapp', leadData.whatsapp)
            .single()
          existingLead = data
        }

        if (existingLead) {
          // Atualizar lead existente
          const { error } = await supabase
            .from('leads')
            .update({
              ...leadData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLead.id)

          if (error) {
            console.error('Erro ao atualizar lead:', error)
            results.errors++
          } else {
            results.updated++
          }
        } else {
          // Criar novo lead
          const { error } = await supabase
            .from('leads')
            .insert({
              ...leadData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (error) {
            console.error('Erro ao criar lead:', error)
            results.errors++
          } else {
            results.created++
          }
        }
      } catch (error) {
        console.error('Erro ao processar linha:', error)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.created} criados, ${results.updated} atualizados, ${results.errors} erros`,
      results
    })

  } catch (error) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint GET para instruções
export async function GET() {
  return NextResponse.json({
    message: "Import Leads from Google Sheets API endpoint",
    usage: "POST to this endpoint with sheetsData array to import leads",
    example: {
      sheetsData: [
        {
          "Nome": "João Silva",
          "Email": "joao@exemplo.com",
          "WhatsApp": "(11) 99999-9999",
          "Idade": "30",
          "Formação": "Superior completo"
        }
      ]
    },
    timestamp: new Date().toISOString()
  })
}