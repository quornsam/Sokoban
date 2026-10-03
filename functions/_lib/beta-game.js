/* BOXXY v440 — isolated two-player beta game rules and D1 persistence helpers. */
import { requireDatabase } from "./auth.js";

export const BETA_GAME_MAP = `###############
#@            #
#    # . #    #
#  #   #   #  #
#             #
#  #########  #
#             #
#      $      #
#             #
#  #########  #
#             #
#  #   #   #  #
#    # . #    #
#            @#
###############`;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GAME_LIFETIME_MS = 2 * 60 * 60 * 1000;
const COUNTDOWN_MS = 3000;
const MIN_MOVE_INTERVAL_MS = 80;

let schemaPromise = null;

export async function ensureBetaGameSchema(env) {
  const db = requireDatabase(env);
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS beta_games (
          code TEXT PRIMARY KEY,
          host_user_id TEXT NOT NULL,
          host_username TEXT NOT NULL,
          guest_user_id TEXT,
          guest_username TEXT NOT NULL DEFAULT '',
          guest_token_hash TEXT NOT NULL DEFAULT '',
          map_text TEXT NOT NULL,
          state_json TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'waiting',
          starts_at INTEGER NOT NULL DEFAULT 0,
          winner_slot INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          FOREIGN KEY(host_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(guest_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS beta_games_expires_idx ON beta_games(expires_at)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS beta_games_host_idx ON beta_games(host_user_id, updated_at DESC)`).run();
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return db;
}

function pointKey(x, y) {
  return `${x},${y}`;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function parseBetaMap(mapText = BETA_GAME_MAP) {
  const rows = String(mapText || "").replace(/\r/g, "").split("\n");
  const height = rows.length;
  const width = Math.max(...rows.map(row => row.length));
  const walls = [];
  const players = [];
  const goals = [];
  const boxes = [];

  for (let y = 0; y < height; y++) {
    const row = rows[y].padEnd(width, " ");
    for (let x = 0; x < width; x++) {
      const cell = row[x];
      if (cell === "#") walls.push({ x, y });
      if (cell === "@" || cell === "+") players.push({ x, y });
      if (cell === "." || cell === "+" || cell === "*") goals.push({ x, y });
      if (cell === "$" || cell === "*") boxes.push({ x, y });
    }
  }

  if (players.length !== 2) throw new Error("The two-player beta map must contain exactly two players.");
  if (goals.length !== 2) throw new Error("The two-player beta map must contain exactly two targets.");
  if (boxes.length !== 1) throw new Error("The two-player beta map must contain exactly one box.");

  const direct = manhattan(players[0], goals[0]) + manhattan(players[1], goals[1]);
  const crossed = manhattan(players[0], goals[1]) + manhattan(players[1], goals[0]);
  const targets = direct <= crossed ? [goals[0], goals[1]] : [goals[1], goals[0]];

  return {
    width,
    height,
    walls,
    players: players.map((point, slot) => ({ ...point, facing: slot === 0 ? "right" : "left" })),
    targets,
    box: boxes[0],
    moves: [0, 0],
    pushes: [0, 0],
    lastMoveAt: [0, 0]
  };
}

export function freshBetaState(mapText = BETA_GAME_MAP) {
  return parseBetaMap(mapText);
}

export function cleanCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function randomGuestToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function newGameTimes(now = Date.now()) {
  return {
    createdAt: now,
    updatedAt: now,
    expiresAt: now + GAME_LIFETIME_MS
  };
}

export function countdownStart(now = Date.now()) {
  return now + COUNTDOWN_MS;
}

export function parseState(value) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function effectiveStatus(row, now = Date.now()) {
  if (Number(row?.winner_slot) === 1 || Number(row?.winner_slot) === 2) return "finished";
  if (String(row?.status || "") === "countdown" && Number(row?.starts_at || 0) <= now) return "playing";
  return String(row?.status || "waiting");
}

export function publicGame(row, state, role, now = Date.now()) {
  const status = effectiveStatus(row, now);
  return {
    code: String(row.code),
    role: role + 1,
    status,
    startsAt: Number(row.starts_at || 0),
    revision: Number(row.revision || 0),
    winner: Number(row.winner_slot || 0),
    players: [
      { name: String(row.host_username || "PLAYER 1"), connected: true },
      { name: String(row.guest_username || "PLAYER 2"), connected: Boolean(row.guest_token_hash || row.guest_user_id) }
    ],
    board: {
      width: Number(state.width),
      height: Number(state.height),
      walls: Array.isArray(state.walls) ? state.walls : [],
      targets: Array.isArray(state.targets) ? state.targets : [],
      players: Array.isArray(state.players) ? state.players : [],
      box: state.box || { x: 0, y: 0 },
      moves: Array.isArray(state.moves) ? state.moves : [0, 0],
      pushes: Array.isArray(state.pushes) ? state.pushes : [0, 0]
    }
  };
}

export async function roleForRequest(row, user, guestToken) {
  if (user?.id && String(user.id) === String(row.host_user_id)) return 0;
  if (user?.id && row.guest_user_id && String(user.id) === String(row.guest_user_id)) return 1;
  if (guestToken && row.guest_token_hash) {
    const hash = await sha256Hex(guestToken);
    if (hash === String(row.guest_token_hash)) return 1;
  }
  return -1;
}

function isWall(state, x, y) {
  const key = pointKey(x, y);
  return (state.walls || []).some(point => pointKey(point.x, point.y) === key);
}

function samePoint(point, x, y) {
  return Number(point?.x) === x && Number(point?.y) === y;
}

export function applyMove(state, slot, direction, now = Date.now()) {
  const directions = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  };
  const delta = directions[direction];
  if (!delta || !state?.players?.[slot]) return { state, changed: false, winner: 0, reason: "direction" };

  const next = structuredClone(state);
  const player = next.players[slot];
  const other = next.players[slot === 0 ? 1 : 0];
  player.facing = direction;

  const previousMoveAt = Number(next.lastMoveAt?.[slot] || 0);
  if (previousMoveAt && now - previousMoveAt < MIN_MOVE_INTERVAL_MS) {
    return { state, changed: false, winner: 0, reason: "pace" };
  }

  const nx = Number(player.x) + delta[0];
  const ny = Number(player.y) + delta[1];
  if (isWall(next, nx, ny) || samePoint(other, nx, ny)) {
    return { state, changed: false, winner: 0, reason: "blocked" };
  }

  let pushed = false;
  if (samePoint(next.box, nx, ny)) {
    const bx = nx + delta[0];
    const by = ny + delta[1];
    if (isWall(next, bx, by) || samePoint(other, bx, by)) {
      return { state, changed: false, winner: 0, reason: "blocked" };
    }
    next.box = { x: bx, y: by };
    pushed = true;
  }

  player.x = nx;
  player.y = ny;
  next.moves = Array.isArray(next.moves) ? next.moves.slice(0, 2) : [0, 0];
  next.pushes = Array.isArray(next.pushes) ? next.pushes.slice(0, 2) : [0, 0];
  next.lastMoveAt = Array.isArray(next.lastMoveAt) ? next.lastMoveAt.slice(0, 2) : [0, 0];
  next.moves[slot] = Number(next.moves[slot] || 0) + 1;
  if (pushed) next.pushes[slot] = Number(next.pushes[slot] || 0) + 1;
  next.lastMoveAt[slot] = now;

  let winner = 0;
  if (samePoint(next.targets?.[0], next.box.x, next.box.y)) winner = 1;
  if (samePoint(next.targets?.[1], next.box.x, next.box.y)) winner = 2;

  return { state: next, changed: true, winner, reason: pushed ? "push" : "move" };
}
