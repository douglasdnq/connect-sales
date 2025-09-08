'use client'

import { useEffect, useState } from 'react'
import { Search, Mail, User, Calendar } from 'lucide-react'
import { getCustomers } from '@/lib/database'
import type { Customer, Order } from '@/lib/supabase'

type CustomerWithStats = Customer & {
  total_orders?: number
  total_revenue?: number
  last_order_date?: string
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const { data, error } = await getCustomers(100)
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
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Visualize todos os clientes cadastrados</p>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredCustomers.length}
            </div>
            <div className="text-sm text-gray-500">Total Clientes</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredCustomers.reduce((sum, c) => sum + (c.total_orders || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Pedidos dos Clientes</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                filteredCustomers.reduce((sum, c) => sum + (c.total_revenue || 0), 0)
              )}
            </div>
            <div className="text-sm text-gray-500">Receita Total</div>
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
              placeholder="Buscar por nome ou email..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="card">
        <div className="card-content p-0">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pedidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receita Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastrado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name || 'Nome não informado'}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {customer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {customer.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.total_orders || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.total_revenue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(customer.created_at).toLocaleDateString('pt-BR')}
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