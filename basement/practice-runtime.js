/* BOXXY v336 — private practice load reporting. */
(() => {
  "use strict";
  const config = window.BOXXY_PRIVATE_PRACTICE;
  const element = id => document.getElementById(id);
  const panel = () => element("privatePracticeStatus");
  const title = () => element("privatePracticeStatusTitle");
  const text = () => element("privatePracticeStatusText");
  const retry = () => element("privatePracticeRetry");
  const targetOrigin = String(config?.parentOrigin || "");
  let settled = false;
  let failed = false;
  let timer = 0;
  function report(type, message = "") {
    if (!targetOrigin) return;
    window.parent.postMessage({type, requestId:config.requestId, date:config.puzzle?.date, message}, targetOrigin);
  }
  function fail(message) {
    if (settled || failed) return;
    failed = true;
    clearTimeout(timer);
    title().textContent = "PRACTICE COULD NOT LOAD";
    text().textContent = message || "The private game could not be started.";
    panel().hidden = false;
    retry().hidden = false;
    report("BOXXY_PRACTICE_ERROR",text().textContent);
  }

  window.addEventListener("error", event => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.src) {
      fail("A required game file could not be loaded. Check the deployment and retry.");
    } else if (event.error) {
      fail("The private game could not initialise: " + String(event.error.message || event.message || "Unknown error"));
    }
  },true);
  window.addEventListener("unhandledrejection", event => {
    fail("The private game could not initialise: " + String(event.reason?.message || event.reason || "Unknown error"));
  });
  function check() {
    if (settled || failed) return;
    const api = window.BoxxyGameAPI;
    const splash = document.getElementById("splashScreen");
    const ready = api?.isMakerTesting?.() && splash && (splash.hidden || splash.getAttribute("aria-hidden") === "true");
    if (ready) {
      settled = true;
      clearTimeout(timer);
      panel().hidden = true;
      report("BOXXY_PRACTICE_READY");
      return;
    }
    timer = setTimeout(check,100);
  }
  document.addEventListener("DOMContentLoaded", () => {
    retry().addEventListener("click", () => report("BOXXY_PRACTICE_RETRY"));
    if (failed) { panel().hidden=false; retry().hidden=false; return; }
    if (!config?.puzzle || !Array.isArray(config.puzzle.layout)) {
      fail("The selected Daily puzzle is missing or invalid.");
      return;
    }
    timer = setTimeout(check,100);
    setTimeout(() => {
      if (!settled && !failed) fail("The game did not finish loading. Retry, or check that all v336 files have been deployed together.");
    },45000);
  });
})();
