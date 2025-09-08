import { describe, it, expect } from 'vitest';
import { generateEventHash } from '../edge/lib/crypto';

describe('Idempotência', () => {
  describe('Geração de Hash de Eventos', () => {
    it('deve gerar o mesmo hash para payloads idênticos', () => {
      const payload1 = {
        order_id: 'TEST_123',
        customer_email: 'test@example.com',
        value: 100.00,
        timestamp: '2024-01-15T10:00:00Z'
      };

      const payload2 = {
        order_id: 'TEST_123',
        customer_email: 'test@example.com',
        value: 100.00,
        timestamp: '2024-01-15T10:00:00Z'
      };

      const hash1 = generateEventHash(payload1);
      const hash2 = generateEventHash(payload2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hash length
    });

    it('deve gerar hashes diferentes para payloads diferentes', () => {
      const payload1 = {
        order_id: 'TEST_123',
        customer_email: 'test@example.com',
        value: 100.00
      };

      const payload2 = {
        order_id: 'TEST_456',
        customer_email: 'test@example.com',
        value: 100.00
      };

      const hash1 = generateEventHash(payload1);
      const hash2 = generateEventHash(payload2);

      expect(hash1).not.toBe(hash2);
    });

    it('deve ser sensível à ordem das propriedades', () => {
      const payload1 = { a: 1, b: 2 };
      const payload2 = { b: 2, a: 1 };

      const hash1 = generateEventHash(payload1);
      const hash2 = generateEventHash(payload2);

      // Como usamos JSON.stringify, a ordem importa
      expect(hash1).not.toBe(hash2);
    });

    it('deve funcionar com strings', () => {
      const payload1 = '{"order_id":"TEST_123","value":100}';
      const payload2 = '{"order_id":"TEST_123","value":100}';

      const hash1 = generateEventHash(payload1);
      const hash2 = generateEventHash(payload2);

      expect(hash1).toBe(hash2);
    });

    it('deve gerar hashes diferentes para valores ligeiramente diferentes', () => {
      const payload1 = { order_id: 'TEST_123', value: 100.00 };
      const payload2 = { order_id: 'TEST_123', value: 100.01 };

      const hash1 = generateEventHash(payload1);
      const hash2 = generateEventHash(payload2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Cenários de Webhook Real', () => {
    it('deve detectar webhook duplicado exato', () => {
      const webhookPayload = {
        order_id: 'KIWI_123456',
        order_status: 'approved',
        customer_email: 'customer@example.com',
        value: 497.00,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:32:00Z'
      };

      // Simular mesmo webhook sendo enviado duas vezes
      const hash1 = generateEventHash(webhookPayload);
      const hash2 = generateEventHash(webhookPayload);

      expect(hash1).toBe(hash2);
    });

    it('deve detectar atualizações legítimas (timestamps diferentes)', () => {
      const webhook1 = {
        order_id: 'KIWI_123456',
        order_status: 'pending',
        customer_email: 'customer@example.com',
        value: 497.00,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };

      const webhook2 = {
        order_id: 'KIWI_123456',
        order_status: 'approved', // Status mudou
        customer_email: 'customer@example.com',
        value: 497.00,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:32:00Z' // Timestamp mudou
      };

      const hash1 = generateEventHash(webhook1);
      const hash2 = generateEventHash(webhook2);

      expect(hash1).not.toBe(hash2);
    });

    it('deve ser consistente com diferentes tipos de dados', () => {
      const webhook1 = {
        order_id: 'TEST_123',
        value: 100,
        is_test: true,
        tags: ['promo', 'vip'],
        metadata: {
          source: 'api',
          version: 2
        }
      };

      const webhook2 = {
        order_id: 'TEST_123',
        value: 100,
        is_test: true,
        tags: ['promo', 'vip'],
        metadata: {
          source: 'api',
          version: 2
        }
      };

      const hash1 = generateEventHash(webhook1);
      const hash2 = generateEventHash(webhook2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Performance e Robustez', () => {
    it('deve funcionar com payloads grandes', () => {
      const largePayload = {
        order_id: 'TEST_123',
        items: Array.from({ length: 100 }, (_, i) => ({
          id: `item_${i}`,
          name: `Product ${i}`,
          price: Math.random() * 1000,
          description: 'A'.repeat(1000) // String grande
        }))
      };

      const hash = generateEventHash(largePayload);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve lidar com caracteres especiais', () => {
      const payloadWithSpecialChars = {
        customer_name: 'José da Silva & Cia. Ltda.',
        email: 'josé+test@example.com',
        notes: 'Pedido especial: ação, coração, não, ção 🎉',
        unicode: '✨🌟⭐️'
      };

      const hash = generateEventHash(payloadWithSpecialChars);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve ser determinístico em múltiplas execuções', () => {
      const payload = { order_id: 'TEST_DETERMINISTIC', value: 299.99 };
      
      const hashes = Array.from({ length: 10 }, () => 
        generateEventHash(payload)
      );

      // Todos os hashes devem ser iguais
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });
  });
});