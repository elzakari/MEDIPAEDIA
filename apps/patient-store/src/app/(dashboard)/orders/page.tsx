"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Building2,
  QrCode,
  Truck,
  Store,
  ShieldCheck,
  ArrowRight,
  Printer,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  QRCode,
  Modal,
} from "@medipaedia/ui";
import { createApiClient, PatientOrder } from "@medipaedia/api-client";

export default function PatientOrdersPage() {
  const [selectedPickupQr, setSelectedPickupQr] = useState<PatientOrder | null>(null);
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiClient = createApiClient();

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPatientOrders();
      setOrders(data || []);
    } catch (err: any) {
      console.warn("Could not load patient orders:", err.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Orders & Escrow Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status tracking, QR verification tokens for pharmacy pickup, and automated Paystack escrow protection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="p-2 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/marketplace">
            <Button variant="primary" className="gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-xs">
              Order More Medicines <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          Loading your active orders and escrow status...
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-16 text-center space-y-3">
          <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-base">No Orders Placed Yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't purchased or locked any medications from the pharmacy network yet. Find medicine in stock nearby to place your first order.
          </p>
          <Link href="/marketplace">
            <Button variant="primary" size="sm" className="mt-2 text-xs bg-teal-600 hover:bg-teal-700 font-bold">
              Find Medicines Nearby
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isReady = order.status === "READY_FOR_PICKUP";
            const isCompleted = order.status === "COMPLETED";

            return (
              <Card key={order.id} className={isReady ? "border-teal-500 shadow-md" : "border-slate-200"}>
                <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{order.order_number}</span>
                          <Badge variant={isCompleted ? "success" : "teal"}>
                            {(order.status || "HELD").replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(order.created_at).toLocaleDateString()} · {order.pharmacy_name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">ESCROW AMOUNT</span>
                      <strong className="text-lg font-black font-mono text-slate-900">
                        GHS {Number(order.total_amount).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="text-teal-700">1. Escrow Funded</span>
                      <span className={isReady || isCompleted ? "text-teal-700 font-bold" : "text-slate-400"}>
                        2. Ready for Pickup
                      </span>
                      <span className={isCompleted ? "text-teal-700 font-bold" : "text-slate-400"}>
                        3. Fulfilled & Released
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-500 rounded-full"
                        style={{ width: isCompleted ? "100%" : isReady ? "66%" : "33%" }}
                      />
                    </div>
                  </div>

                  {/* Items & Pickup Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Ordered Medications
                      </span>
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                          <span className="font-semibold text-slate-800">{it.medication_name}</span>
                          <span className="font-mono text-slate-700">Qty: {it.quantity} · GHS {Number(it.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Store className="h-4 w-4 text-teal-600" />
                          <span>Pickup Location</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{order.pharmacy_name}</p>
                        <p className="text-[11px] text-slate-400">{order.pharmacy_address || "Accra, Ghana"}</p>
                      </div>

                      {order.otp_code && (
                        <Button
                          variant="primary"
                          onClick={() => setSelectedPickupQr(order)}
                          className="w-full gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-xs"
                        >
                          <QrCode className="h-4 w-4" /> Show Pickup QR & OTP Code
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pickup QR Modal */}
      {selectedPickupQr && (
        <Modal
          isOpen={!!selectedPickupQr}
          onClose={() => setSelectedPickupQr(null)}
          title="Pharmacy Counter Pickup QR"
          description={`Order Number: ${selectedPickupQr.order_number} · ${selectedPickupQr.pharmacy_name}`}
        >
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <QRCode
              value={`https://medipaedia.health/verify/pickup?order=${selectedPickupQr.order_number}&otp=${selectedPickupQr.otp_code}`}
              size={200}
            />
            <div className="text-center space-y-2">
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                <span className="text-xs text-slate-500 block">PICKUP COLLECTION OTP</span>
                <strong className="text-3xl font-black text-teal-900 font-mono tracking-widest">
                  {selectedPickupQr.otp_code}
                </strong>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Show this QR code or 6-digit OTP to the pharmacist at {selectedPickupQr.pharmacy_name} to collect your order and authorize platform escrow release.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
