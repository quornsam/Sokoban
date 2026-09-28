/* BOXXY v392: server-authoritative per-score visibility for Daily leaderboards. */
const VISIBILITY_VALUES = new Set(["public", "owner", "hidden"]);
const PLAYER_KINDS = new Set(["real", "synthetic"]);

export function cleanDailyLeaderboardVisibility(value) {
  const visibility = String(value || "public").trim().toLowerCase();
  return VISIBILITY_VALUES.has(visibility) ? visibility : "public";
}

export function cleanDailyLeaderboardPlayerKind(value) {
  const kind = String(value || "").trim().toLowerCase();
  return PLAYER_KINDS.has(kind) ? kind : "";
}

export async function ensureDailyLeaderboardVisibilitySchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_leaderboard_visibility (
      date_key TEXT NOT NULL,
      player_kind TEXT NOT NULL CHECK (player_kind IN ('real','synthetic')),
      player_id TEXT NOT NULL,
      visibility TEXT NOT NULL CHECK (visibility IN ('owner','hidden')),
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(date_key, player_kind, player_id)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS daily_leaderboard_visibility_date_idx
      ON daily_leaderboard_visibility(date_key, visibility)`)
  ]);
}

export async function setDailyLeaderboardVisibility(db, {
  dateKey,
  playerKind,
  playerId,
  visibility,
  updatedAt = Date.now()
}) {
  const kind = cleanDailyLeaderboardPlayerKind(playerKind);
  const mode = cleanDailyLeaderboardVisibility(visibility);
  const id = String(playerId || "").trim();
  const date = String(dateKey || "").trim();
  if (!kind || !id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid Daily leaderboard visibility target.");
  }
  if (kind === "synthetic" && mode === "owner") {
    throw new Error("Artificial players cannot use owner-only visibility.");
  }
  await ensureDailyLeaderboardVisibilitySchema(db);
  if (mode === "public") {
    await db.prepare(`DELETE FROM daily_leaderboard_visibility
      WHERE date_key = ? AND player_kind = ? AND player_id = ?`)
      .bind(date, kind, id).run();
    return "public";
  }
  await db.prepare(`INSERT INTO daily_leaderboard_visibility
      (date_key, player_kind, player_id, visibility, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date_key, player_kind, player_id) DO UPDATE SET
      visibility = excluded.visibility,
      updated_at = excluded.updated_at`)
    .bind(date, kind, id, mode, Number(updatedAt) || Date.now()).run();
  return mode;
}
