import { json, requireDatabase } from "../_lib/auth.js";

const DAILY_LAUNCH_DATE = "2026-08-30";
const MAX_PUBLIC_MOVES_PER_SECOND = 15;
const MAX_TIMING_DRIFT_SECONDS = 0.15;
const DAILY_LEADERBOARD_DEVICE_CLASSES = new Set(["phone", "tablet", "computer"]);


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
    const url = new URL(context.request.url);
    const dateKey = validDateKey(url.searchParams.get("date"));
    if (!dateKey) return json({ ok: false, error: "A valid Daily Boxxy date is required." }, 400);

    const secondsPath = `$."${dateKey}".seconds`;
    const movesPath = `$."${dateKey}".moves`;
    const leaderboardSecondsPath = `$."${dateKey}".leaderboardSeconds`;
    const leaderboardMovesPath = `$."${dateKey}".leaderboardMoves`;
    const leaderboardTrackedPath = `$."${dateKey}".leaderboardTracked`;
    const leaderboardStartedAtPath = `$."${dateKey}".leaderboardStartedAt`;
    const leaderboardCompletedAtPath = `$."${dateKey}".leaderboardCompletedAt`;
    const leaderboardDevicePath = `$."${dateKey}".leaderboardDevice`;
    const result = await db.prepare(`
      WITH daily_records AS (
        SELECT
          username,
          json_extract(progress_json, '$."boxxy-daily-completions-v1"') AS daily_json
        FROM users
      ),
      daily_times AS (
        SELECT
          username,
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
        SELECT username, seconds, moves, leaderboard_device
        FROM daily_times
        WHERE
          seconds IS NOT NULL
          AND seconds > 0
          AND (
            moves IS NULL
            OR moves <= 1
            OR ((moves - 1.0) / seconds) <= ?
          )
          AND (
            leaderboard_started_at IS NULL
            OR leaderboard_completed_at IS NULL
            OR leaderboard_started_at <= 0
            OR leaderboard_completed_at <= 0
            OR (
              leaderboard_completed_at >= leaderboard_started_at
              AND ABS(((leaderboard_completed_at - leaderboard_started_at) / 1000.0) - seconds) <= ?
            )
          )
      ), synthetic_scores AS (
        SELECT u.username AS username, s.seconds AS seconds, s.moves AS moves, s.device AS leaderboard_device
        FROM synthetic_daily_scores s
        JOIN synthetic_users u ON u.id = s.user_id
        WHERE s.date_key = ? AND s.seconds > 0
          AND NOT EXISTS (SELECT 1 FROM users r WHERE lower(r.username) = lower(u.username))
      ), all_scores AS (
        SELECT username, seconds, moves, leaderboard_device FROM real_scores
        UNION ALL
        SELECT username, seconds, moves, leaderboard_device FROM synthetic_scores
      )
      SELECT username, seconds, moves, leaderboard_device
      FROM all_scores
      ORDER BY seconds ASC, username COLLATE NOCASE ASC
    `).bind(
      leaderboardTrackedPath, leaderboardSecondsPath, secondsPath,
      leaderboardTrackedPath, leaderboardMovesPath, movesPath,
      leaderboardTrackedPath, leaderboardStartedAtPath,
      leaderboardTrackedPath, leaderboardCompletedAtPath,
      leaderboardTrackedPath, leaderboardDevicePath,
      MAX_PUBLIC_MOVES_PER_SECOND, MAX_TIMING_DRIFT_SECONDS, dateKey
    ).all();

    const entries = (result.results || []).map(row => ({
      username: String(row.username || "").slice(0, 20),
      seconds: Math.max(0, Math.round((Number(row.seconds) || 0) * 100) / 100),
      moves: row.moves !== null && row.moves !== undefined
        && Number.isFinite(Number(row.moves)) && Number(row.moves) >= 0
        ? Math.trunc(Number(row.moves))
        : null,
      device: cleanDeviceClass(row.leaderboard_device) || null
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
