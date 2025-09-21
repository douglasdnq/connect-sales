'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from 'recharts'
import { TrendingUp, Users, Target, Clock, DollarSign, GraduationCap, Briefcase, Calendar, Filter, Download, RefreshCw } from 'lucide-react'

interface Lead {
  id: string
  full_name: string
  email: string
  whatsapp: string
  age: number
  education: string
  work_situation: string
  happy_with_work: string
  salary_range: string
  fiscal_study_moment: string
  study_time_dedication: string
  why_mentoria_ideal: string
  why_deserve_spot: string
  investment_type: string
  priority_start: string
  score: number
  status: string
  lead_source: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  form_date: string
  created_at: string
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchLeads()
  }, [dateRange, sourceFilter, statusFilter])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateRange.start && dateRange.end) {
        query = query.gte('form_date', dateRange.start).lte('form_date', dateRange.end)
      }

      if (sourceFilter !== 'all') {
        query = query.eq('lead_source', sourceFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error


      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Métricas do Cliente Ideal
  const getIdealClientMetrics = () => {
    const totalLeads = leads.length
    const idealAgeLeads = leads.filter(lead => lead.age >= 25 && lead.age <= 48).length

    // Usar lógica flexível para salário ideal (acima de R$ 3.000)
    const idealSalaryLeads = leads.filter(lead => {
      const salary = lead.salary_range || ''
      return (salary.includes('3.000') && salary.includes('6.000')) ||
             (salary.includes('6.000') && salary.includes('10.000')) ||
             (salary.includes('10.000') && salary.includes('Acima'))
    }).length

    const idealEducationLeads = leads.filter(lead =>
      lead.education?.toLowerCase().includes('engenharia') ||
      lead.education?.toLowerCase().includes('militar') ||
      lead.education?.toLowerCase().includes('engenheiro')
    ).length
    const idealWorkLeads = leads.filter(lead =>
      lead.work_situation?.toLowerCase().includes('trabalho') ||
      lead.work_situation?.toLowerCase().includes('empregado')
    ).length
    const highPriorityLeads = leads.filter(lead => lead.priority_start === 'Sim').length

    return {
      totalLeads,
      idealAge: { count: idealAgeLeads, percentage: totalLeads > 0 ? (idealAgeLeads / totalLeads * 100).toFixed(1) : '0' },
      idealSalary: { count: idealSalaryLeads, percentage: totalLeads > 0 ? (idealSalaryLeads / totalLeads * 100).toFixed(1) : '0' },
      idealEducation: { count: idealEducationLeads, percentage: totalLeads > 0 ? (idealEducationLeads / totalLeads * 100).toFixed(1) : '0' },
      idealWork: { count: idealWorkLeads, percentage: totalLeads > 0 ? (idealWorkLeads / totalLeads * 100).toFixed(1) : '0' },
      highPriority: { count: highPriorityLeads, percentage: totalLeads > 0 ? (highPriorityLeads / totalLeads * 100).toFixed(1) : '0' }
    }
  }

  // Distribuição por Idade
  const getAgeDistribution = () => {
    const ageRanges = [
      { range: '18-24', min: 18, max: 24, ideal: false },
      { range: '25-30', min: 25, max: 30, ideal: true },
      { range: '31-35', min: 31, max: 35, ideal: true },
      { range: '36-40', min: 36, max: 40, ideal: true },
      { range: '41-48', min: 41, max: 48, ideal: true },
      { range: '49+', min: 49, max: 999, ideal: false }
    ]

    return ageRanges.map(range => {
      const count = leads.filter(lead => lead.age >= range.min && lead.age <= range.max).length
      return {
        name: range.range,
        value: count,
        percentage: leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : '0',
        ideal: range.ideal
      }
    })
  }

  // Distribuição por Salário
  const getSalaryDistribution = () => {
    // Faixas conforme especificado: até 3k, 3k-6k, 6k-10k, acima de 10k
    const salaryGroups = [
      {
        label: 'Até R$ 3.000',
        match: (salary: string) => salary?.includes('3.000') && salary?.includes('Até'),
        ideal: false
      },
      {
        label: 'R$ 3.000 - R$ 6.000',
        match: (salary: string) => salary?.includes('3.000') && salary?.includes('6.000'),
        ideal: true
      },
      {
        label: 'R$ 6.000 - R$ 10.000',
        match: (salary: string) => salary?.includes('6.000') && salary?.includes('10.000'),
        ideal: true
      },
      {
        label: 'Acima de R$ 10.000',
        match: (salary: string) => salary?.includes('10.000') && salary?.includes('Acima'),
        ideal: true
      }
    ]

    const classificados = salaryGroups.map(group => {
      const count = leads.filter(lead => group.match(lead.salary_range || '')).length
      return {
        name: group.label,
        value: count,
        percentage: leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : '0',
        ideal: group.ideal
      }
    })

    // Adicionar valores não classificados
    const totalClassificados = classificados.reduce((sum, item) => sum + item.value, 0)
    const naoClassificados = leads.length - totalClassificados

    if (naoClassificados > 0) {
      classificados.push({
        name: 'Outros/Não informado',
        value: naoClassificados,
        percentage: leads.length > 0 ? ((naoClassificados / leads.length) * 100).toFixed(1) : '0',
        ideal: false
      })
    }

    return classificados.filter(item => item.value > 0)
  }

  // Top Formações
  const getEducationDistribution = () => {
    const educationCounts: { [key: string]: number } = {}

    leads.forEach(lead => {
      if (lead.education) {
        const education = lead.education.trim()
        educationCounts[education] = (educationCounts[education] || 0) + 1
      }
    })

    return Object.entries(educationCounts)
      .map(([education, count]) => {
        const ideal = education.toLowerCase().includes('engenharia') ||
                     education.toLowerCase().includes('militar') ||
                     education.toLowerCase().includes('engenheiro')
        return {
          name: education,
          value: count,
          percentage: leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : '0',
          ideal
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }

  // Evolução Temporal
  const getTemporalEvolution = () => {
    const dailyCounts: { [key: string]: number } = {}

    leads.forEach(lead => {
      const date = new Date(lead.form_date || lead.created_at).toISOString().split('T')[0]
      dailyCounts[date] = (dailyCounts[date] || 0) + 1
    })

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({
        date,
        leads: count,
        formattedDate: new Date(date).toLocaleDateString('pt-BR')
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Status de Prioridade
  const getPriorityDistribution = () => {
    const priorities = ['Sim', 'Não', '']
    return priorities.map(priority => {
      const count = leads.filter(lead => (lead.priority_start || '') === priority).length
      return {
        name: priority === '' ? 'Não informado' : priority,
        value: count,
        percentage: leads.length > 0 ? ((count / leads.length) * 100).toFixed(1) : '0',
        ideal: priority === 'Sim'
      }
    })
  }


  const metrics = getIdealClientMetrics()
  const ageData = getAgeDistribution()
  const salaryData = getSalaryDistribution()
  const educationData = getEducationDistribution()
  const temporalData = getTemporalEvolution()
  const priorityData = getPriorityDistribution()

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics de Leads</h1>
          <p className="text-gray-600 mt-1">Análise do perfil ideal dos leads do formulário</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas as fontes</option>
              <option value="google-sheets">Google Sheets</option>
              <option value="zapier">Zapier</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="new">Novo</option>
              <option value="contacted">Contatado</option>
              <option value="qualified">Qualificado</option>
              <option value="converted">Convertido</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Métricas do Cliente Ideal */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Leads</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalLeads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Idade Ideal (25-48)</p>
              <p className="text-2xl font-bold text-green-600">{metrics.idealAge.percentage}%</p>
              <p className="text-xs text-gray-500">{metrics.idealAge.count} leads</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Salário Ideal (+3k)</p>
              <p className="text-2xl font-bold text-emerald-600">{metrics.idealSalary.percentage}%</p>
              <p className="text-xs text-gray-500">{metrics.idealSalary.count} leads</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Formação Ideal</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.idealEducation.percentage}%</p>
              <p className="text-xs text-gray-500">{metrics.idealEducation.count} leads</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alta Prioridade</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.highPriority.percentage}%</p>
              <p className="text-xs text-gray-500">{metrics.highPriority.count} leads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Idade */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Idade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: any) => [value, 'Leads']}
                labelFormatter={(label) => `Faixa: ${label}`}
              />
              <Bar
                dataKey="value"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por Salário */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Salário</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={salaryData}
                cx="50%"
                cy="45%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {salaryData.map((entry, index) => {
                  // Cores diferentes para cada faixa
                  const colorMap = [
                    '#EF4444', // Vermelho para "Até 3k" (não ideal)
                    '#10B981', // Verde para "3k-6k" (ideal)
                    '#3B82F6', // Azul para "6k-10k" (ideal)
                    '#F59E0B', // Amarelo para "Acima 10k" (ideal)
                    '#9CA3AF'  // Cinza para "Outros"
                  ]
                  return (
                    <Cell key={`cell-${index}`} fill={colorMap[index] || '#9CA3AF'} />
                  )
                })}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any, props: any) => [
                  `${value} leads (${props.payload.percentage}%)`,
                  'Quantidade'
                ]}
                labelFormatter={(label) => `Faixa Salarial: ${label}`}
              />
              <Legend
                verticalAlign="bottom"
                height={60}
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(value, entry: any) => {
                  // Encurtar os nomes para não estourar o container
                  const shortName = value
                    .replace('R$ 3.000 - R$ 6.000', '3k-6k')
                    .replace('R$ 6.000 - R$ 10.000', '6k-10k')
                    .replace('Até R$ 3.000', 'Até 3k')
                    .replace('Acima de R$ 10.000', '+10k')
                  return `${shortName}: ${entry.payload.percentage}%`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Formações */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Formações</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {educationData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${item.ideal ? 'text-green-600' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                    {item.ideal && <Target className="w-4 h-4 text-green-600" />}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${item.ideal ? 'bg-green-500' : 'bg-gray-400'}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  <span className="text-xs text-gray-500 block">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução Temporal */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução Temporal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [value, 'Leads']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Prioridade e Outras Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prioridade de Início</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.ideal ? '#10B981' : '#9CA3AF'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Cliente Ideal</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">✅ Perfil Ideal</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Idade: 25-48 anos</li>
                <li>• Salário: Acima de R$ 3.000</li>
                <li>• Formação: Engenharia ou Militar</li>
                <li>• Situação: Empregado</li>
                <li>• Prioridade: Sim</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((metrics.idealAge.count / metrics.totalLeads) * 100) || 0}%
                </div>
                <div className="text-xs text-blue-600">Idade Ideal</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((metrics.idealSalary.count / metrics.totalLeads) * 100) || 0}%
                </div>
                <div className="text-xs text-green-600">Salário Ideal</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}