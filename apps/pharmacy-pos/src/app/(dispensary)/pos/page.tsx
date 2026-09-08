"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Printer,
  Smartphone,
  CheckCircle2,
  DollarSign,
  Search,
  Tag,
  Scan,
  User,
  Camera,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, PrinterSetupModal } from "@medipaedia/ui";
import { PrinterManager, buildCashierReceipt80mm, buildDrugAuxiliaryLabel50x30mm } from "@medipaedia/hardware";
import { createApiClient } from "@medipaedia/api-client";


export default function DispensaryPOSCheckoutPage() {
  const apiClient = createApiClient();
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MOMO");
  const [customerName, setCustomerName] = useState("Walk-in Patient");
  const [customerPhone, setCustomerPhone] = useState("0244555199");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);

  const handleThermalReceiptPrint = async (rcp: any) => {
    try {
      const bytes = buildCashierReceipt80mm({
        facilityName: "Osu Community Pharmacy",
        facilityAddress: "Oxford Street, Osu, Accra",
        facilityPhone: "+233 30 277 8899",
        receiptNumber: rcp.id || "RX-RCP-2026",
        date: rcp.date || new Date().toLocaleString("en-GB"),
        cashierName: rcp.cashier || "Pharm. Kojo Asante",
        patientName: customerName,
        patientMrn: "WALK-IN",
        items: (rcp.items || []).map((i: any) => ({
          description: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          total: i.qty * i.unitPrice,
        })),
        subtotal: rcp.total || 0,
        grandTotal: rcp.total || 0,
        currency: "GHS",
        paymentMethod: rcp.method || "MOMO",
        transactionRef: rcp.id,
        verificationUrl: `https://medipaedia.health/verify/rx-pos/${rcp.id}`,
        autoCut: true,
        kickDrawer: true,
      });

      const res = await PrinterManager.getInstance().print("RECEIPT", bytes);
      console.log("Thermal Receipt Print output:", res);
    } catch (err: any) {
      console.warn("Thermal receipt print notice:", err.message);
    }
  };

  const handleThermalAuxLabelsPrint = async (rcp: any) => {
    setIsPrintingLabels(true);
    try {
      for (const item of rcp.items || []) {
        const bytes = buildDrugAuxiliaryLabel50x30mm({
          facilityName: "Osu Community Pharmacy",
          rxClaimPin: rcp.id,
          drugName: item.name,
          dosageInstructions: "Take as directed by pharmacist",
          quantity: `${item.qty} Units`,
          patientName: customerName,
          batchNumber: "LOT-POS-2026",
          expiryDate: "12/2027",
          auxiliaryWarningLang: "EN",
          barcodeSku: rcp.id,
        });
        await PrinterManager.getInstance().print("LABEL", bytes);
      }
    } catch (err: any) {
      console.warn("Aux label print notice:", err.message);
    } finally {
      setIsPrintingLabels(false);
    }
  };

  // AI Rx OCR State
  const [isRxOcrModalOpen, setIsRxOcrModalOpen] = useState(false);
  const [isProcessingRxOcr, setIsProcessingRxOcr] = useState(false);


  const handleScanPaperRx = async (sampleHint?: string) => {
    setIsProcessingRxOcr(true);
    try {
      const res = await apiClient.extractPrescriptionOCR({
        doctor_notes_hint:
          sampleHint ||
          "Coartem 20/120mg 4 tabs stat then BD x 3d, Paracetamol 500mg TDS x 3d, Amoxicillin-Clavulanate 625mg BD x 5d",
      });
      const newItems = res.extracted_items.map((item, idx) => ({
        id: item.drug_id || `prod-ocr-${Date.now()}-${idx}`,
        name: item.medication_name,
        batch: `LOT-OCR-2026-${Math.floor(10 + Math.random() * 90)}`,
        exp: "30 Nov 2027",
        qty: item.quantity_prescribed || 1,
        unitPrice: item.unit_price,
      }));
      setCart((prev) => [...prev, ...newItems]);
      setTimeout(() => {
        setIsRxOcrModalOpen(false);
      }, 1000);
    } catch (err: any) {
      console.warn("Error scanning Rx:", err.message);
    } finally {
      setIsProcessingRxOcr(false);
    }
  };

  const [cart, setCart] = useState([
    {
      id: "prod-01",
      name: "Coartem 20/120mg Tablets",
      batch: "LOT-COA-2026-01",
      exp: "30 Nov 2027",
      qty: 1,
      unitPrice: 45.0,
    },
    {
      id: "prod-02",
      name: "Paracetamol 500mg (Ernest)",
      batch: "LOT-PCM-2026-03",
      exp: "20 Sep 2027",
      qty: 2,
      unitPrice: 6.0,
    },
  ]);

  const quickCatalog = [
    { id: "q1", name: "Amoxicillin 500mg Caps", batch: "LOT-AMX-2026-02", exp: "15 Oct 2027", price: 25.0 },
    { id: "q2", name: "Ibuprofen 400mg Tabs", batch: "LOT-IBU-2026-04", exp: "12 Dec 2027", price: 12.0 },
    { id: "q3", name: "Vitamin C 500mg Chewable", batch: "LOT-VTC-2026-01", exp: "28 Feb 2028", price: 15.0 },
    { id: "q4", name: "Lonart Forte 80/480mg", batch: "LOT-LON-2026-03", exp: "15 Oct 2027", price: 35.0 },
  ];

  const subtotal = cart.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  const tax = 0.0;
  const total = subtotal + tax;

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          batch: product.batch,
          exp: product.exp,
          qty: 1,
          unitPrice: product.price,
        },
      ]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const newRcp = {
        id: `ORD-POS-${Math.floor(100000 + Math.random() * 900000)}`,
        orderNumber: `ORD-POS-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleString("en-GB"),
        cashier: "Pharm. Kojo Asante",
        customer: customerName,
        phone: customerPhone,
        method: paymentMethod,
        items: cart,
        total: total,
      };
      setReceiptData(newRcp);
      setCheckoutModalOpen(true);
      handleThermalReceiptPrint(newRcp);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="h-5 w-5 text-teal-700" /> Fast Over-the-Counter (OTC) Checkout Terminal
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Register: POS-01 • Drawer: OPEN • MoMo Push Direct Gateway
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrinterModalOpen(true)}
            className="gap-1.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-teal-700" /> Printer Setup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRxOcrModalOpen(true)}
            className="gap-1.5 text-xs font-bold border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <Scan className="h-3.5 w-3.5 text-indigo-600" /> Scan Paper Rx with AI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Side: Quick Catalog & Search (Col span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Scan barcode or type medication brand name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-2">
            <span className="font-extrabold text-xs text-slate-800 uppercase block">
              Fast-Moving OTC Catalog
            </span>
            <div className="grid grid-cols-2 gap-3">
              {quickCatalog.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => addToCart(prod)}
                  className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 text-left transition-all shadow-sm space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                      {prod.name}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{prod.batch}</span>
                    <strong className="text-teal-950 font-bold">GHS {prod.price.toFixed(2)}</strong>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Cart & Payment Selector (Col span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 border border-slate-200 bg-white shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-extrabold text-sm text-slate-900">Current Basket</span>
              <Badge variant="teal" className="text-[10px] font-bold font-mono">
                {cart.length} Items
              </Badge>
            </div>

            {/* Cart Items List */}
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-slate-400">Basket is empty. Select items to add.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block">{item.name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.qty} × GHS {item.unitPrice.toFixed(2)} ({item.batch})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        GHS {(item.qty * item.unitPrice).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block font-bold text-slate-700 text-[11px]">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {["MOMO", "CASH", "CARD"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                      paymentMethod === m
                        ? "bg-teal-800 text-white shadow-sm"
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 font-mono">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Subtotal:</span>
                <span>GHS {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Tax (0%):</span>
                <span>GHS {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Due:</span>
                <span className="text-teal-900">GHS {total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={cart.length === 0}
              onClick={handleCheckout}
              isLoading={isProcessing}
              className="w-full font-bold shadow-md shadow-teal-700/20"
            >
              Complete Sale & Print Thermal Receipt
            </Button>
          </Card>
        </div>
      </div>

      {/* Receipt Modal */}
      {checkoutModalOpen && receiptData && (
        <Modal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          title="Payment Completed & Receipt Printed"
          description="Sale transaction settled and logged to pharmacy POS ledger."
        >
          <div className="py-4 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-[11px] space-y-2 border border-slate-800">
              <div className="text-center font-bold text-teal-300">
                ========================================<br />
                   OSU COMMUNITY PHARMACY<br />
                     OXFORD STREET, ACCRA<br />
                    TEL: +233 30 277 8899<br />
                ========================================
              </div>
              <div>RECEIPT:  {receiptData.orderNumber}</div>
              <div>DATE:     {receiptData.date}</div>
              <div>CASHIER:  {receiptData.cashier}</div>
              <div>METHOD:   {receiptData.method}</div>
              <div className="py-1 border-y border-slate-700 space-y-1">
                {receiptData.items.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{i.qty}x {i.name}</span>
                    <span>GHS {(i.qty * i.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-black text-teal-300">
                <span>TOTAL PAID:</span>
                <span>GHS {receiptData.total.toFixed(2)}</span>
              </div>
              <div className="text-[9px] text-slate-400 text-center pt-2">
                THANK YOU FOR YOUR PATRONAGE.<br />
                MEDICINES ONCE SOLD ARE NOT RETURNABLE.
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleThermalReceiptPrint(receiptData)}
                  className="flex-1 font-bold gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  <Printer className="h-4 w-4" /> Print ESC/POS 80mm
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  disabled={isPrintingLabels}
                  onClick={() => handleThermalAuxLabelsPrint(receiptData)}
                  className="flex-1 font-bold gap-1.5 border-teal-300 text-teal-800 hover:bg-teal-50 text-xs"
                >
                  <Tag className="h-4 w-4 text-teal-700" />
                  <span>{isPrintingLabels ? "Printing..." : "Print 50x30 Labels"}</span>
                </Button>
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={() => setCheckoutModalOpen(false)}
                className="w-full font-bold text-xs"
              >
                New Transaction
              </Button>
            </div>
          </div>
        </Modal>
      )}


      {/* AI Prescription OCR Modal */}
      {isRxOcrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Scan className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Prescription Handwriting OCR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Extracts drug names, dosages, and injects directly into POS cart
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRxOcrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scanning Viewfinder */}
            <div className="relative rounded-2xl bg-slate-950 p-6 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/40 text-center overflow-hidden min-h-[200px]">
              {isProcessingRxOcr ? (
                <div className="space-y-2 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-xs font-bold text-indigo-300">
                    Reading Doctor's Handwriting & Matching Drug Catalog...
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">Zero-PHI Local Buffer Processing</p>
                </div>
              ) : (
                <div className="space-y-2.5 z-10">
                  <Camera className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-200">
                    Upload physical doctor's prescription note or choose a sample:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleScanPaperRx(
                          "Coartem 20/120mg 4 tabs stat then BD x 3d, Paracetamol 500mg TDS x 3d, Amoxicillin-Clavulanate 625mg BD x 5d"
                        )
                      }
                      className="text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50"
                    >
                      💊 Malaria + Antibiotic Regimen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleScanPaperRx(
                          "Amlodipine Besylate 10mg OD morning x 30d, Losartan 50mg OD x 30d, Paracetamol 500mg PRN"
                        )
                      }
                      className="text-[10px] font-bold text-emerald-700 bg-white hover:bg-emerald-50"
                    >
                      ❤️ Hypertension Maintenance Rx
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> High-Confidence Catalog Match
              </span>
              <span className="font-mono text-slate-400">1-Click Basket Injection</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsRxOcrModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hardware Printer Setup */}
      <PrinterSetupModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        defaultTab="RECEIPT"
      />
    </div>
  );
}

