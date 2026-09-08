"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Pill,
  Settings,
  Shield,
  ShieldAlert,
  Stethoscope,
  User as UserIcon,
  Activity,
} from "lucide-react";
import { Badge } from "./badge";
import {
  UserProfileData,
  UserProfileModal,
  SessionData,
} from "./UserProfileModal";

export interface UserProfileDropdownProps {
  user: UserProfileData;
  adminDeskHref?: string;
  superAdminHref?: string;
  onLogout: () => Promise<void> | void;
  onUpdateProfile?: (data: any) => Promise<void>;
  onChangePassword?: (data: any) => Promise<void>;
  onRevokeAllSessions?: () => Promise<void>;
  sessions?: SessionData[];
  /** Anchor side the flyout grows FROM. "right" (default): flyout grows LEFTWARD from right edge of trigger (Header top-right use case). "left": flyout grows RIGHTWARD from left edge of trigger (sidebar use case, avoids overflowing off-sidebar-left). */
  side?: "right" | "left";
  /** Visual style for the trigger button. "header" (default): light-theme hover bg, bold title + role badge. "sidebar": dark-theme tokens, text-white name + teal-400 uppercase role badge, w-full left-aligned. */
  variant?: "header" | "sidebar";
}

function getInitials(fullName?: string | null): string {
  if (!fullName) return "U";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function UserProfileDropdown({
  user,
  adminDeskHref,
  superAdminHref = "/super-admin",
  onLogout,
  onUpdateProfile,
  onChangePassword,
  onRevokeAllSessions,
  sessions,
  side = "right",
  variant = "header",
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "security" | "sessions">("profile");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setConfirmSignOut(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return { label: "SUPER ADMIN", bg: "bg-purple-100 text-purple-800 border-purple-200" };
      case "HOSPITAL_ADMIN":
      case "TENANT_ADMIN":
        return { label: "HOSPITAL ADMIN", bg: "bg-amber-100 text-amber-800 border-amber-200" };
      case "DOCTOR":
        return { label: "DOCTOR", bg: "bg-teal-100 text-teal-800 border-teal-200" };
      case "NURSE":
        return { label: "NURSE", bg: "bg-cyan-100 text-cyan-800 border-cyan-200" };
      case "HOSPITAL_FINANCE":
        return { label: "HOSPITAL FINANCE", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "PHARMACY_ADMIN":
        return { label: "PHARMACY ADMIN", bg: "bg-blue-100 text-blue-800 border-blue-200" };
      case "PHARMACY_FINANCE":
        return { label: "PHARMACY FINANCE", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "SUPERINTENDENT_PHARMACIST":
        return { label: "SUPERINTENDENT PHARM", bg: "bg-rose-100 text-rose-800 border-rose-200" };
      case "PHARMACIST":
        return { label: "PHARMACIST", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "PATIENT":
        return { label: "PATIENT", bg: "bg-slate-100 text-slate-800 border-slate-200" };
      default:
        return { label: role, bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  const handleLogoutClick = async () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      return;
    }
    setIsLoggingOut(true);
    try {
      // Clear auth cookies across domain
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      
      // Clear storage
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          sessionStorage.clear();
        } catch {}
      }

      if (onLogout) {
        await onLogout();
      } else {
        window.location.href = "/login?logout=true";
      }
    } catch (err) {
      console.error("Logout failed", err);
      window.location.href = "/login?logout=true";
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="relative inline-block w-max text-right" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={
            variant === "sidebar"
              ? "flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-900 transition focus:outline-none focus:ring-2 focus:ring-teal-500/40 w-full text-left"
              : "flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/80 transition focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          }
        >
          <div className="hidden md:block text-right min-w-0 max-w-[200px] ml-auto">
            <p className={
              variant === "sidebar"
                ? "text-white font-semibold text-xs truncate leading-none"
                : "text-xs font-bold text-slate-800 leading-none truncate"
            }>
              {user.fullName || "Account"}
            </p>
            <span className={
              variant === "sidebar"
                ? "text-teal-400 font-bold text-[9px] uppercase tracking-wider inline-block px-1.5 py-0.2 rounded mt-0.5 border border-teal-500/40 bg-teal-500/10"
                : `inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded mt-0.5 border ${roleInfo.bg}`
            }>
              {roleInfo.label}
            </span>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-xs shadow-sm shadow-teal-700/20">
            {getInitials(user.fullName)}
          </div>
        </button>

        {isOpen && (
          <div className={`absolute mt-2 w-full max-w-[min(280px,calc(100vw-16px))] sm:w-[280px] rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150 ${ side === "left" ? "left-0 origin-top-left [transform-origin:top_left]" : "left-auto right-0 origin-top-right [transform-origin:top_right]" }`}>
            {/* Header info */}
            <div className="px-4 py-2.5 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.fullName}
                </p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
              {user.tenantName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
                  <Building2 className="h-3 w-3 text-teal-600 flex-shrink-0" />
                  <span className="truncate">{user.tenantName}</span>
                </div>
              )}
            </div>

            {/* Menu options */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setModalTab("profile");
                  setModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition"
              >
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                Account Settings
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalTab("security");
                  setModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                Security & Password
              </button>

              {/* Dynamic Role Shortcut Links */}
              {user.role === "DOCTOR" && (
                <a
                  href="/doctor"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition border-t border-slate-100"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                  Doctor Workstation
                </a>
              )}

              {user.role === "NURSE" && (
                <a
                  href="/nurse"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 transition border-t border-slate-100"
                >
                  <Activity className="h-3.5 w-3.5 text-cyan-600" />
                  Triage & Vitals Desk
                </a>
              )}

              {user.role === "HOSPITAL_FINANCE" && (
                <a
                  href="/hospital-finance"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition border-t border-slate-100"
                >
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  Hospital Cashier & Card Fees
                </a>
              )}

              {(user.role === "HOSPITAL_ADMIN" || user.role === "TENANT_ADMIN") && (
                <a
                  href="/hospital-admin"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition border-t border-slate-100"
                >
                  <Settings className="h-3.5 w-3.5 text-amber-600" />
                  Hospital Admin Desk
                </a>
              )}

              {user.role === "PHARMACY_ADMIN" && (
                <a
                  href="/pharmacy-admin"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition border-t border-slate-100"
                >
                  <Settings className="h-3.5 w-3.5 text-blue-600" />
                  Pharmacy Admin Desk
                </a>
              )}

              {user.role === "PHARMACY_FINANCE" && (
                <a
                  href="/pharmacy-finance"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition border-t border-slate-100"
                >
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  Escrow Ledger & MoMo
                </a>
              )}

              {user.role === "SUPERINTENDENT_PHARMACIST" && (
                <a
                  href="/superintendent"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition border-t border-slate-100"
                >
                  <Pill className="h-3.5 w-3.5 text-rose-600" />
                  Dangerous Drugs & Quarantine
                </a>
              )}

              {user.role === "PHARMACIST" && (
                <a
                  href="/dispensary"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition border-t border-slate-100"
                >
                  <Pill className="h-3.5 w-3.5 text-emerald-600" />
                  Dispensary Counter POS
                </a>
              )}

              {user.role === "SUPER_ADMIN" && (
                <a
                  href={superAdminHref}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition border-t border-slate-100"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
                  Platform Super Admin (Zero-PHI)
                </a>
              )}
            </div>

            {/* Sign Out Section */}
            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
                  confirmSignOut
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{confirmSignOut ? "Click again to confirm" : "Sign Out"}</span>
                </div>
                {isLoggingOut && (
                  <span className="text-[10px] animate-pulse">Ending session...</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={user}
        initialTab={modalTab}
        onUpdateProfile={onUpdateProfile}
        onChangePassword={onChangePassword}
        onRevokeAllSessions={onRevokeAllSessions}
        sessions={sessions}
      />
    </>
  );
}
