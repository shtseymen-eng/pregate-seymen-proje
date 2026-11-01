from __future__ import annotations

import json
import unittest
from dataclasses import replace
from pathlib import Path

from symn_poli_sunum.extract import (
    PregateReport,
    VehicleSplit,
    extract_pregate_report,
    extract_vehicle_split,
)


PREGATE_SOURCE = Path("/Users/seymen/Downloads/PregateSunum_Tam.xlsx")
VEHICLE_SOURCE = Path("/Users/seymen/Downloads/Arac_Kayit_Sorgulama (3).xlsx")


def simple_report() -> PregateReport:
    return PregateReport(
        year=2026,
        month=9,
        summary_total=4795,
        summary_approved=4483,
        summary_rejected=312,
        comparison_total=4801,
        rejection_comparison_total=282,
    )


def simple_split() -> VehicleSplit:
    return VehicleSplit(
        year=2026,
        month=9,
        ravago=653,
        alisan=132,
        alisan_carrier_total=785,
    )


class SlideModelTests(unittest.TestCase):
    def test_model_has_approved_twelve_slide_story(self) -> None:
        from symn_poli_sunum.model import build_slide_model

        model = build_slide_model(simple_report(), simple_split())
        titles = [slide.title for slide in model.slides]

        self.assertEqual(len(titles), 12)
        self.assertEqual(titles[0], "Pregate Aylık Operasyon Raporu")
        self.assertIn("Ravago ve Alişan Araç Dağılımı", titles)
        self.assertNotIn("BLACKLIST", " ".join(titles).upper())
        self.assertEqual(model.period.label, "Eylül 2026")

    def test_period_mismatch_stops_generation(self) -> None:
        from symn_poli_sunum.model import PeriodMismatchError, validate_periods

        with self.assertRaisesRegex(PeriodMismatchError, "2026-09.*2026-08"):
            validate_periods(simple_report(), replace(simple_split(), month=8))

    def test_output_filename_uses_turkish_uppercase_month_and_year(self) -> None:
        from symn_poli_sunum.model import build_slide_model

        september = build_slide_model(simple_report(), simple_split())
        february = build_slide_model(
            replace(simple_report(), month=2),
            replace(simple_split(), month=2),
        )
        october = build_slide_model(
            replace(simple_report(), month=10),
            replace(simple_split(), month=10),
        )

        self.assertTrue(hasattr(september, "output_filename"))
        self.assertEqual(september.output_filename, "EYLÜL 2026 PREGATE SUNUM.pptx")
        self.assertEqual(february.output_filename, "ŞUBAT 2026 PREGATE SUNUM.pptx")
        self.assertEqual(october.output_filename, "EKİM 2026 PREGATE SUNUM.pptx")

    def test_scope_mismatches_are_preserved_as_warnings(self) -> None:
        from symn_poli_sunum.model import build_slide_model

        model = build_slide_model(simple_report(), simple_split())
        serialized = model.to_dict()
        warning_text = json.dumps(serialized["warnings"], ensure_ascii=False)

        self.assertIn("4.795", warning_text)
        self.assertIn("4.801", warning_text)
        self.assertIn("312", warning_text)
        self.assertIn("282", warning_text)

    def test_json_model_contains_only_aggregate_vehicle_fields(self) -> None:
        from symn_poli_sunum.model import build_slide_model

        payload = build_slide_model(simple_report(), simple_split()).to_dict()
        serialized = json.dumps(payload, ensure_ascii=False)

        def keys(value):
            if isinstance(value, dict):
                for key, nested in value.items():
                    yield str(key).lower()
                    yield from keys(nested)
            elif isinstance(value, list):
                for nested in value:
                    yield from keys(nested)

        self.assertIn('"ravago": 653', serialized)
        self.assertIn('"alisan": 132', serialized)
        for forbidden in ("plaka", "çekici", "surucu", "sürücü", "telefon"):
            self.assertNotIn(forbidden, set(keys(payload)))

    def test_source_notes_do_not_pin_a_historical_vehicle_filename(self) -> None:
        from symn_poli_sunum.model import build_slide_model

        payload = build_slide_model(simple_report(), simple_split()).to_dict()
        source_notes = " ".join(slide["source"] for slide in payload["slides"])

        self.assertIn("Arac_Kayit_Sorgulama.xlsx", source_notes)
        self.assertNotIn("Arac_Kayit_Sorgulama (3).xlsx", source_notes)

    @unittest.skipUnless(
        PREGATE_SOURCE.is_file() and VEHICLE_SOURCE.is_file(),
        "Yerel Eylül Excel örnekleri bulunamadı",
    )
    def test_real_sources_populate_key_charts(self) -> None:
        from symn_poli_sunum.model import build_slide_model

        report = extract_pregate_report(PREGATE_SOURCE)
        split = extract_vehicle_split(VEHICLE_SOURCE)
        model = build_slide_model(report, split)
        by_kind = {slide.kind: slide for slide in model.slides}

        self.assertEqual(report.comparison_total, 4801)
        self.assertEqual(report.rejection_comparison_total, 282)
        self.assertEqual(by_kind["carrier_split"].data["ravago"], 653)
        self.assertEqual(by_kind["carrier_split"].data["alisan"], 132)
        self.assertEqual(by_kind["monthly_trend"].data["monthly_totals"][-1][1], 3858)
        self.assertEqual(by_kind["rejection_reasons"].data["reasons"][0], ("Evraksal", 74))
        self.assertIn(("Tank ıslak", 4), by_kind["empty_vehicles"].data["reasons"])
        self.assertEqual(sum(1 for label, _value in by_kind["empty_vehicles"].data["reasons"] if label == "Tank ıslak"), 1)


if __name__ == "__main__":
    unittest.main()
