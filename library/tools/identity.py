# -*- coding: utf-8 -*-
"""Text identity for the Baba Ji library.

WHAT IDENTITY MEANS HERE
------------------------
A text's identity is the exact ordered sequence of its **abjad-bearing base
letters** — nothing else. Everything that carries no abjad value is stripped
before the identity is taken:

  * harakat / tanwin / shadda / sukun / superscript alef (U+0610-061A,
    U+064B-065F, U+0670) and Quranic annotation marks (U+06D6-06ED)
  * tatweel (U+0640), zero-width and bidi marks (U+200B-200F)
  * the standalone hamza U+0621
  * spaces, punctuation, digits, Latin text and any other non-abjad character

WHY DIACRITICS ARE EXCLUDED
---------------------------
The abjad total is a pure function of the base letters. `abjad.is_ignorable()`
skips every diacritic before a value is looked up, and `abjad.base_letter()`
folds variant/Persian/Urdu forms onto their base Arabic letter, so two spellings
of the same verse that differ only in vocalisation, tatweel, orthographic
variant or whitespace produce **the same number**. If diacritics were part of
the identity, the same verse arriving from two books with different vocalisation
would look like two different texts while carrying one identical talisman
number — the model would be lying about the thing it exists to identify.

Proven on the real catalogue (2026-08-21): grouping the 53 Arabic-bearing rows
by this key gives 47 distinct texts, 4 duplicate groups, 6 redundant rows, and
ZERO cases where one key produced two different abjad totals.

INVARIANT
---------
`compute_abjad(letter_key(t))["grand"] == compute_abjad(t)["grand"]` for all t.
The letter key is a lossless carrier of the abjad value, and a lossy carrier of
everything else (which is exactly what identity requires).

Duplicates are NOT errors. The same verse legitimately appears in several books
with different stated benefits; the library collapses the text and keeps every
benefit and every citation.
"""

import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import abjad  # noqa: E402  (uses the live implementation as-is)

CONTENT_ID_PREFIX = "T-"
CONTENT_ID_HEX_LEN = 12


def letter_key(text):
    """Return the normalized abjad-letter sequence that identifies `text`.

    Keeps only characters that actually carry an abjad value, in order, each
    folded to its base Arabic letter. Returns "" for text with no abjad
    letters at all (e.g. None-equivalent empty input or Latin-only text).
    """
    if not text:
        return ""
    out = []
    # Expand Arabic presentation forms FIRST, exactly as compute_abjad() does.
    # Without this the identity layer contradicts the scoring layer: ﷲ and الله
    # both score 66 but would hash to different ids, so one text would look like
    # two. Found by the Mirror audit 2026-08-21, caused by adding expansion to
    # scoring without adding it to the identity built on top of it.
    for ch in abjad.expand_ligatures(text):
        if abjad.is_ignorable(ch):
            continue
        base = abjad.base_letter(ch)
        if base in abjad.ABJAD:
            out.append(base)
    return "".join(out)


def content_id(text):
    """Return a stable short content id: "T-" + first 12 hex of sha256(letter_key).

    Stable across runs, machines and Python versions (sha256 over UTF-8 bytes of
    the letter key). Returns None when the text carries no abjad letters — such
    an item is not yet identifiable by content.
    """
    key = letter_key(text)
    if not key:
        return None
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CONTENT_ID_PREFIX + digest[:CONTENT_ID_HEX_LEN]


def abjad_total(text):
    """Convenience: the grand abjad total of `text` (delegates to abjad.py)."""
    return abjad.compute_abjad(text)["grand"]


if __name__ == "__main__":
    txt = " ".join(sys.argv[1:]) or "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
    print(content_id(txt), abjad_total(txt), letter_key(txt))
