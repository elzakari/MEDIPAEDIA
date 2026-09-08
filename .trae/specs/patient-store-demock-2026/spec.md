# Patient Store Mock Purge & Live-Data Rewire (5 Pages) - Product Requirements Document

## Overview
- **Summary**: Eradicate every hardcoded mock fixture, static hospital card, fake prescription, dummy diagnostic report, synthetic adherence schedule, and hardcoded patient identity literals from 5 pages inside `apps/patient-store/src/app/(dashboard)`: **dashboard**, **appointments**, **cards**, **prescriptions** (incl. daily adherence tracker), **diagnostics**. Wire every collection surface to live `@medipaedia/api-client` endpoints, install authentic typed zero-states for every data surface, install dedicated isLoading skeletons + error UIs with Retry affordances, replace every `useState<any>` with strict-typed state (no `any` outside `catch (err: any)` blocks), and remove the two forbidden fallback literals **"Facility Health Service"** and **"Attending Physician"**.
- **Purpose**: The patient-store (port :3002) currently exposes literally hundreds of static hardcoded strings to real logged-in patients: "Ridge Regional Hospital / Korle-Bu / 37 Military" seeded cards, "RX-2026-99214 / Facility Health Service / Attending Physician / MDC/GMC-STAFF" e-Rx vault entries, "diag-2026-001 / Facility Pathology Service" lab panels, a full synthetic adherence pillbox with Coartem/Amlodipine/Metformin/Atorvastatin fixtures, a vitals log with "Ridge Hospital Lab Sync" entries, an ICE passport with "GHA-71298412-1 / O Rh Positive (O+) / AA (Normal) / Kofi Mensah (0244998877) / Amoxicillin / Penicillin" hardcoded identity, and a layout header that unconditionally renders `userName="Active Patient User"` instead of resolving from authenticated session. This violates the Medipaedia platform convention of zero mock data in production patient-facing routes and delivers a misleading personal health record.
- **Target Users**: Authenticated `PATIENT` role users consuming the Care portal (port 3002) for their PHR, ICE passport, appointment queueing, medication adherence, e-Rx vault, and diagnostics results; downstream reviewers in clinical governance who rely on patient-side data fidelity for telemetry.

## Goals
1. Every array (cards, appointments, prescriptions, adherence schedule items, diagnostic reports, vitals log entries), every KPI (upcoming appointment time, Rx PIN, adherence streak, vitals BP/glucose/temp/pulse values), and every identity field (patient name, MRN, Ghana Card, NHIS, blood group, genotype, allergies, ICE contact) on the 5 scoped pages derives strictly from live `@medipaedia/api-client` responses — zero static fixture literals remain after the refactor in any non-form-preset surface.
2. The two forbidden fallback literals **"Facility Health Service"** and **"Attending Physician"** are purged from *every* render path across the 5 pages and their helper mappers.
3. Each of the 5 pages renders an authentic zero-state surface when its backend collection returns `[]`/`null`, and renders a dedicated inline error UI with a Retry button when the network call rejects (never a silent fall-back to static fixtures or empty-looking data that is actually pre-seeded).
4. Every page uses strict TypeScript with `strict: true` (already enforced by base tsconfig). `: any` annotations are allowed **only** inside `catch (err: any)` blocks; `useState<any>`, `setState<any>`, and function-parameter `any` casts in non-catch positions are eliminated.
5. `pnpm type-check --filter=@medipaedia/patient-store` (which runs `tsc --noEmit`) exits 0.
6. `pnpm build --filter=@medipaedia/patient-store` (which runs `next build`) exits 0.

## Non-Goals
- Not implementing new backend endpoints; this spec only consumes existing `@medipaedia/api-client` methods that already exist and gracefully handles their absence via optional-chained `?.()` calls + empty-array/zero fallbacks (not synthetic data).
- Not redesigning information architecture or adding new navigation tabs; card/table structure, button CTAs, and Modal flows remain byte-for-byte identical except where data surfaces swap from seeded fixtures to live data.
- Not refactoring pages outside the 5-scope set: `/adherence` (separate existing page, it has its own fixtures but spec scope is 5 pages only — dashboard's *inline* adherence tracker IS in scope as part of the prescriptions page), `/family`, `/wallet`, `/orders`, `/checkout`, `/marketplace`, `/auth/*`, `/public/*` are explicitly out of scope for literal purge but may not introduce new `any` annotations.
- Not introducing server components or RSC data fetching — all pages remain `"use client"` with `useEffect` + `Promise.allSettled` loading patterns, matching the current architecture.
- Not building new booking/lab-ordering mutation flows; existing "Book New Consultation" and "Link New Hospital Pass" CTAs keep their current UI but remove seeded form defaults that are fake display fixtures (form *presets* like `systolic="120"` numeric calculator defaults can remain because they are user-editable seed numbers, not display data).

## Background & Context
- Project conventions (established in pharmacy-pos-mock-purge and super-admin specs) already mandate: no hardcoded mock data for patient/PII surfaces, resolve identity from `useAuth` or `getCurrentUser()` + localStorage/JWT, realistic-healthy zero defaults (never fictional "MRN-RDG-2026-092" strings), and client-side typed mapper functions for view models.
- The analogous purge in `apps/pharmacy-pos` established the working pattern: `Promise.allSettled` + `apiClient.*` calls on mount + `|| []` / `?? 0` fallbacks that are zero/empty (not fictional values); `<Card className="..."><CardContent className="py-10 sm:py-14"><div className="max-w-md mx-auto text-center space-y-4">...</div></CardContent></Card>` zero-state blocks with authentic copy; inline error toasts with Retry `Button` using `RefreshCw` + `Loader2`; tsc `--noEmit` + `next build` as gated verification.
- Appointments page is the *only* page in the 5-scope set that already wires a live endpoint (`getPatientAppointments` + `createPatientAppointment`), but it still retains forbidden fallback literals ("Main Medical Center", "Attending Physician") inside its mapper `deriveViewApt` and seeded booking form select-option arrays that reference named Ghana facilities. These fallbacks must be `""` / `null` style not literal facility names.

## Functional Requirements

### FR-1: Dashboard Summary Page (dashboard/page.tsx) — full demock + live identity + vitals + 4 action cards
- **FR-1.1 ICE identity banner resolves every field from `apiClient.getCurrentUser()` → `.patient_profile` / `.linked_facilities` (or `apiClient.getEmergencyICEProfile?.()` if available):
  - Header `h1` displays `.patient_profile?.full_name || authMe.full_name` — never the literal `"Active Patient User"`.
  - Mono subtitle row displays `ghana_card_id`, the *first* linked card's `.mrn`, and any `nhis_number`-like field from profile — never `"GHA-71298412-1 • MRN: MRN-RDG-2026-092 • NHIS: GHA-NHIS-8821940"`.
  - Biomarker strip (Blood Group, Genotype, Verified Allergies, ICE Contact) all source from `patient_profile?.blood_group`, `.genotype`, `.allergies?.split(", ")`/array, `.emergency_contact_name` + `.emergency_contact_phone` respectively. If backend returns empty/null for a field the cell shows `"—"` (em-dash placeholder) — never `"O Rh Positive (O+)"`, `"AA (Normal)"`, `"Amoxicillin / Penicillin"`, or `"Kofi Mensah (0244998877)"`.
- **FR-1.2 4-card Action Ribbon drives its displayed summary line + subline + badge literals from live aggregated endpoints, not hardcoded literal strings:
  - Smart Pill Box card ("4 / 5 Doses Completed • 80% Adherence • 1 Bedtime Dose Pending • 🔥 6-DAY STREAK") sources from `apiClient.getPillBoxSchedule?.()` aggregated fields `doses_completed_today`, `total_doses_today`, `compliance_percentage`, `streak_days`. On empty/error the metrics show `0`, `0%`, `0-DAY STREAK` — never synthetic streak or medication names.
  - Active e-Prescription card ("Coartem 20/120mg + Paracetamol • Rx #RX-2026-99214 • Attending Physician" + "READY TO DISPENSE") sources from `apiClient.getPatientPrescriptions()[0]` (most recent ACTIVE). Never concatenates literal `"Attending Physician"` or literal Rx#.
  - Diagnostics Completed card ("Malaria RDT + FBC • Ridge Pathology • Final Results Available" + "2 NEW REPORTS") sources from `apiClient.getDiagnosticHistory(patientId).completed_results` or equivalent. Never uses literal test names.
  - OPD Consultation card ("Tomorrow, 09:00 AM • Facility Health Service • Attending Physician" + `PASS: Q-042`) sources from `apiClient.getPatientAppointments()[0]` (next scheduled). Never uses the forbidden literals or literal `Q-042`.
- **FR-1.3 Vitals Radar section:
  - 4 summary KPI boxes (BP 128/82, glucose 104 mg/dL, temp 38.4 °C, pulse 78 bpm) source their values from the *most recent* entry in `apiClient.getPatientHistory(patientId)?.recent_vitals` OR a dedicated vitals log endpoint (`getDiagnosticHistory` style endpoint, or `recordVitals` companion getter). If absent, display `"—"` placeholder NOT the literal values.
  - `vitalsList` history table is populated from the same live log; remove the two seeded rows ("Today, 09:30 AM / Ridge Hospital Lab Sync" and "15 Aug 2026 / Home Self-Log"). On `[]` render a zero-state: "No vitals recorded yet. Log your first reading above."
  - Log Vitals modal: existing numeric form presets (systolic="120", diastolic="80", bloodSugar="95.0", temperature="36.6") may remain because they are calculator-style user-editable defaults and not displayed data; the handler `handleSaveVitals` must call a live endpoint (`apiClient.recordVitals(...)` OR a patient-scoped vitals-log create route) rather than simply `setVitalsList([newEntry, ...vitalsList])` with setTimeout.
- **FR-1.4 Zero-states: When the aggregate `Promise.allSettled` returns zero data across cards, render a single cohesive dashboard zero-state (or per-card zero states, matching visual hierarchy). Error state shows an inline Retry surface for each independent loader.

### FR-2: Appointments Page (appointments/page.tsx) — purge mapper fallbacks + seeded form presets
- **FR-2.1 `deriveViewApt(apt)` mapper purges the forbidden literal fallbacks:
  - `facility`: `apt.facility_name || apt.facility?.name` — remove `"Main Medical Center"` final fallback; use `""` so the row renders empty dash `"—"` via display helper.
  - `doctor`: `apt.doctor_name || (apt.doctor ? \`Dr. ${[apt.doctor.first_name, apt.doctor.last_name].filter(Boolean).join(" ")}\`.trim())` — remove the `"Attending Physician"` fallback. If all sources are null, display `"—"`.
- **FR-2.2 Booking form static select options (FACILITY_OPTIONS, DEPARTMENT_OPTIONS, DOCTOR_LABEL_TO_ID, TIME_SLOT_OPTIONS) must be sourced from live endpoints, or, in the event the endpoints do not ship a typed getter yet, the *values* may remain as user-editable form presets BUT the display must not render them as real data:
  - Specifically: remove the 4 facility literals `"Ridge Regional Hospital, Accra"`, `"Korle-Bu Teaching Hospital"`, `"37 Military Hospital"`, `"Main Medical Center"` from `FACILITY_OPTIONS` as a hardcoded const; replace with `apiClient.getTenants?.(tenant_type="HOSPITAL")` on modal open, OR graceful `[]` with a `<select>` that has a disabled empty option "Select facility..." (never seed fake names).
  - Remove the `"Attending Physician (Senior Staff)"` / `"Resident Physician (Junior Staff)"` / `"Specialist Consultant (Subspecialty)"` entries from `DOCTOR_LABEL_TO_ID`; doctor drop-down populates from the selected facility's live provider list (or empty if endpoint not yet available — no seeded names).
  - `TIME_SLOT_OPTIONS` remain as algorithmically-generated date objects (they are "today+1" math, not fake fixtures); no change required.
- **FR-2.3 Booking form initial state: `facilityId = FACILITY_OPTIONS[0].id` → `""` (empty, no pre-selection). `doctorLabel = "Attending Physician (Senior Staff)"` → `""`.

### FR-3: Hospital Cards Page (cards/page.tsx) — full live bind via `getPatientCards`
- **FR-3.1 Replace the full 3-row `useState` seed array (`card-01 / card-02 / card-03`) with live data:
  - Remove the three literal objects containing `"Ridge Regional Hospital"`, `"Korle-Bu Teaching Hospital"`, `"37 Military Hospital"`, `"MRN-RDG-2026-092"`, `"GHA-71298412-1"`, their `issuedAt` strings, and hardcoded `color` gradient classes.
  - Install loader: `useEffect → try { const rows = await apiClient.getPatientCards(); setCards(rows); } catch { setCards([]); } finally { setIsLoading(false); }`.
  - `useState<PatientCard[]>([])` initial state (empty, no seed).
- **FR-3.2 Add 3 UI surfaces:
  - `isLoading` skeleton grid of 3 pulse gradient cards (matching current structure, no real content).
  - Zero-state when `cards.length === 0`: styled Card block "No hospital cards linked yet. Connect your first facility record to access digital check-in passes." with the existing "+ Link New Hospital Pass" CTA button visible within the zero-state surface.
  - Error toast (AlertCircle + Retry) + link modal:
- **FR-3.3 Link New Hospital Pass modal:
  - Remove the 5 hardcoded `<option>` facility literals in the facility-select dropdown ("Greater Accra Regional Hospital (Ridge)", "Komfo Anokye Teaching Hospital (KATH), Kumasi", "Ho Teaching Hospital", "Tamale Teaching Hospital", "Cape Coast Teaching Hospital"). Replace with live tenant list call, OR empty + disabled placeholder "Select your registered healthcare facility".
  - MRN input placeholder `"e.g. MRN-KATH-2026-001 (Optional)"` stays because it's placeholder example syntax, not display data.
  - Handler: current `setTimeout → setLinkSuccess → close` local flow must call `apiClient.selectFacility(...)` or a card-link create endpoint (if missing, wire through typed client with `?.()` wrapper; do **not** simply mutate local state).
- **FR-3.4 Card QR check-in modal:
  - Remove `<strong className="text-white">Active Patient User</strong>` patient name literal. Source from `authMe.full_name`.
- **FR-3.5 `activeCard` state type: Replace `useState<any>(null)` with `useState<PatientCard | null>(null)`.

### FR-4: Prescriptions Page + Inline Daily Adherence (prescriptions/page.tsx)
- **FR-4.1 Daily Adherence tracker (top of page):
  - Remove the 3 seeded `adherenceItems` ("Coartem (Artemether/Lumefantrine 20/120mg)" / "Paracetamol 500mg Tablets" / "Vitamin C 500mg Effervescent") and their streak/takenToday literals.
  - Source from `apiClient.getAdherenceSchedule?.()` on mount. Initial state `[]`.
  - Zero-state in the adherence tracker grid: "No medication schedule set up yet. Add prescriptions to begin daily tracking." (same 3-column responsive layout wrapper but empty content card).
  - `handleToggleAdherence` calls `apiClient.logDoseTaken(...)` live endpoint on toggle rather than local `setAdherenceItems` mutation only.
- **FR-4.2 Prescriptions vault list:
  - Remove the two seeded `RX-2026-99214` and `RX-2026-88102` objects fully, including all literal fields: `"Attending Physician"`, `"Facility Health Service"`, `"MDC/GMC-STAFF"`, `"849201"`, `"392014"`, `"19 Aug 2026"`, `"10 Jul 2026"`, and their 2+1 hardcoded medication line items.
  - Wire to `apiClient.getPatientPrescriptions()`. Map each `PatientPrescriptionSummary` → view model using the same typed mapper pattern. Fields:
    * `doctor = item.doctor_name` (do NOT append `"Attending Physician"` fallback).
    * `facility = item.facility_name || item.hospital_name` (do NOT use `"Facility Health Service"`).
    * `claimPin = item.claim_pin || item.access_code?.slice(-6) || null` (null renders `"—"` not literal).
    * `medications = item.items.map(i => ({ name: i.medication_name, qty: i.quantity_prescribed, instructions: i.instructions }))`.
- **FR-4.3 Prescriptions zero-state: When list `length === 0` render Card block: "No electronic prescriptions yet. Your doctor will issue a cryptographically signed e-Rx after your next consultation." (use adherence card visual styling for consistency).
- **FR-4.4 Claim QR Modal: doctor line `selectedRx.doctor • selectedRx.facility` must source the live values; never falls back to literal concatenation.
- **FR-4.5 State types: Replace `useState<any>(null)` for `selectedRx` with `useState<PatientPrescriptionSummary | null>(null)`.

### FR-5: Diagnostics & Lab Reports Page (diagnostics/page.tsx)
- **FR-5.1 Remove 3-seed `reports` array fully (diag-2026-001/002/003) including all literal facility/doctor/report body strings: `"Facility Pathology Service"`, `"Facility Laboratory"`, `"Facility Radiology"`, `"Attending Physician"`, `"Resident Physician"`, the 3 hardcoded test dates, the findings blurbs ("Hemoglobin: 13.8 g/dL... WBC: 12.4 x10^3/uL...", "P. falciparum Antigen (HRP2): POSITIVE (+)..."), and 4+6+2 parameter rows.
- **FR-5.2 Wire to live diagnostic source:
  - Option A (preferred, typed): `apiClient.getDiagnosticHistory(patientId).completed_results` → map to view models.
  - Option B (fallback if getDiagnosticHistory absent, defensive optional chain): `(await apiClient.request?.<DiagnosticReportItem[]>(`/api/v1/patient/diagnostics`)) || []` via client helper method addendum, but never raw browser `fetch`.
  - `PatientDiagnosticHistoryResult.completed_results: DiagnosticResultItem[]` are the canonical source; `pending_orders` may be surfaced in a small "In Progress" badge but not required by this spec.
- **FR-5.3 Filter + Search: Category filters (`LABORATORY`, `IMAGING`) and search box logic (`testName/facility/id`) is preserved — operate on the live mapped array, not seeded rows.
- **FR-5.4 Zero-state: `filteredReports.length === 0` render Card block "No diagnostic results in your record yet. Results from ordered tests will appear here automatically once finalized by the lab."
- **FR-5.5 Error state: If the diagnostics call rejects, show inline error toast with Retry button using `Loader2` spinner (identical pattern to appointments page inline error).
- **FR-5.6 `selectedReport` state type: Replace `useState<any>(null)` with `useState<DiagnosticResultItem | DiagnosticReportItem | null>(null)`; replace map signature `(p: any, idx: number)` inside the full-report Modal with the properly typed `(p: ResultParameter, idx: number)` where `ResultParameter` is a locally-defined interface matching `{name, value, range, flag}` derived from completed_results or DiagnosticReportItem schema.

### FR-6: Layout Header identity (layout.tsx) — purge static literal userName
- **FR-6.1 `layout.tsx` passes `userName="Active Patient User"` as a hard-coded prop to `<Header>`. Remove this prop or derive the value dynamically from `getCurrentUser()` hook in a small client wrapper effect (or let the Header component pull it from localStorage / JWT parse; pattern already used in `PharmacyHeader` for pharmacy-pos). The literal `"Active Patient User"` must not appear in any prop pass or string initial state for the authenticated identity.
- **FR-6.2 `tenantName="Ghana National Health Grid"` and `tenantType="PLATFORM"` in layout props — these are config-level labels, not display fixtures of patient identity; keep them unchanged.

### FR-7: Type-safety strictness rule (cross-cutting, 5 pages)
- **FR-7.1 `: any` annotations eliminated in every position EXCEPT `catch (err: any)` blocks (allowed). Specifically forbidden after the refactor:
  - `useState<any>(...)` anywhere in `(dashboard)/*` 5 pages.
  - Function parameters typed `any` that are not `catch` clause error variables.
  - Variable declarations `const x: any = ...` (excluding catch scoped vars).
  - `(x: any, idx: number)` lambda parameters.
- **FR-7.2 All new type interfaces for view models (e.g. `ViewCard`, `ViewPrescription`, `ViewDiagnosticReport`, `DashboardVitalsEntry`, `ActionCardSummary`) must be locally-defined exported interfaces with typed fields (no index signatures `[key: string]: any`).

### FR-8: Verification & Build Gates
- **FR-8.1 `pnpm type-check --filter=@medipaedia/patient-store` completes with exit code 0.** This runs the package script `"type-check": "tsc --noEmit"` per `package.json:10`.
- **FR-8.2 `pnpm build --filter=@medipaedia/patient-store` completes with exit code 0.** This runs `next build` per `package.json:7`.

## Non-Functional Requirements
- **NFR-1 (Logic preservation)**: Existing navigation, tab structure (if any), button CTAs, Modal trigger buttons, responsive grid column counts, and Card visual hierarchy must be preserved. The visual layout of cards/tables stays identical to the current design — we swap the data source only.
- **NFR-2 (Consistent loading UX)**: All 5 pages present `isLoading` skeleton/spinner during fetches (at minimum 2 pulse cards per page matching existing appointments style). Never flash zero-state then swap in rows. If multiple independent endpoints exist on one page (dashboard aggregates), use `Promise.allSettled` + per-section loaders.
- **NFR-3 (Error resilience)**: Network errors log to `console.warn`/`console.error` and fall back to empty collections / zero metrics — never a crash, never a synthetic 3-row example collection, never a fallback that concatenates the forbidden literals.
- **NFR-4 (Graceful endpoint absence)**: If any named `@medipaedia/api-client` method is undefined at call time (e.g. `getEmergencyICEProfile?.` returns `undefined` because the backend hasn't shipped yet), the optional-chained call `?.()` plus an empty-dash `"—"` fallback keeps the page functional without a compile error — we do NOT invent a local mock method that returns static strings mimicking real data.
- **NFR-5 (Bundle impact)**: Bundle delta ≤ 3 kB gz (client bundle). Because this refactor deletes ~500 lines of seeded fixture literals and adds only typed mapper + zero-state JSX, the bundle is expected to shrink net. If it grows due to added endpoint helpers, it still must not exceed the +3 kB threshold.

## Constraints
- **Technical**: Pages are `"use client"` Next.js 14 App Router. All data access goes through `import { createApiClient, … } from "@medipaedia/api-client"`. No direct browser `fetch("http://localhost:8000/…")` calls with raw hand-auth'd headers are permitted.
- **Business**: Forbidden literal purge — any render or mapper path that would display the strings `"Facility Health Service"` or `"Attending Physician"` (case-insensitive substring match, including parenthetical variants like "(Senior Staff)") must instead substitute a live value, empty dash `"—"`, or zero-state. Display of facility NAME strings is allowed IF they come from `facility_name` on a live API row (not seeded).
- **Dependencies**: Consumed `@medipaedia/api-client` methods: `getCurrentUser`, `getPatientCards`, `getPatientPrescriptions`, `getPatientAppointments`, `createPatientAppointment`, `getDiagnosticHistory` (or equivalent patient-scoped diagnostics list getter), `getPillBoxSchedule`, `logDoseTaken`, `getAdherenceSchedule`, `getPatientHistory` / vitals log getter equivalent, `recordVitals` / patient vitals logger equivalent, `getEmergencyICEProfile?.`, `selectFacility?.`, `getTenants?.(HOSPITAL)`. Defensive `?.()` wrappers protect against missing ones, with empty-dash fallbacks not synthetic data.
- **TS Strictness**: `strict: true` (from base tsconfig). `tsc --noEmit` with zero `any`-related type errors.

## Assumptions
- A1: If an `@medipaedia/api-client` method is undefined/missing in builds, the optional-chained call plus an empty/null fallback keeps the page functional without a compile error.
- A2: A small typed helper function `resolveAuthIdentity()` that reads `localStorage.user`, `localStorage.tenant`, or parses JWT cookie is acceptable as a shared util to populate name/ghana-card fields early before `getCurrentUser()` resolves, as long as the helper does not seed static names.
- A3: Booking form DEPARTMENT_OPTIONS generic category names ("General Outpatient (OPD)", "Internal Medicine / Cardiology", etc.) — as they form a classification taxonomy rather than specific fixture facility names, they may remain only if there is no live department-list endpoint AND the form is for user entry only. The key requirement is that no *display surface* renders seeded classification labels as real data; a form's `<select>` options (user input selection) are not display data.

## Open Questions
- [ ] Does `@medipaedia/api-client` export a patient-scoped `getVitalsLog(patientId)` / `listVitals(patientId)` getter, or should dashboard vitals source from `getPatientHistory(patientId)?.recent_vitals`? (Answered during implementation via codebase grep of client.ts — no user input required.)
- [ ] Does `getEmergencyICEProfile` exist on the client, or do we source ICE fields entirely from the `AuthMe.patient_profile` nested object? (Answered during implementation via codebase grep; no user input required.)

## Acceptance Criteria

### AC-1: Forbidden literals "Facility Health Service" and "Attending Physician" eradicated from ALL render paths across 5 pages
- **Type**: `rule`
- **Given**: Fresh build. No backend seed data loaded. All API calls mocked to return `{}` / `[]` at test time.
- **When**: Visiting each of `/dashboard`, `/appointments`, `/cards`, `/prescriptions`, `/diagnostics`, including opening every Modal on each page (QR passes, booking, link, report detail).
- **Then**: Neither literal substring `"Facility Health Service"` nor `"Attending Physician"` (incl. variants with "(Senior Staff)", "(Junior Staff)", "(Subspecialty)") appears anywhere in the rendered DOM, source-mapped render output, or React rendered text nodes.
- **Pass Condition**: PowerShell/Grep command `grep -rn "Facility Health Service\|Attending Physician\|Facility Pathology Service\|Facility Laboratory\|Facility Radiology" apps/patient-store/src/app/\(dashboard\)/{dashboard,appointments,cards,prescriptions,diagnostics}/page.tsx apps/patient-store/src/app/\(dashboard\)/layout.tsx` returns **zero** matches in non-comment, non-type-annotation lines (catch/try comment blocks excluded from zero-tolerance).
- **Evidence**: Static grep output saved in task evidence, plus rendered text snapshot of each page's zero-state.

### AC-2: 5-page seed-data purge fidelity — no fixture arrays remain as initial state
- **Type**: `rule`
- **Given**: Source code after patch.
- **When**: Inspecting `useState(...)` initial values across the 5 pages + layout.
- **Then**: Every collection state starts as `[]`, `0`, `null`, or typed empty primitives only. No literal seeded arrays of length >0 that represent displayable data items (cards, prescriptions, diagnostics, adherence items, vitals history).
- **Pass Condition**: The literal ID corpus `card-01|card-02|card-03|MRN-RDG-2026-092|GHA-71298412-1|adh-01|adh-02|adh-03|RX-2026-99214|RX-2026-88102|diag-2026-001|diag-2026-002|diag-2026-003|Active Patient User|Kofi Mensah|O Rh Positive|Amoxicillin / Penicillin|GHS-NHIS-8821940|Ridge Hospital Lab Sync|Ernest Chemists|Coartem.*Amlodipine|Metformin HCl 500mg Extended|Atorvastatin Calcium|Norvasc|Glucophage XR|Lipitor|Panadol Extra` — grep for each in the 5 page files + layout.tsx returns **zero** matches (allowing only reference inside `// comments` that discuss *removed* content, if any).
- **Evidence**: Grep output across 6 files saved in task evidence.

### AC-3: Every page renders authentic typed zero-states (5+ zero-state surfaces total) with correct copy when backend returns `[]`
- **Type**: `rule`
- **Given**: Backend returns empty arrays for all endpoints on a test user.
- **When**: Visit each page → every collection card/table that would show rows shows a zero-state block instead; zero phantom rows generated from a catch or fallback.
- **Then**:
  - Cards page: Zero-state block contains "No hospital cards linked yet. Connect your first facility record…" copy.
  - Prescriptions page (vault list section): "No electronic prescriptions yet…" copy.
  - Prescriptions page (adherence tracker grid): "No medication schedule set up yet…" copy.
  - Diagnostics page grid: "No diagnostic results in your record yet…" copy.
  - Dashboard vitals history list: "No vitals recorded yet. Log your first reading above." copy.
  - Appointments page: Existing zero-state ("No Scheduled Consultations") preserved (already compliant).
- **Pass Condition**: Source code contains each of the 6 zero-state `className` wrappers + copy verbatim at the appropriate render site, conditional on `.length === 0` / falsy data.
- **Evidence**: File snippets in task completion evidence showing the `items.length === 0` branches at each site.

### AC-4: Every page has dedicated error + isLoading UI surfaces, no silent fixture fallback
- **Type**: `rule`
- **Given**: Network layer forced to reject on all endpoints (offline / 500 mode).
- **When**: Visit each of the 5 pages.
- **Then**:
  - Each page displays a skeleton/spinner during `isLoading` phase (first 2 seconds), not empty content.
  - After rejection, each page surfaces an inline error UI (AlertCircle icon + descriptive message text) with a Retry button that re-triggers the loader. The page does not crash, does not redirect, and does not display a 3-row seeded example array.
- **Pass Condition**: All 5 pages contain an `isLoading` state variable, an error state (`useState<string | null>`) with an AlertCircle-styled card, and `onClick={loadFn}` Retry button (with Loader2 spinner while reloading).
- **Evidence**: Code snippet of load function + conditional rendering for each page.

### AC-5: Strict TypeScript with zero `any` outside catch(error: any) blocks
- **Type**: `rule`
- **Given**: Final codebase after patch applied.
- **When**: Running `tsc --noEmit` (strict mode) and additionally performing static grep.
- **Then**:
  - No `useState<any>` calls anywhere under `src/app/(dashboard)/{dashboard,appointments,cards,prescriptions,diagnostics}/`.
  - No `(x: any, idx: number)` typed lambda parameters outside catch.
  - No `function f(x: any)` typed signatures outside catch scopes.
  - Only `catch (err: any)` blocks and their nested local error vars may carry `any`.
- **Pass Condition**: `grep -n ": any" apps/patient-store/src/app/(dashboard)/{dashboard,appointments,cards,prescriptions,diagnostics}/page.tsx apps/patient-store/src/app/(dashboard)/layout.tsx` returns matches only on lines containing `catch (err: any)`.
- **Evidence**: Grep output + tsc exit code 0 captured in task evidence.

### AC-6: Dashboard ICE identity banner sources all fields from live auth/profile
- **Type**: `rule`
- **Given**: AuthMe mock user `full_name="Ama Serwaa"` / `patient_profile.{blood_group:"B Rh Negative (B-)",genotype:"AS",emergency_contact_name:"Efua Serwaa",emergency_contact_phone:"0200000001"}`.
- **When**: Rendering dashboard/page.tsx ICE banner.
- **Then**: `h1` displays "Ama Serwaa", mono row displays the resolved Ghana Card / live MRN / live NHIS (not seeded literals); biomarker strip shows B Rh Negative, AS, allergies from profile, and Efua Serwaa contact; nowhere do literals "Active Patient User", "O Rh Positive (O+)", "AA (Normal)", "Kofi Mensah (0244998877)", or "Amoxicillin / Penicillin" appear as values.
- **Pass Condition**: `grep` for 8 literal corpus strings in dashboard/page.tsx returns 0 outside comments.
- **Evidence**: Code snippets of `deriveICEView(...)` mapper, plus grep confirming removal.

### AC-7: 4 dashboard action cards source metrics from live endpoints
- **Type**: `rubric`
- **Dimension**: Thoroughness of live endpoint binding vs hardcoded summary text
- **Scale**: 0-2
- **Anchors**:
  - `0`: at least 2 of 4 action cards still display literal strings ("Coartem 20/120mg + Paracetamol", "Facility Health Service • Attending Physician", "Malaria RDT + FBC", "Q-042", or "🔥 6-DAY STREAK") as static literals in source code;
  - `1`: all 4 cards source correctly from endpoints but adherence card still statically seeds "1 Bedtime Dose Pending" text OR Rx card still shows literal "READY TO DISPENSE" hardcoded badge logic not tied to `.status === "PARTIALLY_DISPENSED"` etc.;
  - `2`: every badge/text line on all 4 cards is derived strictly from endpoint response fields (streak, counts, status enum, facility name, doctor name, queue_pass, test names aggregated from list, nothing hardcoded).
- **Pass Threshold**: >= 2
- **Evidence**: Static inspection of each card's JSX render bindings + code snippets showing mapper aggregation.

### AC-8: Appointments booking form + view mapper free of literal facility / doctor fallbacks
- **Type**: `rule`
- **Given**: A `PatientAppointmentItemV2` row with `{facility_name: null, doctor_name: null, facility: null, doctor: null}`.
- **When**: Mapper `deriveViewApt` is called; booking modal opens.
- **Then**:
  - `facility` output is `""` (displays `"—"` via render helper), not `"Main Medical Center"`.
  - `doctor` output is `""` (displays `"—"`), not `"Attending Physician"`.
  - Booking form facility select has no hardcoded 4 Ghana facility options; doctor select has no 3 "Attending Physician (Senior Staff)" entries.
- **Pass Condition**: Grep for 4 facility ids/labels + 3 doctor labels returns 0 matches in appointments/page.tsx outside comments.
- **Evidence**: Code snippets showing empty fallbacks.

### AC-9: Type-check (`tsc --noEmit`) exits 0
- **Type**: `rule`
- **Given**: Full patch applied, no backend running required.
- **When**: `cd apps/patient-store && pnpm type-check` (equivalent: `pnpm --filter=@medipaedia/patient-store type-check`).
- **Then**: Process exit code is 0. TSC output line "Found 0 errors".
- **Pass Condition**: Exit code 0 + "Found 0 errors" in stderr/stdout.
- **Evidence**: Last 40 lines of command output + explicit exit code.

### AC-10: `next build` exits 0
- **Type**: `rule`
- **Given**: Full patch applied.
- **When**: `pnpm build --filter=@medipaedia/patient-store`.
- **Then**: Next.js completes all route generation with `Build completed successfully` / `∘  (Static)  •  (Server)  •  (Lambda)  ✓  ( prerendered )` and process exits 0.
- **Pass Condition**: Exit code 0 and no "Failed to compile" lines.
- **Evidence**: Tail of build summary output + exit code in task evidence.

### AC-11: Mock purge thoroughness (holistic rubric across scoped pages)
- **Type**: `rubric`
- **Dimension**: Thoroughness of literal purge vs the 5-page scope
- **Scale**: 0-2
- **Anchors**:
  - `0`: At least one forbidden literal ("Facility Health Service" OR "Attending Physician") still seeds a display surface (not comment, not form select option taxonomy) anywhere in scope; or any seeded card/prescription/report fixture array of length>0 remains as `useState` initial value in the 5 pages.
  - `1`: All forbidden literals removed AND all seeded arrays reduced to `[]` initial; BUT at least one dashboard summary card (ICE banner or 4 action cards) still displays 1+ identity literal (e.g. blood group still seeded) OR cards link modal still has the 5 teaching-hospital `<option>` literals.
  - `2`: Every display-data literal in scope is gone; every collection is `[]` until data arrives; form inputs use empty selection or live-populated options (not facility-name fixtures).
- **Pass Threshold**: 2
- **Evidence**: Full grep sweep output (AC-1 + AC-2 corpus) for 6 files, plus visual inspection of dashboard 4 cards + ICE banner + cards link modal open state.

### AC-12: Logic preservation & UI stability (structural parity)
- **Type**: `rubric`
- **Dimension**: Visual & behavioural parity with the pre-refactor layout
- **Scale**: 0-2
- **Anchors**:
  - `0`: Any navigation link removed, CTA button removed, table column added/removed, or Modal trigger broken across the 5 pages.
  - `1`: All structure preserved but loading UX is inconsistent (e.g. cards page has no spinner, just flashes zero-state), OR some inline errors lack the Retry affordance and silently show `[]` with no user action.
  - `2`: Exact same structure, same CTAs, same responsive grid columns per breakpoint; smooth `isLoading → data/zero-state` flow; identical Modal layout; Retry buttons present on every error surface.
- **Pass Threshold**: >= 1
- **Evidence**: tsc type-check pass (ensures imports/signatures preserved) + diff analysis showing structural tag classNames unchanged for Card/Grid/Modal wrappers.
