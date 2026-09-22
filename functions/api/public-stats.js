/* BOXXY v358 — public aggregate gameplay facts for the rotating footer line.
   PostHog credentials remain server-side; this endpoint exposes counts only. */
"use strict";

const QUERY = `
SELECT
  countIf(event IN ('level_started', 'daily_puzzle_started')) AS levels_played,
  countIf(event IN ('level_completed', 'daily_puzzle_completed')) AS levels_solved
FROM events
WHERE event IN (
  'level_started',
  'daily_puzzle_started',
  'level_completed',
  'daily_puzzle_completed'
)
`;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=300, s-maxage=900" : "no-store",
      ...extraHeaders
    }
  });
}

function firstResultRow(payload) {
  if (Array.isArray(payload?.results) && Array.isArray(payload.results[0])) return payload.results[0];
  if (Array.isArray(payload?.results?.results) && Array.isArray(payload.results.results[0])) return payload.results.results[0];
  if (Array.isArray(payload?.data?.results) && Array.isArray(payload.data.results[0])) return payload.data.results[0];
  return null;
}

async function readPostHogStats(env) {
  const apiKey = String(
    env.POSTHOG_QUERY_API_KEY
    || env.POSTHOG_PROJECT_SECRET_API_KEY
    || env.POSTHOG_PERSONAL_API_KEY
    || ""
  ).trim();
  const projectId = String(env.POSTHOG_PROJECT_ID || "").trim();
  if (!apiKey || !projectId) return null;

  let host = String(env.POSTHOG_HOST || "https://eu.posthog.com").trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(host)) host = "https://eu.posthog.com";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${host}/api/projects/${encodeURIComponent(projectId)}/query/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: QUERY } }),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const row = firstResultRow(payload);
    if (!row) return null;

    const levelsPlayed = Math.max(0, Math.trunc(Number(row[0]) || 0));
    const levelsSolved = Math.max(0, Math.trunc(Number(row[1]) || 0));
    if (!levelsPlayed && !levelsSolved) return { levelsPlayed: 0, levelsSolved: 0 };
    return { levelsPlayed, levelsSolved };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const cacheKey = new Request(`${requestUrl.origin}/api/public-stats?v=1`, { method: "GET" });
  const edgeCache = typeof caches !== "undefined" ? caches.default : null;

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  const stats = await readPostHogStats(context.env);
  if (!stats) {
    return json({ ok: false, available: false, levelsPlayed: 0, levelsSolved: 0 });
  }

  const response = json({
    ok: true,
    available: true,
    levelsPlayed: stats.levelsPlayed,
    levelsSolved: stats.levelsSolved
  });

  if (edgeCache) context.waitUntil(edgeCache.put(cacheKey, response.clone()));
  return response;
}
