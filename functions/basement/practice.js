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
    const asset=await env.ASSETS.fetch(new Request(new URL("/basement/practice-shell.html",url)));
    if(!asset.ok) return text("Practice page is unavailable. Check that v336 practice-shell.html was deployed.",503);
    const shell=await asset.text();
    if(!shell.includes("practice-runtime.js?v=336") || !shell.includes("boxxy.js?v=336")) return text("Practice files are from different versions. Re-upload the complete v336 replacement.",503);
    const marker="__BOXXY_PRIVATE_PRACTICE_DATA__";
    if(!shell.includes(marker) || !shell.includes("__BOXXY_PRIVATE_ASSET_DATA__")) return text("Practice page version mismatch.",503);
    const requestId=String(url.searchParams.get("requestId")||"").slice(0,80);
    const payload=JSON.stringify({puzzle,parentOrigin:url.origin,requestId}).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
    const origin=url.origin;
    const csp=`default-src 'none'; script-src 'unsafe-inline' ${origin}; style-src 'unsafe-inline' ${origin}; img-src ${origin} data: blob:; font-src ${origin} data:; media-src ${origin}; connect-src 'none'; worker-src ${origin} blob:; frame-ancestors ${origin}; base-uri ${origin}; form-action 'none';`;
    const documentHtml=shell.replace(marker,() => payload).replace('<meta charset="utf-8">',
      `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp.replace(/; frame-ancestors [^;]+;/, ";")}">`);
    return new Response(documentHtml,{headers:{
      "content-type":"text/html; charset=utf-8","cache-control":"private, no-store",
      "x-content-type-options":"nosniff","referrer-policy":"no-referrer",
      "content-security-policy":csp,
      "x-frame-options":"SAMEORIGIN"
    }});
  } catch(error) {
    console.error("BOXXY private practice",error);
    return text("Could not open private Daily practice.",500);
  }
}
