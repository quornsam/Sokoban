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
  let users = [];

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
  function filteredUsers() {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    if (!query) return users;
    return users.filter(user => [user.username, user.email, user.signupIp, user.lastIp].some(value => String(value || "").toLowerCase().includes(query)));
  }
  function renderUsers() {
    const list = filteredUsers();
    if (userRows) userRows.innerHTML = list.map(user => `
      <tr data-user-id="${escapeHtml(user.id)}" tabindex="0">
        <td>
          <div class="basement-user-identity">
            <canvas class="basement-avatar" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-label="Current BOXXY character and outfit"></canvas>
            <div class="basement-user-copy">
              <div class="user-main user-with-status">${onlineDot(user)}${escapeHtml(user.username)}</div>
              ${medalRail(user.summary)}
              ${outfitMini(user.summary)}
              ${boardStyleMini(user.summary)}
            </div>
          </div>
        </td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(dateTime(user.createdAt))}</td>
        <td>${escapeHtml(dateTime(user.lastSeenAt))}</td>
        <td><strong>${escapeHtml(duration(user.totalActiveSeconds))}</strong><div class="muted">all time</div></td>
        <td>${activityStrip(user.summary, true)}</td>
        <td><div class="progress-list">${escapeHtml(gameStatsText(user.summary))}</div></td>
        <td>${progressHtml(user.summary)}</td>
        <td><div>${escapeHtml(user.lastIp || "—")}</div><div class="muted">signup ${escapeHtml(user.signupIp || "—")}</div></td>
      </tr>`).join("");
    if (userCards) userCards.innerHTML = list.map(user => `
      <article class="user-card"><button type="button" data-user-id="${escapeHtml(user.id)}">
        <div class="user-card-top">
          <div class="basement-user-identity">
            <canvas class="basement-avatar" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-hidden="true"></canvas>
            <div class="basement-user-copy"><span class="user-main user-with-status">${onlineDot(user)}${escapeHtml(user.username)}</span>${medalRail(user.summary)}${outfitMini(user.summary)}${boardStyleMini(user.summary)}</div>
          </div>
          <span class="user-total-time"><small>TOTAL TIME</small>${escapeHtml(duration(user.totalActiveSeconds))}</span>
        </div>
        <div class="muted">${escapeHtml(user.email)}</div>
        ${activityStrip(user.summary, true)}
        <div class="user-card-grid">
          <div><span>LAST ACTIVE</span><strong class="user-with-status">${onlineDot(user)}${escapeHtml(dateTime(user.lastSeenAt))}</strong></div>
          <div><span>IP</span><strong>${escapeHtml(user.lastIp || "—")}</strong></div>
          <div><span>GAME STATS</span><strong>${escapeHtml(gameStatsText(user.summary))}</strong></div>
          <div class="user-card-progress"><span>PROGRESS</span>${progressHtml(user.summary)}</div>
          <div><span>JOINED</span><strong>${escapeHtml(dateTime(user.createdAt))}</strong></div>
        </div>
      </button></article>`).join("");
    renderAvatarCanvases(list);
  }
  async function loadUsers() {
    setStatus(dashboardStatus, "LOADING…");
    try {
      const { response, data } = await api();
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) { setStatus(dashboardStatus, data.error || "Could not load users.", "error"); return; }
      users = Array.isArray(data.users) ? data.users : [];
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
  logoutBtn?.addEventListener("click", async () => { try { await api("", { action:"logout" }); } catch (_) {} users=[]; showLogin(); });
  refreshBtn?.addEventListener("click", loadUsers);
  searchInput?.addEventListener("input", renderUsers);
  userRows?.addEventListener("click", event => { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); });
  userRows?.addEventListener("keydown", event => { if (event.key === "Enter") { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); } });
  userCards?.addEventListener("click", event => { const button = event.target.closest("[data-user-id]"); if (button) openDetail(button.dataset.userId); });
  detailClose?.addEventListener("click", () => { detailModal.hidden = true; });
  detailModal?.addEventListener("click", event => { if (event.target === detailModal) detailModal.hidden = true; });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !detailModal.hidden) detailModal.hidden = true; });
  loadUsers();
})();
