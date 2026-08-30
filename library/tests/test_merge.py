# -*- coding: utf-8 -*-
"""Tests for the Arabic merge (texts.json -> texts-v2.json -> library.json).

These are the guarantees the merge exists to provide:

  1. ROW IDENTITY IS FROZEN. Hafiz is reviewing a spreadsheet keyed on the
     existing ids right now. Not one id may be lost, renamed, renumbered,
     split or added.
  2. NO UNVERIFIED ARABIC CARRIES A NUMBER (scope-v1 decision 3). Every
     needs_review row has abjad_total null; every cleared row has both Arabic
     and a total.
  3. THE NUMBERS ARE REPRODUCIBLE. Recomputing the abjad from the stored
     Arabic with the unmodified engine reproduces every stored total.
  4. EVERY CHAIN STEP RESOLVES to a real row, a real proposed booklet text,
     a Quran reference, or is an explicitly text-free practice instruction.
"""

import io
import json
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "library", "tools"))

import abjad          # noqa: E402
import build_library  # noqa: E402
import identity       # noqa: E402
import merge_arabic   # noqa: E402

DATA_DIR = os.path.join(ROOT, "library", "data")

CANONICAL = "canonical"
PAGE_READ = "verified_page_read"
PENDING = "pending_verification"
CLEARED = (CANONICAL, PAGE_READ)

# The seven rows that deliberately remain unusable for a talisman.
EXPECTED_PENDING = {"D05", "D19", "D24", "Q10", "Q11", "Q12", "Q13"}
# The two of those that still have no Arabic stored at all.
EXPECTED_NO_ARABIC = {"Q10", "Q13"}


def _load(name):
    with io.open(os.path.join(DATA_DIR, name), "r", encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def texts_v1():
    return _load("texts.json")


@pytest.fixture(scope="module")
def texts_v2():
    return _load("texts-v2.json")


@pytest.fixture(scope="module")
def library():
    return _load("library.json")


@pytest.fixture(scope="module")
def chains_src():
    return _load("ruqyah-chains.json")


# ---------------------------------------------------------------------------
# 1. row identity is frozen
# ---------------------------------------------------------------------------

def test_no_row_id_lost_added_or_renamed(texts_v1, texts_v2):
    v1 = [r["id"] for r in texts_v1["texts"]]
    v2 = [r["id"] for r in texts_v2["texts"]]
    assert len(v1) == 183
    assert v2 == v1, "row ids must be identical AND in the same order as texts.json"


def test_row_ids_are_unique(texts_v2):
    ids = [r["id"] for r in texts_v2["texts"]]
    assert len(ids) == len(set(ids))


def test_row_id_families_are_intact(texts_v2):
    fams = {}
    for r in texts_v2["texts"]:
        fams[r["id"][0]] = fams.get(r["id"][0], 0) + 1
    assert fams == {"R": 40, "N": 99, "D": 31, "Q": 13}


def test_catalogue_identity_fields_are_untouched(texts_v1, texts_v2):
    """The merge may only touch the Arabic columns. Title, transliteration,
    quran_ref, meanings and category assignments are Hafiz's, not ours."""
    frozen = ("source", "title", "transliteration", "quran_ref", "meaning_en",
              "stated_purpose", "category_primary", "category_secondary",
              "category_status")
    a = {r["id"]: r for r in texts_v1["texts"]}
    b = {r["id"]: r for r in texts_v2["texts"]}
    for rid, old in a.items():
        for field in frozen:
            assert b[rid][field] == old[field], (rid, field)


def test_original_notes_are_preserved_not_overwritten(texts_v1, texts_v2):
    a = {r["id"]: r for r in texts_v1["texts"]}
    b = {r["id"]: r for r in texts_v2["texts"]}
    for rid, old in a.items():
        if old.get("notes"):
            assert old["notes"] in (b[rid]["notes"] or ""), rid


def test_the_53_canonical_quran_rows_were_not_overwritten(texts_v1, texts_v2):
    a = {r["id"]: r for r in texts_v1["texts"]}
    b = {r["id"]: r for r in texts_v2["texts"]}
    protected = [rid for rid, r in a.items() if r["arabic_status"] == CANONICAL]
    assert len(protected) == 53
    for rid in protected:
        for field in ("arabic", "arabic_source", "arabic_status", "abjad_total"):
            assert b[rid][field] == a[rid][field], (rid, field)


# ---------------------------------------------------------------------------
# 2. no unverified Arabic carries a number (scope-v1 decision 3)
# ---------------------------------------------------------------------------

def test_arabic_status_values_are_from_the_closed_set(texts_v2):
    for r in texts_v2["texts"]:
        assert r["arabic_status"] in (CANONICAL, PAGE_READ, PENDING), r["id"]


def test_cleared_rows_have_arabic_and_a_total(texts_v2):
    cleared = [r for r in texts_v2["texts"] if r["arabic_status"] in CLEARED]
    assert len(cleared) == 176
    for r in cleared:
        assert r["arabic"], r["id"]
        assert r["abjad_total"] is not None, r["id"]
        assert r["abjad_total"] > 0, r["id"]
        assert r["arabic_source"], r["id"]
        assert r["needs_review"] is False, r["id"]


def test_needs_review_rows_have_no_abjad_total(texts_v2):
    flagged = [r for r in texts_v2["texts"] if r["needs_review"]]
    assert {r["id"] for r in flagged} == EXPECTED_PENDING
    for r in flagged:
        assert r["abjad_total"] is None, r["id"]
        assert r["arabic_status"] == PENDING, r["id"]


def test_pending_and_needs_review_are_the_same_set(texts_v2):
    pending = {r["id"] for r in texts_v2["texts"] if r["arabic_status"] == PENDING}
    flagged = {r["id"] for r in texts_v2["texts"] if r["needs_review"]}
    assert pending == flagged == EXPECTED_PENDING


def test_rows_without_arabic_are_exactly_q10_and_q13(texts_v2):
    none = {r["id"] for r in texts_v2["texts"] if not r["arabic"]}
    assert none == EXPECTED_NO_ARABIC


def test_status_counts(texts_v2):
    counts = {}
    for r in texts_v2["texts"]:
        counts[r["arabic_status"]] = counts.get(r["arabic_status"], 0) + 1
    assert counts == {CANONICAL: 152, PAGE_READ: 24, PENDING: 7}
    assert texts_v2["counts"]["by_arabic_status"] == counts


def test_the_99_names_are_all_canonical_with_totals(texts_v2):
    names = [r for r in texts_v2["texts"] if r["id"].startswith("N")]
    assert len(names) == 99
    for r in names:
        assert r["arabic_status"] == CANONICAL, r["id"]
        assert r["abjad_total"] is not None, r["id"]


def test_verified_page_read_is_a_distinct_provenance(texts_v2):
    """The 24 page-read adhkar must NOT be laundered into 'canonical'."""
    page = [r for r in texts_v2["texts"] if r["arabic_status"] == PAGE_READ]
    assert len(page) == 24
    assert all(r["id"].startswith("D") for r in page)
    for r in page:
        assert "page image" in (r["arabic_source"] or ""), r["id"]
        assert "api." not in (r["arabic_source"] or ""), r["id"]


# ---------------------------------------------------------------------------
# 3. the numbers are reproducible from the stored Arabic
# ---------------------------------------------------------------------------

def test_every_stored_total_recomputes_from_its_stored_arabic(texts_v2):
    checked = 0
    for r in texts_v2["texts"]:
        if r["abjad_total"] is None:
            continue
        assert r["arabic"], r["id"]
        assert abjad.compute_abjad(r["arabic"])["grand"] == r["abjad_total"], r["id"]
        # and the identity key is a lossless carrier of that number
        assert abjad.compute_abjad(
            identity.letter_key(r["arabic"]))["grand"] == r["abjad_total"], r["id"]
        checked += 1
    assert checked == 176


def test_merge_is_idempotent_and_does_not_mutate_inputs():
    a = merge_arabic._read_json(merge_arabic.TEXTS_PATH)
    b = merge_arabic._read_json(merge_arabic.NAMES_PATH)
    c = merge_arabic._read_json(merge_arabic.ADHKAR_PATH)
    d = merge_arabic._read_json(merge_arabic.RUQYAH_PATH)
    snaps = [json.dumps(x, ensure_ascii=False, sort_keys=True) for x in (a, b, c, d)]

    first, stats = merge_arabic.merge(a, b, c, d)
    second, _ = merge_arabic.merge(a, b, c, d)
    assert merge_arabic.render(first) == merge_arabic.render(second)
    assert [json.dumps(x, ensure_ascii=False, sort_keys=True)
            for x in (a, b, c, d)] == snaps, "merge must not mutate its inputs"
    assert stats["unknown_ids"] == []
    assert stats["recompute_mismatches"] == []


def test_texts_v2_on_disk_matches_a_fresh_merge():
    doc, _ = merge_arabic.build_doc()
    with io.open(os.path.join(DATA_DIR, "texts-v2.json"), "r", encoding="utf-8") as fh:
        assert fh.read() == merge_arabic.render(doc), \
            "texts-v2.json is stale; re-run library/tools/merge_arabic.py"


# ---------------------------------------------------------------------------
# 4. chain steps resolve
# ---------------------------------------------------------------------------

def test_chains_block_exists_with_the_expected_shape(library):
    ch = library["chains"]
    assert ch["counts"]["chains"] == 7
    assert ch["counts"]["steps"] == 54
    assert ch["counts"]["presets"] == 9
    assert len(ch["chains"]) == 7
    assert len(ch["presets"]) == 9
    assert sum(len(c["steps"]) for c in ch["chains"]) == 54


def test_chain_steps_all_keep_talisman_suitable_and_repeat_count(library, chains_src):
    src = {(c["chain_id"], s["step"]): s
           for c in chains_src["chains"] for s in c["steps"]}
    seen = 0
    for c in library["chains"]["chains"]:
        for s in c["steps"]:
            assert "talisman_suitable" in s, (c["chain_id"], s["step"])
            assert "repeat_count" in s, (c["chain_id"], s["step"])
            original = src[(c["chain_id"], s["step"])]
            assert s["talisman_suitable"] == original["talisman_suitable"]
            assert s["repeat_count"] == original["repeat_count"]
            assert s["repeat_count_source"] == original["repeat_count_source"]
            seen += 1
    assert seen == 54


def test_every_chain_step_resolves_to_something_real(library, texts_v2):
    """A step must name a real catalogue row, a real proposed booklet text, or
    a Quran reference. The only steps allowed to bind to nothing are the
    behavioural instructions the booklet prints without any text."""
    row_ids = {r["id"] for r in texts_v2["texts"]}
    proposed_ids = {p["id"] for p in library["chains"]["proposed_new_items"]}
    kinds = {}
    for c in library["chains"]["chains"]:
        for s in c["steps"]:
            b = s["binding"]
            where = (c["chain_id"], s["step"])
            kinds[b["kind"]] = kinds.get(b["kind"], 0) + 1

            if b["kind"] == build_library.BINDING_CATALOGUE_ROW:
                assert s["source_id"] in row_ids, where
                assert b["row_ids"] == [s["source_id"]], where
            elif b["kind"] == build_library.BINDING_IDENTITY_ROW:
                assert s["source_id"] in proposed_ids, where
                assert b["row_ids"], where
                assert set(b["row_ids"]) <= row_ids, where
            elif b["kind"] == build_library.BINDING_PROPOSED_ITEM:
                assert s["source_id"] in proposed_ids, where
            elif b["kind"] == build_library.BINDING_QURAN_REF:
                assert s["source_id"] is None, where
                assert s["quran_ref"], where
            else:
                assert b["kind"] == build_library.BINDING_PRACTICE, where
                assert not s["source_id"] and not s["quran_ref"], where
    assert kinds == {
        build_library.BINDING_CATALOGUE_ROW: 16,
        build_library.BINDING_IDENTITY_ROW: 4,
        build_library.BINDING_PROPOSED_ITEM: 14,
        build_library.BINDING_QURAN_REF: 12,
        build_library.BINDING_PRACTICE: 8,
    }


def test_no_chain_step_invents_an_abjad_number(library, texts_v2):
    by_id = {r["id"]: r for r in texts_v2["texts"]}
    for c in library["chains"]["chains"]:
        for s in c["steps"]:
            b = s["binding"]
            if b["abjad_total"] is None:
                assert not b["talisman_ready"], (c["chain_id"], s["step"])
                continue
            # a number may only ever come from a cleared catalogue row
            assert b["row_ids"], (c["chain_id"], s["step"])
            row = by_id[b["row_ids"][0]]
            assert row["abjad_total"] == b["abjad_total"]
            assert row["arabic_status"] in CLEARED
            assert b["talisman_ready"] is True


def test_proposed_booklet_items_carry_no_abjad_number(library):
    for p in library["chains"]["proposed_new_items"]:
        assert p.get("abjad_total") is None, p["id"]
        assert p.get("needs_review") is True, p["id"]


def test_identity_bound_items_really_are_letter_identical(library, texts_v2):
    by_id = {r["id"]: r for r in texts_v2["texts"]}
    bound = [p for p in library["chains"]["proposed_new_items"]
             if p["identity_matches_row"]]
    assert {p["id"] for p in bound} == {"RB-P04-01", "RB-P05-01"}
    for p in bound:
        for rid in p["identity_matches_row"]:
            row = by_id[rid]
            assert identity.letter_key(p["arabic"]) == identity.letter_key(row["arabic"])
            assert (abjad.compute_abjad(p["arabic"])["grand"]
                    == row["abjad_total"]), (p["id"], rid)


def test_presets_only_load_real_chains(library):
    chain_ids = {c["chain_id"] for c in library["chains"]["chains"]}
    for p in library["chains"]["presets"]:
        assert p["load"], p["preset_id"]
        assert set(p["load"]) <= chain_ids, p["preset_id"]
        assert p["step_count"] > 0, p["preset_id"]


def test_chain_step_numbers_are_contiguous_within_each_chain(library):
    for c in library["chains"]["chains"]:
        assert [s["step"] for s in c["steps"]] == list(range(1, len(c["steps"]) + 1)), \
            c["chain_id"]


# ---------------------------------------------------------------------------
# library.json <-> texts-v2.json consistency
# ---------------------------------------------------------------------------

def test_library_preserves_every_row_id_exactly_once(library, texts_v1):
    seen = [e["source_id"] for t in library["texts"] for e in t["entries"]]
    assert len(seen) == 183
    assert len(seen) == len(set(seen))
    assert set(seen) == {r["id"] for r in texts_v1["texts"]}


def test_library_item_totals_recompute_from_their_arabic(library):
    checked = 0
    for t in library["texts"]:
        if t["abjad_total"] is None:
            continue
        assert abjad.compute_abjad(t["arabic"])["grand"] == t["abjad_total"], \
            t["library_key"]
        checked += 1
    # 175 unique texts; 5 of them (D05, D19, D24, Q11, Q12) store Arabic but
    # are deliberately held without a number.
    assert checked == 170


def test_library_needs_review_items_have_no_total(library):
    for t in library["texts"]:
        if t["needs_review"]:
            assert t["abjad_total"] is None, t["library_key"]


def test_library_counts_agree_with_the_document(library):
    c = library["counts"]
    assert c["source_rows"] == 183
    assert c["entries_total"] == 183
    assert c["identified_texts"] == 175
    assert c["pending_rows"] == 2
    assert c["rows_by_arabic_status"] == {CANONICAL: 152, PENDING: 7, PAGE_READ: 24}
    assert c["rows_with_abjad_total"] == 176
    assert c["rows_needing_review"] == 7


def test_unique_text_count_rose_from_47_to_175(library):
    """The whole point of the merge: 47 identifiable texts before, 175 after."""
    assert len({t["content_id"] for t in library["texts"] if t["content_id"]}) == 175
