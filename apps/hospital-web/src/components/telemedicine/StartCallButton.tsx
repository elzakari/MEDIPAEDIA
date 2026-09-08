"use client";

import React, { useCallback, useState } from "react";
import { Video, Loader2, AlertTriangle } from "lucide-react";
import { Button, useTranslation } from "@medipaedia/ui";
import {
  createApiClient,
  type TelemedicineTokenResponse,
} from "@medipaedia/api-client";
import { LiveKitRoomModal } from "@/components/telemedicine/LiveKitRoomModal";

export interface StartCallButtonProps {
  consultationId: string;
  patientName?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "icon";
  variant?: "primary" | "outline" | "ghost";
}

export function StartCallButton({
  consultationId,
  patientName,
  className = "",
  size = "sm",
  variant = "outline",
}: StartCallButtonProps) {
  const { t } = useTranslation();
  const [isFetching, setIsFetching] = useState(false);
  const [session, setSession] = useState<TelemedicineTokenResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  const dismissError = useCallback(() => setToastError(null), []);

  const handleStart = useCallback(async () => {
    if (!consultationId || consultationId === "new" || consultationId === "draft") {
      const msg =
        t(
          "telemed.saveEncounterFirst",
          "Save the consultation encounter before starting a video session."
        ) || "Save the consultation encounter before starting a video session.";
      setToastError(msg);
      window.setTimeout(dismissError, 5000);
      return;
    }

    setIsFetching(true);
    setToastError(null);
    try {
      const client = createApiClient();
      const roomName = `consultation-${consultationId}`;
      const res = await client.generateTelemedicineToken({
        consultation_id: consultationId,
        room_name: roomName,
      });
      setSession(res);
      setIsModalOpen(true);
    } catch (err: any) {
      const detail =
        err?.message ||
        (typeof err === "string" ? err : undefined) ||
        t(
          "telemed.tokenFetchFailed",
          "Unable to request a telemedicine session. Try again or notify the ward administrator."
        );
      setToastError(
        `${t("telemed.tokenFetchFailedTitle", "Telemedicine unavailable")}: ${detail}`
      );
      window.setTimeout(dismissError, 6000);
    } finally {
      setIsFetching(false);
    }
  }, [consultationId, dismissError, t]);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setSession(null);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleStart}
        disabled={isFetching}
        className={`gap-1.5 border-indigo-400 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {isFetching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span className="font-semibold">
              {t("telemed.joiningRoom", "Joining Room…") || "Joining Room…"}
            </span>
          </>
        ) : (
          <>
            <Video className="h-4 w-4 text-indigo-600" />
            <span className="font-semibold">
              {t("telemed.startSession", "Telemedicine Video") ||
                "Telemedicine Video"}
            </span>
          </>
        )}
      </Button>

      <LiveKitRoomModal
        isOpen={isModalOpen}
        onClose={handleClose}
        token={session?.token || ""}
        serverUrl={session?.server_url || ""}
        roomName={session?.room_name || ""}
        patientName={patientName}
        consultationId={consultationId}
      />

      {toastError ? (
        <div className="fixed z-[90] top-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md">
          <div className="rounded-xl border border-indigo-400/40 bg-indigo-950/90 backdrop-blur text-white shadow-2xl shadow-indigo-950/60 flex items-start gap-3 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-bold">{toastError}</p>
            </div>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss"
              className="rounded-md p-1 text-indigo-200 hover:bg-white/10 hover:text-white transition shrink-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
