'use client'

import { useEffect, useState } from 'react'
import { Search, Calendar, ExternalLink, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getWebhookEvents } from '@/lib/database'

interface WebhookEvent {
  id: string
  platform: string
  event_type: string
  order_id?: string
  customer_email?: string
  processed: boolean
  error_message?: string
  payload: any
  created_at: string
}

export default function Events() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await getWebhookEvents(100)
      if (error) {
        console.error('Erro ao carregar eventos:', error)
      } else {
        console.log('Eventos carregados:', data) // Debug
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'success' && event.processed && !event.error_message) ||
                         (statusFilter === 'error' && (!event.processed || event.error_message)) ||
                         (statusFilter === 'pending' && !event.processed && !event.error_message)
    
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (event: WebhookEvent) => {
    if (event.error_message) {
      return <XCircle className="h-4 w-4 text-red-500" />
    } else if (event.processed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (event: WebhookEvent) => {
    if (event.error_message) return 'Erro'
    if (event.processed) return 'Sucesso'
    return 'Pendente'
  }

  const getStatusColor = (event: WebhookEvent) => {
    if (event.error_message) return 'bg-red-100 text-red-800'
    if (event.processed) return 'bg-green-100 text-green-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'kiwify': return 'bg-green-100 text-green-800'
      case 'dmg': return 'bg-blue-100 text-blue-800'
      case 'cademi': return 'bg-purple-100 text-purple-800'
      case 'voomp': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-600">Histórico de eventos de webhooks recebidos</p>
        </div>
        <button
          onClick={fetchEvents}
          className="btn-primary"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </button>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredEvents.length}
            </div>
            <div className="text-sm text-gray-500">Total Eventos</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredEvents.filter(e => e.processed && !e.error_message).length}
            </div>
            <div className="text-sm text-gray-500">Sucessos</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredEvents.filter(e => !e.processed && !e.error_message).length}
            </div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredEvents.filter(e => e.error_message).length}
            </div>
            <div className="text-sm text-gray-500">Erros</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por evento, plataforma, pedido ou email..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os Status</option>
                <option value="success">Sucesso</option>
                <option value="pending">Pendente</option>
                <option value="error">Erro</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="card">
        <div className="card-content p-0">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {event.event_type}
                          </div>
                          {event.customer_email && (
                            <div className="text-xs text-gray-500">
                              {event.customer_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPlatformColor(event.platform)}`}>
                          {event.platform.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.order_id ? (
                            <div>
                              <div className="font-medium">{event.order_id}</div>
                              <div className="text-xs text-gray-500">
                                ID: {event.id.slice(0, 8)}...
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(event)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event)}`}>
                            {getStatusText(event)}
                          </span>
                        </div>
                        {event.error_message && (
                          <div className="text-xs text-red-600 mt-1 truncate max-w-xs">
                            {event.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(event.created_at).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            console.log('Payload do evento:', event.payload)
                            alert('Payload do evento logado no console')
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}