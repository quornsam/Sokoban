/*
 * BOXXY — Pushbox Puzzle
 * Copyright © 2026 Sam Cornwell. All rights reserved.
 * Personal non-commercial use only. See LICENSE.md.
 */
/* Single source of truth for the public release information.
   Update only this object when a new BOXXY version is published. */
window.BOXXY_RELEASE = Object.freeze({
  version: 232,
  lastUpdated: "2026-08-06"
});
/* Stored solver routes are kept separate from the authored pack data. */
(() => {
  "use strict";
  const STORAGE_KEY = "boxxy-solver-solutions-v1";
  function readAll() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  function key(packId, levelIndex) { return `${packId}:${Number(levelIndex)}`; }
  window.BoxxySolutionStore = Object.freeze({
    get(packId, levelIndex) {
      const value = readAll()[key(packId, levelIndex)];
      return typeof value === "string" ? value : "";
    },
    set(packId, levelIndex, moves) {
      const all = readAll();
      const id = key(packId, levelIndex);
      const clean = String(moves || "").replace(/[^udlrUDLR]/g, "");
      if (clean) all[id] = clean;
      else delete all[id];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (_) {}
      return clean;
    }
  });
})();

/* BOXXY v232 — level thumbnails prioritise moves, use the progression-current level and keep time tied to the best move score. */
/* BOXXY v231 — level thumbnails show pushes and completion time. */
/* BOXXY v230 — compact generated level thumbnails and denser Daily archive. */
/* BOXXY v229 — holding Undo now repeats, matching held direction controls. */
/* BOXXY v228 — Google Search discovery and presentation metadata added in index.html. */
/* BOXXY v227 — touch interfaces no longer select game text, icons or artwork. */
/* BOXXY v226 — reliable board artwork loading and tap-away level chooser dismissal. */
/* BOXXY v225 — final tutorial crate preserves its square proportions. */
/* BOXXY v224 — tutorial crate and target use individual board assets. */
/* BOXXY v223 — Daily share floor uses the white large square emoji. */
/* BOXXY v222 — legal release information now comes from BOXXY_RELEASE. */
/* BOXXY v221 — Daily streaks are awarded only by the current Daily puzzle. */
/* BOXXY v217 — Daily archive, past-date replay, saved scores and next-puzzle countdown. */
/* BOXXY v213 — opaque 3D floor, slower turns and a continuous pull-back camera. */
/* BOXXY v205 — shorter mobile Daily Complete modal and single-line heading. */
/* BOXXY v203 — corrected Daily share emoji, copy-text control and coming-soon wording. */
/* BOXXY v201 — supplied streak-flame artwork with coded day count inside the flame. */
/* BOXXY v200 — Daily Boxxy schedule, sharing, local-midnight rollover and streak flame. */
/* BOXXY v196 — reliable first-load splash and startup loading gate. */
/* BOXXY v195 — legal modal, Zen next-level control, lower landscape arrows and mobile music pause. */
/* BOXXY v180 — responsive pack-completion layout, varied star messages and unclipped pack cards. */
/* BOXXY v175 — reliable queued cookieless PostHog analytics; no autocapture or session recording. */
/* BOXXY v168 — Rainbow Mode with pack-preview and walkthrough colour preservation. */
(() => {
  "use strict";
  const DEFAULT = "red";
  const BOARD_ASSET_REVISION = "226";
  const ORDER = Object.freeze([
    "red", "blue", "green", "purple", "light-blue",
    "teal", "black", "grey", "burgundy", "brown",
    "orange", "yellow", "lime", "pink", "cream"
  ]);
  const PALETTE = Object.freeze({
    red: Object.freeze({ label: "Red", hex: "#ec2826", targetCode: "r", boxCode: "R", playerCode: "1" }),
    blue: Object.freeze({ label: "Blue", hex: "#1553ca", targetCode: "b", boxCode: "B", playerCode: "2" }),
    green: Object.freeze({ label: "Green", hex: "#328545", targetCode: "g", boxCode: "G", playerCode: "3" }),
    purple: Object.freeze({ label: "Purple", hex: "#7433ac", targetCode: "p", boxCode: "P", playerCode: "4" }),
    "light-blue": Object.freeze({ label: "Light blue", hex: "#64c0e8", targetCode: "c", boxCode: "C", playerCode: "5" }),
    teal: Object.freeze({ label: "Teal", hex: "#119f9a", targetCode: "t", boxCode: "T", playerCode: "6" }),
    black: Object.freeze({ label: "Black", hex: "#282827", targetCode: "k", boxCode: "K", playerCode: "7" }),
    grey: Object.freeze({ label: "Grey", hex: "#7e7d7d", targetCode: "a", boxCode: "A", playerCode: "8" }),
    burgundy: Object.freeze({ label: "Burgundy", hex: "#781f24", targetCode: "m", boxCode: "M", playerCode: "9" }),
    brown: Object.freeze({ label: "Brown", hex: "#774c29", targetCode: "w", boxCode: "W", playerCode: "0" }),
    orange: Object.freeze({ label: "Orange", hex: "#f97915", targetCode: "o", boxCode: "O", playerCode: "!" }),
    yellow: Object.freeze({ label: "Yellow", hex: "#f9bc18", targetCode: "y", boxCode: "Y", playerCode: "?" }),
    lime: Object.freeze({ label: "Lime", hex: "#a3cb16", targetCode: "l", boxCode: "L", playerCode: "%" }),
    pink: Object.freeze({ label: "Pink", hex: "#f16e8f", targetCode: "f", boxCode: "F", playerCode: "&" }),
    cream: Object.freeze({ label: "Cream", hex: "#ece6d9", targetCode: "i", boxCode: "I", playerCode: "=" })
  });
  const GOAL_CHARS = new Set([".", "*", "+"]);
  const TEXT_CODES = new Map();

  function normalise(value) {
    const token = String(value || "").trim().toLowerCase().replace(/_/g, "-");
    return Object.prototype.hasOwnProperty.call(PALETTE, token) ? token : DEFAULT;
  }

  ORDER.forEach(colour => {
    const entry = PALETTE[colour];
    TEXT_CODES.set(entry.targetCode, Object.freeze({ cell: ".", colour }));
    TEXT_CODES.set(entry.boxCode, Object.freeze({ cell: "*", colour }));
    TEXT_CODES.set(entry.playerCode, Object.freeze({ cell: "+", colour }));
  });

  function normaliseMap(value, layout) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const rows = Array.isArray(layout) ? layout.map(row => String(row)) : [];
    const result = {};
    rows.forEach((row, y) => {
      [...row].forEach((char, x) => {
        if (!GOAL_CHARS.has(char)) return;
        const colour = normalise(source[`${x},${y}`]);
        if (colour !== DEFAULT) result[`${x},${y}`] = colour;
      });
    });
    return result;
  }

  function versionedBoardAssetPath(path) {
    const separator = String(path).includes("?") ? "&" : "?";
    return `${path}${separator}v=${encodeURIComponent(BOARD_ASSET_REVISION)}`;
  }

  function spritePath(type, colour) {
    const clean = normalise(colour);
    return versionedBoardAssetPath(
      `assets/board/${type === "goal" ? "goals/goal" : "boxes/box"}-${clean}.png`
    );
  }

  function style(element, value) {
    if (!element) return DEFAULT;
    const colour = normalise(value);
    const swatch = PALETTE[colour];
    element.dataset.goalColour = colour;
    element.style.setProperty("--goal-colour", swatch.hex);
    element.style.setProperty("--goal-sprite", `url("${spritePath("goal", colour)}")`);
    element.style.setProperty("--box-sprite", `url("${spritePath("box", colour)}")`);
    return colour;
  }

  function decodeTextChar(char) {
    const decoded = TEXT_CODES.get(String(char || ""));
    return decoded ? { cell: decoded.cell, colour: decoded.colour } : null;
  }

  function isTextCode(char) {
    return TEXT_CODES.has(String(char || ""));
  }

  function encodeTextCell(cell, colour) {
    const entry = PALETTE[normalise(colour)];
    if (cell === ".") return entry.targetCode;
    if (cell === "*") return entry.boxCode;
    if (cell === "+") return entry.playerCode;
    return cell;
  }

  // Colour sprites now load only when a level actually uses them. The previous
  // all-colours preload delayed first paint on fresh mobile browsers.
  window.BoxxyColourSpritesReady = Promise.resolve([]);
  window.BoxxyGoalColours = Object.freeze({
    DEFAULT, BOARD_ASSET_REVISION, ORDER, PALETTE, normalise, normaliseMap, style,
    spritePath, versionedBoardAssetPath, decodeTextChar, isTextCode, encodeTextCell
  });
})();

/* BOXXY v143 — solver route verifier (merged from the former standalone file). */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BoxxyRouteVerifier = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DELTAS = {
    u: [0, -1],
    d: [0, 1],
    l: [-1, 0],
    r: [1, 0]
  };

  function cleanRoute(route) {
    return String(route ?? "").replace(/\s/g, "");
  }

  function parseLevel(levelText) {
    const lines = String(levelText ?? "")
      .replace(/\r/g, "")
      .split("\n")
      .map(line => line.replace(/\s+$/g, ""))
      .filter(line => line.length > 0);

    if (!lines.length) return { ok: false, error: "The level is empty." };
    const width = Math.max(...lines.map(line => line.length));
    const height = lines.length;
    const walls = new Set();
    const goals = new Set();
    const boxes = new Set();
    const voids = new Set();
    let player = null;
    let playerCount = 0;

    const key = (x, y) => `${x},${y}`;
    const chars = lines.map(line => line.padEnd(width, " ").split(""));

    // XSB uses spaces both for floor and for padding outside an irregular map.
    // Match BOXXY's own importer by flood-filling boundary spaces as void.
    const outsideQueue = [];
    const addOutside = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height || chars[y][x] !== " ") return;
      const id = key(x, y);
      if (voids.has(id)) return;
      voids.add(id);
      outsideQueue.push([x, y]);
    };
    for (let x = 0; x < width; x++) {
      addOutside(x, 0);
      addOutside(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      addOutside(0, y);
      addOutside(width - 1, y);
    }
    for (let i = 0; i < outsideQueue.length; i++) {
      const [x, y] = outsideQueue[i];
      addOutside(x - 1, y);
      addOutside(x + 1, y);
      addOutside(x, y - 1);
      addOutside(x, y + 1);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = chars[y][x];
        const id = key(x, y);
        if (ch === "#") walls.add(id);
        if (ch === "." || ch === "*" || ch === "+") goals.add(id);
        if (ch === "$" || ch === "*") boxes.add(id);
        if (ch === "@" || ch === "+") {
          player = [x, y];
          playerCount++;
        }
      }
    }

    if (playerCount !== 1 || !player) return { ok: false, error: `The level has ${playerCount} players; exactly one is required.` };
    if (!boxes.size) return { ok: false, error: "The level has no boxes." };
    if (boxes.size !== goals.size) return { ok: false, error: `The level has ${boxes.size} boxes and ${goals.size} goals.` };

    return { ok: true, width, height, walls, voids, goals, boxes, player, key };
  }

  function verify(levelText, route) {
    const parsed = parseLevel(levelText);
    if (!parsed.ok) return { valid: false, solved: false, route: "", moves: 0, pushes: 0, error: parsed.error };

    const clean = cleanRoute(route);
    const invalid = clean.match(/[^udlrUDLR]/);
    if (invalid) {
      return { valid: false, solved: false, route: "", moves: 0, pushes: 0, error: `The route contains an invalid character: ${JSON.stringify(invalid[0])}.` };
    }

    const boxes = new Set(parsed.boxes);
    let [px, py] = parsed.player;
    let pushes = 0;
    let canonical = "";

    const blocked = (x, y) => x < 0 || y < 0 || x >= parsed.width || y >= parsed.height || parsed.walls.has(parsed.key(x, y)) || parsed.voids.has(parsed.key(x, y));

    for (let i = 0; i < clean.length; i++) {
      const lower = clean[i].toLowerCase();
      const delta = DELTAS[lower];
      if (!delta) continue;
      const [dx, dy] = delta;
      const nx = px + dx;
      const ny = py + dy;
      const nextKey = parsed.key(nx, ny);

      if (blocked(nx, ny)) {
        return { valid: false, solved: false, route: canonical, moves: i, pushes, error: `Move ${i + 1} walks into a wall or outside the board.` };
      }

      let pushed = false;
      if (boxes.has(nextKey)) {
        const bx = nx + dx;
        const by = ny + dy;
        const beyondKey = parsed.key(bx, by);
        if (blocked(bx, by) || boxes.has(beyondKey)) {
          return { valid: false, solved: false, route: canonical, moves: i, pushes, error: `Move ${i + 1} attempts an illegal push.` };
        }
        boxes.delete(nextKey);
        boxes.add(beyondKey);
        pushes++;
        pushed = true;
      }

      px = nx;
      py = ny;
      canonical += pushed ? lower.toUpperCase() : lower;
    }

    const solved = [...boxes].every(box => parsed.goals.has(box));
    return {
      valid: true,
      solved,
      route: canonical,
      moves: canonical.length,
      pushes,
      error: solved ? "" : "The route is legal but does not finish with every box on a goal."
    };
  }

  return { cleanRoute, parseLevel, verify };
});

/* BOXXY v141 — compact, URL-safe custom puzzle links. */
(() => {
  "use strict";

  const MAX_SIZE = 36;
  const ALLOWED = /^[ #@$.+*]*$/;

  function bytesToBase64Url(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(code) {
    const normal = String(code || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normal + "=".repeat((4 - normal.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function validatePayload(value) {
    const version = Number(value?.v);
    if (!value || ![1, 2].includes(version) || !Array.isArray(value.l)) throw new Error("Unsupported puzzle link.");
    const layout = value.l.map(row => String(row).replace(/\r/g, ""));
    if (!layout.length || layout.length > MAX_SIZE) throw new Error("Puzzle height is outside BOXXY's supported range.");
    if (layout.some(row => row.length > MAX_SIZE || !ALLOWED.test(row))) throw new Error("Puzzle link contains invalid level data.");
    const joined = layout.join("");
    const players = (joined.match(/[@+]/g) || []).length;
    const boxes = (joined.match(/[$*]/g) || []).length;
    const goals = (joined.match(/[.*+]/g) || []).length;
    if (players !== 1 || boxes < 1 || boxes !== goals) throw new Error("Puzzle link does not contain a valid Sokoban starting position.");
    const name = String(value.n || "Shared Puzzle").trim().slice(0, 64) || "Shared Puzzle";
    const goalColours = window.BoxxyGoalColours?.normaliseMap?.(value.c || value.goalColours, layout) || {};
    return { version: 2, name, layout, goalColours };
  }

  function encode(payload) {
    const checked = validatePayload({ v: 2, n: payload?.name, l: payload?.layout, c: payload?.goalColours });
    const compact = { v: 2, n: checked.name, l: checked.layout };
    if (Object.keys(checked.goalColours).length) compact.c = checked.goalColours;
    const json = JSON.stringify(compact);
    return bytesToBase64Url(new TextEncoder().encode(json));
  }

  function decode(code) {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(code));
    return validatePayload(JSON.parse(json));
  }

  function codeFromLocation() {
    const queryCode = new URLSearchParams(location.search).get("p");
    if (queryCode) return queryCode;
    const hash = String(location.hash || "").replace(/^#/, "");
    if (!hash) return "";
    if (hash.startsWith("p=")) return hash.slice(2);
    return new URLSearchParams(hash).get("p") || "";
  }

  function readLocation() {
    const code = codeFromLocation();
    if (!code) return null;
    try {
      return { ok: true, ...decode(code) };
    } catch (error) {
      return { ok: false, error: error?.message || "The shared puzzle link is invalid." };
    }
  }

  function buildUrl(payload) {
    const url = new URL(location.href);
    url.search = "";
    url.hash = `p=${encode(payload)}`;
    return url.toString();
  }

  window.BoxxyShareCodec = Object.freeze({ encode, decode, readLocation, buildUrl });
})();

/* BOXXY v166 — character renderer, game engine, optional Rainbow Mode, Level Maker and Rust/WASM solver adapter. */
(() => {
  "use strict";

  const GOAL_COLOURS = window.BoxxyGoalColours;
  const FRAMES = [
    "player-front", "player-back", "player-left", "player-right",
    "walk-front", "walk-back", "walk-left", "walk-right",
    "push-front", "push-back", "push-left", "push-right"
  ];
  const CATEGORIES = ["tshirt", "trousers", "hair", "skin", "shoes"];
  const BODY_TYPES = ["boy", "girl"];
  const THEMES = ["bauhaus"];
  const SHEET_COLS = 4;
  // One efficient 300 × 260 frame set is used everywhere. It remains larger than
  // the maximum on-screen character while avoiding the old 600 × 520 duplicate
  // wardrobe set and the memory pressure that exposed AngeM's older-iPad bug.
  const FRAME_WIDTH = 300;
  const FRAME_HEIGHT = 260;
  const CHARACTER_ASSET_ROOT = "assets/characters";
  const LABELS = {
    bodyType: "CHARACTER",
    tshirt: "T-SHIRT",
    trousers: "TROUSERS / SKIRT",
    hair: "HAIR COLOUR",
    skin: "SKIN COLOUR",
    shoes: "SHOES"
  };
  const OPTIONS = {
    tshirt: [
      ["Bauhaus red", "#df3526"], ["Coral", "#ef6a55"], ["Burnt orange", "#b9562d"],
      ["Tangerine", "#f28b35"], ["Sun yellow", "#e5b32a"], ["Lemon", "#f3d85a"],
      ["Mustard", "#b88b25"], ["Cobalt blue", "#285aa5"], ["Sky blue", "#5b91c9"],
      ["Turquoise", "#36a7a2"], ["Forest green", "#397457"], ["Mint", "#65a887"],
      ["Warm white", "#eee5d7"], ["Stone", "#b7aa95"], ["Black", "#242326"],
      ["Violet", "#704f86"], ["Lavender", "#a38bc2"], ["Rose pink", "#c65f83"]
    ],
    trousers: [
      ["Black", "#161619"], ["Charcoal", "#292829"], ["Navy", "#22345f"],
      ["Denim", "#4b6684"], ["Bauhaus blue", "#20539a"], ["Electric blue", "#2478d4"],
      ["Sky blue", "#55b9ee"], ["Turquoise", "#18b8b2"], ["Emerald", "#21a366"],
      ["Bright green", "#4fbd4a"], ["Lime", "#9dcc33"], ["Sun yellow", "#f0c928"],
      ["Tangerine", "#f28b35"], ["Bauhaus red", "#db3b27"], ["Coral", "#ef6a55"],
      ["Hot pink", "#ef4f9a"], ["Magenta", "#ca3eb6"], ["Violet", "#7a4fc6"],
      ["Bright purple", "#9a5de8"], ["Burgundy", "#68383b"], ["Chocolate", "#624431"],
      ["Cream", "#e7d8b8"], ["Silver", "#c8c5c0"], ["Warm white", "#ece5da"]
    ],
    hair: [
      ["Black", "#292727"], ["Blue black", "#293d54"], ["Dark brown", "#543627"],
      ["Chestnut", "#7b472d"], ["Auburn", "#8b4330"], ["Copper", "#ad6036"],
      ["Ginger", "#c87439"], ["Dark blonde", "#a47d45"], ["Blonde", "#c99d4b"],
      ["Honey blonde", "#d4b56d"], ["Platinum", "#ddd0ac"], ["Silver", "#aaa7a2"],
      ["White", "#e8e2d8"], ["Bauhaus blue", "#315785"], ["Green", "#44745b"],
      ["Violet", "#664d75"], ["Pink", "#b75b7c"], ["Red", "#9f3b32"]
    ],
    skin: [
      ["Porcelain", "#f3cfb2"], ["Fair", "#f0b88f"], ["Peach", "#ee9a60"],
      ["Light olive", "#d89b69"], ["Golden", "#cf7d45"], ["Warm tan", "#bb7045"],
      ["Warm brown", "#a65f37"], ["Chestnut brown", "#8e5033"], ["Deep brown", "#76422b"],
      ["Rich brown", "#633827"], ["Dark", "#4c2e24"], ["Deep dark", "#39231f"],
      ["Bauhaus yellow", "#e1b735"], ["Lemon yellow", "#e9d45a"], ["Bauhaus blue", "#4277ad"],
      ["Sky blue", "#6ca5cb"], ["Bauhaus green", "#4c8a61"], ["Mint green", "#79ad83"]
    ],
    shoes: [
      ["Black", "#292829"], ["Charcoal", "#444246"], ["White", "#eee8df"],
      ["Stone", "#aaa08f"], ["Red", "#c8382d"], ["Coral", "#d96855"],
      ["Orange", "#c86a2d"], ["Yellow", "#d6a126"], ["Blue", "#304f81"],
      ["Sky blue", "#668fb7"], ["Green", "#3f6a50"], ["Mint", "#78a98e"],
      ["Brown", "#684737"], ["Tan", "#9b7656"], ["Burgundy", "#65353b"],
      ["Violet", "#685177"], ["Pink", "#ba657f"], ["Cream", "#d9ccb5"]
    ]
  };

  const DEFAULT_STYLE = {
    bodyType: "boy",
    tshirt: "#df3526",
    trousers: "#292829",
    hair: "#292727",
    skin: "#ee9a60",
    shoes: "#292829"
  };
  const STORAGE_KEY = "push-bauhaus-character-style-v51";
  const LEGACY_KEYS = ["push-bauhaus-character-style-v47", "push-bauhaus-character-style-v48", "push-bauhaus-character-style-v40", "push-bauhaus-character-style-v39", "push-bauhaus-character-style-v38", "push-bauhaus-character-style-v37", "push-bauhaus-character-style-v36", "push-bauhaus-character-style-v35", "push-bauhaus-character-style-v32", "push-bauhaus-character-style-v31", "push-bauhaus-character-style-v30", "push-bauhaus-character-style-v29", "push-bauhaus-character-style-v28", "push-bauhaus-character-style-v25"];
  const images = new Map();
  const sheetBundles = new Map();
  const frameAssets = new Map();
  const resolvedAssets = new Map();
  const canvases = new Set();
  const renderedFrameUrls = new Map();
  const scratch = document.createElement("canvas");

  function validStyle(candidate) {
    const result = { ...DEFAULT_STYLE };
    if (!candidate || typeof candidate !== "object") return result;
    result.bodyType = BODY_TYPES.includes(candidate.bodyType) ? candidate.bodyType : DEFAULT_STYLE.bodyType;
    for (const category of CATEGORIES) {
      const allowed = OPTIONS[category].map(option => option[1].toLowerCase());
      const value = String(candidate[category] || "").toLowerCase();
      if (allowed.includes(value)) result[category] = value;
    }
    return result;
  }

  function loadSavedStyle() {
    const keys = [STORAGE_KEY, ...LEGACY_KEYS];
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return validStyle(JSON.parse(raw));
      } catch (error) {}
    }
    return { ...DEFAULT_STYLE };
  }

  let style = loadSavedStyle();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(style));

  function loadImage(src) {
    if (images.has(src)) return images.get(src);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${src}`));
      image.src = src;
    });
    images.set(src, promise);
    return promise;
  }

  function activeTheme() {
    return "bauhaus";
  }

  function loadSheetBundle(bodyType, theme = activeTheme()) {
    const themeKey = "bauhaus";
    const bundleKey = `${themeKey}:${bodyType}`;
    if (sheetBundles.has(bundleKey)) return sheetBundles.get(bundleKey);
    const root = `${CHARACTER_ASSET_ROOT}/${bodyType}`;
    const promise = Promise.all([
      loadImage(`${root}/base.png`),
      ...CATEGORIES.map(category => loadImage(`${root}/${category}.png`))
    ]).then(([base, ...layers]) => ({
      base,
      layers: Object.fromEntries(CATEGORIES.map((category, index) => [category, layers[index]]))
    }));
    sheetBundles.set(bundleKey, promise);
    return promise;
  }

  function frameSource(image, frame) {
    const index = FRAMES.indexOf(frame);
    if (index < 0) throw new Error(`Unknown character frame: ${frame}`);
    return {
      image,
      sx: (index % SHEET_COLS) * FRAME_WIDTH,
      sy: Math.floor(index / SHEET_COLS) * FRAME_HEIGHT,
      sw: FRAME_WIDTH,
      sh: FRAME_HEIGHT
    };
  }

  async function loadFrame(frame, bodyType = style.bodyType, theme = activeTheme()) {
    const themeKey = "bauhaus";
    const cacheKey = `${themeKey}:${bodyType}:${frame}`;
    if (frameAssets.has(cacheKey)) return frameAssets.get(cacheKey);
    const promise = loadSheetBundle(bodyType, themeKey).then(bundle => {
      const assets = {
        base: frameSource(bundle.base, frame),
        layers: Object.fromEntries(CATEGORIES.map(category => [category, frameSource(bundle.layers[category], frame)]))
      };
      resolvedAssets.set(cacheKey, assets);
      return assets;
    });
    frameAssets.set(cacheKey, promise);
    return promise;
  }

  const ready = renderFrameUrl("player-front")
    .then(() => {
      document.querySelectorAll("canvas[data-character-preview]").forEach(canvas => {
        canvases.add(canvas);
        draw(canvas, canvas.dataset.characterPreview || "player-front");
      });
    }).catch(error => console.error("Character style assets could not be prepared.", error));

  let characterWarmPromise = null;
  function warmCharacterFrames() {
    if (characterWarmPromise) return characterWarmPromise;
    characterWarmPromise = Promise.allSettled(
      FRAMES.filter(frame => frame !== "player-front").map(frame => renderFrameUrl(frame))
    );
    return characterWarmPromise;
  }

  function sizeScratch(canvas, width, height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return canvas.getContext("2d");
  }

  function drawSource(context, source, dx, dy, dw, dh) {
    context.drawImage(source.image, source.sx, source.sy, source.sw, source.sh, dx, dy, dw, dh);
  }

  function drawTintedLayer(context, layer, colour, width, height) {
    const off = sizeScratch(scratch, width, height);
    off.globalCompositeOperation = "source-over";
    off.globalAlpha = 1;
    off.clearRect(0, 0, width, height);
    off.fillStyle = colour;
    off.fillRect(0, 0, width, height);
    off.globalCompositeOperation = "multiply";
    drawSource(off, layer, 0, 0, width, height);
    off.globalCompositeOperation = "destination-in";
    drawSource(off, layer, 0, 0, width, height);
    context.globalCompositeOperation = "destination-out";
    drawSource(context, layer, 0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    context.drawImage(scratch, 0, 0, width, height);
  }

  function snapshotStyle() {
    return { ...style };
  }

  function drawNow(canvas, frame, assets, allowDetached = false, requestedStyle = style) {
    if (!canvas || !assets) return;
    if (!allowDetached && !canvas.isConnected && !canvas.closest?.(".piece")) return;
    const width = assets.base.sw;
    const height = assets.base.sh;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    drawSource(context, assets.base, 0, 0, width, height);
    for (const category of CATEGORIES) {
      drawTintedLayer(context, assets.layers[category], requestedStyle[category], width, height);
    }
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
  }

  function draw(canvas, frame = "player-front") {
    if (!canvas) return Promise.resolve();
    canvases.add(canvas);
    canvas.dataset.characterFrame = frame;
    const requestedStyle = snapshotStyle();
    const theme = activeTheme();
    const cacheKey = `${theme}:${requestedStyle.bodyType}:${frame}`;
    const assets = resolvedAssets.get(cacheKey);
    if (assets) {
      drawNow(canvas, frame, assets, false, requestedStyle);
      return Promise.resolve();
    }
    return loadFrame(frame, requestedStyle.bodyType, theme)
      .then(loaded => drawNow(canvas, frame, loaded, false, requestedStyle));
  }

  function renderedFrameKey(frame, requestedStyle = style) {
    return [activeTheme(), requestedStyle.bodyType, frame, ...CATEGORIES.map(category => requestedStyle[category])].join("|");
  }

  function fallbackFrameUrl(frame, bodyType = style.bodyType) {
    return `assets/characters-fallback/${bodyType}/${frame}.png`;
  }

  function clearRenderedFrames() {
    renderedFrameUrls.clear();
  }

  function renderFrameUrl(frame = "player-front", requestedStyle = snapshotStyle()) {
    const key = renderedFrameKey(frame, requestedStyle);
    const cached = renderedFrameUrls.get(key);
    if (cached) return Promise.resolve(cached);
    return loadFrame(frame, requestedStyle.bodyType, activeTheme()).then(assets => {
      const output = document.createElement("canvas");
      drawNow(output, frame, assets, true, requestedStyle);
      const url = output.toDataURL("image/png");
      renderedFrameUrls.set(key, url);
      return url;
    });
  }

  function drawImage(image, frame = "player-front") {
    if (!image) return Promise.resolve();
    const requestedStyle = snapshotStyle();
    image.dataset.characterFrame = frame;
    const requestKey = renderedFrameKey(frame, requestedStyle);
    image.dataset.characterRequest = requestKey;
    const cached = renderedFrameUrls.get(requestKey);
    if (cached) {
      image.src = cached;
      image.dataset.characterReady = "true";
      image.classList.remove("character-loading");
      return Promise.resolve();
    }

    // Keep an already-rendered customised sprite visible while the replacement is
    // composed. Only use the plain red/black fallback for a brand-new image.
    if (!image.src || image.dataset.characterReady !== "true") {
      image.src = fallbackFrameUrl(frame, requestedStyle.bodyType);
    }
    image.classList.add("character-loading");
    return renderFrameUrl(frame, requestedStyle).then(url => {
      if (image.dataset.characterRequest !== requestKey) return;
      image.src = url;
      image.dataset.characterReady = "true";
      image.classList.remove("character-loading");
    }).catch(error => {
      image.classList.remove("character-loading");
      console.error("Character image could not be rendered.", error);
    });
  }

  function updateStyleIcon() {
    document.querySelectorAll("[data-style-trigger] .style-shirt-body").forEach(shirt => {
      shirt.style.fill = style.tshirt;
    });
    document.querySelectorAll("[data-style-trigger] .style-trousers-body").forEach(trousers => {
      trousers.style.fill = style.trousers;
    });
  }

  function redrawAll() {
    updateStyleIcon();
    clearRenderedFrames();
    for (const canvas of [...canvases]) {
      if (!canvas.isConnected) {
        canvases.delete(canvas);
        continue;
      }
      draw(canvas, canvas.dataset.characterFrame || canvas.dataset.characterPreview || "player-front");
    }
    document.querySelectorAll("img[data-character-frame]").forEach(image => {
      drawImage(image, image.dataset.characterFrame || "player-front");
    });
    window.dispatchEvent(new CustomEvent("characterstylechange", { detail: { ...style } }));
  }

  function set(category, colour) {
    if (category === "bodyType") {
      if (!BODY_TYPES.includes(colour) || style.bodyType === colour) return;
      style.bodyType = colour;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
      updateSelectedSwatches();
      redrawAll();
      loadSheetBundle(style.bodyType, activeTheme())
        .then(() => redrawAll())
        .catch(error => console.error("Selected character assets could not be loaded.", error));
      return;
    }
    if (!CATEGORIES.includes(category)) return;
    const allowed = OPTIONS[category].map(option => option[1].toLowerCase());
    const next = String(colour).toLowerCase();
    if (!allowed.includes(next) || style[category] === next) return;
    style[category] = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
    updateSelectedSwatches();
    redrawAll();
  }

  function reset() {
    style = { ...DEFAULT_STYLE };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
    updateSelectedSwatches();
    redrawAll();
  }

  const styleModal = document.getElementById("styleModal");
  const styleTriggers = [...document.querySelectorAll("[data-style-trigger]")];
  const styleCloseBtn = document.getElementById("styleCloseBtn");
  const styleDoneBtn = document.getElementById("styleDoneBtn");
  const styleResetBtn = document.getElementById("styleResetBtn");
  const styleControls = document.getElementById("styleControls");
  let previousFocus = null;

  function buildControls() {
    if (!styleControls) return;
    styleControls.innerHTML = "";

    const typeGroup = document.createElement("fieldset");
    typeGroup.className = "style-group style-type-group";
    typeGroup.dataset.styleCategory = "bodyType";
    const typeLegend = document.createElement("legend");
    typeLegend.textContent = LABELS.bodyType;
    const typeChoices = document.createElement("div");
    typeChoices.className = "style-type-choices";
    [["INDI", "boy"], ["OLIVE", "girl"]].forEach(([label, value]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "style-type-btn";
      button.dataset.category = "bodyType";
      button.dataset.colour = value;
      button.textContent = label;
      button.setAttribute("aria-label", `Character: ${label}`);
      button.addEventListener("click", () => set("bodyType", value));
      typeChoices.appendChild(button);
    });
    typeGroup.append(typeLegend, typeChoices);
    styleControls.appendChild(typeGroup);

    for (const category of CATEGORIES) {
      const group = document.createElement("fieldset");
      group.className = "style-group";
      group.dataset.styleCategory = category;
      const legend = document.createElement("legend");
      legend.textContent = LABELS[category];
      const choices = document.createElement("div");
      choices.className = "style-swatches";
      for (const [name, colour] of OPTIONS[category]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "style-swatch";
        button.dataset.category = category;
        button.dataset.colour = colour.toLowerCase();
        button.title = name;
        button.setAttribute("aria-label", `${LABELS[category]}: ${name}`);
        button.style.setProperty("--swatch", colour);
        button.addEventListener("click", () => set(category, colour));
        choices.appendChild(button);
      }
      group.append(legend, choices);
      styleControls.appendChild(group);
    }
    updateSelectedSwatches();
  }

  function updateSelectedSwatches() {
    document.querySelectorAll(".style-swatch, .style-type-btn").forEach(button => {
      const cat = button.dataset.category;
      const val = button.dataset.colour;
      const selected = style[cat] === val;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function openModal() {
    if (!styleModal) return;
    previousFocus = document.activeElement;
    styleModal.hidden = false;
    document.body.classList.add("style-open");
    requestAnimationFrame(() => styleCloseBtn?.focus());
  }

  function closeModal() {
    if (!styleModal) return;
    styleModal.hidden = true;
    document.body.classList.remove("style-open");
    previousFocus?.focus?.();
  }

  styleTriggers.forEach(button => button.addEventListener("click", openModal));
  styleCloseBtn?.addEventListener("click", closeModal);
  styleDoneBtn?.addEventListener("click", closeModal);
  styleResetBtn?.addEventListener("click", reset);
  styleModal?.addEventListener("pointerdown", event => {
    if (event.target === styleModal) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (!styleModal?.hidden && event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }
  });

  buildControls();
  updateStyleIcon();

  window.CharacterStyler = {
    ready,
    warm: warmCharacterFrames,
    draw,
    drawImage,
    redrawAll,
    set,
    reset,
    get style() { return { ...style }; },
    get compactAssets() { return true; },
    get isOpen() { return Boolean(styleModal && !styleModal.hidden); }
  };
})();

(() => {
  "use strict";

  const GOAL_COLOURS = window.BoxxyGoalColours;
  const PACKS = Array.isArray(window.BOXXY_LEVEL_PACKS) && window.BOXXY_LEVEL_PACKS.length
    ? window.BOXXY_LEVEL_PACKS
    : [{
        id: "microban",
        title: "MICROBAN SERIES",
        displayName: "Microban Series",
        author: "David W. Skinner",
        accent: "black",
        levels: window.SOKOBAN_LEVELS || []
      }];
  const PACK_BY_ID = new Map(PACKS.map(pack => [pack.id, pack]));
  const PACK_COLLECTION_LABELS = Object.freeze({
    "boxxy-original-puzzle-pack-of-50-levels": "Boxxy Originals",
    microban: "Microban",
    chrysalis: "Chrysalis Variations",
    chessboards: "Small Chessboards",
    haikemono: "Haikemono",
    jigsaw: "The Jigsaw",
    exponentially: "Exponentially"
  });
  const PACK_COLLECTION_HEADER_HTML = Object.freeze({
    "boxxy-original-puzzle-pack-of-50-levels": "BOXXY<br>ORIGINALS",
    microban: "MICROBAN",
    chrysalis: "CHRYSALIS<br>VARIATIONS",
    chessboards: "SMALL<br>CHESSBOARDS",
    haikemono: "HAIKEMONO",
    jigsaw: "THE JIGSAW",
    exponentially: "EXPONENTIALLY"
  });
  const PACK_ARTWORK = Object.freeze({
    "boxxy-original-puzzle-pack-of-50-levels": {
      desktop: "assets/pack-art/boxxy-originals-banner.webp",
      mobile: "assets/pack-art/boxxy-originals-mobile.webp",
      alt: "Indi sitting on a crate and scratching his head"
    },
    jigsaw: {
      desktop: "assets/pack-art/the-jigsaw-banner.webp",
      mobile: "assets/pack-art/the-jigsaw-mobile.webp",
      alt: "Indi studying The Jigsaw map"
    },
    exponentially: {
      desktop: "assets/pack-art/exponentially-source.webp",
      mobile: "assets/pack-art/exponentially-mobile.webp",
      alt: "Indi screaming among a huge number of boxes"
    }
  });

  function packCollectionLabel(pack) {
    return PACK_COLLECTION_LABELS[pack?.id]
      || String(pack?.displayName || pack?.title || "Puzzle Pack");
  }

  function packCollectionHeaderHtml(pack) {
    if (PACK_COLLECTION_HEADER_HTML[pack?.id]) return PACK_COLLECTION_HEADER_HTML[pack.id];
    const safeLabel = packCollectionLabel(pack).toUpperCase().replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
    return safeLabel.replace(/\s+/, "<br>");
  }

  function packArtwork(pack) {
    return pack ? (PACK_ARTWORK[pack.id] || null) : null;
  }

  const DAILY_LAUNCH_DATE = /^\d{4}-\d{2}-\d{2}$/.test(String(window.BOXXY_DAILY_LAUNCH_DATE || ""))
    ? String(window.BOXXY_DAILY_LAUNCH_DATE)
    : "2026-08-30";
  const RAW_DAILY_SCHEDULES = Array.isArray(window.BOXXY_DAILY_SCHEDULES)
    ? window.BOXXY_DAILY_SCHEDULES
    : [window.BOXXY_DAILY_SCHEDULE];
  const DAILY_SCHEDULES = RAW_DAILY_SCHEDULES
    .filter(schedule => schedule && schedule.frontEndEnabled !== false && Array.isArray(schedule.puzzles));
  const DAILY_SCHEDULE = DAILY_SCHEDULES.find(schedule => String(schedule.month || "") === String(window.BOXXY_DAILY_MONTH_KEY || ""))
    || DAILY_SCHEDULES[DAILY_SCHEDULES.length - 1]
    || null;
  const DAILY_PUZZLES = (() => {
    const byDate = new Map();
    DAILY_SCHEDULES.forEach(schedule => {
      schedule.puzzles.forEach(puzzle => {
        if (!puzzle || !/^\d{4}-\d{2}-\d{2}$/.test(String(puzzle.date || "")) || !Array.isArray(puzzle.layout)) return;
        byDate.set(String(puzzle.date), puzzle);
      });
    });
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  })();
  const DAILY_PUZZLE_BY_DATE = new Map(DAILY_PUZZLES.map(puzzle => [String(puzzle.date), puzzle]));
  const DAILY_COMPLETIONS_KEY = "boxxy-daily-completions-v1";
  const DAILY_STREAK_KEY = "boxxy-daily-streak-v1";
  const DAILY_TEST_STREAK_KEY = "boxxy-daily-streak-test-v1";
  const DAILY_INVITE_SEEN_PREFIX = "boxxy-daily-invite-seen-";
  const DAILY_QUOTE_DISMISSED_PREFIX = "boxxy-daily-quote-dismissed-";
  const DAILY_DATE_OVERRIDE = (() => {
    try {
      const value = new URLSearchParams(window.location.search).get("dailyDate");
      return DAILY_PUZZLE_BY_DATE.has(String(value || "")) ? String(value) : "";
    } catch (_) {
      return "";
    }
  })();

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function activeDailyDateKey() {
    return DAILY_DATE_OVERRIDE || localDateKey();
  }

  function dailyPuzzleForToday() {
    return DAILY_PUZZLE_BY_DATE.get(activeDailyDateKey()) || null;
  }

  function parseDateKey(dateKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  }

  function formatDailyDate(dateKey, options = {}) {
    const date = parseDateKey(dateKey);
    if (!date) return String(dateKey || "");
    try {
      return new Intl.DateTimeFormat("en-GB", {
        weekday: options.weekday ? (options.compact ? "short" : "long") : undefined,
        day: "numeric",
        month: options.long ? "long" : "short",
        year: options.year ? "numeric" : undefined
      }).format(date);
    } catch (_) {
      return dateKey;
    }
  }

  function readDailyCompletions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DAILY_COMPLETIONS_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeDailyCompletions(completions) {
    try { localStorage.setItem(DAILY_COMPLETIONS_KEY, JSON.stringify(completions)); } catch (_) {}
  }

  function dailyCompletion(dateKey) {
    const value = readDailyCompletions()[String(dateKey || "")];
    return value && typeof value === "object" ? value : null;
  }

  function recordDailyCompletion(puzzle, result) {
    if (!puzzle?.date) return null;
    const completions = readDailyCompletions();
    const key = String(puzzle.date);
    const attempt = {
      sequence: Number(puzzle.sequence) || 0,
      moves: Math.max(0, Number(result.moves) || 0),
      pushes: Math.max(0, Number(result.pushes) || 0),
      seconds: Math.max(0, Number(result.seconds) || 0),
      completedAt: Number(result.completedAt) || Date.now()
    };
    const previous = completions[key];
    const previousMoves = Number(previous?.moves);
    const previousPushes = Number(previous?.pushes);
    const previousSeconds = Number(previous?.seconds);
    if (!previous || !Number.isFinite(previousMoves) || attempt.moves < Math.max(0, previousMoves)) {
      completions[key] = attempt;
    } else {
      completions[key] = {
        ...previous,
        pushes: Number.isFinite(previousPushes) ? Math.min(Math.max(0, previousPushes), attempt.pushes) : attempt.pushes,
        seconds: Number.isFinite(previousSeconds) ? Math.min(Math.max(0, previousSeconds), attempt.seconds) : attempt.seconds,
        completedAt: attempt.completedAt
      };
    }
    writeDailyCompletions(completions);
    return completions[key];
  }

  function addDaysToDailyDateKey(dateKey, amount) {
    const date = parseDateKey(dateKey);
    if (!date) return "";
    date.setDate(date.getDate() + Number(amount || 0));
    return localDateKey(date);
  }

  function dailyStreakStorageKey() {
    return DAILY_DATE_OVERRIDE ? DAILY_TEST_STREAK_KEY : DAILY_STREAK_KEY;
  }

  function readDailyStreakState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(dailyStreakStorageKey()) || "null");
      const rawCount = Number(parsed?.count);
      const count = Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0;
      const lastQualifiedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(parsed?.lastQualifiedDate || ""))
        ? String(parsed.lastQualifiedDate)
        : "";

      if (!count || !lastQualifiedDate) {
        return { count: 0, lastQualifiedDate: "" };
      }

      return { count, lastQualifiedDate };
    } catch (_) {
      return { count: 0, lastQualifiedDate: "" };
    }
  }

  function writeDailyStreakState(state) {
    try {
      localStorage.setItem(dailyStreakStorageKey(), JSON.stringify({
        count: Math.max(0, Math.trunc(Number(state.count) || 0)),
        lastQualifiedDate: String(state.lastQualifiedDate || "")
      }));
    } catch (_) {}
  }

  function currentDailyStreak(referenceDateKey = activeDailyDateKey()) {
    const referenceDate = String(referenceDateKey || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) return 0;

    const state = readDailyStreakState();
    if (!state.lastQualifiedDate || state.count < 1) return 0;

    if (state.lastQualifiedDate === referenceDate) return state.count;
    if (addDaysToDailyDateKey(state.lastQualifiedDate, 1) === referenceDate) return state.count;
    return 0;
  }

  function awardDailyStreakForCompletion(completedDateKey) {
    const completedDate = String(completedDateKey || "");
    const currentDate = activeDailyDateKey();

    if (completedDate !== currentDate) {
      return {
        count: currentDailyStreak(currentDate),
        changed: false,
        reason: "historical"
      };
    }

    const state = readDailyStreakState();

    if (state.lastQualifiedDate === currentDate) {
      return {
        count: state.count,
        changed: false,
        reason: "already-qualified"
      };
    }

    const yesterday = addDaysToDailyDateKey(currentDate, -1);
    const continued = state.lastQualifiedDate === yesterday;
    const nextState = {
      count: continued ? state.count + 1 : 1,
      lastQualifiedDate: currentDate
    };

    writeDailyStreakState(nextState);

    return {
      count: nextState.count,
      changed: true,
      reason: continued ? "continued" : "started"
    };
  }

  function dailyStreakTier(streak) {
    if (streak >= 365) return "silver";
    if (streak >= 100) return "purple";
    if (streak >= 50) return "fire";
    if (streak >= 20) return "red";
    if (streak >= 5) return "blue";
    if (streak >= 1) return "green";
    return "zero";
  }

  const SHARED_PUZZLE_PAYLOAD = window.BoxxyShareCodec?.readLocation?.() || null;
  const PRIMARY_PACK_ID = PACKS[0]?.id || "microban";
  const MICROBAN_PACK_ID = "microban";
  const JIGSAW_PACK_ID = "jigsaw";
  const ALWAYS_UNLOCKED_PACK_IDS = new Set([PRIMARY_PACK_ID, MICROBAN_PACK_ID]);
  const UNLOCK_SOURCE_PACK_IDS = new Set([PRIMARY_PACK_ID, MICROBAN_PACK_ID]);
  const ADDITIONAL_PACKS_UNLOCK_KEY = "boxxy-additional-packs-unlocked-v1";
  const ACTIVE_PACK_STORAGE_KEY = "boxxy-active-pack-v2";
  const packStorageKeyFor = (packId, suffix) => `boxxy-pack-${packId}-${suffix}-v1`;
  const packCompletionStatsKeyFor = packId => packStorageKeyFor(packId, "completion-stats");
  const PACK_ACCENT_COLOURS = Object.freeze({
    red: "#db3b27",
    black: "#171719",
    green: "#2f8f5b",
    blue: "#20539a",
    yellow: "#e5b32a",
    purple: "#8e44ad",
    orange: "#f47a20",
    teal: "#00a6b2"
  });

  function readPackCompletionStats(packId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(packCompletionStatsKeyFor(packId)) || "null");
      if (parsed && typeof parsed === "object" && parsed.levels && typeof parsed.levels === "object") {
        return parsed;
      }
    } catch (_) {}
    return { version: 1, levels: {} };
  }

  function writePackCompletionStats(packId, data) {
    try { localStorage.setItem(packCompletionStatsKeyFor(packId), JSON.stringify(data)); } catch (_) {}
  }

  function recordLevelCompletionStats(pack, index, result) {
    if (!pack?.id || !Number.isInteger(index) || index < 0) return false;
    const data = readPackCompletionStats(pack.id);
    const key = String(index);
    const attempt = {
      moves: Math.max(0, Number(result.moves) || 0),
      pushes: Math.max(0, Number(result.pushes) || 0),
      seconds: Math.max(0, Number(result.seconds) || 0),
      guided: Boolean(result.guided),
      completedAt: Number(result.completedAt) || Date.now()
    };
    const level = Array.isArray(pack.levels) ? pack.levels[index] : null;
    const officialBestMoves = bestMovesForPack(pack, level);

    /* Pushes and time only belong to the official best-move score. A slower
       replay must never replace, or lend its time to, the best result. */
    if (officialBestMoves != null && attempt.moves !== officialBestMoves) return false;

    const previous = data.levels[key];
    if (!previous || typeof previous !== "object") {
      data.levels[key] = attempt;
      writePackCompletionStats(pack.id, data);
      return true;
    }

    const previousMoves = Math.max(0, Number(previous.moves) || 0);
    if (officialBestMoves != null) {
      /* Replace an older or guided record that does not belong to the current
         official best. This also repairs legacy records as they are replayed. */
      if (previousMoves !== officialBestMoves) {
        data.levels[key] = attempt;
        writePackCompletionStats(pack.id, data);
        return true;
      }
    } else {
      if (attempt.moves > previousMoves) return false;
      if (attempt.moves < previousMoves) {
        data.levels[key] = attempt;
        writePackCompletionStats(pack.id, data);
        return true;
      }
    }

    let changed = false;
    const next = { ...previous, moves: previousMoves };
    const previousPushes = Math.max(0, Number(previous.pushes) || 0);
    const previousSeconds = Math.max(0, Number(previous.seconds) || 0);

    if (!Number.isFinite(Number(previous.pushes)) || attempt.pushes < previousPushes) {
      next.pushes = attempt.pushes;
      changed = true;
    }
    if (!Number.isFinite(Number(previous.seconds)) || attempt.seconds < previousSeconds) {
      next.seconds = attempt.seconds;
      changed = true;
    }

    if (!changed) return false;
    next.completedAt = attempt.completedAt;
    next.guided = Boolean(previous.guided && attempt.guided);
    data.levels[key] = next;
    writePackCompletionStats(pack.id, data);
    return true;
  }

  function bestMovesForPack(pack, level) {
    if (!pack?.id || !level) return null;
    const current = localStorage.getItem(packStorageKeyFor(pack.id, `best-${level.sourceNumber}`));
    if (current != null && Number.isFinite(Number(current))) return Number(current);
    if (pack.id === MICROBAN_PACK_ID) {
      const legacy = localStorage.getItem(`push-bauhaus-v22-best-${level.sourceNumber}`);
      if (legacy != null && Number.isFinite(Number(legacy))) return Number(legacy);
    }
    return null;
  }

  function packCompletionTotals(pack) {
    const data = readPackCompletionStats(pack.id);
    let moves = 0;
    let pushes = 0;
    let seconds = 0;
    let moveLevels = 0;
    let pushLevels = 0;
    let timeLevels = 0;
    let recordedLevels = 0;

    pack.levels.forEach((level, index) => {
      const record = data.levels[String(index)];
      const recordedMoves = record && typeof record === "object" && Number.isFinite(Number(record.moves))
        ? Math.max(0, Number(record.moves))
        : null;
      const officialBestMoves = bestMovesForPack(pack, level);
      const effectiveMoves = officialBestMoves != null ? Math.max(0, officialBestMoves) : recordedMoves;

      if (record && typeof record === "object") recordedLevels++;
      if (effectiveMoves != null) {
        moves += effectiveMoves;
        moveLevels++;
      }

      /* A level's pushes and time count only when that stored attempt has the
         same move score as the official best. This keeps the pack time as the
         aggregate time attached to each level's best-move result. */
      if (!record || typeof record !== "object" || recordedMoves == null || recordedMoves !== effectiveMoves) return;
      if (Number.isFinite(Number(record.pushes))) {
        pushes += Math.max(0, Number(record.pushes));
        pushLevels++;
      }
      if (Number.isFinite(Number(record.seconds))) {
        seconds += Math.max(0, Number(record.seconds));
        timeLevels++;
      }
    });

    return {
      moves,
      pushes,
      seconds,
      moveLevels,
      pushLevels,
      timeLevels,
      recordedLevels,
      levelCount: pack.levels.length
    };
  }

  function formatPackDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(remainder).padStart(2, "0")}s`;
    if (minutes) return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
    return `${remainder}s`;
  }

  function packIsComplete(packId) {
    const pack = PACK_BY_ID.get(packId);
    if (!pack?.levels?.length) return false;

    const finalIndex = pack.levels.length - 1;
    let completed = [];
    try {
      const currentRaw = localStorage.getItem(packStorageKeyFor(pack.id, "completed"));
      const legacyRaw = pack.id === MICROBAN_PACK_ID ? localStorage.getItem("boxxy-completed-levels-v1") : null;
      completed = JSON.parse(currentRaw ?? legacyRaw ?? "[]");
    } catch (_) {}

    const finalLevel = pack.levels[finalIndex];
    const currentBest = finalLevel
      ? localStorage.getItem(packStorageKeyFor(pack.id, `best-${finalLevel.sourceNumber}`))
      : null;
    const legacyBest = pack.id === MICROBAN_PACK_ID && finalLevel
      ? localStorage.getItem(`push-bauhaus-v22-best-${finalLevel.sourceNumber}`)
      : null;

    return (Array.isArray(completed) && completed.map(Number).includes(finalIndex)) || Boolean(currentBest || legacyBest);
  }

  function additionalPacksUnlocked() {
    if (localStorage.getItem(ADDITIONAL_PACKS_UNLOCK_KEY) === "true") return true;
    const complete = [...UNLOCK_SOURCE_PACK_IDS].some(packIsComplete);
    if (complete) localStorage.setItem(ADDITIONAL_PACKS_UNLOCK_KEY, "true");
    return complete;
  }

  function packIsLocked(pack) {
    return !ALWAYS_UNLOCKED_PACK_IDS.has(pack?.id) && !additionalPacksUnlocked();
  }

  const savedPackId = localStorage.getItem(ACTIVE_PACK_STORAGE_KEY);
  let activePack = PACK_BY_ID.get(savedPackId) || PACKS[0];
  if (packIsLocked(activePack)) {
    activePack = PACK_BY_ID.get(PRIMARY_PACK_ID) || PACKS[0];
    localStorage.setItem(ACTIVE_PACK_STORAGE_KEY, activePack.id);
  }
  let LEVELS = Array.isArray(activePack.levels) ? activePack.levels : [];

  const packStorageKey = suffix => packStorageKeyFor(activePack.id, suffix);
  const currentLevelStorageKey = () => packStorageKey("level");
  const currentProgressStorageKey = () => packStorageKey("progress");
  const currentCompletedStorageKey = () => packStorageKey("completed");
  const currentAssistedStorageKey = () => packStorageKey("assisted");
  const currentBestStorageKey = level => packStorageKey(`best-${level.sourceNumber}`);
  const currentCheckpointStorageKey = () => packStorageKey(`position-${levelIndex}`);

  function checkpointLayoutSignature() {
    const rows = Array.isArray(levelData?.layout) ? levelData.layout : [];
    const text = rows.join("\n");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `${rows.length}:${(hash >>> 0).toString(16)}`;
  }

  function readCurrentCheckpoint() {
    try {
      const parsed = JSON.parse(localStorage.getItem(currentCheckpointStorageKey()) || "null");
      if (!parsed || parsed.version !== 1 || parsed.packId !== activePack.id || Number(parsed.levelIndex) !== levelIndex) return null;
      if (parsed.layoutSignature !== checkpointLayoutSignature()) {
        localStorage.removeItem(currentCheckpointStorageKey());
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function currentPositionFingerprint() {
    const boxText = boxes.map(box => `${box.x},${box.y}`).sort().join(";");
    return `${player[0]},${player[1]}|${boxText}|${moves}|${pushes}|${facing}|${playedRoute}`;
  }

  function checkpointFingerprint(checkpoint) {
    if (!checkpoint) return "";
    const boxText = (Array.isArray(checkpoint.boxes) ? checkpoint.boxes : [])
      .map(box => `${Number(box.x)},${Number(box.y)}`).sort().join(";");
    const savedPlayer = Array.isArray(checkpoint.player) ? checkpoint.player : [];
    return `${Number(savedPlayer[0])},${Number(savedPlayer[1])}|${boxText}|${Number(checkpoint.moves) || 0}|${Number(checkpoint.pushes) || 0}|${checkpoint.facing || "front"}|${String(checkpoint.route || "")}`;
  }

  function atFreshLevelStart() {
    return moves === 0 && pushes === 0 && !history.length && !playedRoute;
  }

  function updateSavePositionButton() {
    if (!savePositionBtn) return;
    const unavailable = makerTesting || sharedPuzzleMode || dailyMode;
    savePositionBtn.hidden = unavailable;
    if (unavailable) return;

    const label = savePositionBtn.querySelector("b");
    const icon = savePositionBtn.querySelector("span");
    const matches = currentCheckpoint && checkpointFingerprint(currentCheckpoint) === currentPositionFingerprint();
    const canResume = currentCheckpoint && atFreshLevelStart();
    savePositionBtn.classList.toggle("has-checkpoint", Boolean(currentCheckpoint));
    savePositionBtn.classList.toggle("saved-current", Boolean(matches));

    if (canResume) {
      if (label) label.textContent = "RESUME";
      if (icon) icon.textContent = "↥";
      savePositionBtn.title = "Restore the saved position for this level";
      savePositionBtn.disabled = completed || autoplayRunning;
    } else if (matches) {
      if (label) label.textContent = "SAVED";
      if (icon) icon.textContent = "✓";
      savePositionBtn.title = "This position is saved";
      savePositionBtn.disabled = true;
    } else {
      if (label) label.textContent = "SAVE";
      if (icon) icon.textContent = "▣";
      savePositionBtn.title = currentCheckpoint ? "Replace the saved position with the current one" : "Save the current position";
      savePositionBtn.disabled = completed || autoplayRunning || moves === 0;
    }
  }

  function checkpointIsValid(checkpoint) {
    if (!checkpoint || !Array.isArray(checkpoint.player) || !Array.isArray(checkpoint.boxes)) return false;
    const px = Number(checkpoint.player[0]);
    const py = Number(checkpoint.player[1]);
    if (!Number.isInteger(px) || !Number.isInteger(py) || !floor.has(key(px, py))) return false;
    if (checkpoint.boxes.length !== boxes.length) return false;
    const seen = new Set();
    for (const box of checkpoint.boxes) {
      const x = Number(box.x);
      const y = Number(box.y);
      const boxKey = key(x, y);
      if (!Number.isInteger(x) || !Number.isInteger(y) || !floor.has(boxKey) || seen.has(boxKey) || (x === px && y === py)) return false;
      seen.add(boxKey);
    }
    return true;
  }

  function restoreCheckpoint() {
    if (!checkpointIsValid(currentCheckpoint)) {
      localStorage.removeItem(currentCheckpointStorageKey());
      currentCheckpoint = null;
      updateSavePositionButton();
      if (thoughtText) thoughtText.textContent = "That saved position could not be restored.";
      return;
    }
    stopAutoplay();
    blockedPushHeld = false;
    clearTimeout(animTimer);
    player = [Number(currentCheckpoint.player[0]), Number(currentCheckpoint.player[1])];
    boxes = currentCheckpoint.boxes.map(box => ({ x: Number(box.x), y: Number(box.y), moving: false }));
    moves = Math.max(0, Number(currentCheckpoint.moves) || 0);
    pushes = Math.max(0, Number(currentCheckpoint.pushes) || 0);
    facing = ["front", "back", "left", "right"].includes(currentCheckpoint.facing) ? currentCheckpoint.facing : "front";
    playedRoute = String(currentCheckpoint.route || "").replace(/[^UDLR]/gi, "").toUpperCase();
    history = [];
    completed = false;
    modal.hidden = true;
    startedAt = Date.now() - Math.max(0, Number(currentCheckpoint.elapsedMs) || 0);
    render("idle");
    updateTime();
    scheduleIdle();
    if (thoughtText) thoughtText.textContent = "Saved position restored.";
  }

  function saveOrRestorePosition() {
    if (makerTesting || sharedPuzzleMode || dailyMode || completed || autoplayRunning) return;
    if (currentCheckpoint && atFreshLevelStart()) {
      restoreCheckpoint();
      return;
    }
    if (moves === 0) return;
    const checkpoint = {
      version: 1,
      packId: activePack.id,
      levelIndex,
      layoutSignature: checkpointLayoutSignature(),
      player: [...player],
      boxes: boxes.map(box => ({ x: box.x, y: box.y })),
      moves,
      pushes,
      facing,
      route: playedRoute,
      elapsedMs: Math.max(0, Date.now() - startedAt),
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(currentCheckpointStorageKey(), JSON.stringify(checkpoint));
      currentCheckpoint = checkpoint;
      updateSavePositionButton();
      if (thoughtText) thoughtText.textContent = "Position saved. Restart or reopen the level, then press Resume to return here.";
    } catch (_) {
      if (thoughtText) thoughtText.textContent = "The browser could not save this position.";
    }
  }

  function clearCurrentCheckpoint() {
    try { localStorage.removeItem(currentCheckpointStorageKey()); } catch (_) {}
    currentCheckpoint = null;
    updateSavePositionButton();
  }

  function storedLevelIndexForPack(pack = activePack) {
    const key = `boxxy-pack-${pack.id}-level-v1`;
    const legacy = pack.id === "microban"
      ? localStorage.getItem("push-bauhaus-v33-level") || localStorage.getItem("push-bauhaus-v29-level")
      : null;
    const raw = localStorage.getItem(key) ?? legacy ?? 0;
    return Math.max(0, Math.min(Math.max(0, pack.levels.length - 1), Number(raw) || 0));
  }

  function readPackLevelProgress(pack = activePack) {
    const levels = Array.isArray(pack?.levels) ? pack.levels : [];
    const completed = new Set();
    const assisted = new Set();
    const packId = String(pack?.id || "");
    const currentIndex = storedLevelIndexForPack(pack);

    try {
      const currentRaw = localStorage.getItem(packStorageKeyFor(packId, "completed"));
      const legacyRaw = packId === "microban" ? localStorage.getItem("boxxy-completed-levels-v1") : null;
      const saved = JSON.parse(currentRaw ?? legacyRaw ?? "[]");
      if (Array.isArray(saved)) saved.forEach(value => {
        const index = Number(value);
        if (Number.isInteger(index) && index >= 0 && index < levels.length) completed.add(index);
      });
    } catch (_) {}

    try {
      const saved = JSON.parse(localStorage.getItem(packStorageKeyFor(packId, "assisted")) ?? "[]");
      if (Array.isArray(saved)) saved.forEach(value => {
        const index = Number(value);
        if (Number.isInteger(index) && index >= 0 && index < levels.length) assisted.add(index);
      });
    } catch (_) {}

    if (packId === "microban") {
      levels.forEach((level, index) => {
        try {
          if (localStorage.getItem(`push-bauhaus-v22-best-${level.sourceNumber}`)) completed.add(index);
        } catch (_) {}
      });
    }

    for (const index of [...assisted]) if (!completed.has(index)) assisted.delete(index);
    let storedProgress = 0;
    try {
      const currentRaw = localStorage.getItem(packStorageKeyFor(packId, "progress"));
      const legacyRaw = packId === "microban" ? localStorage.getItem("boxxy-level-progress-v1") : null;
      const parsed = Number(currentRaw ?? legacyRaw);
      if (Number.isFinite(parsed)) storedProgress = parsed;
    } catch (_) {}
    const furthestCompleted = completed.size ? Math.max(...completed) + 1 : 0;
    const highestUnlocked = Math.min(
      Math.max(0, levels.length - 1),
      Math.max(0, storedProgress, furthestCompleted, currentIndex)
    );
    return { completed, assisted, currentIndex, highestUnlocked };
  }

  function drawLevelThumbnail(canvas, level) {
    if (!canvas || !Array.isArray(level?.layout) || !level.layout.length) return;
    const rows = level.layout.map(row => String(row));
    const width = Math.max(1, ...rows.map(row => row.length));
    const height = Math.max(1, rows.length);
    const grid = rows.map(row => row.padEnd(width, " ").split(""));
    const structural = (char) => char === "#" || ".$@*+".includes(char) || GOAL_COLOURS?.isTextCode?.(char);
    let minX = width - 1, maxX = 0, minY = height - 1, maxY = 0, found = false;
    grid.forEach((row, y) => row.forEach((char, x) => {
      if (!structural(char)) return;
      found = true;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }));
    if (!found) { minX = 0; minY = 0; maxX = width - 1; maxY = height - 1; }
    minX = Math.max(0, minX - 1); minY = Math.max(0, minY - 1);
    maxX = Math.min(width - 1, maxX + 1); maxY = Math.min(height - 1, maxY + 1);

    const viewWidth = Math.max(1, maxX - minX + 1);
    const viewHeight = Math.max(1, maxY - minY + 1);
    const context = canvas.getContext("2d");
    if (!context) return;
    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssWidth = 160;
    const cssHeight = 104;
    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);
    context.fillStyle = "#d8cdbd";
    context.fillRect(0, 0, cssWidth, cssHeight);

    const margin = 5;
    const cell = Math.max(2, Math.min((cssWidth - margin * 2) / viewWidth, (cssHeight - margin * 2) / viewHeight));
    const boardWidth = cell * viewWidth;
    const boardHeight = cell * viewHeight;
    const offsetX = (cssWidth - boardWidth) / 2;
    const offsetY = (cssHeight - boardHeight) / 2;
    const goalMap = level.goalColours && typeof level.goalColours === "object" ? level.goalColours : {};

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const raw = grid[y]?.[x] || " ";
        const decoded = GOAL_COLOURS?.decodeTextChar?.(raw);
        const char = decoded?.cell || raw;
        const colourName = GOAL_COLOURS?.normalise?.(decoded?.colour || goalMap[`${x},${y}`]) || "red";
        const colour = GOAL_COLOURS?.PALETTE?.[colourName]?.hex || "#ec2826";
        const dx = offsetX + (x - minX) * cell;
        const dy = offsetY + (y - minY) * cell;
        const isWall = char === "#";
        const isGoal = ".*+".includes(char);
        const isBox = "$*".includes(char);
        const isPlayer = "@+".includes(char);
        const isFloor = isWall || isGoal || isBox || isPlayer || raw === " ";
        if (!isFloor) continue;

        context.fillStyle = isWall ? "#242426" : "#f3e8d7";
        context.fillRect(dx, dy, Math.ceil(cell), Math.ceil(cell));
        if (isWall) {
          context.fillStyle = "rgba(255,255,255,.08)";
          context.fillRect(dx, dy, Math.ceil(cell), Math.max(1, cell * .13));
          continue;
        }
        context.strokeStyle = "rgba(80,63,42,.13)";
        context.lineWidth = Math.max(.45, cell * .035);
        context.strokeRect(dx + .25, dy + .25, Math.max(0, cell - .5), Math.max(0, cell - .5));
        if (isGoal) {
          context.beginPath();
          context.arc(dx + cell / 2, dy + cell / 2, Math.max(1.3, cell * .29), 0, Math.PI * 2);
          context.strokeStyle = colour;
          context.lineWidth = Math.max(1, cell * .14);
          context.stroke();
        }
        if (isBox) {
          const inset = Math.max(1, cell * .12);
          context.fillStyle = isGoal ? colour : "#efbd25";
          context.fillRect(dx + inset, dy + inset, Math.max(1, cell - inset * 2), Math.max(1, cell - inset * 2));
          context.strokeStyle = "rgba(55,38,18,.72)";
          context.lineWidth = Math.max(.8, cell * .07);
          context.strokeRect(dx + inset, dy + inset, Math.max(1, cell - inset * 2), Math.max(1, cell - inset * 2));
        }
        if (isPlayer) {
          context.beginPath();
          context.arc(dx + cell / 2, dy + cell / 2, Math.max(1.4, cell * .28), 0, Math.PI * 2);
          context.fillStyle = "#20539a";
          context.fill();
          context.strokeStyle = "#f7efe4";
          context.lineWidth = Math.max(.7, cell * .07);
          context.stroke();
        }
      }
    }
  }

  function readBest(level) {
    const value = localStorage.getItem(currentBestStorageKey(level));
    if (value != null) return value;
    if (activePack.id === "microban") return localStorage.getItem(`push-bauhaus-v22-best-${level.sourceNumber}`);
    return null;
  }

  const DIRS = {
    left:  { dx: -1, dy: 0, code: "L" },
    right: { dx:  1, dy: 0, code: "R" },
    up:    { dx:  0, dy: -1, code: "U" },
    down:  { dx:  0, dy: 1, code: "D" }
  };
  const DELTA_TO_FACING = (dx, dy) => dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "back" : "front";
  const DELTA_TO_CODE = (dx, dy) => dx < 0 ? "L" : dx > 0 ? "R" : dy < 0 ? "U" : "D";
  const CODE_TO_DELTA = {
    L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1]
  };

  const floorLayer = document.getElementById("floorLayer");
  const voidLayer = document.getElementById("voidLayer");
  const wallLayer = document.getElementById("wallLayer");
  const goalLayer = document.getElementById("goalLayer");
  const pieceLayer = document.getElementById("pieceLayer");
  const movesEl = document.getElementById("moves");
  const pushesEl = document.getElementById("pushes");
  const bestEl = document.getElementById("best");
  const timeEl = document.getElementById("time");
  const levelCount = document.getElementById("levelCount");
  const creditTitle = document.getElementById("creditTitle");
  const creditSub = document.getElementById("creditSub");
  const undoBtn = document.getElementById("undoBtn");
  const restartBtn = document.getElementById("restartBtn");
  const savePositionBtn = document.getElementById("savePositionBtn");
  const soundBtn = document.getElementById("soundBtn");
  const musicBtn = document.getElementById("musicBtn");
  const bgMusic = document.getElementById("bgMusic");
  const levelBtn = document.getElementById("levelBtn");
  const levelPicker = document.getElementById("levelPicker");
  const levelPickerTitle = document.getElementById("levelPickerTitle");
  const levelButtons = document.getElementById("levelButtons");
  const levelCloseBtn = document.getElementById("levelCloseBtn");
  const levelResetBtn = document.getElementById("levelResetBtn");
  const collectionCompleteStar = document.getElementById("collectionCompleteStar");
  const completedPackStars = document.getElementById("completedPackStars");
  const dailyStreak = document.getElementById("dailyStreak");
  const dailyStreakNumber = document.getElementById("dailyStreakNumber");
  const dailyQuotePrompt = document.getElementById("dailyQuotePrompt");
  const dailyQuotePlay = document.getElementById("dailyQuotePlay");
  const dailyQuoteDismiss = document.getElementById("dailyQuoteDismiss");
  const dailyQuoteMeta = document.getElementById("dailyQuoteMeta");
  const dailyInviteModal = document.getElementById("dailyInviteModal");
  const dailyInviteClose = document.getElementById("dailyInviteClose");
  const dailyInviteLater = document.getElementById("dailyInviteLater");
  const dailyInvitePlay = document.getElementById("dailyInvitePlay");
  const dailyInviteText = document.getElementById("dailyInviteText");
  const dailyInviteStatus = document.getElementById("dailyInviteStatus");
  const dailyArchiveModal = document.getElementById("dailyArchiveModal");
  const dailyArchiveCloseBtn = document.getElementById("dailyArchiveCloseBtn");
  const dailyArchiveMonths = document.getElementById("dailyArchiveMonths");
  const dailyArchiveSummary = document.getElementById("dailyArchiveSummary");
  const dailyArchiveCountdownLabel = document.getElementById("dailyArchiveCountdownLabel");
  const dailyArchiveCountdown = document.getElementById("dailyArchiveCountdown");
  const dailyArchiveCountdownDate = document.getElementById("dailyArchiveCountdownDate");
  const grandCelebration = document.getElementById("grandCelebration");
  const resetConfirmModal = document.getElementById("resetConfirmModal");
  const resetConfirmBtn = document.getElementById("resetConfirmBtn");
  const resetCancelBtn = document.getElementById("resetCancelBtn");
  const modal = document.getElementById("completeModal");
  const completeText = document.getElementById("completeText");
  const dailySharePanel = document.getElementById("dailySharePanel");
  const dailyShareText = document.getElementById("dailyShareText");
  const dailyShareButton = document.getElementById("dailyShareButton");
  const dailyCopyButton = document.getElementById("dailyCopyButton");
  const dailyShareStatus = document.getElementById("dailyShareStatus");
  const packStarAward = document.getElementById("packStarAward");
  const packStarAwardIcon = document.getElementById("packStarAwardIcon");
  const packStarAwardText = document.getElementById("packStarAwardText");
  const packCompletionStats = document.getElementById("packCompletionStats");
  const packTotalMoves = document.getElementById("packTotalMoves");
  const packTotalPushes = document.getElementById("packTotalPushes");
  const packTotalTime = document.getElementById("packTotalTime");
  const completeTitle = document.getElementById("completeTitle");
  const completedPackHeading = document.getElementById("completedPackHeading");
  const completeKicker = modal?.querySelector(".complete-kicker");
  const completeCard = modal?.querySelector(".complete-card");
  const completeSprite = document.getElementById("completeSprite");
  const nextBtn = document.getElementById("nextBtn");
  const dailyCompletionActions = document.getElementById("dailyCompletionActions");
  const standardCompletionActions = document.getElementById("standardCompletionActions");
  const dailyCompletePackBtn = document.getElementById("dailyCompletePackBtn");
  const dailyCompleteArchiveBtn = document.getElementById("dailyCompleteArchiveBtn");
  const completeCloseBtn = document.getElementById("completeCloseBtn");
  const nextBtnLabel = nextBtn?.querySelector("span");
  const nextBtnIcon = nextBtn?.querySelector("b");
  const claimPrizeBtn = document.getElementById("claimPrizeBtn");
  const prizeModal = document.getElementById("prizeModal");
  const prizeCloseBtn = document.getElementById("prizeCloseBtn");
  const makerApplySolveBtn = document.getElementById("makerApplySolveBtn");
  const finalPackPicker = document.getElementById("finalPackPicker");
  const finalPackStatus = document.getElementById("finalPackStatus");
  const finalPackGrid = document.getElementById("finalPackGrid");
  const finalPackMoreBtn = document.getElementById("finalPackMoreBtn");
  const packModal = document.getElementById("packModal");
  const packGrid = document.getElementById("packGrid");
  const packCloseBtn = document.getElementById("packCloseBtn");
  const celebration = document.getElementById("celebration");
  const board = document.getElementById("board");
  const boardWrap = document.querySelector(".board-wrap");
  const firstPersonHotspot = document.getElementById("firstPersonHotspot");
  const firstPersonCanvas = document.getElementById("firstPersonCanvas");
  const firstPersonBoom = document.getElementById("firstPersonBoom");

  const firstPersonCameraControl = document.createElement("div");
  firstPersonCameraControl.id = "firstPersonCameraControl";
  firstPersonCameraControl.className = "first-person-camera-control";
  firstPersonCameraControl.hidden = true;
  firstPersonCameraControl.innerHTML = `
    <div class="first-person-camera-heading">
      <span>CAMERA</span>
      <output id="firstPersonCameraValue" for="firstPersonCameraSlider">FIRST PERSON</output>
    </div>
    <input id="firstPersonCameraSlider" class="first-person-camera-slider" type="range" min="0" max="100" step="1" value="0" aria-label="Zoom the 3D camera from first person to the whole map">
    <div class="first-person-camera-scale" aria-hidden="true"><span>FIRST PERSON</span><span>WHOLE MAP</span></div>`;
  board?.appendChild(firstPersonCameraControl);
  const firstPersonCameraSlider = firstPersonCameraControl.querySelector("#firstPersonCameraSlider");
  const firstPersonCameraValue = firstPersonCameraControl.querySelector("#firstPersonCameraValue");

  const bgDecor = document.getElementById("bgDecor");
  const app = document.querySelector(".app");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const mobileFullscreenBtn = document.getElementById("mobileFullscreenBtn");
  const zenNextBtn = document.getElementById("zenNextBtn");
  const legalBtn = document.getElementById("legalBtn");
  const legalModal = document.getElementById("legalModal");
  const legalCloseBtn = document.getElementById("legalCloseBtn");
  const legalVersion = document.getElementById("legalVersion");
  const legalLastUpdated = document.getElementById("legalLastUpdated");
  const autoSolveBtn = document.getElementById("autoSolveBtn");
  const cancelGuidedBtn = document.getElementById("cancelGuidedBtn");
  const instruction = document.querySelector(".instruction");
  const thoughtText = document.getElementById("thoughtText");
  const splashScreen = document.getElementById("splashScreen");
  const collectionBtn = document.getElementById("collectionBtn");
  const collectionName = document.getElementById("collectionName");
  const themeModal = document.getElementById("themeModal");
  const themeCloseBtn = document.getElementById("themeCloseBtn");
  const themeChoices = [...document.querySelectorAll("[data-theme-choice]")];
  const makerReturnBtn = document.getElementById("makerReturnBtn");
  const levelMakerModal = document.getElementById("levelMakerModal");

  let levelIndex = storedLevelIndexForPack();
  let levelData = null;
  let width = 1;
  let height = 1;
  let walls = new Set();
  let floor = new Set();
  let outside = new Set();
  let player = [0, 0];
  let boxes = [];
  let goals = [];
  let moves = 0;
  let pushes = 0;
  let history = [];
  let facing = "front";
  let completed = false;
  let makerTesting = false;
  let sharedPuzzleMode = false;
  let sharedPuzzleName = "";
  let dailyMode = false;
  let dailyPuzzle = null;
  let dailyMidnightTimer = 0;
  let dailyArchiveCountdownTimer = 0;
  let makerLayout = null;
  let makerGoalColours = {};
  let makerSolution = "";
  let playedRoute = "";
  let makerCompletedRoute = "";
  let completeMode = "normal";
  let completionPackContext = null;
  let startedAt = 0;
  let timer = null;
  let idleTimer = null;
  let animTimer = null;

  function updatePackCollectionLabels(pack = activePack) {
    const label = dailyMode ? "Boxxy Dailys" : packCollectionLabel(pack);
    if (collectionName) collectionName.innerHTML = dailyMode ? "BOXXY<br>DAILYS" : packCollectionHeaderHtml(pack);
    document.querySelectorAll("[data-pack-context-label]").forEach(element => {
      element.textContent = label.toUpperCase();
    });
  }
  let blockedPushHeld = false;
  let soundOn = true;
  let musicOn = localStorage.getItem("push-bauhaus-music") !== "off";
  let musicPausedForHiddenTab = false;
  let audioCtx = null;
  let autoplayRunning = false;
  let autoplayTimer = null;
  let guidedSolveUsed = false;
  let easterClickCount = 0;
  let easterArmed = false;
  let easterResetTimer = null;
  let firstPersonMode = false;
  let firstPersonHeading = 2;
  let firstPersonClickCount = 0;
  let firstPersonArmed = false;
  let firstPersonResetTimer = null;
  let firstPersonRenderFrame = 0;
  let firstPersonBoomTimer = 0;
  let firstPersonMotion = null;
  let firstPersonCameraZoom = 0;
  const firstPersonAvatarImages = new Map();
  let currentAnimation = "idle";
  let thoughtTimer = null;
  let lastThought = "";
  let recentThoughts = [];
  let currentCheckpoint = null;
  let recentThoughtParts = Object.create(null);
  let thoughtReady = false;
  let audioUnlocked = false;
  let konamiIndex = 0;
  let phoneZenActivatedKonamiMotion = false;
  let backgroundDecorBuilt = false;
  let backgroundFadeTimer = null;
  let backgroundBuildNonce = 0;
  let packStatsAnimationFrame = 0;
  let completedLevels = new Set();
  let assistedLevels = new Set();
  let highestUnlockedLevel = 0;

  /* BOXXY v175 — deliberately limited, anonymous gameplay analytics.
     No puzzle layouts, typed names, email addresses or editor content are sent. */

  function boxxyAnalyticsOrientation() {
    const type = String(window.screen?.orientation?.type || "");
    if (type.startsWith("portrait")) return "portrait";
    if (type.startsWith("landscape")) return "landscape";
    return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
  }

  function boxxyAnalyticsInputMode() {
    return window.matchMedia?.("(pointer: coarse)")?.matches ? "touch" : "pointer";
  }

  const boxxyAnalyticsQueue = [];
  let boxxyAnalyticsReady = Boolean(window.BOXXY_POSTHOG_READY);

  function sendBoxxyAnalytics(eventName, properties) {
    const client = window.BOXXY_POSTHOG_INSTANCE || window.posthog;
    if (!client || typeof client.capture !== "function") return false;
    client.capture(eventName, properties);
    return true;
  }

  function flushBoxxyAnalyticsQueue() {
    boxxyAnalyticsReady = Boolean(window.BOXXY_POSTHOG_READY);
    if (!boxxyAnalyticsReady) return;
    while (boxxyAnalyticsQueue.length) {
      const queued = boxxyAnalyticsQueue.shift();
      try {
        if (!sendBoxxyAnalytics(queued.eventName, queued.properties)) {
          boxxyAnalyticsQueue.unshift(queued);
          break;
        }
      } catch (_) {
        /* One failed event must not block the game or later events. */
      }
    }
  }

  window.addEventListener("boxxy-posthog-ready", flushBoxxyAnalyticsQueue);

  function captureBoxxyAnalytics(eventName, properties = {}) {
    try {
      const payload = {
        game: "BOXXY",
        game_version: Number(window.BOXXY_RELEASE?.version || 0),
        orientation: boxxyAnalyticsOrientation(),
        input_mode: boxxyAnalyticsInputMode(),
        ...properties
      };
      if (!boxxyAnalyticsReady || !window.BOXXY_POSTHOG_READY) {
        boxxyAnalyticsQueue.push({ eventName, properties: payload });
        return;
      }
      if (!sendBoxxyAnalytics(eventName, payload)) {
        boxxyAnalyticsQueue.push({ eventName, properties: payload });
      }
    } catch (_) {
      /* Analytics must never interfere with the game. */
    }
  }

  function currentLevelAnalytics(properties = {}) {
    if (dailyMode && dailyPuzzle) {
      return {
        pack_id: "daily-boxxy",
        pack_name: "Daily Boxxy",
        level_number: Number(dailyPuzzle.sequence) || 0,
        level_count: Number(DAILY_PUZZLES.length || 0),
        daily_date: String(dailyPuzzle.date || ""),
        ...properties
      };
    }
    return {
      pack_id: String(activePack?.id || ""),
      pack_name: String(activePack?.displayName || activePack?.title || ""),
      level_number: Number(levelIndex) + 1,
      level_count: Number(LEVELS?.length || 0),
      ...properties
    };
  }

  function elapsedLevelSeconds() {
    return startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
  }

  /* BOXXY v173 — one exact 6 × 5 completion sprite sheet.
     The chosen 350 × 350 cell is copied to a canvas, so there is no CSS
     background-position rounding and no collection of 30 separate files. */
  const COMPLETION_SPRITE_SHEET = "assets/ui/completion/happy-sprites-350-grid.png";
  const COMPLETION_SPRITE_COLUMNS = 6;
  const COMPLETION_SPRITE_ROWS = 5;
  const COMPLETION_SPRITE_TOTAL = COMPLETION_SPRITE_COLUMNS * COMPLETION_SPRITE_ROWS;
  const COMPLETION_SPRITE_CELL = 350;
  const completionSpriteSheet = new Image();
  let completionSpriteSheetReady = false;
  let pendingCompletionSpriteIndex = 0;
  let lastCompletionSpriteIndex = -1;

  function completionSpriteContext() {
    if (!completeSprite || typeof completeSprite.getContext !== "function") return null;
    return completeSprite.getContext("2d", { alpha: false });
  }

  function paintCompletionSprite(spriteIndex) {
    const context = completionSpriteContext();
    if (!context) return;

    pendingCompletionSpriteIndex = spriteIndex;
    context.save();
    context.fillStyle = "#000";
    context.fillRect(0, 0, COMPLETION_SPRITE_CELL, COMPLETION_SPRITE_CELL);

    if (completionSpriteSheetReady) {
      const column = spriteIndex % COMPLETION_SPRITE_COLUMNS;
      const row = Math.floor(spriteIndex / COMPLETION_SPRITE_COLUMNS);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        completionSpriteSheet,
        column * COMPLETION_SPRITE_CELL,
        row * COMPLETION_SPRITE_CELL,
        COMPLETION_SPRITE_CELL,
        COMPLETION_SPRITE_CELL,
        0,
        0,
        COMPLETION_SPRITE_CELL,
        COMPLETION_SPRITE_CELL
      );
    }
    context.restore();
  }

  completionSpriteSheet.decoding = "async";
  completionSpriteSheet.addEventListener("load", () => {
    completionSpriteSheetReady = true;
    paintCompletionSprite(pendingCompletionSpriteIndex);
  }, { once: true });
  completionSpriteSheet.addEventListener("error", () => {
    completionSpriteSheetReady = false;
  }, { once: true });
  completionSpriteSheet.src = COMPLETION_SPRITE_SHEET;

  function randomCompletionSpriteIndex() {
    if (COMPLETION_SPRITE_TOTAL <= 1) return 0;
    let candidate = Math.floor(Math.random() * COMPLETION_SPRITE_TOTAL);
    if (candidate === lastCompletionSpriteIndex) {
      candidate = (candidate + 1 + Math.floor(Math.random() * (COMPLETION_SPRITE_TOTAL - 1))) % COMPLETION_SPRITE_TOTAL;
    }
    lastCompletionSpriteIndex = candidate;
    return candidate;
  }

  function showRandomCompletionSprite() {
    if (!completeSprite) return;
    const spriteIndex = randomCompletionSpriteIndex();
    paintCompletionSprite(spriteIndex);
    completeSprite.dataset.spriteIndex = String(spriteIndex + 1);
  }

  function loadLevelProgress() {
    completedLevels = new Set();
    assistedLevels = new Set();
    try {
      const currentRaw = localStorage.getItem(currentCompletedStorageKey());
      const legacyRaw = activePack.id === "microban" ? localStorage.getItem("boxxy-completed-levels-v1") : null;
      const savedCompleted = JSON.parse(currentRaw ?? legacyRaw ?? "[]");
      if (Array.isArray(savedCompleted)) {
        savedCompleted.forEach(value => {
          const index = Number(value);
          if (Number.isInteger(index) && index >= 0 && index < LEVELS.length) completedLevels.add(index);
        });
      }
    } catch (_) {}

    try {
      const savedAssisted = JSON.parse(localStorage.getItem(currentAssistedStorageKey()) ?? "[]");
      if (Array.isArray(savedAssisted)) {
        savedAssisted.forEach(value => {
          const index = Number(value);
          if (Number.isInteger(index) && index >= 0 && index < LEVELS.length) assistedLevels.add(index);
        });
      }
    } catch (_) {}

    if (activePack.id === "microban") {
      LEVELS.forEach((level, index) => {
        if (localStorage.getItem(`push-bauhaus-v22-best-${level.sourceNumber}`)) completedLevels.add(index);
      });
    }

    for (const index of [...assistedLevels]) {
      if (!completedLevels.has(index)) assistedLevels.delete(index);
    }

    const currentProgress = localStorage.getItem(currentProgressStorageKey());
    const legacyProgress = activePack.id === "microban" ? localStorage.getItem("boxxy-level-progress-v1") : null;
    const storedProgress = Number(currentProgress ?? legacyProgress);
    const furthestCompleted = completedLevels.size ? Math.max(...completedLevels) + 1 : 0;
    highestUnlockedLevel = Math.max(
      0,
      Number.isFinite(storedProgress) ? storedProgress : 0,
      furthestCompleted,
      levelIndex
    );
    highestUnlockedLevel = Math.min(highestUnlockedLevel, Math.max(0, LEVELS.length - 1));
    saveLevelProgress();
  }

  function saveLevelProgress() {
    localStorage.setItem(currentProgressStorageKey(), String(highestUnlockedLevel));
    localStorage.setItem(currentCompletedStorageKey(), JSON.stringify([...completedLevels].sort((a, b) => a - b)));
    localStorage.setItem(currentAssistedStorageKey(), JSON.stringify([...assistedLevels].sort((a, b) => a - b)));
  }

  function applyTheme(_theme, redraw = true) {
    currentTheme = "bauhaus";
    document.body.dataset.theme = "bauhaus";
    localStorage.setItem("boxxy-theme", "bauhaus");
    updatePackCollectionLabels(activePack);
    const wardrobeKicker = document.querySelector(".style-kicker");
    if (wardrobeKicker) wardrobeKicker.textContent = "BAUHAUS WARDROBE";
    themeChoices.forEach(button => button.classList.toggle("active", button.dataset.themeChoice === "bauhaus"));
    const splashImg = splashScreen?.querySelector("img");
    if (splashImg) splashImg.src = "assets/ui/boxxy-splash.png";
    if (redraw && levelData) {
      buildFloor();
      buildVoid();
      buildWalls();
      buildGoals();
      render();
      window.CharacterStyler?.redrawAll?.();
    }
  }

  function openThemeModal(){ if (themeModal) themeModal.hidden = false; }
  function closeThemeModal(){ if (themeModal) themeModal.hidden = true; }

  function collectionIsComplete() {
    return Boolean(LEVELS.length) && completedLevels.has(LEVELS.length - 1);
  }

  function activePackEarnsPrize(pack = activePack) {
    return pack?.id === PRIMARY_PACK_ID && pack?.levels?.length === 50 && packIsComplete(pack.id);
  }

  function setCompletionActionMode(mode = "standard") {
    const daily = mode === "daily";
    const standard = mode === "standard";
    if (dailyCompletionActions) dailyCompletionActions.hidden = !daily;
    if (standardCompletionActions) standardCompletionActions.hidden = !standard;
  }

  function configureFinalCompletionActions(pack = completionPackContext || activePack) {
    setCompletionActionMode("final");
    if (claimPrizeBtn) claimPrizeBtn.hidden = !activePackEarnsPrize(pack);
  }

  function restoreStandardCompletionActions() {
    setCompletionActionMode("standard");
    if (claimPrizeBtn) claimPrizeBtn.hidden = true;
    if (dailySharePanel) dailySharePanel.hidden = true;
    if (dailyShareStatus) dailyShareStatus.textContent = "";
    completeCard?.classList.remove("daily-complete");
  }

  function openPrizeModal() {
    const pack = completionPackContext || activePack;
    if (!prizeModal || !activePackEarnsPrize(pack)) return;
    if (modal) modal.hidden = true;
    prizeModal.hidden = false;
    prizeCloseBtn?.focus({ preventScroll: true });
  }

  function closePrizeModal() {
    if (prizeModal) prizeModal.hidden = true;
  }

  function stopPackStatsAnimation() {
    if (packStatsAnimationFrame) cancelAnimationFrame(packStatsAnimationFrame);
    packStatsAnimationFrame = 0;
  }

  function packStatBox(element) {
    return element?.closest?.("div") || null;
  }

  function clearPackStatTargets() {
    [packTotalMoves, packTotalPushes, packTotalTime].forEach(element => {
      packStatBox(element)?.classList.remove("pack-stat-target-hit");
    });
  }

  function markPackStatTarget(element, soundIndex) {
    const box = packStatBox(element);
    if (!box || box.classList.contains("pack-stat-target-hit")) return;
    box.classList.add("pack-stat-target-hit");
    sfx.packStatTarget(soundIndex);
  }

  function hidePackCompletionStats() {
    stopPackStatsAnimation();
    clearPackStatTargets();
    if (packCompletionStats) packCompletionStats.hidden = true;
  }

  function hidePackStarAward() {
    if (packStarAward) packStarAward.hidden = true;
  }

  const PACK_STAR_AWARD_MESSAGES = Object.freeze([
    packName => `A star has been added to your badge collection for completing “${packName}”. Find it beside BOXXY at the top of your screen, you box-pusher extraordinaire.`,
    packName => `You earned a star for completing “${packName}”. It is waiting beside BOXXY at the top of your screen, you crate-shifting champion.`,
    packName => `“${packName}” is complete, and its star now sits beside BOXXY at the top of your screen, you warehouse wizard.`,
    packName => `Your new star for conquering “${packName}” is beside BOXXY at the top of your screen, you puzzle-pushing prodigy.`,
    packName => `Pack complete. Look beside BOXXY at the top of your screen for your latest star, you Sokoban superstar.`
  ]);
  const PACK_JIGSAW_AWARD_MESSAGES = Object.freeze([
    packName => `A jigsaw puzzle piece has been added to your badge collection for completing “${packName}”. Find it beside BOXXY at the top of your screen, you box-pusher extraordinaire.`,
    packName => `You completed “${packName}” and earned its jigsaw puzzle piece. It is waiting beside BOXXY at the top of your screen, you puzzle-pushing prodigy.`,
    packName => `“${packName}” is complete. Its jigsaw puzzle piece now sits beside BOXXY at the top of your screen, you crate-shifting champion.`
  ]);
  const PACK_STAR_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 6 62.7 34.2 93.5 37.5 70.5 58.3 77 88.5 50 73 23 88.5 29.5 58.3 6.5 37.5 37.3 34.2Z"/></svg>';
  const PACK_JIGSAW_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M8 26H34C34 14 40 6 50 6S66 14 66 26H82V38C82 42 84 44 88 44C94 44 98 48 98 54S94 66 88 66C84 66 82 68 82 72V90H64C64 78 58 72 50 72S36 78 36 90H8V64C20 64 28 58 28 50S20 36 8 36Z"/></svg>';
  const lastPackAwardMessage = { star: -1, jigsaw: -1 };

  function packRewardKind(pack) {
    return pack?.id === JIGSAW_PACK_ID ? "jigsaw" : "star";
  }

  function packRewardSvg(pack) {
    return packRewardKind(pack) === "jigsaw" ? PACK_JIGSAW_SVG : PACK_STAR_SVG;
  }

  function nextPackAwardMessage(pack) {
    const kind = packRewardKind(pack);
    const messages = kind === "jigsaw" ? PACK_JIGSAW_AWARD_MESSAGES : PACK_STAR_AWARD_MESSAGES;
    let index = Math.floor(Math.random() * messages.length);
    if (messages.length > 1 && index === lastPackAwardMessage[kind]) {
      index = (index + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length;
    }
    lastPackAwardMessage[kind] = index;
    const packName = String(pack?.displayName || pack?.title || "this puzzle pack");
    return messages[index](packName);
  }

  function showPackStarAward(pack) {
    if (!packStarAward || !pack) return;
    const kind = packRewardKind(pack);
    packStarAward.hidden = false;
    packStarAward.dataset.rewardType = kind;
    packStarAward.setAttribute("aria-label", kind === "jigsaw" ? "Pack completion jigsaw puzzle piece awarded" : "Pack completion star awarded");
    if (packStarAwardIcon) {
      packStarAwardIcon.innerHTML = packRewardSvg(pack);
      packStarAwardIcon.style.setProperty("--pack-star-colour", packAccentColour(pack));
    }
    if (packStarAwardText) packStarAwardText.textContent = nextPackAwardMessage(pack);
  }

  function packCountDuration(_target, kind) {
    /* All three counters start together and land in a clear, evenly spaced order. */
    if (kind === "moves") return 3200;
    if (kind === "pushes") return 4000;
    return 4800;
  }

  function setPackStatValues(totals, values) {
    if (packTotalMoves) packTotalMoves.textContent = totals.moveLevels ? Math.max(0, Math.round(values.moves)).toLocaleString() : "—";
    if (packTotalPushes) packTotalPushes.textContent = totals.pushLevels ? Math.max(0, Math.round(values.pushes)).toLocaleString() : "—";
    if (packTotalTime) packTotalTime.textContent = totals.timeLevels ? formatPackDuration(values.seconds) : "—";
  }

  function animatePackCompletionStats(totals) {
    stopPackStatsAnimation();
    clearPackStatTargets();
    if (!totals) return;

    const targets = [
      { key: "moves", duration: packCountDuration(totals.moves, "moves"), available: Boolean(totals.moveLevels), element: packTotalMoves, soundIndex: 0 },
      { key: "pushes", duration: packCountDuration(totals.pushes, "pushes"), available: Boolean(totals.pushLevels), element: packTotalPushes, soundIndex: 1 },
      { key: "seconds", duration: packCountDuration(totals.seconds, "time"), available: Boolean(totals.timeLevels), element: packTotalTime, soundIndex: 2 }
    ];

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setPackStatValues(totals, totals);
      targets.forEach(target => {
        if (target.available) markPackStatTarget(target.element, target.soundIndex);
      });
      return;
    }

    const reached = new Set();
    const start = performance.now();
    const easeOutCubic = value => 1 - Math.pow(1 - value, 3);
    const maxDuration = Math.max(...targets.map(target => target.duration));

    const tick = now => {
      const elapsed = Math.max(0, now - start);
      const values = {
        moves: totals.moves * easeOutCubic(Math.min(1, elapsed / targets[0].duration)),
        pushes: totals.pushes * easeOutCubic(Math.min(1, elapsed / targets[1].duration)),
        seconds: totals.seconds * easeOutCubic(Math.min(1, elapsed / targets[2].duration))
      };
      setPackStatValues(totals, values);

      targets.forEach(target => {
        if (target.available && elapsed >= target.duration && !reached.has(target.key)) {
          reached.add(target.key);
          markPackStatTarget(target.element, target.soundIndex);
        }
      });

      if (elapsed < maxDuration) {
        packStatsAnimationFrame = requestAnimationFrame(tick);
      } else {
        packStatsAnimationFrame = 0;
        setPackStatValues(totals, totals);
        targets.forEach(target => {
          if (target.available && !reached.has(target.key)) markPackStatTarget(target.element, target.soundIndex);
        });
      }
    };

    packStatsAnimationFrame = requestAnimationFrame(tick);
  }

  function renderPackCompletionStats(pack, animate = false) {
    if (!packCompletionStats || !pack) return null;
    const totals = packCompletionTotals(pack);
    packCompletionStats.hidden = false;
    clearPackStatTargets();
    setPackStatValues(totals, animate ? { moves: 0, pushes: 0, seconds: 0 } : totals);
    if (animate) requestAnimationFrame(() => animatePackCompletionStats(totals));
    return totals;
  }

  function setZenNextButtonVisible(visible) {
    if (!zenNextBtn) return;
    zenNextBtn.hidden = !Boolean(visible);
  }

  function formatReleaseDate(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ""));
    if (!match) return "—";
    return `${Number(match[3])}.${Number(match[2])}.${match[1]}`;
  }

  function renderReleaseMetadata() {
    const release = window.BOXXY_RELEASE || {};
    const version = Number(release.version);
    const isoDate = String(release.lastUpdated || "");

    if (legalVersion) {
      legalVersion.textContent = Number.isFinite(version) && version > 0
        ? String(Math.trunc(version))
        : "—";
    }
    if (legalLastUpdated) {
      legalLastUpdated.textContent = formatReleaseDate(isoDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) legalLastUpdated.dateTime = isoDate;
      else legalLastUpdated.removeAttribute("datetime");
    }
  }

  function openLegalModal() {
    if (!legalModal) return;
    renderReleaseMetadata();
    legalModal.hidden = false;
    requestAnimationFrame(() => legalCloseBtn?.focus());
  }

  function closeLegalModal() {
    if (!legalModal) return;
    legalModal.hidden = true;
    legalBtn?.focus();
  }

  function closeCompleteModal() {
    const showZenNext = phoneZenModeActive() && completeMode === "normal" && levelIndex < LEVELS.length - 1;
    if (modal) modal.hidden = true;
    setZenNextButtonVisible(showZenNext);
    restoreStandardCompletionActions();
    completeCard?.classList.remove("final-complete");
    completionPackContext = null;
    hidePackCompletionStats();
    hidePackStarAward();
  }

  function packAccentColour(pack) {
    return PACK_ACCENT_COLOURS[String(pack?.accent || "black").toLowerCase()] || PACK_ACCENT_COLOURS.black;
  }


  function updateDailyStreak() {
    if (!dailyStreak) return;
    const streak = currentDailyStreak();
    const tier = dailyStreakTier(streak);
    dailyStreak.dataset.tier = tier;
    dailyStreak.dataset.digits = String(Math.min(5, String(streak).length));
    if (dailyStreakNumber) dailyStreakNumber.textContent = String(streak);
    const label = `Daily Boxxy streak: ${streak} ${streak === 1 ? "day" : "days"}`;
    dailyStreak.setAttribute("aria-label", label);
    dailyStreak.title = label;
  }

  function dailyAvailabilityLabel(puzzle = dailyPuzzleForToday()) {
    if (puzzle) {
      if (dailyCompletion(puzzle.date)) return "COMPLETED";
      return DAILY_DATE_OVERRIDE
        ? formatDailyDate(puzzle.date, { long: false }).toUpperCase()
        : "TODAY";
    }
    const today = activeDailyDateKey();
    const first = DAILY_PUZZLES[0];
    const last = DAILY_PUZZLES[DAILY_PUZZLES.length - 1];
    if (today < DAILY_LAUNCH_DATE) return "COMING SOON";
    if (first && today < first.date) return "COMING SOON";
    if (!first || (last && today > last.date)) return "MORE SOON";
    return "UNAVAILABLE";
  }

  function updateDailyQuotePrompt() {
    if (!instruction || !dailyQuotePrompt) return;
    const puzzle = dailyPuzzleForToday();
    const dismissed = puzzle ? localStorage.getItem(`${DAILY_QUOTE_DISMISSED_PREFIX}${puzzle.date}`) === "1" : true;
    const show = Boolean(puzzle && !dailyMode && !dailyCompletion(puzzle.date) && !dismissed && !makerTesting && !sharedPuzzleMode);
    dailyQuotePrompt.hidden = !show;
    instruction.classList.toggle("daily-prompt-active", show);
    if (dailyQuoteMeta && puzzle) {
      const reference = DAILY_DATE_OVERRIDE
        ? formatDailyDate(puzzle.date, { long: false }).toUpperCase()
        : "TODAY";
      dailyQuoteMeta.textContent = `#${Number(puzzle.sequence) || ""} · ${reference}`;
    }
  }

  function closeDailyInvite() {
    if (dailyInviteModal) dailyInviteModal.hidden = true;
  }

  function configureDailyInvite(puzzle = dailyPuzzleForToday()) {
    if (!dailyInviteModal) return false;
    const first = DAILY_PUZZLES[0];
    const last = DAILY_PUZZLES[DAILY_PUZZLES.length - 1];
    if (puzzle) {
      const complete = Boolean(dailyCompletion(puzzle.date));
      if (dailyInviteText) dailyInviteText.textContent = complete
        ? `Daily Boxxy #${Number(puzzle.sequence) || ""} for ${formatDailyDate(puzzle.date, { weekday: true, long: true })} is already complete.`
        : `Daily Boxxy #${Number(puzzle.sequence) || ""} for ${formatDailyDate(puzzle.date, { weekday: true, long: true })} is ready.`;
      if (dailyInviteStatus) dailyInviteStatus.textContent = complete ? "TODAY’S PUZZLE COMPLETED" : "RESETS AT 00:00 LOCAL TIME";
      if (dailyInvitePlay) {
        dailyInvitePlay.disabled = complete;
        const label = dailyInvitePlay.querySelector("span");
        if (label) label.textContent = complete ? "COMPLETED TODAY" : "PLAY TODAY’S PUZZLE";
      }
      return true;
    }
    const today = activeDailyDateKey();
    let unavailableLabel = "NOT AVAILABLE TODAY";
    if (today < DAILY_LAUNCH_DATE || (first && today < first.date)) {
      if (dailyInviteText) dailyInviteText.textContent = "Daily Boxxy is coming soon.";
      if (dailyInviteStatus) dailyInviteStatus.textContent = "A NEW PUZZLE EVERY DAY";
      unavailableLabel = "COMING SOON";
    } else if (!first || (last && today > last.date)) {
      if (dailyInviteText) dailyInviteText.textContent = "The current Daily Boxxy schedule is complete. More puzzles will be added soon.";
      if (dailyInviteStatus) dailyInviteStatus.textContent = "MORE DAILY PUZZLES COMING SOON";
      unavailableLabel = "MORE COMING SOON";
    } else {
      if (dailyInviteText) dailyInviteText.textContent = "No Daily Boxxy is scheduled for today.";
      if (dailyInviteStatus) dailyInviteStatus.textContent = "CHECK AGAIN TOMORROW";
    }
    if (dailyInvitePlay) {
      dailyInvitePlay.disabled = true;
      const label = dailyInvitePlay.querySelector("span");
      if (label) label.textContent = unavailableLabel;
    }
    return false;
  }

  function showDailyInvite(force = false) {
    if (!dailyInviteModal || sharedPuzzleMode || makerTesting || dailyMode) return;
    const puzzle = dailyPuzzleForToday();
    if (!force) {
      if (!puzzle || dailyCompletion(puzzle.date)) return;
      const key = `${DAILY_INVITE_SEEN_PREFIX}${puzzle.date}`;
      if (localStorage.getItem(key) === "1") return;
      try { localStorage.setItem(key, "1"); } catch (_) {}
    }
    configureDailyInvite(puzzle);
    dailyInviteModal.hidden = false;
    requestAnimationFrame(() => (puzzle ? dailyInvitePlay : dailyInviteClose)?.focus?.({ preventScroll: true }));
  }

  function visibleDailyPuzzles(referenceDateKey = activeDailyDateKey()) {
    const reference = String(referenceDateKey || "");
    return DAILY_PUZZLES
      .filter(puzzle => String(puzzle.date) >= DAILY_LAUNCH_DATE && String(puzzle.date) <= reference)
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function dailyMonthHeading(monthKey) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
    if (!match) return String(monthKey || "").toUpperCase();
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1, 12);
    try {
      return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date).toUpperCase();
    } catch (_) {
      return String(monthKey || "").toUpperCase();
    }
  }

  async function shareArchivedDailyResult(puzzle, result, button) {
    const text = buildDailyShareText(puzzle, result);
    if (!text) return;
    const original = button?.textContent || "SHARE";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Daily Boxxy", text });
        if (button) button.textContent = "SHARED";
        window.setTimeout(() => { if (button) button.textContent = original; }, 1600);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }

    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try { copied = document.execCommand("copy"); } catch (_) {}
      textarea.remove();
    }
    if (button) button.textContent = copied ? "COPIED" : "COPY FAILED";
    window.setTimeout(() => { if (button) button.textContent = original; }, 1800);
  }

  function renderDailyArchive() {
    if (!dailyArchiveMonths) return;
    const puzzles = visibleDailyPuzzles();
    const completions = readDailyCompletions();
    const completedCount = puzzles.reduce((total, puzzle) => total + (completions[String(puzzle.date)] ? 1 : 0), 0);
    if (dailyArchiveSummary) {
      dailyArchiveSummary.textContent = `${completedCount} COMPLETED · ${puzzles.length} AVAILABLE`;
    }
    dailyArchiveMonths.innerHTML = "";

    if (!puzzles.length) {
      const empty = document.createElement("p");
      empty.className = "daily-archive-empty";
      empty.textContent = activeDailyDateKey() < DAILY_LAUNCH_DATE
        ? `BOXXY Dailys begins on ${formatDailyDate(DAILY_LAUNCH_DATE, { long: true, year: true })}.`
        : "No Daily Boxxy puzzles are available for this date yet.";
      dailyArchiveMonths.appendChild(empty);
      return;
    }

    const months = new Map();
    puzzles.forEach(puzzle => {
      const monthKey = String(puzzle.date).slice(0, 7);
      if (!months.has(monthKey)) months.set(monthKey, []);
      months.get(monthKey).push(puzzle);
    });

    months.forEach((monthPuzzles, monthKey) => {
      const section = document.createElement("section");
      section.className = "daily-archive-month";
      const heading = document.createElement("div");
      heading.className = "daily-archive-month-head";
      const title = document.createElement("h3");
      title.textContent = dailyMonthHeading(monthKey);
      const progress = document.createElement("span");
      const monthComplete = monthPuzzles.reduce((total, puzzle) => total + (completions[String(puzzle.date)] ? 1 : 0), 0);
      progress.textContent = `${monthComplete} / ${monthPuzzles.length} COMPLETE`;
      heading.append(title, progress);

      const grid = document.createElement("div");
      grid.className = "daily-archive-grid";
      monthPuzzles.forEach(puzzle => {
        const result = completions[String(puzzle.date)] || null;
        const card = document.createElement("article");
        card.className = "daily-archive-date-card";
        if (result) card.classList.add("completed");
        if (String(puzzle.date) === activeDailyDateKey()) card.classList.add("today");

        const cardHead = document.createElement("div");
        cardHead.className = "daily-archive-date-head";
        const sequence = document.createElement("strong");
        sequence.textContent = `DAILY #${Number(puzzle.sequence) || ""}`;
        const date = document.createElement("span");
        date.textContent = formatDailyDate(puzzle.date, { weekday: true, compact: true });
        cardHead.append(sequence, date);

        const stats = document.createElement("div");
        stats.className = "daily-archive-date-stats";
        if (result) {
          const movesStat = document.createElement("div");
          movesStat.innerHTML = `<span>MOVES</span><strong>${Math.max(0, Number(result.moves) || 0)}</strong>`;
          const timeStat = document.createElement("div");
          timeStat.innerHTML = `<span>TIME</span><strong>${formatClockDuration(result.seconds)}</strong>`;
          stats.append(movesStat, timeStat);
        } else {
          const gap = document.createElement("p");
          gap.textContent = String(puzzle.date) === activeDailyDateKey() ? "TODAY’S PUZZLE" : "NOT YET COMPLETED";
          stats.appendChild(gap);
        }

        const actions = document.createElement("div");
        actions.className = "daily-archive-date-actions";
        if (!result) actions.classList.add("single");
        const play = document.createElement("button");
        play.type = "button";
        play.className = "daily-archive-play";
        play.textContent = result ? "PLAY AGAIN" : "PLAY";
        play.addEventListener("click", () => {
          closeDailyArchive();
          loadDailyPuzzle(puzzle);
        });
        actions.appendChild(play);
        if (result) {
          const share = document.createElement("button");
          share.type = "button";
          share.className = "daily-archive-share";
          share.textContent = "SHARE";
          share.addEventListener("click", () => shareArchivedDailyResult(puzzle, result, share));
          actions.prepend(share);
        }

        card.append(cardHead, stats, actions);
        grid.appendChild(card);
      });

      section.append(heading, grid);
      dailyArchiveMonths.appendChild(section);
    });
  }

  function dailyCountdownTarget() {
    const now = new Date();
    if (localDateKey(now) < DAILY_LAUNCH_DATE) {
      const launch = parseDateKey(DAILY_LAUNCH_DATE);
      if (launch) launch.setHours(0, 0, 0, 0);
      return launch;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  }

  function updateDailyArchiveCountdown() {
    if (!dailyArchiveCountdown) return;
    const now = new Date();
    const target = dailyCountdownTarget();
    const remaining = Math.max(0, Number(target?.getTime?.() || now.getTime()) - now.getTime());
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    dailyArchiveCountdown.textContent = days
      ? `${days}D ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (dailyArchiveCountdownLabel) {
      dailyArchiveCountdownLabel.textContent = localDateKey(now) < DAILY_LAUNCH_DATE ? "DAILYS BEGIN IN" : "NEXT DAILY IN";
    }
    if (dailyArchiveCountdownDate) {
      const nextDateKey = localDateKey(target || now);
      const viewing = DAILY_DATE_OVERRIDE
        ? ` · VIEWING ${formatDailyDate(activeDailyDateKey(), { weekday: true, long: true, year: true }).toUpperCase()}`
        : "";
      dailyArchiveCountdownDate.textContent = `${formatDailyDate(nextDateKey, { weekday: true, long: true, year: true }).toUpperCase()}${viewing}`;
    }
  }

  function openDailyArchive() {
    if (!dailyArchiveModal) return;
    closeDailyInvite();
    closePackModal();
    closeLevelPicker();
    renderDailyArchive();
    updateDailyArchiveCountdown();
    window.clearInterval(dailyArchiveCountdownTimer);
    dailyArchiveCountdownTimer = window.setInterval(updateDailyArchiveCountdown, 1000);
    dailyArchiveModal.hidden = false;
    requestAnimationFrame(() => dailyArchiveCloseBtn?.focus?.({ preventScroll: true }));
  }

  function closeDailyArchive() {
    window.clearInterval(dailyArchiveCountdownTimer);
    dailyArchiveCountdownTimer = 0;
    if (dailyArchiveModal) dailyArchiveModal.hidden = true;
  }

  function millisecondsUntilNextLocalMidnight() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 80);
    return Math.max(1000, next.getTime() - now.getTime());
  }

  function scheduleDailyMidnightRefresh() {
    window.clearTimeout(dailyMidnightTimer);
    if (DAILY_DATE_OVERRIDE) return;
    dailyMidnightTimer = window.setTimeout(() => {
      const realToday = localDateKey();
      if (realToday >= DAILY_LAUNCH_DATE && realToday.slice(0, 7) !== String(window.BOXXY_DAILY_MONTH_KEY || "")) {
        window.location.reload();
        return;
      }
      const nextPuzzle = dailyPuzzleForToday();
      updateDailyStreak();
      buildLevelButtons();
      updateDailyQuotePrompt();
      if (dailyMode) {
        if (nextPuzzle) loadDailyPuzzle(nextPuzzle);
        else loadLevel(levelIndex);
      } else {
        showDailyInvite(false);
      }
      scheduleDailyMidnightRefresh();
    }, millisecondsUntilNextLocalMidnight());
  }

  function updateCompletedPackStars() {
    updateDailyStreak();
    if (!completedPackStars) return;
    completedPackStars.innerHTML = "";
    const completedPacks = PACKS.filter(pack => packIsComplete(pack.id));
    completedPackStars.hidden = completedPacks.length === 0;

    completedPacks.forEach(pack => {
      const button = document.createElement("button");
      const rewardKind = packRewardKind(pack);
      button.type = "button";
      button.className = `completed-pack-star completed-pack-reward-${rewardKind}`;
      button.style.setProperty("--pack-star-colour", packAccentColour(pack));
      button.setAttribute("aria-label", `View congratulations for ${pack.displayName || pack.title}`);
      button.title = `View congratulations for ${pack.displayName || pack.title}`;
      button.innerHTML = packRewardSvg(pack);
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showCollectionCongratulations(pack.id);
      });
      completedPackStars.appendChild(button);
    });
  }

  function updateCollectionCompleteStar() {
    updateCompletedPackStars();
    if (!collectionCompleteStar) return;
    const earned = collectionIsComplete() && !makerTesting && !sharedPuzzleMode;
    const rewardKind = packRewardKind(activePack);
    collectionCompleteStar.hidden = !earned;
    collectionCompleteStar.setAttribute("aria-hidden", String(!earned));
    collectionCompleteStar.dataset.rewardType = rewardKind;
    collectionCompleteStar.innerHTML = packRewardSvg(activePack);
    collectionCompleteStar.style.setProperty("--pack-star-colour", packAccentColour(activePack));
    collectionCompleteStar.title = earned
      ? `View the congratulations screen for ${activePack.displayName}`
      : "";
  }

  function showCollectionCongratulations(packId = activePack.id) {
    const pack = PACK_BY_ID.get(packId) || activePack;
    if (!packIsComplete(pack.id) || !modal) return;

    completionPackContext = pack;
    completeMode = "final";
    completeCard?.classList.add("final-complete");
    if (completeKicker) completeKicker.textContent = "CONGRATULATIONS";
    if (completeTitle) completeTitle.textContent = "WELL DONE";
    if (completedPackHeading) completedPackHeading.textContent = String(pack.displayName || pack.title || "");
    if (completeText) completeText.textContent = "";
    showPackStarAward(pack);
    renderPackCompletionStats(pack, true);

    buildPackSelectors(pack.id);
    if (finalPackPicker) finalPackPicker.hidden = false;
    if (finalPackStatus) finalPackStatus.textContent = "";
    configureFinalCompletionActions(pack);

    closeLevelPicker();
    showRandomCompletionSprite();
    modal.hidden = false;
    grandBurst(pack);
    sfx.finish();
  }

  let levelPickerPack = activePack;

  function openLevelPicker(pack = activePack) {
    levelPickerPack = pack && Array.isArray(pack.levels) ? pack : activePack;
    buildLevelButtons(levelPickerPack);
    updateCollectionCompleteStar();
    const browsingActivePack = levelPickerPack.id === activePack.id;
    if (levelResetBtn) levelResetBtn.hidden = !browsingActivePack;
    if (collectionCompleteStar && !browsingActivePack) collectionCompleteStar.hidden = true;
    levelPicker.hidden = false;
    requestAnimationFrame(() => levelButtons?.querySelector("button.current:not(:disabled), button:not(:disabled)")?.focus?.({ preventScroll: true }));
  }

  function closeLevelPicker() {
    levelPicker.hidden = true;
  }

  function openPackModal() {
    if (!packModal) return;
    updatePackCollectionLabels(activePack);
    closeLevelPicker();
    buildPackSelectors();
    packModal.hidden = false;
    packCloseBtn?.focus({ preventScroll: true });
  }

  function closePackModal() {
    if (packModal) packModal.hidden = true;
  }

  function createDailyPackButton() {
    const button = document.createElement("button");
    const available = visibleDailyPuzzles();
    const completions = readDailyCompletions();
    const completedCount = available.reduce((total, puzzle) => total + (completions[String(puzzle.date)] ? 1 : 0), 0);
    button.type = "button";
    button.className = "pack-option pack-green daily-pack-option";
    button.dataset.packId = "boxxy-dailys";
    if (dailyMode) button.classList.add("active");

    const art = document.createElement("span");
    art.className = "final-pack-art daily-pack-art";
    const calendar = document.createElement("i");
    calendar.className = "daily-pack-calendar";
    calendar.setAttribute("aria-hidden", "true");
    const number = document.createElement("b");
    number.textContent = String(available.length).padStart(2, "0");
    art.append(calendar, number);

    const name = document.createElement("span");
    name.className = "final-pack-name";
    name.append(document.createTextNode("BOXXY DAILYS"));
    const meta = document.createElement("small");
    meta.textContent = DAILY_DATE_OVERRIDE
      ? `VIEWING ${formatDailyDate(activeDailyDateKey(), { weekday: true, long: true, year: true }).toUpperCase()}`
      : available.length
        ? `${completedCount} COMPLETED · ${available.length} AVAILABLE · MOST RECENT FIRST`
        : "ONE NEW PUZZLE EVERY DAY";
    name.appendChild(meta);
    button.append(art, name);
    button.title = "Open today’s Daily Boxxy and every earlier available date.";
    button.addEventListener("click", openDailyArchive);
    return button;
  }

  function createPackButton(pack, index, compact = false) {
    const button = document.createElement("button");
    const isLocked = packIsLocked(pack);
    button.type = "button";
    button.className = `${compact ? "final-pack-option" : "pack-option"} pack-${pack.accent || "black"}`;
    button.dataset.packId = pack.id;
    if (!compact && pack.id === activePack.id) button.classList.add("active");
    if (isLocked) {
      button.classList.add("locked");
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    }

    const art = document.createElement("span");
    art.className = "final-pack-art";
    art.setAttribute("aria-hidden", "true");
    const number = document.createElement("b");
    number.textContent = String(index + 1).padStart(2, "0");
    const artwork = packArtwork(pack);
    if (artwork?.desktop) {
      art.classList.add("image-art");
      const picture = document.createElement("picture");
      const source = document.createElement("source");
      source.media = "(max-width: 620px)";
      source.srcset = artwork.mobile || artwork.desktop;
      const image = document.createElement("img");
      image.src = artwork.desktop;
      image.alt = artwork.alt || "";
      image.loading = "lazy";
      image.decoding = "async";
      picture.append(source, image);
      number.className = "pack-no";
      art.append(picture, number);
    } else {
      const shape = document.createElement("i");
      art.append(shape, number);
    }

    const name = document.createElement("span");
    name.className = "final-pack-name";
    name.append(document.createTextNode(pack.title));
    const meta = document.createElement("small");
    meta.textContent = `${pack.levels.length} LEVELS · ${String(pack.author || "").toUpperCase()}`;
    name.appendChild(meta);
    if (isLocked) {
      const lockText = document.createElement("em");
      lockText.className = "pack-lock-label";
      lockText.textContent = "TO UNLOCK YOU MUST COMPLETE BOXXY ORIGINALS OR MICROBAN";
      name.appendChild(lockText);
    }
    button.append(art, name);
    button.title = isLocked
      ? "To unlock this pack, you must complete BOXXY Originals or Microban."
      : (pack.description || pack.displayName || pack.title);
    button.addEventListener("click", () => openPackLevelPicker(pack.id));
    return button;
  }

  function buildPackSelectors(excludePackId = activePack.id) {
    if (packGrid) {
      packGrid.innerHTML = "";
      packGrid.appendChild(createDailyPackButton());
      PACKS.forEach((pack, index) => packGrid.appendChild(createPackButton(pack, index, false)));
    }
    if (finalPackGrid) {
      finalPackGrid.innerHTML = "";
      const alternatives = PACKS
        .map((pack, index) => ({ pack, index }))
        .filter(entry => entry.pack.id !== excludePackId);
      alternatives.slice(0, 4).forEach(({ pack, index }) => {
        finalPackGrid.appendChild(createPackButton(pack, index, true));
      });
      if (finalPackMoreBtn) finalPackMoreBtn.hidden = PACKS.length <= 4;
    }
  }

  function openPackLevelPicker(packId) {
    const pack = PACK_BY_ID.get(packId);
    if (!pack || packIsLocked(pack)) return;
    closePackModal();
    if (modal && !modal.hidden) closeCompleteModal();
    openLevelPicker(pack);
  }

  function activatePackLevel(packId, chosenLevelIndex) {
    const nextPack = PACK_BY_ID.get(packId);
    if (!nextPack || !Array.isArray(nextPack.levels) || !nextPack.levels.length || packIsLocked(nextPack)) return;
    const snapshot = readPackLevelProgress(nextPack);
    const chosen = Math.max(0, Math.min(nextPack.levels.length - 1, Number(chosenLevelIndex) || 0));
    if (chosen > snapshot.highestUnlocked) return;

    if (nextPack.id !== activePack.id) {
      captureBoxxyAnalytics("pack_selected", {
        from_pack_id: String(activePack?.id || ""),
        from_pack_name: String(activePack?.displayName || activePack?.title || ""),
        from_level_number: Number(levelIndex) + 1,
        to_pack_id: String(nextPack.id || ""),
        to_pack_name: String(nextPack.displayName || nextPack.title || ""),
        to_level_count: Number(nextPack.levels.length || 0)
      });
      localStorage.setItem(currentLevelStorageKey(), String(levelIndex));
      activePack = nextPack;
      LEVELS = nextPack.levels;
      localStorage.setItem(ACTIVE_PACK_STORAGE_KEY, activePack.id);
      levelIndex = storedLevelIndexForPack(activePack);
      completedLevels = new Set();
      assistedLevels = new Set();
      highestUnlockedLevel = 0;
      loadLevelProgress();
      buildPackSelectors();
    }

    levelPickerPack = activePack;
    closePackModal();
    closeLevelPicker();
    if (modal) modal.hidden = true;
    restoreStandardCompletionActions();
    loadLevel(chosen);
  }

  function switchPack(packId) {
    const nextPack = PACK_BY_ID.get(packId);
    if (!nextPack || !Array.isArray(nextPack.levels) || !nextPack.levels.length) return;
    if (packIsLocked(nextPack)) {
      if (finalPackStatus) finalPackStatus.textContent = "Complete BOXXY Original Puzzle Pack or Microban Series to unlock the additional level packs.";
      return;
    }
    if (nextPack.id === activePack.id) {
      closePackModal();
      if (modal) modal.hidden = true;
      if (dailyMode) loadLevel(levelIndex);
      return;
    }

    captureBoxxyAnalytics("pack_selected", {
      from_pack_id: String(activePack?.id || ""),
      from_pack_name: String(activePack?.displayName || activePack?.title || ""),
      from_level_number: Number(levelIndex) + 1,
      to_pack_id: String(nextPack.id || ""),
      to_pack_name: String(nextPack.displayName || nextPack.title || ""),
      to_level_count: Number(nextPack.levels.length || 0)
    });

    localStorage.setItem(currentLevelStorageKey(), String(levelIndex));
    activePack = nextPack;
    LEVELS = nextPack.levels;
    localStorage.setItem(ACTIVE_PACK_STORAGE_KEY, activePack.id);
    levelIndex = storedLevelIndexForPack(activePack);
    completedLevels = new Set();
    highestUnlockedLevel = 0;
    loadLevelProgress();
    buildLevelButtons();
    closePackModal();
    closeLevelPicker();
    if (modal) modal.hidden = true;
    restoreStandardCompletionActions();
    buildPackSelectors();
    loadLevel(levelIndex);
  }


  function openResetConfirm() {
    if (!resetConfirmModal) return;
    updatePackCollectionLabels(activePack);
    resetConfirmModal.hidden = false;
  }

  function closeResetConfirm() {
    if (!resetConfirmModal) return;
    resetConfirmModal.hidden = true;
  }

  function resetLevelProgress() {
    completedLevels = new Set();
    assistedLevels = new Set();
    highestUnlockedLevel = 0;
    saveLevelProgress();
    try { localStorage.removeItem(packCompletionStatsKeyFor(activePack.id)); } catch (_) {}
    LEVELS.forEach((level) => {
      localStorage.removeItem(currentBestStorageKey(level));
      localStorage.removeItem(packStorageKey(`position-${LEVELS.indexOf(level)}`));
      if (activePack.id === "microban") localStorage.removeItem(`push-bauhaus-v22-best-${level.sourceNumber}`);
    });
    levelIndex = 0;
    refreshLevelButtons();
    closeLevelPicker();
    loadLevel(0);
  }

  function progressionCurrentLevelIndex(snapshot, levelCount) {
    if (!snapshot || !Number.isInteger(levelCount) || levelCount <= 0) return -1;
    const highestAccessible = Math.min(levelCount - 1, Math.max(0, Number(snapshot.highestUnlocked) || 0));
    for (let index = highestAccessible; index >= 0; index--) {
      if (!snapshot.completed.has(index)) return index;
    }
    return -1;
  }

  function thumbnailCompletionStats(pack, level, storedRecord) {
    const officialBestMoves = bestMovesForPack(pack, level);
    if (storedRecord && typeof storedRecord === "object") {
      const recordedMoves = Number(storedRecord.moves);
      if (officialBestMoves == null || (Number.isFinite(recordedMoves) && recordedMoves === officialBestMoves)) {
        return storedRecord;
      }
    }
    return officialBestMoves != null ? { moves: officialBestMoves } : null;
  }

  function refreshLevelButtons() {
    const pickerPack = PACK_BY_ID.get(levelButtons?.dataset?.packId) || levelPickerPack || activePack;
    const snapshot = pickerPack.id === activePack.id
      ? { completed: completedLevels, assisted: assistedLevels, currentIndex: levelIndex, highestUnlocked: highestUnlockedLevel }
      : readPackLevelProgress(pickerPack);
    const completionStats = readPackCompletionStats(pickerPack.id).levels || {};
    const progressionCurrentIndex = progressionCurrentLevelIndex(snapshot, pickerPack.levels.length);
    const todayPuzzle = dailyPuzzleForToday();
    const dailyButton = levelButtons?.querySelector?.("[data-daily-level]");
    if (dailyButton) {
      const available = Boolean(todayPuzzle);
      const complete = Boolean(todayPuzzle && dailyCompletion(todayPuzzle.date));
      const status = dailyButton.querySelector("span");
      dailyButton.classList.toggle("current", dailyMode && pickerPack.id === activePack.id);
      dailyButton.classList.toggle("completed", complete && !(dailyMode && pickerPack.id === activePack.id));
      dailyButton.disabled = !available;
      dailyButton.setAttribute("aria-disabled", String(!available));
      dailyButton.title = available
        ? `Daily Boxxy #${Number(todayPuzzle.sequence) || ""} — ${formatDailyDate(todayPuzzle.date, { weekday: true, long: true })}`
        : dailyAvailabilityLabel(null);
      if (status) status.textContent = dailyAvailabilityLabel(todayPuzzle);
    }

    [...levelButtons.querySelectorAll("button[data-level-index]")].forEach(button => {
      const index = Number(button.dataset.levelIndex);
      const isCurrent = index === progressionCurrentIndex;
      const isCompleted = snapshot.completed.has(index);
      const isAssisted = snapshot.assisted.has(index);
      const isLocked = index > snapshot.highestUnlocked;
      button.classList.toggle("current", isCurrent);
      button.classList.toggle("completed", isCompleted && !isCurrent && !isAssisted);
      button.classList.toggle("assisted", isAssisted && !isCurrent);
      button.classList.toggle("locked", isLocked);
      button.disabled = isLocked;
      button.setAttribute("aria-disabled", String(isLocked));
      button.title = isLocked
        ? `Complete level ${index} to unlock level ${index + 1}`
        : `${pickerPack.displayName}: ${index + 1}. ${pickerPack.levels[index].name}`;
      const storedStats = thumbnailCompletionStats(
        pickerPack,
        pickerPack.levels[index],
        completionStats[String(index)] || null
      );
      const liveStats = isCurrent && index === levelIndex && pickerPack.id === activePack.id && !dailyMode && !isCompleted
        ? { moves, seconds: elapsedLevelSeconds() }
        : null;
      renderLevelPickerButton(button, pickerPack, pickerPack.levels[index], index, {
        current: isCurrent,
        completed: isCompleted,
        assisted: isAssisted,
        locked: isLocked,
        stats: storedStats,
        liveStats
      });
    });
    updateCollectionCompleteStar();
    updateDailyQuotePrompt();
  }

  const splashStartedAt = performance.now();
  const splashProgressBar = document.getElementById("splashProgressBar");
  const splashProgressText = document.getElementById("splashProgressText");
  let splashDismissed = false;

  function setSplashProgress(percent, label) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    if (splashProgressBar) splashProgressBar.style.transform = `scaleX(${value / 100})`;
    if (splashProgressText && label) splashProgressText.textContent = label;
  }

  function hideSplashScreen() {
    if (!splashScreen || splashDismissed) return;
    splashDismissed = true;
    setSplashProgress(100, "READY");
    splashScreen.setAttribute("aria-hidden", "true");
    splashScreen.classList.add("hide");
    window.setTimeout(() => { splashScreen.hidden = true; }, 700);
  }

  function waitForImage(image) {
    if (!image) return Promise.resolve();
    return new Promise(resolve => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
        const decoded = image.complete && image.naturalWidth > 0 && typeof image.decode === "function"
          ? image.decode().catch(() => {})
          : Promise.resolve();
        decoded.finally(resolve);
      };
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
      if (image.complete) done();
    });
  }

  const boardAssetLoads = new Map();
  const boardAssetResults = new Map();

  function defaultBoxAssetPath() {
    const path = "assets/board/boxes/box-default-yellow.png";
    return GOAL_COLOURS?.versionedBoardAssetPath?.(path)
      || `${path}?v=${encodeURIComponent(GOAL_COLOURS?.BOARD_ASSET_REVISION || "226")}`;
  }

  function boardAssetPath(type, colour = "red") {
    if (type === "box" && colour === "default-yellow") return defaultBoxAssetPath();
    return GOAL_COLOURS?.spritePath?.(type, colour)
      || `assets/board/${type === "goal" ? "goals/goal" : "boxes/box"}-${colour}.png?v=226`;
  }

  function boardAssetRetryUrl(src, attempt) {
    const separator = String(src).includes("?") ? "&" : "?";
    return `${src}${separator}retry=${attempt}-${Date.now()}`;
  }

  function loadBoardImageOnce(src, timeoutMs = 5000) {
    return new Promise(resolve => {
      const image = new Image();
      let settled = false;
      let timer = 0;

      const finish = async success => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;

        let decoded = Boolean(success && image.naturalWidth > 0);
        if (decoded && typeof image.decode === "function") {
          try { await image.decode(); }
          catch (_) { decoded = false; }
        }
        resolve({ ok: decoded, url: src });
      };

      image.decoding = "async";
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      timer = window.setTimeout(() => finish(false), timeoutMs);
      image.src = src;
      if (image.complete) queueMicrotask(() => finish(image.naturalWidth > 0));
    });
  }

  function ensureBoardAsset(src) {
    const canonical = String(src || "");
    if (!canonical) return Promise.resolve({ ok: false, url: canonical });
    if (boardAssetLoads.has(canonical)) return boardAssetLoads.get(canonical);

    const promise = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const requestUrl = attempt === 0 ? canonical : boardAssetRetryUrl(canonical, attempt);
        const result = await loadBoardImageOnce(requestUrl);
        if (result.ok) {
          const success = { ok: true, url: requestUrl };
          boardAssetResults.set(canonical, success);
          return success;
        }
      }
      const failure = { ok: false, url: canonical };
      boardAssetResults.set(canonical, failure);
      return failure;
    })();

    boardAssetLoads.set(canonical, promise);
    return promise;
  }

  function boardAssetFallback(type, colour = "red") {
    const normalised = colour === "default-yellow"
      ? "yellow"
      : (GOAL_COLOURS?.normalise?.(colour) || "red");
    const hex = normalised === "yellow"
      ? "#f2c121"
      : (GOAL_COLOURS?.PALETTE?.[normalised]?.hex || "#ec2826");

    if (type === "goal") {
      return `radial-gradient(ellipse at center, ${hex} 0 34%, #fff 35% 42%, rgba(20,20,20,.82) 43% 47%, transparent 48%)`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 74"><rect x="5" y="4" width="90" height="65" rx="5" fill="${hex}" stroke="#211b14" stroke-width="5"/><path d="M10 10 90 63M90 10 10 63" stroke="#211b14" stroke-width="7" opacity=".72"/><path d="M9 9h82v12H9z" fill="#fff" opacity=".18"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  function applyBoardArtwork(element, type, colour = "red") {
    if (!element) return;
    const canonical = boardAssetPath(type, colour);
    const token = `${type}:${colour}:${canonical}`;
    const paint = result => {
      if (element.dataset.boardAssetToken !== token) return;
      element.style.backgroundImage = result.ok
        ? `url("${result.url}")`
        : boardAssetFallback(type, colour);
      element.dataset.boardAssetReady = "true";
      element.dataset.boardAssetFallback = result.ok ? "false" : "true";
    };

    element.dataset.boardAssetToken = token;
    element.dataset.boardAssetReady = "false";
    element.style.backgroundImage = boardAssetFallback(type, colour);

    const known = boardAssetResults.get(canonical);
    if (known) paint(known);
    else ensureBoardAsset(canonical).then(paint);
  }

  function refreshBoardArtwork() {
    goalLayer?.querySelectorAll?.(".goal").forEach(goal => {
      applyBoardArtwork(
        goal.querySelector(".board-art-goal"),
        "goal",
        goal.dataset.goalColour || "red"
      );
    });
    pieceLayer?.querySelectorAll?.(".piece.box").forEach(box => {
      const colour = box.classList.contains("on-goal")
        ? (box.dataset.goalColour || "red")
        : "default-yellow";
      applyBoardArtwork(box.querySelector(".board-art-box"), "box", colour);
    });
  }

  function currentBoardAssetPaths() {
    const paths = new Set([defaultBoxAssetPath()]);
    for (const goal of goals) {
      const colour = GOAL_COLOURS?.normalise?.(goal.colour) || "red";
      paths.add(boardAssetPath("goal", colour));
      paths.add(boardAssetPath("box", colour));
    }
    return [...paths];
  }

  function waitForFirstBoard() {
    return new Promise(resolve => {
      const started = performance.now();
      let stableFrames = 0;
      let lastSize = "";
      const inspect = () => {
        const rect = board?.getBoundingClientRect?.();
        const playerImage = pieceLayer?.querySelector?.(".player img");
        const expectedWalls = walls?.size || 0;
        const expectedGoals = goals?.length || 0;
        const expectedBoxes = boxes?.length || 0;
        const boardPopulated = Boolean(
          rect && rect.width > 24 && rect.height > 24 &&
          wallLayer?.children.length === expectedWalls &&
          goalLayer?.children.length === expectedGoals &&
          pieceLayer?.querySelectorAll?.(".box").length === expectedBoxes &&
          playerImage
        );
        const boardArtwork = [
          ...(goalLayer?.querySelectorAll?.(".board-art-goal") || []),
          ...(pieceLayer?.querySelectorAll?.(".board-art-box") || [])
        ];
        const boardArtworkReady = Boolean(
          boardArtwork.length === expectedGoals + expectedBoxes
          && boardArtwork.every(art => art.dataset.boardAssetReady === "true")
        );
        const playerVisible = Boolean(playerImage?.complete && playerImage.naturalWidth > 0);
        const fullyReady = Boolean(
          boardPopulated
          && boardArtworkReady
          && playerVisible
          && playerImage.dataset.characterReady === "true"
        );
        const size = rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : "";
        stableFrames = fullyReady && size === lastSize ? stableFrames + 1 : 0;
        lastSize = size;
        if (stableFrames >= 2) {
          waitForImage(playerImage).finally(resolve);
          return;
        }
        const elapsed = performance.now() - started;
        if (elapsed > 20000 && boardPopulated && boardArtworkReady && playerVisible) {
          waitForImage(playerImage).finally(resolve);
          return;
        }
        if (elapsed > 30000) {
          resolve();
          return;
        }
        requestAnimationFrame(inspect);
      };
      requestAnimationFrame(inspect);
    });
  }

  async function completeStartupSplash() {
    if (!splashScreen || splashDismissed) return;
    setSplashProgress(16, "LOADING BOXXY…");
    const splashImage = splashScreen.querySelector("img");
    await waitForImage(splashImage);
    if (splashImage?.naturalWidth > 0) splashScreen.classList.add("logo-ready");
    setSplashProgress(28, "PREPARING PUZZLE…");
    await Promise.all(currentBoardAssetPaths().map(ensureBoardAsset));
    refreshBoardArtwork();
    setSplashProgress(58, "LOADING CHARACTER…");
    await Promise.resolve(window.CharacterStyler?.ready);
    setSplashProgress(82, "BUILDING BOARD…");
    await waitForFirstBoard();
    setSplashProgress(96, "FINALISING…");
    const remaining = Math.max(0, 1500 - (performance.now() - splashStartedAt));
    if (remaining) await new Promise(resolve => window.setTimeout(resolve, remaining));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    hideSplashScreen();

    const warmCharacter = () => window.CharacterStyler?.warm?.();
    if ("requestIdleCallback" in window) window.requestIdleCallback(warmCharacter, { timeout: 2500 });
    else window.setTimeout(warmCharacter, 700);
  }


  const key = (x, y) => `${x},${y}`;
  const copyBoxes = list => list.map(box => ({ ...box }));
  const posStyle = (x, y, z) => `--x:${x};--y:${y};--z:${z}`;
  const depth = (y, kind) => 1000 + y * 100 + ({ goal: 0, wall: 15, box: 35, player: 60 }[kind] || 0);


  const BACKGROUND_PALETTE = ["#e5392f", "#f2c121", "#2457a6", "#151515", "#f47a20", "#00a6b2", "#2f9e44", "#8e44ad", "#ff7f50", "#16a085"];
  const BACKGROUND_SOLIDS = ["#e5392f", "#f2c121", "#2457a6", "#151515", "#f47a20", "#00a6b2", "#2f9e44", "#8e44ad", "#ff7f50", "#16a085"];
  const backgroundSessionSeed = Math.floor(Math.random() * 0x7fffffff);
  let currentTheme = "bauhaus";
  const THOUGHT_GRUNTS = [
    "Hmm.", "Hmph.", "Hurrumph.", "Ugh.", "Oof.", "Right.", "Aha.", "Nope.",
    "Steady.", "Well then.", "Oh, come on.", "Sigh.", "Mmm.", "Honestly.", "Typical.", "Here we go."
  ];
  const THOUGHT_BOX_ADJECTIVES = [
    "smug", "suspicious", "unreasonably confident", "heavier than it looks", "quietly plotting", "far too pleased with itself",
    "in the wrong place on purpose", "definitely hiding something", "oddly judgmental", "built like a small shed", "not fooling anyone", "asking for trouble"
  ];
  const THOUGHT_BOX_NAMES = [
    "box", "crate", "yellow lump", "wooden menace", "square troublemaker", "portable wall", "obstacle with corners", "freight-shaped problem"
  ];
  const THOUGHT_POSITIONS = [
    "left-hand", "right-hand", "middle", "far", "nearest", "awkward", "lonely", "corner", "cheeky little", "stubborn"
  ];
  const THOUGHT_PLANS = [
    "clear a lane", "keep the middle open", "work from the outside", "make some breathing room", "save that corner",
    "leave myself an exit", "move the awkward one", "pretend I planned this", "try the boring move", "make the wall useful",
    "avoid inventing a dead end", "think backwards for a moment", "give that crate some room", "stop pushing everything I see"
  ];
  const THOUGHT_SMALL_ACTIONS = [
    "one careful shove", "a tiny detour", "a deeply professional pause", "one less-than-heroic push", "a tactical cup of tea",
    "a quick rethink", "a suspiciously elegant move", "a modest amount of genius", "a completely deliberate mistake", "one sensible decision"
  ];
  const THOUGHT_REWARDS = [
    "ice cream", "tea and a biscuit", "a sit down", "something cold", "a chair with excellent lumbar support", "five minutes of doing absolutely nothing",
    "a trolley", "a medal made of cardboard", "a quiet room", "lunch", "a very large pudding", "an early finish"
  ];
  const THOUGHT_PONDERINGS = [
    "clouds ever get tired of drifting", "doors mind being slammed", "pigeons have favourite pavements", "the moon knows it is being watched",
    "socks disappear on purpose", "tea tastes better after manual labour", "chairs appreciate being chosen", "the floor remembers every footstep",
    "boxes dream of being cupboards", "someone has already invented a quieter crate", "ice cream counts as strategy", "a forklift would fit through that door",
    "the person who packed these is nearby", "geometry enjoys showing off", "walls feel smug when they win", "there is a tiny audience somewhere"
  ];
  const THOUGHT_JOBS = [
    "advanced box diplomacy", "applied shoving", "warehouse philosophy", "spatial negotiations", "crate psychology", "professional corner avoidance",
    "tactical furniture movement", "four-sided problem solving", "manual logistics", "competitive tidying"
  ];
  const THOUGHT_OBSERVATIONS = [
    "This room has opinions.", "The floor plan is being cheeky.", "That wall knows exactly what it is doing.", "The silence is becoming sarcastic.",
    "Everything is square except the plan.", "The targets look far too innocent.", "Someone has arranged this with a straight face.", "The corners are conspiring again.",
    "This would be easier if boxes could apologise.", "The room is pretending to be simple.", "I can hear the geometry laughing.", "Nothing here has wheels. Of course."
  ];
  const THOUGHT_SELF_TALK = [
    "I am absolutely charging overtime.", "I could be playing chess.", "My back will file a complaint later.", "I knew I should have stretched.",
    "Nobody needs to know how long this took.", "I will pretend that was the plan.", "This counts as exercise.", "Future me can explain this.",
    "Present me remains unconvinced.", "I have made worse decisions near heavier furniture.", "I am putting this on my CV.", "The boxes can buy lunch."
  ];
  const KONAMI_SEQUENCE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "a", "b", "Enter"];


  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function refreshBackgroundDecor(animate = true) {
    if (!bgDecor) return;
    clearTimeout(backgroundFadeTimer);
    const rebuild = () => {
      backgroundBuildNonce += 1;
      buildBackgroundDecor();
      backgroundDecorBuilt = true;
    };
    if (!animate || !backgroundDecorBuilt) {
      bgDecor.classList.remove("fading");
      rebuild();
      return;
    }
    bgDecor.classList.add("fading");
    backgroundFadeTimer = setTimeout(() => {
      rebuild();
      requestAnimationFrame(() => bgDecor.classList.remove("fading"));
    }, 190);
  }

  function buildBackgroundDecor() {
    if (!bgDecor) return;
    const rand = mulberry32(backgroundSessionSeed + (levelIndex + 1) * 9973 + backgroundBuildNonce * 7919 + width * 131 + height * 17);
    bgDecor.innerHTML = "";
    const palette = ["#151515", "#e5392f", "#f2c121", "#2457a6"];
    const pick = () => palette[Math.floor(rand() * palette.length)];

    function addShape({ type, x, y, w, h, color, rotate = 0, opacity = 0.82 }) {
      const el = document.createElement("div");
      const motionClass = ["konami-a", "konami-b", "konami-c"][Math.floor(rand() * 3)];
      el.className = `bg-shape static ${motionClass} ${type}`;
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.setProperty("--shape-color", color);
      el.style.setProperty("--shape-opacity", opacity.toFixed(2));
      el.style.setProperty("--kx", `${Math.round((-22 + rand() * 44))}px`);
      el.style.setProperty("--ky", `${Math.round((-16 + rand() * 32))}px`);
      el.style.setProperty("--kr", `${(-5 + rand() * 10).toFixed(2)}deg`);
      el.style.setProperty("--kdur", `${(6.7 + rand() * 5.3).toFixed(1)}s`);
      el.style.setProperty("--kdelay", `${(rand() * 1.8).toFixed(1)}s`);
      if (type !== "shape-ring" && !type.includes("stripes") && type !== "shape-dots" && type !== "shape-steps") {
        el.style.background = color;
      }
      if (type === "shape-ring") {
        el.style.color = color;
        el.style.borderWidth = `${Math.round(8 + rand() * 4)}px`;
      }
      if (rotate) el.style.transform = `rotate(${rotate}deg)`;
      bgDecor.appendChild(el);
    }

    const layouts = [
      [
        ["shape-quarter", 4, 5, 108, 108, 0],
        ["shape-rect", 28, 8, 184, 34, 0],
        ["shape-semi-bottom", 51, 6, 88, 88, 0],
        ["shape-ring", 80, 8, 96, 96, 0],
        ["shape-triangle", 89, 28, 82, 74, -10],
        ["shape-semi-right", 4, 57, 94, 94, 0],
        ["shape-circle", 55, 84, 72, 72, 0],
        ["shape-pill", 35, 84, 108, 22, 16],
        ["shape-dots", 14, 80, 76, 76, 0],
        ["shape-rect", 71, 79, 112, 40, -10]
      ],
      [
        ["shape-ring", 6, 8, 100, 100, 0],
        ["shape-rect", 28, 10, 118, 36, -8],
        ["shape-stripes-thin", 61, 7, 68, 130, 0],
        ["shape-quarter", 85, 4, 106, 106, 0],
        ["shape-dots", 10, 77, 82, 82, 0],
        ["shape-semi-left", 75, 75, 92, 92, 0],
        ["shape-triangle", 36, 81, 82, 74, 8],
        ["shape-pill", 57, 58, 110, 22, -14],
        ["shape-circle", 18, 21, 62, 62, 0],
        ["shape-rect", 88, 46, 84, 30, 0]
      ],
      [
        ["shape-semi-top", 11, 7, 88, 88, 0],
        ["shape-pill", 38, 8, 170, 28, 0],
        ["shape-ring", 74, 9, 96, 96, 0],
        ["shape-quarter", 87, 31, 98, 98, 0],
        ["shape-rect", 6, 72, 120, 40, 12],
        ["shape-circle", 49, 84, 72, 72, 0],
        ["shape-semi-right", 73, 78, 92, 92, 0],
        ["shape-dots", 22, 41, 76, 76, 0],
        ["shape-pill", 34, 18, 106, 22, 0],
        ["shape-triangle", 84, 59, 72, 64, -6]
      ],
      [
        ["shape-quarter", 6, 6, 104, 104, 0],
        ["shape-circle", 24, 11, 62, 62, 0],
        ["shape-rect", 46, 9, 176, 32, 0],
        ["shape-ring", 82, 9, 92, 92, 0],
        ["shape-rect", 89, 31, 70, 28, 0],
        ["shape-semi-right", 5, 47, 92, 92, 0],
        ["shape-pill", 18, 79, 100, 22, 12],
        ["shape-triangle", 42, 79, 84, 72, 0],
        ["shape-circle", 71, 82, 66, 66, 0],
        ["shape-semi-left", 83, 72, 86, 86, 0]
      ]
    ];

    const layout = layouts[Math.floor(rand() * layouts.length)];
    layout.forEach(([type, x, y, w, h, rot], idx) => {
      const color = pick();
      const jx = x + (-2 + rand() * 4);
      const jy = y + (-2 + rand() * 4);
      const scale = 1.12 + rand() * 0.24;
      const ww = Math.round(w * scale);
      const hh = Math.round(h * scale);
      addShape({ type, x: jx, y: jy, w: ww, h: hh, color, rotate: rot, opacity: 0.82 + rand() * 0.12 });
    });
  }


  function pickFresh(list, namespace) {
    const recent = recentThoughtParts[namespace] || (recentThoughtParts[namespace] = []);
    const keep = Math.max(1, Math.min(list.length - 1, Math.ceil(list.length * 0.72)));
    const available = list.map((value, index) => ({ value, index })).filter(item => !recent.includes(item.index));
    let choice;
    if (available.length) {
      choice = available[Math.floor(Math.random() * available.length)];
    } else {
      const index = Math.floor(Math.random() * list.length);
      choice = { value: list[index], index };
    }
    recent.push(choice.index);
    while (recent.length > keep) recent.shift();
    return choice.value;
  }

  function capitalise(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function generateThoughtCandidate() {
    const template = Math.floor(Math.random() * 14);
    const grunt = () => pickFresh(THOUGHT_GRUNTS, "grunt");
    const box = () => pickFresh(THOUGHT_BOX_NAMES, "box");
    const adjective = () => pickFresh(THOUGHT_BOX_ADJECTIVES, "adj");
    const position = () => pickFresh(THOUGHT_POSITIONS, "pos");
    const plan = () => pickFresh(THOUGHT_PLANS, "plan");
    const action = () => pickFresh(THOUGHT_SMALL_ACTIONS, "action");
    const reward = () => pickFresh(THOUGHT_REWARDS, "reward");
    const pondering = () => pickFresh(THOUGHT_PONDERINGS, "ponder");
    const job = () => pickFresh(THOUGHT_JOBS, "job");
    const observation = () => pickFresh(THOUGHT_OBSERVATIONS, "observation");
    const selfTalk = () => pickFresh(THOUGHT_SELF_TALK, "self");

    switch (template) {
      case 0: return grunt();
      case 1: return `${grunt()} That ${position()} ${box()} is ${adjective()}.`;
      case 2: return `That ${box()} is ${adjective()}.`;
      case 3: return `Maybe ${plan()}.`;
      case 4: return `${grunt()} ${capitalise(action())} should sort this out.`;
      case 5: return `First, ${plan()}. Then ${reward()}.`;
      case 6: return `I wonder if ${pondering()}.`;
      case 7: return `${observation()}`;
      case 8: return `${selfTalk()}`;
      case 9: return `This is going on my CV under “${job()}”.`;
      case 10: return `After this: ${reward()}. No negotiations.`;
      case 11: return `${grunt()} The ${position()} ${box()} can wait.`;
      case 12: return `Perhaps ${action()} first. That feels respectable.`;
      default: return `${grunt()} I was definitely promised ${reward()}.`;
    }
  }

  function composeCharacterThought() {
    let thought = "";
    for (let attempt = 0; attempt < 30; attempt++) {
      thought = generateThoughtCandidate();
      if (!recentThoughts.includes(thought)) break;
    }
    recentThoughts.push(thought);
    if (recentThoughts.length > 500) recentThoughts.shift();
    lastThought = thought;
    return thought;
  }

  function scheduleCharacterThought() {
    clearTimeout(thoughtTimer);
    thoughtTimer = setTimeout(() => showCharacterThought(), 19000 + Math.random() * 17000);
  }

  function showCharacterThought(specificText = null, immediate = false) {
    if (!thoughtText || !instruction) return;
    const nextThought = specificText || composeCharacterThought();
    clearTimeout(thoughtTimer);
    if (immediate || !thoughtReady) {
      thoughtText.textContent = nextThought;
      instruction.classList.remove("thought-changing");
      thoughtReady = true;
      scheduleCharacterThought();
      return;
    }
    instruction.classList.add("thought-changing");
    setTimeout(() => {
      thoughtText.textContent = nextThought;
      instruction.classList.remove("thought-changing");
      scheduleCharacterThought();
    }, 430);
  }

  function normaliseKonamiKey(keyName) {
    return keyName.length === 1 ? keyName.toLowerCase() : keyName;
  }

  function checkKonamiCode(keyName) {
    const key = normaliseKonamiKey(keyName);
    const expected = KONAMI_SEQUENCE[konamiIndex];
    if (key === expected) {
      konamiIndex += 1;
    } else {
      konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
    }
    if (konamiIndex < KONAMI_SEQUENCE.length) return false;
    konamiIndex = 0;
    document.body.classList.add("konami-background");
    showCharacterThought("Oh. The background has come alive. That seems perfectly normal.", false);
    return true;
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function fullscreenSupported() {
    return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  }

  function phoneFullscreenLayout() {
    return window.matchMedia("(max-width: 760px) and (pointer: coarse), (max-height: 520px) and (orientation: landscape) and (pointer: coarse)").matches;
  }

  function setFullscreenControlState(control, active) {
    if (!control) return;
    control.setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen");
    control.title = active ? "Exit full screen" : "Enter full screen";
    control.setAttribute("aria-pressed", String(active));
  }

  function standaloneDisplayMode() {
    return Boolean(window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches);
  }

  function phoneZenModeActive() {
    return document.body.classList.contains("phone-zen-mode");
  }

  function setPhoneZenMode(active) {
    const enabled = Boolean(active && phoneFullscreenLayout());
    document.documentElement.classList.toggle("phone-zen-mode", enabled);
    document.body.classList.toggle("phone-zen-mode", enabled);

    if (enabled) {
      if (!document.body.classList.contains("konami-background")) {
        document.body.classList.add("konami-background");
        phoneZenActivatedKonamiMotion = true;
      }
      try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (_) { window.scrollTo(0, 0); }
    } else if (phoneZenActivatedKonamiMotion) {
      document.body.classList.remove("konami-background");
      phoneZenActivatedKonamiMotion = false;
    }

    if (mobileFullscreenBtn) setFullscreenControlState(mobileFullscreenBtn, enabled);
    setZenNextButtonVisible(enabled && completed && modal?.hidden && completeMode === "normal" && levelIndex < LEVELS.length - 1);
    requestAnimationFrame(() => {
      scheduleBoardResize();
      requestAnimationFrame(scheduleBoardResize);
    });
  }

  function showMobileFullscreenHint() {
    let hint = document.getElementById("mobileFullscreenHint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "mobileFullscreenHint";
      hint.className = "mobile-fullscreen-hint";
      hint.setAttribute("role", "status");
      hint.setAttribute("aria-live", "polite");
      document.body.appendChild(hint);
    }
    const applePhone = /iPhone|iPod/i.test(navigator.userAgent);
    hint.textContent = applePhone
      ? "For full screen on iPhone: tap Share, choose Add to Home Screen, then open BOXXY from its icon."
      : "This browser cannot enter full screen. Add BOXXY to your Home screen and open it from its icon.";
    hint.classList.remove("show");
    requestAnimationFrame(() => hint.classList.add("show"));
    clearTimeout(showMobileFullscreenHint.timer);
    showMobileFullscreenHint.timer = setTimeout(() => hint.classList.remove("show"), 5600);
  }

  function updateFullscreenButton() {
    const supported = fullscreenSupported();
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const phone = phoneFullscreenLayout();
    const desktopFullscreenActive = Boolean(fullscreenElement());
    let phoneZenActive = phoneZenModeActive();

    if (!phone && phoneZenActive) {
      setPhoneZenMode(false);
      phoneZenActive = false;
    }

    if (fullscreenBtn) {
      fullscreenBtn.hidden = !desktop || !supported;
      const icon = fullscreenBtn.querySelector("span");
      const label = fullscreenBtn.querySelector("b");
      if (icon) icon.textContent = desktopFullscreenActive ? "⤢" : "⛶";
      if (label) label.textContent = desktopFullscreenActive ? "EXIT" : "FULL SCREEN";
      setFullscreenControlState(fullscreenBtn, desktopFullscreenActive);
    }

    if (mobileFullscreenBtn) {
      mobileFullscreenBtn.hidden = !phone;
      setFullscreenControlState(mobileFullscreenBtn, phoneZenActive);
    }
  }

  async function toggleFullscreen() {
    if (phoneFullscreenLayout()) {
      setPhoneZenMode(!phoneZenModeActive());
      return;
    }

    if (!fullscreenSupported()) {
      showMobileFullscreenHint();
      return;
    }
    try {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen({ navigationUI: "hide" });
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        }
      }
    } catch (error) {
      console.warn("Fullscreen could not be changed.", error);
    }
  }

  function resizeBoard() {
    if (!boardWrap || !width || !height) return;
    const wrapStyle = getComputedStyle(boardWrap);
    const horizontalPadding = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
    const verticalPadding = parseFloat(wrapStyle.paddingTop) + parseFloat(wrapStyle.paddingBottom);
    const availableWidth = Math.max(1, boardWrap.clientWidth - horizontalPadding - 2);
    const availableHeight = Math.max(1, boardWrap.clientHeight - verticalPadding - 2);
    const maxCell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--max-cell")) || 76;
    const ratio = width / height;
    const cappedWidth = width * maxCell;
    const fittedWidth = Math.floor(Math.min(availableWidth, availableHeight * ratio, cappedWidth));
    const fittedHeight = Math.floor(fittedWidth / ratio);
    board.style.width = `${Math.max(1, fittedWidth)}px`;
    board.style.height = `${Math.max(1, fittedHeight)}px`;
  }

  function scheduleBoardResize() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resizeBoard();
      scheduleFirstPersonRender();
    }));
  }

  function parseLayout(rows, goalColours = {}) {
    const h = rows.length;
    const w = Math.max(...rows.map(row => row.length));
    const grid = rows.map(row => row.padEnd(w, "").split(""));
    const parsedWalls = new Set();
    const explicitFloor = new Set();
    const parsedGoals = [];
    const parsedBoxes = [];
    const colourMap = GOAL_COLOURS?.normaliseMap?.(goalColours, rows) || {};
    let parsedPlayer = null;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = grid[y][x];
        if (ch === "#") {
          parsedWalls.add(key(x, y));
          continue;
        }
        if (".@$*+".includes(ch)) {
          explicitFloor.add(key(x, y));
          if (".*+".includes(ch)) parsedGoals.push({ x, y, colour: GOAL_COLOURS?.normalise?.(colourMap[`${x},${y}`]) || "red" });
          if ("$*".includes(ch)) parsedBoxes.push([x, y]);
          if ("@+".includes(ch)) parsedPlayer = [x, y];
        }
      }
    }

    const parsedOutside = new Set();
    const queue = [];
    const tryOutside = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const k = key(x, y);
      if (parsedWalls.has(k) || explicitFloor.has(k) || parsedOutside.has(k)) return;
      parsedOutside.add(k);
      queue.push([x, y]);
    };
    for (let x = 0; x < w; x++) {
      tryOutside(x, 0);
      tryOutside(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      tryOutside(0, y);
      tryOutside(w - 1, y);
    }
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      tryOutside(x - 1, y);
      tryOutside(x + 1, y);
      tryOutside(x, y - 1);
      tryOutside(x, y + 1);
    }

    const parsedFloor = new Set();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = key(x, y);
        if (!parsedWalls.has(k) && !parsedOutside.has(k)) parsedFloor.add(k);
      }
    }

    if (!parsedPlayer) throw new Error("Level is missing a player.");
    if (parsedGoals.length !== parsedBoxes.length) throw new Error("Level has unequal boxes and goals.");

    return {
      width: w,
      height: h,
      walls: parsedWalls,
      floor: parsedFloor,
      outside: parsedOutside,
      player: parsedPlayer,
      boxes: parsedBoxes,
      goals: parsedGoals
    };
  }

  function ensureAudio() {
    if (!soundOn) return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function unlockSoundEffects() {
    if (!soundOn || audioUnlocked) return;
    const ac = ensureAudio();
    if (!ac) return;
    try {
      const buffer = ac.createBuffer(1, 1, ac.sampleRate || 44100);
      const source = ac.createBufferSource();
      const gain = ac.createGain();
      gain.gain.value = 0;
      source.buffer = buffer;
      source.connect(gain).connect(ac.destination);
      source.start(0);
      const resume = ac.resume?.();
      if (resume?.then) resume.then(() => { audioUnlocked = ac.state === "running"; }).catch(() => {});
      else audioUnlocked = ac.state === "running";
    } catch (error) {
      audioUnlocked = ac.state === "running";
    }
  }

  function updateMusicButton() {
    if (!musicBtn) return;
    const label = musicBtn.querySelector("b");
    const icon = musicBtn.querySelector("span");
    if (label) label.textContent = musicOn ? "MUSIC ON" : "MUSIC OFF";
    if (icon) icon.textContent = musicOn ? "♫" : "♪";
    musicBtn.setAttribute("aria-pressed", String(musicOn));
  }

  async function startBackgroundMusic() {
    if (!bgMusic || !musicOn) return;
    bgMusic.volume = 0.10;
    try {
      await bgMusic.play();
    } catch (error) {
      // Browsers, especially mobile Safari, may wait for the first user gesture.
    }
  }

  function pauseBackgroundMusic() {
    if (bgMusic) bgMusic.pause();
  }

  function retryMusicAfterInteraction(event) {
    if (event?.target?.closest?.("#musicBtn")) return;
    if (musicOn && bgMusic?.paused) startBackgroundMusic();
  }

  function tone(freq, dur = .08, type = "sine", gain = .035, delay = 0, glide = null) {
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === "suspended") {
      ac.resume().then(() => {
        audioUnlocked = ac.state === "running";
        if (audioUnlocked) tone(freq, dur, type, gain, delay, glide);
      }).catch(() => {});
      return;
    }
    audioUnlocked = ac.state === "running";
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const start = ac.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, start + dur);
    amp.gain.setValueAtTime(.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + .01);
    amp.gain.exponentialRampToValueAtTime(.0001, start + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + .02);
  }

  function noise(dur = .05, gain = .02, cutoff = 900) {
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === "suspended") {
      ac.resume().then(() => {
        audioUnlocked = ac.state === "running";
        if (audioUnlocked) noise(dur, gain, cutoff);
      }).catch(() => {});
      return;
    }
    audioUnlocked = ac.state === "running";
    const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const amp = ac.createGain();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    amp.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter).connect(amp).connect(ac.destination);
    source.start();
  }

  const sfx = {
    walk() { noise(.035, .016, 1400); tone(220, .045, "triangle", .018, 0, 170); },
    push() { noise(.07, .03, 650); tone(112, .1, "triangle", .04, 0, 68); },
    goal() { tone(560, .08, "triangle", .03); tone(840, .13, "triangle", .035, .07); },
    bump() { tone(148, .12, "sine", .032, 0, 78); },
    idle() { tone(510, .07, "sine", .012); tone(620, .09, "sine", .012, .08); },
    packStatTarget(index = 0) {
      const notes = [659.25, 783.99, 987.77];
      const note = notes[Math.max(0, Math.min(notes.length - 1, Number(index) || 0))];
      tone(note, .18, "sine", .035, 0, note * 1.06);
      tone(note * 1.5, .28, "triangle", .022, .055, note * 1.62);
      if (index === 2) tone(note * 2, .34, "sine", .018, .11, note * 2.08);
    },
    finish() { tone(392, .1, "triangle", .035); tone(523, .12, "triangle", .035, .12); tone(784, .18, "triangle", .04, .27); }
  };

  const FIRST_PERSON_GOAL_COLOURS = {
    red: "#e33a27",
    blue: "#2878d0",
    green: "#37a853",
    yellow: "#f1c62b",
    lime: "#9fce38",
    pink: "#df6aa7",
    cream: "#f1dfb5"
  };

  function firstPersonFacingForHeading(heading = firstPersonHeading) {
    return ["back", "right", "front", "left"][((heading % 4) + 4) % 4];
  }

  function firstPersonHeadingForFacing(direction = facing) {
    const map = { back: 0, right: 1, front: 2, left: 3 };
    return Number.isInteger(map[direction]) ? map[direction] : 2;
  }

  function firstPersonDirectionVector(heading = firstPersonHeading) {
    return [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ][((heading % 4) + 4) % 4];
  }

  function firstPersonCameraLabel(value = firstPersonCameraZoom) {
    const amount = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    if (amount === 0) return "FIRST PERSON";
    if (amount === 100) return "WHOLE MAP";
    return `${amount}% OUT`;
  }

  function setFirstPersonCameraZoom(value, renderNow = true) {
    firstPersonCameraZoom = Math.max(0, Math.min(100, Number(value) || 0));
    if (firstPersonCameraSlider) firstPersonCameraSlider.value = String(Math.round(firstPersonCameraZoom));
    if (firstPersonCameraValue) firstPersonCameraValue.textContent = firstPersonCameraLabel();
    if (renderNow) scheduleFirstPersonRender();
  }

  function firstPersonAvatarImage(frame = "player-back") {
    let image = firstPersonAvatarImages.get(frame);
    if (image) return image;
    image = new Image();
    image.alt = "";
    image.decoding = "async";
    image.addEventListener("load", scheduleFirstPersonRender);
    image.addEventListener("error", scheduleFirstPersonRender);
    firstPersonAvatarImages.set(frame, image);
    Promise.resolve(window.CharacterStyler?.drawImage?.(image, frame)).finally(scheduleFirstPersonRender);
    return image;
  }

  function resetFirstPersonAvatarImages() {
    firstPersonAvatarImages.clear();
    if (firstPersonMode) scheduleFirstPersonRender();
  }

  function firstPersonViewGeometry(angle, cssWidth, cssHeight, playerX, playerZ, playerHeight, stepBob = 0) {
    const forwardX = Math.sin(angle);
    const forwardZ = -Math.cos(angle);
    const rightX = Math.cos(angle);
    const rightZ = Math.sin(angle);
    const corners = [
      { x: 0, z: 0 },
      { x: width, z: 0 },
      { x: width, z: height },
      { x: 0, z: height }
    ];
    const forwardValues = corners.map(point => point.x * forwardX + point.z * forwardZ);
    const rightValues = corners.map(point => point.x * rightX + point.z * rightZ);
    const forwardSpan = Math.max(...forwardValues) - Math.min(...forwardValues);
    const rightSpan = Math.max(...rightValues) - Math.min(...rightValues);
    const mapCentreX = width / 2;
    const mapCentreZ = height / 2;
    const aspect = Math.max(0.55, cssWidth / Math.max(1, cssHeight));
    const fitSpan = Math.max(forwardSpan, rightSpan / aspect);
    const wholeMapBack = Math.max(4.5, forwardSpan * 0.82 + 3.5);
    const wholeMapHeight = Math.max(6, fitSpan * 1.72 + 4);

    // One shared camera progress controls distance, height and downward pitch.
    // This prevents the view changing its aim before it actually pulls back.
    const sliderProgress = Math.max(0, Math.min(1, firstPersonCameraZoom / 100));
    const zoom = sliderProgress * sliderProgress * (3 - 2 * sliderProgress);
    const wholeMapCameraX = mapCentreX - forwardX * wholeMapBack;
    const wholeMapCameraZ = mapCentreZ - forwardZ * wholeMapBack;
    const cameraX = playerX + (wholeMapCameraX - playerX) * zoom;
    const cameraZ = playerZ + (wholeMapCameraZ - playerZ) * zoom;
    const cameraHeight = playerHeight + (wholeMapHeight - playerHeight) * zoom;
    const wholeMapPitch = Math.atan2(wholeMapHeight - 0.12, wholeMapBack);
    const pitch = wholeMapPitch * zoom;
    const focal = Math.min(cssWidth * 0.78, cssHeight * 1.28);
    const centreY = cssHeight * (0.43 + zoom * 0.01) + stepBob * (1 - zoom) * 2.4;
    return {
      cameraX,
      cameraZ,
      cameraHeight,
      forwardX,
      forwardZ,
      rightX,
      rightZ,
      cosPitch: Math.cos(pitch),
      sinPitch: Math.sin(pitch),
      pitch,
      zoom,
      centreX: cssWidth / 2,
      centreY,
      focal
    };
  }

  function resetFirstPersonEasterEgg() {
    firstPersonClickCount = 0;
    firstPersonArmed = false;
    clearTimeout(firstPersonResetTimer);
    firstPersonResetTimer = null;
  }

  function registerFirstPersonClick() {
    if (!desktopEasterEggAvailable() || firstPersonMode) return;
    firstPersonClickCount += 1;
    clearTimeout(firstPersonResetTimer);
    firstPersonResetTimer = setTimeout(resetFirstPersonEasterEgg, 10000);
    if (firstPersonClickCount >= 5) firstPersonArmed = true;
  }

  function showFirstPersonBoom() {
    if (!firstPersonBoom) return;
    clearTimeout(firstPersonBoomTimer);
    firstPersonBoom.hidden = false;
    firstPersonBoom.classList.remove("is-active");
    void firstPersonBoom.offsetWidth;
    firstPersonBoom.classList.add("is-active");
    firstPersonBoomTimer = setTimeout(() => {
      firstPersonBoom.hidden = true;
      firstPersonBoom.classList.remove("is-active");
    }, 640);
  }

  function enterFirstPersonMode() {
    if (firstPersonMode || !desktopEasterEggAvailable() || autoplayRunning) return false;
    firstPersonMode = true;
    firstPersonHeading = firstPersonHeadingForFacing(facing);
    facing = firstPersonFacingForHeading();
    resetFirstPersonEasterEgg();
    document.body.classList.add("first-person-mode");
    setFirstPersonCameraZoom(0, false);
    firstPersonCameraControl.hidden = false;
    if (firstPersonCanvas) firstPersonCanvas.hidden = false;
    board?.setAttribute("aria-label", "First-person BOXXY view. Up moves forward, down steps back, and left or right turns.");
    showFirstPersonBoom();
    showCharacterThought("First person. Up and down move; left and right turn. Press Y or Escape to return.", true);
    scheduleBoardResize();
    board?.focus?.({ preventScroll: true });
    return true;
  }

  function exitFirstPersonMode() {
    if (!firstPersonMode) return false;
    firstPersonMode = false;
    firstPersonMotion = null;
    document.body.classList.remove("first-person-mode");
    firstPersonCameraControl.hidden = true;
    cancelAnimationFrame(firstPersonRenderFrame);
    firstPersonRenderFrame = 0;
    clearTimeout(firstPersonBoomTimer);
    if (firstPersonBoom) firstPersonBoom.hidden = true;
    if (firstPersonCanvas) {
      firstPersonCanvas.hidden = true;
      const context = firstPersonCanvas.getContext("2d");
      context?.clearRect(0, 0, firstPersonCanvas.width, firstPersonCanvas.height);
    }
    board?.setAttribute("aria-label", "BOXXY Pushbox Puzzle game board");
    showCharacterThought("Back to the map. That was probably not meant to happen.", true);
    scheduleBoardResize();
    return true;
  }

  const FIRST_PERSON_STEP_DURATION = 210;
  const FIRST_PERSON_TURN_DURATION = 320;

  function firstPersonEase(progress) {
    const t = Math.max(0, Math.min(1, progress));
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function firstPersonMotionInProgress(now = performance.now()) {
    if (!firstPersonMotion) return false;
    if (now >= firstPersonMotion.startedAt + firstPersonMotion.duration) {
      firstPersonMotion = null;
      return false;
    }
    return true;
  }

  function turnFirstPerson(amount) {
    if (firstPersonMotionInProgress()) return false;
    const previousHeading = firstPersonHeading;
    firstPersonHeading = (firstPersonHeading + amount + 4) % 4;
    facing = firstPersonFacingForHeading();
    firstPersonMotion = {
      type: "turn",
      startedAt: performance.now(),
      duration: FIRST_PERSON_TURN_DURATION,
      fromX: player[0] + 0.5,
      fromZ: player[1] + 0.5,
      toX: player[0] + 0.5,
      toZ: player[1] + 0.5,
      fromAngle: previousHeading * Math.PI / 2,
      toAngle: (previousHeading * Math.PI / 2) + amount * Math.PI / 2,
      movedBox: null
    };
    render("idle");
    return true;
  }

  function stepFirstPerson(amount, holdBlocked = false) {
    if (firstPersonMotionInProgress()) return false;
    const [dx, dy] = firstPersonDirectionVector();
    const moveX = dx * amount;
    const moveY = dy * amount;
    const previousPlayer = [...player];
    const previousBoxes = copyBoxes(boxes);
    move(moveX, moveY, holdBlocked, false, firstPersonFacingForHeading());
    if (player[0] === previousPlayer[0] && player[1] === previousPlayer[1]) return false;

    let movedBox = null;
    for (const previousBox of previousBoxes) {
      if (!boxes.some(box => box.x === previousBox.x && box.y === previousBox.y)) {
        const destination = boxes.find(box =>
          box.x === previousBox.x + moveX && box.y === previousBox.y + moveY
        );
        if (destination) {
          movedBox = {
            fromX: previousBox.x,
            fromZ: previousBox.y,
            toX: destination.x,
            toZ: destination.y
          };
        }
        break;
      }
    }

    const angle = firstPersonHeading * Math.PI / 2;
    firstPersonMotion = {
      type: "step",
      startedAt: performance.now(),
      duration: FIRST_PERSON_STEP_DURATION,
      fromX: previousPlayer[0] + 0.5,
      fromZ: previousPlayer[1] + 0.5,
      toX: player[0] + 0.5,
      toZ: player[1] + 0.5,
      fromAngle: angle,
      toAngle: angle,
      movedBox
    };
    scheduleFirstPersonRender();
    return true;
  }

  function clipFirstPersonPolygon(points, near = 0.075) {
    if (!points.length) return [];
    const output = [];
    for (let index = 0; index < points.length; index++) {
      const current = points[index];
      const previous = points[(index + points.length - 1) % points.length];
      const currentInside = current.z >= near;
      const previousInside = previous.z >= near;
      const intersection = () => {
        const span = current.z - previous.z;
        const t = Math.abs(span) < 1e-9 ? 0 : (near - previous.z) / span;
        return {
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
          z: near
        };
      };
      if (currentInside) {
        if (!previousInside) output.push(intersection());
        output.push(current);
      } else if (previousInside) {
        output.push(intersection());
      }
    }
    return output;
  }

  function firstPersonProjectedPolygon(worldPoints, view) {
    const cameraPoints = worldPoints.map(point => {
      const relX = point.x - view.cameraX;
      const relY = point.y - view.cameraHeight;
      const relZ = point.z - view.cameraZ;
      const horizontalForward = relX * view.forwardX + relZ * view.forwardZ;
      return {
        x: relX * view.rightX + relZ * view.rightZ,
        y: horizontalForward * view.sinPitch + relY * view.cosPitch,
        z: horizontalForward * view.cosPitch - relY * view.sinPitch
      };
    });
    const clipped = clipFirstPersonPolygon(cameraPoints);
    if (clipped.length < 3) return null;
    const screenPoints = clipped.map(point => ({
      x: view.centreX + (point.x / point.z) * view.focal,
      y: view.centreY - (point.y / point.z) * view.focal
    }));
    const depth = clipped.reduce((sum, point) => sum + point.z, 0) / clipped.length;
    return { points: screenPoints, depth };
  }

  function traceFirstPersonPolygon(context, points) {
    if (!points.length) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) context.lineTo(points[index].x, points[index].y);
    context.closePath();
  }

  function firstPersonFaceInset(points, amount = 0.17) {
    const centre = points.reduce((result, point) => ({ x: result.x + point.x, y: result.y + point.y }), { x: 0, y: 0 });
    centre.x /= points.length;
    centre.y /= points.length;
    return points.map(point => ({
      x: point.x + (centre.x - point.x) * amount,
      y: point.y + (centre.y - point.y) * amount
    }));
  }

  function renderFirstPersonView() {
    if (!firstPersonMode || !firstPersonCanvas || firstPersonCanvas.hidden || !board) return;
    const rect = board.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const requiredWidth = Math.round(cssWidth * pixelRatio);
    const requiredHeight = Math.round(cssHeight * pixelRatio);
    if (firstPersonCanvas.width !== requiredWidth || firstPersonCanvas.height !== requiredHeight) {
      firstPersonCanvas.width = requiredWidth;
      firstPersonCanvas.height = requiredHeight;
    }
    const context = firstPersonCanvas.getContext("2d", { alpha: false });
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);

    const now = performance.now();
    let angle = firstPersonHeading * Math.PI / 2;
    let playerRenderX = player[0] + 0.5;
    let playerRenderZ = player[1] + 0.5;
    let motionProgress = 1;
    let motionEase = 1;
    const activeMotion = firstPersonMotionInProgress(now) ? firstPersonMotion : null;
    if (activeMotion) {
      motionProgress = Math.max(0, Math.min(1, (now - activeMotion.startedAt) / activeMotion.duration));
      motionEase = firstPersonEase(motionProgress);
      playerRenderX = activeMotion.fromX + (activeMotion.toX - activeMotion.fromX) * motionEase;
      playerRenderZ = activeMotion.fromZ + (activeMotion.toZ - activeMotion.fromZ) * motionEase;
      angle = activeMotion.fromAngle + (activeMotion.toAngle - activeMotion.fromAngle) * motionEase;
    }
    const stepBob = activeMotion?.type === "step" ? Math.sin(motionProgress * Math.PI) : 0;
    const playerEyeHeight = 0.54 + stepBob * 0.018;
    const view = firstPersonViewGeometry(
      angle,
      cssWidth,
      cssHeight,
      playerRenderX,
      playerRenderZ,
      playerEyeHeight,
      stepBob
    );

    const sky = context.createLinearGradient(0, 0, 0, Math.max(1, cssHeight * 0.62));
    sky.addColorStop(0, "#071015");
    sky.addColorStop(1, "#28444c");
    context.fillStyle = sky;
    context.fillRect(0, 0, cssWidth, cssHeight);
    const projectedHorizon = view.centreY - Math.tan(view.pitch) * view.focal;
    const groundStart = Math.max(0, Math.min(cssHeight, projectedHorizon));
    const ground = context.createLinearGradient(0, groundStart, 0, cssHeight);
    ground.addColorStop(0, "#162429");
    ground.addColorStop(1, "#05090b");
    context.fillStyle = ground;
    context.fillRect(0, groundStart, cssWidth, cssHeight - groundStart);

    const floorPolygons = [];
    for (const point of floor) {
      const [x, z] = point.split(",").map(Number);
      const projected = firstPersonProjectedPolygon([
        { x, z, y: 0 },
        { x: x + 1, z, y: 0 },
        { x: x + 1, z: z + 1, y: 0 },
        { x, z: z + 1, y: 0 }
      ], view);
      if (projected) floorPolygons.push({ ...projected, x, z });
    }
    floorPolygons.sort((a, b) => b.depth - a.depth);
    floorPolygons.forEach(polygon => {
      const distanceLight = Math.max(0.42, Math.min(1, 1.12 - polygon.depth / 36));
      const base = (polygon.x + polygon.z) % 2
        ? [211, 226, 220]
        : [244, 237, 218];
      const red = Math.round(base[0] * distanceLight);
      const green = Math.round(base[1] * distanceLight);
      const blue = Math.round(base[2] * distanceLight);
      context.globalAlpha = 1;
      traceFirstPersonPolygon(context, polygon.points);
      context.fillStyle = `rgb(${red},${green},${blue})`;
      context.fill();
      context.strokeStyle = distanceLight > 0.65 ? "rgba(54,72,73,.66)" : "rgba(205,224,219,.38)";
      context.lineWidth = 1;
      context.stroke();
    });
    context.globalAlpha = 1;

    goals.forEach(goal => {
      const colour = FIRST_PERSON_GOAL_COLOURS[String(goal.colour || "red").toLowerCase()] || FIRST_PERSON_GOAL_COLOURS.red;
      const points = [];
      for (let index = 0; index < 24; index++) {
        const theta = index / 24 * Math.PI * 2;
        points.push({
          x: goal.x + 0.5 + Math.cos(theta) * 0.29,
          z: goal.y + 0.5 + Math.sin(theta) * 0.29,
          y: 0.012
        });
      }
      const projected = firstPersonProjectedPolygon(points, view);
      if (!projected) return;
      const fade = Math.max(0.25, Math.min(1, 1.22 - projected.depth / 28));
      context.globalAlpha = fade;
      traceFirstPersonPolygon(context, projected.points);
      context.fillStyle = colour;
      context.fill();
      context.strokeStyle = "rgba(255,255,255,.92)";
      context.lineWidth = 1.4;
      context.stroke();
    });
    context.globalAlpha = 1;

    const faces = [];
    const addCuboid = ({ x0, z0, x1, z1, objectHeight, kind, colour, onGoal = false }) => {
      const sideFill = kind === "wall" ? "#26383d" : colour;
      const topFill = kind === "wall" ? "#78908f" : onGoal ? colour : "rgba(255,214,72,.70)";
      const edge = kind === "wall" ? "#c6dcda" : "rgba(255,246,205,.86)";
      const pushFace = (worldPoints, fill, top = false) => {
        const projected = firstPersonProjectedPolygon(worldPoints, view);
        if (projected) faces.push({ ...projected, fill, edge, kind, top });
      };
      pushFace([
        { x: x0, z: z0, y: objectHeight },
        { x: x1, z: z0, y: objectHeight },
        { x: x1, z: z1, y: objectHeight },
        { x: x0, z: z1, y: objectHeight }
      ], topFill, true);
      if (view.cameraX <= x0) pushFace([
        { x: x0, z: z1, y: 0 }, { x: x0, z: z0, y: 0 },
        { x: x0, z: z0, y: objectHeight }, { x: x0, z: z1, y: objectHeight }
      ], sideFill);
      if (view.cameraX >= x1) pushFace([
        { x: x1, z: z0, y: 0 }, { x: x1, z: z1, y: 0 },
        { x: x1, z: z1, y: objectHeight }, { x: x1, z: z0, y: objectHeight }
      ], sideFill);
      if (view.cameraZ <= z0) pushFace([
        { x: x0, z: z0, y: 0 }, { x: x1, z: z0, y: 0 },
        { x: x1, z: z0, y: objectHeight }, { x: x0, z: z0, y: objectHeight }
      ], sideFill);
      if (view.cameraZ >= z1) pushFace([
        { x: x1, z: z1, y: 0 }, { x: x0, z: z1, y: 0 },
        { x: x0, z: z1, y: objectHeight }, { x: x1, z: z1, y: objectHeight }
      ], sideFill);
    };

    for (const point of walls) {
      const [x, z] = point.split(",").map(Number);
      addCuboid({ x0: x + 0.025, z0: z + 0.025, x1: x + 0.975, z1: z + 0.975, objectHeight: 0.98, kind: "wall" });
    }
    boxes.forEach(box => {
      let renderX = box.x;
      let renderZ = box.y;
      const movingBox = activeMotion?.movedBox;
      if (movingBox && box.x === movingBox.toX && box.y === movingBox.toZ) {
        renderX = movingBox.fromX + (movingBox.toX - movingBox.fromX) * motionEase;
        renderZ = movingBox.fromZ + (movingBox.toZ - movingBox.fromZ) * motionEase;
      }
      const goal = goalAt(box.x, box.y);
      const goalColour = FIRST_PERSON_GOAL_COLOURS[String(goal?.colour || "yellow").toLowerCase()] || "#efbd2c";
      const fill = goal
        ? `${goalColour}b8`
        : "rgba(239,184,37,.68)";
      addCuboid({
        x0: renderX + 0.14,
        z0: renderZ + 0.14,
        x1: renderX + 0.86,
        z1: renderZ + 0.86,
        objectHeight: 0.72,
        kind: "box",
        colour: fill,
        onGoal: Boolean(goal)
      });
    });

    if (view.zoom > 0.015) {
      const avatarHalfWidth = 0.30;
      const avatarHeight = 0.88;
      const projected = firstPersonProjectedPolygon([
        { x: playerRenderX - view.rightX * avatarHalfWidth, z: playerRenderZ - view.rightZ * avatarHalfWidth, y: 0 },
        { x: playerRenderX + view.rightX * avatarHalfWidth, z: playerRenderZ + view.rightZ * avatarHalfWidth, y: 0 },
        { x: playerRenderX + view.rightX * avatarHalfWidth, z: playerRenderZ + view.rightZ * avatarHalfWidth, y: avatarHeight },
        { x: playerRenderX - view.rightX * avatarHalfWidth, z: playerRenderZ - view.rightZ * avatarHalfWidth, y: avatarHeight }
      ], view);
      if (projected && projected.points.length === 4) {
        const frame = activeMotion?.type === "step"
          ? (activeMotion.movedBox ? "push-back" : "walk-back")
          : "player-back";
        faces.push({
          ...projected,
          kind: "avatar",
          image: firstPersonAvatarImage(frame),
          alpha: Math.max(0, Math.min(1, (view.zoom - 0.015) / 0.12))
        });
      }
    }

    faces.sort((a, b) => b.depth - a.depth);
    faces.forEach(face => {
      if (face.kind === "avatar") {
        const xs = face.points.map(point => point.x);
        const ys = face.points.map(point => point.y);
        const left = Math.min(...xs);
        const right = Math.max(...xs);
        const top = Math.min(...ys);
        const bottom = Math.max(...ys);
        const projectedWidth = Math.max(1, right - left);
        const projectedHeight = Math.max(1, bottom - top);
        const avatarHeight = Math.max(projectedHeight, 34 * view.zoom);
        const avatarWidth = Math.max(projectedWidth, avatarHeight * 0.72);
        const avatarLeft = (left + right) / 2 - avatarWidth / 2;
        const avatarTop = bottom - avatarHeight;
        context.globalAlpha = face.alpha;
        if (face.image?.complete && face.image.naturalWidth > 0) {
          const cropX = face.image.naturalWidth * (82 / 300);
          const cropY = face.image.naturalHeight * (74 / 260);
          const cropWidth = face.image.naturalWidth * (136 / 300);
          const cropHeight = face.image.naturalHeight * (186 / 260);
          context.drawImage(
            face.image,
            cropX, cropY, cropWidth, cropHeight,
            avatarLeft, avatarTop, avatarWidth, avatarHeight
          );
        } else {
          context.fillStyle = "rgba(30,25,24,.88)";
          context.beginPath();
          context.arc(avatarLeft + avatarWidth / 2, avatarTop + avatarHeight * 0.20, avatarWidth * 0.18, 0, Math.PI * 2);
          context.fill();
          context.fillRect(avatarLeft + avatarWidth * 0.31, avatarTop + avatarHeight * 0.34, avatarWidth * 0.38, avatarHeight * 0.54);
        }
        context.globalAlpha = 1;
        return;
      }
      const fade = Math.max(0.28, Math.min(1, 1.18 - face.depth / 32));
      context.globalAlpha = face.kind === "wall" ? 1 : fade;
      traceFirstPersonPolygon(context, face.points);
      context.fillStyle = face.fill;
      context.fill();
      context.strokeStyle = face.edge;
      context.lineWidth = face.kind === "wall" ? 1.15 : 1.55;
      context.stroke();
      if (face.kind === "box" && !face.top && face.points.length >= 4) {
        const inset = firstPersonFaceInset(face.points, 0.2);
        traceFirstPersonPolygon(context, inset);
        context.strokeStyle = "rgba(69,49,10,.70)";
        context.lineWidth = 1.2;
        context.stroke();
        context.beginPath();
        context.moveTo(inset[0].x, inset[0].y);
        context.lineTo(inset[2].x, inset[2].y);
        context.moveTo(inset[1].x, inset[1].y);
        context.lineTo(inset[3].x, inset[3].y);
        context.strokeStyle = "rgba(85,57,8,.42)";
        context.stroke();
      }
    });
    context.globalAlpha = 1;

    const glow = context.createRadialGradient(view.centreX, view.centreY, 0, view.centreX, view.centreY, Math.min(cssWidth, cssHeight) * 0.72);
    glow.addColorStop(0, `rgba(212,244,237,${0.055 * (1 - view.zoom)})`);
    glow.addColorStop(1, "rgba(0,0,0,.28)");
    context.fillStyle = glow;
    context.fillRect(0, 0, cssWidth, cssHeight);

    if (view.zoom < 0.18) {
      context.globalAlpha = 1 - view.zoom / 0.18;
      context.beginPath();
      context.arc(view.centreX, view.centreY, 3.2, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,248,225,.72)";
      context.fill();
      context.strokeStyle = "rgba(12,21,24,.82)";
      context.lineWidth = 1;
      context.stroke();
      context.globalAlpha = 1;
    }

    if (activeMotion) scheduleFirstPersonRender();
  }

  function scheduleFirstPersonRender() {
    if (!firstPersonMode || !firstPersonCanvas || firstPersonCanvas.hidden) return;
    cancelAnimationFrame(firstPersonRenderFrame);
    firstPersonRenderFrame = requestAnimationFrame(() => {
      firstPersonRenderFrame = 0;
      renderFirstPersonView();
    });
  }

  function buildFloor() {
    if (floorLayer) floorLayer.innerHTML = "";
  }

  function buildVoid() {
    voidLayer.innerHTML = "";
    for (const point of outside) {
      const [x, y] = point.split(",").map(Number);
      const cell = document.createElement("div");
      cell.className = "cell void-cell";
      cell.style.cssText = posStyle(x, y, 0);
      voidLayer.appendChild(cell);
    }
  }

  function buildWalls() {
    wallLayer.innerHTML = "";
    for (const point of walls) {
      const [x, y] = point.split(",").map(Number);
      const cell = document.createElement("div");
      cell.className = "cell wall";
      cell.style.cssText = posStyle(x, y, depth(y, "wall"));
      wallLayer.appendChild(cell);
    }
  }

  function buildGoals() {
    goalLayer.innerHTML = "";
    goals.forEach(goal => {
      const cell = document.createElement("div");
      cell.className = "cell goal";
      cell.style.cssText = posStyle(goal.x, goal.y, depth(goal.y, "goal"));
      GOAL_COLOURS?.style?.(cell, goal.colour);
      const art = document.createElement("span");
      art.className = "board-art board-art-goal";
      art.setAttribute("aria-hidden", "true");
      cell.appendChild(art);
      applyBoardArtwork(art, "goal", goal.colour);
      goalLayer.appendChild(cell);
    });
  }

  function goalAt(x, y) {
    return goals.find(goal => goal.x === x && goal.y === y) || null;
  }

  function isGoal(x, y) {
    return Boolean(goalAt(x, y));
  }

  function characterFrameName(mode = "idle", direction = "front") {
    const prefix = mode === "walk" ? "walk" : mode === "push" ? "push" : "player";
    return `${prefix}-${direction}`;
  }

  function render(anim = "idle") {
    currentAnimation = anim;
    pieceLayer.innerHTML = "";
    boxes.forEach(box => {
      const goal = goalAt(box.x, box.y);
      const onGoal = Boolean(goal);
      const piece = document.createElement("div");
      piece.className = `piece box${onGoal ? " on-goal" : ""}${anim === "push" && box.moving ? " pushing" : ""}`;
      piece.style.cssText = posStyle(box.x, box.y, depth(box.y, "box"));
      if (goal) GOAL_COLOURS?.style?.(piece, goal.colour);
      const art = document.createElement("span");
      art.className = "board-art board-art-box";
      art.setAttribute("aria-hidden", "true");
      piece.appendChild(art);
      applyBoardArtwork(art, "box", goal ? goal.colour : "default-yellow");
      pieceLayer.appendChild(piece);
    });

    const playerPiece = document.createElement("div");
    playerPiece.className = `piece player facing-${facing}${anim && anim !== "idle" ? " " + anim : ""}`;
    playerPiece.style.cssText = posStyle(player[0], player[1], depth(player[1], "player"));
    const playerImage = document.createElement("img");
    playerImage.alt = "";
    playerImage.draggable = false;
    playerImage.decoding = "sync";
    playerImage.setAttribute("aria-hidden", "true");
    const frameName = characterFrameName(
      anim === "walking" ? "walk" : anim === "pushing" ? "push" : "idle",
      facing
    );
    playerImage.dataset.characterFrame = frameName;
    playerPiece.appendChild(playerImage);
    window.CharacterStyler?.drawImage?.(playerImage, frameName);
    pieceLayer.appendChild(playerPiece);

    movesEl.textContent = moves;
    pushesEl.textContent = pushes;
    levelCount.textContent = sharedPuzzleMode ? "SHARED" : makerTesting ? "MAKER" : dailyMode ? `DAILY #${Number(dailyPuzzle?.sequence) || ""}` : `${levelIndex + 1} / ${LEVELS.length}`;
    const best = (makerTesting || sharedPuzzleMode) ? null : dailyMode ? dailyBestMoves(dailyPuzzle) : readBest(levelData);
    bestEl.textContent = best || "—";
    undoBtn.disabled = !history.length || completed;
    updateSavePositionButton();
    refreshLevelButtons();
    scheduleFirstPersonRender();
  }

  function updateTime() {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    timeEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!completed) {
        sfx.idle();
        const playerNode = pieceLayer.querySelector(".player");
        if (playerNode) {
          // Do not animate the zero-height player container itself: older WebKit can
          // leave its composited child invisible after that animation completes.
          playerNode.classList.remove("idle-bob");
          void playerNode.offsetWidth;
          playerNode.classList.add("idle-bob");
          window.setTimeout(() => playerNode.classList.remove("idle-bob"), 760);
        }
      }
    }, 5500);
  }


  function dailyBestMoves(puzzle = dailyPuzzle) {
    const record = puzzle?.date ? dailyCompletion(puzzle.date) : null;
    const value = Number(record?.moves);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function emojiDailyBoard(rows) {
    const source = Array.isArray(rows) ? rows.map(row => String(row)) : [];
    if (!source.length) return "";
    const width = Math.max(...source.map(row => row.length));
    const emoji = {
      " ": "⬜️",
      "#": "⬛️",
      "$": "🟨",
      ".": "⭕️",
      "*": "🟥",
      "@": "🧍‍♂️",
      "+": "🧍‍♂️"
    };
    return source
      .map(row => row.padEnd(width, " ").split("").map(cell => emoji[cell] || "⬜️").join(""))
      .join("\n");
  }

  function formatClockDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function formatDailyShareDuration(totalSeconds) {
    const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    const parts = [];
    if (minutes) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
    if (seconds || !minutes) parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
    return parts.join(" ");
  }

  function buildDailyShareText(puzzle, result) {
    if (!puzzle) return "";
    const sequence = Number(puzzle.sequence) || "";
    const duration = formatDailyShareDuration(result.seconds);
    const moveWord = Number(result.moves) === 1 ? "move" : "moves";
    const puzzleLabel = String(puzzle.date) === activeDailyDateKey() ? "today's Daily Boxxy" : `Daily Boxxy #${sequence}`;
    return [
      `Daily Boxxy #${sequence} · ${formatDailyDate(puzzle.date, { long: true, year: true })}`,
      `I completed ${puzzleLabel} in ${duration} & ${Number(result.moves) || 0} ${moveWord}.`,
      "",
      emojiDailyBoard(puzzle.layout)
    ].join("\n");
  }

  async function copyDailyResult() {
    const text = String(dailyShareText?.value || "");
    if (!text) return false;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {
      try {
        dailyShareText.focus();
        dailyShareText.select();
        copied = document.execCommand("copy");
        dailyShareText.setSelectionRange(0, 0);
      } catch (_) {}
    }
    if (dailyShareStatus) dailyShareStatus.textContent = copied ? "COPIED — PASTE IT ANYWHERE" : "SELECT THE TEXT AND COPY";
    return copied;
  }

  async function shareDailyResult() {
    const text = String(dailyShareText?.value || "");
    if (!text) return;
    if (dailyShareStatus) dailyShareStatus.textContent = "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Daily Boxxy", text });
        if (dailyShareStatus) dailyShareStatus.textContent = "SHARED";
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
    await copyDailyResult();
  }

  function loadDailyPuzzle(puzzle = dailyPuzzleForToday(), preserveBackground = false) {
    if (!puzzle || !Array.isArray(puzzle.layout) || !puzzle.layout.length) {
      showDailyInvite(true);
      return false;
    }
    stopAutoplay();
    guidedSolveUsed = false;
    resetEasterEgg();
    blockedPushHeld = false;
    clearTimeout(animTimer);
    closeLevelPicker();
    closePackModal();
    closeDailyInvite();
    closeDailyArchive();
    makerTesting = false;
    sharedPuzzleMode = false;
    sharedPuzzleName = "";
    dailyMode = true;
    dailyPuzzle = puzzle;
    window.BOXXY_SHARED_MODE = false;
    document.body.classList.remove("maker-testing", "shared-puzzle");
    document.body.classList.add("daily-mode");
    if (collectionBtn) collectionBtn.disabled = false;
    if (makerReturnBtn) makerReturnBtn.hidden = true;
    makerLayout = null;
    makerGoalColours = {};
    makerSolution = "";
    playedRoute = "";
    makerCompletedRoute = "";
    if (makerApplySolveBtn) makerApplySolveBtn.hidden = true;
    levelData = {
      sourceNumber: `daily-${String(puzzle.date)}`,
      name: "Daily Boxxy",
      tier: "DAILY BOXXY",
      author: "Sam Cornwell",
      minimum: "—",
      pushMinimum: 0,
      solution: String(puzzle.solution || ""),
      layout: puzzle.layout.map(row => String(row)),
      goalColours: puzzle.goalColours || {}
    };
    const parsed = parseLayout(levelData.layout, levelData.goalColours);
    width = parsed.width;
    height = parsed.height;
    walls = parsed.walls;
    floor = parsed.floor;
    outside = parsed.outside;
    player = [...parsed.player];
    boxes = parsed.boxes.map(([x, y]) => ({ x, y, moving: false }));
    goals = parsed.goals.map(goal => ({ ...goal }));
    levelData.pushMinimum = boxes.length;
    moves = 0;
    pushes = 0;
    history = [];
    facing = "front";
    completed = false;
    currentCheckpoint = null;
    completeMode = "daily";
    if (modal) modal.hidden = true;
    setZenNextButtonVisible(false);
    restoreStandardCompletionActions();
    if (finalPackPicker) finalPackPicker.hidden = true;
    if (finalPackStatus) finalPackStatus.textContent = "";
    if (completeKicker) completeKicker.textContent = "DAILY BOXXY";
    if (completeTitle) completeTitle.textContent = "DAILY COMPLETE";
    updatePackCollectionLabels(activePack);
    document.title = `Daily Boxxy #${Number(puzzle.sequence) || ""} — BOXXY`;
    board.style.setProperty("--cols", width);
    board.style.setProperty("--rows", height);
    board.style.setProperty("--ratio", width / height);
    board.style.aspectRatio = `${width} / ${height}`;
    if (!preserveBackground) refreshBackgroundDecor(backgroundDecorBuilt);
    scheduleBoardResize();
    creditTitle.textContent = `DAILY BOXXY · #${Number(puzzle.sequence) || ""}`;
    creditSub.textContent = `SAM CORNWELL · ${width}×${height} · ${boxes.length} ${boxes.length === 1 ? "BOX" : "BOXES"}`;
    startedAt = Date.now();
    clearInterval(timer);
    timer = setInterval(updateTime, 250);
    buildFloor();
    buildVoid();
    buildWalls();
    buildGoals();
    render("idle");
    updateTime();
    scheduleIdle();
    if (thoughtText) thoughtText.textContent = `Daily Boxxy #${Number(puzzle.sequence) || ""}. One puzzle. One day. Good luck.`;
    refreshLevelButtons();
    captureBoxxyAnalytics("daily_puzzle_started", currentLevelAnalytics());
    return true;
  }

  function loadLevel(index, preserveAutoplay = false, preserveBackground = false) {
    dailyMode = false;
    dailyPuzzle = null;
    document.body.classList.remove("daily-mode");
    if (completedPackHeading) completedPackHeading.textContent = "";
    makerTesting = false;
    sharedPuzzleMode = false;
    sharedPuzzleName = "";
    window.BOXXY_SHARED_MODE = false;
    document.body.classList.remove("shared-puzzle");
    if (collectionBtn) collectionBtn.disabled = false;
    document.title = "BOXXY — Pushbox Puzzle";
    makerLayout = null;
    makerGoalColours = {};
    makerSolution = "";
    playedRoute = "";
    makerCompletedRoute = "";
    if (makerApplySolveBtn) makerApplySolveBtn.hidden = true;
    document.body.classList.remove("maker-testing");
    if (makerReturnBtn) makerReturnBtn.hidden = true;
    const requestedIndex = (index + LEVELS.length) % LEVELS.length;
    if (!preserveAutoplay && requestedIndex > highestUnlockedLevel) return;
    if (!preserveAutoplay) stopAutoplay();
    guidedSolveUsed = false;
    resetEasterEgg();
    blockedPushHeld = false;
    clearTimeout(animTimer);
    levelIndex = requestedIndex;
    localStorage.setItem(currentLevelStorageKey(), String(levelIndex));
    if (activePack.id === "microban") localStorage.setItem("push-bauhaus-v33-level", levelIndex);
    const storedSolverRoute = window.BoxxySolutionStore?.get?.(activePack.id, levelIndex) || "";
    levelData = storedSolverRoute ? { ...LEVELS[levelIndex], solution: storedSolverRoute } : LEVELS[levelIndex];
    const parsed = parseLayout(levelData.layout, levelData.goalColours);
    width = parsed.width;
    height = parsed.height;
    walls = parsed.walls;
    floor = parsed.floor;
    outside = parsed.outside;
    player = [...parsed.player];
    boxes = parsed.boxes.map(([x, y]) => ({ x, y, moving: false }));
    goals = parsed.goals.map(goal => ({ ...goal }));
    moves = 0;
    pushes = 0;
    history = [];
    facing = "front";
    completed = false;
    currentCheckpoint = readCurrentCheckpoint();
    completeMode = "normal";
    modal.hidden = true;
    setZenNextButtonVisible(false);
    restoreStandardCompletionActions();
    completeCard?.classList.remove("final-complete");
    if (finalPackPicker) finalPackPicker.hidden = true;
    if (finalPackStatus) finalPackStatus.textContent = "";
    updatePackCollectionLabels(activePack);
    if (completeTitle) completeTitle.innerHTML = "PUZZLE<br>CLEARED";
    if (nextBtnLabel) nextBtnLabel.textContent = "NEXT LEVEL";
    if (nextBtnIcon) nextBtnIcon.textContent = "→";
    board.style.setProperty("--cols", width);
    board.style.setProperty("--rows", height);
    board.style.setProperty("--ratio", width / height);
    board.style.aspectRatio = `${width} / ${height}`;
    if (!preserveBackground) refreshBackgroundDecor(backgroundDecorBuilt);
    scheduleBoardResize();
    creditTitle.textContent = activePack.id === "microban" ? `${levelData.tier} · ${levelData.name}` : levelData.name;
    const creditedAuthor = levelData.author || activePack.author || "";
    const measureWord = activePack.id === "microban"
      ? `${levelData.pushMinimum} ${levelData.pushMinimum === 1 ? "PUSH" : "PUSHES"}`
      : `${boxes.length} ${boxes.length === 1 ? "BOX" : "BOXES"}`;
    creditSub.textContent = `${String(creditedAuthor).toUpperCase()} · ${width}×${height} · ${measureWord}`;
    startedAt = Date.now();
    clearInterval(timer);
    timer = setInterval(updateTime, 250);
    buildFloor();
    buildVoid();
    buildWalls();
    buildGoals();
    render("idle");
    updateTime();
    scheduleIdle();
    showCharacterThought(null, !thoughtReady);
    refreshLevelButtons();
    captureBoxxyAnalytics("level_started", currentLevelAnalytics({
      guided_solve_start: Boolean(preserveAutoplay)
    }));
  }

  function loadMakerTest(layoutRows, attachedSolution = "", options = {}) {
    try {
      const shared = Boolean(options.shared);
      const fallbackName = shared ? "Shared Puzzle" : "Custom Test";
      const customName = String(options.name || fallbackName).trim().slice(0, 64) || fallbackName;
      if (!Array.isArray(layoutRows) || !layoutRows.length) throw new Error("The level is empty.");
      const cleanRows = layoutRows.map(row => String(row));
      const parsed = parseLayout(cleanRows, options.goalColours);
      stopAutoplay();
      guidedSolveUsed = false;
      closeLevelPicker();
      resetEasterEgg();
      blockedPushHeld = false;
      clearTimeout(animTimer);
      makerTesting = !shared;
      sharedPuzzleMode = shared;
      sharedPuzzleName = shared ? customName : "";
      window.BOXXY_SHARED_MODE = shared;
      makerLayout = cleanRows.slice();
      makerGoalColours = GOAL_COLOURS?.normaliseMap?.(options.goalColours, cleanRows) || {};
      makerSolution = String(attachedSolution || "").replace(/[^udlrUDLR]/g, "");
      playedRoute = "";
      makerCompletedRoute = "";
      if (makerApplySolveBtn) makerApplySolveBtn.hidden = true;
      completeMode = "normal";
      restoreStandardCompletionActions();
      document.body.classList.toggle("maker-testing", !shared);
      document.body.classList.toggle("shared-puzzle", shared);
      if (makerReturnBtn) makerReturnBtn.hidden = shared;
      if (collectionBtn) collectionBtn.disabled = shared;
      if (shared && collectionName) collectionName.innerHTML = "PRIVATE<br>PUZZLE";
      if (shared) document.title = `${customName} — BOXXY`;
      levelData = {
        sourceNumber: shared ? "shared" : "maker",
        name: customName,
        tier: shared ? "SHARED PUZZLE" : "LEVEL MAKER",
        minimum: "—",
        pushMinimum: parsed.boxes.length,
        solution: makerSolution,
        layout: cleanRows,
        goalColours: makerGoalColours
      };
      width = parsed.width;
      height = parsed.height;
      walls = parsed.walls;
      floor = parsed.floor;
      outside = parsed.outside;
      player = [...parsed.player];
      boxes = parsed.boxes.map(([x, y]) => ({ x, y, moving: false }));
      goals = parsed.goals.map(goal => ({ ...goal }));
      moves = 0;
      pushes = 0;
      history = [];
      facing = "front";
      completed = false;
      currentCheckpoint = null;
      modal.hidden = true;
      completeCard?.classList.remove("final-complete");
      if (finalPackPicker) finalPackPicker.hidden = true;
      if (finalPackStatus) finalPackStatus.textContent = "";
      board.style.setProperty("--cols", width);
      board.style.setProperty("--rows", height);
      board.style.setProperty("--ratio", width / height);
      board.style.aspectRatio = `${width} / ${height}`;
      refreshBackgroundDecor(backgroundDecorBuilt);
      scheduleBoardResize();
      creditTitle.textContent = shared ? customName.toUpperCase() : `LEVEL MAKER · ${customName.toUpperCase()}`;
      creditSub.textContent = `${shared ? "SHARED PUZZLE · " : ""}${width}×${height} · ${boxes.length} ${boxes.length === 1 ? "BOX" : "BOXES"}`;
      startedAt = Date.now();
      clearInterval(timer);
      timer = setInterval(updateTime, 250);
      buildFloor();
      buildVoid();
      buildWalls();
      buildGoals();
      render("idle");
      updateTime();
      scheduleIdle();
      if (thoughtText) thoughtText.textContent = shared
        ? "A private custom puzzle shared with you. Good luck."
        : "Test the level. The workshop is one click away.";
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || "The level could not be loaded." };
    }
  }

  function restartMakerTest() {
    if ((!makerTesting && !sharedPuzzleMode) || !makerLayout) return;
    loadMakerTest(makerLayout, makerSolution, { shared: sharedPuzzleMode, name: sharedPuzzleName, goalColours: makerGoalColours });
  }

  function exitMakerTest() {
    if (!makerTesting) return;
    makerTesting = false;
    sharedPuzzleMode = false;
    sharedPuzzleName = "";
    window.BOXXY_SHARED_MODE = false;
    makerLayout = null;
    makerGoalColours = {};
    makerSolution = "";
    document.body.classList.remove("maker-testing");
    if (makerReturnBtn) makerReturnBtn.hidden = true;
    loadLevel(levelIndex);
  }

  function snapshot() {
    return {
      player: [...player],
      boxes: copyBoxes(boxes),
      moves,
      pushes,
      facing,
      route: playedRoute
    };
  }

  function blocked(x, y) {
    return !floor.has(key(x, y));
  }

  function boxIndex(x, y) {
    return boxes.findIndex(box => box.x === x && box.y === y);
  }

  function releaseBlockedPush() {
    if (!blockedPushHeld) return;
    blockedPushHeld = false;
    clearTimeout(animTimer);
    render("idle");
    scheduleIdle();
  }

  function move(dx, dy, holdBlocked = false, fromAutoplay = false, facingOverride = "") {
    if (completed || (autoplayRunning && !fromAutoplay)) return;
    ensureAudio();
    clearTimeout(animTimer);
    const attemptedFacing = DELTA_TO_FACING(dx, dy);
    const nx = player[0] + dx;
    const ny = player[1] + dy;

    if (blocked(nx, ny)) {
      facing = facingOverride || attemptedFacing;
      blockedPushHeld = holdBlocked;
      sfx.bump();
      render("pushing");
      scheduleIdle();
      if (!holdBlocked) animTimer = setTimeout(() => render("idle"), 180);
      return;
    }

    const index = boxIndex(nx, ny);
    if (index >= 0) {
      const bx = nx + dx;
      const by = ny + dy;
      if (blocked(bx, by) || boxIndex(bx, by) >= 0) {
        facing = facingOverride || attemptedFacing;
        blockedPushHeld = holdBlocked;
        sfx.bump();
        render("pushing");
        scheduleIdle();
        if (!holdBlocked) animTimer = setTimeout(() => render("idle"), 180);
        return;
      }
      blockedPushHeld = false;
      history.push(snapshot());
      boxes.forEach(box => { box.moving = false; });
      boxes[index].x = bx;
      boxes[index].y = by;
      boxes[index].moving = true;
      player = [nx, ny];
      moves++;
      pushes++;
      facing = facingOverride || attemptedFacing;
      sfx.push();
      if (isGoal(bx, by)) sfx.goal();
      render("pushing");
    } else {
      blockedPushHeld = false;
      history.push(snapshot());
      boxes.forEach(box => { box.moving = false; });
      player = [nx, ny];
      moves++;
      facing = facingOverride || attemptedFacing;
      sfx.walk();
      render("walking");
    }

    playedRoute += DELTA_TO_CODE(dx, dy);
    scheduleIdle();
    animTimer = setTimeout(() => render("idle"), 180);
    if (solved()) finish();
  }

  function solved() {
    return boxes.every(box => isGoal(box.x, box.y));
  }

  function finish() {
    blockedPushHeld = false;
    completed = true;
    clearTimeout(animTimer);
    clearInterval(timer);
    if (!makerTesting && !sharedPuzzleMode && !dailyMode) clearCurrentCheckpoint();

    if (dailyMode && dailyPuzzle) {
      const completionSeconds = elapsedLevelSeconds();
      recordDailyCompletion(dailyPuzzle, {
        moves,
        pushes,
        seconds: completionSeconds,
        completedAt: Date.now()
      });
      const streakResult = awardDailyStreakForCompletion(dailyPuzzle.date);
      completeMode = "daily";
      completionPackContext = null;
      hidePackCompletionStats();
      hidePackStarAward();
      restoreStandardCompletionActions();
      completeCard?.classList.add("daily-complete");
      if (finalPackPicker) finalPackPicker.hidden = true;
      if (finalPackStatus) finalPackStatus.textContent = "";
      if (completeKicker) completeKicker.textContent = `DAILY BOXXY #${Number(dailyPuzzle.sequence) || ""}`;
      if (completeTitle) completeTitle.textContent = "DAILY COMPLETE";
      if (completedPackHeading) completedPackHeading.textContent = formatDailyDate(dailyPuzzle.date, { weekday: true, long: true, year: true });
      if (makerApplySolveBtn) makerApplySolveBtn.hidden = true;
      let streakMessage;
      if (streakResult.changed) {
        streakMessage = `Your Daily Boxxy streak is now ${streakResult.count}.`;
      } else if (String(dailyPuzzle.date) === activeDailyDateKey()) {
        streakMessage = `Your Daily Boxxy streak remains ${streakResult.count}.`;
      } else {
        streakMessage = `Historical Daily Boxxys do not change your streak. Your current streak is ${streakResult.count}.`;
      }
      completeText.textContent = `Completed in ${formatClockDuration(completionSeconds)} and ${moves} ${moves === 1 ? "move" : "moves"}. ${streakMessage}`;
      if (dailyShareText) dailyShareText.value = buildDailyShareText(dailyPuzzle, { seconds: completionSeconds, moves });
      if (dailySharePanel) dailySharePanel.hidden = false;
      if (dailyShareStatus) dailyShareStatus.textContent = "";
      setCompletionActionMode("daily");
      updateDailyStreak();
      updateDailyQuotePrompt();
      refreshLevelButtons();
      renderDailyArchive();
      captureBoxxyAnalytics("daily_puzzle_completed", currentLevelAnalytics({
        moves: Number(moves),
        pushes: Number(pushes),
        duration_seconds: completionSeconds,
        streak_days: streakResult.count,
        streak_incremented: streakResult.changed
      }));
    } else if (sharedPuzzleMode) {
      completeMode = "shared";
      completionPackContext = null;
      hidePackCompletionStats();
      restoreStandardCompletionActions();
      if (finalPackPicker) finalPackPicker.hidden = true;
      if (finalPackStatus) finalPackStatus.textContent = "";
      if (completeKicker) completeKicker.textContent = "PRIVATE PUZZLE";
      if (completeTitle) completeTitle.innerHTML = "PUZZLE<br>CLEARED";
      if (makerApplySolveBtn) makerApplySolveBtn.hidden = true;
      completeText.textContent = `${sharedPuzzleName || "Shared puzzle"} solved in ${moves} ${moves === 1 ? "move" : "moves"} and ${pushes} ${pushes === 1 ? "push" : "pushes"}.`;
      if (nextBtnLabel) nextBtnLabel.textContent = "PLAY AGAIN";
      if (nextBtnIcon) nextBtnIcon.textContent = "↻";
    } else if (makerTesting) {
      const solvedWithGuidedRoute = autoplayRunning || guidedSolveUsed;
      const capturedRoute = String(playedRoute || "").replace(/[^UDLR]/gi, "").toUpperCase();
      const previousRoute = String(makerSolution || "").replace(/[^UDLR]/gi, "").toUpperCase();
      const moveText = `${moves} ${moves === 1 ? "move" : "moves"}`;
      const pushText = `${pushes} ${pushes === 1 ? "push" : "pushes"}`;
      makerCompletedRoute = !solvedWithGuidedRoute ? capturedRoute : "";
      completeMode = "maker";
      completionPackContext = null;
      hidePackCompletionStats();
      restoreStandardCompletionActions();
      if (finalPackPicker) finalPackPicker.hidden = true;
      if (finalPackStatus) finalPackStatus.textContent = "";
      if (completeKicker) completeKicker.textContent = "LEVEL MAKER";
      if (completeTitle) completeTitle.innerHTML = solvedWithGuidedRoute ? "GUIDED<br>SOLVE" : "TEST<br>COMPLETE";
      if (makerApplySolveBtn) makerApplySolveBtn.hidden = true;

      if (solvedWithGuidedRoute) {
        completeText.textContent = `The attached guided solve completed the custom level in ${moveText} and ${pushText}.`;
      } else if (capturedRoute && !previousRoute) {
        makerSolution = capturedRoute;
        if (levelData) levelData.solution = capturedRoute;
        window.dispatchEvent(new CustomEvent("boxxy-maker-solution-found", {
          detail: { route: capturedRoute, moves, pushes, automatic: true }
        }));
        completeText.textContent = `Custom level solved in ${moveText} and ${pushText}. Your moves have been added as its guided solve.`;
      } else if (capturedRoute && capturedRoute !== previousRoute) {
        completeText.textContent = `Custom level solved in ${moveText} and ${pushText}. Apply this route to replace the puzzle's current guided solve.`;
        if (makerApplySolveBtn) makerApplySolveBtn.hidden = false;
      } else {
        completeText.textContent = `Custom level solved in ${moveText} and ${pushText}. This matches the attached guided solve.`;
      }
      if (nextBtnLabel) nextBtnLabel.textContent = "BACK TO MAKER";
      if (nextBtnIcon) nextBtnIcon.textContent = "←";
    } else {
      const solvedWithWalkthrough = autoplayRunning || guidedSolveUsed;
      const learnedRoute = !solvedWithWalkthrough && !String(levelData?.solution || "").trim()
        ? String(playedRoute || "").replace(/[^UDLR]/gi, "").toUpperCase()
        : "";
      if (learnedRoute) {
        window.BoxxySolutionStore?.set?.(activePack.id, levelIndex, learnedRoute);
        levelData = { ...levelData, solution: learnedRoute };
      }
      const packsWereUnlocked = additionalPacksUnlocked();
      const bestKey = currentBestStorageKey(levelData);
      const oldBest = Number(readBest(levelData) || 0);
      const firstCompletion = !completedLevels.has(levelIndex);
      const completionDurationSeconds = elapsedLevelSeconds();
      const isNewBest = !solvedWithWalkthrough && (!oldBest || moves < oldBest);
      if (isNewBest) localStorage.setItem(bestKey, moves);
      recordLevelCompletionStats(activePack, levelIndex, {
        moves,
        pushes,
        seconds: completionDurationSeconds,
        guided: solvedWithWalkthrough,
        completedAt: Date.now()
      });

      completedLevels.add(levelIndex);
      if (solvedWithWalkthrough) assistedLevels.add(levelIndex);
      else assistedLevels.delete(levelIndex);
      highestUnlockedLevel = Math.max(highestUnlockedLevel, Math.min(levelIndex + 1, LEVELS.length - 1));
      saveLevelProgress();
      refreshLevelButtons();
      captureBoxxyAnalytics("level_completed", currentLevelAnalytics({
        moves: Number(moves),
        pushes: Number(pushes),
        duration_seconds: completionDurationSeconds,
        first_completion: firstCompletion,
        guided_solve: Boolean(solvedWithWalkthrough),
        new_best: Boolean(isNewBest),
        previous_best_moves: oldBest || null,
        pack_completed: levelIndex === LEVELS.length - 1
      }));

      if (levelIndex === LEVELS.length - 1) {
        const canUnlockAdditionalPacks = UNLOCK_SOURCE_PACK_IDS.has(activePack.id);
        const unlockedAdditionalPacksNow = canUnlockAdditionalPacks && !packsWereUnlocked;
        if (canUnlockAdditionalPacks) localStorage.setItem(ADDITIONAL_PACKS_UNLOCK_KEY, "true");
        completeMode = "final";
        completionPackContext = activePack;
        completeCard?.classList.add("final-complete");
        if (completeKicker) completeKicker.textContent = "CONGRATULATIONS";
        if (completeTitle) completeTitle.textContent = "WELL DONE";
        if (completedPackHeading) completedPackHeading.textContent = String(activePack.displayName || activePack.title || "");
        completeText.textContent = "";
        showPackStarAward(activePack);
        renderPackCompletionStats(activePack, false);
        buildPackSelectors(activePack.id);
        if (finalPackPicker) finalPackPicker.hidden = false;
        if (finalPackStatus) finalPackStatus.textContent = solvedWithWalkthrough ? "Guided-solve completions are shown in yellow in the level list." : "";
        configureFinalCompletionActions(activePack);
      } else {
        completeMode = "normal";
        completionPackContext = null;
        hidePackCompletionStats();
        hidePackStarAward();
        restoreStandardCompletionActions();
        completeCard?.classList.remove("final-complete");
        if (finalPackPicker) finalPackPicker.hidden = true;
        if (finalPackStatus) finalPackStatus.textContent = solvedWithWalkthrough ? "Guided-solve completions are marked yellow in the level list." : "";
        if (completeKicker) completeKicker.textContent = packCollectionLabel(activePack).toUpperCase();
        if (completedPackHeading) completedPackHeading.textContent = "";
        if (completeTitle) completeTitle.innerHTML = solvedWithWalkthrough ? "GUIDED<br>SOLVE" : "PUZZLE<br>CLEARED";
        const statedMinimum = Number(levelData.minimum);
        let summary;
        if (Number.isFinite(statedMinimum) && statedMinimum > 0) {
          const difference = moves - statedMinimum;
          summary = difference === 0
            ? `Perfect route: ${moves} moves and ${pushes} pushes.`
            : `Solved in ${moves} moves and ${pushes} pushes — ${difference} over the minimum.`;
        } else {
          summary = `Solved in ${moves} moves and ${pushes} pushes.`;
        }
        completeText.textContent = solvedWithWalkthrough
          ? `${summary} This level is now counted as completed, and its button will appear in yellow.`
          : `${summary}${learnedRoute ? " Your route has been saved as this level's guided solve." : ""}`;
        if (nextBtnLabel) nextBtnLabel.textContent = "NEXT LEVEL";
        if (nextBtnIcon) nextBtnIcon.textContent = "→";
      }
    }

    const grandCelebrationPack = completeMode === "final" ? (completionPackContext || activePack) : null;
    showRandomCompletionSprite();
    burst();
    sfx.finish();
    setTimeout(() => {
      setZenNextButtonVisible(false);
      modal.hidden = false;
      render("idle");
      if (grandCelebrationPack) {
        renderPackCompletionStats(grandCelebrationPack, true);
        grandBurst(grandCelebrationPack);
      }
    }, 500);
  }

  function burst() {
    celebration.innerHTML = "";
    const colors = currentTheme === "ink"
      ? ["#c49322", "#2d2822", "#9b8d78", "#eee5d1"]
      : ["#db3b27", "#e5b32a", "#20539a", "#171719"];
    for (let i = 0; i < 52; i++) {
      const confetti = document.createElement("i");
      confetti.className = "confetti";
      confetti.style.left = "50%";
      confetti.style.top = "50%";
      confetti.style.background = colors[i % colors.length];
      confetti.style.setProperty("--dx", `${(Math.random() - .5) * 650}px`);
      confetti.style.setProperty("--dy", `${(Math.random() - .5) * 550}px`);
      celebration.appendChild(confetti);
    }
    setTimeout(() => { celebration.innerHTML = ""; }, 1400);
  }

  function grandBurst(pack = activePack) {
    if (!grandCelebration) return;
    grandCelebration.innerHTML = "";
    grandCelebration.hidden = false;
    const accent = packAccentColour(pack);
    const colors = [accent, "#e5b32a", "#20539a", "#db3b27", "#f7f0e5", "#2f8f5b"];
    const origins = [
      [14, 22, 0], [86, 20, 120], [23, 70, 250],
      [78, 68, 380], [50, 12, 520], [50, 82, 690]
    ];

    origins.forEach(([x, y, delay], fireworkIndex) => {
      const firework = document.createElement("span");
      firework.className = "grand-firework";
      firework.style.left = `${x}%`;
      firework.style.top = `${y}%`;
      firework.style.setProperty("--ring-colour", colors[fireworkIndex % colors.length]);
      firework.style.setProperty("--firework-delay", `${delay}ms`);
      for (let i = 0; i < 18; i++) {
        const spark = document.createElement("i");
        const angle = (Math.PI * 2 * i / 18) + (Math.random() - .5) * .14;
        const distance = 82 + Math.random() * 105;
        spark.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
        spark.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
        spark.style.setProperty("--spark-colour", colors[(i + fireworkIndex) % colors.length]);
        spark.style.setProperty("--spark-delay", `${delay + Math.random() * 90}ms`);
        firework.appendChild(spark);
      }
      grandCelebration.appendChild(firework);
    });

    for (let i = 0; i < 150; i++) {
      const piece = document.createElement("i");
      piece.className = "grand-confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty("--confetti-delay", `${Math.random() * 950}ms`);
      piece.style.setProperty("--confetti-duration", `${1700 + Math.random() * 1500}ms`);
      piece.style.setProperty("--confetti-drift", `${(Math.random() - .5) * 360}px`);
      piece.style.setProperty("--confetti-spin", `${540 + Math.random() * 1080}deg`);
      piece.style.width = `${6 + Math.random() * 9}px`;
      piece.style.height = `${10 + Math.random() * 18}px`;
      grandCelebration.appendChild(piece);
    }

    window.setTimeout(() => {
      grandCelebration.innerHTML = "";
      grandCelebration.hidden = true;
    }, 4300);
  }

  function undo() {
    if (autoplayRunning || !history.length || completed) return;
    blockedPushHeld = false;
    clearTimeout(animTimer);
    const state = history.pop();
    player = state.player;
    boxes = state.boxes;
    moves = state.moves;
    pushes = state.pushes;
    facing = state.facing;
    playedRoute = String(state.route || "");
    render("idle");
    scheduleIdle();
  }

  function renderLevelPickerButton(button, pack, level, index, state) {
    const showPreview = state.completed || state.current;
    button.replaceChildren();
    button.classList.toggle("has-thumbnail", showPreview);
    if (showPreview) {
      const art = document.createElement("span");
      art.className = "level-thumb-art";
      const canvas = document.createElement("canvas");
      canvas.className = "level-thumb-canvas";
      canvas.setAttribute("aria-hidden", "true");
      art.appendChild(canvas);
      const badge = document.createElement("span");
      badge.className = "level-thumb-number";
      badge.textContent = String(index + 1);
      art.appendChild(badge);

      if (state.current || state.assisted) {
        const stateBadge = document.createElement("span");
        stateBadge.className = "level-thumb-state";
        stateBadge.textContent = state.current ? "CURRENT" : "ASSISTED";
        art.appendChild(stateBadge);
      }

      const record = state.completed && state.stats && typeof state.stats === "object"
        ? state.stats
        : state.current && state.liveStats && typeof state.liveStats === "object"
          ? state.liveStats
          : null;
      const stats = document.createElement("span");
      stats.className = "level-thumb-stats";

      const movesStat = document.createElement("span");
      const movesLabel = document.createElement("small");
      movesLabel.textContent = "MOVES";
      const movesValue = document.createElement("strong");
      movesValue.textContent = record && Number.isFinite(Number(record.moves))
        ? String(Math.max(0, Math.round(Number(record.moves))))
        : "—";
      movesStat.append(movesLabel, movesValue);

      const timeStat = document.createElement("span");
      const timeLabel = document.createElement("small");
      timeLabel.textContent = "TIME";
      const timeValue = document.createElement("strong");
      timeValue.textContent = record && Number.isFinite(Number(record.seconds))
        ? formatClockDuration(Math.max(0, Number(record.seconds)))
        : "—";
      timeStat.append(timeLabel, timeValue);

      stats.append(movesStat, timeStat);
      button.append(art, stats);
      drawLevelThumbnail(canvas, level);
      return;
    }

    const number = document.createElement("strong");
    number.className = "level-locked-number";
    number.textContent = String(index + 1);
    const label = document.createElement("span");
    label.className = "level-locked-label";
    label.textContent = state.locked ? "LOCKED" : "AVAILABLE";
    button.append(number, label);
  }

  function buildLevelButtons(pack = levelPickerPack || activePack) {
    if (!levelButtons) return;
    levelPickerPack = pack && Array.isArray(pack.levels) ? pack : activePack;
    const pickerPack = levelPickerPack;
    levelButtons.dataset.packId = pickerPack.id;
    levelButtons.innerHTML = "";
    if (levelPickerTitle) levelPickerTitle.textContent = `${String(pickerPack.displayName || pickerPack.title || "CHOOSE").toUpperCase()} LEVELS`;

    const dailyButton = document.createElement("button");
    dailyButton.type = "button";
    dailyButton.className = "daily-level-option";
    dailyButton.dataset.dailyLevel = "true";
    dailyButton.innerHTML = '<strong>BOXXY DAILY</strong><span>TODAY</span>';
    dailyButton.addEventListener("click", () => {
      const puzzle = dailyPuzzleForToday();
      if (!puzzle) {
        showDailyInvite(true);
        return;
      }
      closeLevelPicker();
      loadDailyPuzzle(puzzle);
    });
    levelButtons.appendChild(dailyButton);

    pickerPack.levels.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-thumbnail-card";
      button.dataset.levelIndex = String(index);
      button.dataset.packId = pickerPack.id;
      button.addEventListener("click", () => activatePackLevel(pickerPack.id, index));
      levelButtons.appendChild(button);
    });
    refreshLevelButtons();
  }

  function desktopEasterEggAvailable() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function resetEasterEgg() {
    easterClickCount = 0;
    easterArmed = false;
    clearTimeout(easterResetTimer);
    easterResetTimer = null;
  }

  function stopAutoplay() {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
    autoplayRunning = false;
    document.body.classList.remove("autoplaying");
    if (cancelGuidedBtn) cancelGuidedBtn.hidden = true;
  }

  function cancelGuidedSolve() {
    if (!autoplayRunning) return;
    stopAutoplay();
    render("idle");
    scheduleIdle();
    if (thoughtText) thoughtText.textContent = "Guided solve stopped. Continue from here or restart the puzzle.";
    board?.focus?.({ preventScroll: true });
  }

  function startAutoplay() {
    if (dailyMode) {
      if (thoughtText) thoughtText.textContent = "Guided solve is unavailable for the Daily Boxxy.";
      resetEasterEgg();
      return;
    }
    if (!desktopEasterEggAvailable() || autoplayRunning) return;
    const testingMaker = makerTesting;
    const solution = String(testingMaker ? makerSolution : levelData?.solution || "").replace(/[^udlrUDLR]/g, "");
    if (!solution) {
      if (thoughtText) thoughtText.textContent = testingMaker
        ? "This test puzzle does not have a guided solve attached yet."
        : "No guided solve is available for this puzzle yet.";
      resetEasterEgg();
      return;
    }

    stopAutoplay();
    if (testingMaker) {
      const rows = makerLayout?.slice();
      const restarted = rows ? loadMakerTest(rows, solution, {
        shared: sharedPuzzleMode,
        name: sharedPuzzleName,
        goalColours: makerGoalColours
      }) : { ok: false };
      if (!restarted?.ok) return;
    } else {
      loadLevel(levelIndex, true, true);
    }
    autoplayRunning = true;
    guidedSolveUsed = true;
    document.body.classList.add("autoplaying");
    if (cancelGuidedBtn) cancelGuidedBtn.hidden = false;
    render("idle");
    let step = 0;

    const playNext = () => {
      if (!autoplayRunning) return;
      if (step >= solution.length) {
        stopAutoplay();
        return;
      }
      const code = solution[step++].toUpperCase();
      const delta = CODE_TO_DELTA[code];
      if (!delta) {
        autoplayTimer = setTimeout(playNext, 0);
        return;
      }
      move(delta[0], delta[1], false, true);
      autoplayTimer = setTimeout(playNext, 220);
    };

    autoplayTimer = setTimeout(playNext, 320);
  }

  firstPersonCameraSlider?.addEventListener("input", event => {
    setFirstPersonCameraZoom(event.currentTarget.value);
  });
  firstPersonCameraSlider?.addEventListener("change", event => {
    setFirstPersonCameraZoom(event.currentTarget.value);
  });
  firstPersonCameraSlider?.addEventListener("pointerup", () => {
    board?.focus?.({ preventScroll: true });
  });

  const directionMap = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
  };

  document.addEventListener("keydown", event => {
    if (levelMakerModal && !levelMakerModal.hidden) return;
    if (window.CharacterStyler?.isOpen) return;
    if (autoplayRunning && event.key === "Escape") {
      event.preventDefault();
      cancelGuidedSolve();
      return;
    }
    if (firstPersonMode) {
      if (event.key === "Escape" || event.key.toLowerCase() === "y") {
        event.preventDefault();
        exitFirstPersonMode();
        return;
      }
      if (event.target === firstPersonCameraSlider && event.key.startsWith("Arrow")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (!event.repeat) turnFirstPerson(event.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        if (event.repeat && blockedPushHeld) return;
        stepFirstPerson(event.key === "ArrowUp" ? 1 : -1, true);
        return;
      }
    }
    if (checkKonamiCode(event.key)) {
      event.preventDefault();
      return;
    }
    if (desktopEasterEggAvailable() && firstPersonArmed && event.key.toLowerCase() === "y") {
      event.preventDefault();
      enterFirstPersonMode();
      return;
    }
    if (desktopEasterEggAvailable() && easterArmed && event.key.toLowerCase() === "s") {
      event.preventDefault();
      resetEasterEgg();
      autoSolveBtn.click();
      return;
    }
    if (directionMap[event.key]) {
      event.preventDefault();
      if (event.repeat && blockedPushHeld) return;
      move(...directionMap[event.key], true);
    } else if (event.key === "z" || event.key === "Z") {
      event.preventDefault();
      undo();
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      if (makerTesting || sharedPuzzleMode) restartMakerTest();
      else {
        captureBoxxyAnalytics("level_restarted", currentLevelAnalytics({
          restart_method: "keyboard",
          moves_before_restart: Number(moves),
          pushes_before_restart: Number(pushes),
          elapsed_seconds: elapsedLevelSeconds()
        }));
        loadLevel(levelIndex);
      }
    }
  });

  document.addEventListener("keyup", event => {
    if (directionMap[event.key]) releaseBlockedPush();
  });
  window.addEventListener("blur", releaseBlockedPush);

  const buttonDirections = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  document.querySelectorAll("[data-dir]").forEach(button => {
    let activePointerId = null;
    let repeatDelay = 0;
    let repeatTimer = 0;

    const stopRepeat = () => {
      window.clearTimeout(repeatDelay);
      window.clearInterval(repeatTimer);
      repeatDelay = 0;
      repeatTimer = 0;
    };

    const performDirectionMove = () => {
      if (firstPersonMode) {
        if (button.dataset.dir === "up" || button.dataset.dir === "down") {
          stepFirstPerson(button.dataset.dir === "up" ? 1 : -1, true);
        } else {
          turnFirstPerson(button.dataset.dir === "left" ? -1 : 1);
        }
        return;
      }
      move(...buttonDirections[button.dataset.dir], true);
    };

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      if (activePointerId !== null) return;
      activePointerId = event.pointerId;

      ensureAudio();
      button.setPointerCapture?.(event.pointerId);
      performDirectionMove();

      // Match keyboard behaviour: pause briefly, then repeat while held.
      repeatDelay = window.setTimeout(() => {
        repeatTimer = window.setInterval(performDirectionMove, 105);
      }, 330);
    });

    const releaseDirectionButton = event => {
      if (activePointerId !== null &&
          event?.pointerId !== undefined &&
          event.pointerId !== activePointerId) return;
      stopRepeat();
      activePointerId = null;
      releaseBlockedPush();
    };

    button.addEventListener("pointerup", releaseDirectionButton);
    button.addEventListener("pointercancel", releaseDirectionButton);
    button.addEventListener("lostpointercapture", releaseDirectionButton);
    button.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse") releaseDirectionButton(event);
    });

    // Suppress the synthetic click produced after a touch press.
    button.addEventListener("click", event => event.preventDefault());
  });



  function pointerIsOnCharacter(event) {
    if (!desktopEasterEggAvailable()) return false;
    const visual = pieceLayer.querySelector(".player img, .player canvas");
    if (!visual) return false;
    const rect = visual.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  function registerEasterClick() {
    if (!desktopEasterEggAvailable() || autoplayRunning) return;
    easterClickCount++;
    clearTimeout(easterResetTimer);
    easterResetTimer = setTimeout(resetEasterEgg, 10000);
    if (easterClickCount >= 5) easterArmed = true;
  }

  function refreshPlayerVisual() {
    const image = pieceLayer.querySelector(".player img");
    if (!image) return;
    const frame = image.dataset.characterFrame || "player-front";
    window.CharacterStyler?.drawImage?.(image, frame);
  }

  // redrawAll() updates the existing gameplay image directly. Rebuilding the entire
  // piece layer here created a race in which Olive could be left on the default
  // fallback sprite after an attire change.
  function mobileOrTabletInput() {
    return Boolean((navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.("(pointer: coarse)")?.matches);
  }

  function pauseMusicForHiddenTab() {
    if (!mobileOrTabletInput() || !musicOn || !bgMusic || bgMusic.paused) return;
    musicPausedForHiddenTab = true;
    pauseBackgroundMusic();
  }

  function resumeMusicAfterHiddenTab() {
    requestAnimationFrame(refreshPlayerVisual);
    if (!musicPausedForHiddenTab) return;
    musicPausedForHiddenTab = false;
    if (musicOn) startBackgroundMusic();
  }

  window.addEventListener("characterstylechange", () => {
    requestAnimationFrame(refreshPlayerVisual);
    resetFirstPersonAvatarImages();
  });
  window.addEventListener("pageshow", resumeMusicAfterHiddenTab);
  window.addEventListener("pagehide", pauseMusicForHiddenTab);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseMusicForHiddenTab();
    else resumeMusicAfterHiddenTab();
  });
  firstPersonHotspot?.addEventListener("click", event => {
    if (!desktopEasterEggAvailable()) return;
    event.preventDefault();
    registerFirstPersonClick();
  });
  autoSolveBtn.addEventListener("click", startAutoplay);
  cancelGuidedBtn?.addEventListener("click", cancelGuidedSolve);
  fullscreenBtn?.addEventListener("click", toggleFullscreen);
  mobileFullscreenBtn?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => { updateFullscreenButton(); scheduleBoardResize(); });
  document.addEventListener("webkitfullscreenchange", () => { updateFullscreenButton(); scheduleBoardResize(); });
  window.addEventListener("resize", () => {
    if (firstPersonMode && !desktopEasterEggAvailable()) exitFirstPersonMode();
    updateFullscreenButton();
    scheduleBoardResize();
  });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => { updateFullscreenButton(); scheduleBoardResize(); }, 80);
  });

  {
    let activePointerId = null;
    let repeatDelay = 0;
    let repeatTimer = 0;

    const stopUndoRepeat = () => {
      window.clearTimeout(repeatDelay);
      window.clearInterval(repeatTimer);
      repeatDelay = 0;
      repeatTimer = 0;
    };

    const performUndo = () => {
      if (autoplayRunning || !history.length || completed) {
        stopUndoRepeat();
        return;
      }
      undo();
    };

    undoBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      if (activePointerId !== null || undoBtn.disabled) return;
      activePointerId = event.pointerId;

      ensureAudio();
      undoBtn.setPointerCapture?.(event.pointerId);
      performUndo();

      // Match held direction controls: pause briefly, then repeat while held.
      repeatDelay = window.setTimeout(() => {
        repeatTimer = window.setInterval(performUndo, 105);
      }, 330);
    });

    const releaseUndoButton = event => {
      if (activePointerId !== null &&
          event?.pointerId !== undefined &&
          event.pointerId !== activePointerId) return;
      stopUndoRepeat();
      activePointerId = null;
    };

    undoBtn.addEventListener("pointerup", releaseUndoButton);
    undoBtn.addEventListener("pointercancel", releaseUndoButton);
    undoBtn.addEventListener("lostpointercapture", releaseUndoButton);
    undoBtn.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse") releaseUndoButton(event);
    });

    // Pointer presses undo on pointerdown; keyboard/assistive activation still uses click.
    undoBtn.addEventListener("click", event => {
      event.preventDefault();
      if (event.detail === 0) undo();
    });
  }
  savePositionBtn?.addEventListener("click", saveOrRestorePosition);
  restartBtn.addEventListener("click", () => {
    if (makerTesting || sharedPuzzleMode) restartMakerTest();
    else if (dailyMode) loadDailyPuzzle(dailyPuzzle, true);
    else {
      captureBoxxyAnalytics("level_restarted", currentLevelAnalytics({
        restart_method: "button",
        moves_before_restart: Number(moves),
        pushes_before_restart: Number(pushes),
        elapsed_seconds: elapsedLevelSeconds()
      }));
      loadLevel(levelIndex);
    }
  });
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.querySelector("b").textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    if (soundOn) unlockSoundEffects();
  });
  musicBtn?.addEventListener("click", () => {
    musicOn = !musicOn;
    localStorage.setItem("push-bauhaus-music", musicOn ? "on" : "off");
    updateMusicButton();
    if (musicOn) startBackgroundMusic();
    else pauseBackgroundMusic();
  });
  collectionBtn?.addEventListener("click", openPackModal);
  finalPackMoreBtn?.addEventListener("click", () => {
    closeCompleteModal();
    openPackModal();
  });
  packCloseBtn?.addEventListener("click", closePackModal);
  packModal?.addEventListener("click", event => { if (event.target === packModal) closePackModal(); });
  dailyArchiveCloseBtn?.addEventListener("click", closeDailyArchive);
  dailyArchiveModal?.addEventListener("click", event => { if (event.target === dailyArchiveModal) closeDailyArchive(); });
  dailyStreak?.addEventListener("click", () => {
    const puzzle = dailyPuzzleForToday();
    if (puzzle && !dailyCompletion(puzzle.date)) loadDailyPuzzle(puzzle);
    else openDailyArchive();
  });
  dailyQuotePlay?.addEventListener("click", () => loadDailyPuzzle(dailyPuzzleForToday()));
  dailyQuoteDismiss?.addEventListener("click", () => {
    const puzzle = dailyPuzzleForToday();
    if (puzzle) { try { localStorage.setItem(`${DAILY_QUOTE_DISMISSED_PREFIX}${puzzle.date}`, "1"); } catch (_) {} }
    updateDailyQuotePrompt();
  });
  dailyInvitePlay?.addEventListener("click", () => loadDailyPuzzle(dailyPuzzleForToday()));
  dailyInviteClose?.addEventListener("click", closeDailyInvite);
  dailyInviteLater?.addEventListener("click", closeDailyInvite);
  dailyInviteModal?.addEventListener("click", event => { if (event.target === dailyInviteModal) closeDailyInvite(); });
  dailyShareButton?.addEventListener("click", shareDailyResult);
  dailyCopyButton?.addEventListener("click", copyDailyResult);
  dailyCompletePackBtn?.addEventListener("click", () => {
    closeCompleteModal();
    openPackModal();
  });
  dailyCompleteArchiveBtn?.addEventListener("click", () => {
    closeCompleteModal();
    openDailyArchive();
  });
  themeCloseBtn?.addEventListener("click", closeThemeModal);
  themeChoices.forEach(button => button.addEventListener("click", () => { applyTheme(button.dataset.themeChoice); closeThemeModal(); }));
  themeModal?.addEventListener("click", event => { if (event.target === themeModal) closeThemeModal(); });
  makerReturnBtn?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("boxxy-maker-return")));

  levelBtn.addEventListener("click", () => {
    if (sharedPuzzleMode) return;
    if (makerTesting) {
      window.dispatchEvent(new CustomEvent("boxxy-maker-return"));
      return;
    }
    if (levelPicker.hidden) openLevelPicker();
    else closeLevelPicker();
  });
  levelCloseBtn?.addEventListener("click", closeLevelPicker);
  document.addEventListener("pointerdown", event => {
    if (!levelPicker || levelPicker.hidden) return;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const insidePicker = path.includes(levelPicker) || levelPicker.contains(event.target);
    const onLevelButton = path.includes(levelBtn) || levelBtn.contains(event.target);
    if (insidePicker || onLevelButton) return;
    closeLevelPicker();
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true });
  levelResetBtn?.addEventListener("click", openResetConfirm);
  collectionCompleteStar?.addEventListener("click", showCollectionCongratulations);
  resetCancelBtn?.addEventListener("click", closeResetConfirm);
  resetConfirmBtn?.addEventListener("click", () => {
    closeResetConfirm();
    resetLevelProgress();
  });
  makerApplySolveBtn?.addEventListener("click", () => {
    const route = String(makerCompletedRoute || "").replace(/[^UDLR]/gi, "").toUpperCase();
    if (!route) return;
    makerSolution = route;
    if (levelData) levelData.solution = route;
    window.dispatchEvent(new CustomEvent("boxxy-maker-solution-found", {
      detail: { route, moves, pushes, automatic: false }
    }));
    makerApplySolveBtn.hidden = true;
    modal.hidden = true;
    window.dispatchEvent(new CustomEvent("boxxy-maker-return"));
  });

  legalBtn?.addEventListener("click", openLegalModal);
  legalCloseBtn?.addEventListener("click", closeLegalModal);
  legalModal?.addEventListener("click", event => {
    if (event.target === legalModal) closeLegalModal();
  });

  completeCloseBtn?.addEventListener("click", closeCompleteModal);
  claimPrizeBtn?.addEventListener("click", openPrizeModal);
  prizeCloseBtn?.addEventListener("click", closePrizeModal);
  prizeModal?.addEventListener("click", event => {
    if (event.target === prizeModal) closePrizeModal();
  });
  modal?.addEventListener("click", event => {
    if (event.target === modal && completeMode === "final") closeCompleteModal();
  });

  zenNextBtn?.addEventListener("click", () => {
    if (completeMode !== "normal" || levelIndex >= LEVELS.length - 1) return;
    setZenNextButtonVisible(false);
    captureBoxxyAnalytics("next_level_pressed", currentLevelAnalytics({
      next_level_number: Number(levelIndex) + 2,
      next_level_method: "zen_overlay"
    }));
    loadLevel(levelIndex + 1);
  });

  nextBtn.addEventListener("click", () => {
    setZenNextButtonVisible(false);
    switch (completeMode) {
      case "shared":
        modal.hidden = true;
        restartMakerTest();
        return;
      case "maker":
        modal.hidden = true;
        window.dispatchEvent(new CustomEvent("boxxy-maker-return"));
        return;
      case "final":
        modal.hidden = true;
        openLevelPicker();
        return;
      case "normal":
        captureBoxxyAnalytics("next_level_pressed", currentLevelAnalytics({
          next_level_number: Number(levelIndex) + 2
        }));
        loadLevel(levelIndex + 1);
        return;
      default:
        return;
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (legalModal && !legalModal.hidden) {
      closeLegalModal();
      return;
    }
    if (prizeModal && !prizeModal.hidden) {
      closePrizeModal();
      return;
    }
    if (modal && !modal.hidden && completeMode === "final") closeCompleteModal();
  });

  let swipe = null;
  pieceLayer.addEventListener("dragstart", event => event.preventDefault());

  board.addEventListener("pointerdown", event => {
    if (firstPersonMode) return;
    ensureAudio();
    const mouseLike = event.pointerType === "mouse" || event.pointerType === "";
    if (mouseLike && event.button === 0 && pointerIsOnCharacter(event)) registerEasterClick();
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId, triggered: false };
    board.setPointerCapture?.(event.pointerId);
  });
  board.addEventListener("pointermove", event => {
    if (firstPersonMode) return;
    if (!swipe || swipe.id !== event.pointerId || swipe.triggered) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    swipe.triggered = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0, true);
    else move(0, dy > 0 ? 1 : -1, true);
  });
  board.addEventListener("pointerup", event => {
    if (firstPersonMode) return;
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    const triggered = swipe.triggered;
    swipe = null;
    if (!triggered && Math.max(Math.abs(dx), Math.abs(dy)) >= 22) {
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0, false);
      else move(0, dy > 0 ? 1 : -1, false);
    }
    releaseBlockedPush();
  });
  board.addEventListener("pointercancel", () => { swipe = null; releaseBlockedPush(); });
  board.addEventListener("lostpointercapture", () => { swipe = null; releaseBlockedPush(); });

  if ("ResizeObserver" in window) {
    const boardResizeObserver = new ResizeObserver(scheduleBoardResize);
    boardResizeObserver.observe(boardWrap);
  }
  updateFullscreenButton();
  updateMusicButton();
  if (bgMusic) {
    bgMusic.volume = 0.10;
    if (!musicOn) bgMusic.pause();
    else startBackgroundMusic();
  }
  document.addEventListener("pointerdown", unlockSoundEffects, { capture: true });
  document.addEventListener("touchstart", unlockSoundEffects, { capture: true, passive: true });
  document.addEventListener("keydown", unlockSoundEffects, { capture: true });
  document.addEventListener("pointerdown", retryMusicAfterInteraction, { capture: true });
  document.addEventListener("keydown", retryMusicAfterInteraction, { capture: true });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && phoneZenModeActive()) { setPhoneZenMode(false); return; }
    if (event.key === "Escape" && dailyInviteModal && !dailyInviteModal.hidden) { closeDailyInvite(); return; }
    if (event.key === "Escape" && dailyArchiveModal && !dailyArchiveModal.hidden) { closeDailyArchive(); return; }
    if (event.key === "Escape" && packModal && !packModal.hidden) { closePackModal(); return; }
    if (event.key === "Escape" && themeModal && !themeModal.hidden) { closeThemeModal(); return; }
    if (event.key === "Escape" && resetConfirmModal && !resetConfirmModal.hidden) {
      closeResetConfirm();
      return;
    }
    if (event.key === "Escape" && !levelPicker.hidden) closeLevelPicker();
  });
  window.BoxxyGameAPI = {
    startMakerTest(layoutRows, attachedSolution = "", options = {}) { return loadMakerTest(layoutRows, attachedSolution, options); },
    exitMakerTest() { exitMakerTest(); },
    restartMakerTest() { restartMakerTest(); },
    isMakerTesting() { return makerTesting; }
  };

  renderReleaseMetadata();
  applyTheme(currentTheme, false);
  loadLevelProgress();
  updateDailyStreak();
  buildLevelButtons();
  buildPackSelectors();
  setSplashProgress(12, "PREPARING PUZZLE…");
  if (SHARED_PUZZLE_PAYLOAD?.ok) {
    const result = loadMakerTest(SHARED_PUZZLE_PAYLOAD.layout, "", {
      shared: true,
      name: SHARED_PUZZLE_PAYLOAD.name,
      goalColours: SHARED_PUZZLE_PAYLOAD.goalColours
    });
    if (!result?.ok) loadLevel(levelIndex);
  } else {
    captureBoxxyAnalytics("game_opened", {
      initial_pack_id: String(activePack?.id || ""),
      initial_pack_name: String(activePack?.displayName || activePack?.title || ""),
      initial_level_number: Number(levelIndex) + 1
    });
    loadLevel(levelIndex);
    if (SHARED_PUZZLE_PAYLOAD && !SHARED_PUZZLE_PAYLOAD.ok && thoughtText) {
      thoughtText.textContent = SHARED_PUZZLE_PAYLOAD.error || "That shared puzzle link could not be read.";
    }
  }
  completeStartupSplash().then(() => {
    window.setTimeout(() => showDailyInvite(false), 180);
  }).catch(error => {
    console.error("BOXXY startup could not be completed cleanly.", error);
    hideSplashScreen();
    window.setTimeout(() => showDailyInvite(false), 180);
  });
  scheduleDailyMidnightRefresh();

})();

(() => {
  "use strict";

  const modal = document.getElementById("levelMakerModal");
  const makerCard = modal?.querySelector(".maker-card");
  const makerFullscreenBtn = document.getElementById("makerFullscreenBtn");
  const gridEl = document.getElementById("makerGrid");
  const gridShell = gridEl?.closest(".maker-grid-shell");
  const widthInput = document.getElementById("makerWidth");
  const heightInput = document.getElementById("makerHeight");
  const boxesInput = document.getElementById("makerBoxes");
  const testedInput = document.getElementById("makerTested");
  const squareInput = document.getElementById("makerSquare");
  const mazeInput = document.getElementById("makerMaze");
  const symmetryInput = document.getElementById("makerSymmetry");
  const generateBtn = document.getElementById("makerGenerateBtn");
  const resizeBtn = document.getElementById("makerResizeBtn");
  const roomBtn = document.getElementById("makerRoomBtn");
  const clearBtn = document.getElementById("makerClearBtn");
  const closeBtn = document.getElementById("makerCloseBtn");
  const importBtn = document.getElementById("makerImportBtn");
  const copyBtn = document.getElementById("makerCopyBtn");
  const shareBtn = document.getElementById("makerShareBtn");
  const testBtn = document.getElementById("makerTestBtn");
  const exitTestBtn = document.getElementById("makerExitTestBtn");
  const textEl = document.getElementById("makerText");
  const statusEl = document.getElementById("makerStatus");
  const hotspot = document.getElementById("makerHotspot");
  const saveNameInput = document.getElementById("makerSaveName");
  const saveBtn = document.getElementById("makerSaveBtn");
  const savedSelect = document.getElementById("makerSavedSelect");
  const loadBtn = document.getElementById("makerLoadBtn");
  const deleteBtn = document.getElementById("makerDeleteBtn");
  const existingPackSelect = document.getElementById("makerPackSelect");
  const existingLevelSelect = document.getElementById("makerLevelSelect");
  const openExistingLevelBtn = document.getElementById("makerOpenLevelBtn");
  const toolButtons = [...document.querySelectorAll("[data-maker-tool]")];
  const goalPalette = document.getElementById("makerGoalPalette");
  const goalColourControls = goalPalette?.querySelector(".maker-goal-colour-controls");
  const goalColourButtons = [...document.querySelectorAll("[data-maker-goal-colour]")];
  const rainbowModeInput = document.getElementById("makerRainbowMode");
  const rainbowModeState = document.getElementById("makerRainbowState");
  const rainbowModeDescription = document.getElementById("makerRainbowDescription");
  const standardLegend = document.getElementById("makerStandardLegend");
  const rainbowLegend = document.getElementById("makerRainbowLegend");
  const colourCodes = document.getElementById("makerColourCodes");
  const solveBtn = document.getElementById("makerSolveBtn");
  const solverModal = document.getElementById("makerSolverModal");
  const solverCloseBtn = document.getElementById("makerSolverCloseBtn");
  const solverStartBtn = document.getElementById("makerSolverStartBtn");
  const solverCancelBtn = document.getElementById("makerSolverCancelBtn");
  const solverCopyBtn = document.getElementById("makerSolverCopyBtn");
  const solverApplyBtn = document.getElementById("makerSolverApplyBtn");
  const solverImportInput = document.getElementById("makerSolutionImport");
  const solverCheckBtn = document.getElementById("makerSolutionCheckBtn");
  const solverClearImportBtn = document.getElementById("makerSolutionClearBtn");
  const solverOutput = document.getElementById("makerSolutionOutput");
  const solverStatus = document.getElementById("makerSolverStatus");
  const solverProgressWrap = document.getElementById("makerSolverProgressWrap");
  const solverProgress = document.getElementById("makerSolverProgress");
  const solverProgressLabel = document.getElementById("makerSolverProgressLabel");
  const solverStats = document.getElementById("makerSolverStats");

  if (!modal || !gridEl) return;

  const MIN_SIZE = 3;
  const GENERATOR_MIN_SIZE = 5;
  const MAX_SIZE = 36;
  const MAX_GENERATOR_BOXES = 12;
  const VOID = "~";
  const GOAL_COLOURS = window.BoxxyGoalColours;
  const DEFAULT_GOAL_COLOUR = GOAL_COLOURS?.DEFAULT || "red";
  const GOAL_TOOLS = new Set(["goal", "boxgoal", "playergoal"]);
  const SAVE_KEY = "boxxy-level-maker-saves-v1";
  const RAINBOW_PREF_KEY = "boxxy-level-maker-rainbow-mode-v1";
  const VALID = new Set([VOID, " ", "#", "@", "$", ".", "*", "+"]);
  const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const CLASS_BY_VALUE = {
    [VOID]: "void",
    " ": "floor",
    "#": "wall",
    "@": "player",
    "$": "box",
    ".": "goal",
    "*": "boxgoal",
    "+": "playergoal"
  };
  const LABEL_BY_VALUE = {
    [VOID]: "void",
    " ": "floor",
    "#": "wall",
    "@": "player",
    "$": "box",
    ".": "goal",
    "*": "box on goal",
    "+": "player on goal"
  };

  let cols = 10;
  let rows = 10;
  let cells = [];
  let goalColours = [];
  let rainbowMode = false;
  let activeGoalColour = DEFAULT_GOAL_COLOUR;
  let activeTool = "wall";
  let painting = false;
  let lastPaintIndex = -1;
  let unlockClicks = 0;
  let unlockArmed = false;
  let unlockTimer = null;
  let activeSaveId = "";
  let pendingOverwriteId = "";
  let overwriteTimer = null;
  let pendingDeleteId = "";
  let deleteTimer = null;
  let fitFrame = 0;
  let currentSolution = "";
  let currentSolutionLevelText = "";
  let currentPuzzleRef = null;
  let verifiedImportSolution = "";
  let verifiedImportLevelText = "";
  let solverWorker = null;
  let solverRunning = false;
  let solverJobId = 0;
  let solverStartedAt = 0;
  let solverAudioContext = null;
  const SOLVER_TIMEOUT_MS = 12 * 60 * 60 * 1000;

  const clampSize = value => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(Number(value) || 10)));
  const clampGeneratorSize = value => Math.max(GENERATOR_MIN_SIZE, clampSize(value));
  const clampBoxes = value => Math.max(1, Math.min(MAX_GENERATOR_BOXES, Math.round(Number(value) || 1)));
  const indexOf = (x, y) => y * cols + x;
  const coordsOf = index => [index % cols, Math.floor(index / cols)];
  const localIndex = (x, y, width) => y * width + x;
  const localCoords = (index, width) => [index % width, Math.floor(index / width)];
  const waitForPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomItem = list => list[Math.floor(Math.random() * list.length)];
  const existingPacks = Array.isArray(window.BOXXY_LEVEL_PACKS) ? window.BOXXY_LEVEL_PACKS : [];

  function shuffled(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function fitGridToShell() {
    if (!gridShell || modal.hidden) return;
    const style = getComputedStyle(gridShell);
    const horizontalPadding = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
    const verticalPadding = parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0);
    const availableWidth = Math.max(1, gridShell.clientWidth - horizontalPadding - 4);
    const availableHeight = Math.max(1, gridShell.clientHeight - verticalPadding - 4);
    const maximum = window.matchMedia("(max-width: 620px)").matches ? 44 : 56;
    const fitted = Math.floor(Math.min(availableWidth / cols, availableHeight / rows, maximum));
    const cellSize = Math.max(9, fitted);
    gridEl.style.setProperty("--maker-cell", `${cellSize}px`);
  }

  function scheduleGridFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      fitGridToShell();
      fitFrame = requestAnimationFrame(fitGridToShell);
    });
  }

  function makerFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function makerUsesNativeFullscreen() {
    const active = makerFullscreenElement();
    return Boolean(active && makerCard && (active === makerCard || makerCard.contains(active)));
  }

  function makerUsesFallbackFullscreen() {
    return modal.classList.contains("maker-fullscreen-fallback");
  }

  function makerIsFullscreen() {
    return makerUsesNativeFullscreen() || makerUsesFallbackFullscreen();
  }

  function updateMakerFullscreenButton() {
    if (!makerFullscreenBtn) return;
    const active = makerIsFullscreen();
    const icon = makerFullscreenBtn.querySelector("span");
    const label = makerFullscreenBtn.querySelector("b");
    if (icon) icon.textContent = active ? "⤢" : "⛶";
    if (label) label.textContent = active ? "EXIT" : "FULL SCREEN";
    makerFullscreenBtn.setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen");
    makerFullscreenBtn.setAttribute("aria-pressed", String(active));
    makerFullscreenBtn.title = active ? "Exit full screen" : "Enter full screen";
  }

  function setMakerFallbackFullscreen(active) {
    modal.classList.toggle("maker-fullscreen-fallback", active);
    document.body.classList.toggle("maker-editor-fullscreen", active);
    updateMakerFullscreenButton();
    scheduleGridFit();
  }

  async function exitMakerFullscreen() {
    setMakerFallbackFullscreen(false);
    if (!makerUsesNativeFullscreen()) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exit) return;
    try {
      await exit.call(document);
    } catch (error) {
      console.warn("The Level Maker could not leave full screen.", error);
    }
  }

  async function toggleMakerFullscreen() {
    if (!makerCard) return;
    if (makerIsFullscreen()) {
      await exitMakerFullscreen();
      return;
    }

    const enter = makerCard.requestFullscreen || makerCard.webkitRequestFullscreen;
    if (enter) {
      try {
        await enter.call(makerCard);
        updateMakerFullscreenButton();
        scheduleGridFit();
        return;
      } catch (error) {
        console.warn("Native Level Maker full screen was unavailable; using the viewport fallback.", error);
      }
    }
    setMakerFallbackFullscreen(true);
  }

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", type === "error");
    statusEl.classList.toggle("success", type === "success");
  }

  function readRainbowPreference() {
    try { return localStorage.getItem(RAINBOW_PREF_KEY) === "1"; }
    catch (_) { return false; }
  }

  function goalColourDataPresent(value) {
    if (Array.isArray(value)) return value.some(item => typeof item === "string" && item.trim());
    return Boolean(value && typeof value === "object" && Object.keys(value).length);
  }

  function recordUsesRainbow(record) {
    if (record?.rainbowMode === true) return true;
    if (record?.rainbowMode === false) return false;
    return goalColourDataPresent(record?.goalColours);
  }

  function setRainbowMode(enabled, options = {}) {
    rainbowMode = Boolean(enabled);
    if (rainbowModeInput) {
      rainbowModeInput.checked = rainbowMode;
      rainbowModeInput.setAttribute("aria-checked", String(rainbowMode));
    }
    if (rainbowModeState) rainbowModeState.textContent = rainbowMode ? "ON" : "OFF";
    if (rainbowModeDescription) rainbowModeDescription.textContent = rainbowMode
      ? "ON — coloured targets and colour-letter export codes."
      : "OFF — standard Sokoban: . target, $ box, * box on target.";
    if (goalPalette) {
      goalPalette.hidden = false;
      goalPalette.removeAttribute("aria-hidden");
      goalPalette.classList.toggle("rainbow-on", rainbowMode);
      goalPalette.classList.toggle("rainbow-off", !rainbowMode);
      goalPalette.classList.toggle("active", rainbowMode && GOAL_TOOLS.has(activeTool));
    }
    if (goalColourControls) goalColourControls.setAttribute("aria-hidden", String(!rainbowMode));
    goalColourButtons.forEach(button => { button.disabled = !rainbowMode; });
    if (standardLegend) standardLegend.hidden = rainbowMode;
    if (rainbowLegend) rainbowLegend.hidden = !rainbowMode;
    if (colourCodes) {
      colourCodes.hidden = !rainbowMode;
      if (!rainbowMode) colourCodes.open = false;
    }
    if (options.persist !== false) {
      try { localStorage.setItem(RAINBOW_PREF_KEY, rainbowMode ? "1" : "0"); } catch (_) {}
    }
    if (cells.length) {
      renderGrid();
      updateTextFromGrid();
    }
    if (options.announce) setStatus(rainbowMode
      ? "Rainbow Mode on. Coloured targets and colour-letter export codes are enabled."
      : "Rainbow Mode off. The editor and text box now use standard Sokoban symbols.", "success");
  }

  function currentLevelText() {
    return exportRows().join("\n");
  }

  function solutionMatchesCurrentBoard() {
    return Boolean(currentSolution && currentSolutionLevelText === currentLevelText());
  }

  function importedSolutionMatchesCurrentBoard() {
    return Boolean(verifiedImportSolution && verifiedImportLevelText === currentLevelText());
  }

  function clearVerifiedImport(clearText = false) {
    verifiedImportSolution = "";
    verifiedImportLevelText = "";
    if (clearText && solverImportInput) solverImportInput.value = "";
  }

  function displayedVerifiedSolution() {
    if (importedSolutionMatchesCurrentBoard()) return verifiedImportSolution;
    if (solutionMatchesCurrentBoard()) return currentSolution;
    return "";
  }

  function updateSolverControls() {
    const displayed = displayedVerifiedSolution();
    const imported = importedSolutionMatchesCurrentBoard();
    if (solverOutput && !solverRunning) solverOutput.value = displayed;
    if (solverCopyBtn) solverCopyBtn.disabled = !displayed;
    if (solverApplyBtn) {
      solverApplyBtn.disabled = !imported || solverRunning;
      solverApplyBtn.textContent = imported ? "APPLY IMPORT" : "APPLY TO PUZZLE";
    }
    if (solverCheckBtn) solverCheckBtn.disabled = solverRunning || !String(solverImportInput?.value || "").trim();
    if (solverClearImportBtn) solverClearImportBtn.disabled = solverRunning || (!String(solverImportInput?.value || "").trim() && !verifiedImportSolution);
  }

  function setAttachedSolution(moves, levelText = currentLevelText(), puzzleRef = currentPuzzleRef) {
    currentSolution = String(moves || "").replace(/[^udlrUDLR]/g, "");
    currentSolutionLevelText = currentSolution ? String(levelText || "") : "";
    currentPuzzleRef = puzzleRef || null;
    clearVerifiedImport(true);
    if (currentSolution && currentPuzzleRef) {
      window.BoxxySolutionStore?.set?.(currentPuzzleRef.packId, currentPuzzleRef.levelIndex, currentSolution);
      const pack = existingPacks.find(item => item.id === currentPuzzleRef.packId);
      const level = pack?.levels?.[currentPuzzleRef.levelIndex];
      if (level) level.solution = currentSolution;
    }
    updateSolverControls();
  }

  function clearAttachedSolution(clearReference = true) {
    currentSolution = "";
    currentSolutionLevelText = "";
    clearVerifiedImport(true);
    if (clearReference) currentPuzzleRef = null;
    updateSolverControls();
  }

  function markBoardEdited() {
    if (solutionMatchesCurrentBoard() || importedSolutionMatchesCurrentBoard()) return;
    clearAttachedSolution(true);
  }

  function setSolverStatus(message, type = "") {
    if (!solverStatus) return;
    solverStatus.textContent = message;
    solverStatus.classList.toggle("error", type === "error");
    solverStatus.classList.toggle("success", type === "success");
  }

  function formatSolverTime(milliseconds) {
    const ms = Math.max(0, Number(milliseconds) || 0);
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  function finishSolverRun(keepWorker = false) {
    if (!keepWorker && solverWorker) solverWorker.terminate();
    solverWorker = null;
    solverRunning = false;
    if (solverProgress) solverProgress.value = 100;
    if (solverStartBtn) solverStartBtn.disabled = false;
    if (solverCancelBtn) solverCancelBtn.hidden = true;
    updateSolverControls();
  }

  function openSolverDialog() {
    if (!solverModal) return;
    solverModal.hidden = false;
    if (solverProgressWrap) solverProgressWrap.hidden = true;
    if (solverProgress) solverProgress.removeAttribute("value");
    if (solverProgressLabel) solverProgressLabel.textContent = "Ready.";
    if (solverStats) solverStats.textContent = "";
    if (solverOutput) solverOutput.value = displayedVerifiedSolution();
    setSolverStatus("Ready to solve the current editor puzzle or check an imported solution.");
    updateSolverControls();
    (solverImportInput || solverStartBtn)?.focus({ preventScroll: true });
  }

  function closeSolverDialog() {
    if (!solverModal) return;
    if (solverRunning) {
      setSolverStatus("Cancel the running search before closing the solver.", "error");
      return;
    }
    solverModal.hidden = true;
  }

  function updateSearchProgress(progress = {}) {
    if (solverProgress) solverProgress.removeAttribute("value");
    if (solverProgressLabel) solverProgressLabel.textContent = "Searching Rust/WASM push states…";
    if (solverStats) {
      const explored = Number(progress.explored || 0);
      const frontier = Number(progress.frontier || 0);
      const elapsedSeconds = Number(progress.elapsedSeconds || 0);
      solverStats.textContent = `${explored.toLocaleString()} explored · ${frontier.toLocaleString()} frontier · ${elapsedSeconds.toLocaleString()}s`;
    }
  }

  function verifySolverRoute(levelText, route) {
    if (!window.BoxxyRouteVerifier?.verify) {
      return { valid: false, solved: false, route: "", moves: 0, pushes: 0, error: "BOXXY's independent route verifier did not load." };
    }
    return window.BoxxyRouteVerifier.verify(levelText, route);
  }

  function normaliseImportedRoute(value) {
    return String(value || "")
      .replace(/↑/g, "u")
      .replace(/↓/g, "d")
      .replace(/←/g, "l")
      .replace(/→/g, "r");
  }

  function clearImportedSolution() {
    clearVerifiedImport(true);
    if (solverProgressWrap) solverProgressWrap.hidden = true;
    if (solverStats) solverStats.textContent = "";
    setSolverStatus("Import cleared. Paste a UDLR string and press Check Solution, or run the solver.");
    updateSolverControls();
    solverImportInput?.focus({ preventScroll: true });
  }

  function checkImportedSolution() {
    if (solverRunning) return;
    const validation = validate();
    if (!validation.ok) {
      clearVerifiedImport(false);
      updateSolverControls();
      setSolverStatus(validation.error, "error");
      return;
    }

    const raw = normaliseImportedRoute(solverImportInput?.value || "");
    if (!raw.trim()) {
      clearVerifiedImport(false);
      updateSolverControls();
      setSolverStatus("Paste a UDLR solution string before checking it.", "error");
      return;
    }

    const levelText = validation.rows.join("\n");
    const verification = verifySolverRoute(levelText, raw);
    if (!verification.valid) {
      clearVerifiedImport(false);
      if (solverOutput) solverOutput.value = displayedVerifiedSolution();
      if (solverProgressWrap) solverProgressWrap.hidden = false;
      if (solverProgress) solverProgress.value = 0;
      if (solverProgressLabel) solverProgressLabel.textContent = "Imported route rejected.";
      if (solverStats) solverStats.textContent = `${verification.moves.toLocaleString()} legal moves · ${verification.pushes.toLocaleString()} pushes`;
      setSolverStatus(`The imported string cannot be applied: ${verification.error}`, "error");
      updateSolverControls();
      return;
    }

    if (!verification.solved) {
      clearVerifiedImport(false);
      if (solverOutput) solverOutput.value = verification.route;
      if (solverProgressWrap) solverProgressWrap.hidden = false;
      if (solverProgress) solverProgress.value = 0;
      if (solverProgressLabel) solverProgressLabel.textContent = "Legal route, but puzzle not solved.";
      if (solverStats) solverStats.textContent = `${verification.moves.toLocaleString()} moves · ${verification.pushes.toLocaleString()} pushes`;
      setSolverStatus(`The string is legal, but it does not complete this puzzle. ${verification.error}`, "error");
      updateSolverControls();
      return;
    }

    verifiedImportSolution = verification.route;
    verifiedImportLevelText = levelText;
    if (solverOutput) solverOutput.value = verification.route;
    if (solverProgressWrap) solverProgressWrap.hidden = false;
    if (solverProgress) solverProgress.value = 100;
    if (solverProgressLabel) solverProgressLabel.textContent = "Imported solution independently verified.";
    if (solverStats) solverStats.textContent = `${verification.moves.toLocaleString()} moves · ${verification.pushes.toLocaleString()} pushes`;
    setSolverStatus("The imported solution is valid and completes this puzzle. Press Apply Import to attach it.", "success");
    updateSolverControls();
  }

  function prepareSolverDing() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!solverAudioContext) solverAudioContext = new AudioCtx();
      solverAudioContext.resume?.();
    } catch (_) {}
  }

  function playSolverDing() {
    try {
      prepareSolverDing();
      if (!solverAudioContext) return;
      const now = solverAudioContext.currentTime;
      const gain = solverAudioContext.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      gain.connect(solverAudioContext.destination);
      [[880, 0, 0.22], [1320, 0.16, 0.48]].forEach(([frequency, offset, stop]) => {
        const oscillator = solverAudioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + offset);
        oscillator.connect(gain);
        oscillator.start(now + offset);
        oscillator.stop(now + stop);
      });
    } catch (_) {}
  }

  function handleSolverResult(result, id, levelText) {
    if (id !== solverJobId || !solverRunning) return;
    result = result || {};

    if (!result.solved) {
      finishSolverRun();
      if (solverProgressLabel) solverProgressLabel.textContent = result.failReason === "Time limit exceeded" ? "Time allowance reached." : "Search stopped.";
      if (solverStats) solverStats.textContent = `${Number(result.nodesSearched || 0).toLocaleString()} explored · ${formatSolverTime(result.timeMs)}`;
      const reason = result.failReason || "No solution was returned.";
      setSolverStatus(`The Rust/WASM engine did not return a solution: ${reason}`, "error");
      return;
    }

    const verification = verifySolverRoute(levelText, result.solution);
    if (!verification.valid || !verification.solved) {
      finishSolverRun();
      if (solverProgressLabel) solverProgressLabel.textContent = "Returned route rejected.";
      if (solverStats) solverStats.textContent = `${Number(result.nodesSearched || 0).toLocaleString()} explored · ${formatSolverTime(result.timeMs)}`;
      setSolverStatus(`The external solver reported success, but BOXXY rejected its route: ${verification.error || "the puzzle was not solved."}`, "error");
      return;
    }

    finishSolverRun();
    playSolverDing();
    if (solverProgress) solverProgress.value = 100;
    if (solverProgressLabel) solverProgressLabel.textContent = "Solution found and independently verified.";
    if (solverStats) solverStats.textContent = `${verification.moves.toLocaleString()} moves · ${verification.pushes.toLocaleString()} pushes · ${Number(result.nodesSearched || 0).toLocaleString()} explored · ${formatSolverTime(result.timeMs)}`;

    if (verification.route.length === 0) {
      if (solverOutput) solverOutput.value = "";
      setSolverStatus("The starting position is already solved; no guided route is required.", "success");
      return;
    }

    setAttachedSolution(verification.route, levelText, currentPuzzleRef);
    const savedAutomatically = persistAttachedSolutionToLoadedSave();
    if (solverOutput) solverOutput.value = verification.route;
    setSolverStatus(savedAutomatically
      ? "The verified solution has been attached, saved and synchronised with linked pack drafts."
      : "The verified solution has been attached. Test the puzzle, click the character five times, then press S for the guided solve.", "success");
    setStatus(savedAutomatically
      ? `Solver saved a verified ${verification.moves}-move guided solve and updated linked pack drafts.`
      : `Solver attached a verified ${verification.moves}-move guided solve to the current puzzle. Save the level to keep it.`, "success");
  }

  async function startSolverSearch() {
    const validation = validate();
    if (!validation.ok) {
      setSolverStatus(validation.error, "error");
      return;
    }
    if (solverRunning) return;

    const levelText = validation.rows.join("\n");
    const alreadySolved = verifySolverRoute(levelText, "");
    if (alreadySolved.valid && alreadySolved.solved) {
      if (solverProgressWrap) solverProgressWrap.hidden = false;
      if (solverProgress) solverProgress.value = 100;
      if (solverProgressLabel) solverProgressLabel.textContent = "Already solved.";
      if (solverStats) solverStats.textContent = "0 moves · 0 pushes";
      if (solverOutput) solverOutput.value = "";
      setSolverStatus("The starting position already has every box on a goal; no route is required.", "success");
      return;
    }

    if (!window.Worker || location.protocol === "file:") {
      setSolverStatus("The Rust/WebAssembly solver must be run from GitHub Pages or another web server; browsers block its module worker when index.html is opened directly from disk.", "error");
      return;
    }

    const id = ++solverJobId;
    solverRunning = true;
    solverStartedAt = performance.now();
    prepareSolverDing();

    if (solverOutput) solverOutput.value = solutionMatchesCurrentBoard() ? currentSolution : "";
    if (solverCopyBtn) solverCopyBtn.disabled = true;
    if (solverApplyBtn) solverApplyBtn.disabled = true;
    if (solverProgressWrap) solverProgressWrap.hidden = false;
    if (solverProgress) solverProgress.removeAttribute("value");
    if (solverProgressLabel) solverProgressLabel.textContent = "Loading Rust/WebAssembly engine…";
    if (solverStats) solverStats.textContent = "";
    if (solverStartBtn) solverStartBtn.disabled = true;
    if (solverCheckBtn) solverCheckBtn.disabled = true;
    if (solverClearImportBtn) solverClearImportBtn.disabled = true;
    if (solverCancelBtn) solverCancelBtn.hidden = false;
    setSolverStatus("Loading the external Rust/WebAssembly solver. An internet connection is required for the solver only.");

    try {
      solverWorker = new Worker("solver-worker.js?v=143", { type: "module", name: "boxxy-rust-solver-v143" });
      solverWorker.onmessage = event => {
        const message = event.data || {};
        if (message.id !== id || id !== solverJobId || !solverRunning) return;
        if (message.type === "loading") {
          if (solverProgressLabel) solverProgressLabel.textContent = "Downloading Rust/WASM engine…";
        } else if (message.type === "ready") {
          const sourceName = message.source ? ` via ${message.source}` : "";
          if (solverProgressLabel) solverProgressLabel.textContent = `Rust/WASM engine loaded${sourceName}. Searching…`;
          setSolverStatus(`The Rust/WebAssembly engine is searching in a background worker${sourceName}.`);
        } else if (message.type === "progress") {
          updateSearchProgress(message.progress || {});
        } else if (message.type === "result") {
          handleSolverResult(message.result || {}, id, levelText);
        } else if (message.type === "error") {
          finishSolverRun();
          if (solverProgressLabel) solverProgressLabel.textContent = "Engine could not load.";
          setSolverStatus(`The Rust/WebAssembly engine could not load. ${message.error || "Unknown error."}`, "error");
        }
      };
      solverWorker.onerror = event => {
        event.preventDefault?.();
        if (id !== solverJobId || !solverRunning) return;
        const detail = event?.message ? ` ${event.message}` : "";
        finishSolverRun();
        if (solverProgressLabel) solverProgressLabel.textContent = "Worker stopped.";
        setSolverStatus(`The Rust/WebAssembly worker stopped unexpectedly.${detail}`, "error");
      };
      solverWorker.onmessageerror = () => {
        if (id !== solverJobId || !solverRunning) return;
        finishSolverRun();
        if (solverProgressLabel) solverProgressLabel.textContent = "Worker message error.";
        setSolverStatus("The browser could not read a message from the Rust/WebAssembly worker.", "error");
      };
      solverWorker.postMessage({ type: "solve", id, level: levelText, timeoutMs: SOLVER_TIMEOUT_MS });
    } catch (error) {
      finishSolverRun();
      setSolverStatus(`The Rust/WebAssembly worker could not be started: ${error?.message || error}`, "error");
    }
  }

  function cancelSolverSearch() {
    if (!solverRunning) return;
    const elapsed = performance.now() - solverStartedAt;
    solverJobId += 1;
    finishSolverRun();
    if (solverProgressLabel) solverProgressLabel.textContent = "Search cancelled.";
    setSolverStatus(`Search cancelled after ${formatSolverTime(elapsed)}.`);
  }

  async function copySolverString() {
    const route = displayedVerifiedSolution();
    if (!route) return;
    try {
      await navigator.clipboard.writeText(route);
      setSolverStatus("Solution string copied to the clipboard.", "success");
    } catch (_) {
      solverOutput?.focus();
      solverOutput?.select();
      const copied = document.execCommand?.("copy");
      setSolverStatus(copied ? "Solution string copied to the clipboard." : "The solution is selected for manual copying.", copied ? "success" : "");
    }
  }

  function applyCurrentSolution() {
    if (!importedSolutionMatchesCurrentBoard()) {
      setSolverStatus("Check an imported solution successfully before applying it.", "error");
      return;
    }
    const route = verifiedImportSolution;
    const levelText = verifiedImportLevelText;
    setAttachedSolution(route, levelText, currentPuzzleRef);
    const savedAutomatically = persistAttachedSolutionToLoadedSave();
    setSolverStatus(savedAutomatically
      ? "Imported solution attached and saved to the loaded level. Its pack entries have been updated."
      : "Imported solution attached. Test the puzzle, click the character five times, then press S.", "success");
    setStatus(savedAutomatically
      ? `A verified ${route.length}-move imported solve was saved and synchronised with linked pack drafts.`
      : `A verified ${route.length}-move imported solve is attached to the current puzzle. Save the level to keep it.`, "success");
  }

  function blankGrid(width, height, value = VOID) {
    return Array.from({ length: width * height }, () => value);
  }

  function cellHasGoal(value) {
    return value === "." || value === "*" || value === "+";
  }

  function blankGoalColours(width = cols, height = rows) {
    return Array.from({ length: width * height }, () => null);
  }

  function normaliseGoalColourArray(values, board = cells) {
    const source = Array.isArray(values) ? values : [];
    return board.map((value, index) => cellHasGoal(value)
      ? (GOAL_COLOURS?.normalise?.(source[index]) || DEFAULT_GOAL_COLOUR)
      : null);
  }

  function applyGoalStyle(element, colour) {
    GOAL_COLOURS?.style?.(element, colour || DEFAULT_GOAL_COLOUR);
  }

  function styleMakerCell(button, index) {
    if (!button) return;
    const value = cells[index];
    button.className = `maker-cell type-${CLASS_BY_VALUE[value] || "void"}`;
    button.dataset.index = String(index);
    button.dataset.value = value;
    if (cellHasGoal(value)) applyGoalStyle(button, rainbowMode ? goalColours[index] : DEFAULT_GOAL_COLOUR);
    else {
      delete button.dataset.goalColour;
      button.style.removeProperty("--goal-colour");
      button.style.removeProperty("--goal-sprite");
      button.style.removeProperty("--box-sprite");
    }
    const [x, y] = coordsOf(index);
    const colourLabel = cellHasGoal(value)
      ? `, ${GOAL_COLOURS?.PALETTE?.[GOAL_COLOURS.normalise(goalColours[index])]?.label || "Red"} target`
      : "";
    button.setAttribute("aria-label", `Column ${x + 1}, row ${y + 1}: ${LABEL_BY_VALUE[value] || "void"}${colourLabel}`);
  }

  function setActiveGoalColour(value, announce = false) {
    activeGoalColour = GOAL_COLOURS?.normalise?.(value) || DEFAULT_GOAL_COLOUR;
    goalColourButtons.forEach(button => {
      const selected = button.dataset.makerGoalColour === activeGoalColour;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    goalPalette?.style.setProperty("--selected-goal-colour", GOAL_COLOURS?.PALETTE?.[activeGoalColour]?.hex || "#db3b27");
    if (announce) setStatus(`${GOAL_COLOURS?.PALETTE?.[activeGoalColour]?.label || "Red"} selected for new and repainted targets.`);
  }

  function exportedRowWindow() {
    const raw = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const value = cells[indexOf(x, y)];
        line += value === VOID ? " " : value;
      }
      raw.push(line.replace(/\s+$/g, ""));
    }
    let start = 0;
    let end = raw.length;
    while (start < end && raw[start] === "") start++;
    while (end > start && raw[end - 1] === "") end--;
    return { rows: raw.slice(start, end).length ? raw.slice(start, end) : [""], start, end };
  }

  function exportGoalColourMap() {
    if (!rainbowMode) return {};
    const windowed = exportedRowWindow();
    const map = {};
    for (let sourceY = windowed.start; sourceY < windowed.end; sourceY++) {
      for (let x = 0; x < cols; x++) {
        const index = indexOf(x, sourceY);
        if (!cellHasGoal(cells[index])) continue;
        const colour = GOAL_COLOURS?.normalise?.(goalColours[index]) || DEFAULT_GOAL_COLOUR;
        if (colour !== DEFAULT_GOAL_COLOUR) map[`${x},${sourceY - windowed.start}`] = colour;
      }
    }
    return map;
  }

  function clearActiveSave() {
    activeSaveId = "";
    resetSaveConfirmation();
    if (savedSelect) savedSelect.value = "";
    if (saveNameInput) saveNameInput.value = "";
  }

  function countBoxes(values = cells) {
    return values.filter(value => value === "$" || value === "*").length;
  }

  function makeRoom(width = cols, height = rows, announce = true) {
    cols = clampSize(width);
    rows = clampSize(height);
    cells = blankGrid(cols, rows, VOID);
    goalColours = blankGoalColours(cols, rows);
    clearAttachedSolution(true);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
        cells[indexOf(x, y)] = edge ? "#" : " ";
      }
    }
    if (cols >= 6 && rows >= 5) {
      cells[indexOf(2, 2)] = "@";
      cells[indexOf(Math.min(cols - 3, 4), Math.min(rows - 3, 3))] = "$";
      const starterGoal = indexOf(Math.min(cols - 2, 6), Math.min(rows - 3, 3));
      cells[starterGoal] = ".";
      goalColours[starterGoal] = DEFAULT_GOAL_COLOUR;
    }
    syncSizeInputs();
    if (boxesInput) boxesInput.value = String(Math.max(1, countBoxes()));
    renderGrid();
    updateTextFromGrid();
    if (announce) {
      clearActiveSave();
      setStatus("Empty room ready.");
    }
  }

  function syncSizeInputs() {
    widthInput.value = String(cols);
    heightInput.value = String(rows);
  }

  function removeExistingPlayer(exceptIndex = -1) {
    cells = cells.map((value, index) => {
      if (index === exceptIndex) return value;
      if (value === "@") return " ";
      if (value === "+") return ".";
      return value;
    });
  }

  function valueForTool(tool, current, index) {
    switch (tool) {
      case "void": return VOID;
      case "floor": return " ";
      case "wall": return "#";
      case "goal":
        if (current === "$") return "*";
        if (current === "@") return "+";
        return ".";
      case "box":
        if (current === "." || current === "+") return "*";
        return "$";
      case "boxgoal": return "*";
      case "player":
        removeExistingPlayer(index);
        return current === "." || current === "*" ? "+" : "@";
      case "playergoal":
        removeExistingPlayer(index);
        return "+";
      default: return current;
    }
  }

  function updateCellElement(index) {
    styleMakerCell(gridEl.children[index], index);
  }

  function paintIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= cells.length || index === lastPaintIndex) return;
    const before = cells.slice();
    const beforeColours = goalColours.slice();
    const current = cells[index];
    const next = valueForTool(activeTool, current, index);
    cells[index] = next;
    if (cellHasGoal(next)) {
      if (!rainbowMode) goalColours[index] = DEFAULT_GOAL_COLOUR;
      else if (GOAL_TOOLS.has(activeTool)) goalColours[index] = activeGoalColour;
      else if (!cellHasGoal(current)) goalColours[index] = DEFAULT_GOAL_COLOUR;
      else goalColours[index] = GOAL_COLOURS?.normalise?.(goalColours[index]) || DEFAULT_GOAL_COLOUR;
    } else {
      goalColours[index] = null;
    }
    if (activeTool === "player" || activeTool === "playergoal") {
      before.forEach((value, i) => {
        if (i !== index && cells[i] !== value) updateCellElement(i);
      });
    }
    updateCellElement(index);
    lastPaintIndex = index;
    updateTextFromGrid(false);
    if (before.some((value, i) => value !== cells[i])) clearAttachedSolution(true);
    else if (beforeColours.some((value, i) => value !== goalColours[i])) setStatus(`${GOAL_COLOURS?.PALETTE?.[activeGoalColour]?.label || "Target"} colour applied.`);
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--maker-cols", String(cols));
    const fragment = document.createDocumentFragment();
    cells.forEach((value, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "gridcell");
      styleMakerCell(button, index);
      fragment.appendChild(button);
    });
    gridEl.appendChild(fragment);
    scheduleGridFit();
  }

  function resizeGrid(nextCols, nextRows) {
    nextCols = clampSize(nextCols);
    nextRows = clampSize(nextRows);
    const next = blankGrid(nextCols, nextRows, VOID);
    const nextGoalColours = blankGoalColours(nextCols, nextRows);
    const copyW = Math.min(cols, nextCols);
    const copyH = Math.min(rows, nextRows);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        next[y * nextCols + x] = cells[indexOf(x, y)];
        nextGoalColours[y * nextCols + x] = goalColours[indexOf(x, y)] || null;
      }
    }
    cols = nextCols;
    rows = nextRows;
    cells = next;
    goalColours = normaliseGoalColourArray(nextGoalColours, cells);
    clearAttachedSolution(true);
    syncSizeInputs();
    renderGrid();
    updateTextFromGrid();
    setStatus(`Grid resized to ${cols} × ${rows}.`);
  }

  function exportRows() {
    return exportedRowWindow().rows;
  }

  function exportTextRows() {
    const windowed = exportedRowWindow();
    const output = [];
    for (let sourceY = windowed.start; sourceY < windowed.end; sourceY++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const index = indexOf(x, sourceY);
        const value = cells[index];
        const encoded = rainbowMode && cellHasGoal(value)
          ? (GOAL_COLOURS?.encodeTextCell?.(value, goalColours[index]) || value)
          : value;
        line += encoded === VOID ? " " : encoded;
      }
      output.push(line.replace(/\s+$/g, ""));
    }
    return output.length ? output : [""];
  }

  function updateTextFromGrid(force = true) {
    if (!force && document.activeElement === textEl) return;
    textEl.value = exportTextRows().join("\n");
  }

  function commonIndent(lines) {
    const nonblank = lines.filter(line => line.trim().length);
    if (!nonblank.length) return 0;
    return Math.min(...nonblank.map(line => (line.match(/^ */) || [""])[0].length));
  }

  function normalizePastedText(raw) {
    const trimmedFence = String(raw || "")
      .replace(/^\s*```(?:text|txt|xsb|sokoban|json)?\s*\n?/i, "")
      .replace(/\n?\s*```\s*$/i, "");

    const candidate = trimmedFence.trim();
    if (candidate.startsWith("[") || candidate.startsWith("{")) {
      try {
        const parsed = JSON.parse(candidate);
        const layout = Array.isArray(parsed) ? parsed : parsed?.layout;
        if (Array.isArray(layout) && layout.every(row => typeof row === "string")) return layout.slice();
      } catch (_) {}
    }

    let lines = trimmedFence.replace(/\r/g, "").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    const indent = commonIndent(lines);
    if (indent) lines = lines.map(line => line.slice(indent));
    return lines;
  }

  function classifySpaces(lines) {
    const height = lines.length;
    const width = Math.max(1, ...lines.map(line => line.length));
    const chars = lines.map(line => line.padEnd(width, " ").split(""));
    const outside = new Set();
    const queue = [];
    const key = (x, y) => `${x},${y}`;
    const add = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      if (chars[y][x] !== " ") return;
      const id = key(x, y);
      if (outside.has(id)) return;
      outside.add(id);
      queue.push([x, y]);
    };
    for (let x = 0; x < width; x++) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      add(0, y);
      add(width - 1, y);
    }
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      add(x - 1, y);
      add(x + 1, y);
      add(x, y - 1);
      add(x, y + 1);
    }
    return { width, height, chars, outside };
  }

  function importRows(lines, options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, "rainbowMode")) {
      setRainbowMode(Boolean(options.rainbowMode), { persist: options.persistRainbow !== false });
    }
    if (!Array.isArray(lines) || !lines.length) throw new Error("No level text was found.");
    if (lines.length > MAX_SIZE) throw new Error(`The level is ${lines.length} rows high. The editor supports up to ${MAX_SIZE}.`);
    const maxWidth = Math.max(...lines.map(line => line.length));
    if (maxWidth > MAX_SIZE) throw new Error(`The level is ${maxWidth} columns wide. The editor supports up to ${MAX_SIZE}.`);

    const cleaned = lines.map(line => String(line).replace(/\t/g, "    ").replace(/_/g, " "));
    const containsColourCodes = cleaned.some(line => [...line].some(ch => GOAL_COLOURS?.isTextCode?.(ch)));
    if (!rainbowMode && containsColourCodes) {
      throw new Error("This level uses Rainbow Mode colour letters. Turn Rainbow Mode on before importing it.");
    }
    const invalid = [...new Set(cleaned.join("").split("").filter(ch =>
      !" #@$.+*".includes(ch) && !(rainbowMode && GOAL_COLOURS?.isTextCode?.(ch))
    ))];
    if (invalid.length) throw new Error(`Unsupported character${invalid.length === 1 ? "" : "s"}: ${invalid.join(" ")}`);

    const decodedRows = cleaned.map(line => [...line].map(ch => rainbowMode
      ? (GOAL_COLOURS?.decodeTextChar?.(ch)?.cell || ch)
      : ch).join(""));
    const classified = classifySpaces(decodedRows);
    cols = clampSize(classified.width);
    rows = clampSize(classified.height);
    cells = blankGrid(cols, rows, VOID);
    goalColours = blankGoalColours(cols, rows);
    const importedColourMap = rainbowMode
      ? (GOAL_COLOURS?.normaliseMap?.(options.goalColours, decodedRows) || {})
      : {};
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const sourceChar = cleaned[y]?.[x] ?? " ";
        const decoded = rainbowMode ? GOAL_COLOURS?.decodeTextChar?.(sourceChar) : null;
        const ch = decoded?.cell || classified.chars[y]?.[x] || " ";
        const value = ch === " " && classified.outside.has(`${x},${y}`) ? VOID : ch;
        const index = indexOf(x, y);
        cells[index] = VALID.has(value) ? value : VOID;
        if (cellHasGoal(cells[index])) {
          goalColours[index] = rainbowMode
            ? (decoded?.colour
              || GOAL_COLOURS?.normalise?.(importedColourMap[`${x},${y}`])
              || DEFAULT_GOAL_COLOUR)
            : DEFAULT_GOAL_COLOUR;
        }
      }
    }
    syncSizeInputs();
    if (boxesInput) boxesInput.value = String(Math.max(1, countBoxes()));
    renderGrid();
    updateTextFromGrid();
    if (!options.keepSave) clearActiveSave();
    if (!options.quiet) setStatus(`Imported ${cols} × ${rows} level.`, "success");
  }

  function validate() {
    const playerCount = cells.filter(value => value === "@" || value === "+").length;
    const boxCount = cells.filter(value => value === "$" || value === "*").length;
    const goalCount = cells.filter(value => value === "." || value === "*" || value === "+").length;
    if (playerCount !== 1) return { ok: false, error: `The level needs exactly one player. It currently has ${playerCount}.` };
    if (boxCount < 1) return { ok: false, error: "The level needs at least one box and one goal." };
    if (boxCount !== goalCount) return { ok: false, error: `Boxes and goals must match. There are ${boxCount} boxes and ${goalCount} goals.` };
    const exported = exportRows();
    if (!exported.some(line => line.includes("#"))) return { ok: false, error: "Add some walls before testing the level." };
    return { ok: true, rows: exported, boxes: boxCount };
  }

  function terrainWalkable(terrain, index) {
    return terrain[index] === " ";
  }

  function localNeighbour(index, dx, dy, width, height) {
    const [x, y] = localCoords(index, width);
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return -1;
    return localIndex(nx, ny, width);
  }

  function reachableSet(terrain, width, height, boxSet, start) {
    const seen = new Set();
    if (start < 0 || !terrainWalkable(terrain, start) || boxSet.has(start)) return seen;
    const queue = [start];
    seen.add(start);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      for (const [dx, dy] of DIRECTIONS) {
        const next = localNeighbour(current, dx, dy, width, height);
        if (next < 0 || seen.has(next) || boxSet.has(next) || !terrainWalkable(terrain, next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen;
  }

  function floorIsConnected(terrain, width, height) {
    const first = terrain.findIndex(value => value === " ");
    if (first < 0) return false;
    const reached = reachableSet(terrain, width, height, new Set(), first);
    const floorCount = terrain.filter(value => value === " ").length;
    return reached.size === floorCount;
  }

  function terrainFloorCount(terrain) {
    return terrain.reduce((total, value) => total + (value === " " ? 1 : 0), 0);
  }

  function openNeighbourCount(terrain, width, height, index) {
    return DIRECTIONS.reduce((count, [dx, dy]) => {
      const next = localNeighbour(index, dx, dy, width, height);
      return count + (next >= 0 && terrain[next] === " " ? 1 : 0);
    }, 0);
  }

  function blockerNeighbourCount(terrain, width, height, index) {
    return 4 - openNeighbourCount(terrain, width, height, index);
  }

  function countThreeSidedPockets(terrain, width, height) {
    let count = 0;
    terrain.forEach((value, index) => {
      if (value === " " && blockerNeighbourCount(terrain, width, height, index) >= 3) count++;
    });
    return count;
  }

  function countPushLaneCells(terrain, width, height) {
    let count = 0;
    terrain.forEach((value, index) => {
      if (value !== " ") return;
      const [x, y] = localCoords(index, width);
      const horizontal = x > 0 && x < width - 1
        && terrain[localIndex(x - 1, y, width)] === " "
        && terrain[localIndex(x + 1, y, width)] === " ";
      const vertical = y > 0 && y < height - 1
        && terrain[localIndex(x, y - 1, width)] === " "
        && terrain[localIndex(x, y + 1, width)] === " ";
      if (horizontal || vertical) count++;
    });
    return count;
  }

  function countLargeOpenAreas(terrain, width, height) {
    let count = 0;
    const sizes = [[4, 3], [3, 4]];
    for (const [blockWidth, blockHeight] of sizes) {
      for (let y = 1; y <= height - 1 - blockHeight; y++) {
        for (let x = 1; x <= width - 1 - blockWidth; x++) {
          let allOpen = true;
          for (let oy = 0; oy < blockHeight && allOpen; oy++) {
            for (let ox = 0; ox < blockWidth; ox++) {
              if (terrain[localIndex(x + ox, y + oy, width)] !== " ") {
                allOpen = false;
                break;
              }
            }
          }
          if (allOpen) count++;
        }
      }
    }
    return count;
  }

  function internalWallCount(terrain, width, height) {
    let count = 0;
    terrain.forEach((value, index) => {
      if (value !== "#") return;
      const [x, y] = localCoords(index, width);
      if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) return;
      const floorNeighbours = DIRECTIONS.reduce((total, [dx, dy]) => {
        const next = localNeighbour(index, dx, dy, width, height);
        return total + (next >= 0 && terrain[next] === " " ? 1 : 0);
      }, 0);
      if (floorNeighbours >= 2) count++;
    });
    return count;
  }

  function terrainScore(terrain, width, height) {
    let corridorCells = 0;
    let junctionCells = 0;
    terrain.forEach((value, index) => {
      if (value !== " ") return;
      const open = openNeighbourCount(terrain, width, height, index);
      if (open === 2) corridorCells++;
      else if (open >= 3) junctionCells++;
    });
    return internalWallCount(terrain, width, height) * 3
      + corridorCells * 0.35
      + junctionCells * 0.15
      - countLargeOpenAreas(terrain, width, height) * 2.5
      - countThreeSidedPockets(terrain, width, height) * 30;
  }

  function terrainRemainsUseful(terrain, width, height, boxCount) {
    const floorCount = terrainFloorCount(terrain);
    const minimumFloor = Math.max(boxCount * 4 + 5, Math.floor((width - 2) * (height - 2) * 0.38));
    if (floorCount < minimumFloor) return false;
    if (!floorIsConnected(terrain, width, height)) return false;
    if (countThreeSidedPockets(terrain, width, height) > 0) return false;
    if (countPushLaneCells(terrain, width, height) < Math.max(6, boxCount * 3)) return false;
    return true;
  }

  function tryWallFeature(terrain, width, height, indices, boxCount) {
    const feature = [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < terrain.length);
    if (!feature.length || feature.some(index => terrain[index] !== " ")) return false;
    feature.forEach(index => { terrain[index] = "#"; });
    if (!terrainRemainsUseful(terrain, width, height, boxCount)) {
      feature.forEach(index => { terrain[index] = " "; });
      return false;
    }
    return true;
  }

  function makeBaseTerrain(width, height, square) {
    const terrain = blankGrid(width, height, VOID);
    if (square || width < 7 || height < 7) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
          terrain[localIndex(x, y, width)] = edge ? "#" : " ";
        }
      }
      return terrain;
    }

    const floorMask = Array.from({ length: width * height }, () => false);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) floorMask[localIndex(x, y, width)] = true;
    }

    if (!square && width >= 7 && height >= 7) {
      const carveCorner = (cornerX, cornerY) => {
        const depthX = randomInt(1, Math.max(1, Math.min(3, Math.floor((width - 4) / 3))));
        const depthY = randomInt(1, Math.max(1, Math.min(3, Math.floor((height - 4) / 3))));
        for (let oy = 0; oy < depthY; oy++) {
          const rowWidth = Math.max(1, Math.ceil(depthX * (depthY - oy) / depthY));
          for (let ox = 0; ox < rowWidth; ox++) {
            const x = cornerX === "left" ? 1 + ox : width - 2 - ox;
            const y = cornerY === "top" ? 1 + oy : height - 2 - oy;
            floorMask[localIndex(x, y, width)] = false;
          }
        }
      };

      const corners = shuffled([
        ["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]
      ]);
      corners.slice(0, randomInt(1, 4)).forEach(([cx, cy]) => carveCorner(cx, cy));

      const notchCount = randomInt(1, Math.max(1, Math.min(4, Math.floor((width + height) / 7))));
      for (let notch = 0; notch < notchCount; notch++) {
        const horizontalSide = Math.random() < 0.5;
        if (horizontalSide && width >= 8) {
          const notchWidth = randomInt(1, Math.min(3, width - 6));
          const notchDepth = randomInt(1, Math.min(2, height - 5));
          const start = randomInt(2, width - 2 - notchWidth);
          const top = Math.random() < 0.5;
          for (let oy = 0; oy < notchDepth; oy++) {
            for (let ox = 0; ox < notchWidth; ox++) {
              const y = top ? 1 + oy : height - 2 - oy;
              floorMask[localIndex(start + ox, y, width)] = false;
            }
          }
        } else if (height >= 8) {
          const notchHeight = randomInt(1, Math.min(3, height - 6));
          const notchDepth = randomInt(1, Math.min(2, width - 5));
          const start = randomInt(2, height - 2 - notchHeight);
          const left = Math.random() < 0.5;
          for (let ox = 0; ox < notchDepth; ox++) {
            for (let oy = 0; oy < notchHeight; oy++) {
              const x = left ? 1 + ox : width - 2 - ox;
              floorMask[localIndex(x, start + oy, width)] = false;
            }
          }
        }
      }
    }

    for (let index = 0; index < floorMask.length; index++) {
      if (floorMask[index]) terrain[index] = " ";
    }
    for (let index = 0; index < floorMask.length; index++) {
      if (floorMask[index]) continue;
      const touchesFloor = DIRECTIONS.some(([dx, dy]) => {
        const neighbour = localNeighbour(index, dx, dy, width, height);
        return neighbour >= 0 && floorMask[neighbour];
      });
      if (touchesFloor) terrain[index] = "#";
    }
    return terrain;
  }

  function dividerFeature(terrain, width, height, vertical) {
    const positions = [];
    if (vertical) {
      if (width < 7) return positions;
      const x = randomInt(2, width - 3);
      for (let y = 1; y < height - 1; y++) {
        const index = localIndex(x, y, width);
        if (terrain[index] === " ") positions.push(index);
      }
    } else {
      if (height < 7) return positions;
      const y = randomInt(2, height - 3);
      for (let x = 1; x < width - 1; x++) {
        const index = localIndex(x, y, width);
        if (terrain[index] === " ") positions.push(index);
      }
    }
    if (positions.length < 5) return [];

    const gapCount = positions.length >= 9 && Math.random() < 0.55 ? 2 : 1;
    const gapSet = new Set();
    const available = positions.slice(1, -1);
    for (const centre of shuffled(available).slice(0, gapCount)) {
      gapSet.add(centre);
      if (Math.random() < 0.45) {
        const position = positions.indexOf(centre);
        const neighbour = positions[position + (Math.random() < 0.5 ? -1 : 1)];
        if (neighbour !== undefined) gapSet.add(neighbour);
      }
    }
    return positions.filter(index => !gapSet.has(index));
  }

  const WALL_MOTIFS = [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1]]
  ];

  function transformMotif(points) {
    let transformed = points.map(([x, y]) => [x, y]);
    if (Math.random() < 0.5) transformed = transformed.map(([x, y]) => [-x, y]);
    const rotations = randomInt(0, 3);
    for (let turn = 0; turn < rotations; turn++) transformed = transformed.map(([x, y]) => [-y, x]);
    const minX = Math.min(...transformed.map(([x]) => x));
    const minY = Math.min(...transformed.map(([, y]) => y));
    return transformed.map(([x, y]) => [x - minX, y - minY]);
  }

  function placeRandomMotif(terrain, width, height, boxCount) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const motif = transformMotif(randomItem(WALL_MOTIFS));
      const motifWidth = Math.max(...motif.map(([x]) => x)) + 1;
      const motifHeight = Math.max(...motif.map(([, y]) => y)) + 1;
      if (motifWidth > width - 4 || motifHeight > height - 4) continue;
      const originX = randomInt(2, width - 2 - motifWidth);
      const originY = randomInt(2, height - 2 - motifHeight);
      const feature = motif.map(([x, y]) => localIndex(originX + x, originY + y, width));
      if (tryWallFeature(terrain, width, height, feature, boxCount)) return true;
    }
    return false;
  }

  function breakLargeOpenAreas(terrain, width, height, boxCount) {
    const sizes = shuffled([[4, 3], [3, 4]]);
    for (let pass = 0; pass < 18; pass++) {
      let changed = false;
      for (const [blockWidth, blockHeight] of sizes) {
        const origins = [];
        for (let y = 1; y <= height - 1 - blockHeight; y++) {
          for (let x = 1; x <= width - 1 - blockWidth; x++) origins.push([x, y]);
        }
        for (const [x, y] of shuffled(origins)) {
          let allOpen = true;
          for (let oy = 0; oy < blockHeight && allOpen; oy++) {
            for (let ox = 0; ox < blockWidth; ox++) {
              if (terrain[localIndex(x + ox, y + oy, width)] !== " ") {
                allOpen = false;
                break;
              }
            }
          }
          if (!allOpen) continue;
          const centreX = x + Math.floor(blockWidth / 2);
          const centreY = y + Math.floor(blockHeight / 2);
          const alternatives = shuffled([
            [centreX, centreY],
            [centreX - 1, centreY],
            [centreX, centreY - 1],
            [centreX + 1, centreY]
          ]);
          for (const [wallX, wallY] of alternatives) {
            if (tryWallFeature(terrain, width, height, [localIndex(wallX, wallY, width)], boxCount)) {
              changed = true;
              break;
            }
          }
          if (changed) break;
        }
        if (changed) break;
      }
      if (!changed) break;
    }
  }

  function buildMazeTerrain(width, height, boxCount) {
    const interiorArea = Math.max(1, (width - 2) * (height - 2));

    const buildAxis = length => {
      const first = 1;
      const last = length - 2;
      if (last <= first) return [first];
      const span = last - first;
      const gaps = Array.from({ length: Math.ceil(span / 2) }, () => 2);
      if (span % 2 === 1) {
        // An even-sized board cannot alternate corridor/wall perfectly between
        // two one-cell borders. Keep the unavoidable wider pair local rather
        // than widening every passage, and vary its position between mazes.
        const choices = gaps.length > 2 && Math.random() < 0.7
          ? [0, gaps.length - 1]
          : Array.from({ length: gaps.length }, (_, index) => index);
        gaps[randomItem(choices)] = 1;
      }
      const positions = [first];
      gaps.forEach(gap => positions.push(positions.at(-1) + gap));
      return positions;
    };

    const wideFloorCells = terrain => {
      const cellsInWideAreas = new Set();
      for (let y = 1; y < height - 2; y++) {
        for (let x = 1; x < width - 2; x++) {
          const square = [
            localIndex(x, y, width),
            localIndex(x + 1, y, width),
            localIndex(x, y + 1, width),
            localIndex(x + 1, y + 1, width)
          ];
          if (square.every(index => terrain[index] === " ")) square.forEach(index => cellsInWideAreas.add(index));
        }
      }
      return cellsInWideAreas.size;
    };

    const solidWallMasses = terrain => {
      let total = 0;
      for (let y = 1; y < height - 3; y++) {
        for (let x = 1; x < width - 3; x++) {
          let solid = true;
          for (let oy = 0; oy < 3 && solid; oy++) {
            for (let ox = 0; ox < 3; ox++) {
              if (terrain[localIndex(x + ox, y + oy, width)] !== "#") {
                solid = false;
                break;
              }
            }
          }
          if (solid) total++;
        }
      }
      return total;
    };

    const makeCandidate = () => {
      const terrain = Array.from({ length: width * height }, () => "#");
      const cellXs = buildAxis(width);
      const cellYs = buildAxis(height);
      const coarseWidth = cellXs.length;
      const coarseHeight = cellYs.length;
      const coarseIndex = (cx, cy) => cy * coarseWidth + cx;
      const edgeKey = (ax, ay, bx, by) => {
        const a = coarseIndex(ax, ay);
        const b = coarseIndex(bx, by);
        return a < b ? `${a}:${b}` : `${b}:${a}`;
      };
      const opened = new Set();
      const carveCell = (cx, cy) => {
        terrain[localIndex(cellXs[cx], cellYs[cy], width)] = " ";
      };
      const carveConnection = (ax, ay, bx, by) => {
        carveCell(ax, ay);
        carveCell(bx, by);
        const axGrid = cellXs[ax];
        const ayGrid = cellYs[ay];
        const bxGrid = cellXs[bx];
        const byGrid = cellYs[by];
        if (Math.abs(axGrid - bxGrid) === 2 || Math.abs(ayGrid - byGrid) === 2) {
          terrain[localIndex((axGrid + bxGrid) / 2, (ayGrid + byGrid) / 2, width)] = " ";
        }
        opened.add(edgeKey(ax, ay, bx, by));
      };
      const neighbours = (cx, cy) => shuffled([
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
      ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < coarseWidth && ny < coarseHeight));

      const startX = randomInt(0, coarseWidth - 1);
      const startY = randomInt(0, coarseHeight - 1);
      const stack = [[startX, startY]];
      const visited = new Set([coarseIndex(startX, startY)]);
      carveCell(startX, startY);

      while (stack.length) {
        const [cx, cy] = stack.at(-1);
        const next = neighbours(cx, cy).find(([nx, ny]) => !visited.has(coarseIndex(nx, ny)));
        if (!next) {
          stack.pop();
          continue;
        }
        const [nx, ny] = next;
        carveConnection(cx, cy, nx, ny);
        visited.add(coarseIndex(nx, ny));
        stack.push([nx, ny]);
      }

      // Adjacent coarse cells are the single unavoidable wider pair on an
      // even dimension. They are already physically connected without a wall.
      for (let cy = 0; cy < coarseHeight; cy++) {
        for (let cx = 0; cx < coarseWidth; cx++) {
          if (cx + 1 < coarseWidth && cellXs[cx + 1] - cellXs[cx] === 1) opened.add(edgeKey(cx, cy, cx + 1, cy));
          if (cy + 1 < coarseHeight && cellYs[cy + 1] - cellYs[cy] === 1) opened.add(edgeKey(cx, cy, cx, cy + 1));
        }
      }

      const degree = (cx, cy) => [
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
      ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < coarseWidth && ny < coarseHeight
        && opened.has(edgeKey(cx, cy, nx, ny))).length;

      // Braid roughly half of the cul-de-sacs. This keeps the maze intricate
      // without turning it into a collection of sealed one-way box traps.
      const deadEnds = shuffled(Array.from({ length: coarseWidth * coarseHeight }, (_, index) => [
        index % coarseWidth,
        Math.floor(index / coarseWidth)
      ]).filter(([cx, cy]) => degree(cx, cy) === 1));
      deadEnds.forEach(([cx, cy]) => {
        if (Math.random() > 0.52 || degree(cx, cy) !== 1) return;
        const alternatives = shuffled([
          [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
        ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < coarseWidth && ny < coarseHeight
          && !opened.has(edgeKey(cx, cy, nx, ny))
          && (Math.abs(cellXs[cx] - cellXs[nx]) === 2 || Math.abs(cellYs[cy] - cellYs[ny]) === 2)));
        if (alternatives.length) carveConnection(cx, cy, alternatives[0][0], alternatives[0][1]);
      });

      const unopenedEdges = [];
      for (let cy = 0; cy < coarseHeight; cy++) {
        for (let cx = 0; cx < coarseWidth; cx++) {
          if (cx + 1 < coarseWidth
            && cellXs[cx + 1] - cellXs[cx] === 2
            && !opened.has(edgeKey(cx, cy, cx + 1, cy))) unopenedEdges.push([cx, cy, cx + 1, cy]);
          if (cy + 1 < coarseHeight
            && cellYs[cy + 1] - cellYs[cy] === 2
            && !opened.has(edgeKey(cx, cy, cx, cy + 1))) unopenedEdges.push([cx, cy, cx, cy + 1]);
        }
      }
      const extraLoops = Math.floor(unopenedEdges.length * (0.02 + Math.random() * 0.035));
      shuffled(unopenedEdges).slice(0, extraLoops).forEach(edge => carveConnection(...edge));

      // A few small turning bays make the maze useful for Sokoban boxes while
      // leaving the overwhelming majority of its routes one cell wide.
      const bayTarget = Math.min(3, Math.max(1, Math.ceil(boxCount / 2), Math.floor(interiorArea / 130) + 1));
      let baysMade = 0;
      for (let attempt = 0; attempt < 400 && baysMade < bayTarget; attempt++) {
        const index = randomInt(width + 1, width * height - width - 2);
        if (terrain[index] !== " " || openNeighbourCount(terrain, width, height, index) !== 2) continue;
        const [x, y] = localCoords(index, width);
        const openDirections = DIRECTIONS.filter(([dx, dy]) => {
          const next = localNeighbour(index, dx, dy, width, height);
          return next >= 0 && terrain[next] === " ";
        });
        if (openDirections.length !== 2) continue;
        const [first, second] = openDirections;
        if (first[0] === -second[0] && first[1] === -second[1]) continue;
        const diagonalX = x + first[0] + second[0];
        const diagonalY = y + first[1] + second[1];
        if (diagonalX <= 0 || diagonalY <= 0 || diagonalX >= width - 1 || diagonalY >= height - 1) continue;
        const diagonal = localIndex(diagonalX, diagonalY, width);
        if (terrain[diagonal] !== "#") continue;
        terrain[diagonal] = " ";
        baysMade++;
      }

      return terrain;
    };

    let bestTerrain = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 36; attempt++) {
      const terrain = makeCandidate();
      if (!floorIsConnected(terrain, width, height)) continue;
      const floorCount = terrainFloorCount(terrain);
      if (floorCount < Math.max(boxCount * 3 + 3, Math.floor(interiorArea * 0.42))) continue;
      const pushLanes = countPushLaneCells(terrain, width, height);
      if (pushLanes < Math.max(5, boxCount * 2)) continue;

      const wideCount = wideFloorCells(terrain);
      const corridorShare = floorCount ? 1 - wideCount / floorCount : 0;
      const thickMasses = solidWallMasses(terrain);
      const score = corridorShare * 140
        + pushLanes * 0.22
        - countLargeOpenAreas(terrain, width, height) * 16
        - thickMasses * 24
        + Math.random() * 3;
      if (score > bestScore) {
        bestScore = score;
        bestTerrain = terrain.slice();
      }

      const corridorTarget = (width % 2 === 0 || height % 2 === 0) ? 0.56 : 0.78;
      if (corridorShare >= corridorTarget
        && thickMasses === 0
        && countLargeOpenAreas(terrain, width, height) <= Math.max(1, Math.floor(interiorArea / 90))) return terrain;
    }

    return bestTerrain || buildTerrain(width, height, true, boxCount);
  }

  function buildTerrain(width, height, square, boxCount) {
    let bestTerrain = null;
    let bestScore = -Infinity;
    const interiorArea = Math.max(1, (width - 2) * (height - 2));

    for (let attempt = 0; attempt < 28; attempt++) {
      const terrain = makeBaseTerrain(width, height, square);
      if (!floorIsConnected(terrain, width, height) || !terrainRemainsUseful(terrain, width, height, boxCount)) continue;

      const styleRoll = Math.random();
      const dividerTarget = width >= 7 && height >= 7
        ? (styleRoll < 0.34 ? randomInt(2, 4) : styleRoll < 0.72 ? randomInt(1, 3) : randomInt(0, 2))
        : 0;
      const motifTarget = styleRoll < 0.34
        ? randomInt(1, 3)
        : styleRoll < 0.72 ? randomInt(3, 6) : randomInt(4, 8);
      const targetInternalWalls = Math.max(2, Math.min(Math.floor(interiorArea * 0.24), randomInt(
        Math.max(2, Math.floor(interiorArea * 0.10)),
        Math.max(3, Math.floor(interiorArea * 0.19))
      )));

      for (let divider = 0; divider < dividerTarget; divider++) {
        const preferVertical = width > height ? true : width < height ? false : Math.random() < 0.5;
        const vertical = Math.random() < 0.7 ? preferVertical : !preferVertical;
        const feature = dividerFeature(terrain, width, height, vertical);
        if (feature.length) tryWallFeature(terrain, width, height, feature, boxCount);
      }

      for (let motif = 0; motif < motifTarget; motif++) placeRandomMotif(terrain, width, height, boxCount);
      while (internalWallCount(terrain, width, height) < targetInternalWalls) {
        if (!placeRandomMotif(terrain, width, height, boxCount)) break;
      }

      breakLargeOpenAreas(terrain, width, height, boxCount);
      if (!terrainRemainsUseful(terrain, width, height, boxCount)) continue;

      const score = terrainScore(terrain, width, height) + Math.random() * 4;
      if (score > bestScore) {
        bestScore = score;
        bestTerrain = terrain.slice();
      }
      const enoughStructure = internalWallCount(terrain, width, height) >= Math.max(2, Math.floor(interiorArea * 0.07));
      const openAreas = countLargeOpenAreas(terrain, width, height);
      if (enoughStructure && openAreas <= Math.max(2, Math.floor(interiorArea / 35))) return terrain;
    }

    if (bestTerrain) return bestTerrain;

    const fallback = makeBaseTerrain(width, height, square);
    for (let i = 0; i < Math.max(2, Math.floor(interiorArea / 16)); i++) placeRandomMotif(fallback, width, height, boxCount);
    return fallback;
  }

  function isTerrainBlocker(terrain, width, height, index, dx, dy) {
    const neighbour = localNeighbour(index, dx, dy, width, height);
    return neighbour < 0 || terrain[neighbour] !== " ";
  }

  function isStaticCorner(terrain, width, height, index) {
    const up = isTerrainBlocker(terrain, width, height, index, 0, -1);
    const down = isTerrainBlocker(terrain, width, height, index, 0, 1);
    const left = isTerrainBlocker(terrain, width, height, index, -1, 0);
    const right = isTerrainBlocker(terrain, width, height, index, 1, 0);
    return (up && left) || (up && right) || (down && left) || (down && right);
  }

  function chooseSpaced(candidates, count, width, minimumDistance = 2) {
    const chosen = [];
    for (const candidate of shuffled(candidates)) {
      const [x, y] = localCoords(candidate, width);
      const farEnough = chosen.every(existing => {
        const [ex, ey] = localCoords(existing, width);
        return Math.abs(x - ex) + Math.abs(y - ey) >= minimumDistance;
      });
      if (farEnough) chosen.push(candidate);
      if (chosen.length === count) return chosen;
    }
    const remainder = shuffled(candidates.filter(candidate => !chosen.includes(candidate)));
    while (chosen.length < count && remainder.length) chosen.push(remainder.pop());
    return chosen.length === count ? chosen : null;
  }

  function chooseGoalPositions(candidates, count, terrain, width, height) {
    const chosen = [];
    const remaining = new Set(candidates);
    while (chosen.length < count && remaining.size) {
      const scored = [...remaining].map(index => {
        const [x, y] = localCoords(index, width);
        const wallTouches = DIRECTIONS.reduce((total, [dx, dy]) => {
          const next = localNeighbour(index, dx, dy, width, height);
          return total + (next < 0 || terrain[next] !== " " ? 1 : 0);
        }, 0);
        const nearestGoal = chosen.length
          ? Math.min(...chosen.map(existing => {
              const [ex, ey] = localCoords(existing, width);
              return Math.abs(x - ex) + Math.abs(y - ey);
            }))
          : 99;
        let score = Math.random() * 5 + wallTouches * 2.4;
        if (nearestGoal === 1) score += 4.5;
        else if (nearestGoal === 2) score += 1.5;
        if (chosen.length > 1 && nearestGoal === 1) score -= 1.5;
        return { index, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const band = scored.slice(0, Math.min(6, scored.length));
      const selected = randomItem(band).index;
      chosen.push(selected);
      remaining.delete(selected);
    }
    return chosen.length === count ? chosen : null;
  }

  function composeGeneratedCells(terrain, goals, boxes, player) {
    const generated = terrain.slice();
    const goalSet = new Set(goals);
    goals.forEach(goal => { generated[goal] = "."; });
    boxes.forEach(box => { generated[box] = goalSet.has(box) ? "*" : "$"; });
    generated[player] = goalSet.has(player) ? "+" : "@";
    return generated;
  }


  function symmetryPartner(index, width, height, mode) {
    const [x, y] = localCoords(index, width);
    if (mode === "vertical") return localIndex(width - 1 - x, y, width);
    if (mode === "horizontal") return localIndex(x, height - 1 - y, width);
    return localIndex(width - 1 - x, height - 1 - y, width);
  }

  function symmetricFeature(indices, width, height, mode) {
    const result = new Set();
    for (const index of indices) {
      result.add(index);
      result.add(symmetryPartner(index, width, height, mode));
    }
    return [...result];
  }

  function buildSymmetricTerrain(width, height, boxCount, maze = false) {
    const modes = ["vertical", "horizontal", "rotational"];
    if (width % 2 === 0) modes.push("vertical");
    if (height % 2 === 0) modes.push("horizontal");
    const mode = randomItem(modes);
    const terrain = makeBaseTerrain(width, height, true);
    const interiorArea = Math.max(1, (width - 2) * (height - 2));
    const targetWalls = Math.floor(interiorArea * (maze ? 0.31 : 0.19));
    const maximumAttempts = maze ? 360 : 220;

    for (let attempt = 0; attempt < maximumAttempts; attempt++) {
      const currentWalls = terrain.reduce((count, cell, index) => {
        const [x, y] = localCoords(index, width);
        return count + (cell === "#" && x > 0 && y > 0 && x < width - 1 && y < height - 1 ? 1 : 0);
      }, 0);
      if (currentWalls >= targetWalls) break;

      let feature = [];
      if (maze || Math.random() < 0.68) {
        const vertical = Math.random() < 0.5;
        const maxLength = vertical ? Math.min(6, height - 3) : Math.min(6, width - 3);
        const length = randomInt(1, Math.max(1, maxLength));
        const x = randomInt(1, width - 2);
        const y = randomInt(1, height - 2);
        for (let offset = 0; offset < length; offset++) {
          const fx = vertical ? x : x + offset;
          const fy = vertical ? y + offset : y;
          if (fx > 0 && fy > 0 && fx < width - 1 && fy < height - 1) feature.push(localIndex(fx, fy, width));
        }
      } else {
        const motif = transformMotif(randomItem(WALL_MOTIFS));
        const motifWidth = Math.max(...motif.map(([x]) => x)) + 1;
        const motifHeight = Math.max(...motif.map(([, y]) => y)) + 1;
        if (motifWidth > width - 2 || motifHeight > height - 2) continue;
        const originX = randomInt(1, width - 1 - motifWidth);
        const originY = randomInt(1, height - 1 - motifHeight);
        feature = motif.map(([x, y]) => localIndex(originX + x, originY + y, width));
      }

      feature = symmetricFeature(feature, width, height, mode)
        .filter(index => {
          const [x, y] = localCoords(index, width);
          return x > 0 && y > 0 && x < width - 1 && y < height - 1;
        });
      if (feature.length) tryWallFeature(terrain, width, height, feature, boxCount);
    }

    if (maze) breakLargeOpenAreas(terrain, width, height, boxCount);
    terrain.symmetryMode = mode;
    return terrain;
  }

  function chooseSymmetricPositions(candidates, count, width, height, mode, excluded = new Set()) {
    const available = new Set(candidates.filter(index => !excluded.has(index)));
    const chosen = [];
    if (count % 2 === 1) {
      const centres = [...available].filter(index => symmetryPartner(index, width, height, mode) === index);
      const centre = centres.length ? randomItem(centres) : randomItem([...available]);
      if (centre === undefined) return null;
      chosen.push(centre);
      available.delete(centre);
      available.delete(symmetryPartner(centre, width, height, mode));
    }
    const pairs = shuffled([...available]).filter(index => {
      const partner = symmetryPartner(index, width, height, mode);
      return index < partner && available.has(partner);
    });
    for (const index of pairs) {
      if (chosen.length >= count) break;
      const partner = symmetryPartner(index, width, height, mode);
      chosen.push(index, partner);
      available.delete(index);
      available.delete(partner);
    }
    return chosen.length === count ? chosen : null;
  }

  function generateUnchecked(width, height, boxCount, square, maze = false, symmetry = false) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const terrain = symmetry
        ? buildSymmetricTerrain(width, height, boxCount, maze)
        : (maze ? buildMazeTerrain(width, height, boxCount) : buildTerrain(width, height, square, boxCount));
      const floors = terrain.map((value, index) => value === " " ? index : -1).filter(index => index >= 0);
      if (floors.length < boxCount * 3 + 2) continue;
      const symmetryMode = symmetry ? terrain.symmetryMode : null;
      const goals = symmetryMode
        ? (chooseSymmetricPositions(floors, boxCount, width, height, symmetryMode) || chooseGoalPositions(floors, boxCount, terrain, width, height))
        : chooseGoalPositions(floors, boxCount, terrain, width, height);
      if (!goals) continue;
      const goalSet = new Set(goals);
      const boxCandidates = floors.filter(index => !goalSet.has(index) && !isStaticCorner(terrain, width, height, index));
      const boxes = symmetryMode
        ? (chooseSymmetricPositions(boxCandidates, boxCount, width, height, symmetryMode, goalSet) || chooseSpaced(boxCandidates, boxCount, width, 2))
        : chooseSpaced(boxCandidates, boxCount, width, 2);
      if (!boxes) continue;
      const used = new Set([...goals, ...boxes]);
      const playerCandidates = floors.filter(index => !used.has(index));
      if (!playerCandidates.length) continue;
      const player = randomItem(playerCandidates);
      return {
        width,
        height,
        boxes: boxCount,
        cells: composeGeneratedCells(terrain, goals, boxes, player),
        tested: false,
        square,
        maze,
        symmetry,
        symmetryMode
      };
    }
    return null;
  }

  function verifyPullSolution(terrain, width, height, goalByBox, finalBoxes, finalPlayer, pulls) {
    const boxes = finalBoxes.slice();
    let player = finalPlayer;
    for (let i = pulls.length - 1; i >= 0; i--) {
      const pull = pulls[i];
      if (boxes[pull.boxId] !== pull.to) return false;
      const [fromX, fromY] = localCoords(pull.from, width);
      const [toX, toY] = localCoords(pull.to, width);
      const dx = fromX - toX;
      const dy = fromY - toY;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
      const behindX = toX - dx;
      const behindY = toY - dy;
      if (behindX < 0 || behindY < 0 || behindX >= width || behindY >= height) return false;
      const behind = localIndex(behindX, behindY, width);
      const boxSet = new Set(boxes);
      const reachable = reachableSet(terrain, width, height, boxSet, player);
      if (!reachable.has(behind)) return false;
      if (!terrainWalkable(terrain, pull.from) || boxSet.has(pull.from)) return false;
      boxes[pull.boxId] = pull.from;
      player = pull.to;
    }
    return boxes.every((position, boxId) => position === goalByBox[boxId]);
  }

  function reverseBuildTested(terrain, width, height, boxCount) {
    const floors = terrain.map((value, index) => value === " " ? index : -1).filter(index => index >= 0);
    if (floors.length < boxCount * 3 + 3) return null;

    const goalCandidates = floors.filter(index => {
      const open = DIRECTIONS.filter(([dx, dy]) => {
        const next = localNeighbour(index, dx, dy, width, height);
        const beyond = next >= 0 ? localNeighbour(next, dx, dy, width, height) : -1;
        return next >= 0 && beyond >= 0 && terrain[next] === " " && terrain[beyond] === " ";
      });
      return open.length > 0;
    });
    const goals = chooseGoalPositions(goalCandidates, boxCount, terrain, width, height);
    if (!goals) return null;

    const boxes = goals.slice();
    const occupied = new Set(boxes);
    const playerCandidates = floors.filter(index => !occupied.has(index));
    if (!playerCandidates.length) return null;
    let player = randomItem(playerCandidates);
    const pulls = [];
    const moved = new Set();
    const seenBoxStates = new Set([boxes.slice().sort((a, b) => a - b).join(",")]);
    const targetPulls = Math.max(7, boxCount * randomInt(5, 8));

    for (let step = 0; step < targetPulls * 4 && pulls.length < targetPulls; step++) {
      const boxSet = new Set(boxes);
      const reachable = reachableSet(terrain, width, height, boxSet, player);
      const options = [];

      boxes.forEach((boxPosition, boxId) => {
        for (const [dx, dy] of DIRECTIONS) {
          const [bx, by] = localCoords(boxPosition, width);
          const playerX = bx - dx;
          const playerY = by - dy;
          const behindX = playerX - dx;
          const behindY = playerY - dy;
          if (playerX < 0 || playerY < 0 || playerX >= width || playerY >= height) continue;
          if (behindX < 0 || behindY < 0 || behindX >= width || behindY >= height) continue;
          const pullTo = localIndex(playerX, playerY, width);
          const playerAfter = localIndex(behindX, behindY, width);
          if (!reachable.has(pullTo)) continue;
          if (!terrainWalkable(terrain, pullTo) || !terrainWalkable(terrain, playerAfter)) continue;
          if (boxSet.has(pullTo) || boxSet.has(playerAfter)) continue;

          const nextBoxes = boxes.slice();
          nextBoxes[boxId] = pullTo;
          const stateKey = nextBoxes.slice().sort((a, b) => a - b).join(",");
          const previous = pulls.at(-1);
          const immediateUndo = previous && previous.boxId === boxId && previous.from === pullTo && previous.to === boxPosition;
          let score = Math.random() * 3;
          if (!moved.has(boxId)) score += 10;
          if (!goals.includes(pullTo)) score += 4;
          if (!seenBoxStates.has(stateKey)) score += 5;
          if (previous) {
            if (previous.boxId !== boxId) score += 4;
            else if (previous.dx !== dx || previous.dy !== dy) score += 5;
            else score -= 2.5;
          }
          const openAtDestination = openNeighbourCount(terrain, width, height, pullTo);
          if (openAtDestination === 2) score += 1.5;
          if (immediateUndo) score -= 24;
          options.push({ boxId, from: boxPosition, to: pullTo, playerAfter, stateKey, dx, dy, score });
        }
      });

      if (!options.length) break;
      options.sort((a, b) => b.score - a.score);
      const bestBand = options.slice(0, Math.min(4, options.length));
      const chosen = randomItem(bestBand);
      boxes[chosen.boxId] = chosen.to;
      player = chosen.playerAfter;
      moved.add(chosen.boxId);
      seenBoxStates.add(chosen.stateKey);
      pulls.push(chosen);
    }

    const goalsSet = new Set(goals);
    const unsolvedBoxes = boxes.filter(position => !goalsSet.has(position)).length;
    let boxLines = 0;
    let boxChanges = 0;
    pulls.forEach((pull, index) => {
      const previous = pulls[index - 1];
      if (!previous || previous.boxId !== pull.boxId || previous.dx !== pull.dx || previous.dy !== pull.dy) boxLines++;
      if (previous && previous.boxId !== pull.boxId) boxChanges++;
    });
    if (pulls.length < Math.max(7, boxCount * 3)) return null;
    if (moved.size !== boxCount) return null;
    if (unsolvedBoxes < Math.max(1, boxCount - 1)) return null;
    if (boxLines < Math.max(boxCount + 2, Math.floor(pulls.length * 0.32))) return null;
    if (boxCount >= 3 && boxChanges < 2) return null;
    if (!verifyPullSolution(terrain, width, height, goals, boxes, player, pulls)) return null;

    return {
      width,
      height,
      boxes: boxCount,
      cells: composeGeneratedCells(terrain, goals, boxes, player),
      tested: true,
      square: false,
      solutionPushes: pulls.length,
      solutionLines: boxLines,
      solutionBoxChanges: boxChanges
    };
  }

  async function generateChecked(width, height, boxCount, square, maze = false, symmetry = false) {
    const maximumAttempts = (maze || symmetry) ? 300 : 180;
    for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
      const terrain = symmetry
        ? buildSymmetricTerrain(width, height, boxCount, maze)
        : (maze ? buildMazeTerrain(width, height, boxCount) : buildTerrain(width, height, square, boxCount));
      const generated = reverseBuildTested(terrain, width, height, boxCount);
      if (generated) {
        generated.square = square;
        generated.maze = maze;
        generated.symmetry = symmetry;
        generated.symmetryMode = symmetry ? terrain.symmetryMode : null;
        return generated;
      }
      if (attempt % 10 === 0) {
        setStatus(`Generating and checking… attempt ${attempt}.`);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return null;
  }

  function applyGeneratedLevel(generated) {
    cols = generated.width;
    rows = generated.height;
    cells = generated.cells.slice();
    goalColours = normaliseGoalColourArray([], cells);
    clearAttachedSolution(true);
    syncSizeInputs();
    boxesInput.value = String(generated.boxes);
    renderGrid();
    updateTextFromGrid();
    clearActiveSave();
  }

  async function generateLevel() {
    const width = clampGeneratorSize(widthInput.value);
    const height = clampGeneratorSize(heightInput.value);
    const boxCount = clampBoxes(boxesInput.value);
    const square = Boolean(squareInput.checked);
    const tested = Boolean(testedInput.checked);
    const maze = Boolean(mazeInput?.checked);
    const symmetry = Boolean(symmetryInput?.checked);
    widthInput.value = String(width);
    heightInput.value = String(height);
    boxesInput.value = String(boxCount);

    const approximateFloor = Math.max(1, Math.floor((width - 2) * (height - 2) * ((maze || symmetry) ? 0.62 : 1)));
    const sensibleMaximum = Math.min(MAX_GENERATOR_BOXES, Math.max(1, Math.floor((approximateFloor - 1) / 3)));
    if (boxCount > sensibleMaximum) {
      setStatus(`That size has too little working space for ${boxCount} boxes. Try ${sensibleMaximum} or fewer.`, "error");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = tested ? "GENERATING + CHECKING…" : "GENERATING…";
    const generatorDescription = `${symmetry ? "symmetrical " : ""}${maze ? "maze" : "level"}`;
    setStatus(tested
      ? `Generating a ${generatorDescription} and checking its solution path…`
      : `Generating a new ${generatorDescription}…`);
    await waitForPaint();

    try {
      const generated = tested
        ? await generateChecked(width, height, boxCount, square, maze, symmetry)
        : generateUnchecked(width, height, boxCount, square, maze, symmetry);
      if (!generated) {
        setStatus(tested
          ? `A checked ${generatorDescription} could not be built with those settings. Try fewer boxes or a larger grid.`
          : `A ${generatorDescription} could not be built with those settings. Try fewer boxes or a larger grid.`, "error");
        return;
      }
      applyGeneratedLevel(generated);
      if (tested) {
        setStatus(`Generated and checked ${generatorDescription}: ${boxCount} ${boxCount === 1 ? "box" : "boxes"}, verified ${generated.solutionPushes}-push path across ${generated.solutionLines} box lines.`, "success");
      } else {
        setStatus(`Generated ${boxCount}-box ${generatorDescription} without a completion check.`, "success");
      }
    } catch (error) {
      setStatus(error?.message || "The level generator stopped unexpectedly.", "error");
    } finally {
      generateBtn.disabled = false;
      generateBtn.removeAttribute("aria-busy");
      generateBtn.textContent = originalLabel;
    }
  }

  function populateExistingPacks(preferredPackId = "") {
    if (!existingPackSelect) return;
    const previous = preferredPackId || existingPackSelect.value;
    existingPackSelect.innerHTML = "";
    existingPacks.forEach((pack, index) => {
      const option = document.createElement("option");
      option.value = pack.id || String(index);
      option.textContent = `${pack.displayName || pack.title || `Pack ${index + 1}`} · ${pack.levels?.length || 0} levels`;
      existingPackSelect.appendChild(option);
    });
    if (existingPacks.some(pack => pack.id === previous)) existingPackSelect.value = previous;
    else if (existingPackSelect.options.length) existingPackSelect.selectedIndex = 0;
    populateExistingLevels();
  }

  function selectedExistingPack() {
    if (!existingPackSelect) return null;
    return existingPacks.find((pack, index) => (pack.id || String(index)) === existingPackSelect.value) || existingPacks[0] || null;
  }

  function populateExistingLevels(preferredIndex = 0) {
    if (!existingLevelSelect) return;
    const pack = selectedExistingPack();
    existingLevelSelect.innerHTML = "";
    const levels = Array.isArray(pack?.levels) ? pack.levels : [];
    levels.forEach((level, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      const width = Math.max(0, ...(level.layout || []).map(row => String(row).length));
      const height = Array.isArray(level.layout) ? level.layout.length : 0;
      const title = level.name && !/^level\s+\d+$/i.test(level.name)
        ? `${index + 1}. ${level.name}`
        : `Level ${index + 1}`;
      option.textContent = `${title} · ${width}×${height}`;
      existingLevelSelect.appendChild(option);
    });
    existingLevelSelect.value = levels.length ? String(Math.max(0, Math.min(levels.length - 1, Number(preferredIndex) || 0))) : "";
    if (openExistingLevelBtn) openExistingLevelBtn.disabled = !levels.length;
  }

  function openExistingPuzzle() {
    const pack = selectedExistingPack();
    const levelIndex = Number(existingLevelSelect?.value);
    const level = Array.isArray(pack?.levels) ? pack.levels[levelIndex] : null;
    if (!level || !Array.isArray(level.layout)) {
      setStatus("Choose an existing puzzle first.", "error");
      return;
    }
    try {
      const levelRainbowMode = Boolean(level.rainbowMode) || goalColourDataPresent(level.goalColours);
      importRows(level.layout, { quiet: true, goalColours: level.goalColours, rainbowMode: levelRainbowMode });
      clearActiveSave();
      currentPuzzleRef = { packId: pack.id || existingPackSelect.value, levelIndex };
      const knownRoute = window.BoxxySolutionStore?.get?.(currentPuzzleRef.packId, levelIndex) || level.solution || "";
      setAttachedSolution(knownRoute, currentLevelText(), currentPuzzleRef);
      const packName = pack.displayName || pack.title || "Puzzle pack";
      const levelName = level.name || `Level ${levelIndex + 1}`;
      if (saveNameInput) saveNameInput.value = `${packName} — ${levelName}`.slice(0, 48);
      setStatus(`Opened ${packName}, ${levelName}. All backend packs are available here regardless of game progress.`, "success");
    } catch (error) {
      setStatus(error?.message || "That puzzle could not be opened in the editor.", "error");
    }
  }

  function readSavedLevels() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(record => record && typeof record.id === "string" && typeof record.name === "string");
    } catch (_) {
      return [];
    }
  }

  function writeSavedLevels(records, changeDetail = {}) {
    const newestFirst = records
      .slice()
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, 100);
    localStorage.setItem(SAVE_KEY, JSON.stringify(newestFirst));
    window.dispatchEvent(new CustomEvent("boxxy-saved-levels-changed", {
      detail: { ...changeDetail, records: newestFirst }
    }));
  }

  function savedRecordMatchesCurrentBoard(record) {
    return Boolean(
      record
      && Number(record.cols) === cols
      && Number(record.rows) === rows
      && Array.isArray(record.cells)
      && record.cells.length === cells.length
      && record.cells.every((value, index) => value === cells[index])
      && recordUsesRainbow(record) === rainbowMode
      && (recordUsesRainbow(record) ? normaliseGoalColourArray(record.goalColours, record.cells) : blankGoalColours(record.cols, record.rows))
        .every((value, index) => value === (rainbowMode ? goalColours[index] : null))
    );
  }

  function persistAttachedSolutionToLoadedSave() {
    if (!activeSaveId || !solutionMatchesCurrentBoard()) return false;
    const records = readSavedLevels();
    const index = records.findIndex(record => record.id === activeSaveId);
    if (index < 0 || !savedRecordMatchesCurrentBoard(records[index])) return false;

    const record = records[index];
    const route = String(currentSolution || "").replace(/[^udlrUDLR]/g, "");
    if (!route) return false;
    const levelText = currentLevelText();
    if (record.solution === route && record.solutionLevelText === levelText) return true;

    records[index] = {
      ...record,
      solution: route,
      solutionLevelText: levelText,
      updatedAt: Date.now()
    };
    writeSavedLevels(records, { type: "solution", id: activeSaveId });
    renderSavedLevels(activeSaveId);
    return true;
  }

  function normaliseSaveName(name) {
    return String(name || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("en-GB");
  }

  function nextDefaultSaveName(records) {
    const usedNames = new Set(records.map(record => normaliseSaveName(record.name)));
    let number = Math.max(1, records.length + 1);
    while (usedNames.has(normaliseSaveName(`Saved level ${number}`))) number += 1;
    return `Saved level ${number}`;
  }

  function resetSaveConfirmation() {
    pendingOverwriteId = "";
    clearTimeout(overwriteTimer);
    if (saveBtn) saveBtn.textContent = "SAVE LEVEL";
  }

  function newSaveId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `level-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function renderSavedLevels(preferredId = "") {
    const records = readSavedLevels().sort((a, b) => {
      const byName = String(a.name || "").localeCompare(String(b.name || ""), "en-GB", { sensitivity: "base", numeric: true });
      return byName || Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    });
    savedSelect.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = records.length ? "CHOOSE A SAVED LEVEL" : "NO SAVED LEVELS";
    savedSelect.appendChild(emptyOption);
    records.forEach(record => {
      const option = document.createElement("option");
      option.value = record.id;
      const boxTotal = Array.isArray(record.cells) ? countBoxes(record.cells) : Number(record.boxes || 0);
      option.textContent = `${record.name} · ${record.cols || "?"}×${record.rows || "?"} · ${boxTotal} ${boxTotal === 1 ? "box" : "boxes"}`;
      savedSelect.appendChild(option);
    });
    const selection = preferredId && records.some(record => record.id === preferredId) ? preferredId : "";
    savedSelect.value = selection;
    loadBtn.disabled = !records.length;
    deleteBtn.disabled = !records.length;
  }

  function saveCurrentLevel() {
    const records = readSavedLevels();
    const name = saveNameInput.value.trim() || nextDefaultSaveName(records);
    const matchingRecord = records.find(record => normaliseSaveName(record.name) === normaliseSaveName(name));

    if (matchingRecord && pendingOverwriteId !== matchingRecord.id) {
      resetSaveConfirmation();
      pendingOverwriteId = matchingRecord.id;
      saveBtn.textContent = "OVERWRITE";
      setStatus(`A saved level named “${matchingRecord.name}” already exists. Press OVERWRITE to replace it, or change the name to save a new level.`, "error");
      overwriteTimer = window.setTimeout(resetSaveConfirmation, 8000);
      return;
    }

    const now = Date.now();
    const isOverwrite = Boolean(matchingRecord && pendingOverwriteId === matchingRecord.id);
    const record = {
      id: isOverwrite ? matchingRecord.id : newSaveId(),
      name,
      cols,
      rows,
      cells: cells.slice(),
      rainbowMode,
      goalColours: rainbowMode ? normaliseGoalColourArray(goalColours, cells) : blankGoalColours(cols, rows),
      boxes: countBoxes(),
      solution: solutionMatchesCurrentBoard() ? currentSolution : "",
      solutionLevelText: solutionMatchesCurrentBoard() ? currentSolutionLevelText : "",
      createdAt: isOverwrite ? matchingRecord.createdAt || now : now,
      updatedAt: now
    };

    if (isOverwrite) {
      const index = records.findIndex(item => item.id === matchingRecord.id);
      records[index] = record;
    } else {
      records.push(record);
    }

    try {
      writeSavedLevels(records, { type: isOverwrite ? "overwrite" : "save", id: record.id });
      activeSaveId = record.id;
      saveNameInput.value = name;
      resetSaveConfirmation();
      renderSavedLevels(record.id);
      setStatus(isOverwrite ? `Overwrote “${name}”.` : `Saved “${name}” as a new level.`, "success");
    } catch (_) {
      resetSaveConfirmation();
      setStatus("This browser would not allow the level to be saved locally.", "error");
    }
  }

  function loadSavedLevel() {
    const id = savedSelect.value;
    const record = readSavedLevels().find(item => item.id === id);
    if (!record) {
      setStatus("Choose a saved level first.", "error");
      return;
    }
    const savedCols = clampSize(record.cols);
    const savedRows = clampSize(record.rows);
    if (!Array.isArray(record.cells) || record.cells.length !== savedCols * savedRows || record.cells.some(value => !VALID.has(value))) {
      setStatus("That saved level is damaged and could not be loaded.", "error");
      return;
    }
    cols = savedCols;
    rows = savedRows;
    cells = record.cells.slice();
    goalColours = normaliseGoalColourArray(record.goalColours, cells);
    setRainbowMode(recordUsesRainbow(record), { persist: true });
    activeSaveId = record.id;
    resetSaveConfirmation();
    saveNameInput.value = record.name;
    syncSizeInputs();
    boxesInput.value = String(Math.max(1, countBoxes()));
    renderGrid();
    updateTextFromGrid();
    currentPuzzleRef = null;
    const restoredText = currentLevelText();
    const restoredSolution = typeof record.solution === "string" && (!record.solutionLevelText || record.solutionLevelText === restoredText) ? record.solution : "";
    setAttachedSolution(restoredSolution, restoredText, null);
    renderSavedLevels(record.id);
    setStatus(`Loaded “${record.name}”.${restoredSolution ? " Its attached guided solve was restored." : ""} Change the name before saving to keep the original and create a new level.`, "success");
  }

  function resetDeleteButton() {
    pendingDeleteId = "";
    clearTimeout(deleteTimer);
    deleteBtn.textContent = "DELETE";
  }

  function deleteSavedLevel() {
    const id = savedSelect.value;
    if (!id) {
      setStatus("Choose a saved level first.", "error");
      return;
    }
    if (pendingDeleteId !== id) {
      pendingDeleteId = id;
      deleteBtn.textContent = "CONFIRM";
      setStatus("Press CONFIRM to delete the selected saved level.");
      deleteTimer = window.setTimeout(resetDeleteButton, 3500);
      return;
    }
    const records = readSavedLevels();
    const removed = records.find(record => record.id === id);
    try {
      writeSavedLevels(records.filter(record => record.id !== id), { type: "delete", id });
      if (activeSaveId === id) clearActiveSave();
      resetDeleteButton();
      renderSavedLevels();
      setStatus(removed ? `Deleted “${removed.name}”.` : "Saved level deleted.", "success");
    } catch (_) {
      setStatus("This browser would not allow the saved level to be deleted.", "error");
    }
  }

  function openMaker() {
    if (window.BOXXY_SHARED_MODE || document.body.classList.contains("shared-puzzle")) return;
    modal.hidden = false;
    exitTestBtn.hidden = !window.BoxxyGameAPI?.isMakerTesting?.();
    renderSavedLevels(activeSaveId);
    populateExistingPacks(existingPackSelect?.value);
    updateMakerFullscreenButton();
    scheduleGridFit();
    closeBtn.focus({ preventScroll: true });
  }

  function closeMaker() {
    if (solverRunning) cancelSolverSearch();
    if (solverModal) solverModal.hidden = true;
    exitMakerFullscreen();
    modal.hidden = true;
  }

  function selectTool(tool) {
    activeTool = tool;
    toolButtons.forEach(button => button.classList.toggle("selected", button.dataset.makerTool === tool));
    goalPalette?.classList.toggle("active", rainbowMode && GOAL_TOOLS.has(tool));
  }

  toolButtons.forEach(button => {
    button.addEventListener("click", () => selectTool(button.dataset.makerTool));
  });
  rainbowModeInput?.addEventListener("change", () => {
    setRainbowMode(rainbowModeInput.checked, { announce: true, persist: true });
  });
  goalColourButtons.forEach(button => {
    const colour = GOAL_COLOURS?.normalise?.(button.dataset.makerGoalColour) || DEFAULT_GOAL_COLOUR;
    applyGoalStyle(button, colour);
    button.addEventListener("click", () => setActiveGoalColour(colour, true));
  });

  gridEl.addEventListener("pointerdown", event => {
    const cell = event.target.closest(".maker-cell");
    if (!cell) return;
    event.preventDefault();
    painting = true;
    lastPaintIndex = -1;
    paintIndex(Number(cell.dataset.index));
  });

  gridEl.addEventListener("pointermove", event => {
    if (!painting) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".maker-cell");
    if (target && gridEl.contains(target)) paintIndex(Number(target.dataset.index));
  });

  window.addEventListener("pointerup", () => {
    painting = false;
    lastPaintIndex = -1;
  });
  window.addEventListener("pointercancel", () => {
    painting = false;
    lastPaintIndex = -1;
  });

  gridEl.addEventListener("keydown", event => {
    const cell = event.target.closest(".maker-cell");
    if (!cell) return;
    const index = Number(cell.dataset.index);
    const [x, y] = coordsOf(index);
    let nextIndex = null;
    if (event.key === "ArrowLeft" && x > 0) nextIndex = index - 1;
    if (event.key === "ArrowRight" && x < cols - 1) nextIndex = index + 1;
    if (event.key === "ArrowUp" && y > 0) nextIndex = index - cols;
    if (event.key === "ArrowDown" && y < rows - 1) nextIndex = index + cols;
    if (nextIndex !== null) {
      event.preventDefault();
      gridEl.children[nextIndex]?.focus();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      lastPaintIndex = -1;
      paintIndex(index);
    }
  });

  generateBtn.addEventListener("click", generateLevel);
  resizeBtn.addEventListener("click", () => resizeGrid(widthInput.value, heightInput.value));
  roomBtn.addEventListener("click", () => makeRoom(widthInput.value, heightInput.value));
  clearBtn.addEventListener("click", () => {
    cols = clampSize(widthInput.value);
    rows = clampSize(heightInput.value);
    cells = blankGrid(cols, rows, VOID);
    goalColours = blankGoalColours(cols, rows);
    clearAttachedSolution(true);
    syncSizeInputs();
    renderGrid();
    updateTextFromGrid();
    clearActiveSave();
    setStatus("Grid cleared.");
  });

  importBtn.addEventListener("click", () => {
    try {
      importRows(normalizePastedText(textEl.value));
      clearAttachedSolution(true);
    } catch (error) {
      setStatus(error?.message || "The level could not be imported.", "error");
    }
  });

  async function copyShareLink() {
    const validation = validate();
    if (!validation.ok) {
      setStatus(validation.error, "error");
      return;
    }
    if (!window.BoxxyShareCodec?.buildUrl) {
      setStatus("Share links are unavailable in this build.", "error");
      return;
    }
    const name = saveNameInput?.value?.trim() || "Shared Puzzle";
    let shareUrl;
    try {
      shareUrl = window.BoxxyShareCodec.buildUrl({ name, layout: validation.rows, goalColours: exportGoalColourMap() });
    } catch (error) {
      setStatus(error?.message || "The share link could not be created.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Private puzzle link copied. Anyone who has the link can play the puzzle, but the Level Maker and pack controls are hidden.", "success");
    } catch (_) {
      const helper = document.createElement("textarea");
      helper.value = shareUrl;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand?.("copy");
      helper.remove();
      setStatus(copied
        ? "Private puzzle link copied. Anyone who has the link can play it."
        : `Copy this puzzle link manually: ${shareUrl}`, copied ? "success" : "");
    }
  }

  copyBtn.addEventListener("click", async () => {
    const validation = validate();
    updateTextFromGrid();
    try {
      await navigator.clipboard.writeText(textEl.value);
      setStatus(validation.ok ? "Level copied to the clipboard." : `Copied, but note: ${validation.error}`, validation.ok ? "success" : "error");
    } catch (_) {
      textEl.focus();
      textEl.select();
      const copied = document.execCommand?.("copy");
      setStatus(copied ? "Level copied to the clipboard." : "The level is ready in the text box for manual copying.", copied ? "success" : "");
    }
  });

  shareBtn?.addEventListener("click", copyShareLink);
  saveBtn.addEventListener("click", saveCurrentLevel);
  existingPackSelect?.addEventListener("change", () => populateExistingLevels());
  existingLevelSelect?.addEventListener("dblclick", openExistingPuzzle);
  openExistingLevelBtn?.addEventListener("click", openExistingPuzzle);
  loadBtn.addEventListener("click", loadSavedLevel);
  deleteBtn.addEventListener("click", deleteSavedLevel);
  savedSelect.addEventListener("change", () => {
    resetDeleteButton();
    resetSaveConfirmation();
  });
  saveNameInput.addEventListener("input", resetSaveConfirmation);
  saveNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveCurrentLevel();
    }
  });

  solveBtn?.addEventListener("click", openSolverDialog);
  solverCloseBtn?.addEventListener("click", closeSolverDialog);
  solverStartBtn?.addEventListener("click", startSolverSearch);
  solverCancelBtn?.addEventListener("click", cancelSolverSearch);
  solverCheckBtn?.addEventListener("click", checkImportedSolution);
  solverClearImportBtn?.addEventListener("click", clearImportedSolution);
  solverImportInput?.addEventListener("input", () => {
    const hadVerifiedImport = Boolean(verifiedImportSolution);
    clearVerifiedImport(false);
    if (hadVerifiedImport) setSolverStatus("The imported string changed. Check it again before applying.");
    updateSolverControls();
  });
  solverImportInput?.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      checkImportedSolution();
    }
  });
  solverCopyBtn?.addEventListener("click", copySolverString);
  solverApplyBtn?.addEventListener("click", applyCurrentSolution);
  solverModal?.addEventListener("click", event => {
    if (event.target === solverModal) closeSolverDialog();
  });

  testBtn.addEventListener("click", () => {
    const validation = validate();
    if (!validation.ok) {
      setStatus(validation.error, "error");
      return;
    }
    const result = window.BoxxyGameAPI?.startMakerTest?.(validation.rows, solutionMatchesCurrentBoard() ? currentSolution : "", {
      name: saveNameInput?.value?.trim() || "Custom Test",
      goalColours: exportGoalColourMap()
    });
    if (!result?.ok) {
      setStatus(result?.error || "The game could not load this level.", "error");
      return;
    }
    setStatus(`Testing a level with ${validation.boxes} ${validation.boxes === 1 ? "box" : "boxes"}.`, "success");
    exitTestBtn.hidden = false;
    closeMaker();
  });

  exitTestBtn.addEventListener("click", () => {
    window.BoxxyGameAPI?.exitMakerTest?.();
    exitTestBtn.hidden = true;
    closeMaker();
  });

  makerFullscreenBtn?.addEventListener("click", toggleMakerFullscreen);
  closeBtn.addEventListener("click", closeMaker);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeMaker();
  });

  hotspot?.addEventListener("click", event => {
    event.preventDefault();
    if (window.BOXXY_SHARED_MODE || document.body.classList.contains("shared-puzzle")) return;
    unlockClicks += 1;
    clearTimeout(unlockTimer);
    if (unlockClicks >= 5) {
      unlockArmed = true;
      unlockTimer = window.setTimeout(() => {
        unlockClicks = 0;
        unlockArmed = false;
      }, 12000);
    } else {
      unlockTimer = window.setTimeout(() => {
        unlockClicks = 0;
        unlockArmed = false;
      }, 5000);
    }
  });

  document.addEventListener("keydown", event => {
    if (unlockArmed && event.key.toLowerCase() === "x" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      unlockClicks = 0;
      unlockArmed = false;
      clearTimeout(unlockTimer);
      openMaker();
      return;
    }
    const packBuilderModal = document.getElementById("makerPackBuilderModal");
    if (event.key === "Escape" && packBuilderModal && !packBuilderModal.hidden) return;
    if (event.key === "Escape" && solverModal && !solverModal.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeSolverDialog();
      return;
    }
    if (event.key === "Escape" && !modal.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeMaker();
    }
  }, { capture: true });

  window.addEventListener("boxxy-maker-solution-found", event => {
    const route = String(event?.detail?.route || "").replace(/[^UDLR]/gi, "").toUpperCase();
    if (!route) return;
    const levelText = currentLevelText();
    const verification = verifySolverRoute(levelText, route);
    if (!verification.valid || !verification.solved) {
      setStatus(`The completed route could not be attached: ${verification.error || "it did not solve the editor puzzle."}`, "error");
      return;
    }
    setAttachedSolution(verification.route, levelText, currentPuzzleRef);
    const savedAutomatically = persistAttachedSolutionToLoadedSave();
    const automatic = Boolean(event?.detail?.automatic);
    setStatus(savedAutomatically
      ? `${automatic ? "Your test route" : "The applied route"} has been saved as a ${verification.moves}-move guided solve and synchronised with linked pack drafts.`
      : automatic
        ? `Your ${verification.moves}-move test route has been added as the guided solve. Save the level to keep it.`
        : `Applied your ${verification.moves}-move test route as the puzzle's guided solve. Save the level to keep it.`, "success");
  });

  function loadPackBuilderRequest(detail) {
    const sourceSaveId = String(detail?.sourceSaveId || "");
    const record = sourceSaveId ? readSavedLevels().find(item => item.id === sourceSaveId) : null;
    if (record) {
      renderSavedLevels(record.id);
      savedSelect.value = record.id;
      loadSavedLevel();
      return true;
    }

    const layout = Array.isArray(detail?.layout) ? detail.layout.map(row => String(row)) : [];
    if (!layout.length || !layout.some(row => row.trim())) return false;
    try {
      const detailRainbowMode = Boolean(detail?.rainbowMode) || goalColourDataPresent(detail?.goalColours);
      importRows(layout, { quiet: true, goalColours: detail?.goalColours, rainbowMode: detailRainbowMode });
      clearActiveSave();
      currentPuzzleRef = null;
      const name = String(detail?.name || "Pack puzzle").trim().slice(0, 48) || "Pack puzzle";
      if (saveNameInput) saveNameInput.value = name;
      setAttachedSolution(String(detail?.solution || ""), currentLevelText(), null);
      setStatus(`Opened “${name}” as an unsaved pack puzzle.`, "success");
      return true;
    } catch (_) {
      return false;
    }
  }

  window.addEventListener("boxxy-pack-builder-edit-level", event => {
    openMaker();
    if (!loadPackBuilderRequest(event?.detail)) {
      setStatus("That pack puzzle could not be opened in the Level Maker.", "error");
      return;
    }
    setStatus(`Editing “${String(event?.detail?.name || saveNameInput?.value || "pack puzzle")}”. Pack-only name and author changes remain in the Pack Builder.`, "success");
  });

  window.addEventListener("boxxy-pack-builder-play-level", event => {
    openMaker();
    if (!loadPackBuilderRequest(event?.detail)) {
      setStatus("That pack puzzle could not be prepared for play.", "error");
      return;
    }
    const validation = validate();
    if (!validation.ok) {
      setStatus(validation.error, "error");
      return;
    }
    const displayName = String(event?.detail?.name || saveNameInput?.value || "Pack Puzzle").trim() || "Pack Puzzle";
    const result = window.BoxxyGameAPI?.startMakerTest?.(
      validation.rows,
      solutionMatchesCurrentBoard() ? currentSolution : String(event?.detail?.solution || ""),
      { name: displayName, goalColours: exportGoalColourMap() }
    );
    if (!result?.ok) {
      setStatus(result?.error || "The game could not load this pack puzzle.", "error");
      return;
    }
    setStatus(`Playing “${displayName}”.`, "success");
    exitTestBtn.hidden = false;
    closeMaker();
  });

  document.addEventListener("fullscreenchange", () => {
    updateMakerFullscreenButton();
    scheduleGridFit();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    updateMakerFullscreenButton();
    scheduleGridFit();
  });
  window.addEventListener("boxxy-maker-return", openMaker);
  window.addEventListener("resize", scheduleGridFit);
  window.addEventListener("orientationchange", scheduleGridFit);
  if (gridShell && "ResizeObserver" in window) {
    const makerResizeObserver = new ResizeObserver(scheduleGridFit);
    makerResizeObserver.observe(gridShell);
  }

  setActiveGoalColour(DEFAULT_GOAL_COLOUR);
  selectTool("wall");
  makeRoom(10, 10, false);
  setRainbowMode(readRainbowPreference(), { persist: false });
  boxesInput.value = "3";
  renderSavedLevels();
  populateExistingPacks();
})();
