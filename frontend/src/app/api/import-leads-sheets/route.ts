import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint para importar leads do Google Sheets
export async function POST(request: NextRequest) {
  try {
    const { sheetsData } = await request.json()
    
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
        // Mapear campos da planilha para campos da tabela leads
        const leadData = {
          full_name: row['Nome'] || row['nome'] || row['Nome completo'] || null,
          email: row['Email'] || row['email'] || row['E-mail'] || null,
          whatsapp: row['WhatsApp'] || row['whatsapp'] || row['Telefone'] || null,
          age: row['Idade'] || row['idade'] ? parseInt(row['Idade'] || row['idade']) : null,
          education: row['Formação'] || row['formacao'] || row['Escolaridade'] || null,
          work_situation: row['Situação Profissional'] || row['situacao_profissional'] || null,
          happy_with_work: row['Feliz com trabalho'] || row['feliz_trabalho'] || null,
          salary_range: row['Faixa Salarial'] || row['salario'] || null,
          fiscal_study_moment: row['Momento estudar fiscal'] || row['momento_estudo'] || null,
          study_time_dedication: row['Tempo dedicação'] || row['tempo_dedicacao'] || null,
          utm_source: row['UTM Source'] || row['utm_source'] || 'google-sheets',
          utm_medium: row['UTM Medium'] || row['utm_medium'] || 'import',
          utm_campaign: row['UTM Campaign'] || row['utm_campaign'] || null,
          lead_source: 'google-sheets',
          status: 'new' as const,
          form_date: row['Data'] || row['data'] || new Date().toISOString(),
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