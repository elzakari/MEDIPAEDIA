# Pharmacy POS Mock Purge & Live-Data Rewire - Product Requirements Document

## Overview
- **Summary**: Purge every hardcoded mock fixture, static purchase order, fake branch transfer, and dummy inventory metric from the Pharmacy Admin application (`apps/pharmacy-pos`). Wire all views to live endpoints via `@medipaedia/api-client`, install authentic zero-states for all data surfaces, and sync the facility header to authenticated tenant identity.
- **Purpose**: The pharmacy-pos portal currently surfaces static literal data to real users (e.g., "Osu Community Pharmacy, Accra", "PO-2026-0814", "IBT-2026-042", "Ridge Hospital Satellite Dispensary", "GHS 18450.00", a hardcoded 3-person staff roster, and mock cycle-count sheets). This violates the Medipaedia engineering convention of zero hardcoded mock data in production routes and delivers a misleading governance view.
- **Target Users**: PHARMACY_ADMIN, TENANT_ADMIN, and SUPER_ADMIN personnel using the Pharmacy Governance & Procurement Desk; downstream reviewers in Finance, Superintendency, and Super Admin Mission Control who consume aggregated pharmacy KPIs.

## Goals
1. Every numeric KPI, table row, badge literal, form default, and branch name in the pharmacy-admin route group derives from live `@medipaedia/api-client` responses — zero static fixture literals remain after the refactor.
2. Each collection surface (low-stock suggestions, PO list, IBT list, cycle-count audits, markup rules, staff directory) renders an authentic zero-state when the backend returns an empty list or network-error fallback.
3. The facility header badge and dashboard subtitle always resolve to the authenticated tenant's real name and active branch, not "Community Pharmacy - Main …" or "Osu Community Pharmacy, Accra".
4. `pnpm type-check --filter=@medipaedia/pharmacy-pos` and `pnpm build --filter=@medipaedia/pharmacy-pos` both exit 0.

## Non-Goals
- Not implementing new backend endpoints; this spec only consumes existing `@medipaedia/api-client` methods and gracefully handles their absence (null-coalesced `0`/empty fallback).
- Not redesigning information architecture or adding new navigation tabs.
- Not refactoring the Superintendent, Dispensary, or Pharmacy Finance route groups in this change.
- Not introducing server components or RSC data fetching — all pages remain `"use client"` with `useEffect`/`Promise.allSettled` loading, matching current architecture.

## Background & Context
- Project conventions (project_memory.md) already mandate: no hardcoded mock data for finance / Mission Control surfaces, use `useAuth().tenant.currency` for financials, realistic-healthy telemetry defaults, and client-side enum normalization for categories.
- The analogous purge in `apps/hospital-web` (finance, Super Admin Mission Control) established the working pattern: `Promise.allSettled` + `apiClient.*` calls on mount + `|| 0` / `|| []` fallbacks that are zero/empty not fictional values, and `<div className="py-10 text-center ...">` zero-state rows with authentic copy.

## Functional Requirements

### FR-1: Executive Dashboard (pharmacy-admin/page.tsx)
- **FR-1.1 Metric cards display `0`, `0.0%`, `0 Critical`, `0 Pending POs`, `0 Shipment` when the corresponding `metrics.*` value is null/undefined or the overview network call fails** — never fall back to "GHS 248500.00", "28.63%", "4 Critical", "9 below safety", "2 Pending POs", "1 Shipment", "GHS 348200.00", or "GHS 114800.00".
- **FR-1.2 Currency for valuation, PO totals, and IBT totals uses the authenticated tenant's currency symbol/code (via `useAuth()?.tenant?.currency`)** — never hardcoded `GHS`.
- **FR-1.3 Dashboard subtitle uses `metrics?.facility_name || authTenantName` and never shows the literal "Osu Community Pharmacy, Accra" as a static default.**
- **FR-1.4 Critical-Low-Stock table renders the user-specified zero-state div (`py-10 text-center` + "All Stock Levels Optimal" copy) when `reorders.length === 0` and when the overview call rejects — not the previous 4-row slice over an undefined array.**
- **FR-1.5 Recent Purchase Orders card renders the zero-state ("No recent purchase orders logged.") when `recentPOs.length === 0`.**
- **FR-1.6 Inter-Branch Transfers card renders the zero-state ("No active stock transfers in transit.") when `transfers.length === 0`.**
- **FR-1.7 On any network error, the page surfaces a soft refresh button (already present `RefreshCw`) instead of silently filling static values.**

### FR-2: Sub-Routes (Procurement / Transfers / Audits / Pricing)
- **FR-2.1 Procurement PO tab binds exclusively to `apiClient.getPurchaseOrders()` output; on empty list it renders a clean zero-state table row with the "+ New Purchase Order" CTA.**
- **FR-2.2 Transfers page binds to `apiClient.getStockTransfers()`; on empty it shows "No inter-branch transfers requested."** The default form preset `destination_branch_name: "Ridge Hospital Satellite Dispensary"` and its two demo line items are removed; the new-transfer modal opens with an empty destination and zero preset items.
- **FR-2.3 Audits page binds to `apiClient.getCycleCountAudits()` (or equivalent); on empty it shows "No cycle count audits initiated."** The 4-row hardcoded `countItems` preset for "Monthly Blind Cycle Count - Antibiotics & Analgesics" plus `countedBy: "Pharm. Kojo Asante"` are replaced by an empty count-items list seeded only when the user adds a row.
- **FR-2.4 Pricing page binds to `apiClient.getPricingRules()` output; on empty it shows the "+ Add Markup Rule" baseline UI** — never the inline mock POM/OTC/CONTROL array with `category_name`, `target_markup_percentage` literals.

### FR-3: Staff & Licensing (pharmacy-admin/staff/page.tsx)
- **FR-3.1 The directory array is populated from `apiClient.getStaffMembers()` (or equivalent role-filtered endpoint); the 3 hardcoded `Pharm. Kojo Asante` / `Pharm. Kojo Mensah` / `Kwabena Addo` entries are removed.**
- **FR-3.2 "Onboard Dispensary Staff" modal does not `setTimeout` → `setStaff([newStaff, ...staff])`. It calls the live staff-onboarding endpoint (`apiClient.inviteStaffMember` or `POST /api/v1/auth/invitations/staff` — the analogue used in `hospital-web` super-admin staff page) and refreshes the list.**
- **FR-3.3 KPI cards ("Superintendent Pharmacist", "Dispensing Pharmacists", "Finance & Cashier") count the live array — never hardcoded "Pharm. Kojo Asante" name and PIN.**
- **FR-3.4 Zero-state when `staff.length === 0`: "No dispensary staff registered. Onboard the first pharmacist."**

### FR-4: Facility Header & Tenant Sync
- **FR-4.1 Header resolves tenant name via authenticated context (`useAuth()?.tenant?.name` or cookie/localStorage parse) — the static `"Community Pharmacy"` initial state literal and the layout's `"Yaw Boakye (Store Manager)` hardcoded userName literal are removed or replaced with derived values.**
- **FR-4.2 Header branch-switcher fallback no longer injects the literal `"Main Store"` concatenation; it falls back to the tenant name + a dynamically-derived branch label from the `/branches` response — never the string `"${resolvedTenantName} - Main Store"` as an unconditional static fallback seed.**

### FR-5: Verification & Build
- **FR-5.1 `pnpm type-check --filter=@medipaedia/pharmacy-pos` completes with exit code 0.**
- **FR-5.2 `pnpm build --filter=@medipaedia/pharmacy-pos` completes with exit code 0.**

## Non-Functional Requirements
- **NFR-1 (Logic preservation)**: Existing navigation, tab structure, button CTAs, and Modal usage must be preserved. The visual hierarchy of cards/tables stays identical to the current design.
- **NFR-2 (i18n convention)**: Any new user-facing string follows the codebase convention — placeholder-only for now since pharmacy-pos does not yet wire `next-intl`, but no raw dot-path keys leak.
- **NFR-3 (Consistent loading UX)**: All pages present `isLoading` skeleton/spinner during fetches, never a flash of a zero-state that swaps in rows.
- **NFR-4 (Error resilience)**: Network errors log to `console.warn`/`console.error` and fall back to empty collections / zero metrics — never a crash, never a synthetic 4-row example collection.

## Constraints
- **Technical**: Pages are `"use client"` Next.js 14 App Router. All data access goes through `import { createApiClient, … } from "@medipaedia/api-client"`. No direct browser `fetch("http://localhost:8000/…")` calls with hand-auth'd headers are permitted — the Header already does this, and the rewrite replaces it with the typed client.
- **Business**: Financial zero states show `0.00` formatted with the authentic currency from `useAuth().tenant.currency` or the symbol matching `metrics.currency` when present. Never show "GHS 0.00" if the tenant's currency would differ.
- **Dependencies**: Depends on `@medipaedia/api-client` methods: `getPharmacyAdminOverview`, `getReorderSuggestions`, `getPurchaseOrders`, `getStockTransfers`, `getCycleCountAudits`, `getPricingRules`, `getStaffMembers`, `inviteStaffMember`, `getPharmacyBranches` (or methods that exist on the client; graceful `?.()` calls protect against missing ones).

## Assumptions
- A1: If an `@medipaedia/api-client` method is undefined/missing in builds, the optional-chained call `apiClient.getCycleCountAudits?.()` plus an empty-array fallback (`|| []`) keeps the page functional without a compile error.
- A2: `useAuth` may not be re-exported to `pharmacy-pos` yet. If absent, a safe resolver reading `localStorage.tenant` / `document.cookie access_token` JWT claims (matching `PharmacyHeader.parseJwtRole`) is acceptable, as long as no static literal fills the gap.
- A3: The procurement "Suppliers", "Depletion Radar", and "Seasonal Forecast" sub-tabs may retain their seeded forms *only* if the relevant api-client methods do not exist — provided their output panels render the zero-state on empty data. Seeded *form presets* (the default PO line items) are in scope for removal when they are fictional SKUs.

## Open Questions
- [ ] Does `@medipaedia/api-client` export `getCycleCountAudits`, `getStaffMembers`, and `inviteStaffMember` for pharmacy tenants? If not, the closest endpoints are `getStaffUsers` / `createStaffInvitation` from the Super Admin client group, and the task will map to those with safe `?.()` wrappers. (Answered during implementation via codebase grep — no user input required.)

## Acceptance Criteria

### AC-1: No static numeric literals remain in the dashboard metric cards
- **Type**: `rule`
- **Given**: A fresh build with no backend seed data and all API calls returning `{}` / `[]` / network error
- **When**: Visiting `/pharmacy-admin`
- **Then**: Every KPI shows `0`, `0.0%`, `0 Critical`, `0 Pending POs`, `0 Shipment` (formatted per tenant currency); zero "248500", "348200", "28.63", "4", "9", "2", "1" literals appear in the rendered card DOM
- **Pass Condition**: A `grep -E "248500|348200|28\.63|9 below safety|Osu Community Pharmacy|Ridge Hospital Satellite|PO-2026-0814|IBT-2026-042|GHS 18450|GHS 4850|Pharm\. Kojo|Kwabena Addo|Community Pharmacy - Main|Yaw Boakye" apps/pharmacy-pos/src` search returns zero matches in non-comment, non-type-annotation lines
- **Evidence**: Static grep saved in task evidence + build command exit codes

### AC-2: Six authentic zero-states render correctly for empty collections
- **Type**: `rule`
- **Given**: Each of the 6 empty collection cases (reorders, POs, IBTs, cycle audits, markup rules, staff) with backend returning `[]`
- **When**: Viewing the corresponding card/table
- **Then**: The exact spec-quoted zero-state copy (or `staff`/`audits`-specific equivalent per FR-3.4/FR-2.3) appears inside a styled centered `<div>`; no phantom rows are generated from a catch/fallback mock
- **Pass Condition**: Source code contains each zero-state `className` + copy verbatim at the appropriate rendering site (conditional on `.length === 0`)
- **Evidence**: File-snippets in task completion evidence showing the `items.length === 0` branches

### AC-3: Facility header reflects authenticated tenant identity
- **Type**: `rule`
- **Given**: A logged-in pharmacy tenant with `tenant.name === "Nakwillies Drugs"`
- **When**: Rendering `PharmacyHeader` from any pharmacy-admin page
- **Then**: `Header tenantName === "Nakwillies Drugs"`; `userName` comes from the JWT/localStorage user; header subtitle never shows "Community Pharmacy" fallback
- **Pass Condition**: In `PharmacyHeader.tsx`, `resolvedTenantName` initial state is `tenantName` or empty `""`; no `"Community Pharmacy"` literal default; layout no longer passes a hardcoded `userName="Yaw Boakye (Store Manager)"` prop
- **Evidence**: Code snippets showing initial state changes + grep confirming literal removal

### AC-4: Staff onboarding endpoint is live-bound
- **Type**: `rule`
- **Given**: "Onboard Dispensary Staff" modal filled with real values
- **When**: Submitting the form
- **Then**: `apiClient.inviteStaffMember(payload)` (or the named equivalent) is awaited; success triggers a refetch of the staff list rather than a `setTimeout` local insert
- **Pass Condition**: `handleOnboard` in `staff/page.tsx` contains an `await apiClient.*` call and calls `loadStaff()` on success; no `setTimeout` with mock insert remains
- **Evidence**: Code snippet of `handleOnboard` function body

### AC-5: Type-check and build both exit 0
- **Type**: `rule`
- **Given**: Codebase after all patches applied; no external server required
- **When**: Running `pnpm type-check --filter=@medipaedia/pharmacy-pos && pnpm build --filter=@medipaedia/pharmacy-pos`
- **Then**: Both commands exit 0
- **Pass Condition**: Terminal exit code 0 for each; `tsc --noEmit` stderr count of errors is 0; Next.js build emits "Build completed"
- **Evidence**: Tail of command output + exit codes in task evidence

### AC-6: Mock purge fidelity across the whole route group
- **Type**: `rubric`
- **Dimension**: Thoroughness of fixture removal vs spec scope
- **Scale**: 0-2
- **Anchors**: 0 = at least one of the 8 forbidden literals still seeded as a display default anywhere in `pharmacy-admin/**`, `staff/**`, or `PharmacyHeader.tsx`; 1 = all forbidden literals removed but at least one form preset still contains fictional SKUs (e.g. transfer modal demo items) that aren't empty; 2 = all literals + all presets purged, every list is `[]` initially until data arrives, every fallback is 0/empty/zero-state
- **Pass Threshold**: 2
- **Evidence**: Grep output across `src/app/(pharmacy-admin)` and `src/components/PharmacyHeader.tsx` for the literal corpus, plus visual inspection of each modal default state

### AC-7: Logic preservation & UI stability
- **Type**: `rubric`
- **Dimension**: Visual & behavioural parity with the pre-refactor layout
- **Scale**: 0-2
- **Anchors**: 0 = navigation or button order changed, a CTA removed, a table column reordered, or Modal triggers broken; 1 = all structure preserved but loading UX differs (e.g., no spinner, or zero-state flashes before data); 2 = exact same structure, same CTAs, smooth isLoading → data flow, no UI flash, identical responsive grid
- **Pass Threshold**: >= 1
- **Evidence**: tsc type-check pass (ensures imports/signatures preserved) + diff analysis showing structural tags unchanged
