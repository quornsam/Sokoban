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

/* BOXXY v119 — character renderer, game engine, level maker and pure FESS puzzle solving. */
(() => {
  "use strict";

  const FRAMES = [
    "player-front", "player-back", "player-left", "player-right",
    "walk-front", "walk-back", "walk-left", "walk-right",
    "push-front", "push-back", "push-left", "push-right"
  ];
  const CATEGORIES = ["tshirt", "trousers", "hair", "skin", "shoes"];
  const BODY_TYPES = ["boy", "girl"];
  const THEMES = ["bauhaus"];
  const SHEET_COLS = 4;
  const FRAME_WIDTH = 600;
  const FRAME_HEIGHT = 520;
  const ASSET_REVISION = "93";
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
    const root = `assets/characters/${bodyType}`;
    const promise = Promise.all([
      loadImage(`${root}/base.png?v=${ASSET_REVISION}`),
      ...CATEGORIES.map(category => loadImage(`${root}/${category}.png?v=${ASSET_REVISION}`))
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

  const ready = Promise.all(THEMES.flatMap(theme => [
    ...FRAMES.map(frame => loadFrame(frame, "boy", theme)),
    ...FRAMES.map(frame => loadFrame(frame, "girl", theme))
  ])).then(() => {
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

  function drawNow(canvas, frame, assets) {
    if (!canvas || !assets) return;
    if (!canvas.isConnected && !canvas.closest?.(".piece")) return;
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
      drawTintedLayer(context, assets.layers[category], style[category], width, height);
    }
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
  }

  function draw(canvas, frame = "player-front") {
    if (!canvas) return Promise.resolve();
    canvases.add(canvas);
    canvas.dataset.characterFrame = frame;
    const theme = activeTheme();
    const cacheKey = `${theme}:${style.bodyType}:${frame}`;
    const assets = resolvedAssets.get(cacheKey);
    if (assets) {
      drawNow(canvas, frame, assets);
      return Promise.resolve();
    }
    return loadFrame(frame, style.bodyType, theme).then(loaded => drawNow(canvas, frame, loaded));
  }

  function updateStyleIcon() {
    const shirt = document.querySelector("#styleOutfitIcon .style-shirt-body");
    const trousers = document.querySelector("#styleOutfitIcon .style-trousers-body");
    if (shirt) shirt.style.fill = style.tshirt;
    if (trousers) trousers.style.fill = style.trousers;
  }

  function redrawAll() {
    updateStyleIcon();
    for (const canvas of [...canvases]) {
      if (!canvas.isConnected) {
        canvases.delete(canvas);
        continue;
      }
      draw(canvas, canvas.dataset.characterFrame || canvas.dataset.characterPreview || "player-front");
    }
    window.dispatchEvent(new CustomEvent("characterstylechange", { detail: { ...style } }));
  }

  function set(category, colour) {
    if (category === "bodyType") {
      if (!BODY_TYPES.includes(colour) || style.bodyType === colour) return;
      style.bodyType = colour;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
      updateSelectedSwatches();
      redrawAll();
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
  const styleBtn = document.getElementById("styleBtn");
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

  styleBtn?.addEventListener("click", openModal);
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
    redrawAll,
    set,
    reset,
    get style() { return { ...style }; },
    get isOpen() { return Boolean(styleModal && !styleModal.hidden); }
  };
})();

(() => {
  "use strict";

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
  const PRIMARY_PACK_ID = PACKS[0]?.id || "microban";
  const ADDITIONAL_PACKS_UNLOCK_KEY = "boxxy-additional-packs-unlocked-v1";
  const packStorageKeyFor = (packId, suffix) => `boxxy-pack-${packId}-${suffix}-v1`;

  function primaryPackIsComplete() {
    if (localStorage.getItem(ADDITIONAL_PACKS_UNLOCK_KEY) === "true") return true;
    const primaryPack = PACK_BY_ID.get(PRIMARY_PACK_ID);
    if (!primaryPack?.levels?.length) return true;

    const finalIndex = primaryPack.levels.length - 1;
    let completed = [];
    try {
      const currentRaw = localStorage.getItem(packStorageKeyFor(primaryPack.id, "completed"));
      const legacyRaw = primaryPack.id === "microban" ? localStorage.getItem("boxxy-completed-levels-v1") : null;
      completed = JSON.parse(currentRaw ?? legacyRaw ?? "[]");
    } catch (_) {}

    const finalLevel = primaryPack.levels[finalIndex];
    const currentBest = finalLevel
      ? localStorage.getItem(packStorageKeyFor(primaryPack.id, `best-${finalLevel.sourceNumber}`))
      : null;
    const legacyBest = primaryPack.id === "microban" && finalLevel
      ? localStorage.getItem(`push-bauhaus-v22-best-${finalLevel.sourceNumber}`)
      : null;

    const complete = (Array.isArray(completed) && completed.map(Number).includes(finalIndex)) || Boolean(currentBest || legacyBest);
    if (complete) localStorage.setItem(ADDITIONAL_PACKS_UNLOCK_KEY, "true");
    return complete;
  }

  function additionalPacksUnlocked() {
    return primaryPackIsComplete();
  }

  const savedPackId = localStorage.getItem("boxxy-active-pack-v1");
  let activePack = PACK_BY_ID.get(savedPackId) || PACKS[0];
  if (activePack.id !== PRIMARY_PACK_ID && !additionalPacksUnlocked()) {
    activePack = PACK_BY_ID.get(PRIMARY_PACK_ID) || PACKS[0];
    localStorage.setItem("boxxy-active-pack-v1", activePack.id);
  }
  let LEVELS = Array.isArray(activePack.levels) ? activePack.levels : [];

  const packStorageKey = suffix => packStorageKeyFor(activePack.id, suffix);
  const currentLevelStorageKey = () => packStorageKey("level");
  const currentProgressStorageKey = () => packStorageKey("progress");
  const currentCompletedStorageKey = () => packStorageKey("completed");
  const currentAssistedStorageKey = () => packStorageKey("assisted");
  const currentBestStorageKey = level => packStorageKey(`best-${level.sourceNumber}`);

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
  const soundBtn = document.getElementById("soundBtn");
  const musicBtn = document.getElementById("musicBtn");
  const bgMusic = document.getElementById("bgMusic");
  const levelBtn = document.getElementById("levelBtn");
  const levelPicker = document.getElementById("levelPicker");
  const levelButtons = document.getElementById("levelButtons");
  const levelCloseBtn = document.getElementById("levelCloseBtn");
  const levelResetBtn = document.getElementById("levelResetBtn");
  const resetConfirmModal = document.getElementById("resetConfirmModal");
  const resetConfirmBtn = document.getElementById("resetConfirmBtn");
  const resetCancelBtn = document.getElementById("resetCancelBtn");
  const modal = document.getElementById("completeModal");
  const completeText = document.getElementById("completeText");
  const completeTitle = document.getElementById("completeTitle");
  const completeKicker = modal?.querySelector(".complete-kicker");
  const completeCard = modal?.querySelector(".complete-card");
  const nextBtn = document.getElementById("nextBtn");
  const nextBtnLabel = nextBtn?.querySelector("span");
  const nextBtnIcon = nextBtn?.querySelector("b");
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
  let makerLayout = null;
  let makerSolution = "";
  let completeMode = "normal";
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
  let easterClickCount = 0;
  let easterArmed = false;
  let easterResetTimer = null;
  let currentAnimation = "idle";
  let thoughtTimer = null;
  let lastThought = "";
  let recentThoughts = [];
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

  function openLevelPicker() {
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
    const isLocked = pack.id !== PRIMARY_PACK_ID && !additionalPacksUnlocked();
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
      lockText.textContent = `COMPLETE ${PACKS[0].title} TO UNLOCK`;
      name.appendChild(lockText);
    }
    button.append(art, name);
    button.title = isLocked
      ? `Complete ${PACKS[0].displayName} to unlock this pack.`
      : (pack.description || pack.displayName || pack.title);
    button.addEventListener("click", () => switchPack(pack.id));
    return button;
  }

  function buildPackSelectors() {
    if (packGrid) {
      packGrid.innerHTML = "";
      PACKS.forEach((pack, index) => packGrid.appendChild(createPackButton(pack, index, false)));
    }
    if (finalPackGrid) {
      finalPackGrid.innerHTML = "";
      PACKS.forEach((pack, index) => {
        if (pack.id !== activePack.id) finalPackGrid.appendChild(createPackButton(pack, index, true));
      });
    }
  }

  function switchPack(packId) {
    const nextPack = PACK_BY_ID.get(packId);
    if (!nextPack || !Array.isArray(nextPack.levels) || !nextPack.levels.length) return;
    if (nextPack.id !== PRIMARY_PACK_ID && !additionalPacksUnlocked()) {
      if (finalPackStatus) finalPackStatus.textContent = `Complete ${PACKS[0].displayName} to unlock the additional level packs.`;
      return;
    }
    if (nextPack.id === activePack.id) {
      closePackModal();
      if (modal) modal.hidden = true;
      return;
    }

    localStorage.setItem(currentLevelStorageKey(), String(levelIndex));
    activePack = nextPack;
    LEVELS = nextPack.levels;
    localStorage.setItem("boxxy-active-pack-v1", activePack.id);
    levelIndex = storedLevelIndexForPack(activePack);
    completedLevels = new Set();
    highestUnlockedLevel = 0;
    loadLevelProgress();
    buildLevelButtons();
    closePackModal();
    closeLevelPicker();
    if (modal) modal.hidden = true;
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
    LEVELS.forEach((level) => {
      localStorage.removeItem(currentBestStorageKey(level));
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
  const themeAsset = (kind) => `assets/board/${kind}`;
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

  function parseLayout(rows) {
    const h = rows.length;
    const w = Math.max(...rows.map(row => row.length));
    const grid = rows.map(row => row.padEnd(w, "").split(""));
    const parsedWalls = new Set();
    const explicitFloor = new Set();
    const parsedGoals = [];
    const parsedBoxes = [];
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
          if (".*+".includes(ch)) parsedGoals.push([x, y]);
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
    bump() { noise(.045, .025, 420); tone(88, .055, "square", .014, 0, 65); },
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
    goals.forEach((goal, index) => {
      const cell = document.createElement("div");
      cell.className = "cell goal";
      cell.style.cssText = posStyle(goal.x, goal.y, depth(goal.y, "goal"));
      const art = document.createElement("span");
      art.className = "board-art board-art-goal";
      art.setAttribute("aria-hidden", "true");
      cell.appendChild(art);
      goalLayer.appendChild(cell);
    });
  }

  function isGoal(x, y) {
    return goals.some(goal => goal.x === x && goal.y === y);
  }

  function sprite(mode = "idle", direction = "front") {
    const prefix = mode === "walk" ? "walk" : mode === "push" ? "push" : "player";
    return `assets/${prefix}-${direction}.png`;
  }

  function render(anim = "idle") {
    currentAnimation = anim;
    pieceLayer.innerHTML = "";
    boxes.forEach(box => {
      const onGoal = isGoal(box.x, box.y);
      const piece = document.createElement("div");
      piece.className = `piece box${onGoal ? " on-goal" : ""}${anim === "push" && box.moving ? " pushing" : ""}`;
      piece.style.cssText = posStyle(box.x, box.y, depth(box.y, "box"));
      const art = document.createElement("span");
      art.className = `board-art board-art-box ${onGoal ? "board-art-box-red" : "board-art-box-yellow"}`;
      art.setAttribute("aria-hidden", "true");
      piece.appendChild(art);
      pieceLayer.appendChild(piece);
    });

    const playerPiece = document.createElement("div");
    playerPiece.className = `piece player facing-${facing}${anim && anim !== "idle" ? " " + anim : ""}`;
    playerPiece.style.cssText = posStyle(player[0], player[1], depth(player[1], "player"));
    const playerCanvas = document.createElement("canvas");
    playerCanvas.width = 600;
    playerCanvas.height = 520;
    playerCanvas.setAttribute("aria-hidden", "true");
    const framePath = sprite(anim === "walking" ? "walk" : anim === "pushing" ? "push" : "idle", facing);
    const frameName = framePath.replace(/^assets\//, "").replace(/\.png$/, "");
    playerCanvas.dataset.characterFrame = frameName;
    playerPiece.appendChild(playerCanvas);
    window.CharacterStyler?.draw(playerCanvas, frameName);
    pieceLayer.appendChild(playerPiece);

    movesEl.textContent = moves;
    pushesEl.textContent = pushes;
    minimumEl.textContent = makerTesting ? "—" : (levelData.minimum ?? "—");
    levelCount.textContent = makerTesting ? "MAKER" : `${levelIndex + 1} / ${LEVELS.length}`;
    const best = makerTesting ? null : readBest(levelData);
    bestEl.textContent = best || "—";
    undoBtn.disabled = !history.length || completed;
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
          playerNode.animate([
            { transform: "translateX(-50%)" },
            { transform: "translateX(-50%) translateY(-2%)" },
            { transform: "translateX(-50%)" }
          ], { duration: 700, easing: "ease-in-out" });
        }
      }
    }, 5500);
  }

  function loadLevel(index, preserveAutoplay = false, preserveBackground = false) {
    makerTesting = false;
    makerLayout = null;
    makerSolution = "";
    document.body.classList.remove("maker-testing");
    if (makerReturnBtn) makerReturnBtn.hidden = true;
    const requestedIndex = (index + LEVELS.length) % LEVELS.length;
    if (!preserveAutoplay && requestedIndex > highestUnlockedLevel) return;
    if (!preserveAutoplay) stopAutoplay();
    resetEasterEgg();
    blockedPushHeld = false;
    clearTimeout(animTimer);
    levelIndex = requestedIndex;
    localStorage.setItem(currentLevelStorageKey(), String(levelIndex));
    if (activePack.id === "microban") localStorage.setItem("push-bauhaus-v33-level", levelIndex);
    const storedSolverRoute = window.BoxxySolutionStore?.get?.(activePack.id, levelIndex) || "";
    levelData = storedSolverRoute ? { ...LEVELS[levelIndex], solution: storedSolverRoute } : LEVELS[levelIndex];
    const parsed = parseLayout(levelData.layout);
    width = parsed.width;
    height = parsed.height;
    walls = parsed.walls;
    floor = parsed.floor;
    outside = parsed.outside;
    player = [...parsed.player];
    boxes = parsed.boxes.map(([x, y]) => ({ x, y, moving: false }));
    goals = parsed.goals.map(([x, y]) => ({ x, y }));
    moves = 0;
    pushes = 0;
    history = [];
    facing = "front";
    completed = false;
    completeMode = "normal";
    modal.hidden = true;
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
      : `${levelData.pushMinimum} ${levelData.pushMinimum === 1 ? "BOX" : "BOXES"}`;
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
  }

  function loadMakerTest(layoutRows, attachedSolution = "") {
    try {
      if (!Array.isArray(layoutRows) || !layoutRows.length) throw new Error("The level is empty.");
      const cleanRows = layoutRows.map(row => String(row));
      const parsed = parseLayout(cleanRows);
      stopAutoplay();
      closeLevelPicker();
      resetEasterEgg();
      blockedPushHeld = false;
      clearTimeout(animTimer);
      makerTesting = true;
      makerLayout = cleanRows.slice();
      makerSolution = String(attachedSolution || "").replace(/[^udlrUDLR]/g, "");
      completeMode = "normal";
      document.body.classList.add("maker-testing");
      if (makerReturnBtn) makerReturnBtn.hidden = false;
      levelData = {
        sourceNumber: "maker",
        name: "CUSTOM TEST",
        tier: "LEVEL MAKER",
        minimum: "—",
        pushMinimum: parsed.boxes.length,
        solution: makerSolution,
        layout: cleanRows
      };
      width = parsed.width;
      height = parsed.height;
      walls = parsed.walls;
      floor = parsed.floor;
      outside = parsed.outside;
      player = [...parsed.player];
      boxes = parsed.boxes.map(([x, y]) => ({ x, y, moving: false }));
      goals = parsed.goals.map(([x, y]) => ({ x, y }));
      moves = 0;
      pushes = 0;
      history = [];
      facing = "front";
      completed = false;
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
      creditTitle.textContent = "LEVEL MAKER · TEST";
      creditSub.textContent = `${width}×${height} · ${boxes.length} ${boxes.length === 1 ? "BOX" : "BOXES"}`;
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
      if (thoughtText) thoughtText.textContent = "Test the level. The workshop is one click away.";
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || "The level could not be loaded." };
    }
  }

  function restartMakerTest() {
    if (!makerTesting || !makerLayout) return;
    loadMakerTest(makerLayout, makerSolution);
  }

  function exitMakerTest() {
    if (!makerTesting) return;
    makerTesting = false;
    makerLayout = null;
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
      facing
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

    if (makerTesting) {
      completeMode = "maker";
      if (finalPackPicker) finalPackPicker.hidden = true;
      if (finalPackStatus) finalPackStatus.textContent = "";
      if (completeKicker) completeKicker.textContent = "LEVEL MAKER";
      if (completeTitle) completeTitle.innerHTML = "TEST<br>COMPLETE";
      completeText.textContent = `Custom level solved in ${moves} moves and ${pushes} pushes.`;
      if (nextBtnLabel) nextBtnLabel.textContent = "BACK TO MAKER";
      if (nextBtnIcon) nextBtnIcon.textContent = "←";
    } else {
      const solvedWithWalkthrough = autoplayRunning;
      const packsWereUnlocked = additionalPacksUnlocked();
      const bestKey = currentBestStorageKey(levelData);
      const oldBest = Number(readBest(levelData) || 0);
      if (!solvedWithWalkthrough && (!oldBest || moves < oldBest)) localStorage.setItem(bestKey, moves);

      completedLevels.add(levelIndex);
      if (solvedWithWalkthrough) assistedLevels.add(levelIndex);
      else assistedLevels.delete(levelIndex);
      highestUnlockedLevel = Math.max(highestUnlockedLevel, Math.min(levelIndex + 1, LEVELS.length - 1));
      saveLevelProgress();
      refreshLevelButtons();

      if (levelIndex === LEVELS.length - 1) {
        const unlockedAdditionalPacksNow = activePack.id === PRIMARY_PACK_ID && !packsWereUnlocked;
        if (activePack.id === PRIMARY_PACK_ID) localStorage.setItem(ADDITIONAL_PACKS_UNLOCK_KEY, "true");
        completeMode = "final";
        completeCard?.classList.add("final-complete");
        if (completeKicker) completeKicker.textContent = "CONGRATULATIONS";
        if (completeTitle) completeTitle.innerHTML = "WELL<br>DONE";
        completeText.textContent = `You have completed ${activePack.displayName}. Level ${LEVELS.length} was solved in ${moves} moves and ${pushes} pushes.${solvedWithWalkthrough ? " This completion used the walkthrough." : ""}${unlockedAdditionalPacksNow ? " The additional Bauhaus level packs are now unlocked." : ""}`;
        buildPackSelectors();
        if (finalPackPicker) finalPackPicker.hidden = false;
        if (finalPackStatus) finalPackStatus.textContent = solvedWithWalkthrough ? "Walkthrough-assisted completions are shown in yellow in the level list." : "";
        if (nextBtnLabel) nextBtnLabel.textContent = "CHOOSE A LEVEL";
        if (nextBtnIcon) nextBtnIcon.textContent = "✓";
      } else {
        completeMode = "normal";
        completeCard?.classList.remove("final-complete");
        if (finalPackPicker) finalPackPicker.hidden = true;
        if (finalPackStatus) finalPackStatus.textContent = solvedWithWalkthrough ? "Walkthrough-assisted completions are marked yellow in the level list." : "";
        if (completeKicker) completeKicker.textContent = activePack.title;
        if (completeTitle) completeTitle.innerHTML = solvedWithWalkthrough ? "WALKTHROUGH<br>USED" : "PUZZLE<br>CLEARED";
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
        completeText.textContent = solvedWithWalkthrough ? `${summary} This level is now counted as completed, and its button will appear in yellow.` : summary;
        if (nextBtnLabel) nextBtnLabel.textContent = "NEXT LEVEL";
        if (nextBtnIcon) nextBtnIcon.textContent = "→";
      }
    }

    burst();
    sfx.finish();
    setTimeout(() => {
      modal.hidden = false;
      render("idle");
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
  }

  function startAutoplay() {
    if (!desktopEasterEggAvailable() || autoplayRunning) return;
    stopAutoplay();
    loadLevel(levelIndex, true, true);
    autoplayRunning = true;
    document.body.classList.add("autoplaying");
    render("idle");
    const solution = levelData.solution;
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
      if (makerTesting) restartMakerTest();
      else loadLevel(levelIndex);
    }
  });

  document.addEventListener("keyup", event => {
    if (directionMap[event.key]) releaseBlockedPush();
  });
  window.addEventListener("blur", releaseBlockedPush);

  const buttonDirections = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  document.querySelectorAll("[data-dir]").forEach(button => {
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      ensureAudio();
      button.setPointerCapture?.(event.pointerId);
      move(...buttonDirections[button.dataset.dir], true);
    });
    button.addEventListener("pointerup", releaseBlockedPush);
    button.addEventListener("pointercancel", releaseBlockedPush);
    button.addEventListener("lostpointercapture", releaseBlockedPush);
  });



  function pointerIsOnCharacter(event) {
    if (!desktopEasterEggAvailable()) return false;
    const canvas = pieceLayer.querySelector(".player canvas");
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
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

  window.addEventListener("characterstylechange", () => render(currentAnimation));
  autoSolveBtn.addEventListener("click", startAutoplay);
  fullscreenBtn?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => { updateFullscreenButton(); scheduleBoardResize(); });
  document.addEventListener("webkitfullscreenchange", () => { updateFullscreenButton(); scheduleBoardResize(); });
  window.addEventListener("resize", () => { updateFullscreenButton(); scheduleBoardResize(); });
  window.addEventListener("orientationchange", scheduleBoardResize);

  undoBtn.addEventListener("click", undo);
  restartBtn.addEventListener("click", () => {
    if (makerTesting) restartMakerTest();
    else loadLevel(levelIndex);
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
    if (makerTesting) {
      window.dispatchEvent(new CustomEvent("boxxy-maker-return"));
      return;
    }
    if (levelPicker.hidden) openLevelPicker();
    else closeLevelPicker();
  });
  levelCloseBtn?.addEventListener("click", closeLevelPicker);
  levelResetBtn?.addEventListener("click", openResetConfirm);
  resetCancelBtn?.addEventListener("click", closeResetConfirm);
  resetConfirmBtn?.addEventListener("click", () => {
    closeResetConfirm();
    resetLevelProgress();
  });
  nextBtn.addEventListener("click", () => {
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
    loadLevel(levelIndex + 1);
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
    startMakerTest(layoutRows, attachedSolution = "") { return loadMakerTest(layoutRows, attachedSolution); },
    exitMakerTest() { exitMakerTest(); },
    restartMakerTest() { restartMakerTest(); },
    isMakerTesting() { return makerTesting; }
  };

  applyTheme(currentTheme, false);
  loadLevelProgress();
  buildLevelButtons();
  buildPackSelectors();
  Promise.resolve(window.CharacterStyler?.ready).finally(() => loadLevel(levelIndex));

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
  const generateBtn = document.getElementById("makerGenerateBtn");
  const resizeBtn = document.getElementById("makerResizeBtn");
  const roomBtn = document.getElementById("makerRoomBtn");
  const clearBtn = document.getElementById("makerClearBtn");
  const closeBtn = document.getElementById("makerCloseBtn");
  const importBtn = document.getElementById("makerImportBtn");
  const copyBtn = document.getElementById("makerCopyBtn");
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
  const solveBtn = document.getElementById("makerSolveBtn");
  const solverModal = document.getElementById("makerSolverModal");
  const solverCloseBtn = document.getElementById("makerSolverCloseBtn");
  const solverStartBtn = document.getElementById("makerSolverStartBtn");
  const solverCancelBtn = document.getElementById("makerSolverCancelBtn");
  const solverCopyBtn = document.getElementById("makerSolverCopyBtn");
  const solverApplyBtn = document.getElementById("makerSolverApplyBtn");
  const solverOutput = document.getElementById("makerSolutionOutput");
  const solverStatus = document.getElementById("makerSolverStatus");
  const solverProgressWrap = document.getElementById("makerSolverProgressWrap");
  const solverProgress = document.getElementById("makerSolverProgress");
  const solverProgressLabel = document.getElementById("makerSolverProgressLabel");
  const solverStats = document.getElementById("makerSolverStats");
  const solverClosest = document.getElementById("makerSolverClosest");
  const solverClosestStats = document.getElementById("makerSolverClosestStats");
  const solverClosestBoard = document.getElementById("makerSolverClosestBoard");
  const solverDiagnostics = document.getElementById("makerSolverDiagnostics");
  const solverClosestRoute = document.getElementById("makerSolverClosestRoute");
  const solverClosestCopyBtn = document.getElementById("makerSolverClosestCopyBtn");

  if (!modal || !gridEl) return;

  const MIN_SIZE = 3;
  const GENERATOR_MIN_SIZE = 5;
  const MAX_SIZE = 36;
  const MAX_GENERATOR_BOXES = 12;
  const VOID = "~";
  const SAVE_KEY = "boxxy-level-maker-saves-v1";
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
  let activeTool = "wall";
  let painting = false;
  let lastPaintIndex = -1;
  let unlockClicks = 0;
  let unlockArmed = false;
  let unlockTimer = null;
  let activeSaveId = "";
  let pendingDeleteId = "";
  let deleteTimer = null;
  let fitFrame = 0;
  let currentSolution = "";
  let currentSolutionLevelText = "";
  let currentPuzzleRef = null;
  let solverWorker = null;
  let solverRunning = false;
  let solverAbortRequested = false;
  let solverJobId = 0;
  let solverStartedAt = 0;
  let lastClosestResult = null;
  const SOLVER_PROGRESS_UPDATE_MS = 750;

  function solverMemoryPlan(levelText) {
    const boxCount = (String(levelText || "").match(/[$*]/g) || []).length;
    const coarseSmallScreen = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches) && Math.min(window.innerWidth || 0, window.innerHeight || 0) < 900;
    const deviceMemory = Number(navigator.deviceMemory || 0);
    const heapLimitMb = Number(performance?.memory?.jsHeapSizeLimit || 0) / (1024 * 1024);

    let tier = "high";
    if (coarseSmallScreen || (deviceMemory > 0 && deviceMemory <= 4) || (heapLimitMb > 0 && heapLimitMb < 1400)) tier = "low";
    else if ((deviceMemory > 0 && deviceMemory < 8) || (heapLimitMb > 0 && heapLimitMb < 2600)) tier = "standard";

    const limits = {
      low: boxCount >= 32 ? 300000 : boxCount >= 16 ? 450000 : 650000,
      standard: boxCount >= 32 ? 900000 : boxCount >= 16 ? 1200000 : 1600000,
      high: boxCount >= 32 ? 2000000 : boxCount >= 16 ? 2200000 : 2600000,
    };
    return { maxNodes: limits[tier], tier, boxCount };
  }
  const SOLVER_RUN_SNAPSHOT_KEY = "boxxy-solver-last-run-v1";
  let solverLastSnapshotAt = 0;
  let solverAudioContext = null;

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

  function currentLevelText() {
    return exportRows().join("\n");
  }

  function solutionMatchesCurrentBoard() {
    return Boolean(currentSolution && currentSolutionLevelText === currentLevelText());
  }

  function updateSolverControls() {
    const matched = solutionMatchesCurrentBoard();
    if (solverOutput && !solverRunning) solverOutput.value = matched ? currentSolution : "";
    if (solverCopyBtn) solverCopyBtn.disabled = !matched;
    if (solverApplyBtn) solverApplyBtn.disabled = !matched;
  }

  function setAttachedSolution(moves, levelText = currentLevelText(), puzzleRef = currentPuzzleRef) {
    currentSolution = String(moves || "").replace(/[^udlrUDLR]/g, "");
    currentSolutionLevelText = currentSolution ? String(levelText || "") : "";
    currentPuzzleRef = puzzleRef || null;
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
    if (clearReference) currentPuzzleRef = null;
    updateSolverControls();
  }

  function markBoardEdited() {
    if (solutionMatchesCurrentBoard()) return;
    clearAttachedSolution(true);
  }

  function setSolverStatus(message, type = "") {
    if (!solverStatus) return;
    solverStatus.textContent = message;
    solverStatus.classList.toggle("error", type === "error");
    solverStatus.classList.toggle("success", type === "success");
  }

  function clearClosestDisplay() {
    lastClosestResult = null;
    if (solverClosest) solverClosest.hidden = true;
    if (solverClosestStats) solverClosestStats.textContent = "";
    if (solverClosestBoard) solverClosestBoard.textContent = "";
    if (solverDiagnostics) solverDiagnostics.textContent = "";
    if (solverClosestRoute) solverClosestRoute.value = "";
  }

  function isBetterLiveClosest(candidate, current) {
    if (!candidate) return false;
    if (!current) return true;
    if (String(candidate.boardText || "") === String(current.boardText || "")) return false;
    const distance = value => value === null || value === undefined || !Number.isFinite(Number(value)) ? Number.POSITIVE_INFINITY : Number(value);
    const candidateH = distance(candidate.remainingEstimate) + Math.max(0, Number(candidate.stagnation || 0) - 8);
    const currentH = distance(current.remainingEstimate) + Math.max(0, Number(current.stagnation || 0) - 8);
    if (candidateH !== currentH) return candidateH < currentH;
    const candidateGoals = Number(candidate.goalsFilled || 0);
    const currentGoals = Number(current.goalsFilled || 0);
    if (candidateGoals !== currentGoals) return candidateGoals > currentGoals;
    const candidateLegal = Number(candidate.legalPushes || 0);
    const currentLegal = Number(current.legalPushes || 0);
    if (candidateLegal !== currentLegal) return candidateLegal > currentLegal;
    return Number(candidate.pushCount || 0) < Number(current.pushCount || 0);
  }

  function showClosestDisplay(closest, stats = {}) {
    if (!closest || !solverClosest) return;
    lastClosestResult = closest;
    const goals = Number(closest.goalsFilled || 0);
    const total = Number(closest.totalGoals || 0);
    const remaining = Number.isFinite(Number(closest.remainingEstimate)) ? Number(closest.remainingEstimate) : null;
    const pushes = Number(closest.pushCount || 0);
    const moves = Number(closest.moveCount || 0);
    const legal = Number.isFinite(Number(closest.legalPushes)) ? Number(closest.legalPushes) : null;
    const stagnation = Number(closest.stagnation || 0);
    solverClosest.hidden = false;
    if (solverClosestStats) {
      const safePacked = Number.isFinite(Number(closest.safePacked)) ? Number(closest.safePacked) : null;
      solverClosestStats.textContent = `${goals}/${total} goals occupied${safePacked === null ? "" : ` · FESS packing ${safePacked}`} · ${pushes} pushes · ${moves} moves${remaining === null ? "" : ` · estimate ${remaining}`}${legal === null ? "" : ` · ${legal} legal pushes`}${stagnation > 0 ? ` · ${stagnation} pushes since structural progress` : ""}`;
    }
    if (solverClosestBoard) solverClosestBoard.textContent = String(closest.boardText || "");
    if (solverDiagnostics) {
      const parts = [];
      const add = (label, value) => { if (Number(value || 0) > 0) parts.push(`${label}: ${Number(value).toLocaleString()}`); };
      add("FESS push expansions", stats.featureExpanded);
      add("feature cells", stats.featureCells);
      add("transpositions", stats.transpositions);
      add("lower-weight revisits", stats.weightRelaxations);
      const deadlocks = Number(stats.staticDeadlocks || 0) + Number(stats.blockDeadlocks || 0) + Number(stats.freezeDeadlocks || 0) + Number(stats.assignmentDeadlocks || 0) + Number(stats.bipartiteDeadlocks || 0) + Number(stats.sealedDeadlocks || 0) + Number(stats.frozenStructuralDeadlocks || 0) + Number(stats.corralDeadlocks || 0);
      add("dead ends pruned", deadlocks);
      add("box-goal matching deadlocks", stats.assignmentDeadlocks);
      add("advisor-ranked moves", stats.advisorMoves);
      add("non-advisor moves retained", stats.nonAdvisorMoves);
      add("proven dead states", stats.provenDeadStates);
      add("dead-state revisits avoided", stats.deadStateHits);
      solverDiagnostics.textContent = parts.length ? `Search work — ${parts.join(" · ")}.` : "The search stopped before a detailed phase breakdown was available.";
    }
    if (solverClosestRoute) solverClosestRoute.value = String(closest.mixedMoves || "");
  }

  async function copyClosestRoute() {
    const route = String(lastClosestResult?.mixedMoves || "");
    if (!route) {
      setSolverStatus("The closest position is the starting position, so there is no partial route to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(route);
      setSolverStatus("Partial route to the closest position copied to the clipboard.", "success");
    } catch (_) {
      solverClosestRoute?.focus();
      solverClosestRoute?.select();
      const copied = document.execCommand?.("copy");
      setSolverStatus(copied ? "Partial route copied to the clipboard." : "The partial route is selected for manual copying.", copied ? "success" : "");
    }
  }

  function finishSolverRun(preserveSnapshot = false) {
    if (solverWorker) solverWorker.terminate();
    solverWorker = null;
    solverRunning = false;
    if (!preserveSnapshot) {
      try { localStorage.removeItem(SOLVER_RUN_SNAPSHOT_KEY); } catch (_) {}
    }
    if (solverStartBtn) solverStartBtn.disabled = false;
    if (solverCancelBtn) solverCancelBtn.hidden = true;
  }

  function openSolverDialog() {
    const validation = validate();
    if (!validation.ok) {
      setStatus(validation.error, "error");
      return;
    }
    if (!solverModal) return;
    solverModal.hidden = false;
    if (solverProgressWrap) solverProgressWrap.hidden = true;
    if (solverProgress) solverProgress.value = 0;
    if (solverProgressLabel) solverProgressLabel.textContent = "Ready.";
    if (solverStats) solverStats.textContent = "";
    clearClosestDisplay();
    updateSolverControls();
    let previousRun = null;
    try { previousRun = JSON.parse(localStorage.getItem(SOLVER_RUN_SNAPSHOT_KEY) || "null"); } catch (_) {}
    if (solutionMatchesCurrentBoard()) {
      setSolverStatus(`A ${currentSolution.length.toLocaleString()}-move solution is already attached to this puzzle.`, "success");
    } else if (previousRun?.running) {
      const seconds = (Number(previousRun.elapsedMs || 0) / 1000).toFixed(1);
      setSolverStatus(`The previous solver tab ended unexpectedly after ${seconds}s in ${previousRun.phase || "search"}, at ${Number(previousRun.generated || 0).toLocaleString()} generated push states. v119 uses a fixed compact FESS store, avoiding the reallocations and short-lived buffers that exhausted v118.`, "error");
      if (previousRun.closest) showClosestDisplay(previousRun.closest, {});
      try { localStorage.removeItem(SOLVER_RUN_SNAPSHOT_KEY); } catch (_) {}
    } else {
      setSolverStatus("Ready to solve the current editor puzzle.");
    }
    solverStartBtn?.focus({ preventScroll: true });
  }

  function closeSolverDialog() {
    if (!solverModal) return;
    if (solverRunning) {
      setSolverStatus("Cancel the running search before closing the solver.", "error");
      return;
    }
    solverModal.hidden = true;
    solveBtn?.focus({ preventScroll: true });
  }

  function updateSearchProgress(progress = {}) {
    if (solverProgress) solverProgress.removeAttribute("value");
    if (progress.closest && isBetterLiveClosest(progress.closest, lastClosestResult)) showClosestDisplay(progress.closest, progress.stats || {});
    const phase = progress.phase || "forward";
    if (solverProgressLabel) {
      const phaseLabels = {
        "feature-space": "Cycling through FESS packing, connectivity, room and out-of-plan feature cells…",
        forward: "Searching FESS push states…"
      };
      solverProgressLabel.textContent = phaseLabels[phase] || phaseLabels.forward;
    }
    if (solverStats) {
      const seconds = (Number(progress.elapsedMs || 0) / 1000).toFixed(1);
      const depth = Number.isFinite(Number(progress.bestPushDepth)) ? ` · depth ${Number(progress.bestPushDepth)}` : "";
      const estimateText = Number.isFinite(Number(progress.bestEstimate)) ? ` · remaining ${Number(progress.bestEstimate)}` : "";
      const pruned = Number(progress.deadlocks || 0);
      const prunedText = pruned > 0 ? ` · ${pruned.toLocaleString()} dead ends pruned` : "";
      const goalsText = Number.isFinite(Number(progress.goalsFilled)) && Number.isFinite(Number(progress.totalGoals))
        ? ` · ${Number(progress.goalsFilled)}/${Number(progress.totalGoals)} goals`
        : "";
      const packedText = Number.isFinite(Number(progress.safePacked))
        ? ` · FESS packing ${Number(progress.safePacked)}`
        : "";
      const patternText = Number.isFinite(Number(progress.patternMatched)) && Number.isFinite(Number(progress.patternTotal))
        ? ` · ${Number(progress.patternMatched)}/${Number(progress.patternTotal)} starting positions matched`
        : "";
      const cellsText = Number(progress.featureCells || 0) > 0 ? ` · ${Number(progress.featureCells).toLocaleString()} feature cells` : "";
      const activeCellsText = Number(progress.activeFeatureCells || 0) > 0 ? ` · ${Number(progress.activeFeatureCells).toLocaleString()} active cells` : "";
      const advisorText = Number(progress.advisorMoves || 0) > 0 ? ` · ${Number(progress.advisorMoves).toLocaleString()} advisor moves` : "";
      const stagnantText = Number(progress.plateauPruned || 0) > 0 ? ` · ${Number(progress.plateauPruned).toLocaleString()} stagnant branches pruned` : "";
      const bridgeText = Number(progress.bridgeHits || 0) > 0 ? ` · ${Number(progress.bridgeHits).toLocaleString()} frontier joins` : "";
      const thresholdText = Number.isFinite(Number(progress.threshold)) ? ` · bound ${Number(progress.threshold)}` : "";
      const iterationText = Number(progress.iteration || 0) > 0 ? ` · pass ${Number(progress.iteration).toLocaleString()}` : "";
      const duplicateText = Number(progress.duplicates || 0) > 0 ? ` · ${Number(progress.duplicates).toLocaleString()} repeated states pruned` : "";
      const cycleText = Number(progress.pathCycles || 0) > 0 ? ` · ${Number(progress.pathCycles).toLocaleString()} route loops pruned` : "";
      const resetText = Number(progress.transpositionResets || 0) > 0 ? ` · ${Number(progress.transpositionResets).toLocaleString()} cache resets` : "";
      const provenDeadText = Number(progress.provenDeadStates || 0) > 0 ? ` · ${Number(progress.provenDeadStates).toLocaleString()} proven dead states` : "";
      const deadHitText = Number(progress.deadStateHits || 0) > 0 ? ` · ${Number(progress.deadStateHits).toLocaleString()} dead-state revisits avoided` : "";
      const residentLimit = Number(progress.residentNodeLimit || progress.stats?.residentNodeLimit || 0);
      const allowanceText = residentLimit > 0 ? ` · allowance ${residentLimit.toLocaleString()}` : "";
      const storeBytes = Number(progress.stats?.searchStoreBytes || 0);
      const storeText = storeBytes > 0 ? ` · fixed store ${(storeBytes / (1024 * 1024)).toFixed(0)} MB` : "";
      solverStats.textContent = `${Number(progress.generated || 0).toLocaleString()} push states · ${Number(progress.open || 0).toLocaleString()} open push states${depth}${estimateText}${goalsText}${packedText}${patternText}${cellsText}${activeCellsText}${advisorText}${prunedText}${stagnantText}${bridgeText}${thresholdText}${iterationText}${duplicateText}${cycleText}${provenDeadText}${deadHitText}${resetText}${allowanceText}${storeText} · ${seconds}s`;
    }
    const now = Date.now();
    if (now - solverLastSnapshotAt >= 5000) {
      solverLastSnapshotAt = now;
      try {
        localStorage.setItem(SOLVER_RUN_SNAPSHOT_KEY, JSON.stringify({
          running: true,
          savedAt: now,
          phase: progress.phase || "forward",
          elapsedMs: Number(progress.elapsedMs || 0),
          generated: Number(progress.generated || 0),
          open: Number(progress.open || 0),
          residentNodes: Number(progress.residentNodes || progress.stats?.residentNodes || 0),
          residentNodeLimit: Number(progress.residentNodeLimit || progress.stats?.residentNodeLimit || 0),
          safeTranspositionResets: Number(progress.transpositionResets || progress.stats?.safeTranspositionResets || 0),
          closest: progress.closest || lastClosestResult || null
        }));
      } catch (_) {}
    }
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
    finishSolverRun();
    updateSolverControls();
    result = result || {};
    if (result.status === "solved") {
      playSolverDing();
      clearClosestDisplay();
      const route = String(result.mixedMoves || result.moves || "").replace(/[^udlrUDLR]/g, "");
      setAttachedSolution(route, levelText, currentPuzzleRef);
      if (solverOutput) solverOutput.value = route;
      if (solverProgress) solverProgress.value = 100;
      if (solverProgressLabel) {
        const reverseStrategies = new Set(["reverse-construction", "exact-pattern-reverse", "reverse-a-star", "productive-bidirectional"]);
        solverProgressLabel.textContent = reverseStrategies.has(result.strategy)
          ? "Solution constructed backwards and verified forwards."
          : "Solution found and verified.";
      }
      if (solverStats) solverStats.textContent = `${Number(result.moveCount || route.length).toLocaleString()} moves · ${Number(result.pushCount || 0).toLocaleString()} pushes · ${(Number(result.elapsedMs || 0) / 1000).toFixed(2)}s`;
      setSolverStatus("The solution string has been attached to this puzzle. Testing it now enables the five-click + S walkthrough.", "success");
      setStatus(`Solver attached a ${route.length}-move walkthrough to the current puzzle.`, "success");
    } else if (result.status === "unsolvable") {
      showClosestDisplay(result.closest, result.stats || {});
      if (solverProgress) solverProgress.value = 100;
      if (solverProgressLabel) solverProgressLabel.textContent = "Search exhausted.";
      setSolverStatus(result.message || "No solution exists from this starting position.", "error");
    } else if (result.status === "limit") {
      showClosestDisplay(result.closest, result.stats || {});
      if (solverProgressLabel) solverProgressLabel.textContent = Number(result.stats?.memorySafeStops || 0) > 0
        ? "Memory allowance reached."
        : "Search time allowance reached.";
      setSolverStatus(result.message || "The search reached its configured allowance before exhausting the puzzle.", "error");
    } else if (result.status === "stopped") {
      setSolverStatus("Search cancelled.");
    } else {
      setSolverStatus(result.message || "The solver stopped before finding a route.", "error");
    }
  }

  async function runSolverOnMainThread(id, levelText) {
    if (!window.SokobanCore?.solve) {
      if (id === solverJobId) {
        finishSolverRun();
        setSolverStatus("The solver engine could not be loaded.", "error");
      }
      return;
    }
    const memoryPlan = solverMemoryPlan(levelText);
    setSolverStatus(`The browser blocked the background worker, so BOXXY is using the solver's yielding browser mode instead. The ${memoryPlan.tier} memory allowance is ${memoryPlan.maxNodes.toLocaleString()} resident states.`);
    try {
      const result = await window.SokobanCore.solve(levelText, {
        featureMaxTimeMs: 43200000,
        maxNodes: memoryPlan.maxNodes,
        yieldEvery: 350,
        progressEveryMs: SOLVER_PROGRESS_UPDATE_MS,
        shouldStop: () => solverAbortRequested || id !== solverJobId,
        onProgress: progress => {
          if (id === solverJobId && solverRunning) updateSearchProgress(progress);
        }
      });
      handleSolverResult(result, id, levelText);
    } catch (error) {
      if (id !== solverJobId) return;
      finishSolverRun();
      setSolverStatus(error?.message || "The solver stopped unexpectedly.", "error");
    }
  }

  async function startSolverSearch() {
    const validation = validate();
    if (!validation.ok) {
      setSolverStatus(validation.error, "error");
      return;
    }
    if (solverRunning) return;
    const levelText = validation.rows.join("\n");
    const id = ++solverJobId;
    solverAbortRequested = false;
    solverRunning = true;
    solverStartedAt = performance.now();
    solverLastSnapshotAt = 0;
    try { localStorage.removeItem(SOLVER_RUN_SNAPSHOT_KEY); } catch (_) {}
    const existingRoute = solutionMatchesCurrentBoard() ? currentSolution : "";
    clearClosestDisplay();
    const totalGoals = (levelText.match(/[.*+]/g) || []).length;
    const goalsFilled = (levelText.match(/\*/g) || []).length;
    showClosestDisplay({ boardText: levelText, mixedMoves: "", moveCount: 0, pushCount: 0, goalsFilled, totalGoals, remainingEstimate: null, stagnation: 0 }, {});
    prepareSolverDing();
    if (solverOutput) solverOutput.value = existingRoute;
    if (solverCopyBtn) solverCopyBtn.disabled = true;
    if (solverApplyBtn) solverApplyBtn.disabled = true;
    if (solverProgressWrap) solverProgressWrap.hidden = false;
    if (solverProgress) solverProgress.removeAttribute("value");
    if (solverProgressLabel) solverProgressLabel.textContent = "Analysing walls, goals and dead squares…";
    if (solverStats) solverStats.textContent = "0 states";
    if (solverStartBtn) solverStartBtn.disabled = true;
    if (solverCancelBtn) solverCancelBtn.hidden = false;
    const memoryPlan = solverMemoryPlan(levelText);
    setSolverStatus(`Solving with one pure FESS search. This device has the ${memoryPlan.tier} allowance: up to ${memoryPlan.maxNodes.toLocaleString()} resident states. The compact search store is allocated once, so it cannot double in size during a reallocation.`);

    let fellBack = false;
    const fallback = () => {
      if (fellBack || id !== solverJobId || !solverRunning) return;
      fellBack = true;
      if (solverWorker) solverWorker.terminate();
      solverWorker = null;
      runSolverOnMainThread(id, levelText);
    };

    if (!window.Worker || location.protocol === "file:") {
      fallback();
      return;
    }
    try {
      solverWorker = new Worker("solver-worker.js?v=119");
      solverWorker.onmessage = event => {
        const message = event.data || {};
        if (message.id !== id || id !== solverJobId || !solverRunning) return;
        if (message.type === "progress") updateSearchProgress(message.progress || {});
        else if (message.type === "result") handleSolverResult(message.result || {}, id, levelText);
        else if (message.type === "error") {
          finishSolverRun();
          setSolverStatus(message.error || "The solver stopped unexpectedly.", "error");
        }
      };
      solverWorker.onerror = event => {
        event.preventDefault?.();
        if (id !== solverJobId || !solverRunning) return;
        const detail = event?.message ? ` ${event.message}` : "";
        finishSolverRun(true);
        setSolverStatus(`The background solver worker stopped unexpectedly.${detail} The game page has been kept alive; reopen Solve Puzzle to inspect the saved progress report.`, "error");
      };
      solverWorker.onmessageerror = () => {
        if (id !== solverJobId || !solverRunning) return;
        finishSolverRun(true);
        setSolverStatus("The browser could not read a message from the background solver. The game page has been kept alive; reopen Solve Puzzle to inspect the saved progress report.", "error");
      };
      solverWorker.postMessage({
        type: "solve",
        id,
        level: levelText,
        unlimited: true,
        maxNodes: memoryPlan.maxNodes,
        progressEveryMs: SOLVER_PROGRESS_UPDATE_MS
      });
    } catch (_) {
      fallback();
    }
  }

  function cancelSolverSearch() {
    if (!solverRunning) return;
    const elapsed = Math.max(0, performance.now() - solverStartedAt);
    solverAbortRequested = true;
    solverJobId += 1;
    finishSolverRun();
    if (solverProgressLabel) solverProgressLabel.textContent = "Search cancelled.";
    setSolverStatus(`Search cancelled after ${(elapsed / 1000).toFixed(1)} seconds.`);
  }

  async function copySolverString() {
    if (!solutionMatchesCurrentBoard()) return;
    try {
      await navigator.clipboard.writeText(currentSolution);
      setSolverStatus("Solution string copied to the clipboard.", "success");
    } catch (_) {
      solverOutput?.focus();
      solverOutput?.select();
      const copied = document.execCommand?.("copy");
      setSolverStatus(copied ? "Solution string copied to the clipboard." : "The solution is selected for manual copying.", copied ? "success" : "");
    }
  }

  function applyCurrentSolution() {
    if (!solutionMatchesCurrentBoard()) return;
    setAttachedSolution(currentSolution, currentSolutionLevelText, currentPuzzleRef);
    setSolverStatus("Solution attached. Test the puzzle, click the character five times, then press S.", "success");
    setStatus("The solver route is attached to the current puzzle.", "success");
  }

  function blankGrid(width, height, value = VOID) {
    return Array.from({ length: width * height }, () => value);
  }

  function clearActiveSave() {
    activeSaveId = "";
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
      cells[indexOf(Math.min(cols - 2, 6), Math.min(rows - 3, 3))] = ".";
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
    const button = gridEl.children[index];
    if (!button) return;
    const value = cells[index];
    button.className = `maker-cell type-${CLASS_BY_VALUE[value] || "void"}`;
    button.dataset.index = String(index);
    button.dataset.value = value;
    const [x, y] = coordsOf(index);
    button.setAttribute("aria-label", `Column ${x + 1}, row ${y + 1}: ${LABEL_BY_VALUE[value] || "void"}`);
  }

  function paintIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= cells.length || index === lastPaintIndex) return;
    const before = cells.slice();
    const next = valueForTool(activeTool, cells[index], index);
    cells[index] = next;
    if (activeTool === "player" || activeTool === "playergoal") {
      before.forEach((value, i) => {
        if (i !== index && cells[i] !== value) updateCellElement(i);
      });
    }
    updateCellElement(index);
    lastPaintIndex = index;
    updateTextFromGrid(false);
    if (before.some((value, i) => value !== cells[i])) clearAttachedSolution(true);
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--maker-cols", String(cols));
    const fragment = document.createDocumentFragment();
    cells.forEach((value, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `maker-cell type-${CLASS_BY_VALUE[value] || "void"}`;
      button.dataset.index = String(index);
      button.dataset.value = value;
      button.setAttribute("role", "gridcell");
      const [x, y] = coordsOf(index);
      button.setAttribute("aria-label", `Column ${x + 1}, row ${y + 1}: ${LABEL_BY_VALUE[value] || "void"}`);
      fragment.appendChild(button);
    });
    gridEl.appendChild(fragment);
    scheduleGridFit();
  }

  function resizeGrid(nextCols, nextRows) {
    nextCols = clampSize(nextCols);
    nextRows = clampSize(nextRows);
    const next = blankGrid(nextCols, nextRows, VOID);
    const copyW = Math.min(cols, nextCols);
    const copyH = Math.min(rows, nextRows);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) next[y * nextCols + x] = cells[indexOf(x, y)];
    }
    cols = nextCols;
    rows = nextRows;
    cells = next;
    clearAttachedSolution(true);
    syncSizeInputs();
    renderGrid();
    updateTextFromGrid();
    setStatus(`Grid resized to ${cols} × ${rows}.`);
  }

  function exportRows() {
    const output = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const value = cells[indexOf(x, y)];
        line += value === VOID ? " " : value;
      }
      output.push(line.replace(/\s+$/g, ""));
    }
    while (output.length && output[0] === "") output.shift();
    while (output.length && output.at(-1) === "") output.pop();
    return output.length ? output : [""];
  }

  function updateTextFromGrid(force = true) {
    if (!force && document.activeElement === textEl) return;
    textEl.value = exportRows().join("\n");
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
    if (!Array.isArray(lines) || !lines.length) throw new Error("No level text was found.");
    if (lines.length > MAX_SIZE) throw new Error(`The level is ${lines.length} rows high. The editor supports up to ${MAX_SIZE}.`);
    const maxWidth = Math.max(...lines.map(line => line.length));
    if (maxWidth > MAX_SIZE) throw new Error(`The level is ${maxWidth} columns wide. The editor supports up to ${MAX_SIZE}.`);

    const cleaned = lines.map(line => String(line).replace(/\t/g, "    ").replace(/_/g, " "));
    const invalid = [...new Set(cleaned.join("").split("").filter(ch => !" #@$.+*".includes(ch)))];
    if (invalid.length) throw new Error(`Unsupported character${invalid.length === 1 ? "" : "s"}: ${invalid.join(" ")}`);

    const classified = classifySpaces(cleaned);
    cols = clampSize(classified.width);
    rows = clampSize(classified.height);
    cells = blankGrid(cols, rows, VOID);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = classified.chars[y]?.[x] ?? " ";
        const value = ch === " " && classified.outside.has(`${x},${y}`) ? VOID : ch;
        cells[indexOf(x, y)] = VALID.has(value) ? value : VOID;
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

  function generateUnchecked(width, height, boxCount, square) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const terrain = buildTerrain(width, height, square, boxCount);
      const floors = terrain.map((value, index) => value === " " ? index : -1).filter(index => index >= 0);
      if (floors.length < boxCount * 3 + 2) continue;
      const goals = chooseGoalPositions(floors, boxCount, terrain, width, height);
      if (!goals) continue;
      const goalSet = new Set(goals);
      const boxCandidates = floors.filter(index => !goalSet.has(index) && !isStaticCorner(terrain, width, height, index));
      const boxes = chooseSpaced(boxCandidates, boxCount, width, 2);
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
        square
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

  async function generateChecked(width, height, boxCount, square) {
    for (let attempt = 1; attempt <= 180; attempt++) {
      const terrain = buildTerrain(width, height, square, boxCount);
      const generated = reverseBuildTested(terrain, width, height, boxCount);
      if (generated) {
        generated.square = square;
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
    widthInput.value = String(width);
    heightInput.value = String(height);
    boxesInput.value = String(boxCount);

    const approximateFloor = Math.max(1, (width - 2) * (height - 2));
    const sensibleMaximum = Math.min(MAX_GENERATOR_BOXES, Math.max(1, Math.floor((approximateFloor - 1) / 3)));
    if (boxCount > sensibleMaximum) {
      setStatus(`That size has too little working space for ${boxCount} boxes. Try ${sensibleMaximum} or fewer.`, "error");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = tested ? "GENERATING + CHECKING…" : "GENERATING…";
    setStatus(tested ? "Generating a level and checking its solution path…" : "Generating a new level…");
    await waitForPaint();

    try {
      const generated = tested
        ? await generateChecked(width, height, boxCount, square)
        : generateUnchecked(width, height, boxCount, square);
      if (!generated) {
        setStatus(tested
          ? "A checked level could not be built with those settings. Try fewer boxes or a larger grid."
          : "A level could not be built with those settings. Try fewer boxes or a larger grid.", "error");
        return;
      }
      applyGeneratedLevel(generated);
      if (tested) {
        setStatus(`Generated and checked: ${boxCount} ${boxCount === 1 ? "box" : "boxes"}, verified ${generated.solutionPushes}-push path across ${generated.solutionLines} box lines.`, "success");
      } else {
        setStatus(`Generated ${boxCount}-box level without a completion check.`, "success");
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
      importRows(level.layout, { quiet: true });
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

  function writeSavedLevels(records) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(records.slice(0, 100)));
  }

  function newSaveId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `level-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function renderSavedLevels(preferredId = "") {
    const records = readSavedLevels().sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
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
    const existingIndex = activeSaveId ? records.findIndex(record => record.id === activeSaveId) : -1;
    const defaultNumber = records.length + (existingIndex >= 0 ? 0 : 1);
    const name = saveNameInput.value.trim() || `Saved level ${Math.max(1, defaultNumber)}`;
    const now = Date.now();
    const record = {
      id: existingIndex >= 0 ? records[existingIndex].id : newSaveId(),
      name,
      cols,
      rows,
      cells: cells.slice(),
      boxes: countBoxes(),
      solution: solutionMatchesCurrentBoard() ? currentSolution : "",
      solutionLevelText: solutionMatchesCurrentBoard() ? currentSolutionLevelText : "",
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt || now : now,
      updatedAt: now
    };
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    try {
      writeSavedLevels(records);
      activeSaveId = record.id;
      saveNameInput.value = name;
      renderSavedLevels(record.id);
      setStatus(`Saved “${name}”.`, "success");
    } catch (_) {
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
    activeSaveId = record.id;
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
    setStatus(`Loaded “${record.name}”.${restoredSolution ? " Its attached walkthrough was restored." : ""}`, "success");
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
      writeSavedLevels(records.filter(record => record.id !== id));
      if (activeSaveId === id) clearActiveSave();
      resetDeleteButton();
      renderSavedLevels();
      setStatus(removed ? `Deleted “${removed.name}”.` : "Saved level deleted.", "success");
    } catch (_) {
      setStatus("This browser would not allow the saved level to be deleted.", "error");
    }
  }

  function openMaker() {
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
  }

  toolButtons.forEach(button => {
    button.addEventListener("click", () => selectTool(button.dataset.makerTool));
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

  saveBtn.addEventListener("click", saveCurrentLevel);
  existingPackSelect?.addEventListener("change", () => populateExistingLevels());
  existingLevelSelect?.addEventListener("dblclick", openExistingPuzzle);
  openExistingLevelBtn?.addEventListener("click", openExistingPuzzle);
  loadBtn.addEventListener("click", loadSavedLevel);
  deleteBtn.addEventListener("click", deleteSavedLevel);
  savedSelect.addEventListener("change", resetDeleteButton);
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
  solverCopyBtn?.addEventListener("click", copySolverString);
  solverApplyBtn?.addEventListener("click", applyCurrentSolution);
  solverClosestCopyBtn?.addEventListener("click", copyClosestRoute);
  solverModal?.addEventListener("click", event => {
    if (event.target === solverModal) closeSolverDialog();
  });

  testBtn.addEventListener("click", () => {
    const validation = validate();
    if (!validation.ok) {
      setStatus(validation.error, "error");
      return;
    }
    const result = window.BoxxyGameAPI?.startMakerTest?.(validation.rows, solutionMatchesCurrentBoard() ? currentSolution : "");
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

  window.addEventListener("boxxy-maker-return", openMaker);
  window.addEventListener("resize", scheduleGridFit);
  window.addEventListener("orientationchange", scheduleGridFit);
  if (gridShell && "ResizeObserver" in window) {
    const makerResizeObserver = new ResizeObserver(scheduleGridFit);
    makerResizeObserver.observe(gridShell);
  }

  selectTool("wall");
  makeRoom(10, 10, false);
  boxesInput.value = "3";
  renderSavedLevels();
  populateExistingPacks();
})();
