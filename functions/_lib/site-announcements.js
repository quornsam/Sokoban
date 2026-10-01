const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

export async function ensureSiteAnnouncementsSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS site_announcements (
      message_date TEXT PRIMARY KEY,
      message_text TEXT NOT NULL,
      background_color TEXT NOT NULL DEFAULT '#f2b51d',
      text_color TEXT NOT NULL DEFAULT '#171719',
      button_label TEXT NOT NULL DEFAULT '',
      action_key TEXT NOT NULL DEFAULT '',
      action_value TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
      updated_at INTEGER NOT NULL DEFAULT 0
    )
  `).run();
}

export function cleanSiteAnnouncementDate(value) {
  const date = String(value || '').trim();
  return DATE_RE.test(date) ? date : '';
}

export function cleanSiteAnnouncementColour(value, fallback) {
  const colour = String(value || '').trim();
  return COLOUR_RE.test(colour) ? colour.toLowerCase() : fallback;
}

export function cleanSiteAnnouncementAction(value) {
  const action = String(value || '').trim().toLowerCase();
  return /^[a-z0-9:_-]{0,80}$/.test(action) ? action : '';
}

export function cleanSiteAnnouncementValue(value) {
  return String(value || '').trim().slice(0, 500);
}

export function mappedSiteAnnouncement(row) {
  if (!row) return null;
  return {
    date: String(row.message_date || ''),
    text: String(row.message_text || ''),
    backgroundColor: cleanSiteAnnouncementColour(row.background_color, '#f2b51d'),
    textColor: cleanSiteAnnouncementColour(row.text_color, '#171719'),
    buttonLabel: String(row.button_label || ''),
    actionKey: cleanSiteAnnouncementAction(row.action_key),
    actionValue: String(row.action_value || ''),
    enabled: Number(row.enabled) === 1,
    updatedAt: Number(row.updated_at) || 0
  };
}
