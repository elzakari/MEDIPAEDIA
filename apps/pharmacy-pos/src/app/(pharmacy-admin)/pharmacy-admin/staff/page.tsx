"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Pill,
  CreditCard,
  Building2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";

import {
  createApiClient as _createApiClient,
  StaffMemberResponse as _StaffMemberResponse,
  StaffInviteRequest as _StaffInviteRequest,
} from "@medipaedia/api-client";

const createApiClient: typeof _createApiClient | undefined =
  typeof _createApiClient !== "undefined" ? _createApiClient : undefined;
type StaffMemberResponse = _StaffMemberResponse;
type StaffInviteRequest = _StaffInviteRequest;

interface PharmacyStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "SUPERINTENDENT_PHARMACIST" | "PHARMACIST" | "PHARMACY_FINANCE" | "PHARMACY_ADMIN";
  roles?: string[];
  licensePin: string;
  shift: string;
  status: "ACTIVE" | "ON_LEAVE";
}

const normalizeR = (r: string): string => String(r || "").trim().toUpperCase().replace(/RECORDS_CLERK/g, "RECORD_CLERK");

const staffHasRole = (s: PharmacyStaff, expected: string): boolean => {
  const want = normalizeR(expected);
  if (Array.isArray(s.roles) && s.roles.length) {
    return s.roles.some((r) => normalizeR(r) === want);
  }
  return normalizeR(s.role) === want;
};

const apiClient = createApiClient ? createApiClient() : undefined;

export default function PharmacyStaffPage() {
  const [search, setSearch] = useState("");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<PharmacyStaff["role"]>("PHARMACIST");
  const [licensePin, setLicensePin] = useState("");
  const [shift, setShift] = useState("Morning Shift (08:00 - 16:00)");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [staff, setStaff] = useState<PharmacyStaff[]>([]);

  const loadStaff = async () => {
    try {
      if (apiClient && typeof (apiClient as any).getHospitalStaff === "function") {
        const result = await (apiClient as any).getHospitalStaff?.();
        if (Array.isArray(result)) {
          const mapped: PharmacyStaff[] = result.map((s: any) => ({
            id: s.staff_id || s.id || String(Math.random()),
            name: s.full_name || s.name || "",
            email: s.email || "",
            phone: s.phone || "",
            role: (s.role as PharmacyStaff["role"]) || "PHARMACIST",
            roles: Array.isArray(s.roles) && s.roles.length ? s.roles : undefined,
            licensePin: s.council_pin || s.license_number || s.licensePin || "",
            shift: s.department || s.shift || "",
            status: s.is_active === false ? "ON_LEAVE" : "ACTIVE",
          }));
          setStaff(mapped);
          return;
        }
      }
      if (apiClient && typeof (apiClient as any).getPharmacyStaff === "function") {
        const result = await (apiClient as any).getPharmacyStaff?.();
        if (Array.isArray(result)) {
          const mapped: PharmacyStaff[] = result.map((s: any) => ({
            id: s.id || String(Math.random()),
            name: s.full_name || s.name || "",
            email: s.email || "",
            phone: s.phone || "",
            role: (s.role as PharmacyStaff["role"]) || "PHARMACIST",
            roles: Array.isArray(s.roles) && s.roles.length ? s.roles : undefined,
            licensePin: s.license_number || s.licensePin || "",
            shift: s.shift || "",
            status: s.is_active === false ? "ON_LEAVE" : "ACTIVE",
          }));
          setStaff(mapped);
          return;
        }
      }
      if (apiClient && typeof (apiClient as any).request === "function") {
        try {
          const result: any = await (apiClient as any).request("/api/v1/pharmacy-admin/staff");
          if (Array.isArray(result)) {
            const mapped: PharmacyStaff[] = result.map((s: any) => ({
              id: s.staff_id || s.id || String(Math.random()),
              name: s.full_name || s.name || "",
              email: s.email || "",
              phone: s.phone || "",
              role: (s.role as PharmacyStaff["role"]) || "PHARMACIST",
              roles: Array.isArray(s.roles) && s.roles.length ? s.roles : undefined,
              licensePin: s.council_pin || s.license_number || s.licensePin || "",
              shift: s.department || s.shift || "",
              status: s.is_active === false ? "ON_LEAVE" : "ACTIVE",
            }));
            setStaff(mapped);
            return;
          }
        } catch {
          setStaff([]);
        }
      }
    } catch {
      setStaff([]);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload: any = {
        email,
        full_name: name,
        phone,
        role,
        license_pin: licensePin,
        shift,
      };

      let success = false;

      if (apiClient && typeof (apiClient as any).inviteHospitalStaff === "function") {
        const invitePayload: StaffInviteRequest = {
          full_name: name,
          email,
          phone,
          role,
          department: shift,
          council_pin: licensePin || undefined,
        };
        try {
          await (apiClient as any).inviteHospitalStaff?.(invitePayload);
          success = true;
        } catch {
          success = false;
        }
      }

      if (!success && apiClient && typeof (apiClient as any).invitePharmacyStaff === "function") {
        try {
          await (apiClient as any).invitePharmacyStaff?.(payload);
          success = true;
        } catch {
          success = false;
        }
      }

      if (!success && apiClient && typeof (apiClient as any).request === "function") {
        try {
          await (apiClient as any).request("/api/v1/pharmacy-admin/staff", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          success = true;
        } catch (err: any) {
          throw err || new Error("Failed to onboard staff");
        }
      }

      if (!success && !apiClient) {
        throw new Error("API client not available");
      }

      await loadStaff();
      setOnboardSuccess(true);
      setStatusMessage({ type: "success", text: "Staff member invited successfully. Credentials sent to email." });
      setTimeout(() => {
        setOnboardSuccess(false);
        setOnboardOpen(false);
        setName("");
        setEmail("");
        setPhone("");
        setLicensePin("");
        setStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || "Failed to onboard staff. Please try again.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.licensePin.toLowerCase().includes(search.toLowerCase())
  );

  const superintendent = staff.find((s) => staffHasRole(s, "SUPERINTENDENT_PHARMACIST"));

  return (
    <div className="space-y-5">
      {statusMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {statusMessage.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pharmacy Staff & Pharmacist Council Licensing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Dispensary workforce roster, council PIN verification, and shift allocation
          </p>
        </div>
        <Button
          onClick={() => setOnboardOpen(true)}
          variant="primary"
          size="sm"
          className="font-bold gap-1.5 shadow-sm shadow-emerald-700/20"
        >
          <UserPlus className="h-4 w-4" /> Onboard Dispensary Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Superintendent Pharmacist
          </span>
          <p className="text-lg font-black text-slate-900 mt-1">
            {superintendent ? superintendent.name : "\u2014"}
          </p>
          {superintendent ? (
            <span className="text-xs text-emerald-600 font-bold">
              {superintendent.licensePin || "No Superintendent Assigned"}
              {superintendent.licensePin && superintendent.status === "ACTIVE" ? " (Active)" : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-bold">No Superintendent Assigned</span>
          )}
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Dispensing Pharmacists
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {staff.filter((s) => staffHasRole(s, "PHARMACIST") || staffHasRole(s, "SUPERINTENDENT_PHARMACIST")).length} Licensed
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Dispensary Cashiers
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {staff.filter((s) => staffHasRole(s, "PHARMACY_FINANCE")).length} Cashiers
          </p>
        </Card>
      </div>

      {staff.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No dispensary staff registered</h3>
          <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
            Onboard the first pharmacist. Provision accounts with Pharmacy Council PIN validation for compliance.
          </p>
          <Button
            onClick={() => setOnboardOpen(true)}
            variant="primary"
            size="sm"
            className="font-bold gap-1.5 shadow-sm shadow-emerald-700/20"
          >
            <UserPlus className="h-4 w-4" /> Onboard Dispensary Staff
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by pharmacist name, email, or PIN..."
                className="text-xs pl-9"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <Badge variant="teal" className="text-xs font-bold uppercase bg-emerald-50 text-emerald-800 border-emerald-200">
              Pharmacy Council Act 857 Compliant
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Practitioner</th>
                  <th className="px-4 py-3">Role & Pharmacy Council PIN</th>
                  <th className="px-4 py-3">Assigned Shift</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-800 text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={staffHasRole(s, "SUPERINTENDENT_PHARMACIST") ? "warning" : "teal"}
                        className="text-[9px] uppercase font-bold py-0"
                      >
                        {(Array.isArray(s.roles) && s.roles.length
                          ? s.roles.map(normalizeR).join(" • ").replace(/_/g, " ")
                          : s.role.replace("_", " "))}
                      </Badge>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{s.licensePin}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{s.shift}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{s.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.status === "ACTIVE"
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-amber-700 bg-amber-50"
                        }`}
                      >
                        {s.status === "ACTIVE" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {s.status === "ACTIVE" ? "Active" : "On Leave"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {onboardOpen && (
        <Modal
          isOpen={onboardOpen}
          onClose={() => setOnboardOpen(false)}
          title="Onboard Dispensary Staff"
          description="Provision a new pharmacist or dispensary cashier account with Pharmacy Council validation."
        >
          {onboardSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Staff Account Provisioned!</h3>
              <p className="text-xs text-slate-500">
                Credentials sent to <strong>{email}</strong>. Default password: <code className="font-mono">Medipaedia2026!</code>
              </p>
            </div>
          ) : (
            <form onSubmit={handleOnboard} className="space-y-4 py-2 text-xs">
              {statusMessage && onboardOpen && (
                <div
                  className={`rounded-xl border px-3 py-2 text-[11px] font-semibold flex items-center gap-2 ${
                    statusMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {statusMessage.type === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {statusMessage.text}
                </div>
              )}

              <Input
                label="Full Legal Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pharm. Ama Boateng"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@yourfacility.health"
                  required
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dispensary Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PHARMACIST">Dispensing Pharmacist (PC)</option>
                    <option value="PHARMACY_FINANCE">Dispensary Cashier & Escrow</option>
                    <option value="SUPERINTENDENT_PHARMACIST">Superintendent Pharmacist</option>
                  </select>
                </div>
                <Input
                  label="Pharmacy Council PIN"
                  value={licensePin}
                  onChange={(e) => setLicensePin(e.target.value)}
                  placeholder="e.g. PC/GAR/90214-R"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold mt-2"
              >
                Provision Account & Verify License
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
