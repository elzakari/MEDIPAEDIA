# SMTP Configuration & Email Dispatch + generate-reset-link 500 Fix — Specification

Author: Principal Full-Stack Engineer · Target: Medipaedia Monorepo
Last Updated: 2026-09-05

---

## 1. Problem, Users, Goals, Non-Goals

### Problem
1. **Regression Bug**: `POST /api/v1/admin/facilities/{tid}/users/{uid}/generate-reset-link` returns **HTTP 500 Internal Server Error**. Although ORM field-name regressions were corrected (PRT email_address not nullable, AuditLog constructor kwargs wrong field names), the spec explicitly asks to re-verify token generation helper, import line, safe UUID casting, PRT table existence, and response-shape match — items we haven't formally proven against the user's raw endpoint format request yet.
2. **Missing Email Channel**: No SMTP infrastructure. All reset links, invitations, and system messages rely on clipboard copy. For enterprise deployments (e.g., Ghana Health Service hospitals onboarding 100+ staff), clipboard handoff is not auditable and produces broken user journeys.
3. **Zero Visibility**: Super Admin currently has no UI page to configure SMTP. There is no way to test connection settings from the Governance Console.
4. **No Dev Fallback**: When a provider (Gmail/SES/SendGrid) is not configured, sending an email should produce a formatted **terminal preview** (to + subject + HTML saved/printed) instead of throwing. This lets frontend/QA continue testing without provider credentials.

### Users
- **SUPER_ADMIN** only — configures SMTP, sends test emails, and benefits from auto-dispatch of reset links.
- **Facility Staff** (indirect) — receive branded password reset + onboarding invitation emails directly in their inbox instead of copy-pasted URLs.

### Goals
- Fix the generate-reset-link endpoint to return 200/201 with correct response shape matching user request sample format AND maintaining backwards compatibility with the existing GenerateAdminResetLinkResponse the Manage Drawer Tab C already consumes.
- Create `SystemSmtpConfig` ORM + init_live_db additive IF-NOT-EXISTS patch (never drop columns, no Alembic). Unique row per logical id — we enforce max 1 "active" config globally.
- Build `app/core/mailer.py`: async `send_system_email(to_email, subject, html_body, db)` with 3 dispatch modes: (a) Live SMTP via `smtplib` in threadpool, (b) StartTLS or SMTPS-SSL port 465 by encryption setting, (c) Preview/log fallback (terminal + structured change_json AuditLog row) when no active config.
- Add 2 HTML template renderers inline in mailer.py: `render_password_reset_email(reset_link, expires_in_label, recipient_name, facility_name)` and `render_onboarding_invite_email(...)`. CSS must be inlined-style only (no external CSS, Gmail strips `<style>` blocks).
- Add admin-gated SMTP endpoints: `GET /admin/smtp` (password masked with `***` + last-2-chars hint), `POST /admin/smtp` upsert, `POST /admin/smtp/test` sends a live branded test email to `recipient_email` specified in body or default to current_user.email.
- Frontend: New route `/super-admin/smtp` page in Super Admin layout. New nav item. Provider presets (Gmail / Workspace, AWS SES, SendGrid, Custom SMTP) auto-fill host/port. Password field with Eye/EyeOff reveal toggle. "Test Connection" opens a NotificationModal prompting for recipient email. "Save SMTP Settings" posts upsert.
- Frontend: Manage Facility Drawer Tab C — when Generate One-Time Reset Link succeeds, additionally call mailer to email the link to staff. Show toast "Reset link dispatched via email to user@domain" AND keep copyable Input + Copy button.
- All writes to `system_smtp_configs` write AuditLog rows `SMTP_CONFIG_UPDATED` and `SMTP_TEST_SENT` with masked passwords only. Password never persisted in cleartext audit JSON.
- Build gates pass: `pnpm type-check --filter=@medipaedia/hospital-web` exit 0 AND `pnpm build --filter=@medipaedia/hospital-web` exit 0.

### Non-Goals
- **No 3rd-party transactional SDKs** (SendGrid python SDK, boto3 SES). Use pure SMTP (smtplib.SMTP/SMTP_SSL). All providers have working SMTP ports: Gmail STARTTLS 587 app-password, SES TLS 587/SMTPS 465 with SMTP credentials, SendGrid smtp.sendgrid.net 587 + apikey auth.
- **No mass bulk emailing, marketing, or newsletter**. Scope limited strictly to 2 transactional templates: password reset and onboarding invite.
- **No catch-all email inbox / receiver** (IMAP/POP3). Only outbound SMTP client.
- **No DB changes to tenant / user tables**. Only additive `system_smtp_configs` table.
- **No new Select/Radio primitives** in `@medipaedia/ui`. Fall back to native `<select>` styled with Tailwind and `<input type="radio">` wrapped as Badge toggles — matches existing facilities page role-chip selection pattern.
- **No new Next.js layout**: new page added as `/super-admin/smtp/page.tsx` — the Super Admin layout is applied by folder convention via `(super-admin)/`.

---

## 2. Functional Requirements

### 2.1 Backend — generate-reset-link 500 Fix (explicit re-verification of items user listed)

| # | Action | Evidence |
|---|---|---|
| F-GEN-1 | Re-verify `from app.core.security import generate_secure_reset_token` line exists in admin.py imports. If missing, add. | Imports block inspection. |
| F-GEN-2 | Re-verify `generate_secure_reset_token()` definition in `security.py`. Signature returns `Tuple[str,str]`. | Read security.py lines 37-44. |
| F-GEN-3 | Verify `PasswordResetToken` table exists at ORM + init_live_db patch. | Read models/user.py L156-182 + grep init_live_db `_apply_password_reset_tokens_patch`. |
| F-GEN-4 | Explicit defensive UUID cast inside endpoint if string: `t_id = uuid.UUID(str(tenant_id))` / `u_id = uuid.UUID(str(user_id))` before queries. | Endpoint source code. |
| F-GEN-5 | Return dual-format response compatible with BOTH user format (`status`/`raw_token`/`reset_url`/`expires_in`) AND the existing `GenerateAdminResetLinkResponse` (`reset_link`/`token_id`/`expires_at`/`validity_hours`/`user_id`) so Tab C continues working without frontend break. | JSON response union satisfies both schemas. |

### 2.2 Backend — SMTP Configuration Store

| # | Action | Evidence |
|---|---|---|
| F-SM-1 | ORM `SystemSmtpConfig` at `app/models/smtp_config.py`: columns {id: UUID PK, is_active: bool, provider: str, smtp_host: String(255), smtp_port: int, encryption: Enum('TLS','SSL','NONE'), username: String(255), password_ciphertext: Text, from_email: String(255), from_name: String(255), updated_by_id: UUID FK, created_at/updated_at timestamps}. | New model file + imports. |
| F-SM-2 | Password Cipher: password NEVER stored in cleartext. Use Fernet-style wrap: derive 32-byte key from `settings.SECRET_KEY` via SHA-256 (truncate), then encrypt with `cryptography.fernet.Fernet`. If `cryptography` unavailable, fall back to XOR-obfuscated base64 (NOT secure — logged warning: "install cryptography>=41.0 for at-rest SMTP password encryption"). In both cases, column stores `password_ciphertext` (Text), never plain. | Implementation in `app/core/mailer.py` helpers `_encrypt_smtp_password` / `_decrypt_smtp_password`. |
| F-SM-3 | `init_live_db` additive patch `_apply_system_smtp_configs_patch()`: CREATE TABLE IF NOT EXISTS, indexes. Called from `init_live_database()`. No Alembic. | init_live_db.py. |
| F-SM-4 | At-most-one-active invariant enforced in code layer: `POST /admin/smtp` upsert → before commit, all OTHER rows set `is_active=False`. So newest saved = only active. | `POST /admin/smtp` body. |

### 2.3 Backend — Mail Dispatch Engine `app/core/mailer.py`

| # | Signature / Behavior |
|---|---|
| F-MA-1 | `async def send_system_email(to_email: str, subject: str, html_body: str, db: AsyncSession, *, from_email: Optional[str] = None, from_name: Optional[str] = None, facility_name: Optional[str] = None) -> Dict[str, Any]`. Returns dict: `{status: 'sent'|'preview', via: 'smtp'|'console_preview', message_id: Optional[str], preview_text: Optional[str], error: Optional[str]}`. |
| F-MA-2 | Queries active `SystemSmtpConfig`. If none: logs formatted preview to `logger.info` (recipient, subject, 80-char HTML snapshot, first 300 chars text-strip), also stores preview in returned dict `preview_text`. Status 'preview'. |
| F-MA-3 | If active config + SMTP params: runs `smtplib.SMTP(host, port, timeout=20)` (TLS or NONE), or `smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=20)` for SSL mode. For TLS: `ehlo` → `starttls(context)` → `ehlo` → `login(username, decrypt(password_ciphertext))` → `sendmail`. `ehlo/helo` hostname defaults to `socket.getfqdn()` with fallback 'localhost'. Wrap entire dispatch in `asyncio.to_thread` (threadpool) so it never blocks the event loop. |
| F-MA-4 | HTML renderer `render_password_reset_email(reset_link: str, validity_hours: int, recipient_name: str, facility_name: Optional[str]) -> str`. Branded: Medipaedia Cloud Health header, gradient teal CTA button "Reset My Password", 15-minute style warning if validity<=1, 24-hour if validity==24, N hours otherwise. Footer IP/user-agent omitted. Style all via inline style attributes. |
| F-MA-5 | HTML renderer `render_test_email(config_hint: str, sender_label: str, recipient_email: str) -> str`. Displays "SMTP Connection Test Successful" banner, provider preset, From label, timestamp. Footer "Medipaedia Cloud Health SMTP Gateway". |
| F-MA-6 | Exception safety: catches `socket.gaierror`, `TimeoutError`, `smtplib.SMTPException`, `ssl.SSLError`. Returns `{status:'error', error: str}` — no raise for transient network faults so HTTP 200 reports the failure as part of body. AuditLog still records attempt. |

### 2.4 Backend — SMTP Admin Endpoints `smtp.py`

All endpoints inherit `require_super_admin` gate: mount router in `api/v1/router.py` alongside admin.router. URL prefix `/admin` so final paths: `GET/POST /api/v1/admin/smtp`, `POST /api/v1/admin/smtp/test`.

| # | Endpoint + Payload | Response / Behavior |
|---|---|---|
| F-EP-1 | `GET /admin/smtp` (no body) | Returns current active row OR null. Always masks password: if 4+ chars → `'*'*(len-2)+last2`; else `'***'`. Includes is_active, provider preset label, host, port, encryption, username, from_email, from_name, last_tested_at, last_tested_recipient, last_tested_ok. |
| F-EP-2 | `POST /admin/smtp` Upsert: `{provider: str, smtp_host: str, smtp_port: int, encryption: 'TLS'|'SSL'|'NONE', username: str, password: str (cleartext over HTTPS only), from_email: str, from_name: Optional[str], is_active: Optional[bool]=True}`. | Persist via `_encrypt_smtp_password`. Set OTHER rows inactive. Return saved record (password masked). AuditLog `action='SMTP_CONFIG_UPDATED'` with masked-password JSON ONLY. |
| F-EP-3 | `POST /admin/smtp/test`: `{recipient_email?: str, save_settings_first?: bool, settings?: (same as POST /admin/smtp body)}`. | If `save_settings_first=True` AND `settings` supplied, upsert first. Then send test email (`render_test_email`) to `recipient_email` (default to current_user.email). Returns send_system_email result. Update active row `last_tested_at=NOW, last_tested_recipient=recipient_email, last_tested_ok=(status=='sent')`. |

### 2.5 Shared api-client

- `types.ts`: 4 new interfaces: `SmtpProviderPresetLiteral = 'GMAIL'|'GOOGLE_WORKSPACE'|'AWS_SES'|'SENDGRID'|'CUSTOM'`, `SmtpEncryptionLiteral = 'TLS'|'SSL'|'NONE'`, `SmtpConfigResult` (password masked), `SmtpConfigPayload` (password clear), `SmtpTestPayload`, `SmtpSendResult`.
- `client.ts`: 4 methods: `getSmtpConfig()`, `saveSmtpConfig(payload: SmtpConfigPayload)`, `testSmtpConnection(payload: SmtpTestPayload)`, `dispatchPasswordResetEmail(tenantId, userId, resetLink, validityHours)` — optional method if we choose to make Tab C send a dedicated backend call or integrate into generate-reset-link directly.

### 2.6 Frontend — `/super-admin/smtp` Email & SMTP Gateway page

- New route file `apps/hospital-web/src/app/(super-admin)/super-admin/smtp/page.tsx`.
- Layout already applied by parent `layout.tsx`.
- Sidebar nav: Add new link at L27-35 between Billing and Facilities or after Infrastructure (ordering chosen for logical grouping: Infrastructure/DLQ → Email & SMTP Gateway → SaaS Plans/...). Icon: `Mail` from lucide-react. Check if Mail icon available; if not available, fallback to `Send` (lucide Send exists in the library).
- Page content:
  - Headline "Email & SMTP Gateway" + Badge ("Not Configured" / "Active" based on `is_active` from `GET /admin/smtp`).
  - Provider Preset row — 4 clickable Badge chips (Gmail / Workspace, AWS SES, SendGrid, Custom SMTP). Click pre-fills host/port/encryption defaults:
    - GMAIL: smtp.gmail.com, 587, TLS. Hint: Requires Gmail App Password (2FA-enforced accounts only).
    - GOOGLE_WORKSPACE: smtp-relay.gmail.com, 587, TLS. Hint: Requires Workspace Admin allowlisting the egress IP.
    - AWS_SES: email-smtp.<region>.amazonaws.com, 587, TLS (also allows 465 SSL toggle).
    - SENDGRID: smtp.sendgrid.net, 587, TLS. Hint: Username is always literal "apikey" ; password is SendGrid SG API Key.
    - CUSTOM: empty defaults; manual fill.
  - Form row 1: Host (Input) + Port (native `<select>` with options: 25, 465, 587, 2525, 2526. Or free Input.)
  - Form row 2: Encryption radio chips (TLS STARTTLS recommended | SSL 465 | NONE).
  - Form row 3: Username / API Key.
  - Form row 4: App Password / Secret — Input with Eye/EyeOff toggle.
  - Form row 5: Sender Email (`noreply@medipaedia.com`) + Sender Name ("Medipaedia Cloud Health").
  - Action row left: "Save SMTP Settings" Button → POST upsert → toast success.
  - Action row right: "Test Connection & Send Live Email" ghost Button → opens NotificationModal with Input "Send a test to" (default `current_user.email` from AuthContext/JWT). Submit → POST /admin/smtp/test → emerald toast "Test email dispatched via SMTP" if status=='sent'; amber toast "Delivered preview to server logs only — no active SMTP config" if status=='preview'; red toast on status=='error' with error message inline.

### 2.7 Frontend — Manage Drawer Tab C dispatch integration

- `handleGenerateResetLink(userId)`: After `result = await apiClient.generateFacilityUserResetLink(...)`, fire-and-forget (try block, no await block UI) a call to send email (either: call a new API method `dispatchPasswordResetEmail(tenantId, userId, resetLink, validityHours)` OR — simpler per spec intent — the backend generate-reset-link endpoint emails automatically and returns `email_sent: true/false, email_dispatch_status: 'sent'|'preview'|'error', email_error: str` fields in response so one HTTP call does both). Prefer approach B: **backend generate-reset-link auto-dispatches email via `send_system_email`**, returns those 3 fields, so Tab C code shows toast "Reset link dispatched via email to {user.email}" when `email_sent=true` and `email_dispatch_status=='sent'`, amber "Reset link generated; no SMTP configured — email logged as server preview" when `'preview'`, red "Reset link generated but email failed: {error}" when `'error'`.
- Always keep the existing copyable Input + Copy Reset Link button no matter email result.
- Badge in success card updates: shows "📧 Email sent" or "📋 Preview logged (no SMTP)" or "⚠️ Email failed" alongside the existing "Valid for N hours" clock badge.

### 2.8 Backend Response Compatibility Contract (Dual Format)

Because spec §1 forces response shape:
```json
{
  "status": "success",
  "raw_token": raw_token,
  "reset_url": f"http://localhost:3000/reset-password?token={raw_token}",
  "expires_in": "24 hours"
}
```
AND existing Tab C `GenerateResetLinkResult` expects:
```ts
{ reset_link: string, token_id: string, expires_at: string, validity_hours: number, user_id: string }
```
We return the **UNION** so both work. Add email dispatch info fields:
```python
{
  # Raw-token debug/dispatch-friendly fields (user-requested shape)
  "status": "success",
  "raw_token": raw_token,
  "reset_url": reset_link,
  "expires_in": f"{validity_hours} hours",
  # Existing backwards-compatible GenerateAdminResetLinkResponse fields
  "reset_link": reset_link,
  "token_id": prt.id,
  "expires_at": expires_at,
  "validity_hours": validity_hours,
  "user_id": user.id,
  # Email dispatch result (Tab C uses these for toasts)
  "email_sent": bool,
  "email_dispatch_status": "sent" | "preview" | "error",
  "email_error": str | None,
}
```
Note: Exposing `raw_token` in response body is safe because (1) HTTPS in prod, (2) SUPER_ADMIN auth-required to call the endpoint, (3) it's shown in UI copyable box already, (4) only SHA-256 persisted in DB. Consistent with review.md AC-U2 security score: raw token only ever returned ONCE in HTTP response body to authorized admin — never stored.

---

## 3. Non-Functional Requirements

| # | NFR | Verification |
|---|---|---|
| NFR-1 | **Authorization**. `GET/POST/TEST /admin/smtp` all require SUPER_ADMIN. Place router inside existing admin-style gate or reuse same mount pattern (`include_router(smtp.router, prefix="/admin")` with `router=APIRouter(dependencies=[Depends(require_super_admin)])`). | Gate code. |
| NFR-2 | **SMTP password at-rest encryption**. `cryptography` Fernet with SECRET_KEY-derived key when available. AuditLog change_json NEVER includes cleartext password. | Code inspection + masked field in GET response. |
| NFR-3 | **Non-blocking SMTP**. Live SMTP dispatch wrapped in `asyncio.to_thread` (or ThreadPoolExecutor directly). Never block async event loop. | Dispatch wrapper. |
| NFR-4 | **Dev fallback previews**. When no active SMTP config, all system email calls succeed with status='preview', emit logger.info, and return `preview_text` so QA/devs can see what WOULD be sent. | log output + returned result. |
| NFR-5 | **Audit trail**. `SMTP_CONFIG_UPDATED` on every save (current state diff). `SMTP_TEST_SENT` on every test-send (to, result). `PASSWORD_RESET_EMAILED` when generate-reset-link auto-dispatches. | AuditLog SELECT distinct actions. |
| NFR-6 | **Build gates — USER MANDATED**. `pnpm type-check --filter=@medipaedia/hospital-web` exit 0 AND `pnpm build --filter=@medipaedia/hospital-web` exit 0. | Shell stdout. |
| NFR-7 | **Backend parse correctness**: `python -m py_compile` on (admin.py, smtp.py, mailer.py, schemas/admin.py OR schemas/smtp.py, model smtp_config.py, init_live_db.py) exit 0. | Shell exit=0. |
| NFR-8 | **No orphan types**. All added TS interfaces referenced from client.ts or a page. No unused imports. | tsc --noEmit. |
| NFR-9 | **UX inline style for HTML emails** (no style blocks). | mailer.py renderers. |
| NFR-10 | **Robust UUIDs**. generate-reset-link endpoint casts tenant_id/user_id via `uuid.UUID(str(x))` defensively at start. | Endpoint code. |

---

## 4. Constraints, Dependencies, Assumptions, Open Questions

### Constraints
- **Additive DB patch only**: never drop columns; no Alembic; `CREATE TABLE IF NOT EXISTS`.
- **Shared ui primitives limited to**: Modal, Button, Badge, Card, Input, Toast, NotificationModal. No Select/Radio — use native `<select>` / styled radio chips (Badge toggles) pattern already implemented in facilities page.
- **No SMTP SDKs**: pure `smtplib` only. Option `cryptography` optional — if missing, warning + base64-XOR fallback (NOT secure; clear warning in logs to install).
- **All SMTP endpoints under `/admin`** to match existing admin mount pattern.
- **HTTP-only password over TLS in prod**: explicit. Dev (localhost) plaintext acceptable because of 127.0.0.1 loopback.

### Dependencies
- `smtplib` & `ssl` — stdlib, no install.
- `cryptography` — optional (fernet password at-rest encryption). If not in venv → degrade gracefully with log warning. Do NOT add to pyproject.toml unless user explicitly approves later (keep SMTP password-at-rest story working without it, just log-warned).
- Existing `init_live_db` additive pattern, `require_super_admin`, `AuditLog` model.
- Existing lucide-react icons: re-use, import Mail/Send if available; fallback to copy pattern for nav.

### Assumptions (no user input required)
- A1: Sidebar `/super-admin/smtp` icon — first try `Mail` from lucide-react; if unavailable, `Send` icon works. If both unavailable, re-use `FileSpreadsheet` icon. Nav label "Email & SMTP Gateway".
- A2: `system_smtp_configs` multi-row allowed with 1-active invariant via code, not partial unique index (to avoid DB index logic complexity; simpler).
- A3: Backend auto-dispatches email in generate-reset-link rather than making FE do a second HTTP call — reduces chattiness and guarantees audit regardless of FE version.
- A4: Password at-rest: if cryptography can't be imported, we do not block save — we just append a warning field `encryption: 'none_plaintext_fallback'` in memory and log. This matches "works in dev environments without cryptography installed" goal. FE toast shows warning banner "At-rest encryption unavailable — install cryptography package on API server".

### Open Questions — all resolved by Spec
| # | Q | Resolution |
|---|---|---|
| OQ-1 | `POST /generate-reset-link` user-requested raw_token/reset_url vs backwards compat? | UNION response (all 10 fields). Raw token shown ONLY to authorized SUPER_ADMIN in same response as Tab C — consistent with clipboard UI showing the same. |
| OQ-2 | Save SMTP password encrypted or plain? | Fernet via SECRET_KEY if cryptography available; fallback + warning if not. |
| OQ-3 | FE new page URL vs embedded? | New route `/super-admin/smtp` — cleanest, matches existing 7-route sidebar structure. |
| OQ-4 | Auto-dispatch email FE-driven vs BE-driven? | BE-driven inside generate-reset-link: FE simpler, 1 round-trip; email always tracked. |

---

## 5. Acceptance Criteria (ACs)

### Rule ACs

| ID | Rule | Evidence Source |
|---|---|---|
| AC-R1 | `POST /api/v1/admin/facilities/{tid}/users/{uid}/generate-reset-link` returns status 201/200 and body contains ALL of: `status=="success"`, `raw_token`, `reset_url`, `expires_in`, `reset_link`, `token_id`, `expires_at`, `validity_hours`, `user_id`, `email_sent`, `email_dispatch_status`, `email_error`. | HTTP smoke or code + schema. |
| AC-R2 | Endpoint imports `generate_secure_reset_token` correctly and function exists in security.py with correct signature returning raw, hash pair. | Imports + security.py 37-44. |
| AC-R3 | PRT table created: `_apply_password_reset_tokens_patch` present in init_live_db AND PasswordResetToken ORM columns match all NOT NULLs. | DB patch + models. |
| AC-R4 | Endpoint defensively casts both tenant_id and user_id through `uuid.UUID(str(...))` helper before use. | Code lines. |
| AC-R5 | `SystemSmtpConfig` ORM + `_apply_system_smtp_configs_patch` IF-NOT-EXISTS additive patch with no destructive DDL. | Files created + patch. |
| AC-R6 | `mailer.py` send_system_email: (a) no active config → returns `{status:'preview'}` with preview_text & logger.info; (b) active config SSL → SMTP_SSL 465; (c) TLS → starttls on 587 after ehlo. | mailer.py code + manual test. |
| AC-R7 | SMTP password at rest never stored plaintext. GET `/admin/smtp` response password is masked with `**** last2chars` regardless of encryption status. POST `/admin/smtp` AuditLog change_json → password saved as `"***"` only. | Save + GET smoke + JSON audit. |
| AC-R8 | Endpoints: `GET /admin/smtp`, `POST /admin/smtp` upsert, `POST /admin/smtp/test` → ALL require SUPER_ADMIN (return 403 for non-SUPER_ADMIN cookie). | Router gate + dependency. |
| AC-R9 | Frontend `/super-admin/smtp` page renders: Provider Preset row chips, Host, Port, Encryption TLS/SSL/Native, Username, Password w/ EyeToggle, Sender Email, Sender Name, Save button, Test Connection button. | Code + Build gate. |
| AC-R10 | Sidebar layout adds new navigation entry "Email & SMTP Gateway" pointing to `/super-admin/smtp` with valid lucide icon. | layout.tsx diff. |
| AC-R11 | Manage Drawer Tab C: after Generate Reset Link succeeds, a toast appears describing email dispatch outcome (sent / preview / error). The copyable input + Copy Reset Link button STILL remain present regardless of email outcome. | FE code handlers. |
| AC-R12 | Build gates pass: `pnpm type-check --filter=@medipaedia/hospital-web` exit 0 AND `pnpm build --filter=@medipaedia/hospital-web` exit 0. | Shell stdout. |
| AC-R13 | Backend parse gates pass: `python -m py_compile` on all new & edited backend modules exit 0. | Shell stdout. |
| AC-R14 | AuditLog: 3 new actions logged (SMTP_CONFIG_UPDATED, SMTP_TEST_SENT, PASSWORD_RESET_EMAILED) with correctly scoped actor_id, tenant_id=None (platform-level changes), resource_type='SMTP_CONFIG'|'EMAIL'. | Audit action SELECT. |
| AC-R15 | HTML password-reset email rendering returns valid HTML without external `<style>` blocks. All CSS must be inline `style=""`. | mailer.py rendering. |
| AC-R16 | No raw passwords in logs or AuditLog change_json for ANY of the 3 audit actions. Search code + DB schema. Always `***` in any JSON logs. | Code grep for `password` in AuditLog calls. |

### Rubric ACs

| ID | Dimension | Scale | Low Anchor | Mid Anchor | High Anchor | Threshold | Evidence |
|---|---|---|---|---|---|---|---|
| AC-U1 | Developer-friendliness (SMTP setup loop) | 0-2 | 0: no presets / no test-send / copy-paste errors for every field. | 1: presets exist but no masked password or live-test feedback; users don't know if settings work until live incident. | 2: 4 presets auto-fill; "Test Connection" prompts recipient and returns structured sent/preview/error with user-friendly toasts; password masked on GET; eye toggle for reveal while typing. | ≥1.5 | UX walkthrough + code. |
| AC-U2 | Security (password handling + SUPER_ADMIN gates + email token exposure) | 0-2 | 0: plaintext in DB + no gate + raw tokens stored in audit DB | 1: password masked in GET, gates present but FE reveals password back to user over HTTP. | 2: at-rest Fernet encrypt or degraded+warned, masked in GET & audit JSON, SUPER_ADMIN gate on all routes, raw token never stored or logged in any backend place (only returned ONCE in HTTP body to authorized admin — body fields do not count as logs). | =2 (critical) | Full code review. |
| AC-U3 | Code cohesion. Matches existing patterns. | 0-2 | 0: novel SDKs / separate email router outside / wrong file locations. | 1: works, duplicated fetch in FE instead of api-client. | 2: smtp router uses APIRouter(deps=[Depends(require_super_admin)]), mounted via include_router with prefix /admin; mailer uses existing logger/AuditLog patterns; FE calls api-client methods matching sibling style exactly; Modal/Tab C uses existing state patterns. | ≥1.5 | Spec-review diff. |
