# MERGE REPORT — verified Arabic folded into the canonical library

**Date:** 2026-08-21
**Scope:** merge the four verified Arabic deliverables into one catalogue,
rebuild the library, fold the ruqyah chains in, prove it with tests.
**Binding constraint:** scope-v1 decision 3 — *no unverified Arabic may carry
an abjad number.*
**Second binding constraint:** the catalogue is in flight with Hafiz. Row ids
are frozen.

---

## 1. What was produced

| Artifact | What it is |
|---|---|
| `library/data/texts-v2.json` | The 183-row catalogue with Arabic merged in. Same 183 ids, same order. |
| `library/data/library.json` | Rebuilt: 177 items, benefit index, **and a new top-level `chains` key**. |
| `library/data/PROPOSED-CATALOGUE-CHANGES.md` | 12 structural findings recorded as proposals. **Applied to nothing.** |
| `library/tools/merge_arabic.py` | New. Re-runnable, idempotent, `--check`. Produces `texts-v2.json`. |
| `library/tools/build_library.py` | Adapted: `--texts` / `--chains` / `--no-chains` / `--out`, still idempotent, `--check` still works. |
| `library/tests/test_merge.py` | New. 30 tests covering the four required guarantees. |
| `library/tests/test_identity.py` | Extended and re-pointed at the merged data. |

`abjad.py`, `identity.py`, `texts.json`, the four agent output files,
`index.html`, `wireframe.html`, the xlsx, `scope-v1.md` and the charters were
**not modified**. `git status` confirms `texts.json` is unchanged.

---

## 2. Counts by `arabic_status` — before and after

| `arabic_status` | Before | After | Change |
|---|---:|---:|---|
| `canonical` | 53 | **152** | +99 (the 99 Names) |
| `verified_page_read` *(new status)* | — | **24** | +24 (daily adhkar) |
| `pending_verification` | 130 | **7** | −123 |
| **Total rows** | **183** | **183** | unchanged |

| | Before | After |
|---|---:|---:|
| Rows carrying Arabic | 53 | **181** |
| Rows carrying an abjad total | 53 | **176** |
| Rows flagged `needs_review` | (field did not exist) | **7** |

By family, after the merge:

| Family | `canonical` | `verified_page_read` | `pending_verification` |
|---|---:|---:|---:|
| R (40 Rabbana duas) | 40 | 0 | 0 |
| N (99 Names) | **99** | 0 | 0 |
| D (31 daily adhkar) | 4 | **24** | 3 |
| Q (13 ruqyah) | 9 | 0 | 4 |

### Why `verified_page_read` is not `canonical`

The 24 adhkar were read off rendered page images and cross-checked against the
booklet's own translation and transliteration. That is real verification and it
earns an abjad number — but it is **not** a canonical-database fetch, and the
difference is not cosmetic: a canonical fetch is reproducible byte-for-byte
from a named endpoint, a page reading is not. Collapsing the two into
`canonical` would have destroyed the only signal that tells a future reviewer
which rows to re-check. The status is carried on every row, on every
`library.json` entry, on every merged item, and on every chain step binding.

The test suite enforces the distinction: no `verified_page_read` row is allowed
to name an `api.` source, and every one of them must name a page image.

---

## 3. The new unique-text picture

| | Before | After |
|---|---:|---:|
| **Unique identified texts** | **47** | **175** |
| Library items total | 177 | 177 |
| Rows with no Arabic at all (`content_id: null`) | 130 | **2** |
| Duplicate groups | 4 | 4 |
| Redundant rows collapsed | 6 | 6 |
| Benefit-index keywords | 1237 | 1237 |
| Entries preserved (lossless check) | 183 | 183 |

**Unique text count rose 47 → 175**, as expected: 181 rows now carry Arabic and
they collapse to 175 distinct texts.

The only two rows with no Arabic at all are `Q10` and `Q13` — and neither is a
missing-data problem. `Q10` is really 14 texts and `Q13` is really a chain (see
proposals P1 and P4); giving either one an Arabic string would be inventing
something the source never printed.

The benefit-index keyword count is unchanged at 1237 because the keywords come
from English prose, which the merge did not touch. What changed is what those
keywords *point at*: 128 rows that were previously indexed under their raw row
id are now indexed under a content id, so searching a benefit and searching a
text now land on the same object.

---

## 4. New duplicate groups — the honest answer

### 4a. Exact duplicates among catalogue rows: **zero new groups**

The same 4 groups as before, collapsing the same 6 redundant rows:

| Group | Rows | Quran ref | Abjad |
|---|---|---|---|
| `T-9fec3c045c91` | R05, R06, R07 | 2:286 | 12863 |
| `T-70920b6746a9` | R15, R16 | 3:193 | 6044 |
| `T-01fa51d63977` | R36, R37 | 59:10 | 8359 |
| `T-d4df2bfc42fb` | D07, D09, Q02 | 2:255 | 13669 |

This is a genuine finding, not an absence of one. Adding 128 Arabic strings
across three source books produced **no** new row-to-row collision. All 99
Names are distinct from each other and from everything else; all 27 adhkar are
distinct from each other and from the canonical Quran rows. The catalogue has
much less internal redundancy than the pre-merge 47-of-53 ratio suggested.

### 4b. Cross-source duplicates: **2 new groups**, and they are the valuable ones

These are texts the *ruqyah booklet* prints that turn out to be letter-identical
to rows the *adhkar booklet* contributed. They could not be seen before this
merge, because those rows had no Arabic until now.

| Ruqyah booklet text | Catalogue row | Letter key | Abjad total |
|---|---|---|---|
| `RB-P04-01` — "Hasbiyallahu la ilaha illa huwa" (p.4 item 1, 7×) | **`D18`** "Hasbiyallah (7x)" | identical | **3098** |
| `RB-P05-01` — "A'udhu bi-kalimatillahit-tammat min sharri ma khalaq" (p.5 item 1) | **`D31`** "Refuge in Allah's perfect words (3x)" | identical | **3570** |

**Evidence:** two different PDFs, two different rendered-page readings, done by
two different agents that never saw each other's output, producing Arabic whose
abjad letter sequence is identical character-for-character after normalisation,
and therefore the same number computed independently twice. The check is in
`test_identity_bound_items_really_are_letter_identical`.

**Merged benefits:**

1. **`RUQYAH-REPORT.md`'s "missing from the catalogue" claim shrinks.** It
   listed 16 booklet texts absent from the catalogue. Two of them are not
   absent — they are in the catalogue under a different book. The real gap is
   **14 rows, not 16.**
2. **Four chain steps became talisman-ready for free.** `RQ-C01` steps 2 and 9,
   and `RQ-C07` steps 10 and 11, now bind to `D18`/`D31` and inherit those
   rows' already-cleared totals. No new number was minted, so decision 3 is not
   bent: the number comes from a row that was already cleared.
3. **Cross-validation of both page readings.** Two independent machine readings
   of two differently-typeset PDFs agreeing letter-for-letter is stronger
   evidence for those two texts than either reading alone.

### 4c. Containment (near-duplicates): 5 new among the adhkar, 51 involving Names

Exact identity is the right rule and it stays the rule. But it is worth
recording what *containment* now shows, because a future fuzzy-search feature
could get this badly wrong.

**New among the adhkar** (both sides gained Arabic in this merge):

| Shorter text | Contained in | Note |
|---|---|---|
| `D01` Astaghfirullāh (1807) | `D30` Astaghfirullāha wa atūbu ilayhi | same istighfar, longer form |
| `D26` SubhanAllahi wa bihamdihi (252) | `D28` "…as much as His creation" | short form inside long form |
| `D27` La ilaha illallah (1865) | `D03`, `D04`, `D11` | the tahlil opens all three |

**Already visible before the merge** (recorded for completeness, no change):
`D06` ⊂ `D10`; `Q04`/`Q05`/`Q06` ⊂ `D10`; `Q05`/`Q06` ⊂ `D06`; `R05`/`R06`/`R07`
⊂ `Q03`.

**51 Name-inside-text occurrences.** e.g. `N33` (Al-'Atheem) and `N63`
(Al-Qayyoom) inside Ayat al-Kursi; `N01`/`N02` inside every surah that opens
with the Bismillah; and two Names inside each other — `N36` (Al-'Alee) inside
`N19` (Al-'Aleem), `N03` (Al-Malik) inside `N84` (Maalik-Ul-Mulk).

**These are not duplicates and must never be collapsed.** Their abjad totals
differ and each is a distinct text with a distinct purpose. Recorded as
proposal P12 so that nobody later builds substring matching into search and
starts telling a cleric that a Name and a surah are the same text.

---

## 5. The chains, folded into `library.json`

`ruqyah-presets.json` was **not** created. The chains and presets live under a
single top-level `chains` key in `library.json`, so the UI loads one file.

```
library.json
├── texts[]            177 items  (175 identified + 2 pending)
├── benefit_index      1237 keywords
└── chains
    ├── chains[]              7 chains, 54 steps
    ├── presets[]             9 one-click affliction presets
    ├── proposed_new_items[] 16 booklet texts not yet catalogue rows
    ├── open_questions_for_hafiz[]  5
    └── counts / binding_kinds
```

Every step keeps `talisman_suitable` and `repeat_count` **exactly** as the
ruqyah agent read them — asserted field-by-field against the source file in
`test_chain_steps_all_keep_talisman_suitable_and_repeat_count`.

Each step also gains a derived `binding` saying what it actually resolves to:

| `binding.kind` | Steps | Meaning |
|---|---:|---|
| `catalogue_row` | 16 | names a live catalogue row id (Q01–Q09, Q11, Q12) |
| `identity_bound_row` | 4 | booklet text proved letter-identical to a live row (`D18`, `D31`) |
| `proposed_item` | 14 | booklet text the catalogue does not contain yet (`RB-*`) |
| `quran_ref_only` | 12 | unambiguous Quran reference, canonical text not fetched yet |
| `practice_instruction` | 8 | behavioural instruction printed with no text of its own |
| **Total** | **54** | |

**18 of 54 steps are talisman-ready today** (they resolve to a row with a
non-null abjad total). Per chain:

| Chain | Type | Steps | Talisman-ready |
|---|---|---:|---:|
| `RQ-C01` Core Ruqyah | base | 18 | 8 |
| `RQ-C02` Affected by Magic | add-on | 4 | 3 |
| `RQ-C03` Reciting Over Another | add-on | 5 | 0 |
| `RQ-C04` Protection for Children | standalone | 5 | 4 |
| `RQ-C05` Struck by the Evil Eye | add-on | 1 | 0 |
| `RQ-C06` Verses of Allah's Greatness | add-on | 9 | 0 |
| `RQ-C07` Daily Protection | standalone | 12 | 3 |

No step invents a number. A `binding.abjad_total` may only ever be copied from
a cleared catalogue row, and that is asserted in
`test_no_chain_step_invents_an_abjad_number`. All 16 `proposed_new_items`
carry `abjad_total: null` and `needs_review: true`, unchanged from source.

The 8 `practice_instruction` steps are correctly unbindable — "pray Fajr in
congregation" has no text. But **four of them are marked
`talisman_suitable: true`**, which means the booklet does print a dua there and
the chain has no text for it. Three look like rows the catalogue already has
(`D08`, `D21`, `D27`); one ("Bismillahi tawakkaltu", leaving the house) is
genuinely absent. Recorded as proposal P10, **not applied** — the ruqyah file
stores no Arabic for those cards, so the letter-level check that proved §4b
cannot be run, and a transliteration resemblance is not verification.

All 9 presets were validated to load only real chain ids (the build raises if
one does not).

---

## 6. Everything still pending, and why

### 6a. The 7 rows that cannot produce a talisman

| Row | Arabic stored? | Why it is held | Who unblocks it |
|---|---|---|---|
| `D05` Tasbih after prayer | yes | Catalogue says 33/33/34; booklet p.6 prints one combined phrase with a different counting scheme. Two different prescriptions. | Hafiz (P7) |
| `D19` Pardon and wellbeing | yes | Printed Arabic opens with a clause absent from the booklet's own transliteration *and* translation, set in the typeface of item 9 — likely a typesetting carry-over. | Hafiz (P8) |
| `D24` Good of this day/night | yes (16 a only) | The row bundles two texts, 16 a (morning) and 16 b (evening). Its source file offers a total of 6685 for 16 a; **deliberately not promoted** while the row's own identity is unsettled. | Hafiz (P2) |
| `Q10` Ruqyah supplications | **no** | Really 13 numbered duas across 5 hadith attributions and 3 repeat counts. No single string or total can be correct. | restructure after Hafiz (P1) |
| `Q11` Protection for children | yes | Read off a page image, not a canonical fetch; needs side-by-side confirmation before a number. Dual form — must not be merged with `RB-P05-05`. | Hafiz (P9) |
| `Q12` Evil-eye dua | yes | Read off a page image, not a canonical fetch; needs side-by-side confirmation. | Hafiz |
| `Q13` Verses of greatness | **no** | A non-exhaustive collection of 9 references, not a text. | restructure to `RQ-C06` (P4) |

### 6b. Structural work blocked on Hafiz's spreadsheet

All 12 proposals in `PROPOSED-CATALOGUE-CHANGES.md`. None applied. The
spreadsheet is keyed on the current row ids; renumbering while it is out would
break the merge key on the way back in.

### 6c. Open rulings

- `scope-v1.md` open questions 1–3: Bismillah in whole-surah totals (affects 6
  rows: D06, D10, Q01, Q04, Q05, Q06 — al-Ikhlas is 1788 with, 1002 without);
  Rabbana fragments vs full ayah (affects all 40 R rows); Q13's incomplete
  reference list.
- `RQ-OQ-1` … `RQ-OQ-5`, now carried in `library.json` under
  `chains.open_questions_for_hafiz`: whether repeat counts multiply into the
  total; the A'UDHU → U'IDHUKA substitution; unbounded al-Mulk/ar-Rahman; the
  ta'awwudh; whole-chain vs per-step totals.

### 6d. One unblocked next step that needs no ruling

Seven of `RQ-C06`'s nine steps are unambiguous numeric Quran references
(2:164, 3:18, 7:54, 23:118, 72:3, 37:1-10, 59:24). They can be fetched from the
same canonical source already used for the 53 Quran rows, at zero cost, without
any decision from Hafiz. Only al-Mulk and ar-Rahman are blocked (`RQ-OQ-3`).
That would take `RQ-C06` from 0 to 7 talisman-ready steps.

---

## 7. Test results

```
$ python -m pytest library/tests -q
146 passed in 1.25s
```

| File | Tests | Result |
|---|---:|---|
| `library/tests/test_abjad.py` | 82 | pass (unchanged) |
| `library/tests/test_identity.py` | 34 | pass (extended + re-pointed at merged data) |
| `library/tests/test_merge.py` | 30 | pass (new) |
| **Total** | **146** | **all pass** |

The five guarantees that were specifically required, and the tests that hold
them:

| Required guarantee | Test |
|---|---|
| No row id lost or renamed vs `texts.json` | `test_no_row_id_lost_added_or_renamed` (also asserts identical *order*), `test_row_id_families_are_intact`, `test_library_preserves_every_row_id_exactly_once` |
| Every `canonical` / `verified_page_read` row has non-null Arabic **and** non-null total | `test_cleared_rows_have_arabic_and_a_total` (176 rows) |
| Every `needs_review` row has a null total | `test_needs_review_rows_have_no_abjad_total`, `test_pending_and_needs_review_are_the_same_set`, `test_library_needs_review_items_have_no_total` |
| Every chain step references a real row id or `quran_ref` | `test_every_chain_step_resolves_to_something_real` (pins the exact 16/4/14/12/8 split) |
| Recomputing abjad from stored Arabic matches the stored total | `test_every_stored_total_recomputes_from_its_stored_arabic` (176 rows, both raw and via the letter key), `test_library_item_totals_recompute_from_their_arabic` (170 items) |

Extra guarantees added beyond the brief:

- `test_catalogue_identity_fields_are_untouched` — the merge may only write the
  Arabic columns. Title, transliteration, `quran_ref`, meanings and category
  assignments are Hafiz's and are asserted byte-equal to `texts.json`.
- `test_original_notes_are_preserved_not_overwritten` — merge notes are
  *appended*, never substituted, so no provenance is lost.
- `test_the_53_canonical_quran_rows_were_not_overwritten` — the protected 53
  are compared field-by-field. The merge tool also refuses such a write at
  runtime and exits non-zero.
- `test_verified_page_read_is_a_distinct_provenance` — a page-read row may not
  claim an `api.` source.
- `test_merge_is_idempotent_and_does_not_mutate_inputs` and
  `test_build_is_idempotent_and_does_not_mutate_input` — both tools are pure
  functions of their inputs.
- `test_no_chain_step_invents_an_abjad_number`,
  `test_proposed_booklet_items_carry_no_abjad_number` — decision 3, enforced at
  the chain layer too.

---

## 8. Reproducing this

```bash
python library/tools/merge_arabic.py           # texts.json + 3 sets -> texts-v2.json
python library/tools/build_library.py          # texts-v2.json + categories + chains -> library.json
python -m pytest library/tests -q
```

Both tools are idempotent and support `--check`:

```
$ python library/tools/merge_arabic.py --check
OK: texts-v2.json is up to date (idempotent).
$ python library/tools/build_library.py --check
OK: library.json is up to date (idempotent).
```

`build_library.py` no longer hard-codes its input: `--texts`, `--chains`,
`--no-chains` and `--out` are all available, and the path actually used is
recorded in `library.json` under `built_from.texts` so the output stays a pure
function of its inputs.

---

## Evidence appendix

| Claim | Evidence |
|---|---|
| 183 rows in, 183 rows out, same ids, same order | `test_no_row_id_lost_added_or_renamed`; `library.json` `counts.source_rows` = `counts.entries_total` = 183 |
| Status counts 152 / 24 / 7 | `texts-v2.json` `counts.by_arabic_status`; `test_status_counts` |
| 176 rows carry a total, all reproducible | `test_every_stored_total_recomputes_from_its_stored_arabic`, checked count asserted == 176 |
| 7 rows held, totals null | `test_needs_review_rows_have_no_abjad_total`; set pinned to {D05, D19, D24, Q10, Q11, Q12, Q13} |
| Unique texts 47 → 175 | `library.json` `counts.identified_texts`; `test_unique_text_count_rose_from_47_to_175` |
| No new exact duplicate groups | `counts.duplicate_groups` = 4, `redundant_rows` = 6, unchanged; `test_exactly_four_duplicate_groups` |
| `RB-P04-01` ≡ `D18` (3098), `RB-P05-01` ≡ `D31` (3570) | `test_identity_bound_items_really_are_letter_identical`; `library.json` `chains.counts.proposed_items_bound_by_identity` = 2 |
| 54 steps split 16/4/14/12/8 | `library.json` `chains.counts.steps_by_binding`; `test_every_chain_step_resolves_to_something_real` |
| 18 talisman-ready steps | `library.json` `chains.counts.steps_talisman_ready` |
| The 53 canonical rows were not overwritten | `test_the_53_canonical_quran_rows_were_not_overwritten`; `merge_arabic.py` refuses the write and exits 1 |
| `texts.json` unmodified on disk | `git status --porcelain` does not list it |
| 146 tests pass | `python -m pytest library/tests -q` |
