"use client";

import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5001/api";

type Customer = {
  id: string;
  full_name: string;
  email: string;
};

type Wallet = {
  id: string;
  customer_id: string;
  full_name?: string;
  currency: string;
  balance: number;
  status?: string;
};

type PaymentIntent = {
  id: string;
  customer_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function PaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [payments, setPayments] = useState<PaymentIntent[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customersRes, walletsRes, paymentsRes] = await Promise.all([
        fetch(`${API}/customers`),
        fetch(`${API}/wallets`),
        fetch(`${API}/payment-intents`),
      ]);

      const customersData = await customersRes.json();
      const walletsData = await walletsRes.json();
      const paymentsData = await paymentsRes.json();

      if (!customersRes.ok) {
        throw new Error(customersData.message || "Failed to load customers");
      }

      if (!walletsRes.ok) {
        throw new Error(walletsData.message || "Failed to load wallets");
      }

      if (!paymentsRes.ok) {
        throw new Error(paymentsData.message || "Failed to load payments");
      }

      setCustomers(customersData.customers || []);
      setWallets(walletsData.wallets || []);
      setPayments(paymentsData.paymentIntents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const customerWallets = wallets.filter(
    (wallet) => wallet.customer_id === customerId
  );

  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.id.toLowerCase().includes(search.toLowerCase()) ||
        payment.customer_id.toLowerCase().includes(search.toLowerCase()) ||
        payment.wallet_id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        payment.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const pendingPayments = payments.filter(
    (payment) => payment.status?.toUpperCase() === "PENDING"
  ).length;

  const completedPayments = payments.filter(
    (payment) =>
      payment.status?.toUpperCase() === "COMPLETED" ||
      payment.status?.toUpperCase() === "SUCCEEDED"
  ).length;

  const totalAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const amountValue = Number(amount);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!walletId) {
      setError("Please select a wallet.");
      return;
    }

    if (!amount || !Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    if (!Number.isInteger(amountValue * 100)) {
      setError("Amount cannot have more than 2 decimal places.");
      return;
    }

    if (!selectedWallet) {
      setError("Selected wallet is invalid.");
      return;
    }

    if (selectedWallet.customer_id !== customerId) {
      setError("Selected wallet does not belong to this customer.");
      return;
    }

    if (selectedWallet.currency !== currency) {
      setError("Wallet currency and payment currency must match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/payment-intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          wallet_id: walletId,
          amount: amountValue,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create payment intent");
      }

      setSuccess("Payment intent created successfully!");
      setAmount("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create payment"
      );
    } finally {
      setSaving(false);
    }
  }

  function formatAmount(value: number, curr: string = "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusStyle(status: string) {
    const value = status?.toUpperCase();

    if (
      value === "COMPLETED" ||
      value === "SUCCEEDED" ||
      value === "SUCCESS"
    ) {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (value === "FAILED" || value === "CANCELLED") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (value === "PENDING" || value === "PROCESSING") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              FINCORE / PAYMENTS
            </p>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Payments
            </h1>

            <p className="mt-2 text-slate-500">
              Create and manage payment intents.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ {success}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Total Payment Intents
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {payments.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Pending
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-amber-600">
              {pendingPayments}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Completed
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-green-600">
              {completedPayments}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Total Payment Value
            </p>

            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {formatAmount(totalAmount)}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Create Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Create Payment
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a new payment intent.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">

              {/* Customer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Customer *
                </label>

                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setWalletId("");
                    setCurrency("INR");
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} — {customer.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wallet */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Wallet *
                </label>

                <select
                  value={walletId}
                  disabled={!customerId}
                  onChange={(e) => {
                    const wallet = customerWallets.find(
                      (item) => item.id === e.target.value
                    );

                    setWalletId(e.target.value);

                    if (wallet) {
                      setCurrency(wallet.currency);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Select wallet</option>

                  {customerWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.currency} • Balance: {wallet.balance}
                    </option>
                  ))}
                </select>

                {customerId && customerWallets.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    This customer has no wallets.
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Amount *
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Currency
                </label>

                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={!!walletId}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>

              {/* Preview */}
              {amount && Number(amount) > 0 && (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                  <p className="text-sm text-slate-500">
                    Payment Preview
                  </p>

                  <p className="mt-2 text-2xl font-bold text-blue-600">
                    {formatAmount(Number(amount), currency)}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Payment intent will be created with pending status.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving || !customerId || !walletId}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating..." : "+ Create Payment Intent"}
              </button>
            </form>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Payment History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  All payment intents created in FinCore.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payment..."
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SUCCEEDED">Succeeded</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center text-slate-500">
                Loading payments...
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-4 text-5xl">
                  💳
                </div>

                <h3 className="font-semibold text-slate-900">
                  No payments found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Create a payment intent or change your search filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-4 font-medium">Payment ID</th>
                      <th className="px-3 py-4 font-medium">Amount</th>
                      <th className="px-3 py-4 font-medium">Status</th>
                      <th className="px-3 py-4 font-medium">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100 transition hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-4">
                          <p className="font-medium text-slate-800">
                            {payment.id.slice(0, 8)}...
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Wallet: {payment.wallet_id.slice(0, 8)}...
                          </p>
                        </td>

                        <td className="px-3 py-4 font-semibold text-slate-900">
                          {formatAmount(payment.amount, payment.currency)}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${statusStyle(
                              payment.status
                            )}`}
                          >
                            {payment.status || "UNKNOWN"}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-slate-500">
                          {formatDate(payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-500">
              Showing {filteredPayments.length} of {payments.length} payment intents
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}