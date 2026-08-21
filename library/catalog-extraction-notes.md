# Catalog extraction notes — categories-for-hafiz.xlsx

Technical notes for the developer session (not for Hafiz). Generated 2026-08-21 from the 4 sample PDFs in `C:\Users\User\Downloads\`.

## Items extracted per PDF

| Source PDF | Rows | ID range | Method |
|---|---|---|---|
| 40 rabbana dua book - My Islam.pdf (45 pp) | 40 | R01–R40 | Automated parse of pages 5–44 (one dua per page): dua number, transliteration, verse ref, quoted translation, "Recommended use" text. All 40 complete. |
| 99-Name-of-ALLAH.pdf (13 pp) | 99 | N01–N99 | Column-position table extraction with pdfplumber word coordinates (#, transliteration, meaning, explanation columns). All 99 numbers 1–99 recovered, verified unique. |
| the-key-to-a-successful-day.pdf (34 pp) | 31 | D01–D31 | Custom-encoded font: every glyph extracts as `(cid:N)`. English/transliteration decode as `chr(N+29)` plus a small special-char map (246→ā, 430→ī, 619→ū, 420→ḥ, 595→ṣ, 336→ḍ, 609→ṭ, 425→Ḥ, 304→Ā, 182→ʿ). Decoded text then hand-curated into the catalog: 8 "After your Prayers" items + 23 "Mornings & Evenings" items (16a/16b merged into one row). |
| Ruqyah-Booklet.pdf (12 pp) | 13 | Q01–Q13 | Arabic invisible to extraction (rendered as images/blank). Catalog built from extractable structure: headings, verse refs on pp. 4–5 ((2:255), (2:284-286), (112), (113), (114), (7:117-119), (10:81-82), (20:69)), hadith-source citations, and the English prose. Sunnah duas that exist only as unextractable Arabic were grouped into collective rows (Q10–Q12). |

**Total: 183 rows** in the Texts sheet.

## Extraction quality issues

- **Arabic excluded everywhere by design.** Rabbana PDF: Arabic extracts scrambled/diacritic-fragmented. 99 Names: Arabic extracts reversed. Key-to-a-Successful-Day: Arabic is `(cid:XXX)` garbage. Ruqyah: Arabic entirely invisible. No extracted Arabic was placed in the deliverable; the workbook tells Hafiz Arabic will come later from a reliable source.
- **99 Names meanings**: the Meaning column wraps across multiple PDF lines around the row boundary; a few meanings have slightly jumbled word order (e.g. N84 "Kingdom, Owner of the Dominion Possessor of Glory and") and a few explanation cells start mid-sentence because their first line sat above the computed row boundary. Content is still recognisable; fine for review purposes.
- **Key booklet item D05** (post-prayer tasbih 33/33/34): its page uses rotated/vertical layout that shredded extraction; the item was identified from surrounding benefit text and the booklet's structure and is flagged as such in its row.
- **Ruqyah rows Q10–Q12**: only the source citations (Muslim, Ahmad, Bukhari, …) and English context extract; the actual dua texts are unextractable Arabic, so these rows are placeholders naming the dua sets, to be filled from canonical sources later.
- Rabbana verse refs: 36 unique refs across 40 duas — duas 5/6/7 are all 2:286, 15/16 are both 3:193, 36/37 both 59:10 (the book splits long verses into multiple duas). Expected, not a bug.

## Proposed category list (primary / secondary counts across 183 items)

| ID | Category | Primary | Secondary |
|---|---|---|---|
| C01 | Protection from evil eye, magic & jinn | 9 | 7 |
| C02 | Daily protection & safety | 19 | 6 |
| C03 | Health & healing | 4 | 3 |
| C04 | Forgiveness & repentance | 21 | 12 |
| C05 | Safety from Hellfire & entry to Paradise | 10 | 7 |
| C06 | Guidance & steadfastness in faith | 11 | 5 |
| C07 | Patience & victory in hardship | 6 | 5 |
| C08 | Relief from distress & trust in Allah | 12 | 7 |
| C09 | Family, marriage & children | 3 | 5 |
| C10 | Sustenance, provision & livelihood | 14 | 2 |
| C11 | Acceptance of deeds & supplications | 3 | 5 |
| C12 | Gratitude & praise of Allah | 56 | 16 |
| C13 | Justice & relief from oppression | 12 | 2 |
| C14 | Honour, status & success | 3 | 0 |

C12 is deliberately the catch-all for the many names of Allah that describe majesty/attributes rather than a petition (Al-Awwal, Al-Aakhir, Az-Zaahir, Al-Baatin, Al-Mumeet, Ad-Dharr, etc.). If Hafiz splits it (e.g. into "names for glorification" vs "thanking Allah"), that's the expected refinement. Names with a conventional petitionary use were mapped to that cause (Ar-Razzaaq→C10, Al-Ghaffar→C04, Al-Mujeeb→C11, Al-Wadood→C09, Ash-Shaafi is absent from this list's 99).

## Judgment calls / low-confidence classifications

- N91 Ad-Dharr (The Distresser) and N61 Al-Mumeet (Bringer of Death) → C12 by default; no natural "cause" category. Hafiz should rule.
- N13 Al-Musawwir secondary C09 reflects common invocation for childbearing — not stated in the PDF text itself.
- R25 (14:38, "You know what we conceal…") → C12/C08; it is context-dependent in the source.
- D05 (tasbih) content inferred, see above.
- Q13 "additional verses of Allah's greatness" is a multi-ref row (2:164; 3:18; 7:54; 23:118; 37:1-10; 59:24; 72:3 + al-Mulk, al-Rahman), not a single text.

No item was left unclassified; every row has a primary category.

## Workbook mechanics (for whoever processes Hafiz's edits)

- File: `C:\Users\User\Desktop\Myra\abjad-qr\library\categories-for-hafiz.xlsx`
- Sheets: `Read Me First`, `Categories`, `Texts`.
- Texts columns H ("Proposed category") and I ("Second category (optional)") carry Excel list data-validation referencing `Categories!$B$2:$B$25` — the 14 category names plus the 10 blank add-your-own rows, so new categories Hafiz types on the Categories sheet appear in the dropdowns automatically.
- Stable IDs: Categories `C01–C14`; Texts `R01–R40`, `N01–N99`, `D01–D31`, `Q01–Q13`. Hafiz was told not to touch IDs or delete rows.
