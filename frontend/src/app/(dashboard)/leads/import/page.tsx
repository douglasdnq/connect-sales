'use client'

import { useState } from 'react'
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, ArrowLeft, Copy, ExternalLink, Settings, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function ImportLeadsPage() {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [showMapping, setShowMapping] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<{[key: string]: string}>({})
  const [customFields, setCustomFields] = useState<{name: string, type: string}[]>([])

  // Campos disponíveis na tabela leads com nomes do Respondi
  const availableFields = [
    { key: 'full_name', label: 'Qual seu nome completo?', type: 'text', alternativeLabels: ['Nome Completo', 'Nome', 'nome'] },
    { key: 'whatsapp', label: 'Qual seu WhatsApp?', type: 'text', alternativeLabels: ['WhatsApp', 'Telefone', 'whatsapp'] },
    { key: 'email', label: 'Qual o seu e-mail?', type: 'email', alternativeLabels: ['Email', 'E-mail', 'email'] },
    { key: 'age', label: 'E a sua idade?', type: 'number', alternativeLabels: ['Idade', 'idade'] },
    { key: 'education', label: 'Em que você é formado(a)?', type: 'text', alternativeLabels: ['Formação', 'Escolaridade', 'formacao'] },
    { key: 'work_situation', label: 'Qual é a opção que melhor descreve sua situação profissional?', type: 'text', alternativeLabels: ['Situação Profissional', 'Situação Trabalho'] },
    { key: 'happy_with_work', label: 'Você é feliz com o seu trabalho atual?', type: 'text', alternativeLabels: ['Feliz com trabalho'] },
    { key: 'salary_range', label: 'Qual é a sua faixa de salário atual?', type: 'text', alternativeLabels: ['Faixa Salarial', 'Salário'] },
    { key: 'fiscal_study_moment', label: 'Qual é o seu momento em relação aos estudos para Área Fiscal?', type: 'text', alternativeLabels: ['Momento estudar fiscal'] },
    { key: 'study_time_dedication', label: 'Quanto tempo você pode dedicar aos estudos para se tornar Auditor-Fiscal?', type: 'text', alternativeLabels: ['Tempo dedicação'] },
    { key: 'why_mentoria_ideal', label: 'Por que você acredita que a Mentoria Tributum é ideal para você agora?', type: 'text', alternativeLabels: ['Por que mentoria é ideal'] },
    { key: 'why_deserve_spot', label: 'Se houvesse apenas 1 vaga na mentoria hoje, por que ela deveria ser sua?', type: 'text', alternativeLabels: ['Por que merece vaga'] },
    { key: 'investment_type', label: 'A Mentoria é um programa de alto impacto para acelerar sua aprovação. O investimento atual é de:', type: 'text', alternativeLabels: ['Investimento', 'Tipo de investimento'] },
    { key: 'priority_start', label: 'É uma prioridade para você iniciar sua preparação imediatamente?', type: 'text', alternativeLabels: ['Prioridade de início'] },
    { key: 'score', label: 'Pontuação', type: 'number', alternativeLabels: ['Score', 'Pontos'] },
    { key: 'form_date', label: 'Data', type: 'datetime', alternativeLabels: ['Data do Formulário', 'data'] },
    { key: 'id', label: 'ID', type: 'text', alternativeLabels: [] },
    { key: 'utm_source', label: 'utm_source', type: 'text', alternativeLabels: ['UTM Source'] },
    { key: 'utm_medium', label: 'utm_medium', type: 'text', alternativeLabels: ['UTM Medium'] },
    { key: 'utm_campaign', label: 'utm_campaign', type: 'text', alternativeLabels: ['UTM Campaign'] },
    { key: 'utm_term', label: 'utm_term', type: 'text', alternativeLabels: ['UTM Term'] },
    { key: 'utm_content', label: 'utm_content', type: 'text', alternativeLabels: ['UTM Content'] },
    { key: 'gclid', label: 'gclid', type: 'text', alternativeLabels: ['Google Click ID'] },
    { key: 'fbclid', label: 'fbclid', type: 'text', alternativeLabels: ['Facebook Click ID'] },
  ]

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {      
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          return row
        })

      setCsvHeaders(headers)
      setCsvData(data)
      
      // Auto-mapear campos conhecidos usando labels principais e alternativos
      const autoMapping: {[key: string]: string} = {}
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim()
        
        const field = availableFields.find(f => {
          // Correspondência exata com label principal
          if (f.label.toLowerCase() === normalizedHeader) return true
          
          // Correspondência com labels alternativos
          if (f.alternativeLabels.some(alt => alt.toLowerCase() === normalizedHeader)) return true
          
          // Correspondência exata com key
          if (f.key.toLowerCase() === normalizedHeader) return true
          
          // Correspondência parcial para casos especiais
          if (f.key === 'full_name' && (normalizedHeader.includes('nome') || normalizedHeader.includes('name'))) return true
          if (f.key === 'email' && normalizedHeader.includes('email')) return true
          if (f.key === 'whatsapp' && (normalizedHeader.includes('whatsapp') || normalizedHeader.includes('telefone'))) return true
          if (f.key === 'age' && (normalizedHeader.includes('idade') || normalizedHeader.includes('age'))) return true
          if (f.key === 'utm_source' && normalizedHeader === 'utm_source') return true
          if (f.key === 'utm_medium' && normalizedHeader === 'utm_medium') return true
          if (f.key === 'utm_campaign' && normalizedHeader === 'utm_campaign') return true
          if (f.key === 'utm_term' && normalizedHeader === 'utm_term') return true
          if (f.key === 'utm_content' && normalizedHeader === 'utm_content') return true
          if (f.key === 'gclid' && normalizedHeader === 'gclid') return true
          if (f.key === 'fbclid' && normalizedHeader === 'fbclid') return true
          
          return false
        })
        
        if (field) {
          autoMapping[header] = field.key
        }
      })
      setFieldMapping(autoMapping)
      setShowMapping(true)
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      setImportResult({
        success: false,
        message: 'Erro ao processar arquivo'
      })
    }
  }

  const addCustomField = () => {
    setCustomFields([...customFields, { name: '', type: 'text' }])
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const updateCustomField = (index: number, field: string, value: string) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], [field]: value }
    setCustomFields(updated)
  }

  const processImport = async () => {
    try {
      setImporting(true)

      // Criar dados mapeados
      const mappedData = csvData.map(row => {
        const mappedRow: any = {}
        
        // Mapear campos existentes
        Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
          if (dbField && row[csvField] !== undefined) {
            mappedRow[dbField] = row[csvField]
          }
        })

        // Adicionar campos personalizados
        customFields.forEach(field => {
          if (field.name && row[field.name] !== undefined) {
            mappedRow[field.name] = row[field.name]
          }
        })

        return mappedRow
      })

      const response = await fetch('/api/import-leads-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sheetsData: mappedData,
          customFields: customFields.filter(f => f.name)
        }),
      })

      const result = await response.json()
      setImportResult(result)
      setShowMapping(false)
    } catch (error) {
      console.error('Erro na importação:', error)
      setImportResult({
        success: false,
        message: 'Erro ao processar importação'
      })
    } finally {
      setImporting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const webhookUrl = "https://connect-sales.vercel.app/api/import-leads-sheets"
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

      {/* Modal de Mapeamento de Campos */}
      {showMapping && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-screen overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Mapear Campos do CSV
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMapping(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={processImport}
                  disabled={importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Foram detectados <strong>{csvHeaders.length}</strong> campos no seu CSV.
                  Mapeie os campos do CSV para os campos da tabela de leads:
                </p>
                <div className="text-sm text-blue-600">
                  {csvData.length} registros serão importados
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Mapeamento de Campos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {csvHeaders.map((header, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campo CSV: <strong>{header}</strong>
                      </label>
                      <div className="text-xs text-gray-500 mb-2">
                        Exemplo: {csvData[0]?.[header] || 'N/A'}
                      </div>
                      <select
                        value={fieldMapping[header] || ''}
                        onChange={(e) => setFieldMapping({
                          ...fieldMapping,
                          [header]: e.target.value
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Não mapear</option>
                        {availableFields.map(field => (
                          <option key={field.key} value={field.key}>
                            {field.label} ({field.type})
                          </option>
                        ))}
                        <optgroup label="Campos Personalizados">
                          {customFields.map((field, idx) => (
                            field.name && (
                              <option key={`custom-${idx}`} value={field.name}>
                                {field.name} (personalizado)
                              </option>
                            )
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Campos Não Mapeados</h4>
                    <p className="text-sm text-gray-600">
                      Os campos abaixo não foram mapeados para nenhum campo da tabela de leads. 
                      Você pode criar campos personalizados para armazená-los.
                    </p>
                  </div>

                  {/* Mostrar campos não mapeados */}
                  {csvHeaders.filter(header => !fieldMapping[header]).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-yellow-800 mb-2">
                        Campos não mapeados ({csvHeaders.filter(header => !fieldMapping[header]).length})
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {csvHeaders.filter(header => !fieldMapping[header]).map(header => (
                          <div key={header} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div>
                              <div className="text-sm font-medium">{header}</div>
                              <div className="text-xs text-gray-500">Ex: {csvData[0]?.[header]}</div>
                            </div>
                            <button
                              onClick={() => {
                                const newField = { name: header, type: 'text' }
                                setCustomFields([...customFields, newField])
                                setFieldMapping({ ...fieldMapping, [header]: header })
                              }}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            >
                              Criar Campo
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campos personalizados criados */}
                  {customFields.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-3">
                        Campos Personalizados Criados ({customFields.length})
                      </h5>
                      <div className="space-y-2">
                        {customFields.map((field, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                            <div className="flex-1">
                              <div className="font-medium">{field.name}</div>
                              <div className="text-sm text-gray-600">Tipo: {field.type}</div>
                            </div>
                            <button
                              onClick={() => {
                                // Remove do mapeamento
                                const newMapping = { ...fieldMapping }
                                delete newMapping[field.name]
                                setFieldMapping(newMapping)
                                // Remove do array de campos personalizados
                                removeCustomField(index)
                              }}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Resumo do Mapeamento</h5>
                  <div className="text-sm space-y-1">
                    <div>Campos mapeados: <strong>{Object.keys(fieldMapping).filter(k => fieldMapping[k]).length}</strong></div>
                    <div>Campos ignorados: <strong>{csvHeaders.length - Object.keys(fieldMapping).filter(k => fieldMapping[k]).length}</strong></div>
                    <div>Campos personalizados: <strong>{customFields.filter(f => f.name).length}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
    if (values[index] !== null && values[index] !== undefined && values[index] !== '') {
      rowData[header] = values[index];
    }
  });
  
  // Debug: Log dos dados que serão enviados
  console.log('Headers:', headers);
  console.log('Values:', values);
  console.log('Row Data:', rowData);
  
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
    const responseText = response.getContentText();
    console.log('Response status:', response.getResponseCode());
    console.log('Lead enviado com sucesso:', responseText);
    
    // Parse da resposta para verificar se deu certo
    const result = JSON.parse(responseText);
    if (result.success) {
      console.log('✅ Sucesso! Leads criados:', result.results.created);
    } else {
      console.error('❌ Erro na importação:', result.message);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar lead:', error.toString());
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