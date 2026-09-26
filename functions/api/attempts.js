/* BOXXY v376 — authenticated player-only history and offline queue ingest. */
import {json,requireDatabase,refreshAuthenticatedSession} from '../_lib/auth.js';
import {ensureAttemptHistorySchema,writeAttemptHistory,readAttemptOverview,readLevelAttemptHistory} from '../_lib/attempt-history.js';
export async function onRequest(context) {
  try {
    const db = requireDatabase(context.env);
    const session = await refreshAuthenticatedSession(context.env,context.request);
    if (!session) return json({ok:false,authenticated:false,error:'Please sign in.'},401);
    const headers = session.cookieHeader ? {'set-cookie':session.cookieHeader} : {};
    await ensureAttemptHistorySchema(db);
    if (context.request.method === 'GET') {
      const url = new URL(context.request.url);
      if (url.searchParams.has('packId')) {
        const level = await readLevelAttemptHistory(db,session.user.id,{
          packId:url.searchParams.get('packId'),levelToken:url.searchParams.get('levelToken'),
          sort:url.searchParams.get('sort'),direction:url.searchParams.get('direction'),
          offset:url.searchParams.get('offset')
        },session.user.progress_json);
        return json({ok:true,...level},200,headers);
      }
      return json({ok:true,...await readAttemptOverview(db,session.user.id,session.user.progress_json)},200,headers);
    }
    if (context.request.method === 'POST') {
      const body = await context.request.json();
      const ids = await writeAttemptHistory(db,session.user.id,body.attempts);
      return json({ok:true,ids},200,headers);
    }
    return json({ok:false,error:'Method not allowed.'},405);
  } catch(error) {
    console.error('BOXXY attempt history',error);
    const msg = String(error?.message || error);
    const status = /Invalid attempt|between 1 and 60|Invalid level/.test(msg) ? 400 : 500;
    return json({ok:false,error: status === 400 ? msg : 'Attempt history temporarily unavailable.'},status);
  }
}
