import {
  OrderCreatedEvent,
  OrderPaidEvent,
  RefundEvent,
  ChargebackEvent,
  SubscriptionRenewedEvent,
  EnrollmentEvent,
  KiwifyWebhookSchema,
  DMGWebhookSchema,
  CademiWebhookSchema,
  VoompWebhookSchema,
} from './zod-schemas';

/**
 * Normaliza payload do Kiwify para evento padrão
 */
export function normalizeKiwify(payload: any): OrderCreatedEvent | OrderPaidEvent | RefundEvent | ChargebackEvent | null {
  try {
    const data = KiwifyWebhookSchema.parse(payload);
    
    // Mapear status do Kiwify para status normalizado
    const statusMap: Record<string, string> = {
      'approved': 'paid',
      'pending': 'pending',
      'refunded': 'refunded',
      'chargeback': 'chargeback',
      'cancelled': 'canceled',
      'failed': 'canceled',
    };
    
    const normalizedStatus = statusMap[data.order_status.toLowerCase()] || 'pending';
    
    // Se for reembolso
    if (data.order_status.toLowerCase() === 'refunded') {
      return {
        type: 'refund',
        platform_order_id: data.order_id,
        refund_at: data.updated_at,
        amount: data.value,
        reason: 'Solicitação do cliente',
      } as RefundEvent;
    }
    
    // Se for chargeback
    if (data.order_status.toLowerCase() === 'chargeback') {
      return {
        type: 'chargeback',
        platform_order_id: data.order_id,
        chargeback_at: data.updated_at,
        amount: data.value,
        reason: 'Contestação bancária',
      } as ChargebackEvent;
    }
    
    // Se for pagamento aprovado
    if (data.order_status.toLowerCase() === 'approved') {
      return {
        type: 'order_paid',
        platform_order_id: data.order_id,
        paid_at: data.updated_at,
        amount: data.value,
        fee: data.commission_value,
        payment_method: data.payment_method,
      } as OrderPaidEvent;
    }
    
    // Evento de criação/atualização de pedido
    return {
      type: 'order_created',
      platform_order_id: data.order_id,
      customer: {
        email: data.customer_email,
        name: data.customer_name,
        phone_e164: data.customer_phone,
        cpf: data.customer_document,
      },
      products: [{
        product: {
          platform_product_id: data.product_id,
          name: data.product_name,
          list_price: data.value,
        },
        qty: 1,
        unit_price: data.value,
      }],
      order_date: data.created_at,
      gross_amount: data.value,
      net_amount: data.value - (data.commission_value || 0),
      status: normalizedStatus as any,
      payment_method: data.payment_method,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
    };
  } catch (error) {
    console.error('Erro ao normalizar Kiwify:', error);
    return null;
  }
}

/**
 * Normaliza payload do Digital Manager Guru para evento padrão
 */
export function normalizeDMG(payload: any): OrderCreatedEvent | OrderPaidEvent | RefundEvent | null {
  try {
    const data = DMGWebhookSchema.parse(payload);
    
    const statusMap: Record<string, string> = {
      'completed': 'paid',
      'processing': 'pending',
      'refunded': 'refunded',
      'cancelled': 'canceled',
      'failed': 'canceled',
    };
    
    const normalizedStatus = statusMap[data.status.toLowerCase()] || 'pending';
    
    // Se for reembolso
    if (data.status.toLowerCase() === 'refunded') {
      return {
        type: 'refund',
        platform_order_id: data.transaction_id,
        refund_at: new Date().toISOString(),
        amount: data.payment.amount,
        reason: 'Solicitação do cliente',
      } as RefundEvent;
    }
    
    // Se for pagamento completo
    if (data.status.toLowerCase() === 'completed') {
      return {
        type: 'order_paid',
        platform_order_id: data.transaction_id,
        paid_at: data.payment.date,
        amount: data.payment.amount,
        fee: data.payment.fee,
        payment_method: data.payment.method,
      } as OrderPaidEvent;
    }
    
    // Evento de criação de pedido
    return {
      type: 'order_created',
      platform_order_id: data.transaction_id,
      customer: {
        email: data.buyer.email,
        name: data.buyer.name,
        phone_e164: data.buyer.phone,
        cpf: data.buyer.cpf,
      },
      products: [{
        product: {
          platform_product_id: data.product.id,
          name: data.product.name,
          list_price: data.product.price,
        },
        qty: 1,
        unit_price: data.product.price,
      }],
      order_date: data.payment.date,
      gross_amount: data.payment.amount,
      net_amount: data.payment.amount - data.payment.fee,
      status: normalizedStatus as any,
      payment_method: data.payment.method,
      utm_source: data.tracking?.source,
      utm_medium: data.tracking?.medium,
      utm_campaign: data.tracking?.campaign,
    };
  } catch (error) {
    console.error('Erro ao normalizar DMG:', error);
    return null;
  }
}

/**
 * Normaliza payload do Cademi para evento padrão
 */
export function normalizeCademi(payload: any): EnrollmentEvent | null {
  try {
    const data = CademiWebhookSchema.parse(payload);
    
    return {
      type: 'enrollment',
      platform_enrollment_id: data.enrollment_id,
      customer: {
        email: data.student.email,
        name: data.student.name,
        phone_e164: data.student.phone,
        cpf: data.student.document,
      },
      product: {
        platform_product_id: data.course_id,
        name: data.course_name,
        list_price: data.price,
      },
      enrolled_at: data.enrolled_date,
    };
  } catch (error) {
    console.error('Erro ao normalizar Cademi:', error);
    return null;
  }
}

/**
 * Normaliza payload do Voomp para evento padrão
 */
export function normalizeVoomp(payload: any): OrderCreatedEvent | OrderPaidEvent | RefundEvent | null {
  try {
    const data = VoompWebhookSchema.parse(payload);
    
    const statusMap: Record<string, string> = {
      'approved': 'paid',
      'completed': 'paid',
      'pending': 'pending',
      'refunded': 'refunded',
      'cancelled': 'canceled',
      'failed': 'canceled',
    };
    
    const normalizedStatus = statusMap[data.sale_status.toLowerCase()] || 'pending';
    
    // Se for reembolso
    if (data.sale_status.toLowerCase() === 'refunded') {
      return {
        type: 'refund',
        platform_order_id: data.sale_id,
        refund_at: new Date().toISOString(),
        amount: data.sale_value,
        reason: 'Solicitação do cliente',
      } as RefundEvent;
    }
    
    // Se for venda aprovada
    if (['approved', 'completed'].includes(data.sale_status.toLowerCase())) {
      return {
        type: 'order_paid',
        platform_order_id: data.sale_id,
        paid_at: data.sale_date,
        amount: data.sale_value,
        payment_method: data.payment_type,
      } as OrderPaidEvent;
    }
    
    // Evento de criação de venda
    return {
      type: 'order_created',
      platform_order_id: data.sale_id,
      customer: {
        email: data.customer.email,
        name: data.customer.full_name,
        phone_e164: data.customer.phone_number,
        cpf: data.customer.cpf,
      },
      products: [{
        product: {
          platform_product_id: data.product_id,
          name: data.product_name,
          list_price: data.sale_value,
        },
        qty: 1,
        unit_price: data.sale_value,
      }],
      order_date: data.sale_date,
      gross_amount: data.sale_value,
      net_amount: data.sale_value,
      status: normalizedStatus as any,
      payment_method: data.payment_type,
    };
  } catch (error) {
    console.error('Erro ao normalizar Voomp:', error);
    return null;
  }
}

/**
 * Normaliza qualquer payload baseado na plataforma
 */
export function normalizeWebhookPayload(
  platform: 'kiwify' | 'dmg' | 'cademi' | 'voomp',
  payload: any
): any {
  switch (platform) {
    case 'kiwify':
      return normalizeKiwify(payload);
    case 'dmg':
      return normalizeDMG(payload);
    case 'cademi':
      return normalizeCademi(payload);
    case 'voomp':
      return normalizeVoomp(payload);
    default:
      throw new Error(`Plataforma não suportada: ${platform}`);
  }
}