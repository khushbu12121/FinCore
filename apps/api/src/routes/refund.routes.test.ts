import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  scenario: "success"
}));

vi.mock("../config/database", () => ({
  pool: {
    connect: mocks.connect,
    query: mocks.query
  }
}));

import refundRouter from "./refund.routes";

const app = express();
app.use(express.json());
app.use("/refunds", refundRouter);

const TRANSFER_ID = "transfer-001";
const FROM_WALLET = "11111111-1111-1111-1111-111111111111";
const TO_WALLET = "22222222-2222-2222-2222-222222222222";

const validRefund = {
  transfer_id: TRANSFER_ID,
  amount: 50,
  reason: "Customer requested refund"
};

describe("Refund route tests", () => {
  const client = {
    query: mocks.query,
    release: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scenario = "success";

    mocks.connect.mockResolvedValue(client);

    mocks.query.mockImplementation(async (sql: string) => {
      const normalizedSql = sql.trim().toUpperCase();

      if (
        normalizedSql === "BEGIN" ||
        normalizedSql === "COMMIT" ||
        normalizedSql === "ROLLBACK"
      ) {
        return { rowCount: 0, rows: [] };
      }

      if (sql.includes("SELECT * FROM transfers")) {
        if (mocks.scenario === "missing-transfer") {
          return { rowCount: 0, rows: [] };
        }

        return {
          rowCount: 1,
          rows: [{
            id: TRANSFER_ID,
            from_wallet_id: FROM_WALLET,
            to_wallet_id: TO_WALLET,
            amount: 100,
            currency: "INR",
            status: "COMPLETED"
          }]
        };
      }

      if (sql.includes("SUM(amount)") && sql.includes("FROM refunds")) {
        if (mocks.scenario === "refund-limit") {
          return {
            rowCount: 1,
            rows: [{ total: "80.00" }]
          };
        }

        return {
          rowCount: 1,
          rows: [{ total: "0.00" }]
        };
      }

      if (sql.includes("FROM wallets")) {
        if (mocks.scenario === "insufficient-recipient") {
          return {
            rowCount: 2,
            rows: [
              {
                id: FROM_WALLET,
                balance: "100.00",
                status: "ACTIVE"
              },
              {
                id: TO_WALLET,
                balance: "20.00",
                status: "ACTIVE"
              }
            ]
          };
        }

        return {
          rowCount: 2,
          rows: [
            {
              id: FROM_WALLET,
              balance: "100.00",
              status: "ACTIVE"
            },
            {
              id: TO_WALLET,
              balance: "150.00",
              status: "ACTIVE"
            }
          ]
        };
      }

      if (sql.includes("FROM ledger_accounts")) {
        return {
          rowCount: 2,
          rows: [
            { id: "sender-account", wallet_id: FROM_WALLET },
            { id: "receiver-account", wallet_id: TO_WALLET }
          ]
        };
      }

      if (sql.includes("INSERT INTO refunds")) {
        return {
          rowCount: 1,
          rows: [{
            id: "refund-001",
            transfer_id: TRANSFER_ID,
            amount: 50,
            reason: "Customer requested refund",
            status: "COMPLETED"
          }]
        };
      }

      if (sql.includes("INSERT INTO journal_entries")) {
        return {
          rowCount: 1,
          rows: [{ id: "journal-refund-001" }]
        };
      }

      if (sql.includes("INSERT INTO ledger_transactions")) {
        if (mocks.scenario === "ledger-failure") {
          throw new Error("Simulated refund ledger failure");
        }

        return { rowCount: 2, rows: [] };
      }

      if (sql.includes("UPDATE wallets")) {
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    });
  });

  it("rejects invalid refund details", async () => {
    const response = await request(app)
      .post("/refunds")
      .send({ ...validRefund, amount: -10 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid refund details");
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("returns 404 when completed transfer is not found", async () => {
    mocks.scenario = "missing-transfer";

    const response = await request(app)
      .post("/refunds")
      .send(validRefund);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Completed transfer not found");
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
  });

  it("rejects refunds exceeding remaining refundable amount", async () => {
    mocks.scenario = "refund-limit";

    const response = await request(app)
      .post("/refunds")
      .send(validRefund);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Refund exceeds remaining amount");
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
  });

  it("rejects refund when recipient wallet has insufficient funds", async () => {
    mocks.scenario = "insufficient-recipient";

    const response = await request(app)
      .post("/refunds")
      .send(validRefund);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Recipient wallet has insufficient balance for refund"
    );

    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
  });

  it("completes refund and reverses ledger entries", async () => {
    const response = await request(app)
      .post("/refunds")
      .send(validRefund);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Refund completed and balances reversed"
    );

    expect(response.body.refund.id).toBe("refund-001");
    expect(response.body.ledger.debit).toBe("receiver-account");
    expect(response.body.ledger.credit).toBe("sender-account");

    expect(mocks.query).toHaveBeenCalledWith("BEGIN");
    expect(mocks.query).toHaveBeenCalledWith("COMMIT");

    const ledgerCall = mocks.query.mock.calls.find(
      ([sql]) => String(sql).includes("INSERT INTO ledger_transactions")
    );

    expect(ledgerCall).toBeDefined();
    expect(ledgerCall?.[1]).toEqual([
      "journal-refund-001",
      "receiver-account",
      50,
      "sender-account"
    ]);

    expect(client.release).toHaveBeenCalled();
  });

  it("rolls back when refund ledger insertion fails", async () => {
    mocks.scenario = "ledger-failure";

    const response = await request(app)
      .post("/refunds")
      .send(validRefund);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Refund failed");

    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });
});
