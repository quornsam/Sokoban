/* BOXXY v377 — signed-in, offline-safe per-run history, independent of best-score saves. */
(() => {
  'use strict';
  const PREFIX = 'boxxy-run-history-queue-v1:';
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
      assisted:false, endReason:'', ownerId:userId
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
    start, finish, progress, end, flush, hasActive:()=>Boolean(active)
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
