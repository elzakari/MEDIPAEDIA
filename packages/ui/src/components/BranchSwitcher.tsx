"use client";

import React, { useState } from "react";
import { Building2, Check, ChevronDown, Sparkles, MapPin, Plus, Lock } from "lucide-react";
import { Badge } from "./badge";

export interface BranchItem {
  id: string;
  name: string;
  code: string;
  branch_type?: string;
  city?: string | null;
  is_main_hub?: boolean;
}

export interface BranchSwitcherProps {
  branches: BranchItem[];
  currentBranchId?: string;
  planCode?: string;
  planName?: string;
  defaultTenantName?: string;
  onSelectBranch?: (branchId: string) => void;
  onAddBranchClick?: () => void;
  onUpgradeClick?: () => void;
}

export function BranchSwitcher({
  branches = [],
  currentBranchId,
  planCode = "PLAN-GROWTH",
  planName = "Regional Growth Plan",
  defaultTenantName = "Healthcare Facility",
  onSelectBranch,
  onAddBranchClick,
  onUpgradeClick,
}: BranchSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isStarterPlan = planCode === "PLAN-STARTER";

  const fallbackMainName = `${defaultTenantName} - Main Hub`;

  const GENERIC_PLACEHOLDER_RE =
    /^(main\s*facility\s*hub|primary\s*medical\s*hub|main\s*hub)$/i;

  function normalizeBranchName(rawName: string | null | undefined): string {
    const name = (rawName || "").trim();
    if (!name) return fallbackMainName;
    if (GENERIC_PLACEHOLDER_RE.test(name)) return fallbackMainName;
    const lower = name.toLowerCase();
    if (lower.includes("main hub") && !lower.includes(defaultTenantName.toLowerCase())) {
      return `${defaultTenantName} - Main Hub`;
    }
    return name;
  }

  const resolveBranch = (b: BranchItem | undefined): BranchItem | undefined => {
    if (!b) return undefined;
    const normalized = normalizeBranchName(b.name);
    if (normalized === b.name) return b;
    return { ...b, name: normalized };
  };

  const baseSelected =
    resolveBranch(branches.find((b) => b.id === currentBranchId)) ||
    resolveBranch(branches.find((b) => b.is_main_hub)) ||
    resolveBranch(branches[0]);

  const normalizedBranches = branches.map((b) => ({
    ...b,
    name: normalizeBranchName(b.name),
  }));

  const selectedBranch: BranchItem = baseSelected || {
    id: "main-01",
    name: fallbackMainName,
    code: "MAIN-01",
    branch_type: "MAIN_HUB",
    is_main_hub: true,
  };

  // 1. Single Facility Plan (Starter) - Static Badge with Upgrade Tooltip
  if (isStarterPlan) {
    return (
      <div className="relative inline-flex items-center group w-full min-w-0">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 select-none w-full min-w-0"
          title={selectedBranch.name}
        >
          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate font-bold text-slate-800 min-w-0">
            {selectedBranch.name}
          </span>
          <span className="hidden lg:inline-flex text-[9px] font-mono uppercase bg-slate-200 text-slate-600 px-1 py-0.5 rounded shrink-0">
            {selectedBranch.code || "MAIN"}
          </span>
          <span className="hidden lg:inline text-[10px] text-slate-400">*</span>
          <span className="hidden lg:flex text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> Single Plan
          </span>
        </div>

        {/* Hover Tooltip for Starter Plan */}
        <div className="absolute top-full left-0 mt-1.5 hidden group-hover:block z-50 w-64 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 text-[11px] leading-relaxed">
          <p className="font-bold text-amber-400 flex items-center gap-1 mb-1">
            <Sparkles className="h-3 w-3" /> Multi-Branch Locked
          </p>
          <p className="text-slate-300">
            You are on the <span className="font-semibold text-white">Starter Plan</span> (1 location limit). Upgrade to Growth or Enterprise to manage multiple pavilions, satellite clinics, and Inter-Branch Transfers (IBT).
          </p>
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="mt-2 w-full py-1 text-center bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-[10px] transition"
            >
              Upgrade Facility Plan
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Multi-Branch Interactive Switcher (Growth / Enterprise)
  return (
    <div className="relative inline-block text-left w-full min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/80 text-xs font-semibold text-teal-950 transition shadow-xs w-full min-w-0"
        title={selectedBranch.name}
      >
        <Building2 className="h-3.5 w-3.5 text-teal-700 shrink-0" />
        <div className="text-left min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold truncate max-w-full min-w-0">
              {selectedBranch.name}
            </span>
            <span className="hidden lg:inline-flex text-[9px] font-mono uppercase bg-teal-200/80 text-teal-900 font-bold px-1 py-0.5 rounded shrink-0">
              {selectedBranch.code || "MAIN-01"}
            </span>
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-teal-700 ml-0.5 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-900/10 focus:outline-none z-50 border border-slate-200">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Facility Branches ({normalizedBranches.length})
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {planName.replace(" Plan", "")}
              </span>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {normalizedBranches.map((branch) => {
                const isSelected = branch.id === selectedBranch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      onSelectBranch?.(branch.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition ${
                      isSelected
                        ? "bg-teal-50 text-teal-900 font-semibold border border-teal-200"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 truncate">
                          {branch.name}
                        </p>
                        {branch.is_main_hub && (
                          <span className="text-[9px] font-bold px-1 py-0.2 bg-teal-100 text-teal-800 rounded">
                            HUB
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <span>Code: {branch.code}</span>
                        {branch.city && <span>* {branch.city}</span>}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-teal-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {onAddBranchClick && (
              <div className="pt-1.5 mt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddBranchClick();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-xl transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Open New Branch Location
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
