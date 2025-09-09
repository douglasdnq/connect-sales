'use client'

import { useEffect, useState } from 'react'
import { Search, Phone, Calendar, TrendingUp, Package, Clock, User, Mail, ChevronUp, ChevronDown } from 'lucide-react'
import { getCustomersJourney } from '@/lib/database'

interface CustomerJourney {
  name: string
  email: string
  phone: string
  cpf: string | null
  dzaDate: string | null
  mentoriaDate: string | null
  materials: Array<{ name: string, date: string, platform: string }>
  daysBetween: number | null
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<'name' | 'dzaDate' | 'mentoriaDate' | 'daysBetween' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const { data, error } = await getCustomersJourney()
        if (error) {
          console.error('Erro ao carregar clientes:', error)
        } else {
          setCustomers(data || [])
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    
    // Remover caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '')
    
    // Remover código do país +55 se presente
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      cleaned = cleaned.slice(2)
    }
    
    // Formatar telefone brasileiro (DDD + número)
    if (cleaned.length === 11) {
      // Celular: (XX) 9XXXX-XXXX
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    } else if (cleaned.length === 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    
    return phone // Retorna original se não conseguir formatar
  }


  // Estatísticas
  const totalCustomers = filteredCustomers.length
  const dzaCustomers = filteredCustomers.filter(c => c.dzaDate).length
  const mentoriaCustomers = filteredCustomers.filter(c => c.mentoriaDate).length
  const conversionRate = dzaCustomers > 0 ? ((mentoriaCustomers / dzaCustomers) * 100).toFixed(1) : '0'
  const avgDaysBetween = filteredCustomers
    .filter(c => c.daysBetween !== null)
    .reduce((sum, c, _, arr) => sum + (c.daysBetween! / arr.length), 0)

  // Função de ordenação
  const handleSort = (field: 'name' | 'dzaDate' | 'mentoriaDate' | 'daysBetween') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset para primeira página
  }

  // Aplicar ordenação
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]
    
    // Tratar valores nulos/undefined
    if (aValue === null || aValue === undefined) aValue = sortField === 'daysBetween' ? -1 : ''
    if (bValue === null || bValue === undefined) bValue = sortField === 'daysBetween' ? -1 : ''
    
    // Converter datas para timestamp para ordenação
    if (sortField === 'dzaDate' || sortField === 'mentoriaDate') {
      aValue = aValue ? new Date(aValue).getTime() : 0
      bValue = bValue ? new Date(bValue).getTime() : 0
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Aplicar paginação
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage)
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

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
          <h1 className="text-3xl font-bold text-gray-900">Análise de Clientes</h1>
          <p className="text-gray-600">Jornada DZA → Mentoria e análise de conversão</p>
        </div>
      </div>

      {/* Estatísticas da Jornada */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalCustomers}
            </div>
            <div className="text-sm text-gray-500">Total Clientes</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dzaCustomers}
            </div>
            <div className="text-sm text-gray-500">Compraram DZA</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-green-600">
              {mentoriaCustomers}
            </div>
            <div className="text-sm text-gray-500">Entraram Mentoria</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-purple-600">
              {conversionRate}%
            </div>
            <div className="text-sm text-gray-500">Taxa Conversão</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-orange-600">
              {avgDaysBetween > 0 ? Math.round(avgDaysBetween) : 0}
            </div>
            <div className="text-sm text-gray-500">Dias Médios</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-content">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lista de Clientes com Jornada */}
      <div className="card">
        <div className="card-content p-0">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum cliente encontrado</p>
              <p className="text-sm text-gray-400 mt-2">Tente ajustar os filtros de busca.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-4 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                      >
                        Cliente
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-4 py-4 text-left">
                      <button
                        onClick={() => handleSort('dzaDate')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                      >
                        Data DZA
                        {sortField === 'dzaDate' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <button
                        onClick={() => handleSort('mentoriaDate')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                      >
                        Data Mentoria
                        {sortField === 'mentoriaDate' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <button
                        onClick={() => handleSort('daysBetween')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                      >
                        Dias Entre
                        {sortField === 'daysBetween' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Jornada
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedCustomers.map((customer, index) => (
                    <tr key={`${customer.email || customer.cpf || index}-${index}`} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name || 'Nome não informado'}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              {customer.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          {formatPhone(customer.phone)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {customer.dzaDate ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-blue-700 font-medium">
                              {formatDate(customer.dzaDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {customer.mentoriaDate ? (
                          <div className="flex items-center text-sm">
                            <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-green-700 font-medium">
                              {formatDate(customer.mentoriaDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {customer.daysBetween !== null ? (
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 text-orange-500 mr-2" />
                            <span className="text-orange-700 font-medium">
                              {customer.daysBetween} dias
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative group">
                          <div className="flex items-center text-sm cursor-help">
                            {customer.dzaDate && customer.mentoriaDate ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                                <span className="text-green-700 font-medium">DZA → Mentoria</span>
                              </>
                            ) : customer.dzaDate ? (
                              <>
                                <Package className="h-4 w-4 text-blue-500 mr-2" />
                                <span className="text-blue-700 font-medium">DZA</span>
                              </>
                            ) : customer.mentoriaDate ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-purple-500 mr-2" />
                                <span className="text-purple-700 font-medium">Mentoria</span>
                              </>
                            ) : (
                              <>
                                <Package className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-500">Outros</span>
                              </>
                            )}
                          </div>
                          
                          {/* Tooltip com todos os materiais */}
                          {customer.materials.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-80 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                              <div className="font-medium mb-2">Todos os materiais ({customer.materials.length})</div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {customer.materials.map((material, idx) => (
                                  <div key={idx} className="flex justify-between items-start">
                                    <div className="flex-1 mr-2">
                                      <div className="font-medium">{material.name}</div>
                                      <div className="text-gray-300 text-xs">
                                        {material.platform}
                                      </div>
                                    </div>
                                    <div className="text-gray-300 text-xs whitespace-nowrap">
                                      {formatDate(material.date)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Controles de Paginação */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, sortedCustomers.length)} de {sortedCustomers.length} resultados
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Itens por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Mostrar primeira, última, atual e ±2 páginas da atual
                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2
                      })
                      .map((page, idx, arr) => {
                        // Adicionar ... se há gap
                        const prevPage = arr[idx - 1]
                        const showEllipsis = prevPage && page - prevPage > 1
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 text-sm border rounded ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}