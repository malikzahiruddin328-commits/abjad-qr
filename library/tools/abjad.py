# -*- coding: utf-8 -*-
"""Faithful Python port of the abjad logic in abjad-qr/index.html (inline JS).

Ported 2026-08-21 from the live reference implementation:
  - const ABJAD      (index.html ~line 169)
  - const NORMALIZE  (index.html ~line 176)
  - isIgnorable()    (index.html ~line 199)
  - analyze()        (index.html ~line 219)  -> compute_abjad() here

Eastern (Mashriqi) abjad values. Base 28 letters:
  ابجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ

Porting notes (behavior-exact, verified against the JS source):
  * The JS line `if(c===0xFE70 && c<=0xFE74) return true;` only ever matches
    U+FE70 (the `===` makes the second condition redundant); the author likely
    intended the range U+FE70-FE74. This port reproduces the ACTUAL behavior
    (only U+FE70 ignorable), not the presumed intent. Flagged in
    library/data/BUILD-REPORT.md.
  * JS `text.split(/\\s+/)` vs Python `str.split()`: identical for all Arabic
    text; the only divergence is U+FEFF (word separator in JS, kept-but-ignored
    char in Python). Grand totals are unaffected.
  * Iteration is per code point in both (JS for..of, Python str iteration).
"""

# --- Eastern (Mashriqi) Abjad values --- (exact copy of const ABJAD)
ABJAD = {
    "ا": 1, "ب": 2, "ج": 3, "د": 4, "ه": 5, "و": 6, "ز": 7, "ح": 8, "ط": 9, "ي": 10,
    "ك": 20, "ل": 30, "م": 40, "ن": 50, "س": 60, "ع": 70, "ف": 80, "ص": 90, "ق": 100,
    "ر": 200, "ش": 300, "ت": 400, "ث": 500, "خ": 600, "ذ": 700, "ض": 800, "ظ": 900, "غ": 1000,
}

# --- Map variant / Persian / Urdu letters to their base Arabic letter ---
# (exact copy of const NORMALIZE, same order and entries; the JS object
#  contains "ژ":"ز" twice — harmless duplicate, same mapping)
NORMALIZE = {
    # alif family
    "آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا", "ٲ": "ا", "ٳ": "ا", "ى": "ي", "ﺍ": "ا",
    # hamza carriers
    "ؤ": "و", "ئ": "ي", "ۀ": "ه",
    # heh / ta-marbuta family  -> ه (5)
    "ة": "ه", "ۃ": "ه", "ہ": "ه", "ھ": "ه", "ﮦ": "ه", "ﮧ": "ه", "ۂ": "ه",
    # kaf / gaf family -> ك (20)
    "ك": "ك", "ک": "ك", "گ": "ك", "ڪ": "ك", "ګ": "ك", "ڱ": "ك", "ﮎ": "ك",
    # yeh family -> ي (10)
    "ی": "ي", "ے": "ي", "ۍ": "ي", "ﻯ": "ي", "ﯼ": "ي",
    # noon ghunna -> ن (50)
    "ں": "ن", "ڻ": "ن",
    # waw variants -> و (6)
    "ۆ": "و", "ۇ": "و", "ۈ": "و", "ۋ": "و", "ٷ": "و",
    # Urdu / Persian retroflex & extra consonants -> nearest base
    "پ": "ب", "چ": "ج", "ژ": "ز", "ٹ": "ت", "ڈ": "د", "ڑ": "ر", "ڤ": "ف", "ڠ": "غ",
    "ٺ": "ت", "ٿ": "ت", "ڀ": "ب", "ٻ": "ب", "ڦ": "ف", "ڣ": "ف",
    "ڄ": "ج", "ڃ": "ج", "ڇ": "ج", "ڌ": "د", "ڍ": "د", "ڎ": "د", "ڏ": "د", "ڐ": "د",
    "ڒ": "ر", "ړ": "ر", "ڔ": "ر", "ڕ": "ر", "ږ": "ر", "ڗ": "ر", "ښ": "ش", "ڛ": "س",
}


def is_ignorable(ch):
    """Exact port of isIgnorable(ch): diacritics, tatweel, joiners, hamza."""
    c = ord(ch)
    # Arabic harakat / tanwin / shadda / sukun / superscript alef etc.
    if 0x0610 <= c <= 0x061A:
        return True
    if 0x064B <= c <= 0x065F:
        return True
    if c == 0x0670:                  # superscript alef
        return True
    if 0x06D6 <= c <= 0x06ED:        # Quranic annotation marks
        return True
    if c == 0x0640:                  # tatweel
        return True
    if 0x200B <= c <= 0x200F:        # zero-width / bidi marks
        return True
    if c == 0x0621:                  # standalone hamza (not counted)
        return True
    if c == 0xFE70:                  # JS: `c===0xFE70 && c<=0xFE74` — matches only U+FE70
        return True
    return False


def base_letter(ch):
    """Exact port of baseLetter(ch)."""
    return NORMALIZE.get(ch, ch)


def compute_abjad(text):
    """Exact port of analyze(text).

    Returns a dict:
      {
        "grand": int,                 # grand total
        "words": [                    # per-word breakdown
          {"raw": str, "sum": int,
           "letters": [{"ch": str, "base": str|None, "val": int|None,
                        "ignored": bool}]}
        ],
        "letters": [...],             # flat letter list (same entries)
        "ignored": [str],             # chars that carried no value
                                      # (non-abjad, shown faint in the UI)
      }
    """
    words = [w for w in text.split() if len(w)]
    result = {"words": [], "letters": [], "grand": 0, "ignored": []}
    for w in words:
        word_obj = {"raw": w, "letters": [], "sum": 0}
        for ch in w:
            if is_ignorable(ch):
                continue  # skip diacritics/hamza silently
            base = base_letter(ch)
            val = ABJAD.get(base)
            if val is None:
                # non-Abjad char (digit, punctuation, latin) -> ignored but shown faint
                entry = {"ch": ch, "base": None, "val": None, "ignored": True}
                word_obj["letters"].append(entry)
                result["letters"].append(entry)
                result["ignored"].append(ch)
                continue
            entry = {"ch": ch, "base": base, "val": val, "ignored": False}
            word_obj["letters"].append(entry)
            word_obj["sum"] += val
            result["letters"].append(entry)
        result["words"].append(word_obj)
        result["grand"] += word_obj["sum"]
    return result


if __name__ == "__main__":
    import sys
    txt = " ".join(sys.argv[1:]) or "بسم الله الرحمن الرحيم"
    r = compute_abjad(txt)
    print(r["grand"])
