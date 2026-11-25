import { sendPaymentNotification } from "../services/notification.service";

import { Router } from "express";
import { pool } from "../config/database";
import crypto from "crypto";

const router = Router();

// Create test-mode payment intent
router.post("/", async (req, res) => {
  const { customer_id, wallet_id, amount, currency = "INR" } = req.body;

  if (
    !customer_id ||
    !wallet_id ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100 ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return res.status(400).json({ message: "Invalid payment details" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO payment_intents
       (customer_id, wallet_id, amount, currency)
       SELECT c.id, w.id, $3, $4
       FROM customers c JOIN wallets w ON w.customer_id = c.id
       WHERE c.id = $1 AND w.id = $2 AND c.status = 'ACTIVE'
       RETURNING *`,
      [customer_id, wallet_id, amount, currency]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Customer or wallet not found" });
    }

    return res.status(201).json({
      message: "Payment intent created in test mode",
      paymentIntent: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Payment intent failed" });
  }
});

// Verify webhook signature and process event once
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret || typeof signature !== "string") {
    return res.status(401).json({ message: "Missing webhook signature or secret" });
  }

  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  const { event_id, event_type, payment_intent_id, status } = req.body;

  if (
    !event_id ||
    !event_type ||
    !payment_intent_id ||
    !["SUCCEEDED", "FAILED"].includes(status)
  ) {
    return res.status(400).json({ message: "Invalid webhook event" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `INSERT INTO webhook_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [event_id, event_type]
    );

    if (inserted.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Duplicate webhook ignored"
      });
    }

    const payment = await client.query(
      `SELECT id, status, amount, customer_id FROM payment_intents
       WHERE id = $1 FOR UPDATE`,
      [payment_intent_id]
    );

    if (payment.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Payment intent not found" });
    }

    if (payment.rows[0].status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Payment intent is already processed"
      });
    }

    await client.query(
      `UPDATE payment_intents SET status = $1 WHERE id = $2`,
      [status, payment_intent_id]
    );

    await client.query(
      `UPDATE webhook_events SET processed_at = NOW() WHERE event_id = $1`,
      [event_id]
    );

    await client.query("COMMIT");
    const customer = await pool.query(
  `SELECT c.email
   FROM payment_intents p
   JOIN customers c ON c.id = p.customer_id
   WHERE p.id = $1`,
  [payment_intent_id]
);

if (customer.rows[0]?.email) {
  await sendPaymentNotification(
    customer.rows[0].email,
    payment_intent_id,
    status,
    String(payment.rows[0].amount)
  );
}

    return res.json({
      message: "Webhook processed successfully",
      payment_intent_id,
      status
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Webhook processing failed:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  } finally {
    client.release();
  }
});

router.get("/", async (_req, res) => {
  const result = await pool.query(
    "SELECT * FROM payment_intents ORDER BY created_at DESC"
  );
  return res.json({ paymentIntents: result.rows });
});

export default router;
