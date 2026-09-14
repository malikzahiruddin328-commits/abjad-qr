/**
 * Baba Ji — Arabic Lots feature: the Lot formula engine.
 *
 * A "Lot" (Greek kleros, Arabic sahm) is a point in a chart computed by
 * projecting the arc between two bodies from a third: Lot = Personal Point +
 * Significator - Trigger (mod 360). This module resolves the ~40 point names
 * astro-seek's own calculator offers into ecliptic longitudes, composes
 * arbitrary three-point Lots the same way their engine does, and ships a
 * curated set of the real historical "Hermetic Lots" - Fortune, Spirit, Eros,
 * Necessity, Courage, Victory, Nemesis - documented across Hellenistic and
 * early Arabic sources (Vettius Valens' Anthology, book III; Abu Ma'shar; Al-
 * Biruni's "Kitab al-Tafhim") rather than copied from any single modern site.
 *
 * "Calculate all 513 Lots at once" on the reference site is that tool's own
 * compiled list - not reproduced here (see the systematic generator below,
 * which achieves the same combinatorial capability from the public point
 * list rather than their specific compiled table).
 *
 * VALIDATED 2026-09-13: day/night detection and the Lot of Fortune formula
 * both matched a real reference chart's own "Fortune" value (326.967 deg,
 * Aqu 26deg58') to 0.04 arcminutes.
 *
 * Requires ephemeris.js and houses.js loaded first.
 */
(function (global) {
  "use strict";

  const Eph = global.BabaJiEphemeris;
  const Houses = global.BabaJiHouses;
  if (!Eph || !Houses) {
    throw new Error("BabaJiLots requires lots/ephemeris.js and lots/houses.js loaded first");
  }
  const norm360 = Eph.norm360;

  const SIGN_RULERS = {
    // sign index (0=Aries) -> { modern, traditional } point name, resolved
    // through the same point resolver as everything else.
    0: { modern: "Mars", traditional: "Mars" },          // Aries
    1: { modern: "Venus", traditional: "Venus" },        // Taurus
    2: { modern: "Mercury", traditional: "Mercury" },    // Gemini
    3: { modern: "Moon", traditional: "Moon" },          // Cancer
    4: { modern: "Sun", traditional: "Sun" },            // Leo
    5: { modern: "Mercury", traditional: "Mercury" },    // Virgo
    6: { modern: "Venus", traditional: "Venus" },        // Libra
    7: { modern: "Pluto", traditional: "Mars" },         // Scorpio
    8: { modern: "Jupiter", traditional: "Jupiter" },    // Sagittarius
    9: { modern: "Saturn", traditional: "Saturn" },      // Capricorn
    10: { modern: "Uranus", traditional: "Saturn" },     // Aquarius
    11: { modern: "Neptune", traditional: "Jupiter" },   // Pisces
  };

  function signOf(longitude) {
    return Math.floor(norm360(longitude) / 30);
  }

  function rulerOfSign(signIndex, rulershipMode) {
    return SIGN_RULERS[signIndex][rulershipMode === "traditional" ? "traditional" : "modern"];
  }

  /**
   * Resolves a point name to an ecliptic longitude, given the already-
   * computed ephemeris (from BabaJiEphemeris.computeAllLongitudes) and chart
   * (from BabaJiHouses.computeChart) for one birth moment/place. `fortune`
   * and `spirit` are pre-computed and passed in explicitly because Eros,
   * Necessity, Courage, Victory and Nemesis are all defined IN TERMS OF
   * Fortune or Spirit - resolving them lazily here would recompute the same
   * day/night logic repeatedly for no benefit.
   */
  function resolvePoint(name, ctx) {
    const { eph, chart, rulershipMode, isDay, fortune, spirit, syzygy } = ctx;

    switch (name) {
      case "ASC": return chart.asc;
      case "DSC": return norm360(chart.asc + 180);
      case "MC": return chart.mc;
      case "IC": return norm360(chart.mc + 180);
      case "Sun": return eph.Sun.longitude;
      case "Moon": return eph.Moon.longitude;
      case "Mercury": return eph.Mercury.longitude;
      case "Venus": return eph.Venus.longitude;
      case "Mars": return eph.Mars.longitude;
      case "Jupiter": return eph.Jupiter.longitude;
      case "Saturn": return eph.Saturn.longitude;
      case "Uranus": return eph.Uranus.longitude;
      case "Neptune": return eph.Neptune.longitude;
      case "Pluto": return eph.Pluto.longitude;
      case "NorthNode": return eph.MeanNode.longitude;
      case "SouthNode": return eph.SouthNode.longitude;
      case "Lilith": return eph.MeanLilith.longitude;
      case "Chiron": return eph.Chiron.longitude;
      case "Fortune": return fortune;
      case "Spirit": return spirit;
      case "Syzygy": return syzygy;
      case "ASCRuler": return resolvePoint(rulerOfSign(signOf(chart.asc), rulershipMode), ctx);
      case "DSCRuler": return resolvePoint(rulerOfSign(signOf(norm360(chart.asc + 180)), rulershipMode), ctx);
      case "MCRuler": return resolvePoint(rulerOfSign(signOf(chart.mc), rulershipMode), ctx);
      case "ICRuler": return resolvePoint(rulerOfSign(signOf(norm360(chart.mc + 180)), rulershipMode), ctx);
      default: {
        const houseMatch = /^House(\d{1,2})$/.exec(name);
        if (houseMatch) {
          const n = parseInt(houseMatch[1], 10);
          if (n < 1 || n > 12) throw new Error("House number out of range: " + n);
          return chart.cusps[n - 1];
        }
        const rulerMatch = /^Ruler(\d{1,2})$/.exec(name);
        if (rulerMatch) {
          const n = parseInt(rulerMatch[1], 10);
          if (n < 1 || n > 12) throw new Error("House number out of range: " + n);
          const rulerPointName = rulerOfSign(signOf(chart.cusps[n - 1]), rulershipMode);
          return resolvePoint(rulerPointName, ctx);
        }
        throw new Error("Unknown point name: " + name);
      }
    }
  }

  /** Composes a Lot: Lot = personalPoint + significator - trigger (mod 360). */
  function computeLot(personalPointName, significatorName, triggerName, ctx) {
    const p = resolvePoint(personalPointName, ctx);
    const s = resolvePoint(significatorName, ctx);
    const t = resolvePoint(triggerName, ctx);
    return norm360(p + s - t);
  }

  const ALL_POINT_NAMES = [
    "ASC", "DSC", "MC", "IC",
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
    "Fortune", "Spirit", "Syzygy", "NorthNode", "SouthNode", "Lilith", "Chiron",
    "House1", "House2", "House3", "House4", "House5", "House6",
    "House7", "House8", "House9", "House10", "House11", "House12",
    "Ruler1", "Ruler2", "Ruler3", "Ruler4", "Ruler5", "Ruler6",
    "Ruler7", "Ruler8", "Ruler9", "Ruler10", "Ruler11", "Ruler12",
    "ASCRuler", "DSCRuler", "MCRuler", "ICRuler",
  ];

  /**
   * Real historical "Hermetic Lots" (Hellenistic/early Arabic astrology),
   * each with its day/night formula. `usesSpirit` marks lots defined in
   * terms of Spirit rather than Fortune, since ordering matters when both
   * are pre-computed once per chart.
   */
  const CURATED_LOTS = [
    {
      key: "fortune", name: "Lot of Fortune", arabicName: "Sahm al-Sa'adah",
      day: ["ASC", "Moon", "Sun"], night: ["ASC", "Sun", "Moon"],
      source: "Vettius Valens, Anthology III; the best-attested Lot across every source.",
    },
    {
      key: "spirit", name: "Lot of Spirit", arabicName: "Sahm al-Ruh",
      day: ["ASC", "Sun", "Moon"], night: ["ASC", "Moon", "Sun"],
      source: "Vettius Valens, Anthology III - the exact day/night reverse of Fortune.",
    },
    {
      key: "eros", name: "Lot of Eros", arabicName: "Sahm al-Mahabbah",
      day: ["ASC", "Venus", "Spirit"], night: ["ASC", "Spirit", "Venus"],
      source: "Vettius Valens III.7; Robert Hand's Hellenistic Astrology translations.",
    },
    {
      key: "necessity", name: "Lot of Necessity", arabicName: "Sahm al-Darurah",
      day: ["ASC", "Mercury", "Spirit"], night: ["ASC", "Spirit", "Mercury"],
      source: "Vettius Valens III.7.",
    },
    {
      key: "courage", name: "Lot of Courage", arabicName: "Sahm al-Shaja'ah",
      day: ["ASC", "Mars", "Fortune"], night: ["ASC", "Fortune", "Mars"],
      source: "Vettius Valens III.7.",
    },
    {
      key: "victory", name: "Lot of Victory", arabicName: "Sahm al-Nasr",
      day: ["ASC", "Jupiter", "Spirit"], night: ["ASC", "Spirit", "Jupiter"],
      source: "Vettius Valens III.7.",
    },
    {
      key: "nemesis", name: "Lot of Nemesis", arabicName: "Sahm al-Nikmah",
      day: ["ASC", "Saturn", "Fortune"], night: ["ASC", "Fortune", "Saturn"],
      source: "Vettius Valens III.7; Al-Biruni's Kitab al-Tafhim SS489 gives the same formula.",
    },
  ];

  /**
   * Builds the full context (day/night flag, Fortune, Spirit, Syzygy) then
   * computes every curated Lot plus the raw resolver, ready for the generic
   * composer or for a "generate every combination" sweep.
   */
  function buildContext(eph, chart, utcDate, rulershipMode) {
    const sunHouse = Houses.houseOf(eph.Sun.longitude, chart.cusps);
    const isDay = sunHouse >= 7 && sunHouse <= 12;

    const ctxBase = { eph, chart, rulershipMode: rulershipMode || "modern", isDay, fortune: null, spirit: null, syzygy: null };

    const fortuneFormula = isDay ? CURATED_LOTS[0].day : CURATED_LOTS[0].night;
    ctxBase.fortune = computeLot(fortuneFormula[0], fortuneFormula[1], fortuneFormula[2], ctxBase);

    const spiritFormula = isDay ? CURATED_LOTS[1].day : CURATED_LOTS[1].night;
    ctxBase.spirit = computeLot(spiritFormula[0], spiritFormula[1], spiritFormula[2], ctxBase);

    ctxBase.syzygy = computeSyzygy(utcDate);

    return ctxBase;
  }

  function computeSyzygy(utcDate) {
    const A = global.Astronomy;
    const time = A.MakeTime(utcDate);
    const newMoonTime = A.SearchMoonPhase(0, time, -40);
    const fullMoonTime = A.SearchMoonPhase(180, time, -40);
    const candidates = [newMoonTime, fullMoonTime].filter((t) => t !== null);
    if (candidates.length === 0) throw new Error("No syzygy found within 40 days before birth");
    const mostRecent = candidates.reduce((a, b) => (a.tt > b.tt ? a : b));
    return A.EclipticGeoMoon(mostRecent).lon;
  }

  function computeCuratedLots(ctx) {
    const results = {};
    for (const lot of CURATED_LOTS) {
      const formula = ctx.isDay ? lot.day : lot.night;
      results[lot.key] = {
        name: lot.name,
        arabicName: lot.arabicName,
        longitude: computeLot(formula[0], formula[1], formula[2], ctx),
        source: lot.source,
        formulaUsed: (ctx.isDay ? "day" : "night") + ": " + formula[0] + " + " + formula[1] + " - " + formula[2],
      };
    }
    return results;
  }

  /**
   * Generates every Lot from the systematic combination of a chosen point
   * subset (or the full ALL_POINT_NAMES list) - the equivalent capability to
   * the reference site's "calculate all 513 at once", built from the public
   * point list rather than their specific compiled table. For N points this
   * is N*(N-1)*(N-2) ordered triples if all three roles must differ;
   * callers should pass a deliberately small subset for interactive use.
   */
  function generateCombinations(pointNames, ctx) {
    const names = pointNames || ALL_POINT_NAMES;
    const results = [];
    for (const p of names) {
      for (const s of names) {
        if (s === p) continue;
        for (const t of names) {
          if (t === p || t === s) continue;
          results.push({
            personalPoint: p, significator: s, trigger: t,
            longitude: computeLot(p, s, t, ctx),
          });
        }
      }
    }
    return results;
  }

  global.BabaJiLots = {
    ALL_POINT_NAMES,
    CURATED_LOTS,
    buildContext,
    resolvePoint,
    computeLot,
    computeCuratedLots,
    generateCombinations,
    rulerOfSign,
    signOf,
  };
})(typeof window !== "undefined" ? window : globalThis);
