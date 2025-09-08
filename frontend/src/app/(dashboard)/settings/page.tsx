'use client'

import { useState } from 'react'
import { Copy, CheckCircle, ExternalLink } from 'lucide-react'

const WEBHOOK_URLS = {
  kiwify: 'https://camdhrxwfqkxamdxyviv.supabase.co/functions/v1/webhooks-kiwify',
  dmg: 'https://camdhrxwfqkxamdxyviv.supabase.co/functions/v1/webhooks-dmg',
  cademi: 'https://camdhrxwfqkxamdxyviv.supabase.co/functions/v1/webhooks-cademi',
  voomp: 'https://camdhrxwfqkxamdxyviv.supabase.co/functions/v1/webhooks-voomp',
  pixel: 'https://camdhrxwfqkxamdxyviv.supabase.co/functions/v1/ingest-pixel',
  metaSync: 'https://camdhrxwfqkxamdxyviv.supabase.co/functions/v1/meta-sync'
}

const PLATFORM_INFO = {
  kiwify: { name: 'Kiwify' },
  dmg: { name: 'Digital Manager Guru' },
  cademi: { name: 'Cademi' },
  voomp: { name: 'Voomp' },
  pixel: { name: 'Pixel JavaScript' },
  metaSync: { name: 'Meta Ads Sync' }
}

export default function Settings() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrl(key)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Configure webhooks e integrações das suas plataformas</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Webhooks das Plataformas */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">URLs dos Webhooks</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure essas URLs nas suas plataformas
            </p>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {Object.entries(WEBHOOK_URLS).map(([key, url]) => {
                const platform = PLATFORM_INFO[key as keyof typeof PLATFORM_INFO]
                return (
                  <div key={key} className="border border-gray-200/60 rounded-xl p-5 bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge platform-${key}`}>
                        {platform.name}
                      </span>
                      <button
                        onClick={() => copyToClipboard(url, key)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        {copiedUrl === key ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-xs bg-gray-50 p-3 rounded-lg block break-all font-mono border">
                      {url}
                    </code>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Instruções de Configuração */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Como Configurar</h2>
          </div>
          <div className="card-content">
            <div className="space-y-6">
              {/* Kiwify */}
              <div>
                <h3 className="font-semibold text-emerald-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Kiwify
                </h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Acesse o painel da Kiwify</li>
                  <li>Vá em Integrações → Webhooks</li>
                  <li>Cole a URL do webhook Kiwify</li>
                  <li>Salve e teste a integração</li>
                </ol>
              </div>

              {/* DMG */}
              <div>
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Digital Manager Guru
                </h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Acesse Configurações → Webhooks</li>
                  <li>Adicione a URL do webhook DMG</li>
                  <li>Configure os eventos desejados</li>
                  <li>Salve as configurações</li>
                </ol>
              </div>

              {/* Meta Ads */}
              <div>
                <h3 className="font-semibold text-indigo-700 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                  Meta Ads
                </h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Configure seu Access Token</li>
                  <li>Adicione o Account ID</li>
                  <li>Configure sync diário via cron</li>
                  <li>URL: {WEBHOOK_URLS.metaSync.slice(-20)}...</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pixel JavaScript */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Pixel JavaScript</h2>
          <p className="text-sm text-gray-500 mt-1">
            Código para rastreamento de visitantes
          </p>
        </div>
        <div className="card-content">
          <div className="bg-gray-900 text-white p-5 rounded-xl overflow-x-auto border border-gray-200">
            <code className="text-sm">
{`<!-- Adicione este código no <head> de todas as páginas -->
<script src="https://seu-site.com/dq_pixel.js" data-auto-init="true"></script>

<script>
  DQPixel.init({
    endpoint: '${WEBHOOK_URLS.pixel}'
  });
  
  // Capturar email no checkout
  DQPixel.pushEmail('customer@example.com');
  
  // Rastrear eventos
  DQPixel.track('purchase', {
    order_id: 'ORD_123',
    value: 497.00
  });
</script>`}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(`<!-- Pixel Code -->\n<script src="https://seu-site.com/dq_pixel.js" data-auto-init="true"></script>\n<script>\nDQPixel.init({\n  endpoint: '${WEBHOOK_URLS.pixel}'\n});\n</script>`, 'pixel-code')}
            className="mt-3 btn-secondary text-sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Código do Pixel
          </button>
        </div>
      </div>

      {/* Status das Integrações */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Status das Integrações</h2>
        </div>
        <div className="card-content">
          <div className="space-y-3">
            {Object.entries(PLATFORM_INFO).map(([key, platform]) => (
              <div key={key} className="flex items-center justify-between p-4 border border-gray-200/60 rounded-xl bg-white/50 backdrop-blur-sm">
                <div>
                  <span className="font-medium text-gray-900">{platform.name}</span>
                  <p className="text-sm text-gray-500">Último evento: Há 2 minutos</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-green-600">Ativo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}