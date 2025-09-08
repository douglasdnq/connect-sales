'use client'

import { useEffect, useState } from 'react'
import { Search, AlertCircle, Calendar, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ErrorLog {
  id: string
  platform: string
  error_type: string
  error_message: string
  payload?: any
  endpoint?: string
  status_code?: number
  created_at: string
}

export default function Errors() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  useEffect(() => {
    fetchErrors()
  }, [])

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Erro ao carregar logs de erro:', error)
      } else {
        setErrors(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar logs de erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.error_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.platform.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPlatform = platformFilter === 'all' || error.platform.toLowerCase() === platformFilter.toLowerCase()
    
    return matchesSearch && matchesPlatform
  })

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'kiwify': return 'bg-green-100 text-green-800'
      case 'dmg': return 'bg-blue-100 text-blue-800'
      case 'cademi': return 'bg-purple-100 text-purple-800'
      case 'voomp': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType.toLowerCase()) {
      case 'validation': return 'bg-yellow-100 text-yellow-800'
      case 'authentication': return 'bg-red-100 text-red-800'
      case 'database': return 'bg-purple-100 text-purple-800'
      case 'network': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const platforms = Array.from(new Set(errors.map(e => e.platform)))

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
          <h1 className="text-3xl font-bold text-gray-900">Erros</h1>
          <p className="text-gray-600">Logs de erros e falhas no processamento</p>
        </div>
        <button
          onClick={fetchErrors}
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
              {filteredErrors.length}
            </div>
            <div className="text-sm text-gray-500">Total Erros</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredErrors.filter(e => e.status_code && e.status_code >= 500).length}
            </div>
            <div className="text-sm text-gray-500">Erros do Servidor</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredErrors.filter(e => e.status_code && e.status_code >= 400 && e.status_code < 500).length}
            </div>
            <div className="text-sm text-gray-500">Erros do Cliente</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredErrors.filter(e => e.error_type.toLowerCase() === 'validation').length}
            </div>
            <div className="text-sm text-gray-500">Erros de Validação</div>
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
                  placeholder="Buscar por erro, tipo ou plataforma..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="all">Todas as Plataformas</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform}>{platform.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Erros */}
      <div className="card">
        <div className="card-content p-0">
          {filteredErrors.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum erro encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                {errors.length === 0 ? 'Ótimo! Não há erros registrados.' : 'Tente ajustar os filtros.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Erro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Code
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
                  {filteredErrors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {error.error_message}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {error.id.slice(0, 8)}...
                            </div>
                            {error.endpoint && (
                              <div className="text-xs text-gray-500 mt-1">
                                Endpoint: {error.endpoint}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getErrorTypeColor(error.error_type)}`}>
                          {error.error_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPlatformColor(error.platform)}`}>
                          {error.platform.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {error.status_code ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            error.status_code >= 500 ? 'bg-red-100 text-red-800' :
                            error.status_code >= 400 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {error.status_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(error.created_at).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            console.log('Detalhes do erro:', {
                              id: error.id,
                              error_message: error.error_message,
                              error_type: error.error_type,
                              platform: error.platform,
                              payload: error.payload,
                              created_at: error.created_at
                            })
                            alert('Detalhes do erro logados no console')
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