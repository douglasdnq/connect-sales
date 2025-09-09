'use client'

import { useEffect, useState } from 'react'
import { Target, TrendingUp, DollarSign, Package, Calendar, Edit, Save, X } from 'lucide-react'
import { getGoalProgress, getCurrentMonthGoal, saveGoal } from '@/lib/database'
import type { Goal } from '@/lib/supabase'

interface GoalProgress {
  goal: Goal
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
}

export default function Goals() {
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Goal>>({})

  // Estados para seleção de mês/ano
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()

  useEffect(() => {
    loadGoalProgress()
  }, [selectedMonth, selectedYear])

  const loadGoalProgress = async () => {
    setLoading(true)
    
    const emptyGoal: Goal = {
      id: 0,
      month: selectedMonth,
      year: selectedYear,
      dza_sales_target: 0,
      mentoria_sales_target: 0,
      dza_revenue_target: 0,
      mentoria_revenue_target: 0,
      global_revenue_target: 0,
      created_at: '',
      updated_at: ''
    }
    
    try {
      const { data, error } = await getGoalProgress(selectedMonth, selectedYear)
      
      if (error) {
        console.error('Erro ao carregar progresso das metas:', error)
        // Se não há meta, criar uma vazia
        const emptyProgress: GoalProgress = {
          goal: emptyGoal,
          current: { dza_sales: 0, mentoria_sales: 0, dza_revenue: 0, mentoria_revenue: 0, global_revenue: 0 },
          progress: { dza_sales: 0, mentoria_sales: 0, dza_revenue: 0, mentoria_revenue: 0, global_revenue: 0 }
        }
        
        setProgress(emptyProgress)
        setFormData(emptyGoal)
      } else {
        setProgress(data)
        setFormData(data?.goal || emptyGoal)
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const goalData = {
        month: selectedMonth,
        year: selectedYear,
        dza_sales_target: formData.dza_sales_target || 0,
        mentoria_sales_target: formData.mentoria_sales_target || 0,
        dza_revenue_target: formData.dza_revenue_target || 0,
        mentoria_revenue_target: formData.mentoria_revenue_target || 0,
        global_revenue_target: formData.global_revenue_target || 0,
      }

      const { error } = await saveGoal(goalData)
      if (error) {
        console.error('Erro ao salvar meta:', error)
        alert('Erro ao salvar meta: ' + error.message)
      } else {
        setEditing(false)
        await loadGoalProgress() // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar meta')
    } finally {
      setSaving(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (editing) return // Não permitir navegação durante edição
    
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value) // Valores já em reais
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600'
    if (percentage >= 75) return 'text-yellow-600'
    if (percentage >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metas Mensais</h1>
          <p className="text-gray-600">Acompanhe e configure suas metas para {monthName}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setEditing(false)
                  setFormData(progress?.goal || {})
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              Editar Metas
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Mês/Ano */}
      <div className="card">
        <div className="card-content">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(parseInt(e.target.value))
                    setEditing(false) // Cancelar edição ao mudar mês
                  }}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={editing}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1
                    const monthName = new Date(2025, i, 1).toLocaleDateString('pt-BR', { month: 'long' })
                    return (
                      <option key={month} value={month}>
                        {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                      </option>
                    )
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value))
                    setEditing(false) // Cancelar edição ao mudar ano
                  }}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={editing}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i
                    return (
                      <option key={year} value={year}>{year}</option>
                    )
                  })}
                </select>
              </div>

            </div>

            <div className="text-sm text-gray-500">
              {editing ? "Termine a edição antes de mudar o período" : 
               !isCurrentMonth ? "📊 Visualizando dados históricos" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* DZA Sales */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Vendas DZA</h3>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.dza_sales_target || ''}
                      onChange={(e) => setFormData({...formData, dza_sales_target: parseInt(e.target.value) || 0})}
                      className="text-2xl font-bold text-gray-900 w-20 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {progress?.current.dza_sales || 0} / {progress?.goal.dza_sales_target || 0}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!editing && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress.dza_sales || 0)}`}
                    style={{ width: `${Math.min(progress?.progress.dza_sales || 0, 100)}%` }}
                  ></div>
                </div>
                <div className={`text-right text-sm font-medium ${getProgressTextColor(progress?.progress.dza_sales || 0)}`}>
                  {(progress?.progress.dza_sales || 0).toFixed(1)}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mentoria Sales */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Vendas Mentoria</h3>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.mentoria_sales_target || ''}
                      onChange={(e) => setFormData({...formData, mentoria_sales_target: parseInt(e.target.value) || 0})}
                      className="text-2xl font-bold text-gray-900 w-20 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {progress?.current.mentoria_sales || 0} / {progress?.goal.mentoria_sales_target || 0}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!editing && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress.mentoria_sales || 0)}`}
                    style={{ width: `${Math.min(progress?.progress.mentoria_sales || 0, 100)}%` }}
                  ></div>
                </div>
                <div className={`text-right text-sm font-medium ${getProgressTextColor(progress?.progress.mentoria_sales || 0)}`}>
                  {(progress?.progress.mentoria_sales || 0).toFixed(1)}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* Global Revenue */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Faturamento Total</h3>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.global_revenue_target || ''}
                      onChange={(e) => setFormData({...formData, global_revenue_target: parseFloat(e.target.value) || 0})}
                      className="text-lg font-bold text-gray-900 w-32 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(progress?.current.global_revenue || 0)} / {formatCurrency(progress?.goal.global_revenue_target || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!editing && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress.global_revenue || 0)}`}
                    style={{ width: `${Math.min(progress?.progress.global_revenue || 0, 100)}%` }}
                  ></div>
                </div>
                <div className={`text-right text-sm font-medium ${getProgressTextColor(progress?.progress.global_revenue || 0)}`}>
                  {(progress?.progress.global_revenue || 0).toFixed(1)}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* DZA Revenue */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Faturamento DZA</h3>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.dza_revenue_target || ''}
                      onChange={(e) => setFormData({...formData, dza_revenue_target: parseFloat(e.target.value) || 0})}
                      className="text-lg font-bold text-gray-900 w-32 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(progress?.current.dza_revenue || 0)} / {formatCurrency(progress?.goal.dza_revenue_target || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!editing && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress.dza_revenue || 0)}`}
                    style={{ width: `${Math.min(progress?.progress.dza_revenue || 0, 100)}%` }}
                  ></div>
                </div>
                <div className={`text-right text-sm font-medium ${getProgressTextColor(progress?.progress.dza_revenue || 0)}`}>
                  {(progress?.progress.dza_revenue || 0).toFixed(1)}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mentoria Revenue */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Faturamento Mentoria</h3>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mentoria_revenue_target || ''}
                      onChange={(e) => setFormData({...formData, mentoria_revenue_target: parseFloat(e.target.value) || 0})}
                      className="text-lg font-bold text-gray-900 w-32 border-b border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(progress?.current.mentoria_revenue || 0)} / {formatCurrency(progress?.goal.mentoria_revenue_target || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!editing && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress?.progress.mentoria_revenue || 0)}`}
                    style={{ width: `${Math.min(progress?.progress.mentoria_revenue || 0, 100)}%` }}
                  ></div>
                </div>
                <div className={`text-right text-sm font-medium ${getProgressTextColor(progress?.progress.mentoria_revenue || 0)}`}>
                  {(progress?.progress.mentoria_revenue || 0).toFixed(1)}%
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {editing && (
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Dicas para definir metas</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Vendas</h4>
                <ul className="space-y-1">
                  <li>• Base-se no histórico dos últimos meses</li>
                  <li>• Considere sazonalidade e campanhas</li>
                  <li>• Defina metas desafiadoras mas realistas</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Faturamento</h4>
                <ul className="space-y-1">
                  <li>• Valores em reais (ex: 25000 para R$ 25.000)</li>
                  <li>• Considere comissões e impostos</li>
                  <li>• Alinhe com objetivos financeiros do negócio</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}