from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    admin_billing,
    admin_infrastructure,
    admin_users,
    ai_analytics,
    ai_clinical,
    ai_vision,
    auth,
    branches,
    clinical,
    consultations,
    health,
    hospital_admin,
    hospital_finance,
    hospital_portal,
    inventory,
    nurse,
    orders,
    patient,
    patients,
    payments,
    pharmacy,
    pharmacy_admin,
    pharmacy_portal,
    prescriptions,
    reception,
    smtp,
    superintendent,
    tenants,
    hardware,
    tariffs,
    onboarding,
    staff,
    telemedicine,
)


api_router = APIRouter()

api_router.include_router(onboarding.router, prefix="/onboard", tags=["Public Onboarding Flows"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff Management & Onboarding"])


api_router.include_router(tariffs.router, prefix="/tariffs", tags=["Ghana NHIS G-DRG Tariffs & Formulary"])
api_router.include_router(hardware.router, prefix="/hardware", tags=["Hardware & Thermal Printing"])


api_router.include_router(admin_infrastructure.router, tags=["Admin Infrastructure & Security"])
api_router.include_router(admin_users.router, tags=["Admin User Management (Tenant-Scoped)"])
api_router.include_router(reception.router, prefix="/reception", tags=["Hospital Record Clerk & Reception"])
api_router.include_router(ai_clinical.router, prefix="/ai", tags=["AI Clinical Copilot & Scribe"])
api_router.include_router(ai_vision.router, prefix="/ai", tags=["AI Vision OCR & Queue Prediction"])
api_router.include_router(ai_analytics.router, prefix="/ai", tags=["AI Predictive Analytics & FinTech Scrubber"])

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["Super Admin Governance"])
api_router.include_router(admin.router, prefix="/super-admin", tags=["Super Admin Governance"])
api_router.include_router(smtp.router, prefix="/admin", tags=["Super Admin SMTP Gateway"])
api_router.include_router(smtp.router, prefix="/super-admin", tags=["Super Admin SMTP Gateway"])
api_router.include_router(admin_billing.router, prefix="/admin", tags=["Super Admin Dynamic Billing"])
api_router.include_router(admin_billing.router, prefix="/super-admin", tags=["Super Admin Dynamic Billing"])
api_router.include_router(
    hospital_admin.router, prefix="/hospital-admin", tags=["Hospital Facility Admin"]
)
api_router.include_router(
    hospital_finance.router, prefix="/hospital-finance", tags=["Hospital Revenue Cycle & Finance"]
)
api_router.include_router(
    pharmacy_admin.router, prefix="/pharmacy-admin", tags=["Pharmacy Facility Admin"]
)
api_router.include_router(
    hospital_portal.router, prefix="/hospital", tags=["Dedicated Hospital Portals"]
)
api_router.include_router(
    nurse.router, prefix="/nurse", tags=["Nurse Clinical Station"]
)
api_router.include_router(
    pharmacy_portal.router, prefix="/pharmacy-portal", tags=["Dedicated Pharmacy Portals"]
)
api_router.include_router(
    superintendent.router, prefix="/superintendent", tags=["Superintendent Pharmacist Regulatory"]
)
api_router.include_router(
    branches.router, prefix="/branches", tags=["Multi-Branch & Inter-Branch Transfer (IBT)"]
)
api_router.include_router(payments.router, prefix="/payments", tags=["Fintech & Escrow Settlements"])
api_router.include_router(patient.router, prefix="/patient", tags=["Patient Marketplace & Wallet"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["Clinical & EMR"])
api_router.include_router(pharmacy.router, prefix="/pharmacy", tags=["Pharmacy POS"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(patients.router, prefix="/clinical/patients", tags=["Patients"])
api_router.include_router(
    consultations.router, prefix="/consultations", tags=["Consultations"]
)
api_router.include_router(
    prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"]
)
api_router.include_router(
    inventory.router, prefix="/inventory", tags=["Pharmacy Inventory"]
)
api_router.include_router(orders.router, prefix="/orders", tags=["Orders & Escrow"])
api_router.include_router(telemedicine.router, prefix="/telemedicine", tags=["Telemedicine"])
