/* BOXXY v218 — loads the Daily archive with an explicit schedule cache revision. */
(() => {
  "use strict";

  const launchDate = "2026-08-30";
  const scheduleRevision = "326";
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  const localDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const monthRange = (startMonth, endMonth) => {
    const matchStart = /^(\d{4})-(\d{2})$/.exec(startMonth);
    const matchEnd = /^(\d{4})-(\d{2})$/.exec(endMonth);
    if (!matchStart || !matchEnd) return [];
    const cursor = new Date(Number(matchStart[1]), Number(matchStart[2]) - 1, 1, 12);
    const end = new Date(Number(matchEnd[1]), Number(matchEnd[2]) - 1, 1, 12);
    const months = [];
    while (cursor <= end && months.length < 1200) {
      months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  };

  let requestedDate = "";
  try {
    const candidate = new URLSearchParams(window.location.search).get("dailyDate");
    if (validDate(candidate)) requestedDate = candidate;
  } catch (_) {}

  const today = localDateKey();
  const targetDate = requestedDate || (today < launchDate ? launchDate : today);
  const targetMonth = targetDate.slice(0, 7);
  const months = monthRange(launchDate.slice(0, 7), targetMonth);

  window.BOXXY_DAILY_LAUNCH_DATE = launchDate;
  window.BOXXY_DAILY_MONTH_KEY = targetMonth;
  window.BOXXY_DAILY_SCHEDULES = [];

  months.forEach(monthKey => {
    document.write('<script>window.BOXXY_DAILY_SCHEDULE=null;<\/script>');
    document.write(`<script src="daily-puzzles/boxxy-daily-puzzles-${monthKey}.js?v=${scheduleRevision}"><\/script>`);
    document.write(`<script>(function(){var schedule=window.BOXXY_DAILY_SCHEDULE;if(schedule&&schedule.frontEndEnabled!==false&&window.BOXXY_DAILY_SCHEDULES){window.BOXXY_DAILY_SCHEDULES.push(schedule);}})();<\/script>`);
  });

  document.write(`<script>(function(){var schedules=Array.isArray(window.BOXXY_DAILY_SCHEDULES)?window.BOXXY_DAILY_SCHEDULES:[];window.BOXXY_DAILY_SCHEDULES=Object.freeze(schedules.slice());window.BOXXY_DAILY_SCHEDULE=schedules.find(function(schedule){return String(schedule&&schedule.month||"")==="${targetMonth}";})||schedules[schedules.length-1]||null;})();<\/script>`);
})();
