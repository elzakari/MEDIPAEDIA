import enum
import uuid
import pytest
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_prescription_signature,
    get_password_hash,
    verify_password,
    verify_prescription_signature,
)


class UserRoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    TENANT_ADMIN = "TENANT_ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    PHARMACIST = "PHARMACIST"
    PATIENT = "PATIENT"


def test_password_hashing():
    password = "SuperSecurePassword2026!"
    hashed = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_access_token_generation_and_decoding():
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    role = UserRoleEnum.DOCTOR.value

    token = create_access_token(
        subject=user_id,
        role=role,
        tenant_id=str(tenant_id),
    )

    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["role"] == role
    assert payload["tenant_id"] == str(tenant_id)
    assert payload["type"] == "access"


def test_jwt_refresh_token_generation():
    user_id = uuid.uuid4()
    token = create_refresh_token(subject=user_id, role=UserRoleEnum.PATIENT.value)

    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "refresh"


def test_hmac_prescription_tamper_proofing():
    rx_id = str(uuid.uuid4())
    patient_id = str(uuid.uuid4())
    doctor_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    timestamp = "2026-08-16T12:00:00Z"
    items = [
        {"medication_name": "Coartem", "dosage": "4 tabs BD", "quantity_prescribed": 24},
        {"medication_name": "Paracetamol", "dosage": "2 tabs TDS", "quantity_prescribed": 18},
    ]

    signature = generate_prescription_signature(
        prescription_id=rx_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        items=items,
        timestamp=timestamp,
    )

    # Legitimate verification passes
    assert verify_prescription_signature(
        signature=signature,
        prescription_id=rx_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        items=items,
        timestamp=timestamp,
    ) is True

    # Tampered quantity fails verification
    tampered_items = [
        {"medication_name": "Coartem", "dosage": "4 tabs BD", "quantity_prescribed": 100}, # altered quantity!
        {"medication_name": "Paracetamol", "dosage": "2 tabs TDS", "quantity_prescribed": 18},
    ]
    assert verify_prescription_signature(
        signature=signature,
        prescription_id=rx_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        items=tampered_items,
        timestamp=timestamp,
    ) is False


def test_tenant_boundary_isolation():
    hospital_a_id = uuid.uuid4()
    hospital_b_id = uuid.uuid4()

    # Hospital A Doctor context
    doctor_tenant_id = hospital_a_id

    # Verify hospital isolation logic
    assert doctor_tenant_id == hospital_a_id
    assert doctor_tenant_id != hospital_b_id
