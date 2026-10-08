import type { StationTheme } from './campaign';
import { UNITS, type UnitDef } from './units';

// ───────────── Địa hình, thời tiết và sự kiện ngẫu nhiên ─────────────
// Mọi hiệu ứng đều là dữ liệu: sim áp chỉ số, UI tự sinh mô tả từ chính các con số này.
// Địa hình/thời tiết áp dụng cho CẢ HAI PHE: người chơi chọn đội hình để tận dụng hoặc né bất lợi.

export type WeatherId = 'sunny' | 'rain' | 'thunder' | 'fog' | 'fireRain';

/** chỉ số bị ảnh hưởng */
export type EffStat =
  | 'speed' | 'dmg' | 'hp' | 'range'
  /** xác suất né (cộng thêm, 0.2 = +20%) */
  | 'dodge'
  /** hồi (+) hoặc mất (−) máu mỗi giây, theo tỉ lệ máu tối đa */
  | 'hpRate'
  /** vàng/giây của cả hai bên */
  | 'income'
  /** sát thương lửa: Hỏa Công, Hố Lửa, Sóng Lửa, Bom */
  | 'fire'
  /** sức mạnh làm chậm/sát thương của Trụ Băng */
  | 'frost';

/** nhóm đơn vị chịu ảnh hưởng */
export type EffWho = 'all' | 'cav' | 'ninja' | 'ranged' | 'general' | 'defense';

export interface Effect {
  stat: EffStat;
  who: EffWho;
  /** với speed/dmg/hp/range/income/fire/frost: thay đổi theo tỉ lệ (−0.15 = −15%); dodge/hpRate: giá trị cộng */
  v: number;
}

export const GLOBAL_STATS: EffStat[] = ['income', 'fire', 'frost'];

export function whoMatches(who: EffWho, d: UnitDef): boolean {
  const mobile = d.kind !== 'defense';
  switch (who) {
    case 'all': return mobile;
    case 'cav': return !!d.tags?.includes('cav');
    case 'ninja': return d.skill === 'ninja' || d.skill2 === 'ninja';
    case 'ranged': return mobile && d.range > 70;
    case 'general': return d.kind === 'general' || d.kind === 'boss';
    case 'defense': return d.kind === 'defense';
  }
}

const fx = (stat: EffStat, who: EffWho, v: number): Effect => ({ stat, who, v });

export interface Terrain {
  /** trùng id chủ đề (theme) của trạm */
  id: StationTheme;
  icon: string;
  effects: Effect[];
}

export const TERRAINS: Record<StationTheme, Terrain> = {
  plains: { id: 'plains', icon: '🌾', effects: [fx('speed', 'cav', 0.15), fx('hp', 'defense', -0.1)] },
  bamboo: { id: 'bamboo', icon: '🌲', effects: [fx('dodge', 'ninja', 0.2), fx('range', 'ranged', -0.15)] },
  stone: { id: 'stone', icon: '🏔️', effects: [fx('range', 'ranged', 0.15), fx('speed', 'cav', -0.1)] },
  castle: { id: 'castle', icon: '🏯', effects: [fx('hp', 'defense', 0.2), fx('dmg', 'defense', 0.1)] },
  throne: { id: 'throne', icon: '🏛️', effects: [fx('hp', 'general', 0.1), fx('dmg', 'general', 0.1)] },
  sea: { id: 'sea', icon: '🌊', effects: [fx('speed', 'cav', -0.2), fx('fire', 'all', -0.25)] },
  snow: { id: 'snow', icon: '❄️', effects: [fx('speed', 'all', -0.15), fx('frost', 'all', 0.2)] },
  desert: { id: 'desert', icon: '🌵', effects: [fx('income', 'all', 0.25), fx('hp', 'all', -0.1)] },
  heaven: { id: 'heaven', icon: '☁️', effects: [fx('hpRate', 'all', 0.005), fx('speed', 'all', 0.05)] },
  volcano: { id: 'volcano', icon: '🌋', effects: [fx('hpRate', 'all', -0.006), fx('fire', 'all', 0.25)] },
  night: { id: 'night', icon: '🌙', effects: [fx('dmg', 'ninja', 0.3), fx('range', 'ranged', -0.1)] },
};

/** sự kiện định kỳ của thời tiết */
export interface WeatherEvent {
  kind: 'lightning' | 'fireZone';
  /** chu kỳ (giây) */
  every: number;
}

export interface Weather {
  id: WeatherId;
  icon: string;
  effects: Effect[];
  event?: WeatherEvent;
}

export const WEATHERS: Record<WeatherId, Weather> = {
  sunny: { id: 'sunny', icon: '☀️', effects: [] },
  rain: { id: 'rain', icon: '🌧️', effects: [fx('speed', 'all', -0.1), fx('fire', 'all', -0.3), fx('frost', 'all', 0.3)] },
  thunder: { id: 'thunder', icon: '⛈️', effects: [], event: { kind: 'lightning', every: 20 } },
  fog: { id: 'fog', icon: '🌫️', effects: [fx('range', 'ranged', -0.25)] },
  fireRain: { id: 'fireRain', icon: '🔥', effects: [], event: { kind: 'fireZone', every: 15 } },
};

/** sét đánh (thời tiết Sấm và sự kiện Thiên Lôi) */
export const LIGHTNING = { radius: 75, damage: 40, hpPct: 0.05, cap: 100, stun: 0.8, warn: 1 };
/** sát thương một cú sét lên đơn vị có `maxHp` */
export const lightningDamage = (maxHp: number) => Math.min(LIGHTNING.cap, LIGHTNING.damage + maxHp * LIGHTNING.hpPct);
/** vùng cháy của Mưa Lửa */
export const FIRE_ZONE = { radius: 110, life: 6, dps: 16, tick: 0.5 };

// ───────────── Sự kiện ngẫu nhiên trong trận ─────────────
export type RandomEventId = 'dragon' | 'goldRush' | 'lightning' | 'arrowRain' | 'ghostGate';
export const RANDOM_EVENTS: { id: RandomEventId; icon: string }[] = [
  { id: 'dragon', icon: '🐉' },
  { id: 'goldRush', icon: '💰' },
  { id: 'lightning', icon: '⚡' },
  { id: 'arrowRain', icon: '🏹' },
  { id: 'ghostGate', icon: '👻' },
];
/** xác suất một trận có sự kiện (10–20%), sự kiện kích hoạt ngẫu nhiên trong khoảng thời gian này */
export const EVENT_CHANCE: [number, number] = [0.1, 0.2];
export const EVENT_TIME: [number, number] = [25, 60];
export const EVENT_GOLD = { mul: 2, sec: 15 };
export const EVENT_LIGHTNING_STRIKES = 6;
/** Mưa Tên: mất % máu tối đa (không gây chết) */
export const EVENT_ARROW_HP = 0.1;
export const EVENT_GHOSTS = 5;

/** quái thú khổng lồ xuất hiện gần cuối trận (trạm thứ 5 của mỗi bản đồ) */
export const GIANT_MIN_TIME = 35;
export const GIANT_AT_TIME = 80;
export const GIANT_AT_HP = 0.5;

/** các hiệu ứng đang có hiệu lực của một trạm (địa hình + thời tiết) */
export function envEffects(theme: StationTheme, weather: WeatherId): Effect[] {
  return [...TERRAINS[theme].effects, ...WEATHERS[weather].effects];
}

/** tích hệ số của một chỉ số (1 + v) với đơn vị `d` */
export function effMul(effs: Effect[], stat: EffStat, d: UnitDef): number {
  let m = 1;
  for (const e of effs) if (e.stat === stat && whoMatches(e.who, d)) m *= 1 + e.v;
  return m;
}

/** tổng giá trị cộng của một chỉ số với đơn vị `d` */
export function effSum(effs: Effect[], stat: EffStat, d: UnitDef): number {
  let s = 0;
  for (const e of effs) if (e.stat === stat && whoMatches(e.who, d)) s += e.v;
  return s;
}

/** hệ số toàn cục (vàng, lửa, băng) */
export function globalMul(effs: Effect[], stat: EffStat): number {
  let m = 1;
  for (const e of effs) if (e.stat === stat) m *= 1 + e.v;
  return m;
}

/** tham số hiển thị của mỗi sự kiện ngẫu nhiên (khớp với con số sim dùng) */
export function eventParams(id: RandomEventId): Record<string, number> {
  switch (id) {
    case 'dragon': return { sec: UNITS.longthan.life ?? 0 };
    case 'goldRush': return { sec: EVENT_GOLD.sec };
    case 'lightning': return { n: EVENT_LIGHTNING_STRIKES, dmg: LIGHTNING.damage, pct: Math.round(LIGHTNING.hpPct * 100), cap: LIGHTNING.cap, sec: LIGHTNING.stun };
    case 'arrowRain': return { pct: Math.round(EVENT_ARROW_HP * 100) };
    case 'ghostGate': return { n: EVENT_GHOSTS };
  }
}
