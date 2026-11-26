
"use client";

import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5001/api";

type Customer = {
  id: string;
  full_name: string;
  email: string;
};

type Beneficiary = {
  id: string;
  customer_id: string;
  beneficiary_name: string;
  account_reference: string;
  bank_name?: string;
  created_at?: string;
};

export default function BeneficiariesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [name, setName] = useState("");
  const [accountReference, setAccountReference] = useState("");
  const [bankName, setBankName] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCustomers() {
    const response = await fetch(`${API}/customers`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load customers");
    }

    setCustomers(data.customers || []);
  }

  async function loadBeneficiaries(customerId: string) {
    if (!customerId) {
      setBeneficiaries([]);
      return;
    }

    const response = await fetch(`${API}/beneficiaries/${customerId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load beneficiaries");
    }

    setBeneficiaries(data.beneficiaries || []);
  }

  async function refreshData() {
    setLoading(true);
    setError("");

    try {
      await loadCustomers();

      if (selectedCustomer) {
        await loadBeneficiaries(selectedCustomer);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialLoad() {
      try {
        await loadCustomers();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load customers"
        );
      } finally {
        setLoading(false);
      }
    }

    initialLoad();
  }, []);

  useEffect(() => {
    async function fetchBeneficiaries() {
      if (!selectedCustomer) {
        setBeneficiaries([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        await loadBeneficiaries(selectedCustomer);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load beneficiaries"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBeneficiaries();
  }, [selectedCustomer]);

  const filteredBeneficiaries = useMemo(() => {
    const searchTerm = search.toLowerCase();

    return beneficiaries.filter((beneficiary) =>
      [
        beneficiary.beneficiary_name,
        beneficiary.account_reference,
        beneficiary.bank_name || "",
      ].some((value) => value.toLowerCase().includes(searchTerm))
    );
  }, [beneficiaries, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedCustomer) {
      setError("Please select a customer first.");
      return;
    }

    if (!name.trim() || !accountReference.trim()) {
      setError("Beneficiary name and account reference are required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/beneficiaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: selectedCustomer,
          beneficiary_name: name.trim(),
          account_reference: accountReference.trim(),
          bank_name: bankName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add beneficiary");
      }

      setName("");
      setAccountReference("");
      setBankName("");

      setSuccess("Beneficiary added successfully!");

      await loadBeneficiaries(selectedCustomer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCustomerDetails = customers.find(
    (customer) => customer.id === selectedCustomer
  );

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Beneficiaries
            </h1>

            <p className="mt-2 text-gray-500">
              Manage trusted recipients for money transfers
            </p>
          </div>

          <button
            onClick={refreshData}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            ↻ Refresh Data
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Beneficiaries
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {beneficiaries.length}
            </p>

            <p className="mt-2 text-sm text-gray-400">
              For the selected customer
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Selected Customer
            </p>

            <p className="mt-3 truncate text-xl font-semibold text-gray-900">
              {selectedCustomerDetails?.full_name || "None selected"}
            </p>

            <p className="mt-2 truncate text-sm text-gray-400">
              {selectedCustomerDetails?.email || "Choose a customer below"}
            </p>
          </div>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Add Beneficiary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add Beneficiary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Add a recipient to your customer's account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Customer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Customer *
                </label>

                <select
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    setSuccess("");
                    setError("");
                  }}
                  className={inputClass}
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} — {customer.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Beneficiary Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Beneficiary Name *
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter beneficiary name"
                  className={inputClass}
                />
              </div>

              {/* Account Reference */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Account Reference *
                </label>

                <input
                  type="text"
                  value={accountReference}
                  onChange={(e) => setAccountReference(e.target.value)}
                  placeholder="Account number / reference"
                  className={inputClass}
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Bank Name
                </label>

                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Enter bank name (optional)"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !selectedCustomer}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Adding..." : "+ Add Beneficiary"}
              </button>
            </form>
          </div>

          {/* Beneficiary List */}
          <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Beneficiary List
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  View and search saved recipients
                </p>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search beneficiaries..."
                className={`${inputClass} sm:w-64`}
              />
            </div>

            {!selectedCustomer ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-gray-50 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  👥
                </div>

                <h3 className="font-semibold text-gray-900">
                  Select a customer
                </h3>

                <p className="mt-2 max-w-sm text-sm text-gray-500">
                  Select a customer from the form to view their saved beneficiaries.
                </p>
              </div>
            ) : loading ? (
              <div className="flex min-h-[300px] items-center justify-center text-gray-500">
                Loading beneficiaries...
              </div>
            ) : filteredBeneficiaries.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-gray-50 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  🏦
                </div>

                <h3 className="font-semibold text-gray-900">
                  {search
                    ? "No matching beneficiaries"
                    : "No beneficiaries yet"}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {search
                    ? "Try searching with a different name or account reference."
                    : "Add your first beneficiary using the form."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBeneficiaries.map((beneficiary) => (
                  <div
                    key={beneficiary.id}
                    className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl">
                        👤
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {beneficiary.beneficiary_name}
                        </p>

                        <p className="mt-1 break-all text-sm text-gray-500">
                          {beneficiary.account_reference}
                        </p>

                        {beneficiary.bank_name && (
                          <p className="mt-1 text-xs text-gray-400">
                            🏦 {beneficiary.bank_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        ✓ Saved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500">
              Showing {filteredBeneficiaries.length} of {beneficiaries.length} beneficiaries
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
