import asyncio
import os
import sys
import uuid
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from app.core.database import get_session_local, get_engine
from app.core.security import get_password_hash
from app.models.tenant import Tenant, TenantType
from app.models.user import User, UserRole
from app.models.patient import PatientAccount, HospitalPatientCard
from app.models.base import Base

DEFAULT_PASSWORD = "Medipaedia2026!"

async def seed_database():
    session_factory = get_session_local()
    engine = get_engine()

    # Create tables if not present
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        print("[*] Seeding complete Medipaedia demo facilities and role accounts...")

        # -------------------------------------------------------------
        # 1. Super Admin Account
        # -------------------------------------------------------------
        stmt = select(User).where(User.role == UserRole.SUPER_ADMIN).order_by(User.created_at.asc())
        res = await session.execute(stmt)
        admin_user = res.scalars().first()
        if not admin_user:
            res2 = await session.execute(select(User).where(User.email == "elzakari@easymsdigit.com"))
            admin_user = res2.scalars().first()
        if not admin_user:
            admin_user = User(
                id=uuid.uuid4(),
                email="elzakari@easymsdigit.com",
                phone="+233201112233",
                hashed_password=get_password_hash("Barbie@1983#2026"),
                full_name="Platform Super Administrator",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True,
            )
            session.add(admin_user)
            print("[+] Created Super Admin: elzakari@easymsdigit.com")
        else:
            # IMPORTED = admin_user
            admin_user.email = "elzakari@easymsdigit.com"
            admin_user.role = UserRole.SUPER_ADMIN
            admin_user.is_active = True
            admin_user.is_verified = True
            admin_user.hashed_password = get_password_hash("Barbie@1983#2026")
            admin_user.phone = "+233201112233"
            admin_user.full_name = "Platform Super Administrator"
            print("[*] Refreshed Super Admin: elzakari@easymsdigit.com")

        # -------------------------------------------------------------
        # 2. Ridge Regional Hospital Tenant
        # -------------------------------------------------------------
        res = await session.execute(select(Tenant).where(Tenant.slug == "ridge-regional-hospital"))
        hospital_tenant = res.scalars().first()
        if not hospital_tenant:
            hospital_tenant = Tenant(
                id=uuid.uuid4(),
                name="Ridge Regional Hospital, Accra",
                slug="ridge-regional-hospital",
                tenant_type=TenantType.HOSPITAL,
                license_number="GHS-HOSP-2024-001",
                phone="+233302228899",
                email="contact@ridgehospital.health",
                address="Castle Road, Ridge, Accra",
                city="Accra",
                country="Ghana",
                latitude=5.5600,
                longitude=-0.1969,
                is_verified=True,
                is_active=True,
            )
            session.add(hospital_tenant)
            print("[+] Created Hospital Tenant: Ridge Regional Hospital")

        # 3. Hospital Admin
        res = await session.execute(select(User).where(User.email == "admin.ridge@ridgehospital.health"))
        hosp_admin = res.scalars().first()
        if not hosp_admin:
            hosp_admin = User(
                id=uuid.uuid4(),
                email="admin.ridge@ridgehospital.health",
                phone="+233244000111",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Dr. Afia Appiah (Medical Director & Administrator)",
                role=UserRole.HOSPITAL_ADMIN,
                tenant_id=hospital_tenant.id,
                is_active=True,
            )
            session.add(hosp_admin)
            print("[+] Created Hospital Admin: admin.ridge@ridgehospital.health")

        # 4. Doctor
        res = await session.execute(select(User).where(User.email == "doctor.afia@ridgehospital.health"))
        doctor_user = res.scalars().first()
        if not doctor_user:
            doctor_user = User(
                id=uuid.uuid4(),
                email="doctor.afia@ridgehospital.health",
                phone="+233244112233",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Dr. Afia Appiah (Senior Clinical Specialist)",
                role=UserRole.DOCTOR,
                tenant_id=hospital_tenant.id,
                is_active=True,
            )
            session.add(doctor_user)
            print("[+] Created Doctor: doctor.afia@ridgehospital.health")

        # 5. Nurse
        res = await session.execute(select(User).where(User.email == "nurse.grace@ridgehospital.health"))
        nurse_user = res.scalars().first()
        if not nurse_user:
            nurse_user = User(
                id=uuid.uuid4(),
                email="nurse.grace@ridgehospital.health",
                phone="+233244223344",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Grace Ofori, RN",
                role=UserRole.NURSE,
                tenant_id=hospital_tenant.id,
                is_active=True,
            )
            session.add(nurse_user)
            print("[+] Created Nurse: nurse.grace@ridgehospital.health")

        # 6. Hospital Finance / Cashier
        res = await session.execute(select(User).where(User.email == "finance.esi@ridgehospital.health"))
        hosp_finance = res.scalars().first()
        if not hosp_finance:
            hosp_finance = User(
                id=uuid.uuid4(),
                email="finance.esi@ridgehospital.health",
                phone="+233244334455",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Esi Boateng (RCM & Billing Lead)",
                role=UserRole.HOSPITAL_FINANCE,
                tenant_id=hospital_tenant.id,
                is_active=True,
            )
            session.add(hosp_finance)
            print("[+] Created Hospital Finance: finance.esi@ridgehospital.health")

        # 7. Hospital Record Clerk
        res = await session.execute(select(User).where(User.email == "clerk.mensah@ridgehospital.health"))
        clerk_user = res.scalars().first()
        if not clerk_user:
            clerk_user = User(
                id=uuid.uuid4(),
                email="clerk.mensah@ridgehospital.health",
                phone="+233244778899",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Kwame Mensah (OPD Records & Triage Clerk)",
                role=UserRole.RECORD_CLERK,
                tenant_id=hospital_tenant.id,
                is_active=True,
            )
            session.add(clerk_user)
            print("[+] Created Record Clerk: clerk.mensah@ridgehospital.health")

        # -------------------------------------------------------------
        # 8. Osu Community Pharmacy Tenant
        # -------------------------------------------------------------
        res = await session.execute(select(Tenant).where(Tenant.slug == "osu-community-pharmacy"))
        pharmacy_tenant = res.scalars().first()
        if not pharmacy_tenant:
            pharmacy_tenant = Tenant(
                id=uuid.uuid4(),
                name="Osu Community Pharmacy",
                slug="osu-community-pharmacy",
                tenant_type=TenantType.PHARMACY,
                license_number="GPC-PHARM-2024-884",
                phone="+233302778899",
                email="info@osupharmacy.health",
                address="Oxford Street, Osu, Accra",
                city="Accra",
                country="Ghana",
                latitude=5.5560,
                longitude=-0.1830,
                is_verified=True,
                is_active=True,
            )
            session.add(pharmacy_tenant)
            print("[+] Created Pharmacy Tenant: Osu Community Pharmacy")

        # 9. Pharmacy Admin / Store Manager
        res = await session.execute(select(User).where(User.email == "admin.osu@osupharmacy.health"))
        pharm_admin = res.scalars().first()
        if not pharm_admin:
            pharm_admin = User(
                id=uuid.uuid4(),
                email="admin.osu@osupharmacy.health",
                phone="+233244667788",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Yaw Boakye (Pharmacy Store Manager)",
                role=UserRole.PHARMACY_ADMIN,
                tenant_id=pharmacy_tenant.id,
                is_active=True,
            )
            session.add(pharm_admin)
            print("[+] Created Pharmacy Admin: admin.osu@osupharmacy.health")

        # 10. Superintendent Pharmacist
        res = await session.execute(select(User).where(User.email == "superintendent.kojo@osupharmacy.health"))
        super_user = res.scalars().first()
        if not super_user:
            super_user = User(
                id=uuid.uuid4(),
                email="superintendent.kojo@osupharmacy.health",
                phone="+233244889900",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Pharm. Kojo Asante (FPCPharm, PSGH/REG/89201)",
                role=UserRole.SUPERINTENDENT_PHARMACIST,
                tenant_id=pharmacy_tenant.id,
                is_active=True,
            )
            session.add(super_user)
            print("[+] Created Superintendent Pharmacist: superintendent.kojo@osupharmacy.health")

        # 11. Dispensary Pharmacist
        res = await session.execute(select(User).where(User.email == "pharm.kojo@osupharmacy.health"))
        pharm_user = res.scalars().first()
        if not pharm_user:
            pharm_user = User(
                id=uuid.uuid4(),
                email="pharm.kojo@osupharmacy.health",
                phone="+233244556677",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Pharm. Kojo Asante",
                role=UserRole.PHARMACIST,
                tenant_id=pharmacy_tenant.id,
                is_active=True,
            )
            session.add(pharm_user)
            print("[+] Created Dispensary Pharmacist: pharm.kojo@osupharmacy.health")

        # 12. Pharmacy Finance & Escrow
        res = await session.execute(select(User).where(User.email == "finance.abena@osupharmacy.health"))
        pharm_finance = res.scalars().first()
        if not pharm_finance:
            pharm_finance = User(
                id=uuid.uuid4(),
                email="finance.abena@osupharmacy.health",
                phone="+233244445566",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Abena Osei (Pharmacy Finance & Escrow Lead)",
                role=UserRole.PHARMACY_FINANCE,
                tenant_id=pharmacy_tenant.id,
                is_active=True,
            )
            session.add(pharm_finance)
            print("[+] Created Pharmacy Finance: finance.abena@osupharmacy.health")

        # -------------------------------------------------------------
        # 13. Demo Patient User & Account
        # -------------------------------------------------------------
        res = await session.execute(select(User).where(User.phone == "0244123456"))
        patient_user = res.scalars().first()
        if not patient_user:
            patient_user = User(
                id=uuid.uuid4(),
                email="patient.kwesi@gmail.com",
                phone="0244123456",
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name="Kwesi Mensah",
                role=UserRole.PATIENT,
                is_active=True,
            )
            session.add(patient_user)
            print("[+] Created Patient User: Kwesi Mensah")

            patient_account = PatientAccount(
                id=uuid.uuid4(),
                user_id=patient_user.id,
                ghana_card_id="GHA-71298412-1",
                date_of_birth=date(1988, 6, 15),
                gender="Male",
                blood_group="O+",
                allergies="Penicillin, Sulfa",
                emergency_contact_name="Ama Mensah",
                emergency_contact_phone="0244987654",
            )
            session.add(patient_account)
            print("[+] Created Patient Account: GHA-71298412-1")

            # Issue Hospital Card for Ridge
            card = HospitalPatientCard(
                id=uuid.uuid4(),
                patient_account_id=patient_account.id,
                tenant_id=hospital_tenant.id,
                mrn="MRN-RDG-2026-092",
                qr_token="CHK-RRH-94812",
                is_active=True,
            )
            session.add(card)
            print("[+] Issued Hospital OPD Card: MRN-RDG-2026-092")

        await session.commit()
        print("\n[O] Database seeding complete! All demo credentials set with password:", DEFAULT_PASSWORD)

if __name__ == "__main__":
    asyncio.run(seed_database())
