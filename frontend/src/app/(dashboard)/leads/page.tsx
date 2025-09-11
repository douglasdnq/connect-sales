'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/supabase'
import { User, Phone, Mail, Calendar, Target, TrendingUp, Download, Upload, Filter, Search, Eye, Edit, Trash2, X } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    conversionRate: 0
  })

  useEffect(() => {
    fetchLeads()
    fetchStats()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('status')

      if (error) throw error

      const total = data?.length || 0
      const newLeads = data?.filter(l => l.status === 'new').length || 0
      const contacted = data?.filter(l => l.status === 'contacted').length || 0
      const qualified = data?.filter(l => l.status === 'qualified').length || 0
      const converted = data?.filter(l => l.status === 'converted').length || 0
      const lost = data?.filter(l => l.status === 'lost').length || 0
      const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

      setStats({
        total,
        new: newLeads,
        contacted,
        qualified,
        converted,
        lost,
        conversionRate
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) throw error

      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: newStatus as any }
          : lead
      ))
      
      fetchStats()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (error) throw error

      setLeads(prev => prev.filter(lead => lead.id !== leadId))
      fetchStats()
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp?.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter

    return matchesSearch && matchesStatus && matchesSource
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-purple-100 text-purple-800'
      case 'converted': return 'bg-green-100 text-green-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Novo'
      case 'contacted': return 'Contatado'
      case 'qualified': return 'Qualificado'
      case 'converted': return 'Convertido'
      case 'lost': return 'Perdido'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    // Criar data a partir da string
    const date = new Date(dateString)
    
    // Verificar se a data parece estar em UTC (dados do Respondi)
    // Se for recente (menos de 1 ano) e parece estar com 3h a mais, corrigir
    const now = new Date()
    const isRecent = (now.getTime() - date.getTime()) < (365 * 24 * 60 * 60 * 1000) // menos de 1 ano
    
    // Se for dado recente, assumir que está em UTC e converter para horário de Brasília (UTC-3)
    const adjustedDate = isRecent ? new Date(date.getTime() - (3 * 60 * 60 * 1000)) : date
    
    return adjustedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)))
    }
  }

  const bulkDeleteLeads = async () => {
    if (selectedLeads.size === 0) return
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.size} leads selecionados?`)) {
      return
    }

    try {
      setBulkDeleting(true)
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', Array.from(selectedLeads))

      if (error) throw error

      setLeads(prev => prev.filter(lead => !selectedLeads.has(lead.id)))
      setSelectedLeads(new Set())
      fetchStats()
    } catch (error) {
      console.error('Erro ao excluir leads:', error)
    } finally {
      setBulkDeleting(false)
    }
  }

  const viewLead = (lead: Lead) => {
    console.log('Lead data:', lead) // Debug: ver dados do lead
    setSelectedLead(lead)
    setShowLeadModal(true)
  }

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'WhatsApp', 'Idade', 'Formação', 'Situação Profissional', 'Status', 'Fonte', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Data Criação']
    
    const csvData = [
      headers,
      ...filteredLeads.map(lead => [
        lead.full_name || '',
        lead.email || '',
        lead.whatsapp || '',
        lead.age?.toString() || '',
        lead.education || '',
        lead.work_situation || '',
        getStatusLabel(lead.status),
        lead.lead_source,
        lead.utm_source || '',
        lead.utm_medium || '',
        lead.utm_campaign || '',
        formatDate(lead.created_at)
      ])
    ]

    const csvContent = csvData
      .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <div className="flex gap-2">
          <Link 
            href="/leads/import"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar
          </Link>
          <button 
            onClick={() => { fetchLeads(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Recarregar dados"
          >
            <Calendar className="w-4 h-4" />
            Recarregar
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Barra de ações em lote */}
      {selectedLeads.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-800 font-medium">
              {selectedLeads.size} lead(s) selecionado(s)
            </span>
            <button
              onClick={() => setSelectedLeads(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Limpar seleção
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={bulkDeleteLeads}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting ? 'Excluindo...' : 'Excluir Selecionados'}
            </button>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Novos</p>
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Phone className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Contatados</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Qualificados</p>
              <p className="text-2xl font-bold text-purple-600">{stats.qualified}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Convertidos</p>
              <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Taxa Conv.</p>
              <p className="text-2xl font-bold text-green-600">{stats.conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou WhatsApp..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="new">Novo</option>
            <option value="contacted">Contatado</option>
            <option value="qualified">Qualificado</option>
            <option value="converted">Convertido</option>
            <option value="lost">Perdido</option>
          </select>

          <select
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Todas as fontes</option>
            <option value="zapier">Zapier</option>
            <option value="google-sheets">Google Sheets</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Tabela de leads */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Aplicação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa Salarial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(lead.form_date || lead.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {lead.full_name || 'Nome não informado'}
                    </div>
                    {lead.age && (
                      <div className="text-sm text-gray-500">
                        {lead.age} anos
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {lead.salary_range || 'Não informado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {lead.priority_start || 'Não informado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.whatsapp ? (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {lead.whatsapp}
                      </div>
                    ) : (
                      <span className="text-gray-400">Não informado</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(lead.status)}`}
                    >
                      <option value="new">Novo</option>
                      <option value="contacted">Contatado</option>
                      <option value="qualified">Qualificado</option>
                      <option value="converted">Convertido</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      onClick={() => viewLead(lead)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Visualizar detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      className="text-gray-600 hover:text-gray-900"
                      title="Editar lead"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteLead(lead.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Excluir lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum lead encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar leads.'
                : 'Comece importando leads do Google Sheets ou via API.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de visualização de detalhes */}
      {showLeadModal && selectedLead && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Detalhes do Lead
              </h3>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações pessoais */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informações Pessoais</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID</label>
                    <p className="text-xs text-gray-600 font-mono">{selectedLead.id}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <p className="text-sm text-gray-900">{selectedLead.full_name || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedLead.email || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <p className="text-sm text-gray-900">{selectedLead.whatsapp || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Idade</label>
                    <p className="text-sm text-gray-900">{selectedLead.age || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Formação</label>
                    <p className="text-sm text-gray-900">{selectedLead.education || 'Não informado'}</p>
                  </div>
                </div>

                {/* Informações profissionais */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informações Profissionais</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Situação Profissional</label>
                    <p className="text-sm text-gray-900">{selectedLead.work_situation || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Feliz com trabalho</label>
                    <p className="text-sm text-gray-900">{selectedLead.happy_with_work || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Faixa Salarial</label>
                    <p className="text-sm text-gray-900">{selectedLead.salary_range || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Momento para estudar fiscal</label>
                    <p className="text-sm text-gray-900">{selectedLead.fiscal_study_moment || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tempo de dedicação</label>
                    <p className="text-sm text-gray-900">{selectedLead.study_time_dedication || 'Não informado'}</p>
                  </div>
                </div>

                {/* Informações de origem */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informações de Origem</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fonte</label>
                    <p className="text-sm text-gray-900">{selectedLead.lead_source}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">UTM Source</label>
                    <p className="text-sm text-gray-900">{selectedLead.utm_source || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">UTM Medium</label>
                    <p className="text-sm text-gray-900">{selectedLead.utm_medium || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">UTM Campaign</label>
                    <p className="text-sm text-gray-900">{selectedLead.utm_campaign || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">UTM Term</label>
                    <p className="text-sm text-gray-900">{selectedLead.utm_term || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">UTM Content</label>
                    <p className="text-sm text-gray-900">{selectedLead.utm_content || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Google Click ID (GCLID)</label>
                    <p className="text-sm text-gray-900">{selectedLead.gclid || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Facebook Click ID (FBCLID)</label>
                    <p className="text-sm text-gray-900">{selectedLead.fbclid || 'Não informado'}</p>
                  </div>
                </div>

                {/* Status e datas */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Status e Datas</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status Atual</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(selectedLead.status)}`}>
                      {getStatusLabel(selectedLead.status)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data do Formulário</label>
                    <p className="text-sm text-gray-900">
                      {selectedLead.form_date ? formatDate(selectedLead.form_date) : 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Criado em</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedLead.created_at)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Atualizado em</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedLead.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowLeadModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}