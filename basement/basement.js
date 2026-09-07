/* BOXXY v335 — verified completion views, responsive type and private prepared Daily catalogue. */
/* BOXXY v334 — sortable player totals, chronological pack completion records and readable text controls. */
/* BOXXY v323 — Basement shows each signed-in player’s standard board colour choices. */
/* BOXXY v308 — ordered progress, all-time activity labels, medals and current outfit previews. */
(() => {
  "use strict";
  const API = "/api/basement";
  const loginPanel = document.getElementById("loginPanel");
  const loginForm = document.getElementById("loginForm");
  const loginStatus = document.getElementById("loginStatus");
  const dashboard = document.getElementById("dashboard");
  const dashboardStatus = document.getElementById("dashboardStatus");
  const logoutBtn = document.getElementById("logoutBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const searchInput = document.getElementById("searchInput");
  const userRows = document.getElementById("userRows");
  const userCards = document.getElementById("userCards");
  const userCount = document.getElementById("userCount");
  const activeCount = document.getElementById("activeCount");
  const totalTime = document.getElementById("totalTime");
  const totalAttempts = document.getElementById("totalAttempts");
  const detailModal = document.getElementById("detailModal");
  const detailClose = document.getElementById("detailClose");
  const detailTitle = document.getElementById("detailTitle");
  const detailBody = document.getElementById("detailBody");
  const playersPanel = document.getElementById("playersPanel");
  const completionsPanel = document.getElementById("completionsPanel");
  const playersTab = document.getElementById("playersTab");
  const completionsTab = document.getElementById("completionsTab");
  const playerSortSelect = document.getElementById("playerSortSelect");
  const sortDirectionBtn = document.getElementById("sortDirectionBtn");
  const textSizeSelect = document.getElementById("textSizeSelect");
  const completionPackSelect = document.getElementById("completionPackSelect");
  const completionSearch = document.getElementById("completionSearch");
  const completionRows = document.getElementById("completionRows");
  const completionStatus = document.getElementById("completionStatus");
  const completionReviewToggle = document.getElementById("completionReviewToggle");
  const completionPackCards = document.getElementById("completionPackCards");
  const dailyPracticeTab = document.getElementById("dailyPracticeTab");
  const dailyPracticePanel = document.getElementById("dailyPracticePanel");
  const practiceSearch = document.getElementById("practiceSearch");
  const practiceFilter = document.getElementById("practiceFilter");
  const practiceCards = document.getElementById("practiceCards");
  const practiceStatus = document.getElementById("practiceStatus");
  const practiceCount = document.getElementById("practiceCount");
  const practiceModal = document.getElementById("practiceModal");
  const practiceModalTitle = document.getElementById("practiceModalTitle");
  const practiceClose = document.getElementById("practiceClose");
  const practiceFrame = document.getElementById("practiceFrame");
  let preparedDailies = [];
  let practiceLoaded = false;
  let practiceBusy = false;
  let practiceRequest = 0;
  let lastPracticeFocus = null;
  let users = [];
  let completions = [];
  let sortColumn = "lastSeenAt";
  let sortDirection = -1;
  let selectedView = "players";
  const SORT_COLUMNS = Object.freeze([
    ["username", "User", "text"], ["email", "Email", "text"],
    ["createdAt", "Joined", "number"], ["lastSeenAt", "Last active", "number"],
    ["totalActiveSeconds", "Total time", "number"],
    ["levelsCompleted", "Levels completed", "number"],
    ["packsCompleted", "Packs completed", "number"],
    ["totalSteps", "Steps", "number"], ["totalPushes", "Pushes", "number"],
    ["totalAttempts", "Attempts", "number"], ["dailyStreak", "Daily streak", "number"],
    ["activity7d", "Activity 7D", "number"],
    ["lastIp", "IP", "text"], ["lastLoginAt", "Last login", "number"],
    ["dailyCompleted", "Daily completed", "number"],
    ["pack:boxxy-original-puzzle-pack-of-50-levels", "BOXXY Originals levels", "number"],
    ["pack:microban", "Microban levels", "number"],
    ["pack:jigsaw", "Jigsaw levels", "number"],
    ["pack:alphabet-soup", "Alphabet levels", "number"],
    ["pack:starry-night", "Starry Night levels", "number"]
  ]);
  const SORT_BY_KEY = new Map(SORT_COLUMNS.map(item => [item[0], item]));
  const COMPLETION_PACKS = Object.freeze([
    ["boxxy-original-puzzle-pack-of-50-levels", "BOXXY Originals"],
    ["microban", "Microban"], ["jigsaw", "The Jigsaw"],
    ["exponentially", "Exponentially"], ["alphabet-soup", "Alphabet Soup"],
    ["starry-night", "Starry Night"]
  ]);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }
  function setStatus(element, text = "", kind = "") { if (element) { element.textContent = text; element.dataset.kind = kind; } }
  function dateTime(timestamp) {
    if (!Number(timestamp)) return "—";
    try { return new Intl.DateTimeFormat("en-GB", { dateStyle:"medium", timeStyle:"short" }).format(new Date(Number(timestamp))); }
    catch (_) { return "—"; }
  }
  function duration(seconds) {
    const value = Math.max(0, Math.trunc(Number(seconds) || 0));
    const days = Math.floor(value / 86400), hours = Math.floor((value % 86400) / 3600), mins = Math.floor((value % 3600) / 60);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }
  function browserDevice(userAgent) {
    const ua = String(userAgent || "");
    if (!ua) return "—";
    let browser = "Browser";
    let match = ua.match(/OPR\/([\d.]+)/);
    if (match) browser = `Opera ${match[1].split(".")[0]}`;
    else if ((match = ua.match(/Edg\/([\d.]+)/))) browser = `Edge ${match[1].split(".")[0]}`;
    else if ((match = ua.match(/Firefox\/([\d.]+)/))) browser = `Firefox ${match[1].split(".")[0]}`;
    else if ((match = ua.match(/Chrome\/([\d.]+)/))) browser = `Chrome ${match[1].split(".")[0]}`;
    else if ((match = ua.match(/Version\/([\d.]+).*Safari/))) browser = `Safari ${match[1].split(".")[0]}`;

    let device = "Unknown device";
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) device = "iPad";
    else if (/iPhone/.test(ua)) device = "iPhone";
    else if (/Android/.test(ua)) device = "Android";
    else if (/Windows/.test(ua)) device = "Windows";
    else if (/Macintosh|Mac OS X/.test(ua)) device = "macOS";
    else if (/Linux/.test(ua)) device = "Linux";
    return `${browser} · ${device}`;
  }
  function onlineRecently(user) {
    const last = Number(user?.lastSeenAt || 0);
    return last > 0 && Date.now() - last <= 60 * 60 * 1000;
  }
  function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function weekActivity(summary) {
    const entries = Array.isArray(summary?.activityDays) ? summary.activityDays : [];
    const byDate = new Map(entries.map(item => [String(item?.date || ""), item]));
    const formatter = new Intl.DateTimeFormat("en-GB", { weekday:"short", day:"numeric", month:"short" });
    const days = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const key = dayKey(date);
      const item = byDate.get(key) || {};
      const seconds = Math.max(0, Number(item.seconds) || 0);
      const intensity = seconds <= 0 ? 0 : seconds < 15 * 60 ? 1 : seconds < 45 * 60 ? 2 : seconds < 2 * 60 * 60 ? 3 : 4;
      days.push({ key, seconds, intensity, label: formatter.format(date), short: date.toLocaleDateString("en-GB", { weekday:"narrow" }), today: offset === 0 });
    }
    return days;
  }
  function activityStrip(summary, compact = false) {
    const days = weekActivity(summary);
    const hasAny = days.some(day => day.seconds > 0);
    const classes = `activity-week${compact ? " activity-week-compact" : ""}${hasAny ? "" : " activity-week-empty"}`;
    return `<div class="${classes}" aria-label="Activity over the last seven days">${days.map(day => `<div class="activity-day${day.today ? " is-today" : ""}" title="${escapeHtml(day.label)} · ${escapeHtml(duration(day.seconds))}"><i data-level="${day.intensity}" aria-hidden="true"></i><span>${escapeHtml(day.short)}</span></div>`).join("")}</div>`;
  }
  function onlineDot(user) {
    return onlineRecently(user) ? `<span class="online-dot" title="Online within the last hour" aria-label="Online within the last hour"></span>` : "";
  }

  const PROGRESS_PACK_ORDER = Object.freeze([
    { id: "boxxy-original-puzzle-pack-of-50-levels", label: "BOXXY" },
    { id: "microban", label: "MICROBAN" },
    { id: "jigsaw", label: "JIGSAW" },
    { id: "alphabet-soup", label: "ALPHABET" },
    { id: "starry-night", label: "STARRY" }
  ]);
  const MEDAL_PACKS = Object.freeze([
    { id: "boxxy-original-puzzle-pack-of-50-levels", label: "BOXXY Originals", levels: 50, kind: "star", colour: "#db3b27" },
    { id: "microban", label: "Microban", levels: 50, kind: "star", colour: "#171719" },
    { id: "jigsaw", label: "The Jigsaw", levels: 25, kind: "jigsaw", colour: "#00a6b2" },
    { id: "exponentially", label: "Exponentially", levels: 11, kind: "star", colour: "#8e44ad" },
    { id: "alphabet-soup", label: "Alphabet Soup", levels: 27, kind: "alphabet", colour: "#171719" },
    { id: "starry-night", label: "Starry Night", levels: 25, kind: "moon", colour: "#e5b32a" }
  ]);
  const STAR_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 62.7 34.2 93.5 37.5 70.5 58.3 77 88.5 50 73 23 88.5 29.5 58.3 6.5 37.5 37.3 34.2Z"/></svg>';
  const JIGSAW_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M8 26H34C34 14 40 6 50 6S66 14 66 26H82V38C82 42 84 44 88 44C94 44 98 48 98 54S94 66 88 66C84 66 82 68 82 72V90H64C64 78 58 72 50 72S36 78 36 90H8V64C20 64 28 58 28 50S20 36 8 36Z"/></svg>';
  const AVATAR_DEFAULT = Object.freeze({ bodyType:"boy", tshirt:"#df3526", trousers:"#292829", hair:"#292727", skin:"#ee9a60", shoes:"#292829" });
  const AVATAR_CATEGORIES = Object.freeze(["tshirt", "trousers", "hair", "skin", "shoes"]);
  const BOARD_STYLE_SWATCHES = Object.freeze({
    red:{label:"Red",hex:"#ec2826"}, blue:{label:"Blue",hex:"#1553ca"}, green:{label:"Green",hex:"#328545"},
    purple:{label:"Purple",hex:"#7433ac"}, "light-blue":{label:"Light blue",hex:"#64c0e8"}, teal:{label:"Teal",hex:"#119f9a"},
    grey:{label:"Grey",hex:"#7e7d7d"}, burgundy:{label:"Burgundy",hex:"#781f24"}, brown:{label:"Brown",hex:"#774c29"},
    orange:{label:"Orange",hex:"#f97915"}, yellow:{label:"Yellow",hex:"#f9bc18"}, lime:{label:"Lime",hex:"#a3cb16"},
    pink:{label:"Pink",hex:"#f16e8f"}, cream:{label:"Cream",hex:"#ece6d9"}
  });
  const avatarImageCache = new Map();

  function safeColour(value, fallback) {
    const colour = String(value || "").toLowerCase();
    return /^#[0-9a-f]{6}$/.test(colour) ? colour : fallback;
  }
  function avatarStyle(summary) {
    const raw = summary?.avatar && typeof summary.avatar === "object" ? summary.avatar : {};
    return {
      bodyType: raw.bodyType === "girl" ? "girl" : "boy",
      tshirt: safeColour(raw.tshirt, AVATAR_DEFAULT.tshirt),
      trousers: safeColour(raw.trousers, AVATAR_DEFAULT.trousers),
      hair: safeColour(raw.hair, AVATAR_DEFAULT.hair),
      skin: safeColour(raw.skin, AVATAR_DEFAULT.skin),
      shoes: safeColour(raw.shoes, AVATAR_DEFAULT.shoes)
    };
  }
  function loadAvatarImage(src) {
    if (avatarImageCache.has(src)) return avatarImageCache.get(src);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    avatarImageCache.set(src, promise);
    return promise;
  }
  async function drawBasementAvatar(canvas, summary) {
    if (!canvas) return;
    const style = avatarStyle(summary);
    const root = `/assets/characters/${style.bodyType}`;
    try {
      const [base, ...layers] = await Promise.all([
        loadAvatarImage(`${root}/base.png`),
        ...AVATAR_CATEGORIES.map(category => loadAvatarImage(`${root}/${category}.png`))
      ]);
      if (!canvas.isConnected) return;
      const width = 90, height = 78, sourceWidth = 300, sourceHeight = 260;
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.drawImage(base, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
      const scratch = document.createElement("canvas");
      scratch.width = width; scratch.height = height;
      const off = scratch.getContext("2d");
      AVATAR_CATEGORIES.forEach((category, index) => {
        const layer = layers[index];
        off.globalCompositeOperation = "source-over";
        off.clearRect(0, 0, width, height);
        off.fillStyle = style[category];
        off.fillRect(0, 0, width, height);
        off.globalCompositeOperation = "multiply";
        off.drawImage(layer, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
        off.globalCompositeOperation = "destination-in";
        off.drawImage(layer, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
        context.globalCompositeOperation = "destination-out";
        context.drawImage(layer, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
        context.globalCompositeOperation = "source-over";
        context.drawImage(scratch, 0, 0);
      });
      context.globalCompositeOperation = "source-over";
    } catch (_) {}
  }
  function renderAvatarCanvases(extraUsers = []) {
    const byId = new Map([...users, ...extraUsers].map(user => [String(user.id), user]));
    document.querySelectorAll("canvas[data-avatar-user]").forEach(canvas => {
      const user = byId.get(String(canvas.dataset.avatarUser || ""));
      if (user) drawBasementAvatar(canvas, user.summary);
    });
  }
  function outfitMini(summary) {
    const style = avatarStyle(summary);
    const character = style.bodyType === "girl" ? "OLIVE" : "INDI";
    return `<div class="outfit-mini" title="Current outfit"><span>${character}</span><i title="T-shirt" style="--swatch:${style.tshirt}"></i><i title="Trousers / skirt" style="--swatch:${style.trousers}"></i><i title="Shoes" style="--swatch:${style.shoes}"></i></div>`;
  }
  function boardStyle(summary) {
    const raw = summary?.boardStyle && typeof summary.boardStyle === "object" ? summary.boardStyle : {};
    let box = BOARD_STYLE_SWATCHES[raw.box] ? raw.box : "yellow";
    let target = BOARD_STYLE_SWATCHES[raw.target] ? raw.target : "red";
    if (box === target) target = box === "red" ? "yellow" : "red";
    return { box, target };
  }
  function boardStyleMini(summary) {
    const style = boardStyle(summary);
    const box = BOARD_STYLE_SWATCHES[style.box];
    const target = BOARD_STYLE_SWATCHES[style.target];
    return `<div class="board-style-mini" title="Standard board style"><span>BOX</span><i title="${escapeHtml(box.label)} box" style="--swatch:${box.hex}"></i><span>ON TARGET</span><i title="${escapeHtml(target.label)} box on target" style="--swatch:${target.hex}"></i></div>`;
  }
  function dailyStreakTier(streak) {
    if (streak >= 365) return "silver";
    if (streak >= 100) return "purple";
    if (streak >= 50) return "fire";
    if (streak >= 20) return "red";
    if (streak >= 5) return "blue";
    return "green";
  }
  function packIsComplete(summary, definition) {
    const data = summary?.packs?.[definition.id] || {};
    const levelCount = Math.max(0, Number(data.levelCount) || definition.levels || 0);
    return levelCount > 0 && Math.max(0, Number(data.completed) || 0) >= levelCount;
  }
  function medalRail(summary) {
    const medals = [];
    const streak = Math.max(0, Math.trunc(Number(summary?.dailyStreak) || 0));
    if (streak > 0) {
      medals.push(`<span class="basement-streak" data-tier="${dailyStreakTier(streak)}" title="Daily Boxxy streak: ${streak} day${streak === 1 ? "" : "s"}"><i></i><b>${streak}</b></span>`);
    }
    MEDAL_PACKS.forEach(definition => {
      if (!packIsComplete(summary, definition)) return;
      if (definition.kind === "alphabet") {
        medals.push(`<span class="basement-medal basement-medal-image" title="${definition.label} completed"><img src="/assets/ui/alphabet-soup-badge.png" alt=""></span>`);
      } else if (definition.kind === "moon") {
        medals.push(`<span class="basement-medal basement-medal-image basement-medal-moon" title="${definition.label} completed"><img src="/assets/ui/starry-night-badge.png" alt=""></span>`);
      } else {
        medals.push(`<span class="basement-medal" title="${definition.label} completed" style="--medal-colour:${definition.colour}">${definition.kind === "jigsaw" ? JIGSAW_SVG : STAR_SVG}</span>`);
      }
    });
    return medals.length ? `<div class="basement-medals" aria-label="Earned medals and badges">${medals.join("")}</div>` : "";
  }
  function orderedProgress(summary) {
    const dailyCompleted = Math.max(0, Number(summary?.dailyCompleted) || 0);
    const dailyStreak = Math.max(0, Number(summary?.dailyStreak) || 0);
    const items = [{ label:"DAILY", detail:`${dailyCompleted} completed · ${dailyStreak} day streak` }];
    PROGRESS_PACK_ORDER.forEach(definition => {
      const data = summary?.packs?.[definition.id] || {};
      const completed = Math.max(0, Number(data.completed) || 0);
      const levelCount = Math.max(0, Number(data.levelCount) || 0);
      let detail = levelCount ? `${completed}/${levelCount} completed` : `${completed} completed`;
      const storedCurrent = Math.max(0, Number(data.currentLevel) || 0);
      const inferredCurrent = completed > 0 ? completed + 1 : 0;
      const current = storedCurrent || inferredCurrent;
      if (current > 0) detail += ` · current ${levelCount ? Math.min(current, levelCount) : current}`;
      items.push({ label:definition.label, detail });
    });
    return items;
  }
  function progressHtml(summary) {
    return `<div class="progress-stack">${orderedProgress(summary).map(item => `<div><b>${item.label}</b><span>${item.detail}</span></div>`).join("")}</div>`;
  }
  function gameStatsText(summary) {
    return `${Number(summary?.levelsCompleted || 0)} levels · ${Number(summary?.packsCompleted || 0)} packs · ${Number(summary?.totalSteps || 0).toLocaleString("en-GB")} steps · ${Number(summary?.totalPushes || 0).toLocaleString("en-GB")} pushes · ${Number(summary?.totalAttempts || 0).toLocaleString("en-GB")} attempts`;
  }
  async function api(path = "", payload = null) {
    const response = await fetch(`${API}${path}`, {
      method: payload ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: payload ? { "content-type":"application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    return { response, data };
  }
  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    logoutBtn.hidden = true;
  }
  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    logoutBtn.hidden = false;
  }
  function renderSummary() {
    const now = Date.now();
    if (userCount) userCount.textContent = String(users.length);
    if (activeCount) activeCount.textContent = String(users.filter(user => now - Number(user.lastSeenAt || 0) <= 86400000).length);
    if (totalTime) totalTime.textContent = duration(users.reduce((sum, user) => sum + Number(user.totalActiveSeconds || 0), 0));
    if (totalAttempts) totalAttempts.textContent = users.reduce((sum, user) => sum + Number(user.summary?.totalAttempts || 0), 0).toLocaleString("en-GB");
  }
  function sortValue(user, key) {
    if (key === "levelsCompleted" || key === "packsCompleted" || key === "totalSteps"
        || key === "totalPushes" || key === "totalAttempts" || key === "dailyStreak") {
      return Number(user.summary?.[key]) || 0;
    }
    if (key === "activity7d") return weekActivity(user.summary).reduce((sum,day) => sum + day.seconds, 0);
    if (key === "dailyCompleted") return Number(user.summary?.dailyCompleted) || 0;
    if (key.startsWith("pack:")) return Number(user.summary?.packs?.[key.slice(5)]?.completed) || 0;
    if (key === "email") return String(user.email || "");
    if (key === "username" || key === "lastIp") return String(user[key] || "");
    return Number(user[key]) || 0;
  }
  function compareUsers(left, right) {
    const definition = SORT_BY_KEY.get(sortColumn) || SORT_BY_KEY.get("lastSeenAt");
    const a = sortValue(left, sortColumn), b = sortValue(right, sortColumn);
    const comparison = definition[2] === "text"
      ? String(a).localeCompare(String(b), "en", { numeric:true, sensitivity:"base" })
      : a - b;
    return comparison * sortDirection
      || String(left.username || "").localeCompare(String(right.username || ""), "en", { sensitivity:"base" });
  }
  function setSort(column, direction = null) {
    if (!SORT_BY_KEY.has(column)) return;
    sortDirection = direction == null && column === sortColumn ? -sortDirection
      : direction == null ? (SORT_BY_KEY.get(column)[2] === "text" ? 1 : -1) : direction;
    sortColumn = column;
    if (playerSortSelect) playerSortSelect.value = sortColumn;
    if (sortDirectionBtn) sortDirectionBtn.textContent = sortDirection === 1 ? "↑ ASCENDING" : "↓ DESCENDING";
    document.querySelectorAll("th[data-sort-column]").forEach(th => {
      const active = th.dataset.sortColumn === sortColumn;
      if (active) th.setAttribute("aria-sort", sortDirection === 1 ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
      const indicator = th.querySelector(".sort-indicator");
      if (indicator) indicator.textContent = active ? (sortDirection === 1 ? "↑" : "↓") : "";
    });
    renderUsers();
  }
  function setView(view) {
    selectedView = ["players","completions","daily"].includes(view) ? view : "players";
    if (playersPanel) playersPanel.hidden = selectedView !== "players";
    if (completionsPanel) completionsPanel.hidden = selectedView !== "completions";
    if (dailyPracticePanel) dailyPracticePanel.hidden = selectedView !== "daily";
    if (searchInput) searchInput.hidden = selectedView !== "players";
    playersTab?.setAttribute("aria-pressed", String(selectedView === "players"));
    completionsTab?.setAttribute("aria-pressed", String(selectedView === "completions"));
    dailyPracticeTab?.setAttribute("aria-pressed", String(selectedView === "daily"));
    if (selectedView === "completions") renderCompletions();
    if (selectedView === "daily") loadPreparedDailies();
  }
  function ukCompletionDate(timestamp) {
    if (!Number(timestamp)) return "Original date unavailable";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        dateStyle:"medium", timeStyle:"medium", timeZone:"Europe/London"
      }).format(new Date(Number(timestamp))) + " UK";
    } catch (_) { return "Original date unavailable"; }
  }
  function completionSortOrder(item) {
    const index = COMPLETION_PACKS.findIndex(pack => pack[0] === item.packId);
    return index < 0 ? COMPLETION_PACKS.length : index;
  }
  function compareCompletions(a,b) {
    const group=completionSortOrder(a)-completionSortOrder(b)
      || (a.packId===b.packId ? 0 : String(a.packName).localeCompare(String(b.packName),"en",{sensitivity:"base"}));
    if(group) return group;
    if(Boolean(a.needsReview)!==Boolean(b.needsReview)) return a.needsReview ? 1 : -1;
    if(Boolean(a.historical)!==Boolean(b.historical)) return a.historical ? 1 : -1;
    if(!a.historical && Number(a.completedAt)!==Number(b.completedAt)) return Number(a.completedAt)-Number(b.completedAt);
    return Number(a.recordedAt||0)-Number(b.recordedAt||0)
      || String(a.username).localeCompare(String(b.username),"en",{sensitivity:"base"});
  }
  function orderedCompletions() {
    const packId=completionPackSelect?.value || "";
    const query=String(completionSearch?.value||"").trim().toLowerCase();
    const showReview=Boolean(completionReviewToggle?.checked);
    return completions.filter(item => (!item.needsReview || showReview)
      && (!packId || item.packId===packId)
      && (!query || String(item.username||"").toLowerCase().includes(query))).sort(compareCompletions);
  }
  function populateCompletionPacks() {
    if(!completionPackSelect) return;
    const selected=completionPackSelect.value;
    const packs=new Map(COMPLETION_PACKS);
    completions.forEach(item=>{if(!packs.has(item.packId)) packs.set(item.packId,item.packName);});
    completionPackSelect.innerHTML='<option value="">ALL LEVEL PACKS</option>'
      +[...packs].map(([id,name])=>`<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("");
    if(packs.has(selected)) completionPackSelect.value=selected;
  }
  function completionRankMap() {
    const counts=new Map(),ranks=new Map();
    completions.filter(item=>item.complete&&!item.needsReview&&!item.historical&&Number(item.completedAt)>0)
      .sort(compareCompletions).forEach(item=>{
        const rank=(counts.get(item.packId)||0)+1;counts.set(item.packId,rank);
        ranks.set(`${item.userId}\u0000${item.packId}`,rank);
      });
    return ranks;
  }
  function completionStatusText(item) {
    if(item.needsReview) return `NEEDS REVIEW · ${Number(item.completed||0)}/${Number(item.levelCount||0)} levels evidenced`;
    if(item.historical) return "Complete · original date unavailable";
    return "Dated completion";
  }
  function renderCompletionPackCards() {
    if(!completionPackCards) return;
    const selected=completionPackSelect?.value||"";
    completionPackCards.innerHTML=COMPLETION_PACKS.map(([id,name])=>{
      const records=completions.filter(item=>item.packId===id&&item.complete&&!item.needsReview);
      const dated=records.filter(item=>!item.historical).length;
      return `<button type="button" data-completion-pack="${escapeHtml(id)}" aria-pressed="${selected===id}">
        <strong>${escapeHtml(name)}</strong><span>${records.length} complete</span><small>${dated} dated · ${records.length-dated} undated</small>
      </button>`;
    }).join("");
  }
  function renderCompletions() {
    const list=orderedCompletions(),ranks=completionRankMap();
    renderCompletionPackCards();
    if(completionRows) completionRows.innerHTML=list.map(item=>{
      const rank=item.historical||item.needsReview ? "—" : ranks.get(`${item.userId}\u0000${item.packId}`)||"—";
      const date=item.needsReview ? "Not verified" : ukCompletionDate(item.completedAt);
      const previous=item.needsReview&&item.previousRecord
        ? `<div class="muted">Previous ledger entry retained for review. Recorded ${escapeHtml(dateTime(item.previousRecord.recordedAt))}.</div>` : "";
      return `<tr class="${item.needsReview ? "review-row" : item.historical ? "historical-row" : ""}" data-user-id="${escapeHtml(item.userId)}" tabindex="0">
        <td class="completion-rank">${rank}</td><td><strong>${escapeHtml(item.username)}</strong></td>
        <td>${escapeHtml(item.packName)}</td><td class="completion-date">${escapeHtml(date)}</td>
        <td><span class="completion-badge">${escapeHtml(completionStatusText(item))}</span>${item.needsReview&&item.reviewReason ? `<div class="muted">${escapeHtml(item.reviewReason)}</div>` : ""}${previous}</td></tr>`;
    }).join("");
    const dated=list.filter(item=>item.complete&&!item.historical&&!item.needsReview).length;
    const complete=list.filter(item=>item.complete&&!item.needsReview).length;
    const reviewTotal=completions.filter(item=>item.needsReview).length;
    setStatus(completionStatus,`${complete} COMPLETE · ${dated} DATED · ${complete-dated} UNDATED${reviewTotal ? ` · ${reviewTotal} earlier record${reviewTotal===1?"":"s"} need review` : ""}`);
    if(!list.length && completionRows) completionRows.innerHTML='<tr><td colspan="5">No matching completions recorded.</td></tr>';
  }
  function completionDetail(records) {
    if(!records?.length) return '<p class="muted">No completed packs recorded.</p>';
    return `<div class="completion-records-detail">${records.map(item=>`<div><strong>${escapeHtml(item.packName)}</strong><span>${escapeHtml(item.needsReview ? completionStatusText(item) : ukCompletionDate(item.completedAt))}${item.historical&&!item.needsReview ? " · Historical completion" : ""}</span></div>`).join("")}</div>`;
  }
  // The catalogue comes only from the authenticated Basement endpoint.
  // Future layouts are never read from the public Daily archive.
  const previewImages = new Map();
  function previewImage(src) {
    if(previewImages.has(src)) return previewImages.get(src);
    const image=new Image();
    image.decoding="async";
    const record={image,ready:false,failed:false};
    image.onload=()=>{record.ready=true;document.querySelectorAll("canvas[data-practice-date]").forEach(canvas=>{
      const puzzle=preparedDailies.find(item=>item.date===canvas.dataset.practiceDate);
      if(puzzle) drawPracticePreview(canvas,puzzle);
    });};
    image.onerror=()=>{record.failed=true;};
    image.src=src;previewImages.set(src,record);return record;
  }
  const previewAssets={
    box:"/assets/board/boxes/box-default-yellow.png",targetBox:"/assets/board/boxes/box-red.png",
    goal:"/assets/board/goals/goal-red.png",player:"/assets/characters-fallback/boy/player-front.png"
  };
  function drawPracticePreview(canvas,puzzle) {
    const rows=Array.isArray(puzzle.layout)?puzzle.layout:[];
    const height=rows.length,width=Math.max(0,...rows.map(row=>String(row).length));
    if(!height||!width||width>200||height>200)return;
    const size=32;
    if(canvas.width!==width*size)canvas.width=width*size;
    if(canvas.height!==height*size)canvas.height=height*size;
    const context=canvas.getContext("2d");if(!context)return;
    context.clearRect(0,0,canvas.width,canvas.height);
    const assets=Object.fromEntries(Object.entries(previewAssets).map(([key,src])=>[key,previewImage(src)]));
    context.fillStyle="#e4d6c2";context.fillRect(0,0,canvas.width,canvas.height);
    const drawAsset=(key,x,y,fallback)=>{
      const asset=assets[key];if(asset.ready){context.drawImage(asset.image,x*size,y*size,size,size);return;}
      fallback();
    };
    rows.forEach((row,y)=>{for(let x=0;x<width;x++){
      const tile=String(row)[x]||" ";
      if(tile===" ")continue;
      context.fillStyle="#f7f0e5";context.fillRect(x*size,y*size,size,size);
      if(tile==="#"){
        context.fillStyle="#171719";context.fillRect(x*size,y*size,size,size);
        context.fillStyle="#3c3b3b";context.fillRect(x*size+3,y*size+3,size-6,3);continue;
      }
      const goal=tile==="."||tile==="*"||tile==="+";
      if(goal)drawAsset("goal",x,y,()=>{context.fillStyle="#db3b27";context.beginPath();context.arc(x*size+size/2,y*size+size/2,size*.22,0,Math.PI*2);context.fill();});
      if(tile==="$"||tile==="*"){
        drawAsset(tile==="*"?"targetBox":"box",x,y,()=>{context.fillStyle=tile==="*"?"#db3b27":"#e5b32a";context.fillRect(x*size+3,y*size+3,size-6,size-6);context.strokeStyle="#171719";context.lineWidth=2;context.strokeRect(x*size+3,y*size+3,size-6,size-6);});
      }
      if(tile==="@"||tile==="+")drawAsset("player",x,y,()=>{context.fillStyle="#20539a";context.beginPath();context.arc(x*size+size/2,y*size+size/2,size*.32,0,Math.PI*2);context.fill();});
    }});
  }
  function renderPracticeCards() {
    const query=String(practiceSearch?.value||"").trim().toLowerCase();
    const filter=practiceFilter?.value||"all";
    const list=preparedDailies.filter(item=>{
      if(filter==="published"&&!item.published)return false;
      if(filter==="upcoming"&&item.published)return false;
      return !query||[item.name,item.date,String(item.sequence)].some(value=>String(value||"").toLowerCase().includes(query));
    });
    if(practiceCount)practiceCount.textContent=String(preparedDailies.length);
    if(practiceCards)practiceCards.innerHTML=list.map(item=>{
      const rows=item.layout||[];const width=Math.max(0,...rows.map(row=>String(row).length));
      const boxes=rows.join("").split("").filter(char=>char==="$"||char==="*").length;
      return `<article class="practice-card"><div class="practice-card-top"><div><div class="practice-card-number">DAILY #${Number(item.sequence)||"?"}</div><div class="practice-card-date">${escapeHtml(item.date)}</div></div><span class="practice-card-badge${item.published?"":" upcoming"}">${item.published?"PUBLISHED":"UPCOMING"}</span></div>
        <div class="practice-preview"><canvas data-practice-date="${escapeHtml(item.date)}" role="img" aria-label="Preview of Daily ${Number(item.sequence)||"?"}"></canvas></div>
        <div class="practice-card-name">${escapeHtml(item.name||"Daily Boxxy")}</div>
        <div class="practice-card-meta">${width} × ${rows.length} · ${boxes} ${boxes===1?"box":"boxes"}</div>
        <button type="button" data-practice-open="${escapeHtml(item.date)}">PRACTISE →</button></article>`;
    }).join("");
    if(!list.length&&practiceCards)practiceCards.innerHTML='<p>No prepared puzzles match those filters.</p>';
    practiceCards?.querySelectorAll("canvas[data-practice-date]").forEach(canvas=>{
      const puzzle=preparedDailies.find(item=>item.date===canvas.dataset.practiceDate);
      if(puzzle)drawPracticePreview(canvas,puzzle);
    });
    setStatus(practiceStatus,`${list.length} OF ${preparedDailies.length} PREPARED DAILY PUZZLES`);
  }
  async function loadPreparedDailies(force=false) {
    if(practiceBusy)return;
    if(practiceLoaded&&!force){renderPracticeCards();return;}
    practiceBusy=true;setStatus(practiceStatus,"LOADING PREPARED DAILY PUZZLES…");
    try{
      const response=await fetch("/api/basement-daily",{credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(response.status===401){showLogin();return;}
      if(!response.ok||!Array.isArray(data.puzzles))throw new Error(data.error||"Could not load Daily puzzles.");
      preparedDailies=data.puzzles.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
      practiceLoaded=true;renderPracticeCards();
    }catch(error){setStatus(practiceStatus,error.message||"Could not load Daily puzzles.","error");}
    finally{practiceBusy=false;}
  }
  function openPractice(date) {
    const puzzle=preparedDailies.find(item=>item.date===date);
    if(!puzzle||!practiceModal||!practiceFrame)return;
    lastPracticeFocus=document.activeElement;
    practiceModalTitle.textContent=`DAILY #${Number(puzzle.sequence)||"?"} · ${puzzle.date}`;
    practiceModal.hidden=false;
    practiceFrame.src=`/basement/practice?date=${encodeURIComponent(date)}&v=335`;
    requestAnimationFrame(()=>practiceClose?.focus());
  }
  function closePractice() {
    if(!practiceModal||practiceModal.hidden)return;
    practiceFrame?.removeAttribute("src");
    practiceModal.hidden=true;
    if(lastPracticeFocus?.isConnected)lastPracticeFocus.focus();
    lastPracticeFocus=null;
  }
  practiceSearch?.addEventListener("input",renderPracticeCards);
  practiceFilter?.addEventListener("change",renderPracticeCards);
  practiceCards?.addEventListener("click",event=>{
    const button=event.target.closest("[data-practice-open]");if(button)openPractice(button.dataset.practiceOpen);
  });
  practiceClose?.addEventListener("click",closePractice);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!practiceModal?.hidden){event.preventDefault();closePractice();}});
  function filteredUsers() {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const list = query ? users.filter(user => [user.username, user.email, user.googleEmail, user.signupIp, user.lastIp].some(value => String(value || "").toLowerCase().includes(query))) : users;
    return list.slice().sort(compareUsers);
  }
  function googleBadge(user) {
    return user?.googleLinked ? `<span class="google-badge">GOOGLE</span>` : "";
  }
  function emailCell(user) {
    const google = user?.googleLinked
      ? `<div class="google-email-line">${googleBadge(user)}<span>${escapeHtml(user.googleEmail || "—")}</span></div>`
      : "";
    return `<div>${escapeHtml(user.email)}</div>${google}`;
  }
  function renderUsers() {
    const list = filteredUsers();
    if (userRows) userRows.innerHTML = list.map(user => `
      <tr data-user-id="${escapeHtml(user.id)}" tabindex="0">
        <td>
          <div class="basement-user-identity">
            <canvas class="basement-avatar" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-label="Current BOXXY character and outfit"></canvas>
            <div class="basement-user-copy">
              <div class="user-main user-with-status">${onlineDot(user)}${escapeHtml(user.username)}${googleBadge(user)}</div>
              ${medalRail(user.summary)}${outfitMini(user.summary)}${boardStyleMini(user.summary)}
            </div>
          </div>
        </td>
        <td>${emailCell(user)}</td>
        <td>${escapeHtml(dateTime(user.createdAt))}</td>
        <td>${escapeHtml(dateTime(user.lastSeenAt))}</td>
        <td><strong>${escapeHtml(duration(user.totalActiveSeconds))}</strong></td>
        <td class="numeric-cell">${Number(user.summary?.levelsCompleted || 0).toLocaleString("en-GB")}</td>
        <td class="numeric-cell">${Number(user.summary?.packsCompleted || 0).toLocaleString("en-GB")}</td>
        <td class="numeric-cell">${Number(user.summary?.totalSteps || 0).toLocaleString("en-GB")}</td>
        <td class="numeric-cell">${Number(user.summary?.totalPushes || 0).toLocaleString("en-GB")}</td>
        <td class="numeric-cell">${Number(user.summary?.totalAttempts || 0).toLocaleString("en-GB")}</td>
        <td class="numeric-cell">${Number(user.summary?.dailyStreak || 0).toLocaleString("en-GB")}</td>
        <td>${activityStrip(user.summary, true)}</td>
        <td>${progressHtml(user.summary)}</td>
        <td><div>${escapeHtml(user.lastIp || "—")}</div><div class="muted">signup ${escapeHtml(user.signupIp || "—")}</div></td>
      </tr>`).join("");
    if (userCards) userCards.replaceChildren();
    renderAvatarCanvases(list);
  }
  async function loadUsers() {
    setStatus(dashboardStatus, "LOADING…");
    try {
      const { response, data } = await api();
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) { setStatus(dashboardStatus, data.error || "Could not load users.", "error"); return; }
      users = Array.isArray(data.users) ? data.users : [];
      completions = Array.isArray(data.completions) ? data.completions : [];
      populateCompletionPacks();
      renderCompletions();
      renderSummary(); renderUsers(); showDashboard(); setStatus(dashboardStatus, `${users.length} ACCOUNT${users.length === 1 ? "" : "S"} LOADED`, "success");
    } catch (_) { setStatus(dashboardStatus, "Could not reach the Basement API.", "error"); }
  }
  function detailProgress(summary) {
    return `<div class="detail-progress">${orderedProgress(summary).map(item => `<div><strong>${item.label}</strong><span>${item.detail}</span></div>`).join("")}</div>`;
  }
  function detailOutfit(user) {
    const style = avatarStyle(user?.summary);
    const board = boardStyle(user?.summary);
    const character = style.bodyType === "girl" ? "OLIVE" : "INDI";
    const row = (label, colour) => `<div><span>${label}</span><strong><i class="outfit-swatch" style="--swatch:${colour}"></i>${colour.toUpperCase()}</strong></div>`;
    const boardRow = (label, colour) => {
      const swatch = BOARD_STYLE_SWATCHES[colour];
      return `<div><span>${label}</span><strong><i class="outfit-swatch" style="--swatch:${swatch.hex}"></i>${escapeHtml(swatch.label.toUpperCase())}</strong></div>`;
    };
    return `<div class="detail-outfit"><canvas class="basement-avatar basement-avatar-large" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-label="Current BOXXY character and style"></canvas><div class="detail-outfit-grid"><div><span>CHARACTER</span><strong>${character}</strong></div>${row("T-SHIRT", style.tshirt)}${row("TROUSERS / SKIRT", style.trousers)}${row("SHOES", style.shoes)}${boardRow("BOX", board.box)}${boardRow("BOX ON TARGET", board.target)}</div></div>`;
  }
  function detailAttempts(summary) {
    const attempts = Array.isArray(summary?.attempts) ? summary.attempts : [];
    if (!attempts.length) return `<p class="muted">No level attempts recorded yet. Attempt counting begins with BOXXY v277.</p>`;
    return `<div class="attempt-list">${attempts.map(item => {
      const levelLabel = item.packId === "daily-boxxy"
        ? `Daily #${Number(item.levelNumber || 0) || escapeHtml(item.levelToken || "")}`
        : `Level ${Number(item.levelNumber || 0) || escapeHtml(item.levelToken || "")}`;
      const name = item.levelName && item.levelName !== item.levelToken ? ` · ${escapeHtml(item.levelName)}` : "";
      return `<div><span><strong>${escapeHtml(item.packName || item.packId || "Pack")}</strong> · ${levelLabel}${name}</span><b>${Number(item.count || 0)} attempt${Number(item.count || 0) === 1 ? "" : "s"}</b><small>Last ${escapeHtml(dateTime(item.lastAt))}</small></div>`;
    }).join("")}</div>`;
  }
  async function openDetail(id) {
    try {
      const { response, data } = await api(`?user=${encodeURIComponent(id)}`);
      if (!response.ok || !data.user) { setStatus(dashboardStatus, data.error || "Could not load that account.", "error"); return; }
      const user = data.user;
      detailTitle.textContent = user.username || "USER";
      detailBody.innerHTML = `
        <div class="detail-grid">
          <div><span>USERNAME</span><strong>${escapeHtml(user.username)}</strong></div>
          <div><span>EMAIL</span><strong>${escapeHtml(user.email)}</strong></div>
          <div><span>GOOGLE SIGN-IN</span><strong>${user.googleLinked ? '<span class="google-badge">GOOGLE</span> LINKED' : '—'}</strong></div>
          <div><span>GOOGLE EMAIL</span><strong>${user.googleLinked ? escapeHtml(user.googleEmail || "—") : "—"}</strong></div>
          <div><span>ACCOUNT ID</span><strong>${escapeHtml(user.id)}</strong></div>
          <div><span>JOINED</span><strong>${escapeHtml(dateTime(user.createdAt))}</strong></div>
          <div><span>LAST LOGIN</span><strong>${escapeHtml(dateTime(user.lastLoginAt))}</strong></div>
          <div><span>LAST ACTIVE</span><strong>${escapeHtml(dateTime(user.lastSeenAt))}</strong></div>
          <div><span>TOTAL TIME ONLINE</span><strong>${escapeHtml(duration(user.totalActiveSeconds))}</strong></div>
          <div><span>SIGNUP IP</span><strong>${escapeHtml(user.signupIp || "—")}</strong></div>
          <div><span>LAST IP</span><strong>${escapeHtml(user.lastIp || "—")}</strong></div>
          <div><span>ACTIVE PACK</span><strong>${escapeHtml(user.summary?.activePack || "—")}</strong></div>
          <div><span>LAST CLOUD SAVE</span><strong>${escapeHtml(dateTime(user.progressUpdatedAt))}</strong></div>
          <div><span>BROWSER / DEVICE</span><strong>${escapeHtml(browserDevice(user.userAgent))}</strong></div>
        </div>
        <div class="detail-game-stats" aria-label="Game statistics">
          <div><span>LEVELS COMPLETED</span><strong>${Number(user.summary?.levelsCompleted || 0).toLocaleString("en-GB")}</strong></div>
          <div><span>PACKS COMPLETED</span><strong>${Number(user.summary?.packsCompleted || 0).toLocaleString("en-GB")}</strong></div>
          <div><span>TOTAL STEPS</span><strong>${Number(user.summary?.totalSteps || 0).toLocaleString("en-GB")}</strong></div>
          <div><span>TOTAL BOX PUSHES</span><strong>${Number(user.summary?.totalPushes || 0).toLocaleString("en-GB")}</strong></div>
          <div><span>LEVEL ATTEMPTS</span><strong>${Number(user.summary?.totalAttempts || 0).toLocaleString("en-GB")}</strong></div>
        </div>
        <section><h3>MEDALS / BADGES</h3>${medalRail(user.summary) || `<p class="muted">No medals or badges earned yet.</p>`}</section>
        <section><h3>CURRENT STYLE</h3>${detailOutfit(user)}</section>
        <section><h3>ACTIVITY · LAST 7 DAYS</h3>${activityStrip(user.summary)}</section>
        <section><h3>PACK COMPLETION HISTORY</h3>${completionDetail(data.completions)}</section>
        <section><h3>PROGRESS SUMMARY</h3>${detailProgress(user.summary)}</section>
        <section><h3>LEVEL ATTEMPTS</h3>${detailAttempts(user.summary)}</section>
        <section><h3>RAW CLOUD SAVE</h3><pre class="raw-progress">${escapeHtml(JSON.stringify(user.progress || {}, null, 2))}</pre></section>`;
      detailModal.hidden = false;
      renderAvatarCanvases([user]);
      requestAnimationFrame(() => detailClose?.focus());
    } catch (_) { setStatus(dashboardStatus, "Could not load that account.", "error"); }
  }
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault(); const form = new FormData(loginForm); setStatus(loginStatus, "CHECKING…");
    try {
      const { response, data } = await api("", { action:"login", username:form.get("username"), password:form.get("password") });
      if (!response.ok) { setStatus(loginStatus, data.error || "Incorrect login.", "error"); return; }
      loginForm.reset(); setStatus(loginStatus, ""); await loadUsers();
    } catch (_) { setStatus(loginStatus, "Could not reach the Basement API.", "error"); }
  });
  logoutBtn?.addEventListener("click", async () => { closePractice(); try { await api("", { action:"logout" }); } catch (_) {} users=[]; completions=[]; preparedDailies=[];practiceLoaded=false;showLogin(); });
  refreshBtn?.addEventListener("click", loadUsers);
  if (playerSortSelect) {
    playerSortSelect.innerHTML = SORT_COLUMNS.map(([key,label]) => `<option value="${key}">${label}</option>`).join("");
    playerSortSelect.addEventListener("change", () => setSort(playerSortSelect.value, SORT_BY_KEY.get(playerSortSelect.value)?.[2] === "text" ? 1 : -1));
  }
  document.querySelectorAll("[data-sort]").forEach(button => button.addEventListener("click", () => setSort(button.dataset.sort)));
  sortDirectionBtn?.addEventListener("click", () => setSort(sortColumn));
  setSort("lastSeenAt", -1);
  playersTab?.addEventListener("click", () => setView("players"));
  completionsTab?.addEventListener("click", () => setView("completions"));
  dailyPracticeTab?.addEventListener("click", () => setView("daily"));
  if (completionPackSelect) {
    completionPackSelect.innerHTML = '<option value="">ALL LEVEL PACKS</option>' + COMPLETION_PACKS.map(([id,name]) => `<option value="${id}">${name}</option>`).join("");
    completionPackSelect.addEventListener("change", renderCompletions);
  }
  completionSearch?.addEventListener("input", renderCompletions);
  completionReviewToggle?.addEventListener("change",renderCompletions);
  completionPackCards?.addEventListener("click",event=>{
    const button=event.target.closest("[data-completion-pack]");if(!button||!completionPackSelect)return;
    completionPackSelect.value=button.dataset.completionPack;renderCompletions();
  });
  completionRows?.addEventListener("click", event => { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); });
  completionRows?.addEventListener("keydown", event => { if (event.key === "Enter") { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); } });
  const TEXT_SCALE_KEY = "boxxy-basement-text-scale-v2";
  function applyTextScale(value) {
    const scale = [1,1.25,1.5,1.75,2].includes(Number(value)) ? Number(value) : 1;
    document.documentElement.style.setProperty("--admin-font-size", `${16 * scale}px`);
    if (textSizeSelect) textSizeSelect.value = String(scale);
    try { localStorage.setItem(TEXT_SCALE_KEY, String(scale)); } catch (_) {}
  }
  let savedTextScale = 1;
  try { savedTextScale = localStorage.getItem(TEXT_SCALE_KEY) || 1; } catch (_) {}
  applyTextScale(savedTextScale);
  textSizeSelect?.addEventListener("change", () => applyTextScale(textSizeSelect.value));
  searchInput?.addEventListener("input", renderUsers);
  userRows?.addEventListener("click", event => { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); });
  userRows?.addEventListener("keydown", event => { if (event.key === "Enter") { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); } });
  userCards?.addEventListener("click", event => { const button = event.target.closest("[data-user-id]"); if (button) openDetail(button.dataset.userId); });
  detailClose?.addEventListener("click", () => { detailModal.hidden = true; });
  detailModal?.addEventListener("click", event => { if (event.target === detailModal) detailModal.hidden = true; });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !detailModal.hidden) detailModal.hidden = true; });
  loadUsers();
})();
