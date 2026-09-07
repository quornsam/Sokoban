import { requireDatabase, adminAuthenticated } from "../_lib/auth.js";
import { DAILY_PRACTICE_CATALOG } from "../_lib/daily-practice-catalog.js";
const text = (value,status=200,headers={}) => new Response(value,{status,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"private, no-store",...headers}});
export async function onRequest({request,env}) {
  try {
    if(request.method!=="GET") return text("Method not allowed.",405);
    requireDatabase(env);
    if(!await adminAuthenticated(env,request)) return text("Basement access required.",401);
    const url=new URL(request.url);
    const date=url.searchParams.get("date") || "";
    const puzzle=DAILY_PRACTICE_CATALOG.find(item=>item.date===date);
    if(!puzzle) return text("That prepared Daily puzzle was not found.",404);
    const asset=await env.ASSETS.fetch(new Request(new URL("/basement/practice-shell.html",url),{cache:"no-store"}));
    if(!asset.ok) return text("Practice page is unavailable.",503);
    const shell=await asset.text();
    const marker="__BOXXY_PRIVATE_PRACTICE_DATA__";
    if(!shell.includes(marker)) return text("Practice page version mismatch.",503);
    const payload=JSON.stringify({puzzle}).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
    const origin=url.origin;
    const csp=`default-src 'none'; script-src 'unsafe-inline' ${origin}; style-src 'unsafe-inline' ${origin}; img-src ${origin} data: blob:; font-src ${origin} data:; media-src ${origin}; connect-src 'none'; worker-src ${origin} blob:; frame-ancestors ${origin}; base-uri ${origin}; form-action 'none';`;
    return new Response(shell.replace(marker,() => payload),{headers:{
      "content-type":"text/html; charset=utf-8","cache-control":"private, no-store",
      "x-content-type-options":"nosniff","referrer-policy":"no-referrer",
      "content-security-policy":csp
    }});
  } catch(error) {
    console.error("BOXXY private practice",error);
    return text("Could not open private Daily practice.",500);
  }
}
