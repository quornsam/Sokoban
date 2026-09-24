/* BOXXY v365: Basement can grant or revoke private Instant Move access per user. */
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
  progressSummary,
  ensureSessionHistorySchema,
  backfillLegacySessions,
  sessionRevocationStatements,
  ensureUserFeatureFlagsSchema
} from "../_lib/auth.js";
import { ensureGoogleAuthSchema } from "../_lib/google-auth.js";
import { readPackCompletions, completionRecordsForUsers, canonicalAdminSummary } from "../_lib/pack-completions.js";

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
  return json({ ok: true, authenticated: true, user: mapped, sessions,
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
      return json({ ok: false, error: "Unknown action." }, 400);
    }

    if (context.request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
    if (!await adminAuthenticated(context.env, context.request)) {
      return json({ ok: true, authenticated: false }, 401);
    }

    const url = new URL(context.request.url);
    const id = String(url.searchParams.get("user") || "").trim();
    return id ? await userDetail(context, id) : await listUsers(context);
  } catch (error) {
    console.error("BOXXY basement error", error);
    const message = String(error?.message || error || "Unexpected error.");
    return json({ ok: false, error: message.includes("database binding DB") ? "Basement database is not configured yet." : message }, message.includes("database binding DB") ? 503 : 500);
  }
}
