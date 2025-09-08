'use client'

import { useEffect, useState } from 'react'
import { Search, Phone, Calendar, TrendingUp, Package, Clock, User, Mail } from 'lucide-react'
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
    customer.phone?.includes(searchTerm) ||
    customer.cpf?.includes(searchTerm.replace(/[^\d]/g, ''))
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    // Tentar formatar telefone brasileiro
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-'
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
    }
    return cpf
  }

  // Estatísticas
  const totalCustomers = filteredCustomers.length
  const dzaCustomers = filteredCustomers.filter(c => c.dzaDate).length
  const mentoriaCustomers = filteredCustomers.filter(c => c.mentoriaDate).length
  const conversionRate = dzaCustomers > 0 ? ((mentoriaCustomers / dzaCustomers) * 100).toFixed(1) : '0'
  const avgDaysBetween = filteredCustomers
    .filter(c => c.daysBetween !== null)
    .reduce((sum, c, _, arr) => sum + (c.daysBetween! / arr.length), 0)

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
              placeholder="Buscar por nome, email, telefone ou CPF..."
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
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Data DZA
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Data Mentoria
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Dias Entre
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Materiais
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCustomers.map((customer, index) => (
                    <tr key={customer.email} className="hover:bg-gray-50/30 transition-colors">
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
                        <div className="text-sm text-gray-900">
                          {formatCPF(customer.cpf)}
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
                        <div className="flex items-start">
                          <Package className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <div className="space-y-1">
                            {customer.materials.slice(0, 2).map((material, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="text-gray-600">{material.name}</div>
                                <div className="text-gray-400 text-xs">
                                  {material.platform}
                                </div>
                              </div>
                            ))}
                            {customer.materials.length > 2 && (
                              <div className="relative group">
                                <div className="text-xs text-gray-400 cursor-help">
                                  +{customer.materials.length - 2} mais
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                                  <div className="space-y-1">
                                    {customer.materials.slice(2).map((material, idx) => (
                                      <div key={idx}>
                                        <div className="font-medium">{material.name}</div>
                                        <div className="text-gray-300">
                                          {material.platform} • {formatDate(material.date)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                                </div>
                              </div>
                            )}
                          </div>
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
    </div>
  )
}