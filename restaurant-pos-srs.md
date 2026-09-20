# Restaurant POS System — Software Requirements Specification (SRS)
**Document Version:** 1.0.0  
**Status:** Approved Architecture Baseline  
**Project:** Enterprise Multi-Tenant Restaurant Operations & POS Platform  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the Enterprise Multi-Tenant Restaurant POS Platform. It defines the functional requirements (`FR-*`), non-functional requirements (`NFR-*`), and business rules (`BR-*`) governing system operation, data precision, tenant isolation, and offline resilience.

### 1.2 Scope
The platform provides end-to-end management of restaurant operations:
- Multi-channel order taking (Dine-in, Takeaway, Delivery, Online).
- Interactive visual table and floor layout management.
- Dynamic menu engineering with variants, modifiers, and recipe Bills of Materials (BOM).
- Kitchen Display System (KDS) and Kitchen Order Ticket (KOT) routing.
- Exact-money billing, multi-tender split payments, and gap-free invoicing.
- Real-time recipe-based ingredient inventory deduction and purchase order management.
- Multi-tenant SaaS architecture with multi-branch management and offline-tolerant edge operations.

### 1.3 Intended Audience
- Software Engineers, System Architects, QA Engineers, DevOps Engineers, and Product Stakeholders.

---

## 2. Overall Description

### 2.1 Product Perspective
The system operates as a modular monolith deployed in the cloud (Render/Supabase) with high-availability PostgreSQL 16, Redis, and an offline-tolerant React 18 Progressive Web Application (PWA) on Vercel. Disconnected POS terminals maintain full ordering and billing operations through a local Dexie (IndexedDB) outbox and sync deterministically upon reconnection.

### 2.2 User Classes and Roles
| Role | Code | Key Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Platform administration, tenant provisioning, system subscription, and platform-wide monitoring. |
| **Restaurant Owner** | `REST_OWNER` | Restaurant-level settings, taxes, billing policies, multi-branch oversight, and business analytics. |
| **Branch Manager** | `BRANCH_MGR` | Branch operations, branch menu pricing, local inventory, shift approvals, and cash reconciliations. |
| **Cashier** | `CASHIER` | Order billing, split payments, cash drawer handling, invoice printing, and refunds (with approval). |
| **Waiter / Server** | `WAITER` | Table assignment, order placement, course pacing, special instructions, and bill requests. |
| **Kitchen Staff** | `KITCHEN_STAFF`| KDS queue processing, bump-bar status updates, item preparation timers, and out-of-stock reporting. |
| **Inventory Manager**| `INVENTORY_MGR`| Ingredient purchasing, stock intake, supplier ledgers, stock transfers, and wastage tracking. |
| **Delivery Staff** | `DELIVERY_STAFF`| Dispatch confirmation, delivery status updates, and customer cash collection. |

---

## 3. Non-Negotiable Business Rules (`BR-*`)

### BR-MON-001: Exact Money Precision
1. Floating-point types (`FLOAT`, `DOUBLE`, `REAL`) are strictly forbidden across the codebase, schema, and API boundaries.
2. In PostgreSQL: Stored as `NUMERIC(12,2)` (or `NUMERIC(14,4)` for raw ingredient unit costs).
3. In TypeScript: Executed exclusively using `decimal.js` via the shared `@pos/domain` library.
4. Over Network APIs: Serialized strictly as decimal strings (e.g. `"1250.00"`).
5. All calculations (subtotals, discounts, taxes, service charges, tips, round-offs, splits) must produce an immutable `calc_snapshot` JSON stored directly on the invoice record.

### BR-TAX-001: Multi-Jurisdiction Tax Policy
1. The engine supports both Tax-Inclusive (e.g., GST/VAT) and Tax-Exclusive pricing at the branch and item level.
2. Multiple tax components (CGST + SGST, VAT, Municipal Tax) are calculated as pure functions with zero rounding accumulation drift.

### BR-INV-001: Gap-Free Sequential Invoicing
1. Invoices must strictly follow a continuous, monotonically increasing sequence without gaps (e.g., `INV-2026-BLR01-00001`, `00002`...).
2. PostgreSQL native sequences (`CREATE SEQUENCE`) are **strictly prohibited** for invoice numbers due to rollbacks causing sequence skips.
3. Every branch invoice sequence must increment an explicit counter row inside the finalizing database transaction under an exclusive row-level lock (`SELECT next_val FROM invoice_counters WHERE branch_id = $1 FOR UPDATE`).

### BR-INV-002: Offline Stock Reconciliation Policy
1. If two disconnected terminals sell menu items consuming the same physical ingredient while offline:
   - Both sales are accepted and synchronized to preserve customer payment and revenue integrity.
   - Ingredient deduction is recorded in the append-only `inventory_transactions` ledger.
   - If stock falls below zero, a negative ledger balance is recorded and a critical low-stock alert is raised on the Dashboard.

### BR-LED-001: Append-Only History
1. Stock ledger entries, financial audit logs, loyalty point ledgers, and finalized invoices are strictly immutable. No `UPDATE` or `DELETE` operations are permitted on ledger records.
2. Corrections to inventory must use stock adjustment or wastage entries. Corrections to invoices must issue credit notes (`credit_notes`) or reversal line items.

### BR-CONC-001: Optimistic Concurrency Control
1. Every mutable aggregate root (`Order`, `Table`, `Invoice`, `InventoryItem`) carries an integer `version` field.
2. Updates must include the expected version. Any concurrent mutation returns HTTP `409 Conflict` (`VERSION_CONFLICT`) with current aggregate state.

### BR-IDEM-001: Request Idempotency
1. Mutating endpoints (`POST /api/orders`, `POST /api/payments`, `POST /api/invoices`, etc.) require an `Idempotency-Key` HTTP header.
2. Offline-originated mutations supply client-generated UUIDv7 identifiers and an `opId` to prevent duplicate writes during network retry.

### BR-ISO-001: Strict Multi-Tenant Isolation
1. `tenant_id` must never be accepted from client request payloads. It must be derived solely from verified server-side JWT claims.
2. PostgreSQL Row-Level Security (RLS) is enabled and forced (`FORCE ROW LEVEL SECURITY`) on all tenant-owned tables.
3. Every database transaction binds `app.current_tenant_id` before querying.

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization (`FR-AUTH`)
- **FR-AUTH-001**: User login with email/password, returning short-lived JWT access tokens and secure HTTP-only refresh tokens.
- **FR-AUTH-002**: Role-Based Access Control (RBAC) with granular permissions checked server-side on every route.
- **FR-AUTH-003**: Single-use manager approval tokens (`approval_token`) required for high-risk actions: order item deletion after KOT print, bill voiding, and manual discount overrides exceeding configured thresholds.
- **FR-AUTH-004**: Session management, user deactivation, and mandatory audit logging on every authentication attempt.

### 4.2 Restaurant & Branch Setup (`FR-REST`, `FR-BRN`)
- **FR-REST-001**: Restaurant organization profile configuration: legal name, GST/Tax identification number, currency symbol, default time zone, logo, and invoice header/footer settings.
- **FR-BRN-001**: Multi-branch management: branch name, physical address, geo-coordinates, phone, assigned manager, and branch-level business hours.
- **FR-BRN-002**: Branch-level menu pricing overrides and branch-specific inventory warehouses.
- **FR-BRN-003**: Stock transfer between branches with dual-signoff workflow (`INITIATED` -> `DISPATCHED` -> `RECEIVED`).

### 4.3 Table & Floor Management (`FR-TAB`)
- **FR-TAB-001**: Interactive floor plan visualizer: multi-floor layouts, table positioning, shape, and seating capacity.
- **FR-TAB-002**: Real-time table states: `FREE`, `BUSY`, `RESERVED`, `BILLED`, and `MAINTENANCE`.
- **FR-TAB-003**: Table operations: seating guests, merging tables for large parties, transferring active orders between tables, and releasing tables upon invoice settlement.

### 4.4 Menu & Recipe Engineering (`FR-MNU`)
- **FR-MNU-001**: Hierarchical category organization (Starters, Mains, Pizza, Beverages, Desserts).
- **FR-MNU-002**: Menu item attributes: name, SKU, description, base price, tax rate category, preparation station (Kitchen vs Bar), and active status.
- **FR-MNU-003**: Item variants (e.g., Small, Medium, Large) with distinct pricing.
- **FR-MNU-004**: Modifiers and add-on groups (e.g., "Extra Cheese +₹50", "No Onions", "Gluten-Free Crust").
- **FR-MNU-005**: Recipe Bill of Materials (BOM) linking menu items and variants to specific raw ingredients and standard usage quantities (e.g., 1 Burger = 1 Bun + 150g Chicken Patty + 20g Sauce).

### 4.5 POS & Order Processing (`FR-ORD`)
- **FR-ORD-001**: Support 4 order channels: `DINE_IN`, `TAKEAWAY`, `DELIVERY`, and `ONLINE`.
- **FR-ORD-002**: Fast touchscreen order entry: search by name/SKU, category filtering, item quantity bumping, modifier selection, and customer-specific notes.
- **FR-ORD-003**: Order lifecycle state machine: `DRAFT` -> `PLACED` -> `KITCHEN_ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED` -> `BILLED` -> `CLOSED` (or `CANCELLED`).
- **FR-ORD-004**: Order holding and resuming across multiple open tickets.
- **FR-ORD-005**: Split order into separate guest checks or merge open orders.

### 4.6 Kitchen Display System (KDS) & KOT (`FR-KDS`)
- **FR-KDS-001**: Dispatch Kitchen Order Tickets (KOT) automatically upon order confirmation, grouped by kitchen preparation station (Hot Kitchen, Cold/Salad, Bakery, Bar).
- **FR-KDS-002**: Real-time KDS interface displaying tickets, elapsed preparation timers, priority tags (e.g. VIP, Rush), and individual item completion checkboxes.
- **FR-KDS-003**: Support bump-bar or touch actions: acknowledge ticket (`ACCEPTED`), begin cooking (`PREPARING`), notify waiter (`READY`), and dispatch (`SERVED`).
- **FR-KDS-004**: Audible notification on new ticket arrival and visual escalation if preparation exceeds the target SLA.

### 4.7 Billing, Invoicing & Payments (`FR-BIL`)
- **FR-BIL-001**: Generate bill preview showing itemized lines, discounts, service charges, applicable taxes, tips, and round-off adjustments.
- **FR-BIL-002**: Multi-tender split payment processing: support paying a single bill across Cash, Credit/Debit Card, UPI / QR, Mobile Wallet, and Customer Loyalty Points.
- **FR-BIL-003**: Bill split modes:
  - Equal split (divided across N patrons).
  - Itemized split (guests pay for their specific consumed items).
  - Custom amount split.
- **FR-BIL-004**: Generate gap-free, legal tax invoice upon full payment settlement, writing an immutable `calc_snapshot` and triggering thermal receipt printing.
- **FR-BIL-005**: Refund processing: full or partial refunds with mandatory manager approval token, recorded as credit notes with reversal entries.

### 4.8 Ingredient Inventory & BOM (`FR-INV`)
- **FR-INV-001**: Master ingredient registry: name, barcode, unit of measure (kg, g, L, ml, pcs), reorder threshold level, and standard cost.
- **FR-INV-002**: Automated real-time inventory depletion: when an order is settled or dispatched to kitchen, ingredient stocks decrease based on the recipe BOM.
- **FR-INV-003**: Stock intake recording from purchase orders and delivery notes with supplier invoice matching.
- **FR-INV-004**: Wastage and breakage logging with mandatory reason classification (Spoilage, Expired, Prep Error).
- **FR-INV-005**: Low-stock alert dispatch when ingredient stock drops below configured minimum thresholds.

### 4.9 Supplier Management (`FR-SUP`)
- **FR-SUP-001**: Supplier registry: company name, contact person, phone, email, GSTIN, payment terms.
- **FR-SUP-002**: Purchase Order (PO) creation, PDF generation, and goods receipt tracking (`DRAFT` -> `ISSUED` -> `PARTIALLY_RECEIVED` -> `RECEIVED`).
- **FR-SUP-003**: Supplier balance ledger and payment tracking.

### 4.10 Customer & Loyalty Management (`FR-CUST`)
- **FR-CUST-001**: Customer profile: phone number (primary key), name, email, delivery addresses, and dietary notes.
- **FR-CUST-002**: Order history, lifetime spend, average ticket size, and visit frequency tracking.
- **FR-CUST-003**: Loyalty points ledger: earn points on payments and redeem points during bill settlement.

### 4.11 Employee & Shift Management (`FR-EMP`)
- **FR-EMP-001**: Employee profile: name, assigned branch, system role, contact details, status.
- **FR-EMP-002**: Cash drawer shift management: shift start with opening float, shift end with cash count, variance calculation, and manager sign-off.

### 4.12 Reports & Analytics (`FR-REP`, `FR-DSH`)
- **FR-REP-001**: Sales reports: daily, weekly, monthly, quarterly; filterable by branch, order type, and payment mode.
- **FR-REP-002**: Menu performance reports: item velocity, sales contribution, profit margin matrix (BCG / Menu Engineering Stars and Dogs).
- **FR-REP-003**: Inventory reports: stock valuation, consumption variance vs recipe theoretical expectation, wastage analysis.
- **FR-DSH-001**: Live operational dashboard: today's revenue, open orders count, active occupied tables, pending KDS tickets, and low-stock alerts.

### 4.13 Audit Logging (`FR-AUD-001`)
- **FR-AUD-001**: System-wide immutable audit trail recording all sensitive actions: price changes, manual discounts, bill cancellations, cash drawer openings, employee role modifications, and inventory adjustments. Each entry captures: `timestamp`, `tenant_id`, `branch_id`, `user_id`, `action`, `resource_type`, `resource_id`, `old_values`, `new_values`, and `ip_address`.

---

## 5. Non-Functional Requirements

### 5.1 Performance (`NFR-PERF`)
- **NFR-PERF-001**: POS touchscreen interaction latency < 50ms for adding items and modifying cart lines.
- **NFR-PERF-002**: Server API response time < 150ms for 95th percentile under standard load.
- **NFR-PERF-003**: Database queries indexed to achieve < 30ms latency on core order and table lookups.

### 5.2 Security (`NFR-SEC`)
- **NFR-SEC-001**: Zero storage or transmission of raw payment card numbers, CVV codes, or card PINs (PCI-DSS compliance).
- **NFR-SEC-002**: Password storage using Argon2id or bcrypt with appropriate work factors.
- **NFR-SEC-003**: All network communications encrypted over TLS 1.3.
- **NFR-SEC-004**: Database connection strings, API secrets, and encryption keys stored securely in environment variables, never committed to version control.

### 5.3 Reliability & Offline Resilience (`NFR-OFFLINE`)
- **NFR-OFFLINE-001**: POS terminals must execute core workflows (create order, modify order, print KOT, generate bill, accept cash payment, print receipt) when offline.
- **NFR-OFFLINE-002**: Client uses Dexie (IndexedDB) outbox with UUIDv7 IDs. Upon reconnecting, transactions sync via idempotent replay without race conditions.

### 5.4 Maintainability & Code Quality (`NFR-MAINT`)
- **NFR-MAINT-001**: 100% TypeScript strict mode (`noImplicitAny`, `strictNullChecks`).
- **NFR-MAINT-002**: Clean modular monolith boundaries. No direct cross-module database table queries.
- **NFR-MAINT-003**: Standard RFC 9457 Problem Details for all API error responses.
