import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { eventIds } = await request.json()

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs de eventos são obrigatórios' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Excluindo ${eventIds.length} registros em massa`)

    // Excluir registros em lotes para melhor performance
    const batchSize = 100
    let deletedCount = 0

    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from('raw_events')
        .delete()
        .in('id', batch)

      if (error) {
        console.error(`Erro ao excluir lote ${i / batchSize + 1}:`, error)
        throw error
      }

      deletedCount += batch.length
      console.log(`✅ Lote ${i / batchSize + 1} excluído: ${batch.length} registros`)
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} registros excluídos com sucesso`,
      deletedCount
    })

  } catch (error) {
    console.error('Erro na exclusão em massa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir registros' },
      { status: 500 }
    )
  }
}