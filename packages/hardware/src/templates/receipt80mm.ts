/**
 * ============================================================================
 * 80mm Standard POS Thermal Receipt & OPD Queue Slip Templates
 * ============================================================================
 * Generates formatted ESC/POS byte streams for revenue cashier receipts & reception tickets.
 */

import { EscPosBuilder } from "../escpos";

export interface CashierReceiptItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface CashierReceiptData {
  facilityName: string;
  facilityAddress?: string;
  facilityPhone?: string;
  receiptNumber: string;
  date?: string;
  cashierName: string;
  patientName: string;
  patientMrn: string;
  items: CashierReceiptItem[];
  subtotal: number;
  insuranceDeduction?: number;
  grandTotal: number;
  currency?: string;
  paymentMethod: "CASH" | "MOMO" | "CARD" | "INSURANCE_COPAY" | string;
  transactionRef?: string;
  verificationUrl?: string;
  autoCut?: boolean;
  kickDrawer?: boolean;
}

export interface OpdQueueTicketData {
  facilityName: string;
  ticketNumber: string;
  department: string;
  patientName: string;
  patientMrn?: string;
  priority?: "ROUTINE" | "PRIORITY" | "EMERGENCY" | string;
  estimatedWaitMinutes?: number;
  timestamp?: string;
  instructions?: string;
  autoCut?: boolean;
}

/**
 * Builds standard 80mm Cashier Billing & Revenue Receipt.
 */
export function buildCashierReceipt80mm(data: CashierReceiptData): Uint8Array {
  const p = new EscPosBuilder();
  const currency = data.currency || "GHS";
  const dateStr = data.date || new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });

  // 1. Header (Centered, Bold)
  p.align("CENTER");
  p.bold(true);
  p.fontSize("LARGE");
  p.textLine(data.facilityName);
  p.fontSize("NORMAL");
  p.bold(false);

  if (data.facilityAddress) {
    p.textLine(data.facilityAddress);
  }
  if (data.facilityPhone) {
    p.textLine(`Tel: ${data.facilityPhone}`);
  }

  p.bold(true);
  p.textLine("OFFICIAL REVENUE SETTLEMENT FOLIO");
  p.bold(false);
  p.horizontalLine("=", 42);

  // 2. Metadata (Left aligned)
  p.align("LEFT");
  p.tableRow([
    { text: `Receipt #: ${data.receiptNumber}`, width: 22, align: "LEFT" },
    { text: dateStr.split(",")[0] || dateStr, width: 20, align: "RIGHT" },
  ]);
  p.tableRow([
    { text: `Cashier: ${data.cashierName}`, width: 22, align: "LEFT" },
    { text: `Time: ${dateStr.split(",")[1]?.trim() || ""}`, width: 20, align: "RIGHT" },
  ]);
  p.textLine(`Patient: ${data.patientName}`);
  p.textLine(`MRN / Folder: ${data.patientMrn}`);
  p.horizontalLine("-", 42);

  // 3. Itemized Table (42 characters width standard 80mm)
  // Description (22), Qty (4), Rate (8), Total (8)
  p.bold(true);
  p.tableRow([
    { text: "Item Description", width: 22, align: "LEFT" },
    { text: "Qty", width: 4, align: "CENTER" },
    { text: "Rate", width: 8, align: "RIGHT" },
    { text: "Total", width: 8, align: "RIGHT" },
  ]);
  p.bold(false);
  p.horizontalLine("-", 42);

  for (const item of data.items) {
    p.tableRow([
      { text: item.description, width: 22, align: "LEFT" },
      { text: String(item.qty), width: 4, align: "CENTER" },
      { text: item.unitPrice.toFixed(2), width: 8, align: "RIGHT" },
      { text: item.total.toFixed(2), width: 8, align: "RIGHT" },
    ]);
  }
  p.horizontalLine("-", 42);

  // 4. Totals & Payment Summary
  p.align("RIGHT");
  p.tableRow([
    { text: "Gross Subtotal:", width: 28, align: "RIGHT" },
    { text: `${currency} ${data.subtotal.toFixed(2)}`, width: 14, align: "RIGHT" },
  ]);

  if (data.insuranceDeduction && data.insuranceDeduction > 0) {
    p.tableRow([
      { text: "NHIS / Insurance Credit:", width: 28, align: "RIGHT" },
      { text: `- ${currency} ${data.insuranceDeduction.toFixed(2)}`, width: 14, align: "RIGHT" },
    ]);
  }

  p.bold(true);
  p.fontSize("DOUBLE_HEIGHT");
  p.tableRow([
    { text: "TOTAL PAID:", width: 22, align: "RIGHT" },
    { text: `${currency} ${data.grandTotal.toFixed(2)}`, width: 14, align: "RIGHT" },
  ]);
  p.fontSize("NORMAL");
  p.bold(false);

  p.horizontalLine("=", 42);
  p.align("LEFT");
  p.textLine(`Payment Tendered: ${data.paymentMethod}`);
  if (data.transactionRef) {
    p.textLine(`Ref / MoMo ID: ${data.transactionRef}`);
  }

  // 5. Verification QR Code & Footer
  if (data.verificationUrl) {
    p.feed(1);
    p.align("CENTER");
    p.qrCode(data.verificationUrl, 5, "M");
    p.textLine("Scan QR to verify authentic MoH receipt");
  }

  p.align("CENTER");
  p.textLine("Thank you for trusting Medipaedia Healthcare.");
  p.textLine("Wishing you swift recovery.");

  // 6. Cash drawer pulse & cut
  if (data.kickDrawer && data.paymentMethod === "CASH") {
    p.cashDrawerPulse(0);
  }

  if (data.autoCut !== false) {
    p.cut("FULL");
  }

  return p.build();
}

/**
 * Builds 80mm OPD Triage & Queue Ticket Slip.
 */
export function buildOpdQueueTicket80mm(data: OpdQueueTicketData): Uint8Array {
  const p = new EscPosBuilder();
  const timeStr = data.timestamp || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  p.align("CENTER");
  p.bold(true);
  p.textLine(data.facilityName);
  p.bold(false);
  p.textLine("OUTPATIENT TRIAGE & QUEUE TICKET");
  p.horizontalLine("=", 42);

  // Large Bold Ticket Code
  p.feed(1);
  p.fontSize("EXTRA_LARGE");
  p.bold(true);
  p.textLine(data.ticketNumber);
  p.fontSize("NORMAL");
  p.bold(false);
  p.feed(1);

  // Department & Triage Priority
  p.bold(true);
  p.textLine(`Department: ${data.department}`);
  if (data.priority) {
    const isEmer = data.priority === "EMERGENCY";
    if (isEmer) p.inverse(true);
    p.textLine(` TRIAGE PRIORITY: ${data.priority} `);
    if (isEmer) p.inverse(false);
  }
  p.bold(false);

  p.horizontalLine("-", 42);
  p.align("LEFT");
  p.textLine(`Patient: ${data.patientName}`);
  if (data.patientMrn) {
    p.textLine(`MRN: ${data.patientMrn}`);
  }
  p.textLine(`Issued At: ${timeStr}`);
  if (data.estimatedWaitMinutes !== undefined) {
    p.textLine(`Estimated Wait Time: ~${data.estimatedWaitMinutes} minutes`);
  }

  p.feed(1);
  p.align("CENTER");
  // 1D Barcode of Ticket Number
  p.barcode(data.ticketNumber, "CODE128", 50, 2);

  p.feed(1);
  p.textLine("Please watch the Waiting Room TV Display.");
  p.textLine("Your ticket code will be called when it is your turn.");

  if (data.autoCut !== false) {
    p.cut("FULL");
  }

  return p.build();
}
