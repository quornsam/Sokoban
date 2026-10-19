/* BOXXY v484 — server access to the canonical static content catalogue. */
import "../../assets/data/content-catalog.js";

const catalog = globalThis.BOXXY_CONTENT_CATALOG || { packs: [], dailyMonths: [] };

export const OFFICIAL_PACKS = Object.freeze(Array.isArray(catalog.packs) ? catalog.packs : []);
export const OFFICIAL_DAILY_MONTHS = Object.freeze(Array.isArray(catalog.dailyMonths) ? catalog.dailyMonths : []);
export const OFFICIAL_PACK_BY_ID = new Map(OFFICIAL_PACKS.map(pack => [pack.id, pack]));
export const OFFICIAL_SPECIAL_MEDALS = Object.freeze(Array.isArray(catalog.specialMedals) ? catalog.specialMedals : []);
