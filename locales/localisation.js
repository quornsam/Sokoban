/* BOXXY v543: refresh public FLUFFBALLS labels and soundtrack controls across locale catalogues. */
/* BOXXY v537: use local SVG flags so language controls render consistently across platforms. */
(() => {
  "use strict";

  const STORAGE_KEY = "boxxy-language-v1";
  const COUNTRY_KEY = "boxxy-first-country-v1";
  const CATALOG_BASE = "/locales/";
  const TRANSLATED_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt", "data-tooltip"];
  const LANGUAGES = Object.freeze({
    en:    { label:"English",   flagAsset:"/assets/ui/flags/gb.svg", html:"en-GB" },
    fr:    { label:"Français",  flagAsset:"/assets/ui/flags/fr.svg", html:"fr" },
    es:    { label:"Español",   flagAsset:"/assets/ui/flags/es.svg", html:"es" },
    de:    { label:"Deutsch",   flagAsset:"/assets/ui/flags/de.svg", html:"de" },
    zh:    { label:"中文",       flagAsset:"/assets/ui/flags/cn.svg", html:"zh-CN" },
    ja:    { label:"日本語",     flagAsset:"/assets/ui/flags/jp.svg", html:"ja" },
    ru:    { label:"Русский",   flagAsset:"/assets/ui/flags/ru.svg", html:"ru" },
    hi:    { label:"हिन्दी",     flagAsset:"/assets/ui/flags/in.svg", html:"hi" },
    alpha: { label:"Gen Alpha", flagAsset:"/assets/ui/flags/alpha.svg", html:"en" }
  });
  const COUNTRY_LANGUAGE = Object.freeze({ FR:"fr", ES:"es", MX:"es", AR:"es", BO:"es", CL:"es", CO:"es", CR:"es", CU:"es", DO:"es", EC:"es", SV:"es", GT:"es", HN:"es", NI:"es", PA:"es", PY:"es", PE:"es", PR:"es", UY:"es", VE:"es", DE:"de", AT:"de", LI:"de", CN:"zh", TW:"zh", HK:"zh", MO:"zh", JP:"ja", RU:"ru", IN:"hi" });

  let storedLanguage = validLanguage(readStorage(STORAGE_KEY));
  let currentLanguage = storedLanguage || "en";
  document.documentElement.lang = LANGUAGES[currentLanguage]?.html || "en-GB";
  let currentCatalog = null;
  let currentStrings = new Map();
  let compiledTemplates = [];
  let currentThoughts = [];
  const lastCatalogSelection = new Map();
  let accountUserId = "";
  let accountLocaleLoading = false;
  let observer = null;
  let bootComplete = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  const textState = new WeakMap();
  const attributeState = new WeakMap();

  function readStorage(key) {
    try { return localStorage.getItem(key) || ""; }
    catch (_) { return ""; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, String(value || "")); }
    catch (_) {}
  }

  function validLanguage(value) {
    const key = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(LANGUAGES, key) ? key : "";
  }

  function normaliseCountry(value) {
    const code = String(value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : "";
  }

  function defaultLanguageForCountry(country) {
    return COUNTRY_LANGUAGE[normaliseCountry(country)] || "en";
  }

  function browserPreferredLanguage() {
    const preferences = [];
    if (Array.isArray(navigator.languages)) preferences.push(...navigator.languages);
    if (navigator.language) preferences.push(navigator.language);
    const seen = new Set();
    for (const value of preferences) {
      const tag = String(value || "").trim().toLowerCase().replace(/_/g,"-");
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      const base = tag.split("-")[0];
      const language = validLanguage(base);
      if (language && language !== "alpha") return language;
    }
    return "";
  }

  function normaliseLookup(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function compileTemplate(source, target) {
    const names = [];
    let pattern = "^";
    let cursor = 0;
    const token = /\{(\d+)\}/g;
    let match;
    while ((match = token.exec(source))) {
      pattern += escapeRegex(source.slice(cursor, match.index));
      pattern += "(.+?)";
      names.push(Number(match[1]));
      cursor = match.index + match[0].length;
    }
    pattern += escapeRegex(source.slice(cursor)) + "$";
    return { regex:new RegExp(pattern), names, target:String(target || "") };
  }

  function setCatalog(catalog) {
    currentCatalog = catalog && typeof catalog === "object" ? catalog : null;
    const strings = currentCatalog?.strings && typeof currentCatalog.strings === "object"
      ? currentCatalog.strings : {};
    currentStrings = new Map(Object.entries(strings).map(([source,target]) => [normaliseLookup(source), String(target ?? "")]));
    const templates = currentCatalog?.templates && typeof currentCatalog.templates === "object"
      ? currentCatalog.templates : {};
    compiledTemplates = Object.entries(templates).map(([source,target]) => compileTemplate(normaliseLookup(source),target));
    currentThoughts = Array.isArray(currentCatalog?.thoughts) ? currentCatalog.thoughts.map(String).filter(Boolean) : [];
    lastCatalogSelection.clear();
  }

  function randomCatalogLine(kind, entries) {
    if (currentLanguage === "en" || !Array.isArray(entries) || !entries.length) return "";
    const previous = lastCatalogSelection.get(kind);
    let choices = entries;
    if (entries.length > 1 && previous) choices = entries.filter(value => value !== previous);
    const selected = choices[Math.floor(Math.random() * choices.length)] || entries[0] || "";
    if (selected) lastCatalogSelection.set(kind, selected);
    return selected;
  }

  function translateNormalised(source, depth = 0) {
    if (!source || currentLanguage === "en" || !currentCatalog || depth > 3) return source;
    const exact = currentStrings.get(source);
    if (typeof exact === "string") return exact;
    for (const entry of compiledTemplates) {
      const match = source.match(entry.regex);
      if (!match) continue;
      const values = {};
      entry.names.forEach((name,index) => {
        const raw = match[index + 1];
        values[name] = translateNormalised(normaliseLookup(raw), depth + 1) || raw;
      });
      return entry.target.replace(/\{(\d+)\}/g, (_,name) => values[Number(name)] ?? "");
    }
    return source;
  }

  function translatedValue(raw) {
    const source = String(raw ?? "");
    if (currentLanguage === "en" || !currentCatalog) return source;
    const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const leading = match?.[1] || "";
    const body = match?.[2] || "";
    const trailing = match?.[3] || "";
    const lookup = normaliseLookup(body);
    if (!lookup) return source;
    const translated = translateNormalised(lookup);
    if (translated === lookup) return source;
    return leading + translated + trailing;
  }

  const nativeConfirm = typeof window.confirm === "function" ? window.confirm.bind(window) : null;
  const nativeAlert = typeof window.alert === "function" ? window.alert.bind(window) : null;
  if (nativeConfirm) window.confirm = message => nativeConfirm(translatedValue(message));
  if (nativeAlert) window.alert = message => nativeAlert(translatedValue(message));

  function ignoredElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element.closest?.("[data-boxxy-i18n-ignore]")) return true;
    if (element.closest?.("#board") && element.id !== "board") return true;
    return ["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","PRE","CODE"].includes(element.tagName);
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || ignoredElement(node.parentElement)) return;
    const current = node.nodeValue || "";
    let state = textState.get(node);
    if (!state) {
      state = { source:current, rendered:current };
      textState.set(node,state);
    } else if (current !== state.rendered) {
      state.source = current;
    }
    const next = translatedValue(state.source);
    state.rendered = next;
    if (current !== next) node.nodeValue = next;
  }

  function attributeRecord(element) {
    let record = attributeState.get(element);
    if (!record) { record = new Map(); attributeState.set(element,record); }
    return record;
  }

  function translateAttribute(element, name) {
    if (!element?.hasAttribute?.(name) || ignoredElement(element)) return;
    const current = element.getAttribute(name) || "";
    const record = attributeRecord(element);
    let state = record.get(name);
    if (!state) {
      state = { source:current, rendered:current };
      record.set(name,state);
    } else if (current !== state.rendered) {
      state.source = current;
    }
    const next = translatedValue(state.source);
    state.rendered = next;
    if (current !== next) element.setAttribute(name,next);
  }

  function translateElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE || ignoredElement(element)) return;
    TRANSLATED_ATTRIBUTES.forEach(name => translateAttribute(element,name));
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) translateTextNode(child);
    }
  }

  function translateTree(root = document.documentElement) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || ignoredElement(root)) return;
    translateElement(root);
    root.querySelectorAll?.("*").forEach(translateElement);
  }

  function observeTranslations() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(records => {
      for (const record of records) {
        const targetElement = record.target?.nodeType === Node.ELEMENT_NODE ? record.target : record.target?.parentElement;
        if (targetElement?.closest?.("#board") && targetElement.id !== "board") continue;
        if (record.type === "characterData") {
          translateTextNode(record.target);
          continue;
        }
        if (record.type === "attributes") {
          translateAttribute(record.target, record.attributeName);
          continue;
        }
        record.addedNodes.forEach(node => translateTree(node));
      }
    });
    observer.observe(document.documentElement, {
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:TRANSLATED_ATTRIBUTES
    });
  }

  async function loadCatalog(language) {
    if (language === "en") return null;
    const response = await fetch(`${CATALOG_BASE}${encodeURIComponent(language)}.json?v=543`, { cache:"force-cache" });
    if (!response.ok) throw new Error(`Could not load ${language} language file.`);
    const data = await response.json();
    if (!data || data.language !== language || typeof data.strings !== "object") throw new Error("Invalid language file.");
    return data;
  }

  function languageButtons() {
    return [document.getElementById("desktopLanguageBtn"), document.getElementById("mobileLanguageBtn")].filter(Boolean);
  }

  function languageFlags() {
    return [document.getElementById("desktopLanguageFlag"), document.getElementById("mobileLanguageFlag")].filter(Boolean);
  }

  function languageModal() { return document.getElementById("languageModal"); }
  function languageOptions() { return document.getElementById("languageModalOptions"); }
  function languageStatus() { return document.getElementById("languageModalStatus"); }
  let previousLanguageFocus = null;

  function populateLanguageModal() {
    const options = languageOptions();
    if (!options || options.dataset.populated === "true") return;
    const fragment = document.createDocumentFragment();
    Object.entries(LANGUAGES).forEach(([key, meta]) => {
      const option = document.createElement("button");
      option.type = "button";
      option.setAttribute("role", "radio");
      option.dataset.boxxyLanguage = key;
      option.setAttribute("aria-checked", String(key === currentLanguage));
      const flag = document.createElement("span");
      flag.className = "language-option-flag";
      flag.setAttribute("aria-hidden", "true");
      const flagImage = document.createElement("img");
      flagImage.className = "language-flag-image";
      flagImage.src = meta.flagAsset;
      flagImage.alt = "";
      flagImage.decoding = "async";
      flag.append(flagImage);
      const label = document.createElement("b");
      label.dataset.boxxyI18nIgnore = "";
      label.textContent = meta.label;
      option.append(flag, label);
      fragment.append(option);
    });
    options.replaceChildren(fragment);
    options.dataset.populated = "true";
  }

  function renderLanguageControl() {
    const meta = LANGUAGES[currentLanguage] || LANGUAGES.en;
    languageFlags().forEach(flag => {
      let image = flag.querySelector("img.language-flag-image");
      if (!image) {
        image = document.createElement("img");
        image.className = "language-flag-image";
        image.alt = "";
        image.decoding = "async";
        flag.replaceChildren(image);
      }
      if (image.getAttribute("src") !== meta.flagAsset) image.src = meta.flagAsset;
    });
    languageButtons().forEach(button => {
      button.setAttribute("aria-label", `Change language. Current: ${meta.label}`);
      button.title = `Change language. Current: ${meta.label}`;
      translateAttribute(button,"aria-label");
      translateAttribute(button,"title");
    });
    languageOptions()?.querySelectorAll?.("[data-boxxy-language]").forEach(option => {
      option.setAttribute("aria-checked", String(option.dataset.boxxyLanguage === currentLanguage));
    });
  }

  function setLanguageStatus(message) {
    const status = languageStatus();
    if (!status) return;
    const text = String(message || "");
    status.hidden = !text;
    status.textContent = text;
    if (text) translateTextNode(status.firstChild);
  }

  function closeLanguageModal({ restoreFocus=true } = {}) {
    const modal = languageModal();
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    setLanguageStatus("");
    if (restoreFocus) previousLanguageFocus?.focus?.({ preventScroll:true });
    previousLanguageFocus = null;
  }

  function openLanguageModal(trigger) {
    const modal = languageModal();
    if (!modal) return;
    previousLanguageFocus = trigger || document.activeElement;
    setLanguageStatus("");
    modal.hidden = false;
    requestAnimationFrame(() => {
      languageOptions()?.querySelector?.(`[data-boxxy-language="${currentLanguage}"]`)?.focus?.({ preventScroll:true });
    });
  }

  async function applyLanguage(language, { persist=true, announce=true } = {}) {
    const next = validLanguage(language) || "en";
    let catalog = null;
    if (next !== "en") catalog = await loadCatalog(next);
    currentLanguage = next;
    setCatalog(catalog);
    if (persist) {
      writeStorage(STORAGE_KEY,next);
      storedLanguage = next;
    }
    document.documentElement.lang = LANGUAGES[next]?.html || "en-GB";
    document.documentElement.dataset.boxxyLanguage = next;
    translateTree(document.documentElement);
    renderLanguageControl();
    if (announce) window.dispatchEvent(new CustomEvent("boxxylanguagechanged", { detail:{ language:next } }));
    return true;
  }

  function setAccountStatus(message, kind="error") {
    const status = document.getElementById("accountStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
    translateTextNode(status.firstChild);
  }

  async function fetchFirstVisitLocale() {
    try {
      const response = await fetch("/api/locale", { credentials:"same-origin", cache:"no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) return null;
      const country = normaliseCountry(data.firstCountry);
      if (country) writeStorage(COUNTRY_KEY,country);
      return { country, countryLanguage:validLanguage(data.language) || defaultLanguageForCountry(country) };
    } catch (_) {
      return null;
    }
  }

  async function detectFirstVisitLanguage() {
    const saved = validLanguage(readStorage(STORAGE_KEY));
    if (saved) {
      if (!normaliseCountry(readStorage(COUNTRY_KEY))) void fetchFirstVisitLocale();
      return;
    }

    const browserLanguage = browserPreferredLanguage();
    if (browserLanguage) {
      await applyLanguage(browserLanguage,{persist:true,announce:true});
      void fetchFirstVisitLocale();
      return;
    }

    const firstVisit = await fetchFirstVisitLocale();
    const fallbackLanguage = validLanguage(firstVisit?.countryLanguage) || "en";
    await applyLanguage(fallbackLanguage,{persist:true,announce:true});
  }

  async function syncSignedInLocale() {
    const id = String(window.BOXXYAccountIdentity?.id || "");
    if (!id || accountLocaleLoading || accountUserId === id) return;
    accountLocaleLoading = true;
    try {
      const candidate = storedLanguage || browserPreferredLanguage() || currentLanguage || "en";
      const response = await fetch(`/api/locale?account=1&candidate=${encodeURIComponent(candidate)}`, {
        credentials:"same-origin", cache:"no-store"
      });
      const data = await response.json();
      if (!response.ok || !data?.authenticated) return;
      accountUserId = id;
      const country = normaliseCountry(data.firstCountry);
      if (country) writeStorage(COUNTRY_KEY,country);
      const language = validLanguage(data.language) || currentLanguage;
      if (language !== currentLanguage) await applyLanguage(language,{persist:true,announce:true});
    } catch (_) {
      // Local language remains usable if the account locale service is offline.
    } finally {
      accountLocaleLoading = false;
    }
  }

  function updateAccountLocaleSync(loggedIn) {
    if (!loggedIn) {
      accountUserId = "";
      return;
    }
    syncSignedInLocale();
  }

  async function chooseLanguage(language) {
    const next = validLanguage(language);
    if (!next) return;
    const options = languageOptions();
    options?.querySelectorAll?.("button").forEach(item => { item.disabled = true; });
    try {
      if (window.BOXXYAccountIdentity?.id) {
        const response = await fetch("/api/locale", {
          method:"POST",
          credentials:"same-origin",
          cache:"no-store",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({language:next})
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save language preference.");
        const country = normaliseCountry(data.firstCountry);
        if (country) writeStorage(COUNTRY_KEY,country);
        await applyLanguage(validLanguage(data.language) || next,{persist:true,announce:true});
        setAccountStatus("LANGUAGE SAVED","success");
      } else {
        await applyLanguage(next,{persist:true,announce:true});
      }
      closeLanguageModal({ restoreFocus:true });
    } catch (error) {
      setLanguageStatus(error?.message || "Could not save language preference.");
    } finally {
      options?.querySelectorAll?.("button").forEach(item => { item.disabled = false; });
    }
  }

  function bindLanguageControl() {
    populateLanguageModal();
    const modal = languageModal();
    const options = languageOptions();
    const close = document.getElementById("languageModalClose");
    const buttons = languageButtons();
    if (!modal || !options || !buttons.length || modal.dataset.bound === "true") return;
    modal.dataset.bound = "true";
    buttons.forEach(button => {
      button.addEventListener("click", () => openLanguageModal(button));
    });
    options.addEventListener("click", event => {
      const option = event.target.closest?.("[data-boxxy-language]");
      if (!option) return;
      chooseLanguage(option.dataset.boxxyLanguage);
    });
    close?.addEventListener("click", () => closeLanguageModal({ restoreFocus:true }));
    modal.addEventListener("pointerdown", event => {
      if (event.target === modal) closeLanguageModal({ restoreFocus:true });
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !modal.hidden) {
        event.preventDefault();
        closeLanguageModal({ restoreFocus:true });
      }
    });
  }

  function finishBoot() {
    if (bootComplete) return;
    bootComplete = true;
    const splashProgress = document.getElementById("splashProgressText");
    if (splashProgress) splashProgress.style.visibility = "";
    resolveReady?.(true);
    window.dispatchEvent(new CustomEvent("boxxylocalisationready", { detail:{ language:currentLanguage } }));
  }

  async function boot() {
    try {
      observeTranslations();
      bindLanguageControl();
      try {
        await applyLanguage(currentLanguage,{persist:false,announce:false});
      } catch (_) {
        currentLanguage = "en";
        setCatalog(null);
        document.documentElement.lang = "en-GB";
        translateTree(document.documentElement);
        renderLanguageControl();
      }
      await detectFirstVisitLanguage();
      const loggedIn = Boolean(window.BOXXYAccountIdentity?.id);
      updateAccountLocaleSync(loggedIn);
    } finally {
      finishBoot();
    }
  }

  window.addEventListener("boxxyaccountfeatures", event => updateAccountLocaleSync(Boolean(event.detail?.loggedIn)));
  window.addEventListener("boxxyaccountready", () => updateAccountLocaleSync(Boolean(window.BOXXYAccountIdentity?.id)));
  document.addEventListener("DOMContentLoaded", boot, { once:true });

  window.BoxxyLocalisation = Object.freeze({
    get language() { return currentLanguage; },
    get firstCountry() { return normaliseCountry(readStorage(COUNTRY_KEY)); },
    languages: LANGUAGES,
    translate: value => translateNormalised(normaliseLookup(value)),
    randomThought: () => randomCatalogLine("thought", currentThoughts),
    get isReady() { return bootComplete; },
    ready,
    apply: language => applyLanguage(language)
  });
})();
