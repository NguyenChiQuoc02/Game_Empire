// Căn cứ phụ (outpost) và địa hình trong lane (vũng lầy, suối thần...). Thuần dữ liệu, không phụ thuộc sim/render.

/** độ dài lane chuẩn và độ dài lane ở trạm có căn cứ phụ (lane dài ra, quân nhỏ lại để nhìn trọn bản đồ) */
export const BASE_LANE_LEN = 1000;
export const LONG_LANE_LEN = 2000;
export const LONG_UNIT_SCALE = 0.5;

// ───────────── căn cứ phụ ─────────────

export type OutpostKind = 'gold' | 'rally' | 'deploy' | 'range' | 'drill';
export const OUTPOST_KINDS: OutpostKind[] = ['gold', 'rally', 'deploy', 'range', 'drill'];
export const OUTPOST_ICON: Record<OutpostKind, string> = { gold: '💰', rally: '📯', deploy: '⛺', range: '🏹', drill: '⚔' };

export const OUTPOST = {
  /** vị trí căn cứ theo tỉ lệ độ dài lane (tính từ cờ ta) */
  at: 0.66,
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

/** thời gian 3 sao ở trạm có căn cứ phụ (lane dài gấp đôi) */
export const OUTPOST_TIME_MUL = 1.3;

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

// ───────────── kế hoạch căn cứ phụ cho từng bản đồ ─────────────

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

/**
 * Ngẫu nhiên (cố định theo bản đồ) các trạm có căn cứ phụ: mỗi bản đồ 10 trạm có 3–4 trạm, không tính trạm đầu và trạm Boss.
 * Mỗi lane của trạm có một căn cứ với một loại khác nhau. Trả về: chỉ số trạm trong bản đồ → loại căn cứ theo lane.
 */
export function outpostPlan(chapter: number, stationsPerMap: number, lanes = 3): Map<number, OutpostKind[]> {
  const rnd = mulberry32(7331 + chapter * 101);
  const pool = Array.from({ length: stationsPerMap - 2 }, (_, i) => i + 1);
  const count = 3 + (rnd() < 0.4 ? 1 : 0);
  const picked = shuffle(pool, rnd).slice(0, count).sort((a, b) => a - b);
  return new Map(picked.map((j) => [j, shuffle(OUTPOST_KINDS, rnd).slice(0, lanes)]));
}
