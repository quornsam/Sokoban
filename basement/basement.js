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
  function progressText(summary) {
    const parts = Object.entries(summary?.packs || {}).map(([pack, data]) => `${pack}: ${Number(data.completed || 0)} complete`);
    if (summary?.dailyCompleted) parts.push(`daily: ${summary.dailyCompleted}`);
    return parts.length ? parts.join(" · ") : "No saved completions";
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
        <td><div class="user-main">${escapeHtml(user.username)}</div><div class="muted">${escapeHtml(user.summary?.activePack || "")}</div></td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(dateTime(user.createdAt))}</td>
        <td>${escapeHtml(dateTime(user.lastSeenAt))}</td>
        <td>${escapeHtml(duration(user.totalActiveSeconds))}</td>
        <td><div class="progress-list">${escapeHtml(progressText(user.summary))}</div></td>
        <td><div>${escapeHtml(user.lastIp || "—")}</div><div class="muted">signup ${escapeHtml(user.signupIp || "—")}</div></td>
      </tr>`).join("");
    if (userCards) userCards.innerHTML = list.map(user => `
      <article class="user-card"><button type="button" data-user-id="${escapeHtml(user.id)}">
        <div class="user-card-top"><span class="user-main">${escapeHtml(user.username)}</span><span class="muted">${escapeHtml(duration(user.totalActiveSeconds))}</span></div>
        <div class="muted">${escapeHtml(user.email)}</div>
        <div class="user-card-grid">
          <div><span>LAST ACTIVE</span><strong>${escapeHtml(dateTime(user.lastSeenAt))}</strong></div>
          <div><span>IP</span><strong>${escapeHtml(user.lastIp || "—")}</strong></div>
          <div><span>PROGRESS</span><strong>${escapeHtml(progressText(user.summary))}</strong></div>
          <div><span>JOINED</span><strong>${escapeHtml(dateTime(user.createdAt))}</strong></div>
        </div>
      </button></article>`).join("");
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
    const packs = Object.entries(summary?.packs || {});
    if (!packs.length && !summary?.dailyCompleted) return `<p class="muted">No cloud progress saved yet.</p>`;
    return `<div class="detail-progress">${packs.map(([name,data]) => `<div><strong>${escapeHtml(name)}</strong><span>${Number(data.completed || 0)} completed · current ${Number(data.currentLevel || 1)}</span></div>`).join("")}${summary?.dailyCompleted ? `<div><strong>DAILY</strong><span>${Number(summary.dailyCompleted)} completed</span></div>` : ""}</div>`;
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
          <div><span>ACTIVE TIME</span><strong>${escapeHtml(duration(user.totalActiveSeconds))}</strong></div>
          <div><span>SIGNUP IP</span><strong>${escapeHtml(user.signupIp || "—")}</strong></div>
          <div><span>LAST IP</span><strong>${escapeHtml(user.lastIp || "—")}</strong></div>
          <div><span>ACTIVE PACK</span><strong>${escapeHtml(user.summary?.activePack || "—")}</strong></div>
          <div><span>LAST CLOUD SAVE</span><strong>${escapeHtml(dateTime(user.progressUpdatedAt))}</strong></div>
          <div><span>BROWSER / DEVICE</span><strong>${escapeHtml(user.userAgent || "—")}</strong></div>
        </div>
        <section><h3>PROGRESS SUMMARY</h3>${detailProgress(user.summary)}</section>
        <section><h3>RAW CLOUD SAVE</h3><pre class="raw-progress">${escapeHtml(JSON.stringify(user.progress || {}, null, 2))}</pre></section>`;
      detailModal.hidden = false;
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
