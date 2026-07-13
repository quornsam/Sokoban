(() => {
  "use strict";

  const FRAMES = [
    "player-front", "player-back", "player-left", "player-right",
    "walk-front", "walk-back", "walk-left", "walk-right",
    "push-front", "push-back", "push-left", "push-right"
  ];
  const CATEGORIES = ["tshirt", "trousers", "hair", "skin", "shoes"];
  const BODY_TYPES = ["boy", "girl"];
  const SHEET_COLS = 4;
  const FRAME_WIDTH = 600;
  const FRAME_HEIGHT = 520;
  const ASSET_REVISION = "64";
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

  function loadSheetBundle(bodyType) {
    if (sheetBundles.has(bodyType)) return sheetBundles.get(bodyType);
    const root = `assets/characters/${bodyType}`;
    const promise = Promise.all([
      loadImage(`${root}/base.png?v=${ASSET_REVISION}`),
      ...CATEGORIES.map(category => loadImage(`${root}/${category}.png?v=${ASSET_REVISION}`))
    ]).then(([base, ...layers]) => ({
      base,
      layers: Object.fromEntries(CATEGORIES.map((category, index) => [category, layers[index]]))
    }));
    sheetBundles.set(bodyType, promise);
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

  async function loadFrame(frame, bodyType = style.bodyType) {
    const cacheKey = `${bodyType}:${frame}`;
    if (frameAssets.has(cacheKey)) return frameAssets.get(cacheKey);
    const promise = loadSheetBundle(bodyType).then(bundle => {
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

  const ready = Promise.all([...FRAMES.map(frame => loadFrame(frame, "boy")), ...FRAMES.map(frame => loadFrame(frame, "girl"))]).then(() => {
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
    const cacheKey = `${style.bodyType}:${frame}`;
    const assets = resolvedAssets.get(cacheKey);
    if (assets) {
      drawNow(canvas, frame, assets);
      return Promise.resolve();
    }
    return loadFrame(frame, style.bodyType).then(loaded => drawNow(canvas, frame, loaded));
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
    set,
    reset,
    get style() { return { ...style }; },
    get isOpen() { return Boolean(styleModal && !styleModal.hidden); }
  };
})();
