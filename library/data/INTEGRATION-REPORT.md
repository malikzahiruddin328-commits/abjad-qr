# Integration report — `index-v2.html` (merged calculator + text library)

Built 2026-08-21. Output: `abjad-qr/index-v2.html`, 196,878 bytes, one
self-contained file, no build step, everything inlined (same nature as
`index.html`).

**`index.html` was NOT touched.** `git status` confirms it is unmodified; an
audit of it was running in parallel. The parent session reviews `index-v2.html`
and swaps it in.

Generator (kept out of the repo, per instruction):
`C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Desktop-Myra\d5c4470e-00ff-4c41-ad3c-18143a70f8e4\scratchpad\integrate\build_index_v2.py`
Re-run it to regenerate the page after any change to `texts-v2.json`.

---

## 1. What was lifted VERBATIM

Nothing in this list was retyped. The generator slices `index.html` on disk and
pastes the byte range, so drift is impossible by construction. Each block was
then re-compared byte-for-byte between `index.html` and `index-v2.html` after
generation — all identical.

| Block | Source | Verified identical |
|---|---|---|
| `const ABJAD` | index.html | yes |
| `const NORMALIZE` | index.html | yes |
| `const LIGATURES` + `expandLigatures()` | index.html | yes |
| `isIgnorable()` | index.html | yes |
| `baseLetter()` | index.html | yes |
| `analyze()` | index.html | yes |
| `escapeHtml()` | index.html | yes |
| `insertAtCursor()` | index.html | yes |
| `const KB_ROWS` (on-screen keyboard layout) | index.html | yes |
| reference-value-table IIFE | index.html | yes |
| inlined `qrcode@1.5.3` `<script>` (25,482 chars) | index.html | yes |
| the six-language translation object `L` (all 32 existing keys × 6 langs) | demo-99-names.html | extracted programmatically |
| library row rendering (`rowHtml`), tab switching, multi-select `toggle()`, `pend` guard | demo-99-names.html | behaviour preserved |

The ligature doc-code-sync test was simulated against the new file:
`re.search(r"const LIGATURES = \{(.*?)\};", ...)` scrapes `index-v2.html` and
the parsed map `== abjad.LIGATURES` → **True**. So the test keeps passing after
the swap.

## 2. What was newly written

- **Page shell and layout**: header, language bar, calculator (input + QR +
  abjad breakdown), library section, sticky selection bar, two footers.
- **`render()` / `drawQR()`**: adapted from `index.html` only so their user-facing
  strings (table headers, empty row, "GRAND TOTAL", QR captions) come from the
  translation object. **The arithmetic path is untouched** — they still call the
  lifted `analyze()` and read nothing else.
- **`sendToCalc()`**: writes the chained Arabic of the selection into the
  existing `#text` textarea and calls the existing `render()`. This is the only
  bridge between library and calculator.
- **CSS**: the library's component CSS was re-themed from
  `demo-99-names.html`'s light "paper" palette onto `index.html`'s dark palette
  and **scoped under `#library`**, because the two files collide on `.ar`,
  `.grid`, `.empty`, `.count` and `.v`. Class names and DOM structure are
  unchanged, so the lifted rendering code still applies.
- **Selection chips** (`#selchips`): each selected item shown by title with an
  `×` to drop it — added so "what is currently selected" is obvious.
- **Wildcard search**: the demo's search was a plain substring match. `*` is now
  accepted as a wildcard (`prot*evil` → 6 hits vs `protection` → 14); without a
  `*` the behaviour is byte-identical to the demo's.
- **43 new translation keys × 6 languages** for the calculator chrome (headings,
  toolbar buttons, table headers, QR captions, footers, library controls).
  Written to match the register already in `demo-99-names.html`.

## 3. The one-engine rule (decision: library computes nothing)

The demo's selection bar had its **own** total and its **own** QR canvas,
summing the stored `v` values. Both were **removed**. In `index-v2.html` the bar
shows only the chained Arabic, the count and the selection chips. Every number
and the QR come out of `analyze()` in the calculator.

Cross-check performed live: selecting N01 + N02 + D01 (stored totals 329, 289,
1807 → 2425) and pressing *Send to calculator* produced a calculator grand total
of **2,425** from the joined text. The stored values and the engine agree.

## 4. Data

Built from `library/data/texts-v2.json`. Arabic and numbers copied
programmatically; **no Arabic was hand-typed** anywhere in the generator.

- 183 rows in → 99 in the names grid + 84 in the duas/adhkar/ruqyah list.
- **176 embedded totals re-verified at build time** against
  `library/tools/abjad.py` (`abjad.compute_abjad(arabic)["grand"]`).
  **0 mismatches.** The generator aborts on any disagreement, and also aborts if
  the counts are not exactly 183 / 176 / 7.
- 7 rows carry no total (D05, D19, D24, Q10, Q11, Q12, Q13) — displayed with the
  "awaiting your ruling" tag and **not selectable**.

## 5. Click-through results

Driven in a real browser (`file:///…/index-v2.html`, Chrome preview pane) with
scripted real clicks and real `input` events — not reasoned about. Screenshots
were unavailable in this harness (the pane does not composite frames for a
headless agent), so verification is DOM-level plus geometry measurement.

| Check | Result |
|---|---|
| Seed `بسم الله الرحمن الرحيم` totals 786 | **786** on first load |
| Word breakdown 102 + 66 + 329 + 289 | **بسم=102, الله=66, الرحمن=329, الرحيم=289** |
| On-screen keyboard `ﷲ` key → 66 (today's bug, must not regress) | key found, click inserted U+FDF2, grand = **66** |
| Lam-alef ligature `ﻻ` → 31 | **31** |
| Typing (per-character input events) | `بسم الله` → **168** (102+66) |
| Keyboard `⌫ Back` | 168 → **163** (drops ه=5) |
| Clear button | textarea empty, grand **0**, QR reset to idle caption |
| RTL / LTR button | rtl→ltr (align left) and back to rtl (align right) |
| Nastaliq / Naskh switch | font swaps `Amiri,'Noto Naskh Arabic',serif` ⇄ `'Noto Nastaliq Urdu',Amiri,serif`; `.on` class moves |
| Download PNG handler | anchor built with `data:image/png;base64,…` (4,974 chars), `download="abjad-qr.png"`; intercepted so no file was written |
| Copy payload | clipboard received `بسم الله الرحمن الرحيم\nAbjad: 786`; label flips to **Copied!** then back to **Copy payload** |
| All six languages switch | en/ur/hi/bn/ms/id all applied; `<html lang>` and `document.title` follow |
| Urdu flips the page to RTL | `body[dir]` = **rtl**; no horizontal overflow, no off-screen element |
| Numbers identical in every language | grand **786** and word sums **102+66+329+289** in all six; D01 shows **1,807** in all six; 28 reference values identical; tab counts **(99)(84)**; **7** pending tags |
| Honesty note for non-English | shown in ur/hi/bn/ms/id, hidden in en |
| Library selection fills textarea and updates through the existing path | N01+N02+D01 → textarea = chained Arabic, grand **2,425**, QR caption **Abjad: 2425**, 4-word breakdown |
| The 7 items without a number cannot be selected | all 7 clicked; `sel` stayed `[]`, all `aria-pressed="false"`, Send stayed disabled |
| Selection survives language switch, tab switch and search reset | `aria-pressed` and chips restored each time |
| Tabs, search, wildcard, "no match" message | 99 cards / 84 rows; `protection`→14, `forgive`→17, `prot*evil`→6, `morning*`→23, `zzzznothing`→0 + "Nothing matches that." |
| Clear selection | `sel=[]`, 0 pressed elements, Send disabled, **calculator text untouched** (one-way flow) |
| Console errors | **zero** — `read_console_messages` empty, and an instrumented pass (all languages, both tabs, select/send/clear, keyboard, RTL, PNG, search) recorded 0 errors, 0 warnings, 0 unhandled rejections |
| Layout sanity | no horizontal page overflow in LTR or RTL; no zero-size or off-screen elements; no empty-label controls; selection bar `position: sticky` |

## 6. Test suite

`cd library && python -m pytest tests -q` → **161 passed** (identical to the
baseline taken before this work). `index-v2.html` is a new file, so no test
reads it; `test_ligatures.py` still reads `index.html`, which was not touched.

## 7. What I could NOT verify

1. **Visual screenshots.** The browser pane would not composite frames for this
   agent, so every check above is DOM/geometry based. Nobody has looked at the
   merged page with human eyes. A quick visual pass before merge is worth it,
   especially the dark re-theme of the library cards.
2. **A truly cold first load, on reload.** The very first load in this session
   was clean (seed text present, grand 786, keyboard hidden). On subsequent
   reloads the harness serves the file as the same `data:` URL and Chrome
   restores the previous form state (textarea value, keyboard open). That is
   browser form restoration, not a page defect — the emitted HTML source carries
   the correct seed text and `style="display:none"` on the keyboard.
3. **The five non-English translations of the NEW strings** are machine-written
   and unreviewed by a native speaker — exactly the situation the standing
   honesty note already declares. The existing strings lifted from
   `demo-99-names.html` were equally unreviewed.
4. **Real clipboard write and real PNG download.** Both handlers were exercised
   and their payloads captured, but the actual OS clipboard write and file
   download were stubbed/intercepted deliberately, so nothing was written to the
   machine.
5. **Google Fonts at runtime.** `index-v2.html` keeps `index.html`'s two Google
   Fonts stylesheet links, so unlike `demo-99-names.html` it is not
   request-free. If a request-free page is a requirement, that is a decision to
   take, not something I changed unilaterally.

## 8. Open point for whoever merges

`origin/main` publishes `index.html` and `demo-99-names.html` only (hard rule
5.3 in `CLAUDE.md`). `index-v2.html` embeds the whole catalogue — 183 rows with
their Arabic, totals, meanings and stated purposes. Publishing it is publishing
the catalogue content. That is what "the library becomes part of the real tool,
served from the same GitHub URL" means, and Zahir approved the merge directly —
but it does change what the public repo exposes, and `demo-99-names.html` (which
already exposes the same rows) is presumably superseded by it. Worth one
explicit confirmation before the push.
