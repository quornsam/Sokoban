/* BOXXY v491 — canonical, idempotent special awards; no extra gameplay counters. */
import { OFFICIAL_SPECIAL_MEDALS, OFFICIAL_PACKS, OFFICIAL_MONTHLY_MEDALS } from "./content-catalog.js";
import { parseProgress } from "./auth.js";

export async function ensureSpecialMedalSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS user_special_medals (
    user_id TEXT NOT NULL, medal_id TEXT NOT NULL, awarded_at INTEGER NOT NULL,
    source TEXT NOT NULL, PRIMARY KEY(user_id, medal_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_special_medal_definitions (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL,
    image TEXT NOT NULL, created_at INTEGER NOT NULL
  )`).run();
}

function validCompletionStamp(record, award) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return 0;
  const stamp = Number(record.firstCompletedAt || record.completedAt);
  return Number.isSafeInteger(stamp) && stamp >= Date.parse(award.startUtc)
    && stamp < Date.parse(award.endUtc) ? stamp : 0;
}

// Existing signed-in run history is preferred; previously guest-played Dailys
// may have been synced only as their ordinary completed-Daily record.
export async function reconcileSpecialMedals(db, userId, progressJson = null) {
  await ensureSpecialMedalSchema(db);
  const progress = parseProgress(progressJson);
  let completions = {};
  try { completions = JSON.parse(progress["boxxy-daily-completions-v1"] || "{}"); } catch (_) {}
  if (!completions || typeof completions !== "object" || Array.isArray(completions)) completions = {};
  for (const medal of OFFICIAL_SPECIAL_MEDALS) {
    if (medal.award?.kind !== "daily-completion") continue;
    const award = medal.award;
    if (Date.now() < Date.parse(award.startUtc)) continue;
    const stamp = validCompletionStamp(completions[award.date], award);
    if (stamp) {
      await db.prepare(`INSERT OR IGNORE INTO user_special_medals (user_id, medal_id, awarded_at, source)
        VALUES (?, ?, ?, 'daily-progress')`).bind(userId, medal.id, stamp).run();
    }
    // A submitted completed run includes the actual time of its completion;
    // late uploads after the day still earn the medal, but late plays do not.
    await db.prepare(`INSERT OR IGNORE INTO user_special_medals (user_id, medal_id, awarded_at, source)
      SELECT user_id, ?, ended_at, 'daily-attempt' FROM level_attempt_history
      WHERE user_id = ? AND pack_id = 'daily-boxxy' AND level_token = ?
        AND completed = 1 AND assisted = 0
        AND ended_at >= ? AND ended_at < ?
      ORDER BY ended_at ASC LIMIT 1`)
      .bind(medal.id, userId, award.date,
        Date.parse(award.startUtc), Date.parse(award.endUtc)).run();
  }
}

export async function specialMedalsForUser(db, userId) {
  // Attempt-history POSTs only need official IDs; keep that frequent path lean.
  await ensureSpecialMedalSchema(db);
  const rows = await db.prepare("SELECT medal_id FROM user_special_medals WHERE user_id = ? ORDER BY awarded_at ASC")
    .bind(userId).all();
  const allowed = new Set(OFFICIAL_SPECIAL_MEDALS.map(medal => medal.id));
  return (rows.results || []).map(row => String(row.medal_id)).filter(id => allowed.has(id));
}

// Basement chooses from existing artwork only. The server, not the form,
// determines which file paths are legal; none can be uploaded or typed in.
export function availableMedalArtwork() {
  const options = [];
  const used = new Set();
  const add = (image, label) => {
    if (!image || used.has(image)) return;
    used.add(image);
    options.push({ image, label });
  };
  for (const medal of OFFICIAL_SPECIAL_MEDALS) add(medal.image, medal.title);
  for (const month of OFFICIAL_MONTHLY_MEDALS) add(`assets/medals/boxxy-medal-${month}.png`, `${month} Daily medal`);
  for (const pack of OFFICIAL_PACKS) if (pack.reward?.src) add(pack.reward.src, pack.name);
  return options;
}

// Reuse the exact same award lookup for accounts, profiles and the Basement user list.
// An unrestricted call returns all grants in one D1 read, not one request per player.
export async function specialAwardsForUsers(db, userId = "") {
  await ensureSpecialMedalSchema(db);
  const statement = db.prepare(`SELECT m.user_id AS userId, m.medal_id AS id,
      d.title, d.message, d.image
    FROM user_special_medals m
    LEFT JOIN admin_special_medal_definitions d ON d.id = m.medal_id
    ${userId ? "WHERE m.user_id = ?" : ""}
    ORDER BY m.awarded_at ASC, m.medal_id ASC`);
  const rows = await (userId ? statement.bind(userId) : statement).all();
  const official = new Set(OFFICIAL_SPECIAL_MEDALS.map(medal => medal.id));
  const images = new Set(availableMedalArtwork().map(item => item.image));
  const byUser = new Map();
  for (const row of rows.results || []) {
    const key = String(row.userId);
    if (!byUser.has(key)) byUser.set(key, {specialMedals:[], adminMedals:[]});
    const earned = byUser.get(key);
    if (official.has(row.id)) earned.specialMedals.push(String(row.id));
    else if (/^admin-[0-9a-f-]{36}$/.test(String(row.id)) && images.has(row.image)) {
      earned.adminMedals.push({ id:String(row.id), category:"special", title:String(row.title),
        message:String(row.message), image:String(row.image) });
    }
  }
  return byUser;
}

export async function specialAwardsForUser(db, userId) {
  const byUser = await specialAwardsForUsers(db, userId);
  return byUser.get(String(userId)) || {specialMedals:[], adminMedals:[]};
}

// These functions are invoked only after the Basement session has been checked.
export async function adminMedalState(db) {
  await ensureSpecialMedalSchema(db);
  const rows = await db.prepare(`SELECT m.user_id AS userId, u.username, m.medal_id AS medalId,
      m.awarded_at AS awardedAt, d.title AS title,
      d.image AS image
      FROM user_special_medals m JOIN users u ON u.id=m.user_id
      LEFT JOIN admin_special_medal_definitions d ON d.id=m.medal_id
      WHERE m.source = 'basement' ORDER BY m.awarded_at DESC LIMIT 100`).all();
  const official = new Map(OFFICIAL_SPECIAL_MEDALS.map(item => [item.id,item]));
  const grants = (rows.results || []).map(row => ({
    userId: String(row.userId), username:String(row.username), medalId:String(row.medalId),
    title:row.title || official.get(String(row.medalId))?.title || String(row.medalId),
    image:row.image || official.get(String(row.medalId))?.image || '',
    awardedAt:Number(row.awardedAt) || 0
  }));
  return { artwork:availableMedalArtwork(),
    official:OFFICIAL_SPECIAL_MEDALS.map(m => ({id:m.id,title:m.title,image:m.image,message:m.message})), grants };
}

export async function adminGrantMedals(db, input) {
  const names = [...new Set((Array.isArray(input.usernames) ? input.usernames : [])
    .map(value => String(value || '').trim()).filter(Boolean).map(value => value.toLowerCase()))];
  const awards = Array.isArray(input.awards) ? input.awards : [];
  if (!names.length || names.length > 10 || names.some(name => name.length > 20) || !awards.length || awards.length > 8)
    throw new Error('Choose 1–10 account usernames and 1–8 medals.');
  const found = await db.prepare(`SELECT id, username FROM users WHERE lower(username) IN (${names.map(() => '?').join(',')})`)
    .bind(...names).all();
  const users = found.results || [];
  const present = new Set(users.map(user => String(user.username).toLowerCase()));
  const missing = names.filter(name => !present.has(name));
  if (missing.length) throw new Error(`Unknown account${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);
  const images = new Set(availableMedalArtwork().map(choice => choice.image));
  const official = new Map(OFFICIAL_SPECIAL_MEDALS.map(medal => [medal.id, medal]));
  const definitions = awards.map(award => {
    if (award.kind === 'official-preview') {
      const medal = official.get(String(award.medalId || ''));
      if (!medal) throw new Error('Unknown official medal.');
      // Preview grants are separate, revocable awards. They exercise the same
      // real account/modal/cabinet flow but never consume the true event prize.
      return { id:`admin-${crypto.randomUUID()}`, title:medal.title,
        message:medal.message, image:medal.image, predefined:false };
    }
    if (award.kind !== 'custom') throw new Error('Unknown medal type.');
    const title = String(award.title || '').trim();
    const message = String(award.message || '').trim();
    const image = String(award.image || '');
    if (!title || title.length > 64 || !message || message.length > 300 || !images.has(image))
      throw new Error('Medal title (1–64 characters), message (1–300 characters) and existing artwork are required.');
    return {id:`admin-${crypto.randomUUID()}`, title, message, image, predefined:false};
  });
  await ensureSpecialMedalSchema(db);
  const now = Date.now();
  const statements = [];
  for (const [index, medal] of definitions.entries()) {
    const awardedAt = now + index;
    if (!medal.predefined) statements.push(db.prepare(`INSERT INTO admin_special_medal_definitions
      (id,title,message,image,created_at) VALUES (?,?,?,?,?)`)
      .bind(medal.id,medal.title,medal.message,medal.image,awardedAt));
    for (const user of users) statements.push(db.prepare(`INSERT OR IGNORE INTO user_special_medals
      (user_id,medal_id,awarded_at,source) VALUES (?,?,?,'basement')`)
      .bind(user.id,medal.id,awardedAt));
  }
  await db.batch(statements);
  return { recipients:users.map(user => user.username),
    awards:definitions.map(m => ({id:m.id,title:m.title})),
    note:'Players receive medals on their next account refresh or sign-in.' };
}

export async function adminRevokeGrant(db, userId, medalId) {
  if (!userId || !medalId) throw new Error('Grant selection is required.');
  await ensureSpecialMedalSchema(db);
  const [result] = await db.batch([
    db.prepare(`DELETE FROM user_special_medals
      WHERE user_id=? AND medal_id=? AND source='basement'`).bind(userId,medalId),
    db.prepare(`DELETE FROM admin_special_medal_definitions
      WHERE id=? AND NOT EXISTS (SELECT 1 FROM user_special_medals WHERE medal_id=?)`)
      .bind(medalId,medalId)
  ]);
  return Number(result.meta?.changes || 0) > 0;
}
