"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Phone,
  ShieldCheck,
  Smartphone,
  User as UserIcon,
  X,
} from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";

export interface UserProfileData {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  tenantName?: string;
  licenseNumber?: string;
  licensingBody?: string;
  department?: string;
  specialization?: string;
  ghanaCardId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
}

export interface SessionData {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceName: string;
  createdAt: number;
  lastActive: number;
  isCurrent?: boolean;
}

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileData;
  initialTab?: "profile" | "security" | "sessions";
  onUpdateProfile?: (data: {
    fullName?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergies?: string;
  }) => Promise<void>;
  onChangePassword?: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onRevokeAllSessions?: () => Promise<void>;
  sessions?: SessionData[];
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  initialTab = "profile",
  onUpdateProfile,
  onChangePassword,
  onRevokeAllSessions,
  sessions = [
    {
      sessionId: "sess-current",
      ipAddress: "127.0.0.1 (Localhost)",
      userAgent: "Chrome 124 / Windows 11",
      deviceName: "Primary Workstation",
      createdAt: Date.now() - 3600000 * 4,
      lastActive: Date.now(),
      isCurrent: true,
    },
  ],
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "sessions">(
    initialTab
  );

  // Profile Form State
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    user.emergencyContactName || ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    user.emergencyContactPhone || ""
  );
  const [allergies, setAllergies] = useState(user.allergies || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  // Sessions State
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  if (!isOpen) return null;

  // Password strength calculation
  const calculatePasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (pw.length >= 12) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;
    return score;
  };
  const pwStrength = calculatePasswordStrength(newPassword);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          fullName,
          phone,
          emergencyContactName,
          emergencyContactPhone,
          allergies,
        });
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile attributes.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation password do not match.");
      return;
    }

    setPwSaving(true);
    try {
      if (onChangePassword) {
        await onChangePassword({ currentPassword, newPassword });
      }
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      setPwError(err?.message || "Invalid current password or update error.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm("Are you sure you want to terminate all active sessions across all devices? You will remain logged into this tab.")) {
      return;
    }
    setRevokingSessions(true);
    try {
      if (onRevokeAllSessions) {
        await onRevokeAllSessions();
      }
      setRevokeSuccess(true);
      setTimeout(() => setRevokeSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setRevokingSessions(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold shadow-sm shadow-teal-700/20">
              {(() => {
                if (!user.fullName) return "U";
                const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
                if (parts.length === 0) return "U";
                if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
              })()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user.fullName || "User Account"}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{user.email}</span>
                <span className="text-slate-300">•</span>
                <Badge variant="teal" className="text-[10px] uppercase py-0 px-1.5 font-bold">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "profile"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Profile Info
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "security"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Security & Password
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "sessions"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Laptop className="h-4 w-4" />
            Active Sessions
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PROFILE INFO */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Profile updated successfully.</span>
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Email</label>
                  <Input value={user.email} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Facility</label>
                  <Input
                    value={user.tenantName || "Universal Platform Network"}
                    disabled
                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {user.ghanaCardId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">National ID (Ghana Card)</label>
                  <Input value={user.ghanaCardId} disabled className="bg-slate-50 font-mono text-slate-700 cursor-not-allowed" />
                </div>
              )}

              {user.role !== "PATIENT" && (
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-teal-600" />
                      <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                        Verified Practitioner Credentials
                      </h4>
                    </div>
                    <Badge variant="teal" className="text-[9px] uppercase font-bold py-0.5 px-2">
                      Active License
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Licensing PIN / Number</span>
                      <span className="font-mono font-bold text-slate-800">
                        {user.licenseNumber || "MDC/RN/89124-GH"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Regulatory Council</span>
                      <span className="font-semibold text-slate-800">
                        {user.licensingBody || (user.role.includes("PHARM") ? "Pharmacy Council Ghana" : "Medical and Dental Council (MDC)")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Department</span>
                      <span className="font-semibold text-slate-800">{user.department || "Clinical Workstation"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Specialization</span>
                      <span className="font-semibold text-slate-800">{user.specialization || "Licensed Practitioner"}</span>
                    </div>
                  </div>
                </div>
              )}

              {user.role === "PATIENT" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Emergency & Clinical Contacts
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Contact Name</label>
                      <Input
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="Next of Kin / Relative"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Contact Phone</label>
                      <Input
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="0244000000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Known Drug Allergies</label>
                    <Input
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, NSAIDs, Sulfa"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="teal" isLoading={profileSaving}>
                  Save Profile Changes
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & PASSWORD */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {pwSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Password changed successfully. Active sessions updated.</span>
                </div>
              )}
              {pwError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters with numbers/symbols"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-500">Strength:</span>
                      <span
                        className={
                          pwStrength >= 75
                            ? "text-emerald-600"
                            : pwStrength >= 50
                            ? "text-amber-600"
                            : "text-red-500"
                        }
                      >
                        {pwStrength >= 100
                          ? "Strong & Compliant"
                          : pwStrength >= 75
                          ? "Good"
                          : pwStrength >= 50
                          ? "Moderate"
                          : "Weak"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          pwStrength >= 75
                            ? "bg-emerald-500"
                            : pwStrength >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${pwStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="teal" isLoading={pwSaving}>
                  Update Password
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: ACTIVE SESSIONS */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Connected Devices & Token Sessions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sessions backed by Redis JWT revocation ledger.
                  </p>
                </div>
                <Button
                  onClick={handleRevokeAll}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  isLoading={revokingSessions}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Log Out All Devices
                </Button>
              </div>

              {revokeSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>All remote browser sessions have been invalidated.</span>
                </div>
              )}

              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-sm">
                        {session.deviceName.toLowerCase().includes("mobile") ||
                        session.userAgent.toLowerCase().includes("mobile") ? (
                          <Smartphone className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Laptop className="h-4 w-4 text-teal-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{session.deviceName}</span>
                          {session.isCurrent && (
                            <Badge variant="teal" className="text-[9px] py-0 px-1 font-bold">
                              Current Session
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{session.ipAddress} • {session.userAgent}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {session.isCurrent ? "Active Now" : "2 hrs ago"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
