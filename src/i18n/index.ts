import type { UnitDef } from '../data/units';
import type { Chapter, Station } from '../data/campaign';
import { STRINGS } from './strings';
import { EN_UNITS, EN_STATIONS, EN_CHAPTERS } from './dataEn';

export type Lang = 'vi' | 'en';
export const LANGS: Lang[] = ['vi', 'en'];
const KEY = 'empire.lang';

function detect(): Lang {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'vi' || s === 'en') return s;
  } catch {
    /* localStorage không khả dụng */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

let lang: Lang = detect();
const listeners = new Set<(l: Lang) => void>();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;

export function setLang(l: Lang) {
  if (l === lang) return;
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* bỏ qua */
  }
  document.documentElement.lang = l;
  document.title = t('app.title');
  listeners.forEach((fn) => fn(l));
}

/** Đăng ký callback khi đổi ngôn ngữ; trả về hàm hủy */
export function onLang(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = STRINGS[lang][key] ?? STRINGS.vi[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// Dữ liệu game gốc viết bằng tiếng Việt; bản tiếng Anh nằm trong dataEn.ts
export const unitName = (d: UnitDef) => (lang === 'en' ? EN_UNITS[d.id]?.name : undefined) ?? d.name;
export const unitSkill = (d: UnitDef) => (lang === 'en' ? EN_UNITS[d.id]?.skill : undefined) ?? d.skillName;
export const unitDesc = (d: UnitDef) => (lang === 'en' ? EN_UNITS[d.id]?.desc : undefined) ?? d.desc;
export const stationName = (s: Station) => (lang === 'en' ? EN_STATIONS[s.id]?.name : undefined) ?? s.name;
export const stationSub = (s: Station) => (lang === 'en' ? EN_STATIONS[s.id]?.sub : undefined) ?? s.subtitle;
export const stationDesc = (s: Station) => (lang === 'en' ? EN_STATIONS[s.id]?.desc : undefined) ?? s.desc;
export const chapterName = (c: Chapter) => (lang === 'en' ? EN_CHAPTERS[c.id]?.name : undefined) ?? c.name;
export const chapterSub = (c: Chapter) => (lang === 'en' ? EN_CHAPTERS[c.id]?.sub : undefined) ?? c.subtitle;
