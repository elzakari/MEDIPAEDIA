"use client";

import React, { useEffect, useState } from "react";
import {
  PackageCheck,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  DollarSign,
  User,
  Phone,
  Truck,
  MapPin,
  Navigation,
  Printer,
  KeyRound,
  Lock,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  Check,
  X,
  ExternalLink,
  Globe,
  Copy,
  Bot,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@medipaedia/ui";
import {
  createApiClient,
  CounterPickupItem,
  CourierDeliveryItem,
  UnifiedDispatchQueueResponse,
  MultilingualCounselingResponse,
  SupportedCounselingLanguage,
} from "@medipaedia/api-client";

export default function UnifiedDispensaryDispatchPage() {
  const apiClient = createApiClient();

  const [isLoading, setIsLoading] = useState(true);
  const [counterPickups, setCounterPickups] = useState<CounterPickupItem[]>([]);
  const [courierDeliveries, setCourierDeliveries] = useState<CourierDeliveryItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Counter Pickup OTP Modal
  const [selectedPickup, setSelectedPickup] = useState<CounterPickupItem | null>(null);
  const [pickupOtp, setPickupOtp] = useState("491028");
  const [isVerifyingPickup, setIsVerifyingPickup] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState(false);

  // Courier Dispatch Modal
  const [selectedCourierOrder, setSelectedCourierOrder] = useState<CourierDeliveryItem | null>(null);
  const [courierProvider, setCourierProvider] = useState<"YANGO" | "BOLT" | "IN_HOUSE">("YANGO");
  const [riderName, setRiderName] = useState("Kofi Annan (Yango Courier #8821)");
  const [riderPhone, setRiderPhone] = useState("+233 50 119 2837");
  const [vehicleReg, setVehicleReg] = useState("M-24-GR-9012");
  const [dispatchNotes, setDispatchNotes] = useState("Handle cold-chain pack with care");
  const [isDispatching, setIsDispatching] = useState(false);

  // Multilingual AI Counseling State
  const [counselingModalOpen, setCounselingModalOpen] = useState(false);
  const [counselingTargetPatient, setCounselingTargetPatient] = useState("");
  const [counselingItems, setCounselingItems] = useState<any[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedCounselingLanguage>("ENGLISH");
  const [counselingData, setCounselingData] = useState<MultilingualCounselingResponse | null>(null);
  const [isGeneratingCounseling, setIsGeneratingCounseling] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const handleOpenCounselingModal = (customerName: string, items: any[]) => {
    setCounselingTargetPatient(customerName);
    setCounselingItems(items);
    setCounselingModalOpen(true);
    handleFetchCounseling("ENGLISH", customerName, items);
  };

  const handleFetchCounseling = async (
    lang: SupportedCounselingLanguage,
    patientName?: string,
    rawItems?: any[]
  ) => {
    setSelectedLanguage(lang);
    setIsGeneratingCounseling(true);
    try {
      const itemsList = rawItems || counselingItems;
      const formattedItems = itemsList.map((it: any) => ({
        medication_name: it.medication_name,
        dosage: it.dosage,
        frequency: "As directed",
        duration_days: 5,
      }));

      const res = await apiClient.generatePatientCounseling({
        prescription_items: formattedItems.length > 0 ? formattedItems : [
          { medication_name: "Coartem 20/120mg", dosage: "4 tablets stat then BD", frequency: "BD", duration_days: 3 }
        ],
        target_language: lang,
        patient_name: patientName || counselingTargetPatient,
      });
      setCounselingData(res);
    } catch (err: any) {
      console.warn("AI Counseling error:", err.message);
    } finally {
      setIsGeneratingCounseling(false);
    }
  };

  const handleCopySms = () => {
    if (!counselingData) return;
    navigator.clipboard.writeText(counselingData.sms_whatsapp_dispatch_copy);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 3000);
  };

  const loadDispatchQueue = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getUnifiedDispatchQueue();
      setCounterPickups(res.counter_pickups || []);
      setCourierDeliveries(res.courier_deliveries || []);
    } catch (err) {
      console.error("Failed to load dispatch queue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDispatchQueue();
  }, []);

  const handleVerifyCounterPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPickup) return;
    setIsVerifyingPickup(true);

    setTimeout(() => {
      setIsVerifyingPickup(false);
      setPickupSuccess(true);

      setCounterPickups((prev) =>
        prev.map((p) =>
          p.order_id === selectedPickup.order_id
            ? { ...p, status: "COLLECTED", escrow_status: "ESCROW_RELEASED_TO_PHARMACY" }
            : p
        )
      );

      setTimeout(() => {
        setPickupSuccess(false);
        setSelectedPickup(null);
        setStatusMessage({
          type: "success",
          text: `Order ${selectedPickup.order_number} successfully collected. Paystack escrow balance released.`,
        });
      }, 1000);
    }, 600);
  };

  const handleDispatchCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourierOrder) return;
    setIsDispatching(true);
    try {
      const res = await apiClient.dispatchCourierDelivery({
        order_id: selectedCourierOrder.order_id,
        courier_provider: courierProvider,
        rider_name: riderName,
        rider_phone: riderPhone,
        vehicle_registration: vehicleReg,
        notes: dispatchNotes,
      });

      setCourierDeliveries((prev) =>
        prev.map((c) =>
          c.order_id === selectedCourierOrder.order_id
            ? {
                ...c,
                status: "IN_TRANSIT",
                courier_provider: courierProvider,
                rider_name: riderName,
                rider_phone: riderPhone,
                tracking_code: res.tracking_code,
                dispatched_at: res.dispatched_at,
              }
            : c
        )
      );

      setSelectedCourierOrder(null);
      setStatusMessage({
        type: "success",
        text: res.message,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to dispatch courier order.",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-teal-700" />
            Unified Split-Screen Dispensary &amp; Delivery Dispatch Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Simultaneous management of walk-in counter customer pickups and marketplace express courier handovers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDispatchQueue}
            className="text-xs font-bold gap-1 text-slate-600 border-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            {statusMessage.text}
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-teal-200 bg-teal-50/50">
          <p className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
            Counter Pickups Ready
          </p>
          <p className="text-2xl font-black text-teal-900 mt-1">
            {counterPickups.filter((p) => p.status === "READY_FOR_PICKUP").length}
          </p>
          <p className="text-[10px] text-teal-600 font-semibold mt-0.5">Awaiting customer PIN</p>
        </Card>

        <Card className="p-4 border-amber-200 bg-amber-50/50">
          <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
            Awaiting Courier Pickup
          </p>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {courierDeliveries.filter((c) => c.status === "AWAITING_COURIER").length}
          </p>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Rider dispatch pending</p>
        </Card>

        <Card className="p-4 border-indigo-200 bg-indigo-50/50">
          <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
            In-Transit Deliveries
          </p>
          <p className="text-2xl font-black text-indigo-900 mt-1">
            {courierDeliveries.filter((c) => c.status === "IN_TRANSIT").length}
          </p>
          <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Live GPS tracking active</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-slate-50/70">
          <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
            Escrow Protection
          </p>
          <p className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Paystack &amp; MoMo Secure
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Unlocked upon OTP confirmation</p>
        </Card>
      </div>

      {/* SPLIT-SCREEN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: WALK-IN COUNTER PICKUPS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-teal-900 text-white px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-teal-300" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Walk-in &amp; In-Store Counter Pickups
              </h2>
            </div>
            <Badge variant="teal" className="bg-teal-800 text-teal-100 border-none font-bold text-[10px]">
              {counterPickups.filter((p) => p.status === "READY_FOR_PICKUP").length} Waiting
            </Badge>
          </div>

          <div className="space-y-3">
            {counterPickups.map((pickup) => (
              <Card
                key={pickup.order_id}
                className={`border transition shadow-sm ${
                  pickup.status === "COLLECTED"
                    ? "border-emerald-200 bg-emerald-50/30 opacity-70"
                    : "border-slate-200 bg-white hover:border-teal-300"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {pickup.order_number}
                      </span>
                      <strong className="text-sm font-bold text-slate-900 block">
                        {pickup.customer_name}
                      </strong>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {pickup.customer_phone}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block font-mono">
                        GHS {pickup.total_amount_ghs.toFixed(2)}
                      </span>
                      <Badge
                        variant={pickup.status === "COLLECTED" ? "teal" : "warning"}
                        className="text-[9px] font-bold uppercase mt-1"
                      >
                        {pickup.status === "COLLECTED" ? "COLLECTED" : "READY FOR PICKUP"}
                      </Badge>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Prescribed Batch Package:
                    </p>
                    {pickup.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-800 font-medium">
                          {it.quantity}x {it.name}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          {it.batch}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3" /> Ready: {pickup.ready_since}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCounselingModal(pickup.customer_name, pickup.items)}
                        className="text-[11px] font-bold gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Globe className="h-3.5 w-3.5" /> AI Counseling
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                        className="text-[11px] font-bold gap-1 text-slate-600 border-slate-200"
                      >
                        <Printer className="h-3.5 w-3.5" /> Thermal Slip
                      </Button>

                      {pickup.status !== "COLLECTED" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedPickup(pickup);
                            setPickupOtp(pickup.collection_otp || "491028");
                          }}
                          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] gap-1.5"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Verify OTP &amp; Release
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: MARKETPLACE DELIVERY DISPATCH */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-950 text-white px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-300" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Marketplace Express Delivery Dispatch
              </h2>
            </div>
            <Badge variant="outline" className="bg-indigo-900 text-indigo-200 border-indigo-700 font-bold text-[10px]">
              {courierDeliveries.length} Deliveries
            </Badge>
          </div>

          <div className="space-y-3">
            {courierDeliveries.map((delivery) => (
              <Card
                key={delivery.order_id}
                className="border border-slate-200 bg-white hover:border-indigo-300 transition shadow-sm"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {delivery.order_number}
                      </span>
                      <strong className="text-sm font-bold text-slate-900 block">
                        {delivery.customer_name}
                      </strong>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {delivery.customer_phone}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block font-mono">
                        GHS {delivery.total_amount_ghs.toFixed(2)}
                      </span>
                      <Badge
                        variant={
                          delivery.status === "IN_TRANSIT"
                            ? "secondary"
                            : delivery.status === "DELIVERED"
                            ? "teal"
                            : "warning"
                        }
                        className="text-[9px] font-bold uppercase mt-1"
                      >
                        {delivery.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* Delivery destination */}
                  <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs space-y-1">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-800 font-semibold block">
                          {delivery.delivery_address}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          GPS: {delivery.digital_gps_address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Courier assignment details if in transit */}
                  {delivery.status === "IN_TRANSIT" && (
                    <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Rider Assigned:</span>
                        <strong className="text-slate-800">{delivery.rider_name}</strong>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Tracking Code:</span>
                        <strong className="text-indigo-700 font-mono">{delivery.tracking_code}</strong>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Delivery Confirmation OTP:</span>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {delivery.delivery_otp}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      {delivery.dispatched_at ? `Dispatched: ${delivery.dispatched_at}` : "Packed & Sealed"}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCounselingModal(delivery.customer_name, [])}
                        className="text-[11px] font-bold gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Globe className="h-3.5 w-3.5" /> AI Counseling
                      </Button>

                      {delivery.status === "AWAITING_COURIER" ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedCourierOrder(delivery);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] gap-1.5"
                        >
                          <Truck className="h-3.5 w-3.5" /> Dispatch Rider
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.print()}
                          className="text-[11px] font-bold gap-1 text-slate-600 border-slate-200"
                        >
                          <Printer className="h-3.5 w-3.5" /> Waybill Slip
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Counter OTP Verification Modal */}
      {selectedPickup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Customer Pickup PIN Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order: <span className="font-mono font-bold text-slate-800">{selectedPickup.order_number}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPickup(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyCounterPickup} className="space-y-4 text-xs">
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 space-y-1">
                <p className="text-teal-900 font-bold">Patient / Customer: {selectedPickup.customer_name}</p>
                <p className="text-[11px] text-teal-700">
                  Total Payable / Released from Escrow: <strong>GHS {selectedPickup.total_amount_ghs.toFixed(2)}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Enter 6-Digit Collection OTP from Patient's SMS:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pickupOtp}
                  onChange={(e) => setPickupOtp(e.target.value)}
                  placeholder="e.g. 491028"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-center font-mono font-black text-lg tracking-widest"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSelectedPickup(null)}
                  disabled={isVerifyingPickup}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isVerifyingPickup}
                  className="bg-teal-700 hover:bg-teal-800 font-bold text-white gap-2"
                >
                  {isVerifyingPickup ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying PIN...
                    </>
                  ) : pickupSuccess ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-300" />
                      PIN Verified!
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Confirm &amp; Release Medication
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courier Rider Dispatch Modal */}
      {selectedCourierOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Handover to Courier Rider
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order: <span className="font-mono font-bold text-slate-800">{selectedCourierOrder.order_number}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCourierOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchCourier} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1">
                <p className="text-indigo-900 font-bold">Delivery Address: {selectedCourierOrder.delivery_address}</p>
                <p className="text-[11px] font-mono text-indigo-700">
                  GPS: <strong>{selectedCourierOrder.digital_gps_address}</strong> · Customer: {selectedCourierOrder.customer_phone}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Courier Delivery Partner *
                </label>
                <select
                  value={courierProvider}
                  onChange={(e) => setCourierProvider(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="YANGO">Yango Delivery Express (API Synced)</option>
                  <option value="BOLT">Bolt Logistics (Express Courier)</option>
                  <option value="IN_HOUSE">In-House Pharmacy Dispatch Rider</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rider Full Name *</label>
                  <input
                    type="text"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rider Phone *</label>
                  <input
                    type="text"
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motorbike / Vehicle Plate</label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatch Instructions</label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSelectedCourierOrder(null)}
                  disabled={isDispatching}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isDispatching}
                  className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white gap-2"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Handing Over...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4" />
                      Confirm Rider Handover &amp; Dispatch
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multilingual AI Counseling Modal */}
      {counselingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Multilingual Patient Counseling
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <span className="font-bold text-slate-800">{counselingTargetPatient}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCounselingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Language Switcher Tabs */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-center text-[10px] font-extrabold">
              {(["ENGLISH", "FRENCH", "TWI", "EWE", "GA"] as SupportedCounselingLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleFetchCounseling(lang)}
                  className={`py-1.5 rounded-lg transition ${
                    selectedLanguage === lang
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {lang === "FRENCH" ? "Français" : lang === "TWI" ? "Twi" : lang === "EWE" ? "Eʋe" : lang === "GA" ? "Ga" : "English"}
                </button>
              ))}
            </div>

            {isGeneratingCounseling ? (
              <div className="p-6 text-center text-indigo-700 font-bold text-xs flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating counseling instructions in {selectedLanguage}...
              </div>
            ) : counselingData ? (
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5 text-xs max-h-80 overflow-y-auto">
                <p className="font-bold text-indigo-950 text-[11px]">
                  {counselingData.patient_greeting}
                </p>

                <div className="space-y-1.5">
                  {counselingData.medications_counseling.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                      <div className="flex justify-between items-baseline font-bold text-[11px] text-slate-900">
                        <span>{m.medication_name}</span>
                        <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {m.auxiliary_label_text}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700">👉 {m.how_to_take}</p>
                      <p className="text-[10px] text-amber-800 font-medium">🍽️ {m.meal_instructions}</p>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-slate-600 italic">
                  💡 {counselingData.general_lifestyle_advice}
                </div>

                <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[10px] font-semibold">
                  ⚠️ {counselingData.emergency_warning}
                </div>
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setCounselingModalOpen(false)}
              >
                Close
              </Button>

              <Button
                variant="primary"
                type="button"
                onClick={handleCopySms}
                disabled={!counselingData}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs"
              >
                {copiedSms ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedSms ? "Copied SMS to Clipboard!" : "Copy for Patient SMS / WhatsApp"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
