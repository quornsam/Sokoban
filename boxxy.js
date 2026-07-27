/*
 * BOXXY — Pushbox Puzzle
 * Copyright © 2026 Sam Cornwell. All rights reserved.
 * Personal non-commercial use only. See LICENSE.md.
 */
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

/* BOXXY v176 — pack completion celebrations, aggregate totals and coloured header stars. */
/* BOXXY v175 — reliable queued cookieless PostHog analytics; no autocapture or session recording. */
/* BOXXY v168 — Rainbow Mode with pack-preview and walkthrough colour preservation. */
(() => {
  "use strict";
  const DEFAULT = "red";
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

  function spritePath(type, colour) {
    const clean = normalise(colour);
    return `assets/board/${type === "goal" ? "goals/goal" : "boxes/box"}-${clean}.png`;
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

  const preloadImages = [];
  if (typeof Image !== "undefined") {
    for (const colour of ORDER) {
      for (const type of ["goal", "box"]) {
        const image = new Image();
        image.decoding = "async";
        image.src = spritePath(type, colour);
        preloadImages.push(image);
      }
    }
    const yellow = new Image();
    yellow.decoding = "async";
    yellow.src = "assets/board/boxes/box-default-yellow.png";
    preloadImages.push(yellow);
  }
  window.BoxxyColourSpritesReady = Promise.allSettled(preloadImages.map(image => image.decode?.() || Promise.resolve()));
  window.BoxxyGoalColours = Object.freeze({
    DEFAULT, ORDER, PALETTE, normalise, normaliseMap, style,
    spritePath, decodeTextChar, isTextCode, encodeTextCell
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
      ["Black", "#161619"], ["Charcoal", "#292829"], ["Graphite", "#4b4a4d"],
      ["Navy", "#33435d"], ["Denim", "#4b6684"], ["Pale denim", "#8da9c2"],
      ["Cobalt", "#294e83"], ["Sky blue", "#9bc3df"], ["Chocolate", "#624431"],
      ["Tan", "#957151"], ["Sand", "#c9ae80"], ["Cream", "#e7d8b8"],
      ["Bottle green", "#365447"], ["Olive", "#626442"], ["Pale sage", "#aebd9e"],
      ["Stone", "#b5a78d"], ["Light grey", "#c8c5c0"], ["Warm white", "#ece5da"],
      ["Burgundy", "#68383b"], ["Plum", "#5d405d"], ["Pale pink", "#d9a8ae"],
      ["Pale yellow", "#ded29a"], ["Lilac", "#b8a8c8"], ["Aqua", "#92c8c1"]
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

  const ready = Promise.all(FRAMES.map(frame => loadFrame(frame, style.bodyType, activeTheme())))
    .then(() => Promise.all(FRAMES.map(frame => renderFrameUrl(frame))))
    .then(() => {
      document.querySelectorAll("canvas[data-character-preview]").forEach(canvas => {
        canvases.add(canvas);
        draw(canvas, canvas.dataset.characterPreview || "player-front");
      });
    }).catch(error => console.error("Character style assets could not be prepared.", error));

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
  const SHARED_PUZZLE_PAYLOAD = window.BoxxyShareCodec?.readLocation?.() || null;
  const PRIMARY_PACK_ID = PACKS[0]?.id || "microban";
  const MICROBAN_PACK_ID = "microban";
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
    if (!pack?.id || !Number.isInteger(index) || index < 0) return;
    const data = readPackCompletionStats(pack.id);
    const key = String(index);
    if (data.levels[key]) return;
    data.levels[key] = {
      moves: Math.max(0, Number(result.moves) || 0),
      pushes: Math.max(0, Number(result.pushes) || 0),
      seconds: Math.max(0, Number(result.seconds) || 0),
      guided: Boolean(result.guided),
      completedAt: Number(result.completedAt) || Date.now()
    };
    writePackCompletionStats(pack.id, data);
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
      if (record && typeof record === "object") {
        recordedLevels++;
        if (Number.isFinite(Number(record.moves))) {
          moves += Math.max(0, Number(record.moves));
          moveLevels++;
        }
        if (Number.isFinite(Number(record.pushes))) {
          pushes += Math.max(0, Number(record.pushes));
          pushLevels++;
        }
        if (Number.isFinite(Number(record.seconds))) {
          seconds += Math.max(0, Number(record.seconds));
          timeLevels++;
        }
        return;
      }
      const best = bestMovesForPack(pack, level);
      if (best != null) {
        moves += Math.max(0, best);
        moveLevels++;
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
    const unavailable = makerTesting || sharedPuzzleMode;
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
    if (makerTesting || sharedPuzzleMode || completed || autoplayRunning) return;
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
  const minimumEl = document.getElementById("minimum");
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
  const levelButtons = document.getElementById("levelButtons");
  const levelCloseBtn = document.getElementById("levelCloseBtn");
  const levelResetBtn = document.getElementById("levelResetBtn");
  const collectionCompleteStar = document.getElementById("collectionCompleteStar");
  const completedPackStars = document.getElementById("completedPackStars");
  const grandCelebration = document.getElementById("grandCelebration");
  const resetConfirmModal = document.getElementById("resetConfirmModal");
  const resetConfirmBtn = document.getElementById("resetConfirmBtn");
  const resetCancelBtn = document.getElementById("resetCancelBtn");
  const modal = document.getElementById("completeModal");
  const completeText = document.getElementById("completeText");
  const packCompletionStats = document.getElementById("packCompletionStats");
  const packTotalMoves = document.getElementById("packTotalMoves");
  const packTotalPushes = document.getElementById("packTotalPushes");
  const packTotalTime = document.getElementById("packTotalTime");
  const packStatsNote = document.getElementById("packStatsNote");
  const completeTitle = document.getElementById("completeTitle");
  const completeKicker = modal?.querySelector(".complete-kicker");
  const completeCard = modal?.querySelector(".complete-card");
  const completeSprite = document.getElementById("completeSprite");
  const nextBtn = document.getElementById("nextBtn");
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
  const packModal = document.getElementById("packModal");
  const packGrid = document.getElementById("packGrid");
  const packCloseBtn = document.getElementById("packCloseBtn");
  const celebration = document.getElementById("celebration");
  const board = document.getElementById("board");
  const boardWrap = document.querySelector(".board-wrap");
  const bgDecor = document.getElementById("bgDecor");
  const app = document.querySelector(".app");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
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
  let blockedPushHeld = false;
  let soundOn = true;
  let musicOn = localStorage.getItem("push-bauhaus-music") !== "off";
  let audioCtx = null;
  let autoplayRunning = false;
  let autoplayTimer = null;
  let guidedSolveUsed = false;
  let easterClickCount = 0;
  let easterArmed = false;
  let easterResetTimer = null;
  let currentAnimation = "idle";
  let thoughtTimer = null;
  let lastThought = "";
  let recentThoughts = [];
  let currentCheckpoint = null;
  let recentThoughtParts = Object.create(null);
  let thoughtReady = false;
  let audioUnlocked = false;
  let konamiIndex = 0;
  let backgroundDecorBuilt = false;
  let backgroundFadeTimer = null;
  let backgroundBuildNonce = 0;
  let completedLevels = new Set();
  let assistedLevels = new Set();
  let highestUnlockedLevel = 0;

  /* BOXXY v175 — deliberately limited, anonymous gameplay analytics.
     No puzzle layouts, typed names, email addresses or editor content are sent. */
  const BOXXY_ANALYTICS_VERSION = 176;

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
        game_version: BOXXY_ANALYTICS_VERSION,
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
    if (collectionName) collectionName.innerHTML = "BAUHAUS<br>COLLECTION";
    document.querySelectorAll(".complete-kicker").forEach(el => {
      if (!el.closest("#levelMakerModal")) el.textContent = "BAUHAUS COLLECTION";
    });
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

  function configureFinalCompletionActions(pack = completionPackContext || activePack) {
    if (nextBtn) nextBtn.hidden = true;
    if (claimPrizeBtn) claimPrizeBtn.hidden = !activePackEarnsPrize(pack);
  }

  function restoreStandardCompletionActions() {
    if (nextBtn) nextBtn.hidden = false;
    if (claimPrizeBtn) claimPrizeBtn.hidden = true;
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

  function hidePackCompletionStats() {
    if (packCompletionStats) packCompletionStats.hidden = true;
    if (packStatsNote) packStatsNote.hidden = true;
  }

  function renderPackCompletionStats(pack) {
    if (!packCompletionStats || !pack) return;
    const totals = packCompletionTotals(pack);
    packCompletionStats.hidden = false;
    if (packTotalMoves) packTotalMoves.textContent = totals.moveLevels ? totals.moves.toLocaleString() : "—";
    if (packTotalPushes) packTotalPushes.textContent = totals.pushLevels ? totals.pushes.toLocaleString() : "—";
    if (packTotalTime) packTotalTime.textContent = totals.timeLevels ? formatPackDuration(totals.seconds) : "—";

    if (packStatsNote) {
      const missingDetailed = totals.recordedLevels < totals.levelCount;
      packStatsNote.hidden = !missingDetailed;
      packStatsNote.textContent = missingDetailed
        ? `Detailed pushes and time are recorded for ${totals.recordedLevels} of ${totals.levelCount} levels. Earlier completions did not store those figures.`
        : "";
    }
  }

  function closeCompleteModal() {
    if (modal) modal.hidden = true;
    restoreStandardCompletionActions();
    completeCard?.classList.remove("final-complete");
    completionPackContext = null;
    hidePackCompletionStats();
  }

  function packAccentColour(pack) {
    return PACK_ACCENT_COLOURS[String(pack?.accent || "black").toLowerCase()] || PACK_ACCENT_COLOURS.black;
  }

  function updateCompletedPackStars() {
    if (!completedPackStars) return;
    completedPackStars.innerHTML = "";
    const completedPacks = PACKS.filter(pack => packIsComplete(pack.id));
    completedPackStars.hidden = completedPacks.length === 0;

    completedPacks.forEach(pack => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "completed-pack-star";
      button.style.setProperty("--pack-star-colour", packAccentColour(pack));
      button.setAttribute("aria-label", `View congratulations for ${pack.displayName || pack.title}`);
      button.title = `View congratulations for ${pack.displayName || pack.title}`;
      button.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 6 62.7 34.2 93.5 37.5 70.5 58.3 77 88.5 50 73 23 88.5 29.5 58.3 6.5 37.5 37.3 34.2Z"/></svg>';
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
    collectionCompleteStar.hidden = !earned;
    collectionCompleteStar.setAttribute("aria-hidden", String(!earned));
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
    if (completeTitle) completeTitle.innerHTML = "WELL<br>DONE";
    if (completeText) {
      completeText.textContent = `You have completed ${pack.displayName}. Every level in this collection has been cleared.`;
    }
    renderPackCompletionStats(pack);

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

  function openLevelPicker() {
    updateCollectionCompleteStar();
    levelPicker.hidden = false;
  }

  function closeLevelPicker() {
    levelPicker.hidden = true;
  }

  function openPackModal() {
    if (!packModal) return;
    closeLevelPicker();
    buildPackSelectors();
    packModal.hidden = false;
    packCloseBtn?.focus({ preventScroll: true });
  }

  function closePackModal() {
    if (packModal) packModal.hidden = true;
  }

  function createPackButton(pack, index, compact = false) {
    const button = document.createElement("button");
    const isLocked = packIsLocked(pack);
    button.type = "button";
    button.className = `${compact ? "final-pack-option" : "pack-option"} pack-${pack.accent || "black"}`;
    button.dataset.packId = pack.id;
    if (pack.id === activePack.id) button.classList.add("active");
    if (isLocked) {
      button.classList.add("locked");
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    }

    const art = document.createElement("span");
    art.className = "final-pack-art";
    art.setAttribute("aria-hidden", "true");
    const shape = document.createElement("i");
    const number = document.createElement("b");
    number.textContent = String(index + 1).padStart(2, "0");
    art.append(shape, number);

    const name = document.createElement("span");
    name.className = "final-pack-name";
    name.append(document.createTextNode(pack.title));
    const meta = document.createElement("small");
    meta.textContent = `${pack.levels.length} LEVELS · ${String(pack.author || "").toUpperCase()}`;
    name.appendChild(meta);
    if (isLocked) {
      const lockText = document.createElement("em");
      lockText.className = "pack-lock-label";
      lockText.textContent = "COMPLETE BOXXY ORIGINAL OR MICROBAN";
      name.appendChild(lockText);
    }
    button.append(art, name);
    button.title = isLocked
      ? "Complete BOXXY Original Puzzle Pack or Microban Series to unlock this pack."
      : (pack.description || pack.displayName || pack.title);
    button.addEventListener("click", () => switchPack(pack.id));
    return button;
  }

  function buildPackSelectors(excludePackId = activePack.id) {
    if (packGrid) {
      packGrid.innerHTML = "";
      PACKS.forEach((pack, index) => packGrid.appendChild(createPackButton(pack, index, false)));
    }
    if (finalPackGrid) {
      finalPackGrid.innerHTML = "";
      PACKS.forEach((pack, index) => {
        if (pack.id !== excludePackId) finalPackGrid.appendChild(createPackButton(pack, index, true));
      });
    }
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

  function refreshLevelButtons() {
    [...levelButtons.children].forEach((button, index) => {
      const isCurrent = index === levelIndex;
      const isCompleted = completedLevels.has(index);
      const isAssisted = assistedLevels.has(index);
      const isLocked = index > highestUnlockedLevel;
      button.classList.toggle("current", isCurrent);
      button.classList.toggle("completed", isCompleted && !isCurrent && !isAssisted);
      button.classList.toggle("assisted", isAssisted && !isCurrent);
      button.classList.toggle("locked", isLocked);
      button.disabled = isLocked;
      button.setAttribute("aria-disabled", String(isLocked));
      button.title = isLocked
        ? `Complete level ${index} to unlock level ${index + 1}`
        : `${activePack.displayName}: ${index + 1}. ${LEVELS[index].name}`;
    });
    updateCollectionCompleteStar();
  }

  let splashStartedAt = performance.now();
  let splashDismissed = false;

  function hideSplashScreen(){
    if (!splashScreen || splashDismissed) return;
    splashDismissed = true;
    splashScreen.classList.add("hide");
    window.setTimeout(() => { splashScreen.hidden = true; }, 700);
  }

  function scheduleSplashHide(){
    if (!splashScreen || splashDismissed) return;
    const minVisible = 1500;
    const elapsed = performance.now() - splashStartedAt;
    const wait = Math.max(0, minVisible - elapsed);
    window.setTimeout(hideSplashScreen, wait);
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

  function updateFullscreenButton() {
    if (!fullscreenBtn) return;
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    fullscreenBtn.hidden = !desktop || !fullscreenSupported();
    const active = Boolean(fullscreenElement());
    const icon = fullscreenBtn.querySelector("span");
    const label = fullscreenBtn.querySelector("b");
    if (icon) icon.textContent = active ? "⤢" : "⛶";
    if (label) label.textContent = active ? "EXIT" : "FULL SCREEN";
    fullscreenBtn.setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen");
    fullscreenBtn.title = active ? "Exit full screen" : "Enter full screen";
    fullscreenBtn.setAttribute("aria-pressed", String(active));
  }

  async function toggleFullscreen() {
    try {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else {
        const root = document.documentElement;
        const enter = root.requestFullscreen || root.webkitRequestFullscreen;
        if (enter) await enter.call(root);
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
    requestAnimationFrame(() => requestAnimationFrame(resizeBoard));
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
    finish() { tone(392, .1, "triangle", .035); tone(523, .12, "triangle", .035, .12); tone(784, .18, "triangle", .04, .27); }
  };

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
    minimumEl.textContent = (makerTesting || sharedPuzzleMode) ? "—" : (levelData.minimum ?? "—");
    levelCount.textContent = sharedPuzzleMode ? "SHARED" : makerTesting ? "MAKER" : `${levelIndex + 1} / ${LEVELS.length}`;
    const best = (makerTesting || sharedPuzzleMode) ? null : readBest(levelData);
    bestEl.textContent = best || "—";
    undoBtn.disabled = !history.length || completed;
    updateSavePositionButton();
    refreshLevelButtons();
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

  function loadLevel(index, preserveAutoplay = false, preserveBackground = false) {
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
    restoreStandardCompletionActions();
    completeCard?.classList.remove("final-complete");
    if (finalPackPicker) finalPackPicker.hidden = true;
    if (finalPackStatus) finalPackStatus.textContent = "";
    if (completeKicker) completeKicker.textContent = activePack.title;
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

  function move(dx, dy, holdBlocked = false, fromAutoplay = false) {
    if (completed || (autoplayRunning && !fromAutoplay)) return;
    ensureAudio();
    clearTimeout(animTimer);
    const attemptedFacing = DELTA_TO_FACING(dx, dy);
    const nx = player[0] + dx;
    const ny = player[1] + dy;

    if (blocked(nx, ny)) {
      facing = attemptedFacing;
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
        facing = attemptedFacing;
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
      facing = attemptedFacing;
      sfx.push();
      if (isGoal(bx, by)) sfx.goal();
      render("pushing");
    } else {
      blockedPushHeld = false;
      history.push(snapshot());
      boxes.forEach(box => { box.moving = false; });
      player = [nx, ny];
      moves++;
      facing = attemptedFacing;
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
    if (!makerTesting && !sharedPuzzleMode) clearCurrentCheckpoint();

    if (sharedPuzzleMode) {
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
        if (completeTitle) completeTitle.innerHTML = "WELL<br>DONE";
        completeText.textContent = `You have completed ${activePack.displayName}. Level ${LEVELS.length} was solved in ${moves} moves and ${pushes} pushes.${solvedWithWalkthrough ? " This completion used the guided solve." : ""}${learnedRoute ? " Your route has been saved as this level's guided solve." : ""}${unlockedAdditionalPacksNow ? " The additional puzzle packs are now unlocked." : ""}`;
        renderPackCompletionStats(activePack);
        buildPackSelectors(activePack.id);
        if (finalPackPicker) finalPackPicker.hidden = false;
        if (finalPackStatus) finalPackStatus.textContent = solvedWithWalkthrough ? "Guided-solve completions are shown in yellow in the level list." : "";
        configureFinalCompletionActions(activePack);
      } else {
        completeMode = "normal";
        completionPackContext = null;
        hidePackCompletionStats();
        restoreStandardCompletionActions();
        completeCard?.classList.remove("final-complete");
        if (finalPackPicker) finalPackPicker.hidden = true;
        if (finalPackStatus) finalPackStatus.textContent = solvedWithWalkthrough ? "Guided-solve completions are marked yellow in the level list." : "";
        if (completeKicker) completeKicker.textContent = activePack.title;
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
      modal.hidden = false;
      render("idle");
      if (grandCelebrationPack) grandBurst(grandCelebrationPack);
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

  function buildLevelButtons() {
    levelButtons.innerHTML = "";
    LEVELS.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = index + 1;
      button.addEventListener("click", () => {
        if (index > highestUnlockedLevel) return;
        closeLevelPicker();
        loadLevel(index);
      });
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
    if (checkKonamiCode(event.key)) {
      event.preventDefault();
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
  window.addEventListener("characterstylechange", () => requestAnimationFrame(refreshPlayerVisual));
  window.addEventListener("pageshow", () => requestAnimationFrame(refreshPlayerVisual));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestAnimationFrame(refreshPlayerVisual);
  });
  autoSolveBtn.addEventListener("click", startAutoplay);
  cancelGuidedBtn?.addEventListener("click", cancelGuidedSolve);
  fullscreenBtn?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => { updateFullscreenButton(); scheduleBoardResize(); });
  document.addEventListener("webkitfullscreenchange", () => { updateFullscreenButton(); scheduleBoardResize(); });
  window.addEventListener("resize", () => { updateFullscreenButton(); scheduleBoardResize(); });
  window.addEventListener("orientationchange", scheduleBoardResize);

  undoBtn.addEventListener("click", undo);
  savePositionBtn?.addEventListener("click", saveOrRestorePosition);
  restartBtn.addEventListener("click", () => {
    if (makerTesting || sharedPuzzleMode) restartMakerTest();
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
  packCloseBtn?.addEventListener("click", closePackModal);
  packModal?.addEventListener("click", event => { if (event.target === packModal) closePackModal(); });
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

  completeCloseBtn?.addEventListener("click", closeCompleteModal);
  claimPrizeBtn?.addEventListener("click", openPrizeModal);
  prizeCloseBtn?.addEventListener("click", closePrizeModal);
  prizeModal?.addEventListener("click", event => {
    if (event.target === prizeModal) closePrizeModal();
  });
  modal?.addEventListener("click", event => {
    if (event.target === modal && completeMode === "final") closeCompleteModal();
  });

  nextBtn.addEventListener("click", () => {
    if (completeMode === "shared") {
      modal.hidden = true;
      restartMakerTest();
      return;
    }
    if (completeMode === "maker") {
      modal.hidden = true;
      window.dispatchEvent(new CustomEvent("boxxy-maker-return"));
      return;
    }
    if (completeMode === "final") {
      modal.hidden = true;
      openLevelPicker();
      return;
    }
    captureBoxxyAnalytics("next_level_pressed", currentLevelAnalytics({
      next_level_number: Number(levelIndex) + 2
    }));
    loadLevel(levelIndex + 1);
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (prizeModal && !prizeModal.hidden) {
      closePrizeModal();
      return;
    }
    if (modal && !modal.hidden && completeMode === "final") closeCompleteModal();
  });

  let swipe = null;
  pieceLayer.addEventListener("dragstart", event => event.preventDefault());

  board.addEventListener("pointerdown", event => {
    ensureAudio();
    const mouseLike = event.pointerType === "mouse" || event.pointerType === "";
    if (mouseLike && event.button === 0 && pointerIsOnCharacter(event)) registerEasterClick();
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId, triggered: false };
    board.setPointerCapture?.(event.pointerId);
  });
  board.addEventListener("pointermove", event => {
    if (!swipe || swipe.id !== event.pointerId || swipe.triggered) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    swipe.triggered = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0, true);
    else move(0, dy > 0 ? 1 : -1, true);
  });
  board.addEventListener("pointerup", event => {
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

  applyTheme(currentTheme, false);
  loadLevelProgress();
  buildLevelButtons();
  buildPackSelectors();
  Promise.resolve(window.CharacterStyler?.ready).finally(() => {
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
  });

  if (document.readyState === "complete") {
    scheduleSplashHide();
  } else {
    window.addEventListener("load", () => {
      requestAnimationFrame(() => requestAnimationFrame(scheduleSplashHide));
    }, { once: true });
    window.setTimeout(scheduleSplashHide, 3200);
  }

})();

(() => {
  "use strict";

  const modal = document.getElementById("levelMakerModal");
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
    scheduleGridFit();
    closeBtn.focus({ preventScroll: true });
  }

  function closeMaker() {
    if (solverRunning) cancelSolverSearch();
    if (solverModal) solverModal.hidden = true;
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
