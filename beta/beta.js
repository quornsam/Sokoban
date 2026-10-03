/* BOXXY v440 — two-player beta client. */
(() => {
  "use strict";

  const API = "/api/beta-game";
  const ACCOUNT_API = "/api/account";
  const ACTIVE_KEY = "boxxy-beta-active-v1";
  const POLL_MS = 180;
  const HOLD_DELAY_MS = 330;
  const REPEAT_MS = 105;

  const lobby = document.getElementById("lobby");
  const gameView = document.getElementById("gameView");
  const accountState = document.getElementById("accountState");
  const loginForm = document.getElementById("loginForm");
  const loginIdentity = document.getElementById("loginIdentity");
  const loginPassword = document.getElementById("loginPassword");
  const createBtn = document.getElementById("createBtn");
  const joinForm = document.getElementById("joinForm");
  const joinCode = document.getElementById("joinCode");
  const lobbyStatus = document.getElementById("lobbyStatus");
  const playerOne = document.getElementById("playerOne");
  const playerTwo = document.getElementById("playerTwo");
  const playerOneName = document.getElementById("playerOneName");
  const playerTwoName = document.getElementById("playerTwoName");
  const gameCodeLabel = document.getElementById("gameCodeLabel");
  const waitingPanel = document.getElementById("waitingPanel");
  const inviteCode = document.getElementById("inviteCode");
  const copyCodeBtn = document.getElementById("copyCodeBtn");
  const boardShell = document.getElementById("boardShell");
  const board = document.getElementById("board");
  const countdown = document.getElementById("countdown");
  const winnerOverlay = document.getElementById("winnerOverlay");
  const winnerText = document.getElementById("winnerText");
  const newGameBtn = document.getElementById("newGameBtn");
  const yourRole = document.getElementById("yourRole");
  const gameStatus = document.getElementById("gameStatus");

  let account = null;
  let currentCode = "";
  let guestToken = "";
  let game = null;
  let serverOffset = 0;
  let pollTimer = 0;
  let polling = false;
  let movePending = false;
  let cellNodes = [];
  let boardSignature = "";
  let playerNodes = [];
  let boxNode = null;
  let holdDelay = 0;
  let holdRepeat = 0;
  let holdKey = "";
  let touchStart = null;

  function setLobbyStatus(message = "") {
    lobbyStatus.textContent = message;
  }

  function betaHeaders(extra = {}) {
    const headers = { ...extra };
    if (guestToken) headers["X-Boxxy-Beta-Token"] = guestToken;
    return headers;
  }

  async function jsonRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: betaHeaders(options.headers || {})
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok && !data.error) data.error = `Request failed (${response.status}).`;
    return { response, data };
  }

  function rememberActive() {
    if (!currentCode) return;
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify({ code: currentCode, guestToken }));
    } catch (_) {}
  }

  function clearActive() {
    try { localStorage.removeItem(ACTIVE_KEY); } catch (_) {}
  }

  function readActive() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null");
      if (parsed?.code) return { code: String(parsed.code), guestToken: String(parsed.guestToken || "") };
    } catch (_) {}
    return null;
  }

  async function refreshAccount() {
    try {
      const { data } = await jsonRequest(ACCOUNT_API);
      account = data?.authenticated ? data.account : null;
    } catch (_) {
      account = null;
    }
    if (account) {
      accountState.textContent = `SIGNED IN AS ${String(account.username || "").toUpperCase()}`;
      loginForm.hidden = true;
      createBtn.disabled = false;
    } else {
      accountState.textContent = "SIGN IN TO HOST A GAME";
      loginForm.hidden = false;
      createBtn.disabled = true;
    }
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setLobbyStatus("");
    const identity = loginIdentity.value.trim();
    const password = loginPassword.value;
    if (!identity || !password) return setLobbyStatus("ENTER YOUR USERNAME/EMAIL AND PASSWORD.");
    const submit = loginForm.querySelector("button[type='submit']");
    submit.disabled = true;
    const { response, data } = await jsonRequest(ACCOUNT_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "login", identity, password })
    });
    submit.disabled = false;
    if (!response.ok || !data?.authenticated) return setLobbyStatus(data?.error || "SIGN-IN FAILED.");
    account = data.account;
    loginPassword.value = "";
    await refreshAccount();
  });

  createBtn.addEventListener("click", async () => {
    createBtn.disabled = true;
    setLobbyStatus("STARTING GAME…");
    const { response, data } = await jsonRequest(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create" })
    });
    createBtn.disabled = !account;
    if (!response.ok || !data?.game) return setLobbyStatus(data?.error || "COULD NOT START GAME.");
    guestToken = "";
    enterGame(data.game, data.serverNow);
  });

  joinCode.addEventListener("input", () => {
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  });

  joinForm.addEventListener("submit", async event => {
    event.preventDefault();
    setLobbyStatus("");
    const code = joinCode.value.trim().toUpperCase();
    if (code.length !== 6) return setLobbyStatus("ENTER THE SIX-CHARACTER GAME CODE.");
    const button = joinForm.querySelector("button");
    button.disabled = true;
    const { response, data } = await jsonRequest(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join", code })
    });
    button.disabled = false;
    if (!response.ok || !data?.game) return setLobbyStatus(data?.error || "COULD NOT JOIN GAME.");
    guestToken = String(data.guestToken || "");
    enterGame(data.game, data.serverNow);
  });

  function enterGame(nextGame, serverNow) {
    game = nextGame;
    currentCode = String(nextGame.code || "");
    updateServerOffset(serverNow);
    rememberActive();
    lobby.hidden = true;
    gameView.hidden = false;
    board.focus({ preventScroll: true });
    renderGame();
    startPolling();
  }

  function leaveGame() {
    stopPolling();
    clearMoveRepeat();
    currentCode = "";
    guestToken = "";
    game = null;
    boardSignature = "";
    cellNodes = [];
    playerNodes = [];
    boxNode = null;
    board.replaceChildren();
    winnerOverlay.hidden = true;
    countdown.hidden = true;
    clearActive();
    gameView.hidden = true;
    lobby.hidden = false;
    setLobbyStatus("");
  }

  newGameBtn.addEventListener("click", leaveGame);

  copyCodeBtn.addEventListener("click", async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      copyCodeBtn.textContent = "COPIED";
      setTimeout(() => { copyCodeBtn.textContent = "COPY CODE"; }, 1200);
    } catch (_) {
      copyCodeBtn.textContent = currentCode;
    }
  });

  function updateServerOffset(serverNow) {
    const value = Number(serverNow);
    if (Number.isFinite(value) && value > 0) serverOffset = value - Date.now();
  }

  function serverNow() {
    return Date.now() + serverOffset;
  }

  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(pollState, POLL_MS);
  }

  function stopPolling() {
    window.clearInterval(pollTimer);
    pollTimer = 0;
  }

  async function pollState() {
    if (!currentCode || polling) return;
    polling = true;
    try {
      const { response, data } = await jsonRequest(`${API}?code=${encodeURIComponent(currentCode)}`);
      if (response.ok && data?.game) {
        updateServerOffset(data.serverNow);
        game = data.game;
        renderGame();
      } else if (response.status === 404 || response.status === 403) {
        gameStatus.textContent = data?.error || "GAME ENDED";
        stopPolling();
      }
    } catch (_) {
      gameStatus.textContent = "RECONNECTING…";
    } finally {
      polling = false;
    }
  }

  function boardKey(x, y) {
    return `${x},${y}`;
  }

  function ensureBoard() {
    if (!game?.board) return;
    const b = game.board;
    const signature = `${b.width}x${b.height}:${JSON.stringify(b.walls)}:${JSON.stringify(b.targets)}`;
    if (signature === boardSignature && cellNodes.length) return;
    boardSignature = signature;
    board.replaceChildren();
    board.style.gridTemplateColumns = `repeat(${b.width}, var(--cell))`;
    board.style.gridTemplateRows = `repeat(${b.height}, var(--cell))`;
    const walls = new Set((b.walls || []).map(point => boardKey(point.x, point.y)));
    const targets = new Map((b.targets || []).map((point, index) => [boardKey(point.x, point.y), index]));
    cellNodes = Array.from({ length: b.width * b.height }, (_, index) => {
      const x = index % b.width;
      const y = Math.floor(index / b.width);
      const cell = document.createElement("div");
      cell.className = walls.has(boardKey(x, y)) ? "cell wall" : "cell";
      const targetIndex = targets.get(boardKey(x, y));
      if (targetIndex !== undefined) {
        const goal = document.createElement("div");
        goal.className = `goal-piece goal-${targetIndex === 0 ? "one" : "two"}`;
        cell.append(goal);
      }
      board.append(cell);
      return cell;
    });
    playerNodes = [0, 1].map(slot => {
      const node = document.createElement("div");
      node.className = `player-piece player-${slot === 0 ? "one" : "two"}-piece`;
      return node;
    });
    boxNode = document.createElement("div");
    boxNode.className = "box-piece";
    fitBoard();
  }

  function cellAt(point) {
    if (!game?.board || !point) return null;
    const x = Number(point.x);
    const y = Number(point.y);
    if (x < 0 || y < 0 || x >= game.board.width || y >= game.board.height) return null;
    return cellNodes[y * game.board.width + x] || null;
  }

  function renderPieces() {
    if (!game?.board) return;
    const boxCell = cellAt(game.board.box);
    if (boxCell && boxNode) boxCell.append(boxNode);
    (game.board.players || []).forEach((player, slot) => {
      const cell = cellAt(player);
      const node = playerNodes[slot];
      if (!cell || !node) return;
      const facing = String(player.facing || (slot === 0 ? "right" : "left"));
      node.dataset.facing = facing === "up" ? "back" : facing === "down" ? "front" : facing;
      cell.append(node);
    });
  }

  function renderGame() {
    if (!game) return;
    ensureBoard();
    renderPieces();
    fitBoard();

    const names = game.players || [];
    playerOneName.textContent = names[0]?.name || "PLAYER 1";
    playerTwoName.textContent = names[1]?.name || "PLAYER 2";
    gameCodeLabel.textContent = game.code;
    inviteCode.textContent = game.code;
    playerOne.classList.toggle("is-you", Number(game.role) === 1);
    playerTwo.classList.toggle("is-you", Number(game.role) === 2);
    playerOne.classList.toggle("is-winner", Number(game.winner) === 1);
    playerTwo.classList.toggle("is-winner", Number(game.winner) === 2);
    yourRole.textContent = `YOU ARE PLAYER ${game.role}`;

    waitingPanel.hidden = game.status !== "waiting";
    if (game.status === "waiting") gameStatus.textContent = "WAITING FOR PLAYER 2";
    else if (game.status === "countdown") gameStatus.textContent = "GET READY";
    else if (game.status === "playing") gameStatus.textContent = "FIRST TO THEIR TARGET WINS";
    else if (game.status === "finished") gameStatus.textContent = "GAME OVER";

    renderCountdown();
    renderWinner();
  }

  function renderCountdown() {
    if (!game || game.status !== "countdown") {
      countdown.hidden = true;
      return;
    }
    const remaining = Number(game.startsAt || 0) - serverNow();
    if (remaining <= 0) {
      countdown.hidden = true;
      return;
    }
    countdown.hidden = false;
    countdown.textContent = String(Math.max(1, Math.min(3, Math.ceil(remaining / 1000))));
  }

  function renderWinner() {
    const winner = Number(game?.winner || 0);
    winnerOverlay.hidden = !winner;
    if (!winner) return;
    const name = game.players?.[winner - 1]?.name || `PLAYER ${winner}`;
    winnerText.textContent = `${String(name).toUpperCase()} WINS!`;
  }

  function fitBoard() {
    if (!game?.board) return;
    const width = Number(game.board.width || 1);
    const height = Number(game.board.height || 1);
    const viewportWidth = Math.max(240, window.innerWidth - 32);
    const reserved = window.innerWidth <= 720 ? 220 : 270;
    const viewportHeight = Math.max(220, window.innerHeight - reserved);
    const cell = Math.max(16, Math.min(62, Math.floor(Math.min(viewportWidth / width, viewportHeight / height))));
    board.style.setProperty("--cell", `${cell}px`);
  }

  window.addEventListener("resize", fitBoard, { passive: true });

  async function sendMove(direction) {
    if (!game || game.status !== "playing" || game.winner || movePending) return;
    movePending = true;
    try {
      const { response, data } = await jsonRequest(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "move", code: currentCode, direction })
      });
      if (response.ok && data?.game) {
        updateServerOffset(data.serverNow);
        game = data.game;
        renderGame();
      }
    } finally {
      movePending = false;
    }
  }

  const directionMap = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right"
  };

  function clearMoveRepeat() {
    window.clearTimeout(holdDelay);
    window.clearInterval(holdRepeat);
    holdDelay = 0;
    holdRepeat = 0;
    holdKey = "";
  }

  function startMoveRepeat(key, direction) {
    clearMoveRepeat();
    holdKey = key;
    sendMove(direction);
    holdDelay = window.setTimeout(() => {
      holdRepeat = window.setInterval(() => sendMove(direction), REPEAT_MS);
    }, HOLD_DELAY_MS);
  }

  document.addEventListener("keydown", event => {
    if (gameView.hidden) return;
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable='true']")) return;
    const direction = directionMap[event.key];
    if (!direction) return;
    event.preventDefault();
    if (event.repeat) return;
    startMoveRepeat(event.code || event.key, direction);
  });

  document.addEventListener("keyup", event => {
    if (!directionMap[event.key]) return;
    if (!holdKey || holdKey === (event.code || event.key)) clearMoveRepeat();
  });
  window.addEventListener("blur", clearMoveRepeat);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearMoveRepeat(); });

  boardShell.addEventListener("pointerdown", event => {
    if (gameView.hidden || event.pointerType === "mouse") return;
    touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    try { boardShell.setPointerCapture(event.pointerId); } catch (_) {}
  });
  boardShell.addEventListener("pointerup", event => {
    if (!touchStart || touchStart.id !== event.pointerId) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    sendMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  boardShell.addEventListener("pointercancel", () => { touchStart = null; });

  window.setInterval(renderCountdown, 100);

  async function restoreActiveGame() {
    const saved = readActive();
    if (!saved?.code) return false;
    currentCode = saved.code;
    guestToken = saved.guestToken || "";
    try {
      const { response, data } = await jsonRequest(`${API}?code=${encodeURIComponent(currentCode)}`);
      if (response.ok && data?.game) {
        enterGame(data.game, data.serverNow);
        return true;
      }
    } catch (_) {}
    currentCode = "";
    guestToken = "";
    clearActive();
    return false;
  }

  (async () => {
    await refreshAccount();
    await restoreActiveGame();
  })();
})();
