(() => {
  "use strict";

  const LEVELS = window.SOKOBAN_LEVELS || [];
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
  const modal = document.getElementById("completeModal");
  const completeText = document.getElementById("completeText");
  const nextBtn = document.getElementById("nextBtn");
  const celebration = document.getElementById("celebration");
  const board = document.getElementById("board");
  const boardWrap = document.querySelector(".board-wrap");
  const app = document.querySelector(".app");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const autoSolveBtn = document.getElementById("autoSolveBtn");

  let levelIndex = Math.max(0, Math.min(LEVELS.length - 1, Number(localStorage.getItem("push-bauhaus-v29-level") || 0)));
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

  const key = (x, y) => `${x},${y}`;
  const copyBoxes = list => list.map(box => ({ ...box }));
  const posStyle = (x, y, z) => `--x:${x};--y:${y};--z:${z}`;
  const depth = (y, kind) => 1000 + y * 100 + ({ goal: 0, wall: 15, box: 35, player: 60 }[kind] || 0);


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
      const image = document.createElement("img");
      image.src = `assets/goal-${index % 2 ? "yellow" : "red"}.png`;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      cell.appendChild(image);
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
      const piece = document.createElement("div");
      piece.className = `piece box${isGoal(box.x, box.y) ? " on-goal" : ""}${anim === "push" && box.moving ? " pushing" : ""}`;
      piece.style.cssText = posStyle(box.x, box.y, depth(box.y, "box"));
      const image = document.createElement("img");
      image.src = `assets/crate-${box.color}.png`;
      image.alt = "";
      piece.appendChild(image);
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
    minimumEl.textContent = levelData.minimum;
    levelCount.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    const best = localStorage.getItem(`push-bauhaus-v22-best-${levelData.sourceNumber}`);
    bestEl.textContent = best || "—";
    undoBtn.disabled = !history.length || completed;
    [...levelButtons.children].forEach((button, index) => button.classList.toggle("current", index === levelIndex));
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

  function loadLevel(index, preserveAutoplay = false) {
    if (!preserveAutoplay) stopAutoplay();
    resetEasterEgg();
    blockedPushHeld = false;
    clearTimeout(animTimer);
    levelIndex = (index + LEVELS.length) % LEVELS.length;
    localStorage.setItem("push-bauhaus-v29-level", levelIndex);
    levelData = LEVELS[levelIndex];
    const parsed = parseLayout(levelData.layout);
    width = parsed.width;
    height = parsed.height;
    walls = parsed.walls;
    floor = parsed.floor;
    outside = parsed.outside;
    player = [...parsed.player];
    boxes = parsed.boxes.map(([x, y], index) => ({ x, y, color: index % 2 ? "yellow" : "red", moving: false }));
    goals = parsed.goals.map(([x, y]) => ({ x, y }));
    moves = 0;
    pushes = 0;
    history = [];
    facing = "front";
    completed = false;
    modal.hidden = true;
    board.style.setProperty("--cols", width);
    board.style.setProperty("--rows", height);
    board.style.setProperty("--ratio", width / height);
    board.style.aspectRatio = `${width} / ${height}`;
    scheduleBoardResize();
    creditTitle.textContent = `${levelData.tier} · ${levelData.name}`;
    creditSub.textContent = `DAVID W. SKINNER · ${width}×${height} · ${levelData.pushMinimum} ${levelData.pushMinimum === 1 ? "PUSH" : "PUSHES"}`;
    startedAt = Date.now();
    clearInterval(timer);
    timer = setInterval(updateTime, 250);
    buildVoid();
    buildWalls();
    buildGoals();
    render("idle");
    updateTime();
    scheduleIdle();
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
    const bestKey = `push-bauhaus-v22-best-${levelData.sourceNumber}`;
    const oldBest = Number(localStorage.getItem(bestKey) || 0);
    if (!autoplayRunning && (!oldBest || moves < oldBest)) localStorage.setItem(bestKey, moves);
    const difference = moves - levelData.minimum;
    completeText.textContent = difference === 0
      ? `Perfect route: ${moves} moves and ${pushes} pushes.`
      : `Solved in ${moves} moves and ${pushes} pushes — ${difference} over the minimum.`;
    burst();
    sfx.finish();
    setTimeout(() => {
      modal.hidden = false;
      render("idle");
    }, 500);
  }

  function burst() {
    celebration.innerHTML = "";
    const colors = ["#db3b27", "#e5b32a", "#20539a", "#171719"];
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
      button.textContent = index + 1;
      button.title = `${index + 1}. ${level.name} — ${level.tier}`;
      button.addEventListener("click", () => {
        levelPicker.hidden = true;
        loadLevel(index);
      });
      levelButtons.appendChild(button);
    });
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
    loadLevel(levelIndex, true);
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
    if (window.CharacterStyler?.isOpen) return;
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
      loadLevel(levelIndex);
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
  restartBtn.addEventListener("click", () => loadLevel(levelIndex));
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.querySelector("b").textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    if (soundOn) ensureAudio();
  });
  musicBtn?.addEventListener("click", () => {
    musicOn = !musicOn;
    localStorage.setItem("push-bauhaus-music", musicOn ? "on" : "off");
    updateMusicButton();
    if (musicOn) startBackgroundMusic();
    else pauseBackgroundMusic();
  });
  levelBtn.addEventListener("click", () => { levelPicker.hidden = !levelPicker.hidden; });
  nextBtn.addEventListener("click", () => loadLevel(levelIndex + 1));

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
  document.addEventListener("pointerdown", retryMusicAfterInteraction, { capture: true });
  document.addEventListener("keydown", retryMusicAfterInteraction, { capture: true });
  buildLevelButtons();
  Promise.resolve(window.CharacterStyler?.ready).finally(() => loadLevel(levelIndex));
})();
