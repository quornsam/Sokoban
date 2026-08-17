const DESTINATION_EMAIL = "archedroof+boxxy@gmail.com";
const SENDER_EMAIL = "contact@boxxy.io";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanSingleLine(value, maxLength) {
  return cleanText(value, maxLength).replace(/[\r\n]+/g, " ").trim();
}

function validEmail(value) {
  if (!value || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!origin || origin !== requestUrl.origin) {
    return json({ ok: false, error: "Request rejected." }, 403);
  }

  if (!env.CF_ACCOUNT_ID || !env.CF_EMAIL_API_TOKEN) {
    return json({ ok: false, error: "The contact form has not been configured on Cloudflare yet." }, 503);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 12000) {
    return json({ ok: false, error: "Message is too large." }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: "Invalid form submission." }, 400);
  }

  // Invisible honeypot: bots commonly fill every field. Pretend success without sending.
  if (cleanText(body.website, 200)) return json({ ok: true });

  const name = cleanSingleLine(body.name, 80);
  const email = cleanSingleLine(body.email, 254);
  const comment = cleanText(body.comment, 2000);
  const version = Number.isFinite(Number(body.version)) ? Math.max(0, Math.floor(Number(body.version))) : 0;

  if (!name || !validEmail(email) || !comment) {
    return json({ ok: false, error: "Please provide a name, valid email address and comment." }, 400);
  }

  const messageText = [
    "New message from the BOXXY Contact Us form",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    version ? `BOXXY version: v${version}` : "BOXXY version: unknown",
    "",
    "Comment:",
    comment
  ].join("\n");

  const apiResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/email/sending/send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CF_EMAIL_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: DESTINATION_EMAIL,
        from: SENDER_EMAIL,
        reply_to: email,
        subject: `[BOXXY CONTACT] ${name}`,
        text: messageText
      })
    }
  );

  let cloudflare = null;
  try { cloudflare = await apiResponse.json(); } catch (_) {}

  if (!apiResponse.ok || cloudflare?.success === false) {
    console.error("BOXXY contact email failed", apiResponse.status, cloudflare?.errors || cloudflare);
    return json({ ok: false, error: "The message could not be sent. Please try again." }, 502);
  }

  return json({ ok: true });
}

export function onRequestGet() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}
