/* BOXXY v468: private poster-shipping status and public linked-player avatars. */
import { cleanPublicAvatarStyle } from "./public-profile.js";
/* BOXXY v445: persistent BOXXY Originals Hall of Fame schema and administration helpers. */
const HALL_SIZE = 50;
const SEED_VERSION = "v1";

const ORIGINAL_ENTRIES = Object.freeze([
  [1, "Anian Wu", "USA"],
  [2, "Logan Stipe", "USA"],
  [3, "Stephen Wilbourne", "Australia"],
  [4, "Matthias Meger", "Germany"],
  [5, "Stu Weston", "UK"],
  [6, "Carlos Montiers", "Chile"],
  [7, "Sean Heapy", "US"],
  [8, "Beverley C", "Scotland"],
  [9, "Lance Wolters", "New Zealand"],
  [10, "Yaron Shoham", "Israel"]
]);

function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanHallPlace(value) {
  const place = Math.trunc(Number(value));
  return Number.isInteger(place) && place >= 1 && place <= HALL_SIZE ? place : 0;
}

export function cleanHallDate(value) {
  const date = String(value || "").trim();
  if (!date) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "";
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
}

export function cleanHallName(value) { return cleanText(value, 60); }
export function cleanHallLocation(value) { return cleanText(value, 60); }

export async function ensureOriginalsHallOfFameSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS originals_hall_of_fame (
        place INTEGER PRIMARY KEY CHECK(place >= 1 AND place <= 50),
        display_name TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        completed_date TEXT NOT NULL DEFAULT '',
        user_id TEXT DEFAULT NULL,
        poster_shipped INTEGER NOT NULL DEFAULT 0 CHECK(poster_shipped IN (0,1)),
        updated_at INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS originals_hall_of_fame_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_originals_hall_of_fame_user
      ON originals_hall_of_fame(user_id)
      WHERE user_id IS NOT NULL AND user_id <> ''
    `)
  ]);

  const columns = await db.prepare("PRAGMA table_info(originals_hall_of_fame)").all();
  if (!(columns.results || []).some(column => column.name === "poster_shipped")) {
    try {
      await db.prepare("ALTER TABLE originals_hall_of_fame ADD COLUMN poster_shipped INTEGER NOT NULL DEFAULT 0 CHECK(poster_shipped IN (0,1))").run();
    } catch (error) {
      if (!/duplicate column name/i.test(String(error?.message || error))) throw error;
    }
  }

  const seeded = await db.prepare("SELECT value FROM originals_hall_of_fame_meta WHERE key = 'seed_version' LIMIT 1").first();
  if (!seeded) {
    const now = Date.now();
    const statements = ORIGINAL_ENTRIES.map(([place, name, location]) => db.prepare(`
      INSERT OR IGNORE INTO originals_hall_of_fame
        (place, display_name, location, completed_date, user_id, updated_at)
      VALUES (?, ?, ?, '', NULL, ?)
    `).bind(place, name, location, now));
    statements.push(db.prepare(`
      INSERT OR REPLACE INTO originals_hall_of_fame_meta (key, value)
      VALUES ('seed_version', ?)
    `).bind(SEED_VERSION));
    await db.batch(statements);
  }
}

function mappedEntry(row, includeUserId = false) {
  const entry = {
    place: cleanHallPlace(row?.place),
    name: cleanHallName(row?.display_name),
    location: cleanHallLocation(row?.location),
    completedDate: cleanHallDate(row?.completed_date),
    linkedUsername: cleanText(row?.linked_username, 20),
    avatar: row?.linked_username ? cleanPublicAvatarStyle(row?.linked_avatar_json) : null
  };
  if (includeUserId) {
    entry.userId = cleanText(row?.user_id, 128);
    entry.posterShipped = Number(row?.poster_shipped) === 1;
  }
  return entry;
}

export async function readOriginalsHallOfFame(db, { includeUserId = false } = {}) {
  await ensureOriginalsHallOfFameSchema(db);
  const result = await db.prepare(`
    SELECT h.place, h.display_name, h.location, h.completed_date, h.user_id, h.poster_shipped,
           u.username AS linked_username,
           CASE WHEN json_valid(u.progress_json)
             THEN json_extract(u.progress_json, '$."push-bauhaus-character-style-v51"')
             ELSE NULL END AS linked_avatar_json
    FROM originals_hall_of_fame h
    LEFT JOIN users u ON u.id = h.user_id
    ORDER BY h.place ASC
  `).all();
  return (result.results || []).map(row => mappedEntry(row, includeUserId)).filter(entry => entry.place);
}

export async function saveOriginalsHallOfFameEntry(db, value) {
  await ensureOriginalsHallOfFameSchema(db);
  const place = cleanHallPlace(value?.place);
  const originalPlace = cleanHallPlace(value?.originalPlace) || place;
  const name = cleanHallName(value?.name);
  const location = cleanHallLocation(value?.location);
  const rawDate = String(value?.completedDate || "").trim();
  const completedDate = cleanHallDate(rawDate);
  const userId = cleanText(value?.userId, 128);
  const posterShipped = value?.posterShipped === true ? 1 : 0;

  if (!place) throw new Error("Hall of Fame number must be between 1 and 50.");
  if (!name) throw new Error("Hall of Fame name is required.");
  if (!location) throw new Error("Hall of Fame location is required.");
  if (rawDate && !completedDate) throw new Error("Choose a valid completion date.");

  if (place !== originalPlace) {
    const occupied = await db.prepare("SELECT place FROM originals_hall_of_fame WHERE place = ? LIMIT 1").bind(place).first();
    if (occupied) throw new Error(`Hall of Fame number ${place} is already in use.`);
  }

  let linkedUsername = "";
  if (userId) {
    const user = await db.prepare("SELECT id, username FROM users WHERE id = ? LIMIT 1").bind(userId).first();
    if (!user) throw new Error("The selected BOXXY user no longer exists.");
    linkedUsername = cleanText(user.username, 20);
    const duplicate = await db.prepare(`
      SELECT place FROM originals_hall_of_fame
      WHERE user_id = ? AND place <> ?
      LIMIT 1
    `).bind(userId, originalPlace).first();
    if (duplicate) throw new Error(`${linkedUsername} is already attached to Hall of Fame number ${duplicate.place}.`);
  }

  const now = Date.now();
  const statements = [];
  if (originalPlace && originalPlace !== place) {
    statements.push(db.prepare("DELETE FROM originals_hall_of_fame WHERE place = ?").bind(originalPlace));
  }
  statements.push(db.prepare(`
    INSERT INTO originals_hall_of_fame
      (place, display_name, location, completed_date, user_id, poster_shipped, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(place) DO UPDATE SET
      display_name = excluded.display_name,
      location = excluded.location,
      completed_date = excluded.completed_date,
      user_id = excluded.user_id,
      poster_shipped = excluded.poster_shipped,
      updated_at = excluded.updated_at
  `).bind(place, name, location, completedDate, userId || null, posterShipped, now));
  await db.batch(statements);

  return { place, name, location, completedDate, userId, linkedUsername, posterShipped:Boolean(posterShipped) };
}

export async function deleteOriginalsHallOfFameEntry(db, placeValue) {
  await ensureOriginalsHallOfFameSchema(db);
  const place = cleanHallPlace(placeValue);
  if (!place) throw new Error("Choose a valid Hall of Fame number.");
  await db.prepare("DELETE FROM originals_hall_of_fame WHERE place = ?").bind(place).run();
  return place;
}

export async function setOriginalsHallOfFamePosterShipped(db, placeValue, shipped) {
  await ensureOriginalsHallOfFameSchema(db);
  const place = cleanHallPlace(placeValue);
  if (!place) throw new Error("Choose a valid Hall of Fame number.");
  if (typeof shipped !== "boolean") throw new Error("Poster shipped must be checked or unchecked.");
  const existing = await db.prepare("SELECT place FROM originals_hall_of_fame WHERE place = ? LIMIT 1").bind(place).first();
  if (!existing) throw new Error("Hall of Fame entry not found.");
  await db.prepare("UPDATE originals_hall_of_fame SET poster_shipped = ?, updated_at = ? WHERE place = ?")
    .bind(shipped ? 1 : 0, Date.now(), place).run();
  return { place, posterShipped:shipped };
}
