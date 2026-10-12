// Căn cứ phụ (outpost), địa hình trong lane (vũng lầy, suối thần...), lane thứ 4 của địch, hầm. Thuần dữ liệu, không phụ thuộc sim/render.

/** độ dài lane chuẩn (không có căn cứ phụ) */
export const BASE_LANE_LEN = 1000;
/** số căn cứ phụ tối đa mỗi lane; càng nhiều căn cứ lane càng dài và quân càng nhỏ lại để nhìn trọn bản đồ */
export const OUTPOST_MAX = 3;
const LANE_LEN_BY_POSTS = [1000, 2000, 2600, 3200];
const UNIT_SCALE_BY_POSTS = [1, 0.5, 0.4, 0.33];
/** lane dài thì quân chạy nhanh hơn một chút để một chuyến đi không quá lâu */
const SPEED_BY_POSTS = [1, 1.2, 1.35, 1.5];
const clampPosts = (n: number) => Math.max(0, Math.min(OUTPOST_MAX, Math.floor(n)));
export const laneLenFor = (posts: number) => LANE_LEN_BY_POSTS[clampPosts(posts)];
export const unitScaleFor = (posts: number) => UNIT_SCALE_BY_POSTS[clampPosts(posts)];
export const laneSpeedFor = (posts: number) => SPEED_BY_POSTS[clampPosts(posts)];
/** vị trí các căn cứ phụ theo tỉ lệ độ dài lane (tính từ cờ ta), gần ta nhất trước */
const OUTPOST_AT: number[][] = [[], [0.66], [0.52, 0.76], [0.42, 0.6, 0.78]];
export const outpostXs = (posts: number, len: number): number[] => OUTPOST_AT[clampPosts(posts)].map((k) => k * len);
/** vị trí căn cứ theo tỉ lệ độ dài lane, tra theo số căn cứ */
export const OUTPOST_AT_FRACS: readonly number[][] = OUTPOST_AT;

// ───────────── căn cứ phụ ─────────────

export type OutpostKind = 'gold' | 'rally' | 'deploy' | 'range' | 'drill';
export const OUTPOST_KINDS: OutpostKind[] = ['gold', 'rally', 'deploy', 'range', 'drill'];
export const OUTPOST_ICON: Record<OutpostKind, string> = { gold: '💰', rally: '📯', deploy: '⛺', range: '🏹', drill: '⚔' };

export const OUTPOST = {
  /** bán kính chiếm đóng (đơn vị lane) */
  radius: 120,
  /** giây để một quân chiếm trọn căn cứ (thêm quân thì nhanh hơn, tối đa ×2) */
  captureSec: 5,
  /** tốc độ phục hồi về chủ cũ khi không còn ai đứng trong căn cứ (tỉ lệ/giây) */
  drift: 0.05,
  /** +vàng/giây theo phe (địch nhận ít hơn vì đã có thu nhập riêng) */
  gold: [1, 0.6] as [number, number],
  /** quân mới ra trận ở lane này chạy nhanh hơn trong một lúc */
  rally: { speed: 1.5, sec: 8 },
  /** thả quân ngay tại căn cứ khi kéo thả trong phạm vi này; đặt công trình được xa hơn tới căn cứ + đoạn này */
  deployReach: 220,
  deployDefense: 70,
  /** tầm đánh nhân với hệ số này */
  range: 1.3,
  /** hồi chiêu kỹ năng nhanh hơn, tốc độ đánh tăng */
  drill: { skill: 1.35, rate: 1.12 },
} as const;

/** quân địch tự do (ngoài đồn trú) ít đi khi trạm có đồn trú: nhân theo số căn cứ phụ mỗi lane */
export const OUTPOST_BUDGET_MUL = [1, 0.9, 0.8, 0.7];

/** thời gian 3 sao theo số căn cứ phụ mỗi lane (lane càng dài, trận càng lâu) */
export const OUTPOST_TIME_MUL = [1, 1.3, 1.5, 1.7];

// ───────────── đồn trú của căn cứ phụ ─────────────
// Địch giữ sẵn mọi căn cứ phụ; quân canh chỉ đứng quanh căn cứ (không tiến lên) nên phải diệt hết mới chiếm được.
// Càng vào sâu (xa thành ta) càng mạnh: căn cứ 1 là lính, căn cứ 2 là thú canh giữ, căn cứ 3 có cung thủ + tháp cung.

export interface GuardSpec {
  id: string;
  n: number;
}
export interface GarrisonDef {
  /** nhân sức mạnh của quân canh so với sức mạnh của trạm */
  pow: number;
  units: GuardSpec[];
  /** công trình phòng thủ của địch dựng sẵn ở căn cứ */
  tower?: string;
}

/** bán kính quân canh được phép rời chỗ canh để đuổi địch */
export const GUARD_LEASH = 170;

/** đồn trú theo độ sâu (0 = gần ta nhất) và bản đồ (chương): chương sau đông và mạnh hơn */
export function garrisonFor(depth: number, chapter: number): GarrisonDef {
  const bonus = chapter >= 2 ? 1 : 0;
  switch (Math.max(0, Math.min(OUTPOST_MAX - 1, depth))) {
    case 0: return { pow: 0.85, units: [{ id: 'spear', n: 1 }, { id: 'samurai', n: 1 + bonus }] };
    case 1: return { pow: 0.95, units: [{ id: 'soihoang', n: 2 }, { id: chapter >= 3 ? 'hocnui' : 'lonrung', n: 1 }] };
    default: return { pow: 1.05, units: [{ id: 'archer', n: 2 }, { id: 'crossbow', n: 1 }], tower: 'archertower' };
  }
}

// ───────────── địa hình lane ─────────────

export type ZoneId = 'swamp' | 'spring' | 'scorch' | 'forest' | 'hill' | 'ice' | 'miasma';

/** hệ số áp lên quân của CẢ HAI phe đang đứng trong vùng (nhân) hoặc cộng (hpRate, dodge) */
export interface ZoneFx {
  speed?: number;
  dmg?: number;
  rate?: number;
  range?: number;
  dodge?: number;
  /** hồi (+) / mất (−) máu mỗi giây theo máu tối đa; mất máu không gây chết */
  hpRate?: number;
}

export interface ZoneDef {
  id: ZoneId;
  icon: string;
  color: number;
  fx: ZoneFx;
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  swamp: { id: 'swamp', icon: '🐊', color: 0x4d6b2a, fx: { speed: 0.7 } },
  spring: { id: 'spring', icon: '⛲', color: 0x4fc3ff, fx: { hpRate: 0.02 } },
  scorch: { id: 'scorch', icon: '🔥', color: 0xd9531e, fx: { hpRate: -0.02 } },
  forest: { id: 'forest', icon: '🌲', color: 0x2f7d3a, fx: { dodge: 0.2, speed: 0.9 } },
  hill: { id: 'hill', icon: '⛰', color: 0x9a8566, fx: { range: 1.3, dmg: 1.1 } },
  ice: { id: 'ice', icon: '❄', color: 0x9fdcff, fx: { speed: 1.3, rate: 0.8 } },
  miasma: { id: 'miasma', icon: '☠', color: 0x7a3d9a, fx: { dmg: 0.8, hpRate: -0.01 } },
};
export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

export interface LaneZone {
  kind: ZoneId;
  x0: number;
  x1: number;
}

/** xác suất cả trận không có địa hình lane nào / số vùng tối đa mỗi lane */
export const ZONE_NONE_CHANCE = 0.25;
export const ZONE_MAX_PER_LANE = 2;

/** xúc xắc địa hình lane cho một trận: có thể không có vùng nào; mỗi lane 0–2 vùng, không chồng lên nhau */
export function rollZones(len: number, laneCount: number, rnd: () => number = Math.random): LaneZone[][] {
  const out: LaneZone[][] = Array.from({ length: laneCount }, () => []);
  if (rnd() < ZONE_NONE_CHANCE) return out;
  const k = len / BASE_LANE_LEN;
  let any = false;
  for (let i = 0; i < laneCount; i++) {
    const n = Math.floor(rnd() * (ZONE_MAX_PER_LANE + 1));
    for (let j = 0; j < n; j++) {
      const w = (130 + rnd() * 110) * k;
      const lo = len * 0.2;
      const hi = len * 0.8 - w;
      for (let tries = 0; tries < 8; tries++) {
        const x0 = lo + rnd() * (hi - lo);
        if (out[i].some((z) => x0 < z.x1 + 40 * k && x0 + w > z.x0 - 40 * k)) continue;
        out[i].push({ kind: ZONE_IDS[Math.floor(rnd() * ZONE_IDS.length)], x0, x1: x0 + w });
        any = true;
        break;
      }
    }
  }
  // đã quyết định "có địa hình" thì đảm bảo ít nhất một vùng
  if (!any) {
    const w = 170 * k;
    const x0 = len * 0.3 + rnd() * len * 0.3;
    out[Math.floor(rnd() * laneCount)].push({ kind: ZONE_IDS[Math.floor(rnd() * ZONE_IDS.length)], x0, x1: x0 + w });
  }
  for (const l of out) l.sort((a, b) => a.x0 - b.x0);
  return out;
}

// ───────────── bộ ngẫu nhiên có hạt giống (kế hoạch cố định theo bản đồ) ─────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────────── kế hoạch căn cứ phụ cho từng bản đồ ─────────────

/** kế hoạch căn cứ phụ của một trạm: kinds[lane] = loại căn cứ từ gần ta nhất → xa nhất (độ dài mỗi lane = số căn cứ) */
export type OutpostLanes = OutpostKind[][];

/**
 * Ngẫu nhiên (cố định theo bản đồ) các trạm có căn cứ phụ: mỗi bản đồ 10 trạm có 3–4 trạm, không tính trạm đầu, trạm Boss
 * và các trạm không hợp (`skip`). Trạm càng sâu càng nhiều căn cứ (1 → 2 → 3). Mỗi lane của trạm có cùng số căn cứ, mỗi căn cứ một loại khác nhau.
 * Trả về: chỉ số trạm trong bản đồ → loại căn cứ theo lane.
 */
export function outpostPlan(chapter: number, stationsPerMap: number, lanes = 3, skip: (j: number) => boolean = () => false): Map<number, OutpostLanes> {
  const rnd = mulberry32(7331 + chapter * 101);
  const pool = Array.from({ length: stationsPerMap - 2 }, (_, i) => i + 1).filter((j) => !skip(j));
  const count = Math.min(pool.length, 3 + (rnd() < 0.4 ? 1 : 0));
  const picked = shuffle(pool, rnd).slice(0, count).sort((a, b) => a - b);
  // 3 trạm: 1-2-3 căn cứ; 4 trạm: 1-2-2-3
  const posts = count >= 4 ? [1, 2, 2, 3] : [1, 2, 3].slice(3 - count);
  return new Map(picked.map((j, i) => [j, Array.from({ length: lanes }, () => shuffle(OUTPOST_KINDS, rnd).slice(0, posts[i]))]));
}

// ───────────── lane thứ 4 của địch ─────────────

/**
 * Lane thứ 4 (chỉ địch có): đường đi riêng từ thành địch nhập vào một lane của ta tại `mergeX`;
 * từ đó lane ấy chịu hai dòng quân địch. Ta không có thành ở lane này nên không thả quân vào, chỉ cần thắng 2/3 lane của ta.
 */
export interface ExtraLane {
  /** lane của ta mà đường này nhập vào (0 = đường nằm phía trên, 2 = nằm phía dưới) */
  host: 0 | 2;
  /** điểm nhập, theo toạ độ lane chuẩn 1000 (co giãn theo độ dài lane) */
  mergeX: number;
}

/** địch dồn hai dòng quân vào lane chủ nên ngân sách quân của trạm có lane thứ 4 giảm nhẹ */
export const EXTRA_LANE_BUDGET_MUL = 0.92;

/** số trạm có lane thứ 4 mỗi bản đồ */
export const EXTRA_LANE_STATIONS = 4;

/** chọn (cố định theo bản đồ) các trạm có lane thứ 4, ưu tiên trạm không có căn cứ phụ để màn hình không quá đông */
export function extraLanePlan(chapter: number, stationsPerMap: number, avoid: (j: number) => boolean, river: (j: number) => number | undefined): Map<number, ExtraLane> {
  const rnd = mulberry32(4421 + chapter * 211);
  const pool = Array.from({ length: stationsPerMap - 2 }, (_, i) => i + 1);
  const free = shuffle(pool.filter((j) => !avoid(j)), rnd);
  const rest = shuffle(pool.filter((j) => avoid(j)), rnd);
  const picked = [...free, ...rest].slice(0, EXTRA_LANE_STATIONS).sort((a, b) => a - b);
  return new Map(picked.map((j): [number, ExtraLane] => {
    // đường nhập không được rơi vào lane sông (quân đất không đi được)
    const rv = river(j);
    const host: 0 | 2 = rv === 0 ? 2 : rv === 2 ? 0 : rnd() < 0.5 ? 0 : 2;
    return [j, { host, mergeX: Math.round(420 + rnd() * 160) }];
  }));
}

// ───────────── hầm (đường hầm ngầm nối hai lane) ─────────────

/**
 * Hầm: hai cửa hầm ở hai lane (có thể cách nhau một lane). Quân ta đi qua cửa A (gần thành ta, `xa`) có thể chui xuống hầm và
 * trồi lên ở cửa B (`xb`, gần thành địch); quân địch đi ngược lại từ cửa B sang cửa A. Quân trong hầm không bị đánh trúng.
 * Toạ độ theo lane chuẩn 1000 (co giãn theo độ dài lane).
 */
export interface Tunnel {
  a: number;
  b: number;
  xa: number;
  xb: number;
}
export const TUNNEL = {
  /** giây quân ở trong hầm */
  sec: 1.6,
  /** xác suất chui xuống hầm khi đi qua cửa hầm (tăng khi lane kia đang cần chi viện) */
  chance: 0.3,
};

/** hầm của trạm: bảng băm cố định theo mã trạm (≈ 30% trạm thường từ trạm thứ 3 trở đi) */
export function tunnelFor(id: number, boss: boolean, river: number | undefined, stationsPerMap: number): Tunnel[] {
  const j = id % stationsPerMap;
  if (boss || j < 2 || j > stationsPerMap - 2) return [];
  const rnd = mulberry32(9157 + id * 977);
  if (rnd() > 0.3) return [];
  const pairs: [number, number][] = [[0, 1], [1, 2], [0, 2]];
  const ok = pairs.filter(([a, b]) => a !== river && b !== river);
  const [a, b] = ok[Math.floor(rnd() * ok.length)];
  const xa = Math.round(300 + rnd() * 90);
  const xb = Math.round(xa + 250 + rnd() * 70);
  return [{ a, b, xa, xb }];
}

/** cầu bổ sung (ngoài bảng cố định): trạm thường ≈ 35% có thêm một cầu, 25% trạm đã có cầu có thêm cầu thứ hai */
export function extraBridgeFor(id: number, boss: boolean, have: { a: number; b: number }[], river: number | undefined, stationsPerMap: number): { a: number; b: number; x: number }[] {
  const j = id % stationsPerMap;
  if (boss || j === 0) return [];
  const rnd = mulberry32(31337 + id * 613);
  const want = have.length ? rnd() < 0.25 : rnd() < 0.35;
  if (!want) return [];
  const pairs: [number, number][] = [[0, 1], [1, 2]];
  const ok = pairs.filter(([a, b]) => a !== river && b !== river && !have.some((h) => h.a === a && h.b === b));
  if (!ok.length) return [];
  const [a, b] = ok[Math.floor(rnd() * ok.length)];
  return [{ a, b, x: Math.round(have.length ? 640 + rnd() * 80 : 420 + rnd() * 160) }];
}
