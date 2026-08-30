# -*- coding: utf-8 -*-
"""Build library/data/texts-v2.json — the catalogue with verified Arabic merged in.

Reads (never writes) the 183-row catalogue and the three verified Arabic
deliverables, and emits ONE merged catalogue that keeps every original row id.

Inputs
------
* ``texts.json``            — source of truth for ROW IDENTITY (183 rows).
* ``99names-arabic.json``   — 99 items, two independent agreeing sources,
                              zero needs_review  -> ``canonical``.
* ``adhkar-arabic.json``    — 27 items read off rendered page images and
                              cross-checked against the booklet's own
                              translation/transliteration -> ``verified_page_read``
                              for the 24 clean ones.
* ``ruqyah-chains.json``    — ``item_updates`` for Q10-Q13 (all needs_review).

THE ROW IDS ARE FROZEN
----------------------
Hafiz is reviewing a spreadsheet keyed on R01..R40 / N01..N99 / D01..D31 /
Q01..Q13 **right now**. Nothing here renumbers, splits, merges or deletes a
row. The two genuine structural findings (Q10 really is 14 texts; D24 really
holds two) are recorded as PROPOSALS in
``library/data/PROPOSED-CATALOGUE-CHANGES.md`` and applied to nothing.

STATUS LADDER (scope-v1 decision 3: no unverified Arabic gets an abjad number)
-----------------------------------------------------------------------------
``canonical``            fetched from a canonical database (Quran text API,
                         canonical 99-Names API) and, for the Names, confirmed
                         letter-for-letter against a second independent source.
                         Carries an abjad total.
``verified_page_read``   read off a rendered page image and cross-checked
                         against the booklet's own translation and
                         transliteration. Carries an abjad total. Deliberately
                         NOT ``canonical``: the provenance difference is real
                         and must survive in the data.
``pending_verification`` Arabic may be present, but a source conflict or a
                         structural defect is unresolved. ``abjad_total`` is
                         ALWAYS null and ``needs_review`` is always true.

Guarantees
----------
* Non-mutating: inputs opened read-only.
* Idempotent: output is a pure function of the inputs (``generated`` is
  inherited, never taken from the clock). ``--check`` verifies.
* Never overwrites a row that already carries canonical Quran text.

Usage:
    python library/tools/merge_arabic.py            # write texts-v2.json
    python library/tools/merge_arabic.py --check    # verify it is up to date
"""

import argparse
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import abjad     # noqa: E402
import identity  # noqa: E402

SCHEMA_VERSION = 2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "library", "data")

TEXTS_PATH = os.path.join(DATA_DIR, "texts.json")
NAMES_PATH = os.path.join(DATA_DIR, "99names-arabic.json")
ADHKAR_PATH = os.path.join(DATA_DIR, "adhkar-arabic.json")
RUQYAH_PATH = os.path.join(DATA_DIR, "ruqyah-chains.json")
OUT_PATH = os.path.join(DATA_DIR, "texts-v2.json")

STATUS_CANONICAL = "canonical"
STATUS_PAGE_READ = "verified_page_read"
STATUS_PENDING = "pending_verification"

# Field order of a merged row (texts.json order + needs_review before notes).
ROW_FIELDS = (
    "id", "source", "title", "transliteration", "quran_ref", "meaning_en",
    "stated_purpose", "category_primary", "category_secondary",
    "category_status", "arabic", "arabic_source", "arabic_status",
    "abjad_total", "needs_review", "notes",
)


def _read_json(path):
    with io.open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _append_note(existing, added):
    """Keep the catalogue's own note AND the merge note. Never lose either."""
    existing = (existing or "").strip()
    added = (added or "").strip()
    if not added:
        return existing or None
    if not existing:
        return added
    if added in existing:
        return existing
    return existing + " || MERGE 2026-08-21: " + added


def _order(row):
    out = {k: row[k] for k in ROW_FIELDS if k in row}
    for k in row:                      # nothing silently dropped
        if k not in out:
            out[k] = row[k]
    return out


def merge(texts_doc, names_doc, adhkar_doc, ruqyah_doc):
    """Return (merged_doc, stats). Pure function of the inputs."""
    rows = [dict(r) for r in texts_doc["texts"]]
    by_id = {r["id"]: r for r in rows}

    stats = {
        "rows_in": len(rows),
        "protected_canonical_untouched": 0,
        "names_merged": 0,
        "adhkar_page_read": 0,
        "adhkar_held_pending": 0,
        "ruqyah_arabic_stored_pending": 0,
        "ruqyah_still_no_arabic": 0,
        "recompute_mismatches": [],
        "unknown_ids": [],
    }

    # Rows that already carry canonical Quran text are FROZEN.
    protected = {r["id"] for r in rows if r.get("arabic_status") == STATUS_CANONICAL}
    stats["protected_canonical_untouched"] = len(protected)

    def apply(row_id, arabic, arabic_source, status, total, needs_review, note):
        if row_id not in by_id:
            stats["unknown_ids"].append(row_id)
            return
        if row_id in protected:
            # decision 3 + "do not overwrite the 53 canonical Quran rows"
            stats["unknown_ids"].append("PROTECTED:" + row_id)
            return
        row = by_id[row_id]
        row["arabic"] = arabic
        row["arabic_source"] = arabic_source
        row["arabic_status"] = status
        row["abjad_total"] = total
        row["needs_review"] = bool(needs_review)
        row["notes"] = _append_note(row.get("notes"), note)

    # ---- 99 Names -> canonical --------------------------------------------
    for item in names_doc["items"]:
        assert not item["needs_review"], item["id"]
        total = item["abjad_total"]
        recomputed = abjad.compute_abjad(item["arabic"])["grand"]
        if recomputed != total:
            stats["recompute_mismatches"].append((item["id"], total, recomputed))
            total = recomputed
        apply(item["id"], item["arabic"], item["arabic_source"],
              STATUS_CANONICAL, total, False, item.get("notes"))
        stats["names_merged"] += 1

    # ---- daily adhkar -> verified_page_read / pending ----------------------
    for item in adhkar_doc["items"]:
        arabic = item["arabic"]
        if item["needs_review"]:
            # Arabic is kept (it is real, read off the page) but NO number.
            apply(item["id"], arabic, item["arabic_source"], STATUS_PENDING,
                  None, True, item.get("notes"))
            stats["adhkar_held_pending"] += 1
            continue
        total = item["abjad_total"]
        recomputed = abjad.compute_abjad(arabic)["grand"]
        if recomputed != total:
            stats["recompute_mismatches"].append((item["id"], total, recomputed))
            total = recomputed
        apply(item["id"], arabic, item["arabic_source"], STATUS_PAGE_READ,
              total, False, item.get("notes"))
        stats["adhkar_page_read"] += 1

    # ---- ruqyah item_updates -> all pending, all totals null ---------------
    for item in ruqyah_doc["item_updates"]:
        assert item["needs_review"], item["id"]
        assert item["abjad_total"] is None, item["id"]
        apply(item["id"], item["arabic"], item["arabic_source"],
              STATUS_PENDING, None, True, item.get("notes"))
        if item["arabic"]:
            stats["ruqyah_arabic_stored_pending"] += 1
        else:
            stats["ruqyah_still_no_arabic"] += 1

    # ---- normalise every remaining row -------------------------------------
    for row in rows:
        row.setdefault("needs_review", row.get("arabic_status") == STATUS_PENDING)
        if row["arabic_status"] == STATUS_PENDING:
            row["abjad_total"] = None     # invariant, belt and braces
            row["needs_review"] = True

    merged = [_order(r) for r in rows]

    counts = {}
    for r in merged:
        counts[r["arabic_status"]] = counts.get(r["arabic_status"], 0) + 1
    stats["by_status"] = counts
    stats["with_arabic"] = sum(1 for r in merged if r["arabic"])
    stats["with_abjad_total"] = sum(1 for r in merged if r["abjad_total"] is not None)
    stats["needs_review"] = sum(1 for r in merged if r["needs_review"])

    doc = {
        "schema_version": SCHEMA_VERSION,
        "generated": texts_doc.get("generated"),
        "source": texts_doc.get("source"),
        "supersedes": "library/data/texts.json (schema_version %s)"
                      % texts_doc.get("schema_version"),
        "row_ids_frozen": (
            "Row ids R01-R40, N01-N99, D01-D31, Q01-Q13 are the merge key for "
            "Hafiz's review spreadsheet and MUST NOT be renumbered, split, merged "
            "or deleted while that spreadsheet is out. Structural findings are "
            "recorded in library/data/PROPOSED-CATALOGUE-CHANGES.md, not applied."
        ),
        "arabic_status_values": {
            STATUS_CANONICAL: (
                "Fetched from a canonical database (api.alquran.cloud quran-uthmani "
                "for Quran text; api.aladhan.com asmaAlHusna for the 99 Names, each "
                "Name additionally confirmed letter-for-letter against a second "
                "independent source). Carries an abjad total."
            ),
            STATUS_PAGE_READ: (
                "Read off a rendered page image of the source booklet and "
                "cross-checked against the booklet's own translation and "
                "transliteration. Carries an abjad total. NOT canonical: the "
                "provenance is a page reading, not a canonical database."
            ),
            STATUS_PENDING: (
                "Not cleared for a talisman. abjad_total is always null and "
                "needs_review is always true, whether or not Arabic is stored."
            ),
        },
        "arabic_source_note": texts_doc.get("arabic_source_note"),
        "merge_inputs": [
            "library/data/texts.json",
            "library/data/99names-arabic.json",
            "library/data/adhkar-arabic.json",
            "library/data/ruqyah-chains.json (item_updates only)",
        ],
        "counts": {
            "rows": len(merged),
            "by_arabic_status": counts,
            "with_arabic": stats["with_arabic"],
            "with_abjad_total": stats["with_abjad_total"],
            "needs_review": stats["needs_review"],
        },
        "texts": merged,
    }
    return doc, stats


def render(doc):
    return json.dumps(doc, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def build_doc():
    return merge(_read_json(TEXTS_PATH), _read_json(NAMES_PATH),
                 _read_json(ADHKAR_PATH), _read_json(RUQYAH_PATH))


def main(argv=None):
    ap = argparse.ArgumentParser(description="merge verified Arabic into the catalogue")
    ap.add_argument("--check", action="store_true",
                    help="do not write; exit 1 if texts-v2.json is missing or stale")
    args = ap.parse_args(argv)

    doc, stats = build_doc()
    payload = render(doc)

    if stats["unknown_ids"]:
        print("REFUSED updates for ids: %r" % (stats["unknown_ids"],))
        return 1
    if stats["recompute_mismatches"]:
        print("ABJAD MISMATCH (stored vs recomputed): %r" % (stats["recompute_mismatches"],))
        return 1

    if args.check:
        if not os.path.exists(OUT_PATH):
            print("MISSING: %s" % OUT_PATH)
            return 1
        with io.open(OUT_PATH, "r", encoding="utf-8") as fh:
            if fh.read() != payload:
                print("STALE: %s differs from a fresh merge" % OUT_PATH)
                return 1
        print("OK: texts-v2.json is up to date (idempotent).")
        return 0

    with io.open(OUT_PATH, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(payload)

    print("wrote %s" % OUT_PATH)
    print("  rows              : %d" % doc["counts"]["rows"])
    for k in (STATUS_CANONICAL, STATUS_PAGE_READ, STATUS_PENDING):
        print("  %-22s: %d" % (k, doc["counts"]["by_arabic_status"].get(k, 0)))
    print("  with arabic       : %d" % doc["counts"]["with_arabic"])
    print("  with abjad_total  : %d" % doc["counts"]["with_abjad_total"])
    print("  needs_review      : %d" % doc["counts"]["needs_review"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
