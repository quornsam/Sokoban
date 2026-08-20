import {
  json,
  requireDatabase,
  clientIp,
  userAgent,
  cleanUsername,
  validUsername,
  cleanEmail,
  validEmail,
  validPassword,
  passwordRecord,
  verifyPassword,
  createSession,
  destroySession,
  authenticatedUser,
  consumeRateLimit,
  parseProgress,
  safeProgressJson,
  publicAccount,
  expireCookie
} from "../_lib/auth.js";

function errorMessage(error) {
  const text = String(error?.message || error || "Unexpected error.");
  return text.includes("UNIQUE constraint failed: users.username")
    ? "That username is already taken."
    : text.includes("UNIQUE constraint failed: users.email")
      ? "That email address already has an account."
      : text;
}

async function readBody(request) {
  try { return await request.json(); }
  catch (_) { return {}; }
}

function accountPayload(user) {
  return {
    ok: true,
    authenticated: true,
    account: publicAccount(user),
    progress: parseProgress(user.progress_json)
  };
}

async function handleGet(context) {
  const { env, request } = context;
  requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: true, authenticated: false });

  const now = Date.now();
  if (now - Number(user.last_seen_at || 0) > 5 * 60 * 1000) {
    await env.DB.prepare(`
      UPDATE users SET last_seen_at = ?, last_ip = ?, user_agent = ? WHERE id = ?
    `).bind(now, clientIp(request), userAgent(request), user.id).run();
    user.last_seen_at = now;
  }
  return json(accountPayload(user));
}

async function handleRegister(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const ip = clientIp(request);
  if (!await consumeRateLimit(env, `register:${ip || "unknown"}`, 5, 60 * 60)) {
    return json({ ok: false, error: "Too many account attempts. Please try again later." }, 429);
  }

  const username = cleanUsername(body.username);
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  if (!validUsername(username)) return json({ ok: false, error: "Username must be 3–20 letters, numbers, _ or -." }, 400);
  if (!validEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (!validPassword(password)) return json({ ok: false, error: "Password must be at least 8 characters." }, 400);
  if (body.termsAccepted !== true) return json({ ok: false, error: "Please accept the account terms and privacy information." }, 400);

  const existing = await db.prepare(`
    SELECT id, username, email FROM users
    WHERE lower(username) = lower(?) OR lower(email) = lower(?) LIMIT 1
  `).bind(username, email).first();
  if (existing) {
    return json({ ok: false, error: String(existing.email).toLowerCase() === email ? "That email address already has an account." : "That username is already taken." }, 409);
  }

  const { salt, hash } = await passwordRecord(password, "", env.BOXXY_PASSWORD_PEPPER);
  const id = crypto.randomUUID();
  const now = Date.now();
  const progressJson = safeProgressJson(body.progress || {});

  await db.prepare(`
    INSERT INTO users (
      id, username, email, password_hash, password_salt,
      created_at, last_login_at, last_seen_at, signup_ip, last_ip,
      user_agent, total_active_seconds, progress_json, progress_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(
    id, username, email, hash, salt,
    now, now, now, ip, ip,
    userAgent(request), progressJson, now
  ).run();

  const session = await createSession(env, request, id);
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  return json(accountPayload(user), 201, { "set-cookie": session.header });
}

async function handleLogin(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const ip = clientIp(request);
  if (!await consumeRateLimit(env, `login:${ip || "unknown"}`, 12, 15 * 60)) {
    return json({ ok: false, error: "Too many sign-in attempts. Please try again later." }, 429);
  }

  const identity = String(body.identity || "").trim();
  const password = String(body.password || "");
  if (!identity || !password) return json({ ok: false, error: "Enter your username/email and password." }, 400);

  const user = await db.prepare(`
    SELECT * FROM users
    WHERE lower(username) = lower(?) OR lower(email) = lower(?)
    LIMIT 1
  `).bind(identity, identity).first();

  if (!user || !await verifyPassword(password, user.password_salt, user.password_hash, env.BOXXY_PASSWORD_PEPPER)) {
    return json({ ok: false, error: "Username/email or password is incorrect." }, 401);
  }

  const now = Date.now();
  await db.prepare(`
    UPDATE users SET last_login_at = ?, last_seen_at = ?, last_ip = ?, user_agent = ? WHERE id = ?
  `).bind(now, now, ip, userAgent(request), user.id).run();
  user.last_login_at = now;
  user.last_seen_at = now;
  user.last_ip = ip;
  user.user_agent = userAgent(request);

  const session = await createSession(env, request, user.id);
  return json(accountPayload(user), 200, { "set-cookie": session.header });
}

async function handleSync(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: false, authenticated: false, error: "Please sign in again." }, 401);

  const progressJson = safeProgressJson(body.progress || {});
  const activeSeconds = Math.max(0, Math.min(1800, Math.trunc(Number(body.activeSecondsDelta) || 0)));
  const now = Date.now();
  await db.prepare(`
    UPDATE users SET
      progress_json = ?, progress_updated_at = ?, last_seen_at = ?, last_ip = ?, user_agent = ?,
      total_active_seconds = total_active_seconds + ?
    WHERE id = ?
  `).bind(progressJson, now, now, clientIp(request), userAgent(request), activeSeconds, user.id).run();

  const refreshed = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
  return json({ ok: true, account: publicAccount(refreshed), progressUpdatedAt: now });
}

async function handleLogout(context) {
  await destroySession(context.env, context.request);
  return json({ ok: true, authenticated: false }, 200, { "set-cookie": expireCookie("boxxy_session") });
}

async function handleDelete(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: false, authenticated: false, error: "Please sign in again." }, 401);
  const password = String(body.password || "");
  if (!await verifyPassword(password, user.password_salt, user.password_hash, env.BOXXY_PASSWORD_PEPPER)) {
    return json({ ok: false, error: "Password is incorrect." }, 401);
  }

  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  return json({ ok: true, authenticated: false, deleted: true }, 200, { "set-cookie": expireCookie("boxxy_session") });
}

export async function onRequest(context) {
  try {
    if (context.request.method === "GET") return await handleGet(context);
    if (context.request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

    const body = await readBody(context.request);
    const action = String(body.action || "").toLowerCase();
    if (action === "register") return await handleRegister(context, body);
    if (action === "login") return await handleLogin(context, body);
    if (action === "sync") return await handleSync(context, body);
    if (action === "logout") return await handleLogout(context);
    if (action === "delete") return await handleDelete(context, body);
    return json({ ok: false, error: "Unknown account action." }, 400);
  } catch (error) {
    console.error("BOXXY account error", error);
    const message = errorMessage(error);
    const configurationError = message.includes("database binding DB") || message.includes("password pepper");
    return json({ ok: false, error: configurationError ? "Account service is not configured yet." : message }, configurationError ? 503 : 500);
  }
}
