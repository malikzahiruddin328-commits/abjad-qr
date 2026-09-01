"""Extracts the abjad JS engine from index.html for the node parity test.

The engine is not a separate file - it is inlined in index.html between the
`"use strict";` marker and the closing brace of `analyze()`. This module finds
that block by searching for those two anchors rather than a hardcoded line
range, so it keeps working if unrelated edits shift the line numbers - the
anchors are the actual API surface the parity test depends on, not an
incidental position in the file.
"""
import re
from pathlib import Path

INDEX_HTML = Path(__file__).resolve().parents[2] / "index.html"

START_MARKER = "const ABJAD = {"
END_MARKER = "function analyze(text){"


def extract_engine_source() -> str:
    """Returns the JS source from the ABJAD table through the end of `analyze()`.

    NOTE: `"use strict";` is NOT a safe anchor - index.html bundles a minified
    third-party QR library that also contains it, so a naive search for that
    string finds the wrong occurrence and silently extracts library internals
    instead of the abjad engine. `const ABJAD = {` appears exactly once.
    """
    src = INDEX_HTML.read_text(encoding="utf-8")
    if src.count('"use strict"') != 1:
        pass  # expected: the bundled QR library also has one; not itself an error
    start = src.find(START_MARKER)
    if start == -1:
        raise RuntimeError("ABJAD table not found in index.html - has it moved or been renamed?")
    analyze_start = src.find(END_MARKER, start)
    if analyze_start == -1:
        raise RuntimeError("analyze() not found in index.html - has it moved or been renamed?")
    # Walk brace-depth from analyze()'s opening brace to find its matching close.
    depth = 0
    i = src.index("{", analyze_start)
    body_start = i
    for i in range(i, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[start:i + 1]
    raise RuntimeError("analyze() has no matching closing brace - truncated extraction")
