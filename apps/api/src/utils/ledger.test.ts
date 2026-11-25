import { describe, it, expect } from "vitest";
import {
  validateLedgerEntries,
  toPaise,
  type LedgerEntry,
} from "./ledger";

describe("FinCore Ledger Integrity", () => {
  it("accepts a balanced debit and credit journal", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 100 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 100 },
    ];

    expect(validateLedgerEntries(entries)).toBe(true);
  });

  it("rejects an unbalanced journal", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 100 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 90 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("rejects journals with only debit entries", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 100 },
      { accountId: "wallet-2", entryType: "DEBIT", amount: 50 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("rejects journals with only credit entries", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "CREDIT", amount: 100 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 50 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("rejects an empty journal", () => {
    expect(validateLedgerEntries([])).toBe(false);
  });

  it("rejects a journal with only one entry", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 100 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("rejects zero amounts", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 0 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 0 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("rejects negative amounts", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: -100 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: -100 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("rejects invalid account IDs", () => {
    const entries: LedgerEntry[] = [
      { accountId: "", entryType: "DEBIT", amount: 100 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 100 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("handles decimal amounts correctly", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 10.5 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 10.5 },
    ];

    expect(validateLedgerEntries(entries)).toBe(true);
  });

  it("handles paise precision", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 10.01 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 10.01 },
    ];

    expect(validateLedgerEntries(entries)).toBe(true);
  });

  it("rejects mismatched paise", () => {
    const entries: LedgerEntry[] = [
      { accountId: "wallet-1", entryType: "DEBIT", amount: 10.01 },
      { accountId: "wallet-2", entryType: "CREDIT", amount: 10.02 },
    ];

    expect(validateLedgerEntries(entries)).toBe(false);
  });

  it("converts rupees to paise correctly", () => {
    expect(toPaise(100.5)).toBe(10050);
    expect(toPaise(10.01)).toBe(1001);
    expect(toPaise(1)).toBe(100);
  });

  it("rejects invalid money values", () => {
    expect(() => toPaise(0)).toThrow("Invalid ledger amount");
    expect(() => toPaise(-1)).toThrow("Invalid ledger amount");
    expect(() => toPaise(Number.NaN)).toThrow("Invalid ledger amount");
    expect(() => toPaise(Number.POSITIVE_INFINITY)).toThrow(
      "Invalid ledger amount",
    );
  });
});
