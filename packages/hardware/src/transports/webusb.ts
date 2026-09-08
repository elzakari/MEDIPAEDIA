/**
 * ============================================================================
 * WebUSB Low-Level Thermal Printer Transport
 * ============================================================================
 * Enables direct raw binary byte transfer from modern browsers to USB thermal printers
 * (Epson TM-T88, Xprinter, Bixolon, POS-58/80, Zebra, Gprinter).
 */

export interface USBPrinterDevice {
  device: any; // USBDevice
  endpointNumber: number;
  interfaceNumber: number;
  productName: string;
}

export function isWebUSBSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

/**
 * Prompts the user with browser native USB device selection dialog.
 */
export async function requestUSBPrinter(): Promise<any> {
  if (!isWebUSBSupported()) {
    throw new Error("WebUSB API is not supported in this browser. Please use Google Chrome, Edge, or Opera.");
  }
  try {
    const device = await (navigator as any).usb.requestDevice({
      filters: [
        // Standard USB Printer Class Code: 0x07 (Printers)
        { classCode: 0x07 },
        // Common POS thermal printer vendor IDs
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0483 }, // STMicroelectronics / Xprinter
        { vendorId: 0x1fc9 }, // NXP / POS58
        { vendorId: 0x0dd4 }, // Custom Engineering
        { vendorId: 0x1504 }, // Bixolon
        { vendorId: 0x0a5f }, // Zebra
        { vendorId: 0x20d1 }, // Gprinter
      ],
    });
    return device;
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      throw new Error("No USB printer selected by user.");
    }
    throw err;
  }
}

/**
 * Opens connection, selects active configuration, claims printer interface,
 * and locates OUT bulk transfer endpoint.
 */
export async function connectUSBPrinter(device: any): Promise<USBPrinterDevice> {
  if (!device) {
    throw new Error("USB device is required to establish connection.");
  }

  if (!device.opened) {
    await device.open();
  }

  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  // Find printer interface & OUT endpoint
  let targetInterfaceNumber = 0;
  let targetEndpointNumber = 1;
  let found = false;

  for (const config of device.configurations || []) {
    for (const iface of config.interfaces || []) {
      for (const alt of iface.alternates || []) {
        // Check for printer class (0x07) or vendor specific (0xFF)
        for (const ep of alt.endpoints || []) {
          if (ep.direction === "out" && ep.type === "bulk") {
            targetInterfaceNumber = iface.interfaceNumber;
            targetEndpointNumber = ep.endpointNumber;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (found) break;
  }

  await device.claimInterface(targetInterfaceNumber);

  return {
    device,
    endpointNumber: targetEndpointNumber,
    interfaceNumber: targetInterfaceNumber,
    productName: device.productName || "POS Thermal Printer",
  };
}

/**
 * Sends raw ESC/POS binary bytes to the connected USB printer.
 */
export async function sendRawBytesToUSB(
  printer: USBPrinterDevice,
  bytes: Uint8Array
): Promise<{ success: boolean; bytesWritten: number }> {
  if (!printer || !printer.device || !printer.device.opened) {
    throw new Error("USB printer is not open. Please reconnect the device.");
  }

  // Transfer binary buffer via Bulk OUT endpoint
  const result = await printer.device.transferOut(printer.endpointNumber, bytes.buffer);

  if (result.status !== "ok") {
    throw new Error(`USB Transfer failed with status: ${result.status}`);
  }

  return {
    success: true,
    bytesWritten: result.bytesWritten || bytes.length,
  };
}
