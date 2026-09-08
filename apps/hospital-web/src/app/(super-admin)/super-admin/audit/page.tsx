"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Terminal,
  Clock,
  User,
  Activity,
  Layers,
  Download,
  AlertCircle,
  Inbox,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@medipaedia/ui";
import { createApiClient, AdminAuditLogItem } from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

const detailsToSearchString = (details: any): string => {
  if (details == null) return "";
  if (typeof details === "string") return details;
  if (typeof details !== "object") return String(details);
  try {
    return JSON.stringify(details);
  } catch {
    return "";
  }
};

const formatDetailsForDisplay = (details: any): string => {
  if (details == null) return "";
  if (typeof details === "string") return details;
  if (typeof details !== "object") return String(details);
  try {
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(" · ");
  } catch {
    try {
      return JSON.stringify(details);
    } catch {
      return "";
    }
  }
};

export default function AdminAuditPage() {
  const apiClient = createApiClient();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const logs = await apiClient.getAdminAuditLogs(100);
      setAuditLogs(logs as any[]);
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = auditLogs.filter((log: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const detailsBlob = detailsToSearchString(log.details ?? log.event_details ?? "");
    return (
      (log.actor_name || log.actor || "").toLowerCase().includes(q) ||
      (log.action_type || log.action || "").toLowerCase().includes(q) ||
      detailsBlob.toLowerCase().includes(q) ||
      (log.ip_address || log.ip || "").includes(q) ||
      (log.entity_type || log.entity || "").toLowerCase().includes(q)
    );
  });

  const renderSkeleton = () => (
    <div className="space-y-8">
      <div className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200" />
      <div className="h-20 animate-pulse rounded-2xl bg-white border border-slate-200" />
      <div className="h-96 animate-pulse rounded-2xl bg-white border border-slate-200" />
    </div>
  );

  const renderError = () => (
    <Card className="border-rose-200 bg-rose-50/50">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-rose-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">{t("common.error")}</h3>
          <p className="text-sm text-slate-600 mt-1">{error}</p>
        </div>
        <Button variant="teal" onClick={loadData}>
          <Sparkles className="h-4 w-4 mr-1.5" /> {t("common.retry")}
        </Button>
      </CardContent>
    </Card>
  );

  const renderEmpty = () => (
    <Card>
      <CardHeader className="py-4 border-b border-slate-200 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900">
          {t("superAdmin.auditEventStream")} (0)
        </CardTitle>
        <span className="text-xs text-slate-400 font-mono">{t("superAdmin.appendOnlyLedger")}</span>
      </CardHeader>
      <div className="p-12 text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Inbox className="h-8 w-8 text-slate-500" />
        </div>
        <h4 className="font-bold text-slate-900 text-sm pt-2">{t("common.noResults")}</h4>
        <p className="text-xs text-slate-500">{t("common.adjustSearch")}</p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("superAdmin.immutableAuditTrail")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("superAdmin.auditTrailSubtitle")}
          </p>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> {t("superAdmin.exportSiemLogs")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <Input
            label={t("superAdmin.searchAuditTrail")}
            placeholder={t("superAdmin.searchAuditPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderError()
      ) : filtered.length === 0 ? (
        renderEmpty()
      ) : (
        <Card>
          <CardHeader className="py-4 border-b border-slate-200 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900">
              {t("superAdmin.auditEventStream")} ({filtered.length})
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">{t("superAdmin.appendOnlyLedger")}</span>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">{t("superAdmin.auditTimestamp")}</th>
                    <th className="p-3.5">{t("superAdmin.auditActorAndRole")}</th>
                    <th className="p-3.5">{t("superAdmin.auditAction")}</th>
                    <th className="p-3.5">{t("superAdmin.auditEntity")}</th>
                    <th className="p-3.5">{t("superAdmin.auditIpOrigin")}</th>
                    <th className="p-3.5">{t("superAdmin.auditDetails")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filtered.map((log: any) => {
                    const timestamp = log.timestamp || log.created_at || log.logged_at || "—";
                    const actor = log.actor_name || log.actor || t("common.system");
                    const role = log.actor_role || log.role || "SYSTEM";
                    const action = log.action_type || log.action || "UNKNOWN_ACTION";
                    const entity = log.entity_type || log.entity || "UNKNOWN_ENTITY";
                    const entityId = log.entity_id || "";
                    const ip = log.ip_address || log.ip || "—";
                    const details = formatDetailsForDisplay(log.details ?? log.event_details ?? log.message ?? "");
                    return (
                      <tr key={log.id || `${timestamp}-${action}-${entityId}`} className="hover:bg-slate-50/60 text-xs">
                        <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {timestamp}
                        </td>
                        <td className="p-3.5">
                          <strong className="text-slate-900 block">{actor}</strong>
                          <Badge variant="teal" className="text-[9px] py-0">
                            {role}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {action}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          {entity}{entityId ? ` / ${entityId}` : ""}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                          {ip}
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-sm">
                          {details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
