# -*- coding: utf-8 -*-
"""Real parity test between index.html's JS engine and library/tools/abjad.py.

This is the test three independent sessions asked for and none had built:
Baba Ji-RM's predecessor (2026-08-21), Baba Ji-RM again (2026-08-30), and
Baba Ji-Mirror (2026-08-31), all finding the same gap separately. The prior
test suite guarded the two sides TEXTUALLY - a regex for one known typo, a
scrape of two constant sets compared against Python - which caught drift in
exactly those three things and nothing else. A change to analyze(),
baseLetter(), isIgnorable()'s other branches, or a single ABJAD table value
would pass the full suite while being silently wrong.

This test actually EXECUTES both engines and asserts their outputs agree,
over a corpus wide enough to exercise the presentation-form and honorific
logic that motivated the original 130-of-232 divergence.

Requires `node` on PATH. Skips (does not fail) when node is unavailable,
because this repo has no build step and no other test requires one - adding
a hard node dependency to `pytest` everywhere would be a bigger decision than
this test itself. Anyone running the suite locally with node installed gets
full coverage; CI or a machine without node gets a clean skip, not a false
red or a false green.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

LIBRARY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LIBRARY / "tools"))
import abjad  # noqa: E402
from extract_js_engine import extract_engine_source  # noqa: E402

NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="node not on PATH - parity check skipped, not failed")


def _corpus():
    """A fixed set of code points and strings chosen to exercise the exact
    logic that has drifted before: the FE70-FE74 typo, presentation-form
    expansion (U+FB50-FDFF, U+FE70-FEFF), the honorific exclusion set, and
    the explicit basmala-ligature expansion - plus the 28 base letters and
    the canonical worked example, so a regression in ordinary scoring is
    caught too, not only the presentation-form edge cases.
    """
    cps = list(range(0x0600, 0x0700)) + list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFF00))
    strings = [chr(c) for c in cps]
    strings.append("بسم الله الرحمن الرحيم")  # canonical worked example, grand=786
    strings.append("\uFDFD")  # basmala ligature - the case that first exposed the drift
    strings.append("محمد" + "".join(chr(c) for c in range(0xFE70, 0xFE75)))  # letters + presentation forms
    return strings


def _run_js_engine(strings):
    """Runs the extracted JS engine under node for every input, returns a
    list of `grand` totals in the same order. One `node -e` invocation for
    the whole corpus, not one per string - startup cost is paid once.
    """
    engine_src = extract_engine_source()
    driver = (
        engine_src
        + "\nconst inputs = JSON.parse(require('fs').readFileSync(0, 'utf8'));"
        + "\nconst out = inputs.map(s => analyze(s).grand);"
        + "\nprocess.stdout.write(JSON.stringify(out));"
    )
    result = subprocess.run(
        [NODE, "-e", driver],
        input=json.dumps(strings),
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError("node engine run failed:\n" + result.stderr)
    return json.loads(result.stdout)


def test_js_and_python_engines_agree_on_grand_total():
    strings = _corpus()
    js_totals = _run_js_engine(strings)
    py_totals = [abjad.compute_abjad(s)["grand"] for s in strings]

    disagreements = [
        (s, js, py)
        for s, js, py in zip(strings, js_totals, py_totals)
        if js != py
    ]
    assert not disagreements, (
        "%d of %d inputs disagree between index.html's JS engine and abjad.py "
        "(showing up to 10): %r"
        % (len(disagreements), len(strings), disagreements[:10])
    )


def test_js_and_python_agree_on_the_basmala_ligature():
    """The specific case that first exposed the 2026-08-30 divergence: scored
    0 by the stale Python port and 786 by the shipped page.
    """
    js_total = _run_js_engine(["\uFDFD"])[0]
    py_total = abjad.compute_abjad("\uFDFD")["grand"]
    assert js_total == py_total == 786
