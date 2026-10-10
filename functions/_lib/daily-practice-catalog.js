/* BOXXY v465 — all server-side Daily tools read the canonical monthly puzzle files. */
/* No second catalogue: a newly uploaded month is visible to Basement automatically. */
const FIRST_MONTH = "2026-08";
const MONTH_LIMIT = 120;

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function nextMonth(month) {
  const [year, number] = month.split("-").map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
}

function parseMonthlySchedule(source, month) {
  // Month files contain JSON inside this fixed wrapper. Parse it as data only:
  // never evaluate the JavaScript served from the public assets directory.
  const match = /^(?:\/\*[\s\S]*?\*\/\s*)?window\.BOXXY_DAILY_SCHEDULE\s*=\s*Object\.freeze\(([\s\S]*)\);\s*$/.exec(source.trim());
  if (!match) throw new Error(`Invalid Daily puzzle file for ${month}.`);
  let schedule;
  try { schedule = JSON.parse(match[1]); }
  catch (_) { throw new Error(`Could not parse Daily puzzle file for ${month}.`); }
  if (schedule?.month !== month || schedule?.format !== "boxxy-daily-puzzle-month" ||
      schedule?.frontEndEnabled === false || !Array.isArray(schedule?.puzzles) || !schedule.puzzles.length) {
    throw new Error(`Unexpected Daily puzzle schedule for ${month}.`);
  }
  const seen = new Set();
  return schedule.puzzles.map(puzzle => {
    const date = String(puzzle?.date || "");
    const preparedFor = String(puzzle?.publishAtUtc || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 7) !== month || seen.has(date) ||
        !Number.isInteger(puzzle?.sequence) || !Array.isArray(puzzle?.layout) ||
        !puzzle.layout.length || !puzzle.layout.every(row => typeof row === "string") ||
        typeof puzzle?.solution !== "string" || !Number.isFinite(Date.parse(preparedFor))) {
      throw new Error(`Invalid Daily puzzle entry in ${month}.`);
    }
    seen.add(date);
    return {
      date,
      sequence: puzzle.sequence,
      name: String(puzzle.name || "Daily Boxxy"),
      solution: puzzle.solution,
      layout: puzzle.layout,
      preparedFor,
      rainbowMode: Boolean(puzzle.rainbowMode),
      goalColours: puzzle.goalColours || {}
    };
  });
}

export async function loadDailyMonth(env, requestUrl, month) {
  if (!validMonth(month)) return null;
  if (typeof env?.ASSETS?.fetch !== "function") {
    throw new Error("Daily puzzle assets are unavailable.");
  }
  const path = `/daily-puzzles/boxxy-daily-puzzles-${month}.js`;
  const url = new URL(path, requestUrl);
  const response = await env.ASSETS.fetch(new Request(url));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unable to read Daily puzzle file for ${month}.`);
  // Pages can serve an HTML fallback for missing static files.
  if ((response.headers.get("content-type") || "").includes("text/html")) return null;
  return parseMonthlySchedule(await response.text(), month);
}

export async function findDailyPuzzle(env, requestUrl, date) {
  const key = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const puzzles = await loadDailyMonth(env, requestUrl, key.slice(0, 7));
  return puzzles?.find(puzzle => puzzle.date === key) || null;
}

export async function listPreparedDailyPuzzles(env, requestUrl) {
  const puzzles = [];
  let month = FIRST_MONTH;
  for (let index = 0; index < MONTH_LIMIT; index++, month = nextMonth(month)) {
    const entries = await loadDailyMonth(env, requestUrl, month);
    // Prepared months are consecutive from launch. The first absent month
    // ends the prepared archive, without requiring a second month registry.
    if (!entries) return puzzles;
    puzzles.push(...entries);
  }
  throw new Error("Daily puzzle archive exceeds its supported date range.");
}
