import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Schemas genéricos de eventos normalizados
export const CustomerSchema = z.object({
  email: z.string().email().optional(),
  phone_e164: z.string().optional(),
  cpf: z.string().optional(),
  name: z.string().optional(),
});

export const ProductSchema = z.object({
  platform_product_id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  is_subscription: z.boolean().default(false),
  list_price: z.number(),
});

export const OrderCreatedEventSchema = z.object({
  type: z.literal('order_created'),
  platform_order_id: z.string(),
  customer: CustomerSchema,
  products: z.array(z.object({
    product: ProductSchema,
    qty: z.number().int().positive(),
    unit_price: z.number(),
  })),
  order_date: z.string().datetime(),
  gross_amount: z.number(),
  net_amount: z.number(),
  currency: z.string().default('BRL'),
  status: z.enum(['pending', 'paid', 'refunded', 'chargeback', 'canceled']),
  payment_method: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
});

export const OrderPaidEventSchema = z.object({
  type: z.literal('order_paid'),
  platform_order_id: z.string(),
  paid_at: z.string().datetime(),
  amount: z.number(),
  fee: z.number().optional(),
  tax: z.number().optional(),
  payment_method: z.string().optional(),
});

export const RefundEventSchema = z.object({
  type: z.literal('refund'),
  platform_order_id: z.string(),
  refund_at: z.string().datetime(),
  amount: z.number(),
  reason: z.string().optional(),
});

export const ChargebackEventSchema = z.object({
  type: z.literal('chargeback'),
  platform_order_id: z.string(),
  chargeback_at: z.string().datetime(),
  amount: z.number(),
  reason: z.string().optional(),
});

export const SubscriptionRenewedEventSchema = z.object({
  type: z.literal('subscription_renewed'),
  platform_subscription_id: z.string(),
  customer: CustomerSchema,
  product: ProductSchema,
  renewed_at: z.string().datetime(),
  amount: z.number(),
  period_end: z.string().datetime(),
  status: z.string(),
});

export const EnrollmentEventSchema = z.object({
  type: z.literal('enrollment'),
  platform_enrollment_id: z.string(),
  customer: CustomerSchema,
  product: ProductSchema,
  enrolled_at: z.string().datetime(),
});

// Schemas de payloads das plataformas (exemplos)

// Kiwify Webhook Schema (formato real)
export const KiwifyWebhookSchema = z.object({
  order_id: z.string(),
  order_status: z.string(),
  webhook_event_type: z.string(),
  Product: z.object({
    product_id: z.string(),
    product_name: z.string(),
  }),
  Customer: z.object({
    email: z.string().email(),
    full_name: z.string(),
    first_name: z.string().optional(),
    mobile: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    cnpj: z.string().optional(),
  }),
  Commissions: z.object({
    product_base_price: z.number(),
    settlement_amount: z.number(),
    currency: z.string().default('BRL'),
  }),
  payment_method: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  approved_date: z.string().optional(),
  TrackingParameters: z.object({
    utm_source: z.string().nullish(),
    utm_medium: z.string().nullish(),
    utm_campaign: z.string().nullish(),
    utm_content: z.string().nullish(),
    utm_term: z.string().nullish(),
  }).optional(),
  Subscription: z.object({
    id: z.string(),
    status: z.string(),
  }).optional(),
});

// Digital Manager Guru Schema
export const DMGWebhookSchema = z.object({
  transaction_id: z.string(),
  status: z.string(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  }),
  buyer: z.object({
    email: z.string().email(),
    name: z.string(),
    phone: z.string().optional(),
    cpf: z.string().optional(),
  }),
  payment: z.object({
    method: z.string(),
    amount: z.number(),
    fee: z.number(),
    date: z.string(),
  }),
  tracking: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
  }).optional(),
});

// Cademi Schema
export const CademiWebhookSchema = z.object({
  enrollment_id: z.string(),
  course_id: z.string(),
  course_name: z.string(),
  student: z.object({
    email: z.string().email(),
    name: z.string(),
    phone: z.string().optional(),
    document: z.string().optional(),
  }),
  enrolled_date: z.string(),
  price: z.number(),
  status: z.string(),
});

// Voomp Schema
export const VoompWebhookSchema = z.object({
  sale_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  customer: z.object({
    email: z.string().email(),
    full_name: z.string(),
    phone_number: z.string().optional(),
    cpf: z.string().optional(),
  }),
  sale_value: z.number(),
  sale_date: z.string(),
  payment_type: z.string(),
  sale_status: z.string(),
  affiliates: z.array(z.object({
    affiliate_id: z.string(),
    commission: z.number(),
  })).optional(),
});

// Schema para pixel
export const PixelPayloadSchema = z.object({
  visitor_id: z.string(),
  email: z.string().email().optional(),
  cpf: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  fbclid: z.string().optional(),
  gclid: z.string().optional(),
  landing_page: z.string().optional(),
  timestamp: z.string().datetime(),
});

// Schema para Meta Ads Insights
export const MetaInsightSchema = z.object({
  date_start: z.string(),
  date_stop: z.string(),
  account_id: z.string(),
  campaign_id: z.string().optional(),
  adset_id: z.string().optional(),
  ad_id: z.string().optional(),
  spend: z.string(),
  impressions: z.string(),
  clicks: z.string(),
  actions: z.array(z.object({
    action_type: z.string(),
    value: z.string(),
  })).optional(),
});

export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;
export type OrderPaidEvent = z.infer<typeof OrderPaidEventSchema>;
export type RefundEvent = z.infer<typeof RefundEventSchema>;
export type ChargebackEvent = z.infer<typeof ChargebackEventSchema>;
export type SubscriptionRenewedEvent = z.infer<typeof SubscriptionRenewedEventSchema>;
export type EnrollmentEvent = z.infer<typeof EnrollmentEventSchema>;