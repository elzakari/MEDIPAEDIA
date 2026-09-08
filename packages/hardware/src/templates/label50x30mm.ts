/**
 * ==============================================================================
 * 50mm x 30mm High-Density FEFO Drug Auxiliary Label Template
 * ==============================================================================
 * Generates compact ESC/POS byte stream for pharmacy dispensing bottle/box labels.
 */

import { EscPosBuilder } from "../escpos";

export type AuxiliaryLanguage = "EN" | "TWI" | "FRENCH" | "EWE";

export interface DrugLabelData {
  facilityName: string;
  rxClaimPin: string;
  drugName: string;
  strength?: string;
  dosageInstructions: string;
  quantity?: string;
  patientName: string;
  batchNumber: string;
  expiryDate: string; // FEFO Expiry (e.g. "EXP: 11/2027")
  dateDispensed?: string;
  pharmacistName?: string;
  auxiliaryWarningLang?: AuxiliaryLanguage;
  customWarning?: string;
  barcodeSku?: string;
}

const LOCALIZED_WARNINGS: Record<AuxiliaryLanguage, string> = {
  EN: "[!] Finish full course. Take after meals.",
  TWI: "[!] We wie mfasoo. Di adee ansa na woanom.",
  FRENCH: "[!] Terminer le traitement. Prendre apres repas.",
  EWE: "[!] Nu vovo mgbew. Mia dee blibo.",
};

/**
 * Builds high-density 50x30mm thermal label for pharmaceutical dispensing.
 */
export function buildDrugAuxiliaryLabel50x30mm(data: DrugLabelData): Uint8Array {
  const p = new EscPosBuilder();
  const dateStr = data.dateDispensed || new Date().toLocaleDateString("en-GB");
  const lang = data.auxiliaryWarningLang || "EN";
  const warningText = data.customWarning || LOCALIZED_WARNINGS[lang] || LOCALIZED_WARNINGS.EN;

  // 1. Top Row: Pharmacy Name & Rx Ref
  p.align("CENTER");
  p.bold(true);
  p.textLine(data.facilityName.toUpperCase().slice(0, 32));
  p.bold(false);
  p.textLine(`Rx #: ${data.rxClaimPin} * Date: ${dateStr}`);
  p.horizontalLine("-", 32);

  // 2. Patient & Drug Name (Large bold)
  p.align("LEFT");
  p.textLine(`Pt: ${data.patientName.slice(0, 26)}`);
  p.bold(true);
  p.fontSize("DOUBLE_HEIGHT");
  p.textLine(`${data.drugName} ${data.strength || ""}`.trim().slice(0, 24));
  p.fontSize("NORMAL");
  p.bold(false);

  // 3. Calculated Dosage Schedule
  p.bold(true);
  p.textLine(`DOSAGE: ${data.dosageInstructions}`);
  p.bold(false);
  if (data.quantity) {
    p.textLine(`Qty: ${data.quantity}`);
  }

  // 4. Localized Auxiliary Warning
  p.feed(1);
  p.align("CENTER");
  p.bold(true);
  p.textLine(`*** ${warningText} ***`);
  p.bold(false);

  // 5. FEFO Batch Lot & Expiry Date
  p.horizontalLine("-", 32);
  p.align("LEFT");
  p.tableRow([
    { text: `Lot: ${data.batchNumber}`, width: 16, align: "LEFT" },
    { text: `EXP: ${data.expiryDate}`, width: 16, align: "RIGHT" },
  ]);

  // 6. Code128 Barcode for Instant Verification Scan
  p.feed(1);
  p.align("CENTER");
  const barcodeData = data.barcodeSku || data.rxClaimPin || data.batchNumber;
  p.barcode(barcodeData, "CODE128", 38, 2);

  // Form feed label gap
  p.feed(2);

  return p.build();
}
