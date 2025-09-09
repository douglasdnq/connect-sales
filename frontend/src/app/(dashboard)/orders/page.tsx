'use client'

import { useEffect, useState, useRef } from 'react'
import { Search, Eye, Calendar, User, Package, DollarSign, Trash2, CalendarDays, RefreshCw, Upload, X } from 'lucide-react'
import { getOrders, deleteEvent } from '@/lib/database'
import WebhookDetailsModal from '@/components/WebhookDetailsModal'
import ImportModal from '@/components/ImportModal'
import DeleteModal from '@/components/DeleteModal'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [originFilter, setOriginFilter] = useState<string>('all') // all, imported, webhook
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const [dateError, setDateError] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 })

  const fetchOrders = async (start?: string, end?: string) => {
    setLoading(true)
    try {
      const dateStart = start !== undefined ? start : dateRange.start
      const dateEnd = end !== undefined ? end : dateRange.end
      
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
    if (dateRange.start && dateRange.end && dateRange.end < dateRange.start) {
      setDateError('Data fim deve ser maior ou igual à data início')
      return
    }
    
    setDateError('')
    
    // Só buscar dados quando:
    // 1. Não há datas definidas (buscar todos)
    // 2. Há data início E data fim definidas 
    // 3. Data fim é maior ou igual à data início
    if ((!dateRange.start && !dateRange.end) || 
        (dateRange.start && dateRange.end && dateRange.end >= dateRange.start)) {
      fetchOrders(dateRange.start, dateRange.end)
    }
  }, [dateRange.start, dateRange.end])

  // Obter lista única de produtos para o filtro
  const uniqueProducts = Array.from(new Set(orders.map(order => order.product_name).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.platform_order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesPlatform = platformFilter === 'all' || order.platform_name?.toLowerCase() === platformFilter.toLowerCase()
    const matchesProduct = productFilter === 'all' || order.product_name === productFilter
    const matchesOrigin = originFilter === 'all' || 
                         (originFilter === 'imported' && order.is_imported) ||
                         (originFilter === 'webhook' && !order.is_imported)
    return matchesSearch && matchesStatus && matchesPlatform && matchesProduct && matchesOrigin
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
  }, [searchTerm, statusFilter, platformFilter, productFilter, originFilter, dateRange.start, dateRange.end, itemsPerPage])

  // Fechar date picker quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const handleDeleteOrder = (order: any) => {
    setOrderToDelete(order)
    setShowSingleDeleteModal(true)
  }

  const handleSingleDelete = async () => {
    if (!orderToDelete) return { success: false, message: 'Nenhum pedido selecionado' }

    try {
      const { error } = await deleteEvent(orderToDelete.id)
      if (error) {
        console.error('Erro ao excluir pedido:', error)
        return { success: false, message: 'Erro ao excluir pedido. Verifique o console.' }
      } else {
        // Recarregar a lista após exclusão
        setOrders(orders.filter(o => o.id !== orderToDelete.id))
        return { success: true, message: 'Pedido excluído com sucesso!', deletedCount: 1 }
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error)
      return { success: false, message: 'Erro inesperado ao excluir pedido.' }
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

  const handleFilterBasedDelete = async () => {
    setBulkDeleting(true)
    try {
      // Pegar todos os IDs dos pedidos filtrados
      const filteredIds = filteredOrders.map(order => order.id)
      
      const response = await fetch('/api/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds: filteredIds })
      })

      const result = await response.json()
      
      if (result.success) {
        await fetchOrders() // Recarregar dados
        return { success: true, message: `${result.deletedCount} registros excluídos com sucesso!`, deletedCount: result.deletedCount }
      } else {
        return { success: false, message: 'Erro ao excluir registros: ' + result.error }
      }
    } catch (error) {
      console.error('Erro na exclusão baseada em filtros:', error)
      return { success: false, message: 'Erro ao excluir registros' }
    } finally {
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

  const handleImportCSV = async (file: File, platform: string) => {
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('platform', platform)

      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        fetchOrders() // Recarregar pedidos
        return { success: true, message: `Importação concluída com sucesso!`, inserted: result.inserted }
      } else {
        return { success: false, message: `Erro na importação: ${result.error}` }
      }
    } catch (error) {
      console.error('Erro na importação:', error)
      return { success: false, message: 'Erro inesperado na importação' }
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
            {(dateRange.start || dateRange.end) && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Filtrado por período
              </span>
            )}
          </div>
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
            {/* Primeira linha - Período e Filtros principais */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:flex-1">
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <button
                    ref={dateButtonRef}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setDatePickerPosition({
                        top: rect.bottom + window.scrollY + 8,
                        left: rect.left + window.scrollX
                      })
                      setShowDatePicker(!showDatePicker)
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-left whitespace-nowrap overflow-hidden"
                  >
                    {(() => {
                      if (dateRange.start && dateRange.end) {
                        const startDate = new Date(dateRange.start + 'T00:00:00')
                        const endDate = new Date(dateRange.end + 'T00:00:00')
                        const startStr = startDate.toLocaleDateString('pt-BR')
                        const endStr = endDate.toLocaleDateString('pt-BR')
                        return (
                          <span className="truncate">
                            {startStr} - {endStr}
                          </span>
                        )
                      } else if (dateRange.start) {
                        const startDate = new Date(dateRange.start + 'T00:00:00')
                        return `Desde ${startDate.toLocaleDateString('pt-BR')}`
                      }
                      return 'Selecionar período...'
                    })()}
                  </button>
                </div>
                {dateError && (
                  <div className="text-sm text-red-600 mt-2 px-1">
                    ⚠️ {dateError}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:flex-1">
                <select
                  className="w-full sm:flex-1 px-3 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Status</option>
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="refunded">Reembolsado</option>
                  <option value="chargeback">Chargeback</option>
                  <option value="canceled">Cancelado</option>
                </select>
                <select
                  className="w-full sm:flex-1 px-3 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option value="all">Plataformas</option>
                  <option value="kiwify">🟢 Kiwify</option>
                  <option value="dmg">🔵 Digital Manager Guru</option>
                  <option value="voomp">🟣 Voomp</option>
                  <option value="cademi">🟡 Cademi</option>
                </select>
                <select
                  className="w-full sm:flex-1 px-3 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <option value="all">Produtos ({uniqueProducts.length})</option>
                  {uniqueProducts.map(product => (
                    <option key={product} value={product}>
                      {product.length > 30 ? product.substring(0, 27) + '...' : product}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full sm:flex-1 px-3 py-3 border border-gray-200 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm"
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                >
                  <option value="all">Origens</option>
                  <option value="imported">📥 Importado (CSV)</option>
                  <option value="webhook">🔗 Webhook (Tempo Real)</option>
                </select>
              </div>
              
              {/* Indicador quando falta definir data fim */}
              {dateRange.start && !dateRange.end && (
                <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                  ⏳ Defina a data fim para filtrar
                </div>
              )}
            </div>

            {/* Segunda linha - Busca e Ações */}
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
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setPlatformFilter('all')
                    setProductFilter('all')
                    setOriginFilter('all')
                    setDateRange({ start: '', end: '' })
                    setDateError('')
                    setShowDatePicker(false)
                  }}
                  className="px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors duration-200 whitespace-nowrap"
                >
                  Limpar Todos Filtros
                </button>
                <button
                  onClick={fetchOrders}
                  disabled={loading}
                  className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar CSV
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
                {(platformFilter !== 'all' || statusFilter !== 'all' || productFilter !== 'all' || originFilter !== 'all' || searchTerm.trim() || dateRange.start || dateRange.end) && filteredOrders.length > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={bulkDeleting}
                    className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors duration-200 whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className={`h-4 w-4 ${bulkDeleting ? 'animate-spin' : ''}`} />
                    Excluir Filtrados ({filteredOrders.length})
                  </button>
                )}
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
                        checked={selectAll}
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


      {/* Portal do Calendário */}
      {showDatePicker && (
        <div 
          ref={datePickerRef} 
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-80"
          style={{
            top: `${datePickerPosition.top}px`,
            left: `${datePickerPosition.left}px`,
            zIndex: 9999
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button
              onClick={() => {
                setDateRange({ start: '', end: '' })
                setShowDatePicker(false)
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Limpar
            </button>
            <button
              onClick={() => setShowDatePicker(false)}
              className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
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

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportCSV}
        importing={importing}
      />

      <DeleteModal
        isOpen={showSingleDeleteModal}
        onClose={() => {
          setShowSingleDeleteModal(false)
          setOrderToDelete(null)
        }}
        onDelete={handleSingleDelete}
        deleting={bulkDeleting}
        title="Excluir Pedido"
        itemCount={1}
        filters={{}}
      />

      <DeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onDelete={handleFilterBasedDelete}
        deleting={bulkDeleting}
        title="Exclusão em Massa"
        itemCount={filteredOrders.length}
        filters={{
          platform: platformFilter !== 'all' ? platformFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          product: productFilter !== 'all' ? productFilter : undefined,
          origin: originFilter !== 'all' ? originFilter : undefined,
          dateStart: dateRange.start || undefined,
          dateEnd: dateRange.end || undefined,
          search: searchTerm.trim() || undefined
        }}
      />

    </div>
  )
}