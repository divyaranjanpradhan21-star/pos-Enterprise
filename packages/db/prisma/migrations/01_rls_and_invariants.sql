-- ============================================================================
-- Enterprise Multi-Tenant POS Platform: PostgreSQL 16 RLS & Integrity Rules
-- ============================================================================

-- 1. Enable and FORCE Row-Level Security on all tenant-owned tables
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

ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE branches FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE floors FORCE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables FORCE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
ALTER TABLE menu_items FORCE ROW LEVEL SECURITY;
ALTER TABLE modifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE ingredients FORCE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE kitchen_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_counters FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE transactional_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policies via session variable 'app.current_tenant_id'
CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL
    USING (id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_branches ON branches
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_tables ON restaurant_tables
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_menu_items ON menu_items
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ingredients ON ingredients
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_orders ON orders
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_kitchen_orders ON kitchen_orders
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_payments ON payments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_inventory_tx ON inventory_transactions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- 3. Append-Only Trigger Enforcing BR-LED-001 (No UPDATE or DELETE on ledgers)
CREATE OR REPLACE FUNCTION prevent_modification_on_append_only_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are strictly append-only. UPDATE or DELETE operations are forbidden by rule BR-LED-001.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_inventory_transactions
    BEFORE UPDATE OR DELETE ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification_on_append_only_ledger();

CREATE TRIGGER trg_immutable_audit_logs
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_modification_on_append_only_ledger();

-- 4. Gap-Free Invoice Generation Stored Procedure (BR-INV-001)
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
