/* BOXXY v477: authenticated, on-demand medal dates. The primary key
   (user_id, date_key) makes this a bounded per-player index lookup. */
import { json, requireDatabase, refreshAuthenticatedSession } from "../_lib/auth.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return json({ ok:false, error:"Method not allowed." }, 405);
  try {
    const db = requireDatabase(context.env);
    const session = await refreshAuthenticatedSession(context.env, context.request);
    if (!session) return json({ ok:false, authenticated:false, error:"Please sign in." }, 401);
    // No medal re-calculation or attempt-history scan. The award ledger already
    // exists and its composite primary key starts with user_id.
    const result = await db.prepare(`SELECT date_key FROM daily_gold_medals
      WHERE user_id = ? ORDER BY date_key ASC`)
      .bind(session.user.id).all();
    const headers = session.cookieHeader ? { "set-cookie":session.cookieHeader } : {};
    return json({ ok:true, dates:(result.results || []).map(row => String(row.date_key || "")) }, 200, headers);
  } catch (error) {
    console.error("BOXXY medal dates", error);
    return json({ ok:false, error:"Medal dates temporarily unavailable." }, 500);
  }
}
