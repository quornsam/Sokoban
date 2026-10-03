/* BOXXY v441 — direct PeerJS/WebRTC two-player beta client. */
(() => {
  "use strict";

  const ACCOUNT_API = "/api/account";
  const PEER_PREFIX = "boxxy-beta-";
  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const COUNTDOWN_MS = 3000;
  const HOLD_DELAY_MS = 330;
  const REPEAT_MS = 105;
  const MIN_MOVE_INTERVAL_MS = 80;

  const MAP_TEXT = `###############
#@            #
#    # .  # # #
#  #   #      #
#             #
#  ########   #
#             #
#      $      #
#             #
#   ########  #
#             #
#      #   #  #
# # #  . #    #
#            @#
###############`;

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
  let peer = null;
  let connection = null;
  let currentCode = "";
  let game = null;
  let isHost = false;
  let countdownDeadline = 0;
  let countdownTimer = 0;
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

  async function jsonRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: options.headers || {}
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok && !data.error) data.error = `Request failed (${response.status}).`;
    return { response, data };
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

  function randomCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  }

  function cleanCode(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }

  function pointKey(x, y) {
    return `${x},${y}`;
  }

  function samePoint(point, x, y) {
    return Number(point?.x) === x && Number(point?.y) === y;
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function parseMap(mapText = MAP_TEXT) {
    const rows = String(mapText).replace(/\r/g, "").split("\n");
    const height = rows.length;
    const width = Math.max(...rows.map(row => row.length));
    const walls = [];
    const players = [];
    const targetsFound = [];
    const boxes = [];

    for (let y = 0; y < height; y++) {
      const row = rows[y].padEnd(width, " ");
      for (let x = 0; x < width; x++) {
        const cell = row[x];
        if (cell === "#") walls.push({ x, y });
        if (cell === "@" || cell === "+") players.push({ x, y });
        if (cell === "." || cell === "+" || cell === "*") targetsFound.push({ x, y });
        if (cell === "$" || cell === "*") boxes.push({ x, y });
      }
    }

    if (players.length !== 2 || targetsFound.length !== 2 || boxes.length !== 1) {
      throw new Error("Invalid two-player beta map.");
    }

    const direct = manhattan(players[0], targetsFound[0]) + manhattan(players[1], targetsFound[1]);
    const crossed = manhattan(players[0], targetsFound[1]) + manhattan(players[1], targetsFound[0]);
    const targets = direct <= crossed ? targetsFound : [targetsFound[1], targetsFound[0]];
    const boxStart = { ...boxes[0] };

    return {
      width,
      height,
      walls,
      targets,
      players: players.map((point, slot) => ({ ...point, facing: slot === 0 ? "right" : "left" })),
      box: { ...boxStart },
      boxStart,
      moves: [0, 0],
      pushes: [0, 0],
      lastMoveAt: [0, 0]
    };
  }

  function newHostGame(code) {
    return {
      code,
      role: 1,
      status: "waiting",
      winner: 0,
      players: [
        { name: String(account?.username || "PLAYER 1"), connected: true },
        { name: "PLAYER 2", connected: false }
      ],
      board: parseMap()
    };
  }

  function isWall(state, x, y) {
    const key = pointKey(x, y);
    return state.walls.some(point => pointKey(point.x, point.y) === key);
  }

  function isExternalWall(state, x, y) {
    if (!isWall(state, x, y)) return false;
    return x === 0 || y === 0 || x === state.width - 1 || y === state.height - 1;
  }

  function applyMove(state, slot, direction, now = Date.now()) {
    const directions = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };
    const delta = directions[direction];
    if (!delta || !state?.players?.[slot]) return { changed: false, winner: 0, reason: "direction" };

    const player = state.players[slot];
    const other = state.players[slot === 0 ? 1 : 0];
    player.facing = direction;

    const previousMoveAt = Number(state.lastMoveAt?.[slot] || 0);
    if (previousMoveAt && now - previousMoveAt < MIN_MOVE_INTERVAL_MS) {
      return { changed: false, winner: 0, reason: "pace" };
    }

    const nx = Number(player.x) + delta[0];
    const ny = Number(player.y) + delta[1];
    if (isWall(state, nx, ny) || samePoint(other, nx, ny)) {
      return { changed: false, winner: 0, reason: "blocked" };
    }

    let pushed = false;
    let reset = false;
    if (samePoint(state.box, nx, ny)) {
      const bx = nx + delta[0];
      const by = ny + delta[1];

      if (samePoint(other, bx, by)) {
        return { changed: false, winner: 0, reason: "blocked" };
      }

      if (isWall(state, bx, by)) {
        if (!isExternalWall(state, bx, by)) {
          return { changed: false, winner: 0, reason: "blocked" };
        }

        const resetPoint = state.boxStart;
        if (!resetPoint || samePoint(player, resetPoint.x, resetPoint.y) || samePoint(other, resetPoint.x, resetPoint.y)) {
          return { changed: false, winner: 0, reason: "reset-blocked" };
        }
        state.box = { x: resetPoint.x, y: resetPoint.y };
        reset = true;
      } else {
        state.box = { x: bx, y: by };
      }
      pushed = true;
    }

    player.x = nx;
    player.y = ny;
    state.moves[slot] = Number(state.moves[slot] || 0) + 1;
    if (pushed) state.pushes[slot] = Number(state.pushes[slot] || 0) + 1;
    state.lastMoveAt[slot] = now;

    let winner = 0;
    if (samePoint(state.targets[0], state.box.x, state.box.y)) winner = 1;
    if (samePoint(state.targets[1], state.box.x, state.box.y)) winner = 2;

    return { changed: true, winner, reason: reset ? "reset" : pushed ? "push" : "move" };
  }

  function wireGame(role) {
    return {
      code: game.code,
      role,
      status: game.status,
      winner: game.winner,
      players: game.players.map(player => ({ name: player.name, connected: Boolean(player.connected) })),
      board: {
        width: game.board.width,
        height: game.board.height,
        walls: game.board.walls,
        targets: game.board.targets,
        players: game.board.players,
        box: game.board.box,
        moves: game.board.moves,
        pushes: game.board.pushes
      }
    };
  }

  function sendState() {
    if (!isHost || !connection?.open || !game) return;
    connection.send({
      type: "state",
      game: wireGame(2),
      countdownRemaining: game.status === "countdown" ? Math.max(0, countdownDeadline - Date.now()) : 0
    });
  }

  function stopCountdownTimer() {
    window.clearTimeout(countdownTimer);
    countdownTimer = 0;
  }

  function scheduleGameStart() {
    stopCountdownTimer();
    const remaining = Math.max(0, countdownDeadline - Date.now());
    countdownTimer = window.setTimeout(() => {
      if (!isHost || !game || game.status !== "countdown") return;
      game.status = "playing";
      countdownDeadline = 0;
      renderGame();
      sendState();
      board.focus({ preventScroll: true });
    }, remaining);
  }

  function sanitisePlayerName(value) {
    const name = String(value || "PLAYER 2").replace(/[\u0000-\u001f\u007f]/g, "").trim();
    return (name || "PLAYER 2").slice(0, 30);
  }

  function attachHostConnection(nextConnection) {
    if (connection?.open) {
      nextConnection.on("open", () => {
        nextConnection.send({ type: "reject", message: "That game already has two players." });
        nextConnection.close();
      });
      return;
    }

    connection = nextConnection;
    let joined = false;

    nextConnection.on("data", message => {
      if (!message || typeof message !== "object") return;

      if (message.type === "join") {
        if (joined) return;
        joined = true;
        game.players[1].name = sanitisePlayerName(message.name);
        game.players[1].connected = true;

        if (game.status === "waiting") {
          game.status = "countdown";
          countdownDeadline = Date.now() + COUNTDOWN_MS;
          scheduleGameStart();
        }
        renderGame();
        sendState();
        return;
      }

      if (message.type === "input" && joined) {
        hostMove(1, String(message.direction || ""));
      }
    });

    nextConnection.on("close", () => {
      if (connection !== nextConnection) return;
      connection = null;
      if (game?.players?.[1]) game.players[1].connected = false;
      renderGame();
    });

    nextConnection.on("error", () => {
      if (connection === nextConnection && game?.players?.[1]) {
        game.players[1].connected = false;
        renderGame();
      }
    });
  }

  function attachPeerRuntimeHandlers(nextPeer) {
    nextPeer.on("disconnected", () => {
      if (peer !== nextPeer) return;
      gameStatus.textContent = "NETWORK RECONNECTING…";
      try { nextPeer.reconnect(); } catch (_) {}
    });
    nextPeer.on("error", error => {
      if (peer !== nextPeer) return;
      if (error?.type === "peer-unavailable") return;
      if (!gameView.hidden) gameStatus.textContent = "NETWORK ERROR";
    });
  }

  function openHostPeer() {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryCode = () => {
        attempts += 1;
        const code = randomCode();
        const candidate = new Peer(`${PEER_PREFIX}${code}`, { debug: 0 });
        let settled = false;

        candidate.once("open", () => {
          settled = true;
          resolve({ candidate, code });
        });

        candidate.once("error", error => {
          if (settled) return;
          candidate.destroy();
          if (error?.type === "unavailable-id" && attempts < 8) {
            tryCode();
            return;
          }
          reject(error);
        });
      };

      tryCode();
    });
  }

  async function createGame() {
    if (!window.Peer) return setLobbyStatus("THE REAL-TIME CONNECTION SERVICE DID NOT LOAD.");
    if (!account) return setLobbyStatus("SIGN IN TO HOST A GAME.");

    createBtn.disabled = true;
    setLobbyStatus("STARTING GAME…");
    closeNetwork();

    try {
      const opened = await openHostPeer();
      peer = opened.candidate;
      currentCode = opened.code;
      isHost = true;
      game = newHostGame(currentCode);
      peer.on("connection", attachHostConnection);
      attachPeerRuntimeHandlers(peer);
      enterGame();
    } catch (_) {
      setLobbyStatus("COULD NOT START THE DIRECT CONNECTION. TRY AGAIN.");
    } finally {
      createBtn.disabled = !account;
    }
  }

  createBtn.addEventListener("click", createGame);

  joinCode.addEventListener("input", () => {
    joinCode.value = cleanCode(joinCode.value);
  });

  function openGuestConnection(code) {
    return new Promise((resolve, reject) => {
      const nextPeer = new Peer({ debug: 0 });
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        try { nextPeer.destroy(); } catch (_) {}
        reject(error);
      };

      nextPeer.once("error", fail);
      nextPeer.once("open", () => {
        const nextConnection = nextPeer.connect(`${PEER_PREFIX}${code}`, {
          reliable: true,
          serialization: "json",
          metadata: { boxxyBeta: 1 }
        });

        nextConnection.once("open", () => {
          if (settled) return;
          settled = true;
          resolve({ nextPeer, nextConnection });
        });
        nextConnection.once("error", fail);
      });
    });
  }

  async function joinGame(code) {
    if (!window.Peer) return setLobbyStatus("THE REAL-TIME CONNECTION SERVICE DID NOT LOAD.");
    const button = joinForm.querySelector("button");
    button.disabled = true;
    setLobbyStatus("CONNECTING…");
    closeNetwork();

    try {
      const opened = await openGuestConnection(code);
      peer = opened.nextPeer;
      connection = opened.nextConnection;
      currentCode = code;
      isHost = false;
      game = null;
      attachPeerRuntimeHandlers(peer);
      attachGuestConnection(connection);
      connection.send({ type: "join", name: account?.username || "PLAYER 2" });
    } catch (_) {
      setLobbyStatus("COULD NOT FIND THAT GAME. CHECK THE CODE AND TRY AGAIN.");
      closeNetwork();
    } finally {
      button.disabled = false;
    }
  }

  joinForm.addEventListener("submit", event => {
    event.preventDefault();
    const code = cleanCode(joinCode.value);
    if (code.length !== 6) return setLobbyStatus("ENTER THE SIX-CHARACTER GAME CODE.");
    joinGame(code);
  });

  function attachGuestConnection(nextConnection) {
    nextConnection.on("data", message => {
      if (!message || typeof message !== "object") return;
      if (message.type === "reject") {
        setLobbyStatus(message.message || "THAT GAME CANNOT BE JOINED.");
        leaveGame();
        return;
      }
      if (message.type !== "state" || !message.game) return;

      game = message.game;
      if (game.status === "countdown") {
        countdownDeadline = Date.now() + Math.max(0, Number(message.countdownRemaining || 0));
      } else {
        countdownDeadline = 0;
      }

      if (gameView.hidden) enterGame();
      else renderGame();
    });

    nextConnection.on("close", () => {
      if (connection !== nextConnection) return;
      gameStatus.textContent = "CONNECTION LOST";
      clearMoveRepeat();
    });

    nextConnection.on("error", () => {
      if (connection === nextConnection) gameStatus.textContent = "CONNECTION ERROR";
    });
  }

  function closeNetwork() {
    stopCountdownTimer();
    if (connection) {
      try { connection.close(); } catch (_) {}
      connection = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (_) {}
      peer = null;
    }
  }

  function enterGame() {
    lobby.hidden = true;
    gameView.hidden = false;
    if (game) {
      renderGame();
      board.focus({ preventScroll: true });
    } else {
      gameStatus.textContent = "CONNECTING…";
      gameCodeLabel.textContent = currentCode || "------";
    }
  }

  function leaveGame() {
    closeNetwork();
    clearMoveRepeat();
    currentCode = "";
    isHost = false;
    game = null;
    countdownDeadline = 0;
    boardSignature = "";
    cellNodes = [];
    playerNodes = [];
    boxNode = null;
    board.replaceChildren();
    winnerOverlay.hidden = true;
    countdown.hidden = true;
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
    gameCodeLabel.textContent = game.code || currentCode;
    inviteCode.textContent = game.code || currentCode;
    playerOne.classList.toggle("is-you", Number(game.role) === 1);
    playerTwo.classList.toggle("is-you", Number(game.role) === 2);
    playerOne.classList.toggle("is-winner", Number(game.winner) === 1);
    playerTwo.classList.toggle("is-winner", Number(game.winner) === 2);
    yourRole.textContent = `YOU ARE PLAYER ${game.role}`;

    waitingPanel.hidden = game.status !== "waiting";
    if (game.status === "waiting") gameStatus.textContent = "WAITING FOR PLAYER 2";
    else if (game.status === "countdown") gameStatus.textContent = "GET READY";
    else if (!game.players?.[1]?.connected && isHost) gameStatus.textContent = "PLAYER 2 DISCONNECTED";
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
    const remaining = countdownDeadline - Date.now();
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

  function hostMove(slot, direction) {
    if (!isHost || !game || game.status !== "playing" || game.winner) return;
    const moved = applyMove(game.board, slot, direction, Date.now());
    if (!moved.changed) return;
    if (moved.winner) {
      game.winner = moved.winner;
      game.status = "finished";
    }
    renderGame();
    sendState();
  }

  function sendMove(direction) {
    if (!game || game.status !== "playing" || game.winner) return;
    if (isHost) {
      hostMove(0, direction);
      return;
    }
    if (connection?.open) connection.send({ type: "input", direction });
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

  window.setInterval(renderCountdown, 80);
  window.addEventListener("beforeunload", closeNetwork);

  refreshAccount();
})();
