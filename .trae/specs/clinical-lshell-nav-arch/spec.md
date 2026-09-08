# Medipaedia L-Shell Navigation Architecture - Product Requirements Document

## Overview
- **Summary**: Refactor the navigation and layout architecture of the Medipaedia multi-app platform into a unified "Clinical L-Shell" pattern consisting of a collapsible left sidebar rail, contextual page-header tab strip, and mobile bottom navigation bar.
- **Purpose**: Eliminate duplicated horizontal top-bar navigation across 11+ sub-layout shells, consolidate role/app-based navigation into a single role-aware left rail, decongest the horizontal header so it focuses on page identity, contextual secondary tabs, and primary CTAs only, and deliver a consistent mobile UX with pinned bottom navigation across all modules.
- **Target Users**: Hospital Clinicians (Doctors, Nurses, Reception, Finance, Admin), Pharmacists (Dispensary, Admin, Superintendent), and Patients (Personal Health Portal — patient-store).

## Goals
- Unify navigation to a single canonical L-Shell pattern across `apps/hospital-web`, `apps/patient-store`, `apps/pharmacy-pos` (total 11 layout shells).
- Move primary department/role navigation OUT of the header horizontal bar INTO the left collapsible sidebar rail.
- Strip the Header component to only 3 zones: (Left) Identity + Breadcrumb, (Center) Contextual Page Tabs, (Right) Primary CTA + Language + Avatar.
- Deliver mobile-specific UX: sidebar hidden (`md:hidden`), contextual tabs swipeable, bottom nav bar pinned with active under-dot indicator.
- Zero TypeScript errors across `@medipaedia/ui`, `hospital-web`, `patient-store`, and `pharmacy-pos` builds.

## Non-Goals
- **EXCLUDED STRICTLY**: Any modification to `apps/hospital-web/src/app/(super-admin)/**` Super Admin portal layout or components.
- No changes to authentication flows, JWT handling, or login pages (already in `(auth)/layout.tsx` which is out of scope).
- No changes to the `(clinical)/tv-display` kiosk full-screen bypass (reception layout already guards this with early return).
- No changes to data-fetching, API contracts, or business logic inside page contents.
- No changes to brand tokens, color palettes, or global Tailwind config beyond what is required for component classes.

## Background & Context
Current architecture has 11 independent layout shells each mounting:
1. A `Header`/`HospitalHeader`/`PharmacyHeader` component with horizontal primary nav links baked into the top bar.
2. Optionally a redundant sub-navbar strip below (e.g., `reception/layout.tsx` lines 84–132, `hospital-admin/layout.tsx` lines 112–142).
3. `MobileBottomNav` mounted only in the `hospital-admin` layout today — other layouts have no mobile primary nav fallback.
4. Page `<main>` sits below the header stack with ad-hoc padding classes.

This causes:
- **Duplication**: Each shell hardcodes the same primary nav list with slight variations — the L-Shell consolidates this into the sidebar rail.
- **Header congestion**: Primary links compete with logo, branch switcher, language, profile, and CTA in a single h-16 row.
- **Mobile UX gap**: 10 of 11 shells lack any bottom mobile nav; users must use the header's drawer button.
- **Header pollution**: `header.tsx` L192-L229 contains the primary department nav inside the logo row; this must move to the sidebar.

## Functional Requirements
- **FR-1: ClinicalSidebar Component**: Create `packages/ui/src/components/ClinicalSidebar.tsx` with collapsed/expanded state persisted to `localStorage["medipaedia_sidebar_collapsed"]`. Hidden < md (sidebar class `hidden md:flex`). Renders brand block, role-filtered navigation items with Lucide icons matching active route (`usePathname()`), and bottom dock (tenant/branch chip + user profile row).
- **FR-2: MobileBottomNav Upgrade**: Modify existing `packages/ui/src/components/MobileBottomNav.tsx` to match spec §2 (viewport `fixed bottom-0 ... h-16 pb-safe flex justify-around px-2`, active tab text `font-bold` with `w-1.5 h-1.5 rounded-full bg-teal-600` under-dot indicator, 5th Menu tab with drawer trigger, label text `text-[10px] font-medium tracking-tight mt-1`).
- **FR-3: Header → Contextual Tab Strip Refactor**: Rewrite `packages/ui/src/components/header.tsx` to remove the horizontal `navLinks` primary nav from the desktop row (L211-L228 + mobile drawer nav). New structure: Left (hamburger `md:hidden` + active page title + breadcrumb), Center (secondary tabs strip — horizontal swipe with `scrollbar-none snap-x` on mobile), Right (primary CTA `h-8 text-xs font-bold` + `h-5 w-px` separator + LanguageSwitcher + UserProfileDropdown 32px avatar circle). Accept `contextualTabs` prop (new) for secondary page tabs; keep backward-compatible `navLinks` prop but map its values into the contextual-tabs strip instead of the logo-level row to avoid breaking existing callers immediately.
- **FR-4: L-Shell Layout Integration (Hospital 6-pack)**: Update `apps/hospital-web/src/app/(clinical)/layout.tsx`, `(doctor)/doctor/layout.tsx`, `(nurse)/nurse/layout.tsx`, `(reception)/reception/layout.tsx`, `(hospital-finance)/hospital-finance/layout.tsx`, `(hospital-admin)/hospital-admin/layout.tsx` to the canonical flex-L-shape: `<div class="flex h-screen overflow-hidden"><ClinicalSidebar/><div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden"><Header/>{children in flex-1 overflow-y-auto main with pb-20 md:pb-8}</div><MobileBottomNav/></div>`. Remove redundant sub-navbar strips in reception/hospital-admin (their content migrates into the Header's contextual tabs strip).
- **FR-5: L-Shell Layout Integration (Patient)**: Update `apps/patient-store/src/app/(dashboard)/layout.tsx` with the L-Shell pattern using patient-focused navigation items (Health Overview, Appointments, Hospital Cards, Prescriptions, Diagnostics, Orders & Meds).
- **FR-6: L-Shell Layout Integration (Pharmacy 4-pack)**: Update `apps/pharmacy-pos/src/app/(pharmacy-admin)/pharmacy-admin/layout.tsx`, `(dispensary)/layout.tsx`, `(pharmacy-finance)/pharmacy-finance/layout.tsx`, `(superintendent)/superintendent/layout.tsx` with the L-Shell pattern and RX sub-brand badge in the sidebar.
- **FR-7: Dashboard Responsive Grid Standards (§5)**: Update every `page.tsx` inside layout groups in-scope to use responsive metric-card grids: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` and wrap flow-pipeline/timeline sections in `<div class="overflow-x-auto pb-2 scrollbar-thin"><div class="flex min-w-[720px] gap-3">...</div></div>`.
- **FR-8: Export Registration**: Add `ClinicalSidebar` export to `packages/ui/src/index.ts`.
- **FR-9: Super Admin Exclusion Guarantee**: No file under `apps/hospital-web/src/app/(super-admin)/` shall be modified (verified by `git diff --stat` or grep).

## Non-Functional Requirements
- **NFR-1: Type Safety**: Strict TypeScript zero-`any` policy; no new files may introduce `any` unless type-guarded with runtime coercion.
- **NFR-2: Backward Compatibility**: Existing callers of `Header` with `navLinks` prop shall not break — `navLinks` entries render as contextual tab pills in the center strip instead of the logo row.
- **NFR-3: Build Success**: All four builds pass: `pnpm --filter @medipaedia/ui type-check`, `pnpm --filter hospital-web build`, `pnpm --filter patient-store build`, `pnpm --filter pharmacy-pos build`.
- **NFR-4: Visual Fidelity**:
  - 1440px desktop: Sidebar toggles cleanly between w-60 expanded and w-16 collapsed with `transition-all duration-300 ease-in-out`. Active item renders with `bg-teal-600/20 text-teal-400 font-semibold border-l-4 border-teal-500`.
  - 1024px laptop: Collapsed rail shows icon-only items with native title tooltip, zero text clipping.
  - 390px mobile: Sidebar hidden, header only shows page title + hamburger + CTA + avatar, contextual tabs swipe horizontally with `snap-x snap-mandatory`, bottom bar h-16 pinned with pb-safe, active tab has under-dot indicator and `text-teal-700 font-bold`.
- **NFR-5: Persistence**: Sidebar collapsed state hydrates from localStorage on mount and persists on toggle without refresh glitch.
- **NFR-6: Auth Context**: Layouts that currently import `useAuth()` (clinical, doctor, nurse, reception, finance) shall continue to pass user/tenant data through to ClinicalSidebar and Header. Layouts that rely on default values (hospital-admin, patient-store, pharmacy) continue to work with fallback rendering.

## Constraints
- **Technical**:
  - Must use existing `@medipaedia/ui` components where available: `MedipaediaLogo`, `UserProfileDropdown`, `LanguageSwitcher`, `Badge`.
  - Next.js App Router only (no migration to Pages Router).
  - Lucide React icons only — no new icon packages. All icon imports from `lucide-react` as listed in spec §1 and §2.
  - Tailwind-only styling; no CSS/SCSS modules, no styled-components, no CSS-in-JS beyond inline style for computed safe-area padding.
  - Zero runtime errors: `document` / `window` access guarded by `typeof window !== "undefined"` or wrapped in client-component effect hooks; `"use client"` mandatory at top of all layout/component files with hooks.
- **Business**:
  - Super Admin shell `(super-admin)` is a hard contract boundary. Do not touch.
  - No changes to the TV display kiosk flow in reception — the `if (isTvDisplay) return <>{children}</>;` guard must be preserved.
- **Dependencies**:
  - `lucide-react` already installed; no new packages.
  - Existing `MobileBottomNav` is enhanced in-place; replace rather than creating a parallel component.

## Assumptions
- Host applications already provide their own Next.js `Link` wrapping if desired; sidebar and bottom-nav items render plain `<a>` tags by default with optional `LinkRenderer` prop for NextLink injection (pattern already exists in MobileBottomNav, reused for ClinicalSidebar).
- The `contextualTabs` prop on Header replaces the current sub-nav strips; for each layout, the layout's existing `navLinks` (e.g., reception's tabs list) maps to Header's `contextualTabs` array.
- `hospital-admin` page already mounts MobileBottomNav — for other hospital-web layouts, MobileBottomNav's DEFAULT_TABS shall be overridden with role-appropriate tab arrays per shell (e.g., Reception: Intake, Folders, Appointments, ...).
- Lucide icon list in spec §1 is the full list; additional icons that appear in the existing dashboard layouts for mobile bottom nav (like `BedDouble`, `TrendingUp`) are acceptable as part of `FR-4` local layout files but not in `ClinicalSidebar.tsx` itself.

## Open Questions
- [ ] None: All ambiguity resolved by the spec. For `contextualTabs` the Header will gracefully handle empty array (hide strip). For unknown routes, sidebar renders inactive items per the item's `matchPrefixes` (consistent with existing MobileBottomNav logic).

## Acceptance Criteria

### AC-1: ClinicalSidebar renders and persists state
- **Type**: `rule`
- **Given**: The `packages/ui/src/components/ClinicalSidebar.tsx` exists with `"use client"` directive and exports named `ClinicalSidebar`.
- **When**: The component mounts in a Next.js client page at `md:` breakpoint or above.
- **Then**: (1) It renders with expanded width `w-60` if `localStorage["medipaedia_sidebar_collapsed"] !== "true"` on first load; (2) clicking the ChevronLeft/ChevronRight circular toggle swaps width between `w-60` ↔ `w-16` with `transition-all duration-300`; (3) `localStorage` reflects the new state; (4) at `<md` viewport the component has class `hidden md:flex` (no render).
- **Pass Condition**: Component file exists with the above classes and hooks; manual visual check at 1440px confirms toggle behavior and persistence across refresh; at 390px sidebar does not occupy DOM space.
- **Evidence**: Source file read + build output.

### AC-2: MobileBottomNav visual style exactly matches spec §2
- **Type**: `rule`
- **Given**: `packages/ui/src/components/MobileBottomNav.tsx`.
- **When**: Component renders at `<md` viewport.
- **Then**: (1) Outer container classes match `fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 h-16 pb-safe flex items-center justify-around px-2`; (2) Active tab has `font-bold` label with `text-teal-700 dark:text-teal-400`; (3) A `w-1.5 h-1.5 rounded-full bg-teal-600 mt-0.5` under-dot renders below the active tab icon; (4) Label text uses `text-[10px] font-medium tracking-tight mt-1`.
- **Pass Condition**: Diff of MobileBottomNav.tsx shows all 4 class/props conditions present; visual check at 390px shows 5 tabs (including Menu trigger) with under-dot on the path-matching tab.
- **Evidence**: File content + screenshot (manual dev server run).

### AC-3: Header component stripped of primary dept nav, exposes contextual tabs + title + CTA layout
- **Type**: `rule`
- **Given**: `packages/ui/src/components/header.tsx` with diffs applied.
- **When**: Rendered at `md:` breakpoint.
- **Then**: (1) The desktop row L192-L229 `nav` with horizontal department navLinks is removed or converted to contextual-tabs zone; (2) Left area contains `md:hidden` hamburger button + page title + breadcrumb; (3) Center / below-row area renders contextual secondary tabs with classes `flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory`; (4) Right area order: Primary CTA `h-8 text-xs font-bold` → separator `h-5 w-px bg-slate-200 dark:bg-slate-800` → LanguageSwitcher → UserProfileDropdown (32px circle, no username wrapping text outside tooltip).
- **Pass Condition**: Grep for old nav structure returns no matches; new structure rendering confirmed by visual check across 3 shells.
- **Evidence**: Header.tsx content post-edit, grep for old patterns.

### AC-4: All 6 hospital-web layouts conform to L-Shell flex structure
- **Type**: `rule`
- **Given**: `apps/hospital-web/src/app/(clinical)/layout.tsx`, `(doctor)/doctor/layout.tsx`, `(nurse)/nurse/layout.tsx`, `(reception)/reception/layout.tsx`, `(hospital-finance)/hospital-finance/layout.tsx`, `(hospital-admin)/hospital-admin/layout.tsx`.
- **When**: Each layout file is read.
- **Then**: (1) All 6 files import `ClinicalSidebar`, `MobileBottomNav` from `@medipaedia/ui`; (2) outer wrapper is `<div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">`; (3) inner structure order: `ClinicalSidebar` → `<div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">` containing `Header` → `<main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">` → `MobileBottomNav`; (4) reception layout preserves its `isTvDisplay` early-return guard; (5) hospital-admin/reception redundant sub-nav strips below the header are removed.
- **Pass Condition**: All 6 layout source files satisfy the 5 checks above; `grep` confirms `ClinicalSidebar` imported in all 6; redundant strips absent.
- **Evidence**: File reads + grep output.

### AC-5: patient-store (dashboard) layout uses L-Shell with patient nav
- **Type**: `rule`
- **Given**: `apps/patient-store/src/app/(dashboard)/layout.tsx`.
- **When**: Opened on a patient page.
- **Then**: (1) L-Shell structure as in AC-4; (2) ClinicalSidebar shows patient-focused nav items (labels or hrefs match: Health Overview, Appointments, Hospital Cards, Prescriptions, Diagnostics, Orders & Meds / equivalent paths); (3) subBrand set to `care`; (4) MobileBottomNav overridden with patient-appropriate tabs or uses defaults if reasonable.
- **Pass Condition**: Source inspection confirms all 4 conditions; visual check renders the CARE brand badge in sidebar brand block.
- **Evidence**: File content of patient-store dashboard layout.

### AC-6: All 4 pharmacy-pos layouts use L-Shell with RX brand
- **Type**: `rule`
- **Given**: `apps/pharmacy-pos/src/app/(pharmacy-admin)/pharmacy-admin/layout.tsx`, `(dispensary)/layout.tsx`, `(pharmacy-finance)/pharmacy-finance/layout.tsx`, `(superintendent)/superintendent/layout.tsx`.
- **When**: Each layout read.
- **Then**: (1) L-Shell structure as in AC-4; (2) subBrand set to `rx` in sidebar; (3) admin layout preserves Launch POS Register CTA; (4) `PharmacyHeader` import replaced with `Header` from `@medipaedia/ui` or PharmacyHeader delegates to the refactored Header.
- **Pass Condition**: All 4 layout source files satisfy 4 checks above.
- **Evidence**: 4 file contents.

### AC-7: Super Admin portal untouched
- **Type**: `rule`
- **Given**: The entire git diff after implementation.
- **When**: Running `git diff --name-only` (or file-stat comparison).
- **Then**: No file under `apps/hospital-web/src/app/(super-admin)/` has been modified.
- **Pass Condition**: `git ls-files -m apps/hospital-web/src/app/(super-admin)/` returns empty set OR if git unavailable: confirmed zero files touched under that path.
- **Evidence**: Git output or direct `grep -r` over file modtimes/sizes to confirm no change.

### AC-8: Dashboard responsive grids (§5) applied
- **Type**: `rubric`
- **Dimension**: Responsive metric card grid adherence
- **Scale**: 1-5
- **Anchors**: 1 = zero pages updated, hardcoded grids still present; 3 = at least half of in-scope dashboard pages updated with responsive column classes; 5 = every in-scope `page.tsx` dashboard uses: (a) metric cards with `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`, and (b) any timeline/pipeline/flow section wrapped in `overflow-x-auto pb-2 scrollbar-thin` with inner `flex min-w-[720px] gap-3`.
- **Pass Threshold**: >= 4
- **Evidence**: File list of inspected dashboard pages + grep counts for the exact class strings.

### AC-9: All four builds pass with zero TypeScript errors
- **Type**: `rule`
- **Given**: Clean working directory (no uncommitted dependency changes).
- **When**: Running `pnpm --filter @medipaedia/ui type-check` && `pnpm --filter hospital-web build` && `pnpm --filter patient-store build` && `pnpm --filter pharmacy-pos build` in sequence.
- **Then**: All 4 commands exit with code 0 and no TypeScript `error TSxxxx` lines in stdout/stderr.
- **Pass Condition**: Exit code 0 concatenated across all 4 commands.
- **Evidence**: Stdout/stderr capture for each build command.

### AC-10: Zero new `any` type introductions
- **Type**: `rubric`
- **Dimension**: TypeScript strict type purity
- **Scale**: 1-5
- **Anchors**: 1 = 5+ new `any` usages in new/modified files; 3 = 1-4 `any` usages with runtime type guards; 5 = zero `any` usages in all created/modified files, all generics and interfaces typed with proper discriminated unions or optional chaining where needed.
- **Pass Threshold**: >= 4
- **Evidence**: `grep -rn "\bany\b" packages/ui/src/components/ClinicalSidebar.tsx packages/ui/src/components/header.tsx packages/ui/src/components/MobileBottomNav.tsx` for created files; existing-header grep for any as baseline; new layout files grep for any.
