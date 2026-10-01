import { authenticatedUser, json, requireDatabase } from '../_lib/auth.js';
import {
  cleanSiteAnnouncementDate,
  cleanSiteAnnouncementAudience,
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
               button_label, action_key, action_value, audience_mode, enabled, updated_at
        FROM site_announcements
        WHERE message_date = ? AND enabled = 1
        LIMIT 1
      `).bind(date).first();
    } catch (error) {
      const message = String(error?.message || error).toLowerCase();
      if (message.includes('no such table')) row = null;
      else if (message.includes('no such column') && message.includes('audience_mode')) {
        row = await db.prepare(`
          SELECT message_date, message_text, background_color, text_color,
                 button_label, action_key, action_value, enabled, updated_at
          FROM site_announcements
          WHERE message_date = ? AND enabled = 1
          LIMIT 1
        `).bind(date).first();
        if (row) row.audience_mode = 'all';
      } else throw error;
    }
    if (!row) return json({ ok:true, message:null });

    const audienceMode = cleanSiteAnnouncementAudience(row.audience_mode);
    if (audienceMode === 'selected') {
      const user = await authenticatedUser(context.env, context.request);
      if (!user?.id) return json({ ok:true, message:null });
      const target = await db.prepare(`
        SELECT 1 AS allowed FROM site_announcement_targets
        WHERE message_date = ? AND user_id = ? LIMIT 1
      `).bind(date, user.id).first();
      if (!target) return json({ ok:true, message:null });
    }

    // This endpoint can be account-specific. Never let a shared edge cache leak a
    // selected-user test message to another browser.
    return json({ ok:true, message:mappedSiteAnnouncement(row) });
  } catch (error) {
    console.error('BOXXY site message error', error);
    const message = String(error?.message || error || 'Unexpected error.');
    return json({ ok:false, error:message.includes('database binding DB') ? 'Message service is not configured.' : message }, message.includes('database binding DB') ? 503 : 500);
  }
}
