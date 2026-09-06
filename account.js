/* BOXXY v331 — adds safe Google disconnect for password accounts and stabilises Google button rendering in the account sheet. */
/* BOXXY v329 — optional Google sign-in links to the existing BOXXY user/session/save architecture. */
/* BOXXY v327 — signed-in Daily completions request an immediate cloud sync so leaderboard results can refresh without waiting for the periodic sync. */
/* BOXXY v323 — standard box and target style preference joins account cloud sync. */
/* BOXXY v291 — redirect-safe offline cache generation for reliable iOS PWA relaunches. */
/* BOXXY v290 — Android native install handoff added without changing the iPhone or desktop offline flows. */
/* BOXXY v289 — signed-in offline download, iPhone Home Screen handoff and offline account continuity. */
/* BOXXY v281 — account medals added alongside cloud sync, gameplay statistics and level-attempt history. */
(() => {
  "use strict";

  const API = "/api/account";
  const GOOGLE_CLIENT_ID = "369102198200-ntq5mn9pb2s2ftf5h0uo6akm8ms6m25t.apps.googleusercontent.com";
  const SYNC_INTERVAL_MS = 30000;
  const ACTIVITY_SYNC_SECONDS = 300;
  const ACCOUNT_MARKER_KEY = "boxxy-account-known-v1";
  const ALL_TIME_STEPS_KEY = "boxxy-all-time-steps-v1";
  const ALL_TIME_PUSHES_KEY = "boxxy-all-time-pushes-v1";
  const LEVEL_ATTEMPTS_KEY = "boxxy-level-attempts-v1";
  const PACK_CATALOG_KEY = "boxxy-pack-catalog-v1";
  const OFFLINE_ACCOUNT_SNAPSHOT_KEY = "boxxy-offline-account-snapshot-v1";
  const OFFLINE_REQUEST_COOKIE = "boxxy_offline_requested";
  const OFFLINE_CACHE_NAME = "boxxy-offline-v2";
  const OFFLINE_META_URL = "/__boxxy_offline_meta__";
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
    "boxxy-board-style-v1",
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
  const modeSwitch = document.getElementById("accountModeSwitch");
  const createForm = document.getElementById("accountCreateForm");
  const loginForm = document.getElementById("accountLoginForm");
  const googleGuest = document.getElementById("accountGoogleGuest");
  const googleSignInBtn = document.getElementById("accountGoogleSignInBtn");
  const googleRegistration = document.getElementById("accountGoogleRegistration");
  const googleRegistrationEmail = document.getElementById("accountGoogleRegistrationEmail");
  const googleCreateForm = document.getElementById("accountGoogleCreateForm");
  const googleCreateSubmit = document.getElementById("accountGoogleCreateSubmit");
  const googleCreateCancel = document.getElementById("accountGoogleCreateCancel");
  const details = document.getElementById("accountDetails");
  const status = document.getElementById("accountStatus");
  const createSubmit = document.getElementById("accountCreateSubmit");
  const loginSubmit = document.getElementById("accountLoginSubmit");
  const logoutBtn = document.getElementById("accountLogoutBtn");
  const deleteForm = document.getElementById("accountDeleteForm");
  const deleteToggle = document.getElementById("accountDeleteToggle");
  const deleteCancel = document.getElementById("accountDeleteCancel");
  const deleteText = document.getElementById("accountDeleteText");
  const deletePasswordLabel = document.getElementById("accountDeletePasswordLabel");
  const deletePasswordConfirm = document.getElementById("accountDeletePasswordConfirm");
  const googleDeleteBtn = document.getElementById("accountGoogleDeleteBtn");
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
  const medals = document.getElementById("accountMedals");
  const medalsEmpty = document.getElementById("accountMedalsEmpty");
  const accountGuest = document.getElementById("accountGuest");
  const googleLinked = document.getElementById("accountGoogleLinked");
  const googleLinkedEmail = document.getElementById("accountGoogleLinkedEmail");
  const googleDisconnectBtn = document.getElementById("accountGoogleDisconnectBtn");
  const googleLink = document.getElementById("accountGoogleLink");
  const googleLinkBtn = document.getElementById("accountGoogleLinkBtn");
  const offlineBtn = document.getElementById("accountOfflineBtn");
  const offlineHelp = document.getElementById("accountOfflineHelp");
  const offlineGuide = document.getElementById("accountOfflineGuide");
  const completeAccountPrompt = document.getElementById("completeAccountPrompt");
  const completeCloseBtn = document.getElementById("completeCloseBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  if (!entryBtn || !accountView) return;

  let account = null;
  let mode = "create";
  let busy = false;
  let lastSyncedFingerprint = "";
  let activeSecondsDelta = 0;
  let lastActivityTick = Date.now();
  let offlineBusy = false;
  let deferredAndroidInstallPrompt = null;
  let androidOfflineReady = false;
  let googleReady = false;
  let pendingGoogleCredential = "";
  let googleRenderTimer = 0;

  function setStatus(message = "", kind = "") {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function setBusy(next) {
    busy = Boolean(next);
    [createSubmit, loginSubmit, googleCreateSubmit, googleDisconnectBtn, logoutBtn, deletePasswordConfirm].forEach(button => {
      if (button) button.disabled = busy;
    });
  }

  function isStandaloneDisplay() {
    return Boolean(window.navigator.standalone) || window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  }

  function isAppleMobile() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAndroidMobile() {
    return /Android/i.test(navigator.userAgent || "");
  }

  function prepareAndroidInstallPrompt() {
    if (!isAndroidMobile() || isStandaloneDisplay()) return;

    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredAndroidInstallPrompt = event;
      if (account) refreshOfflineButton();
    });

    window.addEventListener("appinstalled", () => {
      deferredAndroidInstallPrompt = null;
      if (offlineHelp && account) offlineHelp.textContent = "The playable game is stored on this device and BOXXY is installed.";
      setStatus("BOXXY INSTALLED · OFFLINE PLAY READY", "success");
      refreshOfflineButton();
    });

    // Android needs an installed service worker before some browsers will
    // advertise the native PWA install prompt. Registration alone does not
    // download BOXXY's opt-in offline pack.
    registerOfflineWorker().catch(() => {});
  }

  function promptAndroidInstallNow() {
    if (!isAndroidMobile() || isStandaloneDisplay() || !deferredAndroidInstallPrompt) return null;

    const installPrompt = deferredAndroidInstallPrompt;
    deferredAndroidInstallPrompt = null;
    try {
      // Must be invoked directly from the player's button press so Android's
      // browser is allowed to show its native install sheet.
      const shown = installPrompt.prompt();
      return Promise.resolve(shown)
        .then(() => installPrompt.userChoice)
        .then(choice => {
          if (choice?.outcome === "accepted") {
            if (offlineHelp) offlineHelp.textContent = "BOXXY is being added to your device. The offline game will be ready when the download finishes.";
          } else if (offlineHelp) {
            offlineHelp.textContent = "Offline play is still available here. You can install BOXXY later from your browser menu.";
          }
          return choice;
        })
        .catch(() => null);
    } catch (_) {
      return null;
    }
  }

  function saveOfflineAccountSnapshot() {
    if (!account) return;
    try {
      localStorage.setItem(OFFLINE_ACCOUNT_SNAPSHOT_KEY, JSON.stringify({
        username: account.username || "",
        email: account.email || "",
        googleLinked: Boolean(account.googleLinked),
        googleEmail: account.googleEmail || "",
        passwordEnabled: account.passwordEnabled !== false,
        createdAt: Number(account.createdAt) || 0,
        totalActiveSeconds: Number(account.totalActiveSeconds) || 0,
        progressUpdatedAt: Number(account.progressUpdatedAt) || 0
      }));
    } catch (_) {}
  }

  function loadOfflineAccountSnapshot() {
    try {
      const value = JSON.parse(localStorage.getItem(OFFLINE_ACCOUNT_SNAPSHOT_KEY) || "null");
      return value && typeof value === "object" && value.username ? value : null;
    } catch (_) {
      return null;
    }
  }

  function clearOfflineAccountSnapshot() {
    try { localStorage.removeItem(OFFLINE_ACCOUNT_SNAPSHOT_KEY); } catch (_) {}
  }

  function offlineRequestCookieValue() {
    const prefix = `${OFFLINE_REQUEST_COOKIE}=`;
    return document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length) || "";
  }

  function setOfflineRequestCookie(enabled = true) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    if (enabled) {
      const version = encodeURIComponent(String(window.BOXXY_RELEASE?.version || "291"));
      document.cookie = `${OFFLINE_REQUEST_COOKIE}=${version}; Max-Age=86400; Path=/; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${OFFLINE_REQUEST_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    }
  }

  function makeOfflineToast(message, done = false) {
    let toast = document.getElementById("boxxyOfflineToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "boxxyOfflineToast";
      toast.className = "boxxy-offline-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.toggle("done", Boolean(done));
    if (done) setTimeout(() => { toast.hidden = true; }, 3200);
  }

  async function readOfflineMeta() {
    if (!("caches" in window)) return null;
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const response = await cache.match(OFFLINE_META_URL);
      return response ? await response.json() : null;
    } catch (_) {
      return null;
    }
  }

  async function refreshOfflineButton() {
    if (!offlineBtn || !account || offlineBusy) return;
    const meta = await readOfflineMeta();
    const current = String(window.BOXXY_RELEASE?.version || "291");
    if (meta?.version === current) {
      androidOfflineReady = true;
      if (isAndroidMobile() && !isStandaloneDisplay() && deferredAndroidInstallPrompt) {
        offlineBtn.textContent = "INSTALL BOXXY";
        offlineBtn.classList.add("ready");
        if (offlineHelp) offlineHelp.textContent = "Offline play is ready. Tap once more to add BOXXY to your Android Home Screen.";
      } else {
        offlineBtn.textContent = "OFFLINE PLAY READY ✓";
        offlineBtn.classList.add("ready");
        if (offlineHelp) offlineHelp.textContent = "The playable game is stored on this device and can open without internet.";
      }
    } else if (meta?.version) {
      offlineBtn.textContent = "UPDATE OFFLINE COPY";
      offlineBtn.classList.remove("ready");
    } else {
      offlineBtn.textContent = "DOWNLOAD FOR OFFLINE PLAY";
      offlineBtn.classList.remove("ready");
    }
  }

  async function registerOfflineWorker() {
    if (!("serviceWorker" in navigator)) throw new Error("Offline play is not supported by this browser.");

    const version = String(window.BOXXY_RELEASE?.version || "291");
    const scriptPath = `/service-worker.js?v=${encodeURIComponent(version)}`;
    const registration = await navigator.serviceWorker.register(scriptPath, { scope: "/", updateViaCache: "none" });

    // An older BOXXY worker may already be active. Wait specifically for the
    // worker belonging to this release before asking it to rebuild the cache.
    const isCurrentWorker = worker => {
      if (!worker?.scriptURL) return false;
      try {
        return new URL(worker.scriptURL).searchParams.get("v") === version;
      } catch (_) {
        return false;
      }
    };

    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (registration.active?.state === "activated" && isCurrentWorker(registration.active)) {
        return registration;
      }

      const candidate = [registration.installing, registration.waiting].find(isCurrentWorker);
      if (candidate && candidate.state !== "redundant") {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, 250);
          const onStateChange = () => {
            if (candidate.state === "activated" || candidate.state === "redundant") {
              clearTimeout(timer);
              candidate.removeEventListener("statechange", onStateChange);
              resolve();
            }
          };
          candidate.addEventListener("statechange", onStateChange);
          onStateChange();
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw new Error("Offline update did not finish installing. Please try again.");
  }

  async function cacheBoxxyForOffline({ automatic = false } = {}) {
    if (offlineBusy || !account) return false;
    offlineBusy = true;
    if (offlineBtn) {
      offlineBtn.disabled = true;
      offlineBtn.classList.remove("ready");
      offlineBtn.textContent = "PREPARING OFFLINE PLAY…";
    }
    if (offlineGuide) offlineGuide.hidden = true;
    if (offlineHelp) offlineHelp.textContent = "Downloading the complete playable game to this device…";
    if (automatic) makeOfflineToast("BOXXY OFFLINE DOWNLOAD · STARTING…");

    let onMessage = null;
    try {
      const registration = await registerOfflineWorker();
      const worker = registration.active || registration.waiting || registration.installing;
      if (!worker) throw new Error("Offline worker did not start.");

      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (onMessage) navigator.serviceWorker.removeEventListener("message", onMessage);
          reject(new Error("Offline download timed out."));
        }, 180000);
        onMessage = event => {
          const data = event.data || {};
          if (data.type === "BOXXY_OFFLINE_PROGRESS") {
            const total = Math.max(1, Number(data.total) || 1);
            const done = Math.max(0, Number(data.done) || 0);
            const percent = Math.min(100, Math.round((done / total) * 100));
            if (offlineBtn) offlineBtn.textContent = `DOWNLOADING ${percent}%…`;
            if (automatic) makeOfflineToast(`BOXXY OFFLINE DOWNLOAD · ${percent}%`);
          } else if (data.type === "BOXXY_OFFLINE_COMPLETE") {
            clearTimeout(timeout);
            navigator.serviceWorker.removeEventListener("message", onMessage);
            onMessage = null;
            resolve(data);
          } else if (data.type === "BOXXY_OFFLINE_ERROR") {
            clearTimeout(timeout);
            navigator.serviceWorker.removeEventListener("message", onMessage);
            onMessage = null;
            reject(new Error(data.message || "Offline download failed."));
          }
        };
        navigator.serviceWorker.addEventListener("message", onMessage);
        worker.postMessage({ type: "CACHE_ALL_BOXXY", version: String(window.BOXXY_RELEASE?.version || "291") });
      });

      setOfflineRequestCookie(false);
      if (offlineBtn) {
        offlineBtn.textContent = "OFFLINE PLAY READY ✓";
        offlineBtn.classList.add("ready");
      }
      if (offlineHelp) offlineHelp.textContent = "The playable game is stored on this device and can open without internet.";
      setStatus("OFFLINE PLAY READY", "success");
      if (automatic) makeOfflineToast("BOXXY IS READY FOR OFFLINE PLAY ✓", true);
      return Boolean(result);
    } catch (error) {
      if (onMessage) navigator.serviceWorker.removeEventListener("message", onMessage);
      if (offlineBtn) offlineBtn.textContent = "TRY OFFLINE DOWNLOAD AGAIN";
      if (offlineHelp) offlineHelp.textContent = error?.message || "Offline download could not be completed.";
      setStatus(error?.message || "Offline download could not be completed.", "error");
      if (automatic) makeOfflineToast("OFFLINE DOWNLOAD NEEDS INTERNET", true);
      return false;
    } finally {
      offlineBusy = false;
      if (offlineBtn) offlineBtn.disabled = false;
    }
  }

  async function beginOfflineSetup() {
    if (!account || offlineBusy) return;
    if (isAppleMobile() && !isStandaloneDisplay()) {
      // iOS/iPadOS creates a separate storage container for a Home Screen web app.
      // A short-lived cookie is intentionally used because login cookies are copied at install time.
      setOfflineRequestCookie(true);
      if (offlineGuide) offlineGuide.hidden = false;
      if (offlineHelp) offlineHelp.textContent = "Apple requires one Home Screen step before the offline files can be stored in the app.";
      if (offlineBtn) {
        offlineBtn.textContent = "READY — ADD TO HOME SCREEN";
        offlineBtn.classList.remove("ready");
      }
      setStatus("FOLLOW THE HOME SCREEN STEPS BELOW", "success");
      return;
    }

    if (isAndroidMobile() && !isStandaloneDisplay()) {
      // If the offline files are already present, a later Android install event
      // can use this same account button solely as the native install button.
      if (androidOfflineReady && deferredAndroidInstallPrompt) {
        promptAndroidInstallNow();
        return;
      }

      // Start the offline cache, then invoke Android's native prompt immediately
      // from this same tap. Keeping prompt() inside the original user gesture is
      // required by Chromium. The cache continues while the user answers it.
      const cachePromise = cacheBoxxyForOffline();
      const installChoicePromise = promptAndroidInstallNow();
      const cached = await cachePromise;
      if (cached) androidOfflineReady = true;
      if (installChoicePromise) await installChoicePromise;
      await refreshOfflineButton();
      if (cached && !installChoicePromise && offlineHelp && !deferredAndroidInstallPrompt) {
        offlineHelp.textContent = "The playable game is stored on this device. If Android does not offer installation automatically, use your browser's Install app / Add to Home screen option.";
      }
      return;
    }

    await cacheBoxxyForOffline();
  }

  async function maybeResumeOfflineSetup() {
    if (!account || !isStandaloneDisplay() || !offlineRequestCookieValue()) return;
    const meta = await readOfflineMeta();
    const current = String(window.BOXXY_RELEASE?.version || "291");
    if (meta?.version === current) {
      setOfflineRequestCookie(false);
      refreshOfflineButton();
      return;
    }
    await cacheBoxxyForOffline({ automatic: true });
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
    if (changed) window.BoxxyBoardStyle?.reloadFromStorage?.();
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

  function googleButtonWidth(container) {
    const width = Math.floor(container?.getBoundingClientRect?.().width || 320);
    return Math.max(220, Math.min(400, width));
  }

  function renderGoogleButton(container, state, text = "continue_with") {
    if (!googleReady || !container || container.hidden || container.getClientRects().length === 0) return;
    const width = googleButtonWidth(container);
    const renderKey = `${state}|${text}|${width}`;
    if (container.dataset.googleRenderKey === renderKey && container.childElementCount > 0) return;
    try {
      container.replaceChildren();
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        logo_alignment: "left",
        width,
        state
      });
      container.dataset.googleRenderKey = renderKey;
    } catch (_) {
      delete container.dataset.googleRenderKey;
    }
  }

  function renderGoogleButtons() {
    if (!googleReady) return;
    if (!account && !pendingGoogleCredential) renderGoogleButton(googleSignInBtn, "guest", "signin_with");
    if (account && !account.googleLinked) renderGoogleButton(googleLinkBtn, "link", "continue_with");
    if (account && account.passwordEnabled === false && deleteForm && !deleteForm.hidden) {
      renderGoogleButton(googleDeleteBtn, "delete", "continue_with");
    }
  }

  function scheduleGoogleButtons() {
    if (googleRenderTimer) cancelAnimationFrame(googleRenderTimer);
    googleRenderTimer = requestAnimationFrame(() => {
      googleRenderTimer = 0;
      renderGoogleButtons();
    });
  }

  function initialiseGoogleIdentity() {
    if (googleReady || !window.google?.accounts?.id) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: "popup",
        auto_select: false
      });
      googleReady = true;
      renderGoogleButtons();
    } catch (_) {
      googleReady = false;
    }
  }

  function clearGoogleRegistration() {
    pendingGoogleCredential = "";
    if (googleCreateForm) googleCreateForm.reset();
    if (googleRegistrationEmail) googleRegistrationEmail.textContent = "—";
    renderMode();
  }

  function beginGoogleRegistration(credential, email) {
    pendingGoogleCredential = String(credential || "");
    if (googleRegistrationEmail) googleRegistrationEmail.textContent = String(email || "—");
    renderMode();
    requestAnimationFrame(() => googleCreateForm?.querySelector('input[name="username"]')?.focus?.({ preventScroll: true }));
  }

  function clearLocalAccountState() {
    account = null;
    activeSecondsDelta = 0;
    lastSyncedFingerprint = "";
    pendingGoogleCredential = "";
    try { localStorage.removeItem(ACCOUNT_MARKER_KEY); } catch (_) {}
    clearOfflineAccountSnapshot();
    setOfflineRequestCookie(false);
  }

  function disableGoogleAutoSelect() {
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch (_) {}
  }

  async function handleGoogleCredential(result) {
    const credential = String(result?.credential || "");
    const state = String(result?.state || "guest");
    if (!credential || busy) return;

    if (state === "guest") {
      setBusy(true);
      setStatus("SIGNING IN WITH GOOGLE…");
      try {
        const { response, data } = await requestAccount({ action: "google_auth", googleCredential: credential });
        if (!response.ok) {
          setStatus(data.error || "Google sign in failed.", "error");
          return;
        }
        if (data.googleRegistrationRequired) {
          beginGoogleRegistration(credential, data.googleEmail);
          setStatus("GOOGLE VERIFIED · CHOOSE A BOXXY USERNAME", "success");
          return;
        }
        const changed = await absorbAccountResponse(data, { pushMerged: true });
        setStatus("SIGNED IN WITH GOOGLE · PROGRESS SYNCED", "success");
        if (changed) {
          sessionStorage.setItem("boxxy-account-merge-reload-v1", "1");
          setTimeout(() => location.reload(), 250);
        }
      } catch (_) {
        setStatus("Google sign in could not reach the BOXXY account service.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (state === "link") {
      if (!account) return;
      setBusy(true);
      setStatus("LINKING GOOGLE…");
      try {
        const { response, data } = await requestAccount({ action: "link_google", googleCredential: credential });
        if (!response.ok) {
          setStatus(data.error || "Google account could not be linked.", "error");
          return;
        }
        if (data.account) account = data.account;
        saveOfflineAccountSnapshot();
        render();
        setStatus("GOOGLE ACCOUNT LINKED", "success");
      } catch (_) {
        setStatus("Google linking could not reach the BOXXY account service.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (state === "delete") {
      if (!account || account.passwordEnabled !== false) return;
      setBusy(true);
      setStatus("CONFIRMING WITH GOOGLE…");
      try {
        const { response, data } = await requestAccount({ action: "delete", googleCredential: credential });
        if (!response.ok) {
          setStatus(data.error || "Account could not be deleted.", "error");
          return;
        }
        clearLocalAccountState();
        disableGoogleAutoSelect();
        if (deleteForm) {
          deleteForm.reset();
          deleteForm.hidden = true;
        }
        if (deleteToggle) deleteToggle.hidden = false;
        setStatus("ACCOUNT DELETED · LOCAL GAME PROGRESS KEPT", "success");
        render();
      } catch (_) {
        setStatus("Account service could not be reached.", "error");
      } finally {
        setBusy(false);
      }
    }
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

  function renderMedals() {
    if (!medals || !medalsEmpty) return;
    medals.replaceChildren();
    let earned = 0;

    const streakSource = document.getElementById("dailyStreak");
    const streakNumber = Number(document.getElementById("dailyStreakNumber")?.textContent || 0);
    if (streakSource && streakNumber > 0) {
      const streak = document.createElement("span");
      streak.className = "daily-streak-badge account-medal-static";
      streak.dataset.tier = streakSource.dataset.tier || "green";
      streak.dataset.digits = streakSource.dataset.digits || String(Math.min(5, String(streakNumber).length));
      streak.setAttribute("aria-label", `Daily streak medal: ${streakNumber} ${streakNumber === 1 ? "day" : "days"}`);
      streak.innerHTML = `<span class="daily-streak-flame" aria-hidden="true"></span><span class="daily-streak-number" aria-hidden="true">${streakNumber}</span>`;
      medals.appendChild(streak);
      earned++;
    }

    const completedSources = document.querySelectorAll("#completedPackStars .completed-pack-star");
    completedSources.forEach(source => {
      const medal = document.createElement("span");
      medal.className = `${source.className} account-medal-static`;
      medal.style.cssText = source.style.cssText;
      medal.innerHTML = source.innerHTML;
      const label = source.getAttribute("aria-label") || source.title || "Completed puzzle pack medal";
      medal.setAttribute("aria-label", label.replace(/^View congratulations for /i, "Medal for "));
      medals.appendChild(medal);
      earned++;
    });

    medals.hidden = earned === 0;
    medalsEmpty.hidden = earned !== 0;
  }

  function render() {
    const loggedIn = Boolean(account);
    entryBtn.classList.toggle("account-entry-logged-in", loggedIn);
    entryBtn.setAttribute("aria-label", loggedIn ? `Logged in as ${account.username}. Open account details.` : "Make or sign in to a BOXXY account");
    if (entryLabel) entryLabel.textContent = loggedIn ? `LOGGED IN AS ${account.username}` : "MAKE AN ACCOUNT / SIGN IN";

    if (accountGuest) accountGuest.hidden = loggedIn;
    if (completeAccountPrompt) completeAccountPrompt.hidden = loggedIn;
    if (details) details.hidden = !loggedIn;
    if (loggedIn) {
      const googleOnly = account.passwordEnabled === false;
      if (googleLinked) googleLinked.hidden = !account.googleLinked;
      if (googleLink) googleLink.hidden = Boolean(account.googleLinked);
      if (googleLinkedEmail) googleLinkedEmail.textContent = account.googleEmail || account.email || "—";
      if (googleDisconnectBtn) googleDisconnectBtn.hidden = !account.googleLinked || googleOnly;
      if (deletePasswordLabel) deletePasswordLabel.hidden = googleOnly;
      if (deletePasswordConfirm) deletePasswordConfirm.hidden = googleOnly;
      if (googleDeleteBtn) googleDeleteBtn.hidden = !googleOnly;
      if (deleteText) deleteText.textContent = googleOnly
        ? "Deletes the BOXXY account and cloud copy. Confirm with the linked Google account. Progress already stored on this device remains here."
        : "Deletes the BOXXY account and cloud copy. Progress already stored on this device remains here.";
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
      renderMedals();
      saveOfflineAccountSnapshot();
      refreshOfflineButton();
    } else {
      if (googleLinked) googleLinked.hidden = true;
      if (googleDisconnectBtn) googleDisconnectBtn.hidden = true;
      if (googleLink) googleLink.hidden = false;
      if (offlineGuide) offlineGuide.hidden = true;
    }
    renderMode();
    renderGoogleButtons();
  }

  function renderMode() {
    const creating = mode === "create";
    const googleRegistering = Boolean(pendingGoogleCredential);
    createModeBtn?.classList.toggle("active", creating);
    loginModeBtn?.classList.toggle("active", !creating);
    createModeBtn?.setAttribute("aria-pressed", String(creating));
    loginModeBtn?.setAttribute("aria-pressed", String(!creating));
    if (modeSwitch) modeSwitch.hidden = googleRegistering;
    if (createForm) createForm.hidden = googleRegistering || !creating;
    if (loginForm) loginForm.hidden = googleRegistering || creating;
    if (googleGuest) googleGuest.hidden = googleRegistering;
    if (googleRegistration) googleRegistration.hidden = !googleRegistering;
    renderGoogleButtons();
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
      clearOfflineAccountSnapshot();
      render();
      return false;
    }
    try { localStorage.setItem(ACCOUNT_MARKER_KEY, "1"); } catch (_) {}
    saveOfflineAccountSnapshot();

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
    const standalone = isStandaloneDisplay();
    const markerKnown = (() => { try { return localStorage.getItem(ACCOUNT_MARKER_KEY) === "1"; } catch (_) { return false; } })();
    if (!markerKnown && !standalone) return;
    try {
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
      await maybeResumeOfflineSetup();
    } catch (_) {
      // A previously verified Home Screen account remains locally identifiable while offline.
      if (standalone) {
        const snapshot = loadOfflineAccountSnapshot();
        if (snapshot) {
          account = snapshot;
          render();
          setStatus("OFFLINE · PROGRESS WILL SYNC WHEN INTERNET RETURNS", "success");
        }
      }
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
        clearOfflineAccountSnapshot();
        render();
        return false;
      }
      if (!response.ok) return false;
      activeSecondsDelta = Math.max(0, activeSecondsDelta - delta);
      lastSyncedFingerprint = fingerprint;
      if (data.account) account = data.account;
      saveOfflineAccountSnapshot();
      render();
      return true;
    } catch (_) {
      return false;
    }
  }

  createModeBtn?.addEventListener("click", () => { mode = "create"; setStatus(""); renderMode(); });
  loginModeBtn?.addEventListener("click", () => { mode = "login"; setStatus(""); renderMode(); });
  completeAccountPrompt?.addEventListener("click", () => {
    mode = "create";
    setStatus("");
    completeCloseBtn?.click();
    settingsBtn?.click();
    openAccount();
    renderMode();
    requestAnimationFrame(() => createForm?.querySelector('input[name="username"]')?.focus?.({ preventScroll: true }));
  });
  entryBtn.addEventListener("click", openAccount);
  backBtn?.addEventListener("click", closeAccount);
  offlineBtn?.addEventListener("click", beginOfflineSetup);

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

  googleCreateForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !pendingGoogleCredential) return;
    const form = new FormData(googleCreateForm);
    setBusy(true);
    setStatus("CREATING BOXXY ACCOUNT…");
    try {
      const { response, data } = await requestAccount({
        action: "google_register",
        googleCredential: pendingGoogleCredential,
        username: form.get("username"),
        termsAccepted: form.get("termsAccepted") === "yes",
        progress: collectCloudState()
      });
      if (!response.ok) {
        setStatus(data.error || "Account could not be created.", "error");
        return;
      }
      pendingGoogleCredential = "";
      await absorbAccountResponse(data);
      googleCreateForm.reset();
      setStatus("ACCOUNT CREATED WITH GOOGLE · PROGRESS SAVED", "success");
    } catch (_) {
      setStatus("Account service could not be reached.", "error");
    } finally {
      setBusy(false);
    }
  });

  googleCreateCancel?.addEventListener("click", () => {
    clearGoogleRegistration();
    setStatus("");
  });

  logoutBtn?.addEventListener("click", async () => {
    if (busy) return;
    await syncNow(true);
    setBusy(true);
    try { await requestAccount({ action: "logout" }); } catch (_) {}
    clearLocalAccountState();
    disableGoogleAutoSelect();
    setBusy(false);
    setStatus("SIGNED OUT", "success");
    render();
  });

  googleDisconnectBtn?.addEventListener("click", async () => {
    if (busy || !account || !account.googleLinked || account.passwordEnabled === false) return;
    const confirmed = window.confirm(
      "Disconnect Google from this BOXXY account? Your username/password sign-in, progress and account history will stay unchanged."
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("DISCONNECTING GOOGLE…");
    try {
      const { response, data } = await requestAccount({ action: "disconnect_google" });
      if (!response.ok) {
        setStatus(data.error || "Google account could not be disconnected.", "error");
        return;
      }
      if (data.account) account = data.account;
      saveOfflineAccountSnapshot();
      render();
      setStatus("GOOGLE DISCONNECTED · BOXXY ACCOUNT KEPT", "success");
    } catch (_) {
      setStatus("Google disconnect could not reach the BOXXY account service.", "error");
    } finally {
      setBusy(false);
    }
  });

  deleteToggle?.addEventListener("click", () => {
    if (!deleteForm) return;
    deleteForm.hidden = false;
    deleteToggle.hidden = true;
    if (account?.passwordEnabled === false) scheduleGoogleButtons();
    else deleteForm.querySelector('input[name="password"]')?.focus?.();
  });

  deleteCancel?.addEventListener("click", () => {
    if (!deleteForm) return;
    deleteForm.reset();
    deleteForm.hidden = true;
    if (deleteToggle) deleteToggle.hidden = false;
    if (googleDeleteBtn) googleDeleteBtn.replaceChildren();
  });

  deleteForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !account || account.passwordEnabled === false) return;
    const form = new FormData(deleteForm);
    setBusy(true);
    setStatus("DELETING ACCOUNT…");
    try {
      const { response, data } = await requestAccount({ action: "delete", password: form.get("password") });
      if (!response.ok) {
        setStatus(data.error || "Account could not be deleted.", "error");
        return;
      }
      clearLocalAccountState();
      disableGoogleAutoSelect();
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

  window.addEventListener("boxxydailycompletionrecorded", async event => {
    if (!account) return;
    const dateKey = String(event?.detail?.date || "");
    const synced = await syncNow(true);
    if (synced && dateKey) {
      window.dispatchEvent(new CustomEvent("boxxyaccountdailysynced", { detail: { date: dateKey } }));
    }
  });

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

  window.onGoogleLibraryLoad = initialiseGoogleIdentity;
  initialiseGoogleIdentity();
  window.addEventListener("resize", scheduleGoogleButtons);

  prepareAndroidInstallPrompt();
  seedLifetimeStats();
  render();
  initialAccountCheck();
})();
