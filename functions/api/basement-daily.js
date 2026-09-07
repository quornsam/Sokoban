import { json, requireDatabase, adminAuthenticated } from "../_lib/auth.js";
import { DAILY_PRACTICE_CATALOG } from "../_lib/daily-practice-catalog.js";

export async function onRequest({ request, env }) {
  try {
    if (request.method !== "GET") return json({ok:false,error:"Method not allowed."},405,{"cache-control":"no-store"});
    requireDatabase(env);
    if (!await adminAuthenticated(env,request)) return json({ok:false,error:"Basement access required."},401,{"cache-control":"no-store"});
    const now=Date.now();
    return json({ok:true,puzzles:DAILY_PRACTICE_CATALOG.map(({date,sequence,name,layout,goalColours,rainbowMode,preparedFor}) => ({
      date,sequence,name,layout,goalColours:goalColours||{},rainbowMode:Boolean(rainbowMode),preparedFor,
      published:Date.parse(preparedFor)<=now
    }))},200,{"cache-control":"private, no-store"});
  } catch(error) {
    console.error("BOXXY private Daily catalogue",error);
    return json({ok:false,error:"Could not load the private Daily catalogue."},500,{"cache-control":"no-store"});
  }
}
