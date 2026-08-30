# Baba Ji — status

**As of 2026-08-21**, branch `feature/library-foundation`, commit `fb5ec44`.
Every figure below was re-derived from the working tree, not copied from a
report. Maintained by Baba Ji-Documentor (the backlog/status role is merged into
Documentor — colony standard, four roles per node).

---

## 1. What the tool currently does

**`index.html` — the live tool.** Type or paste Arabic/Urdu, get a per-letter
and per-word Eastern abjad breakdown, a grand total, and a QR code of the text
(download PNG, copy payload). Naskh/Nastaliq script switch, an on-screen Arabic
keyboard, Clear, and an RTL/LTR button. No build step; open the file.

**`demo-99-names.html` — the public review/demo page.** All 183 library texts
(99 Names plus 84 duas, adhkar and ruqyah entries) with their abjad values,
free-text search over benefit/title/reference, multi-select chaining with a
running total, and a live QR of the selection. Interface in six languages
(English, اردو, हिन्दी, বাংলা, Melayu, Indonesia); **text meanings stay in
English by design — religious meaning is not machine-translated.** The 7 rows
with no verified number render as "pending" and cannot be selected into a total.

**`library/` — the Phase 1 data foundation.** A 183-row catalogue with
canonical Arabic merged in, a benefit index, the ruqyah chains, and a Python
port of the page's abjad logic with 161 passing tests.

### The catalogue in numbers (`library/data/texts-v2.json`)

| | |
|---|---|
| Rows | 183 (99 Names `N01–N99`, 40 Rabbana duas `R01–R40`, 31 daily adhkar `D01–D31`, 13 ruqyah `Q01–Q13`) |
| `canonical` Arabic | 152 |
| `verified_page_read` Arabic | 24 |
| `pending_verification` | 7 |
| Rows carrying Arabic | 181 (`Q10` and `Q13` have none — neither is a single text) |
| Rows carrying an abjad total | 176 |
| Unique texts by letter identity | 175 across 183 rows (`library.json` collapses to 177 entries) |
| Proposed categories | 14 |

## 2. What landed today (2026-08-21)

Three build passes, all gated by Baba Ji-RM. See `CHANGELOG.md` for the
verified entries.

1. **Library foundation** (`cb14ffd`) — `docs/scope-v1.md`, the 183-item
   category workbook for Hafiz, `categories.json` + `texts.json`,
   `library/tools/abjad.py` (the Python port) and 82 tests.
2. **Canonical Arabic across all 183 rows** (`5a84636`) — `texts-v2.json`
   supersedes `texts.json`; per-source Arabic stores and their reports;
   `merge_arabic.py`, `build_library.py`, `identity.py`; `test_identity.py` and
   `test_merge.py`; `demo-99-names.html`. Row ids and order unchanged.
3. **Six-language demo + the ligature fix** (`bbb43e5`, `fb5ec44`) — six
   single-code-point Arabic ligatures were absent from the value table and
   scored **0**. The app's own on-screen keyboard had a ﷲ key worth nothing
   instead of 66, and ﻻ (common in pasted text) was worth 0 instead of 31.
   Ligatures are now expanded before scoring, in `index.html` and `abjad.py`
   together, with 15 tests including a guard that fails if the two maps drift.
   **This was the first modification to `index.html` since the project began.**

Test suite went 82 → 146 → **161 passing**.

## 3. Phase 1 progress (against the agreed four-phase plan)

| Phase 1 deliverable | State |
|---|---|
| Canonical text store | **Built.** 183 rows, 176 with cleared totals. |
| Category taxonomy round-trip with Hafiz | **Out for review.** Workbook delivered; not yet returned. |
| Browse/search by cause | **Demo-level only.** `demo-99-names.html` searches benefit text; `library.json` carries a real `benefit_index` that nothing consumes yet. |
| One-tap feed into the generator | **Not built.** The demo computes its own total and QR; `index.html` has no library entry point. |

Phases 2 (cleric accounts), 3 (events), 4 (monetisation): **no code.** Per
`scope-v1.md` standing flag 2, the platform jump needs architect-review before
any of it is locked in.

## 4. Blocked — and on whom

### 4.1 Blocked on Hafiz — scholar rulings

Six rulings were raised for Hafiz. **The repo cannot confirm they were sent** —
that fact lives outside these files; treat the list, not the delivery, as
verified here.

| # | Ruling needed | Recorded in | Blast radius |
|---|---|---|---|
| 1 | Does the opening Bismillah count as part of a surah for abjad purposes? | `scope-v1.md` Q1 | 6 whole-surah rows (D06, D10, Q01, Q04, Q05, Q06). Al-Ikhlas is **1788 with**, **1002 without**. |
| 2 | Rabbana duas: full ayah or the fragment? If the fragment, Hafiz marks the boundary — no automated slicing. | `scope-v1.md` Q2 | All 40 `R` rows. |
| 3 | Q13 names al-Mulk and ar-Rahman with no verse bounds — whole surah, or a subset? | `scope-v1.md` Q3, `ruqyah-chains.json` `RQ-OQ-3` | Q13 / chain `RQ-C06`. Nothing fetched; whole-surah is an inference, not a reading. |
| 4 | Do repetition counts ("7x", "3x") multiply the abjad total? | `scope-v1.md` Q4, `RQ-OQ-1` | Every counted item. Data supports either ruling — `abjad_total` and `repeat_count` are separate fields, so **no migration either way**. |
| 5 | Which form is the D05 tasbih — 33/33/34 as three phrases, or one combined phrase repeated 33×? | `scope-v1.md` Q5, P7 | D05. No number assigned. |
| 6 | Do honorific ligatures (ﷺ, ﷻ) carry an abjad value? | **only `library/tests/test_ligatures.py`** | Any text containing them. Currently they score **0** by deliberate choice. |

> **Documentor finding (doc-code drift):** `test_ligatures.py` line 46 says the
> honorific question is documented in `docs/scope-v1.md`. It is not —
> `scope-v1.md` records five open questions and honorifics is not among them.
> The code points at a document that does not carry the claim. Fixing this means
> editing `scope-v1.md`, which is out of Documentor's unilateral reach; raised
> to Baba Ji-General.

**Four further rulings are recorded in the data but are not in the "six".** If
the six are what Hafiz actually received, these will need a second round:

- `RQ-OQ-2` — the A'UDHU → U'IDHUKA substitution (reciting over another person)
  changes the Arabic and therefore the total. Stored items, or a runtime
  transform? A runtime transform of canonical Arabic is what decision 3 forbids,
  so it must become stored items **or nothing**. Blocks chain `RQ-C03`.
- `RQ-OQ-4` — does the opening ta'awwudh belong in the talisman at all, or is it
  an opening of the oral act only? Including it changes **every** base-chain
  total. Blocks proposal P6.
- `RQ-OQ-5` — is a chain's value one total or a per-step list? Mathematically
  equivalent (verified: sum of parts equals the concatenation's total), so this
  is presentation and religious framing, not arithmetic.
- **D19** — does the opening clause `اللَّهُمَّ عَافِنِي فِي بَدَنِي` belong to
  D19 at all? It appears in neither the booklet's own transliteration nor its
  English, and is set in the substitute face used by D17 — probably a
  typesetting carry-over. Recorded as proposal P8 and as a source defect.

### 4.2 Blocked on Hafiz — the category workbook round-trip

`library/categories-for-hafiz.xlsx` is **out for review**: 183 text items,
14 proposed categories, working dropdowns, a plain-language instructions sheet.
Built and independently verified 2026-08-21.

> **Hard constraint while it is out:** his corrections merge back **by row id**.
> Row ids `R01–R40`, `N01–N99`, `D01–D31`, `Q01–Q13` must **not** be renumbered,
> split, merged or deleted until the workbook returns. `texts-v2.json` holds
> exactly the same 183 ids in the same order as `texts.json` for this reason.

### 4.3 Blocked on Hafiz — 12 structural proposals, none applied

All recorded in `library/data/PROPOSED-CATALOGUE-CHANGES.md` with their
evidence. **Nothing in that file has been done to the data**, deliberately —
restructuring happens after the workbook returns.

| | Proposal | Severity |
|---|---|---|
| P1 | `Q10` is not one text, it is fourteen — retire it and add `RB-P05-01…13` (item 6 splits into 6A/6B) | high |
| P2 | `D24` holds two texts (morning **and** evening) in one row — split | high |
| P3 | Two ruqyah texts already exist in the catalogue as `D18`/`D31` — bind, do not duplicate. Cross-validated letter-for-letter by two independent readings | finding |
| P4 | `Q13` is a collection, not a text — express as chain `RQ-C06`; plus a wrong reference order and the unbounded surahs | medium |
| P5 | The "(7x)" on `Q01` belongs to a different text — drop it from the title (Q01's Arabic and total, 10143, are correct) | medium |
| P6 | The ta'awwudh `RB-P04-00` is missing from the catalogue — add, **subject to** `RQ-OQ-4` | high |
| P7 | `D05` — catalogue and booklet prescribe differently; Hafiz rules the form | high |
| P8 | `D19` — an opening clause only the Arabic has; Hafiz rules whether it belongs | high |
| P9 | `Q11` (dual form) and `RB-P05-05` (singular) differ by one word — keep them apart | caution |
| P10 | Four `RQ-C07` daily-protection cards overlap existing adhkar rows; three have high/medium candidates (`D08`, `D21`, `D27`), one is genuinely absent. **Not applied — no stored Arabic, so the letter-level identity check cannot be run, and transliteration is a suggestion, not verification** | medium |
| P11 | Chains `RQ-C03`, `RQ-C05`, `RQ-C06` cannot produce a talisman yet | — |
| P12 | 51 of the 99 Names are exact letter substrings of longer texts — future search must use exact identity, never substring matching, or it will tell clerics a Name and a surah are the same thing | informational |

### 4.4 The 7 rows still carrying no abjad total

All 7 are `pending_verification` / `needs_review`, and all 7 render as
un-selectable "pending" in the demo. **None of them is a bug — each is decision
3 doing its job.**

| Row | Title | Why no number |
|---|---|---|
| `D05` | Tasbih after prayer (33/33/34) | Two different prescriptions attested (P7); no ruling |
| `D19` | Pardon and wellbeing in everything | Disputed opening clause (P8); Arabic stored as printed |
| `D24` | Good of this day / this night | One row, two texts — one row cannot carry two totals (P2). `adhkar-arabic.json` holds 6685 for the morning text; **deliberately not promoted** |
| `Q10` | Ruqyah supplications from the Sunnah | Not one text — 13 numbered duas on one page (P1). No Arabic stored |
| `Q11` | Protection dua for children | Arabic read off a page image; a page reading is not a canonical-source fetch |
| `Q12` | Dua for one struck by the evil eye | Same — pending Hafiz confirmation |
| `Q13` | Additional verses of Allah's greatness | A collection of nine references, not a text (P4). No Arabic stored |

### 4.5 Not blocked on anyone

- **Chain `RQ-C06`'s seven unambiguous numeric references** (2:164, 3:18, 7:54,
  23:118, 37:1-10, 59:24, 72:3) could be fetched from the canonical Quran source
  today with **no ruling required**. Only al-Mulk and ar-Rahman are blocked
  (`RQ-OQ-3`). This is the most concrete decision-3-compliant next step
  available. **In progress at the time of writing** — a concurrent pass is
  producing `library/data/rqc06-arabic.json` and `RQC06-REPORT.md`; both were
  untracked and unreviewed when this file was written, so nothing here reflects
  their contents.
- Everything in Phase 1's "browse/search by cause" and "one-tap feed into the
  generator" columns is unbuilt and unblocked — `library.json`'s `benefit_index`
  already exists and nothing consumes it.

## 5. Open defects and risks (not blocked on Hafiz)

- **`index.html`'s RTL/LTR button is half-dead.** It flips the `dir` attribute
  and inline `text-align`, but the stylesheet rule `#text{direction:rtl}`
  (line 40) outranks the `dir` attribute, so the computed direction never
  changes — only the alignment moves. Present since the first commit
  (`5baf78a`); recorded in `CHANGELOG.md`, unfixed.
- **`abjad.py` reproduces an `index.html` bug on purpose.**
  `if(c===0xFE70 && c<=0xFE74)` only ever matches U+FE70; the range was almost
  certainly intended. Behaviour-identical was chosen over correct-but-divergent.
  `test_abjad.py` pins it and says to fix both sides together. Whoever fixes it
  must re-check whether any stored total changes.
- **`demo-99-names.html` embeds a hand-made snapshot of the catalogue and no
  tool regenerates it.** Verified in sync at `fb5ec44` — all 183 ids, Arabic
  strings and totals match `texts-v2.json` exactly — but nothing *enforces*
  that, and no test covers it. The next catalogue change silently desynchronises
  the page a cleric is looking at. Highest-value cheap fix available.
- **`library/categories-for-hafiz.xlsx` has no generator script in the repo.**
  The other four data artefacts are reproducible from their tools; the workbook
  is not. If it needs rebuilding after Hafiz returns it, that code does not
  exist yet.
- **The local `main` branch would publish the planning docs if pushed.** It is
  ahead of `origin/main` by commit `cb14ffd`, which carries `docs/scope-v1.md`,
  the workbook and `library/data/`. `origin/main` deliberately holds only
  `index.html` and `demo-99-names.html` because the repo publishes to GitHub
  Pages. The public branch is `public-site`. See `CLAUDE.md` §5.3.
- **Source-PDF defects** (report to Hafiz, do not silently fix): the 99 Names
  PDF's transliteration for name 69 reads "AL-QADEER" while both Arabic sources
  read الْقَادِرُ; the ruqyah booklet prints 72:3 fifth in Q13's list, not last;
  the booklet's items 1 and the ta'awwudh are missing from the catalogue, so
  Q01–Q09 map to booklet items 2–10. Full list in `scope-v1.md`.

## 6. Standing flags carried forward

1. **Payment rails** — processors and ad networks restrict "spiritual services";
   verify before betting a revenue model on them. Due before Phase 4.
2. **Platform jump** — accounts, database and uploads turn this from a static
   page into a real platform. Architecture must pass architect-review before any
   build is locked, and cost/volume must be estimated per the cost-blast-radius
   rule before anything AI-powered ships. Due before Phase 2.
