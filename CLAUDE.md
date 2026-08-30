# Baba Ji — orientation

Read this first. It is the five-minute orientation for this repo, and it is the
only one — there is no separate README on purpose.

Measured against `main` at `a1a3a0c` on 2026-08-29. Every count below came from
reading the tree or running the thing, not from another document. **Re-measure
rather than trusting this file's date** — the commands are given so you can.

---

## 1. What this is

A talisman tool for a closed group of religious clerics, plus the beginnings of
a booking platform around it.

- **`index.html`** — the actual product. An abjad (numerology) calculator, a QR
  generator, and a browsable library of religious texts. One self-contained
  file, ~198 KB.
- **`library/`** — the text corpus and the Python that builds it.
- The rest — `cleric-*`, `admin-*`, `checkout`, `auth-2fa`, `webhook-simulator`
  — is a cleric-accounts and booking layer built on top.

**There is no build step and no server.** Every page is static HTML opened
directly. Zero `fetch`, `XMLHttpRequest` or `axios` calls exist in any page —
verified, not assumed:

```bash
grep -l "fetch(\|XMLHttpRequest\|axios" *.html   # returns nothing
```

All state lives in the visitor's own `localStorage`. Nothing is shared between
users, and nothing survives clearing site data. **Read that sentence again
before reasoning about "accounts", "payments" or "admin" on this project** —
those words describe UI, not a backend.

## 2. The one thing that will bite you

**`main` publishes straight to GitHub Pages.** A push to `origin/main` is a
public release, not a save.

<https://malikzahiruddin328-commits.github.io/abjad-qr/>

`tools/pre-push-guard.sh` enforces this: a file reaches the remote only by being
added to its 36-entry `PUBLIC_ALLOWLIST` on purpose. Install it as
`.git/hooks/pre-push` — **git hooks are not versioned, so a fresh clone or a new
worktree has no guard at all until you copy it in.**

If a push is blocked, that is the guard working. Do not reach for
`--no-verify`; add the file to the allowlist in a commit, or do not publish it.

The guard is deliberately *not* a secrecy guard. Zahir ruled on 2026-08-27 that
there is no private sensitive material here, and the library, the scope doc and
Hafiz's workbook are published on purpose. What it stays strict about is
`admin-setup.html`, which hardcodes a plaintext admin password and is
deliberately off the allowlist.

## 3. Layout

| Path | What it is |
|---|---|
| `index.html` | The product: abjad calculator, QR generator, library browser |
| `demo-99-names.html` | Library demo page |
| `baba-ji-lobby-mockups.html` | Cleric discovery / booking lobby |
| `cleric-login/-dashboard/-manager.html` | Cleric accounts and admin approval |
| `admin.html`, `admin-login.html` | Event management behind a password gate |
| `checkout.html`, `auth-2fa.html` | Stripe checkout (test keys), TOTP setup |
| `webhook-simulator.html` | Manual test harness for payment webhooks |
| `services-*.js` (9) | Email, SMS, security, reviews, reminders, webhooks, availability, database |
| `library/data/` | `texts.json`, `categories.json`, `BUILD-REPORT.md` |
| `library/tools/abjad.py` | Python port of `index.html`'s abjad logic |
| `library/tests/` | pytest suite |
| `docs/scope-v1.md` | **The scope authority** — see §5 |
| `docs/branch-state.md` | Why `main` is not the whole project — read it |
| `tools/pre-push-guard.sh` | The publication gate |

### How the service modules load

They are **classic scripts, not ES modules.** Pages load them with plain
`<script src="services-database.js">`, and they expose themselves as implicit
globals from top-level `class`/`function` declarations. `services-database.js`
also carries a `typeof module !== 'undefined'` CommonJS guard for Node.

`DATABASE-MIGRATION.md` documents the API as `import { … } from './services-database.js'`
in 13 places. **That is wrong** — an `import` statement in a classic script is a
syntax error. The runtime wiring works; the documentation of it does not. This
is recorded rather than quietly patched, per §6.

## 4. Tests

```bash
python -m pytest library/tests -q
```

**82 passed** on `main` as of 2026-08-29. That is `test_abjad.py` alone. The
other three test files — identity, ligatures, merge — are not on this branch
(see §5), so a "the tests pass" claim made on `main` covers roughly half the
suite that exists.

## 5. `main` is not the whole project

`main` and `feature/library-foundation` diverged on 2026-08-21 and have not been
reconciled. **23 files exist only on the feature branch**, including most of the
canonical text corpus and three quarters of the test suite.

`docs/branch-state.md` has the measured detail. The short version:

- `main` carries scope Phases 2, 3 and 4 (cleric accounts, events, payments).
- **Phase 1 — the library — is the one phase not on `main`.**

On `main`, `library/data/texts.json` holds 183 items of which **53 (29%) carry
canonical Arabic and an abjad total**; the remaining 130 are catalogued but
unverified. That is by design, not a defect — scope decision 3 is *"no
unverified text ever gets an abjad number."*

**`docs/scope-v1.md` is the scope authority.** Six decisions locked with Zahir
on 2026-08-21. Where any other document's phase numbering disagrees with it,
scope-v1 wins — `INTEGRATION-STATUS.md` in particular uses "Phase 1" and
"Phase 2" for something entirely different.

## 6. Working here

- **Worktree or branch, never straight to `main`.** All changes go through
  **Baba Ji-RM's** gate — no "it is just a doc" exception.
- Three sessions share this checkout. **Its branch can change under you
  mid-task.** Measure against explicit refs (`git show main:file`), not the
  working tree, or your numbers will silently describe a branch you did not mean.
- **Never push to `origin` without being asked.** See §2.
- Formal BRD / FRS / UAT documents are produced on explicit request only.
- When a document and the code disagree because the *code* is wrong, or the
  claim was never true — **name the drift; do not edit the document to match.**
  A doc quietly reshaped to agree with a defect reports a healthy system.

### Who does what

| Role | Owns |
|---|---|
| Baba Ji-General | Architecture, scope, priorities |
| Baba Ji-RM | The merge gate and the publication gate |
| Baba Ji-Mirror | Independent audit — finds, does not fix |
| Baba Ji-Documentor | These docs, and keeping them accountable to the code |

Role charters live at the repo root. Only the Documentor's has been recovered so
far; the RM's and Mirror's were lost before they were ever committed.

## 7. Which document answers which question

| Question | File |
|---|---|
| What is this supposed to become? | `docs/scope-v1.md` |
| Why is `main` missing half the library? | `docs/branch-state.md` |
| What changed and when? | `CHANGELOG.md` — **stale, see below** |
| How do the service modules work? | `INTEGRATION.md` |
| Where did the Arabic come from? | `library/data/BUILD-REPORT.md` |
| Why does this row have no number? | that row's `notes` in `texts.json` |

### Documents on `main` you should not trust as-is

Named here rather than silently corrected, so the drift is visible:

- **`CHANGELOG.md`** — last entry 2026-08-21. `main` has run 28 commits since.
  It is also *shorter* than the copy on `feature/library-foundation`; two
  verified entries were lost when the branches split.
- **`INTEGRATION-STATUS.md`** — see the correction notice at the top of that
  file. Several of its headline figures did not match the code.
- **`DATABASE-MIGRATION.md`** — the ESM import examples, per §3.
- **`TESTING.md`** — 37 test checkboxes, 0 ticked, alongside prose calling the
  platform "battle-tested". It also prints the admin password in plain text
  (lines 31 and 66), as does `webhook-simulator.html` line 187 — and on this
  branch that password is live: `admin-login.html` line 150 hardcodes the same
  string. Calibrate before reacting: `admin.html` is `localStorage`-only with no
  server (§1), so today that buys a stranger event management in their own
  browser tab. It stops being harmless the day a backend is wired up.

  An uncommitted rewrite in the shared working tree moves this to
  `window.BABA_JI_CONFIG`. **That is not on any branch** — do not read the
  working tree and conclude this is fixed.
- **`docs/scope-v1.md`** — accurate and authoritative on scope, with two small
  artifact-list slips: it lists `wireframe.html`, which exists on no branch, and
  calls `index.html` "unchanged", which stopped being true long ago.
