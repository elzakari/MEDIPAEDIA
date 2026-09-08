/**
 * ============================================================================
 * Universal Hardware Thermal Printer Manager & Device Registry
 * ============================================================================
 * Coordinates WebUSB, Network TCP (9100), and Browser Preview transports.
 */

import { connectUSBPrinter, isWebUSBSupported, requestUSBPrinter, sendRawBytesToUSB, USBPrinterDevice } from "./transports/webusb";
import { sendRawBytesToNetworkPrinter } from "./transports/network";

export type PrintTransportMode = "WEB_USB" | "NETWORK_IP" | "BROWSER_PREVIEW";

export interface PrinterDeviceConfig {
  mode: PrintTransportMode;
  networkIp?: string;
  networkPort?: number;
  paperWidth?: "80mm" | "58mm";
  autoCut?: boolean;
  kickDrawerOnCash?: boolean;
  usbDeviceName?: string;
}

export interface HardwarePrinterSettings {
  receiptPrinter: PrinterDeviceConfig;
  labelPrinter: PrinterDeviceConfig;
}

const STORAGE_KEY = "medipaedia_hardware_printer_config";

export const DEFAULT_PRINTER_SETTINGS: HardwarePrinterSettings = {
  receiptPrinter: {
    mode: "BROWSER_PREVIEW",
    networkIp: "192.168.1.200",
    networkPort: 9100,
    paperWidth: "80mm",
    autoCut: true,
    kickDrawerOnCash: true,
  },
  labelPrinter: {
    mode: "BROWSER_PREVIEW",
    networkIp: "192.168.1.201",
    networkPort: 9100,
    paperWidth: "80mm",
  },
};

export class PrinterManager {
  private static instance: PrinterManager;
  private settings: HardwarePrinterSettings = DEFAULT_PRINTER_SETTINGS;
  private activeUsbReceiptDevice: USBPrinterDevice | null = null;
  private activeUsbLabelDevice: USBPrinterDevice | null = null;

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): PrinterManager {
    if (!PrinterManager.instance) {
      PrinterManager.instance = new PrinterManager();
    }
    return PrinterManager.instance;
  }

  public loadSettings(): HardwarePrinterSettings {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.settings = { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) };
        }
      } catch {
        this.settings = DEFAULT_PRINTER_SETTINGS;
      }
    }
    return this.settings;
  }

  public saveSettings(newSettings: Partial<HardwarePrinterSettings>): HardwarePrinterSettings {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // Ignore local storage error
      }
    }
    return this.settings;
  }

  public getSettings(): HardwarePrinterSettings {
    return this.settings;
  }

  /**
   * Pairs a WebUSB printer for receipt or label printing.
   */
  public async pairWebUSBDevice(type: "RECEIPT" | "LABEL"): Promise<string> {
    const rawDevice = await requestUSBPrinter();
    const connected = await connectUSBPrinter(rawDevice);

    if (type === "RECEIPT") {
      this.activeUsbReceiptDevice = connected;
      this.saveSettings({
        receiptPrinter: {
          ...this.settings.receiptPrinter,
          mode: "WEB_USB",
          usbDeviceName: connected.productName,
        },
      });
    } else {
      this.activeUsbLabelDevice = connected;
      this.saveSettings({
        labelPrinter: {
          ...this.settings.labelPrinter,
          mode: "WEB_USB",
          usbDeviceName: connected.productName,
        },
      });
    }

    return connected.productName;
  }

  /**
   * Dispatches binary print job based on active configuration (WebUSB, Network, or Browser Preview).
   */
  public async print(
    type: "RECEIPT" | "LABEL",
    bytes: Uint8Array,
    apiBaseUrl?: string
  ): Promise<{ success: boolean; mode: PrintTransportMode; message: string }> {
    const config = type === "RECEIPT" ? this.settings.receiptPrinter : this.settings.labelPrinter;

    if (config.mode === "WEB_USB") {
      let device = type === "RECEIPT" ? this.activeUsbReceiptDevice : this.activeUsbLabelDevice;

      if (!device || !device.device.opened) {
        // Attempt to request device if not currently in memory
        const rawDevice = await requestUSBPrinter();
        device = await connectUSBPrinter(rawDevice);
        if (type === "RECEIPT") this.activeUsbReceiptDevice = device;
        else this.activeUsbLabelDevice = device;
      }

      const res = await sendRawBytesToUSB(device, bytes);
      return {
        success: true,
        mode: "WEB_USB",
        message: `Printed ${res.bytesWritten} bytes directly via WebUSB (${device.productName}).`,
      };
    }

    if (config.mode === "NETWORK_IP") {
      if (!config.networkIp) {
        throw new Error("Network printer IP address is not configured.");
      }

      const res = await sendRawBytesToNetworkPrinter(
        {
          ip: config.networkIp,
          port: config.networkPort || 9100,
          apiBaseUrl,
        },
        bytes
      );

      return {
        success: true,
        mode: "NETWORK_IP",
        message: res.message || `Transmitted to network printer ${config.networkIp}:${config.networkPort || 9100}.`,
      };
    }

    // BROWSER_PREVIEW / SIMULATOR FALLBACK
    return {
      success: true,
      mode: "BROWSER_PREVIEW",
      message: `[Simulator] ESC/POS job generated successfully (${bytes.length} bytes binary payload). Ready for thermal printing.`,
    };
  }
}
