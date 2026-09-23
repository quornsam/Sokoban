const encoder = new TextEncoder();

// Player sessions have no fixed 30-day logout. Each authenticated app launch
// or cloud save renews a persistent 365-day cookie when its previous lifetime
// has aged by a day. A browser may cap cookie lifetime, so we renew on return.
// Unused/lost devices ultimately expire; explicit logout/reset still revokes.
// Pre-upgrade sessions that are still valid are extended on their next request.
const SESSION_IDLE_SECONDS = 365 * 24 * 60 * 60;
const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
const SESSION_SEEN_AFTER_MS = 5 * 60 * 1000;
let sessionHistorySchemaPromise = null;

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

// Session history is separate from live bearer tokens so explicit logout,
// expiry and administrative revocation can be reported without retaining a
// usable session. Creating it lazily also makes the upgrade safe if the owner
// has not run a manual D1 migration before deployment.
export async function ensureSessionHistorySchema(db) {
  if (!sessionHistorySchemaPromise) {
    sessionHistorySchemaPromise = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS session_history (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          last_seen_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          ended_at INTEGER,
          end_reason TEXT,
          ip TEXT NOT NULL DEFAULT '',
          user_agent TEXT NOT NULL DEFAULT '',
          legacy INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS session_history_user_started_idx
        ON session_history(user_id, started_at DESC)`).run();

    })().catch(error => {
      sessionHistorySchemaPromise = null;
      throw error;
    });
  }
  return sessionHistorySchemaPromise;
}

// Legacy backfill is admin-only rather than a full-table write on each new
// Cloudflare isolate's first public account request. Normal account refreshes
// snapshot just that authenticated token instead.
export async function backfillLegacySessions(db) {
  await ensureSessionHistorySchema(db);
  await db.prepare(`
    INSERT OR IGNORE INTO session_history
      (token_hash, user_id, started_at, last_seen_at, expires_at, ip, user_agent, legacy)
    SELECT token_hash, user_id, created_at, created_at, expires_at, ip, user_agent, 1
    FROM sessions
  `).run();
}

// Preserve a pre-upgrade session's original start and device when it is first
// seen after v363. Earlier logouts were deleted and cannot be reconstructed.
function snapshotSession(db, tokenHash, userId = "") {
  return db.prepare(`
    INSERT OR IGNORE INTO session_history
      (token_hash, user_id, started_at, last_seen_at, expires_at, ip, user_agent, legacy)
    SELECT token_hash, user_id, created_at, created_at, expires_at, ip, user_agent, 1
    FROM sessions WHERE token_hash = ? ${userId ? "AND user_id = ?" : ""}
  `).bind(...(userId ? [tokenHash, userId] : [tokenHash]));
}

export async function createSession(env, request, userId) {
  const db = requireDatabase(env);
  await ensureSessionHistorySchema(db);
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + SESSION_IDLE_SECONDS * 1000;
  const ip = clientIp(request);
  const agent = userAgent(request);
  await db.batch([
    db.prepare(`
      INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(tokenHash, userId, now, expiresAt, ip, agent),
    db.prepare(`
      INSERT INTO session_history
        (token_hash, user_id, started_at, last_seen_at, expires_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(tokenHash, userId, now, now, expiresAt, ip, agent)
  ]);
  return { token, header: cookie("boxxy_session", token, SESSION_IDLE_SECONDS) };
}

export async function destroySession(env, request) {
  const db = requireDatabase(env);
  const token = parseCookies(request).boxxy_session || "";
  if (token) {
    await ensureSessionHistorySchema(db);
    const tokenHash = await sha256(token);
    const now = Date.now();
    await db.batch([
      snapshotSession(db, tokenHash),
      db.prepare(`UPDATE session_history
        SET ended_at = ?, end_reason = 'logout', last_seen_at = ?
        WHERE token_hash = ? AND ended_at IS NULL`).bind(now, now, tokenHash),
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash)
    ]);
  }
}

async function activeSession(env, request) {
  const db = requireDatabase(env);
  const token = parseCookies(request).boxxy_session || "";
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const row = await db.prepare(`
    SELECT u.*, s.expires_at AS session_expires_at,
      s.created_at AS session_started_at, s.token_hash AS session_token_hash
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, now).first();
  return row ? { user: row, token, tokenHash, now } : null;
}

export async function authenticatedUser(env, request) {
  const session = await activeSession(env, request);
  return session?.user || null;
}

// Called only by account GET and cloud sync, both of which the PWA already
// makes during normal play. Reissues the same secure cookie; the raw token is
// never exposed to page JS, and the original sign-in time never changes.
export async function refreshAuthenticatedSession(env, request) {
  const session = await activeSession(env, request);
  if (!session) return null;
  const { user, token, tokenHash, now } = session;
  const db = requireDatabase(env);
  await ensureSessionHistorySchema(db);
  const known = await db.prepare(`
    SELECT last_seen_at FROM session_history WHERE token_hash = ?
  `).bind(tokenHash).first();
  const expiresAt = Number(user.session_expires_at);
  const renew = expiresAt < now + SESSION_IDLE_SECONDS * 1000 - SESSION_RENEW_AFTER_MS;
  const recordSeen = !known || now - Number(known.last_seen_at || 0) >= SESSION_SEEN_AFTER_MS;
  if (renew || recordSeen) {
    const nextExpiry = renew ? now + SESSION_IDLE_SECONDS * 1000 : expiresAt;
    const statements = [snapshotSession(db, tokenHash, user.id)];
    if (renew) statements.push(db.prepare(`
      UPDATE sessions SET expires_at = MAX(expires_at, ?) WHERE token_hash = ? AND expires_at > ?
    `).bind(nextExpiry, tokenHash, now));
    statements.push(db.prepare(`
      UPDATE session_history SET
        expires_at = MAX(expires_at, ?), last_seen_at = CASE WHEN last_seen_at < ? THEN ? ELSE last_seen_at END
      WHERE token_hash = ? AND ended_at IS NULL
    `).bind(nextExpiry, now - SESSION_SEEN_AFTER_MS, now, tokenHash));
    await db.batch(statements);
  }
  return {
    user,
    cookieHeader: renew ? cookie("boxxy_session", token, SESSION_IDLE_SECONDS) : ""
  };
}

// Password resets invalidate every existing device while retaining a dated
// audit entry for each session. Unknown pre-v363 session history is snapshotted.
export function sessionRevocationStatements(db, userId, reason = "password_reset") {
  const now = Date.now();
  return [
    db.prepare(`
      INSERT OR IGNORE INTO session_history
        (token_hash, user_id, started_at, last_seen_at, expires_at, ip, user_agent, legacy)
      SELECT token_hash, user_id, created_at, created_at, expires_at, ip, user_agent, 1
      FROM sessions WHERE user_id = ?
    `).bind(userId),
    db.prepare(`
      UPDATE session_history SET ended_at = ?, end_reason = ?
      WHERE user_id = ? AND ended_at IS NULL
        AND token_hash IN (SELECT token_hash FROM sessions WHERE user_id = ?)
    `).bind(now, reason, userId, userId),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId)
  ];
}

export async function revokeUserSessions(db, userId, reason = "password_reset") {
  await ensureSessionHistorySchema(db);
  await db.batch(sessionRevocationStatements(db, userId, reason));
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
const CLICK_PUSH_ACCESS_CODES = new Set(["RABBIT", "JIGSAW25", "TAPTAPTAP", "GRANDMASTER", "HARDCORE"]);

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

// A saved Daily fastest-run record can establish that somebody played on a
// missing day even if an expired login prevented live server activity uploads.
// This does not prove network connectivity or reconstruct time spent on site.
// Require actual start/finish timestamps, a matching elapsed time and the
// Daily date in the timestamp's recorded local timezone (UTC for legacy runs
// without timezone data). This function is shared by account sync and Basement.
const SERVER_ACTIVITY_KEY = "__boxxy-server-activity-v1";
const DAILY_COMPLETIONS_KEY = "boxxy-daily-completions-v1";
const ACTIVITY_RETENTION_DAYS = 14;

function parsedDailyResults(value) {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (_) { return {}; }
}

function calendarDayAtOffset(timestamp, offsetMinutes) {
  // Date.getTimezoneOffset(): minutes to add to local time to obtain UTC.
  return new Date(timestamp - offsetMinutes * 60000).toISOString().slice(0, 10);
}

export function verifiedDailyActivity(progressValue, now = Date.now(), previousActivity = null) {
  const progress = parseProgress(progressValue);
  const previous = previousActivity ?? progress[SERVER_ACTIVITY_KEY];
  const originalDays = previous && typeof previous === "object" && !Array.isArray(previous)
    && previous.days && typeof previous.days === "object" && !Array.isArray(previous.days)
    ? previous.days : {};
  const days = {};
  const cutoff = now - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const [date, entry] of Object.entries(originalDays)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== "object") continue;
    const dayStart = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(dayStart) || dayStart < cutoff) continue;
    const seconds = Math.max(0, Math.trunc(Number(entry.seconds) || 0));
    days[date] = {
      seconds,
      lastSeenAt: Math.max(0, Number(entry.lastSeenAt) || 0)
    };
    const recoveredAt = Number(entry.verifiedDailyCompletionAt);
    if (Number.isSafeInteger(recoveredAt) && recoveredAt > 0) days[date].verifiedDailyCompletionAt = recoveredAt;
  }

  for (const [dailyDate, result] of Object.entries(parsedDailyResults(progress[DAILY_COMPLETIONS_KEY]))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyDate) || !result || typeof result !== "object") continue;
    // A personal best can combine separate attempts. Only a single qualifying
    // leaderboard run retains a start and finish from the same playthrough.
    if (result.leaderboardTracked !== true) continue;
    const startedAt = Number(result.leaderboardStartedAt);
    const completedAt = Number(result.leaderboardCompletedAt);
    const seconds = Number(result.leaderboardSeconds);
    if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(completedAt)
        || !Number.isFinite(seconds) || seconds <= 0 || startedAt < Date.UTC(2026, 0, 1)
        || completedAt <= startedAt || completedAt > now + 5 * 60 * 1000
        || completedAt - startedAt > 24 * 60 * 60 * 1000
        || Math.abs((completedAt - startedAt) / 1000 - seconds) > 0.06) continue;
    const rawOffset = result.leaderboardTimezoneOffsetMinutes;
    const offset = rawOffset !== null && rawOffset !== undefined && rawOffset !== ""
      && Number.isInteger(Number(rawOffset)) && Math.abs(Number(rawOffset)) <= 840
      ? Number(rawOffset) : 0;
    if (calendarDayAtOffset(startedAt, offset) !== dailyDate
        || calendarDayAtOffset(completedAt, offset) !== dailyDate) continue;
    const dayStart = Date.parse(`${dailyDate}T00:00:00Z`);
    if (!Number.isFinite(dayStart) || dayStart < cutoff) continue;
    const previousDay = days[dailyDate] || { seconds: 0, lastSeenAt: 0 };
    previousDay.verifiedDailyCompletionAt = Math.max(
      Number(previousDay.verifiedDailyCompletionAt) || 0, completedAt
    );
    days[dailyDate] = previousDay;
  }
  return { version: 1, days };
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
  const rawClickPushCode = String(progress["boxxy-touch-click-push-access-v1"] || "").trim().toUpperCase();
  const accountClickPushCode = CLICK_PUSH_ACCESS_CODES.has(rawClickPushCode) ? rawClickPushCode : "";
  let clickPushDevices = [];
  try {
    const parsed = JSON.parse(String(progress["boxxy-touch-click-push-devices-v1"] || "null"));
    const devices = parsed && parsed.version === 1 && parsed.devices && typeof parsed.devices === "object" && !Array.isArray(parsed.devices)
      ? parsed.devices
      : {};
    clickPushDevices = Object.entries(devices).map(([deviceId, entry]) => {
      const code = String(entry?.code || "").trim().toUpperCase();
      return {
        deviceId: String(deviceId),
        enabled: Boolean(entry?.enabled),
        code: CLICK_PUSH_ACCESS_CODES.has(code) ? code : "",
        updatedAt: Math.max(0, Number(entry?.updatedAt) || 0)
      };
    }).filter(entry => entry.updatedAt > 0);
  } catch (_) {}
  clickPushDevices.sort((a, b) => b.updatedAt - a.updatedAt);
  const activeClickPushDevices = clickPushDevices.filter(entry => entry.enabled);
  const clickPushEnabled = clickPushDevices.length
    ? activeClickPushDevices.length > 0
    : Boolean(accountClickPushCode && progress["boxxy-touch-click-push-v1"] === "on");
  const clickPushCodes = [...new Set([
    ...activeClickPushDevices.map(entry => entry.code),
    ...clickPushDevices.map(entry => entry.code),
    accountClickPushCode
  ].filter(Boolean))];
  const clickPushCode = clickPushCodes[0] || "";

  const activityDays = Object.entries(verifiedDailyActivity(progress).days).map(([date, entry]) => ({
    date,
    seconds: Math.max(0, Math.trunc(Number(entry.seconds) || 0)),
    lastSeenAt: Math.max(0, Number(entry.lastSeenAt) || 0),
    verifiedDailyCompletionAt: Math.max(0, Number(entry.verifiedDailyCompletionAt) || 0)
  })).sort((a, b) => String(a.date).localeCompare(String(b.date)));

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
    clickPushEnabled,
    clickPushUnlocked: Boolean(accountClickPushCode || clickPushCodes.length),
    clickPushCode,
    clickPushCodes,
    clickPushDeviceCount: activeClickPushDevices.length,
    clickPushKnownDeviceCount: clickPushDevices.length,
    clickPushLastChangedAt: clickPushDevices[0]?.updatedAt || 0,
    packs
  };
}
