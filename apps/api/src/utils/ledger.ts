export type LedgerEntryType = "DEBIT" | "CREDIT";

export interface LedgerEntry {
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
}

export function validateLedgerEntries(entries: LedgerEntry[]): boolean {
  if (!Array.isArray(entries) || entries.length < 2) {
    return false;
  }

  if (entries.some(
    (entry) =>
      !entry.accountId ||
      !["DEBIT", "CREDIT"].includes(entry.entryType) ||
      !Number.isFinite(entry.amount) ||
      entry.amount <= 0
  )) {
    return false;
  }

  const debitTotal = entries
    .filter((entry) => entry.entryType === "DEBIT")
    .reduce((total, entry) => total + toPaise(entry.amount), 0);

  const creditTotal = entries
    .filter((entry) => entry.entryType === "CREDIT")
    .reduce((total, entry) => total + toPaise(entry.amount), 0);

  return debitTotal === creditTotal && debitTotal > 0;
}

export function toPaise(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid ledger amount");
  }

  return Math.round(amount * 100);
}
