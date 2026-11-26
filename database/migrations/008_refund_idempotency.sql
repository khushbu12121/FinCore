ALTER TABLE refunds
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS
refunds_idempotency_key_unique
ON refunds (idempotency_key)
WHERE idempotency_key IS NOT NULL;