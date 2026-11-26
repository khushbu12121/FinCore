"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PageType =
  | "wallets"
  | "transfers"
  | "beneficiaries"
  | "payments"
  | "disputes"
  | "statements";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  status?: string;
};

type Wallet = {
  id: string;
  customer_id: string;
  full_name?: string;
  currency: string;
  balance: number | string;
  status?: string;
};

const API = "http://localhost:5001";

const pageConfig: Record<
  PageType,
  { title: string; subtitle: string; endpoint: string; createLabel: string }
> = {
  wallets: {
    title: "Wallets",
    subtitle: "Manage customer wallets and balances",
    endpoint: "/api/wallets",
    createLabel: "Wallet",
  },
  transfers: {
    title: "Transfers",
    subtitle: "View and monitor fund transfers",
    endpoint: "/api/transfers",
    createLabel: "Transfer",
  },
  beneficiaries: {
    title: "Beneficiaries",
    subtitle: "Manage saved beneficiaries",
    endpoint: "/api/beneficiaries",
    createLabel: "Beneficiary",
  },
  payments: {
    title: "Payments",
    subtitle: "Manage payment intents",
    endpoint: "/api/payment-intents",
    createLabel: "Payment",
  },
  disputes: {
    title: "Disputes",
    subtitle: "Track and manage transaction disputes",
    endpoint: "/api/disputes",
    createLabel: "Dispute",
  },
  statements: {
    title: "Statements",
    subtitle: "View wallet transaction statements",
    endpoint: "/api/statements",
    createLabel: "Statement",
  },
};

function formatValue(value: any, key: string) {
  if (value === null || value === undefined) return "—";

  if (
    key.toLowerCase().includes("amount") ||
    key.toLowerCase().includes("balance")
  ) {
    const number = Number(value);

    if (!Number.isNaN(number)) {
      return `₹${number.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }

  if (
    key.toLowerCase().includes("created_at") ||
    key.toLowerCase().includes("updated_at")
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN");
    }
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function labelFor(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(currency: string, amount: number | string) {
  return `${currency} ${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WorkspacePage({ page }: { page: PageType }) {
  const config = pageConfig[page];

  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  const [form, setForm] = useState<Record<string, string>>({});

  // Deposit states
  const [depositWallet, setDepositWallet] = useState<Wallet | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/customers`);

      if (!response.ok) return;

      const result = await response.json();
      setCustomers(result.customers || []);
    } catch {
      console.error("Unable to fetch customers");
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/wallets`);

      if (!response.ok) return;

      const result = await response.json();
      setWallets(result.wallets || []);
    } catch {
      console.error("Unable to fetch wallets");
    }
  }, []);

  const fetchData = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      let endpoint = config.endpoint;

      if (page === "beneficiaries") {
        if (!selectedCustomer) {
          setData([]);
          setLoading(false);
          return;
        }

        endpoint = `${API}/api/beneficiaries/${selectedCustomer}`;
      } else if (page === "statements") {
        if (!selectedWallet) {
          setData([]);
          setLoading(false);
          return;
        }

        endpoint = `${API}/api/statements/${selectedWallet}`;
      } else {
        endpoint = `${API}${config.endpoint}`;
      }

      const response = await fetch(endpoint);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch data");
      }

      let records: any[] = [];

      if (page === "wallets") records = result.wallets || [];
      if (page === "transfers") records = result.transactions || [];
      if (page === "beneficiaries") records = result.beneficiaries || [];
      if (page === "payments") records = result.paymentIntents || [];
      if (page === "disputes") records = result.disputes || [];
      if (page === "statements") records = result.statement || [];

      setData(records);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, page, selectedCustomer, selectedWallet]);

  useEffect(() => {
    fetchCustomers();
    fetchWallets();
  }, [fetchCustomers, fetchWallets]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = async () => {
    setRefreshing(true);

    await fetchData();
    await fetchWallets();
    await fetchCustomers();

    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const query = search.toLowerCase();

    return data.filter((record) =>
      Object.values(record).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [data, search]);

  const columns = useMemo(() => {
    if (!data.length) return [];

    return Object.keys(data[0]);
  }, [data]);

  const activeCount = data.filter(
    (record) => String(record.status || "").toUpperCase() === "ACTIVE"
  ).length;

  const pendingCount = data.filter(
    (record) => String(record.status || "").toUpperCase() === "PENDING"
  ).length;

  const updateForm = (key: string, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm({});
  };

  // =========================
  // DEPOSIT FUNCTION
  // =========================

  const submitDeposit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!depositWallet) return;

    const amount = Number(depositAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount.");
      return;
    }

    setDepositLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API}/api/wallets/${depositWallet.id}/deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            idempotency_key: crypto.randomUUID(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Deposit failed");
      }

      setSuccessMessage("Deposit completed successfully!");

      setDepositWallet(null);
      setDepositAmount("");

      await fetchData();
      await fetchWallets();
    } catch (err: any) {
      setError(err.message || "Deposit failed");
    } finally {
      setDepositLoading(false);
    }
  };

  // =========================
  // CREATE FUNCTION
  // =========================

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccessMessage("");

    let endpoint = "";
    let payload: Record<string, any> = {};

    // Create Wallet
    if (page === "wallets") {
      if (!form.customer_id) {
        setError("Please select a customer.");
        return;
      }

      endpoint = `${API}/api/wallets`;

      payload = {
        customer_id: form.customer_id,
        currency: form.currency || "INR",
      };
    }

    // Create Transfer
    if (page === "transfers") {
      const sender = wallets.find(
        (wallet) => wallet.id === form.from_wallet_id
      );

      const receiver = wallets.find(
        (wallet) => wallet.id === form.to_wallet_id
      );

      if (!sender || !receiver) {
        setError("Please select valid sender and receiver wallets.");
        return;
      }

      if (sender.id === receiver.id) {
        setError("Sender and receiver wallets must be different.");
        return;
      }

      if (sender.currency !== receiver.currency) {
        setError(
          `Currency mismatch. Sender has ${sender.currency} and receiver has ${receiver.currency}.`
        );
        return;
      }

      const amount = Number(form.amount);
      const senderBalance = Number(sender.balance);

      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Please enter a valid transfer amount.");
        return;
      }

      if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) {
        setError("Amount can have a maximum of 2 decimal places.");
        return;
      }

      if (amount > senderBalance) {
        setError(
          `Insufficient balance. Available balance: ${money(
            sender.currency,
            sender.balance
          )}`
        );
        return;
      }

      const confirmed = window.confirm(
        `Confirm transfer?\n\nAmount: ${money(sender.currency, amount)}\n\nFrom: ${
          sender.full_name || sender.id
        }\n\nTo: ${receiver.full_name || receiver.id}`
      );

      if (!confirmed) return;

      endpoint = `${API}/api/transfers`;

      payload = {
        from_wallet_id: form.from_wallet_id,
        to_wallet_id: form.to_wallet_id,
        amount,
        idempotency_key: crypto.randomUUID(),
      };
    }

    // Create Beneficiary
    if (page === "beneficiaries") {
      if (!form.customer_id) {
        setError("Please select a customer.");
        return;
      }

      endpoint = `${API}/api/beneficiaries`;

      payload = {
        customer_id: form.customer_id,
        beneficiary_name: form.beneficiary_name,
        account_reference: form.account_reference,
        bank_name: form.bank_name || undefined,
      };
    }

    // Create Payment
    if (page === "payments") {
      const amount = Number(form.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Please enter a valid payment amount.");
        return;
      }

      if (!form.customer_id || !form.wallet_id) {
        setError("Please select customer and wallet.");
        return;
      }

      const selectedPaymentWallet = wallets.find(
        (wallet) => wallet.id === form.wallet_id
      );

      if (
        selectedPaymentWallet &&
        selectedPaymentWallet.customer_id !== form.customer_id
      ) {
        setError("Selected wallet does not belong to this customer.");
        return;
      }

      if (
        selectedPaymentWallet &&
        selectedPaymentWallet.currency !== (form.currency || "INR")
      ) {
        setError(
          `Wallet currency is ${selectedPaymentWallet.currency}. Please select matching currency.`
        );
        return;
      }

      endpoint = `${API}/api/payment-intents`;

      payload = {
        customer_id: form.customer_id,
        wallet_id: form.wallet_id,
        amount,
        currency: form.currency || "INR",
      };
    }

    // Create Dispute
    if (page === "disputes") {
      endpoint = `${API}/api/disputes`;

      payload = {
        transfer_id: form.transfer_id,
        customer_id: form.customer_id,
        reason: form.reason,
      };
    }

    setSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Request failed");
      }

      setSuccessMessage(result.message || "Created successfully!");

      closeForm();

      await fetchData();
      await fetchWallets();
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message || "Unable to complete request");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // FORM FIELDS
  // =========================

  const renderFormFields = () => {
    if (page === "wallets") {
      return (
        <>
          <Field label="Customer">
            <select
              required
              value={form.customer_id || ""}
              onChange={(e) => updateForm("customer_id", e.target.value)}
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} — {customer.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Currency">
            <input
              value={form.currency || "INR"}
              onChange={(e) =>
                updateForm("currency", e.target.value.toUpperCase())
              }
              maxLength={3}
              required
            />
          </Field>
        </>
      );
    }

    // =========================
    // TRANSFER FORM
    // =========================

    if (page === "transfers") {
      const senderWallet = wallets.find(
        (wallet) => wallet.id === form.from_wallet_id
      );

      const receiverWallet = wallets.find(
        (wallet) => wallet.id === form.to_wallet_id
      );

      const availableReceiverWallets = wallets.filter((wallet) => {
        if (wallet.id === form.from_wallet_id) return false;

        if (senderWallet && wallet.currency !== senderWallet.currency) {
          return false;
        }

        return true;
      });

      return (
        <>
          <Field label="From Wallet">
            <select
              required
              value={form.from_wallet_id || ""}
              onChange={(e) => {
                updateForm("from_wallet_id", e.target.value);
                updateForm("to_wallet_id", "");
              }}
            >
              <option value="">Select sender wallet</option>

              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.full_name || wallet.id} · {wallet.currency} · Balance:{" "}
                  {money(wallet.currency, wallet.balance)}
                </option>
              ))}
            </select>
          </Field>

          {senderWallet && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-blue-600">Available Balance</p>

              <p className="mt-1 text-xl font-bold text-blue-900">
                {money(senderWallet.currency, senderWallet.balance)}
              </p>

              <p className="mt-1 break-all text-xs text-blue-700">
                Wallet ID: {senderWallet.id}
              </p>
            </div>
          )}

          <Field label="To Wallet">
            <select
              required
              value={form.to_wallet_id || ""}
              disabled={!form.from_wallet_id}
              onChange={(e) => updateForm("to_wallet_id", e.target.value)}
            >
              <option value="">
                {form.from_wallet_id
                  ? "Select receiver wallet"
                  : "Select sender wallet first"}
              </option>

              {availableReceiverWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.full_name || wallet.id} · {wallet.currency}
                </option>
              ))}
            </select>
          </Field>

          {receiverWallet && senderWallet && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
              ✓ Currency matches: {senderWallet.currency}
            </div>
          )}

          <Field label={`Amount (${senderWallet?.currency || "Currency"})`}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Enter transfer amount"
              value={form.amount || ""}
              onChange={(e) => updateForm("amount", e.target.value)}
            />
          </Field>

          {senderWallet && form.amount && Number(form.amount) > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="text-slate-600">Transfer Preview</p>

              <p className="mt-1 font-semibold text-slate-900">
                {money(senderWallet.currency, form.amount)}
              </p>

              {Number(form.amount) > Number(senderWallet.balance) && (
                <p className="mt-2 text-red-600">
                  ⚠ Insufficient balance
                </p>
              )}

              {Number(form.amount) <= Number(senderWallet.balance) && (
                <p className="mt-2 text-green-700">
                  Remaining balance:{" "}
                  {money(
                    senderWallet.currency,
                    Number(senderWallet.balance) - Number(form.amount)
                  )}
                </p>
              )}
            </div>
          )}
        </>
      );
    }

    // =========================
    // BENEFICIARIES
    // =========================

    if (page === "beneficiaries") {
      return (
        <>
          <Field label="Customer">
            <select
              required
              value={form.customer_id || ""}
              onChange={(e) => updateForm("customer_id", e.target.value)}
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Beneficiary Name">
            <input
              required
              value={form.beneficiary_name || ""}
              onChange={(e) =>
                updateForm("beneficiary_name", e.target.value)
              }
            />
          </Field>

          <Field label="Account Reference">
            <input
              required
              value={form.account_reference || ""}
              onChange={(e) =>
                updateForm("account_reference", e.target.value)
              }
            />
          </Field>

          <Field label="Bank Name">
            <input
              value={form.bank_name || ""}
              onChange={(e) => updateForm("bank_name", e.target.value)}
            />
          </Field>
        </>
      );
    }

    // =========================
    // PAYMENTS
    // =========================

    if (page === "payments") {
      const customerWallets = wallets.filter(
        (wallet) => wallet.customer_id === form.customer_id
      );

      return (
        <>
          <Field label="Customer">
            <select
              required
              value={form.customer_id || ""}
              onChange={(e) => {
                updateForm("customer_id", e.target.value);
                updateForm("wallet_id", "");
              }}
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Wallet">
            <select
              required
              disabled={!form.customer_id}
              value={form.wallet_id || ""}
              onChange={(e) => {
                const walletId = e.target.value;
                updateForm("wallet_id", walletId);

                const wallet = wallets.find((w) => w.id === walletId);

                if (wallet) {
                  updateForm("currency", wallet.currency);
                }
              }}
            >
              <option value="">Select wallet</option>

              {customerWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.full_name || wallet.id} — {wallet.currency} —{" "}
                  {money(wallet.currency, wallet.balance)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Amount">
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.amount || ""}
              onChange={(e) => updateForm("amount", e.target.value)}
            />
          </Field>

          <Field label="Currency">
            <input
              required
              maxLength={3}
              value={form.currency || "INR"}
              onChange={(e) =>
                updateForm("currency", e.target.value.toUpperCase())
              }
            />
          </Field>
        </>
      );
    }

    // =========================
    // DISPUTES
    // =========================

    if (page === "disputes") {
      return (
        <>
          <Field label="Transfer ID">
            <input
              required
              value={form.transfer_id || ""}
              onChange={(e) => updateForm("transfer_id", e.target.value)}
              placeholder="Enter transfer UUID"
            />
          </Field>

          <Field label="Customer">
            <select
              required
              value={form.customer_id || ""}
              onChange={(e) => updateForm("customer_id", e.target.value)}
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reason">
            <textarea
              required
              rows={3}
              value={form.reason || ""}
              onChange={(e) => updateForm("reason", e.target.value)}
            />
          </Field>
        </>
      );
    }

    return null;
  };

  // =========================
  // PAGE UI
  // =========================

  return (
    <div className="space-y-6">
      {/* Page Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {config.title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">{config.subtitle}</p>
        </div>

        {page !== "statements" && (
          <button
            onClick={() => {
              setError("");
              setSuccessMessage("");
              setForm({});
              setShowForm(true);
            }}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Create New
          </button>
        )}
      </div>

      {/* Special Selectors */}

      {page === "beneficiaries" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Select Customer
          </label>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Choose customer to view beneficiaries</option>

            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name} — {customer.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {page === "statements" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Select Wallet
          </label>

          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Choose wallet to view statement</option>

            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.full_name || wallet.id} — {wallet.currency} — Balance:{" "}
                {money(wallet.currency, wallet.balance)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notifications */}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Records"
          value={data.length.toLocaleString("en-IN")}
          description="Records currently loaded"
        />

        <SummaryCard
          title="Active Records"
          value={activeCount.toLocaleString("en-IN")}
          description="Records with active status"
        />

        <SummaryCard
          title="Pending Records"
          value={pendingCount.toLocaleString("en-IN")}
          description="Records awaiting processing"
        />
      </div>

      {/* Data Table */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              {page === "statements" ? "Transaction Statement" : config.title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {filteredData.length} record(s)
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-64"
            />

            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-10 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-medium text-slate-700">Unable to load records</p>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <button
              onClick={refresh}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl">📂</div>

            <h3 className="mt-3 font-semibold text-slate-800">
              No records found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try changing your search."
                : "No records available for this section yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap px-4 py-3 font-semibold"
                    >
                      {labelFor(column)}
                    </th>
                  ))}

                  {page === "wallets" && (
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredData.map((record, index) => (
                  <tr
                    key={record.id || record.reference || index}
                    className="transition hover:bg-slate-50"
                  >
                    {columns.map((column) => {
                      const value = record[column];

                      const isStatus = column.toLowerCase().includes("status");

                      return (
                        <td
                          key={column}
                          className="whitespace-nowrap px-4 py-3 text-slate-700"
                        >
                          {isStatus ? (
                            <StatusBadge value={value} />
                          ) : (
                            <span
                              className={
                                column === "id" || column.includes("_id")
                                  ? "font-mono text-xs"
                                  : ""
                              }
                            >
                              {formatValue(value, column)}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Wallet Deposit Action */}

                    {page === "wallets" && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setError("");
                            setSuccessMessage("");
                            setDepositWallet(record as Wallet);
                            setDepositAmount("");
                          }}
                          className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          + Deposit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}

      {depositWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Deposit Money
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add funds to wallet
                </p>
              </div>

              <button
                onClick={() => setDepositWallet(null)}
                disabled={depositLoading}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Wallet ID</p>

              <p className="mt-1 break-all font-mono text-sm text-slate-800">
                {depositWallet.id}
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Current Balance:{" "}
                <strong>
                  {money(depositWallet.currency, depositWallet.balance)}
                </strong>
              </p>
            </div>

            <form onSubmit={submitDeposit} className="space-y-4">
              <Field label={`Deposit Amount (${depositWallet.currency})`}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </Field>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setDepositWallet(null)}
                  disabled={depositLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={depositLoading}
                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {depositLoading ? "Processing..." : "Confirm Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create {config.createLabel}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details below
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={submitting}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitForm} className="space-y-4">
              {renderFormFields()}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// FIELD COMPONENT
// =========================

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="w-full [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:outline-none [&_input]:focus:border-blue-500 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:outline-none [&_select]:focus:border-blue-500 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea]:focus:border-blue-500">
        {children}
      </div>
    </div>
  );
}

// =========================
// SUMMARY CARD
// =========================

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

// =========================
// STATUS BADGE
// =========================

function StatusBadge({ value }: { value: any }) {
  const status = String(value || "UNKNOWN").toUpperCase();

  let classes = "bg-slate-100 text-slate-600";

  if (["ACTIVE", "SUCCEEDED", "COMPLETED", "SUCCESS"].includes(status)) {
    classes = "bg-green-100 text-green-700";
  } else if (["PENDING", "PROCESSING", "IN_PROGRESS"].includes(status)) {
    classes = "bg-yellow-100 text-yellow-700";
  } else if (
    ["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(status)
  ) {
    classes = "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}