# 99 Names of Allah — Arabic verification report

Generated 2026-08-21. Deliverable: `library/data/99names-arabic.json`.
Governed by `docs/scope-v1.md` decision 3 — **no unverified Arabic may ever
receive an abjad number.**

## Result in one line

**All 99 of 99 names were obtained with both independent sources agreeing.
Zero items need review.**

## Which API endpoint actually worked

| Endpoint | Result |
|---|---|
| `http://api.alquran.cloud/v1/asmaalhusna` | **HTTP 404 Not Found** — tried first, does not exist |
| `http://api.aladhan.com/v1/asmaAlHusna` | **Worked** — HTTP 200, 99 records, free, no auth |

The working response is cached at
`C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Desktop-Myra\d5c4470e-00ff-4c41-ad3c-18143a70f8e4\scratchpad\src1_aladhan.json` so a re-run needs no network.
Each record carries `name` (Arabic), `transliteration`, `number`, `en.meaning`.

## The two sources

**Source 1 — canonical digital list.** `api.aladhan.com/v1/asmaAlHusna`. The
`name` field is stored **verbatim** in the deliverable. No Arabic was typed by
hand from memory at any point.

**Source 2 — the PDF page images.** `99-Name-of-ALLAH.pdf` rendered with
pypdfium2 at scale 4.0 (pages index 0–12), cropped to the `#` / `Name` /
`Transliteration` columns, and read visually. The PDF's text layer was
deliberately **not** used — it extracts in reversed display order, which is
exactly the failure mode decision 3 exists to prevent. Page→name map:
0 = 1–7, 1 = 8–14, 2 = 15–21, 3 = 22–30, 4 = 31–37, 5 = 38–43, 6 = 44–50,
7 = 51–59, 8 = 60–68, 9 = 69–76, 10 = 77–85, 11 = 86–95, 12 = 96–99.
The visual transcript is cached at `C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Desktop-Myra\d5c4470e-00ff-4c41-ad3c-18143a70f8e4\scratchpad\src2_image_reading.json`.

**Third corroborating check.** The transliteration already stored in
`texts.json` for each N-id (which extracts cleanly and is reliable) was
compared to the API's transliteration for every item, to confirm that
number → name alignment is correct and nothing is off by one row.

## How agreement was judged

Comparing raw strings would be the wrong test: the two sources legitimately
differ in vowel marks and in one orthographic variant, neither of which the
abjad engine can see. So each source's text was pushed through the project's
**own** engine primitives (`abjad.is_ignorable` + `abjad.NORMALIZE`,
unmodified) to produce the exact consonantal skeleton the engine scores, and
those skeletons were compared.

| Check | Count |
|---|---|
| Names obtained | 99 / 99 |
| Skeletons match across both sources | **99** |
| Skeletons differ | 0 |
| Image unreadable | 0 |
| `needs_review: true` | **0** |
| Character-for-character identical, no folding needed | 82 |
| Abjad total identical whichever source's spelling is used | **99 / 99** |

That last row is the load-bearing one: even for the 17 items whose raw
strings differ, computing the abjad from the PDF image's spelling instead of
the API's spelling yields the identical total. There is no item where the
choice of source could change a talisman's number.

### The 17 non-identical items, itemised

* **11 items** (N36, N53, N55, N57, N60, N62, N77, N78, N88, N89, N96) — the
  API writes a final yeh `ي`, the PDF image writes alif maqsura `ى`. The
  engine's own `NORMALIZE` map folds `ى → ي`, so both score 10 for that letter.
* **6 items** (N25, N39, N40, N73, N85, N91) — differ **only** in harakat
  placement (sukun / fatha / kasra / damma), which `is_ignorable` discards.

## Spot-check: abjad totals for the first ten names

| id | Arabic | Transliteration | Abjad total | Cross-check |
|---|---|---|---|---|
| N01 | الرَّحْمَنُ | AR-RAHMAAN | 329 | match |
| N02 | الرَّحِيمُ | AR-RAHEEM | 289 | match |
| N03 | الْمَلِكُ | AL-MALIK | 121 | match |
| N04 | الْقُدُّوسُ | AL-QUDDUS | 201 | match |
| N05 | السَّلاَمُ | AS-SALAM | 162 | match |
| N06 | الْمُؤْمِنُ | AL-MU’MIN | 167 | match |
| N07 | الْمُهَيْمِنُ | AL-MUHAYMIN | 176 | match |
| N08 | الْعَزِيزُ | AL-AZEEZ | 125 | match |
| N09 | الْجَبَّارُ | AL-JABBAR | 237 | match |
| N10 | الْمُتَكَبِّرُ | AL-MUTAKABBIR | 693 | match |

## Transliteration cross-check findings

72 of 99 stored transliterations match the API's exactly after
case/punctuation normalisation. The other 27 differ only in romanisation
style (long-vowel doubling, `'` vs `’`, `dh`/`z`/`th` for ظ ذ ض) and are not
disagreements about which name it is. Two are worth recording:

* **N69** — both Arabic sources read `الْقَادِرُ` (Al-Qaadir), but the PDF's own
  transliteration column, and therefore `texts.json`, says `AL-QADEER`. This
  is an inconsistency *inside the PDF*, not a disagreement between the two
  Arabic sources — the Arabic itself is unambiguous and agreed. Recorded as a
  note on the item; it does not gate the abjad number.
* **N89** — the API's transliteration reads `Al Mughi`, an apparent typo for
  Al-Mughni. Its Arabic `الْمُغْنِي` agrees with the image.

## What was NOT touched

`texts.json`, `categories.json`, `abjad.py`, `index.html`, the xlsx,
`scope-v1.md` and the charters are all unmodified. This report and
`99names-arabic.json` are the only two new files. The `arabic_status` fields
in `texts.json` remain `pending_verification` — promoting them is a separate,
deliberate step for whoever owns that file.

## Evidence appendix

| Claim | Evidence |
|---|---|
| alquran.cloud endpoint is dead | `urllib` returned `HTTPError 404: Not Found` on `http://api.alquran.cloud/v1/asmaalhusna` |
| aladhan endpoint returned 99 records | `len(data) == 99` from cached `src1_aladhan.json` |
| PDF text layer unusable | scope-v1.md evidence basis; text layer not used at all here |
| All 99 skeletons match | `compare.py` output: `skeleton match 99` |
| All 99 abjad totals source-independent | `compare.py` output: `abjad equal 99` |
| 82 identical without folding | `compare.py` output: `raw identical 82` |
| Abjad engine unmodified | imported via `sys.path.insert`; file mtime unchanged |
| Number→name alignment correct | third check against `texts.json` transliterations, 72 exact + 27 romanisation variants, zero name-level mismatches |
