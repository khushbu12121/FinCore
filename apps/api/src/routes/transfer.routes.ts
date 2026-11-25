
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.post("/", async (req, res) => {
  const { from_wallet_id, to_wallet_id, amount, idempotency_key } = req.body;

  if (
    !from_wallet_id ||
    !to_wallet_id ||
    from_wallet_id === to_wallet_id ||
    !idempotency_key ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100
  ) {
    return res.status(400).json({ message: "Invalid transfer details" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Prevent duplicate requests
    const existing = await client.query(
      "SELECT id, status FROM transfers WHERE idempotency_key = $1",
      [idempotency_key]
    );

    if (existing.rowCount! > 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Duplicate request: existing transfer returned",
        transfer: existing.rows[0]
      });
    }

    // Lock both wallets in consistent order
    const wallets = await client.query(
      `SELECT id, currency, balance, status
       FROM wallets
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [[from_wallet_id, to_wallet_id]]
    );

    if (wallets.rowCount !== 2) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Wallet not found" });
    }

    const sender = wallets.rows.find(w => w.id === from_wallet_id);
    const receiver = wallets.rows.find(w => w.id === to_wallet_id);

    if (
      !sender || !receiver ||
      sender.status !== "ACTIVE" ||
      receiver.status !== "ACTIVE"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Wallet is not active" });
    }

    if (sender.currency !== receiver.currency) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Currency mismatch" });
    }

    if (Number(sender.balance) < amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const transferResult = await client.query(
      `INSERT INTO transfers
       (from_wallet_id, to_wallet_id, amount, currency, status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'COMPLETED', $5)
       RETURNING id, from_wallet_id, to_wallet_id, amount, currency, status`,
      [from_wallet_id, to_wallet_id, amount, sender.currency, idempotency_key]
    );

    const transfer = transferResult.rows[0];

    const accounts = await client.query(
      `SELECT id, wallet_id FROM ledger_accounts
       WHERE wallet_id = ANY($1::uuid[])`,
      [[from_wallet_id, to_wallet_id]]
    );

    const senderAccount = accounts.rows.find(a => a.wallet_id === from_wallet_id);
    const receiverAccount = accounts.rows.find(a => a.wallet_id === to_wallet_id);

    if (!senderAccount || !receiverAccount) {
      throw new Error("Ledger account missing");
    }

    const journal = await client.query(
      `INSERT INTO journal_entries (reference, description, status)
       VALUES ($1, $2, 'POSTED') RETURNING id`,
      [`TRANSFER-${transfer.id}`, "Wallet transfer"]
    );

    await client.query(
      `INSERT INTO ledger_transactions
       (journal_entry_id, account_id, entry_type, amount)
       VALUES ($1, $2, 'DEBIT', $3), ($1, $4, 'CREDIT', $3)`,
      [journal.rows[0].id, senderAccount.id, amount, receiverAccount.id]
    );

    await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE id = $2`,
      [amount, from_wallet_id]
    );

    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
      [amount, to_wallet_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Transfer completed",
      transfer
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Transfer failed:", error);

    if (error.code === "23505") {
      return res.status(409).json({ message: "Duplicate idempotency key" });
    }

    return res.status(500).json({ message: "Transfer failed" });
  } finally {
    client.release();
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, from_wallet_id, to_wallet_id,
              amount, currency, status, created_at
       FROM transfers
       ORDER BY created_at DESC`
    );

    return res.json({
      total: result.rowCount,
      transactions: result.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Could not fetch transactions"
    });
  }
});


export default router;
