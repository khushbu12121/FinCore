
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
    typeof currency !== "string" ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return res.status(400).json({
      message: "Invalid payment details",
    });
  }

  try {
    const providerReference = `SIM_${crypto.randomUUID()}`;

    const result = await pool.query(
      `INSERT INTO payment_intents
       (customer_id, wallet_id, amount, currency, provider_reference)
       SELECT c.id, w.id, $3, $4, $5
       FROM customers c
       JOIN wallets w ON w.customer_id = c.id
       WHERE c.id = $1
         AND w.id = $2
         AND c.status = 'ACTIVE'
       RETURNING *`,
      [
        customer_id,
        wallet_id,
        amount,
        currency,
        providerReference,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Customer or wallet not found",
      });
    }

    return res.status(201).json({
      message: "Payment intent created in test mode",
      paymentIntent: result.rows[0],
    });
  } catch (error) {
    console.error("Payment intent creation failed:", error);

    return res.status(500).json({
      message: "Payment intent failed",
    });
  }
});

// Verify webhook signature and process event once
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret || typeof signature !== "string") {
    return res.status(401).json({
      message: "Missing webhook signature or secret",
    });
  }

  const payload = JSON.stringify(req.body);

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  let receivedBuffer: Buffer;

  try {
    receivedBuffer = Buffer.from(signature, "hex");
  } catch {
    return res.status(401).json({
      message: "Invalid webhook signature",
    });
  }

  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      message: "Invalid webhook signature",
    });
  }

  const {
    event_id,
    event_type,
    payment_intent_id,
    status,
  } = req.body;

  if (
    typeof event_id !== "string" ||
    !event_id.trim() ||
    typeof event_type !== "string" ||
    !event_type.trim() ||
    typeof payment_intent_id !== "string" ||
    !payment_intent_id.trim() ||
    !["SUCCEEDED", "FAILED"].includes(status)
  ) {
    return res.status(400).json({
      message: "Invalid webhook event",
    });
  }

  const client = await pool.connect();

  let transactionStarted = false;
  let transactionCommitted = false;
  let paymentAmount = "0";

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // Record the event only once
    const inserted = await client.query(
      `INSERT INTO webhook_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [event_id, event_type]
    );

    // Duplicate event protection
    if (inserted.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(200).json({
        message: "Duplicate webhook ignored",
      });
    }

    // Lock payment intent to prevent concurrent processing
    const payment = await client.query(
      `SELECT id, status, amount, customer_id
       FROM payment_intents
       WHERE id = $1
       FOR UPDATE`,
      [payment_intent_id]
    );

    if (payment.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        message: "Payment intent not found",
      });
    }

    // Prevent processing an already processed payment
    if (payment.rows[0].status !== "PENDING") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        message: "Payment intent is already processed",
      });
    }

    paymentAmount = String(payment.rows[0].amount);

    // Update payment status
    await client.query(
      `UPDATE payment_intents
       SET status = $1
       WHERE id = $2`,
      [status, payment_intent_id]
    );

    // Mark webhook event processed
    await client.query(
      `UPDATE webhook_events
       SET processed_at = NOW()
       WHERE event_id = $1`,
      [event_id]
    );

    await client.query("COMMIT");

    transactionStarted = false;
    transactionCommitted = true;

    // Notification is best-effort.
    // It must not undo an already committed payment.
    try {
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
          paymentAmount
        );
      }
    } catch (notificationError) {
      console.error(
        "Payment notification failed after commit:",
        notificationError
      );
    }

    return res.status(200).json({
      message: "Webhook processed successfully",
      payment_intent_id,
      status,
    });
  } catch (error) {
    // Rollback only if transaction is still active
    if (transactionStarted && !transactionCommitted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    // Show the actual underlying error in terminal
    console.error("Webhook processing failed:", error);

    return res.status(500).json({
      message: "Webhook processing failed",
    });
  } finally {
    client.release();
  }
});

// List payment intents
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM payment_intents
       ORDER BY created_at DESC`
    );

    return res.json({
      paymentIntents: result.rows,
    });
  } catch (error) {
    console.error("Payment intent retrieval failed:", error);

    return res.status(500).json({
      message: "Unable to retrieve payment intents",
    });
  }
});

export default router;
