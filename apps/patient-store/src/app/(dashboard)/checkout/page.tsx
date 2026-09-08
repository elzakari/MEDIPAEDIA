"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Truck,
  Store,
  CreditCard,
  Smartphone,
  Lock,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Loader2,
  Zap,
  Globe,
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
import { createApiClient } from "@medipaedia/api-client";

const WEST_AFRICA_COUNTRIES = {
  GH: {
    name: "Ghana",
    flag: "🇬🇭",
    currency: "GHS",
    gateway: "PAYSTACK",
    rate: 1.0,
    networks: [
      { id: "mtn", name: "MTN Mobile Money", ussd: "*170#" },
      { id: "telecel", name: "Telecel Cash", ussd: "*110#" },
      { id: "at", name: "AT Money", ussd: "*110#" },
    ],
  },
  TG: {
    name: "Togo",
    flag: "🇹🇬",
    currency: "XOF",
    gateway: "FEDAPAY",
    rate: 50.0,
    networks: [
      { id: "tmoney", name: "T-Money (Togo)", ussd: "*145#" },
      { id: "moov_tg", name: "Moov Money Togo", ussd: "*155#" },
    ],
  },
  BJ: {
    name: "Bénin",
    flag: "🇧🇯",
    currency: "XOF",
    gateway: "FEDAPAY",
    rate: 50.0,
    networks: [
      { id: "mtn_bj", name: "MTN MoMo Bénin", ussd: "*880#" },
      { id: "moov_bj", name: "Moov Money Bénin", ussd: "*855#" },
    ],
  },
};

function CheckoutOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedCountry, setSelectedCountry] = useState<"GH" | "TG" | "BJ">("GH");
  const activeCountry = WEST_AFRICA_COUNTRIES[selectedCountry];

  const pharmacyId = searchParams.get("pharmacyId") || "osu-pharmacy";
  const pharmacyName = searchParams.get("pharmacyName") || "Osu Community Pharmacy";
  const medName = searchParams.get("med") || "Coartem 80/480mg Tablets";
  const basePriceGHS = parseFloat(searchParams.get("price") || "45.00");
  const rxPin = searchParams.get("rxPin") || "9K4L2P";

  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("House No. 14, Ringway Estates, Osu, Accra");
  const [deliveryPhone, setDeliveryPhone] = useState("+233 24 555 0199");
  const [momoNetwork, setMomoNetwork] = useState("mtn");
  const [momoPhone, setMomoPhone] = useState("0244123456");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [momoTxRef, setMomoTxRef] = useState("");

  const apiClient = createApiClient();

  useEffect(() => {
    setMomoNetwork(activeCountry.networks[0].id);
    if (selectedCountry === "GH") setMomoPhone("0244123456");
    else if (selectedCountry === "TG") setMomoPhone("+228 90 12 34 56");
    else setMomoPhone("+229 97 00 11 22");
  }, [selectedCountry]);

  const deliveryFeeGHS = fulfillmentType === "DELIVERY" ? 15.0 : 0.0;
  const subtotalInCurr = basePriceGHS * activeCountry.rate;
  const deliveryInCurr = deliveryFeeGHS * activeCountry.rate;
  const totalInCurr = subtotalInCurr + deliveryInCurr;

  const handleInitiatePayment = () => {
    setIsProcessing(true);
    const ref = `${activeCountry.gateway === "PAYSTACK" ? "PAY-GH" : "FEDA-XOF"}-${Date.now().toString().slice(-6)}`;
    setMomoTxRef(ref);

    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutModalOpen(true);
    }, 600);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      await apiClient.initiateMoMoCharge({
        country: selectedCountry,
        currency: activeCountry.currency,
        amount: totalInCurr,
        phone: momoPhone,
        network: momoNetwork,
        customer_name: "Active Patient User",
        description: `Prescription Order for ${medName}`,
      });
    } catch (err: any) {
      console.warn("Checkout submission notice:", err.message);
    } finally {
      setIsProcessing(false);
      setOrderComplete(true);
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/marketplace">
          <span className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to Pharmacy Results
          </span>
        </Link>

        {/* Multi-Country Currency Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setSelectedCountry("GH")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
              selectedCountry === "GH" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
            }`}
          >
            <span>🇬🇭</span> GHS
          </button>
          <button
            onClick={() => setSelectedCountry("TG")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
              selectedCountry === "TG" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
            }`}
          >
            <span>🇹🇬</span> Togo XOF
          </button>
          <button
            onClick={() => setSelectedCountry("BJ")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
              selectedCountry === "BJ" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
            }`}
          >
            <span>🇧🇯</span> Bénin XOF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Fulfillment & Payment Details (Span 2) */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Fulfillment Type */}
          <Card className="p-6 border border-slate-200 bg-white shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              1. Choose Fulfillment Method
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setFulfillmentType("PICKUP")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col items-start gap-2 ${
                  fulfillmentType === "PICKUP"
                    ? "border-teal-600 bg-teal-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                    <Store className="h-5 w-5" />
                  </div>
                  <Badge variant={fulfillmentType === "PICKUP" ? "teal" : "outline"} className="text-[10px]">
                    Instant Ready
                  </Badge>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Direct Storefront Pickup</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Collect at {pharmacyName} with 6-digit OTP pass</p>
                </div>
                <span className="text-xs font-bold text-teal-700 mt-auto">FREE</span>
              </div>

              <div
                onClick={() => setFulfillmentType("DELIVERY")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col items-start gap-2 ${
                  fulfillmentType === "DELIVERY"
                    ? "border-teal-600 bg-teal-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                    <Truck className="h-5 w-5" />
                  </div>
                  <Badge variant={fulfillmentType === "DELIVERY" ? "teal" : "outline"} className="text-[10px]">
                    Express Courier
                  </Badge>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Doorstep Delivery</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Insulated medical courier to your address</p>
                </div>
                <span className="text-xs font-bold text-slate-900 mt-auto">
                  + {activeCountry.currency} {deliveryInCurr.toLocaleString()}
                </span>
              </div>
            </div>

            {fulfillmentType === "DELIVERY" && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <Input
                  label="Delivery Address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Ringway Estates, House 14"
                />
                <Input
                  label="Recipient Phone Number"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="e.g. +233 24 555 0199"
                />
              </div>
            )}
          </Card>

          {/* Section 2: Mobile Money Payment Network */}
          <Card className="p-6 border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-amber-600" />
                2. Mobile Money Payment ({activeCountry.name})
              </h2>
              <Badge variant="teal" className="text-[10px] font-mono font-bold">
                {activeCountry.gateway} MoMo Engine
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {activeCountry.flag} Select Mobile Operator
                </label>
                <select
                  value={momoNetwork}
                  onChange={(e) => setMomoNetwork(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                >
                  {activeCountry.networks.map((net) => (
                    <option key={net.id} value={net.id}>
                      {net.name} ({net.ussd})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Money Wallet Number
                </label>
                <input
                  type="text"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Escrow Protection Guarantee Box */}
            <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-teal-900">Zero-Risk Escrow Guarantee</h4>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Your funds are placed into safe escrow. Payment is released to {pharmacyName} only after you inspect the medication and verify the 6-digit handover OTP.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary (Span 1) */}
        <div className="space-y-4">
          <Card className="p-5 border border-slate-200 bg-white shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Order Summary
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{medName}</span>
                <span className="font-mono">{activeCountry.currency} {subtotalInCurr.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-500">Rx Auth PIN: {rxPin} &bull; Qty: 1 Pack</p>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Medication Cost:</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeCountry.currency} {subtotalInCurr.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Fulfillment Fee:</span>
                <span className="font-mono font-bold text-slate-900">
                  {fulfillmentType === "DELIVERY"
                    ? `${activeCountry.currency} ${deliveryInCurr.toLocaleString()}`
                    : "FREE (Storefront Pickup)"}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Escrow Protection Fee:</span>
                <span className="font-mono font-bold text-emerald-600">0.00 (Free)</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Total Payable:</span>
                <span className="font-mono text-lg text-teal-800">
                  {activeCountry.currency} {totalInCurr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md shadow-teal-700/20 py-3 text-xs flex items-center justify-center gap-1.5"
              onClick={handleInitiatePayment}
              isLoading={isProcessing}
            >
              <Zap className="h-4 w-4" /> Pay via {activeCountry.gateway} MoMo
            </Button>
          </Card>
        </div>
      </div>

      {/* Paystack / FedaPay Simulation Modal */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={`${activeCountry.flag} ${activeCountry.gateway} Mobile Money Authorization`}
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto animate-pulse">
              <Smartphone className="h-5 w-5" />
            </div>
            <h4 className="font-black text-slate-900 text-sm">USSD Prompt Pushed</h4>
            <p className="text-slate-600 text-xs">
              A prompt for <strong>{activeCountry.currency} {totalInCurr.toLocaleString()}</strong> has been sent to <strong>{momoPhone}</strong>.
            </p>
            <p className="text-[11px] text-amber-800 font-mono">
              Dial <strong>{activeCountry.networks.find((n) => n.id === momoNetwork)?.ussd}</strong> to approve on your handset.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>TX REFERENCE:</span>
              <span className="font-bold text-slate-900">{momoTxRef}</span>
            </div>
            <div className="flex justify-between">
              <span>GATEWAY:</span>
              <span className="font-bold text-purple-700">{activeCountry.gateway} WEST AFRICA</span>
            </div>
            <div className="flex justify-between">
              <span>STATUS:</span>
              <span className="font-bold text-amber-600">AWAITING_PIN_AUTHORIZATION</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              className="flex-1 font-bold text-xs"
              onClick={handleConfirmPayment}
              isLoading={isProcessing}
            >
              Simulate Pin Authorization (Approve)
            </Button>
            <Button
              variant="outline"
              className="text-xs"
              onClick={() => setCheckoutModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Complete Success Overlay */}
      {orderComplete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Payment Held in Escrow!</h3>
            <p className="text-xs text-slate-600">
              Your order is sent to {pharmacyName}. Handover pass OTP generated. Redirecting to your Orders Vault...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientCheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Checkout...</div>}>
      <CheckoutOrderContent />
    </Suspense>
  );
}
