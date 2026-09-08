'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createApiClient } from '@medipaedia/api-client';

const apiClient = createApiClient();

interface CallingTicket {
  ticket_number: string;
  patient_name: string;
  room_name: string;
  department: string;
  urgency: 'ROUTINE' | 'PRIORITY' | 'EMERGENCY';
  called_at: string;
}

export default function ReceptionTvDisplayPage() {
  const { tenant } = useAuth();
  const [callingRooms, setCallingRooms] = useState<CallingTicket[]>([]);
  const [totalWaiting, setTotalWaiting] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live Queue Fetching (No Mock Data Fallback)
  const fetchLiveQueue = useCallback(async () => {
    try {
      const res: any = await apiClient.getLiveQueueCalling();
      const calling = Array.isArray(res?.calling) ? res.calling : (Array.isArray(res?.now_calling) ? res.now_calling : []);
      setCallingRooms(calling);
      setTotalWaiting(typeof res?.total_waiting === 'number' ? res.total_waiting : 0);
    } catch {
      setCallingRooms([]);
      setTotalWaiting(0);
    }
  }, []);

  useEffect(() => {
    fetchLiveQueue();
    const poll = setInterval(fetchLiveQueue, 4000);
    return () => clearInterval(poll);
  }, [fetchLiveQueue]);
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 select-none font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-4">
          <Link className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" href="/reception" title="Back to Reception Intake">
            ←
          </Link>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
            {tenant?.name ? tenant.name.substring(0, 2).toUpperCase() : 'MP'}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {tenant?.name || 'Live Queue Display'}
            </h1>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mt-0.5">
              Outpatient Clinics & Specialist Suites • Live Queue Board
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setChimeEnabled(!chimeEnabled)}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
              chimeEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span>{chimeEnabled ? '🔔 Chime Active' : '🔕 Chime Muted'}</span>
          </button>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
              {currentTime || '--:--:-- --'}
            </div>
            <div className="text-xs uppercase text-slate-500 font-medium">
              {currentDate || 'Loading...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Calling Stage */}
      <main className="flex-1 my-8 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg uppercase tracking-widest font-bold text-slate-200">
              Now Calling to Consulting Rooms
            </h2>
          </div>
          <div className="text-sm text-slate-400 font-medium">
            Total Patients Waiting: <span className="text-emerald-400 font-bold font-mono text-base">{totalWaiting}</span>
          </div>
        </div>
        {callingRooms.length === 0 ? (
          <div className="w-full py-28 rounded-3xl border border-dashed border-slate-800/80 bg-slate-900/30 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center text-2xl text-slate-500 mb-4">
              ⏱️
            </div>
            <h3 className="text-2xl font-semibold text-slate-300">
              Queue Standby • No Patients Currently Called
            </h3>
            <p className="text-sm text-slate-500 max-w-md mt-2">
              Patients will be announced on this display and directed to their consulting room when called by clinical staff.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {callingRooms.map((ticket, idx) => {
              const isEmergency = ticket.urgency === 'EMERGENCY';
              const isPriority = ticket.urgency === 'PRIORITY';
              return (
                <div
                  key={idx}
                  className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${
                    isEmergency
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30'
                      : isPriority
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                        isEmergency
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isPriority
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {ticket.department || 'GENERAL OPD'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{ticket.called_at}</span>
                  </div>

                  <div className="my-6 text-center">
                    <div
                      className={`text-6xl font-black font-mono tracking-tight ${
                        isEmergency ? 'text-rose-400' : isPriority ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {ticket.ticket_number}
                    </div>
                    <div className="text-lg font-medium text-slate-300 mt-2">
                      {ticket.patient_name}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 text-center">
                    <div className="text-xs uppercase tracking-wider text-slate-500">Please Proceed To</div>
                    <div className="text-xl font-bold text-white mt-0.5">{ticket.room_name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Clinic Overview */}
      <footer className="border-t border-slate-800/80 pt-4">
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
          Department Status
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['General OPD', 'Antenatal (ANC)', 'Eye Clinic', 'Pediatrics', 'Emergency'].map((dept) => (
            <div key={dept} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400">{dept}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Ready for triage</div>
              </div>
              <div className="text-sm font-bold font-mono text-slate-300">0</div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
