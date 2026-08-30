# RQ-C06 — Arabic fetch and abjad totals for the seven unambiguous steps

Generated 2026-08-21. Output file: `library/data/rqc06-arabic.json` (standalone;
nothing existing was modified, nothing is wired in yet).

Chain: **RQ-C06 — Add-on: Intensifier — Verses of Allah's Greatness (7x)**,
source p.11 of the Ruqyah booklet. Nine steps; seven are unambiguous verse
references and were fetched. Two are blocked (below).

## Source and method

- Arabic came **only** from the canonical source, per scope-v1 decision 3:
  `http://api.alquran.cloud/v1/ayah/{surah}:{ayah}/quran-uthmani`, field
  `data.text`. No Arabic was typed from memory at any point.
- Every response was checked to confirm the surah number, ayah number and
  edition (`quran-uthmani`) matched what was requested — all 16 matched.
- Ranges were fetched one ayah at a time and joined with a single space, in
  order.
- Totals were computed with the existing engine
  (`library/tools/abjad.py`, `compute_abjad(text)["grand"]`), unmodified,
  including its 2026-08-21 LIGATURES expansion.
- Raw responses are cached outside the repo, so a re-run costs zero network
  calls.

## The seven refs

| Step | Ref | Label | Ayahs | Abjad total |
|-----:|-----|-------|------:|------------:|
| 1 | 2:164 | Verses of Allah's greatness — al-Baqarah 164 | 1 | 13,040 |
| 2 | 3:18 | Al 'Imran 18 | 1 | 1,602 |
| 3 | 7:54 | Al-A'raf 54 | 1 | 13,239 |
| 4 | 23:118 | Al-Mu'minun 118 | 1 | 3,480 |
| 5 | 72:3 | Al-Jinn 3 | 1 | 2,757 |
| 6 | 37:1-10 | As-Saffat 1–10 | 10 | 15,502 |
| 7 | 59:24 | Al-Hashr 24 | 1 | 3,848 |
| | | **Total** | **16** | **53,468** |

Per-ayah totals for the 37:1-10 range are stored in the JSON under
`per_ayah_totals`.

## Chain totals — regression check

| Measure | Value |
|---|---|
| `chain_total_if_joined` (score the seven texts joined into one string) | **53,468** |
| `chain_total_if_summed` (sum the seven step totals) | **53,468** |
| Match | **Yes** |

The sum-equals-join property held. It was asserted in the build script, so the
file could not have been written had it failed. The same check was also run one
level down, across the ten ayahs of 37:1-10 — sum of the ten equals the score of
the joined range. Both are free regression checks on a property the project has
already proven.

**These chain totals cover the seven fetched steps only.** They are not the
total for the full nine-step chain and must not be presented as such until steps
8 and 9 are unblocked.

## Finding — the Bismillah is attached to step 6

The canonical `quran-uthmani` text of **37:1** is delivered with the opening
Bismillah prefixed:

> بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَٱلصَّٰٓفَّٰتِ صَفًّۭا

So step 6's 15,502 **includes the Bismillah**. It is stored exactly as
delivered, because hand-slicing canonical text is precisely what scope-v1
decision 3 forbids. This is the same issue as **scope-v1 open question 1**, and
it changes step 6's number materially. No stripped variant was computed — that
waits on Hafiz's ruling.

Step 6 is the only step affected: it is the only ayah-1 among the seven, and
the Bismillah is prefixed only to ayah 1 of a surah.

## Still blocked

| Step | Ref | Why |
|-----:|-----|-----|
| 8 | Surah al-Mulk (67) | The booklet names the surah with no verse bounds, inside a list otherwise made of verse references. Whole-surah is the natural reading but is an inference, not a printed bound. Fetching a guessed range would put an unverified number on a talisman. Blocked on Hafiz — scope-v1 open question 3. |
| 9 | Surah ar-Rahman (55) | Same — named with no verse numbers. Blocked on Hafiz. |

Also unresolved but not blocking this file: every step of this chain carries
`repeat_count` 7 (a reactive/diagnostic trigger, not a fixed count). Repetition
is **not** multiplied into `abjad_total` — that remains scope-v1 open question 4,
and the data supports either ruling without migration.

## Cost and verification

- **API calls: 16** — 6 single ayahs plus 10 for the 37:1-10 range. Zero cost;
  responses cached out-of-repo for re-runs.
- **Test suite:** `python -m pytest tests -q` from `library/` —
  **161 passed before, 161 passed after.** No test file was added or changed.
- **Files touched:** `library/data/rqc06-arabic.json` (new) and this report
  (new). `git status` confirms no existing file was modified.

## Evidence

| Claim | Evidence |
|---|---|
| Arabic is canonical, not from memory | Every step's `arabic` was re-checked byte-for-byte against the cached raw API payloads — all identical |
| Right verses fetched | Each raw payload's `surah.number`, `numberInSurah` and `edition.identifier` matched the request; 16/16 |
| Totals are correct | Every `abjad_total` was recomputed from the written JSON with the unmodified engine and matched |
| Totals match | 53,468 by both methods; asserted in the build, and re-verified from the written file |
| Engine untouched | `git status` shows no modification to `abjad.py` or any other tracked file |
| Suite unchanged | 161 passed on both runs |
