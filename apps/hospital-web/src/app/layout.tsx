import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Medipaedia Clinical - Hospital & Clinic EHR Portal",
  description: "Multi-tenant clinical EHR, OPD consultations, vitals, and verified e-prescriptions",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
