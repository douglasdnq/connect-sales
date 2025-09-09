'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShoppingCart, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  ArrowUpRight,
  Clock
} from 'lucide-react'
import { getGoalProgress, getAscensions } from '@/lib/database'
import type { Goal } from '@/lib/supabase'

interface DashboardData {
  // Métricas principais
  dzaSales: number
  dzaRevenue: number
  kiwifySales: number
  kiwifyRevenue: number
  mentoriaSales: number
  mentoriaRevenue: number
  conversions: number
  conversionRate: number
  
  // Progresso das metas
  goalProgress: {
    goal: Goal | null
    current: {
      dza_sales: number
      mentoria_sales: number
      dza_revenue: number
      mentoria_revenue: number
      global_revenue: number
    }
    progress: {
      dza_sales: number
      mentoria_sales: number
      dza_revenue: number
      mentoria_revenue: number
      global_revenue: number
    }
  } | null
  
  // Dados anuais
  monthlyRevenue: Array<{ month: number, revenue: number }>
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const router = useRouter()
  
  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Buscar dados das metas para o mês selecionado
        const { data: goalData, error: goalError } = await getGoalProgress(selectedMonth, selectedYear)
        
        if (goalError && !goalError.includes('Meta não encontrada')) {
          console.error('Erro ao carregar metas:', goalError)
        }

        // Buscar ascensões reais para o mês selecionado
        const { data: ascensions, error: ascensionsError } = await getAscensions(selectedMonth, selectedYear)
        
        if (ascensionsError) {
          console.error('Erro ao carregar ascensões:', ascensionsError)
        }

        // Buscar dados de todos os meses do ano para o gráfico anual
        const monthlyData = []
        for (let month = 1; month <= 12; month++) {
          try {
            const { data: monthData } = await getGoalProgress(month, selectedYear)
            monthlyData.push({
              month,
              revenue: monthData?.current.global_revenue || 0
            })
          } catch {
            monthlyData.push({ month, revenue: 0 })
          }
        }

        const dashboardData: DashboardData = {
          dzaSales: (goalData?.current.dza_sales || 0) + (goalData?.current.mentoria_sales || 0), // Vendas totais (DZA + Mentoria)
          dzaRevenue: (goalData?.current.dza_revenue || 0) + (goalData?.current.mentoria_revenue || 0), // Faturamento total (DZA + Mentoria)
          kiwifySales: goalData?.current.dza_sales || 0, // Vendas apenas da Kiwify
          kiwifyRevenue: goalData?.current.dza_revenue || 0, // Faturamento apenas da Kiwify
          mentoriaSales: goalData?.current.mentoria_sales || 0,
          mentoriaRevenue: goalData?.current.mentoria_revenue || 0,
          conversions: ascensions || 0, // Ascensões reais
          conversionRate: goalData?.current.dza_sales && goalData.current.dza_sales > 0 
            ? (((ascensions || 0) / goalData.current.dza_sales) * 100) 
            : 0,
          goalProgress: goalData,
          monthlyRevenue: monthlyData
        }

        setDashboardData(dashboardData)
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [selectedMonth, selectedYear])

  // Função para navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth
    let newYear = selectedYear

    if (direction === 'next') {
      if (selectedMonth === 12) {
        newMonth = 1
        newYear = selectedYear + 1
      } else {
        newMonth = selectedMonth + 1
      }
    } else {
      if (selectedMonth === 1) {
        newMonth = 12
        newYear = selectedYear - 1
      } else {
        newMonth = selectedMonth - 1
      }
    }

    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  // Função para calcular dias restantes do mês
  const getDaysRemainingInMonth = () => {
    if (!isCurrentMonth) return null
    
    const today = new Date()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const daysRemaining = lastDayOfMonth.getDate() - today.getDate()
    return Math.max(0, daysRemaining)
  }

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Erro ao carregar dados</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const daysRemaining = getDaysRemainingInMonth()

  return (
    <div className="space-y-6">
      {/* Header com Seleção de Mês */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Análise completa de performance e metas</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Navegação de Mês */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-900 capitalize">{monthName}</span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Contador de Dias Restantes */}
          {isCurrentMonth && daysRemaining !== null && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vendas Totais</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.dzaSales}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData.dzaRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vendas DZA</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.kiwifySales}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData.kiwifyRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mentorias</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.mentoriaSales}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData.mentoriaRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taxa Conversão</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">{dashboardData.conversions} ascensões</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Faturamento por Fonte */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Faturamento por Fonte</h3>
            <div className="h-64 flex items-center justify-center">
              {/* Gráfico simples com CSS */}
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Segmento DZA */}
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="20"
                    strokeDasharray={`${(dashboardData.kiwifyRevenue / dashboardData.dzaRevenue) * 188.5} 188.5`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                  {/* Segmento Mentoria */}
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="20"
                    strokeDasharray={`${(dashboardData.mentoriaRevenue / dashboardData.dzaRevenue) * 188.5} 188.5`}
                    strokeDashoffset={`-${(dashboardData.kiwifyRevenue / dashboardData.dzaRevenue) * 188.5}`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">DZA</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(dashboardData.kiwifyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Mentoria</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(dashboardData.mentoriaRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progresso das Metas */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso das Metas</h3>
            {dashboardData.goalProgress?.goal ? (
              <div className="space-y-4">
                {/* Vendas DZA */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Vendas DZA</span>
                    <span className="font-medium">{dashboardData.goalProgress.progress.dza_sales.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, dashboardData.goalProgress.progress.dza_sales)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dashboardData.goalProgress.current.dza_sales} / {dashboardData.goalProgress.goal.dza_sales_target}
                  </div>
                </div>

                {/* Vendas Mentoria */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Vendas Mentoria</span>
                    <span className="font-medium">{dashboardData.goalProgress.progress.mentoria_sales.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, dashboardData.goalProgress.progress.mentoria_sales)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dashboardData.goalProgress.current.mentoria_sales} / {dashboardData.goalProgress.goal.mentoria_sales_target}
                  </div>
                </div>

                {/* Receita Global */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Receita Global</span>
                    <span className="font-medium">{dashboardData.goalProgress.progress.global_revenue.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, dashboardData.goalProgress.progress.global_revenue)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatCurrency(dashboardData.goalProgress.current.global_revenue)} / {formatCurrency(dashboardData.goalProgress.goal.global_revenue_target)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p>Nenhuma meta definida para este mês</p>
                <button 
                  onClick={() => router.push('/goals')}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Definir Metas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Faturamento Mensal */}
      <div className="card">
        <div className="card-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Faturamento Mensal {selectedYear}</h3>
          <div className="h-64">
            <div className="flex items-end justify-between h-full gap-2">
              {dashboardData.monthlyRevenue.map((item) => {
                const maxRevenue = Math.max(...dashboardData.monthlyRevenue.map(i => i.revenue))
                const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${
                        item.month === selectedMonth ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      style={{ height: `${height}%`, minHeight: item.revenue > 0 ? '4px' : '0px' }}
                      title={`${monthNames[item.month - 1]}: ${formatCurrency(item.revenue)}`}
                    ></div>
                    <span className={`text-xs mt-2 ${
                      item.month === selectedMonth ? 'font-semibold text-blue-600' : 'text-gray-500'
                    }`}>
                      {monthNames[item.month - 1]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button 
          onClick={() => router.push('/goals')}
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="card-content text-center">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Gerenciar Metas</p>
            <p className="text-sm text-gray-500">Definir e acompanhar metas</p>
          </div>
        </button>

        <button 
          onClick={() => router.push('/orders')}
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="card-content text-center">
            <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Ver Pedidos</p>
            <p className="text-sm text-gray-500">Análise detalhada de vendas</p>
          </div>
        </button>

        <button 
          onClick={() => router.push('/customers')}
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="card-content text-center">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Jornada do Cliente</p>
            <p className="text-sm text-gray-500">Conversão DZA → Mentoria</p>
          </div>
        </button>
      </div>
    </div>
  )
}