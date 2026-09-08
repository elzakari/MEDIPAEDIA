"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Phone,
  Mail,
  Edit2,
  Check,
  Copy,
  Clock,
  Sparkles,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
  Toast,
  ToastProps,
  useTranslation,
} from "@medipaedia/ui";
import {
  createApiClient,
  StaffInvitationResponse,
  StaffSeatQuotaSummary,
  StaffMemberResponse,
} from "@medipaedia/api-client";
import { useAuth } from "@/context/AuthContext";

const ROLE_OPTIONS = [
  "ALL",
  "DOCTOR",
  "NURSE",
  "HOSPITAL_FINANCE",
  "RECORD_CLERK",
  "HOSPITAL_ADMIN",
] as const;

type RoleFilter = (typeof ROLE_OPTIONS)[number];

export default function HospitalStaffRosterPage() {
  const apiClient = useMemo(() => createApiClient(), []);
  const { user: authUser, tenant } = useAuth();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("DOCTOR");
  const [generatedInvitation, setGeneratedInvitation] = useState<StaffInvitationResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [quota, setQuota] = useState<StaffSeatQuotaSummary | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<StaffInvitationResponse[]>([]);
  const [staff, setStaff] = useState<StaffMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaffAndQuota = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, quotaRes, invsRes] = await Promise.all([
        apiClient.getHospitalStaff(),
        apiClient.getStaffSeatQuota(),
        apiClient.getStaffInvitations(),
      ]);
      setStaff(staffRes);
      setQuota(quotaRes);
      setPendingInvitations(invsRes);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        (err as { message?: string }).message ||
        (t("common.loadError") || "Failed to load staff data.");
      setError(msg);
      setStaff([]);
      setQuota(null);
      setPendingInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient, t]);

  useEffect(() => {
    loadStaffAndQuota();
  }, [loadStaffAndQuota]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiClient.createStaffInvitation({
        first_name: firstName,
        last_name: lastName,
        email,
        role,
      });
      setGeneratedInvitation(res);
      setToast({
        type: "success",
        title: (t("hospitalAdmin.staff.inviteCreatedTitle") || "Staff Invitation Created"),
        message: (t("hospitalAdmin.staff.inviteCreatedMsg", { first: firstName, last: lastName }) || "48-hour activation link generated for {{first}} {{last}}."),
      });
      loadStaffAndQuota();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        (err as { message?: string }).message ||
        (t("hospitalAdmin.staff.inviteError") || "Failed to issue staff invitation.");
      setToast({
        type: "error",
        title: (t("hospitalAdmin.staff.inviteErrorTitle") || "Staff Invitation Error"),
        message: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleResend = async (id: string) => {
    try {
      await apiClient.resendStaffInvitation(id);
      setToast({
        type: "success",
        title: (t("hospitalAdmin.staff.resentTitle") || "Invitation Renewed"),
        message: (t("hospitalAdmin.staff.resentMsg") || "Invitation renewed with a fresh 48-hour security token!"),
      });
      loadStaffAndQuota();
    } catch (err: unknown) {
      setToast({
        type: "error",
        title: (t("hospitalAdmin.staff.resendFailedTitle") || "Resend Failed"),
        message:
          (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          (err as { message?: string }).message ||
          (t("hospitalAdmin.staff.resendFailedMsg") || "Failed to resend invite."),
      });
    }
  };

  const handleToggleOnDuty = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.staff_id === id ? { ...s, is_on_duty: !s.is_on_duty } : s))
    );
  };

  const filteredStaff = staff.filter((s) => {
    const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-80 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
        </div>

        <Card className="p-4 border border-slate-200">
          <div className="space-y-3">
            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
            <div className="h-2 w-full bg-slate-200 rounded animate-pulse" />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200">
          <div className="space-y-3">
            <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </Card>

        <Card className="border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="py-3 px-4">
                      <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array.from({ length: 6 }).map((_, colIdx) => (
                      <td key={colIdx} className="py-3 px-4">
                        <div
                          className={`h-4 bg-slate-200 rounded animate-pulse ${
                            colIdx === 0 ? "w-40" : colIdx === 5 ? "w-20 ml-auto" : "w-28"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {(t("common.error") || "Error")}
                </h2>
                <p className="text-sm text-slate-600 max-w-md">{error}</p>
              </div>
              <Button variant="primary" onClick={loadStaffAndQuota}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {(t("common.retry") || "Retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          actionUrl={toast.actionUrl}
          actionLabel={toast.actionLabel}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            {(t("hospitalAdmin.staff.pageTitle") || "Clinical Staff Directory & Roster")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {tenant?.name ||
              (t("hospitalAdmin.staff.facilityDefault") || "Healthcare Facility")}{" "}
            •{" "}
            {(t("hospitalAdmin.staff.pageSubtitle") || "Practitioners, triage nurses, and seat entitlements.")}
          </p>
        </div>
        <Button
          variant="teal"
          onClick={() => {
            setGeneratedInvitation(null);
            setFirstName("");
            setLastName("");
            setEmail("");
            setInviteModalOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          {(t("hospitalAdmin.staff.inviteBtn") || "Invite Staff Member")}
        </Button>
      </div>

      {quota && (
        <Card className="p-4 border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {(t("hospitalAdmin.staff.seatQuota", {
                    plan: quota.plan_name,
                  }) || "Staff Seat Quota ({{plan}})")}
                </span>
                <Badge variant="teal" className="text-[10px] font-bold py-0">
                  {quota.tier}{" "}
                  {(t("hospitalAdmin.staff.tierSuffix") || "TIER")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {(t("hospitalAdmin.staff.seatUsage", {
                    active: String(quota.active_seats),
                    max: String(quota.max_seats),
                  }) || "{{active}} of {{max}} seats utilized")}{" "}
                •{" "}
                <strong className="text-teal-700">
                  {(t("hospitalAdmin.staff.seatsRemaining", { remaining: String(quota.seats_remaining) }) || "{{remaining}} seats remaining")}
                </strong>
              </p>
            </div>

            <div className="w-full md:w-64 space-y-1.5">
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (quota.active_seats / Math.max(1, quota.max_seats)) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0</span>
                <span>
                  {(t("hospitalAdmin.staff.maxSeats", {
                    max: String(quota.max_seats),
                  }) || "{{max}} Max Seats")}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {pendingInvitations.length > 0 && (
        <Card className="p-4 border border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-600" />
              {(t("hospitalAdmin.staff.pendingInvitations", { count: String(pendingInvitations.length) }) || "Pending Staff Invitations ({{count}})")}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              {(t("hospitalAdmin.staff.expiryWindow") || "48-Hour Expiry Window")}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingInvitations.map((inv) => (
              <div
              key={inv.id}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-slate-900">
                  {inv.first_name} {inv.last_name}
                </span>
                <span className="text-slate-400 font-mono ml-2">({inv.email})</span>
                <Badge variant="cyan" className="text-[9px] uppercase font-bold ml-2 py-0">
                  {inv.role}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopyLink(inv.invitation_url)}
                  className="text-teal-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Copy className="h-3 w-3" />
                  {(t("hospitalAdmin.staff.copyLink") || "Copy Link")}
                </button>
                <button
                  onClick={() => handleResend(inv.id)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="h-3 w-3" />
                  {(t("hospitalAdmin.staff.resend") || "Resend")}
                </button>
              </div>
            </div>
          ))}
          </div>
        </Card>
      )}

      <Card className="p-4 border border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={(t("hospitalAdmin.staff.searchPlaceholder") || "Search practitioner by name, email, department...")}
              className="pl-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  roleFilter === r
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r === "ALL"
                  ? (t("common.all") || "All")
                  : r.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {!loading && !error && filteredStaff.length === 0 && staff.length > 0 && (
        <Card className="p-8 border-dashed border-slate-200 bg-slate-50/40">
          <div className="text-center space-y-2">
            <Search className="h-10 w-10 mx-auto text-slate-400" />
            <h3 className="text-sm font-extrabold text-slate-700">
              {t("common.noResults") || "No matching staff members"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t("common.adjustSearch") || "Try clearing your search text or role filter."}
            </p>
          </div>
        </Card>
      )}

      {!loading && !error && staff.length === 0 ? (
        <Card className="p-10 border-dashed border-slate-200 bg-white">
          <div className="text-center space-y-3">
            <div className="mx-auto p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700">
              <Inbox className="h-10 w-10" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              {t("superAdmin.noStaff") || "No staff records found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {(t("superAdmin.noStaffHelp") || "Add clinical and administrative staff through the HR onboarding invite flow.") || "Add clinical and administrative staff through the HR onboarding invite flow."}
            </p>
            <div className="pt-2">
              <Button variant="teal" onClick={() => setInviteModalOpen(true)} className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                {(t("hospitalAdmin.staff.inviteFirstBtn") || "Invite First Staff Member") || "Invite First Staff Member"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        !loading &&
        !error &&
        filteredStaff.length > 0 && (
          <Card className="border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">
                      {(t("hospitalAdmin.staff.thName") || "Practitioner Name") || "Practitioner Name"}
                    </th>
                    <th className="py-3 px-4">
                      {(t("hospitalAdmin.staff.thRole") || "Role & Department") || "Role & Department"}
                    </th>
                    <th className="py-3 px-4">
                      {(t("hospitalAdmin.staff.thPin") || "Council PIN") || "Council PIN"}
                    </th>
                    <th className="py-3 px-4">
                      {(t("hospitalAdmin.staff.thLicense") || "License Status") || "License Status"}
                    </th>
                    <th className="py-3 px-4">
                      {(t("hospitalAdmin.staff.thDuty") || "Duty Status") || "Duty Status"}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {(t("common.actions") || "Actions") || "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaff.map((s) => (
                    <tr key={s.staff_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{s.full_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="teal" className="text-[9px] uppercase font-bold mb-0.5">
                          {s.role}
                        </Badge>
                        <p className="text-[11px] text-slate-500">{s.department}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {s.council_pin ||
                          (t("hospitalAdmin.staff.na") || "N/A") || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={s.license_status === "VERIFIED" ? "teal" : "secondary"}
                          className="text-[9px] font-bold"
                        >
                          {s.license_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleOnDuty(s.staff_id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                            s.is_on_duty
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.is_on_duty
                            ? (t("hospitalAdmin.staff.onDuty") || "● On Duty") || "● On Duty"
                            : (t("hospitalAdmin.staff.offDuty") || "○ Off Duty") || "○ Off Duty"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" className="text-xs text-teal-600 hover:text-teal-800">
                          {(t("hospitalAdmin.staff.manage") || "Manage") || "Manage"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={(t("hospitalAdmin.staff.modalTitle") || "Invite Clinical / Administrative Staff Member")}
      >
        {!generatedInvitation ? (
          <form onSubmit={handleSendInvite} className="space-y-4">
            <p className="text-xs text-slate-500">
              {(t("hospitalAdmin.staff.modalDesc") || "Generates a 48-hour secure registration magic link for your practitioner or nurse.")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                {(t("hospitalAdmin.staff.firstNameLabel") || "First Name")} *
              </label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={(t("hospitalAdmin.staff.firstNamePlaceholder") || "e.g. Grace")}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {(t("hospitalAdmin.staff.lastNameLabel") || "Last Name")} *
                </label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={(t("hospitalAdmin.staff.lastNamePlaceholder") || "e.g. Ofori")}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {(t("hospitalAdmin.staff.emailLabel") || "Official Email Address")} *
              </label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={(t("hospitalAdmin.staff.emailPlaceholder") || "grace.ofori@facility.health")}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {(t("hospitalAdmin.staff.roleLabel") || "Assigned Clinical / Staff Role")}{" "}
                *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 bg-white"
              >
                <option value="DOCTOR">
                  {(t("hospitalAdmin.staff.roleDoctor") || "Medical Doctor (Consultation & CPOE")}
                </option>
                <option value="NURSE">
                  {(t("hospitalAdmin.staff.roleNurse") || "Registered Nurse (Triage & eMAR)")}
                </option>
                <option value="HOSPITAL_FINANCE">
                  {(t("hospitalAdmin.staff.roleFinance") || "Hospital Finance / Cashier")}
                </option>
                <option value="RECORD_CLERK">
                  {(t("hospitalAdmin.staff.roleClerk") || "OPD Record Clerk & Reception")}
                </option>
                <option value="HOSPITAL_ADMIN">
                  {(t("hospitalAdmin.staff.roleAdmin") || "Hospital Facility Administrator")}
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
                {(t("common.cancel") || "Cancel")}
              </Button>
              <Button type="submit" variant="teal" isLoading={isSubmitting}>
                <Sparkles className="h-4 w-4 mr-1.5" />
                {(t("hospitalAdmin.staff.issueInvite") || "Issue Staff Invitation")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {(t("hospitalAdmin.staff.invitationIssued", {
                  first: generatedInvitation.first_name,
                  last: generatedInvitation.last_name,
                }) || "Invitation Issued for {{first}} {{last}}")}
            </h3>
            <p className="text-xs text-slate-500">
              {(t("hospitalAdmin.staff.sendActivationLink") || "Send this 48-hour activation link to the staff member:")}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 break-all select-all text-left">
              {generatedInvitation.invitation_url}
            </div>

            <Button
              variant="teal"
              onClick={() => handleCopyLink(generatedInvitation.invitation_url)}
              className="w-full"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  {(t("hospitalAdmin.staff.copiedMsg") || "Copied to Clipboard!")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  {(t("hospitalAdmin.staff.copyInviteLink") || "Copy Staff Invitation Link")}
                </>
              )}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
