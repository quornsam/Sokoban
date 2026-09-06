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
import {
  verifyGoogleCredential,
  ensureGoogleAuthSchema,
  userAuthInfo
} from "../_lib/google-auth.js";

const SERVER_ACTIVITY_KEY = "__boxxy-server-activity-v1";

function utcDayKey(timestamp) {
  return new Date(Number(timestamp) || Date.now()).toISOString().slice(0, 10);
}

function withServerActivity(existingValue, incomingValue, activeSeconds, now) {
  const existing = parseProgress(existingValue);
  const incoming = parseProgress(incomingValue);
  let activity = { version: 1, days: {} };
  const previous = existing[SERVER_ACTIVITY_KEY];
  if (previous && typeof previous === "object" && !Array.isArray(previous)) {
    const days = previous.days && typeof previous.days === "object" && !Array.isArray(previous.days) ? previous.days : {};
    activity = { version: 1, days: { ...days } };
  }

  const seconds = Math.max(0, Math.min(1800, Math.trunc(Number(activeSeconds) || 0)));
  if (seconds > 0) {
    const day = utcDayKey(now);
    const prior = activity.days[day] && typeof activity.days[day] === "object" ? activity.days[day] : {};
    activity.days[day] = {
      seconds: Math.max(0, Math.trunc(Number(prior.seconds) || 0)) + seconds,
      lastSeenAt: Number(now) || Date.now()
    };
  }

  const cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000);
  for (const day of Object.keys(activity.days)) {
    const stamp = Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(stamp) || stamp < cutoff) delete activity.days[day];
  }
  incoming[SERVER_ACTIVITY_KEY] = activity;
  return incoming;
}

function errorMessage(error) {
  const text = String(error?.message || error || "Unexpected error.");
  return text.includes("UNIQUE constraint failed: users.username")
    ? "That username is already taken."
    : text.includes("UNIQUE constraint failed: users.email")
      ? "That email address already has an account."
      : text.includes("UNIQUE constraint failed: auth_identities.user_id")
        ? "A different Google account is already linked to this BOXXY account."
        : text.includes("UNIQUE constraint failed: auth_identities.provider")
          ? "That Google account is already linked to another BOXXY account."
          : text;
}

async function readBody(request) {
  try { return await request.json(); }
  catch (_) { return {}; }
}

async function accountPayload(db, user) {
  const authInfo = await userAuthInfo(db, user.id);
  return {
    ok: true,
    authenticated: true,
    account: publicAccount(user, authInfo),
    progress: parseProgress(user.progress_json)
  };
}

async function updateLogin(db, request, user) {
  const now = Date.now();
  const ip = clientIp(request);
  const agent = userAgent(request);
  await db.prepare(`
    UPDATE users SET last_login_at = ?, last_seen_at = ?, last_ip = ?, user_agent = ? WHERE id = ?
  `).bind(now, now, ip, agent, user.id).run();
  user.last_login_at = now;
  user.last_seen_at = now;
  user.last_ip = ip;
  user.user_agent = agent;
}

async function googleIdentityBySubject(db, sub) {
  return await db.prepare(`
    SELECT provider_subject, user_id, provider_email, linked_at, last_verified_at
    FROM auth_identities
    WHERE provider = 'google' AND provider_subject = ?
    LIMIT 1
  `).bind(sub).first();
}

async function googleIdentityByUser(db, userId) {
  return await db.prepare(`
    SELECT provider_subject, user_id, provider_email, linked_at, last_verified_at
    FROM auth_identities
    WHERE provider = 'google' AND user_id = ?
    LIMIT 1
  `).bind(userId).first();
}

async function userByEmail(db, email, excludedUserId = "") {
  if (excludedUserId) {
    return await db.prepare(`
      SELECT id, username, email FROM users
      WHERE lower(email) = lower(?) AND id <> ?
      LIMIT 1
    `).bind(email, excludedUserId).first();
  }
  return await db.prepare(`
    SELECT id, username, email FROM users
    WHERE lower(email) = lower(?)
    LIMIT 1
  `).bind(email).first();
}

async function handleGet(context) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: true, authenticated: false });

  const now = Date.now();
  if (now - Number(user.last_seen_at || 0) > 5 * 60 * 1000) {
    await db.prepare(`
      UPDATE users SET last_seen_at = ?, last_ip = ?, user_agent = ? WHERE id = ?
    `).bind(now, clientIp(request), userAgent(request), user.id).run();
    user.last_seen_at = now;
  }
  return json(await accountPayload(db, user));
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

  await db.batch([
    db.prepare(`
      INSERT INTO users (
        id, username, email, password_hash, password_salt,
        created_at, last_login_at, last_seen_at, signup_ip, last_ip,
        user_agent, total_active_seconds, progress_json, progress_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id, username, email, hash, salt,
      now, now, now, ip, ip,
      userAgent(request), progressJson, now
    ),
    db.prepare(`
      INSERT INTO user_auth_state (user_id, password_enabled)
      VALUES (?, 1)
      ON CONFLICT(user_id) DO UPDATE SET password_enabled = 1
    `).bind(id)
  ]);

  const session = await createSession(env, request, id);
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  return json(await accountPayload(db, user), 201, { "set-cookie": session.header });
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

  const authInfo = user ? await userAuthInfo(db, user.id) : null;
  if (!user || authInfo?.passwordEnabled === false || !await verifyPassword(password, user.password_salt, user.password_hash, env.BOXXY_PASSWORD_PEPPER)) {
    return json({ ok: false, error: "Username/email or password is incorrect." }, 401);
  }

  await updateLogin(db, request, user);
  const session = await createSession(env, request, user.id);
  return json(await accountPayload(db, user), 200, { "set-cookie": session.header });
}

async function handleGoogleAuth(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const ip = clientIp(request);
  if (!await consumeRateLimit(env, `google-login:${ip || "unknown"}`, 20, 15 * 60)) {
    return json({ ok: false, error: "Too many Google sign-in attempts. Please try again later." }, 429);
  }

  const google = await verifyGoogleCredential(body.googleCredential);
  const email = cleanEmail(google.email);
  if (!validEmail(email)) return json({ ok: false, error: "Google did not provide a valid verified email address." }, 400);

  const linked = await googleIdentityBySubject(db, google.sub);
  if (linked) {
    const user = await db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(linked.user_id).first();
    if (!user) return json({ ok: false, error: "That Google link is no longer valid. Please contact BOXXY." }, 409);

    const now = Date.now();
    await db.prepare(`
      UPDATE auth_identities SET provider_email = ?, last_verified_at = ?
      WHERE provider = 'google' AND provider_subject = ?
    `).bind(email, now, google.sub).run();
    await updateLogin(db, request, user);
    const session = await createSession(env, request, user.id);
    return json(await accountPayload(db, user), 200, { "set-cookie": session.header });
  }

  const emailOwner = await userByEmail(db, email);
  if (emailOwner) {
    return json({
      ok: false,
      code: "existing_email_requires_link",
      error: "That Google email already belongs to a BOXXY account. Sign in to that BOXXY account with its username/password first, then link Google from inside your account."
    }, 409);
  }

  return json({
    ok: true,
    authenticated: false,
    googleRegistrationRequired: true,
    googleEmail: email
  });
}

async function handleGoogleRegister(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const ip = clientIp(request);
  if (!await consumeRateLimit(env, `google-register:${ip || "unknown"}`, 5, 60 * 60)) {
    return json({ ok: false, error: "Too many account attempts. Please try again later." }, 429);
  }

  const google = await verifyGoogleCredential(body.googleCredential);
  const email = cleanEmail(google.email);
  const username = cleanUsername(body.username);
  if (!validEmail(email)) return json({ ok: false, error: "Google did not provide a valid verified email address." }, 400);
  if (!validUsername(username)) return json({ ok: false, error: "Username must be 3–20 letters, numbers, _ or -." }, 400);
  if (body.termsAccepted !== true) return json({ ok: false, error: "Please accept the account terms and privacy information." }, 400);

  const alreadyLinked = await googleIdentityBySubject(db, google.sub);
  if (alreadyLinked) {
    return json({ ok: false, error: "That Google account is already linked to a BOXXY account. Use Sign in with Google instead." }, 409);
  }

  const existing = await db.prepare(`
    SELECT id, username, email FROM users
    WHERE lower(username) = lower(?) OR lower(email) = lower(?)
    LIMIT 1
  `).bind(username, email).first();
  if (existing) {
    const emailTaken = String(existing.email || "").toLowerCase() === email;
    return json({
      ok: false,
      code: emailTaken ? "existing_email_requires_link" : "username_taken",
      error: emailTaken
        ? "That Google email already belongs to a BOXXY account. Sign in to that BOXXY account with its username/password first, then link Google from inside your account."
        : "That username is already taken."
    }, 409);
  }

  // The database's original password columns remain intact for backwards
  // compatibility. Google-only users get an unreachable random credential and
  // are explicitly marked as having password login disabled.
  const unreachablePassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { salt, hash } = await passwordRecord(unreachablePassword, "", env.BOXXY_PASSWORD_PEPPER);
  const id = crypto.randomUUID();
  const now = Date.now();
  const progressJson = safeProgressJson(body.progress || {});

  await db.batch([
    db.prepare(`
      INSERT INTO users (
        id, username, email, password_hash, password_salt,
        created_at, last_login_at, last_seen_at, signup_ip, last_ip,
        user_agent, total_active_seconds, progress_json, progress_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id, username, email, hash, salt,
      now, now, now, ip, ip,
      userAgent(request), progressJson, now
    ),
    db.prepare(`
      INSERT INTO user_auth_state (user_id, password_enabled)
      VALUES (?, 0)
    `).bind(id),
    db.prepare(`
      INSERT INTO auth_identities (
        provider, provider_subject, user_id, provider_email, linked_at, last_verified_at
      ) VALUES ('google', ?, ?, ?, ?, ?)
    `).bind(google.sub, id, email, now, now)
  ]);

  const session = await createSession(env, request, id);
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  return json(await accountPayload(db, user), 201, { "set-cookie": session.header });
}

async function handleLinkGoogle(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: false, authenticated: false, error: "Please sign in again." }, 401);

  const ip = clientIp(request);
  if (!await consumeRateLimit(env, `google-link:${user.id}:${ip || "unknown"}`, 10, 30 * 60)) {
    return json({ ok: false, error: "Too many Google linking attempts. Please try again later." }, 429);
  }

  const google = await verifyGoogleCredential(body.googleCredential);
  const email = cleanEmail(google.email);
  if (!validEmail(email)) return json({ ok: false, error: "Google did not provide a valid verified email address." }, 400);

  const subjectOwner = await googleIdentityBySubject(db, google.sub);
  if (subjectOwner && subjectOwner.user_id !== user.id) {
    return json({ ok: false, error: "That Google account is already linked to another BOXXY account." }, 409);
  }

  const currentGoogle = await googleIdentityByUser(db, user.id);
  if (currentGoogle && currentGoogle.provider_subject !== google.sub) {
    return json({ ok: false, error: "A different Google account is already linked to this BOXXY account." }, 409);
  }

  const emailOwner = await userByEmail(db, email, user.id);
  if (emailOwner) {
    return json({
      ok: false,
      code: "google_email_belongs_to_other_boxxy_account",
      error: "That Google email belongs to a different BOXXY account, so it cannot be linked here. Neither account has been changed."
    }, 409);
  }

  const now = Date.now();
  if (currentGoogle) {
    await db.prepare(`
      UPDATE auth_identities SET provider_email = ?, last_verified_at = ?
      WHERE provider = 'google' AND user_id = ?
    `).bind(email, now, user.id).run();
  } else {
    await db.batch([
      db.prepare(`
        INSERT INTO auth_identities (
          provider, provider_subject, user_id, provider_email, linked_at, last_verified_at
        ) VALUES ('google', ?, ?, ?, ?, ?)
      `).bind(google.sub, user.id, email, now, now),
      db.prepare(`
        INSERT INTO user_auth_state (user_id, password_enabled)
        VALUES (?, 1)
        ON CONFLICT(user_id) DO NOTHING
      `).bind(user.id)
    ]);
  }

  const refreshed = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
  return json(await accountPayload(db, refreshed));
}

async function handleSync(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok: false, authenticated: false, error: "Please sign in again." }, 401);

  const activeSeconds = Math.max(0, Math.min(1800, Math.trunc(Number(body.activeSecondsDelta) || 0)));
  const now = Date.now();
  const progressJson = safeProgressJson(withServerActivity(user.progress_json, body.progress || {}, activeSeconds, now));
  await db.prepare(`
    UPDATE users SET
      progress_json = ?, progress_updated_at = ?, last_seen_at = ?, last_ip = ?, user_agent = ?,
      total_active_seconds = total_active_seconds + ?
    WHERE id = ?
  `).bind(progressJson, now, now, clientIp(request), userAgent(request), activeSeconds, user.id).run();

  const refreshed = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
  const authInfo = await userAuthInfo(db, user.id);
  return json({ ok: true, account: publicAccount(refreshed, authInfo), progressUpdatedAt: now });
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

  const authInfo = await userAuthInfo(db, user.id);
  if (authInfo.passwordEnabled) {
    const password = String(body.password || "");
    if (!await verifyPassword(password, user.password_salt, user.password_hash, env.BOXXY_PASSWORD_PEPPER)) {
      return json({ ok: false, error: "Password is incorrect." }, 401);
    }
  } else {
    const google = await verifyGoogleCredential(body.googleCredential);
    const linked = await googleIdentityBySubject(db, google.sub);
    if (!linked || linked.user_id !== user.id) {
      return json({ ok: false, error: "Google confirmation did not match this BOXXY account." }, 401);
    }
  }

  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  return json({ ok: true, authenticated: false, deleted: true }, 200, { "set-cookie": expireCookie("boxxy_session") });
}

export async function onRequest(context) {
  try {
    const db = requireDatabase(context.env);
    await ensureGoogleAuthSchema(db);

    if (context.request.method === "GET") return await handleGet(context);
    if (context.request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

    const body = await readBody(context.request);
    const action = String(body.action || "").toLowerCase();
    if (action === "register") return await handleRegister(context, body);
    if (action === "login") return await handleLogin(context, body);
    if (action === "google_auth") return await handleGoogleAuth(context, body);
    if (action === "google_register") return await handleGoogleRegister(context, body);
    if (action === "link_google") return await handleLinkGoogle(context, body);
    if (action === "sync") return await handleSync(context, body);
    if (action === "logout") return await handleLogout(context);
    if (action === "delete") return await handleDelete(context, body);
    return json({ ok: false, error: "Unknown account action." }, 400);
  } catch (error) {
    console.error("BOXXY account error", error);
    const message = errorMessage(error);
    const configurationError = message.includes("database binding DB") || message.includes("password pepper");
    const googleTemporaryError = message === "Could not verify Google sign-in right now.";
    const googleCredentialError = message.startsWith("Google sign-in") || message.startsWith("Google did not provide");
    if (configurationError) return json({ ok: false, error: "Account service is not configured yet." }, 503);
    if (googleTemporaryError) return json({ ok: false, error: message }, 503);
    if (googleCredentialError) return json({ ok: false, error: message }, 401);
    return json({ ok: false, error: message }, 500);
  }
}
