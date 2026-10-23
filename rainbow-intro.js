/* BOXXY v504 — continuous Rainbow pushing poses and brief end pauses. */
(() => {
  "use strict";

  const STORAGE_KEY = "boxxy-rainbow-intro-seen-v1";
  const ROWS = Object.freeze([
    "#############",
    "#           #",
    "#@$rbgofmtk #",
    "#           #",
    "#############"
  ]);
  const ROUTE = "RRRRRRRRurrdLLLLLLLLdllu";
  // A calmer pace gives coloured box sprites time to remain visually legible.
  const STEP_MS = 360;
  const END_PAUSE_MS = 500;
  // The eight rightward pushes end at step 8; the eight leftward pushes at 20.
  const PUSH_ENDS = new Set([8, 20]);
  const COLOURS = window.BoxxyGoalColours;
  if (!COLOURS?.decodeTextChar || !COLOURS?.spritePath) return;

  let modal = null;
  let board = null;
  let piece = null;
  let boxArt = null;
  let indi = null;
  let player = { x: 1, y: 2 };
  let crate = { x: 2, y: 2 };
  let lastFocus = null;
  let step = 0;
  let timer = 0;
  let runId = 0;
  let splashObserver = null;
  let pendingOpen = false;
  let closing = false;
  const targets = new Map();
  const walls = new Set();
  const posKey = (x, y) => `${x},${y}`;
  const framePath = (mode, facing) => `assets/characters-fallback/boy/${mode}-${facing}.png`;
  const defaultBox = COLOURS.versionedBoardAssetPath("assets/board/boxes/box-default-yellow.png");
  const directions = Object.freeze({
    r: { x: 1, y: 0, facing: "right" },
    l: { x: -1, y: 0, facing: "left" },
    u: { x: 0, y: -1, facing: "back" },
    d: { x: 0, y: 1, facing: "front" }
  });

  function seen() {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch (_) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
  }
  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }
  function position(node, x, y, z) {
    node.style.setProperty("--x", String(x));
    node.style.setProperty("--y", String(y));
    node.style.setProperty("--z", String(z));
  }
  function cell(className, x, y, z) {
    const node = element("span", `tutorial-cell ${className}`);
    position(node, x, y, z);
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  function positionPiece(node, x, y) {
    position(node, x, y, 500 + y * 10);
  }
  function setBoxColour() {
    const colour = targets.get(posKey(crate.x, crate.y));
    piece.classList.toggle("on-goal", Boolean(colour));
    const path = colour ? COLOURS.spritePath("box", colour) : defaultBox;
    boxArt.style.backgroundImage = failedSprites.has(path)
      ? `linear-gradient(135deg, #ffffff70, transparent 45%), linear-gradient(${colour ? COLOURS.PALETTE[colour].hex : "#f9bc18"}, ${colour ? COLOURS.PALETTE[colour].hex : "#f9bc18"})`
      : `url("${path}")`;
  }
  function setIndiFrame(mode, facing) {
    const src = framePath(mode, facing);
    if (indi.getAttribute("src") !== src) indi.src = src;
  }
  function resetDemo() {
    player = { x: 1, y: 2 };
    crate = { x: 2, y: 2 };
    step = 0;
    positionPiece(piece, crate.x, crate.y);
    position(indi.parentElement, player.x, player.y, 900 + player.y * 10);
    setBoxColour();
    setIndiFrame("player", "front");
  }
  function advance() {
    if (!modal || modal.hidden) return;
    if (document.hidden) {
      timer = window.setTimeout(advance, STEP_MS);
      return;
    }
    if (step === ROUTE.length) resetDemo();
    const command = ROUTE[step++];
    const delta = directions[command.toLowerCase()];
    if (!delta) { stop(); return; }
    const next = { x: player.x + delta.x, y: player.y + delta.y };
    if (walls.has(posKey(next.x, next.y))) { stop(); return; }
    const pushing = next.x === crate.x && next.y === crate.y;
    if (pushing) {
      const destination = { x: crate.x + delta.x, y: crate.y + delta.y };
      if (walls.has(posKey(destination.x, destination.y))) { stop(); return; }
      crate = destination;
      positionPiece(piece, crate.x, crate.y);
      setBoxColour();
    }
    player = next;
    const figure = indi.parentElement;
    position(figure, player.x, player.y, 900 + player.y * 10);
    figure.classList.toggle("push", pushing);
    figure.classList.toggle("walk", !pushing);
    setIndiFrame(pushing ? "push" : "walk", delta.facing);
    const atEnd = pushing && PUSH_ENDS.has(step);
    // Retain the push sprite across consecutive pushes rather than briefly
    // switching to a standing sprite between each coloured target.
    // Standing poses still appear during normal walking and at each end pause.
    if (!pushing || atEnd) {
      const thisStep = step;
      const token = runId;
      window.setTimeout(() => {
        if (token !== runId || modal?.hidden || step !== thisStep) return;
        figure.classList.remove("push", "walk");
        setIndiFrame("player", delta.facing);
      }, Math.round(STEP_MS * 0.78));
    }
    // One timer owns playback; each end receives an additional 500 ms rest.
    timer = window.setTimeout(advance, STEP_MS + (atEnd ? END_PAUSE_MS : 0));
  }
  function stop() {
    window.clearTimeout(timer);
    timer = 0;
    runId += 1;
  }
  const spriteCache = new Map();
  function loadSprite(path) {
    return new Promise(resolve => {
      // Retain preloaded images and decode them before the first colour change.
      const img = new Image();
      spriteCache.set(path, img);
      let done = false;
      let decoding = false;
      const timeout = window.setTimeout(() => finish(false), 6000);
      function finish(ok) {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        img.onload = img.onerror = null;
        resolve({ path, ok });
      }
      async function loaded() {
        if (done || decoding) return;
        decoding = true;
        if (typeof img.decode === "function") {
          try { await img.decode(); } catch (_) { /* The loaded image may still render. */ }
        }
        finish(img.naturalWidth > 0);
      }
      img.onload = loaded;
      img.onerror = () => finish(false);
      img.src = path;
      if (img.complete) queueMicrotask(() => {
        if (img.complete) (img.naturalWidth > 0 ? loaded() : finish(false));
      });
    });
  }
  const preloadPaths = [defaultBox];
  let failedSprites = new Set();
  function buildBoard() {
    board = element("div", "tutorial-board rainbow-demo-board");
    board.setAttribute("aria-label", "Animated demonstration of a box being pushed across eight differently coloured targets and back");
    board.style.setProperty("--tutorial-cols", "13");
    board.style.setProperty("--tutorial-rows", "5");
    board.style.aspectRatio = "13 / 5";

    ROWS.forEach((row, y) => {
      [...row].forEach((char, x) => {
        if (char === "#") {
          walls.add(posKey(x, y));
          board.appendChild(cell("tutorial-wall", x, y, 100 + y * 10));
          return;
        }
        const target = COLOURS.decodeTextChar(char);
        if (!target || target.cell !== ".") return;
        targets.set(posKey(x, y), target.colour);
        const tile = cell("tutorial-goal", x, y, 200 + y * 10);
        const artwork = element("span", "tutorial-board-art tutorial-board-art-goal");
        const path = COLOURS.spritePath("goal", target.colour);
        artwork.style.backgroundImage = `url("${path}")`;
        tile.appendChild(artwork);
        board.appendChild(tile);
        preloadPaths.push(path, COLOURS.spritePath("box", target.colour));
      });
    });

    piece = element("span", "tutorial-piece tutorial-box rainbow-demo-box");
    boxArt = element("span", "tutorial-board-art tutorial-board-art-box");
    piece.appendChild(boxArt);
    board.appendChild(piece);

    const figure = element("span", "tutorial-piece tutorial-player rainbow-demo-indi");
    indi = document.createElement("img");
    indi.alt = "";
    indi.draggable = false;
    figure.appendChild(indi);
    board.appendChild(figure);
    resetDemo();

    for (const mode of ["player", "walk", "push"]) {
      for (const facing of ["front", "back", "left", "right"]) preloadPaths.push(framePath(mode, facing));
    }
    return board;
  }
  function createModal() {
    if (modal) return;
    modal = element("div", "how-to-play-modal rainbow-intro-modal");
    modal.id = "rainbowIntroModal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

    const card = element("section", "how-to-play-card rainbow-intro-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "rainbowIntroTitle");

    const head = element("header", "how-to-play-head rainbow-intro-head");
    const title = element("div", "how-to-play-title");
    title.append(element("span", "", "BOXXY · A COLOURFUL NEW TWIST"));
    const h2 = element("h2", "", "INTRODUCING RAINBOW MODE");
    h2.id = "rainbowIntroTitle";
    title.append(h2);
    head.append(title);

    const content = element("div", "rainbow-intro-content");
    content.append(buildBoard());
    content.append(element("p", "rainbow-intro-copy", "The goal is still the same. Any box can go on any colour target. It's just a little prettier."));

    const footer = element("footer", "how-to-play-foot rainbow-intro-foot");
    const acknowledge = element("button", "how-to-play-next rainbow-intro-ack", "Okay, I understand, let me do today's puzzle.");
    acknowledge.type = "button";
    acknowledge.addEventListener("click", close);
    footer.append(acknowledge);
    card.append(head, content, footer);
    modal.append(card);
    document.body.append(modal);
    modal.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      } else if (event.key === "Tab") {
        event.preventDefault();
        event.stopImmediatePropagation();
        acknowledge.focus();
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, { capture: true });
  }
  async function close() {
    if (!modal || modal.hidden || closing) return;
    closing = true;
    stop();
    markSeen();
    const help = document.getElementById("howToPlayBtn");
    const card = modal.querySelector(".rainbow-intro-card");
    const from = card?.getBoundingClientRect();
    const to = help?.getBoundingClientRect();
    // Uses the existing medal-to-cabinet approach: translate and scale the
    // visible item towards its destination. Do not animate if ? is offscreen.
    const canFly = card?.animate && from?.width > 0 && to?.width > 0 &&
      to.height > 0 && to.right > 0 && to.bottom > 0 &&
      to.left < innerWidth && to.top < innerHeight &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    try {
      if (canFly) {
        const dx = to.left + to.width / 2 - from.left - from.width / 2;
        const dy = to.top + to.height / 2 - from.top - from.height / 2;
        const scale = Math.min(to.width / from.width, to.height / from.height);
        if (Number.isFinite(dx) && Number.isFinite(dy) && scale > 0) {
          // Cancel only the card's entry animation, not unrelated animations.
          card.getAnimations().forEach(animation => animation.cancel());
          const flight = card.animate([
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.15 }
          ], { duration: 560, easing: "cubic-bezier(.22,.8,.25,1)", fill: "forwards" });
          const shade = modal.animate([
            { backgroundColor: "rgba(18,18,20,.66)" },
            { backgroundColor: "rgba(18,18,20,0)" }
          ], { duration: 560, easing: "ease-out", fill: "forwards" });
          await Promise.all([flight.finished, shade.finished].map(p => p.catch(() => {})));
          flight.cancel();
          shade.cancel();
        }
      }
    } finally {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("rainbow-intro-open");
      closing = false;
      const focusTarget = help?.isConnected ? help : lastFocus;
      focusTarget?.focus?.({ preventScroll: true });
    }
  }
  function open() {
    if (closing) return;
    createModal();
    stop();
    lastFocus = document.activeElement;
    resetDemo();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("rainbow-intro-open");
    modal.querySelector(".rainbow-intro-ack")?.focus({ preventScroll: true });
    const token = runId;
    Promise.all([...new Set(preloadPaths)].map(loadSprite)).then(results => {
      if (token !== runId || modal.hidden) return;
      // If an image is unavailable, keep its target distinguishable by colour.
      failedSprites = new Set(results.filter(result => !result.ok).map(result => result.path));
      setBoxColour();
      targets.forEach((colour, key) => {
        const [x, y] = key.split(",").map(Number);
        const path = COLOURS.spritePath("goal", colour);
        if (!failedSprites.has(path)) return;
        const art = [...board.querySelectorAll(".tutorial-goal")].find(tile => tile.style.getPropertyValue("--x") === String(x) && tile.style.getPropertyValue("--y") === String(y))?.firstElementChild;
        if (art) art.style.backgroundImage = `radial-gradient(circle, ${COLOURS.PALETTE[colour].hex} 0 39%, white 40% 48%, #262626 49% 55%, transparent 56%)`;
      });
      // Start with all sprite colours preloaded, avoiding flashes as the box moves.
      timer = window.setTimeout(advance, STEP_MS);
    });
  }
  function openWhenSplashClears() {
    pendingOpen = true;
    const splash = document.getElementById("splashScreen");
    if (splash && !splash.hidden) {
      if (splashObserver) return;
      splashObserver = new MutationObserver(() => {
        if (!splash.hidden) return;
        splashObserver.disconnect();
        splashObserver = null;
        if (pendingOpen && window.BOXXY_ACTIVE_RAINBOW_DAILY && !seen()) open();
        pendingOpen = false;
      });
      splashObserver.observe(splash, { attributes: true, attributeFilter: ["hidden"] });
      return;
    }
    pendingOpen = false;
    if (window.BOXXY_ACTIVE_RAINBOW_DAILY && !seen()) open();
  }
  function onRainbowDailyOpened() {
    if (closing || seen() || (modal && !modal.hidden)) return;
    openWhenSplashClears();
  }

  window.BoxxyRainbowIntro = Object.freeze({ open });
  window.addEventListener("boxxyrainbowdailyopened", onRainbowDailyOpened);
  if (window.BOXXY_ACTIVE_RAINBOW_DAILY && !seen()) openWhenSplashClears();
})();
