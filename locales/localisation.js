/* BOXXY v526: isolated front-end localisation. English remains the source UI. */
(() => {
  "use strict";

  const STORAGE_KEY = "boxxy-language-v1";
  const COUNTRY_KEY = "boxxy-first-country-v1";
  const CATALOG_BASE = "/locales/";
  const TRANSLATED_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"];
  const LANGUAGES = Object.freeze({
    en:    { label:"English",   flag:"🇬🇧", html:"en-GB" },
    fr:    { label:"Français",  flag:"🇫🇷", html:"fr" },
    es:    { label:"Español",   flag:"🇪🇸", html:"es" },
    de:    { label:"Deutsch",   flag:"🇩🇪", html:"de" },
    zh:    { label:"中文",       flag:"🇨🇳", html:"zh-CN" },
    ja:    { label:"日本語",     flag:"🇯🇵", html:"ja" },
    ru:    { label:"Русский",   flag:"🇷🇺", html:"ru" },
    alpha: { label:"Gen Alpha", flag:"🏁", html:"en" }
  });
  const COUNTRY_LANGUAGE = Object.freeze({ FR:"fr", ES:"es", MX:"es", AR:"es", BO:"es", CL:"es", CO:"es", CR:"es", CU:"es", DO:"es", EC:"es", SV:"es", GT:"es", HN:"es", NI:"es", PA:"es", PY:"es", PE:"es", PR:"es", UY:"es", VE:"es", DE:"de", AT:"de", LI:"de", CN:"zh", TW:"zh", HK:"zh", MO:"zh", JP:"ja", RU:"ru" });

  let storedLanguage = validLanguage(readStorage(STORAGE_KEY));
  let currentLanguage = storedLanguage || "en";
  let currentCatalog = null;
  let currentStrings = new Map();
  let compiledTemplates = [];
  let accountUserId = "";
  let accountLocaleLoading = false;
  let observer = null;

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
    const response = await fetch(`${CATALOG_BASE}${encodeURIComponent(language)}.json?v=526`, { cache:"force-cache" });
    if (!response.ok) throw new Error(`Could not load ${language} language file.`);
    const data = await response.json();
    if (!data || data.language !== language || typeof data.strings !== "object") throw new Error("Invalid language file.");
    return data;
  }

  function languageButton() { return document.getElementById("languageMenuBtn"); }
  function languageFlag() { return document.getElementById("languageMenuFlag"); }
  function languageMenu() { return document.getElementById("languageMenu"); }

  function renderLanguageControl() {
    const meta = LANGUAGES[currentLanguage] || LANGUAGES.en;
    const button = languageButton();
    const flag = languageFlag();
    if (flag) flag.textContent = meta.flag;
    if (button) {
      button.setAttribute("aria-label", `Change language. Current: ${meta.label}`);
      button.title = `Change language. Current: ${meta.label}`;
    }
    languageMenu()?.querySelectorAll?.("[data-boxxy-language]").forEach(option => {
      option.setAttribute("aria-checked", String(option.dataset.boxxyLanguage === currentLanguage));
    });
    translateAttribute(button,"aria-label");
    translateAttribute(button,"title");
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

  async function detectFirstVisitLanguage() {
    if (validLanguage(readStorage(STORAGE_KEY))) return;
    try {
      const response = await fetch("/api/locale", { credentials:"same-origin", cache:"no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) return;
      const country = normaliseCountry(data.firstCountry);
      if (country) writeStorage(COUNTRY_KEY,country);
      const language = validLanguage(data.language) || defaultLanguageForCountry(country);
      await applyLanguage(language,{persist:true,announce:true});
    } catch (_) {}
  }

  async function syncSignedInLocale() {
    const id = String(window.BOXXYAccountIdentity?.id || "");
    if (!id || accountLocaleLoading || accountUserId === id) return;
    accountLocaleLoading = true;
    try {
      const candidate = storedLanguage || "";
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

  function updateSignedInControl(loggedIn) {
    const button = languageButton();
    if (button) button.hidden = !loggedIn;
    if (!loggedIn) {
      accountUserId = "";
      const menu = languageMenu();
      if (menu) menu.hidden = true;
      button?.setAttribute("aria-expanded","false");
      return;
    }
    renderLanguageControl();
    syncSignedInLocale();
  }

  async function chooseLanguage(language) {
    const next = validLanguage(language);
    if (!next || !window.BOXXYAccountIdentity?.id) return;
    const menu = languageMenu();
    const button = languageButton();
    menu?.querySelectorAll?.("button").forEach(item => { item.disabled = true; });
    try {
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
      if (menu) menu.hidden = true;
      button?.setAttribute("aria-expanded","false");
      setAccountStatus("LANGUAGE SAVED","success");
    } catch (error) {
      setAccountStatus(error?.message || "Could not save language preference.","error");
    } finally {
      menu?.querySelectorAll?.("button").forEach(item => { item.disabled = false; });
    }
  }

  function bindLanguageControl() {
    const button = languageButton();
    const menu = languageMenu();
    if (!button || !menu || button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (button.hidden) return;
      const open = menu.hidden;
      menu.hidden = !open;
      button.setAttribute("aria-expanded",String(open));
      if (open) menu.querySelector(`[data-boxxy-language="${currentLanguage}"]`)?.focus?.({preventScroll:true});
    });
    menu.addEventListener("click", event => {
      const option = event.target.closest?.("[data-boxxy-language]");
      if (!option) return;
      chooseLanguage(option.dataset.boxxyLanguage);
    });
    document.addEventListener("click", event => {
      if (menu.hidden || event.target.closest?.("#languageMenu,#languageMenuBtn")) return;
      menu.hidden = true;
      button.setAttribute("aria-expanded","false");
    });
  }

  async function boot() {
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
    updateSignedInControl(loggedIn);
  }

  window.addEventListener("boxxyaccountfeatures", event => updateSignedInControl(Boolean(event.detail?.loggedIn)));
  window.addEventListener("boxxyaccountready", () => updateSignedInControl(Boolean(window.BOXXYAccountIdentity?.id)));
  document.addEventListener("DOMContentLoaded", boot, { once:true });

  window.BoxxyLocalisation = Object.freeze({
    get language() { return currentLanguage; },
    get firstCountry() { return normaliseCountry(readStorage(COUNTRY_KEY)); },
    languages: LANGUAGES,
    translate: value => translateNormalised(normaliseLookup(value)),
    apply: language => applyLanguage(language)
  });
})();
