# Medipaedia SaaS Platform (Phase 1)

Medipaedia is a unified multi-tenant healthcare, electronic medical record (EMR/EHR), and pharmacy marketplace SaaS platform architected for emerging healthcare markets.

---

## 🏗 Monorepo Architecture

Managed via **Turborepo** and **pnpm**:

```
medipaedia/
├── apps/
│   ├── hospital-web/      # (@medipaedia/hospital-web) Next.js 14 Clinical EHR, OPD triage, Vitals & E-Prescription writer
│   ├── pharmacy-pos/      # (@medipaedia/pharmacy-pos) Next.js 14 Rx POS, QR verification scanner & batch inventory
│   └── patient-store/     # (@medipaedia/patient-store) Next.js 14 Patient portal, Ghana Card records & Escrow marketplace
├── packages/
│   ├── config/            # (@medipaedia/config) Shared Tailwind presets, TypeScript configs, ESLint rules
│   ├── ui/                # (@medipaedia/ui) Shared Tailwind/Radix UI design system, QR components, stat cards
│   └── api-client/        # (@medipaedia/api-client) Typed SDK for consuming medipaedia-core-api
├── services/
│   └── core-api/          # (medipaedia-core-api) Python 3.12 FastAPI backend, SQLAlchemy async, GeoAlchemy2, Alembic
└── docker/
    └── docker-compose.dev.yml # PostgreSQL 16 with PostGIS & Redis
```

---

## 🚀 Quick Start Guide

### 1. Start Infrastructure (PostGIS & Redis)
```bash
cd medipaedia
pnpm docker:up
```

### 2. Install Node Workspace Dependencies
```bash
pnpm install
```

### 3. Setup Backend Core API
```bash
cd services/core-api
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -e ".[dev]"
```

### 4. Run Database Migrations
```bash
# From medipaedia root or services/core-api:
pnpm db:migrate
```

### 5. Launch All Applications & Services
```bash
pnpm dev
```
- **Medipaedia Clinical (Hospital Portal)**: [http://localhost:3000](http://localhost:3000)
- **Medipaedia Rx (Pharmacy POS & QR Scanner)**: [http://localhost:3001](http://localhost:3001)
- **Medipaedia Care (Patient Store & Health Pass)**: [http://localhost:3002](http://localhost:3002)
- **FastAPI Core API Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

---

## 🛡 Security & Cryptographic Verifications

1. **HMAC-SHA256 E-Prescription Hash**: Every prescription generated is hashed against its medication items, doctor ID, patient account, issuing facility, and UTC timestamp. Scanners in `apps/pharmacy-pos` verify this signature to prevent tampering.
2. **Unified Patient ID & MRN**: Patient accounts map to Ghana Card / National IDs globally, while `HospitalPatientCard` keeps MRNs and facility-specific medical folders secure.
3. **Escrow Protection**: Marketplace orders lock funds with Paystack until medication delivery or pickup is verified.
