const encoder = new TextEncoder();

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

export function requireDatabase(env) {
  if (!env?.DB || typeof env.DB.prepare !== "function") {
    throw new Error("BOXXY database binding DB is not configured.");
  }
  return env.DB;
}

export function clientIp(request) {
  return String(request.headers.get("CF-Connecting-IP") || "").slice(0, 64);
}

export function userAgent(request) {
  return String(request.headers.get("User-Agent") || "").slice(0, 500);
}

export function cleanUsername(value) {
  return String(value || "").trim();
}

export function validUsername(value) {
  const username = cleanUsername(value);
  return username.length >= 3 && username.length <= 20 && /^[A-Za-z0-9_-]+$/.test(username);
}

export function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validEmail(value) {
  const email = cleanEmail(value);
  return email.length >= 5 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value)));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function passwordRecord(password, existingSalt = "", pepper = "") {
  if (!pepper) throw new Error("BOXXY password pepper is not configured.");
  const salt = existingSalt || randomToken(16);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${password}\u0000${pepper}`),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: encoder.encode(salt),
    iterations: 30000
  }, key, 256);
  return { salt, hash: bytesToBase64Url(new Uint8Array(bits)) };
}

function constantTimeEqual(a, b) {
  const left = encoder.encode(String(a));
  const right = encoder.encode(String(b));
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index++) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}

export async function verifyPassword(password, salt, expectedHash, pepper = "") {
  const record = await passwordRecord(password, salt, pepper);
  return constantTimeEqual(record.hash, expectedHash);
}

function parseCookies(request) {
  const raw = request.headers.get("Cookie") || "";
  const result = {};
  raw.split(";").forEach(part => {
    const index = part.indexOf("=");
    if (index < 1) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return;
    try { result[key] = decodeURIComponent(value); }
    catch (_) { result[key] = value; }
  });
  return result;
}

function cookie(name, value, maxAgeSeconds) {
  const maxAge = Math.max(0, Math.trunc(Number(maxAgeSeconds) || 0));
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function expireCookie(name) {
  return cookie(name, "", 0);
}

export async function createSession(env, request, userId) {
  const db = requireDatabase(env);
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + (30 * 24 * 60 * 60 * 1000);
  await db.prepare(`
    INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(tokenHash, userId, now, expiresAt, clientIp(request), userAgent(request)).run();
  return { token, header: cookie("boxxy_session", token, 30 * 24 * 60 * 60) };
}

export async function destroySession(env, request) {
  const db = requireDatabase(env);
  const token = parseCookies(request).boxxy_session || "";
  if (token) {
    const tokenHash = await sha256(token);
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
}

export async function authenticatedUser(env, request) {
  const db = requireDatabase(env);
  const token = parseCookies(request).boxxy_session || "";
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const user = await db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, now).first();
  if (!user) return null;
  return user;
}

export async function consumeRateLimit(env, key, limit, windowSeconds) {
  const db = requireDatabase(env);
  const now = Date.now();
  const windowMs = Math.max(1000, Number(windowSeconds) * 1000);
  const row = await db.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").bind(key).first();
  if (!row || now - Number(row.window_start || 0) >= windowMs) {
    await db.prepare(`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1
    `).bind(key, now).run();
    return true;
  }
  if (Number(row.count || 0) >= Number(limit)) return false;
  await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return true;
}

export function parseProgress(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function safeProgressJson(value, maxBytes = 256000) {
  const progress = parseProgress(value);
  const text = JSON.stringify(progress);
  if (encoder.encode(text).byteLength > maxBytes) throw new Error("Cloud save is too large.");
  return text;
}

export function publicAccount(user, authInfo = {}) {
  return {
    id: String(user.id),
    username: String(user.username),
    email: String(user.email),
    createdAt: Number(user.created_at) || 0,
    lastSeenAt: Number(user.last_seen_at) || 0,
    totalActiveSeconds: Math.max(0, Number(user.total_active_seconds) || 0),
    progressUpdatedAt: Number(user.progress_updated_at) || 0,
    googleLinked: Boolean(authInfo.googleLinked),
    googleEmail: String(authInfo.googleEmail || ""),
    passwordEnabled: authInfo.passwordEnabled !== false
  };
}

export async function createAdminSession(env, request) {
  const db = requireDatabase(env);
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + (12 * 60 * 60 * 1000);
  await db.prepare(`
    INSERT INTO admin_sessions (token_hash, created_at, expires_at, ip, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tokenHash, now, expiresAt, clientIp(request), userAgent(request)).run();
  return { token, header: cookie("boxxy_basement", token, 12 * 60 * 60) };
}

export async function destroyAdminSession(env, request) {
  const db = requireDatabase(env);
  const token = parseCookies(request).boxxy_basement || "";
  if (token) {
    const tokenHash = await sha256(token);
    await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
}

export async function adminAuthenticated(env, request) {
  const db = requireDatabase(env);
  const token = parseCookies(request).boxxy_basement || "";
  if (!token) return false;
  const tokenHash = await sha256(token);
  const row = await db.prepare(`
    SELECT token_hash FROM admin_sessions
    WHERE token_hash = ? AND expires_at > ?
    LIMIT 1
  `).bind(tokenHash, Date.now()).first();
  return Boolean(row);
}

export function secureCompare(a, b) {
  return constantTimeEqual(String(a || ""), String(b || ""));
}

const BOARD_STYLE_COLOURS = new Set([
  "red", "blue", "green", "purple", "light-blue", "teal", "grey",
  "burgundy", "brown", "orange", "yellow", "lime", "pink", "cream"
]);

function progressBoardStyle(progress) {
  let raw = {};
  try {
    const parsed = JSON.parse(String(progress["boxxy-board-style-v1"] || "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed;
  } catch (_) {}
  let box = BOARD_STYLE_COLOURS.has(String(raw.box || "")) ? String(raw.box) : "yellow";
  let target = BOARD_STYLE_COLOURS.has(String(raw.target || "")) ? String(raw.target) : "red";
  if (box === target) target = box === "red" ? "yellow" : "red";
  return { box, target };
}

export function progressSummary(progressValue) {
  const progress = parseProgress(progressValue);
  const packs = {};
  let dailyCompleted = 0;
  let dailyStreak = 0;

  for (const [key, value] of Object.entries(progress)) {
    let match = /^boxxy-pack-(.+)-completed-v1$/.exec(key);
    if (match) {
      try {
        const parsed = JSON.parse(value);
        if (!packs[match[1]]) packs[match[1]] = {};
        packs[match[1]].completed = Array.isArray(parsed) ? new Set(parsed.map(Number).filter(Number.isInteger)).size : 0;
      } catch (_) {}
      continue;
    }
    match = /^boxxy-pack-(.+)-progress-v1$/.exec(key);
    if (match) {
      if (!packs[match[1]]) packs[match[1]] = {};
      packs[match[1]].progress = Math.max(0, Number(value) || 0);
      continue;
    }
    match = /^boxxy-pack-(.+)-level-v1$/.exec(key);
    if (match) {
      if (!packs[match[1]]) packs[match[1]] = {};
      packs[match[1]].currentLevel = Math.max(0, Number(value) || 0) + 1;
      continue;
    }
    if (key === "boxxy-daily-completions-v1") {
      try {
        const parsed = JSON.parse(value);
        dailyCompleted = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).length : 0;
      } catch (_) {}
      continue;
    }
    if (key === "boxxy-daily-streak-v1") {
      try {
        const parsed = JSON.parse(value);
        dailyStreak = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Math.max(0, Math.trunc(Number(parsed.count) || 0)) : 0;
      } catch (_) {}
    }
  }

  let catalog = {};
  try {
    const parsed = JSON.parse(String(progress["boxxy-pack-catalog-v1"] || "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) catalog = parsed;
  } catch (_) {}

  for (const [packId, catalogEntryValue] of Object.entries(catalog)) {
    if (!packs[packId]) packs[packId] = {};
    const catalogEntry = catalogEntryValue && typeof catalogEntryValue === "object" ? catalogEntryValue : {};
    packs[packId].name = String(catalogEntry.name || packId);
    packs[packId].levelCount = Math.max(0, Number(catalogEntry.levels) || 0);
  }
  for (const [packId, data] of Object.entries(packs)) {
    if (data.name) continue;
    data.name = packId;
    data.levelCount = Math.max(0, Number(data.levelCount) || 0);
  }

  const levelsCompleted = Object.values(packs).reduce((sum, pack) => sum + Math.max(0, Number(pack.completed) || 0), 0) + dailyCompleted;
  const packsCompleted = Object.values(packs).reduce((sum, pack) => {
    const levelCount = Math.max(0, Number(pack.levelCount) || 0);
    return sum + (levelCount > 0 && Math.max(0, Number(pack.completed) || 0) >= levelCount ? 1 : 0);
  }, 0);

  const attemptLevels = [];
  let totalAttempts = 0;
  try {
    const parsed = JSON.parse(String(progress["boxxy-level-attempts-v1"] || "{}"));
    const levels = parsed && typeof parsed === "object" && parsed.levels && typeof parsed.levels === "object" ? parsed.levels : {};
    for (const [key, entry] of Object.entries(levels)) {
      if (!entry || typeof entry !== "object") continue;
      let count = 0;
      let lastAt = 0;
      const devices = entry.devices && typeof entry.devices === "object" ? entry.devices : {};
      for (const deviceEntry of Object.values(devices)) {
        count += Math.max(0, Math.trunc(Number(deviceEntry?.count) || 0));
        lastAt = Math.max(lastAt, Math.max(0, Number(deviceEntry?.lastAt) || 0));
      }
      if (!count) continue;
      totalAttempts += count;
      attemptLevels.push({
        key,
        packId: String(entry.packId || ""),
        packName: String(entry.packName || entry.packId || ""),
        levelToken: String(entry.levelToken || ""),
        levelNumber: Math.max(0, Number(entry.levelNumber) || 0),
        levelName: String(entry.levelName || ""),
        count,
        lastAt
      });
    }
  } catch (_) {}
  attemptLevels.sort((a, b) =>
    String(a.packName).localeCompare(String(b.packName))
    || Number(a.levelNumber || 0) - Number(b.levelNumber || 0)
    || String(a.levelToken).localeCompare(String(b.levelToken))
  );

  let avatar = {};
  try {
    const parsed = JSON.parse(String(progress["push-bauhaus-character-style-v51"] || "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) avatar = parsed;
  } catch (_) {}
  const boardStyle = progressBoardStyle(progress);

  const activityDays = [];
  try {
    const activity = progress["__boxxy-server-activity-v1"];
    const days = activity && typeof activity === "object" && !Array.isArray(activity) && activity.days && typeof activity.days === "object" ? activity.days : {};
    for (const [date, entry] of Object.entries(days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== "object") continue;
      activityDays.push({
        date,
        seconds: Math.max(0, Math.trunc(Number(entry.seconds) || 0)),
        lastSeenAt: Math.max(0, Number(entry.lastSeenAt) || 0)
      });
    }
    activityDays.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  } catch (_) {}

  return {
    activePack: String(progress["boxxy-active-pack-v2"] || ""),
    dailyCompleted,
    dailyStreak,
    levelsCompleted,
    packsCompleted,
    totalSteps: Math.max(0, Math.trunc(Number(progress["boxxy-all-time-steps-v1"]) || 0)),
    totalPushes: Math.max(0, Math.trunc(Number(progress["boxxy-all-time-pushes-v1"]) || 0)),
    totalAttempts,
    attempts: attemptLevels,
    activityDays,
    avatar,
    boardStyle,
    packs
  };
}
