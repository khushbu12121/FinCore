import { Router } from "express";
import { pool } from "../config/database";
import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken, authorizeRoles("ADMIN"));

function validAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    Math.round(value * 100) === value * 100
  );
}

function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

// Submit and reconcile a provider settlement record
router.post("/reconcile", async (req, res) => {
  const {
    provider_reference,
    settlement_amount,
    currency = "INR",
    settlement_date
  } = req.body;

  if (
    typeof provider_reference !== "string" ||
    !provider_reference.trim() ||
    provider_reference.length > 150 ||
    !validAmount(settlement_amount) ||
    typeof currency !== "string" ||
    !/^[A-Z]{3}$/.test(currency) ||
    !validDate(settlement_date)
  ) {
    return res.status(400).json({
      message: "Invalid settlement details"
    });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const inserted = await client.query(
      `INSERT INTO provider_settlements
       (provider_reference, settlement_amount, currency, settlement_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider_reference, settlement_date)
       DO NOTHING
       RETURNING id`,
      [
        provider_reference.trim(),
        settlement_amount,
        currency,
        settlement_date
      ]
    );

    if (inserted.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        message: "Settlement record already exists"
      });
    }

    const payment = await client.query(
      `SELECT id, amount, currency, status
       FROM payment_intents
       WHERE provider_reference = $1
       FOR UPDATE`,
      [provider_reference.trim()]
    );

    let reconciliationStatus: string;
    let discrepancy: string | null = null;

    if (payment.rowCount === 0) {
      reconciliationStatus = "UNMATCHED";
    } else {
      const paymentRecord = payment.rows[0];

      const paymentAmount = Number(paymentRecord.amount);
      const amountMatches =
        Math.round(paymentAmount * 100) ===
        Math.round(settlement_amount * 100);

      const currencyMatches =
        paymentRecord.currency.trim() === currency;

      if (
        paymentRecord.status === "SUCCEEDED" &&
        amountMatches &&
        currencyMatches
      ) {
        reconciliationStatus = "MATCHED";
        discrepancy = "0.00";
      } else {
        reconciliationStatus = "MISMATCH";

        discrepancy = (
          settlement_amount - paymentAmount
        ).toFixed(2);
      }
    }

    const updated = await client.query(
      `UPDATE provider_settlements
       SET reconciliation_status = $1,
           discrepancy = $2,
           reconciled_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        reconciliationStatus,
        discrepancy,
        inserted.rows[0].id
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Settlement reconciled",
      settlement: updated.rows[0]
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        console.error("Settlement rollback failed");
      }
    }

    console.error("Settlement reconciliation failed:", error);

    return res.status(500).json({
      message: "Settlement reconciliation failed"
    });
  } finally {
    client.release();
  }
});

// List settlement records
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM provider_settlements
       ORDER BY settlement_date DESC, created_at DESC`
    );

    return res.json({
      settlements: result.rows
    });
  } catch {
    console.error("Settlement retrieval failed");

    return res.status(500).json({
      message: "Unable to retrieve settlements"
    });
  }
});

export default router;