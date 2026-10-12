import { mulberry32 } from './lane';
import type { Station, StationTheme } from './campaign';
import type { WeatherId } from './terrain';
import { buildNodeStation, type ENode, type EGraph, type ExploreMapDef, type ExploreRules, type NodeNamer, type NodeType } from './explore';
import { UNITS } from './units';

// ───────────── Chế độ GIẢI CỨU CÔNG CHÚA ─────────────
// Một lượt chơi (run): chuẩn bị quân → chọn một trong 3–4 lộ → gặp trạm / sự kiện ngẫu nhiên → đột kích lâu đài (3 trận, boss)
// → cứu công chúa → chọn tuyến rút lui, hộ tống nàng về thành. Càng vào sâu địch càng mạnh rất nhiều.
// "Biến cố định mệnh" (fate) khác nhau mỗi lượt: công chúa bị giam ở đâu, bao lâu thì lộ ra, đường bí mật có mở sẵn hay không.

export type PType =
  | 'city' | 'camp' | 'fort' | 'event' | 'bridge' | 'secret' | 'contested' | 'pass' | 'gate' | 'hall' | 'boss' | 'escort' | 'treasure' | 'dungeon';

export interface PNode {
  i: number;
  x: number;
  y: number;
  type: PType;
  /** lộ (0..R-1), −1 = trạm chung (thành chính / ải / lâu đài / rút lui) */
  route: number;
  /** thứ tự trong lộ */
  step: number;
  /** độ sâu 0..1: quyết định sức mạnh địch */
  depth: number;
  /** tuyến rút lui (0/1) cho trạm hộ tống */
  retreat?: number;
}
export interface PEdge {
  a: number;
  b: number;
  /** đường một chiều: chỉ đi từ a sang b (không quay lại được) */
  oneway?: boolean;
  /** secret: cần bản đồ / đủ manh mối / đã phát hiện đường tắt · key: cần chìa khóa (vào thẳng sảnh trong) · rescued: chỉ mở sau khi cứu được công chúa */
  gate?: 'secret' | 'key' | 'rescued' | 'dungeon';
  kind?: 'bridge' | 'secret';
}
export interface PGraph {
  nodes: PNode[];
  edges: PEdge[];
  start: number;
  pass: number;
  gate: number;
  hall: number;
  boss: number;
  /** hầm ngục bí mật: giải cứu công chúa mà không cần hạ boss (lối vào lộ ra nhờ gợi ý) */
  dungeon: number;
  /** trạm cuối nhánh dẫn tới hầm ngục (để gợi ý chỉ đúng lộ) */
  dungeonHost: number;
  routes: number;
  /** số trạm của từng lộ */
  lens: number[];
  /** hai tuyến rút lui: danh sách trạm hộ tống theo thứ tự */
  retreat: number[][];
}

export type Place = 'snow' | 'volcano' | 'sea' | 'forest' | 'desert';
export const PLACES: Place[] = ['snow', 'volcano', 'sea', 'forest', 'desert'];
export interface Fate {
  place: Place;
  /** số trạm đã vượt qua thì lộ vị trí công chúa (0 = biết ngay từ đầu) */
  revealAt: number;
  /** đường bí mật đã mở sẵn từ đầu */
  secretOpen: boolean;
}
export const fateOf = (seed: number): Fate => {
  const r = mulberry32(seed ^ 0x9e3779b9);
  return { place: PLACES[Math.floor(r() * PLACES.length)], revealAt: Math.floor(r() * 5), secretOpen: r() < 0.35 };
};

export const PLACE_BOSS: Record<Place, string> = { snow: 'cuumatri', volcano: 'nguumavuong', sea: 'tonquyen', forest: 'hoangmi', desert: 'thanhcat' };
export const PLACE_THEME: Record<Place, StationTheme> = { snow: 'snow', volcano: 'volcano', sea: 'sea', forest: 'bamboo', desert: 'desert' };
const PLACE_WEATHER: Record<Place, WeatherId> = { snow: 'fog', volcano: 'fireRain', sea: 'rain', forest: 'fog', desert: 'sunny' };

/** theme và tính chất từng lộ */
export const ROUTE_THEME: StationTheme[] = ['bamboo', 'stone', 'sea', 'desert', 'night'];
export const ROUTE_ICON = ['🌲', '⛰️', '🌊', '🏜️', '🌫️'];

export const RESCUE_NODE_ICON: Record<PType, string> = {
  city: '🏯', camp: '⛺', fort: '🏰', event: '📜', bridge: '🌉', secret: '🕳', contested: '⚔', pass: '🚪', gate: '🏯', hall: '🏛', boss: '👹', escort: '🛡', treasure: '🎁', dungeon: '⛓',
};

// ───────────────────────── đồ thị ─────────────────────────
export function buildPrincessGraph(seed: number): PGraph {
  const rnd = mulberry32(seed);
  const R = 3 + Math.floor(rnd() * 3); // 3..5 lộ
  const lens = Array.from({ length: R }, () => 5 + Math.floor(rnd() * 5)); // 5..9 trạm mỗi lộ
  const sum = () => lens.reduce((a, c) => a + c, 0);
  while (sum() < 19) { const k = Math.floor(rnd() * R); lens[k] = Math.min(9, lens[k] + 1); }
  while (sum() > 27) { const k = Math.floor(rnd() * R); if (lens[k] > 5) lens[k]--; }
  const nodes: PNode[] = [];
  const edges: PEdge[] = [];
  const add = (x: number, y: number, type: PType, route: number, step: number, depth: number, retreat?: number) => {
    nodes.push({ i: nodes.length, x, y, type, route, step, depth, retreat });
    return nodes.length - 1;
  };
  const link = (a: number, b: number, extra: Partial<PEdge> = {}) => {
    if (!edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a && !e.oneway && !extra.oneway))) edges.push({ a, b, ...extra });
  };
  const start = add(0.05, 0.5, 'city', -1, 0, 0);
  const routeNodes: number[][] = [];
  for (let k = 0; k < R; k++) {
    const y = 0.14 + (0.72 * k) / (R - 1);
    const L = lens[k];
    const short = L <= 6;
    const ids: number[] = [];
    for (let s = 0; s < L; s++) {
      let type: PType;
      if (s === L - 1) type = 'fort';
      else {
        const r = rnd();
        // đường ngắn: nhiều địch; đường dài: nhiều sự kiện, tài nguyên
        type = s === 0 ? (r < 0.7 ? 'camp' : 'event')
          : short ? (r < 0.5 ? 'camp' : r < 0.65 ? 'fort' : r < 0.75 ? 'event' : 'contested')
            : (r < 0.28 ? 'camp' : r < 0.66 ? 'event' : r < 0.78 ? 'fort' : r < 0.9 ? 'contested' : 'camp');
      }
      const x = 0.12 + 0.5 * ((s + 0.5) / L) + (rnd() - 0.5) * 0.018;
      ids.push(add(x, y + (rnd() - 0.5) * 0.04, type, k, s, ((s + 1) / (L + 1)) * 0.55));
    }
    routeNodes.push(ids);
    link(start, ids[0]);
    for (let s = 0; s < L - 1; s++) link(ids[s], ids[s + 1]);
  }
  // nhánh phụ: ngõ cụt 1–3 trạm, cuối nhánh là kho báu (một nhánh dẫn tới hầm ngục bí mật)
  const branchEnds: { end: number; route: number }[] = [];
  for (let k = 0; k < R; k++) {
    const nb = branchEnds.length >= 4 ? 0 : rnd() < 0.7 ? (rnd() < 0.3 ? 2 : 1) : 0;
    for (let b = 0; b < nb; b++) {
      const L = lens[k];
      const hostStep = 1 + Math.floor(rnd() * (L - 3));
      const host = routeNodes[k][hostStep];
      const dir = k < R / 2 ? -1 : 1;
      const len = 1 + Math.floor(rnd() * 2);
      let prev = host;
      for (let j = 0; j < len; j++) {
        const last = j === len - 1;
        const type: PType = last ? 'treasure' : rnd() < 0.5 ? 'camp' : rnd() < 0.5 ? 'event' : 'contested';
        const id = add(nodes[host].x + 0.035 * (j + 1), nodes[host].y + dir * (0.07 + 0.012 * b), type, k, hostStep + j + 1, nodes[host].depth + 0.04 * (j + 1));
        link(prev, id);
        prev = id;
      }
      branchEnds.push({ end: prev, route: k });
    }
  }
  if (!branchEnds.length) {
    const host = routeNodes[0][2];
    const id = add(nodes[host].x + 0.035, nodes[host].y - 0.075, 'treasure', 0, 3, nodes[host].depth + 0.04);
    link(host, id);
    branchEnds.push({ end: id, route: 0 });
  }
  // cầu nối: chuyển từ lộ này sang lộ kế bên (nhiều cầu để khi một đường bị khóa vẫn còn lối khác)
  const nbridge = R - 1 + (rnd() < 0.5 ? 1 : 0);
  for (let n = 0; n < nbridge; n++) {
    const k = n % (R - 1);
    const s = 1 + Math.floor(rnd() * Math.max(1, Math.min(lens[k], lens[k + 1]) - 3));
    const a = routeNodes[k][Math.min(s, lens[k] - 2)];
    const b = routeNodes[k + 1][Math.min(s + 1, lens[k + 1] - 1)];
    if (nodes[a].type !== 'event') nodes[a].type = 'bridge';
    link(a, b, { kind: 'bridge' });
  }
  // lối chéo ngẫu nhiên giữa hai lộ kề nhau: bản đồ rộng, nhiều đường đi
  for (let k = 0; k < R - 1; k++) {
    for (let s = 1; s < Math.min(lens[k], lens[k + 1]) - 1; s++) if (rnd() < 0.13) link(routeNodes[k][s], routeNodes[k + 1][Math.min(s + (rnd() < 0.5 ? 0 : 1), lens[k + 1] - 1)]);
  }
  const pass = add(0.7, 0.5, 'pass', -1, 0, 0.6);
  for (const ids of routeNodes) link(ids[ids.length - 1], pass);
  // ngã ba bí mật: rẽ ra khỏi một lộ, vòng thẳng tới cửa ải cuối
  const sk = Math.floor(rnd() * R);
  const host = routeNodes[sk][1 + Math.floor(rnd() * 2)];
  const secret = add(nodes[host].x + 0.04, nodes[host].y + (sk < R / 2 ? 0.1 : -0.1), 'secret', sk, 1, 0.3);
  link(host, secret, { gate: 'secret', kind: 'secret' });
  link(secret, pass, { kind: 'secret' });
  // lâu đài
  const gate = add(0.78, 0.5, 'gate', -1, 0, 0.72);
  const hall = add(0.85, 0.5, 'hall', -1, 0, 0.84);
  const boss = add(0.93, 0.5, 'boss', -1, 0, 1);
  link(pass, gate);
  link(gate, hall);
  link(pass, hall, { gate: 'key' });
  link(hall, boss);
  // hầm ngục bí mật: cuối một nhánh phụ, lối vào chỉ lộ khi có gợi ý; giải cứu được công chúa mà không cần hạ boss
  const dh = branchEnds[Math.floor(rnd() * branchEnds.length)];
  const dungeon = add(nodes[dh.end].x + 0.04, nodes[dh.end].y + (dh.route < R / 2 ? -0.05 : 0.05), 'dungeon', dh.route, 99, 0.88);
  link(dh.end, dungeon, { gate: 'dungeon', kind: 'secret' });
  // rút lui: hai tuyến một chiều, mỗi tuyến 2 trận hộ tống rồi về thành (xuất phát từ boss hoặc hầm ngục)
  const retreat: number[][] = [];
  for (let r = 0; r < 2; r++) {
    const y = r === 0 ? 0.05 : 0.95;
    const e1 = add(0.8, y, 'escort', -1, 0, 0.88 + r * 0.02, r);
    const e2 = add(0.36, y, 'escort', -1, 1, 0.95 + r * 0.02, r);
    link(boss, e1, { oneway: true, gate: 'rescued' });
    link(dungeon, e1, { oneway: true, gate: 'rescued' });
    link(e1, e2, { oneway: true });
    link(e2, start, { oneway: true });
    retreat.push([e1, e2]);
  }
  return { nodes, edges, start, pass, gate, hall, boss, dungeon, dungeonHost: dh.end, routes: R, lens, retreat };
}

// ───────────────────────── trạng thái một lượt ─────────────────────────
export type ItemId = 'map' | 'key' | 'medicine';

export interface PrincessRun {
  seed: number;
  general: string;
  /** điểm phân bổ: [quân lực, lương thực, trinh sát] */
  alloc: [number, number, number];
  at: number;
  /** trạm đã vượt qua (trận đã thắng / sự kiện đã xong) */
  visited: number[];
  morale: number;
  food: number;
  gold: number;
  clues: number;
  items: ItemId[];
  turns: number;
  goldFound: number;
  /** đã phát hiện đường tắt (đường bí mật mở) */
  secretOpen: boolean;
  rescued: boolean;
  /** kết thúc: thắng (về tới thành) hoặc thất bại (hết sĩ khí) */
  over?: 'win' | 'fail';
  startedAt: number;
  /** tăng sau mỗi thay đổi: dùng để gộp save giữa các thiết bị */
  rev: number;
  /** trạm sự kiện đã giải quyết */
  events: number;
  /** số lần thua ở từng trạm (khóa trạm khi thua 2 lần) */
  fails: Record<string, number>;
  /** trạm đã bị khóa: không vào lại được, phải đi đường khác */
  locked: number[];
}

export interface PrincessSave {
  run?: PrincessRun;
  plays: number;
  clears: number;
  best?: { score: number; rank: Rank };
  /** hạt giống các lượt đã kết thúc (để gộp save không làm sống lại lượt cũ) */
  ended?: number[];
}

export const ALLOC_POINTS = 10;
export const START_MORALE = 100;

export function newRun(general: string, alloc: [number, number, number], seed = Math.floor(Math.random() * 2 ** 31)): PrincessRun {
  const fate = fateOf(seed);
  return {
    seed, general, alloc, at: 0, visited: [0], morale: START_MORALE, food: 14 + 3 * alloc[1], gold: 20, clues: 0, items: [], turns: 0, goldFound: 0,
    secretOpen: fate.secretOpen, rescued: false, startedAt: Date.now(), rev: 0, events: 0, fails: {}, locked: [],
  };
}

/** vị trí công chúa đã lộ chưa (đủ trạm đã qua, đủ manh mối, hoặc đã có bản đồ) */
export function princessKnown(run: PrincessRun): boolean {
  const f = fateOf(run.seed);
  const done = run.visited.length - 1;
  return run.rescued || done >= Math.max(0, f.revealAt - Math.floor(run.alloc[2] / 2)) || run.clues >= 4;
}

/** lối vào hầm ngục lộ ra khi có gợi ý thứ 3 (3 manh mối) hoặc có bản đồ */
export const dungeonOpen = (run: PrincessRun) => run.clues >= 3 || run.items.includes('map');

export function edgeUsable(e: PEdge, run: PrincessRun, from: number): boolean {
  if (e.oneway && e.a !== from) return false;
  if (e.a !== from && e.b !== from) return false;
  if (e.gate === 'secret') return run.secretOpen || run.items.includes('map') || run.clues >= 3;
  if (e.gate === 'key') return run.items.includes('key');
  if (e.gate === 'rescued') return run.rescued;
  if (e.gate === 'dungeon') return dungeonOpen(run);
  return true;
}

/** các trạm có thể đi tới từ vị trí hiện tại, kèm lý do nếu đang bị chặn */
export function moveOptions(g: PGraph, run: PrincessRun): { node: number; open: boolean; why?: 'secret' | 'key' | 'rescued' | 'dungeon' | 'locked' }[] {
  const out: { node: number; open: boolean; why?: 'secret' | 'key' | 'rescued' | 'dungeon' | 'locked' }[] = [];
  for (const e of g.edges) {
    if (e.a !== run.at && e.b !== run.at) continue;
    const to = e.a === run.at ? e.b : e.a;
    if (e.oneway && e.a !== run.at) continue; // hướng cấm: không hiện
    // chưa cứu công chúa thì không đi vào tuyến rút lui
    if (run.locked.includes(to)) {
      out.push({ node: to, open: false, why: 'locked' });
      continue;
    }
    const open = edgeUsable(e, run, run.at);
    out.push({ node: to, open, why: open ? undefined : e.gate });
  }
  return out;
}

// ───────────────────────── tìm hiểu bản đồ (sương mù) ─────────────────────────
export function visibleSet(g: PGraph, run: PrincessRun): Set<number> {
  const radius = 1 + Math.floor(run.alloc[2] / 3) + (run.items.includes('map') ? 2 : 0);
  const known = princessKnown(run);
  const vis = new Set<number>();
  const adj = (a: number) => g.edges.filter((e) => (e.a === a || e.b === a) && !(e.oneway && e.b === a && !run.rescued)).map((e) => (e.a === a ? e.b : e.a));
  const q: [number, number][] = run.visited.concat(run.at).map((i) => [i, 0]);
  const seen = new Set<number>(q.map((x) => x[0]));
  while (q.length) {
    const [a, d] = q.shift()!;
    vis.add(a);
    if (d >= radius) continue;
    for (const b of adj(a)) if (!seen.has(b)) { seen.add(b); q.push([b, d + 1]); }
  }
  // lâu đài lộ ra khi biết vị trí công chúa; ngã ba bí mật chỉ hiện khi đủ điều kiện hoặc đã tới gần
  if (known) for (const i of [g.gate, g.hall, g.boss]) vis.add(i);
  vis.add(g.pass);
  if (run.rescued) for (const r of g.retreat) for (const i of r) vis.add(i);
  if (dungeonOpen(run)) {
    vis.add(g.dungeon);
    vis.add(g.dungeonHost);
  }
  return vis;
}

// ───────────────────────── gợi ý ─────────────────────────
export interface Hint {
  key: string;
  p?: Record<string, string | number>;
}
/** các gợi ý đã mở theo số manh mối: lối vào hầm ngục, đúng lộ, rồi lộ trên bản đồ, cuối cùng điểm yếu của boss */
export function hintsOf(g: PGraph, run: PrincessRun): Hint[] {
  const out: Hint[] = [];
  if (run.clues >= 1) out.push({ key: 'princess.hint.1' });
  if (run.clues >= 2) out.push({ key: 'princess.hint.2', p: { route: g.nodes[g.dungeonHost].route } });
  if (run.clues >= 3) out.push({ key: 'princess.hint.3' });
  if (run.clues >= 4) out.push({ key: 'princess.hint.4' });
  return out;
}

/** còn đường tiến tới nơi giải cứu không (bỏ qua các trạm đã khóa); hết đường = thất bại */
export function blockedForever(g: PGraph, run: PrincessRun): boolean {
  if (run.rescued) return false;
  const seen = new Set<number>([run.at]);
  const q = [run.at];
  while (q.length) {
    const a = q.shift()!;
    for (const e of g.edges) {
      if (e.gate === 'rescued') continue;
      let b = -1;
      if (e.a === a) b = e.b;
      else if (e.b === a && !e.oneway) b = e.a;
      if (b < 0 || seen.has(b) || run.locked.includes(b)) continue;
      seen.add(b);
      q.push(b);
    }
  }
  return !seen.has(g.boss) && !seen.has(g.dungeon);
}

// ───────────────────────── trận của một trạm ─────────────────────────
const POOL_TROOPS = ['samurai', 'spear', 'archer', 'shield', 'knight', 'crossbow', 'berserker', 'healer', 'monk', 'taoist', 'kimcang', 'hoathuong', 'elephant', 'thanluc'];
const POOL_BEASTS = ['soihoang', 'lonrung', 'gauden', 'hocnui', 'baoden', 'tegiac', 'mangxa', 'soivuong', 'nhendoc'];
const POOL_GENERALS = ['trieuvan', 'quanvu', 'truongphi', 'lubo', 'taothao', 'kieuphong', 'duongqua', 'laoquan', 'duongtien', 'natra'];
const POOL_DEF = ['spiketrap', 'wall', 'archertower', 'ballista', 'catapult'];
const POOL_RIVER = ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen'];

/** bản đồ giả để dùng lại bộ dựng trạm của Khám phá (đã tinh chỉnh độ khó bên dưới) */
const PRINCESS_MAP: ExploreMapDef = {
  n: 14, diff: 3, range: [10, 14], nodes: 20, theme: 'plains', weathers: ['sunny'], layout: 'open', icon: '👸',
  specials: [], fort: 0.2, mine: 0, boss: 'dongtrac', rules: {},
  pool: { troops: POOL_TROOPS, beasts: POOL_BEASTS, generals: POOL_GENERALS, defenses: POOL_DEF, river: POOL_RIVER },
};

/** độ khó tăng RẤT mạnh khi vào sâu: sức mạnh địch và số quân tăng theo lũy thừa của độ sâu */
export const depthPower = (depth: number) => Math.round((0.95 + 2.15 * Math.pow(depth, 1.55)) * 100) / 100;
export const depthUnits = (depth: number) => 0.7 + 1.1 * Math.pow(depth, 1.3);

const TO_NODE_TYPE: Record<PType, NodeType> = {
  city: 'city', camp: 'camp', fort: 'fortress', event: 'camp', bridge: 'special', secret: 'camp', contested: 'camp', pass: 'fortress', gate: 'fortress', hall: 'fortress', boss: 'boss', escort: 'camp', treasure: 'camp', dungeon: 'fortress',
};

/** các nút ENode giả (một nút cho mỗi trạm đánh) để gọi buildNodeStation */
function fakeGraph(nd: PNode, fate: Fate): EGraph {
  const e: ENode = { i: 0, x: nd.x, y: nd.y, type: TO_NODE_TYPE[nd.type], depth: nd.depth, bossId: nd.type === 'boss' ? PLACE_BOSS[fate.place] : undefined };
  if (nd.type === 'bridge') e.special = 'bridge';
  return { nodes: [e], edges: [], start: 0, boss: 0 };
}

export interface PrincessBattle {
  station: Station;
  rules: ExploreRules;
}

/** luật trận từ tài nguyên của lượt chơi + đặc điểm của lộ + loại trạm */
export function princessRules(run: PrincessRun, nd: PNode): ExploreRules {
  const power = 1 + 0.04 * run.alloc[0];
  const weak = run.morale < 40 ? 0.9 : 1;
  const r: ExploreRules = { startGold: 15 + Math.round(run.gold / 10), dmgMul: power * weak, hpMul: power * weak };
  // lộ: rừng (phòng thủ lợi), núi (không đặc biệt: địch mạnh hơn), sông (thủy chiến), sa mạc (quân đắt hơn)
  if (nd.route === 0) r.defHpMul = 1.2;
  if (nd.route === 3) r.costMul = 1.15;
  if (nd.type === 'escort') {
    r.flagHpMul = 0.8; // đoàn hộ tống mong manh
    r.ambush = { at: 25, n: 2 + nd.retreat! };
  }
  if (nd.type === 'contested') r.hazard = undefined;
  return r;
}

export function princessBattle(g: PGraph, run: PrincessRun, idx: number, namer: NodeNamer): PrincessBattle {
  const nd = g.nodes[idx];
  const fate = fateOf(run.seed);
  const fg = fakeGraph(nd, fate);
  const { station } = buildNodeStation(PRINCESS_MAP, fg, { cap: [] }, 0, namer);
  const castle = nd.type === 'gate' || nd.type === 'hall' || nd.type === 'boss' || nd.type === 'dungeon';
  // độ khó theo độ sâu (rất dốc)
  station.power = nd.type === 'boss' ? Math.round(depthPower(1) * 0.78 * 100) / 100 : depthPower(nd.depth) * (nd.type === 'fort' || nd.type === 'pass' ? 1.08 : 1);
  if (nd.type === 'boss' && run.clues >= 4) station.power = Math.round(station.power * 0.8 * 100) / 100; // biết điểm yếu của boss
  station.units = Math.round(station.units * depthUnits(nd.depth));
  station.flagHp = Math.round(station.flagHp * (0.8 + 0.6 * nd.depth) / 10) * 10;
  station.income = Math.round(station.income * (0.9 + 0.45 * nd.depth) * 100) / 100;
  station.theme = castle ? PLACE_THEME[fate.place] : nd.route >= 0 ? ROUTE_THEME[nd.route] : nd.type === 'escort' ? 'night' : 'castle';
  station.weather = castle ? PLACE_WEATHER[fate.place] : (['sunny', 'rain', 'fog', 'thunder'] as WeatherId[])[(idx * 7 + run.seed) % 4];
  station.river = nd.type !== 'dungeon' && (nd.route === 2 || nd.type === 'bridge') ? 1 : undefined;
  station.castle = nd.type === 'fort' || nd.type === 'pass' || castle ? true : undefined;
  if (station.river) station.castle = undefined;
  if (nd.type === 'escort') station.mod = 'quick';
  station.deck = [...new Set(station.deck)];
  if (nd.type === 'contested') {
    const kinds = ['wolf', 'spider', 'boar', 'serpent', 'centipede'] as const;
    station.lairs = [{ kind: kinds[(idx + run.seed) % kinds.length], lane: 1, at: 0.5 }];
  }
  station.chapter = 8;
  station.reward = 0;
  return { station, rules: princessRules(run, nd) };
}

// ───────────────────────── sự kiện ngẫu nhiên ─────────────────────────
export interface EventChoice {
  id: string;
  /** vàng / lương thực phải trả */
  gold?: number;
  food?: number;
  /** điều kiện hiển thị bổ sung */
  need?: 'noKey' | 'noMap';
}
export interface PEvent {
  id: 'merchant' | 'chest' | 'villagers' | 'hermit' | 'shortcut' | 'ambush' | 'rest';
  choices: EventChoice[];
}
export const EVENTS: Record<PEvent['id'], PEvent> = {
  merchant: { id: 'merchant', choices: [{ id: 'medicine', gold: 30 }, { id: 'food', gold: 15 }, { id: 'map', gold: 45, need: 'noMap' }, { id: 'leave' }] },
  chest: { id: 'chest', choices: [{ id: 'open' }, { id: 'leave' }] },
  villagers: { id: 'villagers', choices: [{ id: 'help', food: 2 }, { id: 'ignore' }] },
  hermit: { id: 'hermit', choices: [{ id: 'listen' }, { id: 'buyMap', gold: 25, need: 'noMap' }, { id: 'leave' }] },
  shortcut: { id: 'shortcut', choices: [{ id: 'follow' }] },
  ambush: { id: 'ambush', choices: [{ id: 'fight' }, { id: 'flee' }] },
  rest: { id: 'rest', choices: [{ id: 'rest', food: 1 }, { id: 'move' }] },
};

/** sự kiện của một trạm (cố định theo hạt giống) */
export function eventFor(seed: number, node: number, type?: PType): PEvent['id'] {
  if (type === 'treasure') return 'chest';
  const r = mulberry32(seed * 31 + node * 977)();
  const ids: PEvent['id'][] = ['merchant', 'chest', 'villagers', 'hermit', 'shortcut', 'ambush', 'rest'];
  return ids[Math.floor(r * ids.length)];
}

export interface EventOutcome {
  /** khóa i18n kết quả + tham số */
  msg: string;
  p?: Record<string, string | number>;
  /** kích hoạt trận phục kích (đánh ngay tại trạm) */
  ambush?: boolean;
}

export const canChoose = (run: PrincessRun, c: EventChoice) =>
  (c.gold ?? 0) <= run.gold && (c.food ?? 0) <= run.food && (c.need !== 'noMap' || !run.items.includes('map')) && (c.need !== 'noKey' || !run.items.includes('key'));

const MAX_MORALE = 100;
const heal = (run: PrincessRun, n: number) => { run.morale = Math.min(MAX_MORALE, run.morale + n); };

/** áp một lựa chọn sự kiện lên lượt chơi; trả về kết quả hiển thị */
export function resolveEvent(run: PrincessRun, g: PGraph, node: number, choice: string): EventOutcome {
  const ev = eventFor(run.seed, node, g.nodes[node].type);
  const c = EVENTS[ev].choices.find((x) => x.id === choice) ?? EVENTS[ev].choices[EVENTS[ev].choices.length - 1];
  run.gold -= c.gold ?? 0;
  run.food -= c.food ?? 0;
  const rnd = mulberry32(run.seed * 17 + node * 131 + run.turns);
  const forest = g.nodes[node].route === 0;
  switch (`${ev}:${c.id}`) {
    case 'merchant:medicine': run.items.push('medicine'); return { msg: 'princess.out.medicine' };
    case 'merchant:food': run.food += 4; return { msg: 'princess.out.food', p: { n: 4 } };
    case 'merchant:map': run.items.push('map'); return { msg: 'princess.out.map' };
    case 'chest:open': {
      const r = rnd();
      if (g.nodes[node].type === 'treasure' && r < 0.7) { const n = 60 + Math.floor(rnd() * 70); run.gold += n; run.goldFound += n; return { msg: 'princess.out.gold', p: { n } }; }
      if (r < 0.5) { const n = 25 + Math.floor(rnd() * 45); run.gold += n; run.goldFound += n; return { msg: 'princess.out.gold', p: { n } }; }
      if (r < 0.75) { run.clues++; return { msg: 'princess.out.clue', p: { n: 1 } }; }
      if (forest && !run.items.includes('key')) { run.items.push('key'); return { msg: 'princess.out.key' }; }
      run.morale = Math.max(0, run.morale - 10);
      return { msg: 'princess.out.trap', p: { n: 10 } };
    }
    case 'villagers:help': heal(run, 12); run.clues++; run.gold += 10; run.goldFound += 10; return { msg: 'princess.out.villagers' };
    case 'hermit:listen': run.clues += 2; return { msg: 'princess.out.clue', p: { n: 2 } };
    case 'hermit:buyMap': run.items.push('map'); return { msg: 'princess.out.map' };
    case 'shortcut:follow': run.secretOpen = true; run.clues++; return { msg: 'princess.out.shortcut' };
    case 'ambush:fight': return { msg: 'princess.out.ambush', ambush: true };
    case 'ambush:flee': run.morale = Math.max(0, run.morale - 12); run.food = Math.max(0, run.food - 2); return { msg: 'princess.out.flee', p: { n: 12 } };
    case 'rest:rest': heal(run, 15); return { msg: 'princess.out.rest', p: { n: 15 } };
    default: return { msg: 'princess.out.nothing' };
  }
}

// ───────────────────────── di chuyển & kết quả trận ─────────────────────────
/** mỗi bước đi tốn 1 lương thực; hết lương thì mỗi bước mất sĩ khí */
export function payStep(run: PrincessRun) {
  run.turns++;
  if (run.food > 0) run.food--;
  else run.morale = Math.max(0, run.morale - 8);
}

export function useMedicine(run: PrincessRun): boolean {
  const i = run.items.indexOf('medicine');
  if (i < 0 || run.morale >= MAX_MORALE) return false;
  run.items.splice(i, 1);
  heal(run, 25);
  return true;
}

/** thắng trận ở trạm: qua trạm, nhận vàng và có thể thêm manh mối; thua: mất sĩ khí */
export interface BattleOutcome {
  clue: boolean;
  gold: number;
  rescued: boolean;
  failed: boolean;
  /** trạm vừa bị khóa vì thua 2 lần */
  locked: boolean;
  /** số lần thua ở trạm này */
  fails: number;
  /** hết đường tiến tới công chúa */
  blocked: boolean;
}

/** trạm chốt (cửa ải, lâu đài, hầm ngục, hộ tống) không bị khóa vì thua lần hai mà mất thêm sĩ khí */
const CRITICAL: PType[] = ['pass', 'gate', 'hall', 'boss', 'dungeon', 'escort'];

/** thắng trận ở trạm: qua trạm, nhận vàng và có thể thêm manh mối; thua: mất sĩ khí, thua 2 lần thì trạm bị khóa */
export function applyBattle(run: PrincessRun, g: PGraph, node: number, win: boolean): BattleOutcome {
  const nd = g.nodes[node];
  const out: BattleOutcome = { clue: false, gold: 0, rescued: false, failed: false, locked: false, fails: 0, blocked: false };
  if (!win) {
    const n = (run.fails[node] ?? 0) + 1;
    run.fails[node] = n;
    out.fails = n;
    const critical = CRITICAL.includes(nd.type);
    run.morale = Math.max(0, run.morale - (nd.type === 'boss' ? 30 : 22) - (critical && n >= 2 ? 10 : 0));
    if (!critical && n >= 2 && !run.locked.includes(node)) {
      run.locked.push(node);
      out.locked = true;
    }
  } else {
    if (!run.visited.includes(node)) run.visited.push(node);
    run.at = node;
    out.gold = 12 + Math.floor(nd.depth * 24) + (nd.route === 3 ? 10 : 0);
    run.gold += out.gold;
    run.goldFound += out.gold;
    const r = mulberry32(run.seed * 7 + node * 101 + run.turns)();
    if (nd.type === 'camp' || nd.type === 'fort' || nd.type === 'contested') {
      if (r < (nd.route === 0 ? 0.45 : 0.3)) {
        run.clues++;
        out.clue = true;
      }
    }
    if (nd.type === 'boss' || nd.type === 'dungeon') {
      run.rescued = true;
      out.rescued = true;
    }
  }
  run.rev++;
  if (run.morale <= 0) {
    run.over = 'fail';
    out.failed = true;
  } else if (out.locked && blockedForever(g, run)) {
    run.over = 'fail';
    out.failed = true;
    out.blocked = true;
  }
  return out;
}

/** vượt qua một trạm sự kiện (đã giải quyết) */
export function finishEventNode(run: PrincessRun, node: number) {
  if (!run.visited.includes(node)) run.visited.push(node);
  run.at = node;
  run.events++;
  run.rev++;
}

/** về tới thành chính sau khi cứu được công chúa */
export function arrivedHome(g: PGraph, run: PrincessRun): boolean {
  return run.rescued && run.at === g.start;
}

// ───────────────────────── xếp hạng ─────────────────────────
export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';
export interface Summary {
  score: number;
  rank: Rank;
  parts: { speed: number; survivors: number; treasure: number; mission: number };
  coins: number;
}

export function summarize(run: PrincessRun, won: boolean): Summary {
  const speed = run.turns <= 16 ? 30 : run.turns <= 22 ? 22 : run.turns <= 30 ? 12 : 5;
  const survivors = Math.round((run.morale / START_MORALE) * 25);
  const treasure = Math.min(20, Math.round((run.goldFound / 150) * 20));
  const mission = Math.min(25, Math.min(12, run.clues * 3) + (run.items.includes('key') ? 4 : 0) + Math.min(9, Math.round(run.events * 1.5)));
  const score = won ? speed + survivors + treasure + mission : 0;
  const rank: Rank = !won ? 'D' : score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : 'C';
  const coins = won ? 600 + score * 30 : 150 + run.visited.length * 20;
  return { score, rank, parts: { speed, survivors, treasure, mission }, coins };
}

/** tướng chưa có để thưởng khi đạt hạng cao (ưu tiên tướng có thể mở khóa bằng xu) */
export function rewardGeneral(owned: Record<string, number>, seed: number): string | null {
  const pool = Object.values(UNITS).filter((u) => u.kind === 'general' && u.unlockCost > 0 && !owned[u.id]).map((u) => u.id);
  if (!pool.length) return null;
  return pool[Math.floor(mulberry32(seed + 5)() * pool.length)];
}

export type { NodeType };
