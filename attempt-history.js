/* BOXXY v394 — local-first player history with independent Mouse/Click Push and Instant Move metadata. */
(() => {
  'use strict';
  const PREFIX = 'boxxy-run-history-queue-v1:';
  const LOCAL_PREFIX = 'boxxy-run-history-local-v1:';
  const OVERVIEW_PREFIX = 'boxxy-run-history-overview-v1:';
  const LOCAL_RUN_LIMIT = 500;
  const USER = () => String(window.BOXXYAccountIdentity?.id || '');
  let active = null;
  let sending = false;
  let flushTimer = 0;
  let lastProgressSave = 0;
  const validMetric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => { flushTimer = 0; flush(); }, 2000);
  }
  const json = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } };
  const keyFor = id => PREFIX + id;
  const localKeyFor = id => LOCAL_PREFIX + id;
  const overviewKeyFor = id => OVERVIEW_PREFIX + id;
  const overviewMemory = new Map();
  function rememberLocalRun(entry, userId) {
    // Keep a bounded, account-specific read copy after the upload queue clears.
    // This is display data only: the existing queue remains the sole sync source.
    try {
      const key = localKeyFor(userId);
      const stored = json(key);
      const runs = Array.isArray(stored) ? stored : [];
      const index = runs.findIndex(item => item.id === entry.id);
      if (index >= 0) runs.splice(index, 1);
      runs.push({...entry});
      if (runs.length > LOCAL_RUN_LIMIT) runs.splice(0, runs.length - LOCAL_RUN_LIMIT);
      localStorage.setItem(key, JSON.stringify(runs));
    } catch (_) { /* Local history is optional; never affect the upload queue. */ }
  }
  function stash(entry, userId) {
    if (!userId || !entry) return;
    try {
      const key = keyFor(userId);
      const queue = json(key);
      const index = queue.findIndex(item => item.id === entry.id);
      if (index < 0) queue.push(entry);
      else queue[index] = entry;
      localStorage.setItem(key, JSON.stringify(queue));
    } catch (error) { console.warn('BOXXY history local storage unavailable', error); }
    rememberLocalRun(entry, userId);
  }
  function rememberOverview(data, userId = USER()) {
    if (!userId || !Array.isArray(data?.levels)) return;
    const knownRunIds = Array.isArray(data.knownRunIds) ? data.knownRunIds : [];
    const known = new Set(knownRunIds);
    const queue = json(keyFor(userId));
    const snapshot = {
      levels:data.levels, recent:Array.isArray(data.recent) ? data.recent : [],
      historyBeginsVersion:data.historyBeginsVersion || 376, savedAt:Date.now(),
      knownRunIds, pendingIds:(Array.isArray(queue) ? queue : [])
        .filter(run=>run.ownerId===userId && !known.has(run.id)).map(run=>run.id)
    };
    overviewMemory.set(userId, snapshot);
    try { localStorage.setItem(overviewKeyFor(userId), JSON.stringify(snapshot)); }
    catch (_) { /* In-memory history still works when device storage is full. */ }
  }
  function localOverview(userId = USER()) {
    if (!userId || userId !== USER()) return null;
    const saved = overviewMemory.get(userId) || json(overviewKeyFor(userId));
    const snapshot = Array.isArray(saved?.levels) ? saved : null;
    const stored = json(localKeyFor(userId));
    const runs = Array.isArray(stored) ? stored : [];
    const known = new Set(snapshot?.knownRunIds || []);
    const pendingAtFetch = new Set(snapshot?.pendingIds || []);
    const queued = json(keyFor(userId));
    const stillQueued = new Set((Array.isArray(queued) ? queued : []).map(run=>run.id));
    // The server supplies recent attempt IDs so locally recorded attempts can
    // be overlaid without double-counting runs already present in D1.
    const newRuns = snapshot ? runs.filter(run => !known.has(run.id) && (
      Number(run.startedAt) > snapshot.savedAt || pendingAtFetch.has(run.id) || stillQueued.has(run.id)
    )) : runs;
    if (!snapshot && !newRuns.length) return null;
    const levels = new Map((snapshot?.levels || []).map(level => [
      `${level.packId}:${level.levelToken}`, {...level}
    ]));
    for (const run of newRuns) {
      if (run.ownerId !== userId || !run.packId || !run.levelToken) continue;
      const key = `${run.packId}:${run.levelToken}`;
      const level = levels.get(key) || {
        packId:run.packId, levelToken:run.levelToken,
        packName:run.packName || run.packId, levelName:run.levelName || '',
        levelNumber:run.levelNumber || 0, attempts:0, detailedAttempts:0,
        completions:0, lastAt:0, bestTime:null, bestMoves:null, bestPushes:null
      };
      level.detailedAttempts = (Number(level.detailedAttempts) || 0) + 1;
      // Older aggregate attempt counts can already include an opening or a
      // newly synced run; match the server's max(aggregate, detailed) rule.
      level.attempts = Math.max(Number(level.attempts) || 0,level.detailedAttempts);
      level.completions = (Number(level.completions) || 0) + (run.completed === true ? 1 : 0);
      level.lastAt = Math.max(Number(level.lastAt) || 0, Number(run.endedAt || run.startedAt) || 0);
      if (run.completed === true && run.assisted !== true) {
        for (const [source,target] of [['seconds','bestTime'],['moves','bestMoves'],['pushes','bestPushes']]) {
          const metric = validMetric(run[source]);
          if (metric !== null) level[target] = level[target] == null ? metric : Math.min(level[target],metric);
        }
      }
      levels.set(key,level);
    }
    const ordered = [...levels.values()].sort((a,b) => (Number(b.lastAt)||0)-(Number(a.lastAt)||0));
    return {
      levels:ordered, recent:ordered.filter(level=>level.lastAt>0).slice(0,10),
      historyBeginsVersion:snapshot?.historyBeginsVersion || 376
    };
  }
  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function start(packId, levelToken, details = {}) {
    const userId = USER();
    if (!userId) { active = null; return; }
    if (active) end(active.packId === String(packId) && active.levelToken === String(levelToken) ? 'restart' : 'left');
    active = {
      id:uid(), packId:String(packId), levelToken:String(levelToken),
      packName:String(details.packName || packId),
      levelNumber:Number(details.levelNumber) || 0,
      levelName:String(details.levelName || ''), startedAt:Number(details.startedAt) || Date.now(),
      endedAt:null, completed:false, seconds:null, moves:null, pushes:null,
      assisted:false, mouseOrClickPushUsed:false, instantMoveUsed:false, endReason:'', ownerId:userId
    };
    stash(active, userId);
    lastProgressSave = Date.now();
  }
  function progress(result = {}) {
    if (!active || active.completed) return;
    for (const metric of ['seconds','moves','pushes']) {
      const value = validMetric(result[metric]);
      if (value !== null) active[metric] = metric === 'seconds' ? value : Math.trunc(value);
    }
    if (result.mouseOrClickPushUsed === true) active.mouseOrClickPushUsed = true;
    if (result.instantMoveUsed === true) active.instantMoveUsed = true;
    // No network calls on movement. Persist at most every 15 seconds so a crash
    // loses at most a short interval; always persist when ending a run.
    if (Date.now() - lastProgressSave >= 15000) {
      stash(active, active.ownerId);
      lastProgressSave = Date.now();
    }
  }
  function end(reason='left', partial=null) {
    if (!active) return;
    const now = Date.now();
    if (partial) progress(partial);
    active.endedAt = now;
    active.endReason = reason;
    active.seconds = Math.max(active.seconds ?? 0, (now-active.startedAt)/1000);
    stash(active, active.ownerId);
    active = null;
    scheduleFlush();
  }
  function finish(result) {
    if (!active || !result) return;
    progress(result);
    active.completed = true;
    active.seconds = Math.max(0, Number(result.seconds) || 0);
    active.moves = Math.max(0, Math.trunc(Number(result.moves) || 0));
    active.pushes = Math.max(0, Math.trunc(Number(result.pushes) || 0));
    active.assisted = Boolean(result.assisted);
    active.mouseOrClickPushUsed = Boolean(result.mouseOrClickPushUsed);
    active.instantMoveUsed = Boolean(result.instantMoveUsed);
    // The device belongs to this completed run, not the browser that later views it.
    active.device = ['phone','tablet','computer'].includes(result.device) ? result.device : '';
    active.endedAt = Date.now();
    active.endReason = 'completed';
    stash(active, active.ownerId);
    active = null;
    scheduleFlush();
  }
  async function flush() {
    const userId = USER();
    if (sending || !userId || !navigator.onLine) return;
    const queue = json(keyFor(userId));
    if (!queue.length) return;
    sending = true;
    try {
      const batch = queue.slice(0, 50);
      const response = await fetch('/api/attempts', {
        method:'POST', credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({attempts:batch})
      });
      if (!response.ok) return;
      const result = await response.json();
      if (!result.ok) return;
      const confirmed = new Set(result.ids || []);
      // Never remove a locally updated record merely because its earlier start was acknowledged.
      const current = json(keyFor(userId));
      const sent = new Map(batch.map(entry => [entry.id, JSON.stringify(entry)]));
      const remaining = current.filter(entry => !confirmed.has(entry.id) || sent.get(entry.id) !== JSON.stringify(entry));
      localStorage.setItem(keyFor(userId), JSON.stringify(remaining));
      if (remaining.length) setTimeout(flush, 1000);
      else window.dispatchEvent(new CustomEvent('boxxyhistorysynced',{detail:{userId}}));
    } catch (_) { /* Offline history is retained for later upload. */ }
    finally { sending = false; }
  }
  function recoverPending() {
    const userId = USER();
    if (!userId) return;
    const queue = json(keyFor(userId));
    let changed = false;
    for (const entry of queue) {
      if (entry.endedAt == null && (!active || entry.id !== active.id)) {
        entry.endedAt = Date.now();
        entry.endReason = 'interrupted';
        // Do not count the hours since a crash as playing time.
        if (entry.seconds == null && entry.startedAt) entry.seconds = null;
        changed = true;
      }
    }
    if (changed) try { localStorage.setItem(keyFor(userId), JSON.stringify(queue)); } catch (_) {}
    flush();
  }
  window.BOXXYAttemptHistory = Object.freeze({
    start, finish, progress, end, flush, localOverview, rememberOverview,
    hasActive:()=>Boolean(active)
  });
  window.addEventListener('boxxyaccountfeatures', event => {
    if (!event.detail?.loggedIn) end('signed_out');
    else recoverPending();
  });
  window.addEventListener('online', flush);
  window.addEventListener('pagehide', () => end('left'));
  window.setInterval(flush, 30000);
  recoverPending();
})();
