/* BOXXY v486 — shared Legal metadata renderer. */
(() => {
  "use strict";

  function formatReleaseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    return match ? `${Number(match[3])}.${Number(match[2])}.${match[1]}` : "—";
  }

  function readableList(values) {
    const items = values.filter(Boolean);
    if (items.length < 2) return items[0] || "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  }

  function originalCollectionNames() {
    const catalog = globalThis.BOXXY_CONTENT_CATALOG || {};
    const packs = Array.isArray(catalog.packs) ? catalog.packs : [];
    const names = packs.filter(pack => pack?.original === true).map(pack => String(pack.name || "")).filter(Boolean);
    const dailyName = String(catalog.legal?.dailyCollectionName || "BOXXY Dailys").trim();
    if (dailyName) names.push(dailyName);
    return readableList(names);
  }

  function render(root = document) {
    const release = globalThis.BOXXY_RELEASE || {};
    const version = String(release.version || "").trim();
    const isoDate = String(release.lastUpdated || "").trim();
    const collections = originalCollectionNames();

    root.querySelectorAll?.("[data-boxxy-release-version]").forEach(node => {
      node.textContent = /^\d+$/.test(version) ? version : "—";
    });
    root.querySelectorAll?.("[data-boxxy-release-date]").forEach(node => {
      node.textContent = formatReleaseDate(isoDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) node.dateTime = isoDate;
      else node.removeAttribute("datetime");
    });
    if (collections) {
      root.querySelectorAll?.("[data-boxxy-original-collections]").forEach(node => {
        node.textContent = collections;
      });
    }
  }

  globalThis.BoxxyLegal = Object.freeze({ render });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => render(), { once:true });
  else render();
})();
