
BEGIN;

DO $$
DECLARE
    c1 UUID;
    c2 UUID;
    w1 UUID;
    w2 UUID;
    a1 UUID;
    a2 UUID;
    clearing UUID;
    j1 UUID;
    j2 UUID;
    jt UUID;
    t1 UUID;
BEGIN
    -- Customers
    INSERT INTO customers (full_name, email)
    VALUES ('Aarav Sharma', 'aarav.demo@fincore.test')
    RETURNING id INTO c1;

    INSERT INTO customers (full_name, email)
    VALUES ('Riya Verma', 'riya.demo@fincore.test')
    RETURNING id INTO c2;

    -- Wallets: final balances after demo transfer
    INSERT INTO wallets (customer_id, currency, balance, status)
    VALUES (c1, 'INR', 900.00, 'ACTIVE')
    RETURNING id INTO w1;

    INSERT INTO wallets (customer_id, currency, balance, status)
    VALUES (c2, 'INR', 600.00, 'ACTIVE')
    RETURNING id INTO w2;

    -- Ledger accounts
    INSERT INTO ledger_accounts (wallet_id, account_type, currency)
    VALUES (w1, 'CUSTOMER_WALLET', 'INR')
    RETURNING id INTO a1;

    INSERT INTO ledger_accounts (wallet_id, account_type, currency)
    VALUES (w2, 'CUSTOMER_WALLET', 'INR')
    RETURNING id INTO a2;

    INSERT INTO ledger_accounts (wallet_id, account_type, currency)
    VALUES (NULL, 'CLEARING', 'INR')
    RETURNING id INTO clearing;

    -- Opening balance for Aarav: ₹1,000
    INSERT INTO journal_entries (reference, description)
    VALUES ('DEMO-OPEN-001', 'Aarav demo opening balance')
    RETURNING id INTO j1;

    INSERT INTO ledger_transactions (journal_entry_id, account_id, entry_type, amount)
    VALUES
        (j1, clearing, 'DEBIT', 1000.00),
        (j1, a1, 'CREDIT', 1000.00);

    -- Opening balance for Riya: ₹500
    INSERT INTO journal_entries (reference, description)
    VALUES ('DEMO-OPEN-002', 'Riya demo opening balance')
    RETURNING id INTO j2;

    INSERT INTO ledger_transactions (journal_entry_id, account_id, entry_type, amount)
    VALUES
        (j2, clearing, 'DEBIT', 500.00),
        (j2, a2, 'CREDIT', 500.00);

    -- Completed transfer: Aarav sends ₹100 to Riya
    INSERT INTO transfers (
        from_wallet_id, to_wallet_id, amount,
        currency, status, idempotency_key
    )
    VALUES (w1, w2, 100.00, 'INR', 'COMPLETED', 'DEMO-TRANSFER-001')
    RETURNING id INTO t1;

    INSERT INTO journal_entries (reference, description)
    VALUES ('DEMO-TRANSFER-JOURNAL-001', 'Aarav to Riya demo transfer')
    RETURNING id INTO jt;

    INSERT INTO ledger_transactions (journal_entry_id, account_id, entry_type, amount)
    VALUES
        (jt, a1, 'DEBIT', 100.00),
        (jt, a2, 'CREDIT', 100.00);

END $$;

COMMIT;
