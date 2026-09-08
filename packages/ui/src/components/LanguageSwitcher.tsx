"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation, SupportedLocale } from "../i18n";

export interface LanguageSwitcherProps {
  theme?: "light" | "dark";
  size?: "sm" | "md";
  className?: string;
}

interface LanguageOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  region: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    region: "Ghana (GH) / Global",
    flag: "🇬🇭",
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    region: "Togo (TG) / Bénin (BJ)",
    flag: "🇹🇬",
  },
];

export function LanguageSwitcher({
  theme = "light",
  size = "sm",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];
  const isDark = theme === "dark";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Change Language"
        className={`flex items-center gap-1.5 rounded-xl font-bold transition shadow-xs select-none ${
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        } ${
          isDark
            ? "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80"
            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        <span className="text-sm leading-none">{currentLang.flag}</span>
        <span className="font-mono uppercase tracking-wider">{currentLang.code}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          } ${isDark ? "text-slate-400" : "text-slate-500"}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-1.5 w-56 origin-top-right rounded-2xl p-1.5 shadow-2xl ring-1 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? "bg-[#0F172A] border border-slate-800 ring-black/40 text-slate-100"
              : "bg-white border border-slate-200 ring-black/5 text-slate-900"
          }`}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-200/50 dark:border-slate-800/80 mb-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {t("common.language")} / Langue
            </p>
          </div>

          <div className="space-y-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition ${
                    isSelected
                      ? isDark
                        ? "bg-purple-950/70 text-purple-200 font-bold border border-purple-800/60"
                        : "bg-teal-50 text-teal-900 font-bold border border-teal-200"
                      : isDark
                        ? "hover:bg-slate-800/70 text-slate-300 border border-transparent"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{lang.nativeLabel}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{lang.region}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      className={`h-4 w-4 shrink-0 ${
                        isDark ? "text-purple-400" : "text-teal-600"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
