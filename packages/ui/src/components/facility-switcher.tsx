"use client";

import React, { useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Badge } from "./badge";

export interface FacilityItem {
  tenantId: string;
  facilityName: string;
  facilityType: "HOSPITAL" | "CLINIC" | "PHARMACY";
  mrn: string;
}

export interface FacilitySwitcherProps {
  currentFacilityId?: string;
  facilities: FacilityItem[];
  onSelectFacility: (tenantId: string) => void;
}

export function FacilitySwitcher({
  currentFacilityId,
  facilities,
  onSelectFacility,
}: FacilitySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedFacility = facilities.find(
    (f) => f.tenantId === currentFacilityId
  ) || facilities[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-300 text-xs font-medium text-slate-800 transition"
      >
        <Building2 className="h-4 w-4 text-teal-600 shrink-0" />
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-bold truncate max-w-[140px]">
              {selectedFacility ? selectedFacility.facilityName : "Select Hospital"}
            </span>
            {selectedFacility && (
              <Badge variant="teal" className="text-[9px] py-0 px-1">
                {selectedFacility.facilityType}
              </Badge>
            )}
          </div>
          {selectedFacility && (
            <span className="text-[10px] text-slate-500 font-mono">
              MRN: {selectedFacility.mrn}
            </span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-xl bg-white p-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-200">
            <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Linked Hospital Folders
            </div>

            <div className="space-y-1">
              {facilities.map((facility) => {
                const isSelected = facility.tenantId === currentFacilityId;
                return (
                  <button
                    key={facility.tenantId}
                    type="button"
                    onClick={() => {
                      onSelectFacility(facility.tenantId);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                      isSelected
                        ? "bg-teal-50 text-teal-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {facility.facilityName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        MRN: {facility.mrn} · {facility.facilityType}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-teal-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
