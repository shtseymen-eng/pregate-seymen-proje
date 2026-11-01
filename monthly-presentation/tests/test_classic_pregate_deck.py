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

    def test_classic_model_applies_only_the_requested_alisan_ravago_adjustment(self) -> None:
        self.assertTrue(hasattr(model_module, "build_classic_pregate_model"))

        report = extract_module.extract_pregate_report(PREGATE_SOURCE)
        split = extract_module.extract_vehicle_split(VEHICLE_SOURCE)
        model = model_module.build_classic_pregate_model(report, split)
        payload = model.to_dict()
        serialized = json.dumps(payload, ensure_ascii=False).upper()
        logistics = next(slide for slide in model.slides if slide.kind == "classic_logistics")
        counts = dict(logistics.data["carriers"])

        self.assertEqual(len(model.slides), 10)
        self.assertEqual(model.slides[0].title, "PREGATE OCTOBER 2026")
        self.assertEqual(model.slides[-1].title, "THANK YOU")
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
            self.assertEqual(len(payload["slides"]), 10)


if __name__ == "__main__":
    unittest.main()
