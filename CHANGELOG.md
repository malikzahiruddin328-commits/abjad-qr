# Changelog

One line per merged change: date, what changed, who/what built it.
Maintained by Baba Ji-RM as the release gate. Entries are added only after an
independent verification pass — never on a builder's self-report.

## 2026-08-21

- Library foundation added — `docs/scope-v1.md` (six locked scope decisions +
  agreed 4-phase plan), `library/categories-for-hafiz.xlsx` (183-item category
  workbook for Hafiz, 14 proposed categories, working dropdowns),
  `library/data/` (categories.json + texts.json + BUILD-REPORT.md, 53 canonical
  items carrying abjad totals, 130 pending verification),
  `library/tools/abjad.py` (Python port of index.html's abjad logic) and
  `library/tests/test_abjad.py` (82 tests). Built by BabaJi-General's build
  session; gated by Baba Ji-RM. `index.html` unchanged. — added `.gitignore`
  (RM) to keep Python caches out of a repo that publishes to GitHub Pages.
