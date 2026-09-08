# Pharmacy POS Mock Purge & Live-Data Rewire - Implementation Plan

## Task 1: Purge Dashboard (pharmacy-admin/page.tsx) — remove mock fallback metrics + install 3 authentic zero-states
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In the overview failure branch, replace the fallback `metrics` object containing `facility_name: "Osu Community Pharmacy, Accra"` / `248500` / `348200` / `28.63` / `4` / `9` / `2` / `1` / `114800` with a zeroed baseline: every metric = 0, and `facility_name = ""` (so the view falls through to the auth-derived tenant name).
  - Replace `metrics?.field || <static literal>` in all metric-card renderers with `metrics?.field ?? 0` (and `0.0` for percentage, `"0"` for counts). Never fall back to the literals "28.63", "4", "9", "2", "1".
  - For currency displays inside cards (valuation, POs, IBTs), derive the symbol from `metrics?.currency ?? useAuthCurrency()` helper — avoid hardcoded `GHS `.
  - Install three zero-state branches:
    1. Critical Low-Stock table (`reorders.length === 0`) → `<div className="py-10 text-center text-slate-400"><p className="text-xs font-semibold text-slate-600">All Stock Levels Optimal</p><p className="text-[11px] text-slate-400 mt-0.5">No medications currently below safety reorder threshold.</p></div>` wrapping the table body.
    2. Recent POs card (`recentPOs.length === 0`) → `<div className="py-8 text-center text-slate-400"><p className="text-xs text-slate-500">No recent purchase orders logged.</p></div>` replacing the list.
    3. IBT card (`transfers.length === 0`) → `<div className="py-8 text-center text-slate-400"><p className="text-xs text-slate-500">No active stock transfers in transit.</p></div>` replacing the list.
  - Fix the subtitle line to: `{metrics?.facility_name || authTenantName || t("dashboard.subtitle_fallback")}` where `authTenantName` is the `useAuth().tenant?.name` / localStorage resolver; never the literal "Osu Community Pharmacy, Accra".
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-1.1: Grep of `page.tsx` for the literal corpus "248500|348200|28\.63|Osu Community Pharmacy|9 below safety" returns zero matches. Evidence: grep output saved on completion.
  - `rule` TR-1.2: Source code contains all three zero-state copy blocks verbatim inside `length === 0` conditionals at the three specified sites.
  - `rubric` TR-1.3: Dashboard visual stability; scale 0-2; anchors 0=table column/CTA removal, 1=zero-state copy differs slightly or fallback currency still hardcoded GHS, 2=identical grids + currency sourced dynamically; threshold >= 1.

## Task 2: Header & Layout (PharmacyHeader.tsx + pharmacy-admin/layout.tsx) — purge static literals, resolve name from auth
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Change `resolvedTenantName` initial state from `"Community Pharmacy"` to `tenantName || ""` (empty fallback — will resolve via localStorage/JWT in the existing effect).
  - Remove the two unconditional inline fallback arrays `[{ id: "b-pharm-01", name: \`${resolvedTenantName} - Main Store\`, code: "MAIN-01", branch_type: "MAIN_HUB", is_main_hub: true }]` that seed the branch switcher on empty/error. Replace them with a dynamically-generated fallback: only when `/branches` fails, build a single branch with `name = \`${authTenantName || "Dispensary"} - Main\``. Never hardcode "Main Store" as part of a static literal name.
  - Replace the raw `fetch("http://localhost:8000/api/v1/branches"…)` block with the typed client: `const branches = (await apiClient.getPharmacyBranches?.()) || [];` (with a graceful try/catch that falls back to the generated single branch above). If `getPharmacyBranches` does not exist, keep the existing call but route it through `createApiClient().baseUrl + "/branches"` so port 8000 is not a bare literal.
  - In `pharmacy-admin/layout.tsx`, remove the hardcoded prop `userName="Yaw Boakye (Store Manager)"` so the Header's resolver pulls the user name from localStorage/JWT instead.
  - Do **not** remove the plan entitlements fallback; defaults (`PLAN-GROWTH` / "Regional Growth Plan") are configuration — not fake data.
- **Acceptance Criteria Addressed**: AC-3, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-2.1: `grep "Community Pharmacy\|Yaw Boakye\|Main Store"` in PharmacyHeader.tsx + layout.tsx matches 0 outside of comments.
  - `rule` TR-2.2: Layout does not pass a static `userName` string; Header initial state for tenant is `""` or `tenantName` only (no literal default).
  - `rubric` TR-2.3: Header stability; scale 0-2; anchors 0=navigation or branch switcher broken, 1=works but API still uses raw fetch instead of apiClient, 2=all cleanly rewired + fallbacks generated dynamically. Threshold >= 1.

## Task 3: Transfers page purge — no fake IBT preset + zero-state
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In the catch of `loadTransfers` remove the fallback array containing `"IBT-2026-042"`, `"Osu Community Main Pharmacy"`, `"Ridge Hospital Satellite Dispensary"`, `4850.0`, and its demo items. Replace with `setTransfers([])`.
  - In the `<tbody>` or list body, add the zero-state: `{transfers.length === 0 && <div className="py-8 text-center text-slate-400"><p className="text-xs text-slate-500">No inter-branch transfers requested.</p></div>}`.
  - Purge the new-transfer modal form seed defaults:
    - `destination_branch_name: "Ridge Hospital Satellite Dispensary"` → `""`
    - `notes: "Emergency stock replenishment"` → `""`
    - `items: [ { medication_name: "Artemether + Lumefantrine 20/120mg", ... }, { medication_name: "Metformin 500mg Tabs", ... } ]` → `items: []`
- **Acceptance Criteria Addressed**: AC-2, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-3.1: `grep "IBT-2026-042\|Ridge Hospital Satellite\|4850\|Artemether + Lumefantrine 20/120mg"` in transfers/page.tsx returns 0 matches.
  - `rule` TR-3.2: Transfers catch branch sets `setTransfers([])`; zero-state copy is present at the render site; modal opens empty.

## Task 4: Audits page purge — no fake cycle-count seed + zero-state
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `loadAudits` (or wherever the audit list is seeded), replace any catch fallback returning demo cycle counts with `setAudits([])`.
  - Replace the 4 hardcoded `countItems` preset rows with `countItems: []` initial state. The new-audit modal will prompt the user to add items.
  - Replace default literals `auditName = "Monthly Blind Cycle Count - Antibiotics & Analgesics"` and `countedBy = "Pharm. Kojo Asante"` with `""` (empty string). The fields are user-entered.
  - Add the audits zero-state: when `audits.length === 0` render `<div className="py-8 text-center text-slate-400"><p className="text-xs text-slate-500">No cycle count audits initiated.</p></div>` inside the table body or list container.
- **Acceptance Criteria Addressed**: AC-2, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-4.1: `grep "Pharm\. Kojo Asante\|Amoxicillin 500mg Caps\|Monthly Blind Cycle\|Coartem 20/120mg Tabs \(6x4\)"` in audits/page.tsx returns 0 matches.
  - `rule` TR-4.2: Audits zero-state render block exists; new-audit form opens with no pre-filled rows.

## Task 5: Procurement page purge — seeded PO item & reorder defaults purged; PO zero-state
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Replace `newPoForm.items` default array (Coartem / Amoxicillin / Paracetamol / Metformin seeded demo SKUs, 4 items) with `items: []`.
  - Replace the `supplier_name: "Ernest Chemists Ltd (Distribution Hub)"` and `notes: "Urgent restocking order"` defaults in `newPoForm` with `""`.
  - In the PO list body (`activeTab === "po"`), add the zero-state block when `purchaseOrders.filtered.length === 0`: a table row with `colSpan` spanning all columns showing the procurement zero-state plus a visible "+ New Purchase Order" button inside the same zero-state surface that triggers the existing modal.
  - Similarly, for the Reorder Suggestions sub-tab, ensure `catch` fallback uses `setReorders([])` (no seeded list) and applies the same "All Stock Levels Optimal" zero-state div used in the dashboard.
  - Retain the Forecast/Seasonal sub-tabs' defaults if no api-client methods exist; their seed data is algorithmic generator configuration not fake display data.
- **Acceptance Criteria Addressed**: AC-2, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-5.1: `grep "Ernest Chemists\|PO-2026-0814\|GHS 18450\|Urgent restocking"` in procurement/page.tsx returns 0 matches.
  - `rule` TR-5.2: PO tab zero-state row exists; `newPoForm.items === []`; the supplier_name/notes initial state is empty.

## Task 6: Pricing page purge — remove fake POM/OTC/CONTROL markup seed; empty-state CTA
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - In `loadPricingRules` catch block, replace the mock object literal containing the 3 category rules `POM (35% / 25%)`, `OTC (50% / 33.3%)`, `CONTROLLED (45% / 30%)` + 3 patient discount tiers (NHIS 0%, Senior 5%, Staff 20%) with `setPricingRules({ default_markup_percentage: 0, category_rules: [], patient_discount_tiers: [] })`.
  - On the render side, if `pricingRules?.category_rules.length === 0` (no configured rules), show the empty surface "+ Add Markup Rule" CTA block with a clear baseline note: "No markup rules configured. A default baseline markup of `{rules?.default_markup_percentage ?? 0}%` applies until category rules are added." rather than rendering the seeded rules.
  - Keep the margin simulator form's `simCategory: "POM"` and `simCostPrice: 35.0` defaults — these are calculator seed values, not data fixtures.
- **Acceptance Criteria Addressed**: AC-2, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-6.1: `grep "Prescription Only Medicines \(POM\)\|NEAREST_50_PESEWAS\|NHIS.*0%.*Senior.*5%.*Staff.*20%"` returns 0 matches in pricing/page.tsx.
  - `rule` TR-6.2: Catch fallback uses empty arrays; "+ Add Markup Rule" empty CTA surface exists when no rules are set.

## Task 7: Staff page full rewrite — live bind directory + onboarding endpoint + zero-state
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2 (so `useAuth` resolution pattern is consistent)
- **Description**:
  - Add an effect: `const loadStaff = async () => { try { const rows = (await apiClient.getStaffMembers?.()) || []; setStaff(rows); } catch (e) { setStaff([]); } }` and call it on mount.
  - Delete the 3 static objects (`ps-1` Pharm. Kojo Asante, `ps-2` Pharm. Kojo Mensah, `ps-3` Kwabena Addo finance) from initial state — replace `useState<PharmacyStaff[]>([…])` with `useState<PharmacyStaff[]>([])`.
  - Rewrite `handleOnboard(e)`: remove `setTimeout`/`newStaff` local insert. Instead:
    1. Build the staff invitation payload `{ email, full_name: name, phone, role, license_pin: licensePin, shift }`.
    2. Call `await apiClient.inviteStaffMember(payload)` (or equivalent, with `?.()` defensive wrapper + try/catch).
    3. On success: close modal, show success toast, invoke `loadStaff()` to refresh.
    4. On error: populate `statusMessage` type=error.
  - Replace the KPI card static Superintendent Pharmacist name "Pharm. Kojo Asante" + PIN "PC/GAR/09124-SP" with the first `SUPERINTENDENT_PHARMACIST` item from the live `staff` array, or "—" / "No Superintendent Assigned" (unauthentic-looking fallback).
  - Install the staff zero-state block `staff.length === 0`: "No dispensary staff registered. Onboard the first pharmacist." with an onboard CTA button.
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-6
- **Test Requirements**:
  - `rule` TR-7.1: `grep "Pharm\. Kojo\|Kwabena Addo\|osupharmacy\|PC/GAR/09124\|setTimeout"` in staff/page.tsx returns 0 matches.
  - `rule` TR-7.2: `handleOnboard` body includes `await apiClient.…` invocation followed by `loadStaff()` call; initial `useState([])` only, no seeded rows.
  - `rule` TR-7.3: Superintendent KPI card never prints static "Pharm. Kojo Asante" — value comes from the `staff` array or "-" fallback.

## Task 8: Shared helpers (authTenant name/currency) + consistency pass — utility, no globals fallback
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  - Add a tiny helper module `apps/pharmacy-pos/src/utils/useAuthContext.ts` (or inline functions in the pages if a new file is undesirable, per the "never create files unless required" principle) that reuses the PharmacyHeader `parseJwtRole` + localStorage reads. Expose `useAuthTenant(): { name: string; currency: string }`.
  - Apply the helper in Task 1 and Task 2 so every page derives `currency` and `tenant name` consistently; ensure the literal `GHS` in code is reduced to occurrences *only* where it's the schema default for an empty currency code.
  - Consistency grep sweep across the entire folder `(pharmacy-admin)/**/*.tsx`: catch any remaining fake literals missed by the targeted tasks (e.g., stray "GHS 248500" or staff names) and refactor in place — keeping edits surgical and logic-preserving.
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `rule` TR-8.1: `grep -rn "GHS 248500\|GHS 348200\|GHS 184500\|GHS 114800\|Osu Community\|Ernest Chemists\|Dispensary Practitioner" apps/pharmacy-pos/src/app/\(pharmacy-admin\) apps/pharmacy-pos/src/components` returns 0 lines.
  - `rubric` TR-8.2: Helper usage consistency; scale 0-2; anchors 0=duplicated inline parsing per page, 1=helper used in 2 of 3 sites, 2=uniformly referenced in dashboard + subroute metrics. Threshold >= 1.

## Task 9: Verification — run type-check and build; iterate on TSC errors
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-8 complete
- **Description**:
  - Execute `pnpm type-check --filter=@medipaedia/pharmacy-pos` and fix any new TS errors introduced (e.g., missing api-client methods → wrap in `?.(args)` or cast through `any` temporarily with a comment referencing the missing method name until the backend ships it, but *never* fill the method with mock return data).
  - Once type-check passes, run `pnpm build --filter=@medipaedia/pharmacy-pos` and iterate on Next.js build errors until exit 0.
  - Record the last 40 lines of each command's output as completion evidence.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-9.1: Type-check exit code 0; "Found X errors" line shows X=0.
  - `rule` TR-9.2: Build exit code 0; terminal line "Build completed successfully" or equivalent.
  - `rubric` TR-9.3: Error handling maturity; scale 0-2; anchors 0=any TS error unresolved or build fails, 1=passes but defensive wrappers rely on `any` casts in 3+ places, 2=passes with minimal `any` usage and only for genuinely absent future methods.
