# Secure Enterprise Password Recovery Workflow - Product Requirements Document

## Overview
- **Summary**: Deliver a secure, anti-enumerated, 15-minute-expiring password reset capability for Medipaedia's clinical & pharmacy staff, spanning `services/core-api` (token signing + password hashing, DDL for `password_reset_tokens`, audit logging) and both Next.js frontends (`apps/hospital-web` :3000, `apps/pharmacy-pos` :3001 — matching brand teal/emerald palettes, dark-mode aware).
- **Purpose**: Let HOSPITAL_ADMIN / PHARMACY_ADMIN / PHARMACIST / DOCTOR / NURSE / RECORD_CLERK / HOSPITAL_FINANCE staff who have forgotten their password, or whose account is temporarily locked after 5 failed attempts, regain authenticated access without opening an email-vector for user enumeration or token-leak.
- **Target Users**: Clinical + Pharmacy staff on both tenant portals.

## Goals
1. Backend exposes `/api/v1/auth/forgot-password` (anti-enumeration, generic 200 regardless of user) and `/api/v1/auth/reset-password` (SHA-256 token lookup, one-time use, expiry, audit).
2. Tokens are never stored in plain-text: DB stores only `sha256(raw_token)`. Token entropy ≥ 256 bits (CSPRNG).
3. Reset links route to hospital-web first (`http://localhost:3000/reset-password?token=...`) as the canonical recovery portal; pharmacy-pos mirrors the two pages so a pharmacy-only operator can recover without cross-nav.
4. Frontend reset-password page validates password strength in real-time (≥8 chars, uppercase, digit, symbol), matches confirmation, shows success modal, redirects to `/login`.
5. Recovery actions write `AuditLog` rows; used tokens are permanently invalidated and cannot be replayed.

## Non-Goals
- Email dispatch / SMTP integration (we emit the reset link to the Python server log; a subsequent SMTP pass can swap the logger dispatch without changing routes or DB schema).
- Password reset for SUPER_ADMIN accounts (this workflow is for tenant-scoped users; super-admin recovery is an out-of-band / shell-only process).
- Rate limiting at the FastAPI app layer (can be added later by the infra stack; current guard is same generic response per-email to prevent enumeration + CSPRNG token vs brute).
- Time-based one token-per-user lockout beyond "tokens are one-use" (a single user can hold multiple issued tokens, each 15 min; any valid unused token will work).
- Patient account self-serve password reset (patients have their own `/patient/login` and `ChangePasswordRequest` route; this PR is staff-only `identifier` = email or council PIN).

## Background & Context
- `services/core-api` already has `POST /api/v1/auth/change-password` (authenticated, current_password + new_password → bcrypt), exposed on `MedipaediaApiClient.changePassword`.
- `HardenedLoginForm` (shared `@medipaedia/ui`) already renders a clickable "Forgot password or unlock account?" label (locale key `common.forgotPassword`) — the `<a>` has `href="#" onClick={preventDefault}` today. The parent login pages (`(auth)/login/page.tsx` in each frontend) must wire this to `/forgot-password` via prop.
- Login pages live under `apps/hospital-web/src/app/(auth)/login/page.tsx` (portalType=clinical, accent=teal) and `apps/pharmacy-pos/src/app/(auth)/login/page.tsx` (portalType=rx, accent=emerald).
- Password hashing uses passlib `CryptContext(["bcrypt"], deprecated="auto")` in `app/core/security.py:get_password_hash()`. bcrypt 4.1 causes a trapped benign `__about__` read AttributeError from passlib; functionally fine.
- `Anti-enumeration` is a defense-in-depth constraint: attacker cannot distinguish valid vs invalid emails by response, timing, or headers (same HTTP 200 + same JSON shape regardless).
- SHA-256 hashing for reset tokens: the raw token is delivered **once** to the clickable link; DB stores the 32-byte digest. Table-breach gives attacker zero usable recovery links. Token raw = hex(32 bytes random) = 64 chars; URL-param safe.

## Functional Requirements

### Backend (`services/core-api`)
- **FR-1. Token hashing helpers (`app/core/security.py`)**:
  - `hash_token(raw_token: str) -> str` — case-insensitive: `.encode().lower()` then hex(SHA-256 digest).
  - `generate_secure_reset_token() -> tuple[str, str]` — returns `(raw_token_hex, sha256_digest_hex)`. `raw_token` = `secrets.token_hex(32)` (256-bit entropy).
- **FR-2. DDL + new ORM model `PasswordResetToken`**:
  - Table: `password_reset_tokens` with columns: `id (UUID, PK)`, `token_hash (TEXT, NOT NULL UNIQUE)`, `user_id (UUID NOT NULL FK users.id)`, `tenant_id (UUID FK tenants.id)`, `email_address (TEXT, NOT NULL)`, `expires_at (TIMESTAMPTZ, NOT NULL DEFAULT NOW() + 15min)`, `created_at (TIMESTAMPTZ, NOT NULL DEFAULT NOW())`, `used (BOOLEAN DEFAULT false)`, `used_at (TIMESTAMPTZ)`, `client_ip (TEXT)`, `user_agent (TEXT)`.
  - Idempotent DDL patch inside `init_live_database()`: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id`, `CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash`. Never DROP columns; additive only.
- **FR-3. Pydantic schemas (`app/schemas/auth.py`)**:
  - `ForgotPasswordRequest` → `identifier: str` (accepts email or license PIN — same canonical resolve as StaffLoginRequest).
  - `ForgotPasswordResponse` → `{ sent: bool = True, message: str = "If a matching account exists, a password reset link has been dispatched." }`.
  - `ResetPasswordRequest` → `{ token: str, new_password: str }` with `min_length=8` on password.
  - `ResetPasswordResponse` → `{ success: bool, message: str }`.
- **FR-4. `POST /api/v1/auth/forgot-password`** (no auth):
  - Resolve identifier → lowercase email (or license PIN → reverse-lookup `staff_profile.license_number / council_pin → user.email`); always return generic 200 `ForgotPasswordResponse`.
  - If user match found AND `user.is_active = true` AND `NOT PATIENT` (staff only):
    - Mint reset token; persist `PasswordResetToken` with `used=false`.
    - Log (Python `logger.info`) the reset link: `http://localhost:3000/reset-password?token=<raw_token>`.
    - Write AuditLog `action=PASSWORD_RESET_ISSUED`, resource_type=UserSecurity, actor_id=user.id (for self-issued audit trail).
- **FR-5. `POST /api/v1/auth/reset-password`** (no auth):
  - Compute `hash_token(req.token.strip())` → `SELECT token_hash=digest WHERE used=false AND expires_at > NOW() LIMIT 1`.
  - Invalid / expired / used → HTTP 400 `{ "detail": "Reset token is invalid or has expired. Please request a new password reset link." }`.
  - If valid: `UPDATE users SET hashed_password = get_password_hash(new_password), updated_at = NOW() WHERE id = user_id`; `UPDATE password_reset_tokens SET used = true, used_at = NOW() WHERE id = row.id`; `COMMIT`.
  - Invalidate all active sessions for the user (Redis `revoke_all_user_sessions(user_id)`) so stale cookies can't be replayed post-reset.
  - Write AuditLog `action=PASSWORD_RESET_CONSUMED` (actor = same user_id). Return 200 `{ success: true, message: "Your password has been updated. Sign in with your new credentials." }`.

### Frontend — Shared UI (`@medipaedia/ui`)
- **FR-6. `HardenedLoginFormProps` adds optional handler for forgot-password click**:
  - New optional prop: `onForgotPassword?: () => void`.
  - In the existing forgot-password `<a>` block, if prop provided → invoke it (and route to `/forgot-password` in the parent page); else fall back to current `#` no-op.

### Frontend — Clinical (`apps/hospital-web`)
- **FR-7. `/login` page wires forgot-password to route**: pass `onForgotPassword={() => router.push("/forgot-password")}` into `<HardenedLoginForm>` from `(auth)/login/page.tsx`.
- **FR-8. New page `/forgot-password/page.tsx` (clinical teal)**:
  - Teal/emerald brand, dark-mode compatible via existing `dark:` CSS tokens.
  - Card with title "Reset your password", subtitle "Enter the email address or council license number used to sign in. If a matching account exists, we will send a password reset link."
  - Controlled `<Input>` placeholder="name@facility.medipaedia.health OR Pharmacy Council PIN"; submit label "Send Reset Link" (teal primary button).
  - Calling: `POST http://localhost:8000/api/v1/auth/forgot-password { identifier }`.
  - On submission (always success — anti-enumeration from backend): replace form with a confirmation screen: green `CheckCircle2`, header "Check your email", body "If a matching account exists, we've sent a password reset link. The link will expire in 15 minutes.", plus `<Button variant="ghost" onClick={()=>router.push('/login')}>` → "Back to Sign In".
- **FR-9. New page `/reset-password/page.tsx` (clinical teal)**:
  - Read `?token=...` from `useSearchParams()`; if `!token` render "Invalid or missing reset token." message + "Request a new reset link" CTA.
  - Two inputs: `<Input type="password" label="New Password" />`, `<Input type="password" label="Confirm New Password" />`. Live strength row shows 4 bullets:
    - `[✓] At least 8 characters` (len ≥ 8)
    - `[✓] At least one uppercase letter` (regex /[A-Z]/)
    - `[✓] At least one number` (regex /\d/)
    - `[✓] At least one symbol` (regex /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?`~]/)
  - Confirmation must match new password; Submit disabled until strength rules pass AND confirmation matches.
  - Submit → `POST /auth/reset-password { token, new_password }`.
  - On 400: inline error text. On 200: show confirmation modal (green filled circle + "Password successfully updated!") with "Continue to Sign In" → `router.push('/login')`.

### Frontend — Pharmacy POS (`apps/pharmacy-pos`)
- **FR-10. Mirror FR-7 → `/login` wires `onForgotPassword` to `router.push("/forgot-password")`** (portal rx, accent emerald).
- **FR-11. Mirror FR-8 → `/forgot-password/page.tsx`** with emerald palette (reuse same component copy, swap `accentColor = "emerald"`).
- **FR-12. Mirror FR-9 → `/reset-password/page.tsx`** (emerald palette + same validations).

### Backend Shared Validation Logic
- **FR-13. Minimum password policy**: Both `ChangePasswordRequest.new_password` (existing route) and `ResetPasswordRequest.new_password` enforce `min_length=8`. Frontend enforces the 4-rule strength set; backend accepts ≥8 chars (defense-in-depth aligns on ≥8 minimum).

## Non-Functional Requirements
- **NFR-1 (Security)**: Reset tokens stored as SHA-256 digest only; no raw token value persisted anywhere beyond immediate return of link string to logger.
- **NFR-2 (Anti-Enumeration)**: `forgot-password` always returns 200 same-JSON, near-identical response size whether or not identifier matched.
- **NFR-3 (Timing)**: Explicit ~100 ms `await asyncio.sleep(0.1)` on forgot after any DB hit before returning so timing attacks can't distinguish matched emails.
- **NFR-4 (One-Use)**: Token row `used` field committed in same TX as the password update; row-level pessimism (filter `used=false`) prevents double-spend.
- **NFR-5 (Cross-port)**: Reset link always resolves to `localhost:3000/reset-password` as the canonical host; pharmacy route `/reset-password` also accepts same tokens (hits same :8000 reset endpoint).
- **NFR-6 (Brand)**: Both portals match their respective accent (teal clinical, emerald pharmacy) and work in light/dark browser preference.

## Constraints & Assumptions
- SMTP dispatch is out-of-scope; reset links are logged. This matches prior patterns for onboarding invitation URLs.
- Reset endpoints are staff-only: patient recovery is a separate flow to be added later; backend explicitly skips issuing reset for any user where `PATIENT` is the primary role (anti-phishing safety).
- Identifier resolution: supports email or council_pin (license_number). Staff lookup falls back to `StaffProfile.council_pin JOIN users.id` when the identifier does not look like an email.
- Frontend uses only `HardenedLoginForm` + existing `Input`, `Button`, `Card`, `BadgeCheck`, `AlertCircle`, `CheckCircle2`, `ArrowRight`, `KeyRound`, `ArrowLeft` primitives from `@medipaedia/ui`. No new npm dependencies.

## Acceptance Criteria

### Rule ACs (objectively pass/fail)
- **AC-R1. Token storage**: Postgres table `password_reset_tokens` exists post-boot with column `token_hash` as `TEXT UNIQUE`. No row contains `token_hash == raw_token` format (raw is 64 hex chars, digest is 64 hex chars of the hash; assertion = for any row, `hash_token(link)` must match row.token_hash).
- **AC-R2. 15-minute expiration**: Token row whose `expires_at < NOW()` returns HTTP 400 from reset endpoint; valid row returns 200.
- **AC-R3. Anti-enumeration**: `POST /auth/forgot-password` with identifier = `definitely-does-not-exist-xyz@invalid.tld` returns HTTP 200 and JSON `{"sent": true, "message": "..."}`. Same HTTP 200 returned for a valid email.
- **AC-R4. Single-use**: Submit the exact same valid token to `/auth/reset-password` twice: first call 200, second call 400 "invalid or expired".
- **AC-R5. User password actually updated**: After a successful reset, `POST /auth/login` with the same user's email + NEW password returns a valid `TokenPairResponse`; old password returns 401.
- **AC-R6. Session revocation post-reset**: After reset, a pre-issued `access_token` cookie for that user (still within its 1h lifetime) returns 401 on `/auth/me` because all sessions revoked.
- **AC-R7. AuditLog entries written**: After forgot+reset flow, `AuditLog` contains at least two rows for the same user_id with `action in { 'PASSWORD_RESET_ISSUED', 'PASSWORD_RESET_CONSUMED' }`.
- **AC-R8. Frontend routes exist**: Hospital-web exposes both `/forgot-password` and `/reset-password`; same for pharmacy-pos. Login page forgot-password anchor navigates away (confirmed by route change after click).
- **AC-R9. Reset password real-time validation**: In `/reset-password`, typing `abcdefg` shows 4 FAILS; typing `Apple#2024` shows 4 PASSES in the strength indicator. Submit remains disabled until all 4 pass AND confirmation matches.
- **AC-R10. Build gates**: `pnpm type-check --filter=@medipaedia/hospital-web` exits 0, `pnpm build --filter=@medipaedia/hospital-web` exits 0.
- **AC-R11. Backend compile**: `python -m py_compile app/core/security.py app/api/v1/endpoints/auth.py app/models/user.py app/db/init_live_db.py app/schemas/auth.py` exits 0.

### Rubric ACs (evaluative scored against threshold)
- **AC-U1. Usability (0-2, threshold ≥1.5)**: Can a new user recover password without reading docs?
  - `2`: copy is clear, CTAs are primary buttons, confirmation → back-to-signin present on both forgot/reset screens, brand tokens match portal, dark-mode looks correct, zero layout shift.
  - `1`: flows work but minor polish gaps (e.g., no icon on reset success or copy is slightly unclear).
  - `0`: broken flow / missing CTAs.
- **AC-U2. Security fidelity (0-2, threshold ≥2)**: Every security constraint enforced?
  - `2`: all NFR-1..NFR-6 meet spirit + letter — token digested only, anti-enumeration, timing sleep, single-use, post-reset session kill, patient blocked, audit trail.
  - `1`: one of NFR missing (e.g., no session kill post reset or no sleep).
  - `0`: raw tokens stored or user enumeration distinguishable.
- **AC-U3. Code cohesion (0-2, threshold ≥1.5)**: Match existing patterns?
  - `2`: uses existing `AuditLog`, `init_live_database` idempotent patch, `get_password_hash()`, `@router.post` in auth.py same style as change-password, frontend reuses existing `useRouter`/`useSearchParams` pattern, no ad-hoc new modules.
  - `1`: works but some copy/paste or new file where existing file could have been extended.
  - `0`: breaks existing patterns (e.g., new global unique index on users) or introduces a new dependency without approval.
