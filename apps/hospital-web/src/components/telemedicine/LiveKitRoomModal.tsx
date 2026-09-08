"use client";

import React, { useState, useCallback, useEffect } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import {
  X,
  Maximize2,
  Minimize2,
  PhoneOff,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@medipaedia/ui/src/lib/utils";
import { Badge, Button, useTranslation } from "@medipaedia/ui";

export interface LiveKitRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  serverUrl: string;
  roomName: string;
  patientName?: string;
  consultationId?: string;
}

function RoomHeader({
  roomName,
  patientName,
  onHangup,
  isFullscreen,
  onToggleFullscreen,
}: {
  roomName: string;
  patientName?: string;
  onHangup: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const room = useRoomContext();
  const { t } = useTranslation();

  const handleHangup = useCallback(async () => {
    try {
      await room?.disconnect();
    } finally {
      onHangup();
    }
  }, [room, onHangup]);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950 px-4 py-2.5 text-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm tracking-tight truncate text-white">
              <span className="font-mono text-teal-300 text-[11px] mr-2">
                #{roomName}
              </span>
              {patientName ? (
                <span className="truncate">{patientName}</span>
              ) : null}
            </h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Badge
              variant="teal"
              className="!bg-teal-500/10 !text-teal-300 !border-teal-500/30 !text-[10px] !px-1.5 !py-0"
            >
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Encrypted WebRTC
              </span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
          aria-label={
            isFullscreen
              ? t("telemed.exitFs", "Exit fullscreen") || "Exit fullscreen"
              : t("telemed.enterFs", "Enter fullscreen") || "Enter fullscreen"
          }
          title={
            isFullscreen
              ? t("telemed.exitFs", "Exit fullscreen") || "Exit fullscreen"
              : t("telemed.enterFs", "Enter fullscreen") || "Enter fullscreen"
          }
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>

        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={handleHangup}
          className="gap-1.5 font-black text-xs bg-rose-600 hover:bg-rose-500"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          {t("telemed.endCall", "End Session")}
        </Button>

        <button
          type="button"
          onClick={onHangup}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition lg:hidden"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function LiveKitRoomModal({
  isOpen,
  onClose,
  token,
  serverUrl,
  roomName,
  patientName,
  consultationId,
}: LiveKitRoomModalProps) {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const el = document.getElementById("lk-room-modal-root");
    if (!el) return;
    const apply = () => {
      el.classList.toggle("lk-modal-fullscreen", isFullscreen);
    };
    apply();
  }, [isFullscreen, isOpen]);

  if (!isOpen) return null;

  const fallbackRoomName =
    roomName ||
    (consultationId ? `consultation-${consultationId}` : "telemed-room");
  const displayPatient =
    patientName || t("telemed.remoteParticipant", "Remote Participant");

  return (
    <div
      id="lk-room-modal-root"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-slate-950/90 backdrop-blur-md p-2 sm:p-4",
        "animate-in fade-in duration-200",
        isFullscreen && "lk-modal-fullscreen p-0"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-2xl bg-slate-950 border border-slate-800",
          "shadow-2xl shadow-slate-950/60",
          "w-full transition-all duration-300",
          isFullscreen
            ? "max-w-full h-screen rounded-none border-0"
            : "max-w-6xl aspect-[16/10] max-h-[92vh]"
        )}
      >
        {token && serverUrl ? (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={isOpen}
            video={true}
            audio={true}
            data-lk-theme="default"
            onDisconnected={onClose}
            onError={(err) => {
              setErrorMessage(
                err?.message ||
                  t(
                    "telemed.connectErr",
                    "Failed to connect to telemedicine room"
                  ) ||
                  "Failed to connect"
              );
            }}
            style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
          >
            <RoomHeader
              roomName={fallbackRoomName}
              patientName={displayPatient}
              onHangup={onClose}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((v) => !v)}
            />

            <div className="relative flex-1 min-h-0 bg-slate-900 overflow-hidden">
              <div className="absolute inset-0">
                <VideoConference />
                <RoomAudioRenderer />
              </div>

              {errorMessage ? (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%]">
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/85 backdrop-blur px-3 py-2 shadow-lg shadow-rose-950/50 flex items-start gap-2 text-xs">
                    <X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <strong className="font-bold text-rose-200 block">
                        {t(
                          "telemed.connectionError",
                          "Telemedicine Connection Error"
                        )}
                      </strong>
                      <p className="text-rose-300/90 truncate">
                        {errorMessage}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="rounded-md p-1 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="absolute bottom-3 left-3 z-40 max-w-[80%]">
                <div className="rounded-xl bg-slate-950/70 backdrop-blur px-3 py-1.5 border border-slate-800/60 flex flex-col gap-0.5">
                  <span className="font-mono text-[10px] text-teal-300/90 truncate">
                    #{fallbackRoomName}
                  </span>
                  <span className="text-[10px] text-slate-300/80 font-semibold truncate">
                    {displayPatient}
                  </span>
                </div>
              </div>
            </div>
          </LiveKitRoom>
        ) : (
          <>
            <RoomHeader
              roomName={fallbackRoomName}
              patientName={displayPatient}
              onHangup={onClose}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((v) => !v)}
            />
            <div className="relative flex-1 min-h-0 bg-slate-900 overflow-hidden flex items-center justify-center text-center p-8">
              <div className="space-y-3">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm">
                  {t("telemed.missingToken", "Missing Session Token")}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {t(
                    "telemed.missingTokenDesc",
                    "Return to the consultation workstation and request a fresh telemedicine token."
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
