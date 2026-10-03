/* BOXXY v440 — server-authoritative two-player beta API. */
import {
  json,
  authenticatedUser,
  clientIp,
  consumeRateLimit
} from "../_lib/auth.js";
import {
  BETA_GAME_MAP,
  ensureBetaGameSchema,
  freshBetaState,
  cleanCode,
  randomCode,
  randomGuestToken,
  sha256Hex,
  newGameTimes,
  countdownStart,
  parseState,
  effectiveStatus,
  publicGame,
  roleForRequest,
  applyMove
} from "../_lib/beta-game.js";

function guestTokenFrom(request) {
  return String(request.headers.get("X-Boxxy-Beta-Token") || "").trim().slice(0, 128);
}

async function readBody(request) {
  try { return await request.json(); }
  catch (_) { return {}; }
}

async function cleanupExpired(db, now = Date.now()) {
  await db.prepare("DELETE FROM beta_games WHERE expires_at < ?").bind(now).run();
}

async function readGame(db, code) {
  return await db.prepare("SELECT * FROM beta_games WHERE code = ? LIMIT 1").bind(code).first();
}

async function createGame(context) {
  const { env, request } = context;
  const db = await ensureBetaGameSchema(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: false, error: "Sign in to BOXXY before starting a two-player game." }, 401);

  const ip = clientIp(request) || "unknown";
  if (!await consumeRateLimit(env, `beta-create:${user.id}:${ip}`, 20, 60 * 60)) {
    return json({ ok: false, error: "Too many beta games have been started. Try again later." }, 429);
  }

  const now = Date.now();
  await cleanupExpired(db, now);
  const state = freshBetaState(BETA_GAME_MAP);
  const times = newGameTimes(now);

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    try {
      await db.prepare(`
        INSERT INTO beta_games (
          code, host_user_id, host_username, map_text, state_json,
          revision, status, starts_at, created_at, updated_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, 0, 'waiting', 0, ?, ?, ?)
      `).bind(
        code,
        String(user.id),
        String(user.username || "PLAYER 1"),
        BETA_GAME_MAP,
        JSON.stringify(state),
        times.createdAt,
        times.updatedAt,
        times.expiresAt
      ).run();
      const row = await readGame(db, code);
      return json({ ok: true, serverNow: Date.now(), game: publicGame(row, state, 0) });
    } catch (error) {
      if (!String(error?.message || error).includes("UNIQUE")) throw error;
    }
  }
  return json({ ok: false, error: "Could not create an invite code. Try again." }, 503);
}

async function joinGame(context, body) {
  const { env, request } = context;
  const db = await ensureBetaGameSchema(env);
  const code = cleanCode(body.code);
  if (code.length !== 6) return json({ ok: false, error: "Enter the six-character invite code." }, 400);

  const ip = clientIp(request) || "unknown";
  if (!await consumeRateLimit(env, `beta-join:${ip}`, 60, 15 * 60)) {
    return json({ ok: false, error: "Too many join attempts. Try again shortly." }, 429);
  }

  const now = Date.now();
  await cleanupExpired(db, now);
  const row = await readGame(db, code);
  if (!row) return json({ ok: false, error: "That game code does not exist or has expired." }, 404);
  if (row.guest_token_hash || row.guest_user_id) return json({ ok: false, error: "That game already has two players." }, 409);

  const user = await authenticatedUser(env, request);
  if (user?.id && String(user.id) === String(row.host_user_id)) {
    return json({ ok: false, error: "The host cannot join their own game as Player 2." }, 409);
  }

  const token = randomGuestToken();
  const tokenHash = await sha256Hex(token);
  const guestName = user?.username ? String(user.username) : "PLAYER 2";
  const startsAt = countdownStart(now);
  const result = await db.prepare(`
    UPDATE beta_games SET
      guest_user_id = ?, guest_username = ?, guest_token_hash = ?,
      status = 'countdown', starts_at = ?, updated_at = ?
    WHERE code = ? AND guest_token_hash = '' AND guest_user_id IS NULL AND status = 'waiting'
  `).bind(user?.id ? String(user.id) : null, guestName, tokenHash, startsAt, now, code).run();

  if (Number(result?.meta?.changes || 0) !== 1) {
    return json({ ok: false, error: "Someone else joined that game first." }, 409);
  }

  const joined = await readGame(db, code);
  const state = parseState(joined.state_json);
  return json({
    ok: true,
    guestToken: token,
    serverNow: Date.now(),
    game: publicGame(joined, state, 1)
  });
}

async function stateGame(context) {
  const { env, request } = context;
  const db = await ensureBetaGameSchema(env);
  const url = new URL(request.url);
  const code = cleanCode(url.searchParams.get("code"));
  if (code.length !== 6) return json({ ok: false, error: "Game code required." }, 400);

  const row = await readGame(db, code);
  if (!row || Number(row.expires_at || 0) < Date.now()) {
    return json({ ok: false, error: "That game has expired." }, 404);
  }

  const [user, role] = await (async () => {
    const currentUser = await authenticatedUser(env, request);
    const currentRole = await roleForRequest(row, currentUser, guestTokenFrom(request));
    return [currentUser, currentRole];
  })();
  void user;
  if (role < 0) return json({ ok: false, error: "This game belongs to another pair of players." }, 403);

  const state = parseState(row.state_json);
  if (!state) return json({ ok: false, error: "The beta game state could not be read." }, 500);
  return json({ ok: true, serverNow: Date.now(), game: publicGame(row, state, role) });
}

async function moveGame(context, body) {
  const { env, request } = context;
  const db = await ensureBetaGameSchema(env);
  const code = cleanCode(body.code);
  const direction = String(body.direction || "").toLowerCase();
  if (code.length !== 6 || !["up", "down", "left", "right"].includes(direction)) {
    return json({ ok: false, error: "Invalid move." }, 400);
  }

  const user = await authenticatedUser(env, request);
  const guestToken = guestTokenFrom(request);

  for (let attempt = 0; attempt < 5; attempt++) {
    const now = Date.now();
    const row = await readGame(db, code);
    if (!row || Number(row.expires_at || 0) < now) return json({ ok: false, error: "That game has expired." }, 404);

    const role = await roleForRequest(row, user, guestToken);
    if (role < 0) return json({ ok: false, error: "You are not a player in this game." }, 403);

    const status = effectiveStatus(row, now);
    const state = parseState(row.state_json);
    if (!state) return json({ ok: false, error: "The beta game state could not be read." }, 500);

    if (status === "waiting") {
      return json({ ok: true, accepted: false, reason: "waiting", serverNow: now, game: publicGame(row, state, role, now) });
    }
    if (status === "countdown" || now < Number(row.starts_at || 0)) {
      return json({ ok: true, accepted: false, reason: "countdown", serverNow: now, game: publicGame(row, state, role, now) });
    }
    if (status === "finished") {
      return json({ ok: true, accepted: false, reason: "finished", serverNow: now, game: publicGame(row, state, role, now) });
    }

    const moved = applyMove(state, role, direction, now);
    if (!moved.changed) {
      return json({ ok: true, accepted: false, reason: moved.reason, serverNow: now, game: publicGame(row, state, role, now) });
    }

    const winnerSlot = Number(moved.winner || 0);
    const nextStatus = winnerSlot ? "finished" : "playing";
    const result = await db.prepare(`
      UPDATE beta_games SET
        state_json = ?, revision = revision + 1, status = ?, winner_slot = ?, updated_at = ?
      WHERE code = ? AND revision = ? AND winner_slot IS NULL
    `).bind(
      JSON.stringify(moved.state),
      nextStatus,
      winnerSlot || null,
      now,
      code,
      Number(row.revision || 0)
    ).run();

    if (Number(result?.meta?.changes || 0) === 1) {
      const updated = {
        ...row,
        state_json: JSON.stringify(moved.state),
        revision: Number(row.revision || 0) + 1,
        status: nextStatus,
        winner_slot: winnerSlot || null,
        updated_at: now
      };
      return json({
        ok: true,
        accepted: true,
        reason: moved.reason,
        serverNow: Date.now(),
        game: publicGame(updated, moved.state, role)
      });
    }
    // Another player's move won the same revision. Re-read and apply this
    // input against the new authoritative board. The first successful revision write wins the conflict.
  }

  return json({ ok: false, error: "The game changed too quickly. Try that move again." }, 409);
}

export async function onRequest(context) {
  try {
    if (context.request.method === "GET") return await stateGame(context);
    if (context.request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
    const body = await readBody(context.request);
    const action = String(body.action || "").toLowerCase();
    if (action === "create") return await createGame(context);
    if (action === "join") return await joinGame(context, body);
    if (action === "move") return await moveGame(context, body);
    return json({ ok: false, error: "Unknown beta game action." }, 400);
  } catch (error) {
    console.error("BOXXY two-player beta error", error);
    return json({ ok: false, error: String(error?.message || "Two-player beta error.") }, 500);
  }
}
