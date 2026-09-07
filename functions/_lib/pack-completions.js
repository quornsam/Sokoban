/* BOXXY v334 — additive first-completion ledger, separate from mutable scores. */
import { parseProgress } from "./auth.js";

export const PACK_COMPLETION_DEFS = Object.freeze([
  { id: "boxxy-original-puzzle-pack-of-50-levels", name: "BOXXY Originals", levels: 50 },
  { id: "microban", name: "Microban", levels: 50 },
  { id: "jigsaw", name: "The Jigsaw", levels: 25 },
  { id: "exponentially", name: "Exponentially", levels: 11 },
  { id: "alphabet-soup", name: "Alphabet Soup", levels: 27 },
  { id: "starry-night", name: "Starry Night", levels: 25 }
]);
const KNOWN_PACKS = new Map(PACK_COMPLETION_DEFS.map(definition => [definition.id, definition]));
const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,159}$/i;
export const firstCompletionKey = id => `boxxy-pack-${id}-first-completion-v1`;

export function validFirstCompletionTime(value, now = Date.now()) {
  const stamp = Number(value);
  return Number.isSafeInteger(stamp) && stamp >= Date.UTC(2026, 0, 1) && stamp <= now + 5 * 60 * 1000 ? stamp : 0;
}

export function parseFirstCompletionMarker(value, userId = "", now = Date.now()) {
  let marker = value;
  if (typeof marker === "string") {
    try { marker = JSON.parse(marker); } catch (_) { return null; }
  }
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) return null;
  const owner = String(marker.userId || "");
  if (userId && owner !== String(userId)) return null;
  const completedAt = validFirstCompletionTime(marker.completedAt, now);
  return completedAt ? { completedAt, userId: owner } : null;
}

function packDefinitions(progress) {
  const definitions = new Map(KNOWN_PACKS);
  let catalog = {};
  try { catalog = parseProgress(JSON.parse(String(progress["boxxy-pack-catalog-v1"] || "{}"))); }
  catch (_) { catalog = parseProgress(progress["boxxy-pack-catalog-v1"]); }
  for (const [id, entry] of Object.entries(catalog).slice(0, 1000)) {
    if (definitions.has(id) || !PACK_ID_PATTERN.test(id)) continue;
    const levels = Number(entry?.levels);
    if (!Number.isInteger(levels) || levels < 1 || levels > 10000) continue;
    definitions.set(id, { id, name: String(entry?.name || id).slice(0, 120), levels });
  }
  return definitions;
}

/* Retain the earliest marker for the SAME BOXXY user. A copied browser save
   must never give another account an earlier completion date. Unknown fields
   and all ordinary progress keys are left to the existing save architecture. */
export function mergeFirstCompletionMarkers(existingValue, incomingValue, userId = "") {
  const existing = parseProgress(existingValue);
  const incoming = parseProgress(incomingValue);
  const merged = { ...incoming };
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)]
    .filter(key => /^boxxy-pack-(.+)-first-completion-v1$/.test(key)));
  for (const key of keys) {
    const markers = [existing[key], incoming[key]]
      .map(value => parseFirstCompletionMarker(value, userId))
      .filter(marker => marker && (!userId || marker.userId === userId));
    if (markers.length) {
      const first = markers.reduce((a,b) => a.completedAt <= b.completedAt ? a : b);
      merged[key] = JSON.stringify(first);
    } else if (userId) delete merged[key];
  }
  return merged;
}

function fullCompletion(progress, definition) {
  try {
    const raw = progress[`boxxy-pack-${definition.id}-completed-v1`];
    const values = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(values)) return false;
    const completed = new Set(values.map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < definition.levels));
    return completed.size === definition.levels;
  } catch (_) { return false; }
}

const schemaPromises = new WeakMap();
export async function ensurePackCompletionSchema(db) {
  let schemaPromise = schemaPromises.get(db);
  if (!schemaPromise) {
    schemaPromise = db.prepare(`
      CREATE TABLE IF NOT EXISTS pack_completions (
        user_id TEXT NOT NULL,
        pack_id TEXT NOT NULL,
        pack_name TEXT NOT NULL,
        level_count INTEGER NOT NULL,
        completed_at INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, pack_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run().then(async () => {
      await db.prepare("CREATE INDEX IF NOT EXISTS pack_completions_order_idx ON pack_completions(pack_id, completed_at, recorded_at)").run();
    }).catch(error => { schemaPromises.delete(db); throw error; });
    schemaPromises.set(db, schemaPromise);
  }
  return schemaPromise;
}

/* An explicit, account-owned first-completion marker and a complete level set
   are both required. Existing best-score timestamps are never used to invent
   historical dates. Duplicates cannot replace the first result; a valid
   earlier offline timestamp may correct the same account's existing result. */
export async function recordPackCompletions(db, userId, progressValue) {
  const progress = parseProgress(progressValue);
  const now = Date.now();
  const records = [...packDefinitions(progress).values()].map(definition => ({
    definition,
    completedAt: parseFirstCompletionMarker(progress[firstCompletionKey(definition.id)], userId, now)?.completedAt || 0
  })).filter(item => item.completedAt && fullCompletion(progress, item.definition));
  if (!records.length) return;
  await ensurePackCompletionSchema(db);
  for (const { definition, completedAt } of records) {
    await db.prepare(`
      INSERT INTO pack_completions (user_id, pack_id, pack_name, level_count, completed_at, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, pack_id) DO UPDATE SET
        completed_at = MIN(pack_completions.completed_at, excluded.completed_at)
    `).bind(userId, definition.id, definition.name, definition.levels, completedAt, now).run();
  }
}

export async function readPackCompletions(db, userId = "") {
  await ensurePackCompletionSchema(db);
  const statement = userId
    ? db.prepare("SELECT * FROM pack_completions WHERE user_id = ?").bind(userId)
    : db.prepare("SELECT * FROM pack_completions");
  const result = await statement.all();
  return result.results || [];
}

export function completionRecordsForUsers(users, rows) {
  const known = new Map(rows.map(row => [`${row.user_id}\u0000${row.pack_id}`, row]));
  const records = [];
  for (const user of users) {
    const packs = user.summary?.packs || {};
    const definitions = new Map(KNOWN_PACKS);
    for (const [id, pack] of Object.entries(packs)) {
      if (definitions.has(id) || !PACK_ID_PATTERN.test(id)) continue;
      const levels = Number(pack.levelCount);
      if (Number.isInteger(levels) && levels > 0 && levels <= 10000) {
        definitions.set(id, { id, name:String(pack.name || id).slice(0,120), levels });
      }
    }
    // Retain a historical ledger row even if a pack is later removed from the
    // current catalog or the player's ordinary progress is reset.
    for (const row of rows) {
      if (row.user_id !== user.id || definitions.has(row.pack_id)) continue;
      definitions.set(row.pack_id, { id:row.pack_id, name:row.pack_name, levels:Number(row.level_count) });
    }
    for (const definition of definitions.values()) {
      const pack = packs[definition.id];
      const row = known.get(`${user.id}\u0000${definition.id}`);
      if (!row && (!pack || Number(pack.completed) < definition.levels)) continue;
      records.push({
        userId: user.id, username: user.username, packId: definition.id,
        packName: row?.pack_name || definition.name,
        levelCount: row ? Number(row.level_count) : definition.levels,
        completedAt: row ? Number(row.completed_at) : 0,
        recordedAt: row ? Number(row.recorded_at) : 0,
        historical: !row
      });
    }
  }
  return records;
}
