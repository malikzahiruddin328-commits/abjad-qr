# Daily Adhkar — Arabic transcription report

Deliverable: `library/data/adhkar-arabic.json`
Source: `the-key-to-a-successful-day.pdf` (The Key to a Successful Day, Muslim
Research & Development Foundation, 2010) — 34 pages.
Date: 2026-08-21.

Governed by `docs/scope-v1.md` **decision 3** — no unverified Arabic may ever
receive an abjad number.

---

## Method

The booklet's Arabic uses a private font encoding and extracts as `(cid:NNN)`
garbage, so **no text in this file came from PDF text extraction**. Instead
every page was rendered to a bitmap with pypdfium2 (`pdf[i].render(scale=6)`,
1430 × 1957 px) and the Arabic was **read off the rendered image**. Individual
lines that needed closer inspection were re-rendered as `scale=14` crops
(3335 × 4565 px full page) and read again.

No Arabic in the deliverable was typed from memory or reconstructed from the
transliteration.

**Automatic verification** (standing in for a human confirmation step, per the
owner's explicit call). Every transcribed passage was checked letter by letter
against two independent controls:

1. the transliteration and English translation printed on the same booklet page
   (both of which extract cleanly from the PDF), and
2. the `transliteration` and `meaning_en` already stored for that D-id in
   `texts.json`.

The result is recorded per item as `translation_consistency`:
`consistent` (skeleton and meaning both match) or `unclear`. Any item marked
`unclear` gets `needs_review: true` and `abjad_total: null` — decision 3.

Abjad totals come from the existing engine, `library/tools/abjad.py`
`compute_abjad(text)["grand"]`, unmodified.

**Repetition rubrics excluded.** The booklet prints counting instructions in
parentheses beside several adhkar — `(ثَلَاثاً)` "three times",
`(ثَلَاثاً وَثَلَاثِينَ)` "thirty-three times". These are instructions to the reciter,
not part of the dhikr, and are not stored. Affected: D01, D05, D17, D21, D22,
D28. Noted per item in the JSON.

---

## Counts

| | |
|---|---|
| D-items in `texts.json` | 31 |
| Already canonical, deliberately untouched | 4 (D06, D07, D09, D10) |
| **In scope (`pending_verification`)** | **27** |
| **Transcribed from the page image** | **27 (100%)** |
| Could not be read | 0 |
| `translation_consistency: "consistent"` | 25 |
| `translation_consistency: "unclear"` | 2 (D05, D19) |
| `needs_review: true` | 3 (D05, D19, D24) |
| Carrying an abjad total | 25 |

---

## The three `needs_review` items, and why

### D05 — Tasbih after prayer — `unclear`, no abjad assigned
The catalogue row describes **33× Subḥānallāh + 33× Alḥamdulillāh + 34× Allāhu
Akbar**. The booklet (p.6, item 5) prints something different: a **single
combined phrase** سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ with the rubric
`(ثَلَاثاً وَثَلَاثِينَ)` and the line *"Repeat it 33 times, the total is 99 after
which the 100th phrase is:"* followed by
لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.

Both forms are well-attested, but they are not the same dhikr, so no number is
assigned until Hafiz rules which one D05 is. **Correction to the catalogue:**
D05's existing note says the content was "inferred" because the source page was
"garbled" and used a rotated/vertical layout. That was purely a text-extraction
artefact — page 6 renders as a perfectly ordinary upright page and is fully
legible.

### D19 — Pardon and wellbeing — `unclear`, no abjad assigned
The printed Arabic block opens with an extra clause
اللَّهُمَّ عَافِنِي فِي بَدَنِي, which appears in **neither** the booklet's own
transliteration for item 11 **nor** its English translation, and which is set in
the same substitute Arabic face used for item 9 (D17) — strong evidence of a
typesetting carry-over from the previous item. Everything after it matches the
transliteration word for word. Stored faithfully as printed, flagged, no number.

### D24 — Good of this day / this night — `consistent`, abjad assigned, still flagged
This single catalogue row bundles **two** texts: 16 a (morning) and 16 b
(evening). The stored `arabic` and `abjad_total` are 16 a's, which matches its
own transliteration and English exactly. The full 16 b text is recorded in the
item's `notes`. The flag is there because the owner must decide whether D24
should be split into two rows before a talisman is produced from it — one row
cannot carry two different abjad numbers.

---

## Pages that were awkward, and pages that were not

**No page was rotated.** All 34 pages report `get_rotation() == 0` and render
upright; the "rotated/vertical layout" recorded earlier in the catalogue was an
extraction artefact, not a property of the page.

Genuinely awkward spots, all resolved:

| Where | Issue | Resolution |
|---|---|---|
| p.22 (D17) | Set in a different Arabic face from the rest of the booklet; `أعوذ` and `بك` are printed with **no word space** (`أَعُوذُبِكَ`), twice | Read at scale 14. Stored with the normal space; the abjad engine sums per letter, so the grand total is provably identical either way |
| p.23 (D19) | First line of the item-11 block in that same substitute face — the source-conflict clause above | Read at scale 14, flagged rather than silently dropped |
| p.4, p.6, p.20, p.29 | Diacritic detail (dagger alif vs. fatḥa, `ملائكتك` hamza carrier, the `لله` ligature) too fine to settle at scale 6 | Re-rendered as scale-14 crops of the individual line |
| p.23→24, p.27→28, p.29→30, p.30→31 | Passage split across a page break (D19, D24, D25, D27) | Both pages read; `arabic_source` names the page where the passage starts, and the continuation is noted per item |

Two further points worth recording. The salutation صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ is
printed **inside** the dhikr in D22 and D25; it is kept, because it is part of
the printed passage, and it does change the abjad total. And D11, D15, D16, D24
and D25 are morning forms whose evening variants differ by one or two words;
the variants are recorded in the item notes but not given separate rows.

---

## Spot-check table — first five items

| ID | Arabic | Translation (from `texts.json`) | Abjad |
|---|---|---|---|
| D01 | أَسْتَغْفِرُ اللَّهَ | I ask for Allah's forgiveness. (Said three times after each prayer.) | **1807** |
| D02 | اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ | Allah, You are the Perfect Peace and peace comes from You. Blessed are You, O Owner of majesty and honour. | **3126** |
| D03 | لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ | None has the right to be worshipped but Allah alone. O Allah, none can withhold what You give, and none can give what You have withheld. | **4655** |
| D04 | لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ | None has the right to be worshipped but Allah alone... There is no power or might except by Allah... We are sincere in our devotion to Him even though the disbelievers may dislike it. | **6320** |
| D05 | سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ | Glorifying Allah 33 times, praising Him 33 times and magnifying Him 34 times after each prayer. | *none — see D05 above* |

Two of these were re-derived by hand as an independent check of the engine:
D01 = (أ1 + س60 + ت400 + غ1000 + ف80 + ر200) + (ا1 + ل30 + ل30 + ه5) = 1741 + 66 =
**1807**; D26 = سبحان 121 + الله 66 + وبحمده 65 = **252**. Both match the engine's
output exactly.

---

## Files touched

Created: `library/data/adhkar-arabic.json`, `library/data/ADHKAR-REPORT.md`.
Nothing else. `texts.json`, `categories.json`, `abjad.py`, `index.html`, the
xlsx, `scope-v1.md` and the charters are unchanged — `adhkar-arabic.json` is an
input for a separate, later merge step, not a modification of the catalogue.
