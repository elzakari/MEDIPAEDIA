export type SupportedLocale = "en" | "fr";

export type TranslateFallbackOrParams = string | Record<string, string | number> | undefined;

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (
    path: string,
    fallbackOrParams?: TranslateFallbackOrParams,
    params?: Record<string, string | number>,
  ) => string;
  isFrench: boolean;
  isEnglish: boolean;
}
