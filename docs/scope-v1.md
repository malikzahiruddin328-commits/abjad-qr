# Baba Ji — Scope v1

Agreed between Zahir and Baba Ji-General, 2026-08-21, via structured Q&A
(six questions, all answered). This document is the durable record of that
agreement. Anything not listed under "Locked decisions" is either future-fluid
or not yet discussed.

## Vision (Zahir's words, condensed)

Baba Ji stops being an open public page and becomes a working tool for a
closed group of religious clerics. A curated library of religious texts
(sourced from PDFs Zahir uploads over time) is organized by *cause* so a
cleric can find the right text for a person's need, feed it into the QR +
abjad generator, and produce a talisman. On top sits an audience layer:
clerics list live events, the public joins on existing social platforms,
and when a question ends in "you need a talisman," the person gets a
frictionless link into the tool. Monetization happens at several possible
points but is deliberately undefined for now.

## Locked decisions

| # | Question | Decision | Decided by |
|---|----------|----------|------------|
| 1 | Cleric access | Open signup with review — anyone can request, nothing works until approved (Zahir approves). Individual account per cleric, so every talisman is attributable to its creator. | Zahir, 2026-08-21 |
| 2 | Library ownership | One shared library visible to every approved cleric, uploaded and curated by Zahir alone. No per-cleric uploads. | Zahir, 2026-08-21 |
| 3 | Text sourcing | PDFs are the **catalog, not the source**. Arabic text comes from verified canonical sources (Quran text databases, verified 99-Names list, etc.), matched via the verse references / transliterations that extract cleanly from the PDFs. Anything unmatchable goes through human side-by-side confirmation before entering the library. **No unverified text ever gets an abjad number.** | Agreed on evidence, 2026-08-21 |
| 4 | Categories (causes) | Hafiz (Zahir's brother, religious scholar) owns the category taxonomy. Machine proposes from the data; Hafiz reviews/corrects/extends via an Excel workbook built for him (plain-language instructions, dropdowns). | Zahir, 2026-08-21 |
| 5 | The talisman | The QR + the abjad values ARE the talisman — nothing else for now. Every talisman record carries a `type` field; today exactly one type exists. | Zahir, 2026-08-21 |
| 6 | Live events | **List-and-link model.** Clerics stream on their existing platforms (TikTok/YouTube/etc.); we host the event schedule and the talisman link gets pinned in stream comments/bio. We do NOT build our own streaming. | Zahir agreed with General's recommendation, 2026-08-21 |

## Evidence basis for decision 3 (text sourcing)

Probed 2026-08-21 against Zahir's four sample PDFs (40 Rabbana duas,
99 Names of Allah, The Key to a Successful Day, Ruqyah Booklet):

- 40 Rabbana: Arabic extracts scrambled/out-of-order with detached diacritics.
- 99 Names: Arabic extracts in reversed (display) order.
- Ruqyah Booklet: Arabic in `_PDMS_Saleem_QuranFont` — near-invisible to extraction.
- Key to a Successful Day: Arabic extracts as `(cid:XXX)` garbage (private font encoding).
- In ALL four, English translations, transliterations, and Quran verse
  references (e.g. 2:127, 2:255, 112–114) extract cleanly.

Conclusion: naive PDF extraction would put wrong abjad numbers on talismans.
Canonical-source matching guarantees letter-perfect Arabic at zero running
cost (fits the free-first rule and qualify-at-the-source principle).

## Future-fluid (recorded, NOT designed, do not build)

- Other talisman types: stones, crystals, map/charts (naqsh — Arabic arranged
  in grids/directions), also QR-encoded eventually.
- Monetization model: candidates are creation fees, ads, paid event joins,
  social-funnel conversion. Explicitly undecided.
- Own-platform streaming: only if the audience follows; not now.
- Printable talisman layout (person's name, cleric name, date): parked as a
  look-and-feel decision — mockups first, Zahir picks, per standing rule.

## Standing flags (owed diligence before the relevant build step)

1. **Payment rails**: processors and ad networks restrict "spiritual services"
   categories; talisman-selling can get flagged even as mainstream religious
   practice. Verify rails before betting a revenue model on them.
2. **Platform jump**: this scope turns a static page into a real platform
   (accounts, database, uploads). Architecture must pass architect-review
   before any build is locked; cost/volume estimated per the cost-blast-radius
   rule before anything AI-powered ships.

## Phasing (AGREED by Zahir, 2026-08-21)

1. **Phase 1 — Library foundation**: canonical text store, category taxonomy
   round-trip with Hafiz (workbook out → reviewed → imported), browse/search
   by cause, one-tap feed into the existing generator.
2. **Phase 2 — Cleric accounts**: signup + review queue + per-cleric
   attribution of created talismans.
3. **Phase 3 — Events listing**: schedule page + deep links for pinning.
4. **Phase 4 — Monetization**: model decision + payment-rail verification.

## Open questions for Hafiz (religious rulings, not technical calls)

1. **Does the opening Bismillah count as part of a surah for abjad purposes?**
   The canonical Uthmani text prefixes بِسْمِ ٱللَّهِ… to ayah 1 of each surah.
   For whole-surah items this changes the number materially — Surah al-Ikhlas
   computes to **1788 with** the Bismillah and **1002 without** it. The data
   currently stores the canonical text as delivered (Bismillah included, so
   1788) because hand-slicing canonical text is exactly what decision 3
   forbids. Affects 6 whole-surah items (D06, D10, Q01, Q04, Q05, Q06).
   Hafiz's ruling decides whether a stripped variant is generated.
2. **Rabbana duas are fragments of their ayah.** All 40 store the FULL ayah
   (and its total), because the dua itself typically begins mid-verse at
   رَبَّنَا. Should the talisman use the full ayah or the fragment? If the
   fragment, Hafiz must mark the boundary — no automated slicing.
3. **Item Q13's reference list is incomplete** in the source booklet (names
   Surah al-Mulk and al-Rahman with no verse bounds), so it was deliberately
   left unfetched rather than guessing a subset.

## Artifacts

- `library/categories-for-hafiz.xlsx` — Hafiz's category workbook. Built and
  independently verified 2026-08-21: 183 text items (40 Rabbana duas, 99 Names,
  31 daily adhkar, 13 ruqyah entries), 14 proposed categories, working
  dropdowns, plain-language instructions sheet. Awaiting Hafiz's review round.
- `library/catalog-extraction-notes.md` — technical extraction notes.
- `index.html` — the live tool (unchanged by this scope doc).
- `wireframe.html` — A–M layout map of the live tool.
