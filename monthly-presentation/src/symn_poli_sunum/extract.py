from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

from openpyxl import load_workbook


class SourceSchemaError(ValueError):
    """Raised when an expected report field or worksheet is missing."""


@dataclass(frozen=True)
class PregateReport:
    year: int
    month: int
    summary_total: int
    summary_approved: int
    summary_rejected: int
    comparison_total: int | None = None
    comparison_previous_total: int | None = None
    rejection_comparison_total: int | None = None
    rejection_comparison_previous_total: int | None = None
    departments: tuple[tuple[str, int, int, int], ...] = field(default_factory=tuple)
    year_comparison: tuple[tuple[str, int, int], ...] = field(default_factory=tuple)
    rejection_comparison: tuple[tuple[str, int, int], ...] = field(default_factory=tuple)
    rejection_reasons: tuple[tuple[str, int], ...] = field(default_factory=tuple)
    rejection_reason_headers: tuple[str, ...] = field(default_factory=tuple)
    carrier_rejection_rows: tuple[tuple[Any, ...], ...] = field(default_factory=tuple)
    carriers: tuple[tuple[str, int, int], ...] = field(default_factory=tuple)
    empty_reasons: tuple[tuple[str, int], ...] = field(default_factory=tuple)
    empty_companies: tuple[tuple[str, int], ...] = field(default_factory=tuple)
    monthly_totals: tuple[tuple[str, int], ...] = field(default_factory=tuple)
    september_shift_totals: tuple[tuple[str, int], ...] = field(default_factory=tuple)
    current_shift_totals: tuple[tuple[str, int], ...] = field(default_factory=tuple)
    shift_months: tuple[str, ...] = field(default_factory=tuple)
    shift_rows: tuple[tuple[str, str, tuple[int, ...], int], ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class VehicleSplit:
    year: int
    month: int
    ravago: int
    alisan: int
    alisan_carrier_total: int


@dataclass(frozen=True)
class VehiclePresentationReport:
    """Presentation-safe aggregates from the vehicle registration report."""

    year: int
    month: int
    start_date: date
    end_date: date
    total_records: int
    daily_counts: tuple[tuple[date, int], ...]
    departments: tuple[tuple[str, int], ...]
    vehicle_types: tuple[tuple[str, int], ...]
    carriers: tuple[tuple[str, int], ...]
    ravago: int
    alisan: int
    alisan_carrier_total: int
    completed_records: int
    other_status_records: int


_TURKISH_TRANSLATION = str.maketrans(
    {
        "İ": "I",
        "I": "I",
        "ı": "I",
        "Ş": "S",
        "ş": "S",
        "Ğ": "G",
        "ğ": "G",
        "Ü": "U",
        "ü": "U",
        "Ö": "O",
        "ö": "O",
        "Ç": "C",
        "ç": "C",
    }
)

_MONTHS = {
    "JANUARY": 1,
    "OCAK": 1,
    "FEBRUARY": 2,
    "SUBAT": 2,
    "MARCH": 3,
    "MART": 3,
    "APRIL": 4,
    "NISAN": 4,
    "MAY": 5,
    "MAYIS": 5,
    "JUNE": 6,
    "HAZIRAN": 6,
    "JULY": 7,
    "TEMMUZ": 7,
    "AUGUST": 8,
    "AGUSTOS": 8,
    "SEPTEMBER": 9,
    "EYLUL": 9,
    "OCTOBER": 10,
    "EKIM": 10,
    "NOVEMBER": 11,
    "KASIM": 11,
    "DECEMBER": 12,
    "ARALIK": 12,
}

_REQUIRED_PREGATE_SHEETS = (
    "Sheet1",
    "Sheet2",
    "Sheet4",
    "Sheet6",
    "Sheet7",
    "Sheet8",
    "Sheet9",
    "Sheet10",
    "Sheet14",
)


def normalize_label(value: object) -> str:
    """Normalize free-form Turkish labels for stable comparisons."""

    if value is None:
        return ""
    text = str(value).strip().translate(_TURKISH_TRANSLATION).upper()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"\s+", " ", text)


def _period_from_title(value: object) -> tuple[int, int]:
    normalized = normalize_label(value)
    year_match = re.search(r"\b(20\d{2})\b", normalized)
    month = next((number for name, number in _MONTHS.items() if re.search(rf"\b{name}\b", normalized)), None)
    if year_match is None or month is None:
        raise SourceSchemaError(f"Rapor dönemi başlıktan okunamadı: {value!r}")
    return int(year_match.group(1)), month


def _required_sheet(workbook, name: str):
    if name not in workbook.sheetnames:
        raise SourceSchemaError(f"Gerekli çalışma sayfası bulunamadı: {name}")
    return workbook[name]


def _as_int(value: object, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SourceSchemaError(f"{field_name} sayısal değil: {value!r}")
    return int(value)


def _optional_int(value: object) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return int(value)


def _total_row(sheet, label_column: int = 2):
    for row in sheet.iter_rows(values_only=True):
        if len(row) >= label_column and normalize_label(row[label_column - 1]) in {"TOTAL", "TOPLAM"}:
            return row
    raise SourceSchemaError(f"{sheet.title} içinde TOTAL/TOPLAM satırı bulunamadı")


def _rows_until_total(sheet, *, start_row: int, label_column: int = 2):
    for row in sheet.iter_rows(min_row=start_row, values_only=True):
        if len(row) < label_column:
            continue
        label = row[label_column - 1]
        if normalize_label(label) in {"TOTAL", "TOPLAM"}:
            break
        if label not in (None, ""):
            yield row


def extract_pregate_report(path: str | Path) -> PregateReport:
    """Read the stable headline metrics from the monthly Pregate workbook."""

    workbook = load_workbook(Path(path), data_only=True, read_only=True)
    try:
        for sheet_name in _REQUIRED_PREGATE_SHEETS:
            _required_sheet(workbook, sheet_name)
        sheet = _required_sheet(workbook, "Sheet1")
        year, month = _period_from_title(sheet["B2"].value)

        total_row = _total_row(sheet)

        departments = tuple(
            (
                str(row[1]).strip(),
                _as_int(row[2], f"{row[1]} onay"),
                _as_int(row[3], f"{row[1]} ret"),
                _as_int(row[4], f"{row[1]} toplam"),
            )
            for row in _rows_until_total(sheet, start_row=5)
        )

        comparison_sheet = workbook["Sheet2"]
        comparison_total_row = _total_row(comparison_sheet)
        year_comparison = tuple(
            (str(row[1]).strip(), _as_int(row[2], f"{row[1]} geçen yıl"), _as_int(row[3], f"{row[1]} bu yıl"))
            for row in _rows_until_total(comparison_sheet, start_row=5)
        )

        rejection_sheet = workbook["Sheet4"]
        rejection_total_row = _total_row(rejection_sheet)
        rejection_comparison = tuple(
            (str(row[1]).strip(), _as_int(row[3], f"{row[1]} geçen yıl ret"), _as_int(row[4], f"{row[1]} bu yıl ret"))
            for row in _rows_until_total(rejection_sheet, start_row=5)
        )

        reason_sheet = workbook["Sheet8"]
        reason_header_map = _header_map(reason_sheet, 4)
        rejected_column = _require_header(reason_header_map, "Toplam Red")
        registered_column = _require_header(reason_header_map, "Toplam Kayıt")
        reason_columns = tuple(range(3, rejected_column))
        reason_headers = [str(reason_sheet.cell(4, column).value or "").strip() for column in reason_columns]
        reason_totals: tuple[tuple[str, int], ...] = ()
        carriers: list[tuple[str, int, int]] = []
        carrier_rejection_rows: list[tuple[Any, ...]] = []
        for row in reason_sheet.iter_rows(min_row=5, max_col=registered_column, values_only=True):
            label = row[1]
            if label in (None, ""):
                totals = tuple(
                    (reason_headers[index], int(value))
                    for index, value in enumerate(row[column - 1] for column in reason_columns)
                    if isinstance(value, (int, float)) and not isinstance(value, bool)
                )
                if totals:
                    reason_totals = totals
                continue
            rejected = _optional_int(row[rejected_column - 1])
            registered = _optional_int(row[registered_column - 1])
            if rejected is not None and registered is not None:
                carrier_name = str(label).strip()
                reason_values = tuple(_optional_int(row[column - 1]) or 0 for column in reason_columns)
                carriers.append((carrier_name, rejected, registered))
                carrier_rejection_rows.append((carrier_name, *reason_values, rejected, registered))

        def read_count_rows(sheet_name: str, value_column: int) -> tuple[tuple[str, int], ...]:
            count_sheet = workbook[sheet_name]
            result: list[tuple[str, int]] = []
            for row in count_sheet.iter_rows(min_row=5, values_only=True):
                label = row[1] if len(row) >= 2 else None
                value = row[value_column - 1] if len(row) >= value_column else None
                if label in (None, ""):
                    continue
                number = _optional_int(value)
                if number is not None:
                    result.append((str(label).strip(), number))
            return tuple(result)

        trend_sheet = workbook["Sheet10"]
        month_columns = tuple(
            column
            for column in range(5, 15)
            if normalize_label(trend_sheet.cell(4, column).value) in _MONTHS
        )
        month_names = [str(trend_sheet.cell(4, column).value) for column in month_columns]
        current_month_column = next(
            (
                column
                for column in month_columns
                if _MONTHS[normalize_label(trend_sheet.cell(4, column).value)] == month
            ),
            None,
        )
        september_column = next(
            (
                column
                for column in month_columns
                if _MONTHS[normalize_label(trend_sheet.cell(4, column).value)] == 9
            ),
            None,
        )
        monthly_totals: tuple[tuple[str, int], ...] = ()
        september_shift_totals: list[tuple[str, int]] = []
        current_shift_totals: list[tuple[str, int]] = []
        shift_rows: list[tuple[str, str, tuple[int, ...], int]] = []
        active_shift: str | None = None
        for row in trend_sheet.iter_rows(min_row=5, max_col=15, values_only=True):
            if row[2] not in (None, ""):
                active_shift = str(row[2]).strip()
            department = normalize_label(row[3])
            if normalize_label(row[2]) == "TOTAL" and row[3] in (None, ""):
                monthly_totals = tuple(
                    (month_names[index], _as_int(value, f"{month_names[index]} toplam"))
                    for index, value in enumerate(row[column - 1] for column in month_columns)
                )
            elif department == "TOTAL" and active_shift and normalize_label(active_shift) != "TOTAL":
                if september_column is not None:
                    september = _optional_int(row[september_column - 1])
                    if september is not None:
                        september_shift_totals.append((active_shift, september))
                if current_month_column is not None:
                    current = _optional_int(row[current_month_column - 1])
                    if current is not None:
                        current_shift_totals.append((active_shift, current))
            elif department and active_shift and normalize_label(active_shift) != "TOTAL":
                department_name = str(row[3]).strip()
                monthly_values = tuple(_optional_int(row[column - 1]) or 0 for column in month_columns)
                row_total = _optional_int(row[14])
                shift_rows.append((active_shift, department_name, monthly_values, row_total or sum(monthly_values)))

        return PregateReport(
            year=year,
            month=month,
            summary_total=_as_int(total_row[4], "Toplam araç"),
            summary_approved=_as_int(total_row[2], "Onaylanan araç"),
            summary_rejected=_as_int(total_row[3], "Reddedilen araç"),
            comparison_total=_as_int(comparison_total_row[3], "Karşılaştırma cari toplam"),
            comparison_previous_total=_as_int(comparison_total_row[2], "Karşılaştırma önceki toplam"),
            rejection_comparison_total=_as_int(rejection_total_row[4], "Ret karşılaştırma cari toplam"),
            rejection_comparison_previous_total=_as_int(rejection_total_row[3], "Ret karşılaştırma önceki toplam"),
            departments=departments,
            year_comparison=year_comparison,
            rejection_comparison=rejection_comparison,
            rejection_reasons=reason_totals,
            rejection_reason_headers=tuple(reason_headers),
            carrier_rejection_rows=tuple(carrier_rejection_rows),
            carriers=tuple(carriers),
            empty_reasons=read_count_rows("Sheet6", 4),
            empty_companies=read_count_rows("Sheet7", 3),
            monthly_totals=monthly_totals,
            september_shift_totals=tuple(september_shift_totals),
            current_shift_totals=tuple(current_shift_totals),
            shift_months=tuple(month_names),
            shift_rows=tuple(shift_rows),
        )
    finally:
        workbook.close()


def _header_map(sheet, header_row: int) -> dict[str, int]:
    return {
        normalize_label(cell.value): cell.column
        for cell in sheet[header_row]
        if normalize_label(cell.value)
    }


def _require_header(headers: dict[str, int], display_name: str) -> int:
    key = normalize_label(display_name)
    if key not in headers:
        raise SourceSchemaError(f"Gerekli sütun bulunamadı: {display_name}")
    return headers[key]


def _coerce_date(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        candidate = value.strip()
        for pattern in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(candidate, pattern).date()
            except ValueError:
                continue
    return None


def _unique_period(values: Iterable[date]) -> tuple[int, int]:
    periods = {(value.year, value.month) for value in values}
    if len(periods) != 1:
        raise SourceSchemaError(f"Araç kayıt raporu tek bir ay içermeli; bulunan dönemler: {sorted(periods)}")
    return next(iter(periods))


def extract_vehicle_split(path: str | Path) -> VehicleSplit:
    """Count Ravago and Alişan records without exposing record-level PII."""

    workbook = load_workbook(Path(path), data_only=True, read_only=True)
    try:
        sheet = _required_sheet(workbook, "Arac_Kayit_Sorgulama")
        headers = _header_map(sheet, 4)
        date_column = _require_header(headers, "Kayıt Tarihi")
        carrier_column = _require_header(headers, "Nakliyeci")
        company_column = _require_header(headers, "Firma Adı")

        ravago = 0
        alisan = 0
        alisan_carrier_total = 0
        dates: list[date] = []

        for row in sheet.iter_rows(min_row=5, values_only=True):
            record_date = _coerce_date(row[date_column - 1] if len(row) >= date_column else None)
            if record_date is None:
                continue
            dates.append(record_date)
            carrier = normalize_label(row[carrier_column - 1] if len(row) >= carrier_column else None)
            company = normalize_label(row[company_column - 1] if len(row) >= company_column else None)

            is_ravago = "RAVAGO" in company
            is_alisan_carrier = "ALISAN" in carrier
            if is_alisan_carrier:
                alisan_carrier_total += 1
                if is_ravago:
                    ravago += 1
                else:
                    alisan += 1

        if not dates:
            raise SourceSchemaError("Araç kayıt raporunda geçerli Kayıt Tarihi bulunamadı")
        year, month = _unique_period(dates)
        return VehicleSplit(
            year=year,
            month=month,
            ravago=ravago,
            alisan=alisan,
            alisan_carrier_total=alisan_carrier_total,
        )
    finally:
        workbook.close()


def extract_vehicle_presentation(path: str | Path) -> VehiclePresentationReport:
    """Build safe, presentation-ready aggregates without retaining row-level PII."""

    workbook = load_workbook(Path(path), data_only=True, read_only=True)
    try:
        sheet = _required_sheet(workbook, "Arac_Kayit_Sorgulama")
        headers = _header_map(sheet, 4)
        date_column = _require_header(headers, "Kayıt Tarihi")
        department_column = _require_header(headers, "Departman")
        vehicle_type_column = _require_header(headers, "Araç Tipi")
        carrier_column = _require_header(headers, "Nakliyeci")
        company_column = _require_header(headers, "Firma Adı")
        status_column = _require_header(headers, "Durum")

        daily_counts: dict[date, int] = {}
        departments: dict[str, int] = {}
        vehicle_types: dict[str, int] = {}
        carriers: dict[str, int] = {}
        dates: list[date] = []
        ravago = 0
        alisan = 0
        alisan_carrier_total = 0
        completed_records = 0

        for row in sheet.iter_rows(min_row=5, values_only=True):
            def value_at(column: int) -> object:
                return row[column - 1] if len(row) >= column else None

            record_date = _coerce_date(value_at(date_column))
            if record_date is None:
                continue

            dates.append(record_date)
            daily_counts[record_date] = daily_counts.get(record_date, 0) + 1

            department = str(value_at(department_column) or "Unspecified").strip()
            vehicle_type = str(value_at(vehicle_type_column) or "UNSPECIFIED").strip()
            carrier = str(value_at(carrier_column) or "UNSPECIFIED").strip()
            company_key = normalize_label(value_at(company_column))
            carrier_key = normalize_label(carrier)
            status_key = normalize_label(value_at(status_column)).rstrip(".")

            departments[department] = departments.get(department, 0) + 1
            vehicle_types[vehicle_type] = vehicle_types.get(vehicle_type, 0) + 1
            carriers[carrier] = carriers.get(carrier, 0) + 1

            is_ravago = "RAVAGO" in company_key
            is_alisan_carrier = "ALISAN" in carrier_key
            if is_alisan_carrier:
                alisan_carrier_total += 1
                if is_ravago:
                    ravago += 1
                else:
                    alisan += 1

            if status_key == "KAPI CIKIS TAMAMLANDI":
                completed_records += 1

        if not dates:
            raise SourceSchemaError("Araç kayıt raporunda geçerli Kayıt Tarihi bulunamadı")

        year, month = _unique_period(dates)
        total_records = len(dates)

        def sorted_counts(values: dict[str, int]) -> tuple[tuple[str, int], ...]:
            return tuple(sorted(values.items(), key=lambda item: (-item[1], normalize_label(item[0]))))

        return VehiclePresentationReport(
            year=year,
            month=month,
            start_date=min(dates),
            end_date=max(dates),
            total_records=total_records,
            daily_counts=tuple(sorted(daily_counts.items())),
            departments=sorted_counts(departments),
            vehicle_types=sorted_counts(vehicle_types),
            carriers=sorted_counts(carriers),
            ravago=ravago,
            alisan=alisan,
            alisan_carrier_total=alisan_carrier_total,
            completed_records=completed_records,
            other_status_records=total_records - completed_records,
        )
    finally:
        workbook.close()
