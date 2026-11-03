#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localeDir = path.join(root, "locales");
const referenceCode = "fr";
const requested = process.argv.slice(2).map(value => String(value).trim().toLowerCase()).filter(Boolean);
const files = fs.readdirSync(localeDir).filter(name => /^[a-z-]+\.json$/i.test(name));
const available = files.map(name => name.replace(/\.json$/i, "")).sort();
const targets = requested.length ? requested : available;
const errors = [];

function readText(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}
function readLocale(code) {
  const filename = path.join(localeDir, `${code}.json`);
  if (!fs.existsSync(filename)) throw new Error(`Missing locales/${code}.json`);
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}
function placeholders(value) {
  return [...String(value).matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
}
function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const reference = readLocale(referenceCode);
const referenceStrings = Object.keys(reference.strings || {});
const referenceTemplates = Object.keys(reference.templates || {});
const localisationSource = readText("locales/localisation.js");
const backendLocaleSource = readText("functions/_lib/locale.js");
const basementSource = readText("basement/basement.js");
const serviceWorkerSource = readText("service-worker.js");

for (const code of targets) {
  let locale;
  try { locale = readLocale(code); }
  catch (error) { errors.push(error.message); continue; }

  if (locale.language !== code) errors.push(`${code}: language field is ${JSON.stringify(locale.language)}`);
  if (!String(locale.name || "").trim()) errors.push(`${code}: missing language name`);

  const strings = Object.keys(locale.strings || {});
  const templates = Object.keys(locale.templates || {});
  const missingStrings = referenceStrings.filter(key => !Object.prototype.hasOwnProperty.call(locale.strings || {}, key));
  const extraStrings = strings.filter(key => !Object.prototype.hasOwnProperty.call(reference.strings || {}, key));
  const missingTemplates = referenceTemplates.filter(key => !Object.prototype.hasOwnProperty.call(locale.templates || {}, key));
  const extraTemplates = templates.filter(key => !Object.prototype.hasOwnProperty.call(reference.templates || {}, key));

  if (missingStrings.length) errors.push(`${code}: ${missingStrings.length} missing string key(s): ${missingStrings.slice(0, 5).join(" | ")}`);
  if (extraStrings.length) errors.push(`${code}: ${extraStrings.length} extra string key(s): ${extraStrings.slice(0, 5).join(" | ")}`);
  if (missingTemplates.length) errors.push(`${code}: ${missingTemplates.length} missing template key(s): ${missingTemplates.slice(0, 5).join(" | ")}`);
  if (extraTemplates.length) errors.push(`${code}: ${extraTemplates.length} extra template key(s): ${extraTemplates.slice(0, 5).join(" | ")}`);

  for (const [source, target] of Object.entries(locale.strings || {})) {
    if (!String(target ?? "").trim()) errors.push(`${code}: blank translation for ${JSON.stringify(source)}`);
  }
  for (const [source, target] of Object.entries(locale.templates || {})) {
    if (!String(target ?? "").trim()) errors.push(`${code}: blank template translation for ${JSON.stringify(source)}`);
    const sourceTokens = placeholders(source);
    const targetTokens = placeholders(target);
    if (!sameArray(sourceTokens, targetTokens)) {
      errors.push(`${code}: placeholder mismatch for ${JSON.stringify(source)} (${sourceTokens.join(",")} -> ${targetTokens.join(",")})`);
    }
  }
  if (!Array.isArray(locale.thoughts) || locale.thoughts.length < 16 || locale.thoughts.some(item => !String(item || "").trim())) {
    errors.push(`${code}: thoughts must contain at least 16 non-empty lines`);
  }

  const registryPattern = new RegExp(`\\b${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`);
  if (!registryPattern.test(localisationSource)) errors.push(`${code}: missing from front-end LANGUAGES registry`);
  if (!new RegExp(`['\"]${code}['\"]`).test(backendLocaleSource)) errors.push(`${code}: missing from backend locale support`);
  if (!new RegExp(`(?:^|[,{\\s])${code}\\s*:`, "m").test(basementSource)) errors.push(`${code}: missing from Basement language labels/flags`);
  if (!serviceWorkerSource.includes(`/locales/${code}.json`)) errors.push(`${code}: missing from service-worker offline assets`);

  if (!missingStrings.length && !extraStrings.length && !missingTemplates.length && !extraTemplates.length) {
    console.log(`✓ ${code}: ${strings.length} strings, ${templates.length} templates, ${locale.thoughts.length} thoughts`);
  }
}

if (errors.length) {
  console.error(`\nLocale audit failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`\nLocale audit passed for ${targets.join(", ")}.`);
