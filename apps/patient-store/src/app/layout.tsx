import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Medipaedia Care - Unified Health OS & Pharmacy Marketplace",
  description: "Universal Ghana Card patient identity, digital OPD cards, verified e-prescriptions, and nearby pharmacy drug search",
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
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-cyan-100 selection:text-cyan-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
