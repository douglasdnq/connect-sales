import { describe, it, expect } from 'vitest';
import { 
  normalizeKiwify, 
  normalizeDMG, 
  normalizeCademi, 
  normalizeVoomp 
} from '../edge/lib/normalize';

describe('Normalização de Webhooks', () => {
  describe('Kiwify', () => {
    it('deve normalizar pedido aprovado do Kiwify', () => {
      const payload = {
        order_id: 'KIWI_123456',
        order_status: 'approved',
        product_id: 'prod_abc',
        product_name: 'Curso de Marketing',
        customer_email: 'joao@example.com',
        customer_name: 'João Silva',
        customer_phone: '+5511999887766',
        customer_document: '12345678901',
        value: 497.00,
        payment_method: 'credit_card',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:32:00Z',
        commission_value: 50.00,
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'black_friday'
      };

      const result = normalizeKiwify(payload);
      
      expect(result).toEqual({
        type: 'order_paid',
        platform_order_id: 'KIWI_123456',
        paid_at: '2024-01-15T10:32:00Z',
        amount: 497.00,
        fee: 50.00,
        payment_method: 'credit_card'
      });
    });

    it('deve normalizar novo pedido do Kiwify', () => {
      const payload = {
        order_id: 'KIWI_789012',
        order_status: 'pending',
        product_id: 'prod_xyz',
        product_name: 'Ebook Vendas',
        customer_email: 'maria@example.com',
        customer_name: 'Maria Santos',
        value: 97.00,
        payment_method: 'pix',
        created_at: '2024-01-15T14:00:00Z',
        updated_at: '2024-01-15T14:00:00Z',
        utm_source: 'instagram',
        utm_campaign: 'story_promo'
      };

      const result = normalizeKiwify(payload);
      
      expect(result?.type).toBe('order_created');
      expect(result?.platform_order_id).toBe('KIWI_789012');
      expect(result?.customer.email).toBe('maria@example.com');
      expect(result?.gross_amount).toBe(97.00);
      expect(result?.status).toBe('pending');
      expect(result?.utm_source).toBe('instagram');
    });

    it('deve normalizar reembolso do Kiwify', () => {
      const payload = {
        order_id: 'KIWI_123456',
        order_status: 'refunded',
        product_id: 'prod_abc',
        product_name: 'Curso de Marketing',
        customer_email: 'joao@example.com',
        customer_name: 'João Silva',
        value: 497.00,
        payment_method: 'credit_card',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-16T09:15:00Z',
      };

      const result = normalizeKiwify(payload);
      
      expect(result).toEqual({
        type: 'refund',
        platform_order_id: 'KIWI_123456',
        refund_at: '2024-01-16T09:15:00Z',
        amount: 497.00,
        reason: 'Solicitação do cliente'
      });
    });
  });

  describe('Digital Manager Guru', () => {
    it('deve normalizar transação completa do DMG', () => {
      const payload = {
        transaction_id: 'DMG_987654',
        status: 'completed',
        product: {
          id: 'ebook_001',
          name: 'E-book Vendas Online',
          price: 97.00
        },
        buyer: {
          email: 'pedro@example.com',
          name: 'Pedro Oliveira',
          phone: '+5531987654321',
          cpf: '11122233344'
        },
        payment: {
          method: 'boleto',
          amount: 97.00,
          fee: 3.50,
          date: '2024-01-15T16:00:00Z'
        },
        tracking: {
          source: 'google',
          medium: 'cpc',
          campaign: 'search_brand'
        }
      };

      const result = normalizeDMG(payload);
      
      expect(result?.type).toBe('order_paid');
      expect(result?.platform_order_id).toBe('DMG_987654');
      expect(result?.amount).toBe(97.00);
      expect(result?.fee).toBe(3.50);
    });
  });

  describe('Cademi', () => {
    it('deve normalizar matrícula do Cademi', () => {
      const payload = {
        enrollment_id: 'CADEMI_555',
        course_id: 'course_gestao',
        course_name: 'Formação em Gestão',
        student: {
          email: 'ana@example.com',
          name: 'Ana Costa',
          phone: '+5521998887777',
          document: '99988877766'
        },
        enrolled_date: '2024-01-15T12:00:00Z',
        price: 1997.00,
        status: 'active'
      };

      const result = normalizeCademi(payload);
      
      expect(result).toEqual({
        type: 'enrollment',
        platform_enrollment_id: 'CADEMI_555',
        customer: {
          email: 'ana@example.com',
          name: 'Ana Costa',
          phone_e164: '+5521998887777',
          cpf: '99988877766'
        },
        product: {
          platform_product_id: 'course_gestao',
          name: 'Formação em Gestão',
          list_price: 1997.00
        },
        enrolled_at: '2024-01-15T12:00:00Z'
      });
    });
  });

  describe('Voomp', () => {
    it('deve normalizar venda aprovada do Voomp', () => {
      const payload = {
        sale_id: 'VOOMP_777',
        product_id: 'vit_001',
        product_name: 'Acesso Vitalício',
        customer: {
          email: 'carlos@example.com',
          full_name: 'Carlos Mendes',
          phone_number: '+5511888999000',
          cpf: '55544433322'
        },
        sale_value: 997.00,
        sale_date: '2024-01-15T18:30:00Z',
        payment_type: 'credit_card',
        sale_status: 'approved',
        affiliates: [{
          affiliate_id: 'aff_123',
          commission: 100.00
        }]
      };

      const result = normalizeVoomp(payload);
      
      expect(result?.type).toBe('order_paid');
      expect(result?.platform_order_id).toBe('VOOMP_777');
      expect(result?.amount).toBe(997.00);
    });
  });

  describe('Casos de Erro', () => {
    it('deve retornar null para payload inválido', () => {
      const invalidPayload = {
        invalid: 'data'
      };

      expect(normalizeKiwify(invalidPayload)).toBeNull();
      expect(normalizeDMG(invalidPayload)).toBeNull();
      expect(normalizeCademi(invalidPayload)).toBeNull();
      expect(normalizeVoomp(invalidPayload)).toBeNull();
    });

    it('deve retornar null para payload vazio', () => {
      expect(normalizeKiwify({})).toBeNull();
      expect(normalizeDMG({})).toBeNull();
      expect(normalizeCademi({})).toBeNull();
      expect(normalizeVoomp({})).toBeNull();
    });
  });
});