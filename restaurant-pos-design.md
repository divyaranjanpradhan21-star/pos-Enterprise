# Restaurant POS System — System Design & Architecture (Design Document)
**Document Version:** 1.0.0  
**Status:** Approved Architecture Baseline  
**Project:** Enterprise Multi-Tenant Restaurant Operations & POS Platform  

---

## 1. System Overview & Architectural Style

The Restaurant POS platform is designed as an enterprise-grade **Modular Monolith** engineered for high throughput, data integrity, and offline tolerance.

```
                    ┌──────────────────────────────────────────────┐
                    │               Web / Tablet PWA               │
                    │      React 18 + TS + Vite + Tailwind CSS     │
                    │        (TanStack Query + Zustand)            │
                    │      [Dexie.js IndexedDB Outbox Queue]       │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTPS / TLS 1.3
                                           │ RFC 9457 REST + Idempotency-Key
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             NestJS Modular Monolith                              │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ Core Infrastructure: JWT Auth Guard, RLS Session Binder, Idempotency       │  │
│  │ Interceptor, Optimistic Lock Interceptor, RFC 9457 Problem Details Filter   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌──────────────┐   │
│   │  AuthModule   │   │  OrderModule  │   │ BillingModule │   │ KitchenModule│   │
│   └───────────────┘   └───────────────┘   └───────────────┘   └──────────────┘   │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌──────────────┐   │
│   │ CatalogModule │   │ TableModule   │   │InventoryModule│   │ AuditModule  │   │
│   └───────────────┘   └───────────────┘   └───────────────┘   └──────────────┘   │
│                                           │                                      │
│                                           ▼                                      │
│                            ┌─────────────────────────────┐                       │
│                            │    Transactional Outbox     │                       │
│                            └──────────────┬──────────────┘                       │
└───────────────────────────────────────────┼──────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Supabase PostgreSQL 16  │                 │        Redis Cache        │
       │   - RLS Forced Isolation  │                 │    & BullMQ Event Queue   │
       │   - NUMERIC(12,2) Money   │                 └───────────────────────────┘
       │   - Row-Lock Gap-Free Inv │
       └───────────────────────────┘
```

---

## 2. Module Boundaries & Communication Rules

1. **Strict Modular Boundaries**: Modules interact only through exported public service interfaces or the Transactional Outbox. Direct foreign module table queries or imports of another module's internal repositories are prohibited.
2. **Domain Isolation**: Core calculation logic lives exclusively in `@pos/domain` with zero framework dependencies (`decimal.js` only).
3. **Eventual Consistency**: Cross-module side effects (e.g. Order Placed -> KDS Ticket Created -> Inventory BOM Deducted) are guaranteed via the Transactional Outbox.

---

## 3. Database Schema (Supabase PostgreSQL 16 DDL)

### 3.1 Multi-Tenancy & Access Control
```sql
-- Tenants & Branches
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    tax_identifier VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_code UNIQUE (tenant_id, code)
);

-- Users & RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_email UNIQUE (tenant_id, email)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    CONSTRAINT uq_role_code UNIQUE (tenant_id, code)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
```

### 3.2 Tables & Floor Layout
```sql
CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(50) NOT NULL DEFAULT 'FREE', -- FREE, BUSY, RESERVED, BILLED
    current_order_id UUID,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_table_number UNIQUE (tenant_id, branch_id, table_number)
);
```

### 3.3 Menu, Variants, Modifiers & Recipes
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE menu_items (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Small, Medium, Large
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- Ingredients & Recipes
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- kg, g, l, ml, pcs
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 10.00,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cost_per_unit NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    version INT NOT NULL DEFAULT 1
);

CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES menu_variants(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(12,4) NOT NULL
);
```

### 3.4 Orders, KDS, Invoices & Payments
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY, -- Client-generated UUIDv7
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_type VARCHAR(50) NOT NULL, -- DINE_IN, TAKEAWAY, DELIVERY, ONLINE
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
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

CREATE TABLE kitchen_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kot_number VARCHAR(50) NOT NULL,
    station VARCHAR(50) NOT NULL DEFAULT 'KITCHEN',
    status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- NEW, ACCEPTED, PREPARING, READY, SERVED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gap-Free Invoice Counter Table
CREATE TABLE invoice_counters (
    branch_id UUID PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year INT NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    current_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
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
    status VARCHAR(50) NOT NULL DEFAULT 'ISSUED', -- ISSUED, VOIDED, REFUNDED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_number UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) NOT NULL, -- CASH, CARD, UPI, WALLET
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    reference_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.5 Ledgers, Outbox & Audit Logs
```sql
-- Append-Only Inventory Ledger
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_delta NUMERIC(12,4) NOT NULL,
    balance_after NUMERIC(12,4) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- ORDER_CONSUMPTION, PURCHASE, ADJUSTMENT, WASTAGE
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactional Outbox
CREATE TABLE transactional_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Immutable Audit Log (FR-AUD-001)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.6 Row-Level Security (RLS) Policy Definition
```sql
-- Enable and force RLS on all tenant-bound tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Apply isolation policy
CREATE POLICY tenant_isolation_policy ON orders
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## 4. Gap-Free Invoice Number Generation Procedure

To guarantee `BR-INV-001` without sequence skips:
```sql
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
    -- Acquire exclusive row lock on the branch counter row
    SELECT prefix, current_number + 1 INTO v_prefix, v_next_val
    FROM invoice_counters
    WHERE branch_id = p_branch_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Initialize counter if first invoice
        v_prefix := 'INV';
        v_next_val := 1;
        INSERT INTO invoice_counters (branch_id, tenant_id, year, prefix, current_number)
        VALUES (p_branch_id, p_tenant_id, v_year, v_prefix, 1);
    ELSE
        UPDATE invoice_counters
        SET current_number = v_next_val, updated_at = NOW()
        WHERE branch_id = p_branch_id AND tenant_id = p_tenant_id;
    END IF;

    -- Format: INV-YYYY-BRANCH-00001
    v_formatted_no := v_prefix || '-' || v_year::TEXT || '-' || LPAD(v_next_val::TEXT, 5, '0');
    RETURN v_formatted_no;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Pure Domain Engine (`@pos/domain`) Design

All calculations are encapsulated in `packages/domain/src/`:
- `Money`: Wrapped `Decimal` with `.plus()`, `.minus()`, `.times()`, `.toMoneyString()`.
- `TaxEngine`: Evaluates line-item and order-level taxes with support for `tax_inclusive` and `tax_exclusive`.
- `BillingEngine`:
  - `calculateOrder(items, discounts, serviceChargeRate, tip)`: Produces immutable `calc_snapshot`.
  - `splitBill(total, splitType, shares)`: Guarantees `sum(splits) == total`.

---

## 6. Offline Synchronization Protocol

1. **Client Persistence**: React PWA stores pending orders and payments in Dexie (IndexedDB) with status `SYNC_PENDING`.
2. **UUIDv7 Client IDs**: Orders are minted with client UUIDv7 (timestamp-ordered, collision-free).
3. **Idempotency Replay**:
   - Every sync mutation sends `Idempotency-Key: <order_id>:<operation_counter>`.
   - The backend checks `opId` deduplication table. If already committed, returns cached result.
4. **Reconciliation**:
   - Order items insert succeeds.
   - Ingredients deduct from `inventory_transactions`. If insufficient, negative entry is logged and an alert is broadcast.

---

## 7. API Specification & Error Handling (RFC 9457)

All non-2xx responses return `application/problem+json`:
```json
{
  "type": "https://api.pos-enterprise.com/errors/version-conflict",
  "title": "Version Conflict",
  "status": 409,
  "detail": "Order aggregate version mismatch. Expected version 3, current version is 4.",
  "code": "VERSION_CONFLICT",
  "instance": "/api/orders/018e6a12-70b1-7a8f-8f81-cb7f017830b1"
}
```

### Stable Error Codes:
- `UNAUTHORIZED`: Invalid or missing credentials.
- `FORBIDDEN`: Insufficient role permissions.
- `APPROVAL_REQUIRED`: Manager approval token missing or expired.
- `VERSION_CONFLICT`: Optimistic lock concurrency failure.
- `IDEMPOTENCY_CONFLICT`: Concurrent mutation with identical idempotency key in-flight.
- `INSUFFICIENT_STOCK`: High-severity stock lock failure in strict mode.
- `INVALID_PAYMENT_SPLIT`: Split tender amounts do not match invoice total.

---

## 8. Deployment Topology

- **Frontend (Vercel)**: Static Single-Page Application (PWA) with Service Worker and Workbox caching.
- **Backend (Render)**: Docker container running NestJS in clustered mode with connection pooling.
- **Database (Supabase)**: Managed PostgreSQL 16 with Row-Level Security and SSL connection.
- **Repository**: Hosted at `https://github.com/divyaranjanpradhan21-star/pos-Enterprise.git`.
