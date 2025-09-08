-- Migração 002: Criar tabelas de fatos

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id INT REFERENCES platforms(id),
    platform_order_id TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id),
    order_date TIMESTAMPTZ,
    currency TEXT DEFAULT 'BRL',
    gross_amount NUMERIC(12,2),
    net_amount NUMERIC(12,2),
    status TEXT CHECK (status IN ('pending', 'paid', 'refunded', 'chargeback', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform_id, platform_order_id)
);

CREATE INDEX idx_orders_platform_id ON orders(platform_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(status);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty INT DEFAULT 1,
    unit_price NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    method TEXT,
    paid_at TIMESTAMPTZ,
    amount NUMERIC(12,2),
    fee NUMERIC(12,2),
    tax NUMERIC(12,2),
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- Tabela de reembolsos
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    refund_at TIMESTAMPTZ,
    amount NUMERIC(12,2),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_refund_at ON refunds(refund_at);

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id INT REFERENCES platforms(id),
    customer_id UUID REFERENCES customers(id),
    product_id UUID REFERENCES products(id),
    started_at TIMESTAMPTZ,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_product_id ON subscriptions(product_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Tabela de matrículas
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id INT REFERENCES platforms(id),
    customer_id UUID REFERENCES customers(id),
    product_id UUID REFERENCES products(id),
    enrolled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrollments_customer_id ON enrollments(customer_id);
CREATE INDEX idx_enrollments_product_id ON enrollments(product_id);