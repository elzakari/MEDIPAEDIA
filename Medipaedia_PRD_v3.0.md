# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Product Name:** Medipaedia Enterprise Clinical & Healthcare SaaS
**Document Version:** 3.0 (Hardened Production Release)
**Supersedes:** v2.5
**Target Markets:** Ghana (GHS), Togo & Benin (XOF), International (USD)
**Primary Standards:** Ghana Data Protection Act (Act 843), Health Professions Regulatory Bodies Act (Act 857), Ghana FDA Guidelines, NIST 800-53 (control baseline), OWASP ASVS L2, ISO/IEC 27001 alignment
**Change Log:** v3.0 adds a formal Non-Functional Requirements section, a Security & Threat Model chapter, explicit RBAC permission matrices, Data Governance & Retention policy, SLO/DR targets, and a Risk Register. Functional scope from v2.5 is retained and tightened.

---

## 1. Executive Summary & Problem Statement

### 1.1 Executive Summary
Medipaedia is an integrated multi-tenant healthcare operating system for clinical facilities, community pharmacies, regulatory bodies, and patients across West Africa. It unifies EMR, nurse triage telemetry, CPOE, revenue cycle management, pharmaceutical inventory (FEFO), statutory compliance, and patient self-service in an event-driven SaaS architecture.

Version 3.0 reframes the product around a **security-and-reliability-first** posture: every clinical or financial workflow in Section 3 is now paired with an explicit control in Section 5 (Security & Threat Model) and a measurable target in Section 6 (Non-Functional Requirements). Nothing in the original feature set is removed; the changes close gaps around encryption, key custody, tenant isolation verification, auditability, and failure recovery that a document titled "Production Release" needs to state explicitly rather than imply.

### 1.2 Problems Addressed
* **Fragmented Clinical Documentation** — Ambient AI Scribe captures dialogue, redacts PHI tokens before any storage or model call, and structures draft SOAP notes for clinician sign-off (drafts are never auto-committed to the legal record).
* **Delayed Detection of Patient Deterioration** — Real-time MEWS scoring from triage vitals, alerting nursing/doctor queues at MEWS ≥ 5, with escalation if unacknowledged within a configurable SLA window.
* **Prescription Fraud & Dispensation Errors** — HMAC-SHA256 signed e-prescriptions, 6-character claim PINs, weight-based dosimetry, and FEFO batch allocation, now with signing-key rotation and replay protection (Section 5.3).
* **Cross-Border Billing & Regulatory Non-Compliance** — Native multi-currency support (GHS, XOF) via Paystack, FedaPay, and MoMo USSD, with statutory audit tooling for Act 857 and reconciled, idempotent webhook handling.
* **Undetected Tenant Data Leakage** *(new)* — Formal, testable tenant-isolation guarantees rather than an architectural assumption (Section 5.1).
* **Unrecoverable Data Loss / Downtime** *(new)* — Defined RPO/RTO targets and a tested disaster-recovery runbook (Section 6.4).

---

## 2. User Personas & Role-Based Access Control (RBAC)

### 2.1 Persona Table

| Role Code | User Persona | Portal | Statutory / Administrative Responsibilities |
| :--- | :--- | :--- | :--- |
| `DOCTOR` | MDC-Licensed Practitioners | `apps/hospital-web` | Ambient AI SOAP notes, CPOE, STAT orders, HMAC e-prescribing |
| `NURSE` | NMC-Licensed Nurses, Triage Officers | `apps/hospital-web` | ESI triage, MEWS scoring, STAT runner execution, eMAR, SBAR handovers |
| `RECORDS_CLERK` | Front Desk, Health Info Officers | `apps/hospital-web` | Check-in, ID OCR, folder tracking, waiting room TV calling |
| `CASHIER` | Cashiers, Revenue Officers | `apps/hospital-web` | Billing folios, MoMo USSD push, till reconciliation, claim scrubbing |
| `HOSPITAL_ADMIN` | Medical Directors, Administrators | `apps/hospital-web` | Credentialing, roster scheduling, bed/theatre occupancy, G-DRG tariffs |
| `PHARMACIST` | Licensed Pharmacists, Technicians | `apps/pharmacy-pos` | Claim verification, FEFO allocation, AI counseling, fulfillment |
| `SUPERINTENDENT` | Superintendent Pharmacists, Compliance | `apps/pharmacy-pos` | Dangerous Drugs Register, batch quarantine, cold-chain telemetry |
| `PHARMACY_ADMIN` | Owners, Inventory Managers | `apps/pharmacy-pos` | Depletion radar, forecasting, markups, IBT, cycle audits |
| `PATIENT` | Patients, Caregivers | `apps/patient-store` | ICE pass, pill box adherence, refills, telehealth |
| `SUPER_ADMIN` | Platform Security/Billing Engineers | `apps/hospital-web` | Subscriptions, gateway failover, webhook DLQ, outbreak sentinel |

### 2.2 Least-Privilege Permission Matrix *(new — replaces implied access with explicit scoping)*

Every role is granted the **minimum** of: (a) object-level access, (b) field-level access (PHI vs. non-PHI), and (c) action (read / write / approve). Examples that must be encoded as policy, not convention:

| Capability | DOCTOR | NURSE | PHARMACIST | CASHIER | RECORDS_CLERK | SUPER_ADMIN |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| View full SOAP note (own patients) | R/W | R (own ward) | ✗ | ✗ | ✗ | ✗ (break-glass only) |
| Sign e-prescription | Approve | ✗ | ✗ | ✗ | ✗ | ✗ |
| Verify claim PIN / dispense | ✗ | ✗ | R/W | ✗ | ✗ | ✗ |
| View patient billing folio | R (own encounters) | ✗ | ✗ | R/W | R (summary only) | Audit-log only |
| Modify Dangerous Drugs Register | ✗ | ✗ | R | R/W (SUPERINTENDENT only) | ✗ | ✗ |
| Tenant subscription/billing config | ✗ | ✗ | ✗ | ✗ | ✗ | R/W |
| Cross-tenant data access | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ (no standing access — see 5.1) |

* All permission grants are enforced server-side via policy checks (e.g., OPA/Rego or equivalent), never client-side only.
* **Break-glass access** (emergency override of normal scoping, e.g., unidentified trauma patient) requires dual justification (reason code + supervisor co-sign within 24h) and generates an immutable, non-suppressible audit event.
* Every role assignment carries an expiry or periodic re-attestation requirement (default: 90 days for clinical roles, 30 days for `SUPER_ADMIN`).

---

## 3. Product Features & Functional Requirements
*(Retained from v2.5, condensed; full detail available on request)*

### 3.1 Doctor Clinical Workstation
Queue triage ingestion (ESI 1–5); Ambient AI Scribe (Zero-PHI, SOAP drafting, clinician review required before commit); ICD-10 differential co-pilot; CPOE + STAT directives; HMAC-SHA256 e-prescription minting with mg/kg dosimetry, DDI/allergy checks, 6-character claim PIN, and cryptographic QR token.

### 3.2 Nurse Station & Inpatient Wards
ESI triage + real-time MEWS radar (alert ≥ 5, escalation on non-acknowledgment); STAT order runner tray; eMAR 5-rights administration; 24h fluid balance; SBAR handover with dual digital signature.

### 3.3 Front Desk Reception
Ghana Card / barcode / QR intake via USB wedge; CV-based ID OCR (<2s); emergency trauma intake with temporary identifiers and later profile-merge workflow (merge requires two-person confirmation to prevent identity mix-ups); physical folder archival grid; waiting room TV calling (English/French TTS).

### 3.4 Hospital Finance & Revenue Cycle
Till shift float/reconciliation with supervisor sign-off; consolidated folios with NHIS co-pay splits; multi-country MoMo push via Paystack/FedaPay with idempotent webhook verification (Section 5.3) before receipt printing or drawer kick; AI claim scrubber against DRG/HMO tariffs.

### 3.5 Pharmacist Dispensary & POS
Claim PIN/QR verification against HMAC signatures; FEFO allocation; 50×30mm label printing; multilingual counseling (EN/FR/Twi/Ewe/Ga) via SMS/WhatsApp with patient opt-in and no PHI persisted in the messaging vendor's logs; handwriting OCR for external Rx (flagged for pharmacist confirmation, never auto-dispensed); split-screen fulfillment with escrowed payment release.

### 3.6 Superintendent Pharmacist Compliance Hub
Dangerous Drugs Register (Act 857) with dual-key access (Superintendent PIN + system auth); batch quarantine/recall with immediate cross-POS stock freeze; cold-chain telemetry (2–8°C) with alerting; SHA-256-signed inspectorate audit packages.

### 3.7 Pharmacy Administration & Supply Chain
Depletion radar and seasonal forecasting; dynamic markups by category; inter-branch transfers with digital waybills; blind cycle-count audits with variance reporting.

### 3.8 Medipaedia Care Patient Portal
Offline-capable Emergency ICE pass (patient-controlled disclosure — see 5.4); 4-phase pill box adherence; telehealth via encrypted WebRTC; diagnostic records vault with patient-initiated export/delete requests (Section 7).

### 3.9 Super Admin Mission Control
Multi-currency subscription engine; payment gateway failover radar; webhook Dead-Letter Queue with idempotent, signature-verified replay; outbreak sentinel built on de-identified aggregate data only (k-anonymity threshold enforced before any cluster is surfaced).

---

## 4. Onboarding Architecture

* **Facility Onboarding:** Super Admin-initiated; 72-hour, single-use, cryptographically random (≥128-bit entropy) URL-safe token, invalidated on first use or expiry; provisions tenant, `MAIN-HUB` branch, root admin, and subscription tier.
* **Staff Onboarding:** Tenant Admin-issued, 48-hour role-scoped invitation links; seat-quota enforcement (HTTP 402) prior to token issuance; mandatory MFA enrollment before first login completes (Section 5.2).
* All invitation tokens are single-use, bound to the invited email, and logged with issuer identity for audit.

---

## 5. Security & Threat Model *(new chapter — the core of this revision)*

### 5.1 Multi-Tenant Isolation
* **Enforcement:** PostgreSQL Row-Level Security scoped by `tenant_id`, applied at the database layer (not just application middleware), so a query missing a tenant filter fails closed rather than returning cross-tenant rows.
* **Verification:** Automated isolation tests run in CI on every schema migration — a synthetic "hostile tenant" test suite attempts cross-tenant reads/writes and must fail 100% of the time before merge.
* **Standing access:** No engineer or `SUPER_ADMIN` role has default query access to clinical tenant data; access requires a time-boxed, logged, ticket-linked grant.

### 5.2 Identity, Authentication & Session Management
* MFA (TOTP or WebAuthn) mandatory for all staff roles; risk-based step-up MFA for `SUPER_ADMIN` and `SUPERINTENDENT` actions (e.g., Dangerous Drugs Register writes).
* Passwords: Argon2id hashing, breached-password screening at set time.
* Sessions: short-lived access tokens (≤15 min) with rotating refresh tokens; automatic session termination on role change or credential compromise; device/session list visible and revocable by the user.
* Patient portal: supports passwordless (OTP/WebAuthn) login given the lower technical literacy assumption for some users, with fallback SMS OTP rate-limited to resist SIM-swap abuse.

### 5.3 Cryptography & Payment Integrity
* **E-prescription signing:** HMAC-SHA256 keys held in a dedicated KMS/HSM-backed secrets store, never in application config or source control; keys rotated on a defined schedule with overlap period for signature verification of in-flight prescriptions; each signature includes a nonce and timestamp to prevent replay.
* **Data at rest:** AES-256 encryption for all PHI-bearing tables and object storage (audio for Ambient Scribe, ID scans, diagnostic files); encryption keys managed separately from data (envelope encryption).
* **Data in transit:** TLS 1.2+ enforced everywhere, including internal service-to-service calls; certificate pinning for mobile/USB-reader hardware integrations where feasible.
* **Webhooks (Paystack/FedaPay/Hub2):** All inbound webhooks verified via provider signature before processing; processing is idempotent (deduplicated by provider transaction ID) so retried webhooks cannot double-credit a till or double-print a receipt.
* **Ambient AI Scribe:** PHI redaction/tokenization happens **before** audio or transcript leaves the tenant's isolated processing boundary; raw audio is retained only as long as needed for clinician review, then purged per the retention schedule in Section 7.

### 5.4 Patient-Controlled Disclosure
* The Emergency ICE Pass and portal data-sharing are opt-in and scoped: patients choose what a scanning clinician sees (e.g., allergies + blood group only, vs. full history) except where local law mandates disclosure to emergency responders.

### 5.5 Application Security
* OWASP ASVS Level 2 as the baseline for all externally reachable services.
* Server-side authorization checks on every mutating endpoint (no reliance on hidden UI elements for security).
* Rate limiting and WAF in front of public endpoints (patient portal, OCR upload, webhook receivers); anomaly detection on claim-PIN verification attempts to catch brute-force guessing of the 6-character PIN space (recommend pairing PIN with QR token or short expiry rather than PIN alone as a standing bearer credential).
* Dependency and container image scanning in CI; secrets scanning on every commit.
* Third-party penetration test at least annually and after any major architecture change; findings tracked to closure with SLAs by severity.

### 5.6 Audit & Non-Repudiation
* Append-only, tamper-evident audit log (hash-chained or WORM storage) for: prescription signing, Dangerous Drugs Register changes, break-glass access, billing adjustments, and role/permission changes.
* Audit logs are themselves tenant-isolated and excluded from standard data-export/delete requests (retained per statutory requirement even if a patient exercises deletion rights elsewhere — this exception should be disclosed in the privacy notice).

---

## 6. Non-Functional Requirements *(new)*

### 6.1 Availability & Performance
* Target uptime: 99.9% for clinical modules (Doctor/Nurse/Pharmacy), 99.5% for admin/reporting modules — stated as targets, not guarantees, pending real infrastructure sign-off.
* MEWS scoring and STAT alert delivery: sub-5-second end-to-end latency from vitals entry to nurse/doctor notification.
* Claim PIN verification at point of dispensing: sub-1-second response to avoid pharmacy counter delay.

### 6.2 Scalability
* Multi-tenant architecture must support horizontal scaling per-tenant load (a single high-volume hospital tenant should not degrade latency for smaller pharmacy tenants) — requires either sharding, per-tenant resource quotas, or noisy-neighbor throttling; this must be load-tested before GA, not assumed.

### 6.3 Observability
* Structured logging, distributed tracing, and metrics across all services; PHI must never appear in logs (enforced via log-scrubbing middleware, tested in CI).
* Dashboards and alerting for: webhook DLQ depth, gateway failover events, MEWS alert delivery latency, and authentication anomaly rates.

### 6.4 Disaster Recovery & Business Continuity
* Recovery Point Objective (RPO) and Recovery Time Objective (RTO) must be formally defined per data class before launch (e.g., clinical/financial data likely needs RPO ≤ 15 min; this PRD flags the need rather than asserting an unverified number).
* Automated, encrypted backups with periodic restore drills (a backup that has never been restored in a drill is not a verified backup).
* Documented failover runbook for payment gateway outage (Paystack/FedaPay/Hub2) so cashier workflows degrade gracefully (e.g., manual receipt mode) rather than blocking care.

### 6.5 Accessibility & Localization
* WCAG 2.1 AA target for patient-facing portal.
* Full EN/FR parity confirmed in v2.5; recommend adding at least one local-language (Twi/Ewe/Ga) UI pass beyond the counseling-message layer, since those languages currently only appear in AI-generated counseling text, not the interface itself.

---

## 7. Data Governance & Retention *(new)*

| Data Class | Examples | Retention | Notes |
| :--- | :--- | :--- | :--- |
| Statutory clinical record | Encounter notes, e-prescriptions, Dangerous Drugs Register | Per Ghana MOH / Act 857 minimum retention (confirm exact statutory duration with legal counsel before GA) | Cannot be deleted early even on patient request |
| Ambient Scribe raw audio | Pre-redaction audio | Deleted after clinician review window (recommend ≤30 days) | Never used for model training without separate, explicit consent |
| Billing/payment records | Folios, webhook payloads | Per tax/financial statutory minimum | Webhook raw payloads purged after reconciliation window |
| Patient portal preferences | Pill box schedule, notification prefs | Until account deletion | Deletable on request |
| Audit logs | Access logs, break-glass events | Statutory minimum + buffer | Exempt from patient deletion requests (disclose in privacy notice) |

* A documented Data Protection Impact Assessment (DPIA) should be completed under Ghana's Act 843 before processing PHI at scale, given the volume of biometric/ID and health data involved.
* Sub-processor list (Paystack, FedaPay, Hub2, SMS/WhatsApp providers, cloud host) must be published and kept current, with data-processing agreements in place for each.

---

## 8. Risk Register *(new — top items only)*

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Cross-tenant data leakage via missed RLS policy on new table | Medium | Critical | CI isolation test gate (5.1); schema-change review checklist |
| 6-character claim PIN brute-forced at pharmacy counter | Medium | High | Rate limit + lockout; pair with QR/short expiry; monitor anomalous verification attempts |
| Webhook replay causing double payment credit | Low–Medium | High | Idempotency keys, signature verification (5.3) |
| Ambient Scribe audio retained beyond necessity, becoming a PHI liability | Medium | High | Enforced purge job + audit (Section 7) |
| Superintendent PIN shared/reused across staff, undermining Dangerous Drugs accountability | Medium | High | Dual-factor (PIN + individual auth), periodic re-attestation |
| Unverified backups fail during real incident | Low | Critical | Mandatory quarterly restore drills (6.4) |
| SMS/WhatsApp counseling channel logs PHI at vendor | Medium | Medium | DPA with vendor; minimize payload to non-identifying instructions where possible |

---

## 9. Open Items for Stakeholder Sign-Off
Flagging explicitly rather than presenting as decided:
1. Exact statutory retention durations under Act 857 and Act 843 — needs legal confirmation.
2. Numeric RPO/RTO targets per data class — needs infra team commitment, not just aspiration.
3. Whether claim-PIN-only dispensing (without QR) is acceptable risk for launch markets, or should be QR-mandatory.
4. Scope of local-language UI beyond counseling text (Twi/Ewe/Ga interface localization).
5. Consent model for any future use of de-identified data in the Outbreak Sentinel beyond aggregate/k-anonymized reporting.

---

## 10. End-to-End System Workflow

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FULL ENCOUNTER & REVENUE LIFECYCLE                               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
   ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
   ▼                                         ▼                                         ▼
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ 1. INTAKE & TRIAGE       │      │ 2. CLINICAL ENCOUNTER    │      │ 3. BILLING & DISPENSARY  │
├─────────────────────────┤      ├─────────────────────────┤      ├─────────────────────────┤
│ • USB / AI Card Scan     │ ──►  │ • Ambient AI SOAP Draft   │ ──►  │ • Consolidated Folio      │
│ • MEWS Vitals Engine     │      │ • Probabilistic ICD-10    │      │ • Signed MoMo Webhook     │
│ • Queue Ticket Issued    │      │ • STAT Directives Run     │      │ • FEFO Batch Allocation   │
│ • Waiting Room TV Call   │      │ • HMAC-SHA256 Rx Mint     │      │ • 50x30mm Thermal Label   │
└─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
        │                                 │                                 │
        ▼                                 ▼                                 ▼
   Tenant-scoped RLS                 Audit-logged, signed              Idempotent webhook,
   + CI isolation gate               HMAC prescription                  fraud/replay checks
```
