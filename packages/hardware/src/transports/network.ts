/**
 * ============================================================================
 * Network RAW Socket (TCP Port 9100) Thermal Printer Transport Bridge
 * ============================================================================
 * Bridges browser printing commands to LAN-connected Ethernet & Wi-Fi thermal printers.
 */

export interface NetworkPrintOptions {
  ip: string;
  port?: number;
  timeoutMs?: number;
  apiBaseUrl?: string;
}

export interface NetworkPrintResult {
  success: boolean;
  ip: string;
  port: number;
  bytesWritten: number;
  message?: string;
}

/**
 * Sends binary ESC/POS payload to a network thermal printer (Port 9100 / JetDirect / RAW TCP)
 * via the Medipaedia hardware proxy bridge.
 */
export async function sendRawBytesToNetworkPrinter(
  options: NetworkPrintOptions,
  bytes: Uint8Array
): Promise<NetworkPrintResult> {
  const { ip, port = 9100, apiBaseUrl = "http://localhost:8000" } = options;

  if (!ip || !ip.trim()) {
    throw new Error("Network printer IP address is required (e.g. 192.168.1.200).");
  }

  // Convert Uint8Array to Base64 payload
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const rawBase64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64");

  const response = await fetch(`${apiBaseUrl}/api/v1/hardware/print/raw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      printer_ip: ip.trim(),
      port: port,
      raw_base64: rawBase64,
      timeout_seconds: Math.floor((options.timeoutMs || 5000) / 1000),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail ||
        `Failed to send print job to network printer ${ip}:${port} (HTTP ${response.status})`
    );
  }

  const data = await response.json();
  return {
    success: true,
    ip,
    port,
    bytesWritten: data.bytes_written || bytes.length,
    message: data.message || `Successfully transmitted ${bytes.length} bytes to ${ip}:${port}`,
  };
}
