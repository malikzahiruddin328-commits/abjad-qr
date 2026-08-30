# Proposed catalogue changes — NOT APPLIED

**Status: proposals only. Nothing in this file has been done to the data.**

Hafiz is reviewing `library/categories-for-hafiz.xlsx` right now, and that
spreadsheet is keyed on the existing row ids (R01–R40, N01–N99, D01–D31,
Q01–Q13). Renumbering, splitting, merging or deleting a row while the
spreadsheet is out would silently break the merge key on the way back in.

So: every structural defect found during the Arabic merge is recorded here,
with its evidence, and applied to nothing. `texts-v2.json` has exactly the
same 183 row ids, in the same order, as `texts.json`.

**Restructuring happens after Hafiz's spreadsheet returns. Not before.**

Recorded 2026-08-21 by the merge pass. Sources: `RUQYAH-REPORT.md`,
`ADHKAR-REPORT.md`, `99NAMES-REPORT.md`, and new findings that only became
visible once all four Arabic sets were in one file.

---

## P1 — Q10 is not one text. It is fourteen. (severity: high)

**Row:** `Q10` — "Ruqyah supplications from the Sunnah"

**Proposal:** retire `Q10` as a text row (make it a container/heading row, or
drop it) and replace it with 14 rows: `RB-P05-01` … `RB-P05-13`, where booklet
item 6 splits into `6A` and `6B`.

**Why:** `Q10` collapses the whole of booklet p.5 into a single catalogue row.
p.5 prints **thirteen separately numbered duas**, under **five different hadith
attributions**, with **three different repetition counts**. No single Arabic
string and no single abjad total can ever be correct for `Q10` — any number put
on it would be wrong by construction, which is precisely what scope-v1
decision 3 exists to prevent.

**Evidence:** `ruqyah-chains.json` → `item_updates[Q10]`,
`catalogue_defects_found[0]`, and the 14 texts themselves in
`proposed_new_items` (each read off a rendered page image, each with its own
Arabic, none carrying an abjad number). Also carried into `library.json` under
`chains.proposed_new_items`, so nothing dangles while the proposal waits.

**Blast radius if not fixed:** the catalogue is under-granular by 12 items, and
`Q10` can never leave `pending_verification`.

---

## P2 — D24 holds two texts (morning and evening) (severity: high)

**Row:** `D24` — "Good of this day / this night (16a & 16b)"

**Proposal:** split into two rows — one for booklet item 16 a (morning), one
for 16 b (evening).

**Why:** the booklet prints two distinct texts under one item number. They are
not variants; they differ throughout (`أَصْبَحْنَا`/`أَمْسَيْنَا`,
`الْيَوْمِ`/`اللَّيْلَةِ`, and every attached pronoun), so they have two
different abjad totals.

**Evidence:** `adhkar-arabic.json` → `items[D24].notes`. The morning text was
read off p.27 (continuing at the top of p.28) and matches its own
transliteration and English exactly; the evening text was read off p.28 and is
stored verbatim inside that note.

**What the merge did instead:** stored the morning Arabic on `D24`, set
`abjad_total` to **null** and `arabic_status` to `pending_verification`. The
source file `adhkar-arabic.json` carries a total of 6685 for the morning text;
that number was deliberately **not** promoted, because a row flagged
`needs_review` must not carry a number that a cleric could put on a talisman
while the row's own identity is unsettled.

---

## P3 — Two ruqyah texts are already in the catalogue, under the adhkar book

**Rows:** `D18`, `D31` (no change proposed to them) — and the claim in
`RUQYAH-REPORT.md` that these texts are "absent from the catalogue entirely".

**This is a NEW finding.** It could not be seen before this merge, because
`D18` and `D31` had no Arabic until the adhkar set landed.

| Booklet text | Catalogue row | Letter key | Abjad |
|---|---|---|---|
| `RB-P04-01` "Hasbiyallahu la ilaha illa huwa" (p.4 item 1, 7x) | **`D18`** "Hasbiyallah (7x)" | identical | **3098** |
| `RB-P05-01` "A'udhu bi-kalimatillahit-tammat" (p.5 item 1) | **`D31`** "Refuge in Allah's perfect words (3x, evening)" | identical | **3570** |

Two different books, two different PDFs, two independent page readings by two
different agents — landing on **letter-for-letter identical Arabic and the same
abjad number**. That is a cross-validation of both readings, not just a
deduplication.

**Proposal:** when `Q10` is restructured, do **not** create fresh rows for
`RB-P04-01` and `RB-P05-01`. Point the ruqyah chain at `D18` and `D31` and let
those rows carry a second stated benefit (ruqyah), the way `D07`/`D09`/`Q02`
already share Ayat al-Kursi. `RB-P04-01` and `RB-P05-01` should be struck from
the "missing from the catalogue" list; the real gap is 14 rows, not 16.

**Already done in the derived data (safe, reversible, no row touched):**
`library.json` binds those chain steps to `D18`/`D31` automatically by content
identity (`binding.kind == "identity_bound_row"`), so those 4 chain steps are
talisman-ready today using the existing rows' cleared totals. No new number was
minted.

---

## P4 — Q13 is a collection, not a text (severity: medium)

**Row:** `Q13` — "Additional verses of Allah's greatness"

**Proposal:** retire `Q13` as a text row and express it as chain `RQ-C06`
(9 steps), which is how it is already carried in `library.json`.

**Why:** the booklet prints *"other verses … such as 2:164, 3:18, 7:54, 23:118,
72:3, 37:1-10, 59:24, Surah al-Mulk and al-Rahman."* That is a non-exhaustive
list of nine references, not one text. A single Arabic string for `Q13` would
have to invent a concatenation the booklet never prints.

**Two sub-defects, both low severity, both unfixed on purpose:**

- **Order.** `texts.json` stores `2:164; 3:18; 7:54; 23:118; 37:1-10; 59:24;
  72:3`. The booklet prints `72:3` **fifth**, not last. Either restore the
  printed order or drop the ordering claim.
- **Unbounded surahs.** al-Mulk and ar-Rahman are named as *surahs* inside a
  list otherwise made of verse references. Whole-surah (67 and 55) is the
  natural reading of the page, but the booklet prints no bound, so nothing was
  fetched. This is open question `RQ-OQ-3` for Hafiz.

**Evidence:** `ruqyah-chains.json` → `item_updates[Q13]`,
`catalogue_defects_found[3]`, and `open_questions_for_hafiz[RQ-OQ-3]`.

---

## P5 — The "(7x)" on Q01 belongs to a different text (severity: medium)

**Row:** `Q01` — currently titled "Surah al-Fatihah (7x) – ruqyah"

**Proposal:** drop "(7x)" from the `Q01` title.

**Why:** the booklet prints **no** repetition count on al-Fatihah. The "(7x)"
is printed beside booklet item 1 — "Hasbiyallahu la ilaha illa huwa" — which
is `RB-P04-01`, i.e. catalogue row **`D18`** (see P3). The count was attached
to the wrong item when the catalogue was first extracted.

**Evidence:** `ruqyah-chains.json` → `catalogue_defects_found[2]`; the base
chain `RQ-C01` step 2 carries `repeat_count: 7` with
`repeat_count_source: "printed '(7x)' beside the item"`, while step 3 (`Q01`)
carries `repeat_count: null`.

**Note:** `Q01`'s stored canonical Arabic and its total (10143) are correct and
unaffected. This is a title defect only.

---

## P6 — RB-P04-00: the ta'awwudh is missing from the catalogue (severity: high)

**Row:** none — this is an omission.

**Proposal:** add a row for the unnumbered ta'awwudh printed above p.4 item 1,
**subject to** open question `RQ-OQ-4` (does the opening ta'awwudh belong in
the talisman at all, or is it an opening of the oral act only?). Including it
changes every base-chain total, so this one must not be decided by us.

**Evidence:** `ruqyah-chains.json` → `catalogue_defects_found[1]`,
`open_questions_for_hafiz[RQ-OQ-4]`. `Q01`–`Q09` map to booklet items 2–10
only.

---

## P7 — D05: the catalogue and the booklet count differently (severity: high)

**Row:** `D05` — "Tasbih after prayer (33/33/34)"

**Proposal:** Hafiz rules which form `D05` is; the row then either keeps the
combined phrase or is split by counting scheme.

**Why:** the catalogue row describes 33× SubhanAllah + 33× Alhamdulillah + 34×
Allahu Akbar. The booklet (p.6 item 5) prints **one combined phrase** with the
rubric *(ثَلَاثاً وَثَلَاثِينَ)* and the line "Repeat it 33 times, the total is
99 after which the 100th phrase is:" followed by a different, longer dua. Two
different prescriptions.

**What the merge did:** stored the Arabic as printed, `abjad_total` **null**,
`arabic_status` `pending_verification`.

**Evidence:** `adhkar-arabic.json` → `items[D05].notes`. Note also that the
earlier claim that this page was "garbled" was an extraction artefact only —
the rendered page is fully legible.

---

## P8 — D19: an opening clause that only the Arabic has (severity: high)

**Row:** `D19` — "Pardon and wellbeing in everything"

**Proposal:** Hafiz rules whether the opening clause
`اللَّهُمَّ عَافِنِي فِي بَدَنِي` belongs to `D19`.

**Why:** that clause appears in **neither** the booklet's own transliteration
for item 11 **nor** its English translation, and it is set in the same
substitute Arabic face used for item 9 (`D17`) — which strongly suggests a
typesetting carry-over from `D17`. Everything after it matches the
transliteration word for word.

**What the merge did:** stored the Arabic faithfully as printed, `abjad_total`
**null**, `arabic_status` `pending_verification`.

**Evidence:** `adhkar-arabic.json` → `items[D19].notes`. Arabic runs from p.23
to the top of p.24.

---

## P9 — Q11 and RB-P05-05 differ by exactly one word — keep them apart

**Rows:** `Q11` (dual form) vs proposed `RB-P05-05` (singular form)

**Proposal:** when `Q10` is restructured, do **not** merge `Q11` into
`RB-P05-05`. `Q11` is the dual form (*u'idhukumā*, "I seek refuge for you two",
p.7, for children); `RB-P05-05` is the singular. They differ by one word, so
they have two different abjad totals and must stay separate items.

**Evidence:** `ruqyah-chains.json` → `item_updates[Q11].notes`. This is the
counter-example to P3: identical-looking texts that are *not* identical, caught
by the same letter-level check that caught the two that are.

---

## P10 — Daily-protection cards overlap the adhkar catalogue (severity: medium)

**Rows:** none changed. Chain `RQ-C07` ("Daily Protection", p.12), steps 4, 5,
6 and 9.

**This is a NEW finding** made possible by the adhkar Arabic landing.

Four `RQ-C07` steps are marked `talisman_suitable: true` but carry no stored
Arabic and no Quran reference, so they bind to nothing (`binding.kind ==
"practice_instruction"`). On transliteration, three of them look like texts the
catalogue **already has**:

| Chain step | p.12 card | Candidate existing row | Confidence |
|---|---|---|---|
| `RQ-C07` step 6 | "La ilaha illallahu … yuhyi wa yumit — 10x after Fajr & Maghrib" | **`D08`** (title is literally "La ilaha illallah 10x after Fajr & Maghrib") | high |
| `RQ-C07` step 9 | "Bismillahilladhi la yadurru … 3x morning & evening" | **`D21`** ("Bismillah – nothing can harm (3x)") | high |
| `RQ-C07` step 5 | "La ilaha illallahu wahdahu la sharika lah… — 100x in the day" | **`D27`** ("La ilaha illallah (10x)") — same text, different prescribed count | medium |
| `RQ-C07` step 4 | "Bismillahi tawakkaltu 'alallah… — when leaving the house" | *no candidate* — genuinely absent from the catalogue | — |

**Proposal:** confirm the three candidates side-by-side, then bind those steps
to `D08`, `D21`, `D27`; add a row for the "leaving the house" dua. **Not
applied**, because the ruqyah file stores no Arabic for these cards, so the
letter-level identity check that proved P3 cannot be run here — only the
transliteration suggests the match, and a suggestion is not verification
(decision 3).

This also confirms preset `PR-09`'s own warning: *"Check the Daily Adhkar (D)
catalogue before surfacing this — heavy overlap."*

---

## P11 — Two ruqyah chains cannot produce a talisman at all yet

**Rows:** none. Chains `RQ-C03`, `RQ-C05`, `RQ-C06`.

- `RQ-C06` (9 steps): every step is `quran_ref_only`. All seven numeric refs
  are unambiguous and could be fetched from the canonical Quran source today;
  al-Mulk and ar-Rahman cannot, pending `RQ-OQ-3` (see P4). **Fetching the
  seven is a concrete, decision-3-compliant next step that needs no ruling.**
- `RQ-C03` (5 steps): 4 steps are proposed `RB-P05-*` items (blocked on P1),
  and step 1 is the A'UDHU → U'IDHUKA substitution *rule*, which is not a text.
  A runtime string transformation of stored canonical Arabic is what decision 3
  forbids, so the substituted forms must become stored items or nothing — open
  question `RQ-OQ-2`.
- `RQ-C05` (1 step): its single step is a proposed `RB-P05-*` item, blocked on
  P1.

---

## P12 — Short Names are contained inside longer texts (informational)

**Rows:** none. This is a caution about future features, not a defect.

51 of the 99 Names occur as exact letter substrings of other catalogue texts
(e.g. `N33` Al-'Atheem inside Ayat al-Kursi; `N63` Al-Qayyoom inside the same;
`N01`/`N02` inside every surah that opens with the Bismillah). Two Names are
even contained in each other: `N36` (Al-'Alee) inside `N19` (Al-'Aleem), and
`N03` (Al-Malik) inside `N84` (Maalik-Ul-Mulk).

**Why it matters:** these are **not** duplicates and must never be collapsed —
the abjad totals differ, and each is a distinct text with a distinct purpose.
Any future "find this text inside that one" or fuzzy-search feature must be
built on exact identity (`identity.content_id`), never on substring matching,
or it will start telling clerics that a Name and a whole surah are the same
thing.

---

## Open questions already logged elsewhere (not repeated here)

- `scope-v1.md` open questions 1–3 (Bismillah in whole-surah totals; Rabbana
  fragments vs full ayah; Q13's incomplete reference list).
- `ruqyah-chains.json` → `open_questions_for_hafiz` `RQ-OQ-1` … `RQ-OQ-5`
  (repeat counts multiplied into totals or carried alongside; the U'IDHUKA
  substitution; unbounded surahs; the ta'awwudh; whole-chain vs per-step
  totals). These are all carried into `library.json` under
  `chains.open_questions_for_hafiz`.
