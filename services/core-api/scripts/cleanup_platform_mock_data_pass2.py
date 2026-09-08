import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from sqlalchemy import delete, func
from app.core.database import get_session_local, get_engine
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.models.base import Base
from app.models.invitation import TenantOnboardingInvitation, StaffOnboardingInvitation
from app.models.infrastructure import WebhookDeadLetter, GatewayHealthLog, TenantHealthAudit
from app.models.payment import PharmacyBalanceLedger, PlatformTransaction, SettlementPayout
from app.models.audit import AuditLog
from app.models.order import Order
from app.models.prescription import Prescription
from app.models.patient import PatientAccount
from app.models.staff_profile import StaffProfile


KEEP_EMAIL_HINT = "elzakari@easymsdigit.com"


async def show_counts(session, label):
    targets = [
        (User, "users"),
        (Tenant, "tenants"),
        (TenantOnboardingInvitation, "tenant_invitations"),
        (StaffOnboardingInvitation, "staff_invitations"),
        (WebhookDeadLetter, "webhook_dlq"),
        (GatewayHealthLog, "gateway_health_logs"),
        (TenantHealthAudit, "tenant_health_audits"),
        (PharmacyBalanceLedger, "pharmacy_ledgers"),
        (PlatformTransaction, "platform_transactions"),
        (SettlementPayout, "settlement_payouts"),
        (AuditLog, "audit_logs"),
        (Order, "orders"),
        (Prescription, "prescriptions"),
        (PatientAccount, "patient_accounts"),
        (StaffProfile, "staff_profiles"),
    ]
    counts = {}
    for entity, name in targets:
        try:
            res = await session.execute(select(func.count()).select_from(entity))
            counts[name] = res.scalar_one()
        except Exception as e:
            counts[name] = f"ERR:{type(e).__name__}"
    line = " ".join(f"{k}={v}" for k, v in counts.items())
    print(f"    [{label}] {line}")
    return counts


async def run_cleanup():
    session_factory = get_session_local()
    engine = get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        print("[>] Starting PASS-2 platform-wide mock data cleanup ...")
        print(f"    (SA anchor hint = {KEEP_EMAIL_HINT})")

        before = await show_counts(session, "BEFORE")

        # Resolve anchor SA email
        keep_stmt = select(User.email).where(
            User.role == UserRole.SUPER_ADMIN,
            User.email == KEEP_EMAIL_HINT,
        )
        keep_email = (await session.execute(keep_stmt)).scalars().first()
        if not keep_email:
            first_stmt = (
                select(User.email)
                .where(User.role == UserRole.SUPER_ADMIN)
                .order_by(User.created_at.desc())
                .limit(1)
            )
            keep_email = (await session.execute(first_stmt)).scalars().first()
        if not keep_email:
            print("[!] Zero SUPER_ADMIN rows — aborting to avoid wiping everything.")
            return
        print(f"[*] Single Super Admin anchor to keep: {keep_email}")

        # ======= PASS 1: Re-run user + tenant purge (idempotent) =======
        du = await session.execute(delete(User).where(User.email != keep_email))
        print(f"[-] users       purged {du.rowcount} non-anchor rows")

        dt = await session.execute(delete(Tenant))
        print(f"[-] tenants     purged {dt.rowcount} rows (cascade branches/inventories/IBT)")

        # ======= PASS 2: Invitations (tenant + staff onboarding) =======
        di1 = await session.execute(delete(TenantOnboardingInvitation))
        print(f"[-] invitations purged {di1.rowcount} TenantOnboardingInvitation rows (Active Onboarding Invitations list)")

        di2 = await session.execute(delete(StaffOnboardingInvitation))
        print(f"[-] invitations purged {di2.rowcount} StaffOnboardingInvitation rows")

        # ======= PASS 3: Infrastructure tables (DLQ / gateway logs / health audits) =======
        dd = await session.execute(delete(WebhookDeadLetter))
        print(f"[-] infra       purged {dd.rowcount} WebhookDeadLetter (DLQ) rows")

        dgh = await session.execute(delete(GatewayHealthLog))
        print(f"[-] infra       purged {dgh.rowcount} GatewayHealthLog rows")

        dtha = await session.execute(delete(TenantHealthAudit))
        print(f"[-] infra       purged {dtha.rowcount} TenantHealthAudit rows")

        # ======= PASS 4: Financial / settlement / order / rx ledgers =======
        dl1 = await session.execute(delete(PharmacyBalanceLedger))
        print(f"[-] finance     purged {dl1.rowcount} PharmacyBalanceLedger rows")

        dl2 = await session.execute(delete(PlatformTransaction))
        print(f"[-] finance     purged {dl2.rowcount} PlatformTransaction rows")

        dl3 = await session.execute(delete(SettlementPayout))
        print(f"[-] finance     purged {dl3.rowcount} SettlementPayout rows")

        # ======= PASS 5: Audit log (tenant/user FK SET NULL already, wipe entries) =======
        da = await session.execute(delete(AuditLog))
        print(f"[-] audit       purged {da.rowcount} AuditLog rows (clean slate)")

        # ======= PASS 6: Clinical / operational artifacts =======
        do = await session.execute(delete(Order))
        print(f"[-] clinical    purged {do.rowcount} Order rows")

        drx = await session.execute(delete(Prescription))
        print(f"[-] clinical    purged {drx.rowcount} Prescription rows")

        dpa = await session.execute(delete(PatientAccount))
        print(f"[-] clinical    purged {dpa.rowcount} PatientAccount rows")

        dsp = await session.execute(delete(StaffProfile))
        print(f"[-] clinical    purged {dsp.rowcount} StaffProfile rows")

        await session.commit()

        after = await show_counts(session, "AFTER ")
        print("")

        ok = (
            after.get("users") == 1
            and after.get("tenants") == 0
            and after.get("tenant_invitations") == 0
            and after.get("staff_invitations") == 0
            and after.get("webhook_dlq") == 0
            and after.get("gateway_health_logs") == 0
            and after.get("tenant_health_audits") == 0
            and after.get("pharmacy_ledgers") == 0
            and after.get("platform_transactions") == 0
            and after.get("settlement_payouts") == 0
            and after.get("audit_logs") == 0
            and after.get("orders") == 0
            and after.get("prescriptions") == 0
            and after.get("patient_accounts") == 0
            and after.get("staff_profiles") == 0
        )

        if ok:
            print("[O] PASS-2 cleanup SUCCESSFUL. DB state = SA-only anchor + statutory reference tables only.")
            print(f"    (SA anchor: {keep_email}). All platform operational data zeroed.")
        else:
            print("[?] PASS-2 expected all-zero operational rows except users==1. Review above AFTER line.")


if __name__ == "__main__":
    asyncio.run(run_cleanup())
