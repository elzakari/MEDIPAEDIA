# Patient Store Mock Purge & Live-Data Rewire - Implementation Plan (Priority Order)

## Task 1: Layout.tsx Header identity purge + shared auth helper
- **Status**: `pending`
- **Priority**: high (foundational — all 5 pages use layout identity; unblocks dashboard ICE banner Task 2)
- **Depends On**: None
- **Description**:
  1. In `apps/patient-store/src/app/(dashboard)/layout.tsx`, remove the hardcoded prop `userName="Active Patient User"`. Do **not** supply a static user name as prop. Leave it out entirely so the Header internal resolver (or a small wrapper) pulls identity from the session.
  2. Create a tiny typed identity helper file `apps/patient-store/src/lib/resolveAuthIdentity.ts` (single file, avoid multi-file sprawl) that exports:
     - `getStoredFullName(): string | null` reading `localStorage.user?.full_name` or JWT cookie parse, matching the existing PharmacyHeader parse pattern (do NOT seed literals).
     - `getStoredGhanaCard(): string | null` reading `patient_profile` fields.
     - `ensure no any`: all declarations fully typed.
  3. Confirm `tenantName="Ghana National Health Grid"` and `tenantType="PLATFORM"` props remain untouched (they are config labels, not identity data).
- **Acceptance Criteria Addressed**: AC-1 (partially: identity literal), AC-2 (partially: "Active Patient User" literal), AC-5 (helper strict typing), AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-1.1: `grep -n "Active Patient User" apps/patient-store/src/app/(dashboard)/layout.tsx` returns 0 matches. Evidence = grep output.
  - `rule` TR-1.2: Helper file exports typed functions only, no `any` annotations outside catch blocks. Evidence = source snippet.
  - `rubric` TR-1.3: Layout visual parity (Header renders correctly, nav links intact, no navigation broken). Scale 0-2. Anchors 0=Header missing or nav links removed, 1=Header renders empty user name briefly then resolves, 2=Header resolves cleanly with minimal flicker. Threshold >= 1. Evidence = tsc pass + visual smoke check snippet.

## Task 2: Dashboard ICE banner + 4 biomarker cells — purge all hardcoded identity literals
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (for identity helper pattern)
- **Description**:
  1. Rewrite the ICE Banner card section (top Card) in `dashboard/page.tsx`:
     - Add effect: `useEffect → const authMe = await apiClient.getCurrentUser(); setProfile(authMe?.patient_profile ?? null); setFullName(authMe?.full_name ?? authMe?.patient_profile?.full_name ?? null); setLinkedFacilities(authMe?.linked_facilities ?? []);` (wrap in `try/catch`, finally `setIsIdentityLoading(false)`).
     - Title `h1` = `fullName ?? "—"` (em dash). Do NOT render literal "Active Patient User".
     - Mono subtitle row displays `patient_profile?.ghana_card_id ?? "—"` + first linked facility `linkedFacilities[0]?.mrn ?? "—"` + any `nhis_number` type field or `"—"`. Never the seeded "GHA-71298412-1 / MRN-RDG-2026-092 / NHIS-GHA-NHIS-8821940".
     - Biomarker 4-cell grid:
       - Blood Group: `patient_profile?.blood_group ?? "—"` — NOT `O Rh Positive (O+)`.
       - Genotype: `patient_profile?.genotype ?? "—"` — NOT `AA (Normal)`.
       - Allergies: split `patient_profile?.allergies` by comma or use array if available; empty → `"No known allergies on file"` not `"Amoxicillin / Penicillin"`.
       - ICE Contact: `patient_profile?.emergency_contact_name ?? "—"` + `patient_profile?.emergency_contact_phone ?? "—"` — NOT `"Kofi Mensah (0244998877)"`.
  2. Also replace the ICE Modal inner card that still displays `Active Patient User` / `GHA-NATIONAL-ID`.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-2.1: Grep dashboard/page.tsx for each of: `O Rh Positive|AA \(Normal\)|Amoxicillin.*Penicillin|Kofi Mensah|GHA-71298412|MRN-RDG-2026-092|GHA-NHIS-8821940|Active Patient User` — returns 0 matches in non-comment lines. Evidence = grep output.
  - `rule` TR-2.2: Biomarker cells all use `?? "—"` fallbacks; no static literals in data render positions. Evidence = code snippet of all 4 cells.
  - `rubric` TR-2.3: Banner layout preserves exact 2xSm-4 grid, same gradient class, same 4 biomarker rounded-xl wrapper classes (no reflow). Scale 0-2. Anchors 0=grid broken, 1=classes preserved but spacing slightly off, 2=pixel-identical responsive layout. Threshold >= 1.

## Task 3: Dashboard 4-card Action Ribbon — live bind adherence / Rx / diagnostics / appointment summaries
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2 (shares `Promise.allSettled` pattern on same page)
- **Description**:
  1. At top of page, wrap 4 endpoint calls in `Promise.allSettled`:
     - PillBox: `apiClient.getPillBoxSchedule?.()` → resolve `{streak, completed/total, compliance, pending}`.
     - Rx: `apiClient.getPatientPrescriptions?.()` → take first `.status !== "DISPENSED"` item OR most recent by date.
     - Diagnostics: `(await apiClient.getDiagnosticHistory?.(patientId))?.completed_results ?? []` → count length, take first 2 test names for summary OR "—".
     - Appointments: `apiClient.getPatientAppointments?.()` → sort by `scheduled_time`, take next upcoming (not cancelled/completed).
  2. For each of 4 cards, remove literal strings and bind to live fields:
     - Pill Box card: NEVER display `"4 / 5 Doses Completed"`, `"80% Adherence"`, `"1 Bedtime Dose Pending"`, `"🔥 6-DAY STREAK"` as static text. Streak comes from schedule.
     - Active Rx card: NEVER display `"Coartem 20/120mg + Paracetamol"`, `"Rx #RX-2026-99214 • Attending Physician"`. Source from item fields. Status badge from `.status` enum.
     - Diagnostics card: NEVER display `"Malaria RDT + FBC"`, `"Ridge Pathology"`, `"2 NEW REPORTS"` as literals.
     - OPD Consultation card: NEVER display `"Tomorrow, 09:00 AM"`, `"Facility Health Service • Attending Physician"`, `"PASS: Q-042"`. Source all from live appointment row.
  3. Add small `isLoading` skeletons for each card OR one collective spinner for the whole ribbon.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4 (loading + error states), AC-7, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-3.1: Grep 4-card region in dashboard/page.tsx for: `4 \/ 5|80% Adherence|6-DAY STREAK|Coartem.*Paracetamol|RX-2026-99214.*Attending Physician|Malaria RDT.*FBC|Ridge Pathology|2 NEW REPORTS|Tomorrow, 09:00 AM|Facility Health Service.*Attending Physician|Q-042` — 0 matches. Evidence = grep output.
  - `rule` TR-3.2: All 4 cards contain fallbacks to `0`, `0%`, `"—"` respectively when data is null/empty; no literal text falls back. Evidence = code snippet of 4 card JSX render blocks.
  - `rubric` TR-3.3: AC-7 holistic live-binding rubric (0-2). Threshold >= 2. Evidence = code snippets for each card showing field bindings to endpoint response fields.

## Task 4: Dashboard Vitals Radar section — purge seeded vitalsList, live bind + zero-state + save live mutation
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, 3 (same page, shares Promise.allSettled scope)
- **Description**:
  1. Remove 2 seeded `vitalsList` rows (`"Today, 09:30 AM" / "Ridge Hospital Lab Sync"` and `"15 Aug 2026" / "Home Self-Log"`) — set initial to `useState<VitalsView[]>([])`.
  2. Source vitals list from either:
     - Preferred: `getPatientHistory(patientId)?.recent_vitals` OR
     - Fallback: `(await apiClient.request?.<VitalsResult[]>(\`/api/v1/patient/vitals\`)) ?? []` via typed helper; never raw fetch.
  3. 4 summary KPI cells (BP, glucose, temp, pulse) display values from the *most recent* vitals entry, NOT the literals `"128/82"`, `"104 mg/dL"`, `"38.4 °C"`, `"78 bpm"`. If empty → `"—"` dash.
  4. Add zero-state block to vitals history: `vitalsList.length === 0 → "No vitals recorded yet. Log your first reading above."` inline.
  5. Rewrite `handleSaveVitals(e)`:
     - Call live mutation endpoint: `apiClient.recordVitals({...payload, patient_account_id})` OR patient-scoped vitals-log create equivalent with `?.()` wrapper.
     - Do NOT `setVitalsList([newEntry, ...vitalsList])` locally without refreshing from backend.
     - Keep numeric form presets (`systolic="120"`, `diastolic="80"`, etc.) as they are user-editable defaults.
- **Acceptance Criteria Addressed**: AC-2, AC-3 (vitals zero-state), AC-4 (error/retry), AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-4.1: Grep for `"Today, 09:30 AM"|"Ridge Hospital Lab Sync"|"128/82"|"104 mg/dL"|"38.4 °C"|"78 bpm"` in dashboard/page.tsx vitals section render positions (NOT the form default input values) → 0 matches. Evidence = grep output.
  - `rule` TR-4.2: Zero-state copy block exists; `handleSaveVitals` contains `await apiClient.*` call before any local state mutation. Evidence = code snippets.

## Task 5: Appointments page — purge `deriveViewApt` fallbacks + seeded booking form options
- **Status**: `pending`
- **Priority**: high (page already wires live endpoints, fix is scoped to mapper + form presets)
- **Depends On**: None
- **Description**:
  1. Mapper `deriveViewApt`:
     - Remove `|| "Main Medical Center"` fallback for facility. Render `""` (empty) → display will show dash via format helper. Keep the existing `apt.facility_name || apt.facility?.name` chain.
     - Remove `|| "Attending Physician"` fallback for doctor. Keep the existing name-building logic; final fallback is `""`.
  2. Booking form select options:
     - Remove the const `FACILITY_OPTIONS` 4 literal entries. On modal open, call `apiClient.getTenants?.("HOSPITAL")` and map results to select options; on empty or absent call, select shows disabled placeholder option `"Select facility..."` not fake entries.
     - Remove const `DOCTOR_LABEL_TO_ID` entries (Attending Physician / Resident / Specialist Consultant). Doctor dropdown populates from: when a facility is selected, load its providers via a live endpoint call (if available); otherwise keep disabled placeholder `"Select doctor..."`. No seeded names.
     - Form initial state: `facilityId = FACILITY_OPTIONS[0].id` → `""`; `doctorLabel = "Attending Physician (Senior Staff)"` → `""`.
     - DEPARTMENT_OPTIONS and TIME_SLOT_OPTIONS are algorithmic/taxonomy and can remain (TIME_SLOT_OPTIONS uses dynamic new Date).
  3. In `handleBookAppointment`, remove fallback `|| { doctor_name: "Attending Physician" }`.
- **Acceptance Criteria Addressed**: AC-1, AC-8, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-5.1: `grep -n "Main Medical Center\|Attending Physician\|Ridge Regional Hospital, Accra\|Korle-Bu Teaching Hospital\|37 Military Hospital" apps/patient-store/src/app/(dashboard)/appointments/page.tsx` returns 0 matches in non-comment, non-type lines. Evidence = grep output.
  - `rule` TR-5.2: `deriveViewApt` fallbacks end at `""` not literals; form initial `facilityId` and `doctorLabel` both `""`; booking modal loads facility list from live call. Evidence = source snippets.
  - `rubric` TR-5.3: Booking form UX stability (scale 0-2). Anchors 0=booking submit broken, 1=works but select defaults to empty, 2=smooth live-populated selects with graceful empty fallback. Threshold >= 1.

## Task 6: Hospital Cards page — full live bind via `getPatientCards` + types + zero/error states
- **Status**: `pending`
- **Priority**: high (currently all mock data; this is one of the 5 core pages)
- **Depends On**: None
- **Description**:
  1. Remove full 3-seed `useState` array (`card-01/02/03` — "Ridge Regional Hospital", "Korle-Bu Teaching Hospital", "37 Military Hospital", "MRN-RDG-2026-092", "GHA-71298412-1", hardcoded `color` gradients, `issuedAt` strings).
  2. Install:
     - `useState<PatientCard[]>([])` initial.
     - `useState<boolean> isLoading` true.
     - `useState<string | null> error` null.
     - Effect: `loadCards()` → `try { setCards(await apiClient.getPatientCards()); } catch(e: any) { setError(message); setCards([]); } finally { setIsLoading(false); }`.
  3. Replace `useState<any>(null)` for `activeCard` with `useState<PatientCard | null>(null)`.
  4. Loading: render 3 `animate-pulse` card skeletons while `isLoading`.
  5. Zero-state: `!isLoading && cards.length === 0` → render styled Card block with copy "No hospital cards linked yet. Connect your first facility record to access digital check-in passes." and the "+ Link New Hospital Pass" CTA inside the zero-surface.
  6. Error UI: inline `AlertCircle` + Retry button if `error`.
  7. Card color gradients: derive deterministically from card id hash (simple `hashCode` mod 3) so different cards get different colors without seeding names.
  8. Link New Hospital Pass modal:
     - Remove 5 hardcoded teaching hospital `<option>` literals. Replace with live `getTenants?.(HOSPITAL)` call OR empty placeholder option.
     - Handler `onClick` removes `setTimeout → setLinkSuccess → close` pattern; call `apiClient.selectFacility(facility_id)` or equivalent card-link endpoint (with `?.()` defensive wrapper). On success → `loadCards()`.
  9. QR modal patient name line replace `"Active Patient User"` with `fullName from auth`.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3 (cards zero-state), AC-4 (load/error), AC-5 (no any), AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-6.1: Grep cards/page.tsx for corpus `card-01|card-02|card-03|Ridge Regional Hospital|Korle-Bu Teaching Hospital|37 Military Hospital|MRN-RDG-2026-092|GHA-71298412-1|Active Patient User` → 0 matches. Evidence = grep output.
  - `rule` TR-6.2: `activeCard: PatientCard | null` typed; `useState<PatientCard[]>([])` empty initial; both `isLoading` skeleton and zero-state copy exist; error UI has Retry button. Evidence = code snippets.
  - `rule` TR-6.3: Link modal facility `<option>` list has no 5 hardcoded teaching hospital names; handler uses `await apiClient.*` before local state change. Evidence = modal snippet.

## Task 7: Prescriptions page — full rewrite (Daily Adherence Tracker + Prescriptions Vault)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  1. Daily Adherence Tracker (top Card):
     - Remove 3 seeded `adherenceItems` (Coartem, Paracetamol, Vitamin C + streak/taken values).
     - Source from `apiClient.getAdherenceSchedule?.()` or `getPillBoxSchedule` flattened list. Initial `[]`.
     - 3-column grid zero-state: `adherenceItems.length === 0 → "No medication schedule set up yet. Add prescriptions to begin daily tracking."`.
     - `handleToggleAdherence(id)` call `apiClient.logDoseTaken(...)` (or `logDoseAdherence`) live endpoint; refresh list on success, rather than purely local `setState` mutation loop.
  2. Prescriptions vault list:
     - Remove 2 seeded Rx objects (`RX-2026-99214`, `RX-2026-88102` + their `"Attending Physician"`, `"Facility Health Service"`, `"MDC/GMC-STAFF"`, `"849201"`, `"392014"`, date strings, med line items).
     - Wire to `apiClient.getPatientPrescriptions()`. Define a typed view mapper `deriveViewRx(item: PatientPrescriptionSummary): ViewRx`.
     - `doctor = item.doctor_name` (NO fallback to Attending Physician).
     - `facility = item.facility_name || item.hospital_name` (NO "Facility Health Service").
     - `claimPin = item.claim_pin || (item.access_code ? item.access_code.slice(-6) : null)`. Null render `"—"`.
     - `status` badges derived from `item.status` enum values only, no "ACTIVE_DISPENSING" literal mapping concatenation with seeded names.
  3. Zero-state for vault list: `length === 0 → Card block "No electronic prescriptions yet. Your doctor will issue a cryptographically signed e-Rx after your next consultation."` with adherence-style wrapper classes.
  4. Error UI + Retry + isLoading for both sections (collect via `Promise.allSettled`).
  5. Typing: Replace `useState<any>(null)` on `selectedRx` with `useState<PatientPrescriptionSummary | null>(null)`.
  6. Claim QR Modal: doctor line is `selectedRx?.doctor_name ?? "—"` and facility line `selectedRx?.facility_name ?? "—"` — never literal fallbacks.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3 (adherence zero-state + prescriptions zero-state), AC-4 (load/error), AC-5 (any removal), AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-7.1: Grep prescriptions/page.tsx for `adh-01|adh-02|adh-03|Coartem.*Artemether|Paracetamol 500mg Tablets|Vitamin C 500mg|RX-2026-99214|RX-2026-88102|Attending Physician|Facility Health Service|MDC/GMC-STAFF|849201|392014` → 0 matches. Evidence = grep output.
  - `rule` TR-7.2: `selectedRx: PatientPrescriptionSummary | null`; both zero-states present with exact copy; error/loading UI. Evidence = code snippets.
  - `rule` TR-7.3: Toggle handler calls `await apiClient.logDoseTaken` or `logDoseAdherence`; not purely local set. Evidence = handler snippet.

## Task 8: Diagnostics page — full live bind + typed parameter results
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  1. Remove 3-seed `reports` array (`diag-2026-001/002/003`; "Facility Pathology Service", "Facility Laboratory", "Facility Radiology", "Attending Physician", "Resident Physician", test findings strings, parameter rows).
  2. Live bind via:
     - Preferred: `apiClient.getDiagnosticHistory(patientId)?.completed_results ?? []` (typed `DiagnosticResultItem[]`). If shape differs, map to a local view interface `ViewDiagnosticReport { id, testName, category, facility, orderedBy, orderDate, completionDate, status, hasAbnormal, findings, parameters: ViewParameter[] }`.
     - Fallback if `getDiagnosticHistory` missing: `(await apiClient.request?.<DiagnosticReportItem[]>(\`/api/v1/patient/diagnostics\`)) ?? []` (client-typed wrapper).
  3. Category filter + search box logic preserved but operated on mapped live array.
  4. Define local interface `ViewParameter { name: string; value: string; range: string; flag: "NORMAL" | "HIGH" | "LOW" | "ABNORMAL" | string; }`.
  5. Replace `selectedReport: any` → `useState<ViewDiagnosticReport | null>(null)`.
  6. Replace `(p: any, idx: number)` lambda inside Modal parameters map → typed `(p: ViewParameter, idx: number)`.
  7. `isLoading` grid skeletons, `error` Retry toast, zero-state: `filteredReports.length === 0 → Card block "No diagnostic results in your record yet. Results from ordered tests will appear here automatically once finalized by the lab."`.
  8. Download PDF `alert()` handler kept as-is (it's a stub CTA, not a literal display fixture).
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3 (diagnostics zero-state), AC-4 (load/error/retry), AC-5 (no any), AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-8.1: Grep diagnostics/page.tsx for `diag-2026-00[123]|Facility Pathology Service|Facility Laboratory|Facility Radiology|Attending Physician|Resident Physician|Hemoglobin.*13\.8|WBC.*12\.4|P\. falciparum|Chest X-Ray|Cardiothoracic Ratio` → 0 matches. Evidence = grep output.
  - `rule` TR-8.2: `selectedReport: ViewDiagnosticReport | null` typed; `ViewParameter` interface used; `p: any` lambda replaced. Evidence = type declarations + map line grep.
  - `rule` TR-8.3: isLoading skeletons exist; error UI with Retry; zero-state block with exact copy present. Evidence = code snippets.

## Task 9: Strict TS sweep — audit and fix any residual `any` annotations outside catch blocks
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Tasks 1-8 (so the new code introduced in tasks 1-8 is already typed; this task audits residuals)
- **Description**:
  1. Run targeted grep: `grep -rn ": any" apps/patient-store/src/app/(dashboard)/{dashboard,appointments,cards,prescriptions,diagnostics}/page.tsx apps/patient-store/src/app/(dashboard)/layout.tsx apps/patient-store/src/lib/resolveAuthIdentity.ts`.
  2. For every hit EXCEPT lines that are `catch (err: any)` → replace with proper types. Known candidates to fix:
     - `appointments/page.tsx:414` Badge variant cast `as any` → type union with Badge component variant enum or module augmentation if needed.
     - Any residual `as any` casts from Tasks 1-8.
     - Do NOT touch `catch (err: any)` lines (they are explicitly allowed per FR-7.1).
  3. Also check for any `Function`, `unknown` → `any` downcasts, and implicit any via variable declarations with no initializer.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-9.1: Re-run same grep command. Count of matches MUST equal count of `catch (err: any)` lines (i.e. every non-catch `any` must be gone). Evidence = grep output + manual count comparison log.

## Task 10: Verification — run type-check + next build; iterate on errors
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-9 complete (all source patches applied before verification)
- **Description**:
  1. From monorepo root: run `pnpm type-check --filter=@medipaedia/patient-store`. This invokes `tsc --noEmit` per package.json.
  2. Fix any TS errors introduced. Typical classes to expect and fix:
     - Missing properties on optional-chained api-client responses → add null-coalesce and narrow with `?? [] ?? 0 ?? "—"` or cast through a narrow local type alias (NOT `any`; use a typed wrapper).
     - Missing methods on api-client → wrap in `?.()` and handle undefined returns.
     - Badge/Button `variant` prop mismatches → use union cast via module augmentation or import correct types from `@medipaedia/ui`.
  3. After `type-check` exits 0, run `pnpm build --filter=@medipaedia/patient-store` (runs `next build`). Iterate on Next.js build errors until exit 0.
  4. Save the final 40 lines of each command output as completion evidence.
- **Acceptance Criteria Addressed**: AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-10.1: `pnpm type-check` exit code 0; `Found 0 errors` line captured. Evidence = tail log + exit code.
  - `rule` TR-10.2: `pnpm build` exit code 0; `Build completed successfully` line (or Next.js final ✓ summary) captured. Evidence = tail log + exit code.
  - `rubric` TR-10.3: Error handling maturity + minimal type workarounds (scale 0-2). Anchors 0=build still fails or workaround casts rely on `any` >2 places, 1=passes but 1-2 narrow type assertions via `as unknown as X` for genuinely absent schema, 2=passes cleanly with only optional-chaining + typed fallbacks, no cast tricks. Threshold >= 1.

## Issue Placeholder (for Review Phase)
<!-- Independent Review findings will insert Issue I-* items below after R1. -->
