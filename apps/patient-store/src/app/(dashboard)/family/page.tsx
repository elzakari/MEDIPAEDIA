"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Baby,
  User,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal } from "@medipaedia/ui";

export default function PatientFamilyCarePage() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("CHILD");
  const [dob, setDob] = useState("2020-04-12");
  const [gender, setGender] = useState("MALE");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [nhisNumber, setNhisNumber] = useState("GHA-NHIS-8821941");

  const [dependents, setDependents] = useState([
    {
      id: "dep-001",
      name: "Kofi Mensah Jr.",
      relationship: "CHILD",
      dob: "12 Apr 2020 (Age 6)",
      gender: "Male",
      bloodGroup: "O+",
      nhis: "GHA-NHIS-8821941",
      activePrescriptions: 1,
      lastVisit: "Ridge Hospital (Pediatrics) • 14 Jul 2026",
    },
    {
      id: "dep-002",
      name: "Akosua Mensah",
      relationship: "SPOUSE",
      dob: "25 Aug 1992 (Age 34)",
      gender: "Female",
      bloodGroup: "A+",
      nhis: "GHA-NHIS-8821942",
      activePrescriptions: 0,
      lastVisit: "Ridge Hospital (Maternity) • 02 May 2026",
    },
  ]);

  const handleAddDependent = (e: React.FormEvent) => {
    e.preventDefault();
    const newDep = {
      id: `dep-00${dependents.length + 1}`,
      name,
      relationship,
      dob: `${dob} (Dependent)`,
      gender,
      bloodGroup,
      nhis: nhisNumber,
      activePrescriptions: 0,
      lastVisit: "No visits logged yet",
    };
    setDependents([...dependents, newDep]);
    setAddSuccess(true);
    setTimeout(() => {
      setAddSuccess(false);
      setAddModalOpen(false);
      setName("");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-700" /> Family Health & Dependents Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage electronic health records, NHIS cards, and appointments for your children and family members
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          variant="primary"
          size="md"
          className="font-bold gap-2 shadow-md shadow-teal-700/20"
        >
          <UserPlus className="h-4 w-4" /> Link Family Dependent
        </Button>
      </div>

      {/* Dependents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dependents.map((dep) => (
          <Card
            key={dep.id}
            className="p-5 border border-slate-200 bg-white shadow-sm space-y-4 hover:border-teal-400 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black">
                  {dep.relationship === "CHILD" ? <Baby className="h-6 w-6" /> : <User className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {dep.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="teal" className="text-[10px] font-bold">
                      {dep.relationship}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono">{dep.dob}</span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] font-bold font-mono">
                {dep.bloodGroup}
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
              <div className="text-slate-600 font-mono">
                NHIS Number: <strong className="text-slate-900">{dep.nhis}</strong>
              </div>
              <div className="text-slate-600 text-[11px]">
                Last Encounter: <strong>{dep.lastVisit}</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert(`Switching active PHR profile to ${dep.name}...`)}
                className="flex-1 font-bold text-xs border-teal-300 text-teal-800 hover:bg-teal-50"
              >
                Switch to {dep.name}'s PHR
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Dependent Modal */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Link Family Dependent Profile"
          description="Add child, spouse, or elderly parent to your consolidated family health record."
        >
          <form onSubmit={handleAddDependent} className="py-4 space-y-3 text-xs">
            {addSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold">Family Dependent Linked!</h3>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwame Mensah"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Relationship</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="CHILD">Child / Dependent</option>
                      <option value="SPOUSE">Spouse</option>
                      <option value="PARENT">Parent</option>
                      <option value="OTHER">Other Relative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="O+">O Positive (O+)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">NHIS Number</label>
                    <input
                      type="text"
                      placeholder="GHA-NHIS-..."
                      value={nhisNumber}
                      onChange={(e) => setNhisNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-teal-700/20 mt-2"
                >
                  Link Dependent to Health Account
                </Button>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
