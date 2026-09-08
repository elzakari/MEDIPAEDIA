"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  AlertCircle,
  Inbox,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
} from "@medipaedia/ui";
import { createApiClient, type BatchSettlementSummary, type SettlementPayoutItem } from "@medipaedia/api-client";
import { useTranslation } from "@medipaedia/ui";

export default function AdminSettlementsPage() {
  const apiClient = createApiClient();
  const { t } = useTranslation();
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [batches, setBatches] = useState<BatchSettlementSummary | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<SettlementPayoutItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, history] = await Promise.all([
        apiClient.getAdminSettlementBatches(),
        apiClient.getSettlementPayoutHistory(),
      ]);
      setBatches(summary);
      setPayoutHistory(history || []);
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteBatch = async () => {
    setIsProcessing(true);
    setBatchError(null);
    try {
      await apiClient.executeAdminBatchPayout();
      setBatchSuccess(true);
      setTimeout(() => {
        setBatchSuccess(false);
        setBatchModalOpen(false);
      }, 1500);
      loadData();
    } catch (err: any) {
      setBatchError(err?.message || t("superAdmin.batchPayoutFailed") || "Bulk payout could not be executed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalEligiblePharmacies = batches?.total_eligible_pharmacies ?? 0;
  const totalPayoutAmount = batches?.total_payout_amount ?? 0;
  const currency = batches?.currency ?? "GHS";
  const batchesPending = batches?.batches_pending ?? 0;
  const recentPayoutsCount = batches?.recent_payouts_count ?? 0;
  const displayBatches = payoutHistory;

  const renderSkeleton = () => (
    <div className="space-y-8">
      <div className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white border border-slate-200" />
        ))}
      </div>
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
    <Card className="border border-slate-200 bg-white">
      <CardHeader className="py-4 border-b border-slate-200 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900">
          {t("superAdmin.automatedDailyBatches")} (0)
        </CardTitle>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> {t("superAdmin.downloadTaxStatement")}
        </Button>
      </CardHeader>
      <div className="p-12 text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Inbox className="h-8 w-8 text-slate-500" />
        </div>
        <h4 className="font-bold text-slate-900 text-sm pt-2">{t("superAdmin.noSettlements")}</h4>
        <p className="text-xs text-slate-500">{t("superAdmin.noSettlementsHelp")}</p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="teal" className="text-[10px]">
              {t("superAdmin.paystackSettlementEngine")}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("superAdmin.centralEscrowSettlementHub")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("superAdmin.settlementHubSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setBatchModalOpen(true)}
            className="gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-xs"
          >
            <ArrowUpRight className="h-4 w-4" /> {t("superAdmin.triggerBulkMomoPayout")}
          </Button>
        </div>
      </div>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderError()
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-white">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase font-mono">
                  {t("superAdmin.totalEligiblePharmacies")}
                </span>
                <strong className="text-3xl font-black font-mono text-slate-900 block">
                  {totalEligiblePharmacies}
                </strong>
                <p className="text-[11px] text-slate-500">
                  {t("superAdmin.eligiblePharmaciesDescription")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-sky-500 bg-gradient-to-br from-sky-50/50 via-white to-white shadow-md">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs font-bold text-sky-800 uppercase font-mono">
                  {t("superAdmin.pendingBatches")}
                </span>
                <strong className="text-3xl font-black font-mono text-sky-900 block">
                  {batchesPending}
                </strong>
                <p className="text-[11px] text-slate-500">
                  {t("superAdmin.pendingBatchesDescription")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-teal-500 bg-gradient-to-br from-teal-50/50 via-white to-white shadow-md">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs font-bold text-teal-800 uppercase font-mono">
                  {t("superAdmin.lifetimePayoutValue")}
                </span>
                <strong className="text-3xl font-black font-mono text-teal-900 block">
                  {currency} {Number(totalPayoutAmount || 0).toFixed(2)}
                </strong>
                <p className="text-[11px] text-slate-500">
                  {t("superAdmin.lifetimePayoutDescription", { count: totalEligiblePharmacies })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono">
                  {t("superAdmin.recentPayoutsCount")}
                </span>
                <strong className="text-3xl font-black font-mono text-slate-900 block">
                  {recentPayoutsCount}
                </strong>
                <p className="text-[11px] text-slate-500">
                  {t("superAdmin.recentPayoutsDescription")}
                </p>
              </CardContent>
            </Card>
          </div>

          {displayBatches.length === 0 ? (
            renderEmpty()
          ) : (
            <Card>
              <CardHeader className="py-4 border-b border-slate-200 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900">
                  {t("superAdmin.automatedDailyBatches")} ({displayBatches.length})
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> {t("superAdmin.downloadTaxStatement")}
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase">
                      <tr>
                        <th className="p-3.5">{t("superAdmin.batchReference")}</th>
                        <th className="p-3.5">{t("superAdmin.recipient")}</th>
                        <th className="p-3.5">{t("superAdmin.grossAmount")}</th>
                        <th className="p-3.5">{t("superAdmin.platformFee")}</th>
                        <th className="p-3.5">{t("superAdmin.netDisbursed")}</th>
                        <th className="p-3.5">{t("superAdmin.executionDate")}</th>
                        <th className="p-3.5">{t("common.status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayBatches.map((payout: SettlementPayoutItem) => {
                        const ref = payout.payout_reference || payout.transfer_code || payout.id;
                        const gross = payout.gross_amount ?? payout.amount ?? 0;
                        const commission = payout.fee_deducted ?? 0;
                        const net = payout.net_amount ?? (gross - commission);
                        const date = payout.processed_at || payout.created_at || "—";
                        const status = payout.status || "PROCESSED";
                        return (
                          <tr key={payout.id || ref} className="hover:bg-slate-50/60">
                            <td className="p-3.5 font-mono font-bold text-slate-800">{ref}</td>
                            <td className="p-3.5 font-bold text-slate-700">
                              {payout.recipient_name || "—"}
                            </td>
                            <td className="p-3.5 font-mono text-slate-700">
                              {currency} {Number(gross).toFixed(2)}
                            </td>
                            <td className="p-3.5 font-mono text-amber-700 font-bold">
                              {currency} {Number(commission).toFixed(2)}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-emerald-800 text-sm">
                              {currency} {Number(net).toFixed(2)}
                            </td>
                            <td className="p-3.5 text-slate-500">{date}</td>
                            <td className="p-3.5">
                              <Badge variant={status === "SUCCESS" || status === "PROCESSED" ? "success" : status === "FAILED" || status === "REVERSED" ? "danger" : "warning"} className="text-[10px]">
                                {status}
                              </Badge>
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
        </>
      )}

      {batchModalOpen && (
        <Modal
          isOpen={batchModalOpen}
          onClose={() => { setBatchModalOpen(false); setBatchError(null); setBatchSuccess(false); }}
          title={t("superAdmin.executeBatchPayoutTitle") || "Execute Bulk Settlement Payout"}
          description={t("superAdmin.executeBatchPayoutDescription", { count: batches?.total_eligible_pharmacies || 12 }) || `Initiate bulk MoMo transfer to ${batches?.total_eligible_pharmacies || 12} verified payout recipients.`}
        >
          {batchSuccess ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">{t("superAdmin.bulkPayoutExecuted") || "Bulk Payout Executed"}</h3>
              <p className="text-xs text-slate-500">
                {t("superAdmin.bulkPayoutExecutedDescription") || "Funds are being disbursed via Paystack bulk transfer API."}
              </p>
            </div>
          ) : batchError ? (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-bold text-rose-800">{t("superAdmin.batchPayoutErrorTitle") || "Payout Execution Failed"}</p>
                  <p className="text-rose-700 mt-0.5">{batchError}</p>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleExecuteBatch}
                isLoading={isProcessing}
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
              >
                {t("common.retry") || "Retry Payout"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("superAdmin.totalPayoutAmount")}:</span>
                  <strong className="font-mono text-slate-900">{currency} {Number(totalPayoutAmount).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("superAdmin.recipientsCount")}:</span>
                  <strong className="text-slate-800">{totalEligiblePharmacies} {t("superAdmin.verifiedPharmacies")}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("superAdmin.transferRail")}:</span>
                  <span className="font-semibold text-slate-700">{t("superAdmin.paystackBulkTransfer")}</span>
                </div>
              </div>

              <p className="text-slate-500 text-center">
                {t("superAdmin.batchPayoutWarning")}
              </p>

              <Button
                variant="primary"
                size="lg"
                onClick={handleExecuteBatch}
                isLoading={isProcessing}
                className="w-full bg-teal-600 hover:bg-teal-700 font-bold"
              >
                {t("superAdmin.confirmDisburseAmount", { amount: `${currency} ${Number(totalPayoutAmount).toLocaleString()}` })}
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
