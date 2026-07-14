/**
 * Calendar generator for Bijouterie Hamel.
 *
 * A SINGLE calendar grid is rendered for one "main" month (December by
 * default, see `state.year` / `state.month`). The grid naturally spills into
 * the last days of the previous month and the first days of the next month to
 * complete the first and last weeks. Those spillover days are real, editable
 * cells: they show up as "active" when they fall inside the selected data
 * range ("Début des données" .. "Fin des données") and muted otherwise.
 *
 *   - Move the start date back into November -> the trailing November days
 *     become active.
 *   - Move the end date into January -> the leading January days become active.
 *
 * Edit persistence:
 *   - All editable content lives in `state.content`, keyed by ISO date
 *     (`YYYY-MM-DD`). Because it is keyed by real date, edits survive both
 *     re-renders and changes to the date range.
 *   - `harvestEdits()` snapshots the DOM back into `state` before every rebuild,
 *     and a live `input` listener mirrors edits as they happen, so progress is
 *     never lost.
 */

const DAYS_OF_WEEK = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// Short labels used for the in-badge month tag shown on spillover days.
const MONTH_ABBR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

/**
 * Turn a raw hours string into display HTML.
 * "9:30 à 17:00" -> "9:30<br>à 17:00"
 * @param {string} value
 */
function processHours(value) {
  return String(value).replace(" ", "<br>");
}

/** Zero-padded ISO date string. `month` is 1-based. */
function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** ISO date string for a Date object (local time). */
function isoFromDate(date) {
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Parse "YYYY-MM-DD" into { year, month, day } (month is 1-based). */
function parseISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

const state = {
  title: "Bijouterie Hamel",
  // The main month of the calendar (1-based month). December 2026 by default.
  year: 2026,
  month: 12,
  // Selected data range. Controls which days render as "active".
  startDate: "2026-12-12",
  endDate: "2027-01-02",
  // Appearance (see FONT_OPTIONS / PALETTES).
  font: "fancy",
  // Free-form font family chosen from the searchable list (font === "custom").
  customFont: "Georgia",
  // Font for everything except the title (calendar body / content).
  contentFont: "regular",
  contentCustomFont: "Georgia",
  palette: "classic",
  // User-defined palette, used when palette === "custom".
  customPalette: {
    "--grey-100": "#e4e9f0",
    "--grey-200": "#cfd7e3",
    "--grey-300": "#b5c0cd",
    "--grey-800": "#3e4e63",
  },
  /** @type {Record<string, string>} ISO date -> cell HTML */
  content: {},
};

// Title font choices, each shown as a live sample in the customization modal.
const FONT_OPTIONS = {
  regular: {
    label: "Régulier",
    family: "sans-serif",
    style: "normal",
    spacing: "normal",
  },
  fancy: {
    label: "Élégant",
    family: "'Cinzel', serif",
    style: "normal",
    spacing: "4px",
  },
  "fancy-italic": {
    label: "Élégant italique",
    family: "'Playfair Display', serif",
    style: "italic",
    spacing: "2px",
  },
};

// Fonts installed on the user's device, loaded on demand via the Local Font
// Access API (window.queryLocalFonts). Empty until the user grants access.
let availableFonts = [];
let fontsLoaded = false;

/** Build the <li> items for a searchable font list, filtered by `filter`.
 *  `selectedName` highlights the currently-chosen custom font (or null). */
function renderFontListItems(filter, selectedName) {
  if (!availableFonts.length) {
    return `<li class="font-list-empty">Cliquez sur « Charger mes polices » pour parcourir vos polices installées.</li>`;
  }
  const needle = (filter || "").toLowerCase();
  const items = availableFonts
    .filter((name) => name.toLowerCase().includes(needle))
    .map((name) => {
      const selected = name === selectedName ? " selected" : "";
      return `<li
          class="font-list-item${selected}"
          data-font-name="${name}"
          style="font-family:'${name}', sans-serif;"
        >${name}</li>`;
    })
    .join("");
  return items || `<li class="font-list-empty">Aucune police trouvée</li>`;
}

/** Selected custom name for the title list (or null). */
function titleSelectedName() {
  return state.font === "custom" ? state.customFont : null;
}

/** Selected custom name for the content list (or null). */
function contentSelectedName() {
  return state.contentFont === "custom" ? state.contentCustomFont : null;
}

// Colour palettes. Each maps the theme's grey scale to new values.
const PALETTES = {
  classic: {
    label: "Classique",
    "--grey-100": "#e4e9f0",
    "--grey-200": "#cfd7e3",
    "--grey-300": "#b5c0cd",
    "--grey-800": "#3e4e63",
  },
  gold: {
    label: "Or & Noir",
    "--grey-100": "#f6f0e2",
    "--grey-200": "#e9dcbd",
    "--grey-300": "#c9ad6a",
    "--grey-800": "#2b2b2b",
  },
  rose: {
    label: "Or rose",
    "--grey-100": "#f8ecec",
    "--grey-200": "#eed2d2",
    "--grey-300": "#d59f9f",
    "--grey-800": "#6e4a4a",
  },
  navy: {
    label: "Marine",
    "--grey-100": "#e5eaf2",
    "--grey-200": "#c4d0e2",
    "--grey-300": "#8ea3c4",
    "--grey-800": "#1f2d4d",
  },
  emerald: {
    label: "Émeraude",
    "--grey-100": "#e4f0e9",
    "--grey-200": "#c2e0cd",
    "--grey-300": "#7fbf9a",
    "--grey-800": "#1f4d33",
  },
};

/** Apply the selected font + palette by setting CSS variables on :root. */
function applyTheme() {
  const root = document.documentElement;

  let family, style, spacing;
  if (state.font === "custom") {
    family = `'${state.customFont}', sans-serif`;
    style = "normal";
    spacing = "2px";
  } else {
    const font = FONT_OPTIONS[state.font] || FONT_OPTIONS.fancy;
    family = font.family;
    style = font.style;
    spacing = font.spacing;
  }
  root.style.setProperty("--store-font-family", family);
  root.style.setProperty("--store-font-style", style);
  root.style.setProperty("--store-letter-spacing", spacing);

  // Content font (everything except the title). Family only — keep style and
  // spacing normal so calendar layout is unaffected.
  const contentFamily =
    state.contentFont === "custom"
      ? `'${state.contentCustomFont}', sans-serif`
      : (FONT_OPTIONS[state.contentFont] || FONT_OPTIONS.regular).family;
  root.style.setProperty("--content-font-family", contentFamily);

  const palette =
    state.palette === "custom"
      ? state.customPalette
      : PALETTES[state.palette] || PALETTES.classic;
  Object.keys(palette).forEach((key) => {
    if (key.startsWith("--")) root.style.setProperty(key, palette[key]);
  });
}

// Editable colour slots for the "custom" palette (label -> CSS variable).
const COLOR_FIELDS = [
  { key: "--grey-800", label: "Principale" },
  { key: "--grey-300", label: "Accent" },
  { key: "--grey-200", label: "Bordures" },
  { key: "--grey-100", label: "Fond" },
];

const STORAGE_KEY = "calendar-generator-settings";
const STORAGE_CONTENT_KEY = "calendar-generator-content";

/** Default custom palette (matches the "classic" preset). */
const DEFAULT_CUSTOM_PALETTE = {
  "--grey-100": "#e4e9f0",
  "--grey-200": "#cfd7e3",
  "--grey-300": "#b5c0cd",
  "--grey-800": "#3e4e63",
};

/** Persist the edited calendar content (opening hours) to localStorage. */
function saveContent() {
  try {
    localStorage.setItem(STORAGE_CONTENT_KEY, JSON.stringify(state.content));
  } catch (e) {
    /* ignore */
  }
}

/** Load saved calendar content into state. Returns true if a saved entry
 *  existed (even if empty), so the caller knows whether to seed demo hours. */
function loadContent() {
  try {
    const raw = localStorage.getItem(STORAGE_CONTENT_KEY);
    if (raw === null) return false;
    Object.assign(state.content, JSON.parse(raw));
    return true;
  } catch (e) {
    return false;
  }
}

/** Wipe all saved data and reset the app to its defaults. */
function clearAllData() {
  // Empty every entered hour (do NOT re-seed the demo hours).
  state.content = {};
  state.font = "fancy";
  state.customFont = "Georgia";
  state.contentFont = "regular";
  state.contentCustomFont = "Georgia";
  state.palette = "classic";
  state.customPalette = { ...DEFAULT_CUSTOM_PALETTE };

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
  // Persist the now-empty content so the demo hours are not re-seeded on the
  // next load.
  saveContent();

  // Skip the harvest step: the DOM still shows the old edits and we do NOT
  // want them copied back into the freshly-reset state.
  render(true);
}

/** Persist appearance choices to localStorage. */
function saveSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        font: state.font,
        customFont: state.customFont,
        contentFont: state.contentFont,
        contentCustomFont: state.contentCustomFont,
        palette: state.palette,
        customPalette: state.customPalette,
      })
    );
  } catch (e) {
    /* localStorage unavailable (private mode, etc.) — ignore. */
  }
}

/** Load appearance choices from localStorage into state. */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.font && (FONT_OPTIONS[saved.font] || saved.font === "custom")) {
      state.font = saved.font;
    }
    if (saved.customFont) state.customFont = saved.customFont;
    if (saved.contentFont && (FONT_OPTIONS[saved.contentFont] || saved.contentFont === "custom")) {
      state.contentFont = saved.contentFont;
    }
    if (saved.contentCustomFont) state.contentCustomFont = saved.contentCustomFont;
    if (saved.palette) state.palette = saved.palette;
    if (saved.customPalette) {
      state.customPalette = { ...state.customPalette, ...saved.customPalette };
    }
  } catch (e) {
    /* Corrupt or unavailable storage — fall back to defaults. */
  }
}

/**
 * Seed the store's opening hours for the main month.
 */
function seedContent() {
  const seedHours = {
    12: "Fermé",
    13: "9:30 à 17:00",
    14: "9:30 à 18:00",
    15: "9:30 à 19:00",
    16: "9:30 à 19:00",
    17: "9:30 à 16:00",
    18: "11:00 à 16:00",
    19: "9:30 à 18:00",
    20: "9:30 à 18:00",
    21: "9:30 à 18:00",
    22: "9:30 à 19:00",
    23: "9:30 à 19:00",
    24: "9:30 à 16:00",
    25: "Fermé",
    26: "Fermé",
    27: "Fermé",
    28: "9:30 à 17:30",
    29: "9:30 à 19:00",
    30: "9:30 à 19:00",
    31: "9:30 à 16:00",
  };

  for (const [day, hours] of Object.entries(seedHours)) {
    state.content[isoDate(state.year, state.month, Number(day))] =
      processHours(hours);
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderHeader() {
  return `
    <section class="calendar-month-header">
      <div class="selected-month">
        <span class="store-name">${state.title}</span>
        <p>${MONTH_NAMES[state.month - 1]} ${state.year}</p>
      </div>
    </section>`;
}

function renderDaysOfWeek() {
  return `
    <ol class="day-of-week">
      ${DAYS_OF_WEEK.map((day) => `<li>${day}</li>`).join("")}
    </ol>`;
}

/**
 * Render one editable day cell for a real calendar date.
 * @param {Date} date    the actual calendar date for this cell
 * @param {boolean} inRange whether the date is within the selected data range
 */
function renderDayCell(date, inRange) {
  const iso = isoFromDate(date);
  const content = state.content[iso] || "";

  // Days that belong to a month other than the main one (e.g. late November
  // or early January) get a subtle marker but stay fully editable.
  const isMainMonth =
    date.getFullYear() === state.year && date.getMonth() + 1 === state.month;

  const classes = ["calendar-day"];
  if (!isMainMonth) classes.push("other-month");
  if (!inRange) classes.push("out-of-range");

  // Days outside the main month show a compact month label inside the day
  // badge (e.g. "Nov" above the day number), keeping the monochrome theme.
  const monthLabel = isMainMonth
    ? ""
    : `<small class="badge-month">${MONTH_ABBR[date.getMonth()]}</small>`;

  return `
    <li class="${classes.join(" ")}">
      <span>${monthLabel}${date.getDate()}</span>
      <p class="content" contenteditable data-date="${iso}">${content}</p>
    </li>`;
}

/**
 * Render the single calendar grid.
 *
 * The grid covers whole weeks: from the Sunday of the week containing the
 * start date to the Saturday of the week containing the end date. Every cell
 * shows its day number and is editable. Days that fall outside the selected
 * range (the spillover/padding days needed to complete the first and last
 * weeks) are shown but visually muted.
 */
function renderCalendar() {
  const start = parseISO(state.startDate);
  const end = parseISO(state.endDate);

  const startDate = new Date(start.year, start.month - 1, start.day);
  const endDate = new Date(end.year, end.month - 1, end.day);

  // Snap the grid to whole weeks (Sunday .. Saturday).
  const gridStart = new Date(startDate);
  gridStart.setDate(gridStart.getDate() - startDate.getDay());

  const gridEnd = new Date(endDate);
  gridEnd.setDate(gridEnd.getDate() + (6 - endDate.getDay()));

  let cells = "";
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    const iso = isoFromDate(d);
    const inRange = iso >= state.startDate && iso <= state.endDate;
    cells += renderDayCell(new Date(d), inRange);
  }

  return `
    <div class="calendar-month">
      ${renderHeader()}
      ${renderDaysOfWeek()}
      <ol class="days-grid">${cells}</ol>
    </div>`;
}

function renderSettings() {
  return `
    <div class="no_print calendar-settings">
      <label>
        Début des données:
        <input type="date" id="data-start" value="${state.startDate}">
      </label>
      <label>
        Fin des données:
        <input type="date" id="data-end" value="${state.endDate}">
      </label>
      <button type="button" class="settings-btn" data-modal-target="customize-modal">
        Personnaliser
      </button>
      <button type="button" class="settings-btn" data-modal-target="print-help-modal">
        Comment imprimer
      </button>
      <button type="button" class="settings-btn danger" id="clear-data-btn">
        Tout effacer
      </button>
    </div>`;
}

/** Generic modal shell. */
function renderModal(id, titleId, title, bodyHtml) {
  return `
    <div class="no_print modal-overlay" id="${id}" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <button type="button" class="modal-close" data-modal-close aria-label="Fermer">&times;</button>
        <h2 id="${titleId}">${title}</h2>
        ${bodyHtml}
      </div>
    </div>`;
}

/** Instructions modal explaining how to print the calendar. */
function renderPrintHelpModal() {
  const steps = [
    `<kbd>Ctrl</kbd> / <kbd>⌘ Cmd</kbd> + <kbd>P</kbd>`,
    `Disposition (Layout) → <strong>Paysage</strong> (Landscape)`,
    `Ouvrir « Plus de paramètres » (More settings)`,
    `Marges (Margins) → <strong>Aucune</strong> (None)`,
    `Cocher « <strong>Graphiques d'arrière-plan</strong> » (Background graphics)`,
    `Décocher « <strong>En-têtes et pieds de page</strong> » (Headers &amp; footers)`,
    `Ajuster l'échelle (Scale) pour que le calendrier tienne sur une seule feuille`,
  ];

  const body = `
    <ol class="print-steps">
      ${steps.map((step) => `<li>${step}</li>`).join("")}
    </ol>`;

  return renderModal(
    "print-help-modal",
    "print-help-title",
    "Comment imprimer",
    body
  );
}

/** Customization modal: title font (with live samples) + colour palette. */
function renderCustomizeModal() {
  const fontOptions = Object.entries(FONT_OPTIONS)
    .map(
      ([key, opt]) => `
        <button
          type="button"
          class="font-option${state.font === key ? " selected" : ""}"
          data-font="${key}"
        >
          <span
            class="font-sample"
            style="font-family:${opt.family};font-style:${opt.style};letter-spacing:${opt.spacing};"
          >Bijouterie Hamel</span>
          <span class="option-label">${opt.label}</span>
        </button>`
    )
    .join("");

  const contentFontOptions = Object.entries(FONT_OPTIONS)
    .map(
      ([key, opt]) => `
        <button
          type="button"
          class="content-font-option${state.contentFont === key ? " selected" : ""}"
          data-content-font="${key}"
        >
          <span class="font-sample content-sample" style="font-family:${opt.family};">Décembre — 9:30 à 17:00</span>
          <span class="option-label">${opt.label}</span>
        </button>`
    )
    .join("");

  const paletteOptions = Object.entries(PALETTES)
    .map(
      ([key, pal]) => `
        <button
          type="button"
          class="palette-option${state.palette === key ? " selected" : ""}"
          data-palette="${key}"
        >
          <span class="swatches">
            <span class="swatch" style="background:${pal["--grey-800"]}"></span>
            <span class="swatch" style="background:${pal["--grey-300"]}"></span>
            <span class="swatch" style="background:${pal["--grey-100"]}"></span>
          </span>
          <span class="option-label">${pal.label}</span>
        </button>`
    )
    .join("");

  const colorInputs = COLOR_FIELDS.map(
    (field) => `
        <label class="color-input">
          <input type="color" data-color-key="${field.key}" value="${state.customPalette[field.key]}">
          <span>${field.label}</span>
        </label>`
  ).join("");

  const body = `
    <section class="customize-section">
      <h3>Police du titre</h3>
      <div class="font-options">${fontOptions}</div>
      <div class="font-search">
        <div class="font-search-row">
          <input
            type="text"
            id="font-search-input"
            class="font-search-input"
            placeholder="Rechercher une autre police…"
            autocomplete="off"
            value="${state.font === "custom" ? state.customFont : ""}"
          >
          <button type="button" class="settings-btn" id="load-fonts-btn">
            Charger mes polices
          </button>
        </div>
        <ul class="font-list" id="font-list">${renderFontListItems("", titleSelectedName())}</ul>
      </div>
    </section>
    <section class="customize-section">
      <h3>Police du contenu</h3>
      <div class="font-options">${contentFontOptions}</div>
      <div class="font-search">
        <input
          type="text"
          id="content-font-search-input"
          class="font-search-input"
          placeholder="Rechercher une autre police…"
          autocomplete="off"
          value="${state.contentFont === "custom" ? state.contentCustomFont : ""}"
        >
        <ul class="font-list" id="content-font-list">${renderFontListItems("", contentSelectedName())}</ul>
      </div>
    </section>
    <section class="customize-section">
      <h3>Palette de couleurs</h3>
      <div class="palette-options">${paletteOptions}</div>
      <div class="custom-palette${state.palette === "custom" ? " selected" : ""}" id="custom-palette">
        <span class="option-label">Personnalisée</span>
        <div class="color-inputs">${colorInputs}</div>
      </div>
    </section>`;

  return renderModal(
    "customize-modal",
    "customize-title",
    "Personnaliser",
    body
  );
}

// ---------------------------------------------------------------------------
// Edit persistence + event wiring
// ---------------------------------------------------------------------------

/** Copy every editable cell's current HTML back into `state.content`. */
function harvestEdits() {
  document.querySelectorAll(".content[data-date]").forEach((cell) => {
    state.content[cell.dataset.date] = cell.innerHTML.trim();
  });
  saveContent();
}

/** Keep start <= end so the range is always valid. */
function normalizeRange() {
  if (state.startDate && state.endDate && state.startDate > state.endDate) {
    state.endDate = state.startDate;
  }
}

function wireEvents() {
  const startInput = document.getElementById("data-start");
  const endInput = document.getElementById("data-end");

  const onRangeChange = () => {
    harvestEdits(); // preserve edits before we rebuild the DOM
    if (startInput.value) state.startDate = startInput.value;
    if (endInput.value) state.endDate = endInput.value;
    normalizeRange();
    render();
  };

  startInput.addEventListener("change", onRangeChange);
  endInput.addEventListener("change", onRangeChange);

  // --- Modal system: open / close ---
  document.querySelectorAll("[data-modal-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = document.getElementById(btn.dataset.modalTarget);
      if (modal) modal.removeAttribute("hidden");
    });
  });
  document.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-overlay").setAttribute("hidden", "");
    });
  });
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    // Close when clicking the backdrop, not the dialog itself.
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.setAttribute("hidden", "");
    });
  });

  // --- Customization: title font ---
  document.querySelectorAll(".font-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.font = btn.dataset.font;
      applyTheme();
      saveSettings();
      document
        .querySelectorAll(".font-option")
        .forEach((b) => b.classList.toggle("selected", b === btn));
      // A preset overrides any custom-font selection in the list.
      const listEl = document.getElementById("font-list");
      const searchEl = document.getElementById("font-search-input");
      if (listEl)
        listEl.innerHTML = renderFontListItems(
          searchEl ? searchEl.value : "",
          titleSelectedName()
        );
    });
  });

  // --- Customization: searchable custom font ---
  const fontSearch = document.getElementById("font-search-input");
  const fontListEl = document.getElementById("font-list");
  const loadFontsBtn = document.getElementById("load-fonts-btn");

  if (fontSearch && fontListEl) {
    fontSearch.addEventListener("input", () => {
      fontListEl.innerHTML = renderFontListItems(
        fontSearch.value,
        titleSelectedName()
      );
    });

    // Delegate clicks on the list to pick a font.
    fontListEl.addEventListener("click", (e) => {
      const li = e.target.closest("[data-font-name]");
      if (!li) return;
      state.font = "custom";
      state.customFont = li.dataset.fontName;
      applyTheme();
      saveSettings();
      fontSearch.value = state.customFont;
      fontListEl.innerHTML = renderFontListItems(
        fontSearch.value,
        titleSelectedName()
      );
      document
        .querySelectorAll(".font-option")
        .forEach((b) => b.classList.remove("selected"));
    });
  }

  // --- Customization: content font (everything except the title) ---
  const contentFontSearch = document.getElementById("content-font-search-input");
  const contentFontListEl = document.getElementById("content-font-list");

  document.querySelectorAll(".content-font-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.contentFont = btn.dataset.contentFont;
      applyTheme();
      saveSettings();
      document
        .querySelectorAll(".content-font-option")
        .forEach((b) => b.classList.toggle("selected", b === btn));
      if (contentFontListEl)
        contentFontListEl.innerHTML = renderFontListItems(
          contentFontSearch ? contentFontSearch.value : "",
          contentSelectedName()
        );
    });
  });

  if (contentFontSearch && contentFontListEl) {
    contentFontSearch.addEventListener("input", () => {
      contentFontListEl.innerHTML = renderFontListItems(
        contentFontSearch.value,
        contentSelectedName()
      );
    });
    contentFontListEl.addEventListener("click", (e) => {
      const li = e.target.closest("[data-font-name]");
      if (!li) return;
      state.contentFont = "custom";
      state.contentCustomFont = li.dataset.fontName;
      applyTheme();
      saveSettings();
      contentFontSearch.value = state.contentCustomFont;
      contentFontListEl.innerHTML = renderFontListItems(
        contentFontSearch.value,
        contentSelectedName()
      );
      document
        .querySelectorAll(".content-font-option")
        .forEach((b) => b.classList.remove("selected"));
    });
  }

  if (loadFontsBtn) {
    loadFontsBtn.addEventListener("click", async () => {
      if (typeof window.queryLocalFonts !== "function") {
        loadFontsBtn.textContent = "Non pris en charge par ce navigateur";
        loadFontsBtn.disabled = true;
        return;
      }
      loadFontsBtn.textContent = "Chargement…";
      try {
        const fonts = await window.queryLocalFonts();
        // Unique family names, alphabetically sorted.
        availableFonts = [...new Set(fonts.map((f) => f.family))].sort((a, b) =>
          a.localeCompare(b)
        );
        fontsLoaded = true;
        if (fontListEl) {
          fontListEl.innerHTML = renderFontListItems(
            fontSearch ? fontSearch.value : "",
            titleSelectedName()
          );
        }
        if (contentFontListEl) {
          contentFontListEl.innerHTML = renderFontListItems(
            contentFontSearch ? contentFontSearch.value : "",
            contentSelectedName()
          );
        }
        loadFontsBtn.textContent = `${availableFonts.length} polices chargées`;
        loadFontsBtn.disabled = true;
      } catch (err) {
        loadFontsBtn.textContent = "Accès refusé";
      }
    });
  }

  // --- Clear all data ---
  const clearBtn = document.getElementById("clear-data-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const ok = window.confirm(
        "Effacer toutes les données ? Les horaires saisis et la personnalisation seront réinitialisés."
      );
      if (ok) clearAllData();
    });
  }

  // --- Customization: preset colour palette ---
  const customBox = document.getElementById("custom-palette");
  document.querySelectorAll(".palette-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.palette = btn.dataset.palette;
      applyTheme();
      saveSettings();
      document
        .querySelectorAll(".palette-option")
        .forEach((b) => b.classList.toggle("selected", b === btn));
      if (customBox) customBox.classList.remove("selected");
      // Reflect the chosen preset's colours in the custom pickers.
      const pal = PALETTES[state.palette];
      if (pal) {
        document.querySelectorAll("[data-color-key]").forEach((inp) => {
          if (pal[inp.dataset.colorKey]) inp.value = pal[inp.dataset.colorKey];
        });
      }
    });
  });

  // --- Customization: custom colours ---
  document.querySelectorAll("[data-color-key]").forEach((inp) => {
    inp.addEventListener("input", () => {
      state.customPalette[inp.dataset.colorKey] = inp.value;
      state.palette = "custom";
      applyTheme();
      saveSettings();
      document
        .querySelectorAll(".palette-option")
        .forEach((b) => b.classList.remove("selected"));
      if (customBox) customBox.classList.add("selected");
    });
  });

  // Mirror edits into state as the user types, so nothing is ever lost even
  // if a re-render happens between snapshots.
  document.querySelectorAll(".content[data-date]").forEach((cell) => {
    cell.addEventListener("input", () => {
      state.content[cell.dataset.date] = cell.innerHTML;
      saveContent();
    });
  });
}

function render(skipHarvest) {
  // Snapshot any existing edits before replacing the DOM (unless the caller
  // has already reset state, e.g. clearAllData).
  if (!skipHarvest) harvestEdits();

  document.getElementById("app").innerHTML =
    renderSettings() +
    renderCalendar() +
    renderPrintHelpModal() +
    renderCustomizeModal();

  applyTheme();
  wireEvents();
}

function main() {
  loadSettings();
  // Seed demo hours only on a first run (no saved content yet). After the user
  // clears everything, an empty entry exists, so we must not re-seed.
  if (!loadContent()) seedContent();
  render();

  // Global Escape-to-close, attached once so it survives re-renders.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal-overlay")
        .forEach((modal) => modal.setAttribute("hidden", ""));
    }
  });
}

main();
