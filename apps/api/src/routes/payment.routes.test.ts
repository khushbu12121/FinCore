
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "crypto";

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  sendNotification: vi.fn(),
  scenario: "success"
}));

vi.mock("../config/database", () => ({
  pool: {
    connect: mocks.connect,
    query: mocks.poolQuery
  }
}));

vi.mock("../services/notification.service", () => ({
  sendPaymentNotification: mocks.sendNotification
}));

import paymentRouter from "./payment.routes";

const app = express();
app.use(express.json());
app.use("/payments", paymentRouter);

const SECRET = "test-webhook-secret";

const validPayment = {
  customer_id: "customer-001",
  wallet_id: "wallet-001",
  amount: 100,
  currency: "INR"
};

const validWebhook = {
  event_id: "event-001",
  event_type: "payment.updated",
  payment_intent_id: "payment-001",
  status: "SUCCEEDED"
};

function generateSignature(payload: object) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

describe("Payment route tests", () => {
  const client = {
    query: mocks.clientQuery,
    release: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.scenario = "success";
    process.env.WEBHOOK_SECRET = SECRET;

    mocks.connect.mockResolvedValue(client);

    mocks.sendNotification.mockResolvedValue(undefined);

    mocks.poolQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO payment_intents")) {
        if (mocks.scenario === "missing-customer-wallet") {
          return {
            rowCount: 0,
            rows: []
          };
        }

        return {
          rowCount: 1,
          rows: [{
            id: "payment-001",
            customer_id: "customer-001",
            wallet_id: "wallet-001",
            amount: 100,
            currency: "INR",
            status: "PENDING"
          }]
        };
      }

      if (sql.includes("SELECT c.email")) {
        if (mocks.scenario === "no-email") {
          return {
            rowCount: 1,
            rows: [{ email: null }]
          };
        }

        return {
          rowCount: 1,
          rows: [{ email: "customer@example.com" }]
        };
      }

      return {
        rowCount: 0,
        rows: []
      };
    });

    mocks.clientQuery.mockImplementation(async (sql: string) => {
      const normalizedSql = sql.trim().toUpperCase();

      if (
        normalizedSql === "BEGIN" ||
        normalizedSql === "COMMIT" ||
        normalizedSql === "ROLLBACK"
      ) {
        return {
          rowCount: 0,
          rows: []
        };
      }

      if (mocks.scenario === "database-failure") {
        throw new Error("Simulated database failure");
      }

      if (sql.includes("INSERT INTO webhook_events")) {
        if (mocks.scenario === "duplicate-webhook") {
          return {
            rowCount: 0,
            rows: []
          };
        }

        return {
          rowCount: 1,
          rows: [{ id: "webhook-001" }]
        };
      }

      if (sql.includes("SELECT id, status, amount, customer_id")) {
        if (mocks.scenario === "missing-payment") {
          return {
            rowCount: 0,
            rows: []
          };
        }

        if (mocks.scenario === "already-processed") {
          return {
            rowCount: 1,
            rows: [{
              id: "payment-001",
              status: "SUCCEEDED",
              amount: "100.00",
              customer_id: "customer-001"
            }]
          };
        }

        return {
          rowCount: 1,
          rows: [{
            id: "payment-001",
            status: "PENDING",
            amount: "100.00",
            customer_id: "customer-001"
          }]
        };
      }

      if (sql.includes("UPDATE payment_intents")) {
        return {
          rowCount: 1,
          rows: []
        };
      }

      if (sql.includes("UPDATE webhook_events")) {
        return {
          rowCount: 1,
          rows: []
        };
      }

      return {
        rowCount: 0,
        rows: []
      };
    });
  });

  // ===========================
  // Payment Intent Tests
  // ===========================

  it("rejects invalid payment details", async () => {
    const response = await request(app)
      .post("/payments")
      .send({
        ...validPayment,
        amount: -10
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid payment details");

    expect(mocks.poolQuery).not.toHaveBeenCalled();
  });

  it("returns 404 when customer or wallet is not found", async () => {
    mocks.scenario = "missing-customer-wallet";

    const response = await request(app)
      .post("/payments")
      .send(validPayment);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      "Customer or wallet not found"
    );
  });

  it("creates a payment intent successfully", async () => {
    const response = await request(app)
      .post("/payments")
      .send(validPayment);

    expect(response.status).toBe(201);

    expect(response.body.message).toBe(
      "Payment intent created in test mode"
    );

    expect(response.body.paymentIntent.id).toBe("payment-001");
    expect(response.body.paymentIntent.status).toBe("PENDING");
  });

  // ===========================
  // Webhook Signature Tests
  // ===========================

  it("rejects webhook without signature", async () => {
    const response = await request(app)
      .post("/payments/webhook")
      .send(validWebhook);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Missing webhook signature or secret"
    );

    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("rejects invalid webhook signature", async () => {
    const response = await request(app)
      .post("/payments/webhook")
      .set("x-webhook-signature", "invalid-signature")
      .send(validWebhook);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Invalid webhook signature"
    );

    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("rejects invalid webhook event", async () => {
    const invalidEvent = {
      ...validWebhook,
      status: "UNKNOWN"
    };

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(invalidEvent)
      )
      .send(invalidEvent);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Invalid webhook event"
    );

    expect(mocks.connect).not.toHaveBeenCalled();
  });

  // ===========================
  // Webhook Processing Tests
  // ===========================

  it("ignores duplicate webhook events", async () => {
    mocks.scenario = "duplicate-webhook";

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Duplicate webhook ignored"
    );

    expect(mocks.clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.clientQuery).not.toHaveBeenCalledWith("COMMIT");

    expect(client.release).toHaveBeenCalled();
  });

  it("returns 404 when payment intent does not exist", async () => {
    mocks.scenario = "missing-payment";

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      "Payment intent not found"
    );

    expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.clientQuery).not.toHaveBeenCalledWith("COMMIT");

    expect(client.release).toHaveBeenCalled();
  });

  it("rejects already processed payment intent", async () => {
    mocks.scenario = "already-processed";

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Payment intent is already processed"
    );

    expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.clientQuery).not.toHaveBeenCalledWith("COMMIT");
  });

  it("processes successful webhook and sends notification", async () => {
    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      "Webhook processed successfully"
    );

    expect(response.body.payment_intent_id).toBe("payment-001");
    expect(response.body.status).toBe("SUCCEEDED");

    expect(mocks.clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(mocks.clientQuery).toHaveBeenCalledWith("COMMIT");

    // SQL may be formatted across multiple lines.
    expect(mocks.clientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE payment_intents"),
      ["SUCCEEDED", "payment-001"]
    );

    expect(mocks.sendNotification).toHaveBeenCalledWith(
      "customer@example.com",
      "payment-001",
      "SUCCEEDED",
      "100.00"
    );

    expect(client.release).toHaveBeenCalled();
  });

  it("processes webhook without notification when customer has no email", async () => {
    mocks.scenario = "no-email";

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    expect(response.status).toBe(200);
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("does not fail committed payment when notification fails", async () => {
    mocks.sendNotification.mockRejectedValue(
      new Error("Notification service unavailable")
    );

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    // Payment has already been committed.
    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      "Webhook processed successfully"
    );

    expect(mocks.clientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mocks.clientQuery).not.toHaveBeenCalledWith("ROLLBACK");

    expect(mocks.sendNotification).toHaveBeenCalled();

    expect(client.release).toHaveBeenCalled();
  });

  it("rolls back when webhook database processing fails", async () => {
    mocks.scenario = "database-failure";

    const response = await request(app)
      .post("/payments/webhook")
      .set(
        "x-webhook-signature",
        generateSignature(validWebhook)
      )
      .send(validWebhook);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Webhook processing failed"
    );

    expect(mocks.clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.clientQuery).not.toHaveBeenCalledWith("COMMIT");

    expect(client.release).toHaveBeenCalled();
  });
});
