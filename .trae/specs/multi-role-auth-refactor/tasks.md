# Multi-Role Multi-Tenant Auth & User Mgmt Refactor - Implementation Plan

## Task 1: Database model + migration patch (User roles array + tenant-unique email)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Update `User` SQLAlchemy model:
    * remove global unique=True on `email` column,
    * add `UniqueConstraint("tenant_id", "email", name="uq_tenant_user_email")`,
    * add `roles = Column(postgresql.ARRAY(String(64)), nullable=False, default=list)`,
    * keep legacy `role` Enum column nullable for backward-compat with older data queries, add ORM `@listens_for(User, "before_insert") @listens_for(User, "before_update")` event that syncs `role := roles[0] if roles else role` and back-fills empty roles `roles := [role.value]` when old scalar role is set and roles is empty.
    * Add `@property primary_role` returning `(self.roles or [self.role.value if self.role else None])[0] if (self.roles or (self.role and [self.role.value])) else None`.
  - Create a `services/core-api/app/db/migrations/202609030001_roles_multi_tenant_user.py` (or append to init_live_database idempotent patch executor) that runs:
    * `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;`
    * `CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_user_email ON users(tenant_id, email);`
    * `ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[];`
    * `UPDATE users SET roles = CASE WHEN role IS NOT NULL THEN ARRAY[role::TEXT] ELSE ARRAY[]::TEXT[] END WHERE roles IS NULL OR array_length(roles, 1) IS NULL;`
    * Add guard `IF NOT EXISTS` on every DDL.
  - Update `AuthMeResponse`, `TokenPairResponse` schemas: add `roles: list[str]` and (convenience) `primary_role: str | None` so older callers can still read a single role string.
  - Ensure super admin queries (where tenant_id = None) still work as distinct under composite index.
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-1.1: `python -m py_compile app/models/user.py && python -m py_compile app/schemas/auth.py` → exit 0.
  - `rule` TR-1.2: Against live Postgres (via uvicorn start) after init_live_database runs, `pg_attribute` has `roles`; `pg_indexes` contains `uq_tenant_user_email`; `users_email_key` is missing; insert two users `(email=dup@t, tenant_id=A, roles=[HOSPITAL_ADMIN])` and `(email=dup@t, tenant_id=B, roles=[PHARMACY_ADMIN])` returns success; inserting same email and same tenant_id returns `IntegrityError` / 409.
  - `rule` TR-1.3: Existing legacy user row (inserted with only scalar role set, no roles) when loaded via `db.execute(select(User)).scalar().primary_role` returns scalar role value as string, `.roles` returns list of length 1.
- **Notes**: Model update must run BEFORE auth router edits because auth.py imports User.

## Task 2: Auth /login → facility picker, multi-role JWT, refresh rotation preserves roles
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Refactor `login_staff` POST `/login` in `auth.py`:
    * accept optional `tenant_id: Optional[str] = Body(None, embed=True)` or form param;
    * select User rows `WHERE lower(User.email)==lower(email) AND is_active=true` (eagerly load tenant.name);
    * 0 rows → 401; 1 row → verify password → issue token (see next bullet); ≥2 rows:
      - if `tenant_id` provided AND candidate matches → use candidate;
      - else return HTTP 200 `{ multiple_facilities: true, facilities: [{id, name, tenant_type, user_roles, primary_role}] }`.
    * On success path, build JWT claims dict: `{ type:access, sub:user.id, email, tenant_id, tenant_name, roles, full_name }` and refresh claims dict the same way.
  - Update `/auth/me` to include `roles: list[str]`, `primary_role: str | None` in its response schema.
  - Update `/auth/refresh` rotation: decode refresh, re-read User from DB, rebuild roles list from DB row so role edits take effect on rotation, write host-only cookie pair + domain-scoped duplicates with `_write_session_cookies`.
  - Ensure patient logins `/patient/login` and patient registration continue to set `roles=[UserRole.PATIENT]` via model auto-fill event; `primary_role` returns PATIENT.
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-2.1: `python -m py_compile auth.py onboarding.py` exit 0; `pnpm --filter=@medipaedia/hospital-web type-check` not broken by changes.
  - `rule` TR-2.2: Three-curl sequence (see AC-2) produces: first call → 200 with `multiple_facilities=true` and 2 facilities; second call with `tenant_id=<clinic>` → 200 token + JWT decoded roles==`[HOSPITAL_ADMIN]`; third call `<pharmacy>` → roles==`[PHARMACY_ADMIN]`.
  - `rule` TR-2.3: `/auth/me` response returns `roles` array matching DB storage and `primary_role == roles[0]`.
  - `rule` TR-2.4: `/auth/refresh` returns new access JWT where `roles` equals current DB roles (not stale decoded refresh roles).
- **Notes**: Cookie-write only happens after password is verified. For multi-facility intermediate 200 response, NO cookies are written.

## Task 3: RBAC dependency refactor → require_any_role + backfill require_roles to lists
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - In `app/core/deps.py` update `require_roles(*allowed_roles: UserRole)` internal logic to:
    ```py
    user_roles_normalized = [UserRole(r) for r in (current_user.roles or []) if isinstance(r, str)] if current_user.roles else ([current_user.role] if current_user.role else [])
    role_values = {r.value for r in user_roles_normalized}
    allowed_values = {r.value for r in allowed_roles}
    if UserRole.SUPER_ADMIN.value in role_values: return current_user
    if role_values & allowed_values: return current_user
    raise HTTPException(403, ...)
    ```
    (Treats missing `roles` field and legacy scalar role correctly.)
  - Add new factory `def require_any_role(*expected_roles: UserRole) -> Callable` with identical logic (acts as alias; primary difference is call-site semantics).
  - Fix all call sites that use `user.role.value == "..."` equality checks in endpoint logic (e.g. pharmacy_admin endpoint handlers that gate with `current_user.role == UserRole.PHARMACY_ADMIN`) to use sets: `any(r.value in {UserRole.PHARMACY_ADMIN.value,UserRole.SUPER_ADMIN.value} for r in (current_user.roles or []))` OR wrap with helper:
    ```py
    def user_has_role(user: User, *roles: UserRole) -> bool:
        rs = set(roles)
        return UserRole.SUPER_ADMIN in rs or any((UserRole(r) if isinstance(r,str) else r) in rs for r in (user.roles or []))
    ```
  - Keep `require_super_admin` check to ONLY `UserRole.SUPER_ADMIN in roles` exactly (no bypass for other roles).
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-3.1: `py_compile deps.py + endpoints/*` that imported require_roles → exit 0; endpoint tests via synthetic DB: dual-hat user `roles=[HOSPITAL_ADMIN, PHARMACY_ADMIN]` passes `require_roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN)` guard; pure PHARMACY_ADMIN user returns 403.
  - `rule` TR-3.2: `require_any_role(UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR)` produces same pass/fail results for the same user.
  - `rule` TR-3.3: SUPER_ADMIN-only endpoint (require_super_admin) returns 403 when user is HOSPITAL_ADMIN, passes when SUPER_ADMIN is in roles array.
- **Notes**: Search codebase for `user.role ==` or `current_user.role.value ==` outside of Depends scope and replace with helper.

## Task 4: Admin User Management CRUD endpoints `/api/v1/admin/users`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1, 3
- **Description**:
  - Create new module `endpoints/users.py` (rename existing stub if one exists; otherwise create + import into v1 router) OR extend existing `endpoints/admin.py` with the endpoints under a prefix using a sub-router pattern. Plan: create `app/api/v1/endpoints/admin_users.py` because admin.py already has a `require_super_admin` router-level dependency, and user-CRUD here is tenant-scoped for HOSPITAL_ADMIN / PHARMACY_ADMIN too.
  - Define schemas in `schemas/admin.py` or new `schemas/users.py`:
    * `AdminUserCreateRequest(email, full_name, password, roles: list[str], phone?, license_number?, is_active: bool = True)`
    * `AdminUserUpdateRequest(full_name?, roles?: list[str], is_active?: bool, phone?, license_number?, password?: str)`
    * `AdminUserResponse(id, tenant_id, email, full_name, roles, primary_role, phone, license_number, is_active, created_at, updated_at)`
    * `AdminUserListResponse(items: list[AdminUserResponse], total: int, page: int, page_size: int)`
  - Mount at router prefix `/admin/users` with Depends guard `require_roles(HOSPITAL_ADMIN, PHARMACY_ADMIN, SUPER_ADMIN)`:
    1. `GET /admin/users` →
       * scope = `current_user.tenant_id` if not SUPER_ADMIN else optional `tenant_id` query param;
       * search `ilike` by email/full_name;
       * filter `:param role` if provided;
       * pagination `page/page_size` with LIMIT/OFFSET + `count(*)` total;
       * order by `updated_at DESC`.
    2. `POST /admin/users` →
       * enforce roles subset of `UserRole.*` values (strip any values not in enum);
       * non-SUPER_ADMIN cannot assign SUPER_ADMIN role (strip silently OR return 403? see open questions; default = strip SUPER_ADMIN from list for non-SUPER callers);
       * check `(tenant_id, lower(email))` uniqueness using select first → if exist return HTTP 409 with `detail/code: 'TENANT_EMAIL_NOT_UNIQUE'`.
       * hash password via `pwd_context.hash(req.password)`;
       * write AuditLog CREATE_USER.
    3. `GET /admin/users/{user_id}` → load + tenant scoping → 404 if outside scope else response.
    4. `PATCH /admin/users/{user_id}` → if password supplied, hash it; role list validated same as create; if downgrading super_admin or target is SUPER_ADMIN caller must be SUPER_ADMIN; write AuditLog with changes_json diff.
    5. `DELETE /admin/users/{user_id}` → soft delete: set `is_active=False`; SUPER_ADMIN cannot be disabled by non-SUPER; AuditLog DELETE_USER.
  - Register router in v1 `router.py` imports.
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-4.1: `py_compile admin_users.py schemas/admin.py router.py` exit 0; uvicorn /openapi.json shows 5 endpoints under `/admin/users`.
  - `rule` TR-4.2: Sequence from AC-4 returns 409 on duplicate tenant+email create; allows same email across tenants; DELETE is soft; adminB attempting access tenantA user returns 403/404.
  - `rule` TR-4.3: non-SUPER caller cannot grant SUPER_ADMIN via PATCH; patch attempt leaves roles without SUPER_ADMIN in DB (strip behavior).
  - `rule` TR-4.4: AuditLog entries exist after POST/PATCH/DELETE.
- **Notes**: Use existing deps (get_current_user, get_current_active_tenant, require_roles). Add helper `def current_tenant_scope(current_user, header?) -> uuid|None` to keep DRY.

## Task 5: Frontend — adaptive role gates (Clinical/hospital-web :3000)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 2, 3
- **Description**:
  - Update `apps/hospital-web/src/middleware.ts` redirect rules for pharmacy roles:
    * decode token to list of user roles (supports both `role: string` legacy + `roles: string[]` new — normalize to `const roles = payload.roles ?? (payload.role ? [payload.role] : [])`);
    * clinicalRolesWhitelist = `['SUPER_ADMIN','HOSPITAL_ADMIN','DOCTOR','NURSE','RECORD_CLERK','HOSPITAL_FINANCE','RECEPTION']`;
    * Redirect rule only fires when roles list is NON-empty AND `roles.includes('PHARMACY_ADMIN') || roles.includes('PHARMACIST') || roles.includes('SUPERINTENDENT_PHARMACIST') || roles.includes('PHARMACY_FINANCE')` AND `!roles.some(r => clinicalRolesWhitelist.includes(r))`. In plain English: pharmacy-only users → redirect.
  - Update useAuth hook / types in `packages/api-client` and/or `apps/hospital-web/src/lib/auth.ts` (whatever provides `user` object) to expose `roles: string[]` and `primaryRole?: string` getters, synthesizing from legacy single role if backend still returns scalar.
  - Update `(clinical)/page.tsx` Live OPD queue 403 banner render condition:
    * `const roles = user?.roles ?? (user?.role ? [user.role] : [])`
    * `const showPharmacyBanner = httpStatus === 403 || (roles.includes('PHARMACY_ADMIN') && !['HOSPITAL_ADMIN','DOCTOR','SUPER_ADMIN'].some(r => roles.includes(r)))`
    * Banner shows pharmacy CTA only for pure PHARMACY roles, not dual-hat users.
  - Update `apps/hospital-web/src/app/(doctor)/doctor/queue/page.tsx` identically.
  - Hospital header pill rendering → render roles badges separated with `•`: e.g. `Hospital Admin • Pharmacy Admin` (uses existing badge component pill styles).
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-5.1: `pnpm --filter=@medipaedia/hospital-web type-check` exit 0.
  - `rule` TR-5.2: Browser sim:
    * User `roles = ['PHARMACY_ADMIN']` → middleware redirects to `:3001/pharmacy-admin`.
    * User `roles = ['PHARMACY_ADMIN','HOSPITAL_ADMIN']` → NO redirect; live queue loads.
    * OPD queue with pure pharmacy role shows role switcher banner.
  - `rubric` TR-5.3: Rendering clarity of role badges (readability in narrow viewport, no overflow wrapping to 3+ lines); scale 1-5 anchors 1=no badge / truncation, 3=visible with wrapping, 5=two-line at most, visible truncation only at very small widths; threshold >=4. Evidence = screenshot of header with both roles shown side by side.
- **Notes**: Add helper `userHasAnyRole(user, ...roles): bool` to `apps/hospital-web/src/lib/auth.ts` and reuse across middleware + banner conditions.

## Task 6: Frontend — Pharmacy POS identity & gates (:3001)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 2, 5 (shares auth type updates)
- **Description**:
  - `PharmacyHeader.tsx` identity resolver:
    * return roles array (normalized) as `user.roles ?? (user.role ? [user.role] : [])` (matches clinical whitelist pattern).
    * Render role badges as comma / `•` joins (similar to header pill in Task 5 but left side of avatar area).
    * Change role comparisons from `user.role === 'PHARMACY_ADMIN'` to `roles.includes('PHARMACY_ADMIN')` for pharmacy-specific UI elements (superintendent pills, finance pills, any role-based dashboard cards).
    * Facility tenant rendering remains unchanged.
  - `apps/pharmacy-pos/src/middleware.ts` (if present) or auth gating on pharmacy routes, redirect clinicians that do not hold any pharmacy role back to `:3000` based on roles list, similar to Task 5 mirror logic.
- **Acceptance Criteria Addressed**: AC-5, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-6.1: `pnpm type-check --filter=@medipaedia/pharmacy-pos` exit 0.
  - `rule` TR-6.2: Header visual shows role badges for dual-hat user; pure HOSPITAL_ADMIN user is redirected (if middleware exists) when hitting pharmacy routes.
  - `rubric` TR-6.3 (ties AC-7): build size delta <= 5 kB gz. Build summary line diff from `Next.js 14.2.10` build output tables, or if hard to compare, run two builds baseline vs current and capture `.next/build-manifest.json` aggregate `gzipSize` delta of `pages/_app` + `layout` chunks. Threshold >= 2 (per scale 0-2 above). Evidence = console log from build.
- **Notes**: Do NOT remove old scalar `role` field from api-client types; keep optional union `role?: string, roles?: string[]` so backends that still emit old field are fine.

## Task 7: Verification & sanity wrap
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-6
- **Description**:
  - Reproduce DB fixture for verification scenario (two tenants, one shared email, one dual-hat user) using a SQL script that runs inside core-api container or psql.
  - Run pharmacy-pos commands per user spec: `pnpm type-check --filter=@medipaedia/pharmacy-pos`, `pnpm build --filter=@medipaedia/pharmacy-pos`.
  - Optional (nice to have): hospital-web type-check + build, to ensure middleware/header changes didn't break.
  - Final sanity start: `pnpm dev`, uvicorn shows no ImportError, `GET /docs` lists admin/users endpoints.
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `rule` TR-7.1: Two `pnpm` commands exit 0.
  - `rule` TR-7.2: psql fixture (from AC-4.2 step) shows unique index enforcement as expected; duplicate same-tenant-email → constraint violation error.
  - `rule` TR-7.3: Uvicorn startup completes (no ImportError) → logged line `[*] Starting {Project_Name} v{Version}`.
- **Notes**: If local Postgres isn't available, write evidence of schema.py + migration SQL + py_compile + tsc checks.

## Issue Placeholder (for Review Phase)
<!-- Independent Review findings will insert Issue I-* items below after R1. -->
