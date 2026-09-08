import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Medipaedia Rx - Pharmacy POS & Dispensary",
  description: "Pharmacy dispensary point of sale, FEFO batch tracking, QR claim verification, and escrow settlement",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
