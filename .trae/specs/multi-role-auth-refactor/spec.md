# Multi-Role Multi-Tenant Auth & User Mgmt Refactor - Product Requirements Document

## Overview
- **Summary**: Refactor the authentication & multi-tenant identity foundation to support per-tenant user email uniqueness, multi-role JWT (list-of-roles per user, HOSPITAL_ADMIN + PHARMACY_ADMIN on one identity), facility-selection login flow when an email maps to multiple active tenants, and an admin-scoped user-CRUD surface that hospitals/pharmacies can self-serve. Wire both frontends (hospital-web clinical :3000, pharmacy-pos :3001) to render multi-role badges and adapt role gates to list semantics so dual-hat users see both clinical queues and pharmacy desks.
- **Purpose**: Enable a single operator identity to be a Hospital Admin and also a Pharmacy Admin across the same tenant without maintaining two user records; let an email exist under tenant A (hospital) and tenant B (pharmacy) as two independent memberships with a login facility picker; expose tenant-scoped user CRUD so facility admins manage staff.
- **Target Users**: Super Admin / Hospital Admin / Pharmacy Admin users and clinical + pharmacy frontend components that gate access by role.

## Goals
- Per-tenant email uniqueness; eliminate global unique email constraint on users.
- One User record holds `roles: list[str]` with a backward-compatible `primary_role` getter.
- Login returns a "select facility" 200 response when the email has multiple active user rows across different `tenant_id`s; otherwise issues the JWT with roles list.
- JWT access payload carries `roles` array; refresh token remains unchanged but its metadata is consistent with roles when rotating.
- `require_any_role(*expected_roles)` RBAC check that intersects `current_user.roles` with expected roles + SUPER_ADMIN bypass; old `require_roles` remains as thin alias.
- Tenant-scoped user management endpoints `GET|POST|GET by id|PATCH|DELETE /admin/users` under HOSPITAL_ADMIN / PHARMACY_ADMIN / SUPER_ADMIN.
- Frontend identity renderers (PharmacyHeader, hospital header) show role badges; role checks use `.includes(...)` / `any(...)`.
- OPD queue (clinical /doctor/queue and live triage queue) allows dual-hat `PHARMACY_ADMIN` who also holds `HOSPITAL_ADMIN`, `DOCTOR`, or `SUPER_ADMIN`.
- PostgreSQL migration script drops the unique email constraint, adds `roles` column with `ARRAY[role]` backfill, creates `uq_tenant_user_email` index.
- Additive-only data migration; no destructive rewrite of existing rows.

## Non-Goals
- Patient self-service sign-up refactor (patient account multi-tenancy is untouched; this scope is only staff roles).
- Full SSO / OIDC provider work.
- UI for the multi-role badge management (backend PATCH API is in-scope; a facility-admin UI page is not).
- Rewriting every endpoint role gating; only the shared `require_roles` dependency + new `require_any_role` are updated, so endpoint-level annotations that already call `require_roles(UserRole.X, UserRole.Y)` automatically inherit list-based semantics.
- Changes to `createApiClient` / `@medipaedia/api-client` codegen; hand-synced types for new fields only.

## Background & Context
- Current `User` model enforces global unique email. This is the root blocker for dual-tenant accounts (the same pharmacist cannot hold a separate login for Clinic A vs Pharmacy B).
- `role` is a single Enum column. A single person holding `HOSPITAL_ADMIN` and `PHARMACY_ADMIN` roles today needs two rows (two emails) → confusing UX.
- `require_roles(*allowed)` checks `current_user.role in allowed`. The single-field check will now adapt to a list; backward compatibility is mandatory because 39 call sites depend on it.
- Both apps (`hospital-web` port 3000 Clinical, `pharmacy-pos` port 3001 Pharmacy) already synchronise session via host-only cookies with `Path=/` and `SameSite=Lax`. They currently compare `user.role === 'PHARMACY_ADMIN'` as strict equality → dual-hat users get incorrectly bounced to pharmacy from :3000 even if they're also `HOSPITAL_ADMIN`.
- Live OPD queue block (clinical dashboard + /doctor/queue) currently shows the 403 role-switcher banner for `PHARMACY_ADMIN`; this refactor allows that banner to not appear when a secondary role (`HOSPITAL_ADMIN`, `DOCTOR`, `SUPER_ADMIN`) grants clinical queue access.

## Functional Requirements
- **FR-1**: Postgres data migration drops global unique email, adds `roles TEXT[]` default `ARRAY[]::TEXT[]`, backfills `roles=ARRAY[role]`, creates unique composite index `uq_tenant_user_email (tenant_id, email)`.
- **FR-2**: SQLAlchemy `User` model:
  - removes `unique=True` on `email` column,
  - adds `UniqueConstraint('tenant_id', 'email', name='uq_tenant_user_email')`,
  - changes `role: Enum(UserRole)` → `roles: ARRAY(String(64))` with `default=[]`,
  - keeps a DB-level fall-back `role` column (mapped to a non-null shadow/legacy column + pre-sync via ORM event OR computed `@property primary_role` getter returning `roles[0]` if roles non-empty else legacy role).
- **FR-3**: `/api/v1/auth/login` accepts optional `tenant_id` (body or query parameter). On POST credentials:
  - query `User` rows matching `lower(email)==lower(provided email)` and `is_active=true`,
  - group candidates by `tenant_id` to determine facility list,
  - if 0 matched → 401 bad credentials,
  - if 1 matched → verify password then issue token pair with JWT payload fields `sub=id, email, tenant_id, tenant_name, roles, full_name`,
  - if ≥2 matched AND `tenant_id` provided → pick candidate with `tenant_id==param`, then issue token; if no candidate has that exact tenant → 409 `{ multiple_facilities: true, facilities: [...] }`
  - if ≥2 matched AND `tenant_id` missing → HTTP 200 `{ multiple_facilities: true, facilities: [{id, name, tenant_type, user_roles:[...], primary_role}] }`.
- **FR-4**: `/auth/me` returns `roles: list[str]` and preserves existing fields; primary_role convenience string derived as `roles[0]` or legacy `role` for old callers.
- **FR-5**: `/auth/refresh` rotation preserves role list from decoded refresh token AND re-reads from database to overwrite stale roles; payload `roles` written into new access JWT; both tokens issued with updated `_write_session_cookies` helper (host-only + domain-scoped refresh cookie cross-port on localhost).
- **FR-6**: `require_roles(*allowed_roles: UserRole)` internal logic becomes `any(r in (current_user.roles or []) for r in allowed) OR UserRole.SUPER_ADMIN in current_user.roles`; thin alias `require_any_role(*allowed_roles)` does the same (no SUPER_ADMIN special override when SUPER_ADMIN is NOT in allowed list but user is SUPER_ADMIN → still grants because SUPER_ADMIN bypass is platform invariant).
- **FR-7**: New `users.py` endpoints (mounted in `/api/v1/admin/users`, auth guard `require_roles(HOSPITAL_ADMIN, PHARMACY_ADMIN, SUPER_ADMIN)`) implement:
  - `GET /admin/users?search=&page=&page_size=&role=` list scoped to `current_user.tenant_id` (SUPER_ADMIN can omit tenant filter or scope to all), supports search by email/full_name, filter by single role, SQL limit/offset pagination with total count header or field,
  - `POST /admin/users` → creates new user under current tenant, accepts `{email, full_name, password, roles:[], phone?, license_number?, is_active:true}`, enforces `(tenant_id, lower(email))` uniqueness (returns 409 on conflict),
  - `GET /admin/users/{user_id}` → read full profile (roles, tenant, license, active flag) scoped to tenant (404 if outside current_tenant unless super),
  - `PATCH /admin/users/{user_id}` → modifies `full_name, roles, is_active, phone, license_number` only; password reset as separate explicit 2FA endpoint is out of scope but setting password via PATCH for admins can be accepted on same route,
  - `DELETE /admin/users/{user_id}` → soft delete: sets `is_active=false` (SUPER_ADMIN cannot be disabled by non-SUPER); optionally dissociates tenant if scope demands, but primary semantics = soft disable.
- **FR-8**: PharmacyHeader + Hospital Header render assigned roles as comma/`•`-joined badges, e.g. `Hospital Admin • Pharmacy Admin` under the facility name in the header row; role comparisons use `.includes(...)` instead of `===` to enable dual-hat users.
- **FR-9**: Clinical middleware redirect for pharmacy roles only fires when NONE of the clinical-enabling roles are in `user.roles` (clinical list = `SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, RECORD_CLERK, HOSPITAL_FINANCE, RECEPTION`). A user who is `PHARMACY_ADMIN` + `HOSPITAL_ADMIN` will NOT be redirected to :3001.
- **FR-10**: Live OPD Queue 403 banner renders ONLY when `user.roles` has `PHARMACY_ADMIN` AND `user.roles` does not intersect `{HOSPITAL_ADMIN, DOCTOR, SUPER_ADMIN}`. If any overlap exists the queue loads normally and the banner is hidden.

## Non-Functional Requirements
- **NFR-1 Backward Compatibility**: Existing endpoints calling `require_roles(UserRole.X)` keep functioning (same FastAPI Depends signature). Single-role legacy users migrated to `roles=[legacy_role]` so the `current_user.role → roles[0]` identity holds post-migration.
- **NFR-2 Additive Migration**: Existing `users.role` column kept as nullable shadow; migration adds new roles column + index; no DROP of role column in v1 refactor so rollback is safe; if new column is empty the ORM model synthesizes value as `[role_value]` using `@property` + loader.
- **NFR-3 Postgres-only**: ARRAY(String) explicitly uses `postgresql.ARRAY` dialect. SQLite memory tests (if any) are out of scope; monorepo targets only Postgres for live data.
- **NFR-4 Role stability**: JWT `roles` written once at mint; during rotation refreshed from DB so PATCH role changes take effect on next token refresh (max ACCESS_TOKEN_EXPIRE_MINUTES = 60 min).
- **NFR-5 Security**:
  - User creation enforces `roles` subset of `UserRole.*` values; rejects arbitrary unknown string roles with 422.
  - Password hashing uses existing `pwd_context`; never writes plaintext.
  - Deletion semantics are soft (`is_active=false`) to preserve audit logs.
- **NFR-6 Audit**: `AuditLog` writes on every POST/PATCH/DELETE admin/users mutation with current_user.id as actor, resource_type=`user`, resource_id=target user.id, changes_json=field diffs.
- **NFR-7 Frontend bundle impact**: Role badges are static text renders; no heavy emoji/icons; pharmacy-pos build bundle should not grow by >+3 kB after changes.
- **NFR-8 Type safety**: `pnpm type-check --filter=@medipaedia/pharmacy-pos` exits 0 after all changes.

## Constraints
- **Technical**:
  - Use existing `@medipaedia/api-client` + `createApiClient()` patterns; no changes to OpenAPI generator.
  - Use existing `deps.get_current_tenant` tenant-context chain; do not duplicate header parsing.
  - Do NOT touch `PatientAccount` multi-facility cards (patient facility switching already works; this scope is staff).
  - Preserve existing cookie-writing helper semantics (`_write_session_cookies` / `_clear_session_cookies`).
- **Business**:
  - SUPER_ADMIN bypass: every RBAC check grants if user holds SUPER_ADMIN (unless check is strictly SUPER_ADMIN-only e.g. require_super_admin).
  - Only users with both PHARMACY_ADMIN + at least one clinical role can view clinical queues; pure pharmacy-role users see pharmacy redirect/403 banner.
  - Allowed roles on user creation can include multiple from `{SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, HOSPITAL_FINANCE, RECORD_CLERK, PHARMACY_ADMIN, PHARMACY_FINANCE, SUPERINTENDENT_PHARMACIST, PHARMACIST, TENANT_ADMIN, PATIENT}` (PATIENT role is normally not issued through admin CRUD but validator allows it for completeness).
- **Dependencies**:
  - Backend uses SQLAlchemy async, PostgreSQL, `alembic` or direct init-live-db patching.
  - `scripts/dev-all.mjs` keeps launching ports 8000/3000/3001/3002.
  - Existing Next.js middlewares on 3000/3001 continue to function; port redirects are scoped gating logic inside them.

## Assumptions
- Database migrations are applied through the existing `init_live_database` startup idempotent executor OR a one-shot SQL script placed inside `services/core-api/migrations/` that is invoked as part of DB setup.
- All monorepo apps run on localhost with the cross-port cookie chain we previously wired (host-only cookies); this refactor reuses those helpers.
- Super Admin users always have `tenant_id = None`; the uniqueness constraint `uq_tenant_user_email(tenant_id, email)` will allow multiple SuperAdmin global rows that share NULL tenant_id (because standard SQL unique indices treat NULLs as distinct). If a tighter global uniqueness is wanted for super admins, it should use a partial index; this scope deliberately does NOT add it.
- Dual-role access across hospitals + pharmacies on the same `tenant_id` is via a single User row with `roles=[HOSPITAL_ADMIN, PHARMACY_ADMIN]`; cross-tenant same-email scenarios use multiple User rows with same email under different `tenant_id`s and the login facility selector from FR-3.
- `primary_role` will be used by legacy serializers and UIs that still expect a scalar string; callers are encouraged to migrate to `roles`.

## Open Questions
- [ ] Is a separate `/admin/users/{id}/reset-password` endpoint required in this refactor, or can `PATCH` accept a `password` field for facility admins? Current spec leans: accept password in PATCH; hashed with `pwd_context` only if set.
- [ ] Do we want to allow admin CRUD users to elevate another user to SUPER_ADMIN through the tenant-scoped endpoint? Current decision: only SUPER_ADMIN callers can assign SUPER_ADMIN in the roles list; if a non-super tries to assign SUPER_ADMIN, the endpoint strips it from the list before persisting, or returns 403 if strict is preferred. Spec default = strip silently with audit note unless user opts for strict 403.
- [ ] Do we keep a legacy `role` column as writable column (synced to roles[0]) for backward-compatible queries, or make it a `@property`/hybrid_property? Spec leans: keep as physical column (nullable) for safety, ORM event listener syncs roles[0] back to role on write.

## Acceptance Criteria

### AC-1: Users model adds roles array + composite unique constraint
- **Type**: `rule`
- **Given**: A clean core-api process after migration runs
- **When**: `users` table is inspected via `\d users` or SQLAlchemy metadata
- **Then**: `users` has column `roles TEXT[] NOT NULL DEFAULT '{}'`, global unique key `users_email_key` is absent, index `uq_tenant_user_email (tenant_id, email)` exists, and `primary_role` property returns first non-empty role.
- **Pass Condition**: SQL `SELECT attname, attnotnull, atthasdef FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname IN ('role','roles')` shows roles column; `SELECT indexname FROM pg_indexes WHERE tablename='users'` returns uq_tenant_user_email and does not return `users_email_key`; 2 rows with same email different tenant_ids can exist without duplicate key violation; 2 rows with same email same tenant_id CANNOT exist.
- **Evidence**: Postgres SQL inspection output + SQL insert statements results log; pydantic schema AuthMeResponse includes roles list.

### AC-2: Login returns facility selector when multiple tenants match
- **Type**: `rule`
- **Given**: Two active User rows under different tenant_ids share email `appiah@nakwillies.com`: one under Nakwillies Clinic (`HOSPITAL_ADMIN`), one under Nakwillies Drugs (`PHARMACY_ADMIN`)
- **When**: `POST /api/v1/auth/login` is invoked with `{email, password}` but NO tenant_id
- **Then**: HTTP 200 response body `{ multiple_facilities: true, facilities: [{id:UUID, name, tenant_type, user_roles:[...], primary_role}, {id:UUID, ...}] }`, no tokens issued, no cookies written.
- **Pass Condition**: Replayed curl shows `multiple_facilities=true` with exactly 2 facility entries; response does not include `access_token`; cookie headers are empty. When request is replayed with correct `tenant_id=<clinic>` then password is verified and tokens are issued with roles=[HOSPITAL_ADMIN]; replayed with `<pharmacy>` tokens issued with roles=[PHARMACY_ADMIN].
- **Evidence**: curl log / pytest-style request/response dumps for three cases.

### AC-3: Multi-role JWT + require_any_role allows dual-hat users
- **Type**: `rule`
- **Given**: One User row under tenant Nakwillies with `roles = [HOSPITAL_ADMIN, PHARMACY_ADMIN]` and correct password.
- **When**: `POST /auth/login` → access token is decoded; a request hits an endpoint guarded with `require_roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN)` using this access JWT.
- **Then**: Decoded payload has `roles == ["HOSPITAL_ADMIN","PHARMACY_ADMIN"]` and a clinical endpoint guard permits the call.
- **Pass Condition**: JWT claims contain `roles` array exactly as stored; endpoint returns 200 vs 403 on a dual-hat user vs a pure-PHARMACY_ADMIN-only user.
- **Evidence**: PyJWT decode output of access token; two HTTP hits showing dual-hat passes gate, single-role fails gate.

### AC-4: Admin user CRUD tenant scoped
- **Type**: `rule`
- **Given**: Two tenants `tenantA` and `tenantB`. `adminA@a.com` (HOSPITAL_ADMIN) under tenantA; `adminB@b.com` under tenantB.
- **When**: adminA calls `GET /admin/users`, `POST /admin/users {email:'shared@a.com'}`, then `DELETE /admin/users/{created_user_id}`; adminB tries to `GET /admin/users/{id_from_tenantA}`.
- **Then**:
  1. GET list returns only users in tenantA (or scope) with total count matching.
  2. POST creates a user in tenantA with roles list; same `shared@a.com` can be created under tenantB later without 409, but 2nd attempt under tenantA yields 409 Conflict `{code:'TENANT_EMAIL_NOT_UNIQUE'}`.
  3. DELETE sets is_active=false on target user row; audit log contains resource_type user.
  4. adminB attempting to read tenantA scoped user -> 404 or 403.
- **Pass Condition**: All four conditions return the expected status codes; DB rows reflect is_active=false, tenant_id correct, roles stored as array.
- **Evidence**: HTTP status logs + PostgreSQL row snapshots.

### AC-5: Frontend role gates use list semantics and render badges
- **Type**: `rule`
- **Given**: User logged into :3000 with `roles = ["PHARMACY_ADMIN","HOSPITAL_ADMIN"]`
- **When**: Navigate to `/`, look at header pill, then hit live OPD queue card, then try the 403 role-switcher banner path.
- **Then**: Header shows roles joined with `•` (e.g. "Hospital Admin • Pharmacy Admin"). Middleware does NOT redirect to :3001. OPD queue loads and displays data. 403 pharmacy banner is absent.
- **Pass Condition**: Visual banner absence + middleware redirect skipped for dual-hat users; `t('.roles')` renders both badges; single-role user `PHARMACY_ADMIN` still redirected correctly.
- **Evidence**: Snapshot of header pills, log of middleware pass-through, OPD queue rows visible.

### AC-6: Pharmacy-pos type-check + build pass
- **Type**: `rule`
- **Given**: Refactor changes applied to pharmacy-pos and any shared ui package.
- **When**: `pnpm type-check --filter=@medipaedia/pharmacy-pos` then `pnpm build --filter=@medipaedia/pharmacy-pos`
- **Then**: Both exit 0.
- **Pass Condition**: tsc --noEmit exit 0; Next.js build 37/37 routes generated exit 0.
- **Evidence**: Terminal log / command exit codes.

### AC-7: Pharmacy-pos bundle impact minimal
- **Type**: `rubric`
- **Dimension**: Bundle size delta (pharmacy-pos client bundle JS gzipped, kB) after adding role-badge render + roles.includes() gates
- **Scale**: 0-2
  - `0`: bundle grew > 20 kB gz or build fails
  - `1`: bundle grew 5-20 kB but all build checks pass
  - `2`: bundle growth <= 5 kB gz and render time unchanged (no new network calls / heavy icon libs)
- **Pass Threshold**: >= 2
- **Evidence**: `.next/build-manifest.json` diff or Next.js build table summary line comparing with baseline run.
