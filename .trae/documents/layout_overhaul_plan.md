# CSS Layout Stabilization & White-Void Elimination — Implementation Plan

## Repository Research

### Root Cause of Hospital Admin White Void (Screenshot #2)
Every hospital-web layout declares the DESKTOP root wrapper with a **conflicting display class triplet**:
```tsx
<div className="md:block hidden flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
```
Tailwind applies the largest matching breakpoint LAST. On `>= md`:
- `hidden` (default)  →  `display: none`
- `flex`   (default)  →  `display: flex`   **overrides hidden**
- `md:block`          →  `display: block`  **overrides flex → LAYOUT BREAKS**

Result on desktop (all 6 hospital shells):
- The outer wrapper becomes `display: block` (NOT flex) → 2-column flex row is **completely disabled**
- `<ClinicalSidebar/>` renders as a full-height BLOCK child first (width ~240px but block-layout, stacking mode)
- `<Header/>` + `<main/>` (right column) then render **BELOW the sidebar** as the next block children
- The entire upper-right 80% of the viewport is unused WHITE VOID (exactly what screenshot #2 shows: Header tabs + Governance title are aligned to the BOTTOM EDGE of the sidebar, not the TOP of the right column)

### Bug Prevalence Matrix (11 In-Scope Shells)
| Shell | `md:block hidden flex` Bug | Status |
|-------|---------------------------|--------|
| hospital-web/(clinical) | YES | BUG |
| hospital-web/(doctor)/doctor | YES | BUG |
| hospital-web/(nurse)/nurse | YES | BUG |
| hospital-web/(reception)/reception | YES | BUG |
| hospital-web/(hospital-finance)/hospital-finance | YES | BUG |
| hospital-web/(hospital-admin)/hospital-admin | YES | **CRITICAL BUG** (matches screenshot #2) |
| patient-store/(dashboard) | NO — uses `hidden md:flex` ✓ | Correct wrapper but missing aside/axis-padding/inner wrapper |
| pharmacy-pos/(pharmacy-admin)/pharmacy-admin | NO — uses `hidden md:flex` ✓ | Correct wrapper but missing aside/axis-padding/inner wrapper |
| pharmacy-pos/(dispensary) | NO — uses `hidden md:flex` ✓ | Correct wrapper but missing aside/axis-padding/inner wrapper |
| pharmacy-pos/(pharmacy-finance)/pharmacy-finance | NO — uses `hidden md:flex` ✓ | Correct wrapper but missing aside/axis-padding/inner wrapper |
| pharmacy-pos/(superintendent)/superintendent | NO — uses `hidden md:flex` ✓ | Correct wrapper but missing aside/axis-padding/inner wrapper |

### Additional Deviations from Strict Standard
All 11 shells diverge from the user's DOM standard in 3 more structural ways:
1. **No `<aside>` semantic wrapper around sidebar** — spec requires `<aside className="shrink-0 h-full z-40 hidden md:block">` wrapping `<ClinicalSidebar/>` (this enforces shrink-0 + responsive classes at the semantic HTML level, not inside ClinicalSidebar itself)
2. **Main padding uses ALL-AROUND `p-*` not axis-split** — current `p-4 sm:p-6 lg:p-8` → spec `px-4 py-6 sm:px-6 lg:px-8` (vertical breathing room y=24px at base instead of 16px, horizontal-only responsive steps)
3. **Missing `max-w-7xl` inner content wrapper** — spec requires `<main>` to contain `<div className="mx-auto max-w-7xl space-y-6">{children}</div>` which: caps line width on 4K displays, centers content, provides section-vertical rhythm space-y-6 (24px) between page sections uniformly

### Non-Goals / Exclusions (VERBATIM per W1/W3 rules)
- ❌ `apps/hospital-web/src/app/(super-admin)/**` — ZERO writes permitted
- ❌ Reception TV bypass guard: `if (isTvDisplay) return <>{children}</>;` — PRESERVED VERBATIM as FIRST render statement
- ❌ Pharmacy Admin primary CTA label — `"Launch POS Register"` href `/pos` + ShoppingCart preserved
- ❌ Mobile branch (`<div className="md:hidden ...">`) left entirely untouched; MobileShell DOM preserved (only the DESKTOP branch of the dual-fragment is standardized)
- ❌ All tab arrays, hero banners, contextualTabs, cardRails, heroBanner definitions, NextLinkRenderer, mobile tabs constants — ALL preserved 100% verbatim (no content changes; only structural wrapper classNames and DOM hierarchy changes)

## Files and Modules
### 11 Layout Files to Standardize
1. `apps/hospital-web/src/app/(clinical)/layout.tsx`
2. `apps/hospital-web/src/app/(doctor)/doctor/layout.tsx`
3. `apps/hospital-web/src/app/(nurse)/nurse/layout.tsx`
4. `apps/hospital-web/src/app/(reception)/reception/layout.tsx` — TV guard PRESERVED first
5. `apps/hospital-web/src/app/(hospital-finance)/hospital-finance/layout.tsx`
6. `apps/hospital-web/src/app/(hospital-admin)/hospital-admin/layout.tsx`
7. `apps/patient-store/src/app/(dashboard)/layout.tsx`
8. `apps/pharmacy-pos/src/app/(pharmacy-admin)/pharmacy-admin/layout.tsx` — CTA label preserved
9. `apps/pharmacy-pos/src/app/(dispensary)/layout.tsx`
10. `apps/pharmacy-pos/src/app/(pharmacy-finance)/pharmacy-finance/layout.tsx`
11. `apps/pharmacy-pos/src/app/(superintendent)/superintendent/layout.tsx`

### Shared `@medipaedia/ui` — No Changes Required
- ClinicalSidebar, Header, MobileBottomNav, MobileShell are purely consumers; their own internal CSS is untouched
- Changes are ONLY at the layout.tsx level (who renders what wrapper classes around these components)

## Implementation Steps

### Step 1 — Fix Root Desktop Wrapper (ALL 11 Shells)
Replace the buggy or incomplete responsive root wrapper of the **DESKTOP branch only**:
- `className="md:block hidden flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950"` → `className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950"` (fixes white void — 6 hospital shells)
- `className="hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950"` → unchanged, preserved (already correct — 5 pharmacy+patient shells)

### Step 2 — Insert `<aside>` Sidebar Wrapper (ALL 11 Shells)
Surround the existing `<ClinicalSidebar {...currentProps}/>` JSX element with:
```tsx
<aside className="shrink-0 h-full z-40 hidden md:block">
  {/* Existing ClinicalSidebar with ALL original props UNCHANGED */}
  <ClinicalSidebar subBrand={...} role={...} ... every original prop />
</aside>
```
This is a pure hierarchy insertion — zero ClinicalSidebar prop changes.

### Step 3 — Right Column Preserved (ALL 11 Shells)
Verify verbatim (already matches spec, no edits required):
```tsx
<div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
  <Header {...all original header props preserved} />
  {/* Step 4 runs on main inside here */}
</div>
```

### Step 4 — Rewrite `<main>` to Strict Standard (ALL 11 Shells)
Replace:
```tsx
<main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
  {children}
</main>
```
With verbatim:
```tsx
<main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">
  <div className="mx-auto max-w-7xl space-y-6">
    {children}
  </div>
</main>
```
Changes:
- `p-4 → px-4 py-6` (split axis: x=16 y=24 at base breakpoint)
- `sm:p-6 → sm:px-6` (horizontal only, 24px x on ≥640px — py=24 inherited unchanged)
- `lg:p-8 → lg:px-8` (horizontal only, 32px x on ≥1024px — py=24 inherited)
- NEW inner `mx-auto max-w-7xl space-y-6` (centered content max 1280px wide with 24px section gaps)
- `pb-20 md:pb-8` preserved VERBATIM (mobile bottom-nav scroll offset vs desktop reduced padding)

### Step 5 — Preserve 3rd Sibling MobileBottomNav (ALL 11 Shells)
`<MobileBottomNav {...tabs/pathname/LinkRenderer/etc}/>` stays as the 3rd SIBLING of the desktop root flex wrapper, NOT inside the 2-column structure. It already has `md:hidden` internally so it only renders on <md screens inside the DESKTOP BRANCH (which is hidden on <md anyway — this is redundant but harmless legacy). Zero edits to MobileBottomNav.

### Step 6 — Zero Edits to Mobile Branch
`<div className="md:hidden ...><MobileShell>...</MobileShell></div>` — preserved VERBATIM, no structural or className edits whatsoever to the mobile branch in any shell.

### Step Ordering to Avoid Partial States
Apply edits per-file in 2 batches:
1. **Batch A** (6 hospital-web layouts): clinical → doctor → nurse → reception (TV guard check) → hospital-finance → hospital-admin
2. **Batch B** (5 remaining): patient-store dashboard → pharmacy-admin (CTA check) → dispensary → pharmacy-finance → superintendent

After each file write, confirm the 3 invariants hold:
  - INV-1: `isTvDisplay === "/reception/tv-display"` early exit is first statement in Reception render if present
  - INV-2: `Launch POS Register` /pos + ShoppingCart in pharmacy-admin primaryCta still literal string match
  - INV-3: MobileBottomNav is a sibling of (not nested inside) the right flex column

## Dependencies and Considerations
- **`space-y-6` on inner wrapper**: Adds 24px gap between ALL root-level elements inside any page `children`. If any pages currently rely on their OWN section spacing (0 gap or custom gap), there could be double-spacing on specific pages. Mitigation: it's the user's explicit spec to add this wrapper; any page-level visual regressions from this should be addressed as follow-up page edits (outside this layout stabilization PR).
- **`max-w-7xl` (1280px) cap**: Any existing `<table/>`, `<DataGrid/>`, or wide financial dashboard components that stretched to fill the whole viewport (1920px+) on 4K monitors will now be capped at 1280px centered. This is the INTENDED editorial line-width constraint from the user's explicit standard; if any specific page needs full-bleed layout (e.g. reception TV display — which already bypasses layout entirely, or a grid page) that page can set its own container break-out inside children with a negative margin workaround, or have a separate non-standard layout as needed.
- **Reception TV bypass**: The TV display page short-circuits before rendering the L-shell at all (`return <>{children}</>;`). This layout stabilization does not affect TV display since it never runs the wrapper code.
- **Next.js App Router fragments**: All 11 layouts use the `<>...</>` React fragment for the dual mobile/desktop branch pattern. Fragment wrappers are preserved unchanged; only the first branch's children are rewired.
- **No new imports**: Aside is vanilla JSX HTML tag (no import required). All imports in every layout remain byte-identical; only the return statement's JSX DOM tree & className strings are edited. Zero new package dependencies.

## Validation

### Type-Check Build Gates (run EXACTLY in this order after ALL file edits applied)
1. `pnpm --filter @medipaedia/ui type-check` — Exit 0. Baseline: UI components untouched; proves no residual TS errors from earlier W3 changes.
2. `pnpm --filter hospital-web build` — FULL Next build. Must compile + type + generate all 49/49 static pages Exit 0. Primary validation gate (6 white-void bug layouts are here).
3. `pnpm --filter patient-store exec tsc --noEmit` — Exit 0.
4. `pnpm --filter pharmacy-pos exec tsc --noEmit` — Exit 0.
5. `VSCode GetDiagnostics` — Must return `[]` empty array.

### Manual Invariant Checks (grep)
```powershell
# Confirm the bug pattern is PURGED from all 11 layouts — zero matches:
Select-String -Path @( (Get-ChildItem apps\hospital-web\src\app -Recurse -Filter layout.tsx).FullName + "apps\patient-store\src\app\(dashboard)\layout.tsx" + (Get-ChildItem apps\pharmacy-pos\src\app -Recurse -Filter layout.tsx).FullName ) -Pattern 'md:block hidden flex' | Measure-Object | Select-Object Count   # Expect Count = 0

# Confirm the correct standard desktop wrapper class EXISTS in all 11 layouts:
Select-String -Path $same -Pattern 'hidden md:flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950' | Measure-Object | Select-Object Count   # Expect Count = 11

# Confirm ALL 11 wrap sidebar in aside shrink-0:
Select-String -Path $same -Pattern '<aside className="shrink-0 h-full z-40 hidden md:block">' | Measure-Object | Select-Object Count   # Expect Count = 11

# Confirm ALL 11 main tags use split-axis padding + inner max-w-7xl wrapper:
Select-String -Path $same -Pattern '<main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-20 md:pb-8">' | Measure-Object | Select-Object Count   # Expect Count = 11

# Confirm ALL 11 have the inner standard wrapper:
Select-String -Path $same -Pattern '<div className="mx-auto max-w-7xl space-y-6">' | Measure-Object | Select-Object Count   # Expect Count = 11

# Confirm forbidden scope has zero edits (timestamp last-write still matches):
Get-Item apps\hospital-web\src\app\(super-admin)\super-admin\layout.tsx | Select-Object LastWriteTimeUtc
# Expect: timestamp unchanged from pre-edit baseline
```

### Visual Validation Checklist (Chrome localhost)
1. `localhost:3000/hospital-admin` — Header "Hospital Governance" renders TOP-RIGHT (directly right of sidebar brand block), tabs visible. No upper-right white void.
2. `localhost:3000/clinical` (route: `/hospital-admin`) — Same; Command Center tab row top-aligned, no offset below sidebar bottom.
3. `localhost:3000/nurse`, `/doctor`, `/reception`, `/hospital-finance` — All 6 hospital routes top-aligned with sidebar header.
4. `localhost:3001/pharmacy-admin` — (from screenshot #1, already correct) verify no regression, header still top-aligned, stat cards 4-across fit within 1280px max-w cleanly.
5. `localhost:3001/pharmacy-admin/staff` — W3 refinements preserved (double border purge still in effect; superintendent card uniform, avatar circular, dropdown fits).
6. 390px mobile breakpoint — MobileShell renders, MobileBottomNav bottom dock visible, DESKTOP BRANCH completely hidden (no double-chrome)
7. 1024px tablet (md breakpoint, 768-1023px range) — Clinical L-shell active, sidebar expanded w-60, 2-column flex row clean, main inner wrapper max-w applies or doesn't based on actual viewport.

## Risks
### Risk R1: `space-y-6` Double-Spacing on Individual Pages
**Likelihood**: Medium (10-20% of dashboard pages might have their own wrapper's `space-y-*` or `gap-*` on root).
**Handling**: User's explicit standard. Fix as follow-up per-page edits by removing the page's own outer spacing if double-space appears. Identified by visual sweep, NOT by delaying this layout stabilization PR.

### Risk R2: `max-w-7xl` Wide Table / Financial Grid Clipping
**Likelihood**: Low (only hospital-finance/reconciliation, pharmacy-admin/tariffs grids might be 1400px+ designed).
**Handling**: Any specific page that needs full-bleed can opt-out inside its `children` by returning a `<div className="-mx-4 sm:-mx-6 lg:-mx-8">...</div>` root wrapper that neutralizes the parent's px-* padding. Out of scope for this PR (opt-outs done per-page by page owners).

### Risk R3: Typo in className String Match During PowerShell Replace → Broken Layouts
**Likelihood**: Medium if relying on regex replace across 11 files with distinct variable whitespace.
**Handling**: After each file write, read back the 20-line wrapper section (desktop branch root to main closing) and compare structure manually; AND run validation gates before moving forward. Use VERBATIM string replace only (not regex) on the exact unique className sequences found per-file during audit — every layout has identical main and root wrapper strings, so literal replace is 100% deterministic.

### Risk R4: Reception TV Guard Accidentally Moved After DOM Tree Write
**Likelihood**: Low (explicit preservation step in Step 6 Batch A order).
**Handling**: After writing reception/layout.tsx, `Select-String` confirms line 72-76 still contains `$content.Contains('if (isTvDisplay) { return <>{children}</>; }')` before continuing to next file.
