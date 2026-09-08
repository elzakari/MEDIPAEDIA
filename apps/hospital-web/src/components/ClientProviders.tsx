"use client";

import React from "react";
import { I18nProvider } from "@medipaedia/ui";
import { AuthProvider } from "@/context/AuthContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <I18nProvider>{children}</I18nProvider>
    </AuthProvider>
  );
}

