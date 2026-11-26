
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  scenario: "success",
  idempotencyLookupCount: 0
}));

vi.mock("../config/database", () => ({
  pool: {
    connect: mocks.connect,
    query: mocks.query
  }
}));

import transferRouter from "./transfer.routes";

const app = express();
app.use(express.json());
app.use("/transfers", transferRouter);

const FROM_WALLET = "11111111-1111-1111-1111-111111111111";
const TO_WALLET = "22222222-2222-2222-2222-222222222222";

const validTransfer = {
  from_wallet_id: FROM_WALLET,
  to_wallet_id: TO_WALLET,
  amount: 100,
  idempotency_key: "test-transfer-001"
};

describe("Transfer route tests", () => {
  const client = {
    query: mocks.query,
    release: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scenario = "success";
    mocks.idempotencyLookupCount = 0;

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

      // Idempotency lookup
      if (sql.includes("SELECT id, status FROM transfers")) {
        if (mocks.scenario === "duplicate") {
          return {
            rowCount: 1,
            rows: [
              {
                id: "existing-transfer",
                status: "COMPLETED"
              }
            ]
          };
        }

        if (mocks.scenario === "duplicate-race") {
          mocks.idempotencyLookupCount++;

          // First lookup: transfer not yet visible
          // Second lookup: concurrent request already inserted it
          if (mocks.idempotencyLookupCount > 1) {
            return {
              rowCount: 1,
              rows: [
                {
                  id: "existing-transfer",
                  status: "COMPLETED"
                }
              ]
            };
          }
        }

        return { rowCount: 0, rows: [] };
      }

      // Wallet lookup
      if (sql.includes("FROM wallets")) {
        if (mocks.scenario === "insufficient") {
          return {
            rowCount: 2,
            rows: [
              {
                id: FROM_WALLET,
                currency: "INR",
                balance: "50.00",
                status: "ACTIVE"
              },
              {
                id: TO_WALLET,
                currency: "INR",
                balance: "100.00",
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
              currency: "INR",
              balance: "500.00",
              status: "ACTIVE"
            },
            {
              id: TO_WALLET,
              currency: "INR",
              balance: "100.00",
              status: "ACTIVE"
            }
          ]
        };
      }

      // Transfer insertion
      if (sql.includes("INSERT INTO transfers")) {
        if (mocks.scenario === "duplicate-race") {
          const error: any = new Error("Duplicate idempotency key");
          error.code = "23505";
          throw error;
        }

        return {
          rowCount: 1,
          rows: [
            {
              id: "new-transfer",
              from_wallet_id: FROM_WALLET,
              to_wallet_id: TO_WALLET,
              amount: 100,
              currency: "INR",
              status: "COMPLETED"
            }
          ]
        };
      }

      // Ledger accounts
      if (sql.includes("FROM ledger_accounts")) {
        if (mocks.scenario === "missing-account") {
          return { rowCount: 1, rows: [] };
        }

        return {
          rowCount: 2,
          rows: [
            {
              id: "sender-account",
              wallet_id: FROM_WALLET
            },
            {
              id: "receiver-account",
              wallet_id: TO_WALLET
            }
          ]
        };
      }

      // Journal entry
      if (sql.includes("INSERT INTO journal_entries")) {
        return {
          rowCount: 1,
          rows: [{ id: "journal-001" }]
        };
      }

      // Ledger transactions
      if (sql.includes("INSERT INTO ledger_transactions")) {
        if (mocks.scenario === "ledger-failure") {
          throw new Error("Simulated ledger insertion failure");
        }

        return { rowCount: 2, rows: [] };
      }

      // Wallet balance updates
      if (sql.includes("UPDATE wallets")) {
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    });
  });

  it("rejects invalid transfer details", async () => {
    const response = await request(app)
      .post("/transfers")
      .send({ ...validTransfer, amount: -10 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid transfer details");
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("rejects transfers with insufficient balance", async () => {
    mocks.scenario = "insufficient";

    const response = await request(app)
      .post("/transfers")
      .send(validTransfer);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Insufficient balance");

    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  it("returns existing transfer for duplicate idempotency key", async () => {
    mocks.scenario = "duplicate";

    const response = await request(app)
      .post("/transfers")
      .send(validTransfer);

    expect(response.status).toBe(200);
    expect(response.body.transfer.id).toBe("existing-transfer");
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
  });

  it("returns existing transfer when a concurrent request causes a unique-key conflict", async () => {
    mocks.scenario = "duplicate-race";

    const response = await request(app)
      .post("/transfers")
      .send(validTransfer);

    expect(response.status).toBe(200);
    expect(response.body.transfer.id).toBe("existing-transfer");
    expect(response.body.transfer.status).toBe("COMPLETED");

    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");

    expect(mocks.idempotencyLookupCount).toBe(2);
    expect(client.release).toHaveBeenCalled();
  });

  it("completes a transfer with debit and credit ledger entries", async () => {
    const response = await request(app)
      .post("/transfers")
      .send(validTransfer);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Transfer completed");

    expect(mocks.query).toHaveBeenCalledWith("BEGIN");
    expect(mocks.query).toHaveBeenCalledWith("COMMIT");

    const ledgerCall = mocks.query.mock.calls.find(
      ([sql]) =>
        String(sql).includes("INSERT INTO ledger_transactions")
    );

    expect(ledgerCall).toBeDefined();

    expect(ledgerCall?.[1]).toEqual([
      "journal-001",
      "sender-account",
      100,
      "receiver-account"
    ]);

    expect(client.release).toHaveBeenCalled();
  });

  it("rolls back when a ledger account is missing", async () => {
    mocks.scenario = "missing-account";

    const response = await request(app)
      .post("/transfers")
      .send(validTransfer);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Transfer failed");

    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
  });

  it("rolls back when ledger transaction insertion fails", async () => {
    mocks.scenario = "ledger-failure";

    const response = await request(app)
      .post("/transfers")
      .send(validTransfer);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Transfer failed");

    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
  });
});
