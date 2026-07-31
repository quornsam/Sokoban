/* BOXXY v207 — loads the Daily Boxxy month file that matches today or ?dailyDate=. */
(() => {
  "use strict";

  const launchDate = "2026-08-30";
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  const localDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  let requestedDate = "";
  try {
    const candidate = new URLSearchParams(window.location.search).get("dailyDate");
    if (validDate(candidate)) requestedDate = candidate;
  } catch (_) {}

  const today = localDateKey();
  const targetDate = requestedDate || (today < launchDate ? launchDate : today);
  const monthKey = targetDate.slice(0, 7);

  window.BOXXY_DAILY_LAUNCH_DATE = launchDate;
  window.BOXXY_DAILY_MONTH_KEY = monthKey;
  document.write(`<script src="daily-puzzles/boxxy-daily-puzzles-${monthKey}.js"><\/script>`);
})();
