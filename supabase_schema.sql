-- ============================================================================
-- Enterprise Multi-Tenant Restaurant POS Platform: Supabase PostgreSQL 16 DDL
-- Paste and Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/hploabbozxurvwxhurtj/sql)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------
-- 1. Tenancy & Organization
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    tax_identifier VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_code UNIQUE (tenant_id, code)
);

-- ---------------------------------------------------------
-- 2. Identity & Access Management (RBAC)
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_email UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    CONSTRAINT uq_role_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------
-- 3. Floor & Table Management
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(50) NOT NULL DEFAULT 'FREE',
    current_order_id UUID,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_table_number UNIQUE (tenant_id, branch_id, table_number)
);

-- ---------------------------------------------------------
-- 4. Menu, Modifiers, Ingredients & Recipes
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    base_price NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    station VARCHAR(50) NOT NULL DEFAULT 'KITCHEN',
    is_available BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 10.00,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cost_per_unit NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES menu_variants(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(12,4) NOT NULL
);

-- ---------------------------------------------------------
-- 5. Orders, KOT/KDS, Billing & Invoicing
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_type VARCHAR(50) NOT NULL,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    service_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tip_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    variant_id UUID REFERENCES menu_variants(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS kitchen_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kot_number VARCHAR(50) NOT NULL,
    station VARCHAR(50) NOT NULL DEFAULT 'KITCHEN',
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kitchen_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kitchen_order_id UUID NOT NULL REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS invoice_counters (
    branch_id UUID PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year INT NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
    current_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    calc_snapshot JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ISSUED',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_number UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    reference_number VARCHAR(100),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 6. Append-Only Ledgers, Outbox & Audit
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_delta NUMERIC(12,4) NOT NULL,
    balance_after NUMERIC(12,4) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactional_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 7. Row-Level Security Policies
-- ---------------------------------------------------------

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactional_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic Tenant Isolation Policy Function
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create Policies (or replace)
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants FOR ALL USING (id = current_tenant_id() OR current_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_isolation_branches ON branches;
CREATE POLICY tenant_isolation_branches ON branches FOR ALL USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users FOR ALL USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_isolation_tables ON restaurant_tables;
CREATE POLICY tenant_isolation_tables ON restaurant_tables FOR ALL USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
CREATE POLICY tenant_isolation_orders ON orders FOR ALL USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices FOR ALL USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);

DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
CREATE POLICY tenant_isolation_payments ON payments FOR ALL USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);

-- ---------------------------------------------------------
-- 8. Append-Only Triggers & Gap-Free Invoice Generator
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_modification_on_append_only_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are strictly append-only. UPDATE or DELETE operations are forbidden by rule BR-LED-001.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_inventory_transactions ON inventory_transactions;
CREATE TRIGGER trg_immutable_inventory_transactions
    BEFORE UPDATE OR DELETE ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification_on_append_only_ledger();

DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON audit_logs;
CREATE TRIGGER trg_immutable_audit_logs
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification_on_append_only_ledger();

-- Gap-Free Invoice Number Procedure
CREATE OR REPLACE FUNCTION generate_gap_free_invoice_number(
    p_tenant_id UUID,
    p_branch_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    v_next_val BIGINT;
    v_formatted_no TEXT;
BEGIN
    SELECT prefix, current_number + 1 INTO v_prefix, v_next_val
    FROM invoice_counters
    WHERE branch_id = p_branch_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        v_prefix := 'INV';
        v_next_val := 1;
        INSERT INTO invoice_counters (branch_id, tenant_id, year, prefix, current_number)
        VALUES (p_branch_id, p_tenant_id, v_year, v_prefix, 1);
    ELSE
        UPDATE invoice_counters
        SET current_number = v_next_val, updated_at = NOW()
        WHERE branch_id = p_branch_id AND tenant_id = p_tenant_id;
    END IF;

    v_formatted_no := v_prefix || '-' || v_year::TEXT || '-' || LPAD(v_next_val::TEXT, 5, '0');
    RETURN v_formatted_no;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- 9. Initial Seed Data (Demo Tenant, Branch & Permissions)
-- ---------------------------------------------------------

INSERT INTO tenants (id, name, slug, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Enterprise Restaurant', 'demo-restro', 'INR')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO branches (id, tenant_id, name, code, address, phone)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Branch', 'BR001', '123 Tech Park, MG Road', '+91 9876543210')
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO permissions (id, code, name, module) VALUES
(gen_random_uuid(), 'POS_CREATE_ORDER', 'Create Order', 'POS'),
(gen_random_uuid(), 'POS_SETTLE_BILL', 'Settle Bill', 'BILLING'),
(gen_random_uuid(), 'KDS_VIEW', 'View KDS', 'KITCHEN'),
(gen_random_uuid(), 'INV_MANAGE', 'Manage Inventory', 'INVENTORY')
ON CONFLICT (code) DO NOTHING;
