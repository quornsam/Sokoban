import { json, requireDatabase } from "../_lib/auth.js";

const DAILY_LAUNCH_DATE = "2026-08-30";

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
    const url = new URL(context.request.url);
    const dateKey = validDateKey(url.searchParams.get("date"));
    if (!dateKey) return json({ ok: false, error: "A valid Daily Boxxy date is required." }, 400);

    const secondsPath = `$."${dateKey}".seconds`;
    const movesPath = `$."${dateKey}".moves`;
    const leaderboardSecondsPath = `$."${dateKey}".leaderboardSeconds`;
    const leaderboardMovesPath = `$."${dateKey}".leaderboardMoves`;
    const leaderboardTrackedPath = `$."${dateKey}".leaderboardTracked`;
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
              CAST(json_extract(daily_json, ?) AS INTEGER)
            ELSE
              CAST(json_extract(daily_json, ?) AS INTEGER)
          END AS seconds,
          CASE
            WHEN json_extract(daily_json, ?) = 1 THEN
              COALESCE(
                CAST(json_extract(daily_json, ?) AS INTEGER),
                CAST(json_extract(daily_json, ?) AS INTEGER)
              )
            ELSE
              CAST(json_extract(daily_json, ?) AS INTEGER)
          END AS moves
        FROM daily_records
      )
      SELECT username, seconds, moves
      FROM daily_times
      WHERE seconds IS NOT NULL AND seconds > 0
      ORDER BY seconds ASC, username COLLATE NOCASE ASC
    `).bind(
      leaderboardTrackedPath, leaderboardSecondsPath, secondsPath,
      leaderboardTrackedPath, leaderboardMovesPath, movesPath, movesPath
    ).all();

    const entries = (result.results || []).map(row => ({
      username: String(row.username || "").slice(0, 20),
      seconds: Math.max(0, Math.trunc(Number(row.seconds) || 0)),
      moves: Number.isFinite(Number(row.moves)) && Number(row.moves) >= 0
        ? Math.trunc(Number(row.moves))
        : null
    }));

    return json({ ok: true, date: dateKey, entries }, 200, {
      "cache-control": "public, max-age=10, s-maxage=10"
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
