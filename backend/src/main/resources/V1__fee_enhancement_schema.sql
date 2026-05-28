-- ─── Wallet balance on students (single source of truth) ───
ALTER TABLE students ADD COLUMN wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- ─── Audit log for every fee adjustment ───
CREATE TABLE fee_adjustments (
    adjustment_id    BIGSERIAL PRIMARY KEY,
    fee_id           BIGINT NOT NULL,
    reg_no           BIGINT NOT NULL,
    adjustment_type  VARCHAR(40) NOT NULL,
    old_values       TEXT NOT NULL,
    new_values       TEXT NOT NULL,
    delta_amount     DECIMAL(10,2),
    reason           TEXT,
    adjusted_by      VARCHAR(50),
    adjusted_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fee_adj_fee ON fee_adjustments(fee_id);
CREATE INDEX idx_fee_adj_reg ON fee_adjustments(reg_no);

-- ─── Wallet ledger (every credit/debit) ───
CREATE TABLE wallet_transactions (
    tx_id            BIGSERIAL PRIMARY KEY,
    reg_no           BIGINT NOT NULL,
    tx_type          VARCHAR(40) NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    related_fee_id   BIGINT,
    balance_after    DECIMAL(10,2) NOT NULL,
    reason           TEXT,
    created_by       VARCHAR(50),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_wallet_tx_reg ON wallet_transactions(reg_no);

-- ─── Payment allocations (links one payment to N fee_records) ───
CREATE TABLE payment_allocations (
    allocation_id    BIGSERIAL PRIMARY KEY,
    payment_id       VARCHAR(40) NOT NULL,
    fee_id           BIGINT NOT NULL,
    allocated_amount DECIMAL(10,2) NOT NULL,
    receipt_number   VARCHAR(40),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_alloc_fee     ON payment_allocations(fee_id);
