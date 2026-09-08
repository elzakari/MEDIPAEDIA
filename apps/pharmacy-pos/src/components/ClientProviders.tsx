"use client";

import React from "react";
import { I18nProvider } from "@medipaedia/ui";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
