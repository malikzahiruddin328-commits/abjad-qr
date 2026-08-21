# Library data build report

Generated 2026-08-21 by the Baba Ji build session.

Inputs
- `library/categories-for-hafiz.xlsx` — sheets `Categories` (14 rows) and `Texts` (183 rows). Read-only; not modified.
- `library/tools/abjad.py` — the verified Python port of `index.html`'s abjad logic. Imported and used as-is; not modified.
- `api.alquran.cloud` v1, edition `quran-uthmani` — the only source of Arabic in this dataset.

Outputs
- `library/data/categories.json` — 14 categories, `schema_version` 1, 3,482 bytes.
- `library/data/texts.json` — 183 items, `schema_version` 1, 185,873 bytes.
- `library/tests/test_abjad.py` — 82 tests, all passing.

**No Arabic in this dataset was typed from memory or extracted from a PDF.** Every Arabic string was fetched from the API and stored byte-for-byte as delivered. This is scope decision 3 enforced mechanically: an item only carries an `abjad_total` if its Arabic came from the canonical source.

---

## 1. Counts by `arabic_status`

| Status | Items | Has `arabic` | Has `abjad_total` |
|---|---:|---|---|
| `canonical` | 53 | yes (all) | yes (all) |
| `pending_verification` | 130 | null (all) | null (all) |
| `not_applicable` | 0 | — | — |
| **Total** | **183** | | |

`not_applicable` is defined in the schema but unused: every one of the 183 items is a religious text that should eventually carry Arabic, so nothing qualifies.

## 2. Counts by source book

| Source book | Items | canonical | pending_verification |
|---|---:|---:|---:|
| 40 Rabbana Duas (My Islam) | 40 | 40 | 0 |
| 99 Names of Allah | 99 | 0 | 99 |
| The Key to a Successful Day (daily adhkar) | 31 | 4 | 27 |
| Ruqyah Booklet (UWT) | 13 | 9 | 4 |
| **Total** | **183** | **53** | **130** |

## 3. Counts by category

Categories are Hafiz's to confirm — every item carries `category_status: "proposed"` and every category carries `status: "proposed"`.

| ID | Category | Primary | Secondary | Primary items that are canonical |
|---|---|---:|---:|---:|
| C01 | Protection from evil eye, magic & jinn | 9 | 7 | 6 |
| C02 | Daily protection & safety | 19 | 6 | 6 |
| C03 | Health & healing | 4 | 3 | 1 |
| C04 | Forgiveness & repentance | 21 | 12 | 10 |
| C05 | Safety from Hellfire & entry to Paradise | 10 | 7 | 7 |
| C06 | Guidance & steadfastness in faith | 11 | 5 | 6 |
| C07 | Patience & victory in hardship | 6 | 5 | 3 |
| C08 | Relief from distress & trust in Allah | 12 | 7 | 2 |
| C09 | Family, marriage & children | 3 | 5 | 2 |
| C10 | Sustenance, provision & livelihood | 14 | 2 | 2 |
| C11 | Acceptance of deeds & supplications | 3 | 5 | 1 |
| C12 | Gratitude & praise of Allah | 56 | 16 | 3 |
| C13 | Justice & relief from oppression | 12 | 2 | 4 |
| C14 | Honour, status & success | 3 | 0 | 0 |
| | **Total** | **183** | **82** | **53** |

Coverage is lopsided on purpose, not by accident: C12 is 56 primary items but only 3 canonical, because C12 is where the 99 Names live and the 99 Names have no Quran verse reference to fetch against. C14 has zero canonical items for the same reason (all 3 are Names).

## 4. Every `pending_verification` item, and why

**99 Names of Allah — N01 … N99 (99 items).**
No Quran verse reference exists on these rows, so there is nothing to fetch canonically. Arabic must come from a verified canonical 99-Names list before any abjad value is assigned. Until then `arabic`, `arabic_source` and `abjad_total` are all null.

**Daily adhkar with no verse reference — D01, D02, D03, D04, D05, D08, D11 … D31 (27 items).**
Hadith-sourced supplications, not Quran. No verse reference to fetch against; Arabic must come from a verified hadith collection.
- **D05** additionally carries the extraction-quality flag from `catalog-extraction-notes.md`: its content was *inferred* from surrounding benefit text and booklet structure because the source page used a rotated/vertical layout that shredded extraction. Needs Hafiz's confirmation of the item itself, not just its Arabic.

**Ruqyah placeholder rows — Q10, Q11, Q12 (3 items).**
These rows name a *set* of Sunnah duas rather than one text. The actual Arabic exists only as unextractable text in the source PDF (`_PDMS_Saleem_QuranFont`, invisible to extraction). Needs canonical sourcing item by item.

**Q13 — Additional verses of Allah's greatness (1 item). Deliberately not fetched.**
Its `quran_ref` cell (`2:164; 3:18; 7:54; 23:118; 37:1-10; 59:24; 72:3`) is fetchable, but it is **incomplete**: the source also names Surah al-Mulk and Surah al-Rahman with no verse bounds. Fetching only the listed refs would produce a composite whose scope does not match the row, and putting an abjad number on an arbitrary subset is exactly the failure mode scope decision 3 exists to prevent. Left pending until Hafiz defines the exact scope or splits the row. This is the one item where canonical text *was* available and was still withheld — it is a judgment call, and it is reversible in one line if Hafiz rules the listed refs are the whole item.

## 5. API fetch summary

| Metric | Value |
|---|---|
| Distinct HTTP calls for a cold cache | 58 (55 single-ayah + 3 full-surah) |
| Distinct ayahs now cached | 70 |
| Retries | 0 |
| Failures | 0 |
| Items left pending because a fetch failed | 0 |
| Calls on a warm-cache re-run | 0 (verified twice) |

Endpoints used
- `GET /v1/ayah/{surah}:{ayah}/quran-uthmani` → `data.text` — for single ayahs and for each ayah of a range.
- `GET /v1/surah/{n}/quran-uthmani` → `data.ayahs[].text` joined — for whole-surah references (112, 113, 114).

Mechanics: 1s delay between calls, 4 attempts per call with escalating backoff, and an on-disk JSON cache keyed `"{surah}:{ayah}"` (plus `_len:{surah}` so a whole-surah reference can also be served from cache). The build ran five times end to end during development; the last two made **zero** network calls. The first run was cut short by a local 2-minute command timeout — not an API error — and resumed from cache with no re-fetching.

Reference grammar supported: `S:A` (single), `S:A-B` (range, ayahs joined with one space), `S` (whole surah), and `;`-separated combinations (e.g. `112; 113; 114`). Multi-part references are joined with a single space in reference order.

## 6. Data-quality flags carried into the dataset

These are recorded in each affected item's `notes` field, not just here.

**Rabbana duas are fragments; the stored Arabic is the full ayah (40 items, R01–R40).**
The 40 Rabbana duas are almost always a *fragment* of their verse, starting at رَبَّنَا. Slicing the fragment out would be unverified hand-editing, so the **full ayah** is stored and `abjad_total` is the total for the **full ayah**. Every R item's notes say `full ayah; dua is a fragment starting at Rabbana`. Anyone rendering a Rabbana talisman must decide whether the fragment or the full ayah is what goes on it — that decision is not made here.

**Edition artefact: the Bismillah is prefixed to ayah 1 (6 items — D06, D10, Q01, Q04, Q05, Q06).**
The `quran-uthmani` edition returns the opening Bismillah as part of ayah 1 of each surah. So the stored text for the whole-surah items begins with بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ and that Bismillah **is counted** in `abjad_total` (Bismillah alone = 786; Surah al-Ikhlas therefore reads 1788 rather than 1002). It was not stripped, because hand-slicing canonical text is the thing scope decision 3 forbids. If Hafiz wants these without the Bismillah, the items must be re-derived from the source, not edited in place. Q01 (al-Fatihah) is *not* affected in the same sense — there the Bismillah genuinely is ayah 1.

**U+FEFF in Q01.** The API's text for 1:1 begins with a U+FEFF zero-width no-break space. It is stored as delivered and carries no abjad value. (`abjad.py` documents the one JS/Python divergence here: JS treats U+FEFF as a word separator, Python keeps it as a valueless character. Grand totals are identical either way.)

## 7. Known pre-existing bug: the U+FE70 range check

`index.html`'s `isIgnorable()` contains:

```js
if(c===0xFE70 && c<=0xFE74) return true;
```

A range check (`c>=0xFE70 && c<=0xFE74`) was clearly intended. As written the `===` makes the second condition dead, so **U+FE71–U+FE74 (Arabic diacritic presentation forms) are not ignored**.

- **Not fixed, on purpose.** `library/tools/abjad.py` is a faithful port of the live tool; making the port disagree with `index.html` would be worse than the bug. The port reproduces the actual behaviour and flags it in its module docstring.
- **Impact is cosmetic only.** Those code points carry no abjad value, so no total is wrong. They merely render as faint "ignored" chips instead of being skipped silently.
- **It is pinned by a test.** `test_documents_known_fe70_range_bug` asserts U+FE70 *is* ignorable and U+FE71–74 are *not*, with a comment saying it documents a known bug. `test_fe70_range_bug_does_not_affect_totals` proves the numeric claim. When `index.html` is fixed, `abjad.py` and that test must be updated in the same change — the test is meant to trip then, deliberately, so the two implementations cannot drift apart silently.

## 8. Test results

`pytest library/tests/test_abjad.py -q` → **82 passed, 0 failed** (13.0s).

Engine tests
- بسم الله الرحمن الرحيم = **786**.
- All 28 base letters map to their documented Eastern (Mashriqi) values, the table has exactly 28 entries, and the whole alphabet sums to 5995.
- Urdu/Persian variants normalise: پ→2, چ→3, گ→20, ک→20, ٹ→400, ڈ→4, ڑ→200, ی→10, ے→10, ں→50, ہ→5 — and each reports a real Arabic base letter, not a pass-through.
- Diacritics, tatweel, Quranic annotation marks, superscript alef and standalone hamza are all worth zero and do not change a word's total; hamza *carriers* (أ ؤ ئ) still count as their base letter.
- Empty and whitespace-only input = 0.
- The U+FE70 bug is documented as described in section 7.

Dataset-integrity tests
- Both files declare a `schema_version`.
- 14 categories, exactly C01–C14, each with a name, a description and `status: "proposed"`.
- 183 items, all IDs unique, and the ID sequence matches the xlsx `Texts` sheet row for row.
- Every item carries the full 15-field schema — no missing or extra keys.
- Every `category_primary` and every non-null `category_secondary` resolves to a category in `categories.json`.
- Every `canonical` item has non-empty `arabic`, an `arabic_source`, and a positive `abjad_total`.
- Every non-canonical item has `arabic`, `arabic_source` and `abjad_total` all null — the scope-decision-3 guarantee, asserted rather than assumed.
- Every stored `abjad_total` recomputes exactly from its stored `arabic`.
- Every pending item carries a non-empty `notes` explaining why.
- D05 still carries its "inferred" flag; all 40 Rabbana items still carry the fragment flag.

## 9. Spot values

| Item | Reference | `abjad_total` |
|---|---|---:|
| Q02 / D07 / D09 — Ayah al-Kursi | 2:255 | **13669** |
| Q04 — Surah al-Ikhlas (incl. Bismillah, see §6) | 112 | 1788 |
| R01 — Rabbana dua #1 (full ayah) | 2:127 | 4067 |
| — | Bismillah alone | 786 |

Canonical totals across the 53 items range from 1788 to 26815.

## 10. Open items for Hafiz

1. Confirm or correct the 14 categories and the per-item assignments (everything is `proposed`).
2. Fill `name_ur` for all 14 categories (currently null).
3. Rule on Q13's scope — is it the seven listed references, or does it include al-Mulk and al-Rahman?
4. Decide whether Rabbana talismans use the fragment or the full ayah (§6).
5. Decide whether the three Quls and al-Falaq/al-Nas items should include the opening Bismillah in their abjad total (§6).
6. Confirm D05, whose content was inferred rather than extracted.
7. Supply or approve a canonical Arabic source for the 99 Names and the 27 hadith-sourced adhkar — 130 of 183 items are blocked on this and cannot produce a talisman until it lands.
