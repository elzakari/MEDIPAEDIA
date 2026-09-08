import React from "react";

export default function PatientAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-50 via-cyan-50/20 to-slate-100">
      <div className="w-full max-w-md mx-auto">{children}</div>
    </div>
  );
}
