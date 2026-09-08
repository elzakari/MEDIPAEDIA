"""
==============================================================================
Ghana NHIA G-DRG Tariff Catalog Seeder
==============================================================================
Statutory master catalog of Ghana National Health Insurance Scheme (NHIS)
Ghana Diagnostic-Related Groupings (G-DRG) tariff bands for OPD, Laboratory,
Radiology, Maternity, Surgical, and Inpatient Ward Accommodation.
"""

from decimal import Decimal
import logging
from typing import Any, Dict, List
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.clinical import NHISGDRGTariff

logger = logging.getLogger("medipaedia.db.tariffs")

GHANA_NHIS_GDRG_TARIFFS: List[Dict[str, Any]] = [
    # --------------------------------------------------------------------------
    # 1. OUTPATIENT CLINICAL CONSULTATIONS (OPD)
    # --------------------------------------------------------------------------
    {
        "gdrg_code": "OPDC01A",
        "service_name": "General OPD Clinical Consultation",
        "category": "CONSULTATION",
        "standard_tariff_ghs": Decimal("35.00"),
        "nhis_covered_amount_ghs": Decimal("35.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Standard outpatient triage and clinical consultation with Medical Officer or Physician Assistant.",
    },
    {
        "gdrg_code": "OPDC02B",
        "service_name": "Specialist OPD Clinical Consultation",
        "category": "CONSULTATION",
        "standard_tariff_ghs": Decimal("65.00"),
        "nhis_covered_amount_ghs": Decimal("65.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Specialist consultant consultation (Internal Medicine, Pediatrics, Obs/Gynae, General Surgery).",
    },
    {
        "gdrg_code": "EMRC01A",
        "service_name": "Emergency Trauma & Resuscitation Triage",
        "category": "CONSULTATION",
        "standard_tariff_ghs": Decimal("50.00"),
        "nhis_covered_amount_ghs": Decimal("50.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Emergency department Red/Yellow triage intake, emergency stabilization, and vital signs resuscitation.",
    },
    {
        "gdrg_code": "DENC01A",
        "service_name": "Dental Outpatient Consultation & Oral Exam",
        "category": "CONSULTATION",
        "standard_tariff_ghs": Decimal("40.00"),
        "nhis_covered_amount_ghs": Decimal("40.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Dental surgeon oral inspection, periodontal assessment, and treatment planning.",
    },
    {
        "gdrg_code": "OPHC01A",
        "service_name": "Ophthalmology / Optometry OPD Consultation",
        "category": "CONSULTATION",
        "standard_tariff_ghs": Decimal("45.00"),
        "nhis_covered_amount_ghs": Decimal("45.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Specialized eye assessment, visual acuity testing, fundoscopy, and slit-lamp examination.",
    },

    # --------------------------------------------------------------------------
    # 2. LABORATORY & DIAGNOSTIC INVESTIGATIONS
    # --------------------------------------------------------------------------
    {
        "gdrg_code": "LABP01A",
        "service_name": "Full Blood Count (FBC) + 5-Part Differential",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("45.00"),
        "nhis_covered_amount_ghs": Decimal("45.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Automated hematology analyzer full blood count: Hb, WBC, Platelets, RBC indices, and 5-part diff.",
    },
    {
        "gdrg_code": "LABP02M",
        "service_name": "Malaria Rapid Diagnostic Test (RDT) / Blood Film",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("20.00"),
        "nhis_covered_amount_ghs": Decimal("20.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Qualitative Pf/Pan HRP2 antigen rapid test and thick/thin Giemsa blood smear microscopy.",
    },
    {
        "gdrg_code": "LABP03L",
        "service_name": "Liver Function Test (LFT Panel)",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("75.00"),
        "nhis_covered_amount_ghs": Decimal("75.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Serum AST, ALT, ALP, Total Bilirubin, Direct Bilirubin, Albumin, and Total Protein chemistry panel.",
    },
    {
        "gdrg_code": "LABP04K",
        "service_name": "Renal / Kidney Function Test (KFT / BUE & Cr)",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("75.00"),
        "nhis_covered_amount_ghs": Decimal("75.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Serum Blood Urea Nitrogen (BUN), Creatinine, Sodium (Na+), Potassium (K+), and Chloride (Cl-).",
    },
    {
        "gdrg_code": "LABP05U",
        "service_name": "Routine Urinalysis + Urine Microscopy",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("15.00"),
        "nhis_covered_amount_ghs": Decimal("15.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "10-parameter dipstick chemical analysis (Protein, Glucose, Leukocytes, Nitrites) + sediment microscopy.",
    },
    {
        "gdrg_code": "LABP06L",
        "service_name": "Fasting Lipid Profile Panel",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("70.00"),
        "nhis_covered_amount_ghs": Decimal("70.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Total Cholesterol, Triglycerides, HDL-C, LDL-C, and Cardiovascular Atherogenic Risk Ratio.",
    },
    {
        "gdrg_code": "LABP07G",
        "service_name": "Fasting / Random Blood Glucose (FBG/RBG)",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("20.00"),
        "nhis_covered_amount_ghs": Decimal("20.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Quantitative enzymatic glucose determination for diabetes diagnosis and monitoring.",
    },
    {
        "gdrg_code": "LABP08T",
        "service_name": "Widal Typhoid Agglutination Serology Test",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("30.00"),
        "nhis_covered_amount_ghs": Decimal("30.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Slide/tube agglutination titration for Salmonella enterica serovars Typhi and Paratyphi (O and H antigens).",
    },
    {
        "gdrg_code": "LABP09S",
        "service_name": "Sickling Test & Hemoglobin Electrophoresis",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("40.00"),
        "nhis_covered_amount_ghs": Decimal("40.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Sodium metabisulfite sickling screening + alkaline cellulose acetate electrophoresis (Hb AA/AS/SS/SC).",
    },
    {
        "gdrg_code": "LABP10C",
        "service_name": "Blood Culture & Antimicrobial Sensitivity",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("120.00"),
        "nhis_covered_amount_ghs": Decimal("120.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Aerobic/anaerobic blood broth incubation with automated pathogen ID and Kirby-Bauer disk diffusion AST.",
    },
    {
        "gdrg_code": "LABP11H",
        "service_name": "Glycated Hemoglobin (HbA1c)",
        "category": "LABORATORY",
        "standard_tariff_ghs": Decimal("80.00"),
        "nhis_covered_amount_ghs": Decimal("80.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "HPLC/immuno-turbidimetric 3-month glycemic control measurement for diabetic patients.",
    },

    # --------------------------------------------------------------------------
    # 3. RADIOLOGY & MEDICAL IMAGING
    # --------------------------------------------------------------------------
    {
        "gdrg_code": "RADX01A",
        "service_name": "Chest X-Ray PA View (Digital Radiography)",
        "category": "RADIOLOGY",
        "standard_tariff_ghs": Decimal("80.00"),
        "nhis_covered_amount_ghs": Decimal("80.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Digital posteroanterior chest radiograph for pulmonary consolidations, TB screening, and cardiomegaly.",
    },
    {
        "gdrg_code": "RADX02L",
        "service_name": "Lumbosacral Spine X-Ray (AP + Lateral Views)",
        "category": "RADIOLOGY",
        "standard_tariff_ghs": Decimal("90.00"),
        "nhis_covered_amount_ghs": Decimal("90.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Two-view lumbar spinal imaging for spondylolisthesis, degenerative disc disease, and traumatic fractures.",
    },
    {
        "gdrg_code": "RADU01A",
        "service_name": "Abdominopelvic Ultrasound Scan",
        "category": "RADIOLOGY",
        "standard_tariff_ghs": Decimal("95.00"),
        "nhis_covered_amount_ghs": Decimal("95.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Comprehensive real-time B-mode sonography of liver, gallbladder, spleen, kidneys, pancreas, and pelvis.",
    },
    {
        "gdrg_code": "RADU02O",
        "service_name": "Obstetric Ultrasound Scan (2D Real-Time)",
        "category": "RADIOLOGY",
        "standard_tariff_ghs": Decimal("75.00"),
        "nhis_covered_amount_ghs": Decimal("75.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Routine antenatal sonogram for fetal viability, gestational age biometric estimation, and placental localization.",
    },
    {
        "gdrg_code": "RADX03E",
        "service_name": "Standard 12-Lead Electrocardiogram (ECG)",
        "category": "RADIOLOGY",
        "standard_tariff_ghs": Decimal("60.00"),
        "nhis_covered_amount_ghs": Decimal("60.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "12-lead surface cardiac electrical recording for ischemic ST-segment changes and arrhythmia evaluation.",
    },
    {
        "gdrg_code": "RADU03E",
        "service_name": "Transthoracic 2D Echocardiography",
        "category": "RADIOLOGY",
        "standard_tariff_ghs": Decimal("250.00"),
        "nhis_covered_amount_ghs": Decimal("250.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": True,
        "description": "Transthoracic Doppler echocardiogram for valvular heart disease, cardiomyopathy, and ejection fraction.",
    },

    # --------------------------------------------------------------------------
    # 4. MATERNAL, OBSTETRIC & SURGICAL PROCEDURES
    # --------------------------------------------------------------------------
    {
        "gdrg_code": "DELV01A",
        "service_name": "Normal Spontaneous Vaginal Delivery (SVD)",
        "category": "DELIVERY",
        "standard_tariff_ghs": Decimal("250.00"),
        "nhis_covered_amount_ghs": Decimal("250.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Uncomplicated labor management, active management of 3rd stage, episiotomy/suturing, and immediate neonatal care.",
    },
    {
        "gdrg_code": "DELV02A",
        "service_name": "Assisted Instrumental Delivery (Vacuum / Breech)",
        "category": "DELIVERY",
        "standard_tariff_ghs": Decimal("380.00"),
        "nhis_covered_amount_ghs": Decimal("380.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Vacuum extractor extraction or assisted breech delivery in prolonged second stage of labor.",
    },
    {
        "gdrg_code": "SURG01CS",
        "service_name": "Emergency Caesarean Section (C-Section)",
        "category": "SURGERY",
        "standard_tariff_ghs": Decimal("950.00"),
        "nhis_covered_amount_ghs": Decimal("950.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Emergency lower segment caesarean section (LSCS) for fetal distress, cephalopelvic disproportion, or obstructed labor.",
    },
    {
        "gdrg_code": "SURG02CS",
        "service_name": "Elective Caesarean Section",
        "category": "SURGERY",
        "standard_tariff_ghs": Decimal("900.00"),
        "nhis_covered_amount_ghs": Decimal("900.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": True,
        "description": "Planned elective caesarean section for previous scars, placenta praevia, or transverse lie.",
    },
    {
        "gdrg_code": "SURG03AP",
        "service_name": "Emergency Open / Laparoscopic Appendectomy",
        "category": "SURGERY",
        "standard_tariff_ghs": Decimal("850.00"),
        "nhis_covered_amount_ghs": Decimal("850.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Emergency appendectomy for acute appendicitis or perforated peritonitis.",
    },
    {
        "gdrg_code": "SURG04HN",
        "service_name": "Inguinal Herniorrhaphy / Mesh Hernioplasty",
        "category": "SURGERY",
        "standard_tariff_ghs": Decimal("750.00"),
        "nhis_covered_amount_ghs": Decimal("750.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Elective or emergency repair of reducible or incarcerated inguinal/femoral hernia with Lichtenstein mesh.",
    },
    {
        "gdrg_code": "SURG05DD",
        "service_name": "Surgical Wound Debridement & Negative Pressure Dressing",
        "category": "SURGERY",
        "standard_tariff_ghs": Decimal("90.00"),
        "nhis_covered_amount_ghs": Decimal("90.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Excision of necrotic tissue, diabetic foot ulcer debridement, and sterile wound bed preparation.",
    },
    {
        "gdrg_code": "SURG06ST",
        "service_name": "Trauma Laceration Suturing (Minor Theater)",
        "category": "PROCEDURE",
        "standard_tariff_ghs": Decimal("60.00"),
        "nhis_covered_amount_ghs": Decimal("60.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Local infiltration anesthesia and multi-layer primary wound closure of acute traumatic lacerations.",
    },
    {
        "gdrg_code": "MCH01ANC",
        "service_name": "Routine Antenatal Care (ANC) Clinic Visit",
        "category": "CONSULTATION",
        "standard_tariff_ghs": Decimal("30.00"),
        "nhis_covered_amount_ghs": Decimal("30.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Antenatal examination, maternal vitals, fundal height tracking, fetal heart rate auscultation, and IPTp delivery.",
    },

    # --------------------------------------------------------------------------
    # 5. INPATIENT WARD ACCOMMODATION & NURSING CARE
    # --------------------------------------------------------------------------
    {
        "gdrg_code": "BEDW01A",
        "service_name": "General Medical / Surgical Ward Bed Night",
        "category": "WARD_ACCOMMODATION",
        "standard_tariff_ghs": Decimal("50.00"),
        "nhis_covered_amount_ghs": Decimal("50.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Inpatient 24-hour medical ward accommodation, round-the-clock nursing care, and physician daily rounds.",
    },
    {
        "gdrg_code": "BEDW02M",
        "service_name": "Maternity / Postpartum Ward Bed Night",
        "category": "WARD_ACCOMMODATION",
        "standard_tariff_ghs": Decimal("50.00"),
        "nhis_covered_amount_ghs": Decimal("50.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Postpartum maternal recovery, neonatal nursing observation, and lactation support.",
    },
    {
        "gdrg_code": "BEDW03P",
        "service_name": "Pediatric Inpatient Ward Bed Night",
        "category": "WARD_ACCOMMODATION",
        "standard_tariff_ghs": Decimal("45.00"),
        "nhis_covered_amount_ghs": Decimal("45.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": False,
        "description": "Pediatric ward admission, pediatric nursing observation, and daily pediatrician review.",
    },
    {
        "gdrg_code": "BEDW04I",
        "service_name": "Intensive Care Unit (ICU) Critical Bed Night",
        "category": "WARD_ACCOMMODATION",
        "standard_tariff_ghs": Decimal("350.00"),
        "nhis_covered_amount_ghs": Decimal("350.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": True,
        "description": "High-dependency multi-parameter hemodynamic monitoring, mechanical ventilation support, and 1:1 nursing.",
    },
    {
        "gdrg_code": "BEDW05N",
        "service_name": "Neonatal Intensive Care Unit (NICU) Incubator Night",
        "category": "WARD_ACCOMMODATION",
        "standard_tariff_ghs": Decimal("200.00"),
        "nhis_covered_amount_ghs": Decimal("200.00"),
        "patient_copay_ghs": Decimal("0.00"),
        "preauth_required": True,
        "description": "Preterm incubator care, phototherapy, continuous SpO2 monitoring, and neonatal enteral tube feeding.",
    },
]


async def seed_nhis_gdrg_tariffs(session: AsyncSession) -> int:
    """
    Seeds and idempotently updates the statutory Ghana NHIA G-DRG tariff bands
    into the NHISGDRGTariff catalog.
    """
    count = 0
    for tariff in GHANA_NHIS_GDRG_TARIFFS:
        stmt = select(NHISGDRGTariff).where(NHISGDRGTariff.gdrg_code == tariff["gdrg_code"])
        res = await session.execute(stmt)
        existing = res.scalars().first()

        if not existing:
            entry = NHISGDRGTariff(
                id=uuid.uuid4(),
                gdrg_code=tariff["gdrg_code"],
                service_name=tariff["service_name"],
                category=tariff["category"],
                standard_tariff_ghs=tariff["standard_tariff_ghs"],
                nhis_covered_amount_ghs=tariff["nhis_covered_amount_ghs"],
                patient_copay_ghs=tariff.get("patient_copay_ghs", Decimal("0.00")),
                preauth_required=tariff.get("preauth_required", False),
                is_active=True,
                description=tariff.get("description"),
            )
            session.add(entry)
            count += 1
        else:
            existing.service_name = tariff["service_name"]
            existing.category = tariff["category"]
            existing.standard_tariff_ghs = tariff["standard_tariff_ghs"]
            existing.nhis_covered_amount_ghs = tariff["nhis_covered_amount_ghs"]
            existing.patient_copay_ghs = tariff.get("patient_copay_ghs", Decimal("0.00"))
            existing.preauth_required = tariff.get("preauth_required", False)
            existing.description = tariff.get("description")
            existing.is_active = True

    await session.flush()
    logger.info(f"[+] Processed {len(GHANA_NHIS_GDRG_TARIFFS)} statutory G-DRG tariff bands (added {count} new)")
    return count
