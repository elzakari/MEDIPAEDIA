"use client";

import React, { useEffect, useState } from "react";
import {
  Printer,
  Usb,
  Wifi,
  Eye,
  CheckCircle2,
  AlertCircle,
  Scissors,
  DollarSign,
  Play,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import {
  DEFAULT_PRINTER_SETTINGS,
  HardwarePrinterSettings,
  PrinterManager,
  buildCashierReceipt80mm,
  buildDrugAuxiliaryLabel50x30mm,
  buildOpdQueueTicket80mm,
  isWebUSBSupported,
} from "@medipaedia/hardware";

export interface PrinterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "RECEIPT" | "LABEL";
}

export function PrinterSetupModal({
  isOpen,
  onClose,
  defaultTab = "RECEIPT",
}: PrinterSetupModalProps) {
  const [activeTab, setActiveTab] = useState<"RECEIPT" | "LABEL">(defaultTab);
  const [settings, setSettings] = useState<HardwarePrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [webUsbAvailable, setWebUsbAvailable] = useState(false);

  useEffect(() => {
    setWebUsbAvailable(isWebUSBSupported());
    const manager = PrinterManager.getInstance();
    setSettings(manager.loadSettings());
  }, [isOpen]);

  const handleSave = (updated: Partial<HardwarePrinterSettings>) => {
    const manager = PrinterManager.getInstance();
    const newSettings = manager.saveSettings(updated);
    setSettings({ ...newSettings });
  };

  const handlePairUSB = async (type: "RECEIPT" | "LABEL") => {
    setTestResult(null);
    try {
      const manager = PrinterManager.getInstance();
      const deviceName = await manager.pairWebUSBDevice(type);
      setTestResult({
        success: true,
        message: `Paired WebUSB printer successfully: ${deviceName}`,
      });
      setSettings(manager.getSettings());
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to pair WebUSB device.",
      });
    }
  };

  const handleTestPrint = async (type: "RECEIPT" | "LABEL" | "QUEUE") => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const manager = PrinterManager.getInstance();

      let bytes: Uint8Array;
      if (type === "RECEIPT") {
        bytes = buildCashierReceipt80mm({
          facilityName: "Ridge Regional Hospital, Accra",
          facilityAddress: "Castle Road, Ridge, Accra",
          facilityPhone: "+233 30 200 0111",
          receiptNumber: "RCT-2026-9901",
          cashierName: "Senior Cashier on Duty",
          patientName: "Active Patient",
          patientMrn: "MRN-PENDING",
          items: [
            { description: "General OPD Consultation", qty: 1, unitPrice: 80.0, total: 80.0 },
            { description: "Full Blood Count (FBC)", qty: 1, unitPrice: 65.0, total: 65.0 },
            { description: "Artemether + Lumefantrine 20/120", qty: 1, unitPrice: 35.0, total: 35.0 },
          ],
          subtotal: 180.0,
          insuranceDeduction: 50.0,
          grandTotal: 130.0,
          paymentMethod: "MOMO",
          transactionRef: "MTN-MOMO-84920194",
          verificationUrl: "https://medipaedia.health/verify/rct/9901",
          autoCut: true,
          kickDrawer: true,
        });
      } else if (type === "QUEUE") {
        bytes = buildOpdQueueTicket80mm({
          facilityName: "Ridge Regional Hospital",
          ticketNumber: "OPD-8492",
          department: "General OPD Bay 2",
          patientName: "Active Encounter Patient",
          patientMrn: "MRN-PENDING",
          priority: "ROUTINE",
          estimatedWaitMinutes: 12,
          autoCut: true,
        });
      } else {
        bytes = buildDrugAuxiliaryLabel50x30mm({
          facilityName: "Osu Community Pharmacy",
          rxClaimPin: "RX-84920",
          drugName: "Amoxicillin + Clavulanic Acid",
          strength: "625mg Tablets",
          dosageInstructions: "1 tab TDS x 5/7 (Every 8 Hours After Meals)",
          quantity: "15 Tablets",
          patientName: "Active Patient",
          batchNumber: "LOT-AMX-2026-08",
          expiryDate: "11/2027",
          auxiliaryWarningLang: "EN",
          barcodeSku: "RX-84920",
        });
      }

      const res = await manager.print(type === "LABEL" ? "LABEL" : "RECEIPT", bytes);
      setTestResult({
        success: true,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to execute print job.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const receiptConfig = settings.receiptPrinter;
  const labelConfig = settings.labelPrinter;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hardware Thermal Printer Configuration"
      description="Configure WebUSB direct drivers, network IP (Port 9100), and auto-cut triggers."
    >
      <div className="py-2 space-y-4 text-xs">
        {/* Device Mode Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("RECEIPT");
              setTestResult(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === "RECEIPT"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Printer className="h-3.5 w-3.5" /> 80mm Cashier & Ticket Slip
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("LABEL");
              setTestResult(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === "LABEL"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Printer className="h-3.5 w-3.5" /> 50x30mm FEFO Drug Label
          </button>
        </div>

        {/* TAB 1: 80mm RECEIPT PRINTER */}
        {activeTab === "RECEIPT" && (
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Thermal Interface Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      receiptPrinter: { ...receiptConfig, mode: "WEB_USB" },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    receiptConfig.mode === "WEB_USB"
                      ? "border-teal-600 bg-teal-50/80 text-teal-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Usb className="h-3.5 w-3.5 text-teal-700" />
                    <span>WebUSB Direct</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Direct USB cable transfer
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      receiptPrinter: { ...receiptConfig, mode: "NETWORK_IP" },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    receiptConfig.mode === "NETWORK_IP"
                      ? "border-teal-600 bg-teal-50/80 text-teal-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3.5 w-3.5 text-teal-700" />
                    <span>Network TCP</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Port 9100 LAN socket
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      receiptPrinter: { ...receiptConfig, mode: "BROWSER_PREVIEW" },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    receiptConfig.mode === "BROWSER_PREVIEW"
                      ? "border-teal-600 bg-teal-50/80 text-teal-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-teal-700" />
                    <span>Simulator</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Software preview mode
                  </span>
                </button>
              </div>
            </div>

            {/* WebUSB Device Controls */}
            {receiptConfig.mode === "WEB_USB" && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Paired USB Device:</span>
                  <Badge variant="outline" className="font-mono">
                    {receiptConfig.usbDeviceName || "Not Paired"}
                  </Badge>
                </div>
                <Button
                  onClick={() => handlePairUSB("RECEIPT")}
                  size="sm"
                  variant="primary"
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold gap-1"
                >
                  <Usb className="h-3.5 w-3.5" /> Pair USB Thermal Printer
                </Button>
              </div>
            )}

            {/* Network IP Controls */}
            {receiptConfig.mode === "NETWORK_IP" && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Printer IP Address</label>
                    <Input
                      value={receiptConfig.networkIp || ""}
                      onChange={(e) =>
                        handleSave({
                          receiptPrinter: { ...receiptConfig, networkIp: e.target.value },
                        })
                      }
                      placeholder="192.168.1.200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Port</label>
                    <Input
                      type="number"
                      value={receiptConfig.networkPort || 9100}
                      onChange={(e) =>
                        handleSave({
                          receiptPrinter: {
                            ...receiptConfig,
                            networkPort: parseInt(e.target.value) || 9100,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Paper & Hardware Triggers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={receiptConfig.autoCut !== false}
                  onChange={(e) =>
                    handleSave({
                      receiptPrinter: { ...receiptConfig, autoCut: e.target.checked },
                    })
                  }
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <Scissors className="h-3.5 w-3.5 text-teal-700" />
                <span>Auto-Cut After Print</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={receiptConfig.kickDrawerOnCash !== false}
                  onChange={(e) =>
                    handleSave({
                      receiptPrinter: {
                        ...receiptConfig,
                        kickDrawerOnCash: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <DollarSign className="h-3.5 w-3.5 text-emerald-700" />
                <span>Pulse Cash Drawer</span>
              </label>
            </div>

            {/* Test Actions */}
            <div className="pt-2 flex gap-2">
              <Button
                onClick={() => handleTestPrint("RECEIPT")}
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex-1 font-bold gap-1"
              >
                <Play className="h-3 w-3" /> Test 80mm Cashier Slip
              </Button>
              <Button
                onClick={() => handleTestPrint("QUEUE")}
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex-1 font-bold gap-1"
              >
                <Play className="h-3 w-3" /> Test 80mm OPD Ticket
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: 50x30mm DRUG LABEL PRINTER */}
        {activeTab === "LABEL" && (
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Label Printer Interface
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      labelPrinter: { ...labelConfig, mode: "WEB_USB" },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    labelConfig.mode === "WEB_USB"
                      ? "border-teal-600 bg-teal-50/80 text-teal-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Usb className="h-3.5 w-3.5 text-teal-700" />
                    <span>WebUSB Direct</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Direct USB label printer
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      labelPrinter: { ...labelConfig, mode: "NETWORK_IP" },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    labelConfig.mode === "NETWORK_IP"
                      ? "border-teal-600 bg-teal-50/80 text-teal-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3.5 w-3.5 text-teal-700" />
                    <span>Network TCP</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Port 9100 LAN socket
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      labelPrinter: { ...labelConfig, mode: "BROWSER_PREVIEW" },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    labelConfig.mode === "BROWSER_PREVIEW"
                      ? "border-teal-600 bg-teal-50/80 text-teal-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-teal-700" />
                    <span>Simulator</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Software preview mode
                  </span>
                </button>
              </div>
            </div>

            {/* Label WebUSB Device */}
            {labelConfig.mode === "WEB_USB" && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Paired Label Printer:</span>
                  <Badge variant="outline" className="font-mono">
                    {labelConfig.usbDeviceName || "Not Paired"}
                  </Badge>
                </div>
                <Button
                  onClick={() => handlePairUSB("LABEL")}
                  size="sm"
                  variant="primary"
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold gap-1"
                >
                  <Usb className="h-3.5 w-3.5" /> Pair USB Label Printer
                </Button>
              </div>
            )}

            {/* Label Network IP */}
            {labelConfig.mode === "NETWORK_IP" && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Printer IP Address</label>
                    <Input
                      value={labelConfig.networkIp || ""}
                      onChange={(e) =>
                        handleSave({
                          labelPrinter: { ...labelConfig, networkIp: e.target.value },
                        })
                      }
                      placeholder="192.168.1.201"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Port</label>
                    <Input
                      type="number"
                      value={labelConfig.networkPort || 9100}
                      onChange={(e) =>
                        handleSave({
                          labelPrinter: {
                            ...labelConfig,
                            networkPort: parseInt(e.target.value) || 9100,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Test Action */}
            <div className="pt-2">
              <Button
                onClick={() => handleTestPrint("LABEL")}
                disabled={isTesting}
                variant="primary"
                size="sm"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold gap-1"
              >
                <Play className="h-3 w-3" /> Test Print 50x30mm FEFO Label
              </Button>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2 ${
              testResult.success
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="font-medium text-xs leading-relaxed">{testResult.message}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button variant="primary" onClick={onClose} className="font-bold">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
