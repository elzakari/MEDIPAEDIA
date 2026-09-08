"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Shield,
  ShieldCheck,
  User,
  Users,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";
import {
  createApiClient,
  SBARHandoverItem,
  AcknowledgeHandoverPayload,
} from "@medipaedia/api-client";

type SbarShift = "MORNING" | "AFTERNOON" | "NIGHT";

export default function NurseSBARHandoverPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<SBARHandoverItem | null>(null);

  const [wardName, setWardName] = useState("");
  const [shift, setShift] = useState<SbarShift>("AFTERNOON");
  const [outgoingNurseName, setOutgoingNurseName] = useState("");
  const [outgoingNursePin, setOutgoingNursePin] = useState("");
  const [patientName, setPatientName] = useState("");
  const [situation, setSituation] = useState("");
  const [background, setBackground] = useState("");
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const [incomingName, setIncomingName] = useState("");
  const [incomingPin, setIncomingPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [handovers, setHandovers] = useState<SBARHandoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHandovers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = createApiClient();
      const data = await client.getSBARHandovers();
      setHandovers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || String(err || "Could not load SBAR handovers"));
      setHandovers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHandovers(); }, [loadHandovers]);

  const resetCreateForm = () => {
    setWardName("");
    setShift("AFTERNOON");
    setOutgoingNurseName("");
    setOutgoingNursePin("");
    setPatientName("");
    setSituation(""); setBackground(""); setAssessment(""); setRecommendation("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const client = createApiClient();
      const created = await client.createSBARHandover({
        ward_name: wardName,
        shift,
        outgoing_nurse_name: outgoingNurseName,
        outgoing_nurse_pin: outgoingNursePin,
        patient_name: patientName,
        situation, background, assessment, recommendation,
      });
      const _ = created;
      setIsSubmitting(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setCreateModalOpen(false);
        resetCreateForm();
        loadHandovers();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || String(err || "Could not save SBAR handover"));
    }
  };

  const handleAckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandover) return;
    setIsSubmitting(true);
    try {
      const client = createApiClient();
      const payload: AcknowledgeHandoverPayload = {
        incoming_nurse_name: incomingName,
        incoming_nurse_pin: incomingPin,
      };
      const updated = await client.acknowledgeHandover(selectedHandover.handover_id, payload);
      setHandovers((prev) => prev.map((h) => (h.handover_id === updated.handover_id ? updated : h)));
      setIsSubmitting(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setAckModalOpen(false);
        setSelectedHandover(null);
        setIncomingName(""); setIncomingPin("");
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || String(err || "Could not acknowledge SBAR handover"));
    }
  };
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            SBAR Clinical Shift Handover Station
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Structured SBAR (Situation, Background, Assessment, Recommendation) transfer of clinical responsibility
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSaveSuccess(false);
              setCreateModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="font-bold gap-1.5 shadow-sm shadow-teal-700/20"
          >
            <Plus className="h-4 w-4" /> Create SBAR Handover Note
          </Button>
        </div>
      </div>


      {/* Loading / Error / Empty states */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-white animate-pulse space-y-4">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-16 bg-slate-50 rounded" />
              <div className="h-12 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="border-2 border-rose-200 bg-rose-50/60">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-rose-900">Could not load SBAR handovers</h3>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={loadHandovers}>Retry Refresh</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && handovers.length === 0 && (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <p className="font-semibold text-slate-700">No Active Shift Handovers</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "+ Create SBAR Handover Note" to record shift transfer notes.
          </p>
        </div>
      )}
      {/* SBAR Handover Cards */}
      <div className="space-y-4">
        {handovers.map((h) => (
          <Card key={h.handover_id} className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
            {/* Handover Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Badge variant="teal" className="text-xs font-bold uppercase">
                  {h.shift} SHIFT
                </Badge>
                <h3 className="font-extrabold text-sm text-slate-900">{(h.patient_name ?? "")}</h3>
                <span className="text-xs text-slate-500 font-medium">({h.ward_name})</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {h.created_at}
                </span>
                {(h.is_acknowledged ?? !!h.acknowledged_at) ? (
                  <Badge variant="teal" className="text-[10px] font-bold">
                    ✓ ACKNOWLEDGED BY {(h.incoming_nurse_name ?? "")}
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] font-bold">
                    PENDING INCOMING NURSE SIGNATURE
                  </Badge>
                )}
              </div>
            </div>

            {/* SBAR 4-Quadrant Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Situation */}
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-1">
                <span className="font-extrabold text-teal-900 uppercase tracking-wider block text-[10px]">
                  [S] Situation & Immediate Concerns
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">{h.situation}</p>
              </div>

              {/* Background */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-extrabold text-slate-700 uppercase tracking-wider block text-[10px]">
                  [B] Background & Clinical History
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">{h.background}</p>
              </div>

              {/* Assessment */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <span className="font-extrabold text-amber-900 uppercase tracking-wider block text-[10px]">
                  [A] Assessment & Current Vitals / Fluids
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">{h.assessment}</p>
              </div>

              {/* Recommendation */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <span className="font-extrabold text-emerald-900 uppercase tracking-wider block text-[10px]">
                  [R] Recommendation & Action Plan
                </span>
                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                  {h.recommendation}
                </p>
              </div>
            </div>

            {/* Handover Footer / Acknowledgment */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Outgoing Nurse: <strong>{h.outgoing_nurse_name}</strong> ({h.outgoing_nurse_pin})
              </div>

              {!(h.is_acknowledged ?? !!h.acknowledged_at) ? (
                <Button
                  onClick={() => {
                    setSelectedHandover(h);
                    setSaveSuccess(false);
                    setAckModalOpen(true);
                  }}
                  variant="primary"
                  size="sm"
                  className="font-bold gap-1.5 shadow-sm shadow-teal-700/20"
                >
                  <ShieldCheck className="h-4 w-4" /> Acknowledge Shift Handover
                </Button>
              ) : (
                <div className="text-emerald-800 font-mono text-[11px]">
                  Signed by {(h.incoming_nurse_name ?? "")} ({(h.incoming_nurse_pin ?? "")}) at {(h.acknowledged_at ?? "")}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create SBAR Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create SBAR Shift Handover Report"
          description="Standardized clinical handover for incoming nurse team."
        >
          {saveSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">SBAR Handover Logged!</h3>
              <p className="text-xs text-slate-500">
                Ready for incoming nurse team electronic signature.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ward Name</label>
                  <select
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Male Medical Ward">Male Medical Ward</option>
                    <option value="Female Medical Ward">Female Medical Ward</option>
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="Pediatric Ward">Pediatric Ward</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="MORNING">Morning Shift (07:00 - 14:00)</option>
                    <option value="AFTERNOON">Afternoon Shift (14:00 - 20:00)</option>
                    <option value="NIGHT">Night Shift (20:00 - 08:00)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Patient / Focus Area"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  [S] Situation (Immediate issues, recent spikes)
                </label>
                <textarea
                  rows={2}
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  [B] Background (Diagnosis, allergies, code status)
                </label>
                <textarea
                  rows={2}
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  [A] Assessment (Current vitals, fluid status, labs)
                </label>
                <textarea
                  rows={2}
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  [R] Recommendation (Pending orders, doctor review)
                </label>
                <textarea
                  rows={2}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Outgoing Nurse Name"
                  value={outgoingNurseName}
                  onChange={(e) => setOutgoingNurseName(e.target.value)}
                  required
                />
                <Input
                  label="NMC License PIN"
                  value={outgoingNursePin}
                  onChange={(e) => setOutgoingNursePin(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                Sign & Submit SBAR Handover
              </Button>
            </form>
          )}
        </Modal>
      )}

      {/* Acknowledge SBAR Modal */}
      {ackModalOpen && selectedHandover && (
        <Modal
          isOpen={ackModalOpen}
          onClose={() => setAckModalOpen(false)}
          title="Acknowledge Clinical Responsibility"
          description={`Incoming Nurse Electronic Signature for ${selectedHandover.patient_name ?? selectedHandover.ward_name}`}
        >
          {saveSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Shift Handover Acknowledged!</h3>
              <p className="text-xs text-slate-500 font-mono">
                Transferred to {incomingName} ({incomingPin}).
              </p>
            </div>
          ) : (
            <form onSubmit={handleAckSubmit} className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                <span className="font-bold text-teal-950 block">Statutory Shift Acceptance</span>
                <p className="text-teal-800 text-[11px]">
                  By signing below, you acknowledge receipt of the SBAR clinical handover report and accept full nursing care responsibility for the patient during the incoming shift.
                </p>
              </div>

              <Input
                label="Incoming Nurse Full Name"
                value={incomingName}
                onChange={(e) => setIncomingName(e.target.value)}
                required
              />

              <Input
                label="Nursing & Midwifery Council (NMC) License PIN"
                value={incomingPin}
                onChange={(e) => setIncomingPin(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-md shadow-teal-700/20"
              >
                Sign & Accept Shift Responsibility
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
