/* BOXXY v445: public BOXXY Originals Hall of Fame data is administered from Basement. */
import { json, requireDatabase } from "../_lib/auth.js";
import { readOriginalsHallOfFame } from "../_lib/originals-hall-of-fame.js";

export async function onRequestGet(context) {
  try {
    const db = requireDatabase(context.env);
    const entries = await readOriginalsHallOfFame(db);
    return json({ ok:true, entries }, 200, { "cache-control":"no-store" });
  } catch (error) {
    console.error("BOXXY Originals Hall of Fame error", error);
    return json({ ok:false, error:"Hall of Fame unavailable." }, 500, { "cache-control":"no-store" });
  }
}

export async function onRequest(context) {
  if (context.request.method !== "GET") return json({ ok:false, error:"Method not allowed." }, 405);
  return onRequestGet(context);
}
