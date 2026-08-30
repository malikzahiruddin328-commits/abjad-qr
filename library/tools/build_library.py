# -*- coding: utf-8 -*-
"""Build library/data/library.json — the merged, benefit-indexed text library.

Reads (never writes) a catalogue file (default library/data/texts-v2.json),
library/data/categories.json and library/data/ruqyah-chains.json, groups the
Arabic-bearing rows by content identity (see identity.py), collapses duplicate
texts while preserving EVERY catalogue row as an `entries[]` record, emits a
top-level `benefit_index` for wildcard "search by benefit", and folds the
ruqyah chains + one-click presets in under a top-level `chains` key so the UI
loads exactly one file.

Guarantees
----------
* **Non-mutating**: inputs are opened read-only; nothing is written back.
* **Idempotent**: output is a pure function of the inputs. `generated` is
  inherited from the catalogue rather than taken from the clock, so two runs on
  unchanged inputs produce byte-identical files. Verify with `--check`.
* **Lossless**: every one of the source rows survives as an entry. Duplicate
  texts are merged; duplicate *benefits* never are.
* **Pending rows are not lost**: the rows with no verified Arabic yet appear
  with `content_id: null`, keyed by their `source_id`, and are still searchable
  through the benefit index.

The `source_id` on each entry is the original R/N/D/Q catalogue id and is the
merge key for Hafiz's spreadsheet corrections — it must never be regenerated.

CHAIN STEP BINDING
------------------
Each chain step is resolved to something the UI can actually load, and the
resolution is recorded on the step as `binding`:

  catalogue_row       the step names a live catalogue row id (R/N/D/Q).
  proposed_item       the step names one of the booklet texts the catalogue
                      does not contain yet (RB-*), carried here verbatim in
                      `chains.proposed_new_items` so nothing dangles.
  identity_bound_row  a proposed item whose Arabic turned out to be
                      letter-identical to a live catalogue row — the step is
                      bound to that row and inherits its cleared abjad total.
                      This binding is DERIVED, never hand-written.
  quran_ref_only      no stored text yet, but an unambiguous Quran reference.
  practice_instruction  a behavioural instruction with no text of its own
                      (e.g. "pray Fajr in congregation"). Correctly unbindable.

A step is `talisman_ready` only when its binding resolves to a row that has a
non-null abjad_total — i.e. never on unverified Arabic (scope-v1 decision 3).

Usage:
    python library/tools/build_library.py            # write library.json
    python library/tools/build_library.py --check    # verify it is up to date
    python library/tools/build_library.py --texts library/data/texts.json
"""

import argparse
import collections
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import identity  # noqa: E402

SCHEMA_VERSION = 2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "library", "data")
TEXTS_PATH = os.path.join(DATA_DIR, "texts-v2.json")
CATEGORIES_PATH = os.path.join(DATA_DIR, "categories.json")
CHAINS_PATH = os.path.join(DATA_DIR, "ruqyah-chains.json")
LIBRARY_PATH = os.path.join(DATA_DIR, "library.json")

# Fields copied verbatim from a catalogue row into its entry record.
ENTRY_FIELDS = (
    "source_book",
    "title",
    "transliteration",
    "meaning_en",
    "stated_purpose",
    "category_primary",
    "category_secondary",
)

# English function words that would otherwise dominate the benefit index.
STOPWORDS = frozenset("""
a about above after again against all also am an and any are as at
be because been before being below between both but by
can cannot could
did do does doing done down during
each either else even ever every
few for from further
had has have having he her here hers him his how however
i if in into is it its itself
just
let
me more most much must my
no nor not now
of off on once one only or other our ours out over own
per
same she should so some such
than that the their theirs them then there these they this those though through to too
under until up upon us use used
very
was we were what when where which while who whom whose why will with within without would
you your yours
""".split())


def _read_json(path):
    with io.open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


_WORD_SPLIT = re.compile(r"[^a-z0-9]+")


def keywords(text):
    """Lowercased benefit keywords extracted from a piece of English prose."""
    if not text:
        return []
    lowered = text.lower()
    # fold curly apostrophes so du'a / du’a / dua collapse sensibly
    lowered = lowered.replace("’", "").replace("'", "")
    out = []
    for tok in _WORD_SPLIT.split(lowered):
        if len(tok) < 3:
            continue
        if tok.isdigit():
            continue
        if tok in STOPWORDS:
            continue
        out.append(tok)
    return out


BINDING_CATALOGUE_ROW = "catalogue_row"
BINDING_IDENTITY_ROW = "identity_bound_row"
BINDING_PROPOSED_ITEM = "proposed_item"
BINDING_QURAN_REF = "quran_ref_only"
BINDING_PRACTICE = "practice_instruction"


def _bind_steps(chains_doc, rows, item_by_content_id):
    """Resolve every chain step against the live catalogue. Pure; returns a
    (chains, presets, proposed_items, counts) tuple with `binding` added to
    each step. Nothing in the input document is mutated."""
    row_by_id = {r["id"]: r for r in rows}
    proposed = [dict(p) for p in chains_doc.get("proposed_new_items", [])]
    proposed_by_id = {p["id"]: p for p in proposed}

    # A proposed booklet text whose letters match a live row IS that text.
    for p in proposed:
        cid = identity.content_id(p.get("arabic")) if p.get("arabic") else None
        p["content_id"] = cid
        p["identity_matches_row"] = None
        if cid and cid in item_by_content_id:
            p["identity_matches_row"] = [
                e["source_id"] for e in item_by_content_id[cid]["entries"]]

    def binding_for(step):
        sid = step.get("source_id")
        ref = step.get("quran_ref")
        if sid and sid in row_by_id:
            row = row_by_id[sid]
            cid = identity.content_id(row["arabic"]) if row.get("arabic") else None
            return {
                "kind": BINDING_CATALOGUE_ROW,
                "row_ids": [sid],
                "library_key": cid or sid,
                "content_id": cid,
                "abjad_total": row.get("abjad_total"),
                "arabic_status": row.get("arabic_status"),
                "talisman_ready": row.get("abjad_total") is not None,
                "note": None,
            }
        if sid and sid in proposed_by_id:
            p = proposed_by_id[sid]
            matched = p["identity_matches_row"]
            if matched:
                row = row_by_id[matched[0]]
                return {
                    "kind": BINDING_IDENTITY_ROW,
                    "row_ids": list(matched),
                    "library_key": p["content_id"],
                    "content_id": p["content_id"],
                    "abjad_total": row.get("abjad_total"),
                    "arabic_status": row.get("arabic_status"),
                    "talisman_ready": row.get("abjad_total") is not None,
                    "note": ("booklet text %s is letter-identical to catalogue row(s) %s; "
                             "the step uses that row's cleared total, no new number is minted"
                             % (sid, ", ".join(matched))),
                }
            return {
                "kind": BINDING_PROPOSED_ITEM,
                "row_ids": [],
                "library_key": sid,
                "content_id": p.get("content_id"),
                "abjad_total": None,
                "arabic_status": p.get("arabic_status"),
                "talisman_ready": False,
                "note": ("text carried in chains.proposed_new_items; not a catalogue row "
                         "yet, so no abjad number (scope-v1 decision 3)"),
            }
        if ref:
            return {
                "kind": BINDING_QURAN_REF,
                "row_ids": [],
                "library_key": None,
                "content_id": None,
                "abjad_total": None,
                "arabic_status": "pending_verification",
                "talisman_ready": False,
                "note": "unambiguous Quran reference; canonical text not fetched into the catalogue yet",
            }
        return {
            "kind": BINDING_PRACTICE,
            "row_ids": [],
            "library_key": None,
            "content_id": None,
            "abjad_total": None,
            "arabic_status": None,
            "talisman_ready": False,
            "note": "behavioural instruction printed without a text of its own; not bindable by design",
        }

    out_chains = []
    kinds = collections.Counter()
    for chain in chains_doc.get("chains", []):
        c = dict(chain)
        steps = []
        for step in chain["steps"]:
            s = dict(step)
            s["binding"] = binding_for(step)
            kinds[s["binding"]["kind"]] += 1
            steps.append(s)
        c["steps"] = steps
        c["step_count"] = len(steps)
        c["talisman_ready_steps"] = sum(1 for s in steps
                                        if s["binding"]["talisman_ready"]
                                        and s.get("talisman_suitable"))
        out_chains.append(c)

    chain_ids = {c["chain_id"] for c in out_chains}
    presets = []
    for preset in chains_doc.get("presets", []):
        p = dict(preset)
        missing = [cid for cid in p.get("load", []) if cid not in chain_ids]
        if missing:
            raise AssertionError("preset %s loads unknown chain(s) %r"
                                 % (p.get("preset_id"), missing))
        p["step_count"] = sum(c["step_count"] for c in out_chains
                              if c["chain_id"] in p.get("load", []))
        presets.append(p)

    counts = {
        "chains": len(out_chains),
        "steps": sum(c["step_count"] for c in out_chains),
        "presets": len(presets),
        "proposed_new_items": len(proposed),
        "steps_by_binding": dict(sorted(kinds.items())),
        "steps_talisman_ready": sum(1 for c in out_chains
                                    for s in c["steps"]
                                    if s["binding"]["talisman_ready"]),
        "proposed_items_bound_by_identity": sum(
            1 for p in proposed if p["identity_matches_row"]),
    }
    return out_chains, presets, proposed, counts


def build(texts_doc, categories_doc, chains_doc=None, texts_path="library/data/texts-v2.json"):
    """Return the merged library document (pure function of its inputs)."""
    rows = texts_doc["texts"]
    cat_name = {c["id"]: c["name_en"] for c in categories_doc["categories"]}

    items = []            # library items, in first-appearance order
    by_content_id = {}    # content_id -> item

    for row in rows:
        arabic = row.get("arabic")
        cid = identity.content_id(arabic) if arabic else None

        entry = {"source_id": row["id"]}
        entry["source_book"] = row.get("source")
        for field in ENTRY_FIELDS[1:]:
            entry[field] = row.get(field)
        entry["arabic_status"] = row.get("arabic_status")
        entry["needs_review"] = bool(row.get("needs_review"))

        if cid is not None and cid in by_content_id:
            by_content_id[cid]["entries"].append(entry)
            continue

        item = {
            "library_key": cid if cid is not None else row["id"],
            "content_id": cid,
            "arabic": arabic,
            "letter_key": identity.letter_key(arabic) if arabic else None,
            "abjad_total": row.get("abjad_total"),
            "quran_ref": row.get("quran_ref"),
            "quran_refs": [],
            "display_title": row.get("title"),
            "alt_titles": [],
            "arabic_status": row.get("arabic_status"),
            "needs_review": bool(row.get("needs_review")),
            "entries": [entry],
        }
        items.append(item)
        if cid is not None:
            by_content_id[cid] = item

    # ---- finalise merged fields, and assert the identity invariant ----------
    row_by_id = {r["id"]: r for r in rows}
    for item in items:
        titles, refs, totals, statuses = [], [], set(), []
        for e in item["entries"]:
            row = row_by_id[e["source_id"]]
            if e["title"] and e["title"] not in titles:
                titles.append(e["title"])
            if row.get("quran_ref") and row["quran_ref"] not in refs:
                refs.append(row["quran_ref"])
            totals.add(row.get("abjad_total"))
            if row.get("arabic_status") not in statuses:
                statuses.append(row.get("arabic_status"))

        if len(totals) != 1:
            raise AssertionError(
                "identity violation: %s groups rows with differing abjad totals %r"
                % (item["library_key"], sorted(totals, key=lambda v: (v is None, v)))
            )

        item["display_title"] = titles[0] if titles else None
        item["alt_titles"] = titles[1:]
        item["quran_refs"] = refs
        item["quran_ref"] = refs[0] if len(refs) == 1 else None
        item["arabic_status"] = statuses[0] if len(statuses) == 1 else "mixed"
        item["needs_review"] = any(e["needs_review"] for e in item["entries"])

    # ---- benefit index ------------------------------------------------------
    index = collections.defaultdict(list)
    for item in items:
        seen = set()
        for e in item["entries"]:
            for src in (e.get("stated_purpose"), e.get("meaning_en")):
                seen.update(keywords(src))
            for cf in ("category_primary", "category_secondary"):
                seen.update(keywords(cat_name.get(e.get(cf))))
        for kw in seen:
            index[kw].append(item["library_key"])

    benefit_index = {kw: sorted(set(keys)) for kw, keys in sorted(index.items())}

    identified = [i for i in items if i["content_id"]]
    pending = [i for i in items if not i["content_id"]]
    dup_groups = [i for i in identified if len(i["entries"]) > 1]

    by_content_id_final = {i["content_id"]: i for i in identified}
    chain_block = None
    if chains_doc is not None:
        out_chains, presets, proposed, chain_counts = _bind_steps(
            chains_doc, rows, by_content_id_final)
        chain_block = {
            "schema_version": chains_doc.get("schema_version"),
            "source": chains_doc.get("source"),
            "note": (
                "The ruqyah booklet publishes ONE base sequence plus conditional "
                "add-on blocks, not N independent affliction chains. `presets` is "
                "the one-click affliction layer: each preset loads one or more "
                "chain_ids in order. Every step keeps its `talisman_suitable` flag "
                "and `repeat_count` exactly as read from the source, and gains a "
                "derived `binding` saying what it resolves to."
            ),
            "binding_kinds": {
                BINDING_CATALOGUE_ROW: "step names a live catalogue row id",
                BINDING_IDENTITY_ROW: ("step names a booklet text that is letter-identical "
                                       "to a live catalogue row; bound to that row"),
                BINDING_PROPOSED_ITEM: ("booklet text the catalogue does not contain yet; "
                                        "carried in proposed_new_items, no abjad number"),
                BINDING_QURAN_REF: "unambiguous Quran reference, text not fetched yet",
                BINDING_PRACTICE: "behavioural instruction with no text of its own",
            },
            "counts": chain_counts,
            "chains": out_chains,
            "presets": presets,
            "proposed_new_items": proposed,
            "open_questions_for_hafiz": chains_doc.get("open_questions_for_hafiz", []),
        }

    doc = {
        "schema_version": SCHEMA_VERSION,
        "generated": texts_doc.get("generated"),
        "built_from": {
            "texts": texts_path,
            "texts_schema_version": texts_doc.get("schema_version"),
            "categories": "library/data/categories.json",
            "categories_schema_version": categories_doc.get("schema_version"),
            "chains": "library/data/ruqyah-chains.json" if chains_doc else None,
        },
        "identity_rule": (
            "A text's identity is the exact sequence of abjad-bearing base letters. "
            "Diacritics, tatweel, standalone hamza, spaces and punctuation are stripped "
            "because none of them changes the abjad value. See library/tools/identity.py."
        ),
        "benefit_index_note": (
            "keyword -> list of library_key. library_key equals content_id for identified "
            "texts and the original source_id for rows still pending Arabic verification, "
            "so pending rows stay searchable by benefit."
        ),
        "counts": {
            "source_rows": len(rows),
            "library_items": len(items),
            "identified_texts": len(identified),
            "pending_rows": len(pending),
            "duplicate_groups": len(dup_groups),
            "redundant_rows": sum(len(i["entries"]) - 1 for i in dup_groups),
            "entries_total": sum(len(i["entries"]) for i in items),
            "benefit_index_keys": len(benefit_index),
            "rows_by_arabic_status": dict(sorted(collections.Counter(
                r.get("arabic_status") for r in rows).items())),
            "rows_with_abjad_total": sum(
                1 for r in rows if r.get("abjad_total") is not None),
            "rows_needing_review": sum(1 for r in rows if r.get("needs_review")),
        },
        "texts": items,
        "benefit_index": benefit_index,
    }
    if chain_block is not None:
        doc["chains"] = chain_block
        doc["counts"]["chains"] = chain_block["counts"]["chains"]
        doc["counts"]["chain_steps"] = chain_block["counts"]["steps"]
        doc["counts"]["presets"] = chain_block["counts"]["presets"]
    return doc


def render(doc):
    return json.dumps(doc, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="do not write; exit 1 if library.json is missing or stale")
    ap.add_argument("--texts", default=TEXTS_PATH,
                    help="catalogue to build from (default library/data/texts-v2.json)")
    ap.add_argument("--chains", default=CHAINS_PATH,
                    help="ruqyah chains file to fold in (default library/data/ruqyah-chains.json)")
    ap.add_argument("--no-chains", action="store_true",
                    help="omit the top-level chains block")
    ap.add_argument("--out", default=LIBRARY_PATH, help="output path")
    args = ap.parse_args(argv)

    texts_rel = os.path.relpath(os.path.abspath(args.texts), ROOT).replace(os.sep, "/")
    chains_doc = None if args.no_chains else _read_json(args.chains)
    doc = build(_read_json(args.texts), _read_json(CATEGORIES_PATH),
                chains_doc, texts_rel)
    payload = render(doc)
    out_path = args.out

    if args.check:
        if not os.path.exists(out_path):
            print("MISSING: %s" % out_path)
            return 1
        with io.open(out_path, "r", encoding="utf-8") as fh:
            current = fh.read()
        if current != payload:
            print("STALE: %s differs from a fresh build" % out_path)
            return 1
        print("OK: library.json is up to date (idempotent).")
        return 0

    with io.open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(payload)

    c = doc["counts"]
    print("wrote %s" % out_path)
    print("  source rows      : %d" % c["source_rows"])
    print("  library items    : %d  (%d identified + %d pending)"
          % (c["library_items"], c["identified_texts"], c["pending_rows"]))
    print("  duplicate groups : %d  (%d redundant rows collapsed)"
          % (c["duplicate_groups"], c["redundant_rows"]))
    print("  entries preserved: %d" % c["entries_total"])
    print("  benefit keywords : %d" % c["benefit_index_keys"])
    print("  rows by status   : %r" % (c["rows_by_arabic_status"],))
    print("  rows with total  : %d   needing review: %d"
          % (c["rows_with_abjad_total"], c["rows_needing_review"]))
    if doc.get("chains"):
        cc = doc["chains"]["counts"]
        print("  chains           : %d  (%d steps, %d presets)"
              % (cc["chains"], cc["steps"], cc["presets"]))
        print("  steps by binding : %r" % (cc["steps_by_binding"],))
        print("  talisman-ready   : %d steps" % cc["steps_talisman_ready"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
