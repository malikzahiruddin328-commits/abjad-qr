#!/bin/sh
# Baba Ji — pre-push guard.
#
# WHY THIS EXISTS
# ---------------
# This repository publishes to GitHub Pages, so anything reaching the remote
# becomes readable by anyone. The guard exists so that WHAT gets published is a
# deliberate choice made in a commit, not an accident of `git push`.
#
# IT IS NOT A SECRECY GUARD. Zahir ruled on 2026-08-27: "there is no private
# sensitive material" in this repo. docs/scope-v1.md, Hafiz's category workbook
# and the whole library/ catalogue are published deliberately and are on the
# allowlist below. Earlier versions of this header claimed they must never be
# public. That claim was wrong and is removed.
#
# WHAT IT IS STILL STRICT ABOUT, and must stay strict about:
#   - admin-setup.html, which currently hardcodes a plaintext admin password.
#   - anything key-shaped, credential-shaped, or newly added without thought.
# A file is published only by being added to PUBLIC_ALLOWLIST on purpose.
#
# WHY THE ALLOWLIST WAS REALIGNED (2026-08-28, Baba Ji-General)
# Twelve files were already live on origin/main and NOT on the allowlist, so
# every legitimate push touching them was blocked with a message claiming they
# were secret. The predictable human response to a control that cries wolf is
# `git push --no-verify`, which switches the guard off entirely - including for
# admin-setup.html, the one file here that genuinely matters. A control people
# routinely bypass is worse than no control, because it manufactures confidence.
#
# HISTORY — READ THIS BEFORE "SIMPLIFYING" ANYTHING BELOW
# -------------------------------------------------------
# v1 of this guard (2026-08-21) checked only the TIP tree of the pushed ref and
# only a remote literally named "origin". The Baba Ji-RM gate broke it four ways
# in a sandbox, all demonstrated end to end:
#   1. Secret in an ANCESTOR commit, clean tip -> allowed, and the secret was
#      then read straight off the remote. Git publishes history, not a snapshot.
#      This was the realistic bypass.
#   2. A second remote pointing at the same URL under another name -> unguarded.
#   3. Pushing by URL instead of remote name -> $1 is the URL, never "origin".
#   4. Unquoted word splitting: a file literally named "index.html demo.html"
#      split into two allowlisted tokens and would have published.
# All four are closed below. A guard that claims to fail closed but fails open
# is worse than no guard, because it manufactures confidence.
#
# INSTALL
#   cp tools/pre-push-guard.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push
# Git hooks are not versioned and do not survive a fresh clone or a new
# worktree, which is why this file is tracked and is the source of truth.
#
# TO PUBLISH SOMETHING NEW
#   Add it to PUBLIC_ALLOWLIST, deliberately, in its own commit.
#   Do not reach for --no-verify.

#
# 2026-08-30: allowlist regenerated to match main exactly after the Phase 1 library
# restore, the credential removal and the checkout-email fix. Three internal
# documents were REMOVED FROM main's HISTORY rather than allowlisted, and now live
# at Myra/Baba Ji-charters/ outside this repo: the Documentor charter, the Mirror
# charter and docs/branch-state.md, plus library/data/MIRROR-AUDIT-2026-08-21.md.
# The rule applied: a document about the DATA or the PRODUCT may be published
# (the provenance reports are, deliberately - scope-v1 decision 3 makes text
# provenance part of the deliverable). A document about OUR SESSIONS may not.
# admin-setup.html IS now allowlisted - reversing its earlier exclusion, which
# existed only because it hardcoded and auto-provisioned a password. That block is
# deleted, so the file is ordinary app code and the exclusion no longer applies.

set -eu

# Newline-separated so a path containing spaces cannot split into two tokens.
PUBLIC_ALLOWLIST='.gitignore
CHANGELOG.md
CLAUDE.md
DATABASE-MIGRATION.md
INTEGRATION-STATUS.md
INTEGRATION.md
TESTING.md
admin-login.html
admin-setup.html
admin.html
auth-2fa.html
baba-ji-lobby-mockups.html
checkout.html
cleric-dashboard.html
cleric-login.html
cleric-manager.html
demo-99-names.html
docs/scope-v1.md
docs/status.md
events.json
index.html
library/catalog-extraction-notes.md
library/categories-for-hafiz.xlsx
library/data/99NAMES-REPORT.md
library/data/99names-arabic.json
library/data/ADHKAR-REPORT.md
library/data/BUILD-REPORT.md
library/data/IDENTITY-REPORT.md
library/data/INTEGRATION-REPORT.md
library/data/MERGE-REPORT.md
library/data/PROPOSED-CATALOGUE-CHANGES.md
library/data/RQC06-REPORT.md
library/data/RUQYAH-REPORT.md
library/data/adhkar-arabic.json
library/data/categories.json
library/data/library.json
library/data/rqc06-arabic.json
library/data/ruqyah-chains.json
library/data/texts-v2.json
library/data/texts.json
library/tests/test_abjad.py
library/tests/test_identity.py
library/tests/test_ligatures.py
library/tests/test_merge.py
library/tools/abjad.py
library/tools/build_library.py
library/tools/identity.py
library/tools/merge_arabic.py
services-availability.js
services-database.js
services-email-db.js
services-email.js
services-reminders.js
services-reviews.js
services-security.js
services-sms.js
services-webhooks.js
tools/pre-push-guard.sh
webhook-simulator.html'

fail() {
    printf '\n*** PUSH BLOCKED by tools/pre-push-guard.sh ***\n\n%s\n\n' "$1" >&2
    printf 'Files allowed on the published remote:\n%s\n\n' "$PUBLIC_ALLOWLIST" >&2
    printf 'If you truly mean to publish something new, add it to\n' >&2
    printf 'PUBLIC_ALLOWLIST in tools/pre-push-guard.sh in its own commit.\n\n' >&2
    exit 1
}

# Deliberately NOT a `printf | while read` loop: a pipeline runs in a subshell,
# so an `exit 0` inside it never escapes the function and every path falls
# through to "not allowed" — a guard that blocks everything, which the test
# suite caught. `case` keeps this in the current shell and handles spaces.
is_allowed() {
    case "
$PUBLIC_ALLOWLIST
" in
        *"
$1
"*) return 0 ;;
    esac
    return 1
}

# NOTE: deliberately NOT gated on the remote being named "origin", and not on
# the URL either. Every remote this repo can reach is the published one; a
# guard you can sidestep by renaming a remote or pushing by URL is not a guard.

while read -r _local_ref local_sha remote_ref _remote_sha; do
    # Deleting a remote branch carries no content.
    case "$local_sha" in
        *[!0]*) ;;
        *) continue ;;
    esac

    # Every commit being pushed, not just the tip — git publishes history.
    # Exclude everything already on the remote so we only judge what is new.
    commits=$(git rev-list "$local_sha" --not --remotes 2>/dev/null) \
        || fail "Could not enumerate commits for $local_sha. Refusing to push blind."
    [ -n "$commits" ] || commits="$local_sha"

    offenders=""
    for commit in $commits; do
        tree=$(git ls-tree -r --name-only "$commit" 2>/dev/null) \
            || fail "Could not read the tree of $commit. Refusing to push blind."
        [ -n "$tree" ] || fail "Empty tree for $commit. Refusing to push blind."

        short=$(git rev-parse --short "$commit")
        # A here-doc, not a pipeline: a pipeline would run this loop in a
        # subshell and every offender appended to $offenders would be lost.
        # IFS= and -r preserve spaces and backslashes in path names.
        while IFS= read -r path; do
            [ -n "$path" ] || continue
            is_allowed "$path" || offenders="$offenders  $path  (in $short)
"
        done <<EOF
$tree
EOF
    done

    if [ -n "$offenders" ]; then
        fail "Pushing to $remote_ref would publish these non-allowlisted files.
Remember git publishes HISTORY: a file removed in a later commit is still
readable from the commit that added it.

$offenders"
    fi
done

exit 0
