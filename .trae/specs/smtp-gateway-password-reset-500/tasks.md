# Tasks — SMTP Configuration & Email Dispatch + generate-reset-link 500 Fix

Spec: `.trae/specs/smtp-gateway-password-reset-500/spec.md`

---

## Task 0: Backend — SystemSmtpConfig ORM + init_live_db Additive Patch

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R5, AC-R13, AC-R14, AC-U2

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T0-TR1 | rule | `services/core-api/app/models/smtp_config.py` exists and exports ORM `SystemSmtpConfig` with columns: id, is_active, provider, smtp_host, smtp_port, encryption, username, password_ciphertext, from_email, from_name, last_tested_at, last_tested_recipient, last_tested_ok, updated_by_id FK->users.id, created_at, updated_at. | File + grep columns. |
| T0-TR2 | rule | `_apply_system_smtp_configs_patch()` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, no DROP, no ALTER DROP. Called from `init_live_database()`. | init_live_db.py diff. |
| T0-TR3 | rule | `python -m py_compile models/smtp_config.py init_live_db.py` exit 0. | Shell stdout. |
| T0-TR4 | rule | `models/__init__.py` (if existing ORM discovery requires import) OR imports in endpoints/smtp.py directly import model → works. | Import path exists. |
| T0-TR5 | rubric | Scale 0-2. Low=Alembic or destructive DDL used. Mid=model incomplete but patch OK. High=All nullable/unique constraints match future index needs; patch matches existing additive patterns. Threshold ≥ 1.5. | Reviewer. |

### Notes
- Keep column `encryption` as `String(16)` or Enum string literal — avoid Postgres native enum creation to match additive pattern.
- `password_ciphertext` Column(Text, nullable=True) — nullable because save_settings with empty password during reconfigure would not change.

---

## Task 1: Backend — Mail Dispatch Engine `app/core/mailer.py` + HTML Renderers

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R6, AC-R7, AC-R15, AC-R13, AC-U2, AC-U3

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T1-TR1 | rule | `send_system_email(to, subject, html, db) -> dict` returns `{status, via, message_id?, preview_text?, error?}`. | Signature matches spec. |
| T1-TR2 | rule | When no active `SystemSmtpConfig`: returns `status='preview'`. `preview_text` non-empty. `logger.info()` called. | Branch code + return. |
| T1-TR3 | rule | Active config + `encryption='SSL'`: uses `smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=20)`. Wrapped in `asyncio.to_thread`. | Branch code. |
| T1-TR4 | rule | Active config + `encryption='TLS'` or NONE: uses `SMTP(host, port, timeout=20)` → ehlo → (if TLS: `starttls(context)`, ehlo, login). Wrapped in to_thread. | Branch code. |
| T1-TR5 | rule | `_encrypt_smtp_password(clear, secret_key_source) -> str`. Fernet if cryptography installed; else XOR+base64 + `logger.warning("install cryptography>=41")`. | Both branches exist. |
| T1-TR6 | rule | `_decrypt_smtp_password(cipher, secret) -> str` inverse. Correctly decrypts both Fernet and XOR ciphertexts. Empty str returns empty. | Inverse test. |
| T1-TR7 | rule | `render_password_reset_email()` returns single HTML string with inline `style=` on every colored/div element. NO `<style>` blocks. | Output grep. |
| T1-TR8 | rule | `render_test_email()` returns HTML banner, provider hint, sender label, timestamp. All inline style, no `<style>` blocks. | Output grep. |
| T1-TR9 | rule | `py_compile mailer.py` exit=0. | Shell stdout. |
| T1-TR10 | rubric | Exception safety 0-2: Low=no try/except on socket/SMTP. Mid=catches generic Exception. High=catches socket.gaierror, TimeoutError, SMTPException, ssl.SSLError + returns structured error dict, never raises. Threshold ≥ 1.5. | Code review. |

---

## Task 2: Backend — SMTP Admin Endpoints `endpoints/smtp.py` + Router Mount

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R7, AC-R8, AC-R14, AC-R13, AC-U2, AC-U3

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T2-TR1 | rule | `APIRouter(dependencies=[Depends(require_super_admin)])` gate-wide. 3 routes: GET /, POST /, POST /test. | smtp.py file. |
| T2-TR2 | rule | GET / returns active row (first where is_active==True) OR null. Password: if any mask applied, len>=3 and only last2 chars revealed. | Handler. |
| T2-TR3 | rule | POST / upsert. Before insert/update: all rows updated `is_active=False`. `updated_by_id=current_user.id`. Password passed to `_encrypt_smtp_password`. Return masked. AuditLog: `action='SMTP_CONFIG_UPDATED'`, change_json password field = `"***"`. | Handler. |
| T2-TR4 | rule | POST /test: if `save_settings_first & settings` → calls upsert logic (same as POST /). Then `send_system_email(recipient, subject, render_test_email(), db)`. Updates last_tested_at, last_tested_recipient, last_tested_ok. AuditLog `SMTP_TEST_SENT`. | Handler. |
| T2-TR5 | rule | Mount in `api/v1/router.py` via `include_router(smtp.router, prefix="/admin", tags=["Super Admin SMTP Configuration"])`. Also add prefix="/super-admin" mount same as admin router for backwards compatibility. | router.py diff. |
| T2-TR6 | rule | `py_compile endpoints/smtp.py api/v1/router.py` exit=0. | Shell stdout. |

---

## Task 3: Backend — generate-reset-link 500 Final Fix + Auto-Dispatch Email

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R1, AC-R2, AC-R3, AC-R4, AC-R11, AC-R14, AC-U2

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T3-TR1 | rule | Imports: `from app.core.security import generate_secure_reset_token` is present in admin.py. `generate_secure_reset_token` exists in security.py L37-44. | Grep. |
| T3-TR2 | rule | Function body first lines: defensive `t_id = uuid.UUID(str(tenant_id))`, `u_id = uuid.UUID(str(user_id))` — use them in helpers. | Endpoint body. |
| T3-TR3 | rule | PRT constructor: `email_address=user.email, tenant_id=t_id` set. | Endpoint body lines 989-997. |
| T3-TR4 | rule | PRT table exists: grep init_live_db `_apply_password_reset_tokens_patch` + password_reset_tokens ORM in models/user.py L156. | Grep. |
| T3-TR5 | rule | After `db.commit()` + `db.refresh(prt)`: call `send_system_email(user.email, subject=..., html=render_password_reset_email(...), db)`. Capture result. | Endpoint body lines after 1023. |
| T3-TR6 | rule | Return dict includes all 12 union fields: status/success, raw_token, reset_url, expires_in, reset_link, token_id, expires_at, validity_hours, user_id, email_sent, email_dispatch_status, email_error. Union matches both spec §1 and GenerateAdminResetLinkResponse. | Schema + response. |
| T3-TR7 | rule | AuditLog PASSWORD_RESET_EMAILED entry written additionally or appended to existing PASSWORD_RESET_ISSUED. | Audit count >=2 for success path. |
| T3-TR8 | rule | `py_compile admin.py mailer.py schemas/admin.py security.py` exit=0. | Shell stdout. |

---

## Task 4: Shared api-client — types + methods (SmtpConfig, get, save, test, GenerateResetLinkResult enrichment)

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R9 (indirect FE depends), NFR-8

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T4-TR1 | rule | `types.ts`: `SmtpProviderLiteral`, `SmtpEncryptionLiteral`, `SmtpConfigResult` (password masked), `SmtpConfigPayload` (password clear), `SmtpTestPayload`, `SmtpSendResult`. `GenerateResetLinkResult` expanded with email_sent, email_dispatch_status, email_error optional fields. | types.ts diff. |
| T4-TR2 | rule | `client.ts`: `getSmtpConfig`, `saveSmtpConfig(payload)`, `testSmtpConnection(payload)`. Signature pattern matches sibling methods (`createAdminUser`, etc). | client.ts diff. |
| T4-TR3 | rule | No unused interfaces. `tsc --noEmit` clean. (T4-TR3 runs as part of T7.) | T7 output. |

---

## Task 5: Frontend — `/super-admin/smtp` Page + Layout Sidebar Nav Item

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R9, AC-R10, AC-U1, AC-U3, AC-R12

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T5-TR1 | rule | New file `apps/hospital-web/src/app/(super-admin)/super-admin/smtp/page.tsx` exists. "use client"; `createApiClient()`, state hooks for form, `useEffect` on mount GET config. | File exists. |
| T5-TR2 | rule | Layout `layout.tsx`: navItems array adds "Email & SMTP Gateway" with `href="/super-admin/smtp"` and lucide `Mail` (or Send if Mail unavail) icon. Logical position: after Infrastructure & DLQ, before SaaS Plans/Multi-Country Billing. | layout.tsx diff. |
| T5-TR3 | rule | Provider Preset chips: GMAIL (smtp.gmail.com 587 TLS), GOOGLE_WORKSPACE (smtp-relay.gmail.com 587 TLS), AWS_SES (email-smtp.us-east-1.amazonaws.com 587 TLS with note user can change region), SENDGRID (smtp.sendgrid.net 587 TLS, username forced to literal "apikey"), CUSTOM. Click fills form state appropriately. | Page handler code. |
| T5-TR4 | rule | Password field: Input with type="password" default, Eye/EyeOff icon toggle → type="text" when revealed. | Handler + state. |
| T5-TR5 | rule | "Save SMTP Settings" → `apiClient.saveSmtpConfig(payload)`. "Test Connection & Send Live Email" → opens NotificationModal asking recipient email, prefilled with current admin email (from JWT decode or `useAuth`). POST test. Toasts: success emerald / preview amber / error rose. | Handlers. |
| T5-TR6 | rule | Form includes Host, Port, Encryption (3 chips TLS/SSL/NONE), Username, Password, Sender Email, Sender Name. | Form structure. |
| T5-TR7 | rule | Build gates (T7): `tsc` + Next build both exit 0. Route `/super-admin/smtp` appears in Next routes list. | T7 stdout. |

---

## Task 6: Frontend — Manage Drawer Tab C Email Dispatch Toast & Badge Updates

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R11, AC-R12

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T6-TR1 | rule | `handleGenerateResetLink(userId)`: after await result, inspect `email_dispatch_status` ('sent'/'preview'/'error'). Toast title/message accordingly: emerald "Reset link dispatched via email to {staffEmail}", amber "Reset link generated. No active SMTP configured — preview logged to server logs.", rose "Reset link generated but email failed: {error}". | Handler. |
| T6-TR2 | rule | Copyable Input + "Copy Reset Link" Button ALWAYS rendered regardless of dispatch outcome. | JSX structure. |
| T6-TR3 | rule | Additional badge next to "Valid for N hours": shows "📧 Email sent" or "📋 Preview logged" or "⚠️ Email failed" using Badge component (emerald/slate/rose variants). | Badge JSX. |
| T6-TR4 | rule | `GenerateResetLinkResult` TS enrichment accepted — no TS errors. (Verified in T7.) | tsc stdout. |

---

## Task 7: Build Gates + Backend Parse Correctness

- **Status: pending**
- **Priority: high**
- **Maps to ACs**: AC-R12, AC-R13, T5-TR7

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| T7-TR1 | rule | `pnpm type-check --filter=@medipaedia/hospital-web` exit=0. | Shell stdout. |
| T7-TR2 | rule | `pnpm build --filter=@medipaedia/hospital-web` exit=0. Routes list shows `/super-admin/smtp` + `/super-admin/facilities` both present, no route errors. | Shell stdout. |
| T7-TR3 | rule | Backend parse `python -m py_compile app/core/mailer.py app/api/v1/endpoints/smtp.py app/api/v1/endpoints/admin.py app/models/smtp_config.py app/db/init_live_db.py app/schemas/admin.py app/schemas/smtp.py app/api/v1/router.py` exit=0. | Shell stdout. |
| T7-TR4 | rule | `pnpm type-check --filter=@medipaedia/api-client` exit=0. | Optional, shell stdout. |

---

## Task 8: Independent Review (R1) — spec.md vs Implementation Review

- **Status: pending**
- **Priority: high**
- **Maps to ALL ACs**

### Test Requirements (TRs)

| ID | Type | Condition | Evidence |
|---|---|---|---|
| R1-TR1 | rule | Produce `review.md` in spec folder. All 16 Rule ACs (R1-R16) marked as passing with evidence refs. | review.md content. |
| R1-TR2 | rubric | AC-U1 ≥ 1.5. | Rationale + score. |
| R1-TR3 | rubric | AC-U2 = 2 (critical exact threshold — mandatory security fidelity max). | Rationale + evidence. |
| R1-TR4 | rubric | AC-U3 ≥ 1.5. | Rationale + score. |
| R1-TR5 | rule | Workflow fidelity 0-2: high score → 5 phases + artifact boundaries followed exactly. Threshold ≥ 1.5. | Rationale. |

---

## Cancelled Items

None. All 8 tasks required for complete feature.
