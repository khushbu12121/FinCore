CREATE TABLE IF NOT EXISTS provider_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_reference VARCHAR(150) NOT NULL,
  settlement_amount NUMERIC(20,2) NOT NULL CHECK (settlement_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  settlement_date DATE NOT NULL,
  reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (reconciliation_status IN ('PENDING', 'MATCHED', 'MISMATCH', 'UNMATCHED')),
  discrepancy NUMERIC(20,2),
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_reference, settlement_date)
);

CREATE INDEX IF NOT EXISTS idx_provider_settlements_status
  ON provider_settlements(reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_provider_settlements_date
  ON provider_settlements(settlement_date);
