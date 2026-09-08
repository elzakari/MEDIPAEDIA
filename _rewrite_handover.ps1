param(
  [string]$Target = "c:\Users\Public\Documents\MEDIPAEDIA\medipaedia\apps\hospital-web\src\app\(nurse)\nurse\handover\page.tsx"
)
$ErrorActionPreference = 'Stop'
$raw = [System.IO.File]::ReadAllText($Target)
$retIdx = $raw.IndexOf("  return (")
if ($retIdx -lt 0) { throw "MISS '  return ('" }

$headTmp = Join-Path $env:TEMP "hand_head.tsx"
$w = New-Object System.IO.StreamWriter($headTmp, $false, [System.Text.UTF8Encoding]::new($false))
$w.WriteLine('"use client";')
$w.WriteLine('')
$w.WriteLine('import React, { useState, useEffect, useCallback } from "react";')
$w.WriteLine('import {')
$w.WriteLine('  CheckCircle2,')
$w.WriteLine('  Clock,')
$w.WriteLine('  FileText,')
$w.WriteLine('  MessageSquare,')
$w.WriteLine('  Plus,')
$w.WriteLine('  Shield,')
$w.WriteLine('  ShieldCheck,')
$w.WriteLine('  User,')
$w.WriteLine('  Users,')
$w.WriteLine('  AlertCircle,')
$w.WriteLine('  Inbox,')
$w.WriteLine('} from "lucide-react";')
$w.WriteLine('import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Modal } from "@medipaedia/ui";')
$w.WriteLine('import {')
$w.WriteLine('  createApiClient,')
$w.WriteLine('  SBARHandoverItem,')
$w.WriteLine('  AcknowledgeHandoverPayload,')
$w.WriteLine('} from "@medipaedia/api-client";')
$w.WriteLine('')
$w.WriteLine('type SbarShift = "MORNING" | "AFTERNOON" | "NIGHT";')
$w.WriteLine('')
$w.WriteLine('export default function NurseSBARHandoverPage() {')
$w.WriteLine('  const [createModalOpen, setCreateModalOpen] = useState(false);')
$w.WriteLine('  const [ackModalOpen, setAckModalOpen] = useState(false);')
$w.WriteLine('  const [selectedHandover, setSelectedHandover] = useState<SBARHandoverItem | null>(null);')
$w.WriteLine('')
$w.WriteLine('  const [wardName, setWardName] = useState("");')
$w.WriteLine('  const [shift, setShift] = useState<SbarShift>("AFTERNOON");')
$w.WriteLine('  const [outgoingNurseName, setOutgoingNurseName] = useState("");')
$w.WriteLine('  const [outgoingNursePin, setOutgoingNursePin] = useState("");')
$w.WriteLine('  const [patientName, setPatientName] = useState("");')
$w.WriteLine('  const [situation, setSituation] = useState("");')
$w.WriteLine('  const [background, setBackground] = useState("");')
$w.WriteLine('  const [assessment, setAssessment] = useState("");')
$w.WriteLine('  const [recommendation, setRecommendation] = useState("");')
$w.WriteLine('')
$w.WriteLine('  const [incomingName, setIncomingName] = useState("");')
$w.WriteLine('  const [incomingPin, setIncomingPin] = useState("");')
$w.WriteLine('  const [isSubmitting, setIsSubmitting] = useState(false);')
$w.WriteLine('  const [saveSuccess, setSaveSuccess] = useState(false);')
$w.WriteLine('')
$w.WriteLine('  const [handovers, setHandovers] = useState<SBARHandoverItem[]>([]);')
$w.WriteLine('  const [loading, setLoading] = useState(true);')
$w.WriteLine('  const [error, setError] = useState<string | null>(null);')
$w.WriteLine('')
$w.WriteLine('  const loadHandovers = useCallback(async () => {')
$w.WriteLine('    setLoading(true);')
$w.WriteLine('    setError(null);')
$w.WriteLine('    try {')
$w.WriteLine('      const client = createApiClient();')
$w.WriteLine('      const data = await client.getSBARHandovers();')
$w.WriteLine('      setHandovers(Array.isArray(data) ? data : []);')
$w.WriteLine('    } catch (err: any) {')
$w.WriteLine('      setError(err?.message || String(err || "Could not load SBAR handovers"));')
$w.WriteLine('      setHandovers([]);')
$w.WriteLine('    } finally {')
$w.WriteLine('      setLoading(false);')
$w.WriteLine('    }')
$w.WriteLine('  }, []);')
$w.WriteLine('')
$w.WriteLine('  useEffect(() => { loadHandovers(); }, [loadHandovers]);')
$w.WriteLine('')
$w.WriteLine('  const resetCreateForm = () => {')
$w.WriteLine('    setWardName("");')
$w.WriteLine('    setShift("AFTERNOON");')
$w.WriteLine('    setOutgoingNurseName("");')
$w.WriteLine('    setOutgoingNursePin("");')
$w.WriteLine('    setPatientName("");')
$w.WriteLine('    setSituation(""); setBackground(""); setAssessment(""); setRecommendation("");')
$w.WriteLine('  };')
$w.WriteLine('')
$w.WriteLine('  const handleCreateSubmit = async (e: React.FormEvent) => {')
$w.WriteLine('    e.preventDefault();')
$w.WriteLine('    setIsSubmitting(true);')
$w.WriteLine('    try {')
$w.WriteLine('      const client = createApiClient();')
$w.WriteLine('      const created = await client.createSBARHandover({')
$w.WriteLine('        ward_name: wardName,')
$w.WriteLine('        shift,')
$w.WriteLine('        outgoing_nurse_name: outgoingNurseName,')
$w.WriteLine('        outgoing_nurse_pin: outgoingNursePin,')
$w.WriteLine('        patient_name: patientName,')
$w.WriteLine('        situation, background, assessment, recommendation,')
$w.WriteLine('      });')
$w.WriteLine('      const _ = created;')
$w.WriteLine('      setIsSubmitting(false);')
$w.WriteLine('      setSaveSuccess(true);')
$w.WriteLine('      setTimeout(() => {')
$w.WriteLine('        setSaveSuccess(false);')
$w.WriteLine('        setCreateModalOpen(false);')
$w.WriteLine('        resetCreateForm();')
$w.WriteLine('        loadHandovers();')
$w.WriteLine('      }, 1200);')
$w.WriteLine('    } catch (err: any) {')
$w.WriteLine('      setIsSubmitting(false);')
$w.WriteLine('      setError(err?.message || String(err || "Could not save SBAR handover"));')
$w.WriteLine('    }')
$w.WriteLine('  };')
$w.WriteLine('')
$w.WriteLine('  const handleAckSubmit = async (e: React.FormEvent) => {')
$w.WriteLine('    e.preventDefault();')
$w.WriteLine('    if (!selectedHandover) return;')
$w.WriteLine('    setIsSubmitting(true);')
$w.WriteLine('    try {')
$w.WriteLine('      const client = createApiClient();')
$w.WriteLine('      const payload: AcknowledgeHandoverPayload = {')
$w.WriteLine('        incoming_nurse_name: incomingName,')
$w.WriteLine('        incoming_nurse_pin: incomingPin,')
$w.WriteLine('      };')
$w.WriteLine('      const updated = await client.acknowledgeHandover(selectedHandover.handover_id, payload);')
$w.WriteLine('      setHandovers((prev) => prev.map((h) => (h.handover_id === updated.handover_id ? updated : h)));')
$w.WriteLine('      setIsSubmitting(false);')
$w.WriteLine('      setSaveSuccess(true);')
$w.WriteLine('      setTimeout(() => {')
$w.WriteLine('        setSaveSuccess(false);')
$w.WriteLine('        setAckModalOpen(false);')
$w.WriteLine('        setSelectedHandover(null);')
$w.WriteLine('        setIncomingName(""); setIncomingPin("");')
$w.WriteLine('      }, 1200);')
$w.WriteLine('    } catch (err: any) {')
$w.WriteLine('      setIsSubmitting(false);')
$w.WriteLine('      setError(err?.message || String(err || "Could not acknowledge SBAR handover"));')
$w.WriteLine('    }')
$w.WriteLine('  };')
$w.WriteLine('')
$w.Flush(); $w.Close()

$tail = $raw.Substring($retIdx)
$tail = $tail -replace '\{h\.id\}', '{h.handover_id}'
$tail = $tail -replace 'h\.wardName', 'h.ward_name'
$tail = $tail -replace 'h\.patientName', '(h.patient_name ?? "")'
$tail = $tail -replace 'h\.createdAt', 'h.created_at'
$tail = $tail -replace 'h\.isAcknowledged', '(h.is_acknowledged ?? !!h.acknowledged_at)'
$tail = $tail -replace 'h\.incomingNurseName', '(h.incoming_nurse_name ?? "")'
$tail = $tail -replace 'h\.incomingNursePin', '(h.incoming_nurse_pin ?? "")'
$tail = $tail -replace 'h\.acknowledgedAt', '(h.acknowledged_at ?? "")'
$tail = $tail -replace 'h\.outgoingNurseName', 'h.outgoing_nurse_name'
$tail = $tail -replace 'h\.outgoingNursePin', 'h.outgoing_nurse_pin'

$ackPattern = [regex]::new('description=\{`Incoming Nurse Electronic Signature for \$\{selectedHandover\.patientName\}`\}')
$tail = $ackPattern.Replace($tail, 'description={`Incoming Nurse Electronic Signature for ${selectedHandover.patient_name ?? selectedHandover.ward_name}`}')

$inj = @"

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
        <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-10 text-center space-y-3">
            <Inbox className="h-12 w-12 text-slate-400 mx-auto" />
            <h3 className="font-extrabold text-slate-900">No recent handover logs recorded. Start new shift handover.</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Structured SBAR handover is empty for this facility. Tap Create SBAR Handover Note to record the first transfer of clinical responsibility.
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => { setSaveSuccess(false); setCreateModalOpen(true); }}
              className="mx-auto gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create SBAR Handover Note
            </Button>
          </CardContent>
        </Card>
      )}

"@

$marker = "`n      <div class=""space-y-4"">"
$midx = $tail.IndexOf($marker)
if ($midx -lt 0) { throw "MISS marker: 'space-y-4' handover cards" }
$tail = $tail.Substring(0, $midx) + $inj + $tail.Substring($midx)

[System.IO.File]::AppendAllText($headTmp, $tail)
Copy-Item -LiteralPath $headTmp -Destination $Target -Force
Remove-Item -LiteralPath $headTmp -Force -ErrorAction SilentlyContinue

$fin = Get-Item $Target
Write-Host "handover rewrite OK -> $($fin.Length) bytes"
