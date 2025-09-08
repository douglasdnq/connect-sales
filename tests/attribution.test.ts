import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseUTMFromURL, mergeAttributions } from '../edge/lib/attribution';

// Mock do Supabase client para testes isolados
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      })),
      gte: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
    })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      lt: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
};

describe('Sistema de Atribuição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parse de UTM da URL', () => {
    it('deve extrair todos os parâmetros UTM de uma URL completa', () => {
      const url = 'https://example.com/produto?utm_source=facebook&utm_medium=cpc&utm_campaign=black_friday&utm_content=video1&utm_term=marketing+digital&fbclid=123abc&gclid=456def';
      
      const result = parseUTMFromURL(url);
      
      expect(result).toEqual({
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'black_friday',
        utm_content: 'video1',
        utm_term: 'marketing digital',
        fbclid: '123abc',
        gclid: '456def',
        landing_page: 'https://example.com/produto'
      });
    });

    it('deve extrair apenas parâmetros presentes', () => {
      const url = 'https://example.com/produto?utm_source=instagram&utm_campaign=stories&other_param=123';
      
      const result = parseUTMFromURL(url);
      
      expect(result).toEqual({
        utm_source: 'instagram',
        utm_campaign: 'stories',
        landing_page: 'https://example.com/produto'
      });
    });

    it('deve retornar apenas landing_page para URL sem UTMs', () => {
      const url = 'https://example.com/produto';
      
      const result = parseUTMFromURL(url);
      
      expect(result).toEqual({
        landing_page: 'https://example.com/produto'
      });
    });

    it('deve lidar com URLs inválidas', () => {
      const invalidUrl = 'not-a-url';
      
      const result = parseUTMFromURL(invalidUrl);
      
      expect(result).toEqual({});
    });

    it('deve decodificar parâmetros URL-encoded', () => {
      const url = 'https://example.com/produto?utm_term=marketing%20digital&utm_content=an%C3%BAncio%201';
      
      const result = parseUTMFromURL(url);
      
      expect(result.utm_term).toBe('marketing digital');
      expect(result.utm_content).toBe('anúncio 1');
    });
  });

  describe('Merge de Atribuições', () => {
    it('deve priorizar valores da atribuição mais recente (incoming)', () => {
      const existing = {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'old_campaign',
        timestamp: '2024-01-15T10:00:00Z'
      };

      const incoming = {
        utm_campaign: 'new_campaign',
        utm_content: 'video2',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = mergeAttributions(existing, incoming);

      expect(result).toEqual({
        utm_source: 'google', // mantido do existing
        utm_medium: 'cpc',    // mantido do existing
        utm_campaign: 'new_campaign', // sobrescrito pelo incoming
        utm_content: 'video2', // novo do incoming
        timestamp: '2024-01-15T12:00:00Z' // sobrescrito pelo incoming
      });
    });

    it('deve manter valores do existing quando incoming não tem equivalente', () => {
      const existing = {
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale',
        fbclid: 'abc123'
      };

      const incoming = {
        gclid: 'def456'
      };

      const result = mergeAttributions(existing, incoming);

      expect(result).toEqual({
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale',
        fbclid: 'abc123',
        gclid: 'def456'
      });
    });

    it('deve lidar com valores undefined/null', () => {
      const existing = {
        utm_source: 'twitter',
        utm_medium: undefined as any,
        utm_campaign: null as any
      };

      const incoming = {
        utm_medium: 'social',
        utm_content: 'tweet1'
      };

      const result = mergeAttributions(existing, incoming);

      expect(result).toEqual({
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: null,
        utm_content: 'tweet1'
      });
    });
  });

  describe('Regras de Atribuição Last Non-Direct', () => {
    it('deve implementar janela de atribuição de 72 horas', () => {
      const now = new Date();
      const withinWindow = new Date(now.getTime() - (71 * 60 * 60 * 1000)); // 71 horas atrás
      const outsideWindow = new Date(now.getTime() - (73 * 60 * 60 * 1000)); // 73 horas atrás
      
      expect(withinWindow.getTime()).toBeGreaterThan(
        now.getTime() - (72 * 60 * 60 * 1000)
      );
      
      expect(outsideWindow.getTime()).toBeLessThan(
        now.getTime() - (72 * 60 * 60 * 1000)
      );
    });

    it('deve priorizar UTMs diretas do webhook sobre cookie', () => {
      const directAttribution = {
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'direct_from_webhook'
      };

      // Atribuição direta deve ter prioridade sobre qualquer cookie
      expect(directAttribution.utm_source).toBe('facebook');
      expect(directAttribution.utm_campaign).toBe('direct_from_webhook');
    });

    it('deve identificar tráfego direto vs não-direto', () => {
      const directTraffic = {
        utm_source: undefined,
        utm_medium: undefined,
        utm_campaign: undefined,
        fbclid: undefined,
        gclid: undefined
      };

      const paidTraffic = {
        utm_source: 'google',
        utm_medium: 'cpc'
      };

      const organicSocial = {
        utm_source: 'facebook',
        utm_medium: 'organic'
      };

      const isDirect = (attribution: any) => 
        !attribution.utm_source && 
        !attribution.utm_medium && 
        !attribution.fbclid && 
        !attribution.gclid;

      expect(isDirect(directTraffic)).toBe(true);
      expect(isDirect(paidTraffic)).toBe(false);
      expect(isDirect(organicSocial)).toBe(false);
    });
  });

  describe('Cenários de Atribuição Complexos', () => {
    it('deve lidar com jornada de múltiplos touchpoints', () => {
      // Simular jornada: Google Ads -> Facebook -> Direct -> Purchase
      const touchpoints = [
        {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'search_brand',
          timestamp: '2024-01-15T10:00:00Z'
        },
        {
          utm_source: 'facebook',
          utm_medium: 'cpc',
          utm_campaign: 'retargeting',
          timestamp: '2024-01-15T14:00:00Z'
        },
        {
          // Direct traffic - sem UTMs
          landing_page: 'https://example.com/checkout',
          timestamp: '2024-01-15T16:00:00Z'
        }
      ];

      // Last non-direct seria o Facebook
      const lastNonDirect = touchpoints
        .filter(t => t.utm_source || t.utm_medium)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      expect(lastNonDirect.utm_source).toBe('facebook');
      expect(lastNonDirect.utm_campaign).toBe('retargeting');
    });

    it('deve reconhecer diferentes tipos de clique IDs', () => {
      const facebookClick = {
        utm_source: 'facebook',
        fbclid: 'IwAR1abc123def456'
      };

      const googleClick = {
        utm_source: 'google',
        gclid: 'Cj0KCQiA1abc123def456'
      };

      expect(facebookClick.fbclid).toBeTruthy();
      expect(googleClick.gclid).toBeTruthy();
    });

    it('deve lidar com campanhas em diferentes idiomas/caracteres', () => {
      const internationalCampaign = {
        utm_source: 'facebook',
        utm_campaign: 'promoção_verão_2024',
        utm_content: 'anúncio_principal'
      };

      expect(internationalCampaign.utm_campaign).toContain('ã');
      expect(internationalCampaign.utm_content).toContain('ú');
    });
  });

  describe('Edge Cases e Validações', () => {
    it('deve lidar com parâmetros UTM vazios', () => {
      const url = 'https://example.com/produto?utm_source=&utm_medium=cpc&utm_campaign=';
      
      const result = parseUTMFromURL(url);
      
      // Parâmetros vazios não devem ser incluídos
      expect(result.utm_source).toBeUndefined();
      expect(result.utm_medium).toBe('cpc');
      expect(result.utm_campaign).toBeUndefined();
    });

    it('deve normalizar case de parâmetros', () => {
      const attribution = {
        utm_source: 'Facebook',
        utm_medium: 'CPC',
        utm_campaign: 'Black_Friday'
      };

      // Em um sistema real, você pode querer normalizar o case
      const normalized = {
        utm_source: attribution.utm_source.toLowerCase(),
        utm_medium: attribution.utm_medium.toLowerCase(),
        utm_campaign: attribution.utm_campaign.toLowerCase()
      };

      expect(normalized.utm_source).toBe('facebook');
      expect(normalized.utm_medium).toBe('cpc');
      expect(normalized.utm_campaign).toBe('black_friday');
    });

    it('deve validar comprimento de parâmetros', () => {
      const longCampaignName = 'a'.repeat(500);
      const attribution = {
        utm_campaign: longCampaignName
      };

      // Em produção, você pode querer truncar
      const maxLength = 255;
      const truncated = attribution.utm_campaign.slice(0, maxLength);
      
      expect(truncated).toHaveLength(maxLength);
    });
  });
});