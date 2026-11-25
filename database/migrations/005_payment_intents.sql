CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  wallet_id UUID REFERENCES wallets(id),
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SUCCEEDED','FAILED','CANCELLED')),
  provider_reference VARCHAR(150) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);