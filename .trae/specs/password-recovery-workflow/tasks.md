# Password Recovery Workflow — Implementation Tasks

Map every Rule/Rubric AC from spec.md to atomic TRules/TRubrics; dependency-ordered; priority = high for DB + auth endpoints (T1, T2) as gating items, medium for frontends (T3, T4), high for verification T5.

---

## Task 1: Backend — password_reset_tokens ORM model + idempotent DDL
**Priority**: high
**Status**: pending
**ACs covered**: AC-R1 (partial table exists post-boot, composite UNIQUE + indexes enforced)
**Dependency**: None (foundational DDL)

### TRules (T1 Rule TRs)
- **TR1.1**: New ORM model `PasswordResetToken` declared in `app/models/user.py` (or a sibling module imported into `app/models/__init__.py`). All required columns present: `id (UUID PK)`, `token_hash TEXT UNIQUE NOT NULL`, `user_id UUID FK users.id NOT NULL`, `tenant_id UUID FK tenants.id NULLABLE`, `email_address TEXT NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+15min`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `used BOOLEAN DEFAULT false`, `used_at TIMESTAMPTZ`, `client_ip TEXT`, `user_agent TEXT`.
- **TR1.2**: Additive-only `async def _apply_password_reset_tokens_patch(session: AsyncSession)` inside `app/db/init_live_db.py` that runs early (before seed) with: `CREATE TABLE IF NOT EXISTS password_reset_tokens (...)`, then `CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens(user_id)`, then `CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_tokens_hash ON password_reset_tokens(token_hash)`. Never drops columns.
- **TR1.3**: Same module (or `app/models/user.py`) adds `relationship("PasswordResetToken", back_populates="user")` on `User.password_resets`. `PasswordResetToken.user` relationship back_populates `User.password_resets`; `ondelete="CASCADE"` so user purge cascades.
- **TR1.4**: `python -m py_compile app/models/user.py app/db/init_live_db.py` → 0.

### TRubrics (T1 Rubric TRs)
- **TRub1.1 Cohesion (≥1.5)**: DDL style mirrors `_apply_roles_multi_tenant_user_patch` (same logging, try/except, wrapped in `text()`, additive only). Score evidence: spot-check side-by-side.

---

## Task 2: Backend — security.py token hashers + auth.py forgot/reset endpoints
**Priority**: high
**Status**: pending
**ACs covered**: AC-R1 (hash format), AC-R2 expiry, AC-R3 anti-enumeration, AC-R4 single-use, AC-R5 password update, AC-R6 sessions revocation, AC-R7 auditlog, AC-R11 backend compile.
**Dependency**: T1 completed (models + DDL in place)

### TRules (T2 Rule TRs)
- **TR2.1 security.py**: Add `hash_token(raw_token: str) -> str` returning `hashlib.sha256(raw_token.strip().encode()).hexdigest()` (case-insensitive strip). Add `generate_secure_reset_token() -> tuple[str, str]` using `secrets.token_hex(32)` as raw; returns `(raw, hash_token(raw))`.
- **TR2.2 schemas/auth.py**: Add `ForgotPasswordRequest{ identifier: str }` (min_length=2, max_length=255); `ForgotPasswordResponse{ sent: bool=True, message: str }`; `ResetPasswordRequest{ token: str(min=16), new_password: str(min_length=8) }`; `ResetPasswordResponse{ success: bool, message: str }`.
- **TR2.3 auth.py `POST /forgot-password`**:
  - Public (no Depends). Canonical identifier resolution: if looks-like-email → lower(email) match on users.email; else → attempt staff_profile council_pin match → user.
  - Staff-only guard: matched user role primary NOT `PATIENT`; if patient → treat as non-match (silent).
  - Explicit `await asyncio.sleep(0.1)` after DB hit to foil timing side-channels.
  - Always return HTTP 200 `ForgotPasswordResponse(sent=True, message=...)` regardless of match.
  - On real match: mint token via `generate_secure_reset_token()`; `INSERT PasswordResetToken(user_id, tenant_id, email_address, expires_at=NOW()+15min, client_ip=request.client.host if request.client else None, user_agent=request.headers.get('user-agent'))`; `logger.info("password_reset_issued: %s -> http://localhost:3000/reset-password?token=%s (email=%s)", user_id, raw_token, email)`; write AuditLog `PASSWORD_RESET_ISSUED` (actor=user, resource=UserSecurity).
- **TR2.4 auth.py `POST /reset-password`**:
  - Public (no Depends). Compute `digest = hash_token(req.token)`. Query `SELECT * FROM password_reset_tokens WHERE token_hash = digest AND used=false AND expires_at > NOW() LIMIT 1`. Row missing → HTTP 400 detail "Reset token is invalid or has expired. Please request a new password reset link."
  - Else: `UPDATE users SET hashed_password = get_password_hash(req.new_password), updated_at = NOW() WHERE id = user_id`. `UPDATE password_reset_tokens SET used=true, used_at=NOW() WHERE id=prt.id`. `COMMIT` both together.
  - Immediately revoke all sessions: call shared `revoke_all_user_sessions(str(user_id))`.
  - Write AuditLog `PASSWORD_RESET_CONSUMED`.
  - Return 200 `{ success: true, message: "Your password has been updated. Sign in with your new credentials." }`.
- **TR2.5**: `py_compile app/core/security.py app/schemas/auth.py app/api/v1/endpoints/auth.py` → 0.

### TRubrics (T2 Rubric TRs)
- **TRub2.1 Security Fidelity (≥2.0)**: All 6 NFRs honored (digest only, anti-enumeration, timing sleep, one-use, post-reset session kill, patient blocked, audit). Requires binary pass. Evidence: trace per-NFR through code lines.
- **TRub2.2 Cohesion (≥1.5)**: Route style matches existing `change_password` (same `Depends(get_db)`, same `AuditLog(id=uuid.uuid4(), ...)` construction, same `response_model=` return patterns). Evidence: diffs-side-by-side.

---

## Task 3: Frontend UI — @medipaedia/ui & hospital-web (clinical teal)
**Priority**: high
**Status**: pending
**ACs covered**: AC-R8 routes, AC-R9 reset validation, AC-R10 type-check/build, AC-U1 usability.
**Dependency**: T2 endpoints exist (for API client wiring)

### TRules (T3 Rule TRs)
- **TR3.1 @medipaedia/ui `HardenedLoginForm.tsx`**:
  - Props: add optional `onForgotPassword?: () => void` to `HardenedLoginFormProps`.
  - Existing `<a href="#" onClick={e.preventDefault()}` (the forgot-password anchor) → if `onForgotPassword` prop given → `onClick={(e) => { e.preventDefault(); onForgotPassword?.() }}`; else keep no-op.
  - Ensure `packages/ui` type-check passes after prop add.
- **TR3.2 `packages/api-client`**:
  - Extend `client.ts MedipaediaApiClient` with `forgotPassword(identifier: string): Promise<{sent:boolean,message:string}>` and `resetPassword(token: string, new_password: string): Promise<{success:boolean,message:string}>` calling the two new endpoints.
  - Extend `types.ts` with `ForgotPasswordPayload`, `ForgotPasswordResponse`, `ResetPasswordPayload`, `ResetPasswordResponse` type exports.
- **TR3.3 hospital-web `(auth)/login/page.tsx`**: Add import of router; pass `onForgotPassword={() => router.push('/forgot-password')}` into `<HardenedLoginForm>`. Confirmed route change on click.
- **TR3.4 hospital-web `(auth)/forgot-password/page.tsx`** NEW file:
  - Teal palette matching clinical login.
  - Hero heading + `<Card>` body with `<Input>` + submit button.
  - On submit, calls `apiClient.forgotPassword(identifier.trim())` wrapped try/catch; regardless of throw goes to confirmation screen (anti-enumeration). Confirmation: `CheckCircle2` icon, "Check your email", "If a matching account exists, we've sent a password reset link. The link will expire in 15 minutes.", `Button(variant=ghost)` "Back to Sign In" → `/login`.
  - `use client` directive top of file.
- **TR3.5 hospital-web `(auth)/reset-password/page.tsx`** NEW file:
  - `token = useSearchParams().get('token')`. If !token → render "Invalid or missing reset token." CTA → `/forgot-password`.
  - State: `newPw`, `confirmPw`. Strength bullets render live: length≥8 / uppercase / digit / symbol (regex symbols list `!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?\`~`).
  - Submit disabled until 4 bullets pass AND `newPw === confirmPw AND newPw.length > 0`.
  - Submit → `apiClient.resetPassword(token!, newPw)`. On 400 → inline error. On 200 → success modal/hero (green filled CheckCircle2) + "Continue to Sign In" → `/login`.
- **TR3.6**: `pnpm type-check --filter=@medipaedia/hospital-web` exits 0.
- **TR3.7**: `pnpm build --filter=@medipaedia/hospital-web` exits 0.

### TRubrics (T3 Rubric TRs)
- **TRub3.1 Usability (≥1.5)**: Teal matches login theme, dark-mode aware, back-to-signin accessible both post-submit + token-invalid branch, confirmation modal ≥90% of hard spec copy. Evidence: screenshots or type-check + build (functional runs, UI copy verifiable from file reads).

---

## Task 4: Frontend UI — pharmacy-pos (emerald palette)
**Priority**: high
**Status**: pending
**ACs covered**: AC-R8 routes mirrored. pharmacy-pos builds after changes.
**Dependency**: T3.1 (HardenedLoginForm accepts onForgotPassword), T3.2 (api-client exposes forgotPassword/resetPassword)

### TRules (T4 Rule TRs)
- **TR4.1 pharmacy-pos `(auth)/login/page.tsx`**: add `onForgotPassword={() => router.push('/forgot-password')}` prop.
- **TR4.2 pharmacy-pos `(auth)/forgot-password/page.tsx`**: Copy hospital-web structure, swap `accentColor=emerald`, emerald button class, hero copy matches pharmacy brand ("Reset your pharmacy desk password").
- **TR4.3 pharmacy-pos `(auth)/reset-password/page.tsx`**: Copy hospital structure, swap emerald palette, same real-time strength validation.
- **TR4.4**: Files compile. `pnpm type-check --filter=@medipaedia/pharmacy-pos` → exit 0 (acceptance gate).

### TRubrics (T4 Rubric TRs)
- **TRub4.1 Code Reuse (≥1.5)**: Pages import from shared component primitives already exported by `@medipaedia/ui` — avoid bespoke file copies of validation logic. Score: number of shared primitives (Card/Input/Button/lucide icons) vs bespoke.

---

## Task 5: Verification end-to-end scenario + py + TS compile
**Priority**: high
**Status**: pending
**ACs covered**: AC-R1 through AC-R7 (live DB assertions); AC-R11 backend compile; AC-R10 front-end gates (also part of T3.6/3.7/4.4 but double-check).
**Dependency**: T1-T4 all completed.

### TRules (T5 Rule TRs)
- **TR5.1**: `python -m py_compile app/core/security.py app/api/v1/endpoints/auth.py app/models/user.py app/db/init_live_db.py app/schemas/auth.py` → 0.
- **TR5.2**: `pnpm type-check --filter=@medipaedia/hospital-web` → exit 0.
- **TR5.3**: `pnpm build --filter=@medipaedia/hospital-web` → exit 0.
- **TR5.4**: Live Postgres end-to-end fixture (Python async script):
  1. Call `init_live_db._apply_password_reset_tokens_patch()` idempotent twice → no crash, indexes present per `pg_indexes`.
  2. Choose an existing HOSPITAL_ADMIN (non-patient, active) as target user; grab email.
  3. `POST forgot-password { identifier: email }` via FastAPI TestClient or direct service call.
  4. Parse logger output or raw_token variable from PRT table (in test harness capture the raw token):
     - `SELECT token_hash FROM password_reset_tokens WHERE user_id = target.id ORDER BY created_at DESC LIMIT 1`
     - Verify AC-R1 (hash): raw_token's `hash_token()` value matches row token_hash, row != raw (impossible since digest is SHA256 of raw; length both 64 but content differs).
  5. `POST reset-password { token: raw_token, new_password: "Apple#2024!" }` → HTTP 200 success=true.
  6. AC-R5: login with target.email + new_password → valid TokenPair.
  7. AC-R5: login with old password → 401 invalid.
  8. AC-R4: re-submit same raw_token again → HTTP 400 (used).
  9. AC-R3: `POST forgot-password { identifier: "this-will-not-match-xyz@invalid.tld" }` → HTTP 200 same JSON shape.
  10. AC-R7: `SELECT COUNT(*) FROM audit_log WHERE actor_id = target.id AND action IN ('PASSWORD_RESET_ISSUED','PASSWORD_RESET_CONSUMED')` → count ≥ 2.
  11. AC-R2: Update PRT row setting `expires_at = NOW() - INTERVAL '1 minute'`; `POST reset-password` → HTTP 400.
  12. AC-R6: Mint an access token for target user BEFORE reset; after reset, do `GET /auth/me` with it → 401 (sessions revoked).
- **TR5.5**: `uvicorn` startup smoke (import `from app.main import app` in fresh process, count `admin/users` routes same count as before, new `/forgot-password` + `/reset-password` registered in auth router).

### TRubrics (T5 Rubric TRs)
- **TRub5.1 Security Fidelity (≥2)**: All AC-R1..AC-R7 asserted in the script pass; evidence = print-outs from fixture script output captured in completion evidence.

---

## Review
After T5 TRules/TRubrics all pass self-verification with captured evidence, move to R1 and create `review.md` with the reviewer contract: independent re-run of T5 script + type-checks + code review for the six NFRs. Then route pass/fail as per spec-mode skill doc.
