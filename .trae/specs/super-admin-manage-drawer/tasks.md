# Super Admin "Manage Facility" Drawer + Endpoints — Task Breakdown (tasks.md)

Author: Principal Full-Stack Engineer · Governing Spec: spec.md in same directory
Last Updated: 2026-09-05

---

## How to read this plan

Each row = one atomic Task with TR (task result) column = what must be true to mark the task **DONE** (exactly = AC-Rxx evidence). Column **`AC↗`** maps each task back to the specific Acceptance Criteria it fulfills in spec.md.

### Legend
- **AC↗**: References AC-R (rule) or AC-U (rubric) from spec.md §5.
- **TR**: Single testable / inspectable Task Result.
- **Depends**: Other tasks that must complete first (DAG order).

---

## Phase T0 — Column additions & schema preparation (backend DDL patches, zero new migrations)

| Task | Work | TR | AC↗ | Depends |
|---|---|---|---|---|
| T0.1 | Backend — init_live_db `_apply_currency_and_status_patch()` additive patch: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS'`. Run inside init_live_database transaction after password_reset_tokens_patch call so currency always materialises in live DB. | Postgres `SELECT column_name FROM information_schema.columns WHERE table_name='tenants' AND column_name='currency'` returns row. `py_compile init_live_db.py` exit=0. | FR-BE-1, AC-R3, AC-R13 | (none, pure additive patch) |
| T0.2 | Backend schemas — create or extend `schemas/admin.py` with 5 new pydantic classes: `UpdateFacilityRequest`, `TenantStaffItem`, `CreateTenantStaffRequest`, `GenerateAdminResetLinkRequest`, `GenerateAdminResetLinkResponse`, `OverridePasswordRequest`, `OverridePasswordResponse`. Use `BaseModel` with `extra=Extra.forbid`, `Field(...)` validations incl. `List[UserRole]` subset for roles, `Field(min_length=8)` for override password. | Classes importable; `py_compile schemas/admin.py` exit=0; role values subset of palette ∈ {HOSPITAL_ADMIN, PHARMACY_ADMIN, DOCTOR, NURSE, RECORD_CLERK, ACCOUNTANT} (validate with `Literal` enum / Set validator). | FR-BE-1..5, AC-R13 | (none) |
| T0.3 | Backend security.py helper `validity_hours_clamped(validity_hours: Optional[int]) -> int` returning default 24, min 1, max 72. Reuse (already existing) `generate_secure_reset_token` and `hash_token` functions directly. Also keep `get_password_hash` import location noted for use in T1.5. | `py_compile security.py` exit=0; helper importable. Return 24 on None; return 72 on 999; return 1 on 0. | FR-BE-4, AC-R8 | (none) |

---

## Phase T1 — Backend 5 endpoints (admin.py, SUPER_ADMIN-gated already via router)

All 5 endpoints placed inside `admin.py` using same pattern as existing `/tenants/{id}/verify` (router-level dependency `Depends(require_super_admin)` already on line 48 of admin.py).

| Task | Work | TR | AC↗ | Depends |
|---|---|---|---|---|
| T1.1 | `PATCH /admin/facilities/{tenant_id}` — endpoint body: load Tenant; iterate over fields `{name, country, currency, subscription_plan_code, status}`. Tier-to-plan mapping applied inline: input `tier: 'STARTER'|'PROFESSIONAL'|'ENTERPRISE'` maps `PLAN-STARTER / PLAN-GROWTH / PLAN-ENTERPRISE` for backward compat. On `status='RESTRICTED' → is_active=False`; `status='ACTIVE' → is_active=True`. Compose diff dict. AuditLog writes: if name/country → `TENANT_UPDATED`; if status → `TENANT_STATUS_CHANGED`; if currency → `TENANT_CURRENCY_CHANGED` (multi: write multiple audit entries, one per changed area). | HTTP 200 returns `{success: true, tenant: {...}}`. HTTP 404 when tenant not found. 422 on unknown tier / status. Postgres row updated. AuditLog count increases by ≥1 per changed area. Test with `asyncio.run()` smoke or manual curl. | FR-BE-1, AC-R3, AC-R4, AC-R13, AC-R17, AC-U3 | T0.1, T0.2 |
| T1.2 | `GET /admin/facilities/{tenant_id}/users` — select(User).where(User.tenant_id==id). scalar.all() → list[TenantStaffItem] with roles[] included. Order by `User.created_at ASC`. Only return users under that tenant (SQL filter = IDOR-protected at query layer). | HTTP 200: list<item> with id/full_name/email/roles[]/primary_role/is_active/license_number/created_at. length matches `SELECT count(*) FROM users WHERE tenant_id=?`. 404 on unknown tenant. | FR-BE-2, AC-R5, AC-R13 | T0.2 |
| T1.3 | `POST /admin/facilities/{tenant_id}/users` — create new User row. Validations: 1) tenant must exist; 2) roles list ⊆ palette (422 otherwise); 3) roles non-empty; 4) email regex match; 5) uniqueness per-tenant check `SELECT 1 FROM users WHERE tenant_id=? AND LOWER(email)=LOWER(req.email) LIMIT 1` → 409 conflict if exists. Generate initial password via `secrets.token_urlsafe(14)`; compute bcrypt → `user.hashed_password`. Compute **hash fingerprint for audit** = `sha256(new_password.encode()).hexdigest()[:8]` — write it in `changes_json={'initial_password_fp_sha256_head8': fp}`. Do NOT return password. AuditLog: action=`STAFF_CREATED_BY_ADMIN`, entity_type=`USER`, entity_id=user.id, actor=current_super_admin.id. `subscription` / `is_active` default to True. | HTTP 201 returns created user (no password). 409 for duplicate-per-tenant email. 422 invalid roles/payload. Postgres user row appears with correct tenant_id + hashed_password populated (non-null, NOT empty). cleartext password NOT in response or audit (only fingerprint). | FR-BE-3, AC-R6, AC-R11, AC-R13, AC-U2 | T0.2, T1.2 (same file) |
| T1.4 | `POST /admin/facilities/{tenant_id}/users/{user_id}/generate-reset-link` — flow: (a) verify tenant & user exists; (b) `user.tenant_id == tenant_id` guard (404 otherwise); (c) validity clamped via helper T0.3; (d) `(raw_token, token_hash) = generate_secure_reset_token()`; (e) INSERT `PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=NOW + clamped hours, used=False)`; (f) commit; (g) AuditLog: `PASSWORD_RESET_ISSUED` (actor=super_admin, changes_json={validity_hours}). **Do NOT store raw_token anywhere in DB or audit.** Return JSON `reset_link = f"{RESET_URL_BASE}?token={raw_token}"` where RESET_URL_BASE = `http://localhost:3000/reset-password`. | HTTP 201 returns `{reset_link, expires_at (ISO), validity_hours}`. SHA-256(raw_token) == stored hash (Postgres select + manual hash match). Raw token **NOT** returned in AuditLog.changes_json. expires_at within [23.5h..24.5h] for default. | FR-BE-4, AC-R7, AC-R8, AC-R10, AC-R11, AC-U2 | T0.2, T0.3 |
| T1.5 | `POST /admin/facilities/{tenant_id}/users/{user_id}/override-password` — flow: (a) verify tenant & user + cross-tenant guard (404); (b) validate password length ≥ 8, ≤ 256, Field(min_length=8, max_length=256); (c) `user.hashed_password = get_password_hash(new_password)`; (d) UPDATE current PRT rows `used=True, used_at=NOW()` for user_id (soft-consume any issued resets); (e) commit; (f) **revoke_all_user_sessions(user.id)** (redis, imported); (g) AuditLog: `PASSWORD_OVERRIDE_ADMIN`, changes_json={length_applied: len(new_password), validation_pass: True, sessions_revoked: True}. **Never log new_password or its hash anywhere.** | HTTP 200 returns `{success: true, sessions_revoked: true}`. Login with new password succeeds for user; old refresh/access cookies 401 on /auth/me; SUPER_ADMIN own session still valid (bearer still works on /analytics/overview). Postgres users.hashed_password changed to new bcrypt (verify with `verify_password` equality). | FR-BE-5, AC-R9, AC-R10, AC-R11, AC-U2 | T0.2 |
| T1.6 | Backend py_compile + router-import smoke. `python -m py_compile admin.py schemas/admin.py app/models/tenant.py app/core/security.py app/db/init_live_db.py` → exit 0. Run `tmp_router_smoke.py` (reused from password recovery) to confirm 5 new routes registered at paths `/api/v1/admin/facilities/{tenant_id}`, `/users`, `/generate-reset-link`, `/override-password`. | py_compile exit=0; 5 routes in registry smoke output. | AC-R13, AC-R4 | T1.1..T1.5 (all endpoints written) |

---

## Phase T2 — api-client: new types + 5 methods

Target files: `packages/api-client/src/types.ts` + `packages/api-client/src/client.ts`. Match sibling pattern used for `forgotPassword`/`resetPassword` (client.ts L896-908) and `getTenants` (client.ts L795).

| Task | Work | TR | AC↗ | Depends |
|---|---|---|---|---|
| T2.1 | `types.ts` — add interfaces below: `UpdateFacilityPayload`, `TenantStaffItem` (mirror backend), `CreateTenantStaffPayload`, `GenerateResetLinkPayload`, `GenerateResetLinkResult { reset_link: string; expires_at: string; validity_hours: number }`, `OverridePasswordPayload`, `OverridePasswordResult { success: true; sessions_revoked: true }`. Also expand existing `Tenant` interface to include fields used on Tab A: `subscription_plan_code?: string`, `country?: string`, `currency?: string` (these come from backend payloads now; keep backward compatible by making optional since current getTenants may not return them). | `tsc --noEmit` on api-client package or `pnpm type-check` passes; all interfaces referenced from client.ts below. | FR-FE-2, FR-FE-3, FR-FE-4 | (none) |
| T2.2 | `client.ts` — add 5 sibling methods: `patchFacility(tenantId, payload) → Promise<Tenant>`, `listFacilityUsers(tenantId) → Promise<TenantStaffItem[]>`, `createFacilityUser(tenantId, payload) → Promise<TenantStaffItem>` (POST returns single item), `generateFacilityUserResetLink(tenantId, userId, payload?) → Promise<GenerateResetLinkResult>`, `overrideFacilityUserPassword(tenantId, userId, payload) → Promise<OverridePasswordResult>`. URLs: `/admin/facilities/${tenantId}` (PATCH), `/admin/facilities/${tenantId}/users` (GET/POST), `/admin/facilities/${tenantId}/users/${userId}/generate-reset-link` (POST), `/admin/facilities/${tenantId}/users/${userId}/override-password` (POST). Use `this.request<>` with JSON.stringify body and appropriate `Content-Type` (handled by request helper). | Methods exported; tsc --noEmit exit=0. URL paths match backend routes exactly (case-sensitive). | All FR-BE mapped to calls, AC-R12 (prereq) | T2.1 |

---

## Phase T3 — Frontend: Manage Drawer + Tab A/B/C implementation

Target file: `apps/hospital-web/src/app/(super-admin)/super-admin/facilities/page.tsx`. Drawer = wide Modal (`className="!max-w-4xl w-full"`). Use same tab-button pattern as `UserProfileModal.tsx` L244-278 (border-b-2, teal active-state).

| Task | Work | TR | AC↗ | Depends |
|---|---|---|---|---|
| T3.1 | Page state + manage button wire-up. Add state hooks: `managedFacility: Tenant \| null`, `manageDrawerOpen: bool`, `activeTab: 'profile'|'staff'|'security'` (default 'profile'). Wire Manage button L504 → `onClick={() => { setManagedFacility(fac); setManageDrawerOpen(true); }}`. Render `Modal` shell after invitation modal. Header: facility name + tenant_type (Badge) + tenant_id copy chip (tiny grey text, onClick copy to clipboard). | Click any Manage → drawer opens; correct facility renders in header. Click X → drawer closes. No console errors. | AC-R1, AC-R12, AC-U1 | T2.2 (api-client methods available) |
| T3.2 | Drawer Tab A (Facility Profile). Render 5 fields with existing `<Input>` component (text for name/country/currency; native `<select>` wrapped in card-like div for tier/status). Values prefilled from `managedFacility` (use non-null assertion + optional defaults). Tier label maps to PLAN code on submit. "Save Changes" → apiClient.patchFacility + green setToast + local facilities patch via setFacilities. "Restrict / Deactivate Facility" → browser `confirm("This facility account will be restricted (restricted access only). Confirm?")` → patch with `{ status: 'RESTRICTED' }`. | Save works; PATCH network sent with correct body & tenant id. Restrict confirm flow fires PATCH with RESTRICTED status; toast shown. | AC-R2, AC-R3, AC-R17, AC-U1 | T3.1 |
| T3.3 | Drawer Tab B (Staff & Role Assignments). On `managedFacility` change or tab→staff switch: trigger apiClient.listFacilityUsers. Render table with columns (Name, Email, Roles Badges, Status, Actions). Role badge colors: teal=HOSPITAL_ADMIN, emerald=PHARMACY_ADMIN, cyan=DOCTOR, sky=NURSE, slate=RECORD_CLERK, amber=ACCOUNTANT (per spec). Below table "+ Add New Staff Member" collapsible card with inputs (full_name, email, license_number (opt), roles multi-checkboxes). Role palette filtered by `managedFacility.tenant_type` → pharmacies no clinical roles, hospitals/clinics no PHARMACY_ADMIN (AC-R14). Submit calls createFacilityUser, append user to local list, reset form, toast green. On 409 toast red. | GET users fires on tab open; rows render; Badges color-matched; Create form has correct palette per tenant_type. 409 email duplicate → red toast "Staff with this email already exists under this facility". | AC-R2, AC-R5, AC-R6, AC-R14, AC-U1 | T3.1, T2.2 |
| T3.4 | Drawer Tab C (Security & Password Restore). Reuse same users list state (Tab B & Tab C can share it). Render compact list/table with action buttons per row. Two actions: (a) "Generate Reset Link" → on success render a copy-card: `<Input value={result.reset_link} readOnly />` + "Copy Link" Button (navigator.clipboard.writeText) + Badge "Valid for 24 hours". Copy success → green toast; clipboard failure → red toast. (b) "Override Password" → opens an inline form/card with password input + confirm password input + 4-bullet live validator (8 chars, uppercase, digit, symbol). Submit button disabled until both inputs match + strength valid. On submit call overrideFacilityUserPassword → toast "Temporary password assigned and all sessions revoked" + close sub-form. | Generate Reset Link → renders card with URL; copy works + toast. Override password → 4 strength bullets live-checked (green checkmarks as met). submit disabled until valid. 200 response → green toast. | AC-R2, AC-R7, AC-R9, AC-R15, AC-R16, AC-U1 | T3.1, T2.2 |

---

## Phase T4 — Build gates (user-mandated)

| Task | Work | TR | AC↗ | Depends |
|---|---|---|---|---|
| T4.1 | Backend python syntax gates: py_compile all modified files. | `python -m py_compile services/core-api/app/api/v1/endpoints/admin.py services/core-api/app/schemas/admin.py services/core-api/app/core/security.py services/core-api/app/db/init_live_db.py services/core-api/app/models/tenant.py` → exit=0 (per shell). | AC-R13 | T0, T1 |
| T4.2 | hospital-web type-check: `pnpm type-check --filter=@medipaedia/hospital-web` → exit 0. | Command exit=0, 0 TypeScript errors, 0 any-type-errors shown. | AC-R12 (hard user requirement) | T2, T3 |
| T4.3 | hospital-web build: `pnpm build --filter=@medipaedia/hospital-web` → exit 0. `48/48` or higher routes generated successfully (no new failed route files). | Command exit=0; build summary printed successfully. | AC-R12 (hard user requirement) | T4.2 |

---

## Phase R1 — Independent Review

| Task | Work | TR | AC↗ | Depends |
|---|---|---|---|---|
| R1.1 | Produce `review.md` in `.trae/specs/super-admin-manage-drawer/review.md` with the independent-review contract (from Spec Mode skill): list evidence against AC, 3 rubric scores (AC-U1, AC-U2, AC-U3) with raw 0-2 score each, any regressions found, PASS/FAIL verdict. | review.md written with rubric scores ≥ thresholds (AC-U2 must be exactly 2; AC-U1 ≥ 1.5; AC-U3 ≥ 1.5). Overall verdict PASS. | AC-U1, AC-U2, AC-U3 | T1, T2, T3, T4 (all gates passing) |

---

## Graphical DAG (execution order)

```
T0.1 ─┐
T0.2 ─┼─► T1.1 ─┐                T2.1 ─► T2.2 ─┐
T0.3 ─┘   T1.2 ─┤                                ├► T3.1 ─► T3.2 ─┬► T4.2 ─► T4.3
         T1.3 ─┤                                │                 ├► T3.3 ─┘
         T1.4 ─┤                                │                 └► T3.4 ─┘
         T1.5 ─┴► T1.6 ─► T4.1                  │
                                                 └──────────────────────────────────► R1.1
```

**Concurrent lanes OK (order within phases doesn't matter)**:
- Backend lane: T0.1 → T0.2 → T0.3 → T1.1→..→T1.5 → T1.6 → T4.1
- Shared package lane: T2.1 → T2.2
- Frontend lane: T3.1 → T3.2/T3.3/T3.4 → T4.2 → T4.3
- Final: R1.1 after T4.1 & T4.3 both complete.

**Minimal serial steps**: 11. Max total (sequential only): 19 discrete tasks. Expected actual ~15 step executions with parallelism.
