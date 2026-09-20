/* BOXXY v355 — Google Identity Services redirect bridge for iOS / ITP browsers. */
"use strict";

const RESULT_KEY = "boxxy-google-redirect-result-v1";
const VALID_STATES = new Set(["guest", "link", "delete"]);

function cookieValue(request, name) {
  const raw = String(request.headers.get("Cookie") || "");
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    const value = part.slice(index + 1).trim();
    try { return decodeURIComponent(value); }
    catch (_) { return value; }
  }
  return "";
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function bridgeResponse(request, payload, status = 200) {
  const home = `${new URL(request.url).origin}/`;
  const data = safeJson({ ...payload, createdAt: Date.now() });
  const key = safeJson(RESULT_KEY);
  const destination = safeJson(home);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Returning to BOXXY</title>
<style>
html,body{margin:0;min-height:100%;background:#111;color:#f4df39;font:700 16px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{display:grid;min-height:100vh;place-items:center;text-align:center}
main{padding:28px}.logo{font-size:34px;letter-spacing:.08em}.sub{margin-top:8px;color:#fff;font-size:14px;font-weight:600}
</style>
</head>
<body>
<main><div class="logo">BOXXY</div><div class="sub">Returning to your game…</div></main>
<script>
try {
  sessionStorage.setItem(${key}, JSON.stringify(${data}));
  location.replace(${destination});
} catch (_) {
  location.replace(${destination});
}
</script>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, private",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { "allow": "POST", "cache-control": "no-store" }
    });
  }

  let form;
  try { form = await request.formData(); }
  catch (_) {
    return bridgeResponse(request, { error: "Google sign in could not be completed. Please try again." }, 400);
  }

  const cookieCsrf = cookieValue(request, "g_csrf_token");
  const bodyCsrf = String(form.get("g_csrf_token") || "");
  if (!cookieCsrf || !bodyCsrf || cookieCsrf !== bodyCsrf) {
    return bridgeResponse(request, { error: "Google sign in security check failed. Please try again." }, 400);
  }

  const credential = String(form.get("credential") || "").trim();
  if (!credential) {
    return bridgeResponse(request, { error: "Google did not return a sign-in credential. Please try again." }, 400);
  }

  const incomingState = String(form.get("state") || "guest").trim().toLowerCase();
  const state = VALID_STATES.has(incomingState) ? incomingState : "guest";
  return bridgeResponse(request, { credential, state });
}
