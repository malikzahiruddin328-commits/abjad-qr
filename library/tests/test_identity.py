# -*- coding: utf-8 -*-
"""Tests for the text-identity and benefit-index layer.

Covers:
  * letter_key / content_id stability and the diacritic-insensitivity rule
  * the identity invariant (letter key preserves the abjad total)
  * library.json structural guarantees (one abjad total per group, nothing lost)
  * the 4 known duplicate groups collapse and keep every distinct benefit
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

DATA_DIR = os.path.join(ROOT, "library", "data")


def _load(name):
    with io.open(os.path.join(DATA_DIR, name), "r", encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def texts_doc():
    """The FROZEN v1 catalogue — row identity baseline, never rewritten."""
    return _load("texts.json")


@pytest.fixture(scope="module")
def texts_v2():
    """The merged catalogue library.json is actually built from."""
    return _load("texts-v2.json")


@pytest.fixture(scope="module")
def library():
    return _load("library.json")


def _fresh_library():
    return build_library.render(build_library.build(
        _load("texts-v2.json"), _load("categories.json"),
        _load("ruqyah-chains.json"), "library/data/texts-v2.json"))


# --------------------------------------------------------------------------
# letter_key / content_id
# --------------------------------------------------------------------------

# Same verse, three ways: fully vocalised, bare, and bare with tatweel +
# extra whitespace. Identical base letters -> identical identity.
FATIHA_VOCALISED = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
FATIHA_BARE = "بسم الله الرحمن الرحيم"
FATIHA_TATWEEL_SPACED = "بســم   اللـه \n الرحمــن\tالرحيم"


def test_letter_key_is_deterministic():
    assert identity.letter_key(FATIHA_VOCALISED) == identity.letter_key(FATIHA_VOCALISED)
    assert identity.content_id(FATIHA_VOCALISED) == identity.content_id(FATIHA_VOCALISED)


def test_content_id_has_expected_shape():
    cid = identity.content_id(FATIHA_BARE)
    assert cid.startswith("T-")
    assert len(cid) == 2 + 12
    assert all(c in "0123456789abcdef" for c in cid[2:])


def test_letter_key_contains_only_abjad_letters():
    key = identity.letter_key(FATIHA_VOCALISED)
    assert key
    assert all(ch in abjad.ABJAD for ch in key)
    assert not any(abjad.is_ignorable(ch) for ch in key)
    assert " " not in key


def test_diacritics_tatweel_and_spaces_do_not_change_identity():
    ids = {
        identity.content_id(FATIHA_VOCALISED),
        identity.content_id(FATIHA_BARE),
        identity.content_id(FATIHA_TATWEEL_SPACED),
    }
    assert len(ids) == 1, "diacritics/tatweel/spacing must not split identity"


def test_punctuation_and_quranic_marks_do_not_change_identity():
    assert identity.content_id("الحمد لله") == identity.content_id("الحمد، لله! ۖ")


def test_different_letters_give_different_identity():
    assert identity.content_id("الحمد لله") != identity.content_id("الحمد لله رب")
    # order matters: identity is a *sequence*, not a multiset
    assert identity.content_id("بسم") != identity.content_id("مسب")


def test_identity_is_order_dependent_but_not_word_split_dependent():
    # regrouping the same letters into different words keeps the identity
    assert identity.content_id("الحمد لله") == identity.content_id("ال حمدل له")


def test_empty_and_non_abjad_text_has_no_identity():
    assert identity.letter_key("") == ""
    assert identity.content_id("") is None
    assert identity.content_id(None) is None
    assert identity.content_id("hello world 123") is None


def test_letter_key_preserves_the_abjad_total(texts_doc):
    """The core invariant: stripping to the letter key never changes the number."""
    checked = 0
    for row in texts_doc["texts"]:
        arabic = row.get("arabic")
        if not arabic:
            continue
        full = abjad.compute_abjad(arabic)["grand"]
        keyed = abjad.compute_abjad(identity.letter_key(arabic))["grand"]
        assert keyed == full, row["id"]
        assert full == row["abjad_total"], row["id"]
        checked += 1
    assert checked == 53


# --------------------------------------------------------------------------
# build_library: purity and idempotency
# --------------------------------------------------------------------------

def test_build_is_idempotent_and_does_not_mutate_input():
    texts = _load("texts-v2.json")
    cats = _load("categories.json")
    chains = _load("ruqyah-chains.json")
    snapshot = json.dumps(texts, ensure_ascii=False, sort_keys=True)
    chain_snapshot = json.dumps(chains, ensure_ascii=False, sort_keys=True)

    first = build_library.render(build_library.build(texts, cats, chains))
    second = build_library.render(build_library.build(texts, cats, chains))

    assert first == second, "build must be a pure function of its inputs"
    assert json.dumps(texts, ensure_ascii=False, sort_keys=True) == snapshot, \
        "build must not mutate texts-v2.json in memory"
    assert json.dumps(chains, ensure_ascii=False, sort_keys=True) == chain_snapshot, \
        "build must not mutate ruqyah-chains.json in memory"


def test_library_json_on_disk_matches_a_fresh_build():
    with io.open(os.path.join(DATA_DIR, "library.json"), "r", encoding="utf-8") as fh:
        assert fh.read() == _fresh_library(), \
            "library.json is stale; re-run build_library.py"


def test_build_still_works_without_chains():
    """--no-chains stays supported so the text layer can be built standalone."""
    doc = build_library.build(_load("texts-v2.json"), _load("categories.json"))
    assert "chains" not in doc
    assert doc["counts"]["source_rows"] == 183


# --------------------------------------------------------------------------
# library.json structure
# --------------------------------------------------------------------------

def test_schema_version_present(library):
    assert library["schema_version"] == build_library.SCHEMA_VERSION


def test_unique_text_and_pending_counts(library):
    """Post-merge: 181 of 183 rows carry Arabic, collapsing to 175 unique texts.
    Only Q10 (really 14 texts) and Q13 (really a chain) have no Arabic at all."""
    identified = [t for t in library["texts"] if t["content_id"]]
    pending = [t for t in library["texts"] if not t["content_id"]]
    assert len(identified) == 175
    assert len(pending) == 2
    assert {t["library_key"] for t in pending} == {"Q10", "Q13"}
    assert len(library["texts"]) == 177


def test_nothing_dropped_total_entries_equals_183(library):
    total = sum(len(t["entries"]) for t in library["texts"])
    assert total == 183
    assert library["counts"]["entries_total"] == 183


def test_every_source_id_survives_exactly_once(library, texts_doc):
    seen = [e["source_id"] for t in library["texts"] for e in t["entries"]]
    assert len(seen) == len(set(seen)), "a source_id was duplicated"
    assert set(seen) == {r["id"] for r in texts_doc["texts"]}


def test_each_group_has_exactly_one_distinct_abjad_total(library, texts_v2):
    by_id = {r["id"]: r for r in texts_v2["texts"]}
    for t in library["texts"]:
        totals = {by_id[e["source_id"]]["abjad_total"] for e in t["entries"]}
        assert len(totals) == 1, (t["library_key"], totals)
        assert totals.pop() == t["abjad_total"]


def test_content_ids_are_unique_and_recomputable(library):
    cids = [t["content_id"] for t in library["texts"] if t["content_id"]]
    assert len(cids) == len(set(cids))
    for t in library["texts"]:
        if t["content_id"]:
            assert identity.content_id(t["arabic"]) == t["content_id"]
            assert identity.letter_key(t["arabic"]) == t["letter_key"]


def test_pending_rows_keyed_by_source_id_with_null_content_id(library):
    pending = [t for t in library["texts"] if not t["content_id"]]
    assert pending
    for t in pending:
        assert t["content_id"] is None
        assert t["arabic"] is None
        assert t["abjad_total"] is None
        assert len(t["entries"]) == 1
        assert t["library_key"] == t["entries"][0]["source_id"]
        assert t["arabic_status"] == "pending_verification"


def test_entries_carry_the_hafiz_merge_key_and_all_benefit_fields(library):
    required = {"source_id", "source_book", "title", "transliteration",
                "meaning_en", "stated_purpose", "category_primary",
                "category_secondary"}
    for t in library["texts"]:
        for e in t["entries"]:
            assert required <= set(e), (t["library_key"], sorted(required - set(e)))


# --------------------------------------------------------------------------
# the four known duplicate groups
# --------------------------------------------------------------------------

KNOWN_DUPLICATES = [
    (("R05", "R06", "R07"), "2:286"),
    (("D07", "D09", "Q02"), "2:255"),
    (("R15", "R16"), "3:193"),
    (("R36", "R37"), "59:10"),
]


def _item_for(library, source_id):
    for t in library["texts"]:
        for e in t["entries"]:
            if e["source_id"] == source_id:
                return t
    raise AssertionError("source_id %s not present in library.json" % source_id)


def test_exactly_four_duplicate_groups(library):
    dups = [t for t in library["texts"] if len(t["entries"]) > 1]
    assert len(dups) == 4
    assert sum(len(t["entries"]) - 1 for t in dups) == 6
    assert library["counts"]["duplicate_groups"] == 4
    assert library["counts"]["redundant_rows"] == 6


@pytest.mark.parametrize("source_ids,ref", KNOWN_DUPLICATES)
def test_known_duplicate_group_collapses(library, source_ids, ref):
    items = [_item_for(library, sid) for sid in source_ids]
    first = items[0]
    for other in items[1:]:
        assert other is not None
        assert other["content_id"] == first["content_id"], \
            "%s did not collapse together" % (source_ids,)
    assert {e["source_id"] for e in first["entries"]} == set(source_ids)
    assert len(first["entries"]) == len(source_ids)
    assert first["quran_ref"] == ref


@pytest.mark.parametrize("source_ids,ref", KNOWN_DUPLICATES)
def test_known_duplicate_group_retains_every_distinct_purpose(library, source_ids, ref):
    item = _item_for(library, source_ids[0])
    purposes = [e["stated_purpose"] for e in item["entries"]]
    assert all(p for p in purposes), "a stated_purpose was lost in the merge"
    assert len(set(purposes)) == len(source_ids), \
        "distinct stated benefits must survive the merge, not be deduplicated"
    titles = [item["display_title"]] + item["alt_titles"]
    assert len(set(titles)) == len(source_ids)


def test_ayat_al_kursi_keeps_all_three_source_books(library):
    item = _item_for(library, "D07")
    books = {e["source_book"] for e in item["entries"]}
    assert len(books) == 2  # adhkar book (twice) + ruqyah booklet
    assert any("Ruqyah" in b for b in books)
    assert item["abjad_total"] == 13669


# --------------------------------------------------------------------------
# benefit index
# --------------------------------------------------------------------------

def test_benefit_index_is_lowercased_and_non_empty(library):
    idx = library["benefit_index"]
    assert len(idx) > 500
    assert library["counts"]["benefit_index_keys"] == len(idx)
    for kw in idx:
        assert kw == kw.lower()
        assert len(kw) >= 3


def test_benefit_index_points_at_real_library_keys(library):
    keys = {t["library_key"] for t in library["texts"]}
    for kw, refs in library["benefit_index"].items():
        assert refs, kw
        assert len(refs) == len(set(refs)), kw
        assert set(refs) <= keys, kw


def test_benefit_index_finds_expected_benefits(library):
    idx = library["benefit_index"]
    for kw in ("protection", "forgiveness", "jinn", "patience", "children"):
        assert kw in idx, kw

    # Ayat al-Kursi is reachable by benefits stated in *different* books
    kursi = _item_for(library, "D07")["library_key"]
    assert kursi in idx["jinn"], "ruqyah-book benefit must index the merged text"
    assert kursi in idx["protection"]

    # N01 now has Arabic, so it is indexed under its content_id, not "N01"
    n01 = _item_for(library, "N01")
    assert n01["library_key"] in idx.get("merciful", []), \
        "a merged Name must stay benefit-searchable under its content id"

    # the two rows that still have no Arabic stay searchable via their row id
    assert _item_for(library, "Q10")["library_key"] == "Q10"
    assert "Q10" in idx.get("supplications", []), \
        "rows with no Arabic yet must remain benefit-searchable by row id"
    assert "Q13" in idx.get("ruqyah", [])


def test_benefit_index_excludes_stopwords(library):
    for stop in ("the", "and", "with", "that"):
        assert stop not in library["benefit_index"]
