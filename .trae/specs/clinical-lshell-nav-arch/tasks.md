# Medipaedia L-Shell Navigation Architecture - Implementation Plan

## Task 1: Create ClinicalSidebar core component
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Create `packages/ui/src/components/ClinicalSidebar.tsx` with `"use client"` directive.
  - Import Lucide icons: LayoutDashboard, Users, Activity, Stethoscope, Pill, CreditCard, ShieldCheck, ChevronLeft, ChevronRight, Building2, LogOut, Settings, FolderClock, Layers.
  - State: `useState(false)` for `isCollapsed`, `useEffect` hydrate from `localStorage.getItem("medipaedia_sidebar_collapsed") === "true"`, persist on toggle with `localStorage.setItem(...)`.
  - Root classes: `hidden md:flex flex-col transition-all duration-300 ease-in-out shrink-0 bg-slate-900 dark:bg-slate-950 text-slate-200 border-r border-slate-800`; width swaps `w-60` ↔ `w-16` (not Tailwind `w-*` conditional — use template literal or ternary).
  - Header block (`h-16`): Expanded shows `MedipaediaLogo` with subBrand + CLINICAL/RX/CARE badge; Collapsed shows `MedipaediaIconMark` only; pin circular Chevron toggle button on right border.
  - Nav list: Use `usePathname()` for route matching; render items with active state `bg-teal-600/20 text-teal-400 font-semibold border-l-4 border-teal-500`; inactive `text-slate-400 hover:text-slate-100 hover:bg-slate-800/60`; collapsed mode centered icon with native `title=` tooltip; expanded mode shows icon + label + optional queue count badge.
  - Default nav items include Reception/Intake (`/reception`, `/patients`), Nurse Triage (`/triage`), Doctor (`/doctor`), Prescriptions/Pharmacy (`/doctor/prescriptions`, `/pharmacy-admin`), Billing (`/hospital-finance`), Facility Admin (`/hospital-admin`).
  - Bottom dock anchored: Tenant/branch truncation chip (e.g. `Nakwillies Main Hub` + branch pill); user profile row with Logout trigger (use existing `UserProfileDropdown` or inline avatar + logout action).
  - Accept props for role filtering, navItems override, subBrand ("clinical"|"rx"|"care"|"none"), tenant info, user info, LinkRenderer.
- **Acceptance Criteria Addressed**: AC-1, NFR-4, NFR-5, NFR-6
- **Test Requirements**:
  - `rule` TR-1.1: File `packages/ui/src/components/ClinicalSidebar.tsx` exists; grep finds `"use client"` at line 1; `isCollapsed` useState + localStorage hydrate/persist pattern present; `w-60`/`w-16` toggle present; `hidden md:flex` present; all 13 Lucide icons listed in spec §1 are imported; active/inactive item classes match exactly. Evidence: File read output + grep.
  - `rubric` TR-1.2: Component API ergonomics for role-based item filtering; scale 1-5; 1=no role support, hardcoded items only; 3=accepts navItems array but no default role resolver; 5=provides sensible default nav items by role/appContext and accepts optional override array + matchPrefixes per item consistent with MobileBottomNav; threshold >= 4. Evidence: Props interface inspection.

## Task 2: Upgrade MobileBottomNav visual spec §2
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Modify `packages/ui/src/components/MobileBottomNav.tsx` in-place.
  - Root container classes updated to match spec: `fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 h-16 pb-safe flex items-center justify-around px-2`. Keep existing `safePad` computation for `pb-safe` (using `style` prop if Tailwind `pb-safe` isn't available).
  - Label styling: `text-[10px] font-medium tracking-tight mt-1` for inactive; active adds `font-bold` + `text-teal-700 dark:text-teal-400`.
  - Under-dot: Render `w-1.5 h-1.5 rounded-full bg-teal-600 mt-0.5` below active tab (replace existing absolute bottom dot with this placement to match spec).
  - Keep existing 5-tab structure: 4 nav tabs + 1 Menu trigger button; Menu click fires `onMenuClick`.
  - `isTabActive`, `DEFAULT_TABS`, `LinkRenderer` logic preserved; only styling updated.
- **Acceptance Criteria Addressed**: AC-2, NFR-4
- **Test Requirements**:
  - `rule` TR-2.1: MobileBottomNav root container has new class string with all 12 tokens (fixed, bottom-0, left-0, right-0, z-50, md:hidden, bg-white/95, dark:bg-slate-950/95, backdrop-blur-md, border-t, h-16, pb-safe) OR equivalent split across className + style; active tab applies `font-bold`; under-dot element has exact classes `w-1.5 h-1.5 rounded-full bg-teal-600 mt-0.5`. Evidence: Diff/read of file.
  - `rubric` TR-2.2: Regression safety — existing exports `MobileBottomNav`, `MobileBottomNavTab`, `MobileBottomNavLinkProps`, `DEFAULT_HOSPITAL_MOBILE_TABS` still present; threshold >= 5 (no breakage allowed). Scale 1-5; 1=exports removed; 3=some exports missing defaults; 5=all exports identical. Evidence: index.ts + type declarations compile.

## Task 3: Refactor header.tsx → Contextual Tab Strip
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (reference to ClinicalSidebar not required — Task 3 fully independent)
- **Description**:
  - Modify `packages/ui/src/components/header.tsx`.
  - **Remove**: Primary department navLinks rendered in the logo row (old lines 211-228 of current desktop nav). Remove navLinks section from mobile drawer too.
  - **Add new props**:
    - `pageTitle?: string` — active page title for left area.
    - `breadcrumb?: Array<{ label: string; href?: string }>` — breadcrumb chips rendered below/next to pageTitle.
    - `contextualTabs?: Array<{ id: string; label: string; href: string; matchPrefixes?: string[]; icon?: React.ReactNode; exact?: boolean }>` — secondary page tabs, rendered in a new `flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory` strip.
    - `primaryCta?: { label: string; href?: string; icon?: React.ReactNode; onClick?: () => void }` — compact CTA button (h-8, text-xs, font-bold).
    - `onMobileDrawerOpen?: () => void` — hamburger click handler for `md:hidden` button.
  - **Backward compat**: Keep `navLinks` prop; if `navLinks` is provided AND `contextualTabs` is not, auto-convert navLinks into contextualTabs entries (`id=href`, `label=label`, `href=href`). This prevents breakage for callers that haven't been migrated yet.
  - **Re-structure desktop row (md+)**: 3 flex zones (justify-between):
    - LEFT: Hamburger (`md:hidden` Menu button) + Medipaedia mark/icon (small) + pageTitle + breadcrumb.
    - CENTER / NEW ROW BELOW: Contextual tabs strip in a full-width row beneath the identity row on desktop too (header becomes flex-col if contextualTabs non-empty).
    - RIGHT: Primary CTA (if provided) → `h-5 w-px bg-slate-200 dark:bg-slate-800` separator → LanguageSwitcher → UserProfileDropdown (32px circle, no username text outside tooltip).
  - **Mobile top bar (< md)**: Keep existing 3-slot identity row; replace notification button with hamburger → `onMobileDrawerOpen`.
  - Keep existing `mobileMenuOpen` + full drawer — but note: with L-Shell, the `Menu` icon in MobileBottomNav triggers it now. Keep drawer for full nav items when hamburger clicked.
- **Acceptance Criteria Addressed**: AC-3, NFR-2, NFR-4
- **Test Requirements**:
  - `rule` TR-3.1: Old horizontal navLinks-in-logo-row code path removed OR replaced; `pageTitle`, `contextualTabs`, `primaryCta`, `onMobileDrawerOpen` props declared in `HeaderProps`; contextual tab strip uses `flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory` class string; right-area order in source is: CTA then separator then LanguageSwitcher then UserProfileDropdown. Evidence: File read.
  - `rubric` TR-3.2: Backward compatibility — caller with only `navLinks` (no contextualTabs) renders a tabs strip with converted entries; existing type-check of current unmodified callers passes; scale 1-5; 1=breaks; 3=warnings; 5=silent auto-convert. Evidence: `pnpm --filter hospital-web build` result for Task 4 layouts still using `navLinks` in Header call (converted by compat code until caller migrated in subsequent tasks).

## Task 4: Register ClinicalSidebar in @medipaedia/ui index exports
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - Add `export * from "./components/ClinicalSidebar";` to `packages/ui/src/index.ts` alongside the existing `export * from "./components/header";` line.
  - Ensure no duplicate exports; TypeScript declaration file includes it.
- **Acceptance Criteria Addressed**: FR-8
- **Test Requirements**:
  - `rule` TR-4.1: `packages/ui/src/index.ts` contains line `export * from "./components/ClinicalSidebar";` (or named export). Evidence: File read.
  - `rule` TR-4.2: `pnpm --filter @medipaedia/ui type-check` exit code 0. Evidence: Build stdout.

## Task 5: Migrate Hospital Clinical layout
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1, 2, 3, 4
- **Description**:
  - Modify `apps/hospital-web/src/app/(clinical)/layout.tsx`.
  - Replace current `<div class="min-h-screen flex flex-col">` with L-Shell wrapper `flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950`.
  - Import `ClinicalSidebar` from `@medipaedia/ui` with subBrand="clinical" + role-based default items.
  - Import `MobileBottomNav` with clinical-appropriate tabs (Dashboard, Patients, Queue, Pharmacy).
  - Replace `HospitalHeader` import usage with new refactored `Header` passing: pageTitle="Clinical Desk", appSubtitle via `t()`, contextualTabs converted from existing navLinks (if any), primaryCta optionally "+ New Consultation", `onMobileDrawerOpen` wired to state.
  - Wrap children in `<main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 min-w-0">`.
  - Keep `useTranslation`, `useAuth`; pass user/tenant info to ClinicalSidebar and Header.
- **Acceptance Criteria Addressed**: AC-4 (clinical variant)
- **Test Requirements**:
  - `rule` TR-5.1: Layout source imports ClinicalSidebar AND MobileBottomNav AND Header (not HospitalHeader unless HospitalHeader delegates); wrapper class has `flex h-screen overflow-hidden`; main has `pb-20 md:pb-8`; `useAuth` preserved. Evidence: File read.
  - `rubric` TR-5.2: i18n fallbacks preserved per user profile convention `t(key) || 'fallback'`; scale 1-5; 1=t() calls stripped; 5=all original i18n calls with fallback intact. Evidence: diff vs original.

## Task 6: Migrate Hospital Doctor, Nurse, Finance layouts (3-pack batch)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-5
- **Description**:
  - `(doctor)/doctor/layout.tsx`: Apply L-Shell; ClinicalSidebar role="doctor" (Doctor Consultations primary nav); Header pageTitle from t(navigation.doctorWorkstation); contextualTabs from existing navLinks: Queue, SOAP, Prescriptions; MobileBottomNav with doctor-specific tabs.
  - `(nurse)/nurse/layout.tsx`: Apply L-Shell; subBrand clinical; Header contextualTabs: Station, Triage, eMAR, Wards, Fluid Balance, SBAR Handover; MobileBottomNav tuned for nurse workflows.
  - `(hospital-finance)/hospital-finance/layout.tsx`: Apply L-Shell; sidebar with CreditCard Billing highlighted; contextualTabs: Overview, Cashier, Drawer Shifts, Insurance Claims, Fee Schedule; MobileBottomNav.
  - All 3 files follow identical L-Shell structure as Task 5. Preserve all `t() || 'fallback'` i18n patterns.
- **Acceptance Criteria Addressed**: AC-4 (doctor, nurse, finance variants)
- **Test Requirements**:
  - `rule` TR-6.1: All 3 files (doctor, nurse, finance) use wrapper class `flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950`; import ClinicalSidebar + MobileBottomNav + Header; each main has `pb-20 md:pb-8`. Evidence: Files read.
  - `rubric` TR-6.2: Role-appropriate contextual tabs present for each shell (doctor ≈ 3-4; nurse ≈ 6; finance ≈ 5); scale 1-5; 1=generic hardcoded everywhere; 5=each layout has distinct role-matching tabs. Evidence: Content inspection.

## Task 7: Migrate Reception layout (preserve TV bypass, remove sub-nav strip)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-5
- **Description**:
  - Modify `(reception)/reception/layout.tsx`.
  - **Preserve**: The `isTvDisplay = pathname === "/reception/tv-display"; if (isTvDisplay) return <>{children}</>;` early-return guard VERBATIM.
  - Apply L-Shell to the non-TV branch.
  - **Remove**: Current sub-navigation workstation tab bar (lines 84-132: `bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30` block with Intake/Folders/Appointments/TV-Display icon tabs).
  - Migrate those 4 tabs into Header's `contextualTabs` array (include `target="_blank"` for TV Display tab if possible via meta or pass through).
  - Keep `usePathname` hook for tab active-matching; route matching now handled by Header's contextualTabs logic.
- **Acceptance Criteria Addressed**: AC-4 (reception variant), NFR-6 (TV bypass)
- **Test Requirements**:
  - `rule` TR-7.1: Source file contains VERBATIM `if (isTvDisplay) return <>{children}</>;` — identical order/condition as original; standalone sub-nav strip DOM nodes removed; tabs now appear in Header `contextualTabs` prop. Evidence: File diff/read.
  - `rubric` TR-7.2: TV Display tab handling — target="_blank" attribute preserved through contextualTabs via onClick or metadata; scale 1-5; 1=lost; 3=link but no _blank; 5=_blank attribute applied or onClick window.open equivalent. Evidence: Inspect in-browser devtools.

## Task 8: Migrate Hospital Admin layout (remove mobile filter pill strip)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-5
- **Description**:
  - Modify `(hospital-admin)/hospital-admin/layout.tsx`.
  - Apply L-Shell wrapper; remove duplicated HospitalHeader import if Header preferred or keep HospitalHeader with compat fallback.
  - **Remove**: Current `MOBILE_FILTER_PILLS` strip L112-L142 (mobile search/quick filter block).
  - Migrate the 7 existing navLinks (Command Center, Billing & Gateways, Staff Workforce, Shift Roster, Wards & Theatres, Tariff Master, Quality & Risk) into Header's `contextualTabs` with matchPrefixes per route.
  - Preserve existing `HOSPITAL_ADMIN_MOBILE_TABS` + `NextLinkRenderer` patterns.
- **Acceptance Criteria Addressed**: AC-4 (admin variant)
- **Test Requirements**:
  - `rule` TR-8.1: `MOBILE_FILTER_PILLS` array deleted; L112-L142 DOM nodes absent; contextualTabs in Header includes all 7 original navLinks; `drawerOpen` state still passed through to mobile menu; L-Shell structure present. Evidence: File read.
  - `rubric` TR-8.2: Command Center CTA (if any) moved to Header primaryCta with h-8 compact style; scale 1-5; 1=still in body; 5=CTA in header primaryCta slot with compact classes. Evidence: Render.

## Task 9: Migrate Patient-store dashboard layout
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-4
- **Description**:
  - Modify `apps/patient-store/src/app/(dashboard)/layout.tsx`.
  - Apply L-Shell wrapper with `bg-[#F8FAFC]` (or standard slate-50).
  - ClinicalSidebar subBrand="care".
  - Sidebar nav items with patient-focused entries: Health Overview (`/dashboard`), Appointments, Hospital Cards, Prescriptions, Diagnostics, Orders & Meds (Orders or Marketplace or Wallet as needed — match existing navLinks array).
  - Header contextualTabs populated from the 9 existing navLinks (patient store has more pages — keep 9 entries in swipe strip).
  - MobileBottomNav uses patient-specific tabs: Dashboard, Appointments, Prescriptions, Pharmacy + Menu.
  - Pass `navLinks`-converted to `contextualTabs` or use Header compat mode.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-9.1: Imports ClinicalSidebar + MobileBottomNav + Header; subBrand="care" present; L-Shell flex h-screen wrapper applied; contextualTabs contains entries from original navLinks array (at least 8 of 9). Evidence: File read.
  - `rubric` TR-9.2: Patient sidebar icon choices — no clinical-only icons like Stethoscope used for patient pages; scale 1-5; 1=wrong icons; 5=patient-appropriate icons for every nav item. Evidence: Visual diff.

## Task 10: Migrate Pharmacy 4-pack layouts
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-4
- **Description**:
  - Modify 4 files in `apps/pharmacy-pos/src/app/`:
    1. `(pharmacy-admin)/pharmacy-admin/layout.tsx` — L-Shell; subBrand="rx"; sidebar default admin nav (Executive Dashboard, Procurement, Transfers, Audits, Pricing, Staff, Settings, Branches); contextualTabs from 7 admin navLinks; primaryCta = "Launch POS Register" (preserve ShoppingCart icon); MobileBottomNav with admin tabs.
    2. `(dispensary)/layout.tsx` — L-Shell; subBrand="rx"; sidebar nav for dispensing (POS, Inventory, Verify/Scanning, Controlled, Finances, Fulfillment); contextualTabs for current dispensary sub-sections; MobileBottomNav dispensary tabs; remove `PharmacyHeader` usage (or migrate to Header compat with overrideNavLinks to contextualTabs conversion).
    3. `(pharmacy-finance)/pharmacy-finance/layout.tsx` — L-Shell; subBrand="rx"; sidebar nav (Escrow Ledger, Payouts); contextualTabs finance-specific.
    4. `(superintendent)/superintendent/layout.tsx` — L-Shell; subBrand="rx"; sidebar nav (Compliance, Cold Chain, Controlled Drugs, Narcotics, Quarantine, Pharmacovigilance, Compounding); contextualTabs superintendent-specific.
  - Delete/deprecate custom `PharmacyHeader` if its logic now lives in the shared `Header` compat path (or keep thin wrapper that calls into Header with prefilled subBrand/rx styling).
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-10.1: All 4 files import ClinicalSidebar + MobileBottomNav + Header (or PharmacyHeader delegates); subBrand="rx"; L-Shell wrapper; admin primaryCta label preserved as "Launch POS Register" or localized version. Evidence: File reads.
  - `rubric` TR-10.2: Distinct contextual tab sets per role (admin 7, dispensary ~5, finance 2, superintendent 7); scale 1-5; 1=all same tabs; 5=each shell unique tabs tailored to role. Evidence: ContextualTabs arrays content.

## Task 11: Dashboard responsive grid standards §5
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None (can run in parallel with any Task 5-10 page migrations as it touches page-level files not layout files)
- **Description**:
  - Hospital-web pages:
    - `apps/hospital-web/src/app/(hospital-admin)/hospital-admin/page.tsx`: Find metric card grid → set `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`. Find any pipeline/timeline/kanban flow cards → wrap with outer `<div class="overflow-x-auto pb-2 scrollbar-thin"><div class="flex min-w-[720px] gap-3">...</div></div>`.
  - Patient-store pages:
    - `apps/patient-store/src/app/(dashboard)/dashboard/page.tsx`: Same metric grid + flow wrapper pattern.
  - Pharmacy pages:
    - `apps/pharmacy-pos/src/app/(pharmacy-admin)/pharmacy-admin/page.tsx` (Executive Dashboard): Same pattern.
  - Apply to any other in-scope dashboard page where metric card grids appear (e.g., finance overview page, dispensary page). Use grep for `grid-cols-3` or `grid-cols-4` hardcoded patterns and replace.
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-11.1: In at least hospital-admin dashboard, patient-store dashboard, and pharmacy-admin dashboard page files: (a) grep for `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` returns at least one match per file; (b) if flow/timeline sections exist, grep finds `min-w-[720px]` in the inner wrapper with outer `overflow-x-auto`. Evidence: Grep output per file.
  - `rubric` TR-11.2: Fluid scaling behavior — no horizontal scrollbar on 1440px for metric grids; flow sections only scroll when viewport < 1024; scale 1-5; 1=scrolls always; 3=occasional overflow; 5=clean responsive at all breakpoints. Evidence: Manual visual check.

## Task 12: Quality gates — 4 builds type-check
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-11 (ALL completed)
- **Description**:
  - Run in order, capture stdout+exit code:
    1. `pnpm --filter @medipaedia/ui type-check`
    2. `pnpm --filter hospital-web build`
    3. `pnpm --filter patient-store build`
    4. `pnpm --filter pharmacy-pos build`
  - If any error, loop back to fix the failing task and re-run.
- **Acceptance Criteria Addressed**: AC-9, NFR-3
- **Test Requirements**:
  - `rule` TR-12.1: All 4 build/type-check commands exit code 0; no string `error TS` appears in stdout. Evidence: Terminal command output logs.

## Task 13: Super Admin exclusion audit
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-12
- **Description**:
  - Run: `git status --porcelain -- apps/hospital-web/src/app/(super-admin)/` OR `Get-ChildItem -Recurse -Force -File apps/hospital-web/src/app/(super-admin) | Compare lastWriteTime to migration start time` OR manual visual audit of each file under that path.
  - If any file modified: revert it immediately and raise a cancelled task with reason. This task runs LAST as a final safety gate.
- **Acceptance Criteria Addressed**: AC-7, FR-9
- **Test Requirements**:
  - `rule` TR-13.1: Git porcelain output for super-admin path is empty OR file timestamps confirm zero writes; if no git repo then explicit grep for `ClinicalSidebar` or new imports in super-admin layouts returns empty. Evidence: Command output.
