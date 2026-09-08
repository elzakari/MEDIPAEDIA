"use client";

import React, { useState } from "react";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type LogoVariant = "icon-only" | "full-horizontal" | "full-stacked";
export type SubBrand = "clinical" | "rx" | "care" | "none";
export type BrandImageVariant = "mark" | "dark-app" | "green-app" | "mono";

export interface MedipaediaLogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  subBrand?: SubBrand;
  imageVariant?: BrandImageVariant;
  useImage?: boolean;
  className?: string;
  href?: string;
  theme?: "light" | "dark";
}

const BRAND_IMAGE_PATHS: Record<BrandImageVariant, string> = {
  mark: "/brand/logo-mark.png",
  "dark-app": "/brand/logo-dark-app.png",
  "green-app": "/brand/logo-green-app.png",
  mono: "/brand/logo-mono.png",
};

export function MedipaediaIconMark({
  size = "md",
  imageVariant = "mark",
  useImage = true,
  className = "",
}: {
  size?: LogoSize;
  imageVariant?: BrandImageVariant;
  useImage?: boolean;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  const pixelSizes: Record<LogoSize, number> = {
    xs: 22,
    sm: 30,
    md: 38,
    lg: 48,
    xl: 60,
    "2xl": 80,
  };

  const px = pixelSizes[size];
  const imageSrc = BRAND_IMAGE_PATHS[imageVariant];

  // If useImage is requested and no load error has occurred, render crisp optimized image
  if (useImage && !imageError) {
    return (
      <img
        src={imageSrc}
        alt="Medipaedia Logo"
        width={px}
        height={px}
        onError={() => setImageError(true)}
        className={`shrink-0 object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105 ${className}`}
        style={{ width: `${px}px`, height: `${px}px` }}
      />
    );
  }

  // High fidelity vector fallback representing the authentic Medipaedia cross + human sprout mark
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
      aria-label="Medipaedia Medical Cross & Vital Sprout Mark"
    >
      <defs>
        {/* Top Blue Pillar Gradient */}
        <linearGradient id="mp_top_blue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Emerald Cross Gradient */}
        <linearGradient id="mp_cross_emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Center Sprout Core Gradient */}
        <linearGradient id="mp_sprout_teal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        <filter id="mp_glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#047857" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Top Blue Cross Extension */}
      <path
        d="M 35 12 L 65 12 L 65 38 L 35 38 Z"
        fill="url(#mp_top_blue)"
      />

      {/* Main Cross Body (Wings & Base) */}
      <path
        d="M 10 38 L 35 38 L 35 12 L 65 12 L 65 38 L 90 38 L 90 66 L 65 66 L 65 90 L 35 90 L 35 66 L 10 66 Z"
        fill="url(#mp_cross_emerald)"
        filter="url(#mp_glow)"
      />

      {/* Head Node of Central Human Sprout */}
      <circle cx="50" cy="31" r="9" fill="#0D9488" stroke="#FFFFFF" strokeWidth="4" />

      {/* Human Sprout / Leaf Arches Silhouette */}
      <path
        d="M 50 56 C 46 44, 30 40, 15 44 C 28 50, 42 54, 46 84 L 54 84 C 58 54, 72 50, 85 44 C 70 40, 54 44, 50 56 Z"
        fill="#FFFFFF"
      />

      {/* Inner Leaf Centers */}
      <path
        d="M 22 47 C 32 46, 40 48, 45 54 C 38 52, 30 52, 22 47 Z"
        fill="#047857"
      />
      <path
        d="M 78 47 C 68 46, 60 48, 55 54 C 62 52, 70 52, 78 47 Z"
        fill="#047857"
      />

      {/* Central Stem Split Line */}
      <line x1="50" y1="56" x2="50" y2="84" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function MedipaediaLogo({
  size = "md",
  variant = "full-horizontal",
  subBrand = "none",
  imageVariant = "mark",
  useImage = true,
  className = "",
  href,
  theme = "light",
}: MedipaediaLogoProps) {
  const sizeClasses = {
    xs: {
      text: "text-sm tracking-tight",
      badge: "text-[8px] px-1 py-0.5",
      subtitle: "text-[9px]",
    },
    sm: {
      text: "text-base tracking-tight",
      badge: "text-[9px] px-1.5 py-0.5",
      subtitle: "text-[10px]",
    },
    md: {
      text: "text-xl tracking-tight",
      badge: "text-[10px] px-2 py-0.5",
      subtitle: "text-xs",
    },
    lg: {
      text: "text-2xl tracking-tight",
      badge: "text-xs px-2.5 py-0.5",
      subtitle: "text-sm",
    },
    xl: {
      text: "text-3xl tracking-tight",
      badge: "text-xs px-3 py-1",
      subtitle: "text-base",
    },
    "2xl": {
      text: "text-4xl tracking-tight",
      badge: "text-sm px-3.5 py-1",
      subtitle: "text-lg",
    },
  };

  const isDark = theme === "dark";

  const subBrandConfig = {
    clinical: {
      label: "CLINICAL",
      badgeClass: isDark
        ? "bg-teal-950/80 text-teal-300 border-teal-800/80"
        : "bg-teal-50 text-teal-800 border-teal-200",
      tagline: "Hospital & EHR Operations",
    },
    rx: {
      label: "RX POS",
      badgeClass: isDark
        ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
        : "bg-emerald-50 text-emerald-800 border-emerald-200",
      tagline: "Pharmacy Dispensary & Escrow",
    },
    care: {
      label: "CARE",
      badgeClass: isDark
        ? "bg-cyan-950/80 text-cyan-300 border-cyan-800/80"
        : "bg-cyan-50 text-cyan-800 border-cyan-200",
      tagline: "Patient Wallet & Marketplace",
    },
    none: {
      label: "",
      badgeClass: "",
      tagline: "Healthcare Infrastructure",
    },
  };

  const currentSub = subBrandConfig[subBrand];
  const cfg = sizeClasses[size];

  const content = (
    <div
      className={`inline-flex items-center gap-3 ${
        variant === "full-stacked" ? "flex-col text-center" : "flex-row"
      } ${className}`}
    >
      <MedipaediaIconMark
        size={size}
        imageVariant={imageVariant}
        useImage={useImage}
      />

      {variant !== "icon-only" && (
        <div className={variant === "full-stacked" ? "items-center" : "text-left min-w-0"}>
          <div className="flex items-center gap-2">
            <span
              className={`font-display font-extrabold tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              } ${cfg.text}`}
            >
              Medipaedia
            </span>
            {subBrand !== "none" && (
              <span
                className={`font-mono font-bold uppercase rounded-md border tracking-wider whitespace-nowrap shrink-0 ${cfg.badge} ${currentSub.badgeClass}`}
              >
                {currentSub.label}
              </span>
            )}
          </div>
          {variant === "full-stacked" && (
            <p className={`font-medium ${isDark ? "text-slate-400" : "text-slate-500"} ${cfg.subtitle}`}>
              {currentSub.tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );


  if (href) {
    return (
      <a href={href} className="inline-block hover:opacity-95 transition">
        {content}
      </a>
    );
  }

  return content;
}
