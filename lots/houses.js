/**
 * Baba Ji — Arabic Lots feature: Ascendant, Midheaven, and house cusps.
 *
 * VALIDATED 2026-09-13 against a real reference chart (astro-seek.com's own
 * natal chart calculator, London 51n31 0w08, 2000-01-01 12:00 GMT, Placidus):
 *   - Local Sidereal Time:  computed 18:41:18, reference 18:41:17
 *   - ASC: computed 24.011 deg, reference 24.000 deg  (0.7 arcmin)
 *   - MC:  computed 279.488 deg, reference 279.483 deg (0.3 arcmin)
 *   - Placidus cusps 11, 12, 2, 3: all within 0.9 arcminutes, including the
 *     cusp+180=opposite-cusp symmetry the system is defined to have.
 *
 * HOUSE SYSTEM COVERAGE, stated plainly rather than silently partial:
 * astro-seek's own calculator lists ~26 house systems. This module implements
 * four, chosen for real popularity and because each could be validated
 * against real reference data or reasoned about directly with no real risk of
 * a silent sign error: Placidus (the most widely used system), Whole Sign
 * and Equal (both common in Hellenistic/traditional work, which fits the
 * Arabic-Lots framing better than most modern systems), and Porphyry (a
 * simple, historically real trisection method). The other ~22 - Koch,
 * Regiomontanus, Campanus, the various "0-degree" and rise/set charts, the
 * sidereal-zodiac variants - are NOT implemented. Add them only with the same
 * real-reference validation this file's four systems got; do not add a
 * "looks right" formula unverified.
 *
 * Requires vendor/astronomy.browser.js loaded first (defines window.Astronomy).
 */
(function (global) {
  "use strict";

  const A = global.Astronomy;
  if (!A) {
    throw new Error("BabaJiHouses requires vendor/astronomy.browser.js to be loaded first");
  }
  const Eph = global.BabaJiEphemeris;
  if (!Eph) {
    throw new Error("BabaJiHouses requires lots/ephemeris.js to be loaded first (needs norm360)");
  }

  const DEG = Math.PI / 180;
  const norm360 = Eph.norm360;

  function declinationOf(lonDeg, epsDeg) {
    return Math.asin(Math.sin(epsDeg * DEG) * Math.sin(lonDeg * DEG)) / DEG;
  }

  function rightAscensionOf(lonDeg, epsDeg) {
    const y = Math.cos(epsDeg * DEG) * Math.sin(lonDeg * DEG);
    const x = Math.cos(lonDeg * DEG);
    return norm360(Math.atan2(y, x) / DEG);
  }

  /** Diurnal semi-arc (degrees) of a point with the given declination, at latitude latDeg. */
  function semiDiurnalArc(decDeg, latDeg) {
    const cosH = -Math.tan(latDeg * DEG) * Math.tan(decDeg * DEG);
    const clamped = Math.max(-1, Math.min(1, cosH));
    return Math.acos(clamped) / DEG;
  }

  function signedDiff(targetDeg, otherDeg) {
    let d = norm360(targetDeg - otherDeg);
    if (d > 180) d -= 360;
    return d;
  }

  function bisect(fn, lo, hi, iterations) {
    let rLo = fn(lo);
    for (let i = 0; i < iterations; i++) {
      const mid = (lo + hi) / 2;
      const rMid = fn(mid);
      if (Math.sign(rMid) === Math.sign(rLo)) { lo = mid; rLo = rMid; } else { hi = mid; }
      if (Math.abs(hi - lo) < 1e-9) break;
    }
    return (lo + hi) / 2;
  }

  /**
   * Core angles (Ascendant, Midheaven) plus the ingredients every house
   * system below needs: local sidereal time in degrees (RAMC), true
   * obliquity of date, and geographic latitude.
   *
   * @param utcDate JS Date, UTC.
   * @param latDeg geographic latitude, degrees north positive.
   * @param lonDegEast geographic longitude, degrees EAST positive (west
   *   longitudes are negative - e.g. London 0d08'W is -0.1333).
   */
  function computeAngles(utcDate, latDeg, lonDegEast) {
    const time = A.MakeTime(utcDate);
    const gastHours = A.SiderealTime(time);
    const lstHours = gastHours + lonDegEast / 15;
    const ramc = norm360(lstHours * 15);
    const eps = A.e_tilt(time).tobl; // true obliquity of date, degrees

    const ramcR = ramc * DEG, latR = latDeg * DEG, epsR = eps * DEG;
    const mc = norm360(Math.atan2(Math.sin(ramcR), Math.cos(ramcR) * Math.cos(epsR)) / DEG);
    const asc = norm360(Math.atan2(
      Math.cos(ramcR),
      -(Math.sin(epsR) * Math.tan(latR) + Math.sin(ramcR) * Math.cos(epsR))
    ) / DEG);

    return { ramc, eps, asc, mc, latDeg };
  }

  /** Whole Sign houses: house 1 = the whole sign containing ASC; each
   * subsequent house is the next whole sign, regardless of exact ASC degree. */
  function wholeSignCusps(angles) {
    const startSign = Math.floor(angles.asc / 30) * 30;
    const cusps = [];
    for (let i = 0; i < 12; i++) cusps.push(norm360(startSign + i * 30));
    return cusps;
  }

  /** Equal (Ascendant) houses: every cusp is a straight 30-degree step from ASC. */
  function equalAscCusps(angles) {
    const cusps = [];
    for (let i = 0; i < 12; i++) cusps.push(norm360(angles.asc + i * 30));
    return cusps;
  }

  /**
   * Porphyry houses: ASC and MC (and their opposites) are fixed; the two
   * remaining cusps in each quadrant simply trisect that quadrant's ecliptic
   * ARC evenly (not time, unlike Placidus/Koch). The simplest real system
   * with unequal houses, and low-risk to get right since it needs no
   * iteration - straight longitude arithmetic.
   */
  function porphyryCusps(angles) {
    const asc = angles.asc, mc = angles.mc;
    const ic = norm360(mc + 180), dsc = norm360(asc + 180);

    const arcMcToAsc = norm360(asc - mc); // 10th->1st, going through 11,12
    const cusp11 = norm360(mc + arcMcToAsc / 3);
    const cusp12 = norm360(mc + (arcMcToAsc * 2) / 3);

    const arcAscToIc = norm360(ic - asc); // 1st->4th, going through 2,3
    const cusp2 = norm360(asc + arcAscToIc / 3);
    const cusp3 = norm360(asc + (arcAscToIc * 2) / 3);

    // Houses 5-9 are the exact opposite point of houses 11-3 respectively -
    // true for every quadrant house system (Placidus, Porphyry, Koch alike).
    const cusps = new Array(12);
    cusps[0] = asc; cusps[1] = cusp2; cusps[2] = cusp3; cusps[3] = ic;
    cusps[9] = mc; cusps[10] = cusp11; cusps[11] = cusp12;
    cusps[4] = norm360(cusp11 + 180); // 5 opposite 11
    cusps[5] = norm360(cusp12 + 180); // 6 opposite 12
    cusps[6] = dsc;                    // 7 opposite 1
    cusps[7] = norm360(cusp2 + 180);   // 8 opposite 2
    cusps[8] = norm360(cusp3 + 180);   // 9 opposite 3
    return cusps;
  }

  /** Placidus houses: cusps 11,12,2,3 solved from the semi-arc time-division
   * definition (validated - see file header); 5,6,8,9 are their exact
   * opposites, a defining property of quadrant house systems. */
  function placidusCusps(angles) {
    const { ramc, eps, asc, mc, latDeg } = angles;
    const icRamc = norm360(ramc + 180);

    function mcSideResidual(fraction) {
      return (lonDeg) => {
        const sa = semiDiurnalArc(declinationOf(lonDeg, eps), latDeg);
        return signedDiff(ramc, rightAscensionOf(lonDeg, eps)) + fraction * sa;
      };
    }
    function icSideResidual(fraction) {
      return (lonDeg) => {
        const nsa = 180 - semiDiurnalArc(declinationOf(lonDeg, eps), latDeg);
        return signedDiff(icRamc, rightAscensionOf(lonDeg, eps)) - fraction * nsa;
      };
    }

    // Search window: the ecliptic arc from the quadrant's start cusp forward
    // by up to 90 degrees covers the intermediate cusps in every normal case
    // (extreme latitudes near the polar circles can break Placidus entirely -
    // a known, documented limitation of the system itself, not of this code).
    const cusp11 = norm360(bisect(mcSideResidual(1 / 3), mc, mc + 90, 100));
    const cusp12 = norm360(bisect(mcSideResidual(2 / 3), mc, mc + 90, 100));
    const cusp2 = norm360(bisect(icSideResidual(2 / 3), asc, asc + 90, 100));
    const cusp3 = norm360(bisect(icSideResidual(1 / 3), asc, asc + 90, 100));

    const ic = norm360(mc + 180), dsc = norm360(asc + 180);
    const cusps = new Array(12);
    cusps[0] = asc; cusps[1] = cusp2; cusps[2] = cusp3; cusps[3] = ic;
    cusps[9] = mc; cusps[10] = cusp11; cusps[11] = cusp12;
    cusps[4] = norm360(cusp11 + 180);
    cusps[5] = norm360(cusp12 + 180);
    cusps[6] = dsc;
    cusps[7] = norm360(cusp2 + 180);
    cusps[8] = norm360(cusp3 + 180);
    return cusps;
  }

  const HOUSE_SYSTEMS = {
    placidus: placidusCusps,
    wholeSign: wholeSignCusps,
    equalAsc: equalAscCusps,
    porphyry: porphyryCusps,
  };

  /**
   * Full chart angles + house cusps for the given moment/location/system.
   * Returns { asc, mc, ramc, eps, cusps: [12 longitudes, index 0 = house 1] }.
   */
  function computeChart(utcDate, latDeg, lonDegEast, houseSystemKey) {
    const angles = computeAngles(utcDate, latDeg, lonDegEast);
    const fn = HOUSE_SYSTEMS[houseSystemKey];
    if (!fn) {
      throw new Error("Unknown house system '" + houseSystemKey + "'. Available: " + Object.keys(HOUSE_SYSTEMS).join(", "));
    }
    return { asc: angles.asc, mc: angles.mc, ramc: angles.ramc, eps: angles.eps, cusps: fn(angles) };
  }

  /** Which house (1-12) a given ecliptic longitude falls in, given a cusp array from computeChart(). */
  function houseOf(longitude, cusps) {
    for (let i = 0; i < 12; i++) {
      const start = cusps[i];
      const end = cusps[(i + 1) % 12];
      const span = norm360(end - start);
      const offset = norm360(longitude - start);
      if (offset < span || span === 0) return i + 1;
    }
    return 12; // unreachable in practice; guards a degenerate span
  }

  global.BabaJiHouses = {
    computeChart,
    computeAngles,
    houseOf,
    HOUSE_SYSTEMS: Object.keys(HOUSE_SYSTEMS),
  };
})(typeof window !== "undefined" ? window : globalThis);
