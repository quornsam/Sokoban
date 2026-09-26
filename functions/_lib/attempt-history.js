/* BOXXY v376 — independent, idempotent, account-scoped per-run history.
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
  const seconds = completed ? num(raw.seconds, 0, 259200) : null;
  const moves = completed ? num(raw.moves, 0, 100000000) : null;
  const pushes = completed ? num(raw.pushes, 0, 100000000) : null;
  if (completed && (seconds === null || moves === null || pushes === null ||
      !Number.isInteger(moves) || !Number.isInteger(pushes))) return null;
  const endedAt = num(raw.endedAt, startedAt, Date.now() + 86400000);
  const endReason = completed ? 'completed' : (['restart','left','guided','interrupted'].includes(raw.endReason) ? raw.endReason : '');
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
      seconds = CASE WHEN excluded.completed = 1 THEN excluded.seconds ELSE level_attempt_history.seconds END,
      moves = CASE WHEN excluded.completed = 1 THEN excluded.moves ELSE level_attempt_history.moves END,
      pushes = CASE WHEN excluded.completed = 1 THEN excluded.pushes ELSE level_attempt_history.pushes END,
      assisted = CASE WHEN excluded.completed = 1 THEN excluded.assisted ELSE level_attempt_history.assisted END,
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

export async function readAttemptOverview(db, userId) {
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
  const levels = (result.results || []).map(row => ({ ...row,
    attempts: Number(row.attempts) || 0, completions: Number(row.completions) || 0,
    lastAt: Number(row.lastAt) || 0 }));
  return { levels, recent: levels.slice(0,10), historyBeginsVersion:376 };
}

const SORT_COLUMNS = Object.freeze({
  attempt:'attempt_number', date:'started_at', completed:'completed',
  time:'seconds', moves:'moves', pushes:'pushes'
});
export async function readLevelAttemptHistory(db, userId, options={}) {
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
  return { rows: all.slice(0,limit).map(row => ({...row,
    completed: Boolean(row.completed), assisted:Boolean(row.assisted) })),
    nextOffset: all.length > limit ? offset+limit : null, sort, direction:direction.toLowerCase() };
}
