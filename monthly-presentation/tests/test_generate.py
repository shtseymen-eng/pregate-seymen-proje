from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "generate.py"
SPEC = importlib.util.spec_from_file_location("pregate_generate", MODULE_PATH)
assert SPEC and SPEC.loader
generate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate)


class GenerateWorkflowTests(unittest.TestCase):
    def test_generation_paths_keep_all_outputs_inside_project(self) -> None:
        root = Path("/workspace/monthly-presentation")

        paths = generate.generation_paths(root, "EKİM 2026 PREGATE SUNUM.pptx")

        self.assertEqual(paths.data, root / "work" / "symn-poli-sunum-data.json")
        self.assertEqual(paths.candidate, root / "work" / "EKİM 2026 PREGATE SUNUM.pptx")
        self.assertEqual(paths.final, root / "outputs" / "EKİM 2026 PREGATE SUNUM.pptx")
        self.assertEqual(
            paths.receipt,
            root / "work" / ".codex-finalizer" / "EKİM 2026 PREGATE SUNUM.validation.json",
        )

    def test_archive_existing_preserves_previous_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            existing = root / "outputs" / "report.pptx"
            existing.parent.mkdir(parents=True)
            existing.write_bytes(b"old presentation")

            archived = generate.archive_existing(existing, root / "work" / "backups", "20261101-090000")

            self.assertFalse(existing.exists())
            self.assertIsNotNone(archived)
            assert archived is not None
            self.assertEqual(archived.read_bytes(), b"old presentation")
            self.assertEqual(archived.name, "report-20261101-090000.pptx")

    def test_excel_validation_rejects_wrong_or_missing_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pregate = root / "Pregate.xlsx"
            vehicles = root / "vehicles.csv"
            pregate.write_bytes(b"xlsx")
            vehicles.write_bytes(b"csv")

            with self.assertRaisesRegex(ValueError, "Excel"):
                generate.validate_excel_inputs(pregate, vehicles)
            with self.assertRaisesRegex(FileNotFoundError, "bulunamadı"):
                generate.validate_excel_inputs(root / "missing.xlsx", pregate)


if __name__ == "__main__":
    unittest.main()
