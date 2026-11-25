CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger records are immutable. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_journal_update ON journal_entries;
CREATE TRIGGER prevent_journal_update
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS prevent_transaction_update ON ledger_transactions;
CREATE TRIGGER prevent_transaction_update
BEFORE UPDATE OR DELETE ON ledger_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();