from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .extract import PregateReport, VehiclePresentationReport, VehicleSplit, normalize_label


class PeriodMismatchError(ValueError):
    """Raised when monthly inputs do not describe the same period."""


_TURKISH_MONTHS = (
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
)

_MONTH_LABELS = {
    "JANUARY": "Ocak",
    "FEBRUARY": "Şubat",
    "MARCH": "Mart",
    "APRIL": "Nisan",
    "MAY": "Mayıs",
    "JUNE": "Haziran",
    "JULY": "Temmuz",
    "AUGUST": "Ağustos",
    "SEPTEMBER": "Eylül",
    "OCTOBER": "Ekim",
    "NOVEMBER": "Kasım",
    "DECEMBER": "Aralık",
}

_REASON_LABELS = {
    "FIRMA TALEBI IPTAL": "Firma talebi / iptal",
    "DONANIMSAL": "Donanımsal",
    "SURUCU": "Sürücü",
    "EVRAKSAL": "Evraksal",
    "(SEBEP GIRILMEMIS)": "Sebep girilmemiş",
    "KKD": "KKD",
}

_VEHICLE_TYPE_LABELS = {
    "TANK KONTEYNER": "TANK CONTAINER",
    "TIR TANKER": "TANKER TRUCK",
    "TIR": "TRACTOR-TRAILER",
    "40 AYAK TANKER": "40 FT TANKER",
    "TIR KONTEYNER": "CONTAINER TRUCK",
    "10 TEKER KAMYON": "10-WHEEL TRUCK",
    "6 TEKER TANKER": "6-WHEEL TANKER",
    "10 TEKER TANKER": "10-WHEEL TANKER",
    "6 TEKER KAMYON": "6-WHEEL TRUCK",
    "6 TEKER KAMYONET": "6-WHEEL LIGHT TRUCK",
    "4 TEKER KAMYONET": "4-WHEEL LIGHT TRUCK",
    "40 AYAKLI KAMYON": "40 FT TRUCK",
}

_EMPTY_REASON_LABELS_EN = {
    "FIRMA TALEBI": "Company request",
    "TANK ISLAK": "Wet tank",
    "SEVKIYAT TALIMATIYLA BOS CIKIS YAPILDI": "Empty exit per shipment instruction",
    "TANK DEGISECEK": "Tank replacement",
    "KONYEYNER TAHLIYE VANASI BOZUK": "Container discharge valve fault",
    "DORSE PLAKASI YANLIS": "Incorrect trailer plate",
    "HAVUZLARDA SU OLDUGU ICIN ARAC CIKARTILDI": "Water detected in containment basin",
    "KAPALI DOLUM APARATLARI UYGUN DEGIL": "Loading equipment unsuitable",
    "SEVKIYAT ONAYI YANLIS KART ATAMASI": "Incorrect shipment approval or card assignment",
    "ARAC TRANSIT TONAJI KARSILAMIYOR": "Vehicle does not meet transit tonnage",
    "GOZLERDE ISLAKLIK MEVCUT": "Moisture detected in compartments",
    "ARACTA KOKU VAR YIKAMA YAPILACAK": "Odor detected; wash required",
    "HAVUZ VANASINDA SU VAR": "Water in basin valve",
}


@dataclass(frozen=True)
class ReportingPeriod:
    year: int
    month: int
    label: str
    iso: str


@dataclass(frozen=True)
class DataWarning:
    code: str
    message: str
    sources: dict[str, int]


@dataclass(frozen=True)
class Slide:
    title: str
    kind: str
    data: dict[str, Any]
    source: str


@dataclass(frozen=True)
class SlideModel:
    period: ReportingPeriod
    output_filename: str
    slides: tuple[Slide, ...]
    warnings: tuple[DataWarning, ...]
    metadata: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_periods(report: PregateReport, split: VehicleSplit) -> ReportingPeriod:
    report_period = (report.year, report.month)
    split_period = (split.year, split.month)
    if report_period != split_period:
        raise PeriodMismatchError(
            "Kaynak dönemleri uyuşmuyor: "
            f"Pregate {report.year:04d}-{report.month:02d}, "
            f"araç kayıt {split.year:04d}-{split.month:02d}"
        )
    if not 1 <= report.month <= 12:
        raise PeriodMismatchError(f"Geçersiz ay: {report.month}")
    return ReportingPeriod(
        year=report.year,
        month=report.month,
        label=f"{_TURKISH_MONTHS[report.month - 1]} {report.year}",
        iso=f"{report.year:04d}-{report.month:02d}",
    )


def _tr_number(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def _tr_upper(value: str) -> str:
    return value.translate(str.maketrans({"i": "İ", "ı": "I"})).upper()


def _warnings(report: PregateReport, split: VehicleSplit) -> tuple[DataWarning, ...]:
    warnings: list[DataWarning] = []
    if report.comparison_total is not None and report.comparison_total != report.summary_total:
        warnings.append(
            DataWarning(
                code="TOTAL_SCOPE_MISMATCH",
                message=(
                    "Kaynak kapsamları farklı: aylık özet "
                    f"{_tr_number(report.summary_total)}, yıllık karşılaştırma "
                    f"{_tr_number(report.comparison_total)} araç gösteriyor."
                ),
                sources={"Sheet1": report.summary_total, "Sheet2": report.comparison_total},
            )
        )
    if (
        report.rejection_comparison_total is not None
        and report.rejection_comparison_total != report.summary_rejected
    ):
        warnings.append(
            DataWarning(
                code="REJECTION_SCOPE_MISMATCH",
                message=(
                    "Ret kapsamları farklı: aylık özet "
                    f"{_tr_number(report.summary_rejected)}, ret karşılaştırması "
                    f"{_tr_number(report.rejection_comparison_total)} kayıt gösteriyor."
                ),
                sources={
                    "Sheet1": report.summary_rejected,
                    "Sheet4": report.rejection_comparison_total,
                },
            )
        )
    if split.ravago + split.alisan != split.alisan_carrier_total:
        warnings.append(
            DataWarning(
                code="CARRIER_SPLIT_MISMATCH",
                message="Ravago ve Alişan kırılımı, Alişan taşıyıcı toplamıyla uzlaşmıyor.",
                sources={
                    "ravago": split.ravago,
                    "alisan": split.alisan,
                    "alisan_carrier_total": split.alisan_carrier_total,
                },
            )
        )
    alisan_registered = next(
        (
            registered
            for name, _rejected, registered in report.carriers
            if normalize_label(name) == "ALISAN LOJISTIK A.S."
        ),
        None,
    )
    if alisan_registered is not None and alisan_registered != split.alisan_carrier_total:
        warnings.append(
            DataWarning(
                code="ALISAN_SCOPE_MISMATCH",
                message=(
                    "Alişan kapsamları farklı: Pregate lojistik tablosu "
                    f"{_tr_number(alisan_registered)}, araç kayıt raporu "
                    f"{_tr_number(split.alisan_carrier_total)} kayıt gösteriyor."
                ),
                sources={"Sheet8": alisan_registered, "vehicle_registry": split.alisan_carrier_total},
            )
        )
    return tuple(warnings)


def _clean_reasons(report: PregateReport) -> tuple[tuple[str, int], ...]:
    cleaned = [
        (_REASON_LABELS.get(normalize_label(label), str(label).strip().capitalize()), value)
        for label, value in report.rejection_reasons
    ]
    return tuple(sorted(cleaned, key=lambda item: item[1], reverse=True))


def _monthly_totals(report: PregateReport) -> tuple[tuple[str, int], ...]:
    result: list[tuple[str, int]] = []
    for name, value in report.monthly_totals:
        label = _MONTH_LABELS.get(normalize_label(name), str(name))
        result.append((label, value))
        if normalize_label(name) == "SEPTEMBER":
            break
    return tuple(result)


def _clean_empty_reasons(report: PregateReport) -> tuple[tuple[str, int], ...]:
    canonical = {
        "HAVUZDA SU VAR": "Havuzda su var",
        "SEVKIYAT TALIMATIYLA BOS CIKIS YAPILDI": "Sevkiyat talimatıyla boş çıkış",
        "FIRMA TALEBI": "Firma talebi",
        "TANK ISLAK": "Tank ıslak",
        "TASMA SENSORU ARIZALI": "Taşma sensörü arızalı",
        "ARAC ICI ISLAK": "Araç içi ıslak",
    }
    totals: dict[str, int] = {}
    labels: dict[str, str] = {}
    for raw_label, value in report.empty_reasons:
        key = normalize_label(raw_label).rstrip(".")
        display = canonical.get(key, str(raw_label).strip().rstrip(".").capitalize())
        totals[key] = totals.get(key, 0) + value
        labels[key] = display
    return tuple(sorted(((labels[key], value) for key, value in totals.items()), key=lambda item: (-item[1], item[0])))


def build_slide_model(report: PregateReport, split: VehicleSplit) -> SlideModel:
    period = validate_periods(report, split)
    warnings = _warnings(report, split)
    ret_rate = round(report.summary_rejected / report.summary_total * 100, 1) if report.summary_total else None
    reason_data = _clean_reasons(report)
    departments = tuple(sorted(report.departments, key=lambda row: row[3], reverse=True))
    rejection_departments = tuple(
        sorted(((name, rejected) for name, _approved, rejected, _total in report.departments), key=lambda row: row[1], reverse=True)
    )
    carriers = tuple(sorted(report.carriers, key=lambda row: (row[1], row[2]), reverse=True))

    slides = (
        Slide(
            title="Pregate Aylık Operasyon Raporu",
            kind="cover",
            data={"period": period.label, "subtitle": "Araç kabul, ret ve operasyon görünümü"},
            source="Kurumsal görsel referans",
        ),
        Slide(
            title="Aylık Özet",
            kind="summary",
            data={
                "total": report.summary_total,
                "approved": report.summary_approved,
                "rejected": report.summary_rejected,
                "rejection_rate": ret_rate,
            },
            source="PregateSunum_Tam.xlsx · Sheet1",
        ),
        Slide(
            title="Departman Bazında Araç Hareketleri",
            kind="department_movements",
            data={"departments": departments},
            source="PregateSunum_Tam.xlsx · Sheet1",
        ),
        Slide(
            title="Geçen Yılın Aynı Dönemiyle Karşılaştırma",
            kind="year_comparison",
            data={
                "departments": report.year_comparison,
                "previous_total": report.comparison_previous_total,
                "current_total": report.comparison_total,
            },
            source="PregateSunum_Tam.xlsx · Sheet2",
        ),
        Slide(
            title="Retlerin Yıllık Karşılaştırması",
            kind="rejection_comparison",
            data={
                "departments": report.rejection_comparison,
                "previous_total": report.rejection_comparison_previous_total,
                "current_total": report.rejection_comparison_total,
            },
            source="PregateSunum_Tam.xlsx · Sheet4",
        ),
        Slide(
            title="Retlerin Departmanlara Dağılımı",
            kind="rejection_departments",
            data={"departments": rejection_departments},
            source="PregateSunum_Tam.xlsx · Sheet1",
        ),
        Slide(
            title="Terminal Ret Nedenleri",
            kind="rejection_reasons",
            data={"reasons": reason_data, "total": sum(value for _label, value in reason_data)},
            source="PregateSunum_Tam.xlsx · Sheet8",
        ),
        Slide(
            title="Nakliyeci Görünümü",
            kind="carriers",
            data={"carriers": carriers},
            source="PregateSunum_Tam.xlsx · Sheet8",
        ),
        Slide(
            title="Ravago ve Alişan Araç Dağılımı",
            kind="carrier_split",
            data={
                "ravago": split.ravago,
                "alisan": split.alisan,
                "alisan_carrier_total": split.alisan_carrier_total,
            },
            source="Arac_Kayit_Sorgulama (3).xlsx · Firma Adı / Nakliyeci",
        ),
        Slide(
            title="Vardiya ve Aylık Araç Eğilimi",
            kind="monthly_trend",
            data={
                "monthly_totals": _monthly_totals(report),
                "september_shift_totals": report.september_shift_totals,
            },
            source="PregateSunum_Tam.xlsx · Sheet10",
        ),
        Slide(
            title="Boş Araçlar",
            kind="empty_vehicles",
            data={"reasons": _clean_empty_reasons(report), "companies": report.empty_companies},
            source="PregateSunum_Tam.xlsx · Sheet6–Sheet7",
        ),
        Slide(
            title="Ek Veriler ve Kapsam Notları",
            kind="appendix",
            data={
                "departments": departments,
                "quality_notes": tuple(warning.message for warning in warnings),
            },
            source="PregateSunum_Tam.xlsx · Özet tablolar",
        ),
    )
    return SlideModel(
        period=period,
        output_filename=f"{_tr_upper(period.label)} PREGATE SUNUM.pptx",
        slides=slides,
        warnings=warnings,
        metadata={"name": "SYMN-poli-sunum", "version": "1.0"},
    )


def build_vehicle_deck_model(report: VehiclePresentationReport) -> SlideModel:
    """Create the classic nine-slide deck model from vehicle aggregates only."""

    if not 1 <= report.month <= 12:
        raise PeriodMismatchError(f"Geçersiz ay: {report.month}")

    period = ReportingPeriod(
        year=report.year,
        month=report.month,
        label=f"{_TURKISH_MONTHS[report.month - 1]} {report.year}",
        iso=f"{report.year:04d}-{report.month:02d}",
    )
    english_month = (
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
    )[report.month - 1]
    period_range = (
        f"{report.start_date.day}–{report.end_date.day} "
        f"{english_month.title()} {report.year}"
    )
    completion_rate = (
        round(report.completed_records / report.total_records * 100, 1)
        if report.total_records
        else 0.0
    )
    vehicle_types = tuple(
        (_VEHICLE_TYPE_LABELS.get(normalize_label(label), str(label)), count)
        for label, count in report.vehicle_types
    )
    carriers = tuple(
        ("OTHER" if normalize_label(label) == "DIGER" else label, count)
        for label, count in report.carriers
    )

    slides = (
        Slide(
            title=f"PREGATE {english_month} {report.year}",
            kind="cover",
            data={"period_range": period_range, "subtitle": "Vehicle Registration Overview"},
            source="Corporate presentation template",
        ),
        Slide(
            title=f"{english_month.title()} {report.year} Vehicle Registration Summary",
            kind="vehicle_summary",
            data={
                "total_records": report.total_records,
                "active_days": len(report.daily_counts),
                "average_per_active_day": round(report.total_records / len(report.daily_counts), 1),
                "completed_records": report.completed_records,
                "completion_rate": completion_rate,
                "period_range": period_range,
            },
            source="Vehicle registration report",
        ),
        Slide(
            title="Daily Vehicle Registrations",
            kind="daily_registrations",
            data={
                "daily_counts": tuple((day.isoformat(), count) for day, count in report.daily_counts),
                "total": report.total_records,
            },
            source="Vehicle registration report",
        ),
        Slide(
            title="Vehicle Distribution by Department",
            kind="department_distribution",
            data={"departments": report.departments, "total": report.total_records},
            source="Vehicle registration report",
        ),
        Slide(
            title="Vehicle Type Distribution",
            kind="vehicle_type_distribution",
            data={"vehicle_types": vehicle_types, "total": report.total_records},
            source="Vehicle registration report",
        ),
        Slide(
            title="Top Logistics Companies",
            kind="carrier_distribution",
            data={"carriers": carriers[:10], "total": report.total_records},
            source="Vehicle registration report",
        ),
        Slide(
            title="Ravago and Alişan Vehicle Distribution",
            kind="ravago_alisan_distribution",
            data={
                "ravago": report.ravago,
                "alisan": report.alisan,
                "alisan_carrier_total": report.alisan_carrier_total,
            },
            source="Vehicle registration report",
        ),
        Slide(
            title="Registration Status",
            kind="registration_status",
            data={
                "completed": report.completed_records,
                "other": report.other_status_records,
                "completion_rate": completion_rate,
            },
            source="Vehicle registration report",
        ),
        Slide(
            title="Scope and Data Notes",
            kind="scope_notes",
            data={
                "period_range": period_range,
                "record_count": report.total_records,
                "notes": (
                    "This presentation uses only the vehicle registration report.",
                    "Figures cover the available records for the stated partial-month period.",
                    "All values are aggregated; record-level personal details are excluded.",
                ),
            },
            source="Vehicle registration report",
        ),
    )
    return SlideModel(
        period=period,
        output_filename=f"{_tr_upper(period.label)} PREGATE SUNUM.pptx",
        slides=slides,
        warnings=(),
        metadata={"name": "SYMN-poli-sunum", "version": "2.0", "language": "English"},
    )


def build_classic_pregate_model(report: PregateReport, split: VehicleSplit) -> SlideModel:
    """Create an English classic-template deck using the monthly prepared tables."""

    period = validate_periods(report, split)
    warnings = _warnings(report, split)
    english_month = (
        "JANUARY",
        "FEBRUARY",
        "MARCH",
        "APRIL",
        "MAY",
        "JUNE",
        "JULY",
        "AUGUST",
        "SEPTEMBER",
        "OCTOBER",
        "NOVEMBER",
        "DECEMBER",
    )[report.month - 1]

    adjusted_carriers: list[tuple[str, int]] = []
    alisan_found = False
    alisan_original = 0
    alisan_adjusted = 0
    for name, _rejected, registered in report.carriers:
        if normalize_label(name) == "ALISAN LOJISTIK A.S.":
            if split.ravago > registered:
                raise ValueError(
                    f"Ravago count ({split.ravago}) exceeds the Pregate Alişan total ({registered})."
                )
            alisan_original = registered
            alisan_adjusted = registered - split.ravago
            adjusted_carriers.append((name, alisan_adjusted))
            adjusted_carriers.append(("RAVAGO", split.ravago))
            alisan_found = True
        else:
            adjusted_carriers.append((name, registered))
    if not alisan_found:
        raise ValueError("ALIŞAN LOJİSTİK A.Ş. was not found in the Pregate logistics table.")

    logistics = tuple(
        sorted(
            (
                (name, count)
                for name, count in adjusted_carriers
                if count >= 30 or normalize_label(name) in {"ALISAN LOJISTIK A.S.", "RAVAGO"}
            ),
            key=lambda item: (-item[1], normalize_label(item[0])),
        )
    )
    translated_empty_reasons = tuple(
        (
            _EMPTY_REASON_LABELS_EN.get(normalize_label(label).rstrip("."), str(label).strip()),
            count,
        )
        for label, count in report.empty_reasons
    )
    current_month_total = next(
        (
            value
            for label, value in report.monthly_totals
            if _MONTH_LABELS.get(normalize_label(label), str(label)).lower()
            == _TURKISH_MONTHS[report.month - 1].lower()
        ),
        report.summary_total,
    )
    rejection_departments = tuple(
        sorted(
            ((name, rejected) for name, _approved, rejected, _total in report.departments if rejected > 0),
            key=lambda item: (-item[1], normalize_label(item[0])),
        )
    )
    rejection_rows = tuple(
        sorted(
            report.carrier_rejection_rows,
            key=lambda row: (-int(row[-2]), normalize_label(row[0])),
        )
    )
    rejection_split = min(20, len(rejection_rows))
    previous_year = report.year - 1

    slides = (
        Slide(
            title=f"PREGATE {english_month} {report.year}",
            kind="cover",
            data={"subtitle": "Monthly Operations Presentation"},
            source="Corporate presentation template",
        ),
        Slide(
            title=f"{report.year} - {english_month} VEHICLE NUMBERS",
            kind="classic_vehicle_numbers",
            data={
                "departments": report.departments,
                "approved": report.summary_approved,
                "rejected": report.summary_rejected,
                "total": report.summary_total,
            },
            source="Pregate presentation workbook · Sheet1",
        ),
        Slide(
            title="PREGATE SITE SERVICE PERCENTAGE DISTRIBUTION",
            kind="classic_site_distribution",
            data={"departments": tuple((name, total) for name, _a, _r, total in report.departments)},
            source="Pregate presentation workbook · Sheet1",
        ),
        Slide(
            title=f"POLIPORT {report.year} VEHICLE LIST BY SHIFT",
            kind="classic_shift_table",
            data={
                "months": report.shift_months,
                "rows": report.shift_rows,
                "monthly_totals": report.monthly_totals,
                "current_shift_totals": report.current_shift_totals,
                "current_month_total": current_month_total,
            },
            source="Pregate presentation workbook · Sheet10",
        ),
        Slide(
            title=f"INSPECTED VEHICLES {previous_year}-{report.year}",
            kind="classic_year_comparison",
            data={
                "departments": report.year_comparison,
                "previous_total": report.comparison_previous_total,
                "current_total": report.comparison_total,
            },
            source="Pregate presentation workbook · Sheet2",
        ),
        Slide(
            title=f"{previous_year}-{report.year} TOTAL NUMBER OF REJECTIONS",
            kind="classic_rejection_comparison",
            data={
                "departments": report.rejection_comparison,
                "previous_total": report.rejection_comparison_previous_total,
                "current_total": report.rejection_comparison_total,
            },
            source="Pregate presentation workbook · Sheet4",
        ),
        Slide(
            title=f"POLIPORT TERMINAL {english_month} EMPTY TRUCKS",
            kind="classic_empty_reasons",
            data={
                "reasons": translated_empty_reasons,
                "total": sum(count for _label, count in translated_empty_reasons),
            },
            source="Pregate presentation workbook · Sheet6",
        ),
        Slide(
            title="POLIPORT TERMINAL — EMPTY VEHICLES BY COMPANY",
            kind="classic_empty_companies",
            data={
                "companies": report.empty_companies,
                "total": sum(count for _label, count in report.empty_companies),
            },
            source="Pregate presentation workbook · Sheet7",
        ),
        Slide(
            title=f'“PREGATE {english_month} LOGISTICS COMPANIES / +30 VEHICLES”',
            kind="classic_logistics",
            data={
                "carriers": logistics,
                "ravago": split.ravago,
                "alisan_original": alisan_original,
                "alisan_adjusted": alisan_adjusted,
            },
            source="Pregate presentation workbook · Sheet8; vehicle registration company field",
        ),
        Slide(
            title=f"{report.year} - {english_month} REJECTION DISTRIBUTION BY DEPARTMENTS",
            kind="classic_rejection_departments",
            data={
                "departments": rejection_departments,
                "total": sum(count for _name, count in rejection_departments),
            },
            source="Pregate presentation workbook · Sheet1",
        ),
        Slide(
            title=f"{report.year} PRE-GATE REJECTION DISTRIBUTIONS I",
            kind="classic_rejection_details",
            data={
                "part": 1,
                "headers": report.rejection_reason_headers,
                "rows": rejection_rows[:rejection_split],
            },
            source="Pregate presentation workbook · Sheet8",
        ),
        Slide(
            title=f"{report.year} PRE-GATE REJECTION DISTRIBUTIONS II",
            kind="classic_rejection_details",
            data={
                "part": 2,
                "headers": report.rejection_reason_headers,
                "rows": rejection_rows[rejection_split:],
            },
            source="Pregate presentation workbook · Sheet8",
        ),
        Slide(
            title="SCOPE AND DATA NOTES",
            kind="classic_scope_notes",
            data={
                "notes": (
                    f"Reporting period: {english_month.title()} {report.year}.",
                    "Each slide preserves the scope of its source worksheet; totals from different scopes are not combined.",
                    f"Ravago is separated only within Alişan carrier records: {split.ravago} Ravago and {split.alisan} other Alişan records.",
                    "All values are aggregated; plate, driver and phone details are excluded.",
                    *(warning.message for warning in warnings),
                )
            },
            source="Pregate presentation workbook and vehicle registration report",
        ),
    )
    return SlideModel(
        period=period,
        output_filename=f"{_tr_upper(period.label)} PREGATE SUNUM.pptx",
        slides=slides,
        warnings=warnings,
        metadata={"name": "SYMN-poli-sunum", "version": "3.0", "language": "English"},
    )
