(() => {
  "use strict";

  const STORAGE_KEY = "boxxy-how-to-play-dismissed-v1";
  const AUTO_HOSTS = new Set(["boxxy.io", "www.boxxy.io", "localhost", "127.0.0.1"]);
  const DIRECTIONS = {
    up: { dx: 0, dy: -1, facing: "back" },
    down: { dx: 0, dy: 1, facing: "front" },
    left: { dx: -1, dy: 0, facing: "left" },
    right: { dx: 1, dy: 0, facing: "right" }
  };

  const slides = [
    {
      rows: ["#######", "#@$  .#", "#######"],
      copy: "Use the keypad or swipe to move your character to push the box on to the target."
    },
    {
      rows: ["#######", "#@#  .#", "# #  ##", "# ##$#", "#    #", "######"],
      copy: "It looks easy, right?"
    },
    {
      rows: ["########", "#   $ .#", "#   $@.#", "#   $ .#", "########"],
      copy: "But it gets tricky very quickly. If you get stuck, use the UNDO or RETRY buttons."
    },
    {
      rows: ["#######", "#.   .#", "# $ $ #", "#  @  #", "# $ $ #", "#.   .#", "#######"],
      copy: "Last one! Use UNDO or RETRY whenever you need them."
    },
    {
      final: true,
      copy: "There, you are now ready to play BOXXY and explore the fascinating puzzles."
    }
  ];

  let modal;
  let card;
  let stage;
  let progress;
  let backButton;
  let skipButton;
  let nextButton;
  let closeButton;
  let currentSlide = 0;
  let level = null;
  let lastFocus = null;
  let openTimer = null;
  let renderToken = 0;

  const keyOf = (x, y) => `${x},${y}`;

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function parseLevel(rows) {
    const width = Math.max(...rows.map(row => row.length));
    const height = rows.length;
    const grid = rows.map(row => row.padEnd(width, " ").split(""));
    const walls = new Set();
    const goals = new Set();
    const boxes = new Set();
    let player = null;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const ch = grid[y][x];
        if (ch === "#") walls.add(keyOf(x, y));
        if (".*+".includes(ch)) goals.add(keyOf(x, y));
        if ("$*".includes(ch)) boxes.add(keyOf(x, y));
        if ("@+".includes(ch)) player = { x, y };
      }
    }

    const outside = new Set();
    const queue = [];
    const addOutside = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const key = keyOf(x, y);
      if (walls.has(key) || outside.has(key)) return;
      outside.add(key);
      queue.push({ x, y });
    };

    for (let x = 0; x < width; x += 1) {
      addOutside(x, 0);
      addOutside(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      addOutside(0, y);
      addOutside(width - 1, y);
    }
    while (queue.length) {
      const point = queue.shift();
      addOutside(point.x - 1, point.y);
      addOutside(point.x + 1, point.y);
      addOutside(point.x, point.y - 1);
      addOutside(point.x, point.y + 1);
    }

    const floor = new Set();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const key = keyOf(x, y);
        if (!walls.has(key) && !outside.has(key)) floor.add(key);
      }
    }

    if (!player) throw new Error("Tutorial level has no player.");

    const initial = {
      player: { ...player },
      boxes: [...boxes],
      facing: "front"
    };

    return {
      width,
      height,
      walls,
      goals,
      outside,
      floor,
      player,
      boxes,
      facing: "front",
      history: [],
      moves: 0,
      pushes: 0,
      completed: false,
      initial
    };
  }

  function snapshot() {
    return {
      player: { ...level.player },
      boxes: [...level.boxes],
      facing: level.facing,
      moves: level.moves,
      pushes: level.pushes
    };
  }

  function restore(state) {
    level.player = { ...state.player };
    level.boxes = new Set(state.boxes);
    level.facing = state.facing;
    level.moves = state.moves;
    level.pushes = state.pushes;
    level.completed = isSolved();
  }

  function isSolved() {
    return level.goals.size > 0 && [...level.goals].every(goal => level.boxes.has(goal));
  }

  function frameName(mode, facing) {
    const prefix = mode === "walk" ? "walk" : mode === "push" ? "push" : "player";
    return `${prefix}-${facing}`;
  }

  function setPosition(node, x, y, z) {
    node.style.setProperty("--x", String(x));
    node.style.setProperty("--y", String(y));
    node.style.setProperty("--z", String(z));
  }

  function makeCell(className, x, y, z = 0) {
    const node = el("span", `tutorial-cell ${className}`);
    setPosition(node, x, y, z);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function makeBoardArt(className) {
    const node = el("span", `tutorial-board-art ${className}`);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function drawPlayer(image, mode) {
    const frame = frameName(mode, level.facing);
    image.dataset.characterFrame = frame;
    image.alt = "";
    image.draggable = false;
    image.decoding = "sync";
    image.src = `assets/characters-fallback/boy/${frame}.png`;
    const styler = window.CharacterStyler;
    if (styler && typeof styler.drawImage === "function") {
      Promise.resolve(styler.drawImage(image, frame)).catch(() => {});
    }
  }

  function renderBoard(mode = "idle") {
    const board = stage?.querySelector(".tutorial-board");
    if (!board || !level) return;

    const token = ++renderToken;
    board.innerHTML = "";
    board.style.setProperty("--tutorial-cols", String(level.width));
    board.style.setProperty("--tutorial-rows", String(level.height));
    board.style.aspectRatio = `${level.width} / ${level.height}`;
    board.classList.toggle("is-complete", level.completed);

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const key = keyOf(x, y);
        if (level.outside.has(key)) board.appendChild(makeCell("tutorial-void", x, y, 1));
      }
    }

    for (const wall of level.walls) {
      const [x, y] = wall.split(",").map(Number);
      board.appendChild(makeCell("tutorial-wall", x, y, 100 + y * 10));
    }

    for (const goal of level.goals) {
      const [x, y] = goal.split(",").map(Number);
      const cell = makeCell("tutorial-goal", x, y, 200 + y * 10);
      cell.appendChild(makeBoardArt("tutorial-board-art-goal"));
      board.appendChild(cell);
    }

    for (const box of level.boxes) {
      const [x, y] = box.split(",").map(Number);
      const onGoal = level.goals.has(box);
      const piece = el("span", `tutorial-piece tutorial-box${onGoal ? " on-goal" : ""}`);
      setPosition(piece, x, y, 500 + y * 10);
      piece.appendChild(makeBoardArt(`tutorial-board-art-box ${onGoal ? "tutorial-box-red" : "tutorial-box-yellow"}`));
      board.appendChild(piece);
    }

    const player = el("span", `tutorial-piece tutorial-player facing-${level.facing}${mode !== "idle" ? ` ${mode}` : ""}`);
    setPosition(player, level.player.x, level.player.y, 900 + level.player.y * 10);
    const image = document.createElement("img");
    drawPlayer(image, mode);
    player.appendChild(image);
    board.appendChild(player);

    updateControls();

    if (mode !== "idle") {
      window.setTimeout(() => {
        if (token === renderToken && modal && !modal.hidden) renderBoard("idle");
      }, 190);
    }
  }

  function updateControls() {
    if (!level) return;
    const moves = stage.querySelector("[data-tutorial-moves]");
    const pushes = stage.querySelector("[data-tutorial-pushes]");
    const status = stage.querySelector("[data-tutorial-status]");
    const undo = stage.querySelector("[data-tutorial-undo]");
    if (moves) moves.textContent = String(level.moves);
    if (pushes) pushes.textContent = String(level.pushes);
    if (undo) undo.disabled = level.history.length === 0;
    if (status) {
      status.textContent = level.completed ? "PUZZLE CLEARED" : "PUSH EVERY BOX ONTO A TARGET";
      status.classList.toggle("complete", level.completed);
    }
    nextButton.disabled = !level.completed;
    nextButton.textContent = "NEXT";
  }

  function move(directionName) {
    if (!level || level.completed) return;
    const direction = DIRECTIONS[directionName];
    if (!direction) return;
    level.facing = direction.facing;

    const next = {
      x: level.player.x + direction.dx,
      y: level.player.y + direction.dy
    };
    const nextKey = keyOf(next.x, next.y);
    if (!level.floor.has(nextKey)) {
      renderBoard("idle");
      return;
    }

    let pushed = false;
    const before = snapshot();
    if (level.boxes.has(nextKey)) {
      const beyond = {
        x: next.x + direction.dx,
        y: next.y + direction.dy
      };
      const beyondKey = keyOf(beyond.x, beyond.y);
      if (!level.floor.has(beyondKey) || level.boxes.has(beyondKey)) {
        renderBoard("idle");
        return;
      }
      level.boxes.delete(nextKey);
      level.boxes.add(beyondKey);
      level.pushes += 1;
      pushed = true;
    }

    level.history.push(before);
    level.player = next;
    level.moves += 1;
    level.completed = isSolved();
    renderBoard(pushed ? "push" : "walk");

    if (level.completed) {
      const board = stage.querySelector(".tutorial-board");
      board?.classList.add("celebrate");
      window.setTimeout(() => nextButton?.focus({ preventScroll: true }), 420);
    }
  }

  function undo() {
    if (!level || level.history.length === 0) return;
    restore(level.history.pop());
    renderBoard("idle");
  }

  function retry() {
    if (!level) return;
    restore({
      player: level.initial.player,
      boxes: level.initial.boxes,
      facing: level.initial.facing,
      moves: 0,
      pushes: 0
    });
    level.history = [];
    renderBoard("idle");
  }

  function arrowSvg(direction) {
    const paths = {
      up: "M12 3 22 17H2Z",
      left: "M3 12 17 2v20Z",
      down: "M2 7h20L12 21Z",
      right: "m21 12-14 10V2Z"
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[direction]}"></path></svg>`;
  }

  function buildDpad() {
    const pad = el("div", "tutorial-dpad");
    pad.setAttribute("aria-label", "Tutorial movement controls");
    for (const direction of ["up", "left", "down", "right"]) {
      const button = el("button", "");
      button.type = "button";
      button.dataset.tutorialDirection = direction;
      button.setAttribute("aria-label", `Move ${direction}`);
      button.innerHTML = arrowSvg(direction);
      button.addEventListener("click", () => move(direction));
      pad.appendChild(button);
    }
    return pad;
  }

  function buildPlayableSlide(slide) {
    level = parseLevel(slide.rows);

    const lesson = el("section", "tutorial-lesson");
    const gameColumn = el("div", "tutorial-game-column");
    const boardShell = el("div", "tutorial-board-shell");
    const board = el("div", "tutorial-board");
    board.tabIndex = 0;
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", `Playable BOXXY tutorial puzzle ${currentSlide + 1}`);
    boardShell.appendChild(board);

    let swipeStart = null;
    board.addEventListener("pointerdown", event => {
      swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      board.setPointerCapture?.(event.pointerId);
      board.focus({ preventScroll: true });
    });
    board.addEventListener("pointerup", event => {
      if (!swipeStart || swipeStart.id !== event.pointerId) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    });
    board.addEventListener("pointercancel", () => { swipeStart = null; });

    const controlRow = el("div", "tutorial-control-row tutorial-six-controls");
    const undoButton = el("button", "tutorial-undo", "UNDO");
    undoButton.type = "button";
    undoButton.dataset.tutorialUndo = "";
    undoButton.addEventListener("click", undo);

    const retryButton = el("button", "tutorial-retry", "RETRY");
    retryButton.type = "button";
    retryButton.addEventListener("click", retry);

    const directionButtons = {};
    for (const direction of ["up", "left", "down", "right"]) {
      const button = el("button", `tutorial-direction tutorial-direction-${direction}`);
      button.type = "button";
      button.dataset.tutorialDirection = direction;
      button.setAttribute("aria-label", `Move ${direction}`);
      button.innerHTML = arrowSvg(direction);
      button.addEventListener("click", () => move(direction));
      directionButtons[direction] = button;
    }

    controlRow.append(
      undoButton,
      directionButtons.up,
      retryButton,
      directionButtons.left,
      directionButtons.down,
      directionButtons.right
    );

    gameColumn.append(boardShell, controlRow);

    const copy = el("div", "tutorial-copy-panel");
    copy.appendChild(el("span", "tutorial-step-label", `${currentSlide + 1} / ${slides.length}`));
    copy.appendChild(el("h3", "", currentSlide === 0 ? "MOVE AND PUSH" : currentSlide === 1 ? "PLAN THE ROUTE" : currentSlide === 2 ? "ORDER MATTERS" : "PUT IT ALL TOGETHER"));
    copy.appendChild(el("p", "", slide.copy));
    const hint = el("p", "tutorial-input-hint", "Keyboard: arrow keys or WASD · Touch: swipe the board");
    copy.appendChild(hint);

    lesson.append(gameColumn, copy);
    stage.appendChild(lesson);
    renderBoard("idle");
  }

  function buildFinalSlide(slide) {
    level = null;
    const final = el("section", "tutorial-final-slide");
    const art = el("div", "tutorial-final-crate");
    art.appendChild(makeBoardArt("tutorial-board-art-box tutorial-box-yellow"));
    const copy = el("div", "tutorial-final-copy");
    copy.appendChild(el("span", "tutorial-step-label", `${slides.length} / ${slides.length}`));
    copy.appendChild(el("h3", "", "READY TO PLAY"));
    copy.appendChild(el("p", "", slide.copy));
    final.append(art, copy);
    stage.appendChild(final);
    nextButton.disabled = false;
    nextButton.textContent = "PLAY BOXXY";
  }

  function renderSlide() {
    stage.innerHTML = "";
    const slide = slides[currentSlide];
    if (slide.final) buildFinalSlide(slide);
    else buildPlayableSlide(slide);

    [...progress.children].forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide);
      dot.classList.toggle("complete", index < currentSlide);
    });

    backButton.disabled = currentSlide === 0;
    skipButton.hidden = currentSlide === slides.length - 1;
    stage.scrollTop = 0;
  }

  function createModal() {
    if (modal) return modal;

    modal = el("div", "how-to-play-modal");
    modal.id = "howToPlayModal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

    card = el("section", "how-to-play-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "howToPlayTitle");

    const head = el("header", "how-to-play-head");
    const title = el("div", "how-to-play-title");
    title.append(el("span", "", "BOXXY · PUSHBOX PUZZLE"), el("h2", "", "HOW TO PLAY BOXXY"));
    title.lastChild.id = "howToPlayTitle";

    progress = el("div", "how-to-play-progress");
    progress.setAttribute("aria-hidden", "true");
    slides.forEach(() => progress.appendChild(document.createElement("i")));

    closeButton = el("button", "how-to-play-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close how to play");
    head.append(title, progress, closeButton);

    stage = el("div", "how-to-play-stage");

    const foot = el("footer", "how-to-play-foot");
    backButton = el("button", "how-to-play-back", "BACK");
    backButton.type = "button";
    skipButton = el("button", "how-to-play-skip", "SKIP TUTORIAL");
    skipButton.type = "button";
    nextButton = el("button", "how-to-play-next", "NEXT");
    nextButton.type = "button";
    foot.append(backButton, skipButton, nextButton);

    card.append(head, stage, foot);
    modal.appendChild(card);
    document.body.appendChild(modal);

    backButton.addEventListener("click", () => {
      if (currentSlide === 0) return;
      currentSlide -= 1;
      renderSlide();
    });

    nextButton.addEventListener("click", () => {
      if (nextButton.disabled) return;
      if (currentSlide < slides.length - 1) {
        currentSlide += 1;
        renderSlide();
      } else {
        dismissTutorial();
      }
    });

    skipButton.addEventListener("click", dismissTutorial);
    closeButton.addEventListener("click", dismissTutorial);
    modal.addEventListener("pointerdown", event => {
      if (event.target === modal) event.preventDefault();
    });

    return modal;
  }

  function openTutorial() {
    createModal();
    clearTimeout(openTimer);
    lastFocus = document.activeElement;
    currentSlide = 0;
    renderSlide();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("how-to-play-open");
    window.setTimeout(() => stage.querySelector(".tutorial-board")?.focus({ preventScroll: true }), 40);
  }

  function closeTutorial(markDismissed) {
    if (!modal || modal.hidden) return;
    if (markDismissed) storageSet(STORAGE_KEY, "1");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("how-to-play-open");
    level = null;
    const target = lastFocus && typeof lastFocus.focus === "function" ? lastFocus : document.getElementById("howToPlayBtn");
    target?.focus?.({ preventScroll: true });
  }

  function dismissTutorial() {
    closeTutorial(true);
  }

  function waitForSplashThenOpen() {
    const force = new URLSearchParams(location.search).get("tutorial") === "1";
    if (!force && (!AUTO_HOSTS.has(location.hostname) || storageGet(STORAGE_KEY) === "1")) return;

    const splash = document.getElementById("splashScreen");
    if (!splash || splash.hidden) {
      openTimer = window.setTimeout(openTutorial, 180);
      return;
    }

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      observer.disconnect();
      openTimer = window.setTimeout(openTutorial, 650);
    };
    const observer = new MutationObserver(() => {
      if (splash.hidden || splash.classList.contains("hide")) schedule();
    });
    observer.observe(splash, { attributes: true, attributeFilter: ["hidden", "class"] });
    window.setTimeout(schedule, 4300);
  }

  function handleKeydown(event) {
    if (!modal || modal.hidden) return;

    const key = event.key;
    const keyDirections = {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };

    if (keyDirections[key] && level) {
      event.preventDefault();
      event.stopImmediatePropagation();
      move(keyDirections[key]);
      return;
    }
    if ((key === "z" || key === "Z" || key === "u" || key === "U") && level) {
      event.preventDefault();
      event.stopImmediatePropagation();
      undo();
      return;
    }
    if ((key === "r" || key === "R") && level) {
      event.preventDefault();
      event.stopImmediatePropagation();
      retry();
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      dismissTutorial();
      return;
    }
    if (key === "Tab") {
      const focusables = [...card.querySelectorAll("button:not([disabled]):not([hidden]), [tabindex='0']")].filter(node => node.offsetParent !== null);
      if (!focusables.length) return;
      const index = focusables.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      const next = (index + direction + focusables.length) % focusables.length;
      event.preventDefault();
      focusables[next]?.focus();
      event.stopImmediatePropagation();
    }
  }

  function bindHelpButton() {
    const button = document.getElementById("howToPlayBtn");
    if (!button || button.dataset.howToPlayBound === "1") return;
    button.dataset.howToPlayBound = "1";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openTutorial();
    });
  }

  function initialise() {
    bindHelpButton();
  }

  document.addEventListener("keydown", handleKeydown, { capture: true });
  document.addEventListener("click", event => {
    const button = event.target instanceof Element ? event.target.closest("#howToPlayBtn") : null;
    if (!button || button.dataset.howToPlayBound === "1") return;
    event.preventDefault();
    event.stopPropagation();
    openTutorial();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise, { once: true });
  else initialise();
})();
