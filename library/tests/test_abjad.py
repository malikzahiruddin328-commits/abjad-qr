# -*- coding: utf-8 -*-
"""Tests for the abjad engine and for the generated library dataset.

Run from anywhere:  pytest library/tests/test_abjad.py

Two groups:
  * engine tests  -- lock down library/tools/abjad.py, the Python port of the
    abjad logic inlined in index.html.
  * dataset tests -- integrity of library/data/categories.json + texts.json
    against library/categories-for-hafiz.xlsx.
"""
import json
import sys
from pathlib import Path

import pytest

LIBRARY = Path(__file__).resolve().parents[1]
DATA = LIBRARY / "data"
XLSX = LIBRARY / "categories-for-hafiz.xlsx"

sys.path.insert(0, str(LIBRARY / "tools"))
import abjad  # noqa: E402


def total(text):
    return abjad.compute_abjad(text)["grand"]


# --------------------------------------------------------------------------
# (a) the canonical worked example
# --------------------------------------------------------------------------

def test_bismillah_is_786():
    assert total("بسم الله الرحمن الرحيم") == 786


# --------------------------------------------------------------------------
# (b) the 28 base letters and their documented Eastern (Mashriqi) values
# --------------------------------------------------------------------------

BASE_LETTERS = [
    ("ا", 1), ("ب", 2), ("ج", 3), ("د", 4), ("ه", 5), ("و", 6), ("ز", 7),
    ("ح", 8), ("ط", 9), ("ي", 10), ("ك", 20), ("ل", 30), ("م", 40), ("ن", 50),
    ("س", 60), ("ع", 70), ("ف", 80), ("ص", 90), ("ق", 100), ("ر", 200),
    ("ش", 300), ("ت", 400), ("ث", 500), ("خ", 600), ("ذ", 700), ("ض", 800),
    ("ظ", 900), ("غ", 1000),
]


def test_there_are_exactly_28_base_letters():
    assert len(BASE_LETTERS) == 28
    assert len(abjad.ABJAD) == 28


@pytest.mark.parametrize("letter,value", BASE_LETTERS)
def test_base_letter_value(letter, value):
    assert total(letter) == value


def test_abjad_table_matches_documented_values():
    assert abjad.ABJAD == dict(BASE_LETTERS)


def test_whole_alphabet_sums_to_5995():
    # 1+2+...+1000 over the 28 letters; guards against a silent table edit.
    assert total("".join(l for l, _ in BASE_LETTERS)) == 5995


# --------------------------------------------------------------------------
# (c) Urdu / Persian variants normalise onto their base letter
# --------------------------------------------------------------------------

URDU_VARIANTS = [
    ("پ", 2),    # peh      -> ب
    ("چ", 3),    # cheh     -> ج
    ("گ", 20),   # gaf      -> ك
    ("ک", 20),   # keheh    -> ك
    ("ٹ", 400),  # tteh     -> ت
    ("ڈ", 4),    # ddal     -> د
    ("ڑ", 200),  # rreh     -> ر
    ("ی", 10),   # farsi yeh-> ي
    ("ے", 10),   # yeh barree-> ي
    ("ں", 50),   # noon ghunna -> ن
    ("ہ", 5),    # heh goal -> ه
]


@pytest.mark.parametrize("letter,value", URDU_VARIANTS)
def test_urdu_variant_normalises(letter, value):
    assert total(letter) == value


@pytest.mark.parametrize("letter,value", URDU_VARIANTS)
def test_urdu_variant_reported_base_is_an_arabic_base_letter(letter, value):
    entry = abjad.compute_abjad(letter)["letters"][0]
    assert entry["ignored"] is False
    assert entry["base"] in abjad.ABJAD
    assert entry["val"] == value


def test_urdu_word_matches_its_arabic_normalisation():
    # "پاکستان" normalises to پ->ب ا ک->ك س ت ا ن
    assert total("پاکستان") == total("باكستان")


# --------------------------------------------------------------------------
# (d) diacritics, tatweel and standalone hamza carry no value
# --------------------------------------------------------------------------

HARAKAT = "ًٌٍَُِّْ"  # tanwin/fatha/…/shadda/sukun
TATWEEL = "ـ"
HAMZA = "ء"
SUPERSCRIPT_ALEF = "ٰ"


def test_diacritics_do_not_change_the_total():
    plain = "بسم الله الرحمن الرحيم"
    marked = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
    assert total(marked) == total(plain) == 786


def test_each_ignorable_class_is_worth_zero():
    for ch in HARAKAT + TATWEEL + HAMZA + SUPERSCRIPT_ALEF:
        assert total(ch) == 0, "U+%04X should carry no value" % ord(ch)


def test_tatweel_inside_a_word_is_ignored():
    assert total("محمـــد") == total("محمد")


def test_standalone_hamza_is_ignored_but_carriers_are_not():
    assert total(HAMZA) == 0
    assert total("أ") == 1      # hamza on alif -> ا
    assert total("ؤ") == 6      # hamza on waw -> و
    assert total("ئ") == 10     # hamza on yeh -> ي


def test_quranic_annotation_marks_are_ignored():
    # U+06D6..U+06ED, e.g. the small high seen and the sajdah sign
    assert total("محمدۖ۩") == total("محمد")


def test_non_arabic_characters_are_ignored_but_recorded():
    r = abjad.compute_abjad("محمد 123 abc!")
    assert r["grand"] == total("محمد")
    assert r["ignored"]                       # recorded so the UI can grey them
    assert all(e["val"] is None for e in r["letters"] if e["ignored"])


# --------------------------------------------------------------------------
# (e) empty / whitespace input
# --------------------------------------------------------------------------

@pytest.mark.parametrize("text", ["", " ", "\n\t  ", "     "])
def test_empty_input_is_zero(text):
    r = abjad.compute_abjad(text)
    assert r["grand"] == 0


def test_empty_string_has_no_words():
    assert abjad.compute_abjad("")["words"] == []


# --------------------------------------------------------------------------
# KNOWN PRE-EXISTING BUG -- this test DOCUMENTS current behaviour on purpose.
# --------------------------------------------------------------------------
# index.html's isIgnorable() used to contain:
#     if(c===0xFE70 && c<=0xFE74) return true;
# `===` where a range `>=` was clearly intended, so U+FE71..U+FE74 (Arabic
# diacritic presentation forms) were not ignored. The port reproduced it
# deliberately, and THIS TEST PINNED THE BUG so the two could not drift.
#
# It did its job: on 2026-08-21 the port was fixed first and this test tripped
# immediately, forcing both sides to be corrected together. It now pins the
# FIXED behaviour instead. The impact was always cosmetic - those code points
# carry no abjad value either way - which is why it was safe to leave standing
# while the far more serious presentation-form scoring defect was dealt with.

def test_fe70_range_now_ignored_in_both_implementations():
    for cp in range(0xFE70, 0xFE75):
        assert abjad.is_ignorable(chr(cp)) is True, (
            "U+%04X should be ignorable -- if index.html still has the `===` "
            "typo, fix both sides together, never one alone." % cp)


def test_fe70_range_never_affected_totals():
    """It was cosmetic before the fix and remains numerically inert after it."""
    presentation_forms = "".join(chr(cp) for cp in range(0xFE70, 0xFE75))
    assert total(presentation_forms) == 0
    assert total("محمد" + presentation_forms) == total("محمد")


def test_index_html_no_longer_carries_the_typo():
    """Guards the page itself, not just the port."""
    import os, re
    p = os.path.join(os.path.dirname(__file__), "..", "..", "index.html")
    src = open(p, encoding="utf-8").read()
    assert "c===0xFE70" not in src.replace(" ", ""), "the `===` typo is back in index.html"
    assert re.search(r"c\s*>=\s*0xFE70\s*&&\s*c\s*<=\s*0xFE74", src), \
        "index.html should test the FE70-FE74 range, not a single code point"


# --------------------------------------------------------------------------
# (f) dataset integrity
# --------------------------------------------------------------------------

@pytest.fixture(scope="module")
def categories():
    with open(DATA / "categories.json", encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def texts():
    with open(DATA / "texts.json", encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def xlsx_ids():
    openpyxl = pytest.importorskip("openpyxl")
    wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)
    ids = [str(r[0]).strip() for r in wb["Texts"].iter_rows(min_row=2, values_only=True)
           if r[0]]
    wb.close()
    return ids


def test_files_declare_a_schema_version(categories, texts):
    assert isinstance(categories["schema_version"], int)
    assert isinstance(texts["schema_version"], int)


def test_fourteen_categories_c01_to_c14(categories):
    ids = [c["id"] for c in categories["categories"]]
    assert ids == ["C%02d" % n for n in range(1, 15)]
    for c in categories["categories"]:
        assert c["name_en"]
        assert c["description"]
        assert c["status"] == "proposed"
        assert "name_ur" in c            # nullable for now, but must be present


def test_183_items_with_unique_ids(texts):
    items = texts["texts"]
    assert len(items) == 183
    ids = [i["id"] for i in items]
    assert len(set(ids)) == 183


def test_ids_match_the_source_workbook(texts, xlsx_ids):
    assert [i["id"] for i in texts["texts"]] == xlsx_ids


def test_every_item_has_the_full_field_set(texts):
    expected = {
        "id", "source", "title", "transliteration", "quran_ref", "meaning_en",
        "stated_purpose", "category_primary", "category_secondary",
        "category_status", "arabic", "arabic_source", "arabic_status",
        "abjad_total", "notes",
    }
    for item in texts["texts"]:
        assert set(item) == expected, item["id"]


def test_category_references_resolve(texts, categories):
    known = {c["id"] for c in categories["categories"]}
    for item in texts["texts"]:
        assert item["category_primary"] in known, item["id"]
        if item["category_secondary"] is not None:
            assert item["category_secondary"] in known, item["id"]
        assert item["category_status"] == "proposed"


def test_arabic_status_is_one_of_three_values(texts):
    allowed = {"canonical", "pending_verification", "not_applicable"}
    for item in texts["texts"]:
        assert item["arabic_status"] in allowed, item["id"]


def test_canonical_items_have_arabic_and_an_abjad_total(texts):
    canonical = [i for i in texts["texts"] if i["arabic_status"] == "canonical"]
    assert canonical, "expected at least one canonical item"
    for item in canonical:
        assert item["arabic"], item["id"]
        assert item["arabic"].strip(), item["id"]
        assert item["arabic_source"], item["id"]
        assert item["abjad_total"] is not None, item["id"]
        assert item["abjad_total"] > 0, item["id"]


def test_non_canonical_items_have_no_abjad_total(texts):
    """Scope decision 3: nothing unverified ever gets an abjad number."""
    for item in texts["texts"]:
        if item["arabic_status"] != "canonical":
            assert item["abjad_total"] is None, item["id"]
            assert item["arabic"] is None, item["id"]
            assert item["arabic_source"] is None, item["id"]


def test_stored_abjad_totals_recompute_exactly(texts):
    for item in texts["texts"]:
        if item["arabic_status"] == "canonical":
            assert total(item["arabic"]) == item["abjad_total"], item["id"]


def test_every_pending_item_says_why(texts):
    for item in texts["texts"]:
        if item["arabic_status"] == "pending_verification":
            assert item["notes"], item["id"]


def test_d05_carries_its_extraction_quality_flag(texts):
    d05 = next(i for i in texts["texts"] if i["id"] == "D05")
    assert d05["notes"] and "inferred" in d05["notes"].lower()


def test_rabbana_items_flag_that_the_dua_is_a_fragment(texts):
    rabbana = [i for i in texts["texts"] if i["id"].startswith("R")]
    assert len(rabbana) == 40
    for item in rabbana:
        if item["arabic_status"] == "canonical":
            assert "fragment" in item["notes"].lower(), item["id"]


def test_harakat_constant_really_is_harakat():
    """Guard the test data itself, not just the engine."""
    for ch in HARAKAT:
        assert 0x064B <= ord(ch) <= 0x0652, "U+%04X" % ord(ch)
    assert ord(TATWEEL) == 0x0640
    assert ord(HAMZA) == 0x0621
    assert ord(SUPERSCRIPT_ALEF) == 0x0670
