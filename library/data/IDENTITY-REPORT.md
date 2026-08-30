# Baba Ji — Text Identity & Benefit Index Report

Built 2026-08-21 by `library/tools/build_library.py` from `library/data/texts.json`
(schema 1, 183 rows) and `library/data/categories.json` (14 categories).
Neither input was modified.

## The identity rule

A text's **identity is the exact ordered sequence of its abjad-bearing base
letters**. Diacritics, tatweel, the standalone hamza, zero-width/bidi marks,
Quranic annotation marks, spaces and punctuation are all stripped before the
key is taken, because **none of them changes the abjad value** — `abjad.py`
skips every one of them before a value is looked up, and folds variant /
Persian / Urdu forms onto their base Arabic letter.

The identity carries a hard invariant, tested on all 53 Arabic-bearing rows:

```
compute_abjad(letter_key(t))["grand"] == compute_abjad(t)["grand"]
```

The letter key is a lossless carrier of the talisman number and a lossy carrier
of everything else — which is exactly what identity requires. `content_id` is
`"T-" + first 12 hex of sha256(letter_key)`, stable across runs and machines.

## Counts

| Measure | Value |
|---|---|
| Source catalogue rows | **183** |
| Rows with verified canonical Arabic | 53 |
| **Unique identified texts** | **47** |
| Duplicate groups | **4** |
| Redundant rows collapsed | **6** |
| Rows pending Arabic verification (kept, `content_id: null`) | **130** |
| Library items total (47 identified + 130 pending) | **177** |
| Entries preserved across all items | **183** (nothing dropped) |
| Groups whose rows disagreed on `abjad_total` | **0** |
| **Benefit index keys** | **1237** |

Every source row survives exactly once as an `entries[]` record. The entry's
`source_id` is the original R/N/D/Q catalogue id and is the merge key for
Hafiz's spreadsheet corrections — it is preserved verbatim and never
regenerated.

## Duplicate groups — texts merged, benefits preserved

Duplicates are **not errors**. The same verse legitimately appears in several
books with different stated benefits. The text collapses; every benefit and
every citation stays.

### `T-d4df2bfc42fb` — Ayat al-Kursi, 2:255, abjad **13669** (3 rows → 1 text)

| source_id | Book | Stated benefit (distinct) |
|---|---|---|
| D07 | The Key to a Successful Day | Greatest ayah of the Quran, recited after every prayer; nothing stops its reciter from Paradise except death. |
| D09 | The Key to a Successful Day | Read every morning and evening; also read upon children as one of the best means of protection. |
| Q02 | Ruqyah Booklet (UWT) | The strongest protection against the evil of jinn; it repels Satan. |

Two source books, three distinct benefits, one talisman number.

### `T-9fec3c045c91` — 2:286, abjad **12863** (3 rows → 1 text)

The 40-Rabbana book splits the single last ayah of al-Baqarah into three
separate duas.

| source_id | Stated benefit (distinct) |
|---|---|
| R05 | Du'a for tawbah (repentance); asking Allah's forgiveness. |
| R06 | Asking Allah to make the path of righteousness easy and tests bearable. |
| R07 | The last ayat of Surah Baqarah contain 3 powerful duas, recitable together or independently. |

### `T-70920b6746a9` — 3:193, abjad **6044** (2 rows → 1 text)

| source_id | Stated benefit (distinct) |
|---|---|
| R15 | Du'a of humility, submission and faith — "we have heard a caller and we believe". |
| R16 | Du'a for repentance, washing away misdeeds, and dying guided on the right path. |

### `T-01fa51d63977` — 59:10, abjad **8359** (2 rows → 1 text)

| source_id | Stated benefit (distinct) |
|---|---|
| R36 | The attitude we should have toward fellow believers who preceded us in faith. |
| R37 | Du'a of praise using two of Allah's names and attributes (Ar-Ra'uf, Ar-Raheem). |

## Benefit index

`benefit_index` maps a lowercased keyword to the library keys that satisfy it,
built from each entry's `stated_purpose` + `meaning_en` + the `name_en` of its
primary and secondary categories. Tokens shorter than 3 characters, pure digits
and English function words are excluded; curly apostrophes are folded so
`du'a` / `du’a` / `dua` collapse to one key.

- **1237 keys**, 747 of them pointing at a single text (long-tail, good for
  wildcard matching), the rest shared.
- Densest keys: `allah` (115), `gratitude` (72), `praise` (72), `lord` (43),
  `safety` (38), `protection` (36), `dua` (34), `relief` (32),
  `forgiveness` (31), `repentance` (31).
- Because benefits are merged from all of a text's entries, Ayat al-Kursi is
  reachable through `jinn` (from the Ruqyah booklet), `children` (from the
  adhkar book) and `prayer` — a wildcard search hits it from any of the three
  books that cite it.

**Key semantics for the UI:** index values are `library_key`, which equals
`content_id` for identified texts and the original `source_id` for the 130 rows
still pending Arabic verification. Those pending rows therefore remain fully
searchable by benefit even though they carry no abjad number yet — they are not
lost, just not yet identifiable by content.

## Output schema (`library/data/library.json`, schema_version 1)

Top level: `schema_version`, `generated`, `built_from`, `identity_rule`,
`benefit_index_note`, `counts`, `texts[]`, `benefit_index{}`.

Each item in `texts[]`:

```
library_key      content_id when known, else source_id
content_id       "T-xxxxxxxxxxxx", or null while Arabic is pending
arabic           canonical Arabic, or null
letter_key       the identity string (abjad letters only), or null
abjad_total      int, or null
quran_ref        set when the group's entries agree on one reference
quran_refs       every distinct reference behind the group
display_title    first entry's title, in catalogue order
alt_titles       the other entries' titles (nothing is hidden)
arabic_status    canonical | pending_verification
entries[]        one per originating catalogue row:
                 source_id, source_book, title, transliteration,
                 meaning_en, stated_purpose,
                 category_primary, category_secondary
```

## Build properties

- **Non-mutating**: inputs are opened read-only.
- **Idempotent**: output is a pure function of the inputs — `generated` is
  inherited from `texts.json`, not taken from the clock, so re-running produces
  a byte-identical file. `python library/tools/build_library.py --check` exits 0
  when `library.json` matches a fresh build, 1 when it is stale or missing.
- **Fails loud**: the build raises `AssertionError` if any identity group ever
  contains rows with differing `abjad_total` — the condition that would mean the
  identity rule is wrong. It does not currently occur.

## Test results

`python -m pytest library/tests/test_identity.py -q` → **33 passed, 0 failed**
(0.49s). Full suite `python -m pytest library/tests -q` → **115 passed**
(the 82 pre-existing `test_abjad.py` tests still pass; that file was untouched).

Coverage:

| Area | Assertions |
|---|---|
| Identity stability | same input → same key/id; `T-` + 12 hex shape; key contains only abjad letters |
| Diacritic insensitivity | vocalised vs bare vs tatweel+whitespace variants of one verse share a `content_id`; punctuation and Quranic marks likewise |
| Discrimination | different letters → different id; letter *order* changes the id; word re-splitting does not |
| Invariant | letter key preserves the abjad total on all 53 rows, and each matches the stored `abjad_total` |
| Build purity | two builds byte-identical; input dict unmutated; on-disk `library.json` matches a fresh build |
| Structure | 47 identified + 130 pending = 177 items; entries total exactly 183; every `source_id` appears exactly once; every group has exactly one distinct `abjad_total`; content ids unique and recomputable |
| Pending rows | `content_id` null, keyed by `source_id`, single entry, status `pending_verification` |
| Duplicates | exactly 4 groups / 6 redundant rows; each of R05-R07, D07/D09/Q02, R15/R16, R36/R37 collapses to one `content_id` with the right `quran_ref`, and retains one distinct `stated_purpose` and title per source row |
| Benefit index | keys lowercased and ≥3 chars; all values resolve to real library keys; no stopwords; expected benefits present; merged-book benefit (`jinn`) reaches Ayat al-Kursi; pending row `N01` still findable under `merciful` |

## Notes for the next step

- The 130 pending rows are all 99-Names entries (99) plus 31 others awaiting
  canonical Arabic. When their Arabic lands, re-running the build assigns them
  `content_id`s automatically; their `source_id` keys stay valid, and any
  benefit-index links to them switch from `source_id` to `content_id`. A UI that
  stores a `library_key` for a pending row should re-resolve it after a rebuild.
- Hafiz's open rulings in `docs/scope-v1.md` (Bismillah inclusion; full ayah vs
  dua fragment) would change the Arabic of specific rows and therefore their
  `content_id`. That is correct behaviour — a different letter sequence is a
  different text — but it means content ids are not stable across a ruling
  change. `source_id` remains the durable merge key.
