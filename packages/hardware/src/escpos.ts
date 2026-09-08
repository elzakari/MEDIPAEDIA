/**
 * ============================================================================
 * Medipaedia Universal ESC/POS Thermal Printing Byte Buffer Generator
 * ============================================================================
 * Low-level binary command builder for 80mm/58mm receipt printers & 50x30mm label printers.
 */

export type AlignmentMode = "LEFT" | "CENTER" | "RIGHT";
export type UnderlineMode = "NONE" | "SINGLE" | "DOUBLE";
export type FontSize = "NORMAL" | "DOUBLE_HEIGHT" | "DOUBLE_WIDTH" | "LARGE" | "EXTRA_LARGE";
export type CutMode = "FULL" | "PARTIAL";
export type BarcodeType = "CODE128" | "EAN13" | "CODE39";
export type QRErrorCorrection = "L" | "M" | "Q" | "H";

export interface TableColumn {
  text: string;
  width: number;
  align?: AlignmentMode;
}

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  /**
   * Initializes printer (ESC @) - resets all settings to power-on defaults.
   */
  public init(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * Sets text alignment (ESC a n).
   */
  public align(mode: AlignmentMode): this {
    let n = 0;
    if (mode === "CENTER") n = 1;
    else if (mode === "RIGHT") n = 2;
    this.buffer.push(0x1b, 0x61, n);
    return this;
  }

  /**
   * Enables or disables bold text (ESC E n).
   */
  public bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  /**
   * Sets underline mode (ESC - n).
   */
  public underline(mode: UnderlineMode = "SINGLE"): this {
    let n = 0;
    if (mode === "SINGLE") n = 1;
    else if (mode === "DOUBLE") n = 2;
    this.buffer.push(0x1b, 0x2d, n);
    return this;
  }

  /**
   * Enables white-on-black reverse printing (GS B n).
   */
  public inverse(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x42, enable ? 0x01 : 0x00);
    return this;
  }

  /**
   * Sets font character size scaling (GS ! n).
   */
  public fontSize(size: FontSize): this {
    let n = 0x00;
    switch (size) {
      case "DOUBLE_HEIGHT":
        n = 0x01;
        break;
      case "DOUBLE_WIDTH":
        n = 0x10;
        break;
      case "LARGE":
        n = 0x11; // 2x width, 2x height
        break;
      case "EXTRA_LARGE":
        n = 0x22; // 3x width, 3x height
        break;
      case "NORMAL":
      default:
        n = 0x00;
        break;
    }
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  /**
   * Appends raw string encoded in ASCII / CP437 / UTF-8 fallback.
   */
  public text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  /**
   * Appends string followed by newline.
   */
  public textLine(str: string = ""): this {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  /**
   * Feeds n lines of paper (ESC d n).
   */
  public feed(lines: number = 1): this {
    this.buffer.push(0x1b, 0x64, Math.max(1, lines));
    return this;
  }

  /**
   * Generates a repeating horizontal line divider.
   */
  public horizontalLine(char: string = "-", length: number = 42): this {
    const line = char.repeat(Math.max(1, length));
    return this.textLine(line);
  }

  /**
   * Formats a fixed-width multi-column table row for itemized billing and receipts.
   */
  public tableRow(columns: TableColumn[]): this {
    let row = "";
    for (const col of columns) {
      const colWidth = col.width;
      let text = col.text || "";
      if (text.length > colWidth) {
        text = text.substring(0, colWidth);
      }
      const align = col.align || "LEFT";
      const padLen = colWidth - text.length;

      if (align === "RIGHT") {
        row += " ".repeat(padLen) + text;
      } else if (align === "CENTER") {
        const leftPad = Math.floor(padLen / 2);
        const rightPad = padLen - leftPad;
        row += " ".repeat(leftPad) + text + " ".repeat(rightPad);
      } else {
        row += text + " ".repeat(padLen);
      }
    }
    return this.textLine(row);
  }

  /**
   * Prints 1D Barcode (GS k).
   */
  public barcode(
    data: string,
    type: BarcodeType = "CODE128",
    height: number = 64,
    width: number = 2
  ): this {
    // 1. Set barcode height (GS h n)
    this.buffer.push(0x1d, 0x68, Math.min(255, Math.max(1, height)));
    // 2. Set barcode module width (GS w n)
    this.buffer.push(0x1d, 0x77, Math.min(6, Math.max(1, width)));
    // 3. Set HRI characters print position below barcode (GS H 2)
    this.buffer.push(0x1d, 0x48, 0x02);
    // 4. Set HRI font (GS f 0)
    this.buffer.push(0x1d, 0x66, 0x00);

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    if (type === "CODE128") {
      // CODE128 format B header {B
      const totalLen = dataBytes.length + 2;
      this.buffer.push(0x1d, 0x6b, 73, totalLen, 0x7b, 0x42);
      for (let i = 0; i < dataBytes.length; i++) {
        this.buffer.push(dataBytes[i]);
      }
    } else {
      // General format
      this.buffer.push(0x1d, 0x6b, 67, dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        this.buffer.push(dataBytes[i]);
      }
    }

    this.feed(1);
    return this;
  }

  /**
   * Prints 2D QR Code using standard ESC/POS Model 2 commands.
   */
  public qrCode(
    data: string,
    size: number = 6,
    errorCorrection: QRErrorCorrection = "M"
  ): this {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    // 1. Select Model 2 QR (Function 165)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // 2. Set Module Size (Function 167)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, size)));

    // 3. Set Error Correction Level (Function 169)
    let ecByte = 0x31; // M (15%)
    if (errorCorrection === "L") ecByte = 0x30; // 7%
    else if (errorCorrection === "Q") ecByte = 0x32; // 25%
    else if (errorCorrection === "H") ecByte = 0x33; // 30%
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecByte);

    // 4. Store Data in Symbol Storage (Function 180)
    const len = dataBytes.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < dataBytes.length; i++) {
      this.buffer.push(dataBytes[i]);
    }

    // 5. Print Symbol (Function 181)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.feed(1);
    return this;
  }

  /**
   * Executes paper feed and cut (GS V m n).
   */
  public cut(mode: CutMode = "FULL"): this {
    this.feed(3);
    const m = mode === "FULL" ? 65 : 66; // 65 = Feed paper & full cut, 66 = Partial cut
    this.buffer.push(0x1d, 0x56, m, 0x00);
    return this;
  }

  /**
   * Generates cash drawer kick-out pulse (ESC p m t1 t2).
   */
  public cashDrawerPulse(pin: 0 | 1 = 0): this {
    this.buffer.push(0x1b, 0x70, pin, 0x19, 0xfa);
    return this;
  }

  /**
   * Returns raw binary Uint8Array ready for WebUSB, Network Socket, or Bluetooth transmission.
   */
  public build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Returns Base64-encoded string representation of raw binary bytes.
   */
  public toBase64(): string {
    const bytes = this.build();
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa !== "undefined") {
      return btoa(binary);
    }
    return Buffer.from(bytes).toString("base64");
  }
}
