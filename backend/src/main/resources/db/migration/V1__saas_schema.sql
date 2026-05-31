-- =====================================================================
-- SaaS V1 schema migration (Postgres / Supabase)
--
-- This file is the SOURCE OF TRUTH for the database. Column names and
-- types here are derived directly from the JPA @Entity / @Column
-- declarations in src/main/java/com/studycenter/entity. Do NOT change
-- one without changing the other.
--
-- Run ONCE against a fresh database. To reset locally:
--   docker compose down -v && docker compose up -d
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- SECTION 1 - Super-admin (no tenant scope, no RLS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sysadmin_users (
    id          BIGSERIAL    PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- SECTION 2 - Tenant directory (no RLS - sysadmin path accesses this)
-- =====================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    library_name       VARCHAR(200) NOT NULL,
    owner_name         VARCHAR(200) NOT NULL,
    owner_email        VARCHAR(200) NOT NULL UNIQUE,
    owner_mobile       VARCHAR(20),
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    subscription_until DATE,
    onboarded          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_payments (
    id            BIGSERIAL     PRIMARY KEY,
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount        NUMERIC(12,2) NOT NULL,
    paid_on       DATE          NOT NULL,
    extends_to    DATE,
    payment_mode  VARCHAR(32),
    note          TEXT,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant ON tenant_payments(tenant_id);

-- =====================================================================
-- SECTION 3 - Tenant-scoped configuration tables (RLS enabled)
-- =====================================================================
CREATE TABLE tenant_settings (
    tenant_id              UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    total_seats            INT,
    operating_hours_start  TIME,
    operating_hours_end    TIME,
    has_boys_zone          BOOLEAN,
    has_girls_zone         BOOLEAN,
    has_common_zone        BOOLEAN,
    currency_symbol        VARCHAR(8),
    timezone               VARCHAR(64),
    updated_at             TIMESTAMP
);

-- Flexible seat-zone definition. One row per logical zone. Examples:
--   (BOYS_ONLY, Male, 1, 17)
--   (GIRLS_ONLY, Female, 18, 30)
--   (COMMON, NULL, 31, 65)
-- Future-proof: a library could add (PREMIUM, NULL, 60, 65) without code changes.
CREATE TABLE tenant_seat_zones (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    zone_name       VARCHAR(40)  NOT NULL,    -- BOYS_ONLY | GIRLS_ONLY | COMMON | <custom>
    allowed_gender  VARCHAR(10),              -- Male | Female | NULL = any
    start_seat      INT          NOT NULL,
    end_seat        INT          NOT NULL,
    display_order   INT          NOT NULL DEFAULT 0,
    CHECK (end_seat >= start_seat)
);
CREATE INDEX idx_seat_zones_tenant ON tenant_seat_zones(tenant_id);

-- =====================================================================
-- SECTION 4 - Tenant-scoped business tables (RLS enabled)
-- =====================================================================

-- Login users (one row per tenant owner; multiple users per tenant supported in future)
CREATE TABLE users (
    user_id     BIGSERIAL    PRIMARY KEY,
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username    VARCHAR(64)  NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(32)  NOT NULL DEFAULT 'OWNER',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
     -- Username is globally unique because it can be used as a login identifier on its own.
    CONSTRAINT uk_users_username UNIQUE (username)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Students: composite PK (tenant_id, reg_no); JPA exposes only reg_no as @Id,
-- RLS guarantees lookups never cross tenants.
CREATE TABLE students (
    tenant_id          UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reg_no             BIGINT       NOT NULL,
    name               VARCHAR(200) NOT NULL,
    father_name        VARCHAR(200),
    aadhaar_no         VARCHAR(20)  NOT NULL,
    gender             VARCHAR(10)  NOT NULL,
    address            TEXT         NOT NULL,
    mobile             VARCHAR(20)  NOT NULL,
    date_of_admission  DATE         NOT NULL,
    in_time            TIME,
    out_time           TIME,
    is_active          BOOLEAN,
    deactivation_date  DATE,
    remarks            TEXT,
    wallet_balance     NUMERIC(10,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, reg_no),
    CONSTRAINT uk_students_tenant_aadhaar UNIQUE (tenant_id, aadhaar_no)
);

-- Note: table name is "fee_structure" (singular) - matches @Table on FeeStructure.java
CREATE TABLE fee_structure (
    id          BIGSERIAL     PRIMARY KEY,
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slot_name   VARCHAR(80)   NOT NULL,
    in_time     TIME          NOT NULL,
    out_time    TIME          NOT NULL,
    fee_amount  NUMERIC(10,2) NOT NULL,
    is_active   BOOLEAN
);
CREATE INDEX idx_fee_structure_tenant ON fee_structure(tenant_id);

CREATE TABLE student_fee_config (
    config_id            BIGSERIAL     PRIMARY KEY,
    tenant_id            UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reg_no               BIGINT        NOT NULL,
    in_time              TIME          NOT NULL,
    out_time             TIME          NOT NULL,
    monthly_fee          NUMERIC(10,2) NOT NULL,
    discount_amount      NUMERIC(10,2) NOT NULL,
    admission_fee        NUMERIC(10,2) NOT NULL,
    effective_from_date  DATE          NOT NULL,
    effective_to_date    DATE,
    created_at           TIMESTAMP
);
CREATE INDEX idx_sfc_tenant_reg ON student_fee_config(tenant_id, reg_no);

CREATE TABLE fee_records (
    fee_id                  BIGSERIAL     PRIMARY KEY,
    tenant_id               UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reg_no                  BIGINT        NOT NULL,
    config_id               BIGINT,
    fee_month               INT           NOT NULL,    -- 1..12
    fee_year                INT           NOT NULL,
    in_time                 TIME          NOT NULL,
    out_time                TIME          NOT NULL,
    total_days_in_month     INT,
    applicable_days         INT,
    joining_date_in_month   DATE,
    monthly_fee             NUMERIC(10,2),
    prorated_fee            NUMERIC(10,2),
    admission_fee           NUMERIC(10,2),
    discount_amount         NUMERIC(10,2),
    final_fee               NUMERIC(10,2),
    paid_amount             NUMERIC(10,2),
    balance_amount          NUMERIC(10,2),
    payment_status          VARCHAR(20),                -- PENDING | PARTIAL | PAID
    payment_mode            VARCHAR(20),                -- CASH | ONLINE
    payment_date            DATE,
    receipt_number          VARCHAR(40),
    remarks                 TEXT,
    created_at              TIMESTAMP
);
CREATE INDEX idx_fr_tenant_month ON fee_records(tenant_id, fee_year, fee_month);
CREATE INDEX idx_fr_tenant_reg ON fee_records(tenant_id, reg_no);

CREATE TABLE fee_adjustments (
    adjustment_id    BIGSERIAL     PRIMARY KEY,
    tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fee_id           BIGINT        NOT NULL,
    reg_no           BIGINT        NOT NULL,
    adjustment_type  VARCHAR(40)   NOT NULL,
    old_values       TEXT          NOT NULL,
    new_values       TEXT          NOT NULL,
    delta_amount     NUMERIC(10,2),
    reason           TEXT,
    adjusted_by      VARCHAR(50),
    adjusted_at      TIMESTAMP     NOT NULL
);
CREATE INDEX idx_fa_tenant ON fee_adjustments(tenant_id);
CREATE INDEX idx_fa_tenant_fee ON fee_adjustments(tenant_id, fee_id);

CREATE TABLE wallet_transactions (
    tx_id            BIGSERIAL     PRIMARY KEY,
    tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reg_no           BIGINT        NOT NULL,
    tx_type          VARCHAR(40)   NOT NULL,
    amount           NUMERIC(10,2) NOT NULL,
    related_fee_id   BIGINT,
    balance_after    NUMERIC(10,2) NOT NULL,
    reason           TEXT,
    created_by       VARCHAR(50),
    created_at       TIMESTAMP     NOT NULL
);
CREATE INDEX idx_wt_tenant_reg ON wallet_transactions(tenant_id, reg_no);

CREATE TABLE payment_allocations (
    allocation_id     BIGSERIAL     PRIMARY KEY,
    tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id        VARCHAR(40)   NOT NULL,
    fee_id            BIGINT        NOT NULL,
    allocated_amount  NUMERIC(10,2) NOT NULL,
    receipt_number    VARCHAR(40),
    created_at        TIMESTAMP     NOT NULL
);
CREATE INDEX idx_pa_tenant_fee ON payment_allocations(tenant_id, fee_id);
CREATE INDEX idx_pa_tenant_payment ON payment_allocations(tenant_id, payment_id);

CREATE TABLE seat_bookings (
    booking_id     BIGSERIAL    PRIMARY KEY,
    tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    seat_no        INT          NOT NULL,
    reg_no         BIGINT       NOT NULL,
    gender         VARCHAR(10)  NOT NULL,
    start_time     TIME         NOT NULL,
    end_time       TIME         NOT NULL,
    booking_month  INT          NOT NULL,
    booking_year   INT          NOT NULL,
    booking_date   DATE
);
CREATE INDEX idx_sb_tenant_seat ON seat_bookings(tenant_id, seat_no);
CREATE INDEX idx_sb_tenant_reg ON seat_bookings(tenant_id, reg_no);

-- =====================================================================
-- SECTION 5 - Row-Level Security
--
-- Enabled on every tenant-scoped table. The Spring app sets
--   app.current_tenant = '<uuid>'
-- via TenantSessionAspect inside every @Transactional service method.
-- Postgres then filters rows automatically. No app-layer WHERE clauses
-- are needed (and forgetting one cannot cause a cross-tenant leak).
--
-- NOT enabled on: sysadmin_users, tenants, tenant_payments
--   - these are managed only via the /api/sysadmin/* path which does
--     not set the GUC. Enabling RLS would block sysadmin reads.
-- =====================================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'tenant_settings',
        'tenant_seat_zones',
        'users',
        'students',
        'fee_structure',
        'student_fee_config',
        'fee_records',
        'fee_adjustments',
        'wallet_transactions',
        'payment_allocations',
        'seat_bookings'
    ]) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_%I ON %I '
            || 'USING (tenant_id::text = current_setting(''app.current_tenant'', true)) '
            || 'WITH CHECK (tenant_id::text = current_setting(''app.current_tenant'', true))',
            t, t
        );
    END LOOP;
END$$;
