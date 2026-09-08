"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Printer,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Modal,
} from "@medipaedia/ui";
import { createApiClient, DispensaryLogItem } from "@medipaedia/api-client";

export default function DispensaryLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<DispensaryLogItem[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<DispensaryLogItem | null>(null);

  const apiClient = createApiClient();

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getDispensaryLog();
      setLogs(data || []);
    } catch (err: any) {
      console.warn("Could not load dispensary logs:", err.message);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.prescription_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dispensary Log & Sales Audit Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete transaction records, electronic prescription claims, and reprintable thermal receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLogs}
            className="p-2 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Sales Log"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/pos">
            <Button variant="primary" className="gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-xs">
              Open POS Terminal <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Search by receipt number, patient name, or Rx ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-500">
              Total Recorded: <strong>{filteredLogs.length}</strong> transactions
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              Loading dispensary sales records...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">No Dispensary Sales Recorded</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? "No sales match your search query."
                  : "No medication dispensations have been processed yet. Open the POS terminal to process your first sale."}
              </p>
              <Link href="/pos">
                <Button variant="primary" size="sm" className="mt-2 text-xs bg-teal-600 hover:bg-teal-700 font-bold">
                  Open POS Counter
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Receipt & Rx Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Total Paid (GHS)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 font-mono text-sm">{item.receipt_number}</p>
                      <p className="text-[11px] text-teal-700 font-semibold">{item.prescription_number || "OTC SALE"}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.customer_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{item.customer_phone || "Walk-in"}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(item.dispensed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="teal" className="text-[10px]">{item.payment_method}</Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                      GHS {Number(item.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReceipt(item)}
                        className="gap-1 text-xs"
                      >
                        <Printer className="h-3.5 w-3.5" /> Reprint
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Reprint Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title="Reprint Dispensary Receipt"
          description={`Receipt Number: ${selectedReceipt.receipt_number}`}
        >
          <div className="space-y-4 pt-2">
            <div className="p-6 bg-white rounded-xl border-2 border-slate-800 text-slate-900 space-y-4 font-mono text-xs shadow-inner">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h3 className="font-bold text-sm tracking-tight">Osu Community Pharmacy</h3>
                <p className="text-[10px] text-slate-500">Osu Oxford St, Accra · +233 30 277 8899</p>
                <p className="text-[10px] text-slate-600 mt-1">{selectedReceipt.pharmacist_name || "Superintendent Pharmacist"}</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>{selectedReceipt.receipt_number}</span>
                <span>{new Date(selectedReceipt.dispensed_at).toLocaleDateString()}</span>
              </div>

              <div className="text-[11px] border-b border-dashed border-slate-300 pb-2">
                <p>Customer: {selectedReceipt.customer_name} ({selectedReceipt.customer_phone || "Walk-in"})</p>
                <p>Rx Ref: {selectedReceipt.prescription_number || "OTC"}</p>
                <p>Payment: {selectedReceipt.payment_method}</p>
              </div>

              <div className="space-y-1.5 py-1">
                {(selectedReceipt.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div>
                      <p className="font-bold">{it.medication_name}</p>
                      <p className="text-[9px] text-slate-500">Batch: {it.batch_number} ({it.quantity} x GHS {Number(it.unit_price).toFixed(2)})</p>
                    </div>
                    <span className="font-bold">GHS {Number(it.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL REPRINT</span>
                  <span>GHS {Number(selectedReceipt.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => window.print()}
              className="w-full gap-2 bg-teal-600 hover:bg-teal-700 font-bold font-sans"
            >
              <Printer className="h-4 w-4" /> Send to Printer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
