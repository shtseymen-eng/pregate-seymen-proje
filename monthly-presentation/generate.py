from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import NamedTuple


PROJECT_ROOT = Path(__file__).resolve().parent
EXCEL_SUFFIXES = {".xlsx", ".xlsm", ".xls"}


class GenerationPaths(NamedTuple):
    data: Path
    candidate: Path
    final: Path
    receipt: Path


def generation_paths(project_root: Path, output_filename: str) -> GenerationPaths:
    filename = Path(output_filename).name
    return GenerationPaths(
        data=project_root / "work" / "symn-poli-sunum-data.json",
        candidate=project_root / "work" / filename,
        final=project_root / "outputs" / filename,
        receipt=project_root / "work" / ".codex-finalizer" / f"{Path(filename).stem}.validation.json",
    )


def validate_excel_inputs(pregate: Path, vehicles: Path) -> None:
    for path in (pregate, vehicles):
        if not path.is_file():
            raise FileNotFoundError(f"Dosya bulunamadı: {path}")
        if path.suffix.lower() not in EXCEL_SUFFIXES:
            raise ValueError(f"Excel dosyası bekleniyor: {path}")


def archive_existing(path: Path, backup_dir: Path, timestamp: str) -> Path | None:
    if not path.exists():
        return None
    backup_dir.mkdir(parents=True, exist_ok=True)
    candidate = backup_dir / f"{path.stem}-{timestamp}{path.suffix}"
    counter = 2
    while candidate.exists():
        candidate = backup_dir / f"{path.stem}-{timestamp}-{counter}{path.suffix}"
        counter += 1
    return Path(shutil.move(str(path), str(candidate)))


def _choose_file_macos(prompt: str) -> Path:
    if sys.platform != "darwin":
        raise RuntimeError("Dosya seçme penceresi yalnızca macOS'ta kullanılabilir; --pregate ve --vehicles verin.")
    result = subprocess.run(
        ["osascript", "-e", f'POSIX path of (choose file with prompt "{prompt}")'],
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(result.stdout.strip())


def select_inputs() -> tuple[Path, Path]:
    pregate = _choose_file_macos("Ana Pregate Excel dosyasını seçin")
    vehicles = _choose_file_macos("Alışan-Ravago ayrımı için Araç Kayıt Sorgulama Excel dosyasını seçin")
    return pregate, vehicles


def _runtime_executable(configured: str | None, candidates: list[Path], fallback_name: str) -> str:
    if configured:
        configured_path = Path(configured).expanduser()
        if configured_path.is_file():
            return str(configured_path)
        raise FileNotFoundError(f"Yapılandırılmış çalışma programı bulunamadı: {configured_path}")
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    fallback = shutil.which(fallback_name)
    if fallback:
        return fallback
    raise FileNotFoundError(f"Gerekli çalışma programı bulunamadı: {fallback_name}")


def runtime_python() -> str:
    bundled = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "python"
        / "bin"
        / "python3"
    )
    return _runtime_executable(os.environ.get("PREGATE_RUNTIME_PYTHON"), [bundled], "python3")


def runtime_node() -> str:
    bundled = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "node"
        / "bin"
        / "node"
    )
    return _runtime_executable(os.environ.get("PREGATE_RUNTIME_NODE"), [bundled], "node")


def _run(command: list[str], *, environment: dict[str, str] | None = None) -> None:
    subprocess.run(command, cwd=PROJECT_ROOT, env=environment, check=True)


def generate_presentation(pregate: Path, vehicles: Path) -> Path:
    pregate = pregate.expanduser().resolve()
    vehicles = vehicles.expanduser().resolve()
    validate_excel_inputs(pregate, vehicles)

    data_path = PROJECT_ROOT / "work" / "symn-poli-sunum-data.json"
    data_path.parent.mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    source_path = str(PROJECT_ROOT / "src")
    environment["PYTHONPATH"] = os.pathsep.join(
        part for part in (source_path, environment.get("PYTHONPATH", "")) if part
    )

    print("1/3 Excel dosyaları okunuyor ve analiz ediliyor…", flush=True)
    _run(
        [
            runtime_python(),
            "-m",
            "symn_poli_sunum.cli",
            "classic-deck",
            "--pregate",
            str(pregate),
            "--vehicles",
            str(vehicles),
            "--output",
            str(data_path),
        ],
        environment=environment,
    )

    model = json.loads(data_path.read_text(encoding="utf-8"))
    paths = generation_paths(PROJECT_ROOT, model["output_filename"])
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = PROJECT_ROOT / "work" / "backups"
    archive_existing(paths.final, backup_dir, timestamp)
    archive_existing(paths.receipt, backup_dir, timestamp)

    print("2/3 PowerPoint hazırlanıyor…", flush=True)
    _run(
        [
            runtime_node(),
            str(PROJECT_ROOT / "src" / "presentation" / "build_deck.mjs"),
            "--data",
            str(paths.data),
            "--output",
            str(paths.candidate),
        ],
    )

    print("3/3 Sunum denetleniyor ve kaydediliyor…", flush=True)
    _run(
        [
            runtime_node(),
            str(PROJECT_ROOT / "src" / "presentation" / "finalize_deck.mjs"),
            "--data",
            str(paths.data),
            "--candidate",
            str(paths.candidate),
            "--output",
            str(paths.final),
        ],
    )
    return paths.final


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="İki Excel dosyasından aylık Pregate PowerPoint sunumu üretir.")
    parser.add_argument("--pregate", type=Path, help="Ana Pregate Excel dosyası")
    parser.add_argument("--vehicles", type=Path, help="Araç Kayıt Sorgulama Excel dosyası")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if bool(args.pregate) != bool(args.vehicles):
        print("Hem --pregate hem --vehicles birlikte verilmelidir.", file=sys.stderr)
        return 2
    try:
        pregate, vehicles = (args.pregate, args.vehicles) if args.pregate else select_inputs()
        output = generate_presentation(pregate, vehicles)
    except (FileNotFoundError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Sunum hazırlanamadı: {error}", file=sys.stderr)
        return 1
    print(f"\nSunum hazır:\n{output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
