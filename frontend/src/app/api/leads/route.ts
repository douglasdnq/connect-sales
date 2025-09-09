import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK LEADS RECEIVED ===')
    
    const body = await request.json()
    console.log('Body received:', JSON.stringify(body, null, 2))

    // Mapear campos do Zapier/Respondi para nossa estrutura
    const leadData: Partial<Lead> = {
      // Campos básicos
      full_name: body.nome_completo || body.full_name || body.name,
      whatsapp: body.whatsapp || body.telefone || body.phone,
      email: body.email || body.e_mail,
      age: body.idade ? parseInt(body.idade) : undefined,
      education: body.formacao || body.education,
      
      // Informações profissionais
      work_situation: body.situacao_profissional || body.work_situation,
      happy_with_work: body.feliz_trabalho || body.happy_with_work,
      salary_range: body.faixa_salarial || body.salary_range,
      
      // Informações de estudo
      fiscal_study_moment: body.momento_estudos_fiscal || body.fiscal_study_moment,
      study_time_dedication: body.tempo_dedicacao_estudos || body.study_time_dedication,
      why_mentoria_ideal: body.por_que_mentoria_ideal || body.why_mentoria_ideal,
      why_deserve_spot: body.por_que_deveria_ser_escolhido || body.why_deserve_spot,
      investment_type: body.tipo_investimento || body.investment_type,
      priority_start: body.prioridade_iniciar || body.priority_start,
      
      // Pontuação
      score: body.pontuacao ? parseInt(body.pontuacao) : body.score ? parseInt(body.score) : undefined,
      
      // Metadados do formulário
      form_id: body.id || body.form_id,
      form_date: body.data ? new Date(body.data).toISOString() : body.form_date,
      
      // UTM params
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_term: body.utm_term,
      utm_content: body.utm_content,
      gclid: body.gclid,
      fbclid: body.fbclid,
      
      // Status padrão
      status: 'new',
      lead_source: body.lead_source || 'respondi'
    }

    // Remover campos undefined/null
    const cleanedData = Object.fromEntries(
      Object.entries(leadData).filter(([_, value]) => value != null)
    )

    console.log('Lead data to insert:', JSON.stringify(cleanedData, null, 2))

    // Verificar se já existe um lead com esse email ou whatsapp
    if (cleanedData.email || cleanedData.whatsapp) {
      let duplicateQuery = supabase
        .from('leads')
        .select('id, email, whatsapp, created_at')

      if (cleanedData.email && cleanedData.whatsapp) {
        duplicateQuery = duplicateQuery.or(`email.eq.${cleanedData.email},whatsapp.eq.${cleanedData.whatsapp}`)
      } else if (cleanedData.email) {
        duplicateQuery = duplicateQuery.eq('email', cleanedData.email)
      } else if (cleanedData.whatsapp) {
        duplicateQuery = duplicateQuery.eq('whatsapp', cleanedData.whatsapp)
      }

      const { data: existingLeads, error: checkError } = await duplicateQuery

      if (checkError) {
        console.error('Error checking for duplicates:', checkError)
      } else if (existingLeads && existingLeads.length > 0) {
        console.log('Duplicate lead found:', existingLeads[0])
        
        // Atualizar o lead existente em vez de criar um novo
        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update({
            ...cleanedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLeads[0].id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating existing lead:', updateError)
          return NextResponse.json(
            { error: 'Failed to update existing lead', details: updateError },
            { status: 500 }
          )
        }

        console.log('Lead updated successfully:', updatedLead.id)
        return NextResponse.json({ 
          success: true, 
          action: 'updated',
          lead_id: updatedLead.id,
          message: 'Lead atualizado com sucesso'
        })
      }
    }

    // Inserir novo lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert([cleanedData])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert lead', details: insertError },
        { status: 500 }
      )
    }

    console.log('Lead created successfully:', newLead.id)

    // Log para estatísticas
    console.log(`=== LEAD STATS ===`)
    console.log(`Source: ${cleanedData.utm_source || 'unknown'}`)
    console.log(`Campaign: ${cleanedData.utm_campaign || 'unknown'}`)
    console.log(`Score: ${cleanedData.score || 'no score'}`)
    console.log(`Email: ${cleanedData.email ? 'provided' : 'missing'}`)
    console.log(`WhatsApp: ${cleanedData.whatsapp ? 'provided' : 'missing'}`)

    return NextResponse.json({ 
      success: true, 
      action: 'created',
      lead_id: newLead.id,
      message: 'Lead criado com sucesso'
    })

  } catch (error) {
    console.error('Error in leads webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}

// Método GET para verificar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json({ 
    message: 'Leads API endpoint is working', 
    timestamp: new Date().toISOString(),
    usage: 'POST to this endpoint to create/update leads from Zapier'
  })
}