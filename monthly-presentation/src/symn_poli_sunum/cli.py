from __future__ import annotations

import argparse
import json
from pathlib import Path

from .extract import extract_pregate_report, extract_vehicle_presentation, extract_vehicle_split
from .model import build_classic_pregate_model, build_slide_model, build_vehicle_deck_model


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="SYMN-poli-sunum")
    subparsers = parser.add_subparsers(dest="command", required=True)
    extract = subparsers.add_parser("extract", help="Excel raporlarını güvenli sunum modeline dönüştürür")
    extract.add_argument("--pregate", type=Path, required=True)
    extract.add_argument("--vehicles", type=Path, required=True)
    extract.add_argument("--output", type=Path, required=True)
    vehicle_deck = subparsers.add_parser(
        "vehicle-deck",
        help="Araç kayıt raporunu İngilizce, sunuma hazır toplulaştırılmış modele dönüştürür",
    )
    vehicle_deck.add_argument("--vehicles", type=Path, required=True)
    vehicle_deck.add_argument("--output", type=Path, required=True)
    classic_deck = subparsers.add_parser(
        "classic-deck",
        help="Hazır Pregate tablolarını klasik kurumsal sunum modeline dönüştürür",
    )
    classic_deck.add_argument("--pregate", type=Path, required=True)
    classic_deck.add_argument("--vehicles", type=Path, required=True)
    classic_deck.add_argument("--output", type=Path, required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "extract":
        report = extract_pregate_report(args.pregate)
        split = extract_vehicle_split(args.vehicles)
        model = build_slide_model(report, split)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(model.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        return 0
    if args.command == "vehicle-deck":
        report = extract_vehicle_presentation(args.vehicles)
        model = build_vehicle_deck_model(report)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(model.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        return 0
    if args.command == "classic-deck":
        report = extract_pregate_report(args.pregate)
        split = extract_vehicle_split(args.vehicles)
        model = build_classic_pregate_model(report, split)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(model.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
