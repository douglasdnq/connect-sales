'use client'

import { X, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface WebhookDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  webhookData: any
  orderInfo: {
    orderId: string
    customerName: string
    productName: string
    isImported?: boolean
  }
}

export default function WebhookDetailsModal({ 
  isOpen, 
  onClose, 
  webhookData, 
  orderInfo 
}: WebhookDetailsModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(webhookData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const renderObjectRecursively = (obj: any, level = 0): JSX.Element[] => {
    if (!obj || typeof obj !== 'object') return []
    
    return Object.entries(obj).map(([key, value], index) => (
      <div key={`${key}-${index}`} className={`${level > 0 ? 'ml-4' : ''} mb-2`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <span className={`font-medium text-gray-700 min-w-0 ${level > 0 ? 'text-sm' : ''}`}>
            {key}:
          </span>
          {typeof value === 'object' && value !== null ? (
            <div className="flex-1">
              <div className="bg-gray-50 p-2 rounded border">
                {renderObjectRecursively(value, level + 1)}
              </div>
            </div>
          ) : (
            <span className="text-gray-900 break-all flex-1 font-mono text-sm">
              {formatValue(value)}
            </span>
          )}
        </div>
      </div>
    ))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/60">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detalhes do Webhook</h2>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Pedido:</span> {orderInfo.orderId}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Cliente:</span> {orderInfo.customerName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Produto:</span> {orderInfo.productName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Origem:</span> 
                {orderInfo.isImported ? (
                  <span className="inline-flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    Importado
                  </span>
                ) : (
                  <span className="inline-flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                    Webhook
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar JSON
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Dados Completos do Webhook
            </h3>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {webhookData ? renderObjectRecursively(webhookData) : (
                <p className="text-gray-500">Nenhum dado disponível</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200/60 p-6 bg-gray-50/50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}