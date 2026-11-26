"use client";

import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:5001";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  status: string;
};

type Wallet = {
  id: string;
  customer_id: string;
  full_name?: string;
  currency: string;
  balance: number | string;
  status: string;
};

type Transfer = {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number | string;
  currency: string;
  status: string;
  created_at: string;
};

type Payment = {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  created_at: string;
};

type Dispute = {
  id: string;
  status: string;
  reason?: string;
  created_at: string;
};

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setError("");

    try {
      const [
        customersResponse,
        walletsResponse,
        transfersResponse,
        paymentsResponse,
        disputesResponse,
      ] = await Promise.all([
        fetch(`${API}/api/customers`),
        fetch(`${API}/api/wallets`),
        fetch(`${API}/api/transfers`),
        fetch(`${API}/api/payment-intents`),
        fetch(`${API}/api/disputes`),
      ]);

      const [
        customersData,
        walletsData,
        transfersData,
        paymentsData,
        disputesData,
      ] = await Promise.all([
        customersResponse.json(),
        walletsResponse.json(),
        transfersResponse.json(),
        paymentsResponse.json(),
        disputesResponse.json(),
      ]);

      if (
        !customersResponse.ok ||
        !walletsResponse.ok ||
        !transfersResponse.ok ||
        !paymentsResponse.ok ||
        !disputesResponse.ok
      ) {
        throw new Error("Unable to load dashboard data");
      }

      setCustomers(customersData.customers || []);
      setWallets(walletsData.wallets || []);
      setTransfers(transfersData.transactions || []);
      setPayments(paymentsData.paymentIntents || []);
      setDisputes(disputesData.disputes || []);
    } catch (err: any) {
      setError(err.message || "Could not connect to backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const totalWalletBalance = wallets.reduce((sum, wallet) => {
    const balance = Number(wallet.balance);

    return sum + (Number.isFinite(balance) ? balance : 0);
  }, 0);

  const activeCustomers = customers.filter(
    (customer) => customer.status === "ACTIVE"
  ).length;

  const activeWallets = wallets.filter(
    (wallet) => wallet.status === "ACTIVE"
  ).length;

  const pendingPayments = payments.filter(
    (payment) => payment.status === "PENDING"
  ).length;

  const pendingDisputes = disputes.filter(
    (dispute) => dispute.status === "PENDING"
  ).length;

  const completedTransfers = transfers.filter((transfer) =>
    ["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(
      transfer.status?.toUpperCase()
    )
  ).length;

  const recentTransfers = [...transfers]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  const formatCurrency = (value: number) =>
    value.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (value: string) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Real-time overview of your FinCore banking system
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={refreshing}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "↻ Refresh Data"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}

          <button
            onClick={refresh}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={loading ? "..." : customers.length.toLocaleString("en-IN")}
          description={`${activeCustomers} active customers`}
          icon="👥"
          color="blue"
        />

        <StatCard
          title="Total Wallets"
          value={loading ? "..." : wallets.length.toLocaleString("en-IN")}
          description={`${activeWallets} active wallets`}
          icon="💳"
          color="purple"
        />

        <StatCard
          title="Total Wallet Balance"
          value={loading ? "..." : formatCurrency(totalWalletBalance)}
          description="Combined wallet balances"
          icon="💰"
          color="green"
        />

        <StatCard
          title="Transfers"
          value={loading ? "..." : transfers.length.toLocaleString("en-IN")}
          description={`${completedTransfers} completed`}
          icon="↔️"
          color="orange"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Payment Intents"
          value={loading ? "..." : payments.length.toLocaleString("en-IN")}
          description={`${pendingPayments} pending`}
          icon="📄"
          color="blue"
        />

        <StatCard
          title="Disputes"
          value={loading ? "..." : disputes.length.toLocaleString("en-IN")}
          description={`${pendingDisputes} pending`}
          icon="⚠️"
          color="red"
        />

        <StatCard
          title="System Status"
          value={error ? "Error" : loading ? "Loading..." : "Connected"}
          description="Backend API connection"
          icon="🟢"
          color="green"
        />
      </div>

      {/* Recent Transfers */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-semibold text-slate-900">
              Recent Transfers
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Latest transfer activity
            </p>
          </div>

          <a
            href="/transfers"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </a>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : recentTransfers.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl">↔️</div>

            <p className="mt-3 font-medium text-slate-800">
              No transfers yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Transactions will appear here when created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Transfer ID</th>
                  <th className="px-5 py-3 font-semibold">From Wallet</th>
                  <th className="px-5 py-3 font-semibold">To Wallet</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentTransfers.map((transfer) => (
                  <tr
                    key={transfer.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {transfer.id}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {transfer.from_wallet_id}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {transfer.to_wallet_id}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {formatCurrency(Number(transfer.amount))}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={transfer.status} />
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(transfer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Wallet Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Wallet Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current wallet distribution
          </p>

          <div className="mt-5 space-y-4">
            <OverviewRow
              label="Active Wallets"
              value={activeWallets}
              total={wallets.length}
              color="bg-green-500"
            />

            <OverviewRow
              label="Inactive Wallets"
              value={wallets.length - activeWallets}
              total={wallets.length}
              color="bg-slate-400"
            />
          </div>
        </div>

        {/* Activity Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Activity Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current transaction activity
          </p>

          <div className="mt-5 space-y-3">
            <ActivityRow
              label="Payments"
              count={payments.length}
              color="blue"
            />

            <ActivityRow
              label="Transfers"
              count={transfers.length}
              color="green"
            />

            <ActivityRow
              label="Disputes"
              count={disputes.length}
              color="red"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* STAT CARD */
/* ============================= */

function StatCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    green: "bg-green-50",
    orange: "bg-orange-50",
    red: "bg-red-50",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
            colors[color] || "bg-slate-100"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ============================= */
/* OVERVIEW ROW */
/* ============================= */

function OverviewRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>

        <span className="font-semibold text-slate-900">
          {value} ({percentage.toFixed(0)}%)
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* ============================= */
/* ACTIVITY ROW */
/* ============================= */

function ActivityRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
      <span className="text-sm text-slate-700">{label}</span>

      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          colors[color] || "bg-slate-100 text-slate-700"
        }`}
      >
        {count}
      </span>
    </div>
  );
}

/* ============================= */
/* STATUS BADGE */
/* ============================= */

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "UNKNOWN").toUpperCase();

  let classes = "bg-slate-100 text-slate-600";

  if (
    ["COMPLETED", "SUCCESS", "SUCCEEDED", "ACTIVE"].includes(normalized)
  ) {
    classes = "bg-green-100 text-green-700";
  } else if (
    ["PENDING", "PROCESSING", "IN_PROGRESS"].includes(normalized)
  ) {
    classes = "bg-yellow-100 text-yellow-700";
  } else if (
    ["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(normalized)
  ) {
    classes = "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {normalized}
    </span>
  );
}