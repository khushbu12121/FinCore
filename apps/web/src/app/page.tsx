
"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5002";

export default function Home() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [c, w, t, p, d] = await Promise.all([
          fetch(`${API}/api/customers`),
          fetch(`${API}/api/wallets`),
          fetch(`${API}/api/transfers`),
          fetch(`${API}/api/payment-intents`),
          fetch(`${API}/api/disputes`)
        ]);

        const [cd, wd, td, pd, dd] = await Promise.all([
          c.json(), w.json(), t.json(), p.json(), d.json()
        ]);

        setCustomers(cd.customers || []);
        setWallets(wd.wallets || []);
        setTransfers(td.transactions || []);
        setPayments(pd.paymentIntents || []);
        setDisputes(dd.disputes || []);
      } catch (error) {
        console.error("Dashboard loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalBalance = wallets.reduce(
    (sum, wallet) => sum + Number(wallet.balance || 0), 0
  );

  const stats = [
    { label: "Customers", value: customers.length },
    { label: "Total Wallets", value: wallets.length },
    { label: "Transfers", value: transfers.length },
    { label: "Payment Intents", value: payments.length },
    { label: "Open Disputes", value: disputes.filter(d => d.status === "OPEN").length }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 p-6 md:block">
          <h1 className="text-2xl font-bold text-cyan-400">FinCore</h1>
          <p className="mt-2 text-sm text-slate-400">Digital Banking Platform</p>
          <nav className="mt-10 space-y-4 text-slate-300">
            <p className="rounded-lg bg-cyan-500/10 p-3 text-cyan-300">Dashboard</p>
            <p className="p-3">Customers</p>
            <p className="p-3">Wallets</p>
            <p className="p-3">Transfers</p>
            <p className="p-3">Beneficiaries</p>
            <p className="p-3">Payments</p>
            <p className="p-3">Disputes</p>
            <p className="p-3">Statements</p>
          </nav>
        </aside>

        <section className="flex-1 p-6 md:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">Dashboard</h2>
              <p className="mt-2 text-slate-400">
                Financial overview and transaction monitoring
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              ● Test Environment
            </span>
          </header>

          {loading ? (
            <p className="mt-12 text-slate-400">Loading dashboard...</p>
          ) : (
            <>
              <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950 to-slate-900 p-7">
                <p className="text-slate-300">Total Wallet Balance</p>
                <h3 className="mt-3 text-4xl font-bold">
                  ₹{totalBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2
                  })}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Aggregated demo wallet balances
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                    <p className="text-sm text-slate-400">{item.label}</p>
                    <p className="mt-3 text-3xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-5 text-xl font-semibold">Wallets</h3>
                  {wallets.map((wallet) => (
                    <div key={wallet.id}
                      className="flex justify-between border-b border-slate-800 py-4">
                      <div>
                        <p className="font-medium">{wallet.full_name}</p>
                        <p className="text-xs text-slate-400">{wallet.currency} · {wallet.status}</p>
                      </div>
                      <p className="font-semibold">
                        {wallet.currency} {Number(wallet.balance).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="mb-5 text-xl font-semibold">Recent Transfers</h3>
                  {transfers.slice(0, 5).map((item) => (
                    <div key={item.id}
                      className="flex justify-between border-b border-slate-800 py-4">
                      <div>
                        <p className="text-sm">{item.id.slice(0, 8)}...</p>
                        <p className="text-xs text-slate-400">{item.status}</p>
                      </div>
                      <p className="font-semibold">
                        ₹{Number(item.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {transfers.length === 0 && <p className="text-slate-400">No transfers yet</p>}
                </div>
              </div>

              <p className="mt-8 text-center text-xs text-slate-500">
                FinCore Demo · Simulated financial data · Not real banking
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
