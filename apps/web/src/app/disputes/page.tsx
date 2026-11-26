"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5001/api";

type Customer = {
  id: string;
  full_name: string;
  email: string;
};

type Transfer = {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type Dispute = {
  id: string;
  transfer_id: string;
  customer_id: string;
  reason: string;
  status?: string;
  created_at?: string;
};

export default function DisputesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [transferId, setTransferId] = useState("");
  const [reason, setReason] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customersRes, transfersRes, disputesRes] = await Promise.all([
        fetch(`${API}/customers`),
        fetch(`${API}/transfers`),
        fetch(`${API}/disputes`),
      ]);

      const customersData = await customersRes.json();
      const transfersData = await transfersRes.json();
      const disputesData = await disputesRes.json();

      if (!customersRes.ok) throw new Error("Failed to load customers");
      if (!transfersRes.ok) throw new Error("Failed to load transfers");
      if (!disputesRes.ok) throw new Error("Failed to load disputes");

      setCustomers(customersData.customers || []);
      setTransfers(transfersData.transactions || []);
      setDisputes(disputesData.disputes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredDisputes = disputes.filter((dispute) =>
    [
      dispute.id,
      dispute.transfer_id,
      dispute.customer_id,
      dispute.reason,
      dispute.status || "",
    ].some((value) => value.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!customerId || !transferId || !reason.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/disputes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transfer_id: transferId,
          customer_id: customerId,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create dispute");
      }

      setSuccess("Dispute submitted successfully!");
      setTransferId("");
      setReason("");

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute");
    } finally {
      setSaving(false);
    }
  }

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(Number(amount || 0));
  }

  function formatDate(date?: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusStyle(status: string) {
    const value = status?.toUpperCase();

    if (value === "RESOLVED" || value === "COMPLETED") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (value === "REJECTED" || value === "FAILED") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              FINCORE / DISPUTES
            </p>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Disputes
            </h1>

            <p className="mt-2 text-slate-500">
              Review transactions and submit dispute requests.
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Total Disputes
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {disputes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Transfers
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-blue-600">
              {transfers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">
              Customers
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {customers.length}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Submit Dispute */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Submit Dispute
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Report a transaction issue.
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
                    setTransferId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Transfer *
                </label>

                <select
                  value={transferId}
                  onChange={(e) => setTransferId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">Select transfer</option>

                  {transfers.map((transfer) => (
                    <option key={transfer.id} value={transfer.id}>
                      {transfer.id.slice(0, 8)} —{" "}
                      {formatAmount(transfer.amount, transfer.currency)}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  The backend will validate that the transfer belongs to the customer.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Reason *
                </label>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why you are disputing this transaction..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Dispute"}
              </button>
            </form>
          </div>

          {/* Dispute History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Dispute History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  All submitted disputes.
                </p>
              </div>

              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search disputes..."
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center text-slate-500">
                Loading disputes...
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  🛡️
                </div>

                <h3 className="font-semibold text-slate-900">
                  No disputes found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Disputes will appear here after submission.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          Dispute #{dispute.id.slice(0, 8)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Transfer: {dispute.transfer_id}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Customer: {dispute.customer_id}
                        </p>
                      </div>

                      <span
                        className={`h-fit rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(
                          dispute.status || "SUBMITTED"
                        )}`}
                      >
                        {dispute.status || "SUBMITTED"}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-medium text-slate-500">
                        Reason
                      </p>

                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {dispute.reason}
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {formatDate(dispute.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-500">
              Showing {filteredDisputes.length} of {disputes.length} disputes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}