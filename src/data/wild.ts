// Quái hoang dã: ổ quái nằm giữa lane, đánh CẢ HAI phe (phe thứ ba). Thuần dữ liệu, không phụ thuộc sim/render.
// Ổ nhện: nhện mẹ bất động cắn độc và thả nhện con ra đánh; hạ nhện mẹ thì cả đàn tan và người hạ được thưởng vàng.

export type LairId = 'spider' | 'wolf' | 'serpent' | 'boar' | 'centipede';
export const LAIR_IDS: LairId[] = ['spider', 'wolf', 'serpent', 'boar', 'centipede'];

export interface LairDef {
  id: LairId;
  icon: string;
  /** thủ lĩnh (bất động, đứng giữa ổ) */
  mother: string;
  /** đàn con do thủ lĩnh thả ra: mỗi `every` giây thả `n` con khi có địch trong tầm; mỗi 3 đòn cắn thả thêm 1 con; tối đa `max` con cùng lúc */
  brood: { id: string; n: number; every: number; max: number };
  /** màu hiển thị trên bản đồ / bảng thông tin */
  color: number;
}

export const LAIRS: Record<LairId, LairDef> = {
  spider: { id: 'spider', icon: '🕷', mother: 'nhenme', brood: { id: 'nhencon', n: 2, every: 8, max: 8 }, color: 0x9a6adf },
  wolf: { id: 'wolf', icon: '🐺', mother: 'langchua', brood: { id: 'soicon', n: 2, every: 9, max: 6 }, color: 0x8a9ab8 },
  serpent: { id: 'serpent', icon: '🐍', mother: 'xamau', brood: { id: 'xacon', n: 2, every: 8, max: 7 }, color: 0x4ac86a },
  boar: { id: 'boar', icon: '🐗', mother: 'lonme', brood: { id: 'loncon', n: 2, every: 9, max: 6 }, color: 0xb8814a },
  centipede: { id: 'centipede', icon: '🐛', mother: 'ngocongme', brood: { id: 'ngoconcon', n: 2, every: 8, max: 7 }, color: 0xd8602a },
};

/** sức mạnh quái hoang dã so với sức mạnh của trạm; đàn con nhân thêm hệ số riêng trong định nghĩa đơn vị */
export const WILD_POW = 0.95;
/** thủ lĩnh bất động nhưng đuổi địch tới bán kính này quanh ổ; đàn con rời ổ xa tới mức này rồi quay về */
export const WILD_LEASH = { mother: 0, brood: 230 };
/** thưởng vàng thêm cho phe hạ được thủ lĩnh (ngoài tiền thưởng hạ quân) */
export const LAIR_REWARD = 25;

/** một ổ quái trong trạm: lane (0-based), vị trí theo tỉ lệ độ dài lane tính từ cờ ta */
export interface LairPlan {
  kind: LairId;
  lane: number;
  at: number;
}

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

/**
 * ổ quái của trạm (cố định theo mã trạm): khoảng 45% trạm thường từ trạm thứ 3 trở đi có một ổ ở một lane đất,
 * đặt ngay giữa lane (lệch ra nếu vướng căn cứ phụ).
 */
export function lairPlanFor(id: number, boss: boolean, stationsPerMap: number, river: number | undefined, postXs: number[], blocked: { lane: number; x: number }[] = []): LairPlan[] {
  const j = id % stationsPerMap;
  if (boss || j < 2) return [];
  const rnd = mulberry32(5501 + id * 389);
  if (rnd() > 0.45) return [];
  const lanes = [0, 1, 2].filter((l) => l !== river);
  const lane = lanes[Math.floor(rnd() * lanes.length)];
  const kind = LAIR_IDS[Math.floor(rnd() * LAIR_IDS.length)];
  // chọn chỗ gần giữa lane nhất mà cách mọi căn cứ phụ ≥ 9% độ dài lane
  // và mọi cầu / cửa hầm của lane đó
  const here = blocked.filter((b) => b.lane === lane).map((b) => b.x);
  const at = [0.5, 0.34, 0.66, 0.28, 0.72, 0.22].find((k) => [...postXs, ...here].every((p) => Math.abs(p - k) >= 0.09)) ?? 0.5;
  return [{ kind, lane, at }];
}
