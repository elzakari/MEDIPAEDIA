import Link from "next/link";
import {
  Scan,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import {
  StatCard,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@medipaedia/ui";

export default function PharmacyDashboard() {
  const recentDispenses = [
    {
      id: "dsp-1",
      rxNumber: "RX-2026-9821",
      patient: "Active Outpatient",
      doctor: "Attending Physician",
      items: "Artemether + Lumefantrine, Paracetamol",
      total: "GHS 125.00",
      time: "10 mins ago",
      verified: true,
    },
    {
      id: "dsp-2",
      rxNumber: "RX-2026-9784",
      patient: "Active Outpatient 2",
      doctor: "Resident Physician",
      items: "Amoxicillin-Clavulanate 625mg",
      total: "GHS 85.00",
      time: "45 mins ago",
      verified: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pharmacy Counter & Verification Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Osu Community Pharmacy · License: FDA/GH-PH-2026-0189
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/verify">
            <Button variant="secondary" className="gap-2 bg-cyan-600 hover:bg-cyan-700">
              <Scan className="h-4 w-4" />
              Scan QR Prescription
            </Button>
          </Link>
          <Link href="/pos">
            <Button variant="primary" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Open POS Register
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Verified Dispenses Today"
          value="29 Rx"
          description="0 failed signatures"
          icon={<ShieldCheck className="h-5 w-5 text-cyan-600" />}
          trend={{ value: "+8 vs yesterday", isPositive: true }}
        />
        <StatCard
          title="Gross Sales Today"
          value="GHS 3,840"
          description="Includes Escrow marketplace"
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          trend={{ value: "15%", isPositive: true }}
        />
        <StatCard
          title="Marketplace Orders"
          value="12 Orders"
          description="In delivery & pickup"
          icon={<Package className="h-5 w-5 text-teal-600" />}
          trend={{ value: "4 pending pickup", isPositive: true }}
        />
        <StatCard
          title="Low Stock Alerts"
          value="3 Lots"
          description="Reorder threshold reached"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Main Grid: Recent Dispensing Activity & Inventory Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dispensing Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Recent Verified Prescriptions</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Cryptographically audited dispensations
                </p>
              </div>
              <Link href="/verify">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Scan className="h-3.5 w-3.5" /> New Scan
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {recentDispenses.map((dsp) => (
                <div
                  key={dsp.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-cyan-800 text-sm">
                        {dsp.rxNumber}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {dsp.patient}
                      </span>
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> HMAC VERIFIED
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600">{dsp.items}</p>
                    <p className="text-[11px] text-slate-400">
                      Prescribed by {dsp.doctor} · {dsp.time}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total</span>
                      <strong className="text-sm text-slate-900">{dsp.total}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stock & Marketplace Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-cyan-600" />
                Medipaedia Marketplace Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-3">
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-800">
                <strong>PostGIS Geofencing Active</strong>
                <p className="text-[11px] mt-0.5">
                  Your inventory is visible to patients within a 15km radius in Accra Central & Osu.
                </p>
              </div>

              <Link href="/inventory">
                <Button variant="secondary" size="sm" className="w-full bg-cyan-600 hover:bg-cyan-700">
                  Manage Inventory & Batches
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expiry Date Watch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                <div className="flex items-center justify-between font-semibold">
                  <span>Ciprofloxacin 500mg (Lot #CP-849)</span>
                  <Badge variant="warning">Expires in 18 days</Badge>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">Available: 45 boxes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
