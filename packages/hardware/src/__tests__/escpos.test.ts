import { EscPosBuilder } from "../escpos";
import { buildCashierReceipt80mm } from "../templates/receipt80mm";
import { buildDrugAuxiliaryLabel50x30mm } from "../templates/label50x30mm";
import { buildOpdQueueTicket80mm } from "../templates/receipt80mm";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runHardwareUnitTests() {
  console.log("Starting ESC/POS Hardware Printing Unit Tests...");

  // 1. Test Low-Level ESC/POS Commands
  const p = new EscPosBuilder();
  p.init()
    .align("CENTER")
    .bold(true)
    .fontSize("LARGE")
    .text("TEST RECEIPT")
    .bold(false)
    .fontSize("NORMAL")
    .feed(2)
    .barcode("OPD-1234", "CODE128", 50, 2)
    .qrCode("https://medipaedia.health/verify/1234", 6, "M")
    .cashDrawerPulse(0)
    .cut("FULL");

  const bytes = p.build();
  assert(bytes.length > 0, "ESC/POS buffer should not be empty");
  // Check init bytes [0x1B, 0x40]
  assert(bytes[0] === 0x1b && bytes[1] === 0x40, "First bytes must be ESC @ (0x1B, 0x40)");
  // Check align center [0x1B, 0x61, 0x01]
  assert(bytes[2] === 0x1b && bytes[3] === 0x61 && bytes[4] === 0x01, "Should contain ESC a 1 (align center)");
  // Check cut command [0x1D, 0x56, 65, 0x00]
  const last4 = bytes.slice(-4);
  assert(last4[0] === 0x1d && last4[1] === 0x56 && last4[2] === 65 && last4[3] === 0x00, "Must end with GS V 'A' 0 (Full Cut)");

  console.log("? Low-level ESC/POS byte sequence generation passed.");

  // 2. Test 80mm Cashier Receipt Generation
  const receiptBytes = buildCashierReceipt80mm({
    facilityName: "Ridge Regional Hospital, Accra",
    facilityAddress: "Castle Road, Ridge, Accra",
    facilityPhone: "+233 30 200 0111",
    receiptNumber: "RCT-2026-9901",
    cashierName: "Senior Cashier",
    patientName: "Active Patient",
    patientMrn: "MRN-PENDING",
    items: [
      { description: "General Consultation", qty: 1, unitPrice: 80.0, total: 80.0 },
      { description: "Full Blood Count", qty: 1, unitPrice: 65.0, total: 65.0 },
    ],
    subtotal: 145.0,
    insuranceDeduction: 45.0,
    grandTotal: 100.0,
    currency: "GHS",
    paymentMethod: "MOMO",
    transactionRef: "MTN-MOMO-84920",
    verificationUrl: "https://medipaedia.health/verify/rct/9901",
    autoCut: true,
    kickDrawer: true,
  });

  assert(receiptBytes.length > 100, "Receipt byte buffer must be greater than 100 bytes");
  console.log(`? 80mm Cashier Receipt generated: ${receiptBytes.length} bytes.`);

  // 3. Test 80mm OPD Queue Ticket Generation
  const queueBytes = buildOpdQueueTicket80mm({
    facilityName: "Ridge Regional Hospital",
    ticketNumber: "OPD-8492",
    department: "General OPD Bay 2",
    patientName: "Active Encounter Patient",
    patientMrn: "MRN-PENDING",
    priority: "EMERGENCY",
    estimatedWaitMinutes: 5,
    autoCut: true,
  });

  assert(queueBytes.length > 50, "Queue ticket byte buffer must be greater than 50 bytes");
  console.log(`? 80mm OPD Queue Ticket generated: ${queueBytes.length} bytes.`);

  // 4. Test 50x30mm FEFO Drug Auxiliary Label Generation
  const labelBytes = buildDrugAuxiliaryLabel50x30mm({
    facilityName: "Osu Community Pharmacy",
    rxClaimPin: "RX-84920",
    drugName: "Amoxicillin + Clavulanic Acid",
    strength: "625mg Tablets",
    dosageInstructions: "1 tab TDS x 5/7 (Every 8 Hours After Meals)",
    quantity: "15 Tablets",
    patientName: "Active Patient",
    batchNumber: "LOT-AMX-2026-08",
    expiryDate: "11/2027",
    auxiliaryWarningLang: "TWI",
    barcodeSku: "RX-84920",
  });

  assert(labelBytes.length > 50, "Drug label byte buffer must be greater than 50 bytes");
  console.log(`? 50x30mm Drug Auxiliary Label generated: ${labelBytes.length} bytes.`);

  console.log("All ESC/POS Hardware Printing Unit Tests Passed Successfully!");
}

// Execute tests if run directly
if (typeof require !== "undefined" && require.main === module) {
  runHardwareUnitTests();
}
