"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  DollarSign,
  Pill,
  FileSpreadsheet,
  Activity,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Server,
  Mail,
} from "lucide-react";
import { Badge, MedipaediaLogo, UserProfileDropdown, LanguageSwitcher } from "@medipaedia/ui";

export default function SuperAdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const navItems = [
    { href: "/super-admin", label: "Mission Control Overview", icon: <Activity className="h-4 w-4" />, exact: true },
    { href: "/super-admin/infrastructure", label: "Infrastructure & DLQ", icon: <Server className="h-4 w-4" /> },
    { href: "/super-admin/smtp", label: "Email & SMTP Gateway", icon: <Mail className="h-4 w-4" /> },
    { href: "/super-admin/billing", label: "SaaS Plans & Multi-Country Billing", icon: <CreditCard className="h-4 w-4" /> },
    { href: "/super-admin/facilities", label: "Accredited Facilities", icon: <Building2 className="h-4 w-4" /> },
    { href: "/super-admin/settlements", label: "Escrow & Settlements", icon: <DollarSign className="h-4 w-4" /> },
    { href: "/super-admin/medications", label: "Global Drug Master", icon: <Pill className="h-4 w-4" /> },
    { href: "/super-admin/audit", label: "Platform Audit Trail", icon: <FileSpreadsheet className="h-4 w-4" /> },
  ];

  const isNavActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const handleLogout = () => {
    document.cookie = "access_token=; path=/; max-age=0;";
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B0F19] text-slate-100 selection:bg-purple-900 selection:text-white font-sans antialiased">
      {/* Sidebar Console Navigation */}
      <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 border-r border-slate-800/90 bg-[#0F172A] flex flex-col justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.35)]">
        <div className="p-5 space-y-6">
          {/* Brand header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
            <Link href="/super-admin" className="flex items-center gap-2 min-w-0 group">
              <MedipaediaLogo size="sm" theme="dark" subBrand="none" />
            </Link>
            <div className="flex items-center gap-1.5">
              <LanguageSwitcher theme="dark" size="sm" />
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-800/80 shrink-0 whitespace-nowrap shadow-xs">
                Tier 0
              </span>
            </div>
          </div>



          <div className="space-y-2">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-500 px-3 pb-0.5">
              Platform Mission Control
            </p>
            <nav className="space-y-1 pt-1">
              {navItems.map((item) => {
                const active = isNavActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 relative ${
                      active
                        ? "bg-gradient-to-r from-purple-900/80 via-purple-900/60 to-slate-900/80 text-white border border-purple-700/70 shadow-[0_4px_14px_rgba(124,58,237,0.22)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center h-6 w-6 rounded-lg transition-colors duration-200 ${
                        active
                          ? "bg-purple-500/90 text-white shadow-inner"
                          : "bg-slate-800/60 text-purple-400 group-hover:bg-slate-700/60 group-hover:text-purple-300"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 leading-tight tracking-tight">{item.label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-purple-300 shrink-0" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Security & User Governance Footer */}
        <div className="p-5 border-t border-slate-800/90 space-y-3.5 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent">
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-900/60 flex items-center gap-2.5 text-xs text-purple-300">
            <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-purple-900/70 shrink-0">
              <ShieldCheck className="h-4 w-4 text-purple-300 shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-purple-400">
                Zero-PHI Isolation
              </p>
              <p className="text-[11px] text-purple-300/80 font-semibold leading-tight pt-0.5">
                Platform Governance Active
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-purple-900/40 border border-purple-500/60">
                SA
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-white leading-tight truncate">Super Admin</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">admin@medipaedia.health</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 transition-colors duration-150 group"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 group-hover:-translate-x-px transition-transform duration-150" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Console Content Body */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0B0F19] text-slate-100">
        <div className="max-w-7xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}
