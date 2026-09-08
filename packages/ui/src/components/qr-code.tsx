"use client";

import React, { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

export interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  title?: string;
}

export function QRCode({
  value,
  size = 180,
  className = "",
  title,
}: QRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code Generation Error:", err));
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={title || "Prescription QR Code"}
          width={size}
          height={size}
          className="rounded-lg"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center bg-slate-100 rounded-lg text-xs text-slate-400 animate-pulse"
        >
          Generating QR...
        </div>
      )}
      {title && (
        <p className="mt-2 text-xs font-semibold text-slate-600 text-center font-mono">
          {title}
        </p>
      )}
    </div>
  );
}
