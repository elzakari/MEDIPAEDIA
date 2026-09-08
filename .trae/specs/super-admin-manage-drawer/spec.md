# Super Admin "Manage Facility" Drawer + Endpoints — Specification

Author: Principal Full-Stack Engineer · Target: Medipaedia Monorepo
Last Updated: 2026-09-05

---

## 1. Problem, Users, Goals, Non-Goals

### Problem
Super Admin Facilities dashboard currently renders Facility Cards with a non-functional **"Manage"** ghost button. Super Admins need to:
1. Edit an existing facility's profile & plan (CRUD on Tenants table fields plus lock/restrict actions alongside the existing lockout button).
2. View a roster of staff assigned to a tenant, add new staff members with multi-role selection from the permitted clinical/POS role palette.
3. Restore staff access securely: generate 24-hour one-time password-reset links and assign temporary instant passwords without phoning the user.

### Users
- **SUPER_ADMIN** — exclusively. Every endpoint, every action, is gated by the existing `require_super_admin` dependency that already wraps the `/admin` router.

### Goals
- Wire the existing *Manage* button on each facility card to open a wide, tabbed modal (we call it a "drawer" semantically; rendered as a `max-w-4xl` or custom class-wide `Modal` since the shared-ui `Modal` accepts a `className` override).
- Add 5 tenant-scoped admin REST endpoints in `services/core-api` behind the `/admin` router.
- Deliver tabbed UI: Facility Profile / Staff Roster / Security Restore with full interactive flow.
- All writes produce AuditLog rows.

### Non-Goals
- **No SMTP dispatch**: Admin-initiated reset links go to the UI for copy/paste (same pattern as onboarding invitations).
- **No Patient account creation in this drawer**: Staff-only. Patients use the separate flow.
- **No passwordless login or MFA additions**: in-scope is ONLY password recovery & override, exactly as specified.
- **No multi-branch edits or billing edits**: Tab A edit fields limited EXACTLY to {Facility Name, Tier, Country, Currency, Status}.
- **No changes to existing lockout-toggle endpoint in subscriptions**: that endpoint is preserved. Tab A exposes *Save Changes* (PATCH /admin/facilities/{tenant_id}) and a separate secondary CTA *Restrict / Deactivate Facility*.

---

## 2. Functional Requirements

### FR-BE — Backend endpoints

All endpoints below live on the `admin` router (already `APIRouter(dependencies=[Depends(require_super_admin)])`). Prepend `/facilities` and keep verbs consistent with existing admin patterns.

| # | Method + Path | Request Payload (pydantic) | Response Model |
|---|---|---|---|
| FR-BE-1 | `PATCH /api/v1/admin/facilities/{tenant_id}` | `UpdateFacilityRequest: { name?, tier?, country?, currency?, status?: 'ACTIVE'|'RESTRICTED', subscription_plan_code? }` | `{ success: true, tenant: TenanItem }` |
| FR-BE-2 | `GET /api/v1/admin/facilities/{tenant_id}/users` | (none, path-only) | `Array<TenantStaffItem>` (name, email, roles[], primary_role, status/license, is_active) |
| FR-BE-3 | `POST /api/v1/admin/facilities/{tenant_id}/users` | `CreateTenantStaffRequest: { full_name, email, roles[], license_number? }` | `TenantStaffItem` w/ `{ id, invitation_sent: true }` |
| FR-BE-4 | `POST /api/v1/admin/facilities/{tenant_id}/users/{user_id}/generate-reset-link` | `{ validity?: 24 }` (default 24 hrs, extendable to max 72) | `{ reset_link: 'http://localhost:3000/reset-password?token=...', expires_at: ISO, validity_hours: number, token_raw? (never), hash? (never) }` |
| FR-BE-5 | `POST /api/v1/admin/facilities/{tenant_id}/users/{user_id}/override-password` | `{ new_password: str (min 8) }` | `{ success: true, message: str, sessions_revoked: true }` |

Supporting backend rules:
- FR-BE-1 PATCH: tenant existence verified; unknown `status` rejected (ACTIVE vs RESTRICTED only). `status=RESTRICTED` sets `is_active=false`. `status=ACTIVE` sets `is_active=true`. Tier (Starter/Professional/Enterprise) maps to `subscription_plan_code` ∈ {PLAN-STARTER, PLAN-GROWTH, PLAN-ENTERPRISE}.
- FR-BE-1 currency: if new currency differs from existing, record change in `AuditLog.action = 'TENANT_CURRENCY_CHANGED'`. If `status` toggled, action=`'TENANT_STATUS_CHANGED'`. If name, action=`'TENANT_UPDATED'`.
- FR-BE-2/3: Cross-tenant user-email uniqueness must be enforced per existing DB constraint (uq_tenant_user_email). FR-BE-3 returns 409 with clear detail when adding a user whose email already exists under **that** tenant (NOT globally; other tenants can have the same email per multi-tenant rule).
- FR-BE-3 Roles validation: palette constrained to `["HOSPITAL_ADMIN","PHARMACY_ADMIN","DOCTOR","NURSE","RECORD_CLERK","ACCOUNTANT"]`. Any other role → 422. Empty roles list → 422. Must have ≥1. If created user is HOSPITAL tenant, `PHARMACY_ADMIN` silently maps to ACCOUNTANT? No — REJECT, per explicit palette. Frontend also filters per tenant_type.
- FR-BE-3 auto-generates a one-time random initial password (NOT stored in cleartext — only bcrypt in users.hashed_password), then records AuditLog with change_json including the generated password's SHA-256 fingerprint ONLY.
- FR-BE-4 (generate-reset-link): use `PasswordResetToken` table from password-recovery workflow, but allow `expires_at = NOW() + INTERVAL 'N hours'` (default 24, max 72). Raw token is returned **once** in the HTTP body as `reset_link`; database stores SHA-256 hash only. AuditLog `action='PASSWORD_RESET_ISSUED'` with admin as actor.
- FR-BE-5 (override-password): set `users.hashed_password = get_password_hash(new_password)`, set `prt.user.updated_at`, `used=true/used_at=NOW()` for any currently-outstanding reset tokens issued to that user, then `revoke_all_user_sessions(user_id)` — the super admin's own session is NOT revoked. AuditLog `action='PASSWORD_OVERRIDE_ADMIN'`, actor=super_admin user, target=target user.
- All 5 endpoints return 404 when tenant_id or user_id doesn't exist. Cross-tenant consistency check on FR-BE-3/4/5: the referenced user MUST have `user.tenant_id == tenant_id` otherwise 404 (prevents injection across tenants).

### FR-FE — Frontend Drawer + Tabs

Target page: [facilities/page.tsx](file:///c:/Users/Public/Documents/MEDIPAEDIA/medipaedia/apps/hospital-web/src/app/%28super-admin%29/super-admin/facilities/page.tsx).

#### FR-FE-1: Manage Button Wiring
- Card action *Manage* button at L504 — currently has no onClick. Change to: `onClick={() => { setManagedFacility(fac); setManageDrawerOpen(true); }}`.
- Drawer component: `Modal` with `className="max-w-4xl !rounded-2xl"` (wide drawer).
- Drawer Header: facility name badge + tenant_type badge + tenant_id copy chip.

#### FR-FE-2: Tab A — Facility Profile & Plan (CRUD)
- Prefilled inputs: Facility Name (text), Tier `<select>` {Starter (PLAN-STARTER), Professional (PLAN-GROWTH), Enterprise (PLAN-ENTERPRISE)}, Country (text), Currency (text or select {GHS, XOF, USD}), Status `<select>` {ACTIVE, RESTRICTED}.
- Primary CTA *Save Changes* → PATCH /admin/facilities/{tenant_id}. On success → green toast badge "Facility saved", local facilities state patched with returned `tenant`.
- Secondary danger CTA *Restrict / Deactivate Facility* → calls PATCH endpoint with `{ status: 'RESTRICTED' }`, shows a native browser confirm() before submitting.

#### FR-FE-3: Tab B — Staff & Role Assignments
- On drawer-open (or tab switch), call `GET /admin/facilities/{id}/users`. Render a simple table.
- Columns: Staff Name, Email, Roles (multi-Badge pills: teal HOSPITAL_ADMIN, emerald PHARMACY_ADMIN, cyan DOCTOR, sky NURSE, slate RECORD_CLERK, amber ACCOUNTANT), Status (Active/Restricted), Actions (two buttons: *Generate Reset Link*, *Override Password*).
- "+ Add New Staff Member" expandable form: inputs `full_name, email, license_number (optional), roles (multi-select checkboxes or select-multiple)`.
- Role palette per tenant_type: `tenant_type === 'HOSPITAL' → [HOSPITAL_ADMIN, DOCTOR, NURSE, RECORD_CLERK, ACCOUNTANT]` (no PHARMACY_ADMIN). `tenant_type === 'PHARMACY' → [PHARMACY_ADMIN, ACCOUNTANT]`. CLINIC same as HOSPITAL.

#### FR-FE-4: Tab C — Security & Password Restore
- Mirrors the roster (or renders inline per-staff actions list) with two buttons per row:
  a) **Generate One-Time Reset Link**: POST generate-reset-link → green success `<Card>` with `<Input value={reset_link} readOnly/>` next to a 1-click *Copy Reset Link* button (navigator.clipboard.writeText). Right-side Badge "Valid for 24 hours".
  b) **Instant Temporary Password**: Opens a compact sub-form: new password input + live strength 4-bullet validator (same as /reset-password page: 8 chars, uppercase, number, symbol), plus a confirm password. On submit → POST override-password → emerald success toast: "Temporary password assigned and all sessions revoked. The user MUST change it on first login (future force-change CTA)."

---

## 3. Non-Functional Requirements

| # | NFR | Verification |
|---|---|---|
| NFR-1 | **Authorization**: Every new backend endpoint requires SUPER_ADMIN role. | router-level `Depends(require_super_admin)` already present on admin router; no public routes added. |
| NFR-2 | **Secure reset storage**: Admin-initiated reset tokens use the same SHA-256 pattern (raw NEVER stored, only hash persisted). | Code inspection + same PRT table usage. |
| NFR-3 | **Session hardening**: After `/override-password`, all sessions for target user must be revoked (redis) — same flow as password-reset endpoint. | `revoke_all_user_sessions(target_user)` in override-password handler. |
| NFR-4 | **Audit trail**: Each action (tenant patch, staff create, reset-link generate, password override, status change) writes a unique `AuditLog` row with actor_id = SUPER_ADMIN id, resource_id = target entity id. | 5 distinct actions → `AuditLog.action` in {TENANT_UPDATED, TENANT_STATUS_CHANGED, TENANT_CURRENCY_CHANGED, STAFF_CREATED_BY_ADMIN, PASSWORD_RESET_ISSUED, PASSWORD_OVERRIDE_ADMIN}. |
| NFR-5 | **IDOR protection**: `/users/{user_id}` handlers MUST verify `user.tenant_id == tenant_id`; otherwise return 404 (even if user_id exists elsewhere). | Explicit condition in each endpoint. |
| NFR-6 | **UX response times**: Drawer first paint on click < 100 ms on modern hardware. Staff list fetch < 1.5 s on idle DB. | Smoke-tested during T4; measured via browser perf tooling (not a blocker for build gates). |
| NFR-7 | **Type safety + bundling success**: `pnpm type-check --filter=@medipaedia/hospital-web` exits 0; `pnpm build --filter=@medipaedia/hospital-web` exits 0. | Mandatory build gates, verified in T5. |
| NFR-8 | **Backend parse correctness**: `python -m py_compile admin.py app/schemas/admin.py (and others) exit 0.` | T5 backend gate. |

---

## 4. Constraints, Dependencies, Assumptions, Open Questions

### Constraints
- Use existing shared-ui primitives: `Modal, Button, Badge, Card, Input, Toast, X` (from lucide-react).
- Use existing `@medipaedia/api-client` for all HTTP; never `fetch()` directly for the new endpoints (existing fetch in login is a legacy pattern, new endpoints follow client pattern).
- Tenant model in `app/models/tenant.py` **currently has no `currency` column**. If missing, `country` exists but `currency` does not → **Decision (this spec resolves it):** add `currency` column as nullable `String(10)` default=`GHS` via init_live_db additive patch, same pattern as `roles[]` patch. Never drop existing columns. Never DDL migrations elsewhere.
- If `subscription_plan_code` already exists on Tenant: yes L82 confirmed. Use that field directly for Tier mapping.
- Drawer open/close state lives in page component (local `useState` + no new context).

### Dependencies
- Existing password-recovery workflow completed in activation: `PasswordResetToken` table, `hash_token / generate_secure_reset_token`, `revoke_all_user_sessions`, AuditLog models — all leveraged by BE-4/BE-5.
- Existing admin endpoints pattern: user-facing `Depends(require_super_admin)` router-wide gate.

### Assumptions
- Assumption A1: `Tenant.status` column does not exist in the DB today. We derive it at response time: `status = is_active ? "ACTIVE" : "RESTRICTED"` on read, and on PATCH `status` we set `is_active`. A DB column addition for `status_enum` is out of scope (over-migration).
- Assumption A2: Super Admin creates tenant staff WITHOUT sending them email. The response includes `{ invitation_sent: true }` for forward-compatibility but the implementation will NOT send email in this iteration (it's an audit-log + local BCrypt-created user, staff password randomly generated on backend but NOT returned in response; admin MUST use the Generate Reset Link button to give them access, or Override Temporary Password flow — exactly the UX specified).

### Open Questions (Resolved by Spec, no user input needed)
| # | Question | Resolution |
|---|---|---|
| OQ-1 | Tab ordering: Facility Profile first or Staff first? | Spec requires Tab A Facility → Tab B Staff → Tab C Security. |
| OQ-2 | Drawer label = "Drawer" vs wide Modal? | Use existing Modal component with large `className` override (semantically a drawer, UI is a wide modal). No new Drawer primitive. |
| OQ-3 | Can a tenant's currency be changed after initial onboarding? Yes it can, we record it as a dedicated AuditLog action per NFR-4 so Finance has traceability. | Approved in spec. |
| OQ-4 | FR-BE-3 Create Tenant Staff — if user already exists GLOBALLY (email under another tenant), do we return 409 or allow composite unique (uq_tenant_user_email already exists so different tenant same email is OK)? | **Allow** — composite unique constraint already permits cross-tenant duplicate email, enforced per-tenant unique only. Create a NEW row under the target tenant_id. |
| OQ-5 | Reset link validity_hours default 24 (required) vs option to pick 24/48/72. | Support 24 default, accept `validity` in {24, 48, 72} only → clamped server-side. Badge shows clamped value. |

---

## 5. Acceptance Criteria (AC)

All Acceptance Criteria have a type: **rule** (objectively pass/fail) or **rubric** (evaluative with score threshold).

### Rule Acceptance Criteria

| ID | Rule | Evidence Source |
|---|---|---|
| AC-R1 | Clicking "Manage" on any facility card opens the FacilityManageDrawer with the correct tenant_id loaded into header badge. | Manual UI smoke + onClick handler visible in code. |
| AC-R2 | Drawer has 3 tabs in order: Facility Profile & Plan (CRUD), Staff & Role Assignments, Security & Password Restore. | Code inspection + UI screenshot (text of tabs). |
| AC-R3 | Tab A Save Changes calls `PATCH /api/v1/admin/facilities/{id}` with the edited fields and returns success; local facilities state patches. | Browser Network panel + code handler. |
| AC-R4 | Backend endpoint PATCH /admin/facilities/{id} requires SUPER_ADMIN and returns 403/401 otherwise. | Testclient with & without bearer + unit smoke against dependency. |
| AC-R5 | GET /admin/facilities/{id}/users returns only users with `user.tenant_id == id`. | Postgres fixture: SELECT count under target tenant_id vs query result count. |
| AC-R6 | POST /admin/facilities/{id}/users (staff create) correctly scopes roles palette, 422s on empty or invalid roles, and does NOT return the user's cleartext initial password. | Response body inspection + `change_json` only shows password hash fingerprint. |
| AC-R7 | POST /admin/facilities/{id}/users/{uid}/generate-reset-link returns `reset_link` with token as raw URL param; DB row `password_reset_tokens.token_hash == sha256(raw_token)` and raw never stored (AC-R7 security). | 2-part: API body has raw URL, PRT DB row has digest, digest != raw. |
| AC-R8 | Reset link issued via admin drawer has default validity of 24 hours (expires_at within 24.0 ±0.5 h of NOW()), clamped to 72 hours max when validity param supplied. | Postgres fixture PRT row expires_at - NOW() in range [23.5h, 24.5h] (default) / [71.5h, 72.5h] (72 param). |
| AC-R9 | POST /admin/facilities/{id}/users/{uid}/override-password sets `users.hashed_password` = bcrypt(new_password), revokes target user sessions, leaves SUPER_ADMIN session valid; 400 if password length < 8. | Login success with new password, pre-existing access cookie for target now 401 on /auth/me. |
| AC-R10 | Cross-tenant IDOR guard: calling `/admin/facilities/{OTHER_TENANT_ID}/users/{USER_UNDER_DIFFERENT_TENANT}` returns 404, does not mutate anything. | HTTP unit smoke. |
| AC-R11 | Security actions produce AuditLog rows: for a full flow (create staff → generate reset → override password), at least 3 distinct AuditLog.actions exist for actor=SUPER_ADMIN_ID, with correct entity id references, tenant_id correct, role correct as SUPER_ADMIN. | AuditLog SELECT count(action) >= 3 grouped by actor. |
| AC-R12 | Frontend build gates (hard user requirements): `pnpm type-check --filter=@medipaedia/hospital-web` exit=0 AND `pnpm build --filter=@medipaedia/hospital-web` exit=0. | Command stdout exit code 0 for both, captured in T5. |
| AC-R13 | Backend syntax gates: `python -m py_compile` on ALL modified modules (admin.py, schemas/admin.py OR schemas/tenant.py, any new files) exit 0. | Shell stdout. |
| AC-R14 | UI Tab B "+ Add New Staff" correctly filters the role palette per tenant_type: Pharmacies do not show HOSPITAL_ADMIN/DOCTOR/NURSE options. | Code conditional + browser options inspection. |
| AC-R15 | Tab C "Generate Reset Link" response UI: renders reset_link in a copyable input field, with 1-click Copy Reset Link button that calls `navigator.clipboard.writeText` and green toast "Reset link copied". Clipboard error → red toast. | Code handler + mock clipboard smoke. |
| AC-R16 | Tab C "Instant Temporary Password" sub-form has live 4-rule strength indicator (length≥8, uppercase, digit, symbol) AND confirm-password match; submit button disabled until both pass AND overridden password length ≥ 8. | JS live state checks in client code. |
| AC-R17 | On PATCH /facilities with status=RESTRICTED: tenant `is_active=false` in DB; on status=ACTIVE: is_active=true. | Postgres row select after endpoint call. |

### Rubric Acceptance Criteria

| ID | Rubric (Dimension) | Scale | Low Anchor | Mid Anchor | High Anchor | Threshold | Evidence |
|---|---|---|---|---|---|---|---|
| AC-U1 | UX Usability (drawer + tabs + copy interactions) | 0-2 | 0: tab transitions broken / no loading spinners / no success toasts. | 1: tabs work + actions functional but missing validations / edge-case UX (empty staff state / loading). | 2: tab transitions smooth + skeleton during fetch / success toasts / empty states + copy interaction has visual feedback. | ≥ 1.5 (Usable) | Implementer review screenshot review + QA walkthrough notes. |
| AC-U2 | Security fidelity (non-secret storage, IDOR, session revocation, audit) | 0-2 | 0: raw tokens stored / no session revoke / no audit logs. | 1: hashes stored correctly / sessions revoked / audit present for 2/3 actions OR IDOR check partial. | 2: hashes NOT stored raw / reset+override sessions revoked / ALL 5 actions audited / IDOR returns 404. | = 2 (Maximum — critical security feature) | Code inspection + PRT DB hash diff audit + redis sessions revoked state + AuditLog table. |
| AC-U3 | Code cohesion / repository pattern match | 0-2 | 0: novel patterns introduced that don't match existing admin flows. | 1: works, but duplicated patterns (e.g. raw fetch instead of api-client) in some places. | 2: all endpoints follow existing admin.py router pattern; client methods in @medipaedia/api-client match sibling style exactly; UI Modal usage mirrors UserProfileModal exactly. | ≥ 1.5 (Consistent) | Code review diff vs sibling endpoints. |
