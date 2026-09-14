/**
 * Baba Ji — Arabic Lots feature: ephemeris layer.
 *
 * Wraps vendor/astronomy.browser.js (Don Cross's astronomy-engine, MIT license)
 * to produce geocentric ecliptic-of-date longitudes for every point the Lots
 * formula composer can reference, in the same tropical-zodiac convention used
 * by every mainstream astrology tool.
 *
 * VALIDATED 2026-09-13 against a real, independent reference reading
 * (astro-seek.com's live "current planets" panel, for the same instant:
 * 2026-09-14T02:32:00Z). Every point below matched to within 1 arcminute,
 * except Mean Lilith (5 arcminutes - normal cross-source variance for that
 * specific point; see LOT_POINTS.meanLilith below).
 *
 * Requires vendor/astronomy.browser.js to be loaded first (defines window.Astronomy).
 */
(function (global) {
  "use strict";

  const A = global.Astronomy;
  if (!A) {
    throw new Error("BabaJiEphemeris requires vendor/astronomy.browser.js to be loaded first");
  }

  const DEG = Math.PI / 180;
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  function norm360(x) {
    return ((x % 360) + 360) % 360;
  }

  /** Converts an absolute ecliptic longitude (0-360) into {sign, degree, minute}. */
  function longitudeToSign(lon) {
    lon = norm360(lon);
    const signIndex = Math.floor(lon / 30) % 12;
    const withinSign = lon - signIndex * 30;
    const degree = Math.floor(withinSign);
    const minute = Math.round((withinSign - degree) * 60);
    return { sign: SIGNS[signIndex], signIndex, degree, minute, longitude: lon };
  }

  /**
   * Geocentric ecliptic-of-date longitude for a body astronomy-engine knows
   * about directly (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
   * Neptune, Pluto). NOT valid for the Moon (see moonLongitude) or Earth.
   */
  function bodyLongitude(bodyName, time) {
    const geoVec = A.GeoVector(bodyName, time, true); // true = correct for aberration
    return A.Ecliptic(geoVec).elon;
  }

  function moonLongitude(time) {
    // EclipticGeoMoon returns ecliptic-of-date directly (a dedicated lunar
    // routine, more precise than the generic GeoVector+Ecliptic path for the
    // Moon specifically) - .lon is degrees, matches the {sign} convention here.
    return A.EclipticGeoMoon(time).lon;
  }

  /**
   * Mean lunar ascending node - Meeus low-precision series (public-domain
   * astronomical formula, "Astronomical Algorithms" ch. 47-style; not
   * specific to any one astrology product).
   */
  function meanNodeLongitude(julianCenturiesTT) {
    const T = julianCenturiesTT;
    return norm360(
      125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
      + (T ** 3) / 467441 - (T ** 4) / 60616000
    );
  }

  /**
   * Mean lunar apogee ("mean Black Moon Lilith") - mean longitude of lunar
   * perigee + 180 deg, same Meeus-style low-precision series as the node.
   * Validated to +/-5 arcminutes against an independent reference - normal
   * cross-source variance for this specific point, since "mean Lilith" has
   * no single universally-agreed defining series across astrology software.
   */
  function meanLilithLongitude(julianCenturiesTT) {
    const T = julianCenturiesTT;
    const meanPerigee = norm360(
      83.3532465 + 4069.0137287 * T - 0.0103200 * T * T
      - (T ** 3) / 80053 + (T ** 4) / 18999000
    );
    return norm360(meanPerigee + 180);
  }

  function solveKepler(meanAnomalyRad, eccentricity) {
    let M = ((meanAnomalyRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let E = M;
    for (let i = 0; i < 50; i++) {
      const dE = (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  /**
   * Chiron. astronomy-engine only models the Sun/Moon/8 planets, so Chiron
   * needs its own source. Two approaches, in priority order:
   *
   * 1. PRIMARY - a vendored table of real, perturbed geocentric ecliptic
   *    longitudes from JPL Horizons (object 2060, small-body perturbers
   *    included: SB441-N16), 1920-01-01 through 2100-01-01 at a 10-day
   *    step, linearly interpolated. This is an authoritative n-body
   *    ephemeris, not an approximation - validated against Horizons' own
   *    daily output at 5' worst-case interpolation error (tested both in a
   *    smooth arc and near Chiron's 1996 perihelion, where curvature is
   *    highest). Covers essentially every realistic birth date.
   *
   *    The table stores J2000-EPOCH ecliptic longitude (Horizons'
   *    REF_SYSTEM=J2000), not ecliptic-OF-DATE. Every other point in this
   *    file gets its of-date conversion for free from `A.Ecliptic()`, which
   *    this table bypasses entirely (it stores a scalar, not a 3D vector),
   *    so the precession correction has to be applied explicitly - see
   *    `precessionCorrectionDeg`. MISSED THIS FIRST: validating only against
   *    a 2000-01-01 reference (a date one day from J2000 itself) passed by
   *    coincidence, at ~0 correction; a second reference date 26.7 years out
   *    exposed a 22.8 arcminute error, closed by adding this term.
   *
   * 2. FALLBACK - two-body Keplerian propagation from current osculating
   *    elements, for dates outside the vendored table's range. This IS an
   *    approximation and drifts from the true position over years, because
   *    Chiron's real orbit is perturbed by close passes to Saturn and
   *    Uranus that a two-body model cannot see. Measured directly: this
   *    method alone was off by 75 arcminutes for a date 26.7 years from its
   *    elements' epoch - real, non-trivial error, which is exactly why the
   *    table above is the primary path and this is the edge-case fallback.
   */
  let chironTable = null; // {startJD, stepDays, longitudes[]} - set via setChironTable()

  function setChironTable(table) {
    chironTable = table;
  }

  /**
   * IAU 1976 general precession in ecliptic longitude (Meeus ch. 21,
   * low-precision series) - converts a J2000.0-epoch ecliptic longitude to
   * mean-ecliptic-of-date. Nutation (~arcsecond level) is not included;
   * negligible for this feature's purpose.
   */
  function precessionCorrectionDeg(julianCenturiesTT) {
    const T = julianCenturiesTT;
    const arcsec = 5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T;
    return arcsec / 3600;
  }

  function chironFromTable(julianDateTDB) {
    if (!chironTable) return null;
    const { startJD, stepDays, longitudes } = chironTable;
    const endJD = startJD + stepDays * (longitudes.length - 1);
    if (julianDateTDB < startJD || julianDateTDB > endJD) return null;

    const index = (julianDateTDB - startJD) / stepDays;
    const lowIndex = Math.floor(index);
    const highIndex = Math.min(lowIndex + 1, longitudes.length - 1);
    const frac = index - lowIndex;

    const lowLon = longitudes[lowIndex];
    const highLon = longitudes[highIndex];
    // Shortest-path interpolation across the 0/360 wrap.
    const delta = norm360(highLon - lowLon + 180) - 180;
    const rawJ2000Lon = norm360(lowLon + delta * frac);

    const T = (julianDateTDB - 2451545.0) / 36525.0;
    return norm360(rawJ2000Lon + precessionCorrectionDeg(T));
  }

  const CHIRON_ELEMENTS_FALLBACK = {
    a: 13.68426760850124,        // semi-major axis, AU
    e: 0.3797656311453571,       // eccentricity
    i: 6.930574468846328,        // inclination, deg (ecliptic J2000)
    om: 209.2961258613147,       // longitude of ascending node, deg
    w: 339.2878326589729,        // argument of periapsis, deg
    ma: 216.7198966018106,       // mean anomaly at epoch, deg
    epochJD: 2461200.5,          // TDB Julian Date, fetched from JPL SBDB 2026-09-13
    n: 0.0194702593257484,       // mean motion, deg/day
  };

  function chironHelioVectorEclJ2000(elements, julianDateTDB) {
    const dt = julianDateTDB - elements.epochJD;
    const M = (elements.ma + elements.n * dt) * DEG;
    const E = solveKepler(M, elements.e);
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + elements.e) * Math.sin(E / 2),
      Math.sqrt(1 - elements.e) * Math.cos(E / 2)
    );
    const r = elements.a * (1 - elements.e * Math.cos(E));

    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    const wR = elements.w * DEG, iR = elements.i * DEG, omR = elements.om * DEG;
    const x1 = xOrb * Math.cos(wR) - yOrb * Math.sin(wR);
    const y1 = xOrb * Math.sin(wR) + yOrb * Math.cos(wR);

    const x2 = x1;
    const y2 = y1 * Math.cos(iR);
    const z2 = y1 * Math.sin(iR);

    const x3 = x2 * Math.cos(omR) - y2 * Math.sin(omR);
    const y3 = x2 * Math.sin(omR) + y2 * Math.cos(omR);
    const z3 = z2;

    return { x: x3, y: y3, z: z3 };
  }

  function chironFromKeplerFallback(time, julianDateTDB) {
    const earthHelioEqj = A.HelioVector("Earth", time);
    const chironHelioEclJ2000 = chironHelioVectorEclJ2000(CHIRON_ELEMENTS_FALLBACK, julianDateTDB);
    const chironHelioEqj = A.RotateVector(A.Rotation_ECL_EQJ(), { ...chironHelioEclJ2000, t: time });
    const chironGeoEqj = {
      x: chironHelioEqj.x - earthHelioEqj.x,
      y: chironHelioEqj.y - earthHelioEqj.y,
      z: chironHelioEqj.z - earthHelioEqj.z,
      t: time,
    };
    return A.Ecliptic(chironGeoEqj).elon;
  }

  function chironLongitude(time) {
    const julianDateTDB = time.tt + 2451545.0; // t.tt is DAYS SINCE J2000, not a full JD
    const fromTable = chironFromTable(julianDateTDB);
    if (fromTable !== null) return fromTable;
    return chironFromKeplerFallback(time, julianDateTDB);
  }

  const PLANET_BODIES = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

  /**
   * Computes ecliptic-of-date longitudes for every body/point this feature
   * supports, at the given JS Date (interpreted as UTC - convert local birth
   * time to UTC before calling). Returns { name: {longitude, sign, degree,
   * minute, retrograde} }. Retrograde is derived by comparing longitude now
   * vs +6 hours (cheap, accurate enough for direction - nobody needs
   * sub-arcsecond retrograde-station timing from this feature).
   */
  function computeAllLongitudes(utcDate) {
    const time = A.MakeTime(utcDate);
    const laterTime = A.MakeTime(new Date(utcDate.getTime() + 6 * 3600 * 1000));
    const julianCenturiesTT = time.tt / 36525.0;

    const raw = {};
    raw.Sun = bodyLongitude("Sun", time);
    raw.Moon = moonLongitude(time);
    for (const body of PLANET_BODIES) {
      raw[body] = bodyLongitude(body, time);
    }
    raw.MeanNode = meanNodeLongitude(julianCenturiesTT);
    raw.SouthNode = norm360(raw.MeanNode + 180);
    raw.MeanLilith = meanLilithLongitude(julianCenturiesTT);
    raw.Chiron = chironLongitude(time);

    const rawLater = {};
    rawLater.Sun = bodyLongitude("Sun", laterTime);
    rawLater.Moon = moonLongitude(laterTime);
    for (const body of PLANET_BODIES) {
      rawLater[body] = bodyLongitude(body, laterTime);
    }
    rawLater.Chiron = chironLongitude(laterTime);
    // Mean Node/Lilith retrograde motion is a defining property of the mean
    // point itself (Node is ALWAYS "retrograde" by convention/definition),
    // not something to derive from a 6-hour delta.

    const result = {};
    for (const name of Object.keys(raw)) {
      const info = longitudeToSign(raw[name]);
      let retrograde = null;
      if (name === "MeanNode" || name === "SouthNode") {
        retrograde = true; // mean node always regresses, by definition
      } else if (Object.prototype.hasOwnProperty.call(rawLater, name)) {
        const delta = norm360(rawLater[name] - raw[name] + 180) - 180; // signed shortest delta
        retrograde = delta < 0;
      }
      result[name] = { ...info, retrograde };
    }
    return result;
  }

  global.BabaJiEphemeris = {
    computeAllLongitudes,
    longitudeToSign,
    setChironTable,
    norm360,
    SIGNS,
  };
})(typeof window !== "undefined" ? window : globalThis);
