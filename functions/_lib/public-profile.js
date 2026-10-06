/* BOXXY v447: public avatar validation includes KangaRuby and WhoopsaDaisy. */
/* BOXXY v446: public avatar validation includes FLUFFBALLS and exports the shared server-side body-type registry. */
import { parseProgress, progressSummary } from "./auth.js";
import { PROFILE_COUNTRY_CODES, PROFILE_REGION_CODES } from "./profile-location-codes.js";

export const PUBLIC_AVATAR_BODY_TYPES = new Set([
  "boy", "girl",
  "lincoln", "beverley", "harry", "stuart", "davido", "samantha",
  "optimus", "pixella", "bolderdash", "sputnik", "vasquez",
  "bacterium", "clara", "jamil", "clickers", "bertrand", "angie", "the-haining",
  "eric", "marshall", "catherine", "mr-pjkuylasg", "slippy", "gobble",
  "sandra", "blaze", "frederick", "charlize", "amy-annie", "bobbyburp",
  "mr-whack", "elrick", "ms-thompson", "sid-the-big", "quock", "bernard",
  "binky", "hermit", "gusto", "polly", "trisha", "wendy",
  "kangaruby", "whoopsadaisy",
  "roger", "bobby", "carmen", "titchmarsh", "bubbs", "porridge"
]);
const AVATAR_DEFAULT = Object.freeze({
  bodyType: "boy", tshirt: "#df3526", trousers: "#292829", hair: "#292727", skin: "#ee9a60", shoes: "#292829"
});
const AVATAR_COLOUR_KEYS = Object.freeze(["tshirt", "trousers", "hair", "skin", "shoes"]);
const RANDOM_COLOURS = Object.freeze({
  tshirt: ["#df3526","#ef6a55","#b9562d","#f28b35","#e5b32a","#f3d85a","#b88b25","#285aa5","#5b91c9","#36a7a2","#397457","#65a887","#eee5d7","#b7aa95","#242326","#704f86","#a38bc2","#c65f83"],
  trousers: ["#161619","#292829","#22345f","#4b6684","#20539a","#2478d4","#55b9ee","#18b8b2","#21a366","#4fbd4a","#9dcc33","#f0c928","#f28b35","#db3b27","#ef6a55","#ef4f9a","#ca3eb6","#7a4fc6","#9a5de8","#68383b","#624431","#e7d8b8","#c8c5c0","#ece5da"],
  hair: ["#292727","#293d54","#543627","#7b472d","#8b4330","#ad6036","#c87439","#a47d45","#c99d4b","#d4b56d","#ddd0ac","#aaa7a2","#e8e2d8","#315785","#44745b","#664d75","#b75b7c","#9f3b32"],
  skin: ["#f3cfb2","#f0b88f","#ee9a60","#d89b69","#cf7d45","#bb7045","#a65f37","#8e5033","#76422b","#633827","#4c2e24","#39231f","#e1b735","#e9d45a","#4277ad","#6ca5cb","#4c8a61","#79ad83"],
  shoes: ["#292829","#444246","#eee8df","#aaa08f","#c8382d","#d96855","#c86a2d","#d6a126","#304f81","#668fb7","#3f6a50","#78a98e","#684737","#9b7656","#65353b","#685177","#ba657f","#d9ccb5"]
});
const AVATAR_BODY_TYPE_LIST = Object.freeze(["boy", "girl"]);
const PROFILE_BIO_MAX_GRAPHEMES = 50;
const PROFILE_LOCATION_CODE_MAX = 8;

function randomItem(values) {
  return values[Math.floor(Math.random() * values.length)] || values[0];
}

export function cleanPublicAvatarStyle(value, { allowEmpty = false } = {}) {
  let raw = {};
  let supplied = false;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      raw = parsed;
      supplied = Object.keys(parsed).length > 0;
    }
  } catch (_) {}
  if (allowEmpty && !supplied) return null;
  const avatar = { ...AVATAR_DEFAULT };
  const bodyType = String(raw.bodyType || "").trim().toLowerCase();
  if (PUBLIC_AVATAR_BODY_TYPES.has(bodyType)) avatar.bodyType = bodyType;
  for (const key of AVATAR_COLOUR_KEYS) {
    const colour = String(raw[key] || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(colour)) avatar[key] = colour;
  }
  return avatar;
}

export function randomPublicAvatarStyle() {
  const bodyType = randomItem(AVATAR_BODY_TYPE_LIST);
  const avatar = { ...AVATAR_DEFAULT, bodyType };
  if (bodyType === "boy" || bodyType === "girl") {
    for (const key of AVATAR_COLOUR_KEYS) avatar[key] = randomItem(RANDOM_COLOURS[key]);
  }
  return avatar;
}

export function avatarFromProgress(progressValue) {
  const progress = parseProgress(progressValue);
  return cleanPublicAvatarStyle(progress["push-bauhaus-character-style-v51"]);
}

const PUBLIC_PACK_LEVEL_COUNTS = Object.freeze({
  "boxxy-original-puzzle-pack-of-50-levels": 50,
  microban: 50,
  jigsaw: 25,
  exponentially: 11,
  "alphabet-soup": 27,
  "starry-night": 25
});

function parsedProgressValue(value, fallback) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function completedPublicPackIds(progress) {
  const catalog = parsedProgressValue(progress["boxxy-pack-catalog-v1"], {});
  const completed = [];
  for (const [packId, fallbackLevelCount] of Object.entries(PUBLIC_PACK_LEVEL_COUNTS)) {
    const catalogLevelCount = Math.max(0, Math.trunc(Number(catalog?.[packId]?.levels) || 0));
    const levelCount = catalogLevelCount || fallbackLevelCount;
    let indexes = parsedProgressValue(progress[`boxxy-pack-${packId}-completed-v1`], []);
    if ((!Array.isArray(indexes) || !indexes.length) && packId === "microban") {
      indexes = parsedProgressValue(progress["boxxy-completed-levels-v1"], []);
    }
    const completedIndexes = Array.isArray(indexes)
      ? new Set(indexes.map(Number).filter(Number.isInteger))
      : new Set();
    const firstCompletion = parsedProgressValue(progress[`boxxy-pack-${packId}-first-completion-v1`], null);
    const hasCompletionMarker = Boolean(firstCompletion && typeof firstCompletion === "object" && Number(firstCompletion.completedAt) > 0);
    const finalLevelCompleted = levelCount > 0 && completedIndexes.has(levelCount - 1);
    if (hasCompletionMarker || finalLevelCompleted) completed.push(packId);
  }
  return completed;
}

export function publicStatsFromProgress(progressValue) {
  const progress = parseProgress(progressValue);
  const summary = progressSummary(progress);
  const completedPackIds = completedPublicPackIds(progress);
  return {
    levelsCompleted: Math.max(0, Math.trunc(Number(summary.levelsCompleted) || 0) - Math.max(0, Math.trunc(Number(summary.dailyCompleted) || 0))),
    dailyCompleted: Math.max(0, Math.trunc(Number(summary.dailyCompleted) || 0)),
    trophies: completedPackIds.length,
    completedPackIds,
    totalMoves: Math.max(0, Math.trunc(Number(summary.totalSteps) || 0)),
    totalPushes: Math.max(0, Math.trunc(Number(summary.totalPushes) || 0)),
    dailyStreak: Math.max(0, Math.trunc(Number(summary.dailyStreak) || 0))
  };
}

function graphemeCount(text) {
  try {
    if (typeof Intl?.Segmenter === "function") {
      return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
    }
  } catch (_) {}
  return Array.from(text).length;
}

function normaliseBioText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsLink(text) {
  return /(?:\bhttps?:\/\/|\bwww\.|\bmailto:|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z](?:[a-z0-9-]{1,62})(?:\/\S*)?)/iu.test(text);
}

export function validatePublicBio(value) {
  const bio = normaliseBioText(value);
  const length = graphemeCount(bio);
  if (length > PROFILE_BIO_MAX_GRAPHEMES) {
    return { ok: false, error: `Public message must be ${PROFILE_BIO_MAX_GRAPHEMES} characters or fewer.`, bio, length };
  }
  if (containsLink(bio)) return { ok: false, error: "Links are not allowed in the public message.", bio, length };
  return { ok: true, bio, length };
}

export function validatePublicLocation(countryValue, regionValue) {
  const countryCode = String(countryValue || "").trim().toUpperCase().slice(0, 2);
  const regionCode = String(regionValue || "").trim().toUpperCase().slice(0, PROFILE_LOCATION_CODE_MAX);
  if (!countryCode && !regionCode) return { ok:true, countryCode:"", regionCode:"" };
  if (!PROFILE_COUNTRY_CODES.has(countryCode)) return { ok:false, error:"Choose a valid country." };
  if (!regionCode) return { ok:true, countryCode, regionCode:"" };
  if (!PROFILE_REGION_CODES.has(regionCode) || !regionCode.startsWith(`${countryCode}-`)) {
    return { ok:false, error:"Choose a valid region, state or province." };
  }
  return { ok:true, countryCode, regionCode };
}

async function addPublicProfileColumn(db, name, definition) {
  try {
    await db.prepare(`ALTER TABLE user_public_profiles ADD COLUMN ${name} ${definition}`).run();
  } catch (error) {
    if (!/duplicate column name/i.test(String(error?.message || error))) throw error;
  }
}

export async function ensurePublicProfileSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_public_profiles (
      user_id TEXT PRIMARY KEY,
      bio TEXT NOT NULL DEFAULT '',
      country_code TEXT NOT NULL DEFAULT '',
      region_code TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
  const columns = await db.prepare("PRAGMA table_info(user_public_profiles)").all();
  const names = new Set((columns.results || []).map(column => String(column.name || "")));
  if (!names.has("country_code")) await addPublicProfileColumn(db, "country_code", "TEXT NOT NULL DEFAULT ''");
  if (!names.has("region_code")) await addPublicProfileColumn(db, "region_code", "TEXT NOT NULL DEFAULT ''");
}

export async function readPublicBio(db, userId) {
  await ensurePublicProfileSchema(db);
  const row = await db.prepare("SELECT bio FROM user_public_profiles WHERE user_id = ? LIMIT 1").bind(userId).first();
  return normaliseBioText(row?.bio || "");
}

export async function readPublicLocation(db, userId) {
  await ensurePublicProfileSchema(db);
  const row = await db.prepare("SELECT country_code, region_code FROM user_public_profiles WHERE user_id = ? LIMIT 1").bind(userId).first();
  const checked = validatePublicLocation(row?.country_code || "", row?.region_code || "");
  return checked.ok ? { countryCode:checked.countryCode, regionCode:checked.regionCode } : { countryCode:"", regionCode:"" };
}

export async function ensureSyntheticAvatarColumn(db) {
  const columns = await db.prepare("PRAGMA table_info(synthetic_users)").all();
  if (!(columns.results || []).length) return false;
  if ((columns.results || []).some(column => String(column.name) === "avatar_json")) return true;
  try {
    await db.prepare("ALTER TABLE synthetic_users ADD COLUMN avatar_json TEXT NOT NULL DEFAULT ''").run();
  } catch (error) {
    if (!/duplicate column name/i.test(String(error?.message || error))) throw error;
  }
  return true;
}
