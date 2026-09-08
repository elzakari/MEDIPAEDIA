"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Badge } from "./badge";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  onClose?: () => void;
  duration?: number;
}

export function Toast({
  type = "info",
  title,
  message,
  actionUrl,
  actionLabel,
  onClose,
  duration = 5000,
}: ToastProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleCopyAction = () => {
    if (actionUrl) {
      navigator.clipboard.writeText(actionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getStyle = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-900/30",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
          title: "text-emerald-300",
        };
      case "error":
        return {
          bg: "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-900/30",
          icon: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
          title: "text-rose-300",
        };
      case "warning":
        return {
          bg: "bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-900/30",
          icon: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
          title: "text-amber-300",
        };
      case "info":
      default:
        return {
          bg: "bg-slate-900/90 border-cyan-500/40 text-cyan-100 shadow-cyan-900/30",
          icon: <Info className="h-5 w-5 text-cyan-400 shrink-0" />,
          title: "text-cyan-300",
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 max-w-md w-full p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5 ${style.bg}`}
    >
      <div className="flex items-start gap-3">
        {style.icon}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${style.title}`}>
              {title}
            </h4>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition p-0.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{message}</p>

          {actionUrl && (
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleCopyAction}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    {actionLabel || "Copy Link"}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  subtitle?: string;
  details?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  copyableUrl?: string;
}

export function NotificationModal({
  isOpen,
  onClose,
  type = "info",
  title,
  subtitle,
  details,
  primaryActionLabel = "Done",
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  copyableUrl,
}: NotificationModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (copyableUrl) {
      navigator.clipboard.writeText(copyableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getHeaderIcon = () => {
    switch (type) {
      case "success":
        return (
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-7 w-7" />
          </div>
        );
      case "error":
        return (
          <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-7 w-7" />
          </div>
        );
      case "warning":
        return (
          <div className="h-12 w-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="h-7 w-7" />
          </div>
        );
      case "info":
      default:
        return (
          <div className="h-12 w-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center py-2 space-y-4">
        {getHeaderIcon()}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        {copyableUrl && (
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 break-all select-all text-left">
              {copyableUrl}
            </div>
            <Button
              variant="teal"
              onClick={handleCopy}
              className="w-full shadow-md shadow-teal-700/20"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Copied Magic Link to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy Invitation Link
                </>
              )}
            </Button>
          </div>
        )}

        {details && <div className="text-left text-xs">{details}</div>}

        <div className="flex items-center justify-end gap-2 pt-2">
          {secondaryActionLabel && (
            <Button
              variant="ghost"
              onClick={() => {
                if (onSecondaryAction) onSecondaryAction();
                else onClose();
              }}
            >
              {secondaryActionLabel}
            </Button>
          )}
          <Button
            variant={type === "error" ? "danger" : "teal"}
            onClick={() => {
              if (onPrimaryAction) onPrimaryAction();
              else onClose();
            }}
          >
            {primaryActionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
