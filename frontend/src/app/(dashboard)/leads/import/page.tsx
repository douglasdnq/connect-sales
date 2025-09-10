'use client'

import { useState } from 'react'
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, ArrowLeft, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function ImportLeadsPage() {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      const sheetsData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          return row
        })

      const response = await fetch('/api/import-leads-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sheetsData }),
      })

      const result = await response.json()
      setImportResult(result)
    } catch (error) {
      console.error('Erro na importação:', error)
      setImportResult({
        success: false,
        message: 'Erro ao processar arquivo'
      })
    } finally {
      setImporting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const webhookUrl = "https://racing-lucas.vercel.app/api/import-leads-sheets"
  const csvTemplate = `Nome,Email,WhatsApp,Idade,Formação,Situação Profissional,Feliz com trabalho,Faixa Salarial,Momento estudar fiscal,Tempo dedicação
João Silva,joao@exemplo.com,(11) 99999-9999,30,Superior completo,Empregado,Sim,R$ 3.000 - R$ 5.000,Imediatamente,2-3 horas por dia`

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Importar Leads</h1>
      </div>

      {/* Método 1: Upload de CSV */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Método 1: Upload de Arquivo CSV</h2>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Faça upload de um arquivo CSV exportado do Google Sheets ou outro sistema.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-800 font-medium">
                Clique para selecionar arquivo CSV
              </span>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={importing}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Aceita arquivos .csv de até 10MB
            </p>
          </div>

          {importing && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Processando arquivo...
            </div>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{importResult.message}</span>
              </div>
              {importResult.results && (
                <div className="mt-2 text-sm">
                  <p>Criados: {importResult.results.created}</p>
                  <p>Atualizados: {importResult.results.updated}</p>
                  <p>Erros: {importResult.results.errors}</p>
                  <p>Total processados: {importResult.results.processed}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Formato do CSV:</h4>
            <div className="bg-white p-3 rounded border text-sm font-mono text-gray-700 overflow-x-auto">
              <pre>{csvTemplate}</pre>
            </div>
            <button
              onClick={() => copyToClipboard(csvTemplate)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              Copiar exemplo
            </button>
          </div>
        </div>
      </div>

      {/* Método 2: Google Apps Script */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Método 2: Google Apps Script (Automático)</h2>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Configure um script no Google Sheets para enviar dados automaticamente quando um formulário for preenchido.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Alternativa gratuita ao Zapier</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Como o Zapier requer plano pago para webhooks, esta é uma excelente alternativa gratuita.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Passo a passo:</h4>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Abra seu Google Sheets com os dados do formulário</p>
                  <p className="text-sm text-gray-600">Acesse a planilha onde os dados do Respondi são salvos</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Vá em Extensions → Apps Script</p>
                  <p className="text-sm text-gray-600">Isso abrirá o editor de código do Google Apps Script</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Cole o código abaixo:</p>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono mt-2 overflow-x-auto">
                    <pre>{`function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Criar objeto com os dados
  const rowData = {};
  headers.forEach((header, index) => {
    rowData[header] = values[index];
  });
  
  // Enviar para a API
  const payload = {
    sheetsData: [rowData]
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch('${webhookUrl}', options);
    console.log('Lead enviado:', response.getContentText());
  } catch (error) {
    console.error('Erro ao enviar lead:', error);
  }
}`}</pre>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Criar objeto com os dados
  const rowData = {};
  headers.forEach((header, index) => {
    rowData[header] = values[index];
  });
  
  // Enviar para a API
  const payload = {
    sheetsData: [rowData]
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch('${webhookUrl}', options);
    console.log('Lead enviado:', response.getContentText());
  } catch (error) {
    console.error('Erro ao enviar lead:', error);
  }
}`)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar código
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                <div>
                  <p className="font-medium">Configure o trigger</p>
                  <p className="text-sm text-gray-600">Vá em Triggers → Adicionar trigger → Selecione "On form submit"</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 mt-0.5">5</div>
                <div>
                  <p className="font-medium">Teste o script</p>
                  <p className="text-sm text-gray-600">Preencha um formulário teste para verificar se os dados chegam no ConnectSales</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">URL do Webhook:</h4>
            <div className="flex items-center gap-2">
              <code className="bg-white px-3 py-2 rounded border text-sm flex-1 font-mono">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl)}
                className="text-blue-600 hover:text-blue-800"
                title="Copiar URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Método 3: API Direta */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ExternalLink className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Método 3: Integração Direta via API</h2>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Para desenvolvedores: integre diretamente com nossa API REST.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Endpoint:</h4>
            <code className="bg-white px-3 py-2 rounded border text-sm font-mono block">
              POST {webhookUrl}
            </code>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Exemplo de payload:</h4>
            <div className="bg-white p-3 rounded border text-sm font-mono overflow-x-auto">
              <pre>{`{
  "sheetsData": [
    {
      "Nome": "João Silva",
      "Email": "joao@exemplo.com",
      "WhatsApp": "(11) 99999-9999",
      "Idade": "30",
      "Formação": "Superior completo"
    }
  ]
}`}</pre>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Campos suportados:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>• Nome / nome / Nome completo</div>
              <div>• Email / email / E-mail</div>
              <div>• WhatsApp / whatsapp / Telefone</div>
              <div>• Idade / idade</div>
              <div>• Formação / formacao / Escolaridade</div>
              <div>• Situação Profissional</div>
              <div>• Feliz com trabalho</div>
              <div>• Faixa Salarial / salario</div>
              <div>• Momento estudar fiscal</div>
              <div>• Tempo dedicação</div>
              <div>• UTM Source / utm_source</div>
              <div>• UTM Medium / utm_medium</div>
              <div>• UTM Campaign / utm_campaign</div>
              <div>• Data / data</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}