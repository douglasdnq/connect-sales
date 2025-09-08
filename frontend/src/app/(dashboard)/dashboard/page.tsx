'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, DollarSign, Users, AlertTriangle, Webhook } from 'lucide-react'
import DashboardCard from '@/components/DashboardCard'
import { getDashboardStats } from '@/lib/database'
import type { RawEvent } from '@/lib/supabase'

interface DashboardStats {
  totalOrders: number
  paidOrders: number
  totalRevenue: number
  recentEvents: RawEvent[]
  errorCount: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Erro ao carregar dados</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral dos seus dados de infoprodutos</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total de Pedidos"
          value={stats.totalOrders}
          description="Últimos 7 dias"
          icon={ShoppingCart}
        />
        
        <DashboardCard
          title="Pedidos Pagos"
          value={stats.paidOrders}
          description="Últimos 7 dias"
          icon={DollarSign}
        />
        
        <DashboardCard
          title="Receita do Mês"
          value={formatCurrency(stats.totalRevenue)}
          description="Mês atual"
          icon={DollarSign}
        />
        
        <DashboardCard
          title="Erros (24h)"
          value={stats.errorCount}
          description="Últimas 24 horas"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold flex items-center">
              <Webhook className="w-5 h-5 mr-2" />
              Eventos Recentes
            </h2>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {stats.recentEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum evento recente</p>
              ) : (
                stats.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{event.event_type || 'N/A'}</p>
                      <p className="text-sm text-gray-500">
                        {event.platform?.name || `Platform ${event.platform_id}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(event.received_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Configuração Rápida</h2>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">Webhooks das Plataformas</h3>
                <p className="text-sm text-blue-700 mt-1">Configure os webhooks das suas plataformas</p>
                <button 
                  className="mt-2 btn-primary text-sm"
                  onClick={() => router.push('/settings')}
                >
                  Configurar Webhooks
                </button>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900">Meta Ads Sync</h3>
                <p className="text-sm text-green-700 mt-1">Sincronize dados do Meta Ads</p>
                <button 
                  className="mt-2 btn-primary text-sm"
                  onClick={() => router.push('/settings')}
                >
                  Configurar Meta Ads
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}