/* BOXXY v277 — optional first-party accounts, cloud sync, gameplay statistics and level-attempt history. */
(() => {
  "use strict";

  const API = "/api/account";
  const SYNC_INTERVAL_MS = 30000;
  const ACTIVITY_SYNC_SECONDS = 300;
  const ACCOUNT_MARKER_KEY = "boxxy-account-known-v1";
  const ALL_TIME_STEPS_KEY = "boxxy-all-time-steps-v1";
  const ALL_TIME_PUSHES_KEY = "boxxy-all-time-pushes-v1";
  const LEVEL_ATTEMPTS_KEY = "boxxy-level-attempts-v1";
  const PACK_CATALOG_KEY = "boxxy-pack-catalog-v1";
  const EXACT_SYNC_KEYS = new Set([
    "boxxy-active-pack-v2",
    "boxxy-additional-packs-unlocked-v1",
    "boxxy-daily-completions-v1",
    "boxxy-daily-streak-v1",
    "boxxy-sound-v1",
    "boxxy-music-track-v1",
    "boxxy-speed-v1",
    "boxxy-mouse-support-v1",
    "boxxy-theme",
    "push-bauhaus-music",
    "push-bauhaus-character-style-v51",
    "push-bauhaus-v29-level",
    "push-bauhaus-v33-level",
    "boxxy-completed-levels-v1",
    "boxxy-level-progress-v1",
    ALL_TIME_STEPS_KEY,
    ALL_TIME_PUSHES_KEY,
    LEVEL_ATTEMPTS_KEY,
    PACK_CATALOG_KEY
  ]);

  const entryBtn = document.getElementById("accountEntryBtn");
  const entryLabel = document.getElementById("accountEntryLabel");
  const mainView = document.getElementById("settingsMainView");
  const keyboardView = document.getElementById("settingsKeyboardView");
  const accountView = document.getElementById("settingsAccountView");
  const backBtn = document.getElementById("accountBackBtn");
  const createModeBtn = document.getElementById("accountCreateModeBtn");
  const loginModeBtn = document.getElementById("accountLoginModeBtn");
  const createForm = document.getElementById("accountCreateForm");
  const loginForm = document.getElementById("accountLoginForm");
  const details = document.getElementById("accountDetails");
  const status = document.getElementById("accountStatus");
  const createSubmit = document.getElementById("accountCreateSubmit");
  const loginSubmit = document.getElementById("accountLoginSubmit");
  const logoutBtn = document.getElementById("accountLogoutBtn");
  const deleteForm = document.getElementById("accountDeleteForm");
  const deleteToggle = document.getElementById("accountDeleteToggle");
  const deleteCancel = document.getElementById("accountDeleteCancel");
  const usernameValue = document.getElementById("accountUsernameValue");
  const emailValue = document.getElementById("accountEmailValue");
  const joinedValue = document.getElementById("accountJoinedValue");
  const activeValue = document.getElementById("accountActiveValue");
  const syncValue = document.getElementById("accountSyncValue");
  const levelsValue = document.getElementById("accountLevelsValue");
  const packsValue = document.getElementById("accountPacksValue");
  const stepsValue = document.getElementById("accountStepsValue");
  const pushesValue = document.getElementById("accountPushesValue");
  const avatarCanvas = document.getElementById("accountAvatarCanvas");
  const accountGuest = document.getElementById("accountGuest");

  if (!entryBtn || !accountView) return;

  let account = null;
  let mode = "create";
  let busy = false;
  let lastSyncedFingerprint = "";
  let activeSecondsDelta = 0;
  let lastActivityTick = Date.now();

  function setStatus(message = "", kind = "") {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function setBusy(next) {
    busy = Boolean(next);
    [createSubmit, loginSubmit, logoutBtn].forEach(button => {
      if (button) button.disabled = busy;
    });
  }

  function shouldSyncKey(key) {
    return EXACT_SYNC_KEYS.has(key)
      || key.startsWith("boxxy-pack-")
      || key.startsWith("push-bauhaus-v22-best-");
  }

  function refreshPackCatalog() {
    try {
      const packs = Array.isArray(window.BOXXY_LEVEL_PACKS) ? window.BOXXY_LEVEL_PACKS : [];
      const catalog = {};
      packs.forEach(pack => {
        if (!pack?.id) return;
        catalog[String(pack.id)] = {
          name: String(pack.displayName || pack.title || pack.id),
          levels: Array.isArray(pack.levels) ? pack.levels.length : 0
        };
      });
      localStorage.setItem(PACK_CATALOG_KEY, JSON.stringify(catalog));
    } catch (_) {}
  }

  function collectCloudState() {
    refreshPackCatalog();
    const state = {};
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key || !shouldSyncKey(key)) continue;
        const value = localStorage.getItem(key);
        if (value !== null) state[key] = value;
      }
    } catch (_) {}
    return state;
  }

  function stableStringify(value) {
    const sorted = {};
    Object.keys(value || {}).sort().forEach(key => { sorted[key] = value[key]; });
    return JSON.stringify(sorted);
  }

  function parseJson(value, fallback) {
    try {
      const parsed = JSON.parse(String(value ?? ""));
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function completedIndexesForPack(pack) {
    if (!pack?.id) return [];
    const current = parseJson(localStorage.getItem(`boxxy-pack-${pack.id}-completed-v1`), []);
    if (Array.isArray(current) && current.length) return current.map(Number).filter(Number.isInteger);
    if (pack.id === "microban") {
      const legacy = parseJson(localStorage.getItem("boxxy-completed-levels-v1"), []);
      if (Array.isArray(legacy)) return legacy.map(Number).filter(Number.isInteger);
    }
    return [];
  }

  function completedGameStats() {
    const packs = Array.isArray(window.BOXXY_LEVEL_PACKS) ? window.BOXXY_LEVEL_PACKS : [];
    let levels = 0;
    let packsCompleted = 0;
    packs.forEach(pack => {
      const completed = new Set(completedIndexesForPack(pack));
      levels += completed.size;
      const levelCount = Array.isArray(pack?.levels) ? pack.levels.length : 0;
      if (levelCount > 0 && completed.size >= levelCount) packsCompleted++;
    });
    const daily = parseJson(localStorage.getItem("boxxy-daily-completions-v1"), {});
    if (daily && typeof daily === "object" && !Array.isArray(daily)) levels += Object.keys(daily).length;
    return { levels, packsCompleted };
  }

  function completionHistoryTotals() {
    const packs = Array.isArray(window.BOXXY_LEVEL_PACKS) ? window.BOXXY_LEVEL_PACKS : [];
    let steps = 0;
    let pushes = 0;
    packs.forEach(pack => {
      const data = parseJson(localStorage.getItem(`boxxy-pack-${pack.id}-completion-stats-v1`), {});
      Object.values(data?.levels || {}).forEach(attempt => {
        if (!attempt || typeof attempt !== "object") return;
        steps += Math.max(0, Math.trunc(Number(attempt.moves) || 0));
        pushes += Math.max(0, Math.trunc(Number(attempt.pushes) || 0));
      });
    });
    const daily = parseJson(localStorage.getItem("boxxy-daily-completions-v1"), {});
    Object.values(daily && typeof daily === "object" && !Array.isArray(daily) ? daily : {}).forEach(attempt => {
      if (!attempt || typeof attempt !== "object") return;
      steps += Math.max(0, Math.trunc(Number(attempt.moves) || 0));
      pushes += Math.max(0, Math.trunc(Number(attempt.pushes) || 0));
    });
    return { steps, pushes };
  }

  function seedLifetimeStats() {
    try {
      const seed = completionHistoryTotals();
      if (localStorage.getItem(ALL_TIME_STEPS_KEY) == null) localStorage.setItem(ALL_TIME_STEPS_KEY, String(seed.steps));
      if (localStorage.getItem(ALL_TIME_PUSHES_KEY) == null) localStorage.setItem(ALL_TIME_PUSHES_KEY, String(seed.pushes));
    } catch (_) {}
  }

  function lifetimeStat(key) {
    try { return Math.max(0, Math.trunc(Number(localStorage.getItem(key)) || 0)); }
    catch (_) { return 0; }
  }

  function mergeArrays(leftValue, rightValue) {
    const left = parseJson(leftValue, []);
    const right = parseJson(rightValue, []);
    if (!Array.isArray(left) && !Array.isArray(right)) return leftValue ?? rightValue;
    const values = new Set([...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])]
      .map(Number).filter(Number.isInteger));
    return JSON.stringify([...values].sort((a, b) => a - b));
  }

  function betterAttempt(left, right) {
    if (!left) return right;
    if (!right) return left;
    const leftMoves = Number(left.moves);
    const rightMoves = Number(right.moves);
    if (Number.isFinite(leftMoves) && Number.isFinite(rightMoves) && leftMoves !== rightMoves) {
      return leftMoves < rightMoves ? left : right;
    }
    const leftTime = Number(left.seconds);
    const rightTime = Number(right.seconds);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime < rightTime ? left : right;
    }
    return Number(left.completedAt || 0) >= Number(right.completedAt || 0) ? left : right;
  }

  function mergeDailyCompletions(leftValue, rightValue) {
    const left = parseJson(leftValue, {});
    const right = parseJson(rightValue, {});
    const result = { ...(right && typeof right === "object" ? right : {}) };
    Object.entries(left && typeof left === "object" ? left : {}).forEach(([date, attempt]) => {
      result[date] = betterAttempt(attempt, result[date]);
    });
    return JSON.stringify(result);
  }

  function mergeCompletionStats(leftValue, rightValue) {
    const left = parseJson(leftValue, {});
    const right = parseJson(rightValue, {});
    const result = { version: 1, levels: { ...(right?.levels || {}) } };
    Object.entries(left?.levels || {}).forEach(([level, attempt]) => {
      result.levels[level] = betterAttempt(attempt, result.levels[level]);
    });
    return JSON.stringify(result);
  }

  function mergePackCatalog(leftValue, rightValue) {
    const left = parseJson(leftValue, {});
    const right = parseJson(rightValue, {});
    const merged = { ...(right && typeof right === "object" ? right : {}) };
    Object.entries(left && typeof left === "object" ? left : {}).forEach(([id, data]) => {
      const previous = merged[id] && typeof merged[id] === "object" ? merged[id] : {};
      merged[id] = {
        name: String(data?.name || previous?.name || id),
        levels: Math.max(0, Number(data?.levels) || 0, Number(previous?.levels) || 0)
      };
    });
    return JSON.stringify(merged);
  }

  function mergeLevelAttempts(leftValue, rightValue) {
    const left = parseJson(leftValue, {});
    const right = parseJson(rightValue, {});
    const result = { version: 1, levels: {} };
    const sourceLevels = [right?.levels || {}, left?.levels || {}];
    sourceLevels.forEach(levels => {
      Object.entries(levels).forEach(([key, entry]) => {
        if (!entry || typeof entry !== "object") return;
        const current = result.levels[key] && typeof result.levels[key] === "object" ? result.levels[key] : {};
        const devices = { ...(current.devices || {}) };
        Object.entries(entry.devices && typeof entry.devices === "object" ? entry.devices : {}).forEach(([deviceId, deviceEntry]) => {
          const incomingCount = Math.max(0, Math.trunc(Number(deviceEntry?.count) || 0));
          const incomingLastAt = Math.max(0, Number(deviceEntry?.lastAt) || 0);
          const old = devices[deviceId] && typeof devices[deviceId] === "object" ? devices[deviceId] : {};
          const oldCount = Math.max(0, Math.trunc(Number(old.count) || 0));
          const oldLastAt = Math.max(0, Number(old.lastAt) || 0);
          devices[deviceId] = {
            count: Math.max(oldCount, incomingCount),
            lastAt: Math.max(oldLastAt, incomingLastAt)
          };
        });
        const useIncoming = Number(entry.levelNumber || 0) || !current.levelNumber;
        result.levels[key] = {
          packId: String(entry.packId || current.packId || ""),
          packName: String(entry.packName || current.packName || entry.packId || ""),
          levelToken: String(entry.levelToken || current.levelToken || ""),
          levelNumber: useIncoming ? (Number(entry.levelNumber) || 0) : (Number(current.levelNumber) || 0),
          levelName: String(entry.levelName || current.levelName || ""),
          devices
        };
      });
    });
    return JSON.stringify(result);
  }

  function newerCheckpoint(leftValue, rightValue) {
    const left = parseJson(leftValue, null);
    const right = parseJson(rightValue, null);
    if (!left) return rightValue;
    if (!right) return leftValue;
    const leftTime = Date.parse(left.savedAt || "") || 0;
    const rightTime = Date.parse(right.savedAt || "") || 0;
    return leftTime >= rightTime ? leftValue : rightValue;
  }

  function mergeStreak(leftValue, rightValue) {
    const left = parseJson(leftValue, null);
    const right = parseJson(rightValue, null);
    if (!left) return rightValue;
    if (!right) return leftValue;
    const leftDate = String(left.lastQualifiedDate || "");
    const rightDate = String(right.lastQualifiedDate || "");
    if (leftDate !== rightDate) return leftDate > rightDate ? leftValue : rightValue;
    return Number(left.count || 0) >= Number(right.count || 0) ? leftValue : rightValue;
  }

  function hasMeaningfulProgress(state) {
    return Object.entries(state || {}).some(([key, value]) => {
      if (/-(?:completed|assisted)-v1$/.test(key)) return parseJson(value, []).length > 0;
      if (/-progress-v1$/.test(key)) return Number(value) > 0;
      if (/-best-[^-]+-v1$/.test(key) || key.startsWith("push-bauhaus-v22-best-")) return Number(value) > 0;
      if (/-position-\d+-v1$/.test(key)) return Boolean(value);
      if (key === "boxxy-daily-completions-v1") return Object.keys(parseJson(value, {})).length > 0;
      return false;
    });
  }

  function mergeCloudState(localState, remoteState) {
    const local = localState || {};
    const remote = remoteState && typeof remoteState === "object" ? remoteState : {};
    const localHasProgress = hasMeaningfulProgress(local);
    const merged = { ...(localHasProgress ? remote : local), ...(localHasProgress ? local : remote) };
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    keys.forEach(key => {
      const left = local[key];
      const right = remote[key];
      if (left == null) { merged[key] = right; return; }
      if (right == null) { merged[key] = left; return; }

      if (/-completed-v1$/.test(key) || /-assisted-v1$/.test(key)) {
        merged[key] = mergeArrays(left, right);
      } else if (/-progress-v1$/.test(key) || key === "boxxy-level-progress-v1") {
        merged[key] = String(Math.max(Number(left) || 0, Number(right) || 0));
      } else if (/-best-[^-]+-v1$/.test(key) || key.startsWith("push-bauhaus-v22-best-")) {
        const leftNumber = Number(left);
        const rightNumber = Number(right);
        if (leftNumber > 0 && rightNumber > 0) merged[key] = String(Math.min(leftNumber, rightNumber));
        else merged[key] = leftNumber > 0 ? String(leftNumber) : String(rightNumber);
      } else if (/-completion-stats-v1$/.test(key)) {
        merged[key] = mergeCompletionStats(left, right);
      } else if (key === "boxxy-daily-completions-v1") {
        merged[key] = mergeDailyCompletions(left, right);
      } else if (key === "boxxy-daily-streak-v1") {
        merged[key] = mergeStreak(left, right);
      } else if (/-position-\d+-v1$/.test(key)) {
        merged[key] = newerCheckpoint(left, right);
      } else if (key === "boxxy-additional-packs-unlocked-v1") {
        merged[key] = (left === "true" || right === "true") ? "true" : left;
      } else if (key === ALL_TIME_STEPS_KEY || key === ALL_TIME_PUSHES_KEY) {
        merged[key] = String(Math.max(Number(left) || 0, Number(right) || 0));
      } else if (key === LEVEL_ATTEMPTS_KEY) {
        merged[key] = mergeLevelAttempts(left, right);
      } else if (key === PACK_CATALOG_KEY) {
        merged[key] = mergePackCatalog(left, right);
      } else if (!localHasProgress) {
        merged[key] = right;
      } else {
        merged[key] = left;
      }
    });

    return merged;
  }

  function applyCloudState(state) {
    let changed = false;
    Object.entries(state || {}).forEach(([key, value]) => {
      if (!shouldSyncKey(key) || typeof value !== "string") return;
      try {
        if (localStorage.getItem(key) !== value) {
          localStorage.setItem(key, value);
          changed = true;
        }
      } catch (_) {}
    });
    return changed;
  }

  async function requestAccount(payload = null, options = {}) {
    const requestOptions = {
      method: payload ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: payload ? { "content-type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      keepalive: Boolean(options.keepalive)
    };
    const response = await fetch(API, requestOptions);
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok && !data.error) data.error = `Request failed (${response.status}).`;
    return { response, data };
  }

  function formatDate(timestamp) {
    if (!Number(timestamp)) return "—";
    try { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(Number(timestamp))); }
    catch (_) { return "—"; }
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.trunc(Number(seconds) || 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function render() {
    const loggedIn = Boolean(account);
    entryBtn.classList.toggle("account-entry-logged-in", loggedIn);
    entryBtn.setAttribute("aria-label", loggedIn ? `Logged in as ${account.username}. Open account details.` : "Make or sign in to a BOXXY account");
    if (entryLabel) entryLabel.textContent = loggedIn ? `LOGGED IN AS ${account.username}` : "MAKE AN ACCOUNT / SIGN IN";

    if (accountGuest) accountGuest.hidden = loggedIn;
    if (details) details.hidden = !loggedIn;
    if (loggedIn) {
      if (usernameValue) usernameValue.textContent = account.username || "—";
      if (emailValue) emailValue.textContent = account.email || "—";
      if (joinedValue) joinedValue.textContent = formatDate(account.createdAt);
      if (activeValue) activeValue.textContent = formatTime((account.totalActiveSeconds || 0) + activeSecondsDelta);
      if (syncValue) syncValue.textContent = account.progressUpdatedAt ? formatDate(account.progressUpdatedAt) : "Waiting";
      const gameStats = completedGameStats();
      if (levelsValue) levelsValue.textContent = gameStats.levels.toLocaleString("en-GB");
      if (packsValue) packsValue.textContent = gameStats.packsCompleted.toLocaleString("en-GB");
      if (stepsValue) stepsValue.textContent = lifetimeStat(ALL_TIME_STEPS_KEY).toLocaleString("en-GB");
      if (pushesValue) pushesValue.textContent = lifetimeStat(ALL_TIME_PUSHES_KEY).toLocaleString("en-GB");
      if (avatarCanvas) window.CharacterStyler?.draw?.(avatarCanvas, "player-front");
    }
    renderMode();
  }

  function renderMode() {
    const creating = mode === "create";
    createModeBtn?.classList.toggle("active", creating);
    loginModeBtn?.classList.toggle("active", !creating);
    createModeBtn?.setAttribute("aria-pressed", String(creating));
    loginModeBtn?.setAttribute("aria-pressed", String(!creating));
    if (createForm) createForm.hidden = !creating;
    if (loginForm) loginForm.hidden = creating;
  }

  function openAccount() {
    if (mainView) mainView.hidden = true;
    if (keyboardView) keyboardView.hidden = true;
    accountView.hidden = false;
    setStatus("");
    render();
    requestAnimationFrame(() => backBtn?.focus?.({ preventScroll: true }));
  }

  function closeAccount() {
    accountView.hidden = true;
    if (keyboardView) keyboardView.hidden = true;
    if (mainView) mainView.hidden = false;
    entryBtn.focus?.({ preventScroll: true });
  }

  async function absorbAccountResponse(data, options = {}) {
    account = data?.authenticated ? data.account : null;
    if (!account) {
      lastSyncedFingerprint = "";
      try { localStorage.removeItem(ACCOUNT_MARKER_KEY); } catch (_) {}
      render();
      return false;
    }
    try { localStorage.setItem(ACCOUNT_MARKER_KEY, "1"); } catch (_) {}

    const local = collectCloudState();
    const remote = data.progress && typeof data.progress === "object" ? data.progress : {};
    const merged = mergeCloudState(local, remote);
    const changed = applyCloudState(merged);
    lastSyncedFingerprint = stableStringify(merged);
    render();

    if (options.pushMerged && stableStringify(remote) !== lastSyncedFingerprint) {
      try {
        const sync = await requestAccount({ action: "sync", progress: merged, activeSecondsDelta: 0 });
        if (sync.response.ok && sync.data.account) {
          account = sync.data.account;
          render();
        }
      } catch (_) {}
    }
    return changed;
  }

  async function initialAccountCheck() {
    try {
      if (localStorage.getItem(ACCOUNT_MARKER_KEY) !== "1") return;
      const { response, data } = await requestAccount();
      if (!response.ok && response.status !== 401) {
        setStatus(data.error || "Account service is not ready yet.", "error");
        return;
      }
      const changed = await absorbAccountResponse(data, { pushMerged: true });
      if (changed && !sessionStorage.getItem("boxxy-account-merge-reload-v1")) {
        sessionStorage.setItem("boxxy-account-merge-reload-v1", "1");
        location.reload();
        return;
      }
      sessionStorage.removeItem("boxxy-account-merge-reload-v1");
    } catch (_) {
      /* The game remains fully usable if the optional account service is unavailable. */
    }
  }

  async function syncNow(force = false) {
    if (!account || busy) return false;
    const progress = collectCloudState();
    const fingerprint = stableStringify(progress);
    if (!force && fingerprint === lastSyncedFingerprint && activeSecondsDelta < ACTIVITY_SYNC_SECONDS) return false;

    const delta = Math.max(0, Math.trunc(activeSecondsDelta));
    try {
      const { response, data } = await requestAccount({
        action: "sync",
        progress,
        activeSecondsDelta: delta
      }, { keepalive: force });
      if (response.status === 401) {
        account = null;
        lastSyncedFingerprint = "";
        render();
        return false;
      }
      if (!response.ok) return false;
      activeSecondsDelta = Math.max(0, activeSecondsDelta - delta);
      lastSyncedFingerprint = fingerprint;
      if (data.account) account = data.account;
      render();
      return true;
    } catch (_) {
      return false;
    }
  }

  createModeBtn?.addEventListener("click", () => { mode = "create"; setStatus(""); renderMode(); });
  loginModeBtn?.addEventListener("click", () => { mode = "login"; setStatus(""); renderMode(); });
  entryBtn.addEventListener("click", openAccount);
  backBtn?.addEventListener("click", closeAccount);

  createForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(createForm);
    setBusy(true);
    setStatus("CREATING ACCOUNT…");
    try {
      const { response, data } = await requestAccount({
        action: "register",
        username: form.get("username"),
        email: form.get("email"),
        password: form.get("password"),
        termsAccepted: form.get("termsAccepted") === "yes",
        progress: collectCloudState()
      });
      if (!response.ok) {
        setStatus(data.error || "Account could not be created.", "error");
        return;
      }
      await absorbAccountResponse(data);
      setStatus("ACCOUNT CREATED · PROGRESS SAVED", "success");
      createForm.reset();
    } catch (_) {
      setStatus("Account service could not be reached.", "error");
    } finally {
      setBusy(false);
    }
  });

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(loginForm);
    setBusy(true);
    setStatus("SIGNING IN…");
    try {
      const { response, data } = await requestAccount({
        action: "login",
        identity: form.get("identity"),
        password: form.get("password")
      });
      if (!response.ok) {
        setStatus(data.error || "Sign in failed.", "error");
        return;
      }
      const changed = await absorbAccountResponse(data, { pushMerged: true });
      loginForm.reset();
      setStatus("SIGNED IN · PROGRESS SYNCED", "success");
      if (changed) {
        sessionStorage.setItem("boxxy-account-merge-reload-v1", "1");
        setTimeout(() => location.reload(), 250);
      }
    } catch (_) {
      setStatus("Account service could not be reached.", "error");
    } finally {
      setBusy(false);
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    if (busy) return;
    await syncNow(true);
    setBusy(true);
    try { await requestAccount({ action: "logout" }); } catch (_) {}
    account = null;
    activeSecondsDelta = 0;
    lastSyncedFingerprint = "";
    try { localStorage.removeItem(ACCOUNT_MARKER_KEY); } catch (_) {}
    setBusy(false);
    setStatus("SIGNED OUT", "success");
    render();
  });

  deleteToggle?.addEventListener("click", () => {
    if (!deleteForm) return;
    deleteForm.hidden = false;
    deleteToggle.hidden = true;
    deleteForm.querySelector("input")?.focus?.();
  });

  deleteCancel?.addEventListener("click", () => {
    if (!deleteForm) return;
    deleteForm.reset();
    deleteForm.hidden = true;
    if (deleteToggle) deleteToggle.hidden = false;
  });

  deleteForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !account) return;
    const form = new FormData(deleteForm);
    setBusy(true);
    setStatus("DELETING ACCOUNT…");
    try {
      const { response, data } = await requestAccount({ action: "delete", password: form.get("password") });
      if (!response.ok) {
        setStatus(data.error || "Account could not be deleted.", "error");
        return;
      }
      account = null;
      activeSecondsDelta = 0;
      lastSyncedFingerprint = "";
      try { localStorage.removeItem(ACCOUNT_MARKER_KEY); } catch (_) {}
      deleteForm.reset();
      deleteForm.hidden = true;
      if (deleteToggle) deleteToggle.hidden = false;
      setStatus("ACCOUNT DELETED · LOCAL GAME PROGRESS KEPT", "success");
      render();
    } catch (_) {
      setStatus("Account service could not be reached.", "error");
    } finally {
      setBusy(false);
    }
  });

  setInterval(() => {
    const now = Date.now();
    const seconds = Math.max(0, Math.min(15, Math.round((now - lastActivityTick) / 1000)));
    lastActivityTick = now;
    if (account && document.visibilityState === "visible" && document.hasFocus()) activeSecondsDelta += seconds;
  }, 5000);

  setInterval(() => { syncNow(false); }, SYNC_INTERVAL_MS);
  window.addEventListener("pagehide", () => {
    if (!account) return;
    const changed = stableStringify(collectCloudState()) !== lastSyncedFingerprint;
    if (changed || activeSecondsDelta >= 10) syncNow(true);
  });

  document.addEventListener("visibilitychange", () => {
    lastActivityTick = Date.now();
    if (document.visibilityState === "hidden" && account && activeSecondsDelta >= 30) syncNow(true);
  });

  seedLifetimeStats();
  render();
  initialAccountCheck();
})();
