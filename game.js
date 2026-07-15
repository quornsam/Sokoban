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

  let levelIndex = Math.max(0, Math.min(LEVELS.length - 1, Number(localStorage.getItem("push-bauhaus-v33-level") || localStorage.getItem("push-bauhaus-v29-level") || 0)));
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
  const LEVEL_PROGRESS_KEY = "boxxy-level-progress-v1";
  const LEVEL_COMPLETED_KEY = "boxxy-completed-levels-v1";
  let completedLevels = new Set();
  let highestUnlockedLevel = 0;

  function loadLevelProgress() {
    try {
      const savedCompleted = JSON.parse(localStorage.getItem(LEVEL_COMPLETED_KEY) || "[]");
      if (Array.isArray(savedCompleted)) {
        savedCompleted.forEach(value => {
          const index = Number(value);
          if (Number.isInteger(index) && index >= 0 && index < LEVELS.length) completedLevels.add(index);
        });
      }
    } catch (_) {}

    // Migrate previously completed puzzles from the existing best-score records.
    LEVELS.forEach((level, index) => {
      if (localStorage.getItem(`push-bauhaus-v22-best-${level.sourceNumber}`)) completedLevels.add(index);
    });

    const storedProgress = Number(localStorage.getItem(LEVEL_PROGRESS_KEY));
    const furthestCompleted = completedLevels.size ? Math.max(...completedLevels) + 1 : 0;
    highestUnlockedLevel = Math.max(
      0,
      Number.isFinite(storedProgress) ? storedProgress : 0,
      furthestCompleted,
      levelIndex
    );
    highestUnlockedLevel = Math.min(highestUnlockedLevel, LEVELS.length - 1);
    saveLevelProgress();
  }

  function saveLevelProgress() {
    localStorage.setItem(LEVEL_PROGRESS_KEY, String(highestUnlockedLevel));
    localStorage.setItem(LEVEL_COMPLETED_KEY, JSON.stringify([...completedLevels].sort((a, b) => a - b)));
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
    highestUnlockedLevel = 0;
    saveLevelProgress();
    LEVELS.forEach((level) => {
      localStorage.removeItem(`push-bauhaus-v22-best-${level.sourceNumber}`);
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
      const isLocked = index > highestUnlockedLevel;
      button.classList.toggle("current", isCurrent);
      button.classList.toggle("completed", isCompleted && !isCurrent);
      button.classList.toggle("locked", isLocked);
      button.disabled = isLocked;
      button.setAttribute("aria-disabled", String(isLocked));
      button.title = isLocked
        ? `Complete level ${index} to unlock level ${index + 1}`
        : `${index + 1}. ${LEVELS[index].name} — ${LEVELS[index].tier}`;
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
    if (!floorLayer) return;
    floorLayer.innerHTML = "";
    if (currentTheme !== "ink") return;
    for (const point of floor) {
      const [x, y] = point.split(",").map(Number);
      const cell = document.createElement("div");
      const variant = Math.abs((x * 17 + y * 29) % 4);
      cell.className = `cell floor-cell floor-variant-${variant}`;
      cell.style.cssText = posStyle(x, y, 0);
      cell.style.setProperty("--floor-img", `url("assets/themes/ink/floor-${variant}.png")`);
      floorLayer.appendChild(cell);
    }
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
      if (currentTheme === "ink") {
        const variant = Math.abs((x * 11 + y * 23) % 4);
        cell.dataset.inkWall = String(variant);
        cell.style.setProperty("--wall-img", `url("assets/themes/ink/wall-${variant}.png")`);
      }
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
      image.src = themeAsset(currentTheme === "ink" ? "target.png" : "goal-red.png");
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
      const onGoal = isGoal(box.x, box.y);
      const piece = document.createElement("div");
      piece.className = `piece box${onGoal ? " on-goal" : ""}${anim === "push" && box.moving ? " pushing" : ""}`;
      piece.style.cssText = posStyle(box.x, box.y, depth(box.y, "box"));
      const image = document.createElement("img");
      image.src = currentTheme === "ink" ? themeAsset("crate.png") : themeAsset(`crate-${onGoal ? "red" : "yellow"}.png`);
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
    minimumEl.textContent = makerTesting ? "—" : levelData.minimum;
    levelCount.textContent = makerTesting ? "MAKER" : `${levelIndex + 1} / ${LEVELS.length}`;
    const best = makerTesting ? null : localStorage.getItem(`push-bauhaus-v22-best-${levelData.sourceNumber}`);
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
    document.body.classList.remove("maker-testing");
    if (makerReturnBtn) makerReturnBtn.hidden = true;
    const requestedIndex = (index + LEVELS.length) % LEVELS.length;
    if (!preserveAutoplay && requestedIndex > highestUnlockedLevel) return;
    if (!preserveAutoplay) stopAutoplay();
    resetEasterEgg();
    blockedPushHeld = false;
    clearTimeout(animTimer);
    levelIndex = requestedIndex;
    localStorage.setItem("push-bauhaus-v33-level", levelIndex);
    levelData = LEVELS[levelIndex];
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
    if (completeKicker) completeKicker.textContent = "BAUHAUS COLLECTION";
    if (completeTitle) completeTitle.innerHTML = "PUZZLE<br>CLEARED";
    if (nextBtnLabel) nextBtnLabel.textContent = "NEXT LEVEL";
    if (nextBtnIcon) nextBtnIcon.textContent = "→";
    board.style.setProperty("--cols", width);
    board.style.setProperty("--rows", height);
    board.style.setProperty("--ratio", width / height);
    board.style.aspectRatio = `${width} / ${height}`;
    if (!preserveBackground) refreshBackgroundDecor(backgroundDecorBuilt);
    scheduleBoardResize();
    creditTitle.textContent = `${levelData.tier} · ${levelData.name}`;
    creditSub.textContent = `DAVID W. SKINNER · ${width}×${height} · ${levelData.pushMinimum} ${levelData.pushMinimum === 1 ? "PUSH" : "PUSHES"}`;
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

  function loadMakerTest(layoutRows) {
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
      completeMode = "normal";
      document.body.classList.add("maker-testing");
      if (makerReturnBtn) makerReturnBtn.hidden = false;
      levelData = {
        sourceNumber: "maker",
        name: "CUSTOM TEST",
        tier: "LEVEL MAKER",
        minimum: "—",
        pushMinimum: parsed.boxes.length,
        solution: "",
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
    loadMakerTest(makerLayout);
  }

  function exitMakerTest() {
    if (!makerTesting) return;
    makerTesting = false;
    makerLayout = null;
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
      if (completeKicker) completeKicker.textContent = "LEVEL MAKER";
      if (completeTitle) completeTitle.innerHTML = "TEST<br>COMPLETE";
      completeText.textContent = `Custom level solved in ${moves} moves and ${pushes} pushes.`;
      if (nextBtnLabel) nextBtnLabel.textContent = "BACK TO MAKER";
      if (nextBtnIcon) nextBtnIcon.textContent = "←";
    } else {
      const bestKey = `push-bauhaus-v22-best-${levelData.sourceNumber}`;
      const oldBest = Number(localStorage.getItem(bestKey) || 0);
      if (!autoplayRunning && (!oldBest || moves < oldBest)) localStorage.setItem(bestKey, moves);
      if (!autoplayRunning) {
        completedLevels.add(levelIndex);
        highestUnlockedLevel = Math.max(highestUnlockedLevel, Math.min(levelIndex + 1, LEVELS.length - 1));
        saveLevelProgress();
        refreshLevelButtons();
      }

      if (levelIndex === LEVELS.length - 1 && !autoplayRunning) {
        completeMode = "final";
        completeCard?.classList.add("final-complete");
        if (completeKicker) completeKicker.textContent = "CONGRATULATIONS";
        if (completeTitle) completeTitle.innerHTML = "ALL 50<br>LEVELS<br>CLEARED";
        completeText.textContent = `You completed level 50 in ${moves} moves and ${pushes} pushes — and finished the entire collection.`;
        if (nextBtnLabel) nextBtnLabel.textContent = "CHOOSE A LEVEL";
        if (nextBtnIcon) nextBtnIcon.textContent = "✓";
      } else {
        completeMode = "normal";
        completeCard?.classList.remove("final-complete");
        if (completeKicker) completeKicker.textContent = "BAUHAUS COLLECTION";
        if (completeTitle) completeTitle.innerHTML = "PUZZLE<br>CLEARED";
        const difference = moves - Number(levelData.minimum || 0);
        completeText.textContent = difference === 0
          ? `Perfect route: ${moves} moves and ${pushes} pushes.`
          : `Solved in ${moves} moves and ${pushes} pushes — ${difference} over the minimum.`;
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
  // Collection switching is temporarily disabled; Bauhaus remains active.
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
    if (event.key === "Escape" && themeModal && !themeModal.hidden) { closeThemeModal(); return; }
    if (event.key === "Escape" && resetConfirmModal && !resetConfirmModal.hidden) {
      closeResetConfirm();
      return;
    }
    if (event.key === "Escape" && !levelPicker.hidden) closeLevelPicker();
  });
  window.BoxxyGameAPI = {
    startMakerTest(layoutRows) { return loadMakerTest(layoutRows); },
    exitMakerTest() { exitMakerTest(); },
    restartMakerTest() { restartMakerTest(); },
    isMakerTesting() { return makerTesting; }
  };

  applyTheme(currentTheme, false);
  loadLevelProgress();
  buildLevelButtons();
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
