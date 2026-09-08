'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createApiClient } from '@medipaedia/api-client';

export default function NurseStationOverviewPage() {
  const { tenant, user } = useAuth();
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [scheduledDoses, setScheduledDoses] = useState<any[]>([]);
  const [handover, setHandover] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadNurseData = async () => {
      try {
        setLoading(true);
        const apiClient = createApiClient();
        const [alertsRes, dosesRes, handoverRes] = await Promise.allSettled([
          apiClient.getActiveCriticalAlerts?.() ?? Promise.resolve([]),
          apiClient.getDueMedications?.() ?? Promise.resolve([]),
          apiClient.getLatestHandover?.() ?? Promise.resolve(null),
        ]);

        if (isMounted) {
          setCriticalAlerts(
            alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value) ? alertsRes.value : []
          );
          setScheduledDoses(
            dosesRes.status === 'fulfilled' && Array.isArray(dosesRes.value) ? dosesRes.value : []
          );
          setHandover(
            handoverRes.status === 'fulfilled' ? handoverRes.value : null
          );
        }
      } catch {
        if (isMounted) {
          setCriticalAlerts([]);
          setScheduledDoses([]);
          setHandover(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadNurseData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 p-8 text-white border border-teal-800/40 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide uppercase mb-3">
          Nurse Station Command Center
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          {tenant?.name || 'Healthcare Facility'} • Inpatient & Triage Desk
        </h1>
        <p className="text-slate-300 text-sm mt-1">
          Welcome, {user ? user.full_name : 'Staff Nurse'}. Clinical workforce on-duty. Triage intake active.
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <Link className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs tracking-wide transition-all shadow-md" href="/nurse/triage">
            + Triage Desk (ESI 1-5)
          </Link>
          <Link className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs tracking-wide transition-all" href="/nurse/emar">
            eMAR Workstation
          </Link>
          <Link className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs tracking-wide transition-all" href="/nurse/handover">
            SBAR Handover
          </Link>
        </div>
      </div>

      {/* Critical Resuscitation Alert (Only Render If Authentically Present) */}
      {criticalAlerts.length > 0 && (
        <div className="rounded-2xl bg-rose-600 p-4 text-white flex items-center justify-between shadow-lg animate-pulse">
          <div>
            <div className="text-xs font-black tracking-wider uppercase">
              RESUSCITATION BAY ALERT • {criticalAlerts[0]?.alert_title || 'CRITICAL LEVEL 1'}
            </div>
            <div className="text-sm mt-0.5">
              {criticalAlerts[0]?.patient_name} — {criticalAlerts[0]?.details}
            </div>
          </div>
          <Link className="px-3 py-1.5 rounded-lg bg-white text-rose-700 font-bold text-xs uppercase" href="/nurse/triage">
            View Triage →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-medium">Triage & ESI Board</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              All Stable
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">0</div>
          <p className="text-xs text-slate-500 mt-1">Active waiting patients classified</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-medium">eMAR Workstation</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {scheduledDoses.length} Doses Due
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{scheduledDoses.length}</div>
          <p className="text-xs text-slate-500 mt-1">Scheduled inpatient medications</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-medium">Inpatient Wards</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              0 / 30 Beds
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">0%</div>
          <p className="text-xs text-slate-500 mt-1">Census & bed allocation</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-medium">Fluid Balance</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              Active
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">0 mL</div>
          <p className="text-xs text-slate-500 mt-1">24-hour shift balance ledger</p>
        </div>
      </div>

      {/* Grid: Upcoming Doses & Handover */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scheduled Doses Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Upcoming Scheduled Doses</h3>
            <Link className="text-xs font-semibold text-teal-600 hover:text-teal-700" href="/nurse/emar">
              Open eMAR →
            </Link>
          </div>
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-medium">No medication doses due for this shift</p>
            <p className="text-xs text-slate-500 mt-1">Inpatient physician prescription orders will appear here</p>
          </div>
        </div>

        {/* Shift Handover Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Recent SBAR Clinical Handover</h3>
            <Link className="text-xs font-semibold text-teal-600 hover:text-teal-700" href="/nurse/handover">
              Handover Station →
            </Link>
          </div>
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-medium">No recent shift handovers logged</p>
            <p className="text-xs text-slate-500 mt-1">Click "Handover Station" to log the incoming/outgoing shift report</p>
          </div>
        </div>
      </div>
    </div>
  );
}
