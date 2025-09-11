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
        // Mapear campos do formulário para campos da tabela
        const fieldMapping: {[key: string]: string} = {
          'Qual seu nome completo?': 'full_name',
          'Qual seu WhatsApp?': 'whatsapp',
          'Qual o seu e-mail?': 'email',
          'E a sua idade?': 'age',
          'Em que você é formado(a)?': 'education',
          'Qual é a opção que melhor descreve sua situação profissional?': 'work_situation',
          'Você é feliz com o seu trabalho atual?': 'happy_with_work',
          'Qual é a sua faixa de salário atual?': 'salary_range',
          'Qual é o seu momento em relação aos estudos para Área Fiscal?': 'fiscal_study_moment',
          'Quanto tempo você pode dedicar aos estudos para se tornar Auditor-Fiscal?': 'study_time_dedication',
          'Por que você acredita que a Mentoria Tributum é ideal para você agora?': 'why_mentoria_ideal',
          'Se houvesse apenas 1 vaga na mentoria hoje, por que ela deveria ser sua?': 'why_deserve_spot',
          'A Mentoria é um programa de alto impacto para acelerar sua aprovação. O investimento atual é de:': 'investment_type',
          'É uma prioridade para você iniciar sua preparação imediatamente?': 'priority_start',
          'Pontuação': 'score',
          'Data': 'form_date',
          'ID': 'form_id',
          'Nome': 'full_name',
          'Email': 'email',
          'WhatsApp': 'whatsapp',
          'Idade': 'age',
          'Formação': 'education'
        }

        // Corrigir fuso horário do form_date (Respondi envia em UTC, convertemos para Brasília UTC-3)
        const adjustFormDate = (dateString: string) => {
          if (!dateString) return new Date().toISOString()
          const date = new Date(dateString)
          // Subtrair 3 horas para converter UTC para horário de Brasília
          const adjustedDate = new Date(date.getTime() - (3 * 60 * 60 * 1000))
          return adjustedDate.toISOString()
        }

        // Criar dados mapeados
        const leadData: any = {
          lead_source: row.lead_source || 'google-sheets',
          status: row.status || 'new',
          form_date: row.form_date ? adjustFormDate(row.form_date) : new Date().toISOString(),
          utm_source: row.utm_source || null,
          utm_medium: row.utm_medium || null,
          utm_campaign: row.utm_campaign || null,
          utm_term: row.utm_term || null,
          utm_content: row.utm_content || null,
          gclid: row.gclid || null,
          fbclid: row.fbclid || null,
        }

        // Mapear campos do formulário
        Object.entries(row).forEach(([key, value]) => {
          const mappedField = fieldMapping[key] || key.toLowerCase().replace(/\s+/g, '_')
          if (value !== undefined && value !== null && value !== '') {
            leadData[mappedField] = value
          }
        })

        // Converter idade para número se necessário e tratar strings vazias
        if (leadData.age !== undefined && leadData.age !== null) {
          if (typeof leadData.age === 'string') {
            const ageStr = leadData.age.trim()
            if (ageStr === '' || ageStr === 'null' || ageStr === 'undefined') {
              leadData.age = null
            } else {
              leadData.age = parseInt(ageStr) || null
            }
          }
        } else {
          leadData.age = null
        }

        // Converter score para número se necessário e tratar strings vazias
        if (leadData.score !== undefined && leadData.score !== null) {
          if (typeof leadData.score === 'string') {
            const scoreStr = leadData.score.trim()
            if (scoreStr === '' || scoreStr === 'null' || scoreStr === 'undefined') {
              leadData.score = null
            } else {
              leadData.score = parseInt(scoreStr) || null
            }
          }
        } else {
          leadData.score = null
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