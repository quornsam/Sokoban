import { json, requireDatabase } from "../_lib/auth.js";
import { DAILY_PRACTICE_CATALOG } from "../_lib/daily-practice-catalog.js";
import {
  avatarFromProgress,
  cleanPublicAvatarStyle,
  ensurePublicProfileSchema,
  ensureSyntheticAvatarColumn,
  publicStatsFromProgress,
  readPublicBio
} from "../_lib/public-profile.js";

function cleanUsername(value) {
  return String(value || "").trim().slice(0, 20);
}

function solutionPushes(dateKey) {
  const puzzle = DAILY_PRACTICE_CATALOG.find(item => item.date === dateKey);
  return puzzle ? (String(puzzle.solution || "").match(/[LRUD]/g) || []).length : 0;
}

function currentSyntheticStreak(dateKeys) {
  const dates = [...new Set(dateKeys.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
  if (!dates.length) return 0;
  let streak = 1;
  for (let index = dates.length - 1; index > 0; index--) {
    const current = Date.parse(`${dates[index]}T00:00:00Z`);
    const previous = Date.parse(`${dates[index - 1]}T00:00:00Z`);
    if (current - previous !== 86400000) break;
    streak++;
  }
  return streak;
}

export async function onRequestGet(context) {
  try {
    const db = requireDatabase(context.env);
    await ensurePublicProfileSchema(db);
    const username = cleanUsername(new URL(context.request.url).searchParams.get("username"));
    if (!username) return json({ ok:false, error:"Player is required." }, 400);

    const real = await db.prepare(`
      SELECT id, username, progress_json
      FROM users
      WHERE lower(username) = lower(?)
      LIMIT 1
    `).bind(username).first();

    if (real) {
      return json({
        ok:true,
        profile:{
          username:String(real.username),
          bio:await readPublicBio(db, real.id),
          avatar:avatarFromProgress(real.progress_json),
          ...publicStatsFromProgress(real.progress_json)
        }
      });
    }

    // Synthetic players are public leaderboard fixtures, not real accounts.
    // Their profile figures are derived from their generated Daily records rather
    // than inventing a second set of counters that could drift from the scores.
    try {
      await ensureSyntheticAvatarColumn(db);
      const synthetic = await db.prepare(`
        SELECT id, username, avatar_json
        FROM synthetic_users
        WHERE username_norm = lower(?)
        LIMIT 1
      `).bind(username).first();
      if (synthetic) {
        const scores = await db.prepare(`
          SELECT date_key, moves FROM synthetic_daily_scores
          WHERE user_id = ? ORDER BY date_key ASC
        `).bind(synthetic.id).all();
        const rows = scores.results || [];
        const dailyCompleted = rows.length;
        const totalMoves = rows.reduce((sum, row) => sum + Math.max(0, Math.trunc(Number(row.moves) || 0)), 0);
        const totalPushes = rows.reduce((sum, row) => sum + solutionPushes(String(row.date_key || "")), 0);
        const dailyStreak = currentSyntheticStreak(rows.map(row => String(row.date_key || "")));
        return json({
          ok:true,
          profile:{
            username:String(synthetic.username),
            bio:"",
            avatar:cleanPublicAvatarStyle(synthetic.avatar_json, { allowEmpty:true }),
            levelsCompleted:0,
            dailyCompleted,
            trophies:dailyStreak > 0 ? 1 : 0,
            totalMoves,
            totalPushes,
            dailyStreak
          }
        });
      }
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("no such table")) throw error;
    }

    return json({ ok:false, error:"Player profile not found." }, 404);
  } catch (error) {
    console.error("BOXXY public profile error", error);
    return json({ ok:false, error:"Player profile unavailable." }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "GET") return json({ ok:false, error:"Method not allowed." }, 405);
  return onRequestGet(context);
}
