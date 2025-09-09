'use client'

import { useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File, platform: string) => Promise<{success: boolean, message: string, inserted?: number}>
  importing: boolean
}

export default function ImportModal({ isOpen, onClose, onImport, importing }: ImportModalProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('kiwify')
  const [result, setResult] = useState<{success: boolean, message: string, inserted?: number} | null>(null)

  const handleImport = async () => {
    if (!uploadFile) return

    const importResult = await onImport(uploadFile, selectedPlatform)
    setResult(importResult)
    
    if (importResult.success) {
      // Reset form after successful import
      setTimeout(() => {
        setUploadFile(null)
        setResult(null)
        onClose()
      }, 3000)
    }
  }

  const handleClose = () => {
    setUploadFile(null)
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Importar Pedidos</h2>
              <p className="text-sm text-gray-500">Faça upload do arquivo CSV</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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
                    {result.success ? 'Importação Concluída!' : 'Erro na Importação'}
                  </h4>
                  <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </p>
                  {result.success && result.inserted && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      {result.inserted} pedidos foram importados com sucesso.
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="kiwify">🟢 Kiwify</option>
                  <option value="dmg">🔵 Digital Manager Guru (DMG)</option>
                  <option value="cademi">🟡 Cademi</option>
                  <option value="voomp">🟣 Voomp</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo CSV
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Clique para selecionar um arquivo CSV</p>
                    <p className="text-sm text-gray-500 mt-1">Ou arraste e solte aqui</p>
                  </label>
                  {uploadFile && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">
                        📄 {uploadFile.name}
                      </p>
                      <p className="text-xs text-blue-600">
                        {(uploadFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Campos esperados - {selectedPlatform === 'kiwify' ? 'Kiwify' : selectedPlatform === 'dmg' ? 'DMG' : selectedPlatform === 'cademi' ? 'Cademi' : 'Voomp'}:
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
                {selectedPlatform !== 'kiwify' && (
                  <p className="text-xs text-blue-800">
                    Campos específicos da {selectedPlatform.toUpperCase()} serão mapeados automaticamente.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={importing}
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!uploadFile || importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        )}
      </div>
    </div>
  )
}