"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { enCatalog } from "../locales/en";
import { frCatalog } from "../locales/fr";
import { SupportedLocale, I18nContextValue, TranslateFallbackOrParams } from "./types";

/**
 * Never render a raw dot-path or all-caps translation key to end-users.
 * When a dictionary lookup fails, derive a human-readable label from the
 * last segment of the key (camelCase → Title Case; ALL_CAPS → Title Case).
 *
 * Examples:
 *   "doctor.prescriptionsRegistryTitle"   → "Prescriptions Registry"
 *   "doctor.issueNewPrescription"         → "Issue New Prescription"
 *   "DOCTOR.KPITOTALSIGNED"              → "Total Signed"
 *   "doctor.hmacVerifiedBadge"            → "Hmac Verified"
 */
export function formatFallbackKey(key: string): string {
  if (!key) return "";

  const leaf = key.split(".").pop() || key;

  // ALL_UPPERCASE / CONSTANT_CASE style keys (e.g. DOCTOR.KPITOTALSIGNED)
  if (leaf === leaf.toUpperCase() && leaf.length > 1) {
    const spaced = leaf
      .replace(/^KPI/i, "")
      .replace(/_/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return spaced || leaf;
  }

  // camelCase / PascalCase style leaves
  const words = leaf
    .replace(/([A-Z])/g, " $1")
    .replace(/Title$/i, "")
    .replace(/Subtitle$/i, "")
    .replace(/Placeholder$/i, "")
    .replace(/Badge$/i, "")
    .replace(/Suffix$/i, "")
    .replace(/Label$/i, "")
    .replace(/Description$/i, "")
    .trim();

  if (!words) return leaf;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const dictionaries: Record<SupportedLocale, Record<string, any>> = {
  en: enCatalog,
  fr: frCatalog,
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "medipaedia_locale";
const COOKIE_KEY = "NEXT_LOCALE";

export function getInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "fr") return saved;

    // Check cookie
    const match = document.cookie.match(new RegExp(`(^| )${COOKIE_KEY}=([^;]+)`));
    if (match && (match[2] === "en" || match[2] === "fr")) {
      return match[2] as SupportedLocale;
    }

    // Check navigator
    const navLang = navigator.language?.toLowerCase() || "";
    if (navLang.startsWith("fr")) return "fr";
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
  return "en";
}

export function translate(
  locale: SupportedLocale,
  path: string,
  fallbackOrParams?: TranslateFallbackOrParams,
  maybeParams?: Record<string, string | number>,
): string {
  // Normalize arguments to support both:
  //   t("ns.key", { foo: "bar" })
  //   t("ns.key", "Fallback text")
  //   t("ns.key", "Fallback text", { foo: "bar" })
  let fallback: string | undefined;
  let params: Record<string, string | number> | undefined;
  if (typeof fallbackOrParams === "string") {
    fallback = fallbackOrParams;
    params = maybeParams;
  } else if (fallbackOrParams && typeof fallbackOrParams === "object") {
    params = fallbackOrParams;
  }

  const fallbackHumanized = formatFallbackKey(path);
  const resolve = (dict: Record<string, any>, keyPath: string): string | undefined => {
    const segments = keyPath.split(".");
    let node: any = dict;
    for (const raw of segments) {
      if (!node || typeof node !== "object") return undefined;
      const match =
        raw in node
          ? raw
          : Object.keys(node).find((k) => k.toLowerCase() === raw.toLowerCase());
      if (!match) return undefined;
      node = node[match];
    }
    return typeof node === "string" ? node : undefined;
  };

  const dict = dictionaries[locale] || dictionaries.en;
  const localeMatch = resolve(dict, path);
  const enMatch = locale === "en" ? localeMatch : resolve(dictionaries.en, path);
  const text =
    localeMatch ??
    enMatch ??
    fallback ??
    fallbackHumanized;

  if (params) {
    let expanded = text;
    Object.entries(params).forEach(([paramKey, val]) => {
      expanded = expanded.replace(new RegExp(`\\{${paramKey}\\}`, 'gi'), String(val));
    });
    return expanded;
  }

  return text;
}

export function I18nProvider({
  children,
  defaultLocale,
}: {
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale || "en");

  useEffect(() => {
    const initLocale = defaultLocale || getInitialLocale();
    setLocaleState(initLocale);
  }, [defaultLocale]);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newLocale);
        document.cookie = `${COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `${STORAGE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch (e) {
      // Ignore in iframe / private sandbox
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (path: string, fb?: TranslateFallbackOrParams, params?: Record<string, string | number>) =>
        translate(locale, path, fb, params),
      isFrench: locale === "fr",
      isEnglish: locale === "en",
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider
    const fallbackLocale = getInitialLocale();
    return {
      locale: fallbackLocale,
      setLocale: () => {},
      t: (path: string, fb?: TranslateFallbackOrParams, params?: Record<string, string | number>) =>
        translate(fallbackLocale, path, fb, params),
      isFrench: fallbackLocale === "fr",
      isEnglish: fallbackLocale === "en",
    };
  }
  return context;
}

export const useI18n = useTranslation;
