import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../lib/db.ts';
import { MetaInsightSchema } from '../lib/zod-schemas.ts';
import { createLogger, logMiddleware } from '../lib/logger.ts';

const logger = createLogger({ function: 'meta-sync' });

// Configuração da API do Meta
const META_API_VERSION = 'v18.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

async function handler(req: Request): Promise<Response> {
  // Aceitar GET para testes manuais e POST para cron
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    // Obter configurações do ambiente
    const accountId = Deno.env.get('META_AD_ACCOUNT_ID');
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');
    
    if (!accountId || !accessToken) {
      logger.error('Configuração Meta Ads ausente');
      return new Response(JSON.stringify({ 
        error: 'Meta Ads configuration missing' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Parse de parâmetros opcionais
    const url = new URL(req.url);
    const daysBack = parseInt(url.searchParams.get('days_back') || '7');
    const forceDate = url.searchParams.get('date'); // formato: YYYY-MM-DD
    
    logger.info('Iniciando sincronização Meta Ads', {
      account_id: accountId,
      days_back: daysBack,
      force_date: forceDate,
    });
    
    // Definir período de busca
    const dates = forceDate 
      ? [new Date(forceDate)]
      : getDateRange(daysBack);
    
    const client = getSupabaseClient();
    let totalInserted = 0;
    let totalUpdated = 0;
    
    // Processar cada dia
    for (const date of dates) {
      const dateStr = formatDate(date);
      
      logger.info(`Buscando dados para ${dateStr}`);
      
      try {
        // Buscar insights do Meta
        const insights = await fetchMetaInsights(
          accountId,
          accessToken,
          dateStr,
          dateStr
        );
        
        // Processar e salvar insights
        for (const insight of insights) {
          const result = await saveInsight(client, accountId, insight);
          if (result === 'inserted') totalInserted++;
          if (result === 'updated') totalUpdated++;
        }
        
      } catch (error: any) {
        logger.error(`Erro ao processar data ${dateStr}`, {
          error: error.message,
        });
      }
    }
    
    logger.info('Sincronização concluída', {
      total_inserted: totalInserted,
      total_updated: totalUpdated,
    });
    
    return new Response(JSON.stringify({
      status: 'success',
      dates_processed: dates.length,
      insights_inserted: totalInserted,
      insights_updated: totalUpdated,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    logger.error('Erro na sincronização Meta Ads', {
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(JSON.stringify({ 
      error: 'Sync failed',
      message: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Buscar insights da API do Meta
 */
async function fetchMetaInsights(
  accountId: string,
  accessToken: string,
  dateStart: string,
  dateStop: string
): Promise<any[]> {
  const endpoint = `${META_API_BASE}/${accountId}/insights`;
  
  const params = new URLSearchParams({
    access_token: accessToken,
    time_range: JSON.stringify({
      since: dateStart,
      until: dateStop,
    }),
    level: 'ad',
    fields: [
      'campaign_id',
      'campaign_name',
      'adset_id',
      'adset_name',
      'ad_id',
      'ad_name',
      'spend',
      'impressions',
      'clicks',
      'actions',
      'cost_per_action_type',
      'cpm',
      'cpc',
      'ctr',
    ].join(','),
    breakdowns: 'age,gender',
    limit: '500',
  });
  
  const url = `${endpoint}?${params}`;
  
  logger.debug('Chamando API Meta', { url: url.replace(accessToken, '[REDACTED]') });
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('Erro na API Meta', {
      status: response.status,
      body: errorBody,
    });
    throw new Error(`Meta API error: ${response.status} - ${errorBody}`);
  }
  
  const data = await response.json();
  const insights = [];
  
  // Processar dados paginados
  let currentData = data;
  while (currentData) {
    if (currentData.data) {
      insights.push(...currentData.data);
    }
    
    // Verificar se tem próxima página
    if (currentData.paging && currentData.paging.next) {
      const nextResponse = await fetch(currentData.paging.next);
      if (nextResponse.ok) {
        currentData = await nextResponse.json();
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  logger.info(`Insights recuperados: ${insights.length}`);
  
  return insights;
}

/**
 * Salvar insight no banco
 */
async function saveInsight(
  client: any,
  accountId: string,
  insight: any
): Promise<'inserted' | 'updated' | 'error'> {
  try {
    // Extrair métricas básicas
    const spend = parseFloat(insight.spend || '0');
    const impressions = parseInt(insight.impressions || '0');
    const clicks = parseInt(insight.clicks || '0');
    
    // Extrair leads das ações (se disponível)
    let leads = 0;
    if (insight.actions) {
      const leadAction = insight.actions.find(
        (a: any) => a.action_type === 'lead' || 
                     a.action_type === 'leadgen_grouped' ||
                     a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      if (leadAction) {
        leads = parseInt(leadAction.value || '0');
      }
    }
    
    const insightData = {
      date: insight.date_start,
      account_id: accountId,
      campaign_id: insight.campaign_id,
      adset_id: insight.adset_id,
      ad_id: insight.ad_id,
      spend: spend,
      impressions: impressions,
      clicks: clicks,
      leads: leads,
    };
    
    // Verificar se já existe
    const { data: existing } = await client
      .from('ad_insights_daily')
      .select('id')
      .eq('date', insightData.date)
      .eq('account_id', accountId)
      .eq('campaign_id', insight.campaign_id)
      .eq('adset_id', insight.adset_id)
      .eq('ad_id', insight.ad_id)
      .single();
    
    if (existing) {
      // Atualizar registro existente
      await client
        .from('ad_insights_daily')
        .update(insightData)
        .eq('id', existing.id);
      
      return 'updated';
    } else {
      // Inserir novo registro
      await client
        .from('ad_insights_daily')
        .insert(insightData);
      
      return 'inserted';
    }
    
  } catch (error: any) {
    logger.error('Erro ao salvar insight', {
      error: error.message,
      insight: insight,
    });
    return 'error';
  }
}

/**
 * Gerar range de datas
 */
function getDateRange(daysBack: number): Date[] {
  const dates = [];
  const today = new Date();
  
  for (let i = 1; i <= daysBack; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  
  return dates.reverse();
}

/**
 * Formatar data para YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Wrapper com CORS
serve(logMiddleware(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const response = await handler(req);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}));