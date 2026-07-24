/*
 * BOXXY — Pushbox Puzzle: Level Pack Builder
 * Copyright © 2026 Sam Cornwell. All rights reserved.
 * Personal non-commercial use only. See LICENSE.md.
 */
/* BOXXY v168 — pack previews, exports and editor hand-off preserve Rainbow Mode and coloured targets. */
(() => {
  "use strict";

  const openBtn = document.getElementById("makerPackBuilderBtn");
  const modal = document.getElementById("makerPackBuilderModal");
  const closeBtn = document.getElementById("makerPackBuilderCloseBtn");
  if (!openBtn || !modal || !closeBtn) return;

  const draftSelect = document.getElementById("packDraftSelect");
  const newDraftBtn = document.getElementById("packNewDraftBtn");
  const saveDraftBtn = document.getElementById("packSaveDraftBtn");
  const deleteDraftBtn = document.getElementById("packDeleteDraftBtn");
  const tabButtons = [...document.querySelectorAll("[data-pack-builder-tab]")];
  const packWorkspace = document.getElementById("packBuilderPackWorkspace");
  const dailyWorkspace = document.getElementById("packBuilderDailyWorkspace");
  const statusEl = document.getElementById("packBuilderStatus");

  const libraryGrid = document.getElementById("packLibraryGrid");
  const librarySearch = document.getElementById("packLibrarySearch");
  const libraryCount = document.getElementById("packLibraryCount");
  const packGrid = document.getElementById("packOrderGrid");
  const dailyGrid = document.getElementById("dailyOrderGrid");
  const packLevelCount = document.getElementById("packLevelCount");
  const dailyPuzzleCount = document.getElementById("dailyPuzzleCount");

  const packTitleInput = document.getElementById("packTitleInput");
  const packAuthorInput = document.getElementById("packAuthorInput");
  const packColumnsSelect = document.getElementById("packColumnsSelect");
  const packAccentSelect = document.getElementById("packAccentSelect");
  const packDescriptionInput = document.getElementById("packDescriptionInput");
  const packDestinationSelect = document.getElementById("packDestinationSelect");
  const packPublishPath = document.getElementById("packPublishPath");
  const packClearBtn = document.getElementById("packClearBtn");
  const packCopyBtn = document.getElementById("packCopyBtn");
  const packExportBtn = document.getElementById("packExportBtn");

  const dailyStartDate = document.getElementById("dailyStartDate");
  const dailyTimezoneLabel = document.getElementById("dailyTimezoneLabel");
  const dailyClearBtn = document.getElementById("dailyClearBtn");
  const dailyCopyBtn = document.getElementById("dailyCopyBtn");
  const dailyExportBtn = document.getElementById("dailyExportBtn");

  const SAVED_LEVELS_KEY = "boxxy-level-maker-saves-v1";
  const PACK_DRAFTS_KEY = "boxxy-pack-builder-drafts-v1";
  const ACTIVE_DRAFT_KEY = "boxxy-pack-builder-active-v1";
  const DAILY_DRAFT_KEY = "boxxy-daily-puzzle-draft-v1";
  const MAX_PACK_DRAFTS = 20;
  const VOID = "~";
  const TILE_CHARS = new Set([" ", "#", "@", "$", ".", "*", "+"]);
  const GOAL_COLOURS = window.BoxxyGoalColours;
  const DEFAULT_GOAL_COLOUR = GOAL_COLOURS?.DEFAULT || "red";
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Browser local time";

  let savedLevels = [];
  let drafts = [];
  let activeDraft = null;
  let dailyDraft = null;
  let activeTab = "pack";
  let dragPayload = null;
  let dropPlaceholder = null;
  let activeDropLocation = null;
  let autosaveTimer = 0;
  let pendingDeleteDraft = false;
  let pendingPackClear = false;
  let pendingDailyClear = false;
  let confirmationTimer = 0;

  function newId(prefix = "item") {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", type === "error");
    statusEl.classList.toggle("success", type === "success");
  }

  function safeParse(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function normaliseLayout(layout) {
    if (!Array.isArray(layout)) return [];
    const rows = layout.map(row => String(row || "").replace(/[^ #@$.+*]/g, " ").replace(/\s+$/g, ""));
    while (rows.length && !rows[0].trim()) rows.shift();
    while (rows.length && !rows.at(-1).trim()) rows.pop();
    return rows.length ? rows : [""];
  }

  function cellsToLayout(record) {
    const width = Math.max(1, Math.round(Number(record?.cols) || 1));
    const height = Math.max(1, Math.round(Number(record?.rows) || 1));
    if (!Array.isArray(record?.cells) || record.cells.length !== width * height) return [];
    const layout = [];
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        const raw = record.cells[y * width + x];
        const value = raw === VOID ? " " : String(raw || " ").charAt(0);
        line += TILE_CHARS.has(value) ? value : " ";
      }
      layout.push(line.replace(/\s+$/g, ""));
    }
    return normaliseLayout(layout);
  }

  function recordGoalColourMap(record) {
    const width = Math.max(1, Math.round(Number(record?.cols) || 1));
    const height = Math.max(1, Math.round(Number(record?.rows) || 1));
    if (!Array.isArray(record?.cells) || record.cells.length !== width * height) return {};
    const colours = Array.isArray(record.goalColours) ? record.goalColours : [];
    const rawRows = [];
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        const raw = record.cells[y * width + x];
        const value = raw === VOID ? " " : String(raw || " ").charAt(0);
        line += TILE_CHARS.has(value) ? value : " ";
      }
      rawRows.push(line.replace(/\s+$/g, ""));
    }
    let start = 0;
    let end = rawRows.length;
    while (start < end && !rawRows[start].trim()) start++;
    while (end > start && !rawRows[end - 1].trim()) end--;
    const map = {};
    for (let sourceY = start; sourceY < end; sourceY++) {
      for (let x = 0; x < width; x++) {
        const value = record.cells[sourceY * width + x];
        if (value !== "." && value !== "*" && value !== "+") continue;
        const colour = GOAL_COLOURS?.normalise?.(colours[sourceY * width + x]) || DEFAULT_GOAL_COLOUR;
        if (colour !== DEFAULT_GOAL_COLOUR) map[`${x},${sourceY - start}`] = colour;
      }
    }
    return map;
  }

  function normaliseGoalColourMap(value, layout) {
    return GOAL_COLOURS?.normaliseMap?.(value, normaliseLayout(layout)) || {};
  }

  function sameGoalColourMap(a, b) {
    return JSON.stringify(a || {}) === JSON.stringify(b || {});
  }

  function goalColourDataPresent(value) {
    if (Array.isArray(value)) return value.some(colour => typeof colour === "string" && colour.trim());
    return Boolean(value && typeof value === "object" && Object.keys(value).length);
  }

  function entryUsesRainbow(entry, goalColours = entry?.goalColours) {
    return entry?.rainbowMode === true || goalColourDataPresent(goalColours);
  }

  function countBoxes(layout) {
    return normaliseLayout(layout).join("").split("").filter(char => char === "$" || char === "*").length;
  }

  function cleanSolution(solution) {
    return String(solution || "").replace(/[^udlrUDLR]/g, "");
  }

  function solutionMoveCount(solution) {
    return cleanSolution(solution).length;
  }

  function clampPackColumns(value) {
    return Math.max(1, Math.min(8, Math.round(Number(value) || 6)));
  }

  function effectiveEntryAuthor(entry) {
    const individual = entry?.authorOverridden ? String(entry.author || "").trim() : "";
    return individual || String(activeDraft?.author || "").trim();
  }

  function solvedLabel(solution) {
    const moveCount = solutionMoveCount(solution);
    return moveCount ? `SOLVED · ${moveCount.toLocaleString()} ${moveCount === 1 ? "MOVE" : "MOVES"}` : "UNSOLVED";
  }

  function readSavedLevels() {
    const parsed = safeParse(SAVED_LEVELS_KEY, []);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(record => record && typeof record.id === "string" && typeof record.name === "string")
      .map(record => ({ ...record, layout: cellsToLayout(record) }))
      .filter(record => record.layout.length && record.layout.some(row => row.trim()))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "en-GB", { sensitivity: "base", numeric: true }));
  }

  function snapshotSavedLevel(record) {
    const layout = normaliseLayout(record.layout || cellsToLayout(record));
    const width = Math.max(1, ...layout.map(row => row.length));
    const goalColours = recordGoalColourMap(record);
    return {
      id: newId("pack-level"),
      sourceSaveId: record.id,
      name: String(record.name || "Untitled level").trim() || "Untitled level",
      nameOverridden: false,
      author: "",
      authorOverridden: false,
      layout,
      goalColours,
      rainbowMode: record?.rainbowMode === true || goalColourDataPresent(goalColours),
      solution: cleanSolution(record.solution),
      cols: width,
      rows: layout.length,
      boxes: countBoxes(layout),
      addedAt: Date.now()
    };
  }

  function normaliseEntry(entry) {
    const layout = normaliseLayout(entry?.layout);
    if (!layout.some(row => row.trim())) return null;
    const goalColours = normaliseGoalColourMap(entry?.goalColours, layout);
    return {
      id: typeof entry?.id === "string" ? entry.id : newId("pack-level"),
      sourceSaveId: typeof entry?.sourceSaveId === "string" ? entry.sourceSaveId : "",
      name: String(entry?.name || "Untitled level").trim() || "Untitled level",
      nameOverridden: Boolean(entry?.nameOverridden),
      author: String(entry?.author || "").trim(),
      authorOverridden: Boolean(entry?.authorOverridden && String(entry?.author || "").trim()),
      layout,
      goalColours,
      rainbowMode: entryUsesRainbow(entry, goalColours),
      solution: cleanSolution(entry?.solution),
      cols: Math.max(1, ...layout.map(row => row.length)),
      rows: layout.length,
      boxes: countBoxes(layout),
      addedAt: Number(entry?.addedAt) || Date.now()
    };
  }

  function synchroniseEntryFromSavedLevel(entry, record) {
    if (!entry?.sourceSaveId || entry.sourceSaveId !== record?.id) return false;
    const latest = snapshotSavedLevel(record);
    const nextLayout = latest.layout.slice();
    const sourceNameChanged = !entry.nameOverridden && entry.name !== latest.name;
    const changed = sourceNameChanged
      || entry.solution !== latest.solution
      || entry.cols !== latest.cols
      || entry.rows !== latest.rows
      || entry.boxes !== latest.boxes
      || Boolean(entry.rainbowMode) !== Boolean(latest.rainbowMode)
      || !sameGoalColourMap(entry.goalColours, latest.goalColours)
      || entry.layout.length !== nextLayout.length
      || entry.layout.some((row, index) => row !== nextLayout[index]);
    if (!changed) return false;
    if (!entry.nameOverridden) entry.name = latest.name;
    entry.layout = nextLayout;
    entry.goalColours = { ...latest.goalColours };
    entry.rainbowMode = Boolean(latest.rainbowMode);
    entry.solution = latest.solution;
    entry.cols = latest.cols;
    entry.rows = latest.rows;
    entry.boxes = latest.boxes;
    return true;
  }

  function synchroniseLinkedEntries() {
    const byId = new Map(savedLevels.map(record => [record.id, record]));
    let draftChanged = false;
    let dailyChanged = false;
    let updatedCount = 0;

    drafts.forEach(draft => {
      draft.entries.forEach(entry => {
        const record = byId.get(entry.sourceSaveId);
        if (record && synchroniseEntryFromSavedLevel(entry, record)) {
          draftChanged = true;
          updatedCount += 1;
        }
      });
    });

    dailyDraft?.entries?.forEach(entry => {
      const record = byId.get(entry.sourceSaveId);
      if (record && synchroniseEntryFromSavedLevel(entry, record)) {
        dailyChanged = true;
        updatedCount += 1;
      }
    });

    return { draftChanged, dailyChanged, updatedCount };
  }

  function persistLinkedSynchronisation(result) {
    try {
      if (result.draftChanged) localStorage.setItem(PACK_DRAFTS_KEY, JSON.stringify(drafts));
      if (result.dailyChanged) localStorage.setItem(DAILY_DRAFT_KEY, JSON.stringify(dailyDraft));
      return true;
    } catch (_) {
      setStatus("The browser could not synchronise updated saved levels with pack drafts.", "error");
      return false;
    }
  }

  function defaultDraft() {
    const now = Date.now();
    return {
      id: newId("pack-draft"),
      name: "Untitled Pack",
      author: "",
      columns: 6,
      accent: "black",
      description: "",
      destination: "boxxy-public",
      entries: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function normaliseDraft(draft) {
    const entries = Array.isArray(draft?.entries) ? draft.entries.map(normaliseEntry).filter(Boolean) : [];
    return {
      id: typeof draft?.id === "string" ? draft.id : newId("pack-draft"),
      name: String(draft?.name || "Untitled Pack").trim() || "Untitled Pack",
      author: String(draft?.author || ""),
      columns: clampPackColumns(draft?.columns),
      accent: ["black", "red", "blue", "yellow"].includes(draft?.accent) ? draft.accent : "black",
      description: String(draft?.description || ""),
      destination: ["boxxy-public", "boxxy-private", "xsb"].includes(draft?.destination) ? draft.destination : "boxxy-public",
      entries,
      createdAt: Number(draft?.createdAt) || Date.now(),
      updatedAt: Number(draft?.updatedAt) || Date.now()
    };
  }

  function readDrafts() {
    const parsed = safeParse(PACK_DRAFTS_KEY, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normaliseDraft).slice(0, MAX_PACK_DRAFTS);
  }

  function persistDrafts(announce = false) {
    if (!activeDraft) return false;
    activeDraft.updatedAt = Date.now();
    const existingIndex = drafts.findIndex(draft => draft.id === activeDraft.id);
    if (existingIndex >= 0) drafts[existingIndex] = activeDraft;
    else drafts.unshift(activeDraft);
    drafts = drafts
      .slice()
      .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
      .slice(0, MAX_PACK_DRAFTS);
    try {
      localStorage.setItem(PACK_DRAFTS_KEY, JSON.stringify(drafts));
      localStorage.setItem(ACTIVE_DRAFT_KEY, activeDraft.id);
      renderDraftSelect();
      if (announce) setStatus(`Saved pack draft “${activeDraft.name}”.`, "success");
      return true;
    } catch (_) {
      setStatus("The browser ran out of local storage while saving the pack draft.", "error");
      return false;
    }
  }

  function scheduleDraftSave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => persistDrafts(false), 240);
  }

  function defaultDailyDraft() {
    return {
      startDate: tomorrowDateString(),
      timezone: localTimezone,
      entries: [],
      updatedAt: Date.now()
    };
  }

  function normaliseDailyDraft(draft) {
    const entries = Array.isArray(draft?.entries) ? draft.entries.map(normaliseEntry).filter(Boolean) : [];
    return {
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(draft?.startDate || "")) ? draft.startDate : tomorrowDateString(),
      timezone: String(draft?.timezone || localTimezone),
      entries,
      updatedAt: Number(draft?.updatedAt) || Date.now()
    };
  }

  function persistDaily(announce = false) {
    if (!dailyDraft) return false;
    dailyDraft.updatedAt = Date.now();
    dailyDraft.timezone = localTimezone;
    try {
      localStorage.setItem(DAILY_DRAFT_KEY, JSON.stringify(dailyDraft));
      if (announce) setStatus("Saved the private Daily Puzzle schedule in this browser.", "success");
      return true;
    } catch (_) {
      setStatus("The browser ran out of local storage while saving the Daily Puzzle schedule.", "error");
      return false;
    }
  }

  function scheduleDailySave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => persistDaily(false), 240);
  }

  function syncDraftFromFields() {
    if (!activeDraft) return;
    activeDraft.name = packTitleInput.value.trim() || "Untitled Pack";
    activeDraft.author = packAuthorInput.value.trim();
    activeDraft.columns = clampPackColumns(packColumnsSelect?.value);
    activeDraft.accent = packAccentSelect.value;
    activeDraft.description = packDescriptionInput.value.trim();
    activeDraft.destination = packDestinationSelect.value;
    activeDraft.updatedAt = Date.now();
    updatePublishPath();
  }

  function loadDraftIntoFields() {
    if (!activeDraft) return;
    packTitleInput.value = activeDraft.name;
    packAuthorInput.value = activeDraft.author;
    if (packColumnsSelect) packColumnsSelect.value = String(activeDraft.columns);
    packAccentSelect.value = activeDraft.accent;
    packDescriptionInput.value = activeDraft.description;
    packDestinationSelect.value = activeDraft.destination;
    updatePublishPath();
  }

  function initialiseState() {
    savedLevels = readSavedLevels();
    drafts = readDrafts();
    if (!drafts.length) {
      drafts = [defaultDraft()];
      activeDraft = drafts[0];
      persistDrafts(false);
    } else {
      const preferredId = localStorage.getItem(ACTIVE_DRAFT_KEY) || "";
      activeDraft = drafts.find(draft => draft.id === preferredId) || drafts[0];
    }
    dailyDraft = normaliseDailyDraft(safeParse(DAILY_DRAFT_KEY, defaultDailyDraft()));
    const synchronised = synchroniseLinkedEntries();
    persistLinkedSynchronisation(synchronised);
    loadDraftIntoFields();
    dailyStartDate.value = dailyDraft.startDate;
    dailyTimezoneLabel.textContent = localTimezone;
    renderAll();
  }

  function renderDraftSelect() {
    const currentId = activeDraft?.id || "";
    draftSelect.innerHTML = "";
    drafts
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "en-GB", { sensitivity: "base", numeric: true }))
      .forEach(draft => {
        const option = document.createElement("option");
        option.value = draft.id;
        option.textContent = `${draft.name} · ${draft.entries.length} ${draft.entries.length === 1 ? "level" : "levels"}`;
        draftSelect.appendChild(option);
      });
    draftSelect.value = currentId;
    deleteDraftBtn.disabled = drafts.length <= 1;
  }

  function setActiveDraft(id) {
    syncDraftFromFields();
    persistDrafts(false);
    activeDraft = drafts.find(draft => draft.id === id) || drafts[0] || defaultDraft();
    localStorage.setItem(ACTIVE_DRAFT_KEY, activeDraft.id);
    resetConfirmations();
    loadDraftIntoFields();
    renderAll();
    setStatus(`Opened pack draft “${activeDraft.name}”.`, "success");
  }

  function createDraft() {
    syncDraftFromFields();
    persistDrafts(false);
    const draft = defaultDraft();
    drafts.unshift(draft);
    activeDraft = draft;
    persistDrafts(false);
    loadDraftIntoFields();
    renderAll();
    packTitleInput.focus();
    packTitleInput.select();
    setStatus("Created a new empty pack draft.", "success");
  }

  function resetConfirmations() {
    pendingDeleteDraft = false;
    pendingPackClear = false;
    pendingDailyClear = false;
    clearTimeout(confirmationTimer);
    deleteDraftBtn.textContent = "DELETE";
    packClearBtn.textContent = "CLEAR PACK";
    dailyClearBtn.textContent = "CLEAR QUEUE";
  }

  function armTemporaryConfirmation(callback) {
    clearTimeout(confirmationTimer);
    confirmationTimer = window.setTimeout(() => {
      resetConfirmations();
      callback?.();
    }, 4200);
  }

  function deleteActiveDraft() {
    if (drafts.length <= 1) {
      setStatus("At least one pack draft is retained.", "error");
      return;
    }
    if (!pendingDeleteDraft) {
      resetConfirmations();
      pendingDeleteDraft = true;
      deleteDraftBtn.textContent = "CONFIRM";
      setStatus(`Press CONFIRM to delete the draft “${activeDraft.name}”.`, "error");
      armTemporaryConfirmation();
      return;
    }
    const removedName = activeDraft.name;
    drafts = drafts.filter(draft => draft.id !== activeDraft.id);
    activeDraft = drafts[0] || defaultDraft();
    resetConfirmations();
    persistDrafts(false);
    loadDraftIntoFields();
    renderAll();
    setStatus(`Deleted pack draft “${removedName}”.`, "success");
  }

  function slugify(value) {
    const slug = String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    return slug || "untitled-pack";
  }

  function publishPathForDraft() {
    const slug = slugify(activeDraft?.name);
    if (activeDraft?.destination === "boxxy-private") return `draft-packs/${slug}.json`;
    if (activeDraft?.destination === "xsb") return `${slug}.xsb`;
    return `level-packs/${slug}.js`;
  }

  function updatePublishPath() {
    packPublishPath.textContent = publishPathForDraft();
  }

  function classifyOutside(layout) {
    const height = layout.length;
    const width = Math.max(1, ...layout.map(row => row.length));
    const chars = layout.map(row => row.padEnd(width, " ").split(""));
    const outside = new Set();
    const queue = [];
    const key = (x, y) => `${x},${y}`;
    const add = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height || chars[y][x] !== " ") return;
      const id = key(x, y);
      if (outside.has(id)) return;
      outside.add(id);
      queue.push([x, y]);
    };
    for (let x = 0; x < width; x++) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      add(0, y);
      add(width - 1, y);
    }
    for (let index = 0; index < queue.length; index++) {
      const [x, y] = queue[index];
      add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
    }
    return { width, height, chars, outside };
  }

  function drawThumbnail(canvas, rawLayout, rawGoalColours = {}) {
    const layout = normaliseLayout(rawLayout);
    const goalColours = normaliseGoalColourMap(rawGoalColours, layout);
    const { width, height, chars, outside } = classifyOutside(layout);
    const logicalWidth = 300;
    const logicalHeight = 190;
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(logicalWidth * ratio);
    canvas.height = Math.round(logicalHeight * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.fillStyle = "#d7ccbc";
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    const tile = Math.max(2, Math.min((logicalWidth - 16) / width, (logicalHeight - 16) / height));
    const originX = (logicalWidth - tile * width) / 2;
    const originY = (logicalHeight - tile * height) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const char = chars[y][x];
        const isOutside = char === " " && outside.has(`${x},${y}`);
        if (isOutside) continue;
        const px = originX + x * tile;
        const py = originY + y * tile;
        context.fillStyle = "#f1e7d7";
        context.fillRect(px, py, tile + .25, tile + .25);
        context.strokeStyle = "rgba(60,45,30,.12)";
        context.lineWidth = Math.max(.4, tile * .025);
        context.strokeRect(px, py, tile, tile);
        if (char === "#") {
          context.fillStyle = "#232427";
          context.fillRect(px, py, tile, tile);
          context.fillStyle = "#070708";
          context.fillRect(px + tile * .08, py + tile * .76, tile * .84, tile * .16);
          continue;
        }
        const goalColourName = (char === "." || char === "*" || char === "+")
          ? (GOAL_COLOURS?.normalise?.(goalColours[`${x},${y}`]) || DEFAULT_GOAL_COLOUR)
          : DEFAULT_GOAL_COLOUR;
        const goalColour = GOAL_COLOURS?.PALETTE?.[goalColourName]?.hex || "#db3b27";
        if (char === "." || char === "*" || char === "+") {
          context.strokeStyle = goalColour;
          context.lineWidth = Math.max(1.2, tile * .12);
          context.beginPath();
          context.arc(px + tile / 2, py + tile / 2, tile * .27, 0, Math.PI * 2);
          context.stroke();
        }
        if (char === "$" || char === "*") {
          context.fillStyle = char === "*" ? goalColour : "#e5b32a";
          context.strokeStyle = char === "*"
            ? (goalColourName === "black" ? "#777b80" : "rgba(23,23,25,.72)")
            : "#6f5312";
          context.lineWidth = Math.max(.8, tile * .07);
          context.fillRect(px + tile * .18, py + tile * .18, tile * .64, tile * .64);
          context.strokeRect(px + tile * .18, py + tile * .18, tile * .64, tile * .64);
        }
        if (char === "@" || char === "+") {
          context.fillStyle = "#20539a";
          context.beginPath();
          context.arc(px + tile / 2, py + tile * .43, tile * .22, 0, Math.PI * 2);
          context.fill();
          context.fillRect(px + tile * .34, py + tile * .48, tile * .32, tile * .34);
        }
      }
    }
  }

  function stopInteractiveDrag(element) {
    element.addEventListener("pointerdown", event => event.stopPropagation());
    element.addEventListener("dragstart", event => {
      event.preventDefault();
      event.stopPropagation();
    });
    return element;
  }

  function requestMakerAction(action, item) {
    const layout = normaliseLayout(item?.layout);
    if (!layout.some(row => row.trim())) {
      setStatus("That puzzle no longer has a usable layout.", "error");
      return;
    }
    const detail = {
      sourceSaveId: String(item?.sourceSaveId || item?.id || ""),
      name: String(item?.name || "Untitled level"),
      layout: layout.slice(),
      goalColours: normaliseGoalColourMap(item?.goalColours, layout),
      rainbowMode: entryUsesRainbow(item),
      solution: cleanSolution(item?.solution)
    };
    closeBuilder();
    window.dispatchEvent(new CustomEvent(`boxxy-pack-builder-${action}-level`, { detail }));
  }

  function persistTarget(target) {
    if (target === "daily") persistDaily(false);
    else persistDrafts(false);
  }

  function createLibraryCard(record) {
    const card = document.createElement("article");
    card.className = "pack-level-card pack-library-card";
    card.draggable = true;
    card.dataset.sourceId = record.id;
    card.title = `Drag “${record.name}” into the current ${activeTab === "daily" ? "Daily Puzzle queue" : "level pack"}.`;

    const canvas = document.createElement("canvas");
    canvas.className = "pack-level-preview";
    canvas.setAttribute("aria-label", `Starting position for ${record.name}`);
    drawThumbnail(canvas, record.layout, recordGoalColourMap(record));

    const body = document.createElement("div");
    body.className = "pack-level-card-body";
    const title = document.createElement("strong");
    title.textContent = record.name;
    const meta = document.createElement("span");
    const boxes = countBoxes(record.layout);
    const hasSolution = Boolean(cleanSolution(record.solution));
    meta.className = `pack-level-meta ${hasSolution ? "is-solved" : "is-unsolved"}`;
    meta.textContent = `${Math.max(1, ...record.layout.map(row => row.length))}×${record.layout.length} · ${boxes} ${boxes === 1 ? "BOX" : "BOXES"} · ${solvedLabel(record.solution)}`;

    const directActions = document.createElement("div");
    directActions.className = "pack-card-direct-actions";
    const edit = stopInteractiveDrag(document.createElement("button"));
    edit.type = "button";
    edit.textContent = "EDIT";
    edit.title = "Open this saved puzzle in the Level Maker";
    edit.addEventListener("click", event => {
      event.stopPropagation();
      requestMakerAction("edit", record);
    });
    const play = stopInteractiveDrag(document.createElement("button"));
    play.type = "button";
    play.textContent = "PLAY";
    play.title = "Play this puzzle immediately";
    play.addEventListener("click", event => {
      event.stopPropagation();
      requestMakerAction("play", record);
    });
    directActions.append(edit, play);

    const add = stopInteractiveDrag(document.createElement("button"));
    add.type = "button";
    add.className = "pack-card-add";
    add.textContent = activeTab === "daily" ? "ADD TO DAILY" : "ADD TO PACK";
    add.addEventListener("click", event => {
      event.stopPropagation();
      addSavedLevel(record.id, activeTab);
    });
    body.append(title, meta, directActions, add);
    card.append(canvas, body);

    card.addEventListener("dragstart", event => beginDrag(event, { source: "library", sourceId: record.id }));
    card.addEventListener("dragend", finishDrag);
    return card;
  }

  function dateForDailyIndex(index) {
    return addDaysToDateString(dailyDraft.startDate, index);
  }

  function humanDate(dateString) {
    const date = dateAtLocalNoon(dateString);
    if (!date) return dateString;
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date).toUpperCase();
  }

  function createOrderCard(entry, index, target) {
    const card = document.createElement("article");
    card.className = "pack-level-card pack-order-card";
    card.draggable = true;
    card.dataset.entryId = entry.id;
    card.dataset.index = String(index);

    const badge = document.createElement("b");
    badge.className = "pack-order-badge";
    badge.textContent = target === "daily" ? humanDate(dateForDailyIndex(index)) : String(index + 1).padStart(2, "0");

    const canvas = document.createElement("canvas");
    canvas.className = "pack-level-preview";
    canvas.setAttribute("aria-label", `Starting position for ${entry.name}`);
    drawThumbnail(canvas, entry.layout, entry.goalColours);

    const body = document.createElement("div");
    body.className = "pack-level-card-body";
    const title = document.createElement("strong");
    title.textContent = entry.name;

    const authorLine = document.createElement("span");
    authorLine.className = "pack-level-author";
    const refreshAuthorLine = () => {
      const author = effectiveEntryAuthor(entry);
      authorLine.textContent = `AUTHOR · ${author || "NOT SPECIFIED"}`;
    };
    refreshAuthorLine();

    const meta = document.createElement("span");
    const hasSolution = Boolean(cleanSolution(entry.solution));
    meta.className = `pack-level-meta ${hasSolution ? "is-solved" : "is-unsolved"}`;
    meta.textContent = target === "daily"
      ? `00:00 · ${dailyDraft.timezone} · ${solvedLabel(entry.solution)}`
      : `${entry.cols}×${entry.rows} · ${entry.boxes} ${entry.boxes === 1 ? "BOX" : "BOXES"} · ${solvedLabel(entry.solution)}`;

    const directActions = document.createElement("div");
    directActions.className = `pack-card-direct-actions ${target === "pack" ? "with-details" : ""}`;
    let details = null;

    if (target === "pack") {
      const detailsToggle = stopInteractiveDrag(document.createElement("button"));
      detailsToggle.type = "button";
      detailsToggle.textContent = "DETAILS";
      detailsToggle.title = "Rename this pack entry or set an individual author";
      directActions.appendChild(detailsToggle);

      details = document.createElement("div");
      details.className = "pack-entry-details";
      details.hidden = true;

      const nameLabel = document.createElement("label");
      nameLabel.textContent = "PUZZLE NAME";
      const nameInput = stopInteractiveDrag(document.createElement("input"));
      nameInput.type = "text";
      nameInput.maxLength = 64;
      nameInput.value = entry.name;
      nameInput.autocomplete = "off";
      nameInput.addEventListener("input", () => {
        const source = savedLevels.find(record => record.id === entry.sourceSaveId);
        entry.name = nameInput.value.trim() || "Untitled level";
        entry.nameOverridden = !source || entry.name !== String(source.name || "").trim();
        title.textContent = entry.name;
        persistTarget(target);
      });
      nameLabel.appendChild(nameInput);

      const authorLabel = document.createElement("label");
      authorLabel.textContent = "PUZZLE AUTHOR · BLANK USES PACK AUTHOR";
      const authorInput = stopInteractiveDrag(document.createElement("input"));
      authorInput.type = "text";
      authorInput.maxLength = 64;
      authorInput.value = entry.authorOverridden ? entry.author : "";
      authorInput.placeholder = activeDraft.author || "Pack author not specified";
      authorInput.autocomplete = "off";
      authorInput.addEventListener("input", () => {
        const value = authorInput.value.trim();
        entry.author = value;
        entry.authorOverridden = Boolean(value && value !== activeDraft.author.trim());
        refreshAuthorLine();
        persistTarget(target);
      });
      authorLabel.appendChild(authorInput);

      details.append(nameLabel, authorLabel);

      detailsToggle.addEventListener("click", event => {
        event.stopPropagation();
        details.hidden = !details.hidden;
        card.draggable = details.hidden;
        detailsToggle.textContent = details.hidden ? "DETAILS" : "DONE";
        if (!details.hidden) nameInput.focus({ preventScroll: true });
      });
    }

    const edit = stopInteractiveDrag(document.createElement("button"));
    edit.type = "button";
    edit.textContent = "EDIT";
    edit.title = "Open this puzzle in the Level Maker";
    edit.addEventListener("click", event => {
      event.stopPropagation();
      requestMakerAction("edit", entry);
    });

    const play = stopInteractiveDrag(document.createElement("button"));
    play.type = "button";
    play.textContent = "PLAY";
    play.title = "Play this puzzle immediately";
    play.addEventListener("click", event => {
      event.stopPropagation();
      requestMakerAction("play", entry);
    });
    directActions.append(edit, play);

    const actions = document.createElement("div");
    actions.className = "pack-card-actions";
    const back = stopInteractiveDrag(document.createElement("button"));
    back.type = "button";
    back.textContent = "←";
    back.title = "Move earlier";
    back.disabled = index === 0;
    back.addEventListener("click", () => moveEntry(target, index, -1));
    const forward = stopInteractiveDrag(document.createElement("button"));
    forward.type = "button";
    forward.textContent = "→";
    forward.title = "Move later";
    const entries = target === "daily" ? dailyDraft.entries : activeDraft.entries;
    forward.disabled = index >= entries.length - 1;
    forward.addEventListener("click", () => moveEntry(target, index, 1));
    const remove = stopInteractiveDrag(document.createElement("button"));
    remove.type = "button";
    remove.textContent = "REMOVE";
    remove.addEventListener("click", () => removeEntry(target, index));
    actions.append(back, forward, remove);

    body.append(title);
    if (target === "pack") body.append(authorLine);
    body.append(meta, directActions);
    if (details) body.append(details);
    body.append(actions);
    card.append(badge, canvas, body);

    card.addEventListener("dragstart", event => beginDrag(event, { source: target, entryId: entry.id, index }));
    card.addEventListener("dragend", finishDrag);
    return card;
  }

  function emptyGridMessage(text) {
    const empty = document.createElement("div");
    empty.className = "pack-grid-empty";
    empty.textContent = text;
    return empty;
  }

  function renderLibrary() {
    const query = librarySearch.value.trim().toLocaleLowerCase("en-GB");
    const matches = query
      ? savedLevels.filter(record => record.name.toLocaleLowerCase("en-GB").includes(query))
      : savedLevels;
    libraryGrid.innerHTML = "";
    if (!matches.length) {
      libraryGrid.appendChild(emptyGridMessage(savedLevels.length ? "No saved level matches that search." : "Save levels in the Level Maker before building a pack."));
    } else {
      const fragment = document.createDocumentFragment();
      matches.forEach(record => fragment.appendChild(createLibraryCard(record)));
      libraryGrid.appendChild(fragment);
    }
    libraryCount.textContent = `${matches.length} OF ${savedLevels.length} SAVED ${savedLevels.length === 1 ? "LEVEL" : "LEVELS"}`;
  }

  function renderPackGrid() {
    packGrid.innerHTML = "";
    packGrid.style.gridTemplateColumns = `repeat(${clampPackColumns(activeDraft.columns)}, minmax(0, 1fr))`;
    activeDraft.entries.forEach((entry, index) => packGrid.appendChild(createOrderCard(entry, index, "pack")));
    if (!activeDraft.entries.length) packGrid.appendChild(emptyGridMessage("DRAG SAVED LEVELS HERE TO BUILD THE PACK"));
    packLevelCount.textContent = `${activeDraft.entries.length} ${activeDraft.entries.length === 1 ? "LEVEL" : "LEVELS"}`;
  }

  function renderDailyGrid() {
    dailyGrid.innerHTML = "";
    dailyDraft.entries.forEach((entry, index) => dailyGrid.appendChild(createOrderCard(entry, index, "daily")));
    if (!dailyDraft.entries.length) dailyGrid.appendChild(emptyGridMessage("DRAG SAVED LEVELS HERE TO SCHEDULE DAILY PUZZLES"));
    dailyPuzzleCount.textContent = `${dailyDraft.entries.length} ${dailyDraft.entries.length === 1 ? "DAY" : "DAYS"}`;
  }

  function renderAll() {
    renderDraftSelect();
    renderLibrary();
    renderPackGrid();
    renderDailyGrid();
    updatePublishPath();
    dailyTimezoneLabel.textContent = localTimezone;
  }

  function setTab(tab) {
    activeTab = tab === "daily" ? "daily" : "pack";
    packWorkspace.hidden = activeTab !== "pack";
    dailyWorkspace.hidden = activeTab !== "daily";
    tabButtons.forEach(button => {
      const active = button.dataset.packBuilderTab === activeTab;
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.classList.toggle("selected", active);
    });
    renderLibrary();
    if (activeTab === "daily") renderDailyGrid();
    else renderPackGrid();
  }

  function targetEntries(target) {
    return target === "daily" ? dailyDraft.entries : activeDraft.entries;
  }

  function entryAlreadyPresent(target, snapshot) {
    return targetEntries(target).some(entry => {
      if (snapshot.sourceSaveId && entry.sourceSaveId) return snapshot.sourceSaveId === entry.sourceSaveId;
      return entry.name === snapshot.name && entry.layout.join("\n") === snapshot.layout.join("\n");
    });
  }

  function afterTargetMutation(target, message) {
    if (target === "daily") {
      persistDaily(false);
      renderDailyGrid();
    } else {
      persistDrafts(false);
      renderPackGrid();
    }
    setStatus(message, "success");
  }

  function addSavedLevel(sourceId, target, insertionIndex = null) {
    const record = savedLevels.find(level => level.id === sourceId);
    if (!record) {
      setStatus("That saved level is no longer available in this browser.", "error");
      return;
    }
    const snapshot = snapshotSavedLevel(record);
    if (entryAlreadyPresent(target, snapshot)) {
      setStatus(`“${snapshot.name}” is already in the ${target === "daily" ? "Daily Puzzle queue" : "level pack"}.`, "error");
      return;
    }
    const entries = targetEntries(target);
    const index = insertionIndex == null ? entries.length : Math.max(0, Math.min(entries.length, insertionIndex));
    entries.splice(index, 0, snapshot);
    afterTargetMutation(target, `Added “${snapshot.name}” to the ${target === "daily" ? "Daily Puzzle queue" : "level pack"}.`);
  }

  function cloneWorkspaceEntry(payload, target, insertionIndex) {
    const sourceEntries = targetEntries(payload.source);
    const source = sourceEntries.find(entry => entry.id === payload.entryId);
    if (!source) return;
    const snapshot = { ...source, id: newId("pack-level"), layout: source.layout.slice(), goalColours: { ...(source.goalColours || {}) }, addedAt: Date.now() };
    if (entryAlreadyPresent(target, snapshot)) {
      setStatus(`“${snapshot.name}” is already in that destination.`, "error");
      return;
    }
    const entries = targetEntries(target);
    entries.splice(Math.max(0, Math.min(entries.length, insertionIndex)), 0, snapshot);
    afterTargetMutation(target, `Copied “${snapshot.name}” into the ${target === "daily" ? "Daily Puzzle queue" : "level pack"}.`);
  }

  function moveEntry(target, index, delta) {
    const entries = targetEntries(target);
    const nextIndex = index + delta;
    if (index < 0 || index >= entries.length || nextIndex < 0 || nextIndex >= entries.length) return;
    const [entry] = entries.splice(index, 1);
    entries.splice(nextIndex, 0, entry);
    afterTargetMutation(target, `Moved “${entry.name}” to position ${nextIndex + 1}.`);
  }

  function removeEntry(target, index) {
    const entries = targetEntries(target);
    if (index < 0 || index >= entries.length) return;
    const [removed] = entries.splice(index, 1);
    afterTargetMutation(target, `Removed “${removed.name}” from the ${target === "daily" ? "Daily Puzzle queue" : "level pack"}.`);
  }

  function beginDrag(event, payload) {
    dragPayload = payload;
    event.currentTarget.classList.add("dragging");
    event.dataTransfer.effectAllowed = payload.source === "library" ? "copy" : "move";
    event.dataTransfer.setData("application/x-boxxy-level", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", payload.sourceId || payload.entryId || "BOXXY level");
  }

  function finishDrag(event) {
    event?.currentTarget?.classList?.remove("dragging");
    dragPayload = null;
    clearDropMarkers();
  }

  function payloadFromEvent(event) {
    if (dragPayload) return dragPayload;
    try {
      return JSON.parse(event.dataTransfer.getData("application/x-boxxy-level") || "null");
    } catch (_) {
      return null;
    }
  }

  function insertionIndexForEvent(grid, event) {
    const cards = [...grid.querySelectorAll(".pack-order-card")];
    if (!cards.length) return 0;

    const rows = [];
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      let row = rows.at(-1);
      if (!row || Math.abs(row.top - rect.top) > 4) {
        row = { top: rect.top, bottom: rect.bottom, items: [] };
        rows.push(row);
      }
      row.bottom = Math.max(row.bottom, rect.bottom);
      row.items.push({ index, rect });
    });

    if (event.clientY < rows[0].top) return 0;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const nextRow = rows[rowIndex + 1];
      const rowLimit = nextRow ? (row.bottom + nextRow.top) / 2 : Infinity;
      if (event.clientY > rowLimit) continue;
      for (const item of row.items) {
        if (event.clientX < item.rect.left + item.rect.width / 2) return item.index;
      }
      return row.items.at(-1).index + 1;
    }
    return cards.length;
  }

  function ensureDropPlaceholder(grid) {
    if (!dropPlaceholder) {
      dropPlaceholder = document.createElement("article");
      dropPlaceholder.className = "pack-drop-placeholder";
      dropPlaceholder.setAttribute("aria-hidden", "true");
      const label = document.createElement("strong");
      label.textContent = "DROP HERE";
      dropPlaceholder.appendChild(label);
    }
    const sample = grid.querySelector(".pack-order-card:not(.dragging)") || grid.querySelector(".pack-order-card");
    dropPlaceholder.style.minHeight = sample
      ? `${Math.max(112, Math.round(sample.getBoundingClientRect().height))}px`
      : "150px";
    return dropPlaceholder;
  }

  function clearDropMarkers() {
    document.querySelectorAll(".pack-drop-zone.drag-over,.pack-order-card.drop-before,.pack-order-card.drop-after")
      .forEach(element => element.classList.remove("drag-over", "drop-before", "drop-after"));
    if (dropPlaceholder?.parentNode) dropPlaceholder.remove();
    document.querySelectorAll('.pack-grid-empty[data-drop-hidden="true"]').forEach(empty => {
      empty.hidden = false;
      delete empty.dataset.dropHidden;
    });
    activeDropLocation = null;
  }

  function markInsertion(grid, index, target) {
    document.querySelectorAll(".pack-drop-zone.drag-over").forEach(element => element.classList.remove("drag-over"));
    grid.classList.add("drag-over");

    const cards = [...grid.querySelectorAll(".pack-order-card")];
    const boundedIndex = Math.max(0, Math.min(cards.length, Number(index) || 0));
    const placeholder = ensureDropPlaceholder(grid);
    const empty = grid.querySelector(".pack-grid-empty");
    if (empty) {
      empty.hidden = true;
      empty.dataset.dropHidden = "true";
    }

    if (boundedIndex >= cards.length) grid.appendChild(placeholder);
    else grid.insertBefore(placeholder, cards[boundedIndex]);
    activeDropLocation = { grid, target, index: boundedIndex };
  }

  function installDropZone(grid, target) {
    grid.addEventListener("dragover", event => {
      const payload = payloadFromEvent(event);
      if (!payload) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = payload.source === "library" || payload.source !== target ? "copy" : "move";
      markInsertion(grid, insertionIndexForEvent(grid, event), target);
    });
    grid.addEventListener("dragleave", event => {
      if (!grid.contains(event.relatedTarget)) clearDropMarkers();
    });
    grid.addEventListener("drop", event => {
      const payload = payloadFromEvent(event);
      if (!payload) return;
      event.preventDefault();
      const insertionIndex = activeDropLocation?.grid === grid
        ? activeDropLocation.index
        : insertionIndexForEvent(grid, event);
      clearDropMarkers();
      if (payload.source === "library") {
        addSavedLevel(payload.sourceId, target, insertionIndex);
      } else if (payload.source === target) {
        const entries = targetEntries(target);
        const sourceIndex = entries.findIndex(entry => entry.id === payload.entryId);
        if (sourceIndex < 0) return;
        const [entry] = entries.splice(sourceIndex, 1);
        let targetIndex = insertionIndex;
        if (sourceIndex < targetIndex) targetIndex -= 1;
        targetIndex = Math.max(0, Math.min(entries.length, targetIndex));
        entries.splice(targetIndex, 0, entry);
        afterTargetMutation(target, `Moved “${entry.name}” to position ${targetIndex + 1}.`);
      } else {
        cloneWorkspaceEntry(payload, target, insertionIndex);
      }
      dragPayload = null;
    });
  }

  function localDateParts(date = new Date()) {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  }

  function dateStringFromParts(year, month, day) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function tomorrowDateString() {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    return dateStringFromParts(...localDateParts(date));
  }

  function dateAtLocalNoon(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ""));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addDaysToDateString(dateString, days) {
    const date = dateAtLocalNoon(dateString) || dateAtLocalNoon(tomorrowDateString());
    date.setDate(date.getDate() + Number(days || 0));
    return dateStringFromParts(...localDateParts(date));
  }

  function localMidnightIso(dateString) {
    const date = dateAtLocalNoon(dateString);
    if (!date) return "";
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  function levelObject(entry, index, packId, title) {
    return {
      rank: index + 1,
      sourceNumber: `${packId}-${index + 1}`,
      name: entry.name,
      author: effectiveEntryAuthor(entry),
      tier: title.toUpperCase(),
      minimum: null,
      pushMinimum: null,
      solutionMoves: solutionMoveCount(entry.solution) || null,
      solution: entry.solution,
      layout: entry.layout.slice(),
      ...(entry.rainbowMode ? { rainbowMode: true } : {}),
      ...(Object.keys(entry.goalColours || {}).length ? { goalColours: { ...entry.goalColours } } : {})
    };
  }

  function buildPackObject() {
    syncDraftFromFields();
    const title = activeDraft.name.trim() || "Untitled Pack";
    const id = slugify(title);
    return {
      format: "boxxy-level-pack",
      formatVersion: 1,
      id,
      title: title.toUpperCase(),
      displayName: title,
      author: activeDraft.author,
      accent: activeDraft.accent,
      license: "User-authored BOXXY collection",
      description: activeDraft.description,
      generatedAt: new Date().toISOString(),
      levels: activeDraft.entries.map((entry, index) => levelObject(entry, index, id, title))
    };
  }

  function buildPublicPackScript(pack) {
    return `/* BOXXY user level pack: ${pack.displayName.replace(/\*\//g, "* /")} */\n(() => {\n  "use strict";\n  const pack = ${JSON.stringify(pack, null, 2)};\n  const current = Array.isArray(window.BOXXY_LEVEL_PACKS) ? window.BOXXY_LEVEL_PACKS : [];\n  window.BOXXY_LEVEL_PACKS = [...current.filter(item => item?.id !== pack.id), pack];\n})();\n`;
  }

  function buildXsb(pack) {
    const lines = [
      `; ${pack.displayName}`,
      pack.author ? `; Author: ${pack.author}` : "; Author: not specified",
      pack.description ? `; ${pack.description}` : "; Created with BOXXY Pack Builder",
      ""
    ];
    pack.levels.forEach((level, index) => {
      lines.push(`; ${index + 1}. ${level.name}`);
      if (level.author) lines.push(`; Puzzle author: ${level.author}`);
      lines.push(...level.layout);
      if (level.solution) {
        lines.push(`; Solution moves: ${level.solutionMoves || solutionMoveCount(level.solution)}`);
        lines.push(`; Solution: ${level.solution}`);
      }
      lines.push("");
    });
    return lines.join("\n");
  }

  function packExportPayload() {
    const pack = buildPackObject();
    const slug = slugify(pack.displayName);
    if (!pack.levels.length) throw new Error("Add at least one saved level before exporting the pack.");
    if (activeDraft.destination === "xsb") {
      return { filename: `${slug}.xsb`, mime: "text/plain", text: buildXsb(pack) };
    }
    if (activeDraft.destination === "boxxy-private") {
      return {
        filename: `${slug}.json`,
        mime: "application/json",
        text: JSON.stringify({ ...pack, intendedPath: `draft-packs/${slug}.json`, visibility: "private-draft" }, null, 2)
      };
    }
    return { filename: `${slug}.js`, mime: "text/javascript", text: buildPublicPackScript(pack) };
  }

  function buildDailySchedule() {
    if (!dailyDraft.entries.length) throw new Error("Add at least one saved level to the Daily Puzzle queue.");
    return {
      format: "boxxy-daily-puzzle-schedule",
      formatVersion: 1,
      timezone: localTimezone,
      publishTimeLocal: "00:00",
      startDate: dailyDraft.startDate,
      intendedPath: "daily-puzzles/boxxy-daily-puzzles.json",
      frontEndEnabled: false,
      generatedAt: new Date().toISOString(),
      puzzles: dailyDraft.entries.map((entry, index) => {
        const date = dateForDailyIndex(index);
        return {
          sequence: index + 1,
          date,
          publishAtLocal: `${date}T00:00:00`,
          publishAtUtc: localMidnightIso(date),
          timezone: localTimezone,
          name: entry.name,
          solution: entry.solution,
          layout: entry.layout.slice(),
          ...(entry.rainbowMode ? { rainbowMode: true } : {}),
          ...(Object.keys(entry.goalColours || {}).length ? { goalColours: { ...entry.goalColours } } : {})
        };
      })
    };
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(successMessage, "success");
    } catch (_) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand?.("copy");
      textarea.remove();
      setStatus(copied ? successMessage : "The browser would not allow the data to be copied.", copied ? "success" : "error");
    }
  }

  function exportPack() {
    try {
      syncDraftFromFields();
      persistDrafts(false);
      const payload = packExportPayload();
      downloadText(payload.filename, payload.text, payload.mime);
      setStatus(`Built ${payload.filename}. Suggested destination: ${publishPathForDraft()}.`, "success");
    } catch (error) {
      setStatus(error?.message || "The pack could not be exported.", "error");
    }
  }

  function copyPack() {
    try {
      const payload = packExportPayload();
      copyText(payload.text, `Copied the ${activeDraft.entries.length}-level pack data.`);
    } catch (error) {
      setStatus(error?.message || "The pack could not be copied.", "error");
    }
  }

  function exportDaily() {
    try {
      persistDaily(false);
      const schedule = buildDailySchedule();
      const first = schedule.puzzles[0].date;
      const last = schedule.puzzles.at(-1).date;
      const filename = `boxxy-daily-puzzles-${first}-to-${last}.json`;
      downloadText(filename, JSON.stringify(schedule, null, 2), "application/json");
      setStatus(`Exported ${schedule.puzzles.length} Daily Puzzle dates at 00:00 ${localTimezone}.`, "success");
    } catch (error) {
      setStatus(error?.message || "The Daily Puzzle schedule could not be exported.", "error");
    }
  }

  function copyDaily() {
    try {
      const schedule = buildDailySchedule();
      copyText(JSON.stringify(schedule, null, 2), `Copied the ${schedule.puzzles.length}-day Daily Puzzle schedule.`);
    } catch (error) {
      setStatus(error?.message || "The Daily Puzzle schedule could not be copied.", "error");
    }
  }

  function clearPack() {
    if (!activeDraft.entries.length) return;
    if (!pendingPackClear) {
      resetConfirmations();
      pendingPackClear = true;
      packClearBtn.textContent = "CONFIRM CLEAR";
      setStatus("Press CONFIRM CLEAR to remove every level from this pack draft.", "error");
      armTemporaryConfirmation();
      return;
    }
    activeDraft.entries = [];
    resetConfirmations();
    persistDrafts(false);
    renderPackGrid();
    setStatus("Cleared the level pack order. Saved Level Maker puzzles were not deleted.", "success");
  }

  function clearDaily() {
    if (!dailyDraft.entries.length) return;
    if (!pendingDailyClear) {
      resetConfirmations();
      pendingDailyClear = true;
      dailyClearBtn.textContent = "CONFIRM CLEAR";
      setStatus("Press CONFIRM CLEAR to remove every puzzle from the Daily queue.", "error");
      armTemporaryConfirmation();
      return;
    }
    dailyDraft.entries = [];
    resetConfirmations();
    persistDaily(false);
    renderDailyGrid();
    setStatus("Cleared the private Daily Puzzle queue. Saved Level Maker puzzles were not deleted.", "success");
  }

  function openBuilder() {
    resetConfirmations();
    initialiseState();
    modal.hidden = false;
    document.body.classList.add("pack-builder-open");
    setTab(activeTab);
    window.setTimeout(() => closeBtn.focus({ preventScroll: true }), 0);
  }

  function closeBuilder() {
    syncDraftFromFields();
    persistDrafts(false);
    persistDaily(false);
    resetConfirmations();
    modal.hidden = true;
    document.body.classList.remove("pack-builder-open");
    openBtn.focus({ preventScroll: true });
  }

  installDropZone(packGrid, "pack");
  installDropZone(dailyGrid, "daily");

  openBtn.addEventListener("click", openBuilder);
  closeBtn.addEventListener("click", closeBuilder);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeBuilder();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeBuilder();
    }
  }, { capture: true });

  tabButtons.forEach(button => button.addEventListener("click", () => setTab(button.dataset.packBuilderTab)));
  draftSelect.addEventListener("change", () => setActiveDraft(draftSelect.value));
  newDraftBtn.addEventListener("click", createDraft);
  saveDraftBtn.addEventListener("click", () => {
    syncDraftFromFields();
    persistDrafts(true);
  });
  deleteDraftBtn.addEventListener("click", deleteActiveDraft);

  [packTitleInput, packAuthorInput, packDescriptionInput].forEach(input => {
    input.addEventListener("input", () => {
      syncDraftFromFields();
      scheduleDraftSave();
    });
  });
  packAuthorInput.addEventListener("change", () => {
    syncDraftFromFields();
    persistDrafts(false);
    renderPackGrid();
  });
  [packColumnsSelect, packAccentSelect, packDestinationSelect].filter(Boolean).forEach(input => {
    input.addEventListener("change", () => {
      syncDraftFromFields();
      persistDrafts(false);
      renderDraftSelect();
      if (input === packColumnsSelect) renderPackGrid();
    });
  });

  window.addEventListener("boxxy-saved-levels-changed", event => {
    if (!activeDraft || !dailyDraft) return;
    savedLevels = readSavedLevels();
    const synchronised = synchroniseLinkedEntries();
    persistLinkedSynchronisation(synchronised);
    if (!modal.hidden) renderAll();
    if (synchronised.updatedCount && event?.detail?.type === "solution") {
      setStatus(`${synchronised.updatedCount} linked ${synchronised.updatedCount === 1 ? "entry was" : "entries were"} updated with the saved solution.`, "success");
    }
  });

  librarySearch.addEventListener("input", renderLibrary);
  packClearBtn.addEventListener("click", clearPack);
  packCopyBtn.addEventListener("click", copyPack);
  packExportBtn.addEventListener("click", exportPack);

  dailyStartDate.addEventListener("change", () => {
    dailyDraft.startDate = /^\d{4}-\d{2}-\d{2}$/.test(dailyStartDate.value) ? dailyStartDate.value : tomorrowDateString();
    dailyStartDate.value = dailyDraft.startDate;
    persistDaily(false);
    renderDailyGrid();
    setStatus(`Daily Puzzle dates now begin on ${humanDate(dailyDraft.startDate)} at 00:00 ${localTimezone}.`, "success");
  });
  dailyClearBtn.addEventListener("click", clearDaily);
  dailyCopyBtn.addEventListener("click", copyDaily);
  dailyExportBtn.addEventListener("click", exportDaily);
})();
