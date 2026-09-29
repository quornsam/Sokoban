import { json, requireDatabase, authenticatedUser, adminAuthenticated } from "../_lib/auth.js";
import { ensureAttemptHistoryDeviceColumn } from "../_lib/attempt-history.js";
import { ensureDailyLeaderboardVisibilitySchema, cleanDailyLeaderboardVisibility } from "../_lib/daily-leaderboard-visibility.js";

const DAILY_LAUNCH_DATE = "2026-08-30";
const MAX_PUBLIC_MOVES_PER_SECOND = 15;
const MAX_TIMING_DRIFT_SECONDS = 0.15;
const DAILY_LEADERBOARD_DEVICE_CLASSES = new Set(["phone", "tablet", "computer"]);

const DAILY_LEADERBOARD_AVATAR_BODY_TYPES = new Set([
  "boy", "girl",
  "lincoln", "beverley", "harry", "stuart", "davido", "samantha",
  "optimus", "pixella", "bolderdash", "sputnik", "vasquez",
  "bacterium", "clara", "jamil", "clickers", "bertrand", "angie", "the-haining"
]);
const DAILY_LEADERBOARD_AVATAR_DEFAULT = Object.freeze({
  bodyType: "boy", tshirt: "#df3526", trousers: "#292829", hair: "#292727", skin: "#ee9a60", shoes: "#292829"
});
const DAILY_LEADERBOARD_AVATAR_COLOUR_KEYS = Object.freeze(["tshirt", "trousers", "hair", "skin", "shoes"]);

function cleanAvatarStyle(value) {
  let raw = {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed;
  } catch (_) {}
  const avatar = { ...DAILY_LEADERBOARD_AVATAR_DEFAULT };
  const bodyType = String(raw.bodyType || "").trim().toLowerCase();
  if (DAILY_LEADERBOARD_AVATAR_BODY_TYPES.has(bodyType)) avatar.bodyType = bodyType;
  for (const key of DAILY_LEADERBOARD_AVATAR_COLOUR_KEYS) {
    const colour = String(raw[key] || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(colour)) avatar[key] = colour;
  }
  return avatar;
}


async function ensureSyntheticDailySchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS synthetic_users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL, username_norm TEXT NOT NULL UNIQUE,
      default_device TEXT NOT NULL DEFAULT 'computer', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS synthetic_daily_scores (
      user_id TEXT NOT NULL, date_key TEXT NOT NULL, seconds REAL NOT NULL, moves INTEGER NOT NULL,
      device TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, date_key), FOREIGN KEY(user_id) REFERENCES synthetic_users(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS synthetic_daily_scores_date_idx ON synthetic_daily_scores(date_key)")
  ]);
}

function cleanDeviceClass(value) {
  const device = String(value || "").trim().toLowerCase();
  return DAILY_LEADERBOARD_DEVICE_CLASSES.has(device) ? device : "";
}

function validDateKey(value) {
  const dateKey = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return dateKey >= DAILY_LAUNCH_DATE ? dateKey : "";
}

export async function onRequestGet(context) {
  try {
    const db = requireDatabase(context.env);
    await ensureSyntheticDailySchema(db);
    await ensureAttemptHistoryDeviceColumn(db);
    await ensureDailyLeaderboardVisibilitySchema(db);
    const url = new URL(context.request.url);
    const dateKey = validDateKey(url.searchParams.get("date"));
    if (!dateKey) return json({ ok: false, error: "A valid Daily Boxxy date is required." }, 400);
    const adminView = url.searchParams.has("admin") && await adminAuthenticated(context.env, context.request);
    const viewer = adminView ? null : await authenticatedUser(context.env, context.request);
    const viewerUserId = viewer ? String(viewer.id || "") : "";

    const secondsPath = `$."${dateKey}".seconds`;
    const movesPath = `$."${dateKey}".moves`;
    const leaderboardSecondsPath = `$."${dateKey}".leaderboardSeconds`;
    const leaderboardMovesPath = `$."${dateKey}".leaderboardMoves`;
    const bestMovesPath = `$."${dateKey}".moves`;
    const bestMovesSecondsPath = `$."${dateKey}".bestMovesSeconds`;
    const bestMovesDevicePath = `$."${dateKey}".bestMovesDevice`;
    const bestMovesMouseOrClickPushPath = `$."${dateKey}".bestMovesMouseOrClickPush`;
    const bestMovesInstantMovePath = `$."${dateKey}".bestMovesInstantMove`;
    const leaderboardTrackedPath = `$."${dateKey}".leaderboardTracked`;
    const leaderboardStartedAtPath = `$."${dateKey}".leaderboardStartedAt`;
    const leaderboardCompletedAtPath = `$."${dateKey}".leaderboardCompletedAt`;
    const leaderboardDevicePath = `$."${dateKey}".leaderboardDevice`;
    const result = await db.prepare(`
      WITH daily_records AS (
        SELECT
          id AS user_id, username,
          json_extract(progress_json, '$."boxxy-daily-completions-v1"') AS daily_json,
          json_extract(progress_json, '$."push-bauhaus-character-style-v51"') AS avatar_json
        FROM users
      ),
      daily_times AS (
        SELECT
          user_id, username, avatar_json,
          CASE
            WHEN json_extract(daily_json, ?) = 1 THEN
              CAST(json_extract(daily_json, ?) AS REAL)
            ELSE
              CAST(json_extract(daily_json, ?) AS REAL)
          END AS seconds,
          CASE
            WHEN json_extract(daily_json, ?) = 1 THEN
              -- Never pair a tracked fastest time with a move count from a
              -- different personal-best run when its own moves are missing.
              CAST(json_extract(daily_json, ?) AS INTEGER)
            ELSE
              CAST(json_extract(daily_json, ?) AS INTEGER)
          END AS moves,
          -- Independently saved personal best and, when known, its matching run.
          COALESCE(CAST(json_extract(daily_json, ?) AS INTEGER),
                   CAST(json_extract(daily_json, ?) AS INTEGER)) AS best_moves,
          CAST(json_extract(daily_json, ?) AS REAL) AS best_moves_seconds,
          CAST(json_extract(daily_json, ?) AS TEXT) AS best_moves_device,
          CAST(json_extract(daily_json, ?) AS INTEGER) AS best_moves_mouse_or_click_push,
          CAST(json_extract(daily_json, ?) AS INTEGER) AS best_moves_instant_move,
          CASE
            WHEN json_extract(daily_json, ?) = 1 THEN
              CAST(json_extract(daily_json, ?) AS INTEGER)
            ELSE NULL
          END AS leaderboard_started_at,
          CASE
            WHEN json_extract(daily_json, ?) = 1 THEN
              CAST(json_extract(daily_json, ?) AS INTEGER)
            ELSE NULL
          END AS leaderboard_completed_at,
          CASE
            WHEN json_extract(daily_json, ?) = 1 THEN
              CAST(json_extract(daily_json, ?) AS TEXT)
            ELSE NULL
          END AS leaderboard_device
        FROM daily_records
      )
      , real_scores AS (
        SELECT d.user_id AS player_id, 'real' AS player_kind,
          d.username, d.avatar_json, d.seconds, d.moves, d.best_moves, d.leaderboard_device,
          CASE WHEN d.best_moves_seconds > 0 AND d.best_moves_mouse_or_click_push = 1 THEN 1 ELSE 0 END
            AS best_moves_run_mouse_or_click_push,
          CASE WHEN d.best_moves_seconds > 0 AND d.best_moves_instant_move = 1 THEN 1 ELSE 0 END
            AS best_moves_run_instant_move,
          COALESCE(
            CASE WHEN d.best_moves_seconds > 0 THEN d.best_moves_seconds END,
            CASE WHEN d.best_moves = d.moves THEN d.seconds END,
            h.seconds
          ) AS best_moves_run_seconds,
          COALESCE(
            CASE WHEN d.best_moves_seconds > 0 THEN NULLIF(d.best_moves_device,'') END,
            CASE WHEN d.best_moves = d.moves AND
              (d.best_moves_seconds IS NULL OR d.best_moves_seconds <= 0 OR
               ABS(d.best_moves_seconds - d.seconds) < 0.015)
              THEN NULLIF(d.leaderboard_device,'') END
          ) AS saved_moves_device,
          h.seconds AS history_seconds, NULLIF(h.device,'') AS history_device
        FROM daily_times d
        -- One indexed lookup selects an actual completed run; its time and
        -- device must always come from that same run.
        LEFT JOIN level_attempt_history h ON h.id = (
          SELECT run.id FROM level_attempt_history run
          WHERE run.user_id = d.user_id AND run.pack_id = 'daily-boxxy'
            AND run.level_token = ? AND run.completed = 1 AND run.assisted = 0
            AND run.moves = d.best_moves AND run.seconds > 0
          ORDER BY run.seconds ASC, run.started_at ASC, run.id ASC LIMIT 1
        )
        WHERE
          d.seconds IS NOT NULL
          AND d.seconds > 0
          AND (
            d.moves IS NULL
            OR d.moves <= 1
            OR ((d.moves - 1.0) / d.seconds) <= ?
          )
          AND (
            d.leaderboard_started_at IS NULL
            OR d.leaderboard_completed_at IS NULL
            OR d.leaderboard_started_at <= 0
            OR d.leaderboard_completed_at <= 0
            OR (
              d.leaderboard_completed_at >= d.leaderboard_started_at
              AND ABS(((d.leaderboard_completed_at - d.leaderboard_started_at) / 1000.0) - d.seconds) <= ?
            )
          )
      ), real_paired AS (
        SELECT player_id, player_kind, username, avatar_json, seconds, moves, best_moves, leaderboard_device,
          best_moves_run_seconds, best_moves_run_mouse_or_click_push, best_moves_run_instant_move,
          COALESCE(saved_moves_device,
            CASE WHEN history_seconds > 0
              AND ABS(best_moves_run_seconds - history_seconds) < 0.015
              THEN history_device END) AS best_moves_run_device
        FROM real_scores
      ), synthetic_scores AS (
        SELECT s.user_id AS player_id, 'synthetic' AS player_kind,
          u.username AS username, NULL AS avatar_json, s.seconds AS seconds, s.moves AS moves,
          s.moves AS best_moves, s.device AS leaderboard_device,
          s.seconds AS best_moves_run_seconds, s.device AS best_moves_run_device,
          0 AS best_moves_run_mouse_or_click_push, 0 AS best_moves_run_instant_move
        FROM synthetic_daily_scores s
        JOIN synthetic_users u ON u.id = s.user_id
        WHERE s.date_key = ? AND s.seconds > 0
          AND NOT EXISTS (SELECT 1 FROM users r WHERE lower(r.username) = lower(u.username))
      ), all_scores AS (
        SELECT player_id, player_kind, username, avatar_json, seconds, moves, best_moves, leaderboard_device,
          best_moves_run_seconds, best_moves_run_device,
          best_moves_run_mouse_or_click_push, best_moves_run_instant_move FROM real_paired
        UNION ALL
        SELECT player_id, player_kind, username, avatar_json, seconds, moves, best_moves, leaderboard_device,
          best_moves_run_seconds, best_moves_run_device,
          best_moves_run_mouse_or_click_push, best_moves_run_instant_move FROM synthetic_scores
      ), scored_with_visibility AS (
        SELECT a.*,
          COALESCE(v.visibility, 'public') AS visibility
        FROM all_scores a
        LEFT JOIN daily_leaderboard_visibility v
          ON v.date_key = ? AND v.player_kind = a.player_kind AND v.player_id = a.player_id
      )
      SELECT player_id, player_kind, username, avatar_json, seconds, moves, best_moves, leaderboard_device,
        best_moves_run_seconds, best_moves_run_device,
        best_moves_run_mouse_or_click_push, best_moves_run_instant_move, visibility
      FROM scored_with_visibility
      ORDER BY seconds ASC, username COLLATE NOCASE ASC
    `).bind(
      leaderboardTrackedPath, leaderboardSecondsPath, secondsPath,
      leaderboardTrackedPath, leaderboardMovesPath, movesPath,
      bestMovesPath, leaderboardMovesPath, bestMovesSecondsPath, bestMovesDevicePath,
      bestMovesMouseOrClickPushPath, bestMovesInstantMovePath,
      leaderboardTrackedPath, leaderboardStartedAtPath,
      leaderboardTrackedPath, leaderboardCompletedAtPath,
      leaderboardTrackedPath, leaderboardDevicePath,
      dateKey, MAX_PUBLIC_MOVES_PER_SECOND, MAX_TIMING_DRIFT_SECONDS, dateKey, dateKey
    ).all();

    const mappedEntries = (result.results || []).map(row => {
      const bestMoves = row.best_moves !== null && row.best_moves !== undefined
        && Number.isInteger(Number(row.best_moves)) && Number(row.best_moves) >= 0
        ? Number(row.best_moves) : null;
      const rawBestMovesSeconds = row.best_moves_run_seconds !== null && row.best_moves_run_seconds !== undefined
        && Number.isFinite(Number(row.best_moves_run_seconds)) && Number(row.best_moves_run_seconds) > 0
        ? Number(row.best_moves_run_seconds) : null;
      const mouseOrClickPushRun = Number(row.best_moves_run_mouse_or_click_push) === 1;
      const instantMoveRun = Number(row.best_moves_run_instant_move) === 1;
      const movesPerSecond = rawBestMovesSeconds !== null && bestMoves !== null && bestMoves > 1
        ? (bestMoves - 1) / rawBestMovesSeconds
        : 0;
      const publicBestMovesSeconds = !mouseOrClickPushRun && !instantMoveRun
        && movesPerSecond <= MAX_PUBLIC_MOVES_PER_SECOND
        ? rawBestMovesSeconds
        : null;
      return {
        playerId: String(row.player_id || ""),
        kind: String(row.player_kind || "real") === "synthetic" ? "synthetic" : "real",
        visibility: cleanDailyLeaderboardVisibility(row.visibility),
        username: String(row.username || "").slice(0, 20),
        avatar: String(row.player_kind || "real") === "synthetic" ? null : cleanAvatarStyle(row.avatar_json),
        seconds: Math.max(0, Math.round((Number(row.seconds) || 0) * 100) / 100),
        moves: row.moves !== null && row.moves !== undefined
          && Number.isFinite(Number(row.moves)) && Number(row.moves) >= 0
          ? Math.trunc(Number(row.moves))
          : null,
        bestMoves,
        bestMovesSeconds: publicBestMovesSeconds !== null
          ? Math.round(publicBestMovesSeconds * 100) / 100
          : null,
        bestMovesDevice: cleanDeviceClass(row.best_moves_run_device) || null,
        device: cleanDeviceClass(row.leaderboard_device) || null
      };
    });

    const visibleEntries = adminView
      ? mappedEntries
      : mappedEntries.filter(entry => entry.visibility === "public"
        || (entry.visibility === "owner" && entry.kind === "real" && entry.playerId === viewerUserId));
    const entries = visibleEntries.map(entry => adminView ? entry : ({
      username: entry.username,
      avatar: entry.avatar,
      seconds: entry.seconds,
      moves: entry.moves,
      bestMoves: entry.bestMoves,
      bestMovesSeconds: entry.bestMovesSeconds,
      bestMovesDevice: entry.bestMovesDevice,
      device: entry.device
    }));

    return json({ ok: true, date: dateKey, entries }, 200, {
      "cache-control": "no-store"
    });
  } catch (error) {
    console.error("BOXXY Daily leaderboard error", error);
    const message = String(error?.message || error || "Unexpected error.");
    return json(
      { ok: false, error: message.includes("database binding DB") ? "Leaderboard database is not configured yet." : "Leaderboard unavailable." },
      message.includes("database binding DB") ? 503 : 500
    );
  }
}

export async function onRequest(context) {
  if (context.request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  return onRequestGet(context);
}
