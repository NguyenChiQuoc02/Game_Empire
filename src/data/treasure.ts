import { UNITS } from './units';

// ───────────── Chế độ TRUY TÌM KHO BÁU (Treasure War) ─────────────
// 3–4 đội (người chơi ĐỎ + đội máy XANH / LỤC / VÀNG) tranh nhau kho báu. Kho báu do quái vật cực mạnh canh giữ;
// các đội vừa đánh nhau vừa đánh quái trung lập. Thắng bằng cách DIỆT HẾT đối thủ (phá thành) hoặc MANG KHO BÁU VỀ THÀNH.
// 10 bản đồ theo tài liệu thiết kế Treasure_War_10_Map_Design.

export type HuntMapId = 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7' | 'm8' | 'm9' | 'm10';
export type HuntAlliance = 'ffa' | '2v2' | '2v1' | '3v1';
export type HuntWin = 'elimination' | 'treasure';

export interface HuntSetup {
  teams: 3 | 4;
  alliance: HuntAlliance;
  win: HuntWin;
  map: HuntMapId;
  /** độ khó đội máy: 0 dễ · 1 thường · 2 khó */
  difficulty: 0 | 1 | 2;
}

export const DEFAULT_HUNT_SETUP: HuntSetup = { teams: 4, alliance: 'ffa', win: 'treasure', map: 'm1', difficulty: 1 };

/** các kiểu chơi: Đơn (mỗi đội một mình) và Đồng minh (người chơi bắt tay với đội máy) */
export const HUNT_FORMATS: { id: string; alliance: HuntAlliance; teams: 3 | 4 }[] = [
  { id: 'ffa4', alliance: 'ffa', teams: 4 },
  { id: 'ffa3', alliance: 'ffa', teams: 3 },
  { id: '2v2', alliance: '2v2', teams: 4 },
  { id: '2v1', alliance: '2v1', teams: 3 },
  { id: '3v1', alliance: '3v1', teams: 4 },
];

// ── thế giới
export const HUNT_CELL = 30;
export const HUNT_N = 50;
export const HUNT_SIZE = HUNT_CELL * HUNT_N;
export const HUNT_CENTER = HUNT_SIZE / 2;

// ── địa hình
export const TR = { GRASS: 0, ROAD: 1, FOREST: 2, SWAMP: 3, HILL: 4, SAND: 5, WATER: 6, ROCK: 7, LAVA: 8, BRIDGE: 9, PLAZA: 10, ASH: 11, SPRING: 12 } as const;

export interface TerrainInfo {
  name: string;
  /** nhân tốc độ di chuyển */
  speed: number;
  /** ground không đi qua được (bay thì qua) */
  block: boolean;
  /** nhân sát thương tầm xa nhận vào khi đứng trên ô này */
  cover?: number;
  /** nhân tầm đánh của quân đứng trên ô */
  range?: number;
  /** hồi máu mỗi giây theo % máu tối đa */
  heal?: number;
}

export const TERRAIN: Record<number, TerrainInfo> = {
  [TR.GRASS]: { name: 'grass', speed: 1, block: false },
  [TR.ROAD]: { name: 'road', speed: 1.25, block: false },
  [TR.FOREST]: { name: 'forest', speed: 0.8, block: false, cover: 0.75 },
  [TR.SWAMP]: { name: 'swamp', speed: 0.55, block: false },
  [TR.HILL]: { name: 'hill', speed: 0.85, block: false, range: 1.25 },
  [TR.SAND]: { name: 'sand', speed: 0.92, block: false },
  [TR.WATER]: { name: 'water', speed: 0, block: true },
  [TR.ROCK]: { name: 'rock', speed: 0, block: true },
  [TR.LAVA]: { name: 'lava', speed: 0, block: true },
  [TR.BRIDGE]: { name: 'bridge', speed: 1.15, block: false },
  [TR.PLAZA]: { name: 'plaza', speed: 1.1, block: false },
  [TR.ASH]: { name: 'ash', speed: 1, block: false },
  [TR.SPRING]: { name: 'spring', speed: 1, block: false, heal: 0.04 },
};

// ── bản đồ
export interface HuntMapDef {
  id: HuntMapId;
  no: number;
  name: string;
  sub: string;
  /** gợi ý chiến thuật ngắn (tiếng Việt; bản tiếng Anh ở dataEn) */
  tip: string;
  /** chữ thập (bốn hướng) hay bốn góc (hình X) */
  layout: 'cross' | 'corners';
  base: number;
  /** quái vật canh kho báu */
  guardian: string;
  /** nhân máu quái canh so với mặc định */
  guardianMul: number;
  /** vị trí quái canh, theo ô so với tâm */
  guardianAt: [number, number];
  /** vị trí các kho báu, theo ô so với tâm */
  treasures: [number, number][];
  /** kho báu tự mở sau số giây này (bản đồ không có quái canh kho); bỏ trống = mở khi quái canh chết */
  unlockAt?: number;
  /** quái canh đứng yên không chạy theo kẻ địch xa */
  stealth?: boolean;
  breakable?: boolean;
  points?: boolean;
  meteors?: boolean;
  shrink?: boolean;
  /** độ khó tham khảo 1..10 */
  level: number;
  sky: number;
}

export const HUNT_MAPS: HuntMapDef[] = [
  { id: 'm1', no: 1, name: 'Tứ Phương Thần Điện', sub: 'Cân bằng bốn hướng · làm quen', tip: 'Kiểm soát trung tâm, chọn lúc lao vào lấy kho báu hoặc phục kích đội đang mang nó.', layout: 'cross', base: TR.GRASS, guardian: 'culong', guardianMul: 0.8, guardianAt: [0, 0], treasures: [[0, 0]], level: 1, sky: 0x2e5a3a },
  { id: 'm2', no: 2, name: 'Sa Mạc Hình Chữ X', sub: 'Bản đồ mở · lợi thế tầm xa', tip: 'Ít vật cản: đứng xa bắn các đội đang tranh kho báu rồi mới tiến vào.', layout: 'corners', base: TR.SAND, guardian: 'cumang', guardianMul: 0.9, guardianAt: [0, 0], treasures: [[0, 0]], level: 2, sky: 0x6a5430 },
  { id: 'm3', no: 3, name: 'Rừng Mê Cung', sub: 'Sương mù · phục kích', tip: 'Quân trong rừng ẩn hình với địch ở xa. Ninja đi rừng không bị chậm; dùng quân cơ động chặn đường về.', layout: 'corners', base: TR.FOREST, guardian: 'daitrung', guardianMul: 1, guardianAt: [0, 0], treasures: [[0, 0]], stealth: true, level: 3, sky: 0x1f3a24 },
  { id: 'm4', no: 4, name: 'Quần Đảo Kho Báu', sub: 'Đảo · cầu · điểm nghẽn', tip: 'Kiểm soát cầu trước khi lấy kho báu. Cầu bị phá dần bởi đòn lan: phá đường về có thể kẹt cả đội.', layout: 'cross', base: TR.WATER, guardian: 'cumang', guardianMul: 1, guardianAt: [0, 0], treasures: [[0, 0]], breakable: true, level: 4, sky: 0x1f4a6a },
  { id: 'm5', no: 5, name: 'Thung Lũng Tử Thần', sub: 'Núi chắn · chỉ hai cửa vào', tip: 'Chiếm điểm nghẽn rồi dùng cung/nỏ trên đồi cao khống chế đường tiến. Lính giáp dày rất có giá trị.', layout: 'corners', base: TR.GRASS, guardian: 'quysai', guardianMul: 1.05, guardianAt: [0, 0], treasures: [[0, 0]], level: 5, sky: 0x4a4638 },
  { id: 'm6', no: 6, name: 'Thành Cổ Trung Tâm', sub: 'Tường thành · cổng · tháp canh', tip: 'Kho báu nằm trong thành cổ có tháp canh bắn mọi đội. Không cần đánh trước: chờ kẻ khác phá thành rồi phục kích.', layout: 'corners', base: TR.GRASS, guardian: 'nguoida', guardianMul: 1.1, guardianAt: [0, 0], treasures: [[0, 0]], level: 6, sky: 0x4a4a52 },
  { id: 'm7', no: 7, name: 'Núi Lửa Thức Tỉnh', sub: 'Dung nham dâng theo thời gian', tip: 'Đừng kéo dài trận: dung nham lan dần, khóa đường và thu hẹp vùng an toàn. Luôn tính trước đường rút về thành.', layout: 'corners', base: TR.ASH, guardian: 'culong', guardianMul: 1.1, guardianAt: [0, 0], treasures: [[0, 0]], level: 7, sky: 0x3a2024 },
  { id: 'm8', no: 8, name: 'Hang Rồng', sub: 'Rồng trung lập canh kho báu', tip: 'Rồng đánh mọi đội, kho báu nằm sau lưng nó. Có thể đánh trực tiếp hoặc chờ kẻ khác làm yếu rồng rồi cướp.', layout: 'corners', base: TR.ASH, guardian: 'culong', guardianMul: 1.6, guardianAt: [0, 1.4], treasures: [[0, -3.6]], level: 8, sky: 0x2a2030 },
  { id: 'm9', no: 9, name: 'Thành Phố Bị Chia Cắt', sub: 'Đô thị · chiếm điểm kiểm soát', tip: 'Chiếm các điểm kiểm soát quanh khu vực để có thêm vàng và hồi máu trước khi lao thẳng vào kho báu.', layout: 'corners', base: TR.ROAD, guardian: 'quysai', guardianMul: 1.1, guardianAt: [0, 0], treasures: [[0, 0]], points: true, level: 9, sky: 0x44444c },
  { id: 'm10', no: 10, name: 'Đấu Trường Tận Thế', sub: '2 kho báu · Boss thế giới · thiên thạch', tip: 'Không cần lấy cả hai kho báu: dùng một cái để dụ đối thủ vào Boss rồi kết thúc trận. Vùng an toàn sẽ thu hẹp.', layout: 'corners', base: TR.ASH, guardian: 'nguoida', guardianMul: 1.5, guardianAt: [0, 0], treasures: [[-9, 0], [9, 0]], unlockAt: 150, meteors: true, shrink: true, level: 10, sky: 0x2a1418 },
];

export const huntMapDef = (id: HuntMapId) => HUNT_MAPS.find((m) => m.id === id) ?? HUNT_MAPS[0];

export interface HuntBridge {
  x: number;
  y: number;
  /** các ô cầu thuộc nhịp cầu này */
  cells: number[];
}
export interface LavaSource {
  x: number;
  y: number;
  /** giây bắt đầu lan, tốc độ lan (ô/giây) và bán kính ban đầu / tối đa (ô) */
  start: number;
  rate: number;
  r0: number;
  max: number;
}

export interface HuntMap {
  def: HuntMapDef;
  /** HUNT_N x HUNT_N, hàng trước */
  grid: Uint8Array;
  /** 4 vị trí thành theo thứ tự đội (đội 0..3) */
  castles: { x: number; y: number }[];
  camps: { x: number; y: number; tier: 0 | 1 }[];
  bridges: HuntBridge[];
  points: { x: number; y: number }[];
  towers: { x: number; y: number }[];
  lava: LavaSource[];
  treasures: { x: number; y: number }[];
  guardianAt: { x: number; y: number };
}

// ───────────────────────── họa sĩ địa hình ─────────────────────────
// toạ độ LOCAL tính theo ô so với tâm: x sang Đông, y xuống Nam. Hình vẽ được lặp 4 lần quanh tâm (xoay 90°).

type Test = (x: number, y: number) => boolean;
const circle = (cx: number, cy: number, r: number): Test => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const ringT = (r0: number, r1: number): Test => (x, y) => {
  const r = Math.hypot(x, y);
  return r >= r0 && r <= r1;
};
/** dải góc (độ): 0 = hướng Nam, +90 = Đông, −90 = Tây */
const angleT = (a0: number, a1: number): Test => (x, y) => {
  const a = (Math.atan2(x, y) * 180) / Math.PI;
  return a >= a0 && a <= a1;
};
const rectT = (x0: number, y0: number, x1: number, y1: number): Test => (x, y) => x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && y >= Math.min(y0, y1) && y <= Math.max(y0, y1);
const squareRing = (half: number, thick: number): Test => (x, y) => Math.max(Math.abs(x), Math.abs(y)) <= half && Math.max(Math.abs(x), Math.abs(y)) > half - thick;
const lineT = (x0: number, y0: number, x1: number, y1: number, w: number): Test => (x, y) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
  return Math.hypot(x - (x0 + dx * k), y - (y0 + dy * k)) <= w / 2;
};
const or = (...f: Test[]): Test => (x, y) => f.some((t) => t(x, y));
const and = (...f: Test[]): Test => (x, y) => f.every((t) => t(x, y));
const not = (f: Test): Test => (x, y) => !f(x, y);
/** góc quay quanh tâm theo bước 90° */
const rotate = (x: number, y: number, k: number): [number, number] => {
  let rx = x;
  let ry = y;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [rx, ry] = [-ry, rx];
  return [rx, ry];
};

class Painter {
  readonly grid: Uint8Array;
  readonly half = (HUNT_N - 1) / 2;
  constructor(base: number) {
    this.grid = new Uint8Array(HUNT_N * HUNT_N).fill(base);
  }
  get(cx: number, cy: number) {
    return this.grid[cy * HUNT_N + cx];
  }
  set(cx: number, cy: number, t: number) {
    if (cx >= 0 && cy >= 0 && cx < HUNT_N && cy < HUNT_N) this.grid[cy * HUNT_N + cx] = t;
  }
  /** vẽ có lặp 4 lần quanh tâm */
  paint(t: number, test: Test, only?: number[]) {
    for (let cy = 0; cy < HUNT_N; cy++) {
      for (let cx = 0; cx < HUNT_N; cx++) {
        for (let k = 0; k < 4; k++) {
          const [lx, ly] = rotate(cx - this.half, cy - this.half, 4 - k);
          if (test(lx, ly)) {
            if (!only || only.includes(this.get(cx, cy))) this.set(cx, cy, t);
            break;
          }
        }
      }
    }
  }
  /** vẽ một lần, toạ độ tuyệt đối so với tâm */
  abs(t: number, test: Test, only?: number[]) {
    for (let cy = 0; cy < HUNT_N; cy++) {
      for (let cx = 0; cx < HUNT_N; cx++) {
        if (test(cx - this.half, cy - this.half) && (!only || only.includes(this.get(cx, cy)))) this.set(cx, cy, t);
      }
    }
  }
  /** đường: ô nước thành cầu, ô khác thành đường; trả về các ô cầu */
  road(test: Test, k4: boolean, keep: number[] = [TR.PLAZA, TR.ROCK]): number[] {
    const bridge: number[] = [];
    const visit = (cx: number, cy: number) => {
      const cur = this.get(cx, cy);
      if (keep.includes(cur)) return;
      if (cur === TR.WATER || cur === TR.LAVA) {
        this.set(cx, cy, TR.BRIDGE);
        bridge.push(cy * HUNT_N + cx);
      } else this.set(cx, cy, TR.ROAD);
    };
    for (let cy = 0; cy < HUNT_N; cy++) {
      for (let cx = 0; cx < HUNT_N; cx++) {
        if (k4) {
          for (let k = 0; k < 4; k++) {
            const [lx, ly] = rotate(cx - this.half, cy - this.half, 4 - k);
            if (test(lx, ly)) {
              visit(cx, cy);
              break;
            }
          }
        } else if (test(cx - this.half, cy - this.half)) visit(cx, cy);
      }
    }
    return bridge;
  }
}

const CASTLE_CELLS = {
  cross: [[-19, 0], [0, -19], [0, 19], [19, 0]] as [number, number][],
  corners: [[-17, -17], [17, -17], [-17, 17], [17, 17]] as [number, number][],
};

const toWorld = (lx: number, ly: number) => ({ x: HUNT_CENTER + lx * HUNT_CELL, y: HUNT_CENTER + ly * HUNT_CELL });

function buildGrid(def: HuntMapDef): { grid: Uint8Array; bridges: HuntBridge[]; points: { x: number; y: number }[]; towers: { x: number; y: number }[]; lava: LavaSource[]; campLocal?: [number, number, 0 | 1][] } {
  const P = new Painter(def.base);
  const bridges: HuntBridge[] = [];
  const points: { x: number; y: number }[] = [];
  const towers: { x: number; y: number }[] = [];
  const lava: LavaSource[] = [];
  let campLocal: [number, number, 0 | 1][] | undefined;
  const plaza = (r = 3.8) => P.paint(TR.PLAZA, circle(0, 0, r));
  const addAll = (list: [number, number][], into: { x: number; y: number }[]) => {
    for (const [lx, ly] of list) for (let k = 0; k < 4; k++) into.push(toWorld(...rotate(lx, ly, k)));
  };

  switch (def.id) {
    case 'm1': {
      P.paint(TR.FOREST, circle(8, 9, 4.6));
      P.paint(TR.FOREST, circle(13, 5.5, 3.2));
      P.paint(TR.FOREST, circle(5.5, 13, 3.2));
      P.paint(TR.FOREST, circle(5.2, 5.4, 2.5));
      P.paint(TR.HILL, circle(15, 15, 3.6));
      P.paint(TR.SPRING, circle(15, 15, 1.2));
      P.paint(TR.SWAMP, circle(20.5, 6, 2.8));
      P.paint(TR.SWAMP, circle(6, 20.5, 2.8));
      P.paint(TR.ROCK, circle(10.5, 3.6, 1.5));
      P.paint(TR.ROCK, circle(3.6, 10.5, 1.5));
      P.paint(TR.WATER, and(ringT(9.4, 11.3), angleT(24, 66)));
      plaza();
      P.road(lineT(0, 0, 0, 22, 2), true);
      P.road(ringT(14, 15.2), false);
      break;
    }
    case 'm2': {
      P.paint(TR.HILL, circle(10, 1.5, 3.2));
      P.paint(TR.ROCK, circle(7, 6, 1.2));
      P.paint(TR.ROCK, circle(13.5, 7.5, 1.4));
      P.paint(TR.FOREST, circle(0, 17.5, 4.4));
      P.paint(TR.WATER, circle(0, 17.5, 2.3));
      P.paint(TR.SPRING, circle(3.4, 15.5, 1.1));
      P.paint(TR.SWAMP, circle(5, 11, 2));
      plaza();
      P.road(lineT(0, 0, 17, 17, 2.2), true);
      break;
    }
    case 'm3': {
      P.paint(TR.GRASS, circle(12, 12, 1.8));
      P.paint(TR.GRASS, circle(0, 14, 1.9));
      P.paint(TR.GRASS, circle(8.5, 5, 1.5));
      // ba vòng rào đá so le: đường vào trung tâm phải đi vòng qua các khe hở
      P.abs(TR.ROCK, and(ringT(6, 7.2), not(or(angleT(-14, 14), angleT(76, 104), angleT(166, 180), angleT(-180, -166), angleT(-104, -76)))));
      P.abs(TR.ROCK, and(ringT(11, 12.2), not(or(angleT(36, 54), angleT(126, 144), angleT(-54, -36), angleT(-144, -126)))));
      P.abs(TR.ROCK, and(ringT(16, 17.2), not(or(angleT(-7, 7), angleT(83, 97), angleT(173, 180), angleT(-180, -173), angleT(-97, -83)))));
      plaza();
      break;
    }
    case 'm4': {
      P.paint(TR.GRASS, circle(0, 19, 5.8));
      P.paint(TR.GRASS, circle(0, 0, 7.4));
      P.paint(TR.FOREST, circle(11, 11, 4.4));
      P.paint(TR.HILL, circle(4, 4.6, 1.8));
      plaza();
      const segs: [number, number, number, number][] = [[0, 19, 0, 0], [0, 19, 11, 11], [19, 0, 11, 11], [11, 11, 0, 0]];
      for (const s of segs) {
        for (let k = 0; k < 4; k++) {
          const [ax, ay] = rotate(s[0], s[1], k);
          const [bx, by] = rotate(s[2], s[3], k);
          const cells = P.road(lineT(ax, ay, bx, by, 2.2), false, [TR.PLAZA, TR.ROCK]);
          if (cells.length) {
            const cx = cells.reduce((a, c) => a + (c % HUNT_N), 0) / cells.length;
            const cy = cells.reduce((a, c) => a + Math.floor(c / HUNT_N), 0) / cells.length;
            bridges.push({ x: (cx + 0.5) * HUNT_CELL, y: (cy + 0.5) * HUNT_CELL, cells });
          }
        }
      }
      campLocal = [[11, 11, 0]];
      break;
    }
    case 'm5': {
      P.abs(TR.ROCK, ringT(7, 10.8));
      // hai cửa vào ở phía Tây và phía Đông
      P.abs(TR.ROAD, and(ringT(6.5, 11.4), or(angleT(68, 112), angleT(-112, -68)), rectT(-12, -1.7, 12, 1.7)));
      P.paint(TR.HILL, circle(4.2, 3.2, 1.6));
      P.abs(TR.HILL, or(circle(13.5, 3.6, 2.2), circle(13.5, -3.6, 2.2), circle(-13.5, 3.6, 2.2), circle(-13.5, -3.6, 2.2)));
      P.abs(TR.ROCK, or(circle(14.5, 8, 1.6), circle(-14.5, 8, 1.6), circle(14.5, -8, 1.6), circle(-14.5, -8, 1.6)));
      P.paint(TR.FOREST, circle(0, 15, 3));
      plaza();
      P.abs(TR.ROAD, rectT(-12, -1.2, 12, 1.2), [TR.GRASS, TR.HILL]);
      for (const [sx, sy] of [[-17, -17], [-17, 17], [17, -17], [17, 17]]) P.road(lineT(sx, sy, sx > 0 ? 12.5 : -12.5, 0, 2), false);
      campLocal = [[0, 14.5, 0], [0, 21.5, 1]];
      break;
    }
    case 'm6': {
      P.abs(TR.PLAZA, rectT(-9.2, -9.2, 9.2, 9.2));
      P.abs(TR.ROCK, squareRing(10.6, 1.4));
      P.abs(TR.ROAD, or(rectT(-1.7, -12, 1.7, 12), rectT(-12, -1.7, 12, 1.7)), [TR.ROCK, TR.GRASS]);
      P.abs(TR.ROCK, squareRing(4.8, 1.1));
      P.abs(TR.PLAZA, or(rectT(-1.1, -6, 1.1, 6), rectT(-6, -1.1, 6, 1.1)), [TR.ROCK]);
      P.paint(TR.FOREST, circle(14.5, 5, 2.6));
      P.paint(TR.HILL, circle(13, 13, 2.4));
      P.road(lineT(17, 17, 0, 13, 2), true);
      P.road(lineT(17, 17, 13, 0, 2), true);
      for (const sgn of [-1, 1]) addAll([[sgn * 4, 9.2]], towers);
      break;
    }
    case 'm7': {
      P.paint(TR.LAVA, circle(0, 13, 3.9));
      P.paint(TR.ROCK, circle(0, 13, 2.2));
      P.paint(TR.HILL, circle(8.5, 8.5, 2.8));
      P.paint(TR.ROCK, circle(5.5, 5.5, 1.1));
      P.paint(TR.SWAMP, circle(11, 4, 2.4));
      P.paint(TR.SPRING, circle(8.5, 8.5, 1.1));
      plaza();
      P.road(lineT(0, 0, 17, 17, 2.2), true);
      for (let k = 0; k < 4; k++) {
        const [lx, ly] = rotate(0, 13, k);
        const w = toWorld(lx, ly);
        lava.push({ x: w.x, y: w.y, start: 100, rate: 0.0135, r0: 3.9, max: 8.6 });
      }
      campLocal = [[0, 7.2, 0], [0, 21, 1]];
      break;
    }
    case 'm8': {
      P.abs(TR.ASH, ringT(0, 8.4));
      P.abs(TR.ROCK, ringT(8.5, 11.8));
      P.abs(TR.ASH, and(ringT(8.2, 12.2), or(angleT(33, 57), angleT(123, 147), angleT(-57, -33), angleT(-147, -123))));
      // ngách đá phía Bắc giữ kho báu, mở ra phía Nam nơi rồng nằm
      P.abs(TR.ROCK, and(circle(0, -3.6, 3.1), not(circle(0, -3.6, 1.9))));
      P.abs(TR.ASH, rectT(-1, -2.6, 1, -0.2));
      P.abs(TR.PLAZA, circle(0, -3.6, 1.6));
      P.paint(TR.ROCK, circle(14.5, 2.2, 1.6));
      P.paint(TR.FOREST, circle(0, 15, 3));
      P.road(lineT(17, 17, 9.4, 9.4, 2.4), true);
      campLocal = [[0, 14, 0], [0, 21, 1]];
      break;
    }
    case 'm9': {
      const street = (d: number) => {
        const a = Math.abs(d) % 8;
        return a >= 2.5 && a < 5.5;
      };
      P.abs(TR.ROCK, (x, y) => !street(x) && !street(y));
      P.abs(TR.ROAD, (x, y) => street(x) || street(y));
      P.abs(TR.PLAZA, circle(0, 0, 5.2));
      for (const [lx, ly] of [[0, 2.2], [2.2, 0]] as [number, number][]) P.paint(TR.PLAZA, circle(lx, ly, 2));
      addAll([[12, 4], [12, 12]], points);
      campLocal = [[4, 12, 0], [20, 4, 1]];
      break;
    }
    case 'm10': {
      for (const sgn of [-1, 1]) {
        P.abs(TR.LAVA, (x, y) => Math.hypot(x, y - 11 * sgn) <= 4.2);
        P.abs(TR.ROCK, circle(0, 11 * sgn, 2.3));
      }
      P.paint(TR.ROCK, circle(8.5, 8.5, 1.2));
      P.paint(TR.HILL, circle(5, 14.5, 2.6));
      plaza(4);
      P.paint(TR.SPRING, circle(0, 0, 1.6));
      P.abs(TR.PLAZA, or(circle(-9, 0, 2.6), circle(9, 0, 2.6)));
      P.abs(TR.ROAD, or(rectT(-8, -1, 8, 1)), [TR.GRASS, TR.ASH, TR.HILL]);
      P.road(lineT(17, 17, 9, 0, 2.2), false);
      P.road(lineT(-17, 17, -9, 0, 2.2), false);
      P.road(lineT(17, -17, 9, 0, 2.2), false);
      P.road(lineT(-17, -17, -9, 0, 2.2), false);
      for (const sgn of [-1, 1]) {
        const w = toWorld(0, sgn * 11);
        lava.push({ x: w.x, y: w.y, start: 150, rate: 0.016, r0: 4.2, max: 7.4 });
      }
      campLocal = [[0, 20, 1], [7.5, 5.5, 0]];
      break;
    }
  }

  // sân thành: đường lát quanh mỗi vị trí thành
  for (const [lx, ly] of CASTLE_CELLS[def.layout]) {
    P.abs(TR.ROAD, circle(lx, ly, 3.2));
  }
  return { grid: P.grid, bridges, points, towers, lava, campLocal };
}

const mapCache = new Map<HuntMapId, HuntMap>();

export function buildHuntMap(id: HuntMapId): HuntMap {
  const cached = mapCache.get(id);
  if (cached) return cached;
  const def = huntMapDef(id);
  const built = buildGrid(def);
  const free = (x: number, y: number) => !TERRAIN[built.grid[Math.max(0, Math.min(HUNT_N - 1, Math.floor(y / HUNT_CELL))) * HUNT_N + Math.max(0, Math.min(HUNT_N - 1, Math.floor(x / HUNT_CELL)))]].block;
  const nudge = (x: number, y: number) => {
    if (free(x, y)) return { x, y };
    for (let r = 20; r <= 160; r += 20) {
      for (let a = 0; a < 6.28; a += 0.5) {
        const nx = x + Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;
        if (free(nx, ny)) return { x: nx, y: ny };
      }
    }
    return { x, y };
  };
  const camps: HuntMap['camps'] = [];
  const local: [number, number, 0 | 1][] = built.campLocal ?? (def.layout === 'cross' ? [[10.5, 10.5, 0], [18.5, 18.5, 1]] : [[0, 10.5, 0], [0, 20.5, 1]]);
  for (const [lx, ly, tier] of local) {
    for (let k = 0; k < 4; k++) {
      const w = toWorld(...rotate(lx, ly, k));
      camps.push({ ...nudge(w.x, w.y), tier });
    }
  }
  const map: HuntMap = {
    def,
    grid: built.grid,
    castles: CASTLE_CELLS[def.layout].map(([lx, ly]) => toWorld(lx, ly)),
    camps,
    bridges: built.bridges,
    points: built.points.map((p) => nudge(p.x, p.y)),
    towers: built.towers.map((p) => nudge(p.x, p.y)),
    lava: built.lava,
    treasures: def.treasures.map(([lx, ly]) => toWorld(lx, ly)),
    guardianAt: toWorld(...def.guardianAt),
  };
  mapCache.set(id, map);
  return map;
}

export const terrainAt = (grid: Uint8Array, x: number, y: number): number => {
  const cx = Math.max(0, Math.min(HUNT_N - 1, Math.floor(x / HUNT_CELL)));
  const cy = Math.max(0, Math.min(HUNT_N - 1, Math.floor(y / HUNT_CELL)));
  return grid[cy * HUNT_N + cx];
};

// ── đội: đội 0 là người chơi (ĐỎ); đội máy XANH / LỤC / VÀNG
export interface HuntTeamStyle {
  name: string;
  color: number;
  css: string;
}

export const HUNT_TEAM_STYLE: HuntTeamStyle[] = [
  { name: 'Đỏ', color: 0xe24b4b, css: '#e24b4b' },
  { name: 'Xanh', color: 0x3d8bff, css: '#3d8bff' },
  { name: 'Lục', color: 0x4fd06a, css: '#4fd06a' },
  { name: 'Vàng', color: 0xf2c744, css: '#f2c744' },
];

/** vị trí thành của từng đội: bố cục chữ thập (Tây · Bắc · Nam · Đông) hoặc bốn góc (Tây Bắc · Đông Bắc · Tây Nam · Đông Nam) */
export function teamSlots(teams: 3 | 4): number[] {
  return teams === 4 ? [0, 1, 2, 3] : [0, 1, 2];
}

/** nhóm liên minh của từng đội (cùng số = đồng minh) */
export function alliances(teams: 3 | 4, kind: HuntAlliance): number[] {
  if (kind === 'ffa') return Array.from({ length: teams }, (_, i) => i);
  if (kind === '2v2') return [0, 1, 1, 0]; // người chơi + đội Vàng vs đội Xanh + đội Lục
  if (kind === '2v1') return [0, 1, 0]; // người chơi + đội Lục vs đội Xanh
  return [0, 1, 0, 0]; // 3v1: người chơi + Lục + Vàng vs Xanh (mạnh hơn)
}

// ── phe phái đội máy
export interface HuntFaction {
  id: string;
  name: string;
  troops: string[];
  generals: string[];
  /** quái thú dùng như lính */
  beasts?: string[];
  defenses: string[];
}

export const HUNT_FACTIONS: HuntFaction[] = [
  { id: 'han', name: 'Hán Quân', troops: ['spear', 'shield', 'knight', 'archer', 'crossbow', 'samurai', 'trebuchet'], generals: ['quanvu', 'trieuvan', 'lubo', 'truongphi'], defenses: ['archertower', 'ballista'] },
  { id: 'giang', name: 'Giang Hồ Bang', troops: ['ninja', 'monk', 'taoist', 'berserker', 'poisoner', 'crossbow', 'healer'], generals: ['kieuphong', 'lenhhoxung', 'truongvoky', 'auduongphong', 'quachtinh'], defenses: ['spikewall', 'altar'] },
  { id: 'thien', name: 'Thiên Binh', troops: ['samurai', 'archer', 'shield', 'healer', 'bomber', 'elephant', 'taoist'], generals: ['natra', 'tonngokhong', 'duongtien', 'quanam', 'loicong'], defenses: ['frosttotem', 'archertower'] },
  { id: 'yao', name: 'Yêu Tộc', troops: ['berserker', 'ninja', 'bomber'], beasts: ['soihoang', 'lonrung', 'gauden', 'hocnui', 'baoden', 'tegiac', 'holy', 'soivuong', 'nhendoc', 'diatrung', 'mangxa'], generals: ['taothao', 'vitieubao', 'tatu', 'thaisutu'], defenses: ['spiketrap', 'firepit'] },
];

// ── quái trung lập
export const HUNT_CAMP_MOBS: [string[], string[]] = [
  ['soihoang', 'lonrung', 'baoden', 'mangxa'],
  ['gauden', 'tegiac', 'hocnui', 'nhendoc'],
];
export const HUNT_CAMP_BOUNTY: [number, number] = [18, 40];
export const HUNT_CAMP_RESPAWN = 75;
export const HUNT_GUARDIAN_HP = 16;
export const HUNT_GUARDIAN_DMG = 1.4;

// ── kinh tế và giới hạn
export const HUNT_START_GOLD = 60;
export const HUNT_INCOME = 3.2;
export const HUNT_GOLD_CAP = 160;
export const HUNT_UNIT_CAP = 34;
export const HUNT_DEFENSE_CAP = 5;
export const HUNT_CASTLE_HP = 3200;
/** bán kính quanh thành để đặt công trình phòng thủ */
export const HUNT_DEFENSE_ZONE = 170;
/** số quân thường cần để khiêng kho báu (tướng chỉ cần 1) */
export const HUNT_CARRY_TROOPS = 3;
export const HUNT_CARRY_SLOW = 0.5;
/** sau mốc này (giây) bão táp bào mòn mọi thành (tới còn 12% máu) và sau thêm HUNT_STORM_END giây ván kết thúc: nhóm còn nhiều máu thành nhất thắng */
export const HUNT_STORM_AT = 600;
export const HUNT_STORM_END = 150;
/** điểm kiểm soát (bản đồ đô thị): bán kính chiếm, vàng/giây cho chủ, hồi máu quanh điểm */
export const HUNT_POINT_R = 90;
export const HUNT_POINT_GOLD = 1.1;
/** vùng an toàn thu hẹp (Đấu Trường Tận Thế): bán kính đầu/cuối, thời điểm bắt đầu và thời gian thu */
export const HUNT_ZONE = { from: 1100, to: 330, start: 300, dur: 330, dps: 0.035 };
/** thiên thạch: giây bắt đầu, khoảng cách giữa hai quả (đầu → cuối), thời gian báo trước, sát thương, bán kính */
export const HUNT_METEOR = { start: 90, every: [6.5, 3], warn: 2, dmg: 130, r: 78 };

/** thưởng xu */
export const huntReward = (win: boolean, o: { treasure: boolean; kills: number; difficulty: number; teams: number; alliance: HuntAlliance; level: number }) => {
  const base = win ? 260 : 50;
  const diff = [0.8, 1, 1.4][o.difficulty] ?? 1;
  const teamBonus = o.teams === 4 ? 1.2 : 1;
  const ally = o.alliance === '3v1' ? 0.7 : o.alliance === '2v1' ? 0.85 : 1;
  const extra = (o.treasure ? 120 : 0) + Math.min(250, o.kills * 3);
  const mapBonus = 1 + (o.level - 1) * 0.06;
  return Math.round(((base + extra) * diff * teamBonus * ally * mapBonus) / 5) * 5;
};

export const huntGuardianDef = (map: HuntMapDef) => UNITS[map.guardian];
