"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ShieldCheck,
  Building2,
  Stethoscope,
  ShoppingBag,
  CreditCard,
  QrCode,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Compass,
  FileCheck,
  Layers,
  ChevronRight,
  PhoneCall,
  Clock,
  MapPin,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  MedipaediaLogo,
  MedipaediaIconMark,
  Modal,
} from "@medipaedia/ui";

export default function MarketingLandingPage() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [facilityType, setFacilityType] = useState<"HOSPITAL" | "CLINIC" | "PHARMACY">("HOSPITAL");
  const [facilityName, setFacilityName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setOnboardingSuccess(true);
      setTimeout(() => {
        setOnboardingSuccess(false);
        setOnboardingOpen(false);
        setFacilityName("");
        setLicenseNumber("");
      }, 2000);
    }, 800);
  };

  return (
    <div className="space-y-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Hero Section */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-5xl mx-auto space-y-8">
        <div className="flex justify-center">
          <div className="p-3.5 bg-white rounded-3xl shadow-xl border border-slate-200/80 inline-flex items-center gap-3.5 hover:shadow-2xl transition duration-300">
            <MedipaediaIconMark size="xl" imageVariant="mark" />
            <div className="text-left pr-3">
              <span className="font-display font-extrabold text-2xl text-slate-900 tracking-tight block leading-tight">
                Medipaedia
              </span>
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-widest block font-mono">
                Unified Health Exchange OS
              </span>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
          The National Health & Pharmacy Exchange OS
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold font-display tracking-tight text-slate-900 leading-[1.1]">
            The Unified Operating System for{" "}
            <span className="bg-gradient-to-r from-teal-700 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Hospitals, Pharmacies & Patients
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Connect OPD triage, doctor SOAP notes, cryptographic e-prescriptions, geospatial drug discovery, and automated Paystack escrow settlements in one zero-trust platform.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setOnboardingOpen(true)}
            className="w-full sm:w-auto font-bold gap-2 text-sm shadow-lg shadow-cyan-700/20"
          >
            <Building2 className="h-4 w-4" /> Onboard Your Facility
          </Button>

          <Link href="/auth" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-slate-300 hover:bg-slate-100 font-bold gap-2 text-sm text-slate-800"
            >
              <ShieldCheck className="h-4 w-4 text-cyan-600" /> Access Patient Health Pass
            </Button>
          </Link>
        </div>

        {/* Interactive End-to-End Visual Workflow Mockup */}
        <div id="how-it-works" className="pt-8 max-w-5xl mx-auto">
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 text-left relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs text-slate-400 font-mono pl-2">
                  Medipaedia Core Clinical-to-Dispensary Pipeline
                </span>
              </div>
              <Badge variant="teal" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                LIVE NETWORK FLOW
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Doctor SOAP Consultation */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">
                    STEP 1: HOSPITAL EMR
                  </span>
                  <Stethoscope className="h-4 w-4 text-cyan-400" />
                </div>
                <h4 className="font-bold text-white text-sm">Doctor SOAP Encounter</h4>
                <p className="text-[11px] text-slate-300">
                  Diagnosis: <strong className="text-cyan-200">Malaria (ICD-10: B50.9)</strong>
                </p>
                <div className="p-2 rounded bg-black/40 text-[10px] font-mono text-slate-300 space-y-1">
                  <div>• Coartem 80/480mg BD x 3d</div>
                  <div>• Paracetamol 500mg TDS</div>
                </div>
              </div>

              {/* Step 2: Cryptographic Rx */}
              <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">
                    STEP 2: E-PRESCRIPTION
                  </span>
                  <QrCode className="h-4 w-4 text-cyan-300" />
                </div>
                <h4 className="font-bold text-white text-sm">HMAC Tamper-Proof Rx</h4>
                <div className="flex items-center justify-between text-[11px] text-cyan-200">
                  <span>Claim PIN:</span>
                  <span className="font-mono font-bold text-white bg-cyan-800 px-2 py-0.5 rounded">
                    9K4L2P
                  </span>
                </div>
                <p className="text-[10px] text-cyan-300/80 font-mono">
                  Sig: 8f92a1c4b7e849da...
                </p>
              </div>

              {/* Step 3: Pharmacy POS & MoMo Escrow */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    STEP 3: PHARMACY POS
                  </span>
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                </div>
                <h4 className="font-bold text-white text-sm">Atomic Stock & Escrow</h4>
                <p className="text-[11px] text-slate-300">
                  FEFO Batch Deducted · GHS 45.00
                </p>
                <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center justify-between font-mono font-bold">
                  <span>PAYSTACK ESCROW</span>
                  <span>RELEASED (95%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three-Pillar Bento Grid */}
      <section id="features" className="space-y-8 max-w-6xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Built for Every Stakeholder in African Healthcare
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Interoperable modules engineered for high clinical throughput and zero financial leakage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Clinical */}
          <Card className="p-6 bg-gradient-to-b from-teal-50/60 to-white border-teal-200 flex flex-col justify-between hover:shadow-lg transition">
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-teal-600 text-white shadow-md">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Medipaedia Clinical</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete hospital and clinic EHR management. Fast OPD reception check-in, automatic folder fee waivers, live triage vitals queues, and WHO ICD-10 diagnostics.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  Digital Hospital Folders & QR Cards
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  Nurse Triage & Auto BMI Alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  HMAC-SHA256 Signed E-Prescriptions
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6">
              <a href="http://localhost:3000/login" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs text-teal-700 border-teal-300">
                  Explore Clinical Portal <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </Card>

          {/* Pillar 2: Rx POS */}
          <Card className="p-6 bg-gradient-to-b from-emerald-50/60 to-white border-emerald-200 flex flex-col justify-between hover:shadow-lg transition">
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-emerald-600 text-white shadow-md">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Medipaedia Rx POS</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Smart dispensary workstation for retail pharmacies. Optical QR prescription verification, FEFO batch expiry management, atomic inventory decrement, and thermal receipts.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Webcam Optical QR Scanner & PIN Verifier
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  First-Expired-First-Out Batch Control
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Instant Paystack MoMo Payout Sweeps
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6">
              <a href="http://localhost:3001/login" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs text-emerald-700 border-emerald-300">
                  Explore Pharmacy POS <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </Card>

          {/* Pillar 3: Care */}
          <Card className="p-6 bg-gradient-to-b from-cyan-50/60 to-white border-cyan-200 flex flex-col justify-between hover:shadow-lg transition">
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-cyan-600 text-white shadow-md">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Medipaedia Care</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Universal patient health pass and medicine marketplace. PostGIS radius search for guaranteed in-stock medicines, Mobile Money escrow checkout, and digital card wallet.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  Ghana Card Universal Patient ID
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  PostGIS Proximity Drug Discovery
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  15-Minute Stock Lock & Escrow Checkout
                </li>
              </ul>
            </div>
            <div className="pt-6 border-t border-slate-100 mt-6">
              <Link href="/auth">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs text-cyan-700 border-cyan-300">
                  Open Patient Wallet <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. Live Trust Metrics & Standards */}
      <section id="network" className="bg-slate-900 text-white p-8 sm:p-12 rounded-3xl space-y-8 max-w-6xl mx-auto shadow-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400">148+</span>
            <p className="text-xs text-slate-400 font-semibold uppercase">Verified Facilities</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400">89,410+</span>
            <p className="text-xs text-slate-400 font-semibold uppercase">Prescriptions Signed</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400">GHS 1.4M+</span>
            <p className="text-xs text-slate-400 font-semibold uppercase">Escrow Volume Processed</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400">99.98%</span>
            <p className="text-xs text-slate-400 font-semibold uppercase">Platform Uptime</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-around gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Ministry of Health Compliance
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-cyan-400" /> Zero-Trust HMAC Cryptography
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-blue-400" /> Paystack Secured Escrow Engine
          </span>
        </div>
      </section>

      {/* 4. Facility Onboarding Modal */}
      {onboardingOpen && (
        <Modal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          title="Onboard Healthcare Facility"
          description="Join the Medipaedia National Health Exchange to issue digital e-prescriptions or dispense with escrow protection."
        >
          {onboardingSuccess ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">Registration Submitted!</h3>
              <p className="text-xs text-slate-500">
                Your application for <strong>{facilityName}</strong> has been placed in the Super Admin verification queue. Our licensing team will verify your credentials within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleOnboardingSubmit} className="space-y-4 py-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["HOSPITAL", "CLINIC", "PHARMACY"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFacilityType(t)}
                      className={`p-2.5 rounded-lg border font-bold text-center transition ${
                        facilityType === t
                          ? "bg-cyan-600 text-white border-cyan-600"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Facility Official Name"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="e.g. Ridge Regional Hospital / Osu Pharmacy"
                required
              />

              <Input
                label="MOH / Pharmacy Council License Number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. MOH-GAR-4920 or PC-ASH-819"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Official Email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@facility.gh"
                  required
                />
                <Input
                  label="Contact Phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+233 30 277 8899"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-bold"
              >
                Submit Facility for Super Admin Verification
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
