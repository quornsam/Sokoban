/* BOXXY v428: permanent Daily fastest-time gold medals. */
import { ensureDailyLeaderboardVisibilitySchema } from './daily-leaderboard-visibility.js';

const DAILY_LAUNCH_DATE = '2026-08-30';
const RELIABLE_DETAILED_HISTORY_DATE = '2026-09-27';
const MAX_PUBLIC_MOVES_PER_SECOND = 15;
const BACKFILL_KEY = 'daily-gold-v1';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function asObject(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) { return {}; }
}

function validDateKey(value) {
  const key = String(value || '').trim();
  if (!datePattern.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? key : '';
}

function latestWorldwideLocalDate(now = Date.now()) {
  // UTC+14 is the earliest civil timezone to enter a new calendar date.
  return new Date(now + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function calendarDayAtOffset(timestamp, offsetMinutes) {
  // Date.getTimezoneOffset(): minutes to add to local time to obtain UTC.
  return new Date(Number(timestamp) - Number(offsetMinutes || 0) * 60000).toISOString().slice(0, 10);
}

function releasedDate(dateKey, now = Date.now()) {
  const date = validDateKey(dateKey);
  return Boolean(date && date >= DAILY_LAUNCH_DATE && date <= latestWorldwideLocalDate(now));
}

function eligibleSpeed(seconds, moves) {
  const duration = Number(seconds);
  const count = Number(moves);
  if (!Number.isFinite(duration) || duration <= 0) return false;
  if (!Number.isFinite(count) || count <= 1) return true;
  return ((count - 1) / duration) <= MAX_PUBLIC_MOVES_PER_SECOND;
}

function plausibleDetailedRun(row, now = Date.now()) {
  const dateKey = validDateKey(row?.date_key || row?.level_token);
  if (!releasedDate(dateKey, now)) return false;
  const startedAt = Number(row?.started_at);
  const endedAt = Number(row?.ended_at);
  const seconds = Number(row?.seconds);
  if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(endedAt)
      || endedAt < startedAt || endedAt > now + 5 * 60 * 1000
      || !Number.isFinite(seconds) || seconds <= 0) return false;
  const offsetRaw = row?.daily_timezone_offset_minutes;
  if (offsetRaw !== null && offsetRaw !== undefined && offsetRaw !== '') {
    const offset = Number(offsetRaw);
    if (!Number.isInteger(offset) || Math.abs(offset) > 840) return false;
    // Historical Dailys may be replayed today. Reject only puzzle dates that
    // are still in the future for the player's recorded local timezone.
    if (dateKey > calendarDayAtOffset(now, offset)) return false;
  }
  return true;
}

function legacyLeaderboardResult(recordValue, dateKey, now = Date.now()) {
  const record = asObject(recordValue);
  if (!releasedDate(dateKey, now)) return null;
  const tracked = record.leaderboardTracked === true;
  const seconds = Number(tracked ? record.leaderboardSeconds : record.seconds);
  const moves = Number(tracked ? record.leaderboardMoves : record.moves);
  if (!Number.isFinite(seconds) || seconds <= 0 || !eligibleSpeed(seconds, moves)) return null;

  if (tracked) {
    const startedAt = Number(record.leaderboardStartedAt);
    const completedAt = Number(record.leaderboardCompletedAt);
    if (Number.isFinite(startedAt) && Number.isFinite(completedAt) && startedAt > 0 && completedAt > 0) {
      if (completedAt < startedAt || completedAt > now + 5 * 60 * 1000) return null;
      if (Math.abs(((completedAt - startedAt) / 1000) - seconds) > 0.08) return null;
      const rawOffset = record.leaderboardTimezoneOffsetMinutes;
      if (rawOffset !== null && rawOffset !== undefined && rawOffset !== '') {
        const offset = Number(rawOffset);
        if (!Number.isInteger(offset) || Math.abs(offset) > 840) return null;
        if (dateKey > calendarDayAtOffset(now, offset)) return null;
      }
    }
  }
  return { seconds, moves: Number.isFinite(moves) ? moves : null };
}

async function ensureAttemptGoldColumns(db) {
  const columns = await db.prepare('PRAGMA table_info(level_attempt_history)').all();
  const rows = columns.results || [];
  if (!rows.length) return false;
  const names = new Set(rows.map(column => column.name));
  const additions = [
    ['daily_timezone_offset_minutes', 'INTEGER'],
    ['daily_gold_awarded', 'INTEGER NOT NULL DEFAULT 0 CHECK(daily_gold_awarded IN (0,1))']
  ];
  for (const [name, definition] of additions) {
    if (names.has(name)) continue;
    try { await db.prepare(`ALTER TABLE level_attempt_history ADD COLUMN ${name} ${definition}`).run(); }
    catch (error) {
      if (!/duplicate column name/i.test(String(error?.message || error))) throw error;
    }
  }
  return true;
}

export async function ensureDailyGoldMedalSchema(db) {
  await ensureDailyLeaderboardVisibilitySchema(db);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_gold_medals (
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      awarded_at INTEGER NOT NULL,
      winning_seconds REAL NOT NULL,
      run_id TEXT,
      source TEXT NOT NULL DEFAULT 'live',
      PRIMARY KEY(user_id, date_key),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS daily_gold_medals_run_idx
      ON daily_gold_medals(run_id) WHERE run_id IS NOT NULL`),
    db.prepare(`CREATE INDEX IF NOT EXISTS daily_gold_medals_date_idx
      ON daily_gold_medals(date_key, awarded_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS daily_gold_medal_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`)
  ]);
  await ensureAttemptGoldColumns(db);
}

async function visibilityForDate(db, dateKey) {
  const result = await db.prepare(`SELECT player_id, visibility FROM daily_leaderboard_visibility
    WHERE date_key = ? AND player_kind = 'real'`).bind(dateKey).all();
  return new Map((result.results || []).map(row => [String(row.player_id), String(row.visibility || 'public')]));
}

async function recordGoldAward(db, { userId, dateKey, seconds, awardedAt, runId = null, source = 'live' }) {
  const id = String(userId || '');
  const date = validDateKey(dateKey);
  const time = Number(seconds);
  if (!id || !date || !Number.isFinite(time) || time <= 0) return { inserted:false, attached:false };
  const result = await db.prepare(`INSERT OR IGNORE INTO daily_gold_medals
    (user_id, date_key, awarded_at, winning_seconds, run_id, source)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, date, Math.max(0, Math.trunc(Number(awardedAt) || Date.now())), time, runId || null, String(source || 'live')).run();
  const inserted = Number(result?.meta?.changes || 0) > 0;
  let attached = inserted && Boolean(runId);

  if (!inserted && runId) {
    const update = await db.prepare(`UPDATE daily_gold_medals SET
        awarded_at = ?, winning_seconds = ?, run_id = ?, source = ?
      WHERE user_id = ? AND date_key = ? AND run_id IS NULL`)
      .bind(Math.max(0, Math.trunc(Number(awardedAt) || Date.now())), time, runId, String(source || 'detailed-history'), id, date).run();
    attached = Number(update?.meta?.changes || 0) > 0;
  }
  if (runId && attached) {
    await db.prepare(`UPDATE level_attempt_history SET daily_gold_awarded = 1
      WHERE id = ? AND user_id = ?`).bind(runId, id).run();
  }
  return { inserted, attached };
}

async function rebuildDailyGoldForDateInternal(db, dateKey, now = Date.now()) {
  const date = validDateKey(dateKey);
  if (!releasedDate(date, now) || date < RELIABLE_DETAILED_HISTORY_DATE) return [];
  const visibility = await visibilityForDate(db, date);
  const result = await db.prepare(`SELECT id, user_id, level_token AS date_key,
      started_at, ended_at, seconds, moves, daily_timezone_offset_minutes
    FROM level_attempt_history
    WHERE pack_id = 'daily-boxxy' AND level_token = ?
      AND completed = 1 AND assisted = 0
      AND mouse_or_click_push = 0 AND instant_move = 0
      AND seconds > 0 AND moves IS NOT NULL
    ORDER BY ended_at ASC, started_at ASC, id ASC`).bind(date).all();
  let fastest = Infinity;
  const newlyAwarded = [];
  for (const row of result.results || []) {
    if (visibility.get(String(row.user_id)) && visibility.get(String(row.user_id)) !== 'public') continue;
    if (!plausibleDetailedRun(row, now) || !eligibleSpeed(row.seconds, row.moves)) continue;
    const seconds = Number(row.seconds);
    if (!(seconds < fastest - 0.000001)) continue;
    fastest = seconds;
    const award = await recordGoldAward(db, {
      userId:row.user_id, dateKey:date, seconds,
      awardedAt:Number(row.ended_at) || now,
      runId:String(row.id || ''), source:'detailed-history'
    });
    if (award.inserted || award.attached) newlyAwarded.push(String(row.id || ''));
  }
  return newlyAwarded.filter(Boolean);
}

export async function rebuildDailyGoldForDate(db, dateKey, now = Date.now()) {
  await ensureDailyGoldMedalSchema(db);
  return rebuildDailyGoldForDateInternal(db, dateKey, now);
}

async function backfillDetailedHistory(db, now = Date.now()) {
  const rows = await db.prepare(`SELECT DISTINCT level_token AS date_key
    FROM level_attempt_history
    WHERE pack_id = 'daily-boxxy' AND completed = 1 AND level_token >= ?
    ORDER BY level_token ASC`).bind(RELIABLE_DETAILED_HISTORY_DATE).all();
  for (const row of rows.results || []) {
    const date = validDateKey(row.date_key);
    if (releasedDate(date, now)) await rebuildDailyGoldForDateInternal(db, date, now);
  }
}

async function backfillCurrentLeaderboardLeaders(db, now = Date.now()) {
  const visibilityRows = await db.prepare(`SELECT date_key, player_id, visibility
    FROM daily_leaderboard_visibility WHERE player_kind = 'real'`).all();
  const visibility = new Map((visibilityRows.results || []).map(row => [
    `${String(row.date_key)}|${String(row.player_id)}`, String(row.visibility || 'public')
  ]));
  const users = await db.prepare(`SELECT id, username, progress_json FROM users`).all();
  const leaders = new Map();
  for (const user of users.results || []) {
    const progress = asObject(user.progress_json);
    const daily = asObject(progress['boxxy-daily-completions-v1']);
    for (const [dateKey, record] of Object.entries(daily)) {
      const date = validDateKey(dateKey);
      if (!releasedDate(date, now)) continue;
      const mode = visibility.get(`${date}|${String(user.id)}`) || 'public';
      if (mode !== 'public') continue;
      const result = legacyLeaderboardResult(record, date, now);
      if (!result) continue;
      const previous = leaders.get(date);
      const username = String(user.username || '');
      if (!previous || result.seconds < previous.seconds - 0.000001
          || (Math.abs(result.seconds - previous.seconds) <= 0.000001
            && username.localeCompare(previous.username, undefined, { sensitivity:'base' }) < 0)) {
        leaders.set(date, { userId:String(user.id), username, seconds:result.seconds });
      }
    }
  }
  for (const [dateKey, leader] of leaders) {
    await recordGoldAward(db, {
      userId:leader.userId, dateKey, seconds:leader.seconds,
      awardedAt:now, runId:null, source:'current-leader-backfill'
    });
  }
}

async function fastestOtherRealLeaderboardTime(db, dateKey, excludeUserId, now = Date.now()) {
  const visibility = await visibilityForDate(db, dateKey);
  const users = await db.prepare(`SELECT id, progress_json FROM users WHERE id != ?`).bind(String(excludeUserId || '')).all();
  let fastest = Infinity;
  for (const user of users.results || []) {
    if ((visibility.get(String(user.id)) || 'public') !== 'public') continue;
    const progress = asObject(user.progress_json);
    const daily = asObject(progress['boxxy-daily-completions-v1']);
    const result = legacyLeaderboardResult(daily[dateKey], dateKey, now);
    if (result && result.seconds < fastest) fastest = result.seconds;
  }
  return fastest;
}

export async function processSubmittedDailyGoldRuns(db, userId, runIds, now = Date.now()) {
  await ensureDailyGoldMedalSchema(db);
  const ids = [...new Set((Array.isArray(runIds) ? runIds : []).map(value => String(value || '')).filter(Boolean))];
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.prepare(`SELECT id, user_id, level_token AS date_key,
      started_at, ended_at, seconds, moves, assisted, mouse_or_click_push, instant_move,
      daily_timezone_offset_minutes
    FROM level_attempt_history
    WHERE user_id = ? AND id IN (${placeholders}) AND pack_id = 'daily-boxxy' AND completed = 1`)
    .bind(String(userId || ''), ...ids).all();
  const detailedDates = new Set();
  const legacyRows = [];
  for (const row of result.results || []) {
    const date = validDateKey(row.date_key);
    if (!releasedDate(date, now) || !plausibleDetailedRun(row, now)
        || Number(row.assisted) !== 0 || Number(row.mouse_or_click_push) !== 0 || Number(row.instant_move) !== 0
        || !eligibleSpeed(row.seconds, row.moves)) continue;
    if (date >= RELIABLE_DETAILED_HISTORY_DATE) detailedDates.add(date);
    else legacyRows.push({...row, date_key:date});
  }
  for (const date of detailedDates) await rebuildDailyGoldForDateInternal(db, date, now);

  for (const row of legacyRows) {
    const visibility = await visibilityForDate(db, row.date_key);
    if ((visibility.get(String(userId)) || 'public') !== 'public') continue;
    const competitor = await fastestOtherRealLeaderboardTime(db, row.date_key, userId, now);
    if (!(Number(row.seconds) < competitor - 0.000001)) continue;
    await recordGoldAward(db, {
      userId, dateKey:row.date_key, seconds:Number(row.seconds),
      awardedAt:Number(row.ended_at) || now, runId:String(row.id || ''), source:'live-historical'
    });
  }

  const marked = await db.prepare(`SELECT id FROM level_attempt_history
    WHERE user_id = ? AND daily_gold_awarded = 1 AND id IN (${placeholders})`)
    .bind(String(userId || ''), ...ids).all();
  return (marked.results || []).map(row => String(row.id || '')).filter(Boolean);
}

export async function backfillDailyGoldMedalsIfNeeded(db, now = Date.now()) {
  await ensureDailyGoldMedalSchema(db);
  const marker = await db.prepare(`SELECT value FROM daily_gold_medal_meta WHERE key = ? LIMIT 1`)
    .bind(BACKFILL_KEY).first();
  if (marker) return false;
  await backfillDetailedHistory(db, now);
  // Always award the currently provable Fastest Times leader as a fallback.
  // For pre-v376 records this is the only defensible historical evidence.
  await backfillCurrentLeaderboardLeaders(db, now);
  await db.prepare(`INSERT OR REPLACE INTO daily_gold_medal_meta (key, value, updated_at)
    VALUES (?, ?, ?)`).bind(BACKFILL_KEY, 'complete', now).run();
  return true;
}

export async function dailyGoldMedalCount(db, userId, { backfill = true } = {}) {
  await ensureDailyGoldMedalSchema(db);
  if (backfill) await backfillDailyGoldMedalsIfNeeded(db);
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM daily_gold_medals WHERE user_id = ?`)
    .bind(String(userId || '')).first();
  return Math.max(0, Math.trunc(Number(row?.count) || 0));
}

export async function dailyGoldMedalDates(db, userId, { backfill = true } = {}) {
  await ensureDailyGoldMedalSchema(db);
  if (backfill) await backfillDailyGoldMedalsIfNeeded(db);
  const rows = await db.prepare(`SELECT date_key, awarded_at, winning_seconds, run_id, source
    FROM daily_gold_medals WHERE user_id = ? ORDER BY date_key ASC`)
    .bind(String(userId || '')).all();
  return (rows.results || []).map(row => ({
    date:String(row.date_key || ''),
    awardedAt:Math.max(0, Number(row.awarded_at) || 0),
    seconds:Number(row.winning_seconds) || 0,
    runId:String(row.run_id || ''), source:String(row.source || '')
  }));
}
