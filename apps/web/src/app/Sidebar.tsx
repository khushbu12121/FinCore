"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: "⌂" },
  { name: "Customers", href: "/customers", icon: "👥" },
  { name: "Wallets", href: "/wallets", icon: "💳" },
  { name: "Transfers", href: "/transfers", icon: "↔" },
  { name: "Beneficiaries", href: "/beneficiaries", icon: "👤" },
  { name: "Payments", href: "/payments", icon: "💸" },
  { name: "Disputes", href: "/disputes", icon: "⚠" },
  { name: "Statements", href: "/statements", icon: "📄" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800">

      {/* BRAND */}
      <div className="border-b border-slate-100 px-5 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold text-white shadow-md shadow-blue-500/20">
            F
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              FinCore
            </h1>

            <p className="text-xs text-slate-500">
              Banking Platform
            </p>
          </div>
        </Link>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-3 py-6">
        <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-blue-600" />
                )}

                {/* Icon */}
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg transition-all ${
                    isActive
                      ? "bg-blue-100"
                      : "bg-slate-100 group-hover:bg-slate-200"
                  }`}
                >
                  {item.icon}
                </span>

                {/* Label */}
                <span>{item.name}</span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* SYSTEM STATUS */}
      <div className="mt-auto p-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-600">
              F
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                FinCore System
              </p>

              <p className="text-[10px] text-slate-400">
                System Status
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>

            <span className="text-xs font-medium text-green-700">
              Banking services active
            </span>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          FinCore Banking Platform
        </p>
      </div>
    </aside>
  );
}