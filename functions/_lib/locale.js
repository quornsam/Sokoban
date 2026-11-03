/* BOXXY v526: isolated language preference and first-visit country storage. */
const SUPPORTED_LANGUAGES = new Set(["en", "fr", "es", "de", "zh", "ja", "ru", "hi", "alpha"]);
const FIRST_COUNTRY_COOKIE = "boxxy_first_country";
const FIRST_COUNTRY_MAX_AGE = 2 * 365 * 24 * 60 * 60;
let localeSchemaPromise = null;

const COUNTRY_LANGUAGE = Object.freeze({
  FR: "fr",
  ES: "es", MX: "es", AR: "es", BO: "es", CL: "es", CO: "es", CR: "es", CU: "es", DO: "es",
  EC: "es", SV: "es", GT: "es", HN: "es", NI: "es", PA: "es", PY: "es", PE: "es", PR: "es", UY: "es", VE: "es",
  DE: "de", AT: "de", LI: "de",
  CN: "zh", TW: "zh", HK: "zh", MO: "zh",
  JP: "ja",
  RU: "ru",
  IN: "hi"
});

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

export function normaliseLanguage(value) {
  const language = String(value || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(language) ? language : "";
}

export function normaliseCountry(value) {
  const country = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : "";
}

export function countryLanguage(country) {
  return COUNTRY_LANGUAGE[normaliseCountry(country)] || "en";
}

export function requestCountry(request) {
  return normaliseCountry(request?.cf?.country || request?.headers?.get?.("CF-IPCountry") || "");
}

export function firstVisitCountry(request) {
  const cookieCountry = normaliseCountry(parseCookies(request)[FIRST_COUNTRY_COOKIE]);
  return cookieCountry || requestCountry(request);
}

export function firstVisitCountryCookie(country) {
  const value = normaliseCountry(country);
  if (!value) return "";
  return `${FIRST_COUNTRY_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${FIRST_COUNTRY_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export async function ensureUserLocaleSchema(db) {
  if (!localeSchemaPromise) {
    localeSchemaPromise = db.prepare(`
      CREATE TABLE IF NOT EXISTS user_locale_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT NOT NULL DEFAULT 'en',
        first_country TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run().catch(error => {
      localeSchemaPromise = null;
      throw error;
    });
  }
  await localeSchemaPromise;
}

export async function readUserLocale(db, userId) {
  await ensureUserLocaleSchema(db);
  const row = await db.prepare(`
    SELECT language, first_country, updated_at
    FROM user_locale_preferences
    WHERE user_id = ?
    LIMIT 1
  `).bind(userId).first();
  if (!row) return null;
  return {
    language: normaliseLanguage(row.language) || "en",
    firstCountry: normaliseCountry(row.first_country),
    updatedAt: Math.max(0, Number(row.updated_at) || 0)
  };
}

export async function ensureUserLocale(db, userId, candidateLanguage, country) {
  await ensureUserLocaleSchema(db);
  const existing = await readUserLocale(db, userId);
  const firstCountry = existing?.firstCountry || normaliseCountry(country);
  if (existing) {
    if (!existing.firstCountry && firstCountry) {
      await db.prepare(`
        UPDATE user_locale_preferences
        SET first_country = ?
        WHERE user_id = ? AND first_country = ''
      `).bind(firstCountry, userId).run();
      return { ...existing, firstCountry };
    }
    return existing;
  }
  const language = normaliseLanguage(candidateLanguage) || countryLanguage(firstCountry);
  const now = Date.now();
  await db.prepare(`
    INSERT INTO user_locale_preferences (user_id, language, first_country, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO NOTHING
  `).bind(userId, language, firstCountry, now).run();
  return await readUserLocale(db, userId) || { language, firstCountry, updatedAt: now };
}

export async function saveUserLanguage(db, userId, language, country) {
  await ensureUserLocaleSchema(db);
  const cleanLanguage = normaliseLanguage(language);
  if (!cleanLanguage) return null;
  const existing = await readUserLocale(db, userId);
  const firstCountry = existing?.firstCountry || normaliseCountry(country);
  const now = Date.now();
  await db.prepare(`
    INSERT INTO user_locale_preferences (user_id, language, first_country, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      language = excluded.language,
      first_country = CASE
        WHEN user_locale_preferences.first_country = '' THEN excluded.first_country
        ELSE user_locale_preferences.first_country
      END,
      updated_at = excluded.updated_at
  `).bind(userId, cleanLanguage, firstCountry, now).run();
  return { language: cleanLanguage, firstCountry, updatedAt: now };
}
