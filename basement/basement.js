/* BOXXY v446: FLUFFBALLS are first-class fixed characters; Basement character actions are generated from the avatar registry. */
/* BOXXY v445: Basement manages the BOXXY Originals Hall of Fame and linked player profiles. */
/* BOXXY v443: six additional PARTYGOERS characters are available to admin/profile avatar rendering. */
/* BOXXY v442: Daily Practice starts with tomorrow, keeps future dates chronological, and hides current/past dates by default. */
/* BOXXY v426: selected-user message testing and reliable character-action administration. */
/* BOXXY v425: administer date-specific public message-bar announcements and actions. */
/* BOXXY v424: show navigator.webdriver evidence in red in admin Daily scores and Player History only. */
/* BOXXY v403: artificial players can be assigned persistent random avatars. */
/* BOXXY v430 — Basement recognises the expanded thirty-character PARTYGOERS roster. */
/* BOXXY v416 — Basement recognises the expanded twenty-four-character PARTYGOERS roster. */
/* BOXXY v410 — Basement recognises the expanded eighteen-character PARTYGOERS roster. */
/* BOXXY v401 — Basement recognises the expanded twelve-character PARTYGOERS roster. */
/* BOXXY v400 — Basement recognises PARTYGOERS avatars and includes fixed-character artwork in private practice. */
/* BOXXY v375 — varied, verified synthetic move counts and update-in-place for previous scores. */
/* BOXXY v374 — Basement Daily seeding and leaderboard score administration. */
/* BOXXY v363 — server-confirmed sessions, first recorded login and per-device sign-in history. */
/* BOXXY v356 — Basement can securely reset a player's normal BOXXY password without touching progress or Google linking. */
/* BOXXY v346 — Click-Push status is explicit and merge-safe across multiple devices. */
/* BOXXY v345 — show Click-Push beta access/use in Basement. */
/* BOXXY v357 — private Daily practice loads the current non-scoring game runtime and October catalogue. */
/* BOXXY v337 — compact Basement type scale and non-wrapping numeric presentation; private practice protocol unchanged. */
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
  const hallOfFameTab = document.getElementById("hallOfFameTab");
  const hallOfFamePanel = document.getElementById("hallOfFamePanel");
  const hallOfFameForm = document.getElementById("hallOfFameForm");
  const hallOfFameOriginalPlace = document.getElementById("hallOfFameOriginalPlace");
  const hallOfFamePlace = document.getElementById("hallOfFamePlace");
  const hallOfFameName = document.getElementById("hallOfFameName");
  const hallOfFameLocation = document.getElementById("hallOfFameLocation");
  const hallOfFameDate = document.getElementById("hallOfFameDate");
  const hallOfFameUser = document.getElementById("hallOfFameUser");
  const hallOfFameClear = document.getElementById("hallOfFameClear");
  const hallOfFameRefresh = document.getElementById("hallOfFameRefresh");
  const hallOfFameList = document.getElementById("hallOfFameList");
  const hallOfFameStatus = document.getElementById("hallOfFameStatus");
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
  const dailyScoresTab = document.getElementById("dailyScoresTab");
  const dailyScoresPanel = document.getElementById("dailyScoresPanel");
  const syntheticUserForm = document.getElementById("syntheticUserForm");
  const syntheticUsername = document.getElementById("syntheticUsername");
  const syntheticDevice = document.getElementById("syntheticDevice");
  const syntheticUsersEl = document.getElementById("syntheticUsers");
  const syntheticSelectAll = document.getElementById("syntheticSelectAll");
  const syntheticScoreForm = document.getElementById("syntheticScoreForm");
  const syntheticRefreshMoves = document.getElementById("syntheticRefreshMoves");
  const syntheticDate = document.getElementById("syntheticDate");
  const syntheticScoreDevice = document.getElementById("syntheticScoreDevice");
  const syntheticMinSeconds = document.getElementById("syntheticMinSeconds");
  const syntheticMaxSeconds = document.getElementById("syntheticMaxSeconds");
  const dailyScoresRefresh = document.getElementById("dailyScoresRefresh");
  const dailyScoresList = document.getElementById("dailyScoresList");
  const dailyScoresStatus = document.getElementById("dailyScoresStatus");
  const messageBarTab = document.getElementById("messageBarTab");
  const messageBarPanel = document.getElementById("messageBarPanel");
  const siteMessageForm = document.getElementById("siteMessageForm");
  const siteMessageDate = document.getElementById("siteMessageDate");
  const siteMessageText = document.getElementById("siteMessageText");
  const siteMessageBackground = document.getElementById("siteMessageBackground");
  const siteMessageTextColour = document.getElementById("siteMessageTextColour");
  const siteMessageButtonLabel = document.getElementById("siteMessageButtonLabel");
  const siteMessageAudience = document.getElementById("siteMessageAudience");
  const siteMessageTargetsRow = document.getElementById("siteMessageTargetsRow");
  const siteMessageTargets = document.getElementById("siteMessageTargets");
  const siteMessageAction = document.getElementById("siteMessageAction");
  const siteMessageActionValueRow = document.getElementById("siteMessageActionValueRow");
  const siteMessageActionValue = document.getElementById("siteMessageActionValue");
  const siteMessageEnabled = document.getElementById("siteMessageEnabled");
  const siteMessageClear = document.getElementById("siteMessageClear");
  const siteMessagePreview = document.getElementById("siteMessagePreview");
  const siteMessageStatus = document.getElementById("siteMessageStatus");
  const siteMessageRefresh = document.getElementById("siteMessageRefresh");
  const siteMessageList = document.getElementById("siteMessageList");
  const practiceSearch = document.getElementById("practiceSearch");
  const practiceFilter = document.getElementById("practiceFilter");
  const practiceCards = document.getElementById("practiceCards");
  const practiceStatus = document.getElementById("practiceStatus");
  const practiceCount = document.getElementById("practiceCount");
  const practiceModal = document.getElementById("practiceModal");
  const practiceModalTitle = document.getElementById("practiceModalTitle");
  const practiceClose = document.getElementById("practiceClose");
  const practiceFrame = document.getElementById("practiceFrame");
  const practiceLoadStatus=document.getElementById("practiceLoadStatus");
  const practiceLoadMessage=document.getElementById("practiceLoadMessage");
  const practiceRetry=document.getElementById("practiceRetry");
  let practiceSession=null;
  let practiceTimeout=0;
  let preparedDailies = [];
  let practiceLoaded = false;
  let practiceBusy = false;
  let practiceRequest = 0;
  let lastPracticeFocus = null;
  let users = [];
  let completions = [];
  let hallOfFameEntries = [];
  let syntheticUsers = [];
  let syntheticScores = [];
  let siteMessages = [];
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
    ["validSessionCount", "Valid sessions", "number"],
    ["latestSessionStartedAt", "Latest session began", "number"],
    ["firstRecordedLoginAt", "First recorded login", "number"],
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
  function resetSiteMessageForm() {
    if (!siteMessageForm) return;
    siteMessageForm.reset();
    if (siteMessageDate) siteMessageDate.value = dayKey(new Date());
    if (siteMessageBackground) siteMessageBackground.value = '#f2b51d';
    if (siteMessageTextColour) siteMessageTextColour.value = '#171719';
    if (siteMessageEnabled) siteMessageEnabled.checked = true;
    if (siteMessageAudience) siteMessageAudience.value = 'all';
    if (siteMessageTargets) siteMessageTargets.value = '';
    if (siteMessageActionValue) siteMessageActionValue.value = '';
    updateSiteMessageAudienceVisibility();
    updateSiteMessageActionValueVisibility();
    updateSiteMessagePreview();
    setStatus(siteMessageStatus, '');
  }

  function updateSiteMessageAudienceVisibility() {
    if (siteMessageTargetsRow) siteMessageTargetsRow.hidden = siteMessageAudience?.value !== 'selected';
  }

  function updateSiteMessageActionValueVisibility() {
    if (siteMessageActionValueRow) siteMessageActionValueRow.hidden = siteMessageAction?.value !== 'open_url';
  }

  function updateSiteMessagePreview() {
    if (!siteMessagePreview) return;
    const text = String(siteMessageText?.value || '').trim() || 'MESSAGE PREVIEW';
    const button = String(siteMessageButtonLabel?.value || '').trim();
    const hasAction = Boolean(button && siteMessageAction?.value);
    siteMessagePreview.style.background = siteMessageBackground?.value || '#f2b51d';
    siteMessagePreview.style.color = siteMessageTextColour?.value || '#171719';
    siteMessagePreview.innerHTML = `<strong>${escapeHtml(text)}</strong>${hasAction ? `<button type="button" tabindex="-1">${escapeHtml(button)}</button>` : ''}`;
  }

  function fillSiteMessageForm(message) {
    if (!message) return;
    if (siteMessageDate) siteMessageDate.value = String(message.date || '');
    if (siteMessageText) siteMessageText.value = String(message.text || '');
    if (siteMessageBackground) siteMessageBackground.value = String(message.backgroundColor || '#f2b51d');
    if (siteMessageTextColour) siteMessageTextColour.value = String(message.textColor || '#171719');
    if (siteMessageButtonLabel) siteMessageButtonLabel.value = String(message.buttonLabel || '');
    if (siteMessageAudience) siteMessageAudience.value = message.audienceMode === 'selected' ? 'selected' : 'all';
    if (siteMessageTargets) siteMessageTargets.value = Array.isArray(message.targetUsernames) ? message.targetUsernames.join(', ') : '';
    if (siteMessageAction) siteMessageAction.value = String(message.actionKey || '');
    if (siteMessageActionValue) siteMessageActionValue.value = String(message.actionValue || '');
    if (siteMessageEnabled) siteMessageEnabled.checked = message.enabled !== false;
    updateSiteMessageAudienceVisibility();
    updateSiteMessageActionValueVisibility();
    updateSiteMessagePreview();
    siteMessageText?.focus?.();
  }

  function siteMessageActionLabel(key) {
    if (!key) return 'NO ACTION';
    const option = [...(siteMessageAction?.options || [])].find(item => item.value === key);
    return option ? option.textContent : key.toUpperCase();
  }

  function renderSiteMessages() {
    if (!siteMessageList) return;
    if (!siteMessages.length) {
      siteMessageList.innerHTML = '<p class="muted">No scheduled messages yet.</p>';
      return;
    }
    siteMessageList.innerHTML = siteMessages.map(message => `<div class="site-message-row${message.enabled === false ? ' is-disabled' : ''}">
      <strong>${escapeHtml(message.date)}</strong>
      <span>${escapeHtml(message.text)}<small>${escapeHtml(message.enabled === false ? 'DISABLED' : 'ENABLED')} · ${escapeHtml(message.audienceMode === 'selected' ? `TEST: ${(message.targetUsernames || []).join(', ')}` : 'EVERYONE')}</small></span>
      <span>${escapeHtml(message.buttonLabel ? `${message.buttonLabel} · ${siteMessageActionLabel(message.actionKey)}` : 'NO BUTTON')}</span>
      <div class="site-message-row-actions"><button type="button" data-message-edit="${escapeHtml(message.date)}">EDIT</button><button type="button" data-message-delete="${escapeHtml(message.date)}">DELETE</button></div>
    </div>`).join('');
  }

  async function loadSiteMessages() {
    setStatus(siteMessageStatus, 'LOADING MESSAGES…');
    try {
      const { response, data } = await api('', { action:'site_message_state' });
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) throw new Error(data.error || 'Could not load message schedule.');
      siteMessages = Array.isArray(data.messages) ? data.messages : [];
      renderSiteMessages();
      setStatus(siteMessageStatus, `${siteMessages.length} SCHEDULED MESSAGE${siteMessages.length === 1 ? '' : 'S'}`, 'success');
    } catch (error) {
      setStatus(siteMessageStatus, error.message || 'Could not load message schedule.', 'error');
    }
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
      const recovered = seconds <= 0 && Number(item.verifiedDailyCompletionAt) > 0;
      const intensity = seconds <= 0 ? (recovered ? 1 : 0) : seconds < 15 * 60 ? 1 : seconds < 45 * 60 ? 2 : seconds < 2 * 60 * 60 ? 3 : 4;
      days.push({ key, seconds, recovered, intensity, label: formatter.format(date), short: date.toLocaleDateString("en-GB", { weekday:"narrow" }), today: offset === 0 });
    }
    return days;
  }
  function activityStrip(summary, compact = false) {
    const days = weekActivity(summary);
    const hasAny = days.some(day => day.seconds > 0 || day.recovered);
    const classes = `activity-week${compact ? " activity-week-compact" : ""}${hasAny ? "" : " activity-week-empty"}`;
    return `<div class="${classes}" aria-label="Activity over the last seven days">${days.map(day => `<div class="activity-day${day.today ? " is-today" : ""}" title="${escapeHtml(day.label)} · ${escapeHtml(day.recovered ? "Daily completion recovered from saved result; time on site unknown" : duration(day.seconds))}"><i data-level="${day.intensity}" aria-hidden="true"></i><span>${escapeHtml(day.short)}</span></div>`).join("")}</div>`;
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
  const FIXED_AVATAR_CHARACTERS = Object.freeze({
    lincoln:"LINCOLN", beverley:"BEVERLEY", harry:"HARRY", stuart:"STUART", davido:"DAVIDO", samantha:"SAMANTHA",
    optimus:"OPTIMUS", pixella:"PIXELLA", bolderdash:"BOLDERDASH", sputnik:"SPUTNIK", vasquez:"VASQUEZ",
    bacterium:"BACTERIUM", clara:"CLARA", jamil:"JAMIL", clickers:"CLICKERS", bertrand:"BERTRAND", angie:"ANGIE", "the-haining":"THE HAINING",
    eric:"ERIC", marshall:"MARSHALL", catherine:"CATHERINE", "mr-pjkuylasg":"MR PJKUËYLASG", slippy:"SLIPPY", gobble:"GOBBLE",
    sandra:"SANDRA", blaze:"BLAZE", frederick:"FREDERICK", charlize:"CHARLIZE", "amy-annie":"AMY & ANNIE", bobbyburp:"BOBBYBURP",
    "mr-whack":"MR WHACK", elrick:"ELRICK", "ms-thompson":"MS THOMPSON", "sid-the-big":"SID THE BIG", quock:"QUOCK", bernard:"BERNARD",
    binky:"BINKY", hermit:"HERMIT", gusto:"GUSTO", polly:"POLLY", trisha:"TRISHA", wendy:"WENDY",
    roger:"ROGER", bobby:"BOBBY", carmen:"CARMEN", titchmarsh:"TITCHMARSH", bubbs:"BUBBS", porridge:"PORRIDGE"
  });

  function populateSiteMessageCharacterActions() {
    const group = document.getElementById("siteMessageCharacterActions");
    if (!group) return;
    group.querySelectorAll('option[data-fixed-character="1"]').forEach(option => option.remove());
    for (const [bodyType, label] of Object.entries(FIXED_AVATAR_CHARACTERS)) {
      const option = document.createElement("option");
      option.value = `character:${bodyType}`;
      option.textContent = label;
      option.dataset.fixedCharacter = "1";
      group.appendChild(option);
    }
  }
  populateSiteMessageCharacterActions();
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
    const bodyType = ["boy", "girl", ...Object.keys(FIXED_AVATAR_CHARACTERS)].includes(raw.bodyType) ? raw.bodyType : "boy";
    return {
      bodyType,
      tshirt: safeColour(raw.tshirt, AVATAR_DEFAULT.tshirt),
      trousers: safeColour(raw.trousers, AVATAR_DEFAULT.trousers),
      hair: safeColour(raw.hair, AVATAR_DEFAULT.hair),
      skin: safeColour(raw.skin, AVATAR_DEFAULT.skin),
      shoes: safeColour(raw.shoes, AVATAR_DEFAULT.shoes)
    };
  }
  function avatarCharacterLabel(bodyType) {
    if (FIXED_AVATAR_CHARACTERS[bodyType]) return FIXED_AVATAR_CHARACTERS[bodyType];
    if (bodyType === "girl") return "OLI";
    return "INDI";
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
    const fixedCharacter = Boolean(FIXED_AVATAR_CHARACTERS[style.bodyType]);
    try {
      const [base, ...layers] = await Promise.all([
        loadAvatarImage(`${root}/base.png`),
        ...(fixedCharacter ? [] : AVATAR_CATEGORIES.map(category => loadAvatarImage(`${root}/${category}.png`)))
      ]);
      if (!canvas.isConnected) return;
      const width = 90, height = 78, sourceWidth = 300, sourceHeight = 260;
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.drawImage(base, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
      if (!fixedCharacter) {
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
      }
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
    const character = avatarCharacterLabel(style.bodyType);
    if (FIXED_AVATAR_CHARACTERS[style.bodyType]) return `<div class="outfit-mini" title="Current character"><span>${character}</span></div>`;
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

  function selectedSyntheticIds() {
    return [...(syntheticUsersEl?.querySelectorAll('input[data-synthetic-select]:checked') || [])].map(input => input.value);
  }
  function renderSyntheticUsers() {
    if (!syntheticUsersEl) return;
    if (!syntheticUsers.length) {
      syntheticUsersEl.innerHTML = '<p class="muted">No artificial players yet.</p>';
      return;
    }
    syntheticUsersEl.innerHTML = syntheticUsers.map(user => {
      const score = syntheticScores.find(item => item.userId === user.id);
      const avatar = user.avatar
        ? `<canvas class="synthetic-avatar" data-avatar-user="${escapeHtml(user.id)}" width="72" height="62" aria-hidden="true"></canvas>`
        : `<span class="synthetic-avatar-empty">NO AVATAR</span>`;
      return `<div class="synthetic-user-row">
        <label><input type="checkbox" data-synthetic-select value="${escapeHtml(user.id)}">${avatar}<strong>${escapeHtml(user.username)}</strong></label>
        <span>${escapeHtml((user.defaultDevice || "computer").toUpperCase())}</span>
        <span>${score ? `${score.seconds.toFixed(2)}s · ${score.moves} moves` : "NO SCORE"}</span>
        <div class="synthetic-user-actions"><button type="button" data-synthetic-avatar="${escapeHtml(user.id)}">RANDOM AVATAR</button><button type="button" data-synthetic-delete="${escapeHtml(user.id)}" data-synthetic-name="${escapeHtml(user.username)}">DELETE</button></div>
      </div>`;
    }).join("");
    renderAvatarCanvases(syntheticUsers.filter(user => user.avatar).map(user => ({ id:user.id, summary:{ avatar:user.avatar } })));
  }
  async function loadDailyScores() {
    const date = syntheticDate?.value || dayKey(new Date());
    if (syntheticDate && !syntheticDate.value) syntheticDate.value = date;
    setStatus(dailyScoresStatus, "LOADING DAILY SCORES…");
    try {
      const [{response:stateResponse,data:state}, leaderboardResponse] = await Promise.all([
        api("", {action:"synthetic_state", date}),
        fetch(`/api/daily-leaderboard?date=${encodeURIComponent(date)}&admin=${Date.now()}`, {credentials:"same-origin",cache:"no-store"})
      ]);
      if (stateResponse.status === 401 || state.authenticated === false) { showLogin(); return; }
      if (!stateResponse.ok) throw new Error(state.error || "Could not load artificial players.");
      const leaderboard = await leaderboardResponse.json();
      if (!leaderboardResponse.ok) throw new Error(leaderboard.error || "Could not load leaderboard.");
      syntheticUsers = Array.isArray(state.users) ? state.users : [];
      syntheticScores = Array.isArray(state.scores) ? state.scores : [];
      renderSyntheticUsers();
      if (dailyScoresList) dailyScoresList.innerHTML = (leaderboard.entries || []).length
        ? leaderboard.entries.map((entry,index) => {
            const kind = entry.kind === "synthetic" ? "synthetic" : "real";
            const visibility = ["owner","hidden"].includes(entry.visibility) ? entry.visibility : "public";
            const ownerOption = kind === "real"
              ? `<option value="owner"${visibility === "owner" ? " selected" : ""}>OWNER ONLY</option>`
              : "";
            return `<div class="daily-score-row">
              <span>${index + 1}</span><strong class="daily-score-player">${escapeHtml(entry.username)}${entry.webdriverDetected === true ? '<b class="webdriver-badge" title="navigator.webdriver was true for this saved fastest-time run">WEBDRIVER</b>' : ''}</strong>
              <span>${Number(entry.seconds).toFixed(2)}s</span><span>${entry.moves == null ? "—" : `${Number(entry.moves)} moves`}</span>
              <span>${escapeHtml(String(entry.device || "—").toUpperCase())}</span>
              <span>${kind === "synthetic" ? "ARTIFICIAL" : "REAL"}</span>
              <select data-daily-score-visibility="${escapeHtml(entry.username)}" aria-label="Leaderboard visibility for ${escapeHtml(entry.username)}">
                <option value="public"${visibility === "public" ? " selected" : ""}>PUBLIC</option>
                ${ownerOption}
                <option value="hidden"${visibility === "hidden" ? " selected" : ""}>HIDDEN</option>
              </select>
            </div>`;
          }).join("")
        : '<p class="muted">No leaderboard scores for this date.</p>';
      setStatus(dailyScoresStatus, `${(leaderboard.entries || []).length} LEADERBOARD SCORES`, "success");
    } catch (error) {
      setStatus(dailyScoresStatus, error.message || "Could not load Daily scores.", "error");
    }
  }

  function hallDateText(value) {
    const date = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "DATE NOT ENTERED";
    try {
      return new Intl.DateTimeFormat("en-GB", { day:"numeric", month:"short", year:"numeric", timeZone:"UTC" }).format(new Date(`${date}T00:00:00Z`)).toUpperCase();
    } catch (_) { return date; }
  }

  function nextHallOfFamePlace() {
    const used = new Set(hallOfFameEntries.map(entry => Number(entry.place)).filter(Number.isInteger));
    for (let place = 1; place <= 50; place++) if (!used.has(place)) return place;
    return 50;
  }

  function populateHallOfFameUsers(selectedId = "") {
    if (!hallOfFameUser) return;
    const selected = String(selectedId || hallOfFameUser.value || "");
    const options = [...users]
      .sort((a,b) => String(a.username || "").localeCompare(String(b.username || ""), "en", { sensitivity:"base" }))
      .map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.username)}</option>`)
      .join("");
    hallOfFameUser.innerHTML = `<option value="">NO ACCOUNT LINK</option>${options}`;
    if ([...hallOfFameUser.options].some(option => option.value === selected)) hallOfFameUser.value = selected;
  }

  function resetHallOfFameForm() {
    hallOfFameForm?.reset();
    if (hallOfFameOriginalPlace) hallOfFameOriginalPlace.value = "";
    if (hallOfFamePlace) hallOfFamePlace.value = String(nextHallOfFamePlace());
    populateHallOfFameUsers("");
  }

  function fillHallOfFameForm(entry) {
    if (!entry) return;
    if (hallOfFameOriginalPlace) hallOfFameOriginalPlace.value = String(entry.place || "");
    if (hallOfFamePlace) hallOfFamePlace.value = String(entry.place || "");
    if (hallOfFameName) hallOfFameName.value = String(entry.name || "");
    if (hallOfFameLocation) hallOfFameLocation.value = String(entry.location || "");
    if (hallOfFameDate) hallOfFameDate.value = String(entry.completedDate || "");
    populateHallOfFameUsers(String(entry.userId || ""));
    hallOfFameForm?.scrollIntoView?.({ behavior:"smooth", block:"center" });
    hallOfFameName?.focus?.({ preventScroll:true });
  }

  function renderHallOfFame() {
    if (!hallOfFameList) return;
    const byPlace = new Map(hallOfFameEntries.map(entry => [Number(entry.place), entry]));
    const cards = [];
    for (let place = 1; place <= 50; place++) {
      const entry = byPlace.get(place);
      if (!entry) {
        cards.push(`<div class="hall-of-fame-admin-entry is-empty"><b class="hall-of-fame-admin-place">${place}</b><strong>AVAILABLE</strong><div class="hall-of-fame-admin-actions"><button type="button" data-hall-add="${place}">ADD ENTRY</button></div></div>`);
        continue;
      }
      const account = entry.linkedUsername ? `LINKED TO ${escapeHtml(entry.linkedUsername)}` : "NO ACCOUNT LINK";
      cards.push(`<div class="hall-of-fame-admin-entry is-claimed"><b class="hall-of-fame-admin-place">${place}</b><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(entry.location)}</span><small>${escapeHtml(hallDateText(entry.completedDate))}</small><small>${account}</small><div class="hall-of-fame-admin-actions"><button type="button" data-hall-edit="${place}">EDIT</button><button type="button" data-hall-delete="${place}">DELETE</button></div></div>`);
    }
    hallOfFameList.innerHTML = cards.join("");
  }

  async function loadHallOfFame() {
    setStatus(hallOfFameStatus, "LOADING HALL OF FAME…");
    try {
      const { response, data } = await api("", { action:"hall_of_fame_state" });
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) throw new Error(data.error || "Could not load Hall of Fame.");
      hallOfFameEntries = Array.isArray(data.entries) ? data.entries : [];
      populateHallOfFameUsers();
      renderHallOfFame();
      if (!hallOfFameOriginalPlace?.value) resetHallOfFameForm();
      setStatus(hallOfFameStatus, `${hallOfFameEntries.length} OF 50 PLACES CLAIMED`, "success");
    } catch (error) {
      setStatus(hallOfFameStatus, error.message || "Could not load Hall of Fame.", "error");
    }
  }

  function setView(view) {
    selectedView = ["players","completions","hall","daily","scores","messages"].includes(view) ? view : "players";
    if (playersPanel) playersPanel.hidden = selectedView !== "players";
    if (completionsPanel) completionsPanel.hidden = selectedView !== "completions";
    if (hallOfFamePanel) hallOfFamePanel.hidden = selectedView !== "hall";
    if (dailyPracticePanel) dailyPracticePanel.hidden = selectedView !== "daily";
    if (dailyScoresPanel) dailyScoresPanel.hidden = selectedView !== "scores";
    if (messageBarPanel) messageBarPanel.hidden = selectedView !== "messages";
    if (searchInput) searchInput.hidden = selectedView !== "players";
    playersTab?.setAttribute("aria-pressed", String(selectedView === "players"));
    completionsTab?.setAttribute("aria-pressed", String(selectedView === "completions"));
    hallOfFameTab?.setAttribute("aria-pressed", String(selectedView === "hall"));
    dailyPracticeTab?.setAttribute("aria-pressed", String(selectedView === "daily"));
    dailyScoresTab?.setAttribute("aria-pressed", String(selectedView === "scores"));
    messageBarTab?.setAttribute("aria-pressed", String(selectedView === "messages"));
    if (selectedView === "completions") renderCompletions();
    if (selectedView === "hall") loadHallOfFame();
    if (selectedView === "daily") loadPreparedDailies();
    if (selectedView === "scores") loadDailyScores();
    if (selectedView === "messages") loadSiteMessages();
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
        <td class="completion-rank" data-label="DATED ORDER">${rank}</td><td data-label="PLAYER"><strong>${escapeHtml(item.username)}</strong></td>
        <td data-label="LEVEL PACK">${escapeHtml(item.packName)}</td><td class="completion-date" data-label="COMPLETED · UK TIME">${escapeHtml(date)}</td>
        <td data-label="STATUS"><span class="completion-badge">${escapeHtml(completionStatusText(item))}</span>${item.needsReview&&item.reviewReason ? `<div class="muted">${escapeHtml(item.reviewReason)}</div>` : ""}${previous}</td></tr>`;
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
  function londonDateKey(date=new Date()) {
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
    const values=Object.fromEntries(parts.filter(part=>part.type!=="literal").map(part=>[part.type,part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  function addIsoDateDays(dateKey,days) {
    const [year,month,day]=String(dateKey).split("-").map(Number);
    const date=new Date(Date.UTC(year,month-1,day+Number(days||0)));
    return date.toISOString().slice(0,10);
  }
  function renderPracticeCards() {
    const query=String(practiceSearch?.value||"").trim().toLowerCase();
    const filter=practiceFilter?.value||"future";
    const tomorrow=addIsoDateDays(londonDateKey(),1);
    const ordered=preparedDailies.slice().sort((a,b)=>{
      const aDate=String(a.date||"");
      const bDate=String(b.date||"");
      const aFuture=aDate>=tomorrow;
      const bFuture=bDate>=tomorrow;
      if(aFuture!==bFuture)return aFuture?-1:1;
      return aFuture?aDate.localeCompare(bDate):bDate.localeCompare(aDate);
    });
    const list=ordered.filter(item=>{
      if(filter==="future"&&String(item.date||"")<tomorrow)return false;
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
    const hiddenCount=filter==="future"?preparedDailies.filter(item=>String(item.date||"")<tomorrow).length:0;
    setStatus(practiceStatus,filter==="future"
      ? `${list.length} FUTURE DAILY PUZZLES · ${hiddenCount} TODAY/PAST HIDDEN`
      : `${list.length} OF ${preparedDailies.length} PREPARED DAILY PUZZLES`);
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
      preparedDailies=data.puzzles.slice();
      practiceLoaded=true;renderPracticeCards();
    }catch(error){setStatus(practiceStatus,error.message||"Could not load Daily puzzles.","error");}
    finally{practiceBusy=false;}
  }
  // The private iframe has an opaque origin. The existing character renderer
  // must receive origin-clean spritesheets before it draws them to canvas.
  // Public image assets are fetched by the authenticated parent and reused
  // across practice sessions. No browser storage or account data is copied.
  const PRIVATE_CHARACTER_ASSETS=[
    ...["boy","girl"].flatMap(body=>
      ["base","hair","shoes","skin","trousers","tshirt"].map(layer=>`assets/characters/${body}/${layer}.png`)),
    ...Object.keys(FIXED_AVATAR_CHARACTERS).map(body=>`assets/characters/${body}/base.png`)
  ];
  let privateImageAssetsPromise=null;
  function loadPrivateImageAssets() {
    if(privateImageAssetsPromise)return privateImageAssetsPromise;
    privateImageAssetsPromise=Promise.all(PRIVATE_CHARACTER_ASSETS.map(async path=>{
      const response=await fetch(`/${path}`,{credentials:"same-origin",cache:"force-cache"});
      if(!response.ok)throw new Error(`Could not load practice artwork: ${path}`);
      const blob=await response.blob();
      const dataUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(new Error(`Could not prepare practice artwork: ${path}`));
        reader.readAsDataURL(blob);
      });
      return [path,dataUrl];
    })).then(entries=>Object.fromEntries(entries)).catch(error=>{privateImageAssetsPromise=null;throw error;});
    return privateImageAssetsPromise;
  }
  function practiceLoading(message, error=false) {
    if (!practiceLoadStatus) return;
    practiceLoadStatus.hidden=false;
    practiceLoadMessage.textContent=message;
    practiceRetry.hidden=!error;
  }
  async function openPractice(date) {
    const puzzle=preparedDailies.find(item=>item.date===date);
    if(!puzzle||!practiceModal||!practiceFrame)return;
    if(practiceModal.hidden)lastPracticeFocus=document.activeElement;
    clearTimeout(practiceTimeout);
    practiceSession?.controller?.abort();
    const requestId=crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const controller=new AbortController();
    practiceSession={date,requestId,controller};
    practiceModalTitle.textContent=`DAILY #${Number(puzzle.sequence)||"?"} · ${puzzle.date}`;
    practiceModal.hidden=false;
    practiceFrame.hidden=false;
    practiceFrame.srcdoc="";
    practiceLoading("Preparing private Daily practice…");
    practiceTimeout=setTimeout(()=>{
      if(practiceSession?.requestId===requestId)practiceLoading("The practice window did not finish loading. Please retry.",true);
    },50000);
    requestAnimationFrame(()=>practiceClose?.focus());
    try {
      // The authenticated parent makes the request. An opaque sandboxed
      // iframe cannot reliably send a SameSite=Lax Basement session cookie.
      const response=await fetch(`/basement/practice?date=${encodeURIComponent(date)}&requestId=${encodeURIComponent(requestId)}&v=357`,{
        credentials:"same-origin",cache:"no-store",signal:controller.signal,
        headers:{Accept:"text/html"}
      });
      const source=await response.text();
      if(practiceSession?.requestId!==requestId)return;
      if(!response.ok)throw new Error(source.slice(0,400)||`Practice request failed (${response.status}).`);
      if(!response.headers.get("content-type")?.includes("text/html") || !source.includes('practice-runtime.js?v=357'))
        throw new Error("The practice page is missing or incompatible. Re-upload the complete replacement.");
      practiceLoading("Preparing private character artwork…");
      const privateAssets=await loadPrivateImageAssets();
      if(practiceSession?.requestId!==requestId)return;
      if(!source.includes("__BOXXY_PRIVATE_ASSET_DATA__"))throw new Error("The private practice page is incompatible.");
      const assetPayload=JSON.stringify(privateAssets).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
      practiceLoading("Loading the private game…");
      practiceFrame.srcdoc=source.replace("__BOXXY_PRIVATE_ASSET_DATA__",assetPayload);
    } catch(error) {
      if(practiceSession?.requestId!==requestId||error.name==="AbortError")return;
      clearTimeout(practiceTimeout);
      practiceLoading(error.message||"Could not load private practice.",true);
    }
  }
  function closePractice() {
    if(!practiceModal||practiceModal.hidden)return;
    clearTimeout(practiceTimeout);
    practiceSession?.controller?.abort();
    practiceSession=null;
    if(practiceFrame)practiceFrame.srcdoc="";
    practiceFrame?.removeAttribute("src");
    practiceFrame.hidden=true;
    practiceLoadStatus.hidden=true;
    practiceModal.hidden=true;
    if(lastPracticeFocus?.isConnected)lastPracticeFocus.focus();
    lastPracticeFocus=null;
  }
  window.addEventListener("message",event=>{
    if(event.source!==practiceFrame?.contentWindow||event.origin!=="null"||!practiceSession||practiceModal.hidden)return;
    const data=event.data;
    if(!data||typeof data!=="object"||data.requestId!==practiceSession.requestId||data.date!==practiceSession.date)return;
    if(data.type==="BOXXY_PRACTICE_READY"){
      clearTimeout(practiceTimeout);practiceLoadStatus.hidden=true;practiceFrame.hidden=false;
      practiceFrame.focus();
    } else if(data.type==="BOXXY_PRACTICE_ERROR"){
      clearTimeout(practiceTimeout);practiceLoading(String(data.message||"Could not load private practice.").slice(0,500),true);
    } else if(data.type==="BOXXY_PRACTICE_RETRY")openPractice(practiceSession.date);
  });
  practiceRetry?.addEventListener("click",()=>{if(practiceSession)openPractice(practiceSession.date);});
  practiceSearch?.addEventListener("input",renderPracticeCards);
  practiceFilter?.addEventListener("change",renderPracticeCards);
  practiceCards?.addEventListener("click",event=>{
    const button=event.target.closest("[data-practice-open]");if(button)openPractice(button.dataset.practiceOpen);
  });
  practiceClose?.addEventListener("click",closePractice);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!practiceModal?.hidden){event.preventDefault();closePractice();}});
  function filteredUsers() {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const list = query ? users.filter(user => [user.username, user.email, user.googleEmail, user.signupIp, user.lastIp, user.summary?.clickPushCode, ...(user.summary?.clickPushCodes || [])].some(value => String(value || "").toLowerCase().includes(query))) : users;
    return list.slice().sort(compareUsers);
  }
  function sessionBadge(user) {
    const count = Math.max(0, Number(user?.validSessionCount) || 0);
    return `<span class="session-badge" data-valid="${count > 0}" title="${count ? `${count} valid server session${count === 1 ? "" : "s"}. Cookie may have been removed from device.` : "No valid sessions recorded on the server."}">${count ? `SIGNED IN · ${count}` : "SIGNED OUT"}</span>`;
  }
  function sessionHistoryHtml(sessions) {
    if (!Array.isArray(sessions) || !sessions.length) {
      return `<p class="muted">No preserved login sessions. Sign-ins deleted before v363 cannot be recovered.</p>`;
    }
    return `<p class="muted">A valid server session does not prove the cookie still exists on that device. Last contact is recorded when the app checks the account or uploads progress. Pre-v363 session history may be incomplete.</p>
      <div class="session-history">${sessions.map(s => {
        const status = s.valid ? "VALID SESSION" : s.endedAt ?
          (s.endReason === "logout" ? "SIGNED OUT" : "REVOKED") :
          s.expired ? "EXPIRED" : "NO LONGER VALID";
        const endedAt = s.endedAt || (s.expired ? s.expiresAt : 0);
        const reason = s.endedAt && s.endReason ? ` (${escapeHtml(s.endReason.replace(/_/g, " "))})` : "";
        return `<div class="session-record"><div class="session-record-head"><strong>${escapeHtml(status)}</strong><span>${escapeHtml(browserDevice(s.userAgent))}</span></div>
          <div>STARTED <strong>${escapeHtml(dateTime(s.startedAt))}</strong></div>
          <div>LAST CONFIRMED CONTACT <strong>${s.legacy && s.lastSeenAt === s.startedAt ? "Not recorded before v363" : escapeHtml(dateTime(s.lastSeenAt))}</strong></div>
          <div>ENDED <strong>${s.valid ? "Still valid" : escapeHtml(dateTime(endedAt))}${reason}</strong></div>
          <div>IP <strong>${escapeHtml(s.ip || "—")}</strong></div></div>`;
      }).join("")}</div>`;
  }
  function googleBadge(user) {
    return user?.googleLinked ? `<span class="google-badge">GOOGLE</span>` : "";
  }
  function clickPushBadge(summary) {
    if (!summary?.clickPushUnlocked) return "";
    const codes = Array.isArray(summary?.clickPushCodes) ? summary.clickPushCodes.filter(Boolean) : [];
    const code = String(codes[0] || summary?.clickPushCode || "").trim();
    const on = Boolean(summary?.clickPushEnabled);
    const deviceCount = Math.max(0, Number(summary?.clickPushDeviceCount) || 0);
    const devices = on && deviceCount > 1 ? ` · ${deviceCount} DEVICES` : "";
    return `<span class="click-push-badge">CLICK-PUSH · ${on ? "ON" : "OFF"}${devices}${code ? ` · ${escapeHtml(code)}` : ""}</span>`;
  }
  function instantMoveBadge(user) {
    return user?.instantMoveEnabled
      ? '<span class="instant-move-badge">INSTANT</span>'
      : '';
  }

  function clickPushDetail(summary) {
    if (!summary?.clickPushUnlocked) return "—";
    const codes = Array.isArray(summary?.clickPushCodes) ? summary.clickPushCodes.filter(Boolean) : [];
    const codeText = codes.length ? codes.map(escapeHtml).join(" / ") : escapeHtml(String(summary?.clickPushCode || ""));
    const deviceCount = Math.max(0, Number(summary?.clickPushDeviceCount) || 0);
    if (summary?.clickPushEnabled) return `ON · ${deviceCount || 1} ${deviceCount === 1 ? "DEVICE" : "DEVICES"}${codeText ? ` · ${codeText}` : ""}`;
    return `UNLOCKED · OFF${codeText ? ` · ${codeText}` : ""}`;
  }
  function emailCell(user) {
    const google = user?.googleLinked
      ? `<div class="google-email-line">${googleBadge(user)}<span>${escapeHtml(user.googleEmail || "—")}</span></div>`
      : "";
    return `<div>${escapeHtml(user.email)}</div>${google}`;
  }
  function renderUsers() {
    const list=filteredUsers();
    const number=value=>Number(value||0).toLocaleString("en-GB");
    if(userRows)userRows.innerHTML=list.map(user=>`<tr data-user-id="${escapeHtml(user.id)}" tabindex="0">
      <td><div class="basement-user-identity"><canvas class="basement-avatar" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-label="Current character"></canvas><div class="basement-user-copy"><div class="user-main user-with-status">${onlineDot(user)}${escapeHtml(user.username)}${sessionBadge(user)}${googleBadge(user)}${clickPushBadge(user.summary)}${instantMoveBadge(user)}</div>${medalRail(user.summary)}${outfitMini(user.summary)}${boardStyleMini(user.summary)}</div></div></td>
      <td>${escapeHtml(dateTime(user.lastSeenAt))}</td>
      <td><strong>${escapeHtml(duration(user.totalActiveSeconds))}</strong></td>
      <td class="numeric-cell">${number(user.summary?.levelsCompleted)}</td>
      <td class="numeric-cell">${number(user.summary?.packsCompleted)}</td>
      <td class="numeric-cell">${number(user.summary?.totalSteps)}</td>
      <td class="numeric-cell">${number(user.summary?.totalPushes)}</td>
    </tr>`).join("");
    if(userCards)userCards.innerHTML=list.map(user=>`<button type="button" class="user-card" data-user-id="${escapeHtml(user.id)}" aria-label="Open ${escapeHtml(user.username)} account">
      <div class="user-card-heading"><canvas class="basement-avatar" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-hidden="true"></canvas><div><div class="user-main user-with-status">${onlineDot(user)}${escapeHtml(user.username)}${sessionBadge(user)}${googleBadge(user)}${clickPushBadge(user.summary)}${instantMoveBadge(user)}</div><span class="muted">${escapeHtml(user.email)}</span></div></div>
      <div class="user-card-grid"><div><span>LEVELS</span><strong>${number(user.summary?.levelsCompleted)}</strong></div><div><span>PACKS</span><strong>${number(user.summary?.packsCompleted)}</strong></div><div><span>STEPS</span><strong>${number(user.summary?.totalSteps)}</strong></div><div><span>PUSHES</span><strong>${number(user.summary?.totalPushes)}</strong></div></div>
      <div class="user-card-footer"><span>LAST ACTIVE</span><strong>${escapeHtml(dateTime(user.lastSeenAt))}</strong></div>
      <div class="user-card-footer"><span>LATEST SESSION</span><strong>${escapeHtml(dateTime(user.latestSessionStartedAt))}</strong></div>
    </button>`).join("");
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
      populateHallOfFameUsers();
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
    const character = avatarCharacterLabel(style.bodyType);
    const row = (label, colour) => `<div><span>${label}</span><strong><i class="outfit-swatch" style="--swatch:${colour}"></i>${colour.toUpperCase()}</strong></div>`;
    const boardRow = (label, colour) => {
      const swatch = BOARD_STYLE_SWATCHES[colour];
      return `<div><span>${label}</span><strong><i class="outfit-swatch" style="--swatch:${swatch.hex}"></i>${escapeHtml(swatch.label.toUpperCase())}</strong></div>`;
    };
    const clothingRows = FIXED_AVATAR_CHARACTERS[style.bodyType]
      ? ""
      : `${row("T-SHIRT", style.tshirt)}${row("TROUSERS / SKIRT", style.trousers)}${row("SHOES", style.shoes)}`;
    return `<div class="detail-outfit"><canvas class="basement-avatar basement-avatar-large" data-avatar-user="${escapeHtml(user.id)}" width="90" height="78" aria-label="Current BOXXY character and style"></canvas><div class="detail-outfit-grid"><div><span>CHARACTER</span><strong>${character}</strong></div>${clothingRows}${boardRow("BOX", board.box)}${boardRow("BOX ON TARGET", board.target)}</div></div>`;
  }
  function detailAttempts(summary) {
    const attempts = Array.isArray(summary?.attempts) ? summary.attempts : [];
    if (!attempts.length) return `<p class="muted">No level attempts recorded yet. Attempt counting begins with BOXXY v277.</p>`;
    return `<div class="attempt-list">${attempts.map(item => {
      const levelLabel = item.packId === "daily-boxxy"
        ? `Daily #${Number(item.levelNumber || 0) || escapeHtml(item.levelToken || "")}`
        : `Level ${Number(item.levelNumber || 0) || escapeHtml(item.levelToken || "")}`;
      // The separate pre-v376 aggregate list also needs the current names;
      // the main Play History already resolves them through this shared UI.
      const displayName = item.packId === "exponentially"
        ? (window.BOXXYHistoryUI?.levelNameFor?.(item) || item.levelName)
        : item.levelName;
      const name = displayName && displayName !== item.levelToken ? ` · ${escapeHtml(displayName)}` : "";
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
          <div><span>SERVER SIGN-IN STATUS</span><strong>${sessionBadge(user)}</strong></div>
          <div><span>FIRST RECORDED LOGIN</span><strong>${escapeHtml(dateTime(user.firstRecordedLoginAt))}</strong></div>
          <div><span>NEWEST VALID SESSION STARTED</span><strong>${escapeHtml(dateTime(user.latestSessionStartedAt))}</strong></div>
          <div><span>LAST ACTIVE</span><strong>${escapeHtml(dateTime(user.lastSeenAt))}</strong></div>
          <div><span>TOTAL TIME ONLINE</span><strong>${escapeHtml(duration(user.totalActiveSeconds))}</strong></div>
          <div><span>SIGNUP IP</span><strong>${escapeHtml(user.signupIp || "—")}</strong></div>
          <div><span>LAST IP</span><strong>${escapeHtml(user.lastIp || "—")}</strong></div>
          <div><span>ACTIVE PACK</span><strong>${escapeHtml(user.summary?.activePack || "—")}</strong></div>
          <div><span>LAST CLOUD SAVE</span><strong>${escapeHtml(dateTime(user.progressUpdatedAt))}</strong></div>
          <div><span>BROWSER / DEVICE</span><strong>${escapeHtml(browserDevice(user.userAgent))}</strong></div>
          <div><span>CLICK-PUSH BETA</span><strong>${clickPushDetail(user.summary)}</strong></div>
          <div><span>INSTANT MOVE ACCESS</span><strong>${user.instantMoveEnabled ? "ENABLED" : "DISABLED"}</strong></div>
        </div>
        <section><h3>LOGIN / SESSION HISTORY</h3>${sessionHistoryHtml(data.sessions)}</section>
        <section class="admin-feature-access">
          <div>
            <h3>INSTANT MOVE</h3>
            <p>Private account feature. When enabled, this player can select INSTANT MOVE from Menu → Boxxy Speed. Runs using it cannot set high scores.</p>
          </div>
          <div class="admin-feature-action">
            <button type="button" data-instant-move-toggle data-user-id="${escapeHtml(user.id)}" data-enabled="${user.instantMoveEnabled ? "true" : "false"}">${user.instantMoveEnabled ? "TURN OFF" : "TURN ON"}</button>
            <p class="status admin-instant-move-status" aria-live="polite"></p>
          </div>
        </section>
        <section class="admin-account-access">
          <div class="admin-account-access-copy">
            <h3>ACCOUNT ACCESS</h3>
            <p>Normal BOXXY password: <strong>${user.passwordEnabled ? "ENABLED" : "DISABLED"}</strong>. Resetting the password does not change progress or Google linking. It signs this player out of any existing BOXXY sessions.</p>
          </div>
          <form class="admin-password-reset" data-password-reset data-user-id="${escapeHtml(user.id)}" data-username="${escapeHtml(user.username)}">
            <label><span>NEW TEMPORARY PASSWORD</span><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
            <label><span>CONFIRM PASSWORD</span><input name="confirmPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
            <button type="submit">RESET PASSWORD</button>
            <p class="status admin-password-status" aria-live="polite"></p>
          </form>
        </section>
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
        <details><summary>PACK COMPLETION HISTORY</summary>${completionDetail(data.completions)}</details>
        <details><summary>PROGRESS SUMMARY</summary>${detailProgress(user.summary)}</details>
        <details class="admin-player-history"><summary>PLAY HISTORY</summary><div id="basementPlayerHistory" class="history-browser"></div></details>
        <details><summary>OLDER AGGREGATE ATTEMPT COUNTS</summary>${detailAttempts(user.summary)}</details>
        <section><h3>RAW CLOUD SAVE</h3><pre class="raw-progress">${escapeHtml(JSON.stringify(user.progress || {}, null, 2))}</pre></section>`;
      detailModal.hidden = false;
      window.BOXXYHistoryUI?.mount?.(document.getElementById('basementPlayerHistory'), query => {
        const params = new URLSearchParams({user:String(user.id), ...query});
        return '/api/basement?' + params;
      }, data.history || {levels:[],recent:[]}, {adminFlags:true});
      renderAvatarCanvases([user]);
      requestAnimationFrame(() => detailClose?.focus());
    } catch (_) { setStatus(dashboardStatus, "Could not load that account.", "error"); }
  }
  detailBody?.addEventListener("click", async event => {
    const button = event.target.closest("[data-instant-move-toggle]");
    if (!button) return;
    const userId = String(button.dataset.userId || "");
    const enabled = button.dataset.enabled === "true";
    const next = !enabled;
    const status = button.parentElement?.querySelector(".admin-instant-move-status");
    button.disabled = true;
    setStatus(status, next ? "ENABLING…" : "DISABLING…");
    try {
      const { response, data } = await api("", { action:"set_instant_move", userId, enabled:next });
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) {
        setStatus(status, data.error || "Could not update Instant Move.", "error");
        return;
      }
      button.dataset.enabled = String(next);
      button.textContent = next ? "TURN OFF" : "TURN ON";
      const user = users.find(item => String(item.id) === userId);
      if (user) {
        user.instantMoveEnabled = next;
        user.instantMoveUpdatedAt = Number(data.instantMoveUpdatedAt) || Date.now();
      }
      setStatus(status, next ? "INSTANT MOVE ENABLED" : "INSTANT MOVE DISABLED", "success");
      renderUsers();
    } catch (_) {
      setStatus(status, "Could not reach the Basement API.", "error");
    } finally {
      button.disabled = false;
    }
  });

  detailBody?.addEventListener("submit", async event => {
    const form = event.target.closest("[data-password-reset]");
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector(".admin-password-status");
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    const username = String(form.dataset.username || "this player");
    const userId = String(form.dataset.userId || "");

    if (password.length < 8 || password.length > 128) {
      setStatus(status, "Password must be 8–128 characters.", "error");
      return;
    }
    if (password !== confirmPassword) {
      setStatus(status, "The two passwords do not match.", "error");
      return;
    }
    if (!window.confirm(`Reset the normal BOXXY password for ${username}? Existing BOXXY sessions for this account will be signed out.`)) return;

    submit.disabled = true;
    setStatus(status, "RESETTING…");
    try {
      const { response, data: result } = await api("", { action:"reset_password", userId, password });
      if (response.status === 401 || result.authenticated === false) { showLogin(); return; }
      if (!response.ok) {
        setStatus(status, result.error || "Could not reset the password.", "error");
        return;
      }
      form.reset();
      const user = users.find(item => String(item.id) === userId);
      if (user) user.passwordEnabled = true;
      setStatus(status, `PASSWORD RESET FOR ${String(result.username || username).toUpperCase()}. EXISTING SESSIONS CLEARED.`, "success");
    } catch (_) {
      setStatus(status, "Could not reach the Basement API.", "error");
    } finally {
      submit.disabled = false;
    }
  });


  syntheticUserForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const username = String(syntheticUsername?.value || "").trim();
    if (!username) return;
    setStatus(dailyScoresStatus, "ADDING ARTIFICIAL PLAYER…");
    try {
      const {response,data} = await api("", {action:"synthetic_add_user", username, device:syntheticDevice?.value || "computer"});
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) throw new Error(data.error || "Could not add artificial player.");
      syntheticUserForm.reset();
      if (syntheticDevice) syntheticDevice.value = "computer";
      await loadDailyScores();
      setStatus(dailyScoresStatus, `${String(data.username || username).toUpperCase()} ADDED`, "success");
    } catch (error) { setStatus(dailyScoresStatus, error.message || "Could not add artificial player.", "error"); }
  });
  syntheticUsersEl?.addEventListener("click", async event => {
    const avatarButton = event.target.closest("[data-synthetic-avatar]");
    if (avatarButton) {
      try {
        const {response,data} = await api("", {action:"synthetic_random_avatar", userId:avatarButton.dataset.syntheticAvatar});
        if (!response.ok) throw new Error(data.error || "Could not create a random avatar.");
        await loadDailyScores();
        setStatus(dailyScoresStatus, `${String(data.username || "PLAYER").toUpperCase()} AVATAR UPDATED`, "success");
      } catch (error) { setStatus(dailyScoresStatus, error.message || "Could not create a random avatar.", "error"); }
      return;
    }
    const button = event.target.closest("[data-synthetic-delete]");
    if (!button) return;
    const name = button.dataset.syntheticName || "this artificial player";
    if (!window.confirm(`Delete ${name} and all generated scores for that artificial player?`)) return;
    try {
      const {response,data} = await api("", {action:"synthetic_delete_user", userId:button.dataset.syntheticDelete});
      if (!response.ok) throw new Error(data.error || "Could not delete artificial player.");
      await loadDailyScores();
    } catch (error) { setStatus(dailyScoresStatus, error.message || "Could not delete artificial player.", "error"); }
  });
  syntheticSelectAll?.addEventListener("click", () => {
    const boxes = [...(syntheticUsersEl?.querySelectorAll('input[data-synthetic-select]') || [])];
    const select = boxes.some(box => !box.checked);
    boxes.forEach(box => { box.checked = select; });
    syntheticSelectAll.textContent = select ? "CLEAR SELECTION" : "SELECT ALL";
  });
  syntheticScoreForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const userIds = selectedSyntheticIds();
    if (!userIds.length) { setStatus(dailyScoresStatus, "SELECT AT LEAST ONE ARTIFICIAL PLAYER.", "error"); return; }
    setStatus(dailyScoresStatus, "GENERATING DAILY SCORES…");
    try {
      const {response,data} = await api("", {
        action:"synthetic_generate_scores", date:syntheticDate?.value, userIds,
        device:syntheticScoreDevice?.value || "",
        minimumSeconds:syntheticMinSeconds?.value || "", maximumSeconds:syntheticMaxSeconds?.value || ""
      });
      if (!response.ok) throw new Error(data.error || "Could not generate scores.");
      await loadDailyScores();
      const counts = (data.generated || []).map(item => Number(item.moves));
      setStatus(dailyScoresStatus, `${counts.length} SCORES GENERATED · ${Math.min(...counts)}–${Math.max(...counts)} VERIFIED MOVES`, "success");
    } catch (error) { setStatus(dailyScoresStatus, error.message || "Could not generate scores.", "error"); }
  });
  syntheticRefreshMoves?.addEventListener("click", async () => {
    const userIds = selectedSyntheticIds();
    if (!userIds.length) {
      setStatus(dailyScoresStatus, "SELECT AT LEAST ONE ARTIFICIAL PLAYER.", "error");
      return;
    }
    const date = syntheticDate?.value || dayKey(new Date());
    if (!window.confirm(`Update the move counts of selected artificial players who already have scores for ${date}? Their times and devices will not change.`)) return;
    setStatus(dailyScoresStatus, "UPDATING EXISTING MOVE COUNTS…");
    try {
      const {response,data} = await api("", {action:"synthetic_regenerate_moves", date, userIds});
      if (response.status === 401 || data.authenticated === false) { showLogin(); return; }
      if (!response.ok) throw new Error(data.error || "Could not update move counts.");
      const counts = (data.generated || []).map(item => Number(item.moves));
      await loadDailyScores();
      setStatus(dailyScoresStatus, `${counts.length} MOVE COUNTS UPDATED · ${Math.min(...counts)}–${Math.max(...counts)} MOVES · TIMES AND DEVICES PRESERVED`, "success");
    } catch (error) {
      setStatus(dailyScoresStatus, error.message || "Could not update move counts.", "error");
    }
  });
  syntheticDate?.addEventListener("change", loadDailyScores);
  dailyScoresRefresh?.addEventListener("click", loadDailyScores);
  dailyScoresList?.addEventListener("change", async event => {
    const select = event.target.closest("[data-daily-score-visibility]");
    if (!select) return;
    const username = select.dataset.dailyScoreVisibility;
    const visibility = String(select.value || "public");
    const date = syntheticDate?.value || dayKey(new Date());
    select.disabled = true;
    setStatus(dailyScoresStatus, "UPDATING SCORE VISIBILITY…");
    try {
      const {response,data} = await api("", {action:"daily_set_score_visibility", username, date, visibility});
      if (!response.ok) throw new Error(data.error || "Could not update score visibility.");
      await loadDailyScores();
      const label = visibility === "owner" ? "OWNER ONLY" : visibility.toUpperCase();
      setStatus(dailyScoresStatus, `${String(username).toUpperCase()} · ${date} · ${label}`, "success");
    } catch (error) {
      await loadDailyScores();
      setStatus(dailyScoresStatus, error.message || "Could not update score visibility.", "error");
    }
  });

  siteMessageAudience?.addEventListener('change', updateSiteMessageAudienceVisibility);
  siteMessageAction?.addEventListener('change', () => { updateSiteMessageActionValueVisibility(); updateSiteMessagePreview(); });
  [siteMessageText,siteMessageBackground,siteMessageTextColour,siteMessageButtonLabel].forEach(element => element?.addEventListener('input', updateSiteMessagePreview));
  siteMessageClear?.addEventListener('click', resetSiteMessageForm);
  siteMessageRefresh?.addEventListener('click', loadSiteMessages);
  siteMessageForm?.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus(siteMessageStatus, 'SAVING MESSAGE…');
    try {
      const { response, data } = await api('', {
        action:'site_message_save',
        date:siteMessageDate?.value,
        text:siteMessageText?.value,
        backgroundColor:siteMessageBackground?.value,
        textColor:siteMessageTextColour?.value,
        audienceMode:siteMessageAudience?.value,
        targetUsernames:String(siteMessageTargets?.value || '').split(/[,;\n]+/).map(name => name.trim()).filter(Boolean),
        buttonLabel:siteMessageButtonLabel?.value,
        actionKey:siteMessageAction?.value,
        actionValue:siteMessageActionValue?.value,
        enabled:siteMessageEnabled?.checked !== false
      });
      if (!response.ok) throw new Error(data.error || 'Could not save message.');
      await loadSiteMessages();
      fillSiteMessageForm(data.message);
      setStatus(siteMessageStatus, `${String(data.message?.date || '').toUpperCase()} SAVED`, 'success');
    } catch (error) {
      setStatus(siteMessageStatus, error.message || 'Could not save message.', 'error');
    }
  });
  siteMessageList?.addEventListener('click', async event => {
    const edit = event.target.closest('[data-message-edit]');
    if (edit) {
      const message = siteMessages.find(item => item.date === edit.dataset.messageEdit);
      if (message) fillSiteMessageForm(message);
      return;
    }
    const remove = event.target.closest('[data-message-delete]');
    if (!remove) return;
    const date = remove.dataset.messageDelete;
    if (!window.confirm(`Delete the public message scheduled for ${date}?`)) return;
    setStatus(siteMessageStatus, 'DELETING MESSAGE…');
    try {
      const { response, data } = await api('', { action:'site_message_delete', date });
      if (!response.ok) throw new Error(data.error || 'Could not delete message.');
      await loadSiteMessages();
      if (siteMessageDate?.value === date) resetSiteMessageForm();
      setStatus(siteMessageStatus, `${String(date).toUpperCase()} DELETED`, 'success');
    } catch (error) {
      setStatus(siteMessageStatus, error.message || 'Could not delete message.', 'error');
    }
  });
  resetSiteMessageForm();

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault(); const form = new FormData(loginForm); setStatus(loginStatus, "CHECKING…");
    try {
      const { response, data } = await api("", { action:"login", username:form.get("username"), password:form.get("password") });
      if (!response.ok) { setStatus(loginStatus, data.error || "Incorrect login.", "error"); return; }
      loginForm.reset(); setStatus(loginStatus, ""); await loadUsers();
    } catch (_) { setStatus(loginStatus, "Could not reach the Basement API.", "error"); }
  });
  logoutBtn?.addEventListener("click", async () => { closePractice(); try { await api("", { action:"logout" }); } catch (_) {} users=[]; completions=[]; hallOfFameEntries=[]; syntheticUsers=[]; syntheticScores=[]; siteMessages=[]; preparedDailies=[];practiceLoaded=false;showLogin(); });
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
  hallOfFameTab?.addEventListener("click", () => setView("hall"));
  dailyPracticeTab?.addEventListener("click", () => setView("daily"));
  dailyScoresTab?.addEventListener("click", () => setView("scores"));
  messageBarTab?.addEventListener("click", () => setView("messages"));
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
  hallOfFameForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const place = Number(hallOfFamePlace?.value || 0);
    setStatus(hallOfFameStatus, "SAVING HALL OF FAME ENTRY…");
    try {
      const { response, data } = await api("", {
        action:"hall_of_fame_save",
        originalPlace:Number(hallOfFameOriginalPlace?.value || place),
        place,
        name:hallOfFameName?.value || "",
        location:hallOfFameLocation?.value || "",
        completedDate:hallOfFameDate?.value || "",
        userId:hallOfFameUser?.value || ""
      });
      if (!response.ok) throw new Error(data.error || "Could not save Hall of Fame entry.");
      if (hallOfFameOriginalPlace) hallOfFameOriginalPlace.value = String(data.entry?.place || place);
      await loadHallOfFame();
      const saved = hallOfFameEntries.find(entry => Number(entry.place) === Number(data.entry?.place || place));
      if (saved) fillHallOfFameForm(saved);
      setStatus(hallOfFameStatus, `NUMBER ${Number(data.entry?.place || place)} SAVED`, "success");
    } catch (error) {
      setStatus(hallOfFameStatus, error.message || "Could not save Hall of Fame entry.", "error");
    }
  });
  hallOfFameClear?.addEventListener("click", resetHallOfFameForm);
  hallOfFameRefresh?.addEventListener("click", loadHallOfFame);
  hallOfFameList?.addEventListener("click", async event => {
    const add = event.target.closest("[data-hall-add]");
    if (add) {
      resetHallOfFameForm();
      if (hallOfFamePlace) hallOfFamePlace.value = String(add.dataset.hallAdd || "");
      hallOfFameName?.focus?.();
      return;
    }
    const edit = event.target.closest("[data-hall-edit]");
    if (edit) {
      const entry = hallOfFameEntries.find(item => Number(item.place) === Number(edit.dataset.hallEdit));
      if (entry) fillHallOfFameForm(entry);
      return;
    }
    const remove = event.target.closest("[data-hall-delete]");
    if (!remove) return;
    const place = Number(remove.dataset.hallDelete || 0);
    const entry = hallOfFameEntries.find(item => Number(item.place) === place);
    if (!entry || !window.confirm(`Delete Hall of Fame number ${place}: ${entry.name}?`)) return;
    setStatus(hallOfFameStatus, `DELETING NUMBER ${place}…`);
    try {
      const { response, data } = await api("", { action:"hall_of_fame_delete", place });
      if (!response.ok) throw new Error(data.error || "Could not delete Hall of Fame entry.");
      if (Number(hallOfFameOriginalPlace?.value || 0) === place) resetHallOfFameForm();
      await loadHallOfFame();
      setStatus(hallOfFameStatus, `NUMBER ${place} DELETED`, "success");
    } catch (error) {
      setStatus(hallOfFameStatus, error.message || "Could not delete Hall of Fame entry.", "error");
    }
  });

  const TEXT_SCALE_KEY = "boxxy-basement-text-scale-v4";
  function applyTextScale(value) {
    const scale=[0.9,1,1.1,1.2].includes(Number(value))?Number(value):1;
    document.documentElement.style.setProperty("--admin-font-size",`${10*scale}px`);
    if(textSizeSelect)textSizeSelect.value=String(scale);
    try{localStorage.setItem(TEXT_SCALE_KEY,String(scale));}catch(_){}
  }
  let savedTextScale=1;
  try{savedTextScale=localStorage.getItem(TEXT_SCALE_KEY)||1;}catch(_){}
  applyTextScale(savedTextScale);
  textSizeSelect?.addEventListener("change",()=>applyTextScale(textSizeSelect.value));
  searchInput?.addEventListener("input", renderUsers);
  userRows?.addEventListener("click", event => { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); });
  userRows?.addEventListener("keydown", event => { if (event.key === "Enter") { const row = event.target.closest("[data-user-id]"); if (row) openDetail(row.dataset.userId); } });
  userCards?.addEventListener("click", event => { const button = event.target.closest("[data-user-id]"); if (button) openDetail(button.dataset.userId); });
  detailClose?.addEventListener("click", () => { detailModal.hidden = true; });
  detailModal?.addEventListener("click", event => { if (event.target === detailModal) detailModal.hidden = true; });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !detailModal.hidden) detailModal.hidden = true; });
  loadUsers();
})();
