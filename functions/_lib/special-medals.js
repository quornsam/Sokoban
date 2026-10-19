/* BOXXY v491 — canonical, idempotent special awards; no extra gameplay counters. */
import { OFFICIAL_SPECIAL_MEDALS } from "./content-catalog.js";
import { parseProgress } from "./auth.js";

export async function ensureSpecialMedalSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS user_special_medals (
    user_id TEXT NOT NULL, medal_id TEXT NOT NULL, awarded_at INTEGER NOT NULL,
    source TEXT NOT NULL, PRIMARY KEY(user_id, medal_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();
}

function validCompletionStamp(record, award) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return 0;
  const stamp = Number(record.firstCompletedAt || record.completedAt);
  return Number.isSafeInteger(stamp) && stamp >= Date.parse(award.startUtc)
    && stamp < Date.parse(award.endUtc) ? stamp : 0;
}

// Existing signed-in run history is preferred; previously guest-played Dailys
// may have been synced only as their ordinary completed-Daily record.
export async function reconcileSpecialMedals(db, userId, progressJson = null) {
  await ensureSpecialMedalSchema(db);
  const progress = parseProgress(progressJson);
  let completions = {};
  try { completions = JSON.parse(progress["boxxy-daily-completions-v1"] || "{}"); } catch (_) {}
  if (!completions || typeof completions !== "object" || Array.isArray(completions)) completions = {};
  for (const medal of OFFICIAL_SPECIAL_MEDALS) {
    if (medal.award?.kind !== "daily-completion") continue;
    const award = medal.award;
    if (Date.now() < Date.parse(award.startUtc)) continue;
    const stamp = validCompletionStamp(completions[award.date], award);
    if (stamp) {
      await db.prepare(`INSERT OR IGNORE INTO user_special_medals (user_id, medal_id, awarded_at, source)
        VALUES (?, ?, ?, 'daily-progress')`).bind(userId, medal.id, stamp).run();
    }
    // A submitted completed run includes the actual time of its completion;
    // late uploads after the day still earn the medal, but late plays do not.
    await db.prepare(`INSERT OR IGNORE INTO user_special_medals (user_id, medal_id, awarded_at, source)
      SELECT user_id, ?, ended_at, 'daily-attempt' FROM level_attempt_history
      WHERE user_id = ? AND pack_id = 'daily-boxxy' AND level_token = ?
        AND completed = 1 AND assisted = 0
        AND ended_at >= ? AND ended_at < ?
      ORDER BY ended_at ASC LIMIT 1`)
      .bind(medal.id, userId, award.date,
        Date.parse(award.startUtc), Date.parse(award.endUtc)).run();
  }
}

export async function specialMedalsForUser(db, userId) {
  await ensureSpecialMedalSchema(db);
  const rows = await db.prepare("SELECT medal_id FROM user_special_medals WHERE user_id = ? ORDER BY awarded_at ASC")
    .bind(userId).all();
  const allowed = new Set(OFFICIAL_SPECIAL_MEDALS.map(medal => medal.id));
  return (rows.results || []).map(row => String(row.medal_id)).filter(id => allowed.has(id));
}
