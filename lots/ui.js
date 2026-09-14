/**
 * Baba Ji — Arabic Lots tab: wiring, not astronomy. All the real computation
 * lives in ephemeris.js / houses.js / lots.js; this file lazy-loads them,
 * builds the panel markup, resolves a birth city to coordinates, and renders
 * results. Kept as its own file rather than appended to index.html's already
 * large inline script, matching how the rest of this app splits real logic
 * into services-*.js files.
 */
(function () {
  "use strict";

  const PANEL = document.getElementById("panel-lots");
  const TOP_TAB_GENERATOR = document.getElementById("topT1");
  const TOP_TAB_LOTS = document.getElementById("topT2");
  const PANEL_GENERATOR = document.getElementById("panel-generator");

  let engineLoaded = false;
  let engineLoadPromise = null;
  let framing = "islamic"; // default per Zahir's 2026-09-13 ruling; "western" is the toggle

  /**
   * Real classical Arabic names for the planets (Shams, Qamar, 'Utarid,
   * Zuhrah, Mirrikh, Mushtari, Zuhal) and for the lunar nodes (Al-Ra's/
   * Al-Dhanab, "the head/tail" - genuinely attested in historical Arabic
   * astrological texts) - not invented for this feature. Uranus, Neptune,
   * Pluto and Chiron have no classical Arabic name (all discovered centuries
   * after classical Islamic astronomy); both framings show the same label.
   */
  const POINT_LABELS = {
    ASC: { islamic: "Rising Point (Taliʿ)", western: "Ascendant (ASC)" },
    DSC: { islamic: "Setting Point", western: "Descendant (DSC)" },
    MC: { islamic: "Midheaven (Wasat al-Sama)", western: "Midheaven (MC)" },
    IC: { islamic: "Lower Heaven (IC)", western: "Imum Coeli (IC)" },
    Sun: { islamic: "Sun (Shams)", western: "Sun" },
    Moon: { islamic: "Moon (Qamar)", western: "Moon" },
    Mercury: { islamic: "Mercury (ʿUtarid)", western: "Mercury" },
    Venus: { islamic: "Venus (Zuhrah)", western: "Venus" },
    Mars: { islamic: "Mars (Mirrikh)", western: "Mars" },
    Jupiter: { islamic: "Jupiter (Mushtari)", western: "Jupiter" },
    Saturn: { islamic: "Saturn (Zuhal)", western: "Saturn" },
    Uranus: { islamic: "Uranus", western: "Uranus" },
    Neptune: { islamic: "Neptune", western: "Neptune" },
    Pluto: { islamic: "Pluto", western: "Pluto" },
    NorthNode: { islamic: "Ascending Node (Al-Ra's)", western: "North Node" },
    SouthNode: { islamic: "Descending Node (Al-Dhanab)", western: "South Node" },
    Lilith: { islamic: "Black Moon (Lilith)", western: "Lilith" },
    Chiron: { islamic: "Chiron", western: "Chiron" },
    Fortune: { islamic: "Sahm al-Saʿadah (Fortune)", western: "Lot of Fortune" },
    Spirit: { islamic: "Sahm al-Ruh (Spirit)", western: "Lot of Spirit" },
    Syzygy: { islamic: "Prenatal Ijtimaʿ/Istiqbal", western: "Syzygy" },
    ASCRuler: { islamic: "Ruler of the Rising Point", western: "Ruler of ASC" },
    DSCRuler: { islamic: "Ruler of the Setting Point", western: "Ruler of DSC" },
    MCRuler: { islamic: "Ruler of the Midheaven", western: "Ruler of MC" },
    ICRuler: { islamic: "Ruler of the Lower Heaven", western: "Ruler of IC" },
  };
  for (let i = 1; i <= 12; i++) {
    POINT_LABELS["House" + i] = { islamic: "Bayt " + i + " (House " + i + ")", western: "House " + i };
    POINT_LABELS["Ruler" + i] = { islamic: "Ruler of Bayt " + i, western: "Ruler of House " + i };
  }

  function pointLabel(name) {
    const l = POINT_LABELS[name];
    return l ? l[framing] : name;
  }

  const SIGN_LABELS_ISLAMIC = ["Hamal", "Thawr", "Jawza", "Saratan", "Asad", "Sunbulah",
    "Mizan", "Aqrab", "Qaws", "Jady", "Dalw", "Hut"];
  const SIGN_LABELS_WESTERN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  function formatDegree(longitude) {
    const info = window.BabaJiEphemeris.longitudeToSign(longitude);
    const signName = (framing === "islamic" ? SIGN_LABELS_ISLAMIC : SIGN_LABELS_WESTERN)[info.signIndex];
    return info.degree + "°" + String(info.minute).padStart(2, "0") + "' " + signName;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  function loadEngine() {
    if (engineLoadPromise) return engineLoadPromise;
    engineLoadPromise = loadScript("vendor/astronomy.browser.js")
      .then(() => loadScript("lots/ephemeris.js"))
      .then(() => loadScript("lots/houses.js"))
      .then(() => loadScript("lots/lots.js"))
      .then(() => fetch("lots/chiron-ephemeris.json").then((r) => r.json()))
      .then((chironTable) => {
        window.BabaJiEphemeris.setChironTable(chironTable);
        engineLoaded = true;
      });
    return engineLoadPromise;
  }

  /** Open-Meteo geocoding - free, no key, CORS-open (verified 2026-09-13).
   * Returns { latitude, longitude, timezone, name, country } for the best
   * match, or null if nothing was found. */
  async function geocodeCity(query) {
    const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name="
      + encodeURIComponent(query);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding request failed: " + res.status);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const r = data.results[0];
    return {
      latitude: r.latitude, longitude: r.longitude, timezone: r.timezone,
      name: r.name, country: r.country,
    };
  }

  /** IANA-zone-aware conversion of a local wall-clock date/time to UTC,
   * using the browser's own Intl time zone database (handles historical DST
   * correctly with zero vendored data - see ephemeris.js header for why this
   * needs no separate tz-lookup step when Open-Meteo already returns a zone
   * name). Works by bisecting: guess a UTC instant, format it back into the
   * target zone, adjust until the wall-clock time matches. */
  function localToUTC(dateStr, timeStr, timeZone) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const targetWall = { y, m, d, hh, mm };

    function wallInZone(utcMillis) {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const parts = dtf.formatToParts(new Date(utcMillis));
      const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
      return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour") % 24, mm: get("minute") };
    }

    // Initial guess: treat the wall time as if it were UTC, then correct.
    let guess = Date.UTC(y, m - 1, d, hh, mm);
    for (let i = 0; i < 5; i++) {
      const wall = wallInZone(guess);
      const wallMillis = Date.UTC(wall.y, wall.m - 1, wall.d, wall.hh, wall.mm);
      const targetMillis = Date.UTC(targetWall.y, targetWall.m - 1, targetWall.d, targetWall.hh, targetWall.mm);
      const diff = targetMillis - wallMillis;
      if (diff === 0) break;
      guess += diff;
    }
    return new Date(guess);
  }

  function renderPanel() {
    PANEL.innerHTML = `
      <span class="lots-eyebrow">Sahm — the classical Arabic point system</span>
      <h1>Arabic Lots</h1>
      <p class="sub">Points derived from the positions of the Rising Point, Sun, Moon and planets — a real technique used in classical Arabic and Hellenistic astronomy.</p>

      <div class="framing-toggle" role="group" aria-label="Terminology">
        <button type="button" data-framing="islamic" aria-pressed="true">Arabic tradition</button>
        <button type="button" data-framing="western" aria-pressed="false">Western astrology terms</button>
      </div>

      <div class="card">
        <h2>Birth details</h2>
        <div class="birth-form">
          <div><label for="lotsDob">Date of birth</label><input type="date" id="lotsDob"></div>
          <div><label for="lotsTime">Time (local, 24h)</label><input type="time" id="lotsTime" value="12:00"></div>
          <div><label for="lotsCity">Birth city</label><input type="text" id="lotsCity" placeholder="e.g. Karachi, Pakistan"></div>
          <div><label for="lotsHouseSystem">House system</label>
            <select id="lotsHouseSystem">
              <option value="placidus">Placidus</option>
              <option value="wholeSign">Whole Sign</option>
              <option value="equalAsc">Equal (Ascendant)</option>
              <option value="porphyry">Porphyry</option>
            </select>
          </div>
        </div>
        <div class="city-status" id="lotsCityStatus"></div>
        <button class="primary" id="lotsCalcBtn" style="margin-top:14px">Calculate</button>
      </div>

      <div id="lotsResults" hidden>
        <div class="card" style="margin-top:18px">
          <h2 id="curatedH2">The seven classical Lots</h2>
          <div class="lots-grid" id="lotsCuratedGrid"></div>
        </div>

        <div class="card" style="margin-top:18px">
          <h2>Build your own Lot</h2>
          <p class="small muted" style="margin:0 0 4px">Lot = Personal Point + Significator − Trigger</p>
          <div class="builder-row">
            <div><label class="small">Personal Point</label><select id="builderP"></select></div>
            <div class="builder-op">+</div>
            <div><label class="small">Significator</label><select id="builderS"></select></div>
            <div class="builder-op">−</div>
            <div><label class="small">Trigger</label><select id="builderT"></select></div>
            <div></div>
          </div>
          <button id="builderCalc" style="margin-top:12px">Compute</button>
          <div class="builder-result" id="builderResult" hidden></div>
        </div>
      </div>
    `;

    wirePanel();
  }

  let lastContext = null; // {eph, chart, ctx} from the most recent Calculate click

  function wirePanel() {
    const framingButtons = PANEL.querySelectorAll(".framing-toggle button");
    framingButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        framing = btn.dataset.framing;
        framingButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        populateBuilderSelects();
        if (lastContext) renderResults(lastContext);
      });
    });

    document.getElementById("lotsCalcBtn").addEventListener("click", onCalculate);
    document.getElementById("builderCalc").addEventListener("click", onBuilderCompute);
    populateBuilderSelects();
  }

  function populateBuilderSelects() {
    const names = window.BabaJiLots ? window.BabaJiLots.ALL_POINT_NAMES : [];
    ["builderP", "builderS", "builderT"].forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const prevValue = sel.value;
      sel.innerHTML = names.map((n) => `<option value="${n}">${pointLabel(n)}</option>`).join("");
      if (prevValue && names.includes(prevValue)) sel.value = prevValue;
    });
  }

  async function onCalculate() {
    const statusEl = document.getElementById("lotsCityStatus");
    const dob = document.getElementById("lotsDob").value;
    const time = document.getElementById("lotsTime").value || "12:00";
    const city = document.getElementById("lotsCity").value.trim();
    const houseSystem = document.getElementById("lotsHouseSystem").value;

    if (!dob) { statusEl.textContent = "Enter a date of birth first."; statusEl.className = "city-status err"; return; }
    if (!city) { statusEl.textContent = "Enter a birth city first."; statusEl.className = "city-status err"; return; }

    statusEl.textContent = "Loading the calculation engine…";
    statusEl.className = "city-status";
    try {
      if (!engineLoaded) await loadEngine();

      statusEl.textContent = "Finding “" + city + "”…";
      const geo = await geocodeCity(city);
      if (!geo) {
        statusEl.textContent = "Could not find that city. Try a more specific name (e.g. add the country).";
        statusEl.className = "city-status err";
        return;
      }

      const utcDate = localToUTC(dob, time, geo.timezone);
      const eph = window.BabaJiEphemeris.computeAllLongitudes(utcDate);
      const chart = window.BabaJiHouses.computeChart(utcDate, geo.latitude, geo.longitude, houseSystem);
      const ctx = window.BabaJiLots.buildContext(eph, chart, utcDate, "modern");

      statusEl.textContent = geo.name + ", " + geo.country + " — "
        + geo.latitude.toFixed(2) + ", " + geo.longitude.toFixed(2) + " (" + geo.timezone + ")";
      statusEl.className = "city-status ok";

      lastContext = { eph, chart, ctx };
      renderResults(lastContext);
    } catch (err) {
      statusEl.textContent = "Something went wrong: " + err.message;
      statusEl.className = "city-status err";
    }
  }

  function renderResults({ ctx }) {
    document.getElementById("lotsResults").hidden = false;
    document.getElementById("curatedH2").textContent = ctx.isDay
      ? "The seven classical Lots (day chart)"
      : "The seven classical Lots (night chart)";

    const curated = window.BabaJiLots.computeCuratedLots(ctx);
    const grid = document.getElementById("lotsCuratedGrid");
    grid.innerHTML = Object.keys(curated).map((key) => {
      const lot = curated[key];
      const label = framing === "islamic" ? lot.arabicName : lot.name;
      return `<div class="lot-card">
        <div class="name">${label}</div>
        <div class="deg">${formatDegree(lot.longitude)}</div>
        <div class="formula">${lot.source}</div>
      </div>`;
    }).join("");

    populateBuilderSelects();
  }

  function onBuilderCompute() {
    if (!lastContext) return;
    const p = document.getElementById("builderP").value;
    const s = document.getElementById("builderS").value;
    const t = document.getElementById("builderT").value;
    const resultEl = document.getElementById("builderResult");
    try {
      const longitude = window.BabaJiLots.computeLot(p, s, t, lastContext.ctx);
      resultEl.hidden = false;
      resultEl.innerHTML = `<div class="name" style="color:var(--accent);font-weight:600">
        ${pointLabel(p)} + ${pointLabel(s)} − ${pointLabel(t)}</div>
        <div class="deg" style="font-variant-numeric:tabular-nums;font-weight:700;color:var(--accent2);font-size:1.3rem;margin-top:4px">
        ${formatDegree(longitude)}</div>`;
    } catch (err) {
      resultEl.hidden = false;
      resultEl.textContent = "Could not compute that combination: " + err.message;
    }
  }

  function activateTopTab(which) {
    const lotsActive = which === "lots";
    TOP_TAB_GENERATOR.setAttribute("aria-selected", String(!lotsActive));
    TOP_TAB_LOTS.setAttribute("aria-selected", String(lotsActive));
    PANEL_GENERATOR.hidden = lotsActive;
    PANEL.hidden = !lotsActive;
    if (lotsActive && !PANEL.dataset.built) {
      PANEL.dataset.built = "1";
      PANEL.innerHTML = '<p class="loading-note">Preparing the calculator…</p>';
      // Load the engine BEFORE rendering the form, so the builder dropdowns
      // (which read BabaJiLots.ALL_POINT_NAMES) are populated with the real
      // point list from the moment the panel appears, not empty until the
      // user's first Calculate click resolves it.
      loadEngine()
        .then(renderPanel)
        .catch((err) => {
          PANEL.innerHTML = '<p class="loading-note">Could not load the calculator: ' + err.message + '</p>';
        });
    }
  }

  TOP_TAB_GENERATOR.addEventListener("click", () => activateTopTab("generator"));
  TOP_TAB_LOTS.addEventListener("click", () => activateTopTab("lots"));
})();
