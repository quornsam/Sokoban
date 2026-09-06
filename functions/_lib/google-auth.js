const GOOGLE_CLIENT_ID = "369102198200-ntq5mn9pb2s2ftf5h0uo6akm8ms6m25t.apps.googleusercontent.com";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const encoder = new TextEncoder();

let jwksCache = { expiresAt: 0, keys: [] };
let schemaPromise = null;

function decodeBase64Url(value) {
  const text = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = text + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJsonPart(value) {
  const bytes = decodeBase64Url(value);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function cacheLifetimeMs(response) {
  const header = response.headers.get("cache-control") || "";
  const match = /(?:^|,)\s*max-age=(\d+)/i.exec(header);
  const seconds = match ? Number(match[1]) : 3600;
  return Math.max(60, Math.min(86400, Number.isFinite(seconds) ? seconds : 3600)) * 1000;
}

async function loadGoogleKeys(force = false) {
  const now = Date.now();
  if (!force && jwksCache.keys.length && jwksCache.expiresAt > now) return jwksCache.keys;

  const response = await fetch(GOOGLE_JWKS_URL, {
    method: "GET",
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error("Could not verify Google sign-in right now.");

  const body = await response.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  if (!keys.length) throw new Error("Could not verify Google sign-in right now.");

  jwksCache = {
    keys,
    expiresAt: now + cacheLifetimeMs(response)
  };
  return keys;
}

async function signingKey(kid) {
  let keys = await loadGoogleKeys(false);
  let key = keys.find(item => item?.kid === kid && item?.kty === "RSA");
  if (!key) {
    keys = await loadGoogleKeys(true);
    key = keys.find(item => item?.kid === kid && item?.kty === "RSA");
  }
  if (!key) throw new Error("Could not verify Google sign-in right now.");
  return key;
}

function validAudience(payload) {
  const audience = payload?.aud;
  const authorisedParty = String(payload?.azp || "");
  if (Array.isArray(audience)) {
    return audience.includes(GOOGLE_CLIENT_ID) && authorisedParty === GOOGLE_CLIENT_ID;
  }
  if (String(audience || "") !== GOOGLE_CLIENT_ID) return false;
  return !authorisedParty || authorisedParty === GOOGLE_CLIENT_ID;
}

export async function verifyGoogleCredential(credential) {
  const token = String(credential || "").trim();
  if (!token || token.length > 16000) throw new Error("Google sign-in could not be verified.");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Google sign-in could not be verified.");

  let header;
  let payload;
  try {
    header = decodeJsonPart(parts[0]);
    payload = decodeJsonPart(parts[1]);
  } catch (_) {
    throw new Error("Google sign-in could not be verified.");
  }

  if (header?.alg !== "RS256" || !header?.kid) throw new Error("Google sign-in could not be verified.");

  const jwk = await signingKey(String(header.kid));
  let publicKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch (_) {
    throw new Error("Could not verify Google sign-in right now.");
  }

  const signature = decodeBase64Url(parts[2]);
  const signed = encoder.encode(`${parts[0]}.${parts[1]}`);
  const signatureOk = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    signature,
    signed
  );
  if (!signatureOk) throw new Error("Google sign-in could not be verified.");

  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuer = String(payload?.iss || "");
  if (issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") {
    throw new Error("Google sign-in could not be verified.");
  }
  if (!validAudience(payload)) throw new Error("Google sign-in could not be verified.");
  if (!Number(payload?.exp) || Number(payload.exp) <= nowSeconds) throw new Error("Google sign-in has expired. Please try again.");
  if (Number(payload?.nbf) && Number(payload.nbf) > nowSeconds + 60) throw new Error("Google sign-in could not be verified.");
  if (Number(payload?.iat) && Number(payload.iat) > nowSeconds + 300) throw new Error("Google sign-in could not be verified.");

  const sub = String(payload?.sub || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  if (!sub || sub.length > 255 || !email || payload?.email_verified !== true) {
    throw new Error("Google did not provide a verified email address.");
  }

  return {
    sub,
    email,
    name: String(payload?.name || "").slice(0, 200)
  };
}

export async function ensureGoogleAuthSchema(db) {
  if (!schemaPromise) {
    schemaPromise = db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS auth_identities (
          provider TEXT NOT NULL,
          provider_subject TEXT NOT NULL,
          user_id TEXT NOT NULL,
          provider_email TEXT NOT NULL COLLATE NOCASE,
          linked_at INTEGER NOT NULL,
          last_verified_at INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (provider, provider_subject),
          UNIQUE (user_id, provider),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.prepare("CREATE INDEX IF NOT EXISTS auth_identities_user_id_idx ON auth_identities(user_id)"),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS user_auth_state (
          user_id TEXT PRIMARY KEY,
          password_enabled INTEGER NOT NULL DEFAULT 1 CHECK (password_enabled IN (0, 1)),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
    ]).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function userAuthInfo(db, userId) {
  const row = await db.prepare(`
    SELECT ai.provider_subject AS google_sub,
           ai.provider_email AS google_email,
           uas.password_enabled AS password_enabled
    FROM users u
    LEFT JOIN auth_identities ai
      ON ai.user_id = u.id AND ai.provider = 'google'
    LEFT JOIN user_auth_state uas
      ON uas.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
  `).bind(userId).first();

  return {
    googleLinked: Boolean(row?.google_sub),
    googleEmail: row?.google_email ? String(row.google_email) : "",
    passwordEnabled: row?.password_enabled == null ? true : Number(row.password_enabled) !== 0
  };
}
