/**
 * Baba Ji — Arabic Lots feature: the visual chart wheel.
 *
 * Draws the birth chart as an SVG wheel: the 12 zodiac signs as an outer
 * ring, the 12 house cusps as spokes, the Ascendant/Midheaven/Descendant/IC
 * as the four angles, the seven classical planets (Sun through Saturn — the
 * same "visible to the naked eye" set that has real classical Arabic names;
 * see ui.js's POINT_LABELS comment), and the two foundational Lots (Fortune
 * and Spirit, from which the other five curated Lots are all derived) as
 * markers.
 *
 * Placement uses PURE ecliptic-longitude mapping from the Ascendant, not the
 * "stretch every quadrant to exactly 90 degrees of screen angle" trick some
 * chart software uses. Pure mapping is the more honest choice for this app:
 * it actually shows an unequal-house system's unequal houses as unequal
 * wedges, rather than artificially forcing the Midheaven to the top of the
 * wheel regardless of its true angular distance from the Ascendant.
 *
 * Requires ephemeris.js (for norm360) loaded first. Independent of houses.js
 * and lots.js at the call site — this module only ever reads already-computed
 * longitudes out of the eph/chart/ctx objects those modules produce; it does
 * no astronomy of its own.
 */
(function (global) {
  "use strict";

  const Eph = global.BabaJiEphemeris;
  if (!Eph) {
    throw new Error("BabaJiChartWheel requires lots/ephemeris.js loaded first (needs norm360)");
  }
  const norm360 = Eph.norm360;

  const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
  const SIGN_LABELS_ISLAMIC = ["Hamal", "Thawr", "Jawza", "Saratan", "Asad", "Sunbulah",
    "Mizan", "Aqrab", "Qaws", "Jady", "Dalw", "Hut"];
  const SIGN_LABELS_WESTERN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  // Layout constants (SVG user units; viewBox is 0 0 440 440).
  const CX = 220, CY = 220;
  const R_OUTER = 208, R_ZODIAC_IN = 176, R_HOUSE_LINE = 176, R_CUSP_LABEL = 190;
  const R_PLANET = 150, R_PLANET_INNER = 128, R_LOT = 108, R_ANGLE_LABEL = 214;

  const PLANET_ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  const PLANET_GLYPHS = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄" };

  function toXY(longitudeDeg, ascLongitudeDeg, radius) {
    const thetaDeg = 180 + norm360(longitudeDeg - ascLongitudeDeg);
    const theta = (thetaDeg * Math.PI) / 180;
    return { x: CX + radius * Math.cos(theta), y: CY - radius * Math.sin(theta) };
  }

  function polarLine(longitudeDeg, ascLongitudeDeg, rInner, rOuter, extra) {
    const a = toXY(longitudeDeg, ascLongitudeDeg, rInner);
    const b = toXY(longitudeDeg, ascLongitudeDeg, rOuter);
    return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" ${extra || ""}/>`;
  }

  /** Spreads out labels that would otherwise land on top of each other: any
   * two points within CLOSE_DEG of one another (by absolute longitude
   * difference from the Ascendant) get pushed to alternating radii. Simple
   * and real, not a placeholder — a birth chart legitimately can put two
   * planets a couple of degrees apart, and stacked text is unreadable. */
  function spreadRadii(points, baseRadius, step, closeDeg) {
    const sorted = points.slice().sort((a, b) => a.deltaLon - b.deltaLon);
    let lastDelta = null, toggle = 0;
    return sorted.map((p) => {
      if (lastDelta !== null && Math.abs(p.deltaLon - lastDelta) < closeDeg) {
        toggle = 1 - toggle;
      } else {
        toggle = 0;
      }
      lastDelta = p.deltaLon;
      return { ...p, radius: baseRadius - toggle * step };
    });
  }

  /**
   * Renders the wheel into `containerEl` (replaces its contents).
   * @param eph        from BabaJiEphemeris.computeAllLongitudes
   * @param chart      from BabaJiHouses.computeChart ({ asc, mc, cusps })
   * @param ctx        from BabaJiLots.buildContext ({ fortune, spirit, ... })
   * @param framing    "islamic" | "western" — which sign names/labels to show
   */
  function render(containerEl, { eph, chart, ctx, framing }) {
    const asc = chart.asc;
    const signLabels = framing === "islamic" ? SIGN_LABELS_ISLAMIC : SIGN_LABELS_WESTERN;

    // --- Zodiac ring: 12 alternating wedges + sign glyph + sign name ---
    let zodiacSvg = "";
    for (let s = 0; s < 12; s++) {
      const signStartLon = s * 30;
      const a0 = toXY(signStartLon, asc, R_OUTER);
      const a1 = toXY(signStartLon, asc, R_ZODIAC_IN);
      const b0 = toXY(signStartLon + 30, asc, R_OUTER);
      const b1 = toXY(signStartLon + 30, asc, R_ZODIAC_IN);
      const large = 0; // each wedge is exactly 30 degrees, always the minor arc
      const sweepOuter = 0; // clockwise-decreasing theta => sweep flag 0 for our orientation
      const fill = s % 2 === 0 ? "var(--panel2, #fafaf8)" : "var(--panel, #ffffff)";
      zodiacSvg += `<path d="M ${a0.x.toFixed(2)} ${a0.y.toFixed(2)}
        A ${R_OUTER} ${R_OUTER} 0 ${large} ${sweepOuter} ${b0.x.toFixed(2)} ${b0.y.toFixed(2)}
        L ${b1.x.toFixed(2)} ${b1.y.toFixed(2)}
        A ${R_ZODIAC_IN} ${R_ZODIAC_IN} 0 ${large} ${1 - sweepOuter} ${a1.x.toFixed(2)} ${a1.y.toFixed(2)}
        Z" fill="${fill}" stroke="var(--line, #e0d5c7)" stroke-width="1"/>`;

      const mid = toXY(signStartLon + 15, asc, (R_OUTER + R_ZODIAC_IN) / 2 + 10);
      const midLabel = toXY(signStartLon + 15, asc, (R_OUTER + R_ZODIAC_IN) / 2 - 12);
      zodiacSvg += `<text x="${mid.x.toFixed(2)}" y="${mid.y.toFixed(2)}" font-size="15" text-anchor="middle" dominant-baseline="middle" fill="var(--accent2, #c85a3a)">${SIGN_GLYPHS[s]}</text>`;
      zodiacSvg += `<text x="${midLabel.x.toFixed(2)}" y="${midLabel.y.toFixed(2)}" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="var(--muted, #999)">${signLabels[s]}</text>`;
    }

    // --- House cusp spokes (all 12) + house numbers ---
    let houseSvg = "";
    for (let h = 0; h < 12; h++) {
      const lon = chart.cusps[h];
      const isAngle = h === 0 || h === 3 || h === 6 || h === 9; // ASC/IC/DSC/MC
      houseSvg += polarLine(lon, asc, 0, R_HOUSE_LINE, isAngle
        ? 'stroke="var(--ink, #1a3a52)" stroke-width="2"'
        : 'stroke="var(--line, #e0d5c7)" stroke-width="1"');
      const numPos = toXY(lon + 8, asc, R_HOUSE_LINE - 20);
      houseSvg += `<text x="${numPos.x.toFixed(2)}" y="${numPos.y.toFixed(2)}" font-size="9" text-anchor="middle" fill="var(--muted, #999)">${h + 1}</text>`;
    }

    // --- Angle labels (ASC/MC/DSC/IC) ---
    const angleDefs = [
      { lon: chart.asc, key: "ASC" },
      { lon: chart.mc, key: "MC" },
      { lon: norm360(chart.asc + 180), key: "DSC" },
      { lon: norm360(chart.mc + 180), key: "IC" },
    ];
    let angleSvg = angleDefs.map((a) => {
      const p = toXY(a.lon, asc, R_ANGLE_LABEL);
      return `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="var(--ink, #1a3a52)">${a.key}</text>`;
    }).join("");

    // --- Planets (7 classical), with simple collision spreading ---
    const planetPoints = PLANET_ORDER.filter((name) => eph[name]).map((name) => {
      const lon = eph[name].longitude;
      return { name, lon, deltaLon: norm360(lon - asc) };
    });
    const spreadPlanets = spreadRadii(planetPoints, R_PLANET, 22, 6);
    let planetSvg = spreadPlanets.map((p) => {
      const tick = toXY(p.lon, asc, R_HOUSE_LINE);
      const dot = toXY(p.lon, asc, p.radius);
      const glyphPos = toXY(p.lon, asc, p.radius);
      return `<line x1="${tick.x.toFixed(2)}" y1="${tick.y.toFixed(2)}" x2="${dot.x.toFixed(2)}" y2="${dot.y.toFixed(2)}" stroke="var(--line, #e0d5c7)" stroke-width="1"/>
        <circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="11" fill="var(--panel, #fff)" stroke="var(--accent2, #c85a3a)" stroke-width="1.5"/>
        <text x="${glyphPos.x.toFixed(2)}" y="${glyphPos.y.toFixed(2)}" font-size="13" text-anchor="middle" dominant-baseline="middle" fill="var(--ink, #1a3a52)">${PLANET_GLYPHS[p.name]}</text>`;
    }).join("");

    // --- Fortune + Spirit (the two foundational Lots) ---
    const lotDefs = [
      { lon: ctx.fortune, label: framing === "islamic" ? "Sa" : "Fo", full: framing === "islamic" ? "Sahm al-Sa'adah" : "Lot of Fortune" },
      { lon: ctx.spirit, label: framing === "islamic" ? "Ru" : "Sp", full: framing === "islamic" ? "Sahm al-Ruh" : "Lot of Spirit" },
    ];
    let lotSvg = lotDefs.map((l) => {
      const p = toXY(l.lon, asc, R_LOT);
      return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="12" fill="var(--accent, #d4a574)" stroke="var(--ink, #1a3a52)" stroke-width="1"><title>${l.full}</title></circle>
        <text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" font-size="9" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="var(--ink, #1a3a52)">${l.label}</text>`;
    }).join("");

    containerEl.innerHTML = `
      <svg viewBox="0 0 440 440" width="100%" style="max-width:440px;display:block;margin:0 auto" role="img" aria-label="Birth chart wheel">
        <circle cx="${CX}" cy="${CY}" r="${R_OUTER}" fill="none" stroke="var(--line, #e0d5c7)" stroke-width="1"/>
        <circle cx="${CX}" cy="${CY}" r="${R_PLANET_INNER}" fill="none" stroke="var(--line, #e0d5c7)" stroke-width="1"/>
        ${zodiacSvg}
        ${houseSvg}
        ${angleSvg}
        ${planetSvg}
        ${lotSvg}
      </svg>
      <p class="small muted" style="text-align:center;margin:10px 0 0">
        ☉ ☽ ☿ ♀ ♂ ♃ ♄ = Sun through Saturn. The two gold dots are
        ${framing === "islamic" ? "Sahm al-Sa'adah (Sa) and Sahm al-Ruh (Ru)" : "Lot of Fortune (Fo) and Lot of Spirit (Sp)"}
        — the other five Lots are listed below with their exact positions.
      </p>
    `;
  }

  global.BabaJiChartWheel = { render };
})(typeof window !== "undefined" ? window : globalThis);
