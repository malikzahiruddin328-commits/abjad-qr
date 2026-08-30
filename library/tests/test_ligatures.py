# -*- coding: utf-8 -*-
"""Arabic Presentation Forms — expansion, and the honorific exclusion.

History worth keeping, because the second fix exists only because the first was
too narrow:
  * 2026-08-21, first fix: a hand-written LIGATURES map covering 9 code points.
    It was correct but covered 9 of ~683 affected code points.
  * 2026-08-21, Mirror audit: found the remainder fails WORSE than a plain zero.
    NORMALIZE already contained a few presentation forms, so affected text got
    partial credit — the basmala pasted in presentation forms scored 66 instead
    of 786. A zero is obvious to a cleric; 66 is not.
  * Current fix: expand every presentation form via Unicode NFKC, EXCEPT the
    honorific formulas, which stay valueless pending the scholar's ruling.

These tests also guard doc-code sync: index.html, index-v2.html and abjad.py
must agree, so a change to one that is not ported to the others fails here.
"""
import sys, os, re, json, unicodedata
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import abjad
import pytest

REPO = os.path.join(os.path.dirname(__file__), "..", "..")
INDEX = os.path.join(REPO, "index.html")
INDEX_V2 = os.path.join(REPO, "index-v2.html")

PRESENTATION_RANGES = [(0xFB50, 0xFDFF), (0xFE70, 0xFEFF)]


def _presentation_code_points():
    for lo, hi in PRESENTATION_RANGES:
        for cp in range(lo, hi + 1):
            yield cp


# --- the original nine, still correct ---

def test_allah_ligature_scores_same_as_spelled_out():
    assert abjad.compute_abjad("ﷲ")["grand"] == abjad.compute_abjad("الله")["grand"] == 66


@pytest.mark.parametrize("lig", ["ﻻ", "ﻼ", "ﻵ", "ﻶ", "ﻷ", "ﻸ", "ﻹ", "ﻺ"])
def test_lam_alef_forms_score_31(lig):
    assert abjad.compute_abjad(lig)["grand"] == 31


def test_seed_phrase_identical_whether_typed_with_the_key_or_spelled_out():
    spelled = "بسم الله الرحمن الرحيم"
    assert abjad.compute_abjad(spelled)["grand"] == 786
    assert abjad.compute_abjad(spelled.replace("الله", "ﷲ"))["grand"] == 786


# --- the regression the Mirror audit found ---

def test_basmala_in_presentation_forms_scores_786_not_a_plausible_wrong_number():
    """The exact failure Mirror surfaced: this scored a partial-credit number
    instead of 786 before the full fix.

    The presentation-form string is BUILT programmatically from the plain one -
    hand-typing these code points is exactly how the first version of this test
    got the wrong letters.
    """
    plain = "بسم الله الرحمن الرحيم"
    pres_for = {}
    for cp in _presentation_code_points():
        ch = chr(cp)
        if ch in abjad.HONORIFICS_NO_VALUE:
            continue
        nk = unicodedata.normalize("NFKC", ch)
        if len(nk) == 1 and nk not in pres_for:
            pres_for[nk] = ch
    pres = "".join(pres_for.get(c, c) for c in plain)
    assert pres != plain, "no substitution happened - the test would prove nothing"
    assert abjad.compute_abjad(plain)["grand"] == 786
    assert abjad.compute_abjad(pres)["grand"] == 786


def test_no_presentation_form_that_spells_real_letters_scores_zero():
    """Every presentation form carrying real letters must now carry a value."""
    offenders = []
    for cp in _presentation_code_points():
        ch = chr(cp)
        if ch in abjad.HONORIFICS_NO_VALUE:
            continue
        nk = unicodedata.normalize("NFKC", ch)
        if nk == ch:
            continue
        if abjad.compute_abjad(nk)["grand"] > 0 and abjad.compute_abjad(ch)["grand"] == 0:
            offenders.append(f"U+{cp:04X}")
    assert not offenders, f"{len(offenders)} presentation forms still score 0: {offenders[:12]}"


def test_every_presentation_form_matches_its_expansion():
    """No partial credit anywhere in the two blocks."""
    wrong = []
    for cp in _presentation_code_points():
        ch = chr(cp)
        if ch in abjad.HONORIFICS_NO_VALUE:
            continue
        nk = unicodedata.normalize("NFKC", ch)
        if abjad.compute_abjad(ch)["grand"] != abjad.compute_abjad(nk)["grand"]:
            wrong.append(f"U+{cp:04X}")
    assert not wrong, f"{len(wrong)} score differently from their expansion: {wrong[:12]}"


# --- the honorific ruling, pinned so it cannot be lost to a refactor ---

def test_honorific_formulas_still_carry_no_value():
    """Pending the scholar's ruling (open question 4). NFKC would give these
    447 and 102; that must not happen by accident."""
    for h in ["ﷺ", "ﷻ"]:
        assert h in abjad.HONORIFICS_NO_VALUE
        assert abjad.compute_abjad(h)["grand"] == 0
        assert abjad.compute_abjad(unicodedata.normalize("NFKC", h))["grand"] > 0, \
            "expansion would give it a value - which is exactly why it is excluded"


def test_expansion_leaves_ordinary_arabic_untouched():
    for s in ["بسم الله الرحمن الرحيم", "لا إله إلا الله", "الْعَزِيزُ"]:
        assert abjad.expand_ligatures(s) == s


# --- doc-code sync across all three implementations ---

def _scrape_honorifics(path):
    src = open(path, encoding="utf-8").read()
    block = re.search(r"const HONORIFICS_NO_VALUE = new Set\(\[(.*?)\]\)", src, re.S)
    assert block, f"HONORIFICS_NO_VALUE not found in {os.path.basename(path)}"
    return set(re.findall(r'"([^"]+)"', block.group(1)))


def test_index_html_and_python_port_declare_the_same_honorifics():
    assert _scrape_honorifics(INDEX) == abjad.HONORIFICS_NO_VALUE


def test_index_v2_matches_too():
    if not os.path.exists(INDEX_V2):
        pytest.skip("index-v2.html not built")
    assert _scrape_honorifics(INDEX_V2) == abjad.HONORIFICS_NO_VALUE


@pytest.mark.parametrize("path", [INDEX, INDEX_V2])
def test_pages_use_the_same_presentation_ranges_as_the_port(path):
    if not os.path.exists(path):
        pytest.skip("page not built")
    src = open(path, encoding="utf-8").read()
    assert "0xFB50" in src and "0xFDFF" in src and "0xFE70" in src and "0xFEFF" in src, \
        "page does not declare the same presentation-form ranges as abjad.py"


# --- the identity layer must agree with the scoring layer ---

def test_identity_agrees_with_scoring_after_expansion():
    """Mirror finding M2: expansion was added to scoring but not to identity,
    so ﷲ and الله scored the same 66 yet hashed to different ids."""
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
    import identity
    assert identity.content_id("ﷲ") == identity.content_id("الله")
    assert identity.letter_key("ﻻ") == identity.letter_key("لا")


def test_stored_library_unaffected_by_the_fix():
    p = os.path.join(os.path.dirname(__file__), "..", "data", "texts-v2.json")
    if not os.path.exists(p):
        pytest.skip("texts-v2.json not built")
    for t in json.load(open(p, encoding="utf-8"))["texts"]:
        ar = t.get("arabic")
        if ar and t.get("abjad_total") is not None:
            assert abjad.compute_abjad(ar)["grand"] == t["abjad_total"], \
                f"{t['id']} total changed under the fix"
