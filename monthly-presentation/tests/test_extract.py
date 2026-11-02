from __future__ import annotations

import importlib
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook


ROOT = Path(__file__).resolve().parents[1]
PREGATE_SOURCE = Path("/Users/seymen/Downloads/PregateSunum_Tam.xlsx")
VEHICLE_SOURCE = Path("/Users/seymen/Downloads/Arac_Kayit_Sorgulama (3).xlsx")


def extract_module():
    return importlib.import_module("symn_poli_sunum.extract")


def make_vehicle_book(path: Path, headers: list[str], rows: list[list[object]]) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Arac_Kayit_Sorgulama"
    for column, header in enumerate(headers, start=1):
        sheet.cell(row=4, column=column, value=header)
    for row_index, values in enumerate(rows, start=5):
        for column, value in enumerate(values, start=1):
            sheet.cell(row=row_index, column=column, value=value)
    workbook.save(path)


class ExtractTests(unittest.TestCase):
    def test_normalize_label_handles_turkish_characters_and_case(self) -> None:
        module = extract_module()

        self.assertEqual(module.normalize_label("  Alışan Lojistik A.Ş. "), "ALISAN LOJISTIK A.S.")
        self.assertEqual(module.normalize_label("ravago eps kimya a.ş,"), "RAVAGO EPS KIMYA A.S,")

    def test_vehicle_split_classifies_ravago_before_alisan(self) -> None:
        module = extract_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "vehicles.xlsx"
            headers = [f"Field {index}" for index in range(1, 29)]
            headers[1] = "Kayıt Tarihi"
            headers[17] = "Nakliyeci"
            headers[20] = "Firma Adı"
            make_vehicle_book(
                input_path,
                headers,
                [
                    [None, "2026-09-01", *([None] * 15), "ALIŞAN LOJİSTİK A.Ş.", None, None, "Ravago EPS Kimya"],
                    [None, "2026-09-02", *([None] * 15), "Alışan Lojistik A.Ş.", None, None, "Başka Firma"],
                    [None, "2026-09-03", *([None] * 15), "ALIŞAN LOJİSTİK A.Ş.", None, None, "RAVAGO"],
                ],
            )

            split = module.extract_vehicle_split(input_path)

        self.assertEqual(split.ravago, 2)
        self.assertEqual(split.alisan, 1)
        self.assertEqual(split.alisan_carrier_total, 3)

    def test_vehicle_split_ignores_ravago_records_from_other_carriers(self) -> None:
        module = extract_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "vehicles.xlsx"
            headers = [f"Field {index}" for index in range(1, 29)]
            headers[1] = "Kayıt Tarihi"
            headers[17] = "Nakliyeci"
            headers[20] = "Firma Adı"
            make_vehicle_book(
                input_path,
                headers,
                [
                    [None, "2026-09-01", *([None] * 15), "ALIŞAN LOJİSTİK A.Ş.", None, None, "RAVAGO"],
                    [None, "2026-09-02", *([None] * 15), "BAŞKA NAKLİYECİ", None, None, "RAVAGO"],
                    [None, "2026-09-03", *([None] * 15), "ALIŞAN LOJİSTİK A.Ş.", None, None, "BAŞKA FİRMA"],
                    [None, "2026-09-04", *([None] * 15), "ÇALIŞAN TAŞIMACILIK", None, None, "RAVAGO"],
                ],
            )

            split = module.extract_vehicle_split(input_path)

        self.assertEqual(split.ravago, 1)
        self.assertEqual(split.alisan, 1)
        self.assertEqual(split.alisan_carrier_total, 2)

    def test_vehicle_split_rejects_missing_company_column(self) -> None:
        module = extract_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "vehicles.xlsx"
            headers = [f"Field {index}" for index in range(1, 29)]
            headers[1] = "Kayıt Tarihi"
            headers[17] = "Nakliyeci"
            make_vehicle_book(input_path, headers, [])

            with self.assertRaisesRegex(module.SourceSchemaError, "Firma Adı"):
                module.extract_vehicle_split(input_path)

    @unittest.skipUnless(PREGATE_SOURCE.is_file(), "Yerel Eylül Pregate örneği bulunamadı")
    def test_real_pregate_source_extracts_september_summary(self) -> None:
        module = extract_module()

        report = module.extract_pregate_report(PREGATE_SOURCE)

        self.assertEqual(report.year, 2026)
        self.assertEqual(report.month, 9)
        self.assertEqual(report.summary_total, 4795)
        self.assertEqual(report.summary_approved, 4483)
        self.assertEqual(report.summary_rejected, 312)

    def test_pregate_source_rejects_missing_required_sheet(self) -> None:
        module = extract_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "pregate.xlsx"
            workbook = Workbook()
            workbook.active.title = "Sheet1"
            for sheet_name in ("Sheet2", "Sheet4", "Sheet6", "Sheet7", "Sheet8", "Sheet9", "Sheet14"):
                workbook.create_sheet(sheet_name)
            workbook.save(input_path)

            with self.assertRaisesRegex(module.SourceSchemaError, "Sheet10"):
                module.extract_pregate_report(input_path)

    @unittest.skipUnless(VEHICLE_SOURCE.is_file(), "Yerel Eylül araç örneği bulunamadı")
    def test_real_vehicle_source_extracts_ravago_and_alisan_split(self) -> None:
        module = extract_module()

        split = module.extract_vehicle_split(VEHICLE_SOURCE)

        self.assertEqual(split.year, 2026)
        self.assertEqual(split.month, 9)
        self.assertEqual(split.ravago, 653)
        self.assertEqual(split.alisan, 132)
        self.assertEqual(split.alisan_carrier_total, 785)


if __name__ == "__main__":
    unittest.main()
