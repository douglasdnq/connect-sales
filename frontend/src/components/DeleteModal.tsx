'use client'

import { useState } from 'react'
import { Trash2, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => Promise<{success: boolean, message: string, deletedCount?: number}>
  deleting: boolean
  title: string
  itemCount: number
  filters: {
    platform?: string
    status?: string
    product?: string
    origin?: string
    dateStart?: string
    dateEnd?: string
    search?: string
  }
}

export default function DeleteModal({ 
  isOpen, 
  onClose, 
  onDelete, 
  deleting, 
  title,
  itemCount,
  filters
}: DeleteModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [result, setResult] = useState<{success: boolean, message: string, deletedCount?: number} | null>(null)

  const handleDelete = async () => {
    if (confirmationText !== 'excluir') return

    const deleteResult = await onDelete()
    setResult(deleteResult)
    
    if (deleteResult.success) {
      // Reset form and close after successful deletion
      setTimeout(() => {
        setConfirmationText('')
        setResult(null)
        onClose()
      }, 3000)
    }
  }

  const handleClose = () => {
    setConfirmationText('')
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  const hasActiveFilters = Object.values(filters).some(filter => 
    filter && filter !== 'all' && filter.trim() !== ''
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md min-w-0 border border-gray-200 mx-auto my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              {result?.success ? (
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                {result?.success ? 'Exclusão Concluída' : title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {result?.success ? 'Registros excluídos com sucesso' : 'Esta ação não pode ser desfeita'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {result ? (
            <div className={`p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? 'Exclusão Realizada!' : 'Erro na Exclusão'}
                  </h4>
                  <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </p>
                  {result.success && result.deletedCount && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      {result.deletedCount} registros foram excluídos permanentemente.
                    </p>
                  )}
                </div>
              </div>
              {result.success && (
                <div className="text-sm text-green-600 mt-3">
                  Esta janela será fechada automaticamente em alguns segundos...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Atenção: Exclusão Permanente</h4>
                    <p className="text-sm text-red-700">
                      Você está prestes a excluir <strong>{itemCount} registros</strong>. Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    📋 Filtros ativos aplicados:
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {filters.platform && filters.platform !== 'all' && (
                      <div>• <strong>Plataforma:</strong> {filters.platform}</div>
                    )}
                    {filters.status && filters.status !== 'all' && (
                      <div>• <strong>Status:</strong> {filters.status}</div>
                    )}
                    {filters.product && filters.product !== 'all' && (
                      <div>• <strong>Produto:</strong> {filters.product}</div>
                    )}
                    {filters.origin && filters.origin !== 'all' && (
                      <div>• <strong>Origem:</strong> {filters.origin === 'imported' ? 'Importado (CSV)' : 'Webhook (Tempo Real)'}</div>
                    )}
                    {filters.dateStart && (
                      <div>• <strong>Data início:</strong> {new Date(filters.dateStart).toLocaleDateString('pt-BR')}</div>
                    )}
                    {filters.dateEnd && (
                      <div>• <strong>Data fim:</strong> {new Date(filters.dateEnd).toLocaleDateString('pt-BR')}</div>
                    )}
                    {filters.search && filters.search.trim() && (
                      <div>• <strong>Busca:</strong> "{filters.search}"</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Para confirmar a exclusão, digite <strong>"excluir"</strong>:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Digite: excluir"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoComplete="off"
                />
                {confirmationText && confirmationText !== 'excluir' && (
                  <p className="text-sm text-red-600 mt-1">
                    Digite exatamente "excluir" para confirmar
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmationText !== 'excluir' || deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Excluir {itemCount} Registros</span>
                    <span className="sm:hidden">Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}