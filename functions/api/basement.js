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
  progressSummary
} from "../_lib/auth.js";
import { ensureGoogleAuthSchema } from "../_lib/google-auth.js";
import { readPackCompletions, completionRecordsForUsers, canonicalAdminSummary } from "../_lib/pack-completions.js";

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

  const { salt, hash } = await passwordRecord(password, "", env.BOXXY_PASSWORD_PEPPER);
  const statements = [
    db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
      .bind(hash, salt, user.id),
    db.prepare(`
      INSERT INTO user_auth_state (user_id, password_enabled)
      VALUES (?, 1)
      ON CONFLICT(user_id) DO UPDATE SET password_enabled = 1
    `).bind(user.id),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id)
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
    lastSeenAt: Number(user.last_seen_at) || 0,
    signupIp: user.signup_ip || "",
    lastIp: user.last_ip || "",
    userAgent: user.user_agent || "",
    totalActiveSeconds: Math.max(0, Number(user.total_active_seconds) || 0),
    progressUpdatedAt: Number(user.progress_updated_at) || 0,
    summary: canonicalAdminSummary(progressSummary(user.progress_json), user.progress_json)
  };
  if (includeProgress) value.progress = parseProgress(user.progress_json);
  return value;
}

async function listUsers(context) {
  const db = requireDatabase(context.env);
  const result = await db.prepare(`
    SELECT u.id, u.username, u.email, u.created_at, u.last_login_at, u.last_seen_at,
           u.signup_ip, u.last_ip, u.user_agent, u.total_active_seconds,
           u.progress_json, u.progress_updated_at,
           ai.provider_subject AS google_sub, ai.provider_email AS google_email,
           uas.password_enabled AS password_enabled
    FROM users u
    LEFT JOIN auth_identities ai
      ON ai.user_id = u.id AND ai.provider = 'google'
    LEFT JOIN user_auth_state uas
      ON uas.user_id = u.id
    ORDER BY u.last_seen_at DESC, u.created_at DESC
  `).all();
  const rows = result.results || [];
  const users = rows.map(user => mappedUser(user));
  const evidenceUsers = rows.map((row,index) => ({...users[index],progress:parseProgress(row.progress_json)}));
  const records = await readPackCompletions(db);
  return json({ ok: true, authenticated: true, users,
    completions: completionRecordsForUsers(evidenceUsers, records) });
}

async function userDetail(context, id) {
  const db = requireDatabase(context.env);
  const user = await db.prepare(`
    SELECT u.id, u.username, u.email, u.created_at, u.last_login_at, u.last_seen_at,
           u.signup_ip, u.last_ip, u.user_agent, u.total_active_seconds,
           u.progress_json, u.progress_updated_at,
           ai.provider_subject AS google_sub, ai.provider_email AS google_email,
           uas.password_enabled AS password_enabled
    FROM users u
    LEFT JOIN auth_identities ai
      ON ai.user_id = u.id AND ai.provider = 'google'
    LEFT JOIN user_auth_state uas
      ON uas.user_id = u.id
    WHERE u.id = ? LIMIT 1
  `).bind(id).first();
  if (!user) return json({ ok: false, error: "User not found." }, 404);
  const mapped = mappedUser(user, true);
  const records = await readPackCompletions(db, id);
  return json({ ok: true, authenticated: true, user: mapped,
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
