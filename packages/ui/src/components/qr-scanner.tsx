"use client";

import React, { useState } from "react";
import { Scan, QrCode, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

export interface QRScannerProps {
  onScanSuccess: (code: string) => void;
  title?: string;
  placeholder?: string;
}

export function QRScanner({
  onScanSuccess,
  title = "Prescription Verification Scanner",
  placeholder = "e.g. RX-2026-9481 or paste hash/token",
}: QRScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [simulatedStatus, setSimulatedStatus] = useState<"idle" | "scanning" | "success">("idle");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  const handleSimulateScan = () => {
    setSimulatedStatus("scanning");
    setTimeout(() => {
      setSimulatedStatus("success");
      const sampleHash = "RX-2026-GH9821-HMAC-8f92a1c4b7e8";
      setManualCode(sampleHash);
      onScanSuccess(sampleHash);
      setTimeout(() => setSimulatedStatus("idle"), 2500);
    }, 1200);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-teal-600 animate-pulse" />
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">HMAC-SHA256 Ready</span>
      </div>

      {/* Optical Camera Viewport Simulation */}
      <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-950 flex flex-col items-center justify-center border-2 border-dashed border-teal-500/40">
        {/* Scanning laser effect */}
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-scan-line pointer-events-none" />

        {/* Viewfinder brackets */}
        <div className="absolute inset-8 border-2 border-white/20 rounded-lg pointer-events-none flex flex-col justify-between p-2">
          <div className="flex justify-between">
            <span className="h-4 w-4 border-t-2 border-l-2 border-teal-400" />
            <span className="h-4 w-4 border-t-2 border-r-2 border-teal-400" />
          </div>
          <div className="flex justify-between">
            <span className="h-4 w-4 border-b-2 border-l-2 border-teal-400" />
            <span className="h-4 w-4 border-b-2 border-r-2 border-teal-400" />
          </div>
        </div>

        <div className="z-10 text-center px-4">
          {simulatedStatus === "idle" && (
            <>
              <QrCode className="h-12 w-12 text-teal-400/80 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-200">
                Point Camera at Patient QR Code
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Supports encrypted digital prescription tokens & Ghana Card MRN barcodes
              </p>
            </>
          )}

          {simulatedStatus === "scanning" && (
            <div className="flex flex-col items-center text-teal-300">
              <RefreshCw className="h-10 w-10 animate-spin mb-2" />
              <p className="text-sm font-semibold">Reading Cryptographic Signature...</p>
            </div>
          )}

          {simulatedStatus === "success" && (
            <div className="flex flex-col items-center text-emerald-400">
              <CheckCircle2 className="h-12 w-12 mb-2" />
              <p className="text-sm font-bold">Prescription Verified</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-10">
          <Button
            type="button"
            variant="teal"
            size="sm"
            onClick={handleSimulateScan}
            className="w-full bg-slate-900/80 backdrop-blur border border-teal-400/30 text-teal-300 hover:bg-slate-800"
          >
            <Scan className="h-3.5 w-3.5 mr-1.5" /> Simulate Optical Camera Scan
          </Button>
        </div>
      </div>

      {/* Manual Input Fallback */}
      <form onSubmit={handleManualSubmit} className="mt-5 space-y-3">
        <Input
          label="Manual Verification Code or Token"
          placeholder={placeholder}
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          helperText="Enter 6-digit access code or full HMAC-SHA256 signature string"
        />
        <Button type="submit" variant="primary" className="w-full">
          Verify & Fetch Prescription
        </Button>
      </form>
    </div>
  );
}
