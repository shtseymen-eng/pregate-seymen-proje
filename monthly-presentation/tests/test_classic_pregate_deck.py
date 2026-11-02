from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import symn_poli_sunum.extract as extract_module
import symn_poli_sunum.model as model_module
from symn_poli_sunum.cli import main


PREGATE_SOURCE = Path("/Users/seymen/Downloads/PregateSunum_Tam (1).xlsx")
VEHICLE_SOURCE = Path("/Users/seymen/Downloads/Arac_Kayit_Sorgulama (4).xlsx")
LATEST_PREGATE_SOURCE = Path("/Users/seymen/Downloads/PregateSunum_Tam (2).xlsx")
LATEST_VEHICLE_SOURCE = Path("/Users/seymen/Downloads/Arac_Kayit_Sorgulama (5).xlsx")


@unittest.skipUnless(
    PREGATE_SOURCE.is_file() and VEHICLE_SOURCE.is_file(),
    "Yerel Ekim Excel örnekleri bulunamadı",
)
class ClassicPregateDeckTests(unittest.TestCase):
    def test_october_ready_tables_are_extracted_from_the_new_workbook(self) -> None:
        report = extract_module.extract_pregate_report(PREGATE_SOURCE)

        self.assertEqual((report.year, report.month), (2026, 10))
        self.assertEqual((report.summary_total, report.summary_approved, report.summary_rejected), (2322, 2173, 149))
        self.assertIn(("ALIŞAN LOJİSTİK A.Ş.", 24, 430), report.carriers)
        self.assertEqual(report.monthly_totals[-1], ("October", 1852))
        self.assertEqual(
            report.current_shift_totals,
            (("08-16", 1476), ("16-24", 65), ("24-08", 311)),
        )
        self.assertEqual(report.shift_months[-1], "October")
        self.assertTrue(any(row[0] == "08-16" and row[1] == "Poliport Terminal" for row in report.shift_rows))
        self.assertEqual(
            report.rejection_reason_headers,
            ("FİRMA TALEBİ İPTAL", "DONANIMSAL", "SÜRÜCÜ", "EVRAKSAL", "KKD"),
        )
        self.assertEqual(len(report.carrier_rejection_rows), 39)
        self.assertEqual(report.carrier_rejection_rows[0][-2:], (24, 430))

    def test_classic_model_applies_only_the_requested_alisan_ravago_adjustment(self) -> None:
        self.assertTrue(hasattr(model_module, "build_classic_pregate_model"))

        report = extract_module.extract_pregate_report(PREGATE_SOURCE)
        split = extract_module.extract_vehicle_split(VEHICLE_SOURCE)
        model = model_module.build_classic_pregate_model(report, split)
        payload = model.to_dict()
        serialized = json.dumps(payload, ensure_ascii=False).upper()
        logistics = next(slide for slide in model.slides if slide.kind == "classic_logistics")
        counts = dict(logistics.data["carriers"])

        self.assertEqual(len(model.slides), 13)
        self.assertEqual(model.slides[0].title, "PREGATE OCTOBER 2026")
        self.assertEqual(
            [slide.kind for slide in model.slides],
            [
                "cover",
                "classic_vehicle_numbers",
                "classic_site_distribution",
                "classic_shift_table",
                "classic_year_comparison",
                "classic_rejection_comparison",
                "classic_empty_reasons",
                "classic_empty_companies",
                "classic_logistics",
                "classic_rejection_departments",
                "classic_rejection_details",
                "classic_rejection_details",
                "classic_scope_notes",
            ],
        )
        self.assertEqual(model.slides[10].data["part"], 1)
        self.assertEqual(model.slides[11].data["part"], 2)
        self.assertEqual(
            model.slides[10].data["headers"],
            ("COMPANY REQUEST / CANCELLATION", "EQUIPMENT", "DRIVER", "DOCUMENTATION", "PPE"),
        )
        self.assertEqual(
            len(model.slides[10].data["rows"]) + len(model.slides[11].data["rows"]),
            len(report.carrier_rejection_rows),
        )
        self.assertEqual(model.slides[-1].title, "SCOPE AND DATA NOTES")
        notes = " ".join(model.slides[-1].data["notes"])
        self.assertIn("Pregate logistics table", notes)
        self.assertNotIn("kapsam", notes.lower())
        self.assertEqual(model.output_filename, "EKİM 2026 PREGATE SUNUM.pptx")
        self.assertEqual(counts["RAVAGO"], 328)
        self.assertEqual(counts["ALIŞAN LOJİSTİK A.Ş."], 102)
        self.assertEqual(counts["SEYİDOĞLU NAK."], 113)
        for forbidden in ("BLACKLIST", "KANTAR", "WEIGHBRIDGE"):
            self.assertNotIn(forbidden, serialized)

    def test_classic_deck_cli_writes_the_adjusted_model(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "classic-deck.json"
            exit_code = main(
                [
                    "classic-deck",
                    "--pregate",
                    str(PREGATE_SOURCE),
                    "--vehicles",
                    str(VEHICLE_SOURCE),
                    "--output",
                    str(output),
                ]
            )
            payload = json.loads(output.read_text(encoding="utf-8"))

            self.assertEqual(exit_code, 0)
            self.assertEqual(payload["output_filename"], "EKİM 2026 PREGATE SUNUM.pptx")
            self.assertEqual(len(payload["slides"]), 13)


@unittest.skipUnless(
    LATEST_PREGATE_SOURCE.is_file() and LATEST_VEHICLE_SOURCE.is_file(),
    "Yerel güncel Ekim Excel örnekleri bulunamadı",
)
class DenseOctoberDeckTests(unittest.TestCase):
    def test_shift_row_year_totals_ignore_later_month_columns(self) -> None:
        report = extract_module.extract_pregate_report(LATEST_PREGATE_SOURCE)

        self.assertEqual(report.shift_months[-1], "October")
        self.assertTrue(report.shift_rows)
        for _shift, _department, monthly_values, year_total in report.shift_rows:
            self.assertEqual(year_total, sum(monthly_values))

    def test_dense_tables_preserve_totals_and_balance_two_detail_slides(self) -> None:
        report = extract_module.extract_pregate_report(LATEST_PREGATE_SOURCE)
        split = extract_module.extract_vehicle_split(LATEST_VEHICLE_SOURCE)
        model = model_module.build_classic_pregate_model(report, split)
        empty_reasons = next(slide for slide in model.slides if slide.kind == "classic_empty_reasons")
        details = [slide for slide in model.slides if slide.kind == "classic_rejection_details"]

        self.assertLessEqual(len(empty_reasons.data["reasons"]), 16)
        self.assertEqual(
            sum(count for _label, count in empty_reasons.data["reasons"]),
            sum(count for _label, count in report.empty_reasons),
        )
        self.assertEqual(empty_reasons.data["reasons"][-1][0], "Other reasons")
        self.assertLessEqual(abs(len(details[0].data["rows"]) - len(details[1].data["rows"])), 1)
        displayed_rows = tuple(details[0].data["rows"]) + tuple(details[1].data["rows"])
        self.assertLessEqual(len(details[0].data["rows"]), 20)
        self.assertLessEqual(len(details[1].data["rows"]), 20)
        self.assertIn("OTHER LOGISTICS COMPANIES", {row[0] for row in displayed_rows})
        for column in range(1, len(report.carrier_rejection_rows[0])):
            self.assertEqual(
                sum(int(row[column]) for row in displayed_rows),
                sum(int(row[column]) for row in report.carrier_rejection_rows),
            )
        notes = " ".join(model.slides[-1].data["notes"])
        self.assertIn("grouped as Other Logistics Companies", notes)


if __name__ == "__main__":
    unittest.main()
