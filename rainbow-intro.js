/* BOXXY v501 — first Rainbow Daily introduction; independent of scoring/gameplay. */
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
  // Matches the existing Konami showcase's 220 ms normal-speed playback.
  const STEP_MS = 220;
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
    indi.src = framePath(mode, facing);
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
    if (!modal || modal.hidden || document.hidden) return;
    if (step === ROUTE.length) resetDemo();
    const command = ROUTE[step++];
    const delta = directions[command.toLowerCase()];
    if (!delta) return;
    const next = { x: player.x + delta.x, y: player.y + delta.y };
    const nextKey = posKey(next.x, next.y);
    if (walls.has(nextKey)) return;
    const pushing = next.x === crate.x && next.y === crate.y;
    if (pushing) {
      const destination = { x: crate.x + delta.x, y: crate.y + delta.y };
      if (walls.has(posKey(destination.x, destination.y))) return;
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
    // Reset the transient push/walk pose without replacing the pieces or artwork.
    const thisStep = step;
    window.setTimeout(() => {
      if (modal?.hidden || step !== thisStep) return;
      figure.classList.remove("push", "walk");
      setIndiFrame("player", delta.facing);
    }, Math.min(STEP_MS - 30, 190));
  }
  function stop() {
    clearInterval(timer);
    timer = 0;
    runId += 1;
  }
  function loadSprite(path) {
    return new Promise(resolve => {
      const img = new Image();
      let done = false;
      const timeout = window.setTimeout(() => finish(false), 6000);
      function finish(ok) {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        img.onload = img.onerror = null;
        resolve({ path, ok });
      }
      img.onload = () => finish(img.naturalWidth > 0);
      img.onerror = () => finish(false);
      img.src = path;
      if (img.complete) queueMicrotask(() => { if (img.complete) finish(img.naturalWidth > 0); });
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
  function close() {
    if (!modal || modal.hidden) return;
    stop();
    markSeen();
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("rainbow-intro-open");
    lastFocus?.focus?.({ preventScroll: true });
  }
  function open() {
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
      timer = window.setInterval(advance, STEP_MS);
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
    if (seen() || (modal && !modal.hidden)) return;
    openWhenSplashClears();
  }

  window.BoxxyRainbowIntro = Object.freeze({ open });
  window.addEventListener("boxxyrainbowdailyopened", onRainbowDailyOpened);
  if (window.BOXXY_ACTIVE_RAINBOW_DAILY && !seen()) openWhenSplashClears();
})();
