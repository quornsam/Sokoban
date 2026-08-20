import {
  json,
  requireDatabase,
  clientIp,
  consumeRateLimit,
  createAdminSession,
  destroyAdminSession,
  adminAuthenticated,
  secureCompare,
  expireCookie,
  parseProgress,
  progressSummary
} from "../_lib/auth.js";

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

async function listUsers(context) {
  const db = requireDatabase(context.env);
  const result = await db.prepare(`
    SELECT id, username, email, created_at, last_login_at, last_seen_at,
           signup_ip, last_ip, user_agent, total_active_seconds,
           progress_json, progress_updated_at
    FROM users
    ORDER BY last_seen_at DESC, created_at DESC
  `).all();
  const users = (result.results || []).map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: Number(user.created_at) || 0,
    lastLoginAt: Number(user.last_login_at) || 0,
    lastSeenAt: Number(user.last_seen_at) || 0,
    signupIp: user.signup_ip || "",
    lastIp: user.last_ip || "",
    userAgent: user.user_agent || "",
    totalActiveSeconds: Math.max(0, Number(user.total_active_seconds) || 0),
    progressUpdatedAt: Number(user.progress_updated_at) || 0,
    summary: progressSummary(user.progress_json)
  }));
  return json({ ok: true, authenticated: true, users });
}

async function userDetail(context, id) {
  const db = requireDatabase(context.env);
  const user = await db.prepare(`
    SELECT id, username, email, created_at, last_login_at, last_seen_at,
           signup_ip, last_ip, user_agent, total_active_seconds,
           progress_json, progress_updated_at
    FROM users WHERE id = ? LIMIT 1
  `).bind(id).first();
  if (!user) return json({ ok: false, error: "User not found." }, 404);
  return json({
    ok: true,
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: Number(user.created_at) || 0,
      lastLoginAt: Number(user.last_login_at) || 0,
      lastSeenAt: Number(user.last_seen_at) || 0,
      signupIp: user.signup_ip || "",
      lastIp: user.last_ip || "",
      userAgent: user.user_agent || "",
      totalActiveSeconds: Math.max(0, Number(user.total_active_seconds) || 0),
      progressUpdatedAt: Number(user.progress_updated_at) || 0,
      summary: progressSummary(user.progress_json),
      progress: parseProgress(user.progress_json)
    }
  });
}

export async function onRequest(context) {
  try {
    requireDatabase(context.env);
    if (context.request.method === "POST") {
      const body = await readBody(context.request);
      const action = String(body.action || "").toLowerCase();
      if (action === "login") return await login(context, body);
      if (action === "logout") {
        await destroyAdminSession(context.env, context.request);
        return json({ ok: true, authenticated: false }, 200, { "set-cookie": expireCookie("boxxy_basement") });
      }
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
