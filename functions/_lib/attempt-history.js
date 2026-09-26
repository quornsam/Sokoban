/* BOXXY v377 — independent, idempotent, account-scoped per-run history.
   History starts with this release: pre-v376 aggregate counts have no run detail. */
export async function ensureAttemptHistorySchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS level_attempt_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      pack_name TEXT NOT NULL,
      level_token TEXT NOT NULL,
      level_number INTEGER NOT NULL DEFAULT 0,
      level_name TEXT NOT NULL DEFAULT '',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
      seconds REAL,
      moves INTEGER,
      pushes INTEGER,
      assisted INTEGER NOT NULL DEFAULT 0 CHECK(assisted IN (0,1)),
      end_reason TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS level_attempt_history_user_level_idx
      ON level_attempt_history(user_id, pack_id, level_token, started_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS level_attempt_history_user_recent_idx
      ON level_attempt_history(user_id, started_at DESC)`)
  ]);
}

const num = (value, low, high) => typeof value === 'number' && Number.isFinite(value)
  && value >= low && value <= high ? value : null;
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const ident = /^[a-z0-9][a-z0-9-]{0,59}$/i;

function validateAttempt(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id, 72);
  const packId = text(raw.packId, 60);
  const token = text(raw.levelToken, 40);
  const startedAt = num(raw.startedAt, 1600000000000, Date.now() + 86400000);
  if (!/^[a-f0-9-]{32,40}$/i.test(id) || !ident.test(packId) ||
      !/^[a-zA-Z0-9_-]{1,40}$/.test(token) || startedAt === null) return null;
  const completed = raw.completed === true;
  // Incomplete attempts retain elapsed time, moves and pushes, but never qualify
  // for personal bests or public leaderboards. Older null metrics are valid.
  const seconds = raw.seconds == null ? null : num(raw.seconds, 0, 259200);
  const moves = raw.moves == null ? null : num(raw.moves, 0, 100000000);
  const pushes = raw.pushes == null ? null : num(raw.pushes, 0, 100000000);
  if (!completed && ((raw.seconds != null && seconds === null) ||
      (raw.moves != null && (moves === null || !Number.isInteger(moves))) ||
      (raw.pushes != null && (pushes === null || !Number.isInteger(pushes))))) return null;
  if (completed && (seconds === null || moves === null || pushes === null ||
      !Number.isInteger(moves) || !Number.isInteger(pushes))) return null;
  const endedAt = num(raw.endedAt, startedAt, Date.now() + 86400000);
  const endReason = completed ? 'completed' : (['restart','left','guided','interrupted','signed_out'].includes(raw.endReason) ? raw.endReason : '');
  return {
    id, packId, packName: text(raw.packName, 100) || packId,
    levelToken: token, levelNumber: Math.trunc(num(raw.levelNumber, 0, 100000) || 0),
    levelName: text(raw.levelName, 100), startedAt: Math.trunc(startedAt),
    endedAt: endedAt === null ? null : Math.trunc(endedAt), completed,
    seconds, moves, pushes, assisted: raw.assisted === true ? 1 : 0, endReason
  };
}

export async function writeAttemptHistory(db, userId, raws) {
  if (!Array.isArray(raws) || !raws.length || raws.length > 60) {
    throw new Error('Submit between 1 and 60 attempt records.');
  }
  const attempts = raws.map(validateAttempt);
  if (attempts.some(entry => !entry)) throw new Error('Invalid attempt record.');
  // Owner and puzzle identity never change; repeated start requests cannot undo a completion.
  const stmt = db.prepare(`INSERT INTO level_attempt_history
    (id,user_id,pack_id,pack_name,level_token,level_number,level_name,started_at,ended_at,
     completed,seconds,moves,pushes,assisted,end_reason)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      ended_at = CASE WHEN level_attempt_history.completed = 1 THEN level_attempt_history.ended_at
        ELSE COALESCE(excluded.ended_at, level_attempt_history.ended_at) END,
      completed = MAX(level_attempt_history.completed, excluded.completed),
      seconds = CASE WHEN level_attempt_history.completed = 1 THEN level_attempt_history.seconds
        ELSE COALESCE(excluded.seconds,level_attempt_history.seconds) END,
      moves = CASE WHEN level_attempt_history.completed = 1 THEN level_attempt_history.moves
        ELSE COALESCE(excluded.moves,level_attempt_history.moves) END,
      pushes = CASE WHEN level_attempt_history.completed = 1 THEN level_attempt_history.pushes
        ELSE COALESCE(excluded.pushes,level_attempt_history.pushes) END,
      assisted = CASE WHEN level_attempt_history.completed = 1 THEN level_attempt_history.assisted
        WHEN excluded.completed = 1 THEN excluded.assisted ELSE level_attempt_history.assisted END,
      end_reason = CASE WHEN level_attempt_history.completed = 1 THEN level_attempt_history.end_reason
        ELSE CASE WHEN excluded.end_reason != '' THEN excluded.end_reason ELSE level_attempt_history.end_reason END END
    WHERE level_attempt_history.user_id = excluded.user_id
      AND level_attempt_history.pack_id = excluded.pack_id
      AND level_attempt_history.level_token = excluded.level_token`);
  await db.batch(attempts.map(a => stmt.bind(
    a.id,userId,a.packId,a.packName,a.levelToken,a.levelNumber,a.levelName,
    a.startedAt,a.endedAt,a.completed ? 1 : 0,a.seconds,a.moves,a.pushes,a.assisted,a.endReason
  )));
  return attempts.map(a => a.id);
}

// Older cloud saves contain aggregate counters and retained best completions,
// not individual runs. Surface exactly what exists, without inventing dates or
// fabricating missing per-attempt times/moves/pushes.
function asObject(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) { return {}; }
}
function knownNumber(value) {
  return value == null || value === '' ? null :
    (Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null);
}
function olderRecords(progressValue) {
  const progress=asObject(progressValue), older=new Map();
  const packNames={
    'boxxy-original-puzzle-pack-of-50-levels':'BOXXY Originals',
    microban:'Microban',jigsaw:'The Jigsaw','alphabet-soup':'Alphabet Soup',
    'starry-night':'Starry Night',exponentially:'Exponentially','daily-boxxy':'Daily Boxxy'
  };
  const row=(packId,token) => {
    const key=`${packId}:${token}`;
    if (!older.has(key)) older.set(key, {
      packId,levelToken:String(token),packName:packNames[packId]||packId,levelNumber:Number(token)||0,
      levelName:'',aggregateAttempts:0,legacyLastAt:0,legacyBestTime:null,
      legacyBestMoves:null,legacyBestPushes:null,previousCompletion:false
    });
    return older.get(key);
  };
  const attempts=asObject(progress['boxxy-level-attempts-v1']);
  for (const entry of Object.values(asObject(attempts.levels))) {
    if (!entry?.packId || !entry?.levelToken) continue;
    const item=row(String(entry.packId),String(entry.levelToken));
    item.packName=String(entry.packName||item.packName);
    item.levelName=String(entry.levelName||item.levelName);
    item.levelNumber=Number(entry.levelNumber)||item.levelNumber;
    for (const device of Object.values(asObject(entry.devices))) {
      item.aggregateAttempts+=Math.max(0,Math.trunc(Number(device?.count)||0));
      item.legacyLastAt=Math.max(item.legacyLastAt,Number(device?.lastAt)||0);
    }
  }
  // Earlier packs may only have completion indexes and best-move keys;
  // individual time/push figures were not necessarily stored.
  const microbanSourceToIndex = Object.freeze({
    1:8,2:2,3:25,4:7,5:17,6:48,7:19,8:46,9:9,10:43,11:36,12:23,13:37,
    14:18,15:20,16:49,17:11,18:34,19:32,20:31,21:3,22:29,23:26,24:13,
    25:10,26:22,27:24,28:12,29:45,30:4,31:5,32:15,33:28,34:21,35:47,
    37:41,38:14,39:44,40:6,41:30,42:33,43:38,44:1,45:27,46:16,47:40,
    48:35,49:42,50:39,120:50
  });
  for (const [key,value] of Object.entries(progress)) {
    const completed=/^boxxy-pack-(.+)-completed-v1$/.exec(key);
    if (completed) {
      let indexes=[];
      try {indexes=JSON.parse(value||'[]');}catch(_){}
      if (Array.isArray(indexes)) for (const index of indexes) {
        if (!Number.isInteger(Number(index))||Number(index)<0) continue;
        row(completed[1],String(Number(index)+1)).previousCompletion=true;
      }
    }
    const keyMatch=/^boxxy-pack-(.+)-best-(.+)-v1$/.exec(key);
    if (keyMatch) {
      const source=keyMatch[2],n=Number(source.match(/(?:^|-)(\d+)$/)?.[1]);
      const number=keyMatch[1]==='microban' ? microbanSourceToIndex[String(source)] : n;
      const moves=knownNumber(value);
      if (number&&moves!=null&&moves>0) {
        const item=row(keyMatch[1],String(number));
        item.legacyBestMoves=minKnown(item.legacyBestMoves,moves);
        item.previousCompletion=true;
      }
    }
    const microbanLegacy=/^push-bauhaus-v22-best-(.+)$/.exec(key);
    if (microbanLegacy) {
      const number=microbanSourceToIndex[microbanLegacy[1]],moves=knownNumber(value);
      if (number&&moves!=null&&moves>0) {
        const item=row('microban',String(number));
        item.legacyBestMoves=minKnown(item.legacyBestMoves,moves);
        item.previousCompletion=true;
      }
    }
    const match=/^boxxy-pack-(.+)-completion-stats-v1$/.exec(key);
    if (!match) continue;
    for (const [zeroIndex,record] of Object.entries(asObject(asObject(value).levels))) {
      const n=Number(zeroIndex);
      if (!Number.isInteger(n)||n<0||!record) continue;
      const item=row(match[1],String(n+1));
      const time=knownNumber(record.seconds),moves=knownNumber(record.moves),pushes=knownNumber(record.pushes);
      if (!record.guided) {
        item.legacyBestTime=time;
        item.legacyBestMoves=moves;
        item.legacyBestPushes=pushes;
      }
      item.previousCompletion=true;
      item.legacyLastAt=Math.max(item.legacyLastAt,Number(record.completedAt)||0);
    }
  }
  for (const [dateKey,record] of Object.entries(asObject(progress['boxxy-daily-completions-v1']))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)||!record) continue;
    const item=row('daily-boxxy',dateKey);
    item.packName='Daily Boxxy'; item.levelName=dateKey;
    item.previousCompletion=true;
    item.legacyBestTime=knownNumber(record.seconds);
    item.legacyBestMoves=knownNumber(record.moves);
    item.legacyBestPushes=knownNumber(record.pushes);
    item.legacyLastAt=Math.max(item.legacyLastAt,Number(record.completedAt)||0);
  }
  return older;
}
const minKnown=(a,b)=> a==null ? b : b==null ? a : Math.min(a,b);
export function mergeOlderHistory(levels,progressValue) {
  const byLevel=new Map(levels.map(level=>[`${level.packId}:${level.levelToken}`,{
    ...level,detailedAttempts:level.attempts,legacyAttempts:0
  }]));
  for (const [key,old] of olderRecords(progressValue)) {
    const current=byLevel.get(key)||{
      packId:old.packId,levelToken:old.levelToken,packName:old.packName,
      levelNumber:old.levelNumber,levelName:old.levelName,attempts:0,
      detailedAttempts:0,completions:0,lastAt:0,bestTime:null,bestMoves:null,bestPushes:null
    };
    current.packName=current.packName===current.packId ? old.packName : current.packName;
    current.levelName=current.levelName||old.levelName;
    current.levelNumber=current.levelNumber||old.levelNumber;
    current.legacyAttempts=Math.max(0,old.aggregateAttempts-current.detailedAttempts);
    current.attempts=Math.max(current.detailedAttempts,old.aggregateAttempts);
    current.lastAt=Math.max(current.lastAt,old.legacyLastAt);
    current.bestTime=minKnown(current.bestTime,old.legacyBestTime);
    current.bestMoves=minKnown(current.bestMoves,old.legacyBestMoves);
    current.bestPushes=minKnown(current.bestPushes,old.legacyBestPushes);
    current.previousCompletion=old.previousCompletion;
    byLevel.set(key,current);
  }
  return [...byLevel.values()].sort((a,b)=>b.lastAt-a.lastAt);
}
export async function readAttemptOverview(db, userId, progressValue=null) {
  const result = await db.prepare(`SELECT pack_id AS packId, MAX(pack_name) AS packName,
    level_token AS levelToken, MAX(level_number) AS levelNumber, MAX(level_name) AS levelName,
    COUNT(*) AS attempts, SUM(completed) AS completions,
    MAX(COALESCE(ended_at,started_at)) AS lastAt,
    MIN(CASE WHEN completed=1 AND assisted=0 THEN seconds END) AS bestTime,
    MIN(CASE WHEN completed=1 AND assisted=0 THEN moves END) AS bestMoves,
    MIN(CASE WHEN completed=1 AND assisted=0 THEN pushes END) AS bestPushes
    FROM level_attempt_history WHERE user_id=?
    GROUP BY pack_id, level_token
    ORDER BY lastAt DESC`).bind(userId).all();
  const detailed = (result.results || []).map(row => ({ ...row,
    attempts: Number(row.attempts)||0, completions:Number(row.completions)||0,
    lastAt:Number(row.lastAt)||0 }));
  const levels=mergeOlderHistory(detailed,progressValue);
  return {levels,recent:levels.filter(level=>level.lastAt>0).slice(0,10),historyBeginsVersion:376};
}

const SORT_COLUMNS = Object.freeze({
  attempt:'attempt_number', date:'started_at', completed:'completed',
  time:'seconds', moves:'moves', pushes:'pushes'
});
export async function readLevelAttemptHistory(db, userId, options={}, progressValue=null) {
  const packId = text(options.packId,60);
  const token = text(options.levelToken,40);
  if (!ident.test(packId) || !/^[a-zA-Z0-9_-]{1,40}$/.test(token)) throw new Error('Invalid level.');
  const sort = Object.hasOwn(SORT_COLUMNS,options.sort) ? options.sort : 'attempt';
  const direction = options.direction === 'asc' ? 'ASC' : 'DESC';
  const offset = Math.min(1000000, Math.max(0, Math.trunc(Number(options.offset) || 0)));
  const limit = 100;
  const col = SORT_COLUMNS[sort];
  const rowsResult = await db.prepare(`SELECT attempt_number AS attemptNumber,
      id, started_at AS startedAt, ended_at AS endedAt, completed,
      seconds, moves, pushes, assisted, end_reason AS endReason
    FROM (SELECT id, started_at, ended_at, completed, seconds, moves, pushes, assisted, end_reason,
      ROW_NUMBER() OVER (ORDER BY started_at, id) AS attempt_number
      FROM level_attempt_history WHERE user_id=? AND pack_id=? AND level_token=?)
    ORDER BY ${col} IS NULL, ${col} ${direction}, attempt_number ASC
    LIMIT ? OFFSET ?`).bind(userId,packId,token,limit+1,offset).all();
  const all = rowsResult.results || [];
  const old=olderRecords(progressValue).get(`${packId}:${token}`);
  const countRow=await db.prepare(`SELECT COUNT(*) AS count FROM level_attempt_history
    WHERE user_id=? AND pack_id=? AND level_token=?`).bind(userId,packId,token).first();
  const detailedCount=Number(countRow?.count)||0;
  const legacy=old ? {
    undetailedCount:Math.max(0,old.aggregateAttempts-detailedCount),
    recordedTotal:old.aggregateAttempts,
    lastAt:old.legacyLastAt,
    bestTime:old.legacyBestTime,bestMoves:old.legacyBestMoves,
    bestPushes:old.legacyBestPushes,previousCompletion:old.previousCompletion
  } : null;
  return { rows: all.slice(0,limit).map(row => ({...row,
    completed: Boolean(row.completed), assisted:Boolean(row.assisted) })),
    legacy, nextOffset: all.length > limit ? offset+limit : null,sort,direction:direction.toLowerCase() };
}
