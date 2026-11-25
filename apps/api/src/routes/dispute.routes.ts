
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.post("/", async (req, res) => {
  const { transfer_id, customer_id, reason } = req.body;

  if (!transfer_id || !customer_id || !reason?.trim()) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const transfer = await pool.query(
      `SELECT id FROM transfers
       WHERE id = $1 AND
       (from_wallet_id IN (SELECT id FROM wallets WHERE customer_id = $2)
       OR to_wallet_id IN (SELECT id FROM wallets WHERE customer_id = $2))`,
      [transfer_id, customer_id]
    );

    if (transfer.rowCount === 0) {
      return res.status(404).json({ message: "Customer transfer not found" });
    }

    const result = await pool.query(
      `INSERT INTO disputes (transfer_id, customer_id, reason)
       VALUES ($1, $2, $3) RETURNING *`,
      [transfer_id, customer_id, reason.trim()]
    );

    return res.status(201).json({
      message: "Dispute submitted successfully",
      dispute: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Dispute submission failed" });
  }
});

router.get("/", async (_req, res) => {
  const result = await pool.query(
    "SELECT * FROM disputes ORDER BY created_at DESC"
  );
  return res.json({ disputes: result.rows });
});

export default router;
