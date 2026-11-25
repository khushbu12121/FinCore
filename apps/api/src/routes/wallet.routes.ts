
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// Create a wallet for an existing customer
router.post("/", async (req, res) => {
  const { customer_id, currency = "INR" } = req.body;

  if (!customer_id || !/^[A-Z]{3}$/.test(currency)) {
    return res.status(400).json({
      message: "Valid customer_id and 3-letter currency are required"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const customer = await client.query(
      "SELECT id FROM customers WHERE id = $1 AND status = 'ACTIVE'",
      [customer_id]
    );

    if (customer.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Active customer not found"
      });
    }

    const walletResult = await client.query(
      `INSERT INTO wallets (customer_id, currency)
       VALUES ($1, $2)
       RETURNING id, customer_id, currency, balance, status, created_at`,
      [customer_id, currency]
    );

    const wallet = walletResult.rows[0];

    await client.query(
      `INSERT INTO ledger_accounts (wallet_id, account_type, currency)
       VALUES ($1, 'CUSTOMER_WALLET', $2)`,
      [wallet.id, currency]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Wallet created successfully",
      wallet
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Wallet creation failed:", error);

    return res.status(500).json({
      message: "Could not create wallet"
    });
  } finally {
    client.release();
  }
});

// Get all wallets

router.post("/:id/deposit", async (req, res) => {
  const { amount, idempotency_key } = req.body;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100 ||
    typeof idempotency_key !== "string" ||
    !idempotency_key.trim()
  ) {
    return res.status(400).json({ message: "Invalid deposit details" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reference = `DEPOSIT-${idempotency_key}`;

    const duplicate = await client.query(
      "SELECT id FROM journal_entries WHERE reference = $1",
      [reference]
    );

    if (duplicate.rowCount! > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Duplicate deposit request" });
    }

    const walletResult = await client.query(
      "SELECT id, currency, status FROM wallets WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );

    if (walletResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Wallet not found" });
    }

    const wallet = walletResult.rows[0];

    if (wallet.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Wallet is not active" });
    }

    const walletAccount = await client.query(
      "SELECT id FROM ledger_accounts WHERE wallet_id = $1",
      [wallet.id]
    );

    if (walletAccount.rowCount === 0) {
      throw new Error("Wallet ledger account not found");
    }

    let clearing = await client.query(
      `SELECT id FROM ledger_accounts
       WHERE account_type = 'PLATFORM_CLEARING' AND currency = $1
       LIMIT 1`,
      [wallet.currency]
    );

    if (clearing.rowCount === 0) {
      clearing = await client.query(
        `INSERT INTO ledger_accounts (account_type, currency)
         VALUES ('PLATFORM_CLEARING', $1) RETURNING id`,
        [wallet.currency]
      );
    }

    const journal = await client.query(
      `INSERT INTO journal_entries (reference, description, status)
       VALUES ($1, 'Test-mode wallet deposit', 'POSTED')
       RETURNING id`,
      [reference]
    );

    await client.query(
      `INSERT INTO ledger_transactions
       (journal_entry_id, account_id, entry_type, amount)
       VALUES ($1, $2, 'DEBIT', $3), ($1, $4, 'CREDIT', $3)`,
      [journal.rows[0].id, clearing.rows[0].id, amount,
       walletAccount.rows[0].id]
    );

    const updated = await client.query(
      `UPDATE wallets SET balance = balance + $1
       WHERE id = $2
       RETURNING id, balance, currency`,
      [amount, wallet.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Test-mode deposit successful",
      wallet: updated.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ message: "Deposit failed" });
  } finally {
    client.release();
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.customer_id, c.full_name,
              w.currency, w.balance, w.status, w.created_at
       FROM wallets w
       JOIN customers c ON c.id = w.customer_id
       ORDER BY w.created_at DESC`
    );

    return res.json({ wallets: result.rows });
  } catch (error) {
    console.error("Wallet fetch failed:", error);
    return res.status(500).json({
      message: "Could not fetch wallets"
    });
  }
});

export default router;
