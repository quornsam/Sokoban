/* BOXXY v375: varied, route-verified synthetic move counts and update-in-place for existing seeds. */
/* BOXXY v374: Basement Daily seeding, score removal and private Instant Move administration. */
import {
  json,
  requireDatabase,
  clientIp,
  consumeRateLimit,
  createAdminSession,
  destroyAdminSession,
  adminAuthenticated,
  secureCompare,
  validPassword,
  passwordRecord,
  expireCookie,
  parseProgress,
  safeProgressJson,
  validUsername,
  progressSummary,
  ensureSessionHistorySchema,
  backfillLegacySessions,
  sessionRevocationStatements,
  ensureUserFeatureFlagsSchema
} from "../_lib/auth.js";
import { ensureGoogleAuthSchema } from "../_lib/google-auth.js";
import { readPackCompletions, completionRecordsForUsers, canonicalAdminSummary } from "../_lib/pack-completions.js";
import { DAILY_PRACTICE_CATALOG } from "../_lib/daily-practice-catalog.js";
import { analyseDailySolution, generateDailySyntheticRoute } from "../_lib/synthetic-daily-moves.js";
import { ensureAttemptHistorySchema, readAttemptOverview, readLevelAttemptHistory } from '../_lib/attempt-history.js';

const INSTANT_MOVE_FEATURE_KEY = "instant_move";

async function readBody(request) {
  try { return await request.json(); }
  catch (_) { return {}; }
}

async function login(context, body) {
  const { env, request } = context;
  requireDatabase(env);
  const ip = clientIp(request);
  if (!await consumeRateLimit(env, `basement:${ip || "unknown"}`, 6, 30 * 60)) {
    return json({ ok: false, error: "Too many attempts. Try again later." }, 429);
  }
  if (!env.BASEMENT_USERNAME || !env.BASEMENT_PASSWORD) {
    return json({ ok: false, error: "Basement credentials are not configured." }, 503);
  }
  const usernameOk = secureCompare(body.username, env.BASEMENT_USERNAME);
  const passwordOk = secureCompare(body.password, env.BASEMENT_PASSWORD);
  if (!usernameOk || !passwordOk) return json({ ok: false, error: "Incorrect login." }, 401);
  const session = await createAdminSession(env, request);
  return json({ ok: true, authenticated: true }, 200, { "set-cookie": session.header });
}

async function resetUserPassword(context, body) {
  const { env } = context;
  const db = requireDatabase(env);
  const userId = String(body.userId || "").trim();
  const password = String(body.password || "");

  if (!userId) return json({ ok: false, error: "User is required." }, 400);
  if (!validPassword(password)) {
    return json({ ok: false, error: "Password must be 8–128 characters." }, 400);
  }
  if (!env.BOXXY_PASSWORD_PEPPER) {
    return json({ ok: false, error: "Password service is not configured." }, 503);
  }

  const user = await db.prepare(`
    SELECT id, username, signup_ip, last_ip
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(userId).first();
  if (!user) return json({ ok: false, error: "User not found." }, 404);

  await ensureSessionHistorySchema(db);
  const { salt, hash } = await passwordRecord(password, "", env.BOXXY_PASSWORD_PEPPER);
  const statements = [
    db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
      .bind(hash, salt, user.id),
    db.prepare(`
      INSERT INTO user_auth_state (user_id, password_enabled)
      VALUES (?, 1)
      ON CONFLICT(user_id) DO UPDATE SET password_enabled = 1
    `).bind(user.id),
    ...sessionRevocationStatements(db, user.id, "admin_password_reset")
  ];

  const ips = [...new Set([user.last_ip, user.signup_ip].map(value => String(value || "").trim()).filter(Boolean))];
  for (const ip of ips) {
    statements.push(db.prepare("DELETE FROM rate_limits WHERE key IN (?, ?)")
      .bind(`login:${ip}`, `google-login:${ip}`));
  }

  await db.batch(statements);
  return json({
    ok: true,
    reset: true,
    userId: String(user.id),
    username: String(user.username),
    passwordEnabled: true,
    sessionsCleared: true,
    loginLimitsCleared: ips.length > 0
  });
}


async function setInstantMoveAccess(context, body) {
  const { env } = context;
  const db = requireDatabase(env);
  const userId = String(body.userId || "").trim();
  if (!userId) return json({ ok: false, error: "User is required." }, 400);
  const user = await db.prepare("SELECT id, username FROM users WHERE id = ? LIMIT 1").bind(userId).first();
  if (!user) return json({ ok: false, error: "User not found." }, 404);
  await ensureUserFeatureFlagsSchema(db);
  const enabled = body.enabled === true;
  const now = Date.now();
  await db.prepare(`
    INSERT INTO user_feature_flags (user_id, feature_key, enabled, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, feature_key) DO UPDATE SET
      enabled = excluded.enabled, updated_at = excluded.updated_at
  `).bind(user.id, INSTANT_MOVE_FEATURE_KEY, enabled ? 1 : 0, now).run();
  return json({
    ok: true, userId: String(user.id), username: String(user.username),
    instantMoveEnabled: enabled, instantMoveUpdatedAt: now
  });
}


const SYNTHETIC_DEVICE_CLASSES = new Set(["phone", "computer"]);
const DAILY_COMPLETIONS_KEY = "boxxy-daily-completions-v1";

function validDailyDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && DAILY_PRACTICE_CATALOG.some(item => item.date === date) ? date : "";
}

function cleanSyntheticDevice(value, fallback = "computer") {
  const device = String(value || "").trim().toLowerCase();
  return SYNTHETIC_DEVICE_CLASSES.has(device) ? device : fallback;
}

async function ensureSyntheticDailySchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS synthetic_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      username_norm TEXT NOT NULL UNIQUE,
      default_device TEXT NOT NULL DEFAULT 'computer',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS synthetic_daily_scores (
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      seconds REAL NOT NULL,
      moves INTEGER NOT NULL,
      device TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, date_key),
      FOREIGN KEY(user_id) REFERENCES synthetic_users(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS synthetic_daily_scores_date_idx ON synthetic_daily_scores(date_key)")
  ]);
}

async function syntheticState(context, body = {}) {
  const db = requireDatabase(context.env);
  await ensureSyntheticDailySchema(db);
  const date = validDailyDate(body.date || new URL(context.request.url).searchParams.get("date")) || "";
  const usersResult = await db.prepare(`
    SELECT id, username, default_device, created_at, updated_at
    FROM synthetic_users ORDER BY username COLLATE NOCASE ASC
  `).all();
  let scores = [];
  if (date) {
    const result = await db.prepare(`
      SELECT s.user_id, u.username, s.date_key, s.seconds, s.moves, s.device, s.updated_at
      FROM synthetic_daily_scores s JOIN synthetic_users u ON u.id = s.user_id
      WHERE s.date_key = ? ORDER BY s.seconds ASC, u.username COLLATE NOCASE ASC
    `).bind(date).all();
    scores = result.results || [];
  }
  return json({ ok:true, authenticated:true, date, users:(usersResult.results||[]).map(row => ({
    id:String(row.id), username:String(row.username), defaultDevice:cleanSyntheticDevice(row.default_device),
    createdAt:Number(row.created_at)||0, updatedAt:Number(row.updated_at)||0
  })), scores:scores.map(row => ({
    userId:String(row.user_id), username:String(row.username), date:String(row.date_key),
    seconds:Math.round(Number(row.seconds)*100)/100, moves:Number(row.moves)||0,
    device:cleanSyntheticDevice(row.device), updatedAt:Number(row.updated_at)||0
  })) });
}

async function addSyntheticUser(context, body) {
  const db = requireDatabase(context.env);
  await ensureSyntheticDailySchema(db);
  const username = String(body.username || "").trim();
  if (!validUsername(username)) return json({ok:false,error:"Username must be 3–20 characters using letters, numbers, _ or -."},400);
  const norm = username.toLowerCase();
  const real = await db.prepare("SELECT id FROM users WHERE lower(username) = ? LIMIT 1").bind(norm).first();
  if (real) return json({ok:false,error:"That username belongs to a real BOXXY account."},409);
  const existing = await db.prepare("SELECT id FROM synthetic_users WHERE username_norm = ? LIMIT 1").bind(norm).first();
  if (existing) return json({ok:false,error:"That artificial player already exists."},409);
  const now = Date.now();
  const id = crypto.randomUUID();
  const device = cleanSyntheticDevice(body.device);
  await db.prepare(`INSERT INTO synthetic_users (id, username, username_norm, default_device, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)` ).bind(id, username, norm, device, now, now).run();
  return json({ok:true,id,username,defaultDevice:device});
}

async function deleteSyntheticUser(context, body) {
  const db = requireDatabase(context.env);
  await ensureSyntheticDailySchema(db);
  const id = String(body.userId || "").trim();
  if (!id) return json({ok:false,error:"Artificial player is required."},400);
  await db.batch([
    db.prepare("DELETE FROM synthetic_daily_scores WHERE user_id = ?").bind(id),
    db.prepare("DELETE FROM synthetic_users WHERE id = ?").bind(id)
  ]);
  return json({ok:true});
}

function generatedSeconds(moves, minimum, maximum) {
  const autoMin = Math.max(45, Math.round(moves * 0.9));
  const autoMax = Math.max(autoMin + 45, Math.round(moves * 2.4));
  let min = Number.isFinite(Number(minimum)) && Number(minimum) > 0 ? Number(minimum) : autoMin;
  let max = Number.isFinite(Number(maximum)) && Number(maximum) > 0 ? Number(maximum) : autoMax;
  min = Math.max(1, min); max = Math.max(min + 1, max);
  const value = min + Math.random() * (max - min);
  return Math.round(value * 100) / 100;
}

function selectedSyntheticIds(body) {
  const ids = Array.isArray(body.userIds)
    ? [...new Set(body.userIds.map(String).filter(Boolean))] : [];
  return ids.length <= 200 ? ids : [];
}

async function generateSyntheticScores(context, body) {
  const db = requireDatabase(context.env);
  await ensureSyntheticDailySchema(db);
  const date = validDailyDate(body.date);
  if (!date) return json({ok:false,error:"Choose a prepared Daily puzzle."},400);
  const ids = selectedSyntheticIds(body);
  if (!ids.length) return json({ok:false,error:"Select between 1 and 200 artificial players."},400);
  const puzzle = DAILY_PRACTICE_CATALOG.find(item => item.date === date);
  let analysis;
  try { analysis = analyseDailySolution(puzzle); }
  catch (_) { return json({ok:false,error:"The stored Daily solution could not be validated. No scores were changed."},409); }
  const placeholders = ids.map(() => "?").join(",");
  const [players, existing] = await Promise.all([
    db.prepare(`SELECT id, username, default_device FROM synthetic_users WHERE id IN (${placeholders})`)
      .bind(...ids).all(),
    db.prepare("SELECT user_id, moves FROM synthetic_daily_scores WHERE date_key = ?").bind(date).all()
  ]);
  if (!(players.results || []).length) return json({ok:false,error:"No artificial players were found."},404);
  const updating = new Set((players.results || []).map(row => String(row.id)));
  const usedMoves = new Set((existing.results || [])
    .filter(row => !updating.has(String(row.user_id))).map(row => Number(row.moves)));
  const previousMoves = new Map((existing.results || []).map(row => [String(row.user_id), Number(row.moves)]));
  const override = String(body.device || "").trim().toLowerCase();
  const now = Date.now();
  const generated = [];
  const statements = [];
  for (const row of players.results || []) {
    const device = SYNTHETIC_DEVICE_CLASSES.has(override) ? override : cleanSyntheticDevice(row.default_device);
    const avoid = new Set(usedMoves);
    if (previousMoves.has(String(row.id))) avoid.add(previousMoves.get(String(row.id)));
    const run = generateDailySyntheticRoute(analysis, {usedMoves:avoid});
    const seconds = generatedSeconds(run.moves, body.minimumSeconds, body.maximumSeconds);
    usedMoves.add(run.moves);
    statements.push(db.prepare(`INSERT INTO synthetic_daily_scores (user_id, date_key, seconds, moves, device, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date_key) DO UPDATE SET seconds=excluded.seconds, moves=excluded.moves,
        device=excluded.device, updated_at=excluded.updated_at`)
      .bind(row.id, date, seconds, run.moves, device, now, now));
    generated.push({userId:String(row.id),username:String(row.username),date,seconds,moves:run.moves,device});
  }
  await db.batch(statements);
  return json({ok:true,date,baseMoves:analysis.baseMoves,generated});
}

/* Update already generated entries without changing their original times or devices. */
async function regenerateSyntheticMoves(context, body) {
  const db = requireDatabase(context.env);
  await ensureSyntheticDailySchema(db);
  const date = validDailyDate(body.date);
  if (!date) return json({ok:false,error:"Choose a prepared Daily puzzle."},400);
  const ids = selectedSyntheticIds(body);
  if (!ids.length) return json({ok:false,error:"Select between 1 and 200 artificial players."},400);
  const puzzle = DAILY_PRACTICE_CATALOG.find(item => item.date === date);
  let analysis;
  try { analysis = analyseDailySolution(puzzle); }
  catch (_) { return json({ok:false,error:"The stored Daily solution could not be validated. No scores were changed."},409); }
  const all = await db.prepare(
    "SELECT user_id, moves, seconds, device FROM synthetic_daily_scores WHERE date_key = ?"
  ).bind(date).all();
  const selected = new Set(ids);
  const rows = all.results || [];
  const existing = rows.filter(row => selected.has(String(row.user_id)));
  if (!existing.length) return json({ok:false,error:"None of the selected players has a score for this Daily."},404);
  const usedMoves = new Set(rows.filter(row => !selected.has(String(row.user_id)))
    .map(row => Number(row.moves)));
  const now = Date.now();
  const generated = [];
  const statements = [];
  for (const row of existing) {
    const avoid = new Set(usedMoves);
    avoid.add(Number(row.moves));
    const run = generateDailySyntheticRoute(analysis, {usedMoves:avoid});
    usedMoves.add(run.moves);
    statements.push(db.prepare(
      "UPDATE synthetic_daily_scores SET moves = ?, updated_at = ? WHERE user_id = ? AND date_key = ?"
    ).bind(run.moves, now, row.user_id, date));
    generated.push({userId:String(row.user_id),date,moves:run.moves,
      seconds:Number(row.seconds),device:cleanSyntheticDevice(row.device)});
  }
  await db.batch(statements);
  return json({ok:true,date,baseMoves:analysis.baseMoves,generated});
}

async function removeDailyLeaderboardScore(context, body) {
  const db = requireDatabase(context.env);
  await ensureSyntheticDailySchema(db);
  const date = validDailyDate(body.date);
  const username = String(body.username || "").trim();
  if (!date || !username) return json({ok:false,error:"Daily date and username are required."},400);
  const synthetic = await db.prepare("SELECT id FROM synthetic_users WHERE username_norm = ? LIMIT 1").bind(username.toLowerCase()).first();
  if (synthetic) {
    await db.prepare("DELETE FROM synthetic_daily_scores WHERE user_id = ? AND date_key = ?").bind(synthetic.id,date).run();
    return json({ok:true,username,date,kind:"synthetic"});
  }
  const user = await db.prepare("SELECT id, progress_json FROM users WHERE lower(username) = ? LIMIT 1").bind(username.toLowerCase()).first();
  if (!user) return json({ok:false,error:"Leaderboard player was not found."},404);
  const progress = parseProgress(user.progress_json);
  const originalDaily = progress[DAILY_COMPLETIONS_KEY];
  let daily = {};
  try { daily = typeof originalDaily === "string" ? JSON.parse(originalDaily || "{}") : (originalDaily || {}); } catch (_) { daily = {}; }
  if (!daily || typeof daily !== "object" || Array.isArray(daily) || !daily[date]) return json({ok:false,error:"That account has no saved Daily result for this date."},404);
  const record = {...daily[date], leaderboardTracked:true, leaderboardSeconds:null};
  delete record.leaderboardMoves; delete record.leaderboardStartedAt; delete record.leaderboardCompletedAt;
  delete record.leaderboardDevice; delete record.leaderboardTimezoneOffsetMinutes;
  daily[date] = record;
  progress[DAILY_COMPLETIONS_KEY] = typeof originalDaily === "string" ? JSON.stringify(daily) : daily;
  await db.prepare("UPDATE users SET progress_json = ?, progress_updated_at = ? WHERE id = ?")
    .bind(safeProgressJson(progress), Date.now(), user.id).run();
  return json({ok:true,username,date,kind:"real"});
}

function mappedUser(user, includeProgress = false) {
  const value = {
    id: user.id,
    username: user.username,
    email: user.email,
    googleLinked: Boolean(user.google_sub),
    googleEmail: user.google_email || "",
    passwordEnabled: user.password_enabled == null ? true : Number(user.password_enabled) !== 0,
    createdAt: Number(user.created_at) || 0,
    lastLoginAt: Number(user.last_login_at) || 0,
    validSessionCount: Number(user.valid_session_count) || 0,
    latestSessionStartedAt: Number(user.latest_session_started_at) || 0,
    firstRecordedLoginAt: Number(user.first_recorded_login_at) || 0,
    lastSeenAt: Number(user.last_seen_at) || 0,
    signupIp: user.signup_ip || "",
    lastIp: user.last_ip || "",
    userAgent: user.user_agent || "",
    totalActiveSeconds: Math.max(0, Number(user.total_active_seconds) || 0),
    progressUpdatedAt: Number(user.progress_updated_at) || 0,
    instantMoveEnabled: Boolean(Number(user.instant_move_enabled) || 0),
    instantMoveUpdatedAt: Math.max(0, Number(user.instant_move_updated_at) || 0),
    summary: canonicalAdminSummary(progressSummary(user.progress_json), user.progress_json)
  };
  if (includeProgress) value.progress = parseProgress(user.progress_json);
  return value;
}

// Aggregate only live server sessions, not a guess based on last activity.
// Cookie deletion on a device cannot be detected until that device contacts us.
async function readSessionStats(db, now, userId = "") {
  const filter = userId ? "WHERE user_id = ?" : "";
  const query = `
    SELECT user_id,
      SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) AS valid_session_count,
      MAX(CASE WHEN expires_at > ? THEN created_at ELSE NULL END) AS latest_session_started_at
    FROM sessions ${filter}
    GROUP BY user_id
  `;
  const statement = db.prepare(query);
  const result = await (userId ? statement.bind(now, now, userId) : statement.bind(now, now)).all();
  return new Map((result.results || []).map(row => [String(row.user_id), row]));
}

async function readFirstRecordedLogins(db, userId = "") {
  const filter = userId ? "WHERE user_id = ?" : "";
  const statement = db.prepare(`
    SELECT user_id, MIN(started_at) AS first_recorded_login_at
    FROM session_history ${filter}
    GROUP BY user_id
  `);
  const result = await (userId ? statement.bind(userId) : statement).all();
  return new Map((result.results || []).map(row => [String(row.user_id), row]));
}

function attachSessionStats(user, stats, earliest) {
  return {
    ...user,
    valid_session_count: Number(stats?.valid_session_count) || 0,
    latest_session_started_at: Number(stats?.latest_session_started_at) || 0,
    first_recorded_login_at: Number(earliest?.first_recorded_login_at) || 0
  };
}

async function readRecentSessions(db, userId, now) {
  const result = await db.prepare(`
    SELECT h.started_at, h.last_seen_at, h.expires_at, h.ended_at,
      h.end_reason, h.ip, h.user_agent, h.legacy,
      CASE WHEN s.token_hash IS NOT NULL AND s.expires_at > ?
        THEN 1 ELSE 0 END AS valid,
      CASE WHEN h.expires_at <= ? THEN 1 ELSE 0 END AS expired
    FROM session_history h
    LEFT JOIN sessions s ON s.token_hash = h.token_hash
    WHERE h.user_id = ?
    ORDER BY h.started_at DESC LIMIT 30
  `).bind(now, now, userId).all();
  return (result.results || []).map(row => ({
    startedAt: Number(row.started_at) || 0,
    lastSeenAt: Number(row.last_seen_at) || 0,
    expiresAt: Number(row.expires_at) || 0,
    endedAt: Number(row.ended_at) || 0,
    endReason: String(row.end_reason || ""),
    ip: String(row.ip || ""),
    userAgent: String(row.user_agent || ""),
    legacy: Boolean(row.legacy),
    valid: Boolean(row.valid),
    expired: Boolean(row.expired)
  }));
}

async function listUsers(context) {
  const db = requireDatabase(context.env);
  await backfillLegacySessions(db);
  await ensureUserFeatureFlagsSchema(db);
  const now = Date.now();
  const result = await db.prepare(`
    SELECT u.id, u.username, u.email, u.created_at, u.last_login_at, u.last_seen_at,
           u.signup_ip, u.last_ip, u.user_agent, u.total_active_seconds,
           u.progress_json, u.progress_updated_at,
           ai.provider_subject AS google_sub, ai.provider_email AS google_email,
           uas.password_enabled AS password_enabled,
           imf.enabled AS instant_move_enabled, imf.updated_at AS instant_move_updated_at
    FROM users u
    LEFT JOIN auth_identities ai
      ON ai.user_id = u.id AND ai.provider = 'google'
    LEFT JOIN user_auth_state uas
      ON uas.user_id = u.id
    LEFT JOIN user_feature_flags imf
      ON imf.user_id = u.id AND imf.feature_key = 'instant_move'
    ORDER BY u.last_seen_at DESC, u.created_at DESC
  `).all();
  const rows = result.results || [];
  const [stats, firstLogins] = await Promise.all([
    readSessionStats(db, now), readFirstRecordedLogins(db)
  ]);
  const users = rows.map(user => mappedUser(attachSessionStats(
    user, stats.get(String(user.id)), firstLogins.get(String(user.id))
  )));
  const evidenceUsers = rows.map((row,index) => ({...users[index],progress:parseProgress(row.progress_json)}));
  const records = await readPackCompletions(db);
  return json({ ok: true, authenticated: true, users,
    completions: completionRecordsForUsers(evidenceUsers, records) });
}

async function userDetail(context, id) {
  const db = requireDatabase(context.env);
  await backfillLegacySessions(db);
  await ensureUserFeatureFlagsSchema(db);
  const now = Date.now();
  const user = await db.prepare(`
    SELECT u.id, u.username, u.email, u.created_at, u.last_login_at, u.last_seen_at,
           u.signup_ip, u.last_ip, u.user_agent, u.total_active_seconds,
           u.progress_json, u.progress_updated_at,
           ai.provider_subject AS google_sub, ai.provider_email AS google_email,
           uas.password_enabled AS password_enabled,
           imf.enabled AS instant_move_enabled, imf.updated_at AS instant_move_updated_at
    FROM users u
    LEFT JOIN auth_identities ai
      ON ai.user_id = u.id AND ai.provider = 'google'
    LEFT JOIN user_auth_state uas
      ON uas.user_id = u.id
    LEFT JOIN user_feature_flags imf
      ON imf.user_id = u.id AND imf.feature_key = 'instant_move'
    WHERE u.id = ? LIMIT 1
  `).bind(id).first();
  if (!user) return json({ ok: false, error: "User not found." }, 404);
  const [stats, firstLogins, sessions, records] = await Promise.all([
    readSessionStats(db, now, id), readFirstRecordedLogins(db, id),
    readRecentSessions(db, id, now), readPackCompletions(db, id)
  ]);
  const mapped = mappedUser(attachSessionStats(
    user, stats.get(String(user.id)), firstLogins.get(String(user.id))
  ), true);
  await ensureAttemptHistorySchema(db);
  const history = await readAttemptOverview(db,id);
  return json({ ok: true, authenticated: true, user: mapped, sessions, history,
    completions: completionRecordsForUsers([mapped], records) });
}

export async function onRequest(context) {
  try {
    const db = requireDatabase(context.env);
    await ensureGoogleAuthSchema(db);

    if (context.request.method === "POST") {
      const body = await readBody(context.request);
      const action = String(body.action || "").toLowerCase();
      if (action === "login") return await login(context, body);
      if (action === "logout") {
        await destroyAdminSession(context.env, context.request);
        return json({ ok: true, authenticated: false }, 200, { "set-cookie": expireCookie("boxxy_basement") });
      }
      if (!await adminAuthenticated(context.env, context.request)) {
        return json({ ok: false, authenticated: false, error: "Basement session has expired. Please sign in again." }, 401);
      }
      if (action === "reset_password") return await resetUserPassword(context, body);
      if (action === "set_instant_move") return await setInstantMoveAccess(context, body);
      if (action === "synthetic_add_user") return await addSyntheticUser(context, body);
      if (action === "synthetic_delete_user") return await deleteSyntheticUser(context, body);
      if (action === "synthetic_generate_scores") return await generateSyntheticScores(context, body);
      if (action === "synthetic_regenerate_moves") return await regenerateSyntheticMoves(context, body);
      if (action === "daily_remove_score") return await removeDailyLeaderboardScore(context, body);
      if (action === "synthetic_state") return await syntheticState(context, body);
      return json({ ok: false, error: "Unknown action." }, 400);
    }

    if (context.request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
    if (!await adminAuthenticated(context.env, context.request)) {
      return json({ ok: true, authenticated: false }, 401);
    }

    const url = new URL(context.request.url);
    const id = String(url.searchParams.get("user") || "").trim();
    if (id && url.searchParams.has('packId')) {
      await ensureAttemptHistorySchema(db);
      const history = await readLevelAttemptHistory(db,id,{
        packId:url.searchParams.get('packId'),levelToken:url.searchParams.get('levelToken'),
        sort:url.searchParams.get('sort'),direction:url.searchParams.get('direction'),
        offset:url.searchParams.get('offset')
      });
      return json({ok:true,authenticated:true,...history});
    }
    return id ? await userDetail(context, id) : await listUsers(context);
  } catch (error) {
    console.error("BOXXY basement error", error);
    const message = String(error?.message || error || "Unexpected error.");
    return json({ ok: false, error: message.includes("database binding DB") ? "Basement database is not configured yet." : message }, message.includes("database binding DB") ? 503 : 500);
  }
}
