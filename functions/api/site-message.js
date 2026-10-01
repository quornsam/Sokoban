import { json, requireDatabase } from '../_lib/auth.js';
import {
  cleanSiteAnnouncementDate,
  mappedSiteAnnouncement
} from '../_lib/site-announcements.js';

export async function onRequest(context) {
  try {
    if (context.request.method !== 'GET') return json({ ok:false, error:'Method not allowed.' }, 405);
    const db = requireDatabase(context.env);
    const url = new URL(context.request.url);
    const date = cleanSiteAnnouncementDate(url.searchParams.get('date'));
    if (!date) return json({ ok:false, error:'A valid local date is required.' }, 400);
    let row = null;
    try {
      row = await db.prepare(`
        SELECT message_date, message_text, background_color, text_color,
               button_label, action_key, action_value, enabled, updated_at
        FROM site_announcements
        WHERE message_date = ? AND enabled = 1
        LIMIT 1
      `).bind(date).first();
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes('no such table')) throw error;
    }
    return json({ ok:true, message:mappedSiteAnnouncement(row) }, 200, {
      'cache-control':'public, max-age=15, s-maxage=15'
    });
  } catch (error) {
    console.error('BOXXY site message error', error);
    const message = String(error?.message || error || 'Unexpected error.');
    return json({ ok:false, error:message.includes('database binding DB') ? 'Message service is not configured.' : message }, message.includes('database binding DB') ? 503 : 500);
  }
}
