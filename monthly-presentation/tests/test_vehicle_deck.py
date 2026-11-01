from __future__ import annotations

import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

import symn_poli_sunum.extract as extract_module
import symn_poli_sunum.model as model_module
from symn_poli_sunum.cli import main


SOURCE = Path("/Users/seymen/Downloads/Arac_Kayit_Sorgulama (4).xlsx")


@unittest.skipUnless(SOURCE.is_file(), "Yerel Ekim araç örneği bulunamadı")
class VehicleDeckTests(unittest.TestCase):
    def test_real_october_report_extracts_safe_aggregate_fields(self) -> None:
        self.assertTrue(hasattr(extract_module, "extract_vehicle_presentation"))

        report = extract_module.extract_vehicle_presentation(SOURCE)

        self.assertEqual((report.year, report.month), (2026, 10))
        self.assertEqual((report.start_date, report.end_date), (date(2026, 10, 1), date(2026, 10, 15)))
        self.assertEqual(report.total_records, 1764)
        self.assertEqual(report.daily_counts[-2:], ((date(2026, 10, 14), 182), (date(2026, 10, 15), 173)))
        self.assertEqual(report.departments[:3], (("Poliport Terminal", 1419), ("Poliport KuruYük Antrepo", 337), ("Atık Yönetimi", 8)))
        self.assertEqual(report.vehicle_types[0], ("TANK KONTEYNER", 747))
        self.assertEqual(report.carriers[0], ("ALIŞAN LOJİSTİK A.Ş.", 416))
        self.assertEqual((report.ravago, report.alisan, report.alisan_carrier_total), (328, 88, 416))
        self.assertEqual((report.completed_records, report.other_status_records), (1659, 105))

    def test_vehicle_deck_model_is_nine_slides_and_excludes_sensitive_sections(self) -> None:
        self.assertTrue(hasattr(model_module, "build_vehicle_deck_model"))

        report = extract_module.extract_vehicle_presentation(SOURCE)
        model = model_module.build_vehicle_deck_model(report)
        payload = model.to_dict()
        serialized = json.dumps(payload, ensure_ascii=False)
        titles = [slide.title for slide in model.slides]

        self.assertEqual(len(titles), 9)
        self.assertEqual(titles[0], "PREGATE OCTOBER 2026")
        self.assertEqual(titles[-1], "Scope and Data Notes")
        self.assertEqual(model.output_filename, "EKİM 2026 PREGATE SUNUM.pptx")
        self.assertIn("Poliport KuruYük Antrepo", serialized)
        self.assertIn('"ravago": 328', serialized)
        self.assertIn('"alisan": 88', serialized)
        self.assertIn("TANK CONTAINER", serialized)
        self.assertIn('"OTHER"', serialized)
        vehicle_type_data = next(slide.data for slide in model.slides if slide.kind == "vehicle_type_distribution")
        self.assertNotIn("TANK KONTEYNER", json.dumps(vehicle_type_data, ensure_ascii=False))
        for forbidden in ("BLACKLIST", "KANTAR", "WEIGHBRIDGE", "PLAKA", "SÜRÜCÜ", "TELEFON"):
            self.assertNotIn(forbidden, serialized.upper())

    def test_vehicle_deck_cli_writes_the_presentation_model(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "vehicle-deck.json"
            exit_code = main(["vehicle-deck", "--vehicles", str(SOURCE), "--output", str(output)])

            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(exit_code, 0)
            self.assertEqual(payload["output_filename"], "EKİM 2026 PREGATE SUNUM.pptx")
            self.assertEqual(len(payload["slides"]), 9)


if __name__ == "__main__":
    unittest.main()
