/* BOXXY v526: country-based first-visit language and signed-in language preference. */
import { json, requireDatabase, authenticatedUser } from "../_lib/auth.js";
import {
  countryLanguage,
  ensureUserLocale,
  firstVisitCountry,
  firstVisitCountryCookie,
  normaliseLanguage,
  requestCountry,
  saveUserLanguage
} from "../_lib/locale.js";

async function readBody(request) {
  try { return await request.json(); }
  catch (_) { return {}; }
}

function responseHeaders(request, country) {
  const alreadyRecorded = /(?:^|;\s*)boxxy_first_country=/.test(request.headers.get("Cookie") || "");
  const cookie = !alreadyRecorded ? firstVisitCountryCookie(country) : "";
  return cookie ? { "set-cookie": cookie } : {};
}

async function publicLocale(context) {
  const country = firstVisitCountry(context.request) || requestCountry(context.request);
  return json({
    ok: true,
    authenticated: false,
    language: countryLanguage(country),
    firstCountry: country
  }, 200, responseHeaders(context.request, country));
}

async function accountLocale(context, candidateLanguage = "") {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok:false, authenticated:false, error:"Please sign in again." }, 401);
  const country = firstVisitCountry(request) || requestCountry(request);
  const locale = await ensureUserLocale(db, user.id, candidateLanguage, country);
  return json({ ok:true, authenticated:true, ...locale }, 200, responseHeaders(request, country));
}

async function updateLocale(context, body) {
  const { env, request } = context;
  const db = requireDatabase(env);
  const user = await authenticatedUser(env, request);
  if (!user) return json({ ok:false, authenticated:false, error:"Please sign in again." }, 401);
  const language = normaliseLanguage(body.language);
  if (!language) return json({ ok:false, error:"Choose a supported language." }, 400);
  const country = firstVisitCountry(request) || requestCountry(request);
  const locale = await saveUserLanguage(db, user.id, language, country);
  return json({ ok:true, authenticated:true, ...locale }, 200, responseHeaders(request, country));
}

export async function onRequest(context) {
  try {
    if (context.request.method === "GET") {
      const url = new URL(context.request.url);
      if (url.searchParams.get("account") === "1") {
        return await accountLocale(context, normaliseLanguage(url.searchParams.get("candidate")));
      }
      return await publicLocale(context);
    }
    if (context.request.method === "POST") return await updateLocale(context, await readBody(context.request));
    return json({ ok:false, error:"Method not allowed." }, 405);
  } catch (error) {
    console.error("BOXXY locale error", error);
    return json({ ok:false, error:"Language service is temporarily unavailable." }, 500);
  }
}
