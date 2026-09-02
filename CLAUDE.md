# Baba Ji — orientation

Read this first. It is the five-minute orientation for this repo, and it is the
only one — there is no separate README on purpose.

Measured against `main` at `630bd25` on 2026-08-31. Every count below came from
reading the tree or running the thing, not from another document. **Re-measure
rather than trusting this file's date** — the commands are given so you can.

The first version of this file was measured at `a1a3a0c` and was accurate then.
Within two days five of its figures had gone stale, because `main` absorbed
Phase 1, the credential fixes and the allowlist rewrite. That is the expected
failure mode here, not an unusual one: **this repo moves faster than this file.
Run the commands.**

---

## 1. What this is

A talisman tool for a closed group of religious clerics, plus the beginnings of
a booking platform around it.

- **`index.html`** — the actual product. An abjad (numerology) calculator, a QR
  generator, and a browsable library of religious texts. One self-contained
  file, 199,151 bytes (~194 KB).
- **`library/`** — the text corpus and the Python that builds it.
- The rest — `cleric-*`, `admin-*`, `checkout`, `auth-2fa`, `webhook-simulator`
  — is a cleric-accounts and booking layer built on top.

**There is no build step and no server.** Every page is static HTML opened
directly, and nothing a visitor does leaves their browser today.

**But do not reach for the reason this file used to give.** An earlier version
of this section said "zero `fetch`, `XMLHttpRequest` or `axios` calls exist in
any page" and offered `grep -l ... *.html` as proof. That grep is scoped to
`*.html` and misses where the network code actually lives:

```bash
grep -cE "fetch\(|XMLHttpRequest|axios" services-*.js
#   services-database.js  21
#   services-email-db.js   2
#   services-email.js      2
#   services-sms.js        1
```

Those modules are loaded by `checkout.html` and `cleric-dashboard.html`, both
published. `services-database.js` even carries a hardcoded default host —
`config.databaseURL || 'https://babaji-prod.firebaseio.com'` — and appends
`?auth=${apiKey}`.

The real reason nothing is transmitted is narrower and more fragile:

- `services-database.js` ends with `let globalDatabase = new LocalStorageAdapter()`.
- The only `FirebaseAdapter` instantiation in `checkout.html` is **commented out**
  (line 322).
- `cleric-dashboard.html` instantiates no remote adapter at all.

So the correct sentence is *"the remote adapter is commented out and the default
is localStorage"* — which is **one uncommented line away from live**. The old
sentence was the kind a future session quotes as clearance. This one is the kind
that makes someone check before uncommenting. Found by Baba Ji-RM, 2026-08-30.

All state therefore lives in the visitor's own `localStorage`. Nothing is shared
between users, and nothing survives clearing site data. **Read that again before
reasoning about "accounts", "payments" or "admin" on this project** — today
those words describe UI, not a backend.

## 2. The one thing that will bite you

**`main` publishes straight to GitHub Pages.** A push to `origin/main` is a
public release, not a save.

<https://malikzahiruddin328-commits.github.io/abjad-qr/>

`tools/pre-push-guard.sh` enforces this: a file reaches the remote only by being
added to its **59-entry** `PUBLIC_ALLOWLIST` on purpose. Install it as
`.git/hooks/pre-push` — **git hooks are not versioned, so a fresh `git clone`
has no guard at all until you copy it in.** A `git worktree` is NOT a fresh
clone: hooks resolve to `$GIT_COMMON_DIR/hooks`, shared across every worktree
of this repo, so installing the hook once covers all of them. Verified across
all four session worktrees under `Baba Ji-worktrees/`.

If a push is blocked, that is the guard working. Do not reach for
`--no-verify`; add the file to the allowlist in a commit, or do not publish it.

The guard is deliberately *not* a secrecy guard. Zahir ruled on 2026-08-27 that
there is no private sensitive material here, and the library, the scope doc and
Hafiz's workbook are published on purpose. `admin-setup.html` used to be held
off the allowlist because it hardcoded a plaintext admin password; **that
credential is gone** (commit `6e60482`) and the file is now allowlisted, with
the reversal recorded in the guard's own comments.

What the guard is now protecting is **editorial**, not secret: internal session
documents. Baba Ji-General ruled on 2026-08-30 that `CLAUDE.md` is published on
purpose, while the role charters and `docs/branch-state.md` are not — those live
at `Myra/Baba Ji-charters/`, outside this repo, so they cannot be swept public
again.

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
| `library/data/` | `texts.json`, `categories.json`, `BUILD-REPORT.md` and the per-corpus reports |
| `library/tools/` | `abjad.py` (Python port of `index.html`'s abjad logic), `build_library.py`, `identity.py`, `merge_arabic.py` |
| `library/tests/` | pytest suite — all four files, see §4 |
| `docs/scope-v1.md` | **The scope authority** — see §5 |
| `docs/status.md` | Build status |
| `tools/pre-push-guard.sh` | The publication gate |

`docs/branch-state.md` is **no longer in this repo.** It was ruled internal on
2026-08-30 and relocated to `Myra/Baba Ji-charters/branch-state-2026-08-30.md`.
Anything still pointing at `docs/branch-state.md` is a dead link.

### How the service modules load

They are **classic scripts, not ES modules.** Pages load them with plain
`<script src="services-database.js">`, and they expose themselves as implicit
globals from top-level `class`/`function` declarations. `services-database.js`
also carries a `typeof module !== 'undefined'` CommonJS guard for Node.

`DATABASE-MIGRATION.md` documents the API as `import { … } from './services-database.js'`
in **12** places. **That is wrong** — an `import` statement in a classic script
is a syntax error. The runtime wiring works; the documentation of it does not.
This is recorded rather than quietly patched, per §6.

## 4. Tests

```bash
python -m pytest library/tests -q
```

**166 passed, 2 skipped** on `main` at `630bd25`, run 2026-08-31. All four test
files — abjad, identity, ligatures, merge — are now on this branch. A "the tests
pass" claim made on `main` today covers the whole suite that exists, which was
**not** true before `0d4ac19` (see §5).

One thing worth knowing about this suite, because it nearly hid a real defect.
`test_abjad.py` once contained `test_documents_known_fe70_range_bug()`, written
to *document* a `===`-instead-of-`>=` typo in `index.html`'s `isIgnorable()`.
The page was later fixed; the Python port was not; and the test kept passing,
because it only ever asserted about the port. A test written to document
behaviour had become a test enforcing the port's divergence from it. Baba
Ji-Mirror caught this on 2026-08-29 and it is **fixed** — the port and the page
now agree, and `test_abjad.py:199` additionally asserts the typo has not come
back in `index.html` itself. Totals were never affected. The lesson stands:
**two implementations of the scoring logic exist, and the suite is the only
thing holding them together.**

## 5. `main` and the feature branch — largely reconciled

**This section previously said Phase 1 was the one phase missing from `main`.
That is no longer true.** Commit `0d4ac19` restored Phase 1 (the library) onto
`main` on 2026-08-30, by extraction rather than merge — Baba Ji-General's
ruling was "extract and retire, not merge".

Measured today, `main` vs `feature/library-foundation`:

```bash
git rev-list --left-right --count main...feature/library-foundation   # 34  14
comm -13 <(git ls-tree -r --name-only main | sort) \
         <(git ls-tree -r --name-only feature/library-foundation | sort)
```

- **34 ahead / 14 behind.**
- **Exactly one file exists only on the feature branch:**
  `library/data/MIRROR-AUDIT-2026-08-21.md`.
- 17 files exist only on `main` — the Phase 2–4 service surface.

So `main` now carries all four scope phases. `feature/library-foundation` is
retained but retired; it is 31 commits stale on everything it still shares.

Architecture is ruled (Baba Ji-General, 2026-08-30): **Phase 1 static is the
only live lane; Phases 2–4 are frozen.** The cleric-accounts and booking layer
still exists in the tree and still publishes, but no work is directed at it.

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
- As of 2026-09-01, each role has its own worktree —
  `Baba Ji-worktrees/baba-ji-{documentor,general,mirror,rm}/`, each on its
  own `session/baba-ji-<role>` branch. If you find yourself in the bare `abjad-qr/`
  checkout instead, that is the shared legacy one: **measure against
  explicit refs (`git show main:file`), not the working tree** — three
  sessions using it concurrently is exactly what made that necessary, and a
  branch there can still change under you mid-task.
- **`git fetch . src:dst` refuses when `dst` is checked out in *any*
  worktree of this repo — including the one you are standing in.** Hit this
  merging a branch into `main` while sitting in a `main` checkout. Use
  `git merge --ff-only <branch>` instead when the target is the branch you
  are currently on; it is the correct tool for that case and just as safe,
  given a clean working tree and a true fast-forward.
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

**Role charters do not live in this repo.** Committing one here would publish
it (§2), so they were relocated to `Myra/Baba Ji-charters/` on 2026-08-30. The
Documentor's and Mirror's have been recovered from session transcripts; **Baba
Ji-RM's is still lost** — never committed, absent from every ref — and is RM's
to restore by the same method.

## 7. Which document answers which question

| Question | File |
|---|---|
| What is this supposed to become? | `docs/scope-v1.md` |
| How did `main` and the feature branch diverge? | `Myra/Baba Ji-charters/branch-state-2026-08-30.md` — outside this repo |
| What changed and when? | `CHANGELOG.md` — **stale, see below** |
| How do the service modules work? | `INTEGRATION.md` |
| Where did the Arabic come from? | `library/data/BUILD-REPORT.md` |
| Why does this row have no number? | that row's `notes` in `texts.json` |

### Documents on `main` you should not trust as-is

Named here rather than silently corrected, so the drift is visible:

- **`CHANGELOG.md`** — last entry 2026-08-21. `main` has run **35 commits**
  since (`git rev-list --count main --since=2026-08-21`). It is also *shorter*
  than the copy on `feature/library-foundation`; two verified entries were lost
  when the branches split. It is **RM-owned and append-only** — flag it, do not
  edit it.
- **`INTEGRATION-STATUS.md`** — see the correction notice at the top of that
  file. Several of its headline figures did not match the code. Two items in
  that notice have themselves since gone stale; the notice now says which.
- **`DATABASE-MIGRATION.md`** — the ESM import examples, per §3.
- **`TESTING.md`** — 37 test checkboxes, **0 ticked**, alongside prose calling
  the platform "battle-tested".

  **The admin password is fixed.** `baba-ji-2026` appears nowhere in the tree
  (commit `6e60482`); `admin-login.html:232` now reads
  `window.BABA_JI_CONFIG?.adminPassword` and **fails closed** when no config
  exists; `TESTING.md:31` correctly states there is no default and no published
  password.

  **The second credential is fixed too.** `TESTING.md:36` and
  `webhook-simulator.html:188` published `password123` for a test cleric
  account `test@cleric.com` that never existed in the app — `cleric-login.html`
  has no seeded account; it only checks a signup-time password hash. So the
  string was a documentation artefact, not a working credential, but a
  published password Zahir may have reused elsewhere is worth removing on its
  own terms. Both files now point readers at signing up their own test
  account instead. Raised by Baba Ji-RM 2026-08-30; not a reopening of
  Zahir's 2026-08-27 ruling, which was about private material, not
  credentials.
- **`docs/scope-v1.md`** — accurate and authoritative on scope, with two small
  artifact-list slips: it lists `wireframe.html`, which exists on no ref
  (`main`, `feature/library-foundation`, `public-site`, `origin/main` — all
  checked), and calls `index.html` "unchanged", which stopped being true long
  ago.
