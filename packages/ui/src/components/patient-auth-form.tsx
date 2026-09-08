"use client";

import React, { useState } from "react";
import { UserCheck, ShieldCheck, Phone, CreditCard, ArrowRight, Lock } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Card, CardHeader, CardTitle, CardContent } from "./card";

export interface PatientAuthFormProps {
  onLogin: (credentials: { identifier: string; password: string }) => Promise<void>;
  onRegister: (data: {
    fullName: string;
    phone: string;
    password: string;
    ghanaCardId?: string;
    dob?: string;
    gender?: string;
  }) => Promise<void>;
}

export function PatientAuthForm({ onLogin, onRegister }: PatientAuthFormProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regGhanaCard, setRegGhanaCard] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regPassword, setRegPassword] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onLogin({
        identifier: loginIdentifier,
        password: loginPassword,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Login failed. Check your identifier and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onRegister({
        fullName: regFullName,
        phone: regPhone,
        password: regPassword,
        ghanaCardId: regGhanaCard || undefined,
        dob: regDob || undefined,
        gender: regGender,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Registration failed. Please review your details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-slate-200/90 shadow-2xl bg-white">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 rounded-t-xl overflow-hidden text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveTab("login");
            setErrorMessage(null);
          }}
          className={`flex-1 py-3.5 text-center transition ${
            activeTab === "login"
              ? "bg-white text-teal-700 border-b-2 border-teal-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Patient Login
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("register");
            setErrorMessage(null);
          }}
          className={`flex-1 py-3.5 text-center transition ${
            activeTab === "register"
              ? "bg-white text-teal-700 border-b-2 border-teal-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          New Patient Registration
        </button>
      </div>

      <CardContent className="pt-6">
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              label="Ghana Card, Phone Number, or Email"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="e.g. GHA-71298412-1 or +233245550199"
              helperText="Universal single sign-on across all Medipaedia network hospitals"
              required
            />

            <Input
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full gap-2 mt-2"
            >
              Sign In to Patient Portal <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Full Name"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g. Patient Full Name"
                required
              />
              <Input
                label="Mobile Phone"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+233 24 555 0199"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ghana Card / National ID"
                value={regGhanaCard}
                onChange={(e) => setRegGhanaCard(e.target.value)}
                placeholder="GHA-7XXXXXXXX-X"
                helperText="Links your health records across hospitals"
              />
              <Input
                label="Date of Birth"
                type="date"
                value={regDob}
                onChange={(e) => setRegDob(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Gender
                </label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <Input
                label="Create Password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full gap-2 mt-2"
            >
              Create Universal Patient Account <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        <div className="pt-4 mt-6 text-center text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          <span>Compliant with Ghana Data Protection Act & HIPAA Standards</span>
        </div>
      </CardContent>
    </Card>
  );
}
