
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.post("/", async (req, res) => {
  const { transfer_id, amount, reason } = req.body;

  if (
    !transfer_id ||
    typeof reason !== "string" ||
    !reason.trim() ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100
  ) {
    return res.status(400).json({ message: "Invalid refund details" });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // Lock original transfer
    const transferResult = await client.query(
      `SELECT * FROM transfers
       WHERE id = $1
       FOR UPDATE`,
      [transfer_id]
    );

    if (
      transferResult.rowCount === 0 ||
      transferResult.rows[0].status !== "COMPLETED"
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({
        message: "Completed transfer not found"
      });
    }

    const transfer = transferResult.rows[0];

    // Calculate remaining refundable amount
    const refundTotal = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM refunds
       WHERE transfer_id = $1
       AND status = 'COMPLETED'`,
      [transfer_id]
    );

    const remainingCents =
      Math.round(Number(transfer.amount) * 100) -
      Math.round(Number(refundTotal.rows[0].total) * 100);

    const refundCents = Math.round(amount * 100);

    if (refundCents > remainingCents) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({
        message: "Refund exceeds remaining amount"
      });
    }

    // Lock both wallets in consistent order
    const walletResult = await client.query(
      `SELECT id, balance, status
       FROM wallets
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [[transfer.from_wallet_id, transfer.to_wallet_id]]
    );

    if (walletResult.rowCount !== 2) {
      throw new Error("Transfer wallet not found");
    }

    const sender = walletResult.rows.find(
      (w) => w.id === transfer.from_wallet_id
    );

    const receiver = walletResult.rows.find(
      (w) => w.id === transfer.to_wallet_id
    );

    if (!sender || !receiver) {
      throw new Error("Wallet details unavailable");
    }

    // Recipient must still have enough funds to refund
    if (Math.round(Number(receiver.balance) * 100) < refundCents) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({
        message: "Recipient wallet has insufficient balance for refund"
      });
    }

    // Find both ledger accounts
    const accountResult = await client.query(
      `SELECT id, wallet_id
       FROM ledger_accounts
       WHERE wallet_id = ANY($1::uuid[])`,
      [[transfer.from_wallet_id, transfer.to_wallet_id]]
    );

    const senderAccount = accountResult.rows.find(
      (a) => a.wallet_id === transfer.from_wallet_id
    );

    const receiverAccount = accountResult.rows.find(
      (a) => a.wallet_id === transfer.to_wallet_id
    );

    if (!senderAccount || !receiverAccount) {
      throw new Error("Ledger account missing");
    }

    // Create refund record
    const refundResult = await client.query(
      `INSERT INTO refunds
       (transfer_id, amount, reason, status)
       VALUES ($1, $2, $3, 'COMPLETED')
       RETURNING *`,
      [transfer_id, amount, reason.trim()]
    );

    const refund = refundResult.rows[0];

    // Create reversal journal
    const journalResult = await client.query(
      `INSERT INTO journal_entries
       (reference, description, status)
       VALUES ($1, $2, 'POSTED')
       RETURNING id`,
      [
        `REFUND-${refund.id}`,
        `Refund reversal for transfer ${transfer_id}`
      ]
    );

    // Reverse the original ledger entries:
    // Debit recipient, credit original sender
    await client.query(
      `INSERT INTO ledger_transactions
       (journal_entry_id, account_id, entry_type, amount)
       VALUES
       ($1, $2, 'DEBIT', $3),
       ($1, $4, 'CREDIT', $3)`,
      [
        journalResult.rows[0].id,
        receiverAccount.id,
        amount,
        senderAccount.id
      ]
    );

    // Reverse wallet balances
    await client.query(
      `UPDATE wallets
       SET balance = balance - $1
       WHERE id = $2`,
      [amount, transfer.to_wallet_id]
    );

    await client.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE id = $2`,
      [amount, transfer.from_wallet_id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Refund completed and balances reversed",
      refund,
      ledger: {
        debit: receiverAccount.id,
        credit: senderAccount.id
      }
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Refund failed:", error);

    return res.status(500).json({
      message: "Refund failed"
    });
  } finally {
    client.release();
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM refunds ORDER BY created_at DESC`
    );

    return res.json({ refunds: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Could not fetch refunds"
    });
  }
});

export default router;
