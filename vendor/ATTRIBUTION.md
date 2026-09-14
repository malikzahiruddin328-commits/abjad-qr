# Vendored third-party code

## astronomy.browser.js

- **Project:** Astronomy Engine by Don Cross
- **Source:** https://github.com/cosinekitty/astronomy
- **Version vendored:** 2.1.19
- **Fetched:** 2026-09-13, from `https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.js`
- **License:** MIT (confirmed via the npm registry metadata for this package
  and version at fetch time)

Used by `lots/ephemeris.js` for Sun/Moon/planet geocentric ecliptic
longitudes, sidereal time, and true obliquity of date. It is a UMD bundle
loaded with a plain `<script src>` tag - no build step, consistent with the
rest of this repo. It defines the global `window.Astronomy`.

## lots/chiron-ephemeris.json (not code, but externally sourced data)

- **Source:** NASA/JPL Horizons System (`https://ssd.jpl.nasa.gov/api/horizons.api`),
  object 2060 Chiron, geocentric ecliptic (J2000) vectors, small-body
  perturbers included (SB441-N16).
- **Fetched:** 2026-09-13, covering 1920-01-01 through 2100-01-01 at a 10-day
  step (6,575 points), converted to ecliptic longitude only.
- **License/terms:** JPL Horizons ephemeris data is a product of the US
  government (NASA/Caltech) and is public domain / free to use; see
  https://ssd.jpl.nasa.gov/policy.html.
- Used because astronomy-engine models only the Sun, Moon and 8 planets -
  Chiron needs its own source. See the accuracy note in `lots/ephemeris.js`
  for why this table is the primary path and a two-body Keplerian fallback
  exists for dates outside its range.
