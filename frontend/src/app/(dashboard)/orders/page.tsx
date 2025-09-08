'use client'

import { useEffect, useState } from 'react'
import { Search, Eye, Calendar, User, Package, DollarSign, Trash2, CalendarDays, RefreshCw, Upload, X } from 'lucide-react'
import { getOrders, deleteEvent } from '@/lib/database'
import WebhookDetailsModal from '@/components/WebhookDetailsModal'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('kiwify')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const fetchOrders = async (start?: string, end?: string) => {
    setLoading(true)
    try {
      const dateStart = start !== undefined ? start : startDate
      const dateEnd = end !== undefined ? end : endDate
      
      const { data, error } = await getOrders(undefined, dateStart, dateEnd)
      if (error) {
        console.error('Erro ao carregar pedidos:', error)
      } else {
        setOrders(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Validar datas
    if (startDate && endDate && endDate < startDate) {
      setDateError('Data fim deve ser maior ou igual à data início')
      return
    }
    
    setDateError('')
    
    // Só buscar dados quando:
    // 1. Não há datas definidas (buscar todos)
    // 2. Há data início E data fim definidas 
    // 3. Data fim é maior ou igual à data início
    if ((!startDate && !endDate) || 
        (startDate && endDate && endDate >= startDate)) {
      fetchOrders(startDate, endDate)
    }
  }, [startDate, endDate])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.platform_order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesPlatform = platformFilter === 'all' || order.platform_name?.toLowerCase() === platformFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesPlatform
  })

  // Paginação
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, platformFilter, startDate, endDate, itemsPerPage])

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'status-success'
      case 'pending': return 'status-warning'
      case 'refunded': return 'status-error'
      case 'chargeback': return 'status-error'
      case 'canceled': return 'bg-gray-50 text-gray-600 border-gray-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago'
      case 'pending': return 'Pendente'
      case 'refunded': return 'Reembolsado'
      case 'chargeback': return 'Chargeback'
      case 'canceled': return 'Cancelado'
      default: return status
    }
  }

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order)
    setModalOpen(true)
  }

  const handleDeleteOrder = async (order: any) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido ${order.platform_order_id}?`)) {
      return
    }

    try {
      const { error } = await deleteEvent(order.id)
      if (error) {
        console.error('Erro ao excluir pedido:', error)
        alert('Erro ao excluir pedido. Verifique o console.')
      } else {
        // Recarregar a lista após exclusão
        setOrders(orders.filter(o => o.id !== order.id))
        alert('Pedido excluído com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error)
      alert('Erro inesperado ao excluir pedido.')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return
    
    if (confirm(`Tem certeza que deseja excluir ${selectedOrders.length} pedidos selecionados?`)) {
      setBulkDeleting(true)
      let errors = 0
      const totalToDelete = selectedOrders.length
      
      for (const orderId of selectedOrders) {
        const { error } = await deleteEvent(orderId)
        if (error) {
          console.error('Erro ao excluir pedido:', orderId, error)
          errors++
        }
      }
      
      if (errors === 0) {
        setSelectedOrders([])
        setSelectAll(false)
        fetchOrders() // Recarregar lista
        alert(`${totalToDelete} pedidos excluídos com sucesso!`)
      } else {
        alert(`${errors} pedidos não puderam ser excluídos`)
        fetchOrders() // Recarregar para ver quais foram excluídos
      }
      
      setBulkDeleting(false)
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
      setSelectAll(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedOrders(paginatedOrders.map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleImportCSV = async () => {
    if (!uploadFile) {
      alert('Selecione um arquivo CSV primeiro')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('platform', selectedPlatform)

      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Importação concluída: ${result.inserted} pedidos inseridos`)
        setImportModalOpen(false)
        setUploadFile(null)
        fetchOrders() // Recarregar pedidos
      } else {
        alert(`Erro na importação: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro na importação:', error)
      alert('Erro inesperado na importação')
    } finally {
      setImporting(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">Gerencie todos os pedidos recebidos via webhooks</p>
            {(startDate || endDate) && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Filtrado por período
              </span>
            )}
          </div>
        </div>
        <div>
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredOrders.length}
            </div>
            <div className="text-sm text-gray-500">
              Total Pedidos
              {platformFilter !== 'all' && (
                <div className="text-xs text-blue-500 mt-1">
                  {platformFilter === 'kiwify' ? '🟢 Kiwify' : 
                   platformFilter === 'dmg' ? '🔵 DMG' :
                   platformFilter === 'voomp' ? '🟣 Voomp' : '🟡 Cademi'}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredOrders.filter(o => o.status === 'paid').length}
            </div>
            <div className="text-sm text-gray-500">Pagos</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredOrders.filter(o => o.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </div>
        </div>
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                filteredOrders
                  .filter(o => o.status === 'paid')
                  .reduce((sum, o) => sum + (o.net_amount || 0), 0)
              )}
            </div>
            <div className="text-sm text-gray-500">Comissão Total</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col gap-4">
            {/* Primeira linha - Busca e Status */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por pedido, cliente, email ou produto..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos os Status</option>
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="refunded">Reembolsado</option>
                  <option value="chargeback">Chargeback</option>
                  <option value="canceled">Cancelado</option>
                </select>
                <select
                  className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option value="all">Todas as Plataformas</option>
                  <option value="kiwify">🟢 Kiwify</option>
                  <option value="dmg">🔵 Digital Manager Guru</option>
                  <option value="voomp">🟣 Voomp</option>
                  <option value="cademi">🟡 Cademi</option>
                </select>
              </div>
            </div>

            {/* Segunda linha - Filtro por período */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="startDate"
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="endDate"
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {dateError && (
                  <div className="text-sm text-red-600 mt-2 px-1">
                    ⚠️ {dateError}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setDateError('')
                  }}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors duration-200 whitespace-nowrap"
                >
                  Limpar Datas
                </button>
                {startDate && !endDate && (
                  <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                    ⏳ Defina a data fim para filtrar
                  </div>
                )}
                {startDate && endDate && endDate >= startDate && (
                  <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    ✅ Filtro de período ativo
                  </div>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setPlatformFilter('all')
                    setStartDate('')
                    setEndDate('')
                    setDateError('')
                  }}
                  className="px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors duration-200 whitespace-nowrap"
                >
                  Limpar Todos Filtros
                </button>
                {selectedOrders.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors duration-200 whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className={`h-4 w-4 ${bulkDeleting ? 'animate-spin' : ''}`} />
                    {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedOrders.length} selecionados`}
                  </button>
                )}
                <button
                  onClick={fetchOrders}
                  disabled={loading}
                  className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="card">
        <div className="card-content p-0">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum pedido encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                {orders.length === 0 ? 'Envie alguns webhooks da Kiwify para ver os pedidos aqui.' : 'Tente ajustar os filtros.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="w-12 px-3 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll && selectedOrders.length === filteredOrders.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Comissão
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="w-20 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="w-12 px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {(() => {
                                const date = new Date(order.order_date)
                                return date.toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit', 
                                  year: 'numeric'
                                })
                              })()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.order_date).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.customer_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {order.product_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {order.platform_order_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(order.net_amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Bruto: {formatCurrency(order.gross_amount)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.platform_name?.toLowerCase() === 'kiwify' ? (
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white text-xs font-bold">K</span>
                              </div>
                              <span className="text-sm text-gray-600">Kiwify</span>
                            </div>
                          ) : order.platform_name?.toLowerCase() === 'dmg' ? (
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white text-xs font-bold">D</span>
                              </div>
                              <span className="text-sm text-gray-600">DMG</span>
                            </div>
                          ) : order.platform_name?.toLowerCase() === 'voomp' ? (
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white text-xs font-bold">V</span>
                              </div>
                              <span className="text-sm text-gray-600">Voomp</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white text-xs font-bold">?</span>
                              </div>
                              <span className="text-sm text-gray-600">{order.platform_name || 'Desconhecida'}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes do webhook"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir pedido"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Controles de Paginação */}
          {filteredOrders.length > 0 && (
            <div className="flex items-center justify-between mt-6 px-6 py-4 bg-gray-50/80 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, filteredOrders.length)} de {filteredOrders.length} pedidos
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Itens por página:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalhes do webhook */}
      {selectedOrder && (
        <WebhookDetailsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          webhookData={selectedOrder.webhook_payload}
          orderInfo={{
            orderId: selectedOrder.platform_order_id,
            customerName: selectedOrder.customer_name,
            productName: selectedOrder.product_name,
            isImported: selectedOrder.is_imported
          }}
        />
      )}

      {/* Modal de importação CSV */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/60">
              <h2 className="text-xl font-bold text-gray-900">Importar CSV da Kiwify</h2>
              <button
                onClick={() => {
                  setImportModalOpen(false)
                  setUploadFile(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plataforma
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="kiwify">Kiwify</option>
                    <option value="dmg">Digital Manager Guru (DMG)</option>
                    <option value="cademi">Cademi</option>
                    <option value="voomp">Voomp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo CSV
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                  {uploadFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Arquivo selecionado: {uploadFile.name}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Campos esperados - {selectedPlatform === 'kiwify' ? 'Kiwify' : selectedPlatform === 'dmg' ? 'DMG' : selectedPlatform === 'cademi' ? 'Cademi' : 'Voomp'}:
                  </h4>
                  {selectedPlatform === 'kiwify' && (
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• <strong>ID da venda</strong> (ID único do pedido)</li>
                      <li>• <strong>Status</strong> (paid, waiting_payment, etc.)</li>
                      <li>• <strong>Produto</strong> (Nome do produto)</li>
                      <li>• <strong>Cliente</strong> (Nome do cliente)</li>
                      <li>• <strong>Email</strong> (Email do cliente)</li>
                      <li>• <strong>Valor líquido</strong> (Sua comissão em reais)</li>
                      <li>• <strong>Preço base do produto</strong> (Preço total)</li>
                      <li>• <strong>Data de Criação</strong> (Data do pedido)</li>
                    </ul>
                  )}
                  {selectedPlatform === 'dmg' && (
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Campos específicos do DMG serão mapeados</li>
                      <li>• Entre em contato para configurar o mapeamento</li>
                    </ul>
                  )}
                  {selectedPlatform === 'cademi' && (
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Campos específicos da Cademi serão mapeados</li>
                      <li>• Entre em contato para configurar o mapeamento</li>
                    </ul>
                  )}
                  {selectedPlatform === 'voomp' && (
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Campos específicos da Voomp serão mapeados</li>
                      <li>• Entre em contato para configurar o mapeamento</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200/60 p-6 bg-gray-50/50 rounded-b-2xl">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setImportModalOpen(false)
                    setUploadFile(null)
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={!uploadFile || importing}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Importar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}