"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Stethoscope, Pill, Lock, HeartHandshake } from "lucide-react";
import { Button, MedipaediaLogo } from "@medipaedia/ui";

export default function PublicMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Public Marketing Topbar - Zero Authenticated User Leakage */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <MedipaediaLogo subBrand="care" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#features" className="hover:text-cyan-700 transition">
                Features
              </a>
              <a href="#network" className="hover:text-cyan-700 transition">
                Accredited Network
              </a>
              <a href="#how-it-works" className="hover:text-cyan-700 transition">
                How It Works
              </a>
              <a href="#portals" className="hover:text-cyan-700 transition">
                Enterprise Portals
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button
                variant="secondary"
                size="sm"
                className="font-bold text-xs shadow-sm shadow-cyan-600/20"
              >
                Sign In / Get Health Pass <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 w-full">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <HeartHandshake className="h-5 w-5 text-cyan-400" />
              <span>Medipaedia Care Ghana</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              National Health Exchange OS connecting hospitals, clinics, accredited pharmacies, and Ghanaian citizens.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider mb-3">Enterprise Portals</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="http://localhost:3000/doctor" className="hover:text-cyan-400 transition">Doctor Workstation</a></li>
              <li><a href="http://localhost:3000/nurse" className="hover:text-cyan-400 transition">Nurse Triage Desk</a></li>
              <li><a href="http://localhost:3000/hospital-finance" className="hover:text-cyan-400 transition">Hospital Cashier</a></li>
              <li><a href="http://localhost:3001/dispensary" className="hover:text-cyan-400 transition">Pharmacy POS</a></li>
              <li><a href="http://localhost:3001/superintendent" className="hover:text-cyan-400 transition">Superintendent Desk</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider mb-3">Governance & Standards</h4>
            <ul className="space-y-2 text-[11px]">
              <li>MOH Ghana Standard EMR</li>
              <li>Pharmacy Council Act 857</li>
              <li>Data Protection Act 2012 (Act 843)</li>
              <li>256-Bit TLS Multi-Tenant Encrypted</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider mb-3">Emergency Support</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ghana National Ambulance Service: <strong>112 / 193</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              National Health Helpdesk: <strong>+233 (0) 302 999 111</strong>
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-800 text-center text-[10px] text-slate-500">
          © 2026 Medipaedia Health Technologies Ltd. All rights reserved. Registered in Accra, Ghana.
        </div>
      </footer>
    </div>
  );
}
