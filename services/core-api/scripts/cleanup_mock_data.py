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


async def show_counts(session, label):
    counts = {}
    for entity, name in [
        (User, "users"),
        (Tenant, "tenants"),
    ]:
        res = await session.execute(select(func.count()).select_from(entity))
        counts[name] = res.scalar_one()
    print(f"    [{label}] users={counts['users']} tenants={counts['tenants']}")
    return counts


async def run_cleanup():
    session_factory = get_session_local()
    engine = get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        print("[>] Starting DB cleanup: retain ONLY Super Admin account(s)...")

        await show_counts(session, "BEFORE")

        # 0) Decide anchor: keep only the custom Super Admin (elzakari@easymsdigit.com if present); otherwise the youngest SUPER_ADMIN by created_at desc
        keep_email_stmt = select(User.email).where(
            User.role == UserRole.SUPER_ADMIN,
            User.email == "elzakari@easymsdigit.com",
        )
        keep_res = await session.execute(keep_email_stmt)
        keep_email = keep_res.scalars().first()
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

        # 1) Delete NON-Super Admin users + ALL mock SUPER_ADMIN rows EXCEPT the anchor above.
        #    (So super.*@medipaedia.health demo/placeholder accounts are purged along with staff/patients.)
        del_users = await session.execute(
            delete(User).where(
                (User.email != keep_email)
            )
        )
        print(f"[-] Deleted {del_users.rowcount} non-anchor User rows (staff/patients + all mock SUPER_ADMIN placeholders + orphan profile cascades)")

        # 2) Delete ALL Tenants (cascades into: FacilityBranch, PharmacyInventory, InterBranchTransfer + items, SubscriptionPlan tenant-linked, AuditLog tenant-link goes SET NULL so no issue)
        del_tenants = await session.execute(delete(Tenant))
        print(f"[-] Deleted {del_tenants.rowcount} Tenant rows (cascade branches, inventories, IBTs)")

        # 3) Clean orphan rows (tables with SET NULL FKs that may still reference removed entities):
        #    - AuditLog (user_id SET NULL / tenant_id SET NULL)
        #    - StaffOnboardingInvitation + TenantOnboardingInvitation cascade is on tenant CASCADE for some, SET NULL for users — we already deleted users cascade to invitations
        await session.commit()

        after = await show_counts(session, "AFTER ")
        print("")
        if after["users"] == 1 and after["tenants"] == 0:
            print(f"[O] Cleanup successful. DB contains ONLY Super Admin anchor: {keep_email}. Tenants/patients/staff + mock SA placeholders ALL purged.")
        else:
            print(
                f"[?] Expected users==1 tenants==0. Got users={after['users']} tenants={after['tenants']}."
            )

if __name__ == "__main__":
    asyncio.run(run_cleanup())
