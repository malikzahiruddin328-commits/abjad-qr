# Ruqyah Booklet — real structure, chain model, and Q10–Q13 status

Produced 2026-08-21 from **rendered page images** of
`C:\Users\User\Downloads\Ruqyah-Booklet.pdf`
("RUQYAH — A Remedy for Illnesses, Evil Eye, Magic and Jinn from the Qur'ān and
Sunnah", Ummah Welfare Trust, 12 pages).

Deliverable data file: `library/data/ruqyah-chains.json`.

**Nothing existing was modified.** `texts.json`, `categories.json`, `abjad.py`,
`index.html`, the xlsx, `scope-v1.md` and the charters are unchanged (verified by
file mtime after the run). Defects found in `texts.json` are *reported* below,
not patched.

**scope-v1 decision 3 was treated as binding throughout.** Every Arabic string in
`ruqyah-chains.json` was read off a page image, which is *not* a canonical-source
fetch. Therefore **every `abjad_total` in the new file is `null` and every
`needs_review` is `true`.** No unverified Arabic received a number.

---

## 1. Method note — the extraction problem is solved, but only visually

The booklet's Arabic is set in `_PDMS_Saleem_QuranFont` and is effectively
invisible to text extraction (this is what `scope-v1.md` records). Rendered at
scale 2.2–7.0 with pypdfium2, **every Arabic line in the booklet is perfectly
legible**. Nothing on any of the 12 pages defeated reading.

That changes what is *knowable* but not what is *citable*. A machine reading of a
rendered glyph run is a transcription, not a verified canonical text. So this pass
produced candidate Arabic for 16 texts and stopped short of numbering any of them.

One useful narrowing, verified against the engine (`library/tools/abjad.py`,
unmodified): `is_ignorable()` discards U+064B–065F, U+0670, U+06D6–06ED and the
standalone hamza U+0621. **Only the consonant skeleton contributes to an abjad
total.** A transcription slip in a *vowel mark* cannot change a number. Only a
wrong, missing or extra *letter* can. Hafiz's check is therefore a letter check,
not a full vocalisation check — still required, but much smaller.

---

## 2. Did the preset-chain reading hold up?

**Largely yes — with one structural correction that matters for the build.**

### What was right

The booklet is emphatically **not** a collection of individual texts. Pages 4 and
5 are explicitly **numbered, ordered lists** — 10 items and 13 items — and page 3
instructs the reciter to recite *"the Ruqyah (see p.4 and p.5) loudly, clearly and
with concentration, at least 3 or 7 times."* The booklet publishes a prescribed
sequence, treated as a single unit. The insight that the ruqyah source's real
contribution is an ordered chain rather than a set of standalone rows is correct,
and it is the single biggest difference between this source and the other three.

### What was wrong

**The booklet does not organise into N independent affliction → sequence chains.**
It publishes **one base sequence plus conditional add-on blocks**, each gated by a
printed heading:

- p.4, after item 7: *"One can add the following if affected by magic:"* → items 8–10
- p.5, after item 9: *"When praying on others, add the following:"* → items 10–13
- p.5, under item 5: a **substitution rule** — replace أَعُوْذُ with أُعِيْذُكَ in
  items 1–5 when reciting over someone else
- p.5, above item 6: *"put your hand on the part of your body where you feel pain"*

Modelling this as five flat independent chains ("magic chain", "evil eye chain",
…) would duplicate the same 18 base steps five times over and would throw away the
gating logic, which is the part a cleric actually needs.

The affliction *sections* (p.6 Envy & Evil Eye, p.8 Magic & Jinn) are mostly
**prose advice**, and their concrete prescriptions are largely **non-textual** —
sidr baths, senna water, cupping, olive oil, honey, black seed, zamzam, talbīnah
(pp. 8–9). Those sections are not text lists at all. Only three of them contribute
a text: the p.6 evil-eye dua, the p.7 children's dua, and the p.8 instruction to
recite Surah al-Baqarah entire.

### The model adopted

**base + add-ons**, with a **materialised presets layer** on top so the product
requirement (cleric picks a benefit → one click loads the chain) still works. Both
layers are in `ruqyah-chains.json`.

### A second correction worth flagging

**Not every chain step is talisman material.** p.8 prescribes reciting the whole
of Surah al-Baqarah (286 ayahs) as therapy; pp. 8–9 prescribe physical remedies.
Every step therefore carries a `talisman_suitable` boolean. **A chain is not the
same object as a talisman payload** — the UI must filter, or a cleric will chain
Surah al-Baqarah into a QR code.

---

## 3. The actual page-by-page structure

| Page | Heading | What it actually is |
|---|---|---|
| 1 | cover | — |
| 2 | Ruqyah in the Qur'ān & Sunnah | prose + hadith, no prescription |
| 3 | **Method of Ruqyah** | 3 conditions; "Before Ruqyah"; "During Ruqyah". **Carries the whole-chain repeat rule: "at least 3 or 7 times".** |
| 4 | **RUQYAH FROM THE QUR'ĀN** | unnumbered ta'awwudh + **10 numbered items**; items 8–10 gated on magic |
| 5 | **RUQYAH FROM THE SUNNAH** | **13 numbered items**; substitution rule for 1–5; items 10–13 gated on reciting for others |
| 6 | Envy & Evil Eye | prose + **one boxed dua** (= Q12) |
| 7 | Seeking Protection for Children / How to Treat the Evil Eye | **one dua** (= Q11) + Āyah al-Kursī + last 3 surahs; then non-textual (ruqyah water, bathe 10–20 days) |
| 8 | Magic & Jinn | prose; adds **Surah al-Baqarah entire**; then non-textual (sidr, senna, hijāmah, oil) |
| 9 | Prophetic Medicine | entirely non-textual remedies |
| 10 | Q&A | prose |
| 11 | Q&A cont. | **the Q13 source line** + the 7x intensifier rule |
| 12 | **Prevention is Better than Cure** | a **grid of 12 adhkār**, each with its own count and time of day |

Page 4's list, in the booklet's own order:

| # | Text | Cited | Count |
|---|---|---|---|
| — | Ta'awwudh (unnumbered) | — | none |
| 1 | Ḥasbiyallāhu lā ilāha illā huwa… | Abū Dāwūd | **7x** |
| 2 | Surah al-Fātiḥah | Bukhārī | none |
| 3 | Āyah al-Kursī (2:255) | Ḥākim | none |
| 4 | 2:284–286 | Tirmidhī | none |
| 5 | Surah al-Ikhlāṣ (112) | — | none |
| 6 | Surah al-Falaq (113) | — | none |
| 7 | Surah an-Nās (114) | Bukhārī | none |
| — | *"One can add the following if affected by magic:"* | | |
| 8 | 7:117–119 | — | none |
| 9 | 10:81–82 | — | none |
| 10 | 20:69 | Ibn Abī Ḥātim (footnote) | none |

Page 5's list: 13 items citing Muslim, Ahmad, Muwaṭṭa', Bukhārī, Ḥākim, Abū
Dāwūd, Tirmidhī. Item 6 is a **two-part item with two different counts**
(Bismillāh 3x, then the a'ūdhu 7x). Item 12 carries 7x. All others carry no count.

---

## 4. The chains

Seven chains, 54 steps total, every step traceable to a page and an item number.

| id | name | type | derivation | steps |
|---|---|---|---|---|
| RQ-C01 | Core Ruqyah (Qur'ān + Sunnah) | base | explicit in source | 18 |
| RQ-C02 | Add-on: Affected by Magic | add-on | explicit (printed heading) | 4 |
| RQ-C03 | Add-on: Reciting Over Another Person | add-on | explicit (printed heading) | 5 |
| RQ-C04 | Protection for Children | standalone | explicit (p.7) | 5 |
| RQ-C05 | Add-on: Person Struck by the Evil Eye | add-on | **composed** | 1 |
| RQ-C06 | Add-on: Intensifier — Verses of Allah's Greatness (7x) | add-on | explicit (p.11) | 9 |
| RQ-C07 | Daily Protection (Prevention) | standalone | explicit (p.12) | 12 |

`derivation` is recorded per chain on purpose. **RQ-C05 is the only one this pass
composed** — the booklet prints the evil-eye dua in a highlighted box, not as a
numbered chain step, so attaching it to the base chain is a modelling decision,
flagged as such rather than passed off as the booklet's own layout.

Nine presets sit on top (`presets` in the JSON), each naming which chains to load:

| preset | loads |
|---|---|
| General ruqyah (self) | RQ-C01 |
| Magic (sihr) | RQ-C01 + RQ-C02 |
| Evil eye (afflicted person) | RQ-C01 + RQ-C05 |
| Jinn | RQ-C01 only |
| Physical illness / pain (self) | RQ-C01 only |
| Reciting over another person | RQ-C01 + RQ-C03 |
| Children — protection | RQ-C04 |
| Strong reaction during ruqyah | RQ-C01 + RQ-C06 |
| Daily prevention | RQ-C07 |

Two presets deliberately add nothing, and this is a finding rather than an
omission:

- **Jinn.** p.8 prescribes **no text beyond the base chain**. It re-emphasises
  Āyah al-Kursī and al-Falaq/an-Nās, which are already base steps 4, 7 and 8, and
  then offers the non-textual adhān-in-the-ear remedy. A "jinn chain" with extra
  texts would have to be invented, so it wasn't.
- **Physical illness / pain.** Base steps 14–18 (Sunnah items 6–9) **are** the
  illness and pain duas, and step 14–15 is the one carrying the hand-on-pain
  instruction. There is no separate illness sequence to extract.

RQ-C07 (page 12) carries a **scope warning** in the JSON: those adhkār overlap the
Daily Adhkār source book (the D-items). It is recorded for completeness. Creating
duplicate Q-items for them without checking the D-catalogue first would fork the
same texts across two ids.

---

## 5. The repetition question — for Hafiz, not decided here

**Question (RQ-OQ-1):** when a step carries a count (7x, 3x, 100x), should that
step's abjad total be **multiplied** by the count, or should the count be carried
alongside the total and never folded in?

### The case for multiplying

1. The count is printed **as part of the prescription**, not as commentary. "(7x)"
   sits inside the item, on the same line as the text.
2. If the talisman is a written record of a prescribed **act**, and the act is
   seven recitations, then the number representing the act is arguably seven times
   the number representing one recitation.
3. Numerological practice around amulets commonly works in multiples and grids, so
   a multiplied value may be the value a practitioner actually expects to see.

### The case against multiplying

1. Abjad is a property of the **text** — its letters. Reciting a verse twice does
   not add letters to it.
2. The counts in this booklet attach to the **oral act**, not to the text. p.3
   applies "3 or 7" to the *entire* ruqyah, so multiplying would scale every step
   by a factor the cleric picks at recitation time.
3. **The counts are not stable.** p.3 says "at least 3 or 7"; p.11 says "at least
   7 times if possible". A talisman number that moves with the reciter's
   discretion is not a property of the text.
4. **Direct contradictory evidence inside this one booklet.** `RB-P05-01` carries
   *no count* on p.5 but *"3x evening"* on p.12. Q04/Q05/Q06 (the last three
   surahs) carry no count in the ruqyah chain but *"3x morning & evening"* on p.12.
   Under a multiply rule, **the same text produces two different totals depending
   on which page it was loaded from.** This is the strongest single argument
   against, and it comes from the source itself rather than from theory.
5. `scope-v1` decision 5 says the QR plus the abjad values **are** the talisman.
   Folding in a count introduces a second, non-textual variable into the thing that
   *is* the talisman.

### Recommendation on data shape only (not on the ruling)

Store `abjad_total` and `repeat_count` as **separate fields** and decide the
presentation at render time. Both rulings then stay buildable with no data
migration: if Hafiz rules multiply, the renderer multiplies; if not, it displays
"1788 ×7". **Do not bake a multiplied number into stored data ahead of the
ruling.** The JSON is already shaped this way.

### Four more questions for the same review round

- **RQ-OQ-2** — the أَعُوْذُ → أُعِيْذُكَ substitution changes the Arabic, and so
  changes the total. Five extra stored items, or a runtime transformation? A
  runtime string transform on stored canonical Arabic is exactly what decision 3
  forbids. Note the booklet itself sides with "separate item": Q11 (p.7) is the
  **dual** form of `RB-P05-05` and the booklet prints it out in full as its own
  text rather than describing it as a substitution.
- **RQ-OQ-3** — Q13's al-Mulk / ar-Raḥmān bounds (see §7).
- **RQ-OQ-4** — does the ta'awwudh belong in the talisman, or is it an opening of
  the oral act only? It is printed above item 1 with no number, which reads as a
  preamble. Including it changes every base-chain total.
- **RQ-OQ-5** — one total per chain, or per step? **Mathematically it does not
  matter**: verified against the engine that the sum of member totals equals the
  total of the concatenated text (Q01–Q06 = 67563 computed both ways). This is a
  presentation and religious question, not a technical one.

---

## 6. Q10, Q11, Q12 — outcomes

### Q10 — not resolvable as one item (structural defect, not a data gap)

Q10 collapses the **whole of page 5** into a single row. But p.5 prints **thirteen
separately numbered duas**, with five different hadith attributions and three
different repetition counts. A single Arabic string and a single abjad total for
Q10 could never be correct.

Resolution proposed in `proposed_new_items`: replace Q10 with **14 granular rows**
`RB-P05-01 … RB-P05-13` (item 6 splits into `06A`/`06B` because its two halves
carry different counts). Each has its Arabic read off the page image, its own
hadith attribution, and its own page/item provenance. Q10 itself should become a
container/heading row or be retired.

### Q11 — resolved (candidate text recorded)

p.7, "Seeking Protection for Children" — the words used for Ḥasan and Ḥusayn,
attributed in the source to Bukhārī. Read cleanly off the page. Recorded with
`abjad_total: null`, `needs_review: true`.

Important relationship: **Q11 is the dual form** ("I seek refuge for you *two*")
of the singular dua printed as p.5 item 5 (`RB-P05-05`). They differ by exactly
one word, so they must stay separate items with separate totals — a near-duplicate
that a dedupe pass would otherwise silently merge.

### Q12 — resolved (candidate text recorded)

p.6, boxed at the foot of the page: *"The Messenger of Allah supplicated with the
following words for his companion who was afflicted with the evil eye"*,
attributed to Ahmad. Read cleanly. Recorded with `abjad_total: null`,
`needs_review: true`. No repetition count printed.

### Why no numbers on Q11/Q12

Decision 3. A page-image reading is not a canonical-source fetch. The texts are
now concrete and checkable in one review pass; the numbers wait for that pass.

---

## 7. Q13 — exactly what the booklet prints

Q13 is **not a section**. It is a single sentence inside a Q&A answer on **page
11**, under the question *"Are there specific āyāt in the Qur'ān that have more
impact?"*. The booklet prints, verbatim:

> One can also add other verses which mention the Greatness and the Oneness of
> Allah such as 2:164, 3:18, 7:54, 23:118, 72:3, 37:1-10, 59:24, Sūrah al-Mulk and
> al-Rahmān.

Four findings:

1. **The seven numeric references are unambiguous** and could be fetched today:
   2:164, 3:18, 7:54, 23:118, 72:3, 37:1–10, 59:24.
2. **The printed order differs from `texts.json`.** The booklet prints 72:3
   *fifth*; `texts.json` stores it last (`…; 37:1-10; 59:24; 72:3`). A reordering
   not present in the source.
3. **The image does NOT resolve the al-Mulk / ar-Raḥmān bounds.** They are named as
   *surahs*, without verse numbers, inside a list otherwise made of verse
   references. Reading the page, whole-surah (67 and 55) is the natural sense — the
   sentence switches register from "verse refs" to "surah names" — but **the
   booklet prints no bound**, so that remains an inference. Nothing was fetched.
   `scope-v1`'s existing note on this is confirmed accurate: the text layer was not
   misleading here.
4. **The list is explicitly non-exhaustive** — "*such as*". Treating it as a closed
   set overstates the source.

There is also a **usage condition** the current Q13 row does not capture: this list
is *reactive*. p.11 says *"If certain āyāt elicit greater symptoms, then these
should be repeated at least 7 times if possible"* — the cleric applies these only
when the patient reacts. That is a diagnostic trigger, not a fixed step, and it is
recorded as such on chain RQ-C06.

**Conclusion: Q13 is a collection, not a text.** It should become chain RQ-C06
(9 steps), not a single catalogue row with one Arabic string.

---

## 8. Catalogue defects found in `texts.json` (reported, not patched)

| Severity | Target | Defect |
|---|---|---|
| High | Q10 | Collapses 13 numbered duas into one row — under-granular by 12 items |
| High | *missing* | Booklet p.4 **item 1** (Ḥasbiyallāh…, Abū Dāwūd, 7x) and the **unnumbered ta'awwudh** above it are absent from the catalogue entirely. Q01–Q09 map to booklet items **2–10** only. |
| Medium | Q01 | Title reads "Surah al-Fatihah **(7x)**". The booklet prints **no count** on al-Fātiḥah — the 7x belongs to booklet item 1, which the catalogue does not contain. The count is attached to the wrong item. |
| Low | Q13 `quran_ref` | Reference order does not match the printed order (72:3 misplaced) |
| Info | `scope-v1` OQ 3 | Its statement about Q13's missing bounds is **confirmed correct** against the image |

One trap worth stating explicitly: the wording of `RB-P04-01` (Ḥasbiyallāh…)
matches the second half of **Qur'ān 9:129**, and it would be tempting to fetch
9:129 as its canonical text. **Do not.** The booklet cites it as a hadith (Abū
Dāwūd), and the full ayah contains additional words the booklet does not print.

---

## 9. Pages that defeated me

**None.** All 12 pages rendered legibly and were read in full. Every Arabic line in
the booklet was readable. The only things left unresolved are unresolved *in the
source itself* — the al-Mulk / ar-Raḥmān bounds (the booklet simply does not print
them) — or are religious rulings that are not mine to make (repetition, ta'awwudh
inclusion, the substitution forms).

---

## 10. Evidence appendix

| Claim | Evidence |
|---|---|
| Booklet is an ordered sequence, not a text collection | pp. 4 and 5 are numbered lists (10 and 13 items); p.3 "Recite the Ruqyah (see p.4 and p.5)… at least 3 or 7 times" |
| Add-on blocks are gated, not separate chains | printed headings on p.4 ("if affected by magic") and p.5 ("When praying on others") |
| Booklet items 1 and the ta'awwudh are missing from the catalogue | p.4 high-res crop read directly; Q01–Q09 in `texts.json` map to items 2–10 |
| Q01's "(7x)" is mis-attributed | p.4 crop: "(7x)" is printed on item 1 (Ḥasbiyallāh), item 2 (al-Fātiḥah) carries only "(Bukhārī)" |
| Q10 covers 13 distinct duas | p.5 renders 13 numbered items, five attributions, counts on items 6 (3x + 7x) and 12 (7x) |
| Same text carries different counts in different contexts | `RB-P05-01`: no count on p.5, "3x evening" on p.12; last 3 surahs: no count on p.4, "3x morning & evening" on p.12 |
| Q13 bounds genuinely absent | p.11 verbatim line quoted in §7; no verse numbers printed for al-Mulk or ar-Raḥmān |
| Chain total is well-defined either way | `abjad.compute_abjad` on Q01–Q06 concatenated = 67563; sum of their stored totals = 67563 |
| Stored Q01–Q09 totals are correct | all nine recomputed from stored Arabic against the unmodified engine; all nine match |
| Diacritic errors cannot change a total | `abjad.is_ignorable()` drops U+064B–065F, U+0670, U+06D6–06ED, U+0621 |
| No existing file modified | mtimes of `texts.json`, `categories.json`, `abjad.py`, `scope-v1.md` unchanged after the run |
| Every new Arabic string is unnumbered | validation pass over `ruqyah-chains.json`: 0 items with a non-null `abjad_total`, 0 items with `needs_review: false` |
