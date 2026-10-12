import { mulberry32 } from './lane';
import type { Station, StationMod, StationTheme } from './campaign';
import type { WeatherId } from './terrain';

// ───────────── Chế độ KHÁM PHÁ ─────────────
// Mỗi bản đồ là một đồ thị các trạm: bắt đầu từ Thành chính, đánh chiếm các trạm kề (mỗi trạm là một trận như chiến dịch,
// có luật riêng của bản đồ), mở rộng lãnh thổ tới trạm cuối (Boss). Trạm chiếm được cho thưởng/ưu đãi cho các trận sau trong bản đồ.

export type Diff = 1 | 2 | 3 | 4;
export type NodeType = 'city' | 'fortress' | 'mine' | 'camp' | 'tower' | 'special' | 'boss';
/** trạm đặc biệt: mỗi loại có công dụng riêng (xem perksOf / mở đường) */
export type SpecialKind = 'village' | 'bridge' | 'warm' | 'oasis' | 'port' | 'core' | 'mana' | 'ruin' | 'dry' | 'portal';
export type Layout = 'open' | 'sparse' | 'split' | 'islands' | 'sky' | 'twin' | 'cut';

export interface ExploreMapDef {
  /** 1..13 */
  n: number;
  diff: Diff;
  /** khoảng số trạm theo mô tả và số trạm thực tế của bản đồ */
  range: [number, number];
  nodes: number;
  theme: StationTheme;
  /** thời tiết chọn ngẫu nhiên (cố định theo trạm) trong danh sách này */
  weathers: WeatherId[];
  layout: Layout;
  icon: string;
  /** trạm đặc biệt đặt thêm (ngoài cầu/cổng/cảng/lõi do bố cục tự tạo) */
  specials: SpecialKind[];
  /** tỉ lệ pháo đài / mỏ */
  fort: number;
  mine: number;
  /** trận ở bản đồ này đánh trên lane sông (thủy chiến) */
  river?: boolean;
  /** quân/giáp đặc biệt cho mọi trận */
  mod?: StationMod;
  /** Boss cuối (id đơn vị) và Boss giữa bản đồ (nếu có) */
  boss: string;
  midBoss?: string;
  /** mỏ nâng cấp vũ khí: mỗi mỏ giữ được +sát thương cho cả quân */
  mineWeapon?: boolean;
  /** luật cố định của bản đồ */
  rules: ExploreRules;
  pool: { troops: string[]; beasts: string[]; generals: string[]; defenses: string[]; river?: string[] };
}

/** hiệu ứng áp vào một trận (luật bản đồ + ưu đãi từ các trạm đã chiếm) */
export interface ExploreRules {
  /** tốc độ di chuyển của CẢ HAI phe (địa hình khó đi) */
  speedMul?: number;
  /** tốc độ di chuyển của quân ta */
  allySpeedMul?: number;
  /** giá triển khai quân của ta (thiếu nước...) */
  costMul?: number;
  startGold?: number;
  incomeMul?: number;
  enemyIncomeMul?: number;
  flagHpMul?: number;
  dmgMul?: number;
  hpMul?: number;
  defHpMul?: number;
  /** hồi máu cờ nhà mỗi giây theo tỉ lệ máu tối đa */
  flagRegen?: number;
  /** thiên tai định kỳ nhắm vào quân ta (núi lửa phun, khí độc) */
  hazard?: { kind: 'fire' | 'poison'; every: number };
  /** phục kích: địch bất ngờ xuất hiện giữa lane */
  ambush?: { at: number; n: number };
}

const P = (troops: string[], beasts: string[], generals: string[], defenses: string[], river?: string[]) => ({ troops, beasts, generals, defenses, river });

export const EXPLORE_MAPS: ExploreMapDef[] = [
  {
    n: 1, diff: 1, range: [12, 15], nodes: 14, theme: 'plains', weathers: ['sunny', 'sunny', 'rain'], layout: 'open', icon: '🌾',
    specials: ['village', 'village'], fort: 0.12, mine: 0.2, boss: 'dongtrac',
    rules: { incomeMul: 1.25, startGold: 10, allySpeedMul: 1.1 },
    pool: P(['samurai', 'spear', 'archer', 'shield', 'knight', 'healer', 'crossbow', 'berserker'], ['soihoang', 'lonrung', 'gauden'], ['trieuvan', 'quanvu', 'truongphi'], ['spiketrap', 'wall']),
  },
  {
    n: 2, diff: 3, range: [15, 18], nodes: 17, theme: 'snow', weathers: ['sunny', 'fog', 'rain'], layout: 'open', icon: '❄️',
    specials: ['warm', 'warm'], fort: 0.16, mine: 0.12, boss: 'cuumatri',
    rules: { speedMul: 0.85 },
    pool: P(['spear', 'shield', 'archer', 'hanbang', 'monk', 'crossbow', 'healer', 'taoist', 'kimcang', 'daodaobinh'], ['soihoang', 'gauden', 'tegiac', 'soivuong', 'bangphuong'], ['duongqua', 'tieulongnu', 'laoquan', 'chudu', 'kieuphong'], ['wall', 'frosttotem', 'archertower', 'ballista']),
  },
  {
    n: 3, diff: 4, range: [18, 20], nodes: 19, theme: 'volcano', weathers: ['fireRain', 'thunder', 'sunny'], layout: 'cut', icon: '🌋',
    specials: [], fort: 0.14, mine: 0.2, boss: 'nguumavuong', mineWeapon: true,
    rules: { hazard: { kind: 'fire', every: 14 } },
    pool: P(['berserker', 'bomber', 'hoathuong', 'liethoa', 'knight', 'elephant', 'monk', 'thanluc', 'kimcang', 'trebuchet'], ['honglong', 'hocnui', 'baoden', 'macau', 'hoaphuong', 'tegiac'], ['lubo', 'taothao', 'thietphien', 'kimsidieu', 'hoangcai'], ['firepit', 'wall', 'catapult', 'drum']),
  },
  {
    n: 4, diff: 2, range: [16, 20], nodes: 18, theme: 'bamboo', weathers: ['fog', 'rain', 'sunny'], layout: 'open', icon: '🌲',
    specials: ['ruin', 'ruin'], fort: 0.12, mine: 0.12, boss: 'hoangmi',
    rules: { defHpMul: 1.3, ambush: { at: 30, n: 3 } },
    pool: P(['archer', 'ninja', 'spear', 'berserker', 'crossbow', 'monk', 'anhsat', 'phikiem', 'lienchau', 'toanphong'], ['soihoang', 'lonrung', 'gauden', 'hocnui', 'mangxa', 'baoden', 'nhendoc', 'holy', 'moctinh'], ['lenhhoxung', 'hoangdung', 'hauchu', 'hoangtrung', 'trubatgioi'], ['spiketrap', 'archertower', 'spikewall']),
  },
  {
    n: 5, diff: 3, range: [14, 18], nodes: 16, theme: 'desert', weathers: ['sunny', 'sunny', 'thunder'], layout: 'open', icon: '🏜️',
    specials: ['oasis', 'oasis'], fort: 0.14, mine: 0.16, boss: 'thanhcat',
    rules: { costMul: 1.25 },
    pool: P(['knight', 'spear', 'archer', 'elephant', 'crossbow', 'poisoner', 'berserker', 'trebuchet', 'phiky', 'healer'], ['mangxa', 'tegiac', 'diatrung', 'nhendoc', 'sudavuong', 'ngocong'], ['masieu', 'auduongphong', 'hongthatcong', 'lubo', 'dienvi', 'quachtinh'], ['wall', 'catapult', 'archertower']),
  },
  {
    n: 6, diff: 4, range: [17, 22], nodes: 20, theme: 'stone', weathers: ['fog', 'sunny', 'thunder'], layout: 'sparse', icon: '⛰️',
    specials: [], fort: 0.3, mine: 0.1, boss: 'dongphuongbatbai',
    rules: {},
    pool: P(['shield', 'spear', 'crossbow', 'monk', 'kimcang', 'thanluc', 'daodaobinh', 'healer', 'taoist', 'elephant'], ['hocnui', 'tegiac', 'gauden', 'soivuong', 'hacphong'], ['quanvu', 'kieuphong', 'hahaudon', 'truonglieu', 'lubo'], ['wall', 'spikewall', 'archertower', 'ballista', 'catapult']),
  },
  {
    n: 7, diff: 2, range: [16, 20], nodes: 18, theme: 'sea', weathers: ['sunny', 'rain', 'fog'], layout: 'islands', icon: '🏝️',
    specials: [], fort: 0.12, mine: 0.14, boss: 'tonquyen', river: true,
    rules: {},
    pool: P(['samurai', 'archer', 'crossbow', 'shield', 'taoist', 'healer', 'hoathuong', 'liethoa', 'lienchau'], ['cacau', 'camap', 'ruathan', 'giaolong'], ['camninh', 'chudu', 'hoangcai', 'bangthong', 'satang'], ['frosttotem', 'ballista'], ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen']),
  },
  {
    n: 8, diff: 4, range: [20, 25], nodes: 23, theme: 'snow', weathers: ['fog', 'fireRain', 'thunder'], layout: 'twin', icon: '☯️',
    specials: ['warm'], fort: 0.14, mine: 0.12, boss: 'diemla',
    rules: {},
    pool: P(['hanbang', 'hoathuong', 'liethoa', 'monk', 'kimcang', 'mehon', 'taoist', 'thanluc', 'phuonghoangtu'], ['bangphuong', 'hoaphuong', 'honglong', 'tegiac', 'hocnui'], ['laoquan', 'thietphien', 'duongtien', 'natra', 'loicong'], ['frosttotem', 'firepit', 'wall', 'ballista']),
  },
  {
    n: 9, diff: 3, range: [15, 20], nodes: 18, theme: 'heaven', weathers: ['sunny', 'thunder', 'fog'], layout: 'sky', icon: '☁️',
    specials: [], fort: 0.12, mine: 0.14, boss: 'ngochoang',
    rules: {},
    pool: P(['taoist', 'hanbang', 'monk', 'crossbow', 'healer', 'chieuhon', 'phuonghoangtu', 'thanhac', 'mehon'], ['phiung', 'bangphuong', 'hoaphuong', 'khongtuoc', 'philong'], ['natra', 'duongtien', 'loicong', 'quanam', 'laoquan'], ['archertower', 'altar', 'drum']),
  },
  {
    n: 10, diff: 2, range: [12, 18], nodes: 15, theme: 'night', weathers: ['fog', 'rain', 'rain'], layout: 'open', icon: '🐸',
    specials: ['dry', 'dry'], fort: 0.1, mine: 0.12, boss: 'caocau',
    rules: { speedMul: 0.85, ambush: { at: 40, n: 2 }, hazard: { kind: 'poison', every: 18 } },
    pool: P(['spear', 'poisoner', 'archer', 'ninja', 'healer', 'mehon', 'anhsat', 'chieuhon', 'kimcang'], ['mangxa', 'nhendoc', 'cacau', 'ngocong', 'thanhxa', 'bachcot', 'moctinh'], ['auduongphong', 'tatu', 'tieulongnu', 'diatang'], ['spiketrap', 'firepit']),
  },
  {
    n: 11, diff: 3, range: [18, 22], nodes: 20, theme: 'plains', weathers: ['sunny', 'rain', 'fog'], layout: 'split', icon: '🌊',
    specials: [], fort: 0.14, mine: 0.14, boss: 'chunghoi',
    rules: {},
    pool: P(['samurai', 'spear', 'shield', 'archer', 'crossbow', 'knight', 'healer', 'hoathuong', 'trebuchet'], ['cacau', 'giaolong', 'camap'], ['chudu', 'camninh', 'hoangcai', 'bangthong', 'taothao', 'quanvu'], ['wall', 'archertower', 'ballista', 'frosttotem'], ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen']),
  },
  {
    n: 12, diff: 4, range: [20, 25], nodes: 22, theme: 'throne', weathers: ['fog', 'thunder', 'fireRain'], layout: 'open', icon: '🏚️',
    specials: ['ruin'], fort: 0.3, mine: 0.1, boss: 'diemla', midBoss: 'dongtrac',
    rules: {},
    pool: P(['berserker', 'shield', 'knight', 'poisoner', 'chieuhon', 'kimcang', 'elephant', 'taoist', 'mehon', 'bomber'], ['cuongthi', 'bachcot', 'nguudau', 'madien', 'macau', 'hacphong'], ['lubo', 'taothao', 'diatang', 'tatu', 'kimsidieu'], ['wall', 'spikewall', 'archertower', 'ballista']),
  },
  {
    n: 13, diff: 3, range: [15, 20], nodes: 18, theme: 'bamboo', weathers: ['rain', 'fog', 'sunny'], layout: 'open', icon: '🌳',
    specials: ['mana', 'mana', 'mana'], fort: 0.1, mine: 0.12, boss: 'hoangmi',
    rules: {},
    pool: P(['archer', 'ninja', 'taoist', 'healer', 'monk', 'duocdong', 'daodong', 'phuonghoangtu', 'thanhac', 'chieuhon'], ['moctinh', 'nhendoc', 'holy', 'thanhxa', 'cuuvi', 'hotinh', 'khongtuoc', 'langyeu'], ['hoangdung', 'duongtang', 'quanam', 'tonngokhong', 'trubatgioi'], ['altar', 'archertower', 'spiketrap']),
  },
];

export const exploreMapDef = (n: number) => EXPLORE_MAPS[n - 1];
export const exploreKey = (n: number) => `m${n}`;

// ───────────────────────── đồ thị trạm ─────────────────────────

export interface ENode {
  i: number;
  x: number;
  y: number;
  type: NodeType;
  special?: SpecialKind;
  /** độ sâu 0..1 (khoảng cách tới Thành chính) */
  depth: number;
  /** nửa bản đồ (Băng–Lửa) */
  side?: 'ice' | 'fire';
  /** Boss riêng của trạm Boss giữa bản đồ */
  bossId?: string;
}
export interface EEdge {
  a: number;
  b: number;
  /** đường chỉ mở khi: đã chiếm trạm `node` (cầu), hoặc đúng nhiệt độ `temp` */
  gate?: { node: number } | { temp: 'ice' | 'fire' };
  /** cầu treo / đường biển: vẽ nét khác */
  kind?: 'sea' | 'hang';
}
export interface EGraph {
  nodes: ENode[];
  edges: EEdge[];
  start: number;
  boss: number;
  mid?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: ENode, b: ENode) => Math.hypot(a.x - b.x, a.y - b.y);

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const blank = (i: number, x: number, y: number): ENode => ({ i, x, y, type: 'camp', depth: 0 });

function addEdge(edges: EEdge[], a: number, b: number, extra: Partial<EEdge> = {}) {
  if (a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return;
  edges.push({ a, b, ...extra });
}

/** các nút (đã xếp thành cột theo x) nối với nút kế bên phải gần nhất; mỗi nút luôn có đường tới cột sau và có đường vào từ cột trước */
function linkForward(nodes: ENode[], group: number[], edges: EEdge[], rnd: () => number, p2: number, pv: number) {
  const ids = group.slice().sort((a, b) => nodes[a].x - nodes[b].x);
  const colOf = (i: number) => Math.round(nodes[i].x * 100);
  const cols: number[][] = [];
  for (const i of ids) {
    const last = cols[cols.length - 1];
    if (last && Math.abs(colOf(last[0]) - colOf(i)) <= 3) last.push(i);
    else cols.push([i]);
  }
  for (let c = 0; c < cols.length - 1; c++) {
    const next = cols[c + 1];
    for (const a of cols[c]) {
      const sorted = next.slice().sort((p, q) => dist(nodes[a], nodes[p]) - dist(nodes[a], nodes[q]));
      addEdge(edges, a, sorted[0]);
      if (sorted[1] !== undefined && rnd() < p2) addEdge(edges, a, sorted[1]);
    }
    for (const b of next) {
      if (!edges.some((e) => (e.b === b && cols[c].includes(e.a)) || (e.a === b && cols[c].includes(e.b)))) {
        const sorted = cols[c].slice().sort((p, q) => dist(nodes[b], nodes[p]) - dist(nodes[b], nodes[q]));
        addEdge(edges, sorted[0], b);
      }
    }
  }
  // đường dọc giữa các nút kề nhau trong cùng cột
  for (const col of cols) {
    const byY = col.slice().sort((p, q) => nodes[p].y - nodes[q].y);
    for (let k = 0; k < byY.length - 1; k++) if (rnd() < pv) addEdge(edges, byY[k], byY[k + 1]);
  }
}

/** vị trí các nút theo cột: [Thành chính] [cột giữa...] [Boss] */
function columnLayout(rnd: () => number, n: number, cols: number, counts?: number[], yRange: [number, number] = [0.12, 0.88]): ENode[] {
  const nodes: ENode[] = [];
  const mid = n - 2;
  const mc = cols - 2;
  const per = counts ?? Array.from({ length: mc }, () => Math.floor(mid / mc));
  if (!counts) for (let r = mid - per.reduce((a, c) => a + c, 0), k = 0; r > 0; r--, k++) per[(k * 2 + 1) % mc]++;
  nodes.push(blank(0, 0.08, 0.5));
  for (let c = 0; c < mc; c++) {
    const k = per[c];
    const x = 0.08 + ((c + 1) * 0.84) / (cols - 1);
    for (let j = 0; j < k; j++) {
      const y = yRange[0] + ((j + 1) / (k + 1)) * (yRange[1] - yRange[0]) + (rnd() - 0.5) * 0.07;
      nodes.push(blank(nodes.length, clamp(x + (rnd() - 0.5) * 0.035, 0.1, 0.9), clamp(y, 0.08, 0.92)));
    }
  }
  nodes.push(blank(nodes.length, 0.92, 0.5));
  return nodes;
}

function bfsDist(g: { nodes: ENode[]; edges: EEdge[] }, from: number, open?: (e: EEdge) => boolean): number[] {
  const d = g.nodes.map(() => -1);
  d[from] = 0;
  const q = [from];
  while (q.length) {
    const a = q.shift()!;
    for (const e of g.edges) {
      if (open && !open(e)) continue;
      const b = e.a === a ? e.b : e.b === a ? e.a : -1;
      if (b >= 0 && d[b] < 0) {
        d[b] = d[a] + 1;
        q.push(b);
      }
    }
  }
  return d;
}

/** nối các nút còn rời rạc vào thành phần liên thông chứa Thành chính */
function ensureConnected(g: { nodes: ENode[]; edges: EEdge[] }) {
  for (;;) {
    const d = bfsDist(g, 0);
    const lost = g.nodes.filter((n) => d[n.i] < 0);
    if (!lost.length) return;
    let best: [number, number] = [0, lost[0].i];
    let bd = Infinity;
    for (const l of lost) for (const n of g.nodes) if (d[n.i] >= 0 && dist(l, n) < bd) {
      bd = dist(l, n);
      best = [n.i, l.i];
    }
    addEdge(g.edges, best[0], best[1]);
  }
}

/** bố cục theo cụm (đảo / đảo bay): mỗi cụm là một đảo, nối nhau qua cảng hoặc cổng */
function buildClusters(rnd: () => number, n: number, sky: boolean): EGraph {
  const k = clamp(Math.round(n / 3.6), 3, 7);
  const sizes = Array.from({ length: k }, () => 1);
  sizes[0] = 2;
  sizes[k - 1] = 2;
  for (let left = n - sizes.reduce((a, c) => a + c, 0), i = 1; left > 0; left--, i++) sizes[1 + (i % Math.max(1, k - 2))]++;
  const nodes: ENode[] = [];
  const edges: EEdge[] = [];
  const members: number[][] = [];
  for (let c = 0; c < k; c++) {
    const cx = 0.14 + (0.72 * c) / (k - 1);
    const cy = c % 2 === 0 ? 0.32 + rnd() * 0.08 : 0.62 + rnd() * 0.08;
    const m: number[] = [];
    for (let j = 0; j < sizes[c]; j++) {
      const ang = (j / sizes[c]) * Math.PI * 2 + rnd() * 0.8;
      const r = 0.06 + rnd() * 0.035;
      m.push(nodes.length);
      nodes.push(blank(nodes.length, clamp(cx + Math.cos(ang) * r * 1.3, 0.07, 0.93), clamp(cy + Math.sin(ang) * r * 1.5, 0.08, 0.92)));
    }
    members.push(m);
    for (let j = 1; j < m.length; j++) {
      const near = m.slice(0, j).sort((p, q) => dist(nodes[m[j]], nodes[p]) - dist(nodes[m[j]], nodes[q]));
      addEdge(edges, m[j], near[0]);
      if (near[1] !== undefined && rnd() < 0.5) addEdge(edges, m[j], near[1]);
    }
  }
  // cảng / cổng dịch chuyển: nút của mỗi đảo gần đảo kế tiếp nhất
  const ports: number[] = [];
  for (let c = 0; c < k - 1; c++) {
    const target = members[Math.min(k - 1, c + 1)][0];
    const m = members[c].filter((i) => i !== 0 && i !== nodes.length - 1);
    const pick = (m.length ? m : members[c]).slice().sort((p, q) => dist(nodes[p], nodes[target]) - dist(nodes[q], nodes[target]))[0];
    ports.push(pick);
    nodes[pick].type = 'special';
    nodes[pick].special = sky ? 'portal' : 'port';
  }
  for (let c = 0; c < k - 1; c++) {
    addEdge(edges, ports[c], members[c + 1].slice().sort((p, q) => dist(nodes[ports[c]], nodes[p]) - dist(nodes[ports[c]], nodes[q]))[0], { kind: sky ? 'hang' : 'sea' });
    if (c + 2 < k && rnd() < 0.35) addEdge(edges, ports[c], ports[c + 2], { kind: sky ? 'hang' : 'sea' });
  }
  const last = nodes.length - 1;
  nodes[0].x = 0.08;
  nodes[0].y = 0.5 + (members[0].length > 1 ? 0 : 0);
  return { nodes, edges, start: 0, boss: last };
}

/** hai nửa Băng và Lửa nối qua trạm trung tâm; đường qua lại đóng/mở theo nhiệt độ */
function buildTwin(rnd: () => number, n: number): EGraph {
  const left = Math.floor((n - 3) / 2);
  const right = n - 3 - left;
  const nodes: ENode[] = [];
  const edges: EEdge[] = [];
  // nửa băng: Thành chính + `left` trạm; nửa lửa: `right` trạm + Boss
  const make = (count: number, x0: number, x1: number, startAt: boolean, bossAt: boolean) => {
    const ids: number[] = [];
    const cols = Math.max(3, Math.round(Math.sqrt(count + 2) * 1.2));
    for (let j = 0; j < count; j++) {
      const c = j % cols;
      const inCol = Math.ceil((count - c) / cols);
      const row = Math.floor(j / cols);
      const x = x0 + ((c + 0.5) * (x1 - x0)) / cols + (rnd() - 0.5) * 0.03;
      const y = 0.14 + ((row + 1) / (inCol + 1)) * 0.72 + (rnd() - 0.5) * 0.06;
      ids.push(nodes.length);
      nodes.push(blank(nodes.length, clamp(x, 0.07, 0.93), clamp(y, 0.08, 0.92)));
    }
    if (startAt) {
      nodes.unshift(blank(0, 0.07, 0.5));
      nodes.forEach((nd, idx) => (nd.i = idx));
      ids.forEach((_, j) => (ids[j] += 1));
      ids.unshift(0);
    }
    if (bossAt) {
      ids.push(nodes.length);
      nodes.push(blank(nodes.length, 0.93, 0.5));
    }
    return ids;
  };
  const L = make(left, 0.1, 0.44, true, false);
  const R = make(right, 0.56, 0.9, false, true);
  const core = nodes.length;
  nodes.push(blank(core, 0.5, 0.5));
  linkForward(nodes, L, edges, rnd, 0.5, 0.45);
  linkForward(nodes, R, edges, rnd, 0.5, 0.45);
  const lastL = L.slice().sort((a, b) => nodes[b].x - nodes[a].x)[0];
  const firstR = R.slice().sort((a, b) => nodes[a].x - nodes[b].x)[0];
  const nearL = L.slice().sort((a, b) => dist(nodes[a], nodes[core]) - dist(nodes[b], nodes[core]))[0];
  const nearR = R.slice().sort((a, b) => dist(nodes[a], nodes[core]) - dist(nodes[b], nodes[core]))[0];
  addEdge(edges, nearL, core, { gate: { temp: 'ice' } });
  addEdge(edges, core, nearR, { gate: { temp: 'fire' } });
  if (lastL !== nearL || firstR !== nearR) addEdge(edges, lastL, firstR, { gate: { temp: 'fire' } });
  nodes[core].type = 'special';
  nodes[core].special = 'core';
  for (const i of L) nodes[i].side = 'ice';
  for (const i of R) nodes[i].side = 'fire';
  nodes[core].side = 'fire';
  return { nodes, edges, start: 0, boss: R[R.length - 1] };
}

/** sông lớn chia đôi: bờ trên (Thành chính) và bờ dưới (Boss), chỉ nối qua các cầu / bến vượt sông */
function buildSplit(rnd: () => number, n: number): EGraph {
  const bridges = n >= 18 ? 3 : 2;
  const rest = n - 2 - bridges;
  const top = Math.ceil(rest / 2);
  const bot = rest - top;
  const nodes: ENode[] = [];
  const edges: EEdge[] = [];
  const bank = (count: number, y0: number, y1: number, startNode: boolean, bossNode: boolean) => {
    const ids: number[] = [];
    if (startNode) {
      ids.push(nodes.length);
      nodes.push(blank(nodes.length, 0.07, (y0 + y1) / 2));
    }
    const cols = Math.max(2, Math.ceil(count / 2));
    for (let j = 0; j < count; j++) {
      const c = j % cols;
      const row = Math.floor(j / cols);
      const rows = Math.ceil((count - c) / cols);
      const x = 0.16 + ((c + 0.5) * 0.7) / cols + (rnd() - 0.5) * 0.03;
      const y = y0 + ((row + 1) / (rows + 1)) * (y1 - y0) + (rnd() - 0.5) * 0.04;
      ids.push(nodes.length);
      nodes.push(blank(nodes.length, clamp(x, 0.12, 0.88), y));
    }
    if (bossNode) {
      ids.push(nodes.length);
      nodes.push(blank(nodes.length, 0.93, (y0 + y1) / 2));
    }
    return ids;
  };
  const T = bank(top, 0.1, 0.4, true, false);
  const B = bank(bot, 0.6, 0.9, false, true);
  linkForward(nodes, T, edges, rnd, 0.5, 0.5);
  linkForward(nodes, B, edges, rnd, 0.5, 0.5);
  const br: number[] = [];
  for (let k = 0; k < bridges; k++) {
    const id = nodes.length;
    nodes.push(blank(id, 0.22 + ((k + 0.5) * 0.6) / bridges + (rnd() - 0.5) * 0.04, 0.5));
    nodes[id].type = 'special';
    nodes[id].special = 'bridge';
    br.push(id);
    const nt = T.slice().sort((a, b) => dist(nodes[id], nodes[a]) - dist(nodes[id], nodes[b]))[0];
    const nb = B.slice().sort((a, b) => dist(nodes[id], nodes[a]) - dist(nodes[id], nodes[b]))[0];
    addEdge(edges, nt, id);
    addEdge(edges, id, nb);
  }
  return { nodes, edges, start: T[0], boss: B[B.length - 1] };
}

/** "cut": đồ thị mở nhưng vài đường bị cắt đứt cho tới khi chiếm trạm cầu */
function addCuts(rnd: () => number, g: EGraph, count: number) {
  for (let k = 0; k < count; k++) {
    const reach = bfsDist(g, g.start, (e) => !e.gate);
    const cand = g.edges.filter((e) => !e.gate && reach[e.a] >= 2 && reach[e.b] >= 2 && Math.abs(reach[e.a] - reach[e.b]) <= 1);
    if (!cand.length) return;
    const e = cand[Math.floor(rnd() * cand.length)];
    // bỏ thử đường này: các nút phía sau phải vẫn nối được qua đường khác hoặc qua cầu (cầu nằm ở phía trước, nối được khi chưa mở cửa)
    e.gate = { node: -1 };
    const reach2 = bfsDist(g, g.start, (x) => !x.gate);
    const before = Math.min(reach[e.a], reach[e.b]);
    const bridgeCands = g.nodes.filter((nd) => reach2[nd.i] >= 1 && reach2[nd.i] < before && nd.type === 'camp' && nd.i !== g.boss);
    if (!bridgeCands.length) {
      delete e.gate;
      continue;
    }
    const bn = bridgeCands[Math.floor(rnd() * bridgeCands.length)];
    bn.type = 'special';
    bn.special = 'bridge';
    e.gate = { node: bn.i };
  }
}

export function buildGraph(map: ExploreMapDef): EGraph {
  const rnd = mulberry32(9001 + map.n * 131);
  const n = map.nodes;
  let g: EGraph;
  switch (map.layout) {
    case 'islands': g = buildClusters(rnd, n, false); break;
    case 'sky': g = buildClusters(rnd, n, true); break;
    case 'twin': g = buildTwin(rnd, n); break;
    case 'split': g = buildSplit(rnd, n); break;
    case 'sparse': {
      const mc = Math.ceil((n - 2) / 1.5);
      const counts = Array.from({ length: mc }, (_, c) => (c % 2 === 0 ? 2 : 1));
      let sum = counts.reduce((a, c) => a + c, 0);
      for (let c = mc - 1; sum > n - 2 && c >= 0; c--) if (counts[c] > 1) { counts[c]--; sum--; }
      for (let c = 0; sum < n - 2; c = (c + 1) % mc) if (counts[c] < 3) { counts[c]++; sum++; }
      const nodes = columnLayout(rnd, n, mc + 2, counts);
      const edges: EEdge[] = [];
      linkForward(nodes, nodes.map((nd) => nd.i), edges, rnd, 0.12, 0.05);
      g = { nodes, edges, start: 0, boss: nodes.length - 1 };
      break;
    }
    default: {
      const cols = clamp(Math.round(Math.sqrt(n * 1.5)), 4, 8);
      const nodes = columnLayout(rnd, n, cols);
      const edges: EEdge[] = [];
      linkForward(nodes, nodes.map((nd) => nd.i), edges, rnd, 0.6, 0.4);
      g = { nodes, edges, start: 0, boss: nodes.length - 1 };
    }
  }
  ensureConnected(g);
  if (map.layout === 'cut') addCuts(rnd, g, 2);

  // độ sâu theo khoảng cách bước
  const d = bfsDist(g, g.start);
  const maxD = Math.max(1, ...d);
  g.nodes.forEach((nd) => (nd.depth = d[nd.i] / maxD));

  // loại trạm
  const fixed = new Set<number>([g.start, g.boss]);
  g.nodes[g.start].type = 'city';
  g.nodes[g.boss].type = 'boss';
  g.nodes[g.boss].bossId = map.boss;
  for (const nd of g.nodes) if (nd.special) { nd.type = 'special'; fixed.add(nd.i); }
  const free = (): number[] => g.nodes.filter((nd) => !fixed.has(nd.i) && nd.type === 'camp').map((nd) => nd.i);
  const take = (list: number[], k: number) => shuffled(list, rnd).slice(0, k);
  // Boss giữa bản đồ
  if (map.midBoss) {
    const c = free().filter((i) => g.nodes[i].depth > 0.45 && g.nodes[i].depth < 0.75);
    const pick = (c.length ? c : free())[0];
    if (pick !== undefined) {
      g.nodes[pick].type = 'boss';
      g.nodes[pick].bossId = map.midBoss;
      g.mid = pick;
      fixed.add(pick);
    }
  }
  for (const kind of map.specials) {
    const c = free().filter((i) => g.nodes[i].depth > 0.1 && g.nodes[i].depth < 0.95);
    const pick = take(c.length ? c : free(), 1)[0];
    if (pick === undefined) continue;
    g.nodes[pick].type = 'special';
    g.nodes[pick].special = kind;
    fixed.add(pick);
  }
  const mids = free();
  const nF = Math.round(mids.length * map.fort * 1.4);
  const nM = Math.max(1, Math.round(mids.length * map.mine * 1.2));
  const nT = Math.max(1, Math.round(mids.length * 0.1));
  for (const i of take(mids.filter((j) => g.nodes[j].depth > 0.25), nF)) g.nodes[i].type = 'fortress';
  for (const i of take(free().filter((j) => g.nodes[j].depth > 0.1 && g.nodes[j].depth < 0.8), nM)) g.nodes[i].type = 'mine';
  for (const i of take(free().filter((j) => g.nodes[j].depth < 0.7), nT)) g.nodes[i].type = 'tower';
  return g;
}

// ───────────────────────── trạng thái & luật ─────────────────────────

export interface ExploreState {
  cap: number[];
  done?: boolean;
  temp?: 'ice' | 'fire';
  /** thời điểm (ms) thu hoạch mỏ lần cuối */
  claim?: number;
  /** số lần chơi lại bản đồ (để gộp save giữa các thiết bị: lượt chơi mới hơn thắng) */
  run?: number;
}

/** mã trạm đặc biệt báo cho màn trận biết đây là trận Khám phá */
export const EXPLORE_INDEX = -2;

/** một trận Khám phá đã dựng sẵn (trạm + luật + nhãn hiển thị) */
export interface ExploreLaunch {
  map: number;
  node: number;
  station: Station;
  rules: ExploreRules;
  label: string;
}

export const newExploreState = (g: EGraph): ExploreState => ({ cap: [g.start], temp: 'ice', claim: Date.now() });

/** đường đi có mở không (cầu đã chiếm / nhiệt độ phù hợp / đã chiếm trạm lõi) */
export function edgeOpen(g: EGraph, e: EEdge, st: ExploreState): boolean {
  if (!e.gate) return true;
  if ('node' in e.gate) return st.cap.includes(e.gate.node);
  return st.temp === e.gate.temp || st.cap.some((i) => g.nodes[i].special === 'core');
}

/** trạm có thể tấn công: chưa chiếm và kề một trạm đã chiếm qua đường đang mở */
export function attackable(g: EGraph, st: ExploreState): Set<number> {
  const out = new Set<number>();
  for (const e of g.edges) {
    if (!edgeOpen(g, e, st)) continue;
    const ac = st.cap.includes(e.a);
    const bc = st.cap.includes(e.b);
    if (ac && !bc) out.add(e.b);
    if (bc && !ac) out.add(e.a);
  }
  return out;
}

/** trạm nhìn thấy: kề các trạm đã chiếm; tháp quan sát nhìn xa hơn (3 bước) */
export function visibleNodes(g: EGraph, st: ExploreState): Set<number> {
  const vis = new Set<number>();
  for (const c of st.cap) {
    const reach = g.nodes[c].type === 'tower' ? 3 : 1;
    const d = bfsDist(g, c);
    for (const nd of g.nodes) if (d[nd.i] >= 0 && d[nd.i] <= reach) vis.add(nd.i);
  }
  // trạm đặc biệt ở xa luôn hiện (cổng, cầu): gợi ý người chơi
  return vis;
}

/** ưu đãi từ các trạm đã chiếm + luật cố định của bản đồ → hiệu ứng áp vào trận */
export function rulesFor(map: ExploreMapDef, g: EGraph, st: ExploreState, nodeType?: NodeType): ExploreRules {
  const r: ExploreRules = { ...map.rules };
  const add = (k: 'startGold' | 'flagHpMul' | 'dmgMul' | 'hpMul' | 'allySpeedMul' | 'flagRegen', v: number) => {
    r[k] = (r[k] ?? (k === 'startGold' || k === 'flagRegen' ? 0 : 1)) + v;
  };
  add('startGold', 10); // Thành chính
  add('flagHpMul', 0.05);
  let forts = 0;
  let mines = 0;
  for (const c of st.cap) {
    const nd = g.nodes[c];
    if (nd.type === 'fortress') forts++;
    else if (nd.type === 'mine') mines++;
    else if (nd.type === 'special') {
      switch (nd.special) {
        case 'village': add('startGold', 8); break;
        case 'warm': add('flagRegen', 0.0015); break;
        case 'oasis': r.costMul = Math.max(1, (r.costMul ?? 1) - 0.12); break;
        case 'port': r.enemyIncomeMul = Math.max(0.6, (r.enemyIncomeMul ?? 1) - 0.08); break;
        case 'mana': add('dmgMul', 0.04); add('hpMul', 0.04); break;
        case 'ruin': add('dmgMul', 0.03); add('hpMul', 0.03); break;
        case 'dry': add('allySpeedMul', 0.05); break;
        default: break;
      }
    }
  }
  add('flagHpMul', Math.min(0.3, forts * 0.05));
  if (map.mineWeapon && mines) add('dmgMul', Math.min(0.25, mines * 0.05));
  // pháo đài của địch: không có ưu đãi cho phe địch ở đây (đã có thành chung)
  void nodeType;
  return r;
}

/** vàng thu hoạch từ mỏ: mỗi giờ, tối đa 8 giờ dồn lại */
export const MINE_PER_HOUR = [0, 40, 60, 85, 120];
export const MINE_CAP_HOURS = 8;
export function mineIncome(map: ExploreMapDef, g: EGraph, st: ExploreState, now = Date.now()): { perHour: number; pending: number; mines: number } {
  const mines = st.cap.filter((i) => g.nodes[i].type === 'mine').length;
  const perHour = mines * MINE_PER_HOUR[map.diff] * (st.cap.some((i) => g.nodes[i].special === 'oasis') ? 1.15 : 1);
  const hours = Math.min(MINE_CAP_HOURS, Math.max(0, (now - (st.claim ?? now)) / 3600000));
  return { perHour: Math.round(perHour), pending: Math.floor(perHour * hours), mines };
}

// ───────────────────────── tạo trận cho một trạm ─────────────────────────

const DIFF_BASE: Record<Diff, { power: number; slope: number; income: number; eq: [number, number] }> = {
  1: { power: 0.78, slope: 0.4, income: 2.0, eq: [0, 20] },
  2: { power: 1.1, slope: 0.5, income: 3.3, eq: [16, 44] },
  3: { power: 1.5, slope: 0.55, income: 4.5, eq: [36, 72] },
  4: { power: 1.95, slope: 0.6, income: 5.7, eq: [58, 100] },
};

const TYPE_POWER: Record<NodeType, number> = { city: 1, camp: 0.95, tower: 0.92, mine: 1.02, fortress: 1.1, special: 1.04, boss: 1 };
const TYPE_REWARD: Record<NodeType, number> = { city: 0, camp: 0.8, tower: 0.9, mine: 1, fortress: 1.3, special: 1.1, boss: 2.5 };

const troopBudget = (eq: number) => (eq < 30 ? 10 + 1.5 * eq : eq < 50 ? 52 + 0.6 * (eq - 30) : eq < 80 ? 64 + 0.4 * (eq - 50) : 76 + 0.8 * (eq - 80));

export interface NodeNamer {
  (type: NodeType, special: SpecialKind | undefined, index: number, map: ExploreMapDef): { name: string; sub: string; desc: string };
}

/** ghi kết quả một trận Khám phá vào save: chiếm trạm khi thắng, đổi nhiệt độ sau mỗi trận, thưởng xu (và thưởng hoàn thành bản đồ) */
export function applyExploreResult(
  s: { coins: number; wins: number; losses: number; explore?: Record<string, ExploreState> },
  launch: ExploreLaunch,
  win: boolean,
): { coins: number; bonus: number; finished: boolean; captured: boolean } {
  const map = exploreMapDef(launch.map);
  const g = buildGraph(map);
  const all = (s.explore ??= {});
  const st = (all[exploreKey(map.n)] ??= newExploreState(g));
  const coins = win ? launch.station.reward : Math.round(launch.station.reward * 0.15);
  let bonus = 0;
  let finished = false;
  const captured = win && !st.cap.includes(launch.node);
  if (captured) st.cap.push(launch.node);
  if (win && launch.node === g.boss) {
    bonus = mapCompleteBonus(map, !!st.done);
    finished = !st.done;
    st.done = true;
  }
  st.temp = st.temp === 'fire' ? 'ice' : 'fire';
  s.coins += coins + bonus;
  if (win) s.wins++;
  else s.losses++;
  return { coins, bonus, finished, captured };
}

/** phần thưởng xu khi chiếm một trạm */
export function nodeReward(map: ExploreMapDef, nd: ENode, done: boolean): number {
  const b = DIFF_BASE[map.diff];
  const eq = b.eq[0] + (b.eq[1] - b.eq[0]) * nd.depth;
  return Math.round((60 + 12 * eq) * TYPE_REWARD[nd.type] * (done ? 0.4 : 1));
}
export const mapCompleteBonus = (map: ExploreMapDef, done: boolean) => Math.round(1500 * map.diff * (done ? 0.4 : 1));

export function buildNodeStation(map: ExploreMapDef, g: EGraph, st: ExploreState, nodeIdx: number, namer: NodeNamer): { station: Station; rules: ExploreRules } {
  const nd = g.nodes[nodeIdx];
  const b = DIFF_BASE[map.diff];
  const rnd = mulberry32(31337 + map.n * 977 + nodeIdx * 53);
  const eq = Math.round(b.eq[0] + (b.eq[1] - b.eq[0]) * nd.depth);
  const boss = nd.type === 'boss';
  const pool = map.pool;
  const rules = rulesFor(map, g, st, nd.type);

  // thủy chiến: bản đồ biển/đảo, hoặc trạm cầu/bến của bản đồ sông
  const river = map.river || (map.layout === 'split' && nd.special === 'bridge') ? 1 : undefined;
  const theme: StationTheme = nd.side === 'ice' ? 'snow' : nd.side === 'fire' ? 'volcano' : boss && map.theme !== 'throne' ? 'throne' : nd.type === 'fortress' ? 'castle' : map.theme;
  const weather: WeatherId = nd.side === 'fire' ? (rnd() < 0.5 ? 'fireRain' : 'sunny') : nd.side === 'ice' ? (rnd() < 0.5 ? 'fog' : 'sunny') : map.weathers[Math.floor(rnd() * map.weathers.length)];

  // bộ quân địch: càng sâu càng nhiều loại, thêm tướng theo độ sâu và loại trạm
  const tn = Math.min(pool.troops.length, 3 + Math.floor(nd.depth * (pool.troops.length - 2)));
  const deck: string[] = pool.troops.slice(0, tn);
  if (river && pool.river) deck.push(...pool.river.slice(0, 2 + Math.floor(nd.depth * (pool.river.length - 1))));
  if (nd.type === 'camp' || nd.type === 'tower' || nd.depth > 0.35) deck.push(...pool.beasts.slice(0, Math.min(pool.beasts.length, nd.type === 'camp' ? 1 + Math.floor(nd.depth * 3) : Math.floor(nd.depth * 2.5))));
  const gens = boss ? 2 : Math.min(pool.generals.length, Math.floor(nd.depth * (2 + map.diff * 0.6)) + (nd.type === 'fortress' ? 1 : 0));
  deck.push(...pool.generals.slice(0, gens));
  const defenses = nd.type === 'fortress' || boss ? pool.defenses.slice(0, 1 + Math.floor(nd.depth * (pool.defenses.length - 1)) + (nd.type === 'fortress' ? 1 : 0)) : nd.type === 'tower' ? pool.defenses.slice(0, 1) : nd.depth > 0.5 ? pool.defenses.slice(0, 1) : undefined;

  const picks: StationMod[] = ['armored', 'quick', 'swarm'];
  const mod = map.mod ?? (nd.depth > 0.3 && rnd() < 0.3 + 0.1 * map.diff ? picks[Math.floor(rnd() * 3)] : undefined);

  const power = boss ? Math.round((1.0 + 0.03 * map.diff) * 100) / 100 : Math.round((b.power + b.slope * nd.depth) * TYPE_POWER[nd.type] * 100) / 100;
  const flagHp = Math.round((eq < 30 ? 340 + 33 * eq : 1297 + 14 * (eq - 29)) * (boss ? 1.15 : nd.type === 'fortress' ? 1.15 : 1) / 10) * 10;
  const text = namer(nd.type, nd.special, nodeIdx, map);
  const station: Station = {
    id: 1000 + map.n * 100 + nodeIdx,
    chapter: map.n - 1,
    name: text.name,
    subtitle: text.sub,
    boss,
    bossId: boss ? nd.bossId : undefined,
    deck: boss ? deck.slice(0, 8) : deck,
    power,
    income: Math.round(b.income * (1 + 0.25 * nd.depth) * 0.9 * 100) / 100,
    flagHp,
    units: Math.round(boss ? troopBudget(eq) * 0.62 + 2 : troopBudget(eq) * (nd.type === 'camp' ? 0.9 : nd.type === 'fortress' ? 1.05 : 1)),
    defenses,
    reward: nodeReward(map, nd, !!st.done),
    fastSec: Math.round((100 + 3.5 * Math.min(eq, 50)) / 5) * 5,
    mod: boss ? undefined : mod,
    theme,
    weather,
    giantId: undefined,
    river,
    bridges: [],
    outposts: [],
    posts: 0,
    extraLane: undefined,
    tunnels: [],
    lairs: [],
    castle: nd.type === 'fortress' && !river ? true : undefined,
    desc: text.desc,
  };
  return { station, rules };
}
