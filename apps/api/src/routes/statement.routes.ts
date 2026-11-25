
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.get("/:walletId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         j.reference,
         j.description,
         l.entry_type,
         l.amount,
         j.created_at,
         SUM(
           CASE
             WHEN l.entry_type = 'CREDIT' THEN l.amount
             ELSE -l.amount
           END
         ) OVER (
           ORDER BY j.created_at, l.id
         ) AS running_balance
       FROM ledger_transactions l
       JOIN journal_entries j ON j.id = l.journal_entry_id
       JOIN ledger_accounts a ON a.id = l.account_id
       WHERE a.wallet_id = $1
       ORDER BY j.created_at, l.id`,
      [req.params.walletId]
    );

    return res.json({
      walletId: req.params.walletId,
      totalTransactions: result.rowCount,
      statement: result.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Could not generate statement"
    });
  }
});

export default router;
