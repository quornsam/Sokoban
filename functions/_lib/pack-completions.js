/* BOXXY v482 — discover pack records from existing synced pack catalogue; legacy definitions remain fallback. */
/* BOXXY v335 — canonical pack definitions and conservative completion history. */
import { parseProgress } from "./auth.js";

export const PACK_COMPLETION_DEFS = Object.freeze([
  { id:"boxxy-original-puzzle-pack-of-50-levels", name:"BOXXY Originals", levels:50 },
  { id:"microban", name:"Microban", levels:50 },
  { id:"jigsaw", name:"The Jigsaw", levels:25 },
  { id:"exponentially", name:"Exponentially", levels:11 },
  { id:"alphabet-soup", name:"Alphabet Soup", levels:27 },
  { id:"starry-night", name:"Starry Night", levels:25 },
  { id:"static-noise", name:"Static Noise", levels:11 }
]);
const MICROBAN_SOURCES = Object.freeze(["44", "2", "21", "30", "31", "40", "4", "1", "9", "25", "17", "28", "24", "38", "32", "46", "5", "14", "7", "15", "34", "26", "12", "27", "3", "23", "45", "33", "22", "41", "20", "19", "42", "18", "48", "11", "13", "43", "50", "47", "37", "49", "10", "39", "29", "8", "35", "6", "16", "120"]);
const KNOWN = new Map(PACK_COMPLETION_DEFS.map(pack => [pack.id, pack]));
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,159}$/i;
export const firstCompletionKey = id => `boxxy-pack-${id}-first-completion-v1`;
export function validFirstCompletionTime(value, now = Date.now()) {
  const stamp = Number(value);
  return Number.isSafeInteger(stamp) && stamp >= Date.UTC(2026,0,1) && stamp <= now + 300000 ? stamp : 0;
}
export function parseFirstCompletionMarker(value, userId = "", now = Date.now()) {
  let marker = value;
  if (typeof marker === "string") { try { marker = JSON.parse(marker); } catch (_) { return null; } }
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) return null;
  const owner = String(marker.userId || "");
  if (userId && owner !== String(userId)) return null;
  const completedAt = validFirstCompletionTime(marker.completedAt, now);
  return completedAt ? { completedAt, userId:owner } : null;
}
function definitionsForProgress(progress) {
  const definitions = new Map(KNOWN);
  let catalog = {};
  try { catalog = parseProgress(JSON.parse(String(progress["boxxy-pack-catalog-v1"] || "{}"))); } catch (_) {}
  for (const [id,entry] of Object.entries(catalog).slice(0,1000)) {
    if (definitions.has(id) || !ID_PATTERN.test(id)) continue;
    const levels = Number(entry?.levels);
    if (!Number.isInteger(levels) || levels < 1 || levels > 10000) continue;
    definitions.set(id,{id,name:String(entry.name || id).slice(0,120),levels});
  }
  return definitions;
}
function catalogContainsPack(progress, definition) {
  try {
    const catalog = JSON.parse(String(progress["boxxy-pack-catalog-v1"] || "{}"));
    const levels = Number(catalog?.[definition.id]?.levels);
    return Number.isInteger(levels) && levels === definition.levels && levels > 0;
  } catch (_) { return false; }
}
// Monthly Daily history is a derived Basement view, not extra packs or D1 rows.
export function dailyMonthEvidence(progressValue, now = Date.now()) {
  const progress = parseProgress(progressValue);
  let days = {};
  try { days = JSON.parse(String(progress["boxxy-daily-completions-v1"] || "{}")); } catch (_) {}
  if (!days || typeof days !== "object" || Array.isArray(days)) days = {};
  const months = new Map();
  for (const [date, record] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !record || typeof record !== "object" || Array.isArray(record)) continue;
    const year = Number(date.slice(0,4)), month = Number(date.slice(5,7)), day = Number(date.slice(8,10));
    if (year < 2026 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) continue;
    if (date < "2026-08-30") continue;
    const key = date.slice(0,7);
    if (!months.has(key)) months.set(key,new Set());
    months.get(key).add(date);
  }
  return [...months].sort(([a],[b])=>a.localeCompare(b)).map(([month,dates])=>{
    const year = Number(month.slice(0,4)), number = Number(month.slice(5,7));
    const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const first = month === "2026-08" ? 30 : 1;
    const total = daysInMonth - first + 1;
    const last = `${month}-${String(daysInMonth).padStart(2,"0")}`;
    const complete = dates.size === total && Date.parse(`${last}T23:59:59Z`) <= now;
    const name = `Daily BOXXY · ${new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,number-1,1)))}`;
    return { id:`daily-month-${month}`, name, completed:dates.size, total, complete };
  });
}

export function mergeFirstCompletionMarkers(existingValue, incomingValue, userId = "") {
  const existing = parseProgress(existingValue), incoming = parseProgress(incomingValue);
  const merged = { ...incoming };
  const keys = new Set([...Object.keys(existing),...Object.keys(incoming)].filter(key => /^boxxy-pack-(.+)-first-completion-v1$/.test(key)));
  for (const key of keys) {
    const markers = [existing[key],incoming[key]].map(value => parseFirstCompletionMarker(value,userId))
      .filter(marker => marker && (!userId || marker.userId === userId));
    if (markers.length) merged[key] = JSON.stringify(markers.reduce((a,b) => a.completedAt <= b.completedAt ? a : b));
    else if (userId) delete merged[key];
  }
  return merged;
}
function completedSet(progress, definition) {
  let values = progress[`boxxy-pack-${definition.id}-completed-v1`];
  // Match the actual game: use the legacy completion array only when no
  // current-format array exists, rather than unioning two different saves.
  if (definition.id === "microban" && values == null) values = progress["boxxy-completed-levels-v1"];
  if (typeof values === "string") { try { values = JSON.parse(values); } catch (_) { values = []; } }
  if (!Array.isArray(values)) values = [];
  const set = new Set(values.map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < definition.levels));
  // The pre-account Microban save used individual best-score keys. Recognise
  // those as actual level evidence, not a progress cursor or last-level unlock.
  if (definition.id === "microban") {
    for (let i=0;i<definition.levels;i++) {
      if (progress[`push-bauhaus-v22-best-${MICROBAN_SOURCES[i]}`]) set.add(i);
    }
  }
  return set;
}
export function packCompletionEvidence(progressValue, definition) {
  const progress = parseProgress(progressValue);
  const completed = completedSet(progress,definition);
  return { completed:completed.size, total:definition.levels, complete:completed.size === definition.levels };
}
const schemaPromises = new WeakMap();
export async function ensurePackCompletionSchema(db) {
  let pending = schemaPromises.get(db);
  if (!pending) {
    pending = db.prepare(`CREATE TABLE IF NOT EXISTS pack_completions (
      user_id TEXT NOT NULL,pack_id TEXT NOT NULL,pack_name TEXT NOT NULL,
      level_count INTEGER NOT NULL,completed_at INTEGER NOT NULL,recorded_at INTEGER NOT NULL,
      PRIMARY KEY(user_id,pack_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).run().then(() => db.prepare("CREATE INDEX IF NOT EXISTS pack_completions_order_idx ON pack_completions(pack_id,completed_at,recorded_at)").run())
      .catch(error => {schemaPromises.delete(db);throw error;});
    schemaPromises.set(db,pending);
  }
  return pending;
}
export async function recordPackCompletions(db,userId,progressValue) {
  const progress = parseProgress(progressValue),now=Date.now();
  const records = [...definitionsForProgress(progress).values()].map(definition => ({
    definition,completedAt:parseFirstCompletionMarker(progress[firstCompletionKey(definition.id)],userId,now)?.completedAt || 0
  })).filter(item => item.completedAt && packCompletionEvidence(progress,item.definition).complete);
  if (!records.length) return;
  await ensurePackCompletionSchema(db);
  for (const {definition,completedAt} of records) {
    await db.prepare(`INSERT INTO pack_completions (user_id,pack_id,pack_name,level_count,completed_at,recorded_at)
      VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,pack_id) DO UPDATE SET
      completed_at=MIN(pack_completions.completed_at,excluded.completed_at)`).bind(userId,definition.id,definition.name,definition.levels,completedAt,now).run();
  }
}
export async function readPackCompletions(db,userId="") {
  await ensurePackCompletionSchema(db);
  const statement = userId ? db.prepare("SELECT * FROM pack_completions WHERE user_id=?").bind(userId) : db.prepare("SELECT * FROM pack_completions");
  return (await statement.all()).results || [];
}
export function completionRecordsForUsers(users,rows) {
  const records=[];
  const rowsByUser=new Map();
  for (const row of rows) {
    const id=String(row.user_id || "");if(!rowsByUser.has(id))rowsByUser.set(id,new Map());
    rowsByUser.get(id).set(row.pack_id,row);
  }
  for (const user of users) {
    const progress=parseProgress(user.progress || user.progress_json);
    const definitions=definitionsForProgress(progress);
    // List summaries lack raw progress. They are not proof of a full pack.
    for (const [id,pack] of Object.entries(user.summary?.packs || {})) {
      if (definitions.has(id) || !ID_PATTERN.test(id)) continue;
      const levels=Number(pack.levelCount);
      if(Number.isInteger(levels)&&levels>0&&levels<=10000) definitions.set(id,{id,name:String(pack.name||id).slice(0,120),levels});
    }
    const ledger=rowsByUser.get(String(user.id)) || new Map();
    for(const [id,row] of ledger) {
      if(!definitions.has(id)) definitions.set(id,{id,name:String(row.pack_name||id),levels:Number(row.level_count)});
    }
    for(const definition of definitions.values()) {
      const row=ledger.get(definition.id);
      const evidence=(user.progress !== undefined || user.progress_json !== undefined) ? packCompletionEvidence(progress,definition) : null;
      const summary=user.summary?.packs?.[definition.id];
      const summaryCount=Number(summary?.completed || 0);
      // A list-only summary may describe progress but cannot validate a date.
      const complete=evidence ? evidence.complete : false;
      if(!complete && !row) continue;
      const rawMarker=progress[firstCompletionKey(definition.id)];
      const marker=evidence?.complete ? parseFirstCompletionMarker(rawMarker,user.id) : null;
      const invalidMarker=rawMarker != null && !parseFirstCompletionMarker(rawMarker,user.id);
      const rowTime=validFirstCompletionTime(row?.completed_at);
      const rowCount=Number(row?.level_count);
      const countMatches=!row || rowCount===definition.levels;
      const official=KNOWN.has(definition.id) || catalogContainsPack(progress,definition);
      const timestampConflict=Boolean(row && (!rowTime || (marker && marker.completedAt!==rowTime)));
      const needsReview=!complete || !official || Boolean(row&&!countMatches) || timestampConflict || invalidMarker;
      const reviewReason=!complete ? "The saved progress does not contain every level."
        : !official ? "This custom pack's level count is not independently verified."
        : invalidMarker ? "The first-completion marker is invalid or belongs to another account."
        : !countMatches ? "The earlier ledger used a different level count."
        : timestampConflict ? "The saved first-completion date and ledger need reconciliation."
        : "";
      const dated=Boolean(!needsReview && rowTime);
      records.push({userId:user.id,username:user.username,packId:definition.id,packName:definition.name,
        levelCount:definition.levels,completed:evidence?.completed ?? Math.min(summaryCount,definition.levels),
        complete,completedAt:dated?rowTime:0,recordedAt:dated?Number(row.recorded_at)||0:0,
        historical:complete&&!dated,verified:dated,needsReview,reviewReason,
        previousRecord:row&&!dated?{completedAt:Number(row.completed_at)||0,recordedAt:Number(row.recorded_at)||0,levelCount:rowCount}:null});
    }
    for (const month of dailyMonthEvidence(progress)) {
      if (!month.complete) continue;
      // Earliest all-days-completed timestamp was not recorded; never invent it.
      records.push({userId:user.id,username:user.username,packId:month.id,packName:month.name,
        levelCount:month.total,completed:month.completed,complete:true,completedAt:0,recordedAt:0,
        historical:true,verified:false,needsReview:false,reviewReason:"",previousRecord:null});
    }
  }
  return records;
}

// Correct only the admin presentation. The persisted progress is never rewritten.
export function canonicalAdminSummary(summary, progressValue) {
  const progress=parseProgress(progressValue);
  const result={...summary,packs:{...(summary?.packs||{})},dailyMonths:dailyMonthEvidence(progress)};
  for(const definition of definitionsForProgress(progress).values()) {
    const evidence=packCompletionEvidence(progress,definition);
    result.packs[definition.id]={...(result.packs[definition.id]||{}),name:definition.name,
      levelCount:definition.levels,completed:evidence.completed};
  }
  result.levelsCompleted=Object.values(result.packs).reduce((sum,pack)=>sum+Math.max(0,Number(pack.completed)||0),0)+Math.max(0,Number(result.dailyCompleted)||0);
  result.packsCompleted=Object.values(result.packs).filter(pack=>Number(pack.levelCount)>0&&Number(pack.completed)>=Number(pack.levelCount)).length;
  return result;
}
