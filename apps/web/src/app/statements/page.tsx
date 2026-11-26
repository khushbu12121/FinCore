"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5001/api";

type Wallet = {
  id: string;
  customer_id: string;
  full_name?: string;
  currency: string;
  balance: number;
  status?: string;
};

type StatementEntry = {
  reference: string;
  description: string;
  entry_type: string;
  amount: number;
  created_at: string;
  running_balance: number;
};

type StatementData = {
  walletId: string;
  totalTransactions: number;
  statement: StatementEntry[];
};

export default function StatementsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [statement, setStatement] = useState<StatementData | null>(null);

  const [loadingWallets, setLoadingWallets] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [error, setError] = useState("");

  async function loadWallets() {
    setLoadingWallets(true);
    setError("");

    try {
      const response = await fetch(`${API}/wallets`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load wallets");
      }

      setWallets(data.wallets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallets");
    } finally {
      setLoadingWallets(false);
    }
  }

  useEffect(() => {
    loadWallets();
  }, []);

  async function loadStatement(selectedWalletId: string) {
    if (!selectedWalletId) {
      setStatement(null);
      return;
    }

    setLoadingStatement(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/statements/${selectedWalletId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load statement");
      }

      setStatement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statement");
      setStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  }

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);

  const totalCredits =
    statement?.statement
      .filter((entry) => entry.entry_type?.toUpperCase() === "CREDIT")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0) || 0;

  const totalDebits =
    statement?.statement
      .filter((entry) => entry.entry_type?.toUpperCase() === "DEBIT")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              FINCORE / STATEMENTS
            </p>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Statements
            </h1>

            <p className="mt-2 text-slate-500">
              View wallet transaction history and balances.
            </p>
          </div>

          <button
            onClick={loadWallets}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
          >
            ↻ Refresh Wallets
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Wallet Selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Select Wallet
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose a wallet to view its statement.
          </p>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <select
              value={walletId}
              disabled={loadingWallets}
              onChange={(e) => {
                const value = e.target.value;
                setWalletId(value);
                loadStatement(value);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 sm:max-w-xl"
            >
              <option value="">
                {loadingWallets ? "Loading wallets..." : "Select wallet"}
              </option>

              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.full_name || wallet.customer_id} — {wallet.currency} — Balance:{" "}
                  {wallet.balance}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadStatement(walletId)}
              disabled={!walletId || loadingStatement}
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingStatement ? "Loading..." : "View Statement"}
            </button>
          </div>
        </div>

        {/* Wallet Overview */}
        {selectedWallet && (
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Wallet Balance
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {formatAmount(
                    selectedWallet.balance,
                    selectedWallet.currency
                  )}
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  {selectedWallet.full_name || "Customer"}
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Wallet ID
                </p>

                <p className="mt-2 break-all font-mono text-sm text-slate-800">
                  {selectedWallet.id}
                </p>

                <div className="mt-3 flex gap-2">
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {selectedWallet.currency}
                  </span>

                  <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    {selectedWallet.status || "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statement Summary */}
        {statement && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-500">
                Transactions
              </p>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {statement.totalTransactions}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-500">
                Total Credits
              </p>

              <p className="mt-3 text-2xl font-bold text-green-600">
                {formatAmount(
                  totalCredits,
                  selectedWallet?.currency || "INR"
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-500">
                Total Debits
              </p>

              <p className="mt-3 text-2xl font-bold text-red-600">
                {formatAmount(
                  totalDebits,
                  selectedWallet?.currency || "INR"
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-500">
                Current Balance
              </p>

              <p className="mt-3 text-2xl font-bold text-slate-900">
                {formatAmount(
                  selectedWallet?.balance || 0,
                  selectedWallet?.currency || "INR"
                )}
              </p>
            </div>
          </div>
        )}

        {/* Transaction Statement */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Transaction Statement
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Detailed ledger activity for the selected wallet.
            </p>
          </div>

          {!walletId ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                📄
              </div>

              <h3 className="font-semibold text-slate-900">
                Select a wallet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Choose a wallet above to view transaction history.
              </p>
            </div>
          ) : loadingStatement ? (
            <div className="flex min-h-[300px] items-center justify-center text-slate-500">
              Loading statement...
            </div>
          ) : !statement || statement.statement.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📭
              </div>

              <h3 className="font-semibold text-slate-900">
                No transactions
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Transactions will appear here when this wallet is used.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-3 py-4 font-medium">Date</th>
                    <th className="px-3 py-4 font-medium">Description</th>
                    <th className="px-3 py-4 font-medium">Type</th>
                    <th className="px-3 py-4 font-medium">Amount</th>
                    <th className="px-3 py-4 font-medium">Balance</th>
                    <th className="px-3 py-4 font-medium">Reference</th>
                  </tr>
                </thead>

                <tbody>
                  {statement.statement.map((entry, index) => {
                    const isCredit =
                      entry.entry_type?.toUpperCase() === "CREDIT";

                    return (
                      <tr
                        key={`${entry.reference}-${index}`}
                        className="border-b border-slate-100 transition hover:bg-blue-50/50"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-slate-500">
                          {formatDate(entry.created_at)}
                        </td>

                        <td className="px-3 py-4 text-slate-800">
                          {entry.description || "Transaction"}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              isCredit
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {entry.entry_type}
                          </span>
                        </td>

                        <td
                          className={`whitespace-nowrap px-3 py-4 font-semibold ${
                            isCredit ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatAmount(
                            entry.amount,
                            selectedWallet?.currency || "INR"
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 font-medium text-slate-800">
                          {formatAmount(
                            entry.running_balance,
                            selectedWallet?.currency || "INR"
                          )}
                        </td>

                        <td className="px-3 py-4 font-mono text-xs text-slate-500">
                          {entry.reference?.slice(0, 12) || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}