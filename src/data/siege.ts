import { STATIONS, type Station } from './campaign';

// ───────────── Chế độ THỦ THÀNH: giữ thành trước từng đợt tấn công của địch ─────────────
// Địch không có thành để phá: người chơi chỉ cần sống sót qua mọi đợt. Mất 2/3 thành là thua.
// Giữa hai đợt có vài giây nghỉ để xếp quân; hạ xong một đợt được thưởng vàng trong trận và sửa thành.

/** số đợt tấn công của một lượt chơi */
export const SIEGE_WAVE_COUNT = 12;
/** quân ta đứng chờ ở vạch này (toạ độ lane), chỉ tiến lên khi địch tới gần */
export const SIEGE_HOLD = 540;
/** giây chuẩn bị trước đợt đầu / nghỉ giữa các đợt */
export const SIEGE_PREP_SEC = 16;
export const SIEGE_BREAK_SEC = 12;
/** thưởng xu ngoài trận */
export const siegeWaveReward = (n: number) => 30 + 14 * n;
export const SIEGE_CLEAR_BONUS = 300;
/** mỗi đợt cao hơn kỷ lục cũ được thêm */
export const SIEGE_RECORD_BONUS = 40;

export interface SiegeWave {
  /** đợt thứ mấy (1-based) */
  n: number;
  units: { id: string; n: number }[];
  /** hệ số sức mạnh của quân trong đợt */
  pow: number;
  /** đợt có tướng / quái khổng lồ */
  elite: boolean;
  total: number;
}

const TIERS: string[][] = [
  ['samurai', 'spear', 'archer', 'soihoang', 'lonrung'],
  ['knight', 'shield', 'berserker', 'crossbow', 'mangxa', 'baoden', 'gauden', 'nhendoc'],
  ['elephant', 'bomber', 'taoist', 'poisoner', 'hocnui', 'tegiac', 'holy', 'diatrung', 'soivuong'],
  ['trebuchet', 'philong', 'loithu', 'honglong', 'monk'],
];
/** tướng địch xuất hiện ở các đợt 4, 8, 12 */
const ELITES = ['trieuvan', 'quanvu', 'lubo', 'natra', 'vitieubao', 'tatu', 'kieuphong', 'loicong', 'thaisutu'];

/** bộ ngẫu nhiên có hạt giống: mỗi đợt luôn cùng một thành phần (xem trước đúng với lúc đánh) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWave(n: number): SiegeWave {
  const r = rng(n * 7919 + 13);
  const count = Math.round(5 + 2.2 * n);
  const weights = [Math.max(0.15, 1 - n * 0.1), Math.min(0.5, n * 0.06), Math.max(0, (n - 4) * 0.07), Math.max(0, (n - 8) * 0.08)];
  const sum = weights.reduce((a, c) => a + c, 0);
  const tally = new Map<string, number>();
  const add = (id: string, k = 1) => tally.set(id, (tally.get(id) ?? 0) + k);
  for (let i = 0; i < count; i++) {
    let x = r() * sum;
    let tier = 0;
    for (let k = 0; k < weights.length; k++) {
      x -= weights[k];
      if (x <= 0) {
        tier = k;
        break;
      }
    }
    const pool = TIERS[tier];
    add(pool[Math.floor(r() * pool.length)]);
  }
  const elite = n % 4 === 0;
  if (elite) {
    const generals = n === 12 ? 2 : n === 8 ? 2 : 1;
    for (let i = 0; i < generals; i++) add(ELITES[((n / 4 - 1) * 3 + i) % ELITES.length]);
    if (n === 12) {
      add('culong');
      add('nguoida');
    }
  }
  const units = [...tally.entries()].map(([id, k]) => ({ id, n: k }));
  return { n, units, pow: Math.round((0.95 + 0.085 * (n - 1)) * 100) / 100, elite, total: units.reduce((a, u) => a + u.n, 0) };
}

export const SIEGE_WAVES: SiegeWave[] = Array.from({ length: SIEGE_WAVE_COUNT }, (_, i) => makeWave(i + 1));

/** trạm giả cho chế độ Thủ Thành (3 lane, thành địch không bị phá) */
export const SIEGE_STATION: Station = {
  ...STATIONS[0],
  id: 35,
  chapter: 2,
  name: 'Thủ Thành',
  subtitle: 'Giữ thành trước từng đợt tấn công',
  boss: false,
  bossId: undefined,
  deck: ['samurai', 'knight', 'archer', 'lubo'],
  power: 1,
  income: 0,
  flagHp: 99999,
  units: 0,
  defenses: undefined,
  mod: undefined,
  theme: 'castle',
  weather: 'sunny',
  giantId: undefined,
  outposts: [],
  bridges: [],
  reward: 0,
  fastSec: 0,
  desc: '',
};

/** mã trạm đặc biệt báo cho màn trận biết đây là chế độ Thủ Thành */
export const SIEGE_INDEX = -1;
