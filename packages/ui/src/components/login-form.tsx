"use client";

import React, { useState } from "react";
import { Lock, Mail, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { MedipaediaIconMark } from "./logo";

export interface LoginFormProps {
  appName: string;
  portalSubtitle?: string;
  defaultFacilitySlug?: string;
  onSubmit: (credentials: {
    email: string;
    password: string;
    facilitySlug?: string;
  }) => Promise<void>;
  facilitySlugFixed?: boolean;
}

export function LoginForm({
  appName,
  portalSubtitle = "Healthcare Staff Secure Access",
  defaultFacilitySlug = "",
  onSubmit,
  facilitySlugFixed = false,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facilitySlug, setFacilitySlug] = useState(defaultFacilitySlug);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        email,
        password,
        facilitySlug: facilitySlug || undefined,
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Authentication failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-200/90 shadow-xl bg-white">
      <CardHeader className="space-y-3 text-center pb-6 border-b border-slate-100">
        <div className="mx-auto flex justify-center">
          <MedipaediaIconMark size="lg" imageVariant="mark" />
        </div>
        <div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Medipaedia {appName}
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">{portalSubtitle}</p>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {!facilitySlugFixed && (
            <Input
              label="Facility Code or Slug"
              value={facilitySlug}
              onChange={(e) => setFacilitySlug(e.target.value)}
              placeholder="e.g. ridge-regional-hospital"
              helperText="Determines your authorized hospital or pharmacy tenant"
            />
          )}

          <Input
            label="Staff Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor.name@hospital.health"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full gap-2 mt-2"
          >
            Authenticate to {appName} <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="pt-4 text-center text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3 text-teal-600" />
            <span>256-bit TLS Multi-Tenant Encrypted Session</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
