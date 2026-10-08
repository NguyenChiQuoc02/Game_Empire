import { SKILL_CD, UNITS, levelMul, skillHaste, type SkillId, type UnitDef } from '../data/units';
import { GS, GENERAL_SKILLS, extraSkillsAt, type GSkillId } from '../data/gskills';
import {
  HUNT_CAMP_BOUNTY, HUNT_CAMP_MOBS, HUNT_CAMP_RESPAWN, HUNT_CARRY_SLOW, HUNT_CARRY_TROOPS, HUNT_CASTLE_HP, HUNT_CELL, HUNT_CENTER,
  HUNT_DEFENSE_CAP, HUNT_DEFENSE_ZONE, HUNT_GOLD_CAP, HUNT_GUARDIAN_DMG, HUNT_GUARDIAN_HP, HUNT_INCOME, HUNT_METEOR, HUNT_N, HUNT_POINT_GOLD,
  HUNT_POINT_R, HUNT_SIZE, HUNT_START_GOLD, HUNT_STORM_AT, HUNT_STORM_END, HUNT_TEAM_STYLE, HUNT_UNIT_CAP, HUNT_ZONE, TERRAIN, TR, alliances, buildHuntMap,
  teamSlots, terrainAt,
  type HuntMap, type HuntSetup,
} from '../data/treasure';

// ───────────────────────── kiểu dữ liệu ─────────────────────────

export type HStance = 'guard' | 'rally' | 'treasure';

interface HBuff {
  stat: 'dmg' | 'speed' | 'armor' | 'rate';
  mul: number;
  t: number;
}

export interface HUnit {
  uid: number;
  def: UnitDef;
  /** -1 = quái trung lập */
  team: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dmg: number;
  armor: number;
  speed: number;
  range: number;
  cd: number;
  pow: number;
  rad: number;
  alive: boolean;
  deadT: number;
  vanish: boolean;
  /** công trình đứng yên (thành, đồ phòng thủ) */
  isStatic: boolean;
  isCastle: boolean;
  atkT: number;
  attackAnim: number;
  hitFlash: number;
  invuln: number;
  /** hướng nhìn: 1 = phải, -1 = trái */
  face: 1 | -1;
  moving: boolean;
  target: number;
  tgtT: number;
  attacks: number;
  travelled: number;
  firstHit: boolean;
  timers: Record<string, number>;
  buffs: HBuff[];
  stunT: number;
  shield: number;
  poison: { dps: number; t: number; acc: number; team: number } | null;
  haste: number;
  burrowT: number;
  ghost: boolean;
  life: number;
  owner: number;
  noBounty: boolean;
  bounty: number;
  revived: boolean;
  fly: boolean;
  carrying: boolean;
  carrySpeed: number;
  gs: GSkillId[];
  pierceAdd: number;
  lifesteal: number;
  reflectAdd: number;
  hpRate: number;
  dodge: number;
  /** quái trung lập: điểm xuất phát và trại */
  home: { x: number; y: number } | null;
  camp: number;
  guardian: boolean;
  enraged: boolean;
  zOff: number;
  /** nhịp cầu (chỉ số trong map.bridges) nếu đây là công trình cầu, ngược lại −1 */
  bridge: number;
}

export interface HTeam {
  id: number;
  slot: number;
  group: number;
  name: string;
  color: number;
  castle: { x: number; y: number };
  castleUid: number;
  gold: number;
  income: number;
  alive: boolean;
  ai: boolean;
  stance: HStance;
  rally: { x: number; y: number };
  pow: number;
  generalCap: number;
  kills: number;
  deployed: number;
  /** các id thẻ có thể triển khai */
  deck: string[];
  levels: Record<string, number>;
  /** vàng/giây cộng thêm từ điểm kiểm soát */
  bonus: number;
  /** đội đã chạm kho báu */
  carried: boolean;
  /** tên phe phái (đội máy) */
  faction: string;
}

export type HFx =
  | 'fire' | 'heal' | 'bolt' | 'poison' | 'stun' | 'blink' | 'burrow' | 'dash' | 'shield' | 'boom' | 'warcry' | 'sweep' | 'rock' | 'palm' | 'melody' | 'summon' | 'thorns' | 'frost';

export type HEvent =
  | { t: 'hit'; x: number; y: number; amount: number; team: number; big: boolean }
  | { t: 'proj'; x0: number; y0: number; x1: number; y1: number; kind: 'arrow' | 'rock' | 'magic' | 'fire' | 'needle' }
  | { t: 'aoe'; x: number; y: number; r: number; color: number }
  | { t: 'fx'; kind: HFx; x: number; y: number; r?: number; x2?: number; y2?: number }
  | { t: 'text'; x: number; y: number; key: string; color: number; big?: boolean; p?: Record<string, string | number> }
  | { t: 'death'; x: number; y: number; big: boolean }
  | { t: 'spawn'; x: number; y: number; team: number }
  | { t: 'shake'; power: number }
  | { t: 'bounty'; team: number; x: number; y: number; amount: number }
  | { t: 'castleDown'; team: number }
  | { t: 'treasure'; kind: 'free' | 'picked' | 'dropped' | 'delivered'; team: number }
  | { t: 'guardianDown' }
  | { t: 'storm' }
  | { t: 'terrain'; cells: number[] }
  | { t: 'meteor'; x: number; y: number; r: number; warn: number }
  | { t: 'point'; i: number; owner: number }
  | { t: 'bridgeDown'; x: number; y: number }
  | { t: 'zone' }
  | { t: 'unlock'; i: number }
  | { t: 'end'; group: number };

export interface Treasure {
  /** vị trí gốc (nơi kho báu xuất hiện) */
  spotX: number;
  spotY: number;
  state: 'locked' | 'ground' | 'carried' | 'delivered';
  x: number;
  y: number;
  carriers: number[];
  team: number;
  need: number;
  /** thời điểm (giây) có thể nhặt lại sau khi rơi */
  freeAt: number;
}

export interface HuntConfig {
  setup: HuntSetup;
  /** cấp thẻ của người chơi */
  levels: Record<string, number>;
  /** bộ bài của người chơi (đã gồm lính, tướng, thú, công trình) */
  deck: string[];
  generalCap: number;
  flagLevel?: number;
  incomeMul?: number;
  seed?: number;
}

export const CASTLE_DEF: UnitDef = {
  id: 'castle', name: 'Thành', kind: 'defense', cost: 0, hp: HUNT_CASTLE_HP, dmg: 26, cd: 0.9, speed: 0, range: 290, armor: 18,
  skill: 'tower', skillName: 'Thành Trì', desc: '', unlockCost: 0, scale: 2.2,
};

export const BRIDGE_DEF: UnitDef = {
  id: 'bridge', name: 'Cầu', kind: 'defense', cost: 0, hp: 1400, dmg: 0, cd: 1, speed: 0, range: 0, armor: 8,
  skill: 'wall', skillName: 'Cầu', desc: '', unlockCost: 0, scale: 1.2,
};

const hash = (n: number) => {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15;
  return (x % 10000) / 10000;
};

// ───────────────────────── mô phỏng ─────────────────────────

export class Hunt {
  readonly map: HuntMap;
  /** lưới địa hình của ván này (có thể đổi: dung nham, cầu sập) */
  grid: Uint8Array;
  teams: HTeam[] = [];
  units: HUnit[] = [];
  treasures: Treasure[] = [];
  /** điểm kiểm soát (bản đồ đô thị): owner = nhóm liên minh đang giữ, prog = độ vững 0..1 */
  points: { x: number; y: number; owner: number; prog: number }[] = [];
  /** bán kính vùng an toàn hiện tại (Infinity = chưa thu hẹp) */
  zoneR = Infinity;
  private zoneStart = -1;
  private lavaR: number[] = [];
  private lavaT = 0;
  private meteorT = 0;
  private meteors: { x: number; y: number; t: number }[] = [];
  events: HEvent[] = [];
  time = 0;
  over = false;
  winnerGroup = -1;
  /** đội mang kho báu về thành (-1 = chưa ai) */
  deliveredBy = -1;
  guardian: HUnit | null = null;
  stormOn = false;
  private nextUid = 1;
  private byUid = new Map<number, HUnit>();
  private tickN = 0;
  private buckets = new Map<number, HUnit[]>();
  private fields = new Map<number, { d: Float32Array; t: number }>();
  private campT: number[] = [];
  private rngState: number;

  constructor(public cfg: HuntConfig) {
    this.map = buildHuntMap(cfg.setup.map);
    this.grid = Uint8Array.from(buildHuntMap(cfg.setup.map).grid);
    this.rngState = (cfg.seed ?? Math.floor(Math.random() * 1e9)) >>> 0;
    this.buildTeams();
    for (const t of this.teams) this.spawnCastle(t);
    this.spawnCamps();
    this.spawnGuardian();
    this.spawnStructures();
    this.treasures = this.map.treasures.map((p) => ({ spotX: p.x, spotY: p.y, state: 'locked', x: p.x, y: p.y, carriers: [], team: -1, need: 1, freeAt: 0 }));
    this.points = this.map.points.map((p) => ({ x: p.x, y: p.y, owner: -1, prog: 0 }));
    this.lavaR = this.map.lava.map((l) => l.r0);
  }

  // ── bộ ngẫu nhiên có hạt giống (kết quả trận có thể tái lập khi cần kiểm thử)
  rand(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
    let t = this.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private emit(e: HEvent) {
    this.events.push(e);
  }

  // ───────────────────────── khởi tạo ─────────────────────────

  private buildTeams() {
    const { setup } = this.cfg;
    const slots = teamSlots(setup.teams);
    const groups = alliances(setup.teams, setup.alliance);
    const diffPow = [0.9, 1.15, 1.5][setup.difficulty];
    const diffInc = [0.85, 1, 1.25][setup.difficulty];
    for (let i = 0; i < setup.teams; i++) {
      const slot = slots[i];
      const castle = this.map.castles[slot];
      const me = i === 0;
      // đội địch trong thế 1 chọi 2/3 mạnh hơn một chút để cân bằng
      const outnumbered = !me && (setup.alliance === '3v1' || setup.alliance === '2v1') && groups[i] !== groups[0] ? (setup.alliance === '3v1' ? 1.3 : 1.12) : 1;
      this.teams.push({
        id: i, slot, group: groups[i],
        name: HUNT_TEAM_STYLE[i].name,
        color: HUNT_TEAM_STYLE[i].color,
        castle: { x: castle.x, y: castle.y }, castleUid: 0,
        gold: HUNT_START_GOLD, income: HUNT_INCOME * (me ? (this.cfg.incomeMul ?? 1) : diffInc * outnumbered),
        alive: true, ai: !me, stance: 'guard', rally: { x: HUNT_CENTER, y: HUNT_CENTER },
        pow: me ? 1 : diffPow * outnumbered, generalCap: me ? this.cfg.generalCap : 2,
        kills: 0, deployed: 0, deck: me ? [...this.cfg.deck] : [], levels: me ? this.cfg.levels : {}, bonus: 0, carried: false, faction: '',
      });
    }
  }

  private spawnCastle(t: HTeam) {
    const flag = t.ai ? 1 : 1 + 0.12 * (this.cfg.flagLevel ?? 0);
    const u = this.spawn(CASTLE_DEF, t.id, t.castle.x, t.castle.y, { hp: HUNT_CASTLE_HP * flag, pow: 1 });
    u.isCastle = true;
    u.rad = 58;
    t.castleUid = u.uid;
  }

  private spawnCamps() {
    this.map.camps.forEach((_, i) => {
      this.campT[i] = 0;
      this.fillCamp(i);
    });
  }

  private fillCamp(i: number) {
    const c = this.map.camps[i];
    const pool = HUNT_CAMP_MOBS[c.tier];
    const n = c.tier === 0 ? 3 : 2;
    const pow = c.tier === 0 ? 1.15 : 1.7;
    for (let k = 0; k < n; k++) {
      const def = UNITS[pool[Math.floor(this.rand() * pool.length)]];
      const a = (k / n) * Math.PI * 2 + this.rand();
      const x = c.x + Math.cos(a) * 34;
      const y = c.y + Math.sin(a) * 34;
      const u = this.spawn(def, -1, x, y, { pow });
      u.home = { x: c.x, y: c.y };
      u.camp = i;
      u.bounty = HUNT_CAMP_BOUNTY[c.tier] + def.cost * 0.6;
    }
  }

  private spawnGuardian() {
    const gd = UNITS[this.map.def.guardian];
    const diff = [0.85, 1, 1.25][this.cfg.setup.difficulty];
    const nTeams = this.teams.length;
    const at = this.map.guardianAt;
    const u = this.spawn(gd, -1, at.x, at.y, { pow: 1, hp: gd.hp * HUNT_GUARDIAN_HP * diff * this.map.def.guardianMul * (nTeams === 4 ? 1.1 : 1), dmg: gd.dmg * HUNT_GUARDIAN_DMG });
    u.guardian = true;
    u.home = { x: at.x, y: at.y };
    u.rad = 30;
    u.bounty = 160;
    u.armor = gd.armor + 6;
    this.guardian = u;
    // hai thân vệ canh hai bên
    for (const sgn of [-1, 1]) {
      const def = UNITS[sgn < 0 ? 'hocnui' : 'gauden'];
      const g = this.spawn(def, -1, at.x + sgn * 70, at.y + 40, { pow: 2 });
      g.home = { x: at.x + sgn * 70, y: at.y + 40 };
      g.bounty = 45;
    }
  }

  /** cầu có thể bị phá, tháp canh cổ và trại quái ở thành bỏ trống */
  private spawnStructures() {
    this.map.bridges.forEach((b, i) => {
      const u = this.spawn(BRIDGE_DEF, -1, b.x, b.y, { pow: 1 });
      u.bridge = i;
      u.rad = 22;
      u.noBounty = true;
    });
    for (const tw of this.map.towers) {
      const u = this.spawn(UNITS.archertower, -1, tw.x, tw.y, { pow: 1.8 });
      u.noBounty = true;
    }
    // thành bỏ trống (chơi 3 đội): một trại quái mạnh chiếm chỗ
    for (let slot = this.teams.length; slot < 4; slot++) {
      const c = this.map.castles[slot];
      for (let k = 0; k < 3; k++) {
        const def = UNITS[HUNT_CAMP_MOBS[1][k % HUNT_CAMP_MOBS[1].length]];
        const a = (k / 3) * Math.PI * 2;
        const m = this.spawn(def, -1, c.x + Math.cos(a) * 46, c.y + Math.sin(a) * 46, { pow: 1.9 });
        m.home = { x: c.x, y: c.y };
        m.bounty = 55;
      }
    }
  }

  spawn(def: UnitDef, team: number, x: number, y: number, o: { pow?: number; hp?: number; dmg?: number; life?: number; owner?: number; noBounty?: boolean } = {}): HUnit {
    const t = team >= 0 ? this.teams[team] : null;
    const pow = o.pow ?? (t ? (t.ai ? t.pow : levelMul(t.levels[def.id] ?? 1)) : 1);
    const hp = o.hp ?? def.hp * pow;
    const isStatic = def.kind === 'defense';
    const fly = !!def.tags?.includes('fly');
    const range = def.range > 70 ? def.range : def.range;
    const u: HUnit = {
      uid: this.nextUid++, def, team, x, y, hp, maxHp: hp,
      dmg: o.dmg ?? def.dmg * pow, armor: def.armor, speed: def.speed, range, cd: def.cd, pow,
      rad: Math.max(8, 10 * def.scale), alive: true, deadT: 0, vanish: false, isStatic, isCastle: false,
      atkT: 0.3 + this.rand() * 0.4, attackAnim: 0, hitFlash: 0, invuln: 0, face: team === 1 ? -1 : 1, moving: false,
      target: 0, tgtT: this.rand() * 0.4, attacks: 0, travelled: 0, firstHit: true,
      timers: {}, buffs: [], stunT: 0, shield: 0, poison: null,
      haste: t && !t.ai && !o.owner && !o.life ? skillHaste(t.levels[def.id] ?? 1) : 1,
      burrowT: 0, ghost: !!def.tags?.includes('ghost'),
      life: o.life ?? def.life ?? Infinity, owner: o.owner ?? 0, noBounty: !!o.noBounty || isStatic,
      bounty: 0, revived: false, fly, carrying: false, carrySpeed: 0,
      gs: [], pierceAdd: 0, lifesteal: 0, reflectAdd: 0, hpRate: 0, dodge: 0,
      home: null, camp: -1, guardian: false, enraged: false, zOff: this.rand() * 2 - 1, bridge: -1,
    };
    const init = SKILL_CD[def.skill];
    if (init !== undefined) u.timers[def.skill] = init * (0.35 + this.rand() * 0.3);
    if (def.skill2 && SKILL_CD[def.skill2] !== undefined) u.timers[def.skill2] = SKILL_CD[def.skill2]! * (0.35 + this.rand() * 0.3);
    if (def.kind === 'general' && o.hp === undefined && t) this.applyGs(u, t);
    this.units.push(u);
    this.byUid.set(u.uid, u);
    this.emit({ t: 'spawn', x, y, team });
    return u;
  }

  /** kỹ năng bị động của tướng (theo cấp thẻ của người chơi / độ khó của đội máy) */
  private applyGs(u: HUnit, t: HTeam) {
    const id = u.def.id;
    u.gs = t.ai ? (GENERAL_SKILLS[id] ?? []).slice(0, [1, 2, 3][this.cfg.setup.difficulty]) : extraSkillsAt(id, t.levels[id] ?? 1);
    for (const k of u.gs) {
      switch (k) {
        case 'ironSkin': u.maxHp *= 1 + GS.ironSkin.hp; u.hp = u.maxHp; u.armor += GS.ironSkin.armor; break;
        case 'fury': u.dmg *= 1 + GS.fury.dmg; break;
        case 'swift': u.speed *= 1 + GS.swift.speed; u.dodge += GS.swift.dodge; break;
        case 'regen': u.hpRate += GS.regen.rate; break;
        case 'keen': u.pierceAdd = Math.max(u.pierceAdd, GS.keen.pierce); break;
        case 'lifesteal': u.lifesteal += GS.lifesteal.pct; break;
        case 'thornsAura': u.reflectAdd += GS.thornsAura.reflect; break;
        case 'rapid': u.cd /= 1 + GS.rapid.rate; break;
        default: break;
      }
    }
  }

  get(uid: number): HUnit | undefined {
    return this.byUid.get(uid);
  }

  // ───────────────────────── tiện ích ─────────────────────────

  hostile(a: number, b: number): boolean {
    if (a === b) return false;
    if (a < 0 || b < 0) return true;
    return this.teams[a].group !== this.teams[b].group;
  }

  private has(u: HUnit, s: SkillId) {
    return u.def.skill === s || u.def.skill2 === s;
  }

  private mod(u: HUnit, stat: HBuff['stat']): number {
    let m = 1;
    for (const b of u.buffs) if (b.stat === stat) m *= b.mul;
    return m;
  }

  private addBuff(u: HUnit, stat: HBuff['stat'], mul: number, t: number) {
    const ex = u.buffs.find((b) => b.stat === stat && b.mul === mul);
    if (ex) ex.t = Math.max(ex.t, t);
    else u.buffs.push({ stat, mul, t });
  }

  /** quái bay: chỉ tướng, quân tầm xa (trừ kỵ binh) và công trình bắn xa mới đánh trúng */
  private canHit(a: HUnit | null, v: HUnit): boolean {
    if (!a || !v.fly) return true;
    if (a.def.kind === 'general') return true;
    if (a.def.tags?.includes('cav')) return false;
    if (a.def.kind === 'defense') return ['tower', 'ballista', 'catapult'].includes(a.def.skill);
    return a.range > 70;
  }

  private dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private cellOf(x: number, y: number) {
    const cx = Math.max(0, Math.min(HUNT_N - 1, Math.floor(x / HUNT_CELL)));
    const cy = Math.max(0, Math.min(HUNT_N - 1, Math.floor(y / HUNT_CELL)));
    return cy * HUNT_N + cx;
  }

  private blockedAt(x: number, y: number) {
    if (x < 8 || y < 8 || x > HUNT_SIZE - 8 || y > HUNT_SIZE - 8) return true;
    return TERRAIN[this.grid[this.cellOf(x, y)]].block;
  }

  /** đường thẳng từ (x0,y0) tới (x1,y1) không vướng ô chặn */
  clearLine(x0: number, y0: number, x1: number, y1: number): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.min(60, Math.ceil(d / 14));
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (this.blockedAt(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false;
    }
    return true;
  }

  private heapK = new Float32Array(HUNT_N * HUNT_N * 9);
  private heapV = new Int32Array(HUNT_N * HUNT_N * 9);
  private fieldBudget = 6;

  /** trường khoảng cách (Dijkstra) tới một ô, cache theo ô đích (gom theo khối 3x3 ô để nhiều quân dùng chung) */
  private field(target: number): Float32Array | null {
    const N = HUNT_N;
    // gom đích về giữa khối 3x3 (nếu ô đó đi được)
    const bx = Math.min(N - 2, Math.max(1, Math.floor((target % N) / 3) * 3 + 1));
    const by = Math.min(N - 2, Math.max(1, Math.floor(((target / N) | 0) / 3) * 3 + 1));
    const q = by * N + bx;
    const key = TERRAIN[this.grid[q]].block ? target : q;
    const hit = this.fields.get(key);
    if (hit && this.time - hit.t < 3) return hit.d;
    // hết ngân sách tính trong khung này: dùng trường cũ gần nhất nếu có
    if (this.fieldBudget <= 0) {
      if (hit) return hit.d;
      let best: Float32Array | null = null;
      let bd = 7;
      for (const [k, v] of this.fields) {
        const d = Math.hypot((k % N) - (key % N), ((k / N) | 0) - ((key / N) | 0));
        if (d < bd) {
          bd = d;
          best = v.d;
        }
      }
      return best;
    }
    this.fieldBudget--;
    const d = new Float32Array(N * N).fill(Infinity);
    const hk = this.heapK;
    const hv = this.heapV;
    let hn = 0;
    const push = (k: number, v: number) => {
      let i = hn++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (hk[p] <= k) break;
        hk[i] = hk[p];
        hv[i] = hv[p];
        i = p;
      }
      hk[i] = k;
      hv[i] = v;
    };
    d[key] = 0;
    push(0, key);
    const grid = this.grid;
    while (hn > 0) {
      const dd = hk[0];
      const c = hv[0];
      // pop
      hn--;
      if (hn > 0) {
        const lk = hk[hn];
        const lv = hv[hn];
        let i = 0;
        for (;;) {
          let m = i * 2 + 1;
          if (m >= hn) break;
          if (m + 1 < hn && hk[m + 1] < hk[m]) m++;
          if (hk[m] >= lk) break;
          hk[i] = hk[m];
          hv[i] = hv[m];
          i = m;
        }
        hk[i] = lk;
        hv[i] = lv;
      }
      if (dd > d[c]) continue;
      const cx = c % N;
      const cy = (c / N) | 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = cx + ox;
          const ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const info = TERRAIN[grid[ny * N + nx]];
          if (info.block) continue;
          if (ox && oy && (TERRAIN[grid[cy * N + nx]].block || TERRAIN[grid[ny * N + cx]].block)) continue;
          const nd = dd + (ox && oy ? 1.414 : 1) / info.speed;
          if (nd < d[ny * N + nx]) {
            d[ny * N + nx] = nd;
            push(nd, ny * N + nx);
          }
        }
      }
    }
    if (this.fields.size > 64) {
      let oldest = -1;
      let ot = Infinity;
      for (const [k, v] of this.fields) if (v.t < ot) { ot = v.t; oldest = k; }
      this.fields.delete(oldest);
    }
    this.fields.set(key, { d, t: this.time });
    return d;
  }

  /** hướng đi tới đích: thẳng nếu thông, ngược lại theo trường khoảng cách */
  private waypoint(u: HUnit, tx: number, ty: number): { x: number; y: number } {
    if (u.fly || u.ghost || this.clearLine(u.x, u.y, tx, ty)) return { x: tx, y: ty };
    const N = HUNT_N;
    const f = this.field(this.cellOf(tx, ty));
    if (!f) return { x: tx, y: ty };
    const c = this.cellOf(u.x, u.y);
    const cx = c % N;
    const cy = (c / N) | 0;
    let best = f[c];
    let bx = tx;
    let by = ty;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = cx + ox;
        const ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const v = f[ny * N + nx];
        if (v < best) {
          best = v;
          bx = (nx + 0.5) * HUNT_CELL;
          by = (ny + 0.5) * HUNT_CELL;
        }
      }
    }
    return { x: bx, y: by };
  }

  private speedHere(u: HUnit): number {
    if (u.fly) return 1;
    const tr = this.grid[this.cellOf(u.x, u.y)];
    if (tr === TR.FOREST && this.has(u, 'ninja')) return 1.05;
    return TERRAIN[tr].speed || 0.6;
  }

  private moveTo(u: HUnit, tx: number, ty: number, dt: number, speed: number): void {
    const wp = this.waypoint(u, tx, ty);
    const dx = wp.x - u.x;
    const dy = wp.y - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const sp = speed * this.speedHere(u) * dt;
    const step = Math.min(sp, d);
    const nx = u.x + (dx / d) * step;
    const ny = u.y + (dy / d) * step;
    if (u.fly || !this.blockedAt(nx, ny)) {
      u.x = nx;
      u.y = ny;
    } else if (!this.blockedAt(nx, u.y)) u.x = nx;
    else if (!this.blockedAt(u.x, ny)) u.y = ny;
    else return;
    u.travelled += step;
    u.moving = true;
    if (Math.abs(dx) > 0.5) u.face = dx > 0 ? 1 : -1;
  }

  // ───────────────────────── vòng lặp ─────────────────────────

  update(dt: number) {
    if (this.over) return;
    const STEP = 1 / 30;
    while (dt > 0 && !this.over) {
      const h = Math.min(dt, STEP);
      this.step(h);
      dt -= h;
    }
  }

  private step(dt: number) {
    this.time += dt;
    this.tickN++;
    this.fieldBudget = 6;
    for (const t of this.teams) {
      if (t.alive) t.gold = Math.min(HUNT_GOLD_CAP, t.gold + (t.income + t.bonus) * dt);
    }
    if (!this.stormOn && this.time >= HUNT_STORM_AT) {
      this.stormOn = true;
      this.emit({ t: 'storm' });
    }
    // phân vùng để tách quân
    this.buckets.clear();
    for (const u of this.units) {
      if (!u.alive || u.ghost) continue;
      const k = Math.floor(u.x / 56) * 100 + Math.floor(u.y / 56);
      let b = this.buckets.get(k);
      if (!b) this.buckets.set(k, (b = []));
      b.push(u);
    }
    for (const u of this.units.slice()) {
      if (u.alive) this.stepUnit(u, dt);
      else u.deadT -= dt;
    }
    this.separate(dt);
    this.treasureTick(dt);
    this.worldTick(dt);
    // trại quái hồi sinh
    this.map.camps.forEach((_, i) => {
      if (this.campT[i] > 0) {
        this.campT[i] -= dt;
        if (this.campT[i] <= 0) this.fillCamp(i);
      }
    });
    this.units = this.units.filter((u) => {
      const keep = u.alive || u.deadT > 0;
      if (!keep) this.byUid.delete(u.uid);
      return keep;
    });
    this.checkEnd();
  }

  private separate(dt: number) {
    for (const u of this.units) {
      if (!u.alive || u.isStatic || u.ghost || u.burrowT > 0 || u.carrying) continue;
      const bx = Math.floor(u.x / 56);
      const by = Math.floor(u.y / 56);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const b = this.buckets.get((bx + ox) * 100 + by + oy);
          if (!b) continue;
          for (const v of b) {
            if (v === u || !v.alive) continue;
            const dx = u.x - v.x;
            const dy = u.y - v.y;
            const d = Math.hypot(dx, dy) || 0.01;
            const min = (u.rad + v.rad) * 0.8;
            if (d >= min) continue;
            const push = Math.min(min - d, 30 * dt * 2.5) * (v.isStatic ? 1 : 0.5);
            const nx = u.x + (dx / d) * push;
            const ny = u.y + (dy / d) * push;
            if (u.fly || !this.blockedAt(nx, ny)) {
              u.x = nx;
              u.y = ny;
            }
          }
        }
      }
    }
  }

  // ───────────────────────── hành vi quân ─────────────────────────

  private stepUnit(u: HUnit, dt: number) {
    u.atkT -= dt;
    u.attackAnim = Math.max(0, u.attackAnim - dt);
    u.hitFlash = Math.max(0, u.hitFlash - dt);
    u.invuln = Math.max(0, u.invuln - dt);
    u.moving = false;
    // trạng thái
    if (u.buffs.length) {
      for (const b of u.buffs) b.t -= dt;
      u.buffs = u.buffs.filter((b) => b.t > 0);
    }
    if (u.poison) {
      u.poison.t -= dt;
      u.poison.acc += dt;
      if (u.poison.acc >= 0.5) {
        u.poison.acc -= 0.5;
        this.hurt(u, u.poison.dps * 0.5, null, { aoe: true, pierce: 1, dot: true, creditTeam: u.poison.team });
        if (!u.alive) return;
      }
      if (u.poison && u.poison.t <= 0) u.poison = null;
    }
    if (u.life !== Infinity) {
      u.life -= dt;
      if (u.life <= 0) {
        u.alive = false;
        u.deadT = 0.4;
        u.vanish = true;
        this.emit({ t: 'death', x: u.x, y: u.y, big: false });
        return;
      }
    }
    const info = TERRAIN[this.grid[this.cellOf(u.x, u.y)]];
    const heal = (u.hpRate + (info.heal ?? 0)) * u.maxHp;
    if (heal > 0 && u.hp < u.maxHp && !u.isStatic) u.hp = Math.min(u.maxHp, u.hp + heal * dt);
    // bão táp: bào mòn thành
    if (u.isCastle && this.stormOn && u.hp > u.maxHp * 0.12) this.tickDamage(u, 'storm', dt, 35);
    if (!u.isStatic && !u.fly && !u.ghost && this.blockedAt(u.x, u.y)) this.escapeBlocked(u, dt);
    if (!u.alive) return;
    if (u.stunT > 0) {
      u.stunT -= dt;
      return;
    }
    // thành của đội đã bị diệt
    if (u.team >= 0 && !this.teams[u.team].alive && !u.isCastle) {
      u.alive = false;
      u.vanish = true;
      u.deadT = 0.8 + this.rand() * 1.2;
      return;
    }
    if (u.isStatic) return void this.staticStep(u, dt);
    if (u.burrowT > 0) return void this.burrowStep(u, dt);

    this.castSkills(u, dt * u.haste);
    if (!u.alive || u.burrowT > 0) return;

    const sp = (u.carrying ? u.carrySpeed : u.speed * this.mod(u, 'speed')) * (u.poison ? 1 : 1);
    // người khiêng kho báu: chỉ đi về thành
    if (u.carrying) {
      const home = this.homeCastleFor(u.team, u.x, u.y);
      if (home) this.moveTo(u, home.x, home.y, dt, sp);
      return;
    }

    // chọn mục tiêu
    u.tgtT -= dt;
    let tgt = u.target ? this.byUid.get(u.target) : undefined;
    if (tgt && (!tgt.alive || tgt.ghost || tgt.burrowT > 0 || !this.canHit(u, tgt))) tgt = undefined;
    if (!tgt || u.tgtT <= 0) {
      u.tgtT = 0.35 + this.rand() * 0.15;
      tgt = this.pickTarget(u) ?? undefined;
      u.target = tgt ? tgt.uid : 0;
    }

    // hỗ trợ (chữa lành): đi theo đồng đội, không đánh
    if (this.has(u, 'heal') && u.def.kind !== 'defense') return void this.supportMove(u, dt, sp);

    // quái trung lập: không đuổi quá xa trại
    if (u.team < 0 && u.home) {
      const dh = this.dist(u, u.home);
      if (!tgt || dh > (u.guardian ? 420 : 300)) {
        if (dh > 12) {
          this.moveTo(u, u.home.x, u.home.y, dt, u.speed * 1.2);
          if (dh > 60) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.1 * dt);
        }
        if (dh > (u.guardian ? 420 : 300)) {
          u.target = 0;
          return;
        }
        if (!tgt) return;
      }
    }

    if (tgt) {
      const reach = this.reachOf(u) + tgt.rad;
      const d = this.dist(u, tgt);
      if (Math.abs(tgt.x - u.x) > 0.5) u.face = tgt.x > u.x ? 1 : -1;
      if (d <= reach) {
        if (u.atkT <= 0) this.attack(u, tgt);
      } else {
        this.moveTo(u, tgt.x, tgt.y, dt, sp);
      }
      return;
    }
    // không có mục tiêu: theo lệnh của đội
    if (u.team >= 0) {
      const p = this.orderPoint(u);
      if (p && this.dist(u, p) > 18) this.moveTo(u, p.x, p.y, dt, sp);
    }
  }

  private reachOf(u: HUnit): number {
    let r = u.range;
    if (!u.fly) r *= TERRAIN[this.grid[this.cellOf(u.x, u.y)]].range ?? 1;
    return r + 8;
  }

  private supportMove(u: HUnit, dt: number, sp: number) {
    let best: HUnit | null = null;
    let bd = 360;
    for (const a of this.units) {
      if (!a.alive || a.team !== u.team || a === u || a.isStatic || this.has(a, 'heal')) continue;
      const d = this.dist(u, a) - (a.hp < a.maxHp ? 60 : 0);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    if (best) {
      if (this.dist(u, best) > 70) this.moveTo(u, best.x, best.y, dt, sp);
      return;
    }
    const p = this.orderPoint(u);
    if (p && this.dist(u, p) > 40) this.moveTo(u, p.x, p.y, dt, sp);
  }

  /** gần nhất trong số thành còn sống của liên minh */
  private homeCastleFor(team: number, x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const t of this.teams) {
      if (!t.alive || t.group !== this.teams[team].group) continue;
      const d = Math.hypot(t.castle.x - x, t.castle.y - y);
      if (d < bd) {
        bd = d;
        best = t.castle;
      }
    }
    return best;
  }

  /** điểm quân đứng chờ / hướng tới theo lệnh của đội */
  orderPoint(u: HUnit): { x: number; y: number } | null {
    const t = this.teams[u.team];
    const k = u.uid * 7.31;
    const jitter = (r: number) => ({ x: Math.cos(k) * r * hash(u.uid + 3), y: Math.sin(k) * r * hash(u.uid + 5) });
    if (t.stance === 'guard') {
      const dx = HUNT_CENTER - t.castle.x;
      const dy = HUNT_CENTER - t.castle.y;
      const d = Math.hypot(dx, dy) || 1;
      const j = jitter(110);
      return { x: t.castle.x + (dx / d) * 170 + j.x, y: t.castle.y + (dy / d) * 170 + j.y };
    }
    if (t.stance === 'rally') {
      const j = jitter(70);
      return { x: t.rally.x + j.x, y: t.rally.y + j.y };
    }
    // treasure: hộ tống người khiêng của mình / đuổi người khiêng của địch / đánh quái canh / nhặt kho báu
    const lead = (x: Treasure) => {
      const c = x.carriers.length ? this.byUid.get(x.carriers[0]) : undefined;
      return c ? { x: c.x, y: c.y } : { x: x.x, y: x.y };
    };
    const carried = this.treasures.filter((x) => x.state === 'carried');
    const mine = carried.find((x) => this.teams[x.team].group === t.group);
    if (mine) {
      const pm = lead(mine);
      const jm = jitter(80);
      return { x: pm.x + jm.x, y: pm.y + jm.y };
    }
    let near: { x: number; y: number } | null = null;
    let nd = Infinity;
    for (const x of carried) {
      const pf = lead(x);
      const d = this.dist(u, pf);
      if (d < nd) { nd = d; near = pf; }
    }
    if (near) return near;
    if (this.guardian && this.guardian.alive && this.treasures.some((x) => x.state === 'locked')) {
      const jg = jitter(50);
      return { x: this.guardian.x + jg.x, y: this.guardian.y + jg.y };
    }
    for (const x of this.treasures) {
      if (x.state !== 'ground') continue;
      const d = this.dist(u, x);
      if (d < nd) { nd = d; near = { x: x.x, y: x.y }; }
    }
    if (near) return near;
    const j = jitter(90);
    return { x: HUNT_CENTER + j.x, y: HUNT_CENTER + j.y };
  }

  /** bản đồ rừng: quân núp trong rừng chỉ bị thấy khi ở gần (ninja nhìn xa hơn) */
  private canSee(u: HUnit, e: HUnit, d: number): boolean {
    if (!this.map.def.stealth || e.carrying || e.fly || u.team < 0) return true;
    if (this.grid[this.cellOf(e.x, e.y)] !== TR.FOREST) return true;
    return d <= (this.has(u, 'ninja') ? 210 : 135);
  }

  /** đội `team` có đang nhìn thấy `e` không (để vẽ quân ẩn trong rừng mờ đi) */
  hiddenFrom(team: number, e: HUnit): boolean {
    if (!this.map.def.stealth || e.carrying || e.fly || e.team === team || !this.hostile(team, e.team)) return false;
    if (this.grid[this.cellOf(e.x, e.y)] !== TR.FOREST) return false;
    for (const a of this.units) if (a.alive && a.team >= 0 && !this.hostile(team, a.team) && !a.isStatic && this.dist(a, e) <= 150) return false;
    return true;
  }

  /** chọn mục tiêu: người khiêng kho báu của địch (đuổi xa) → địch gần nhất trong tầm cảnh giác */
  private pickTarget(u: HUnit): HUnit | null {
    if (u.team < 0) {
      // quái trung lập: chỉ đánh kẻ lại gần trại
      const hx = u.home?.x ?? u.x;
      const hy = u.home?.y ?? u.y;
      let best: HUnit | null = null;
      let bd = u.guardian ? 340 : 190;
      for (const e of this.units) {
        if (!e.alive || e.team < 0 || e.ghost || e.burrowT > 0 || !this.canHit(u, e) || !this.canSee(u, e, this.dist(u, e))) continue;
        const d = Math.hypot(e.x - hx, e.y - hy);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      return best;
    }
    const aggro = u.def.kind === 'defense' ? u.range : Math.max(u.range + 60, 250);
    let best: HUnit | null = null;
    let bs = Infinity;
    for (const e of this.units) {
      if (!e.alive || e === u || e.ghost || e.burrowT > 0 || e.bridge >= 0 || !this.hostile(u.team, e.team) || !this.canHit(u, e)) continue;
      const d = this.dist(u, e);
      if (!this.canSee(u, e, d)) continue;
      let score = d;
      if (e.carrying) {
        if (d > 950) continue;
        score = d - 1500;
      } else {
        if (d > aggro + (e.isCastle ? 120 : 0)) continue;
        if (e.def.kind === 'defense') score += e.isCastle ? 160 : 90;
        else if (e.def.kind === 'general') score -= 30;
        // quái trung lập chỉ bị đánh khi lại gần hoặc chặn đường
        if (e.team < 0 && !e.guardian && d > u.range + 90) continue;
      }
      if (score < bs) {
        bs = score;
        best = e;
      }
    }
    return best;
  }

  // ───────────────────────── chiến đấu ─────────────────────────

  private attack(u: HUnit, t: HUnit) {
    u.atkT = u.cd / this.mod(u, 'rate');
    u.attackAnim = 0.3;
    u.attacks++;
    const dmgMul = this.mod(u, 'dmg');
    let dmg = u.dmg * dmgMul;
    const ranged = u.range > 70;
    let pierce = u.pierceAdd;
    let big = false;
    if (this.has(u, 'bomb')) return this.explode(u);
    if (this.has(u, 'berserk')) dmg *= 1 + (1 - u.hp / u.maxHp) * 1.2;
    if (this.has(u, 'charge') && u.firstHit) {
      const m = Math.min(1 + u.travelled / 130, 4);
      dmg *= m;
      big = m > 2;
      if (m > 1.5) this.emit({ t: 'text', x: u.x, y: u.y, key: 'fx.charge', p: { m: m.toFixed(1) }, color: 0xffd34d, big: true });
    }
    if (this.has(u, 'antiCav') && t.def.tags?.includes('cav')) dmg *= 2.2;
    if (this.has(u, 'siege') && t.def.kind === 'defense') dmg *= 2.5;
    if (u.gs.includes('execute') && t.hp < t.maxHp * GS.execute.below) dmg *= GS.execute.mul;
    u.firstHit = false;
    const ang = Math.atan2(t.y - u.y, t.x - u.x);

    if (this.has(u, 'sweep') && u.attacks % 3 === 0) {
      this.emit({ t: 'text', x: u.x, y: u.y, key: 'fx.sweep', color: 0x7dffb0, big: true });
      this.emit({ t: 'fx', kind: 'sweep', x: u.x + Math.cos(ang) * 40, y: u.y + Math.sin(ang) * 40, r: 70 });
      return void this.aoeAt(u, u.x + Math.cos(ang) * 40, u.y + Math.sin(ang) * 40, 75, dmg * 1.8, { ranged: false });
    }
    if (this.has(u, 'splash')) this.aoeAt(u, t.x, t.y, 60, dmg * 0.6, { ranged: false, skip: t, quiet: true });
    if (this.has(u, 'siege') || this.has(u, 'trample')) {
      this.emit({ t: 'fx', kind: 'rock', x: t.x, y: t.y, r: 55 });
      if (this.has(u, 'siege')) this.emit({ t: 'proj', x0: u.x, y0: u.y, x1: t.x, y1: t.y, kind: 'rock' });
      return void this.aoeAt(u, t.x, t.y, 55, dmg, { ranged: this.has(u, 'siege'), quiet: true });
    }
    if (this.has(u, 'taoist')) {
      this.emit({ t: 'proj', x0: u.x, y0: u.y, x1: t.x, y1: t.y, kind: 'magic' });
      return void this.aoeAt(u, t.x, t.y, 45, dmg, { ranged: true, color: 0x9ad0ff });
    }
    if (this.has(u, 'crossbow')) pierce = Math.max(pierce, 0.5);
    if (this.has(u, 'sniper') && u.attacks % 3 === 0) {
      dmg *= 3;
      pierce = Math.max(pierce, 0.6);
      big = true;
      this.emit({ t: 'text', x: u.x, y: u.y, key: 'fx.snipe', color: 0xffd34d, big: true });
    }
    if (this.has(u, 'swordSaint')) {
      pierce = Math.max(pierce, 0.5);
      if (this.rand() < 0.2) {
        dmg *= 2.5;
        big = true;
      }
    }
    if (ranged) {
      const fire = u.fly;
      this.emit({ t: 'proj', x0: u.x, y0: u.y, x1: t.x, y1: t.y, kind: fire ? 'fire' : this.has(u, 'poisoner') || u.def.id === 'chudu' || u.def.id === 'tumayi' ? 'magic' : u.def.id === 'tieulongnu' ? 'needle' : 'arrow' });
    }
    this.hurt(t, dmg, u, { ranged, big, pierce });
    if (this.has(u, 'poisoner') && t.alive) this.applyPoison(t, 9 * u.pow, 5, u.team);
  }

  private explode(u: HUnit) {
    this.emit({ t: 'text', x: u.x, y: u.y, key: 'fx.boom', color: 0xff7a3d, big: true });
    this.emit({ t: 'shake', power: 3 });
    this.emit({ t: 'fx', kind: 'boom', x: u.x, y: u.y, r: 70 });
    this.aoeAt(u, u.x, u.y, 70, u.dmg * this.mod(u, 'dmg') * 1.4, { ranged: false, quiet: true, buildingMul: 2.5 });
    u.alive = false;
    u.hp = 0;
    u.deadT = 0.05;
    this.emit({ t: 'death', x: u.x, y: u.y, big: false });
  }

  private applyPoison(u: HUnit, dps: number, t: number, team: number) {
    if (!u.alive || u.isStatic) return;
    if (!u.poison || dps >= u.poison.dps || t > u.poison.t) u.poison = { dps: Math.max(dps, u.poison?.dps ?? 0), t: Math.max(t, u.poison?.t ?? 0), acc: u.poison?.acc ?? 0, team };
  }

  aoeAt(a: HUnit, x: number, y: number, r: number, dmg: number, o: { ranged: boolean; color?: number; skip?: HUnit; quiet?: boolean; pierce?: number; buildingMul?: number }) {
    if (!o.quiet) this.emit({ t: 'aoe', x, y, r, color: o.color ?? 0xffb36b });
    for (const e of this.units.slice()) {
      if (!e.alive || e === o.skip || e.ghost || e.burrowT > 0 || !this.hostile(a.team, e.team)) continue;
      if (this.dist(e, { x, y }) > r + e.rad * 0.6) continue;
      this.hurt(e, e.isStatic && o.buildingMul ? dmg * o.buildingMul : dmg, a, { ranged: o.ranged, aoe: true, pierce: o.pierce });
    }
  }

  hurt(
    v: HUnit, raw: number, attacker: HUnit | null,
    o: { ranged?: boolean; aoe?: boolean; big?: boolean; pierce?: number; dot?: boolean; reflected?: boolean; creditTeam?: number } = {},
  ): number {
    if (!v.alive || v.invuln > 0 || v.ghost || v.burrowT > 0 || !this.canHit(attacker, v)) return 0;
    if (!o.aoe && !o.dot) {
      if (this.rand() < (this.has(v, 'ninja') ? 0.3 : 0) + v.dodge) {
        this.emit({ t: 'text', x: v.x, y: v.y, key: 'fx.dodge', color: 0xbfe9ff });
        return 0;
      }
    }
    if (v.bridge >= 0 && !o.aoe) return 0;
    let dmg = raw * (v.bridge >= 0 ? 0.35 : 1);
    if (this.has(v, 'shield') && o.ranged) dmg *= 0.5;
    if (o.ranged && !v.fly) dmg *= TERRAIN[this.grid[this.cellOf(v.x, v.y)]].cover ?? 1;
    const armor = v.armor * this.mod(v, 'armor') * (1 - (o.pierce ?? 0));
    dmg = Math.max(1, (dmg * 100) / (100 + armor));
    if (v.shield > 0) {
      const ab = Math.min(v.shield, dmg);
      v.shield -= ab;
      dmg -= ab;
      if (dmg <= 0.01) return 0;
    }
    v.hp -= dmg;
    v.hitFlash = 0.12;
    this.emit({ t: 'hit', x: v.x, y: v.y, amount: dmg, team: v.team, big: !!o.big });
    // quái trung lập bị đánh thì nổi giận ngay (nhắm kẻ tấn công)
    if (attacker && v.team < 0 && attacker.team >= 0 && !v.target) v.target = attacker.uid;
    // thành bị đánh: kéo quân phòng thủ về
    if (attacker && attacker.alive && attacker.lifesteal > 0 && !o.dot && !o.reflected) attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * attacker.lifesteal);
    const refl = (this.has(v, 'reflect') ? 0.3 : 0) + v.reflectAdd;
    if (refl > 0 && attacker && attacker.alive && !o.reflected && !o.dot && this.dist(attacker, v) <= 90) {
      this.hurt(attacker, dmg * refl, v, { aoe: true, pierce: 1, reflected: true });
    }
    if (v.hp <= 0) this.kill(v, attacker, o.creditTeam);
    return dmg;
  }

  private kill(v: HUnit, attacker: HUnit | null, creditTeam?: number) {
    if (!v.alive) return;
    if (this.has(v, 'revive') && !v.revived) {
      v.revived = true;
      v.hp = v.maxHp * 0.5;
      v.invuln = 1.5;
      this.emit({ t: 'text', x: v.x, y: v.y, key: 'fx.revive', color: 0xffe066, big: true });
      return;
    }
    v.alive = false;
    v.deadT = 0.7;
    v.moving = false;
    v.stunT = 0;
    const big = v.def.kind === 'general' || v.guardian || v.isCastle;
    this.emit({ t: 'death', x: v.x, y: v.y, big });
    const killerTeam = creditTeam ?? attacker?.team ?? -1;
    if (killerTeam >= 0 && v.team !== killerTeam) {
      const kt = this.teams[killerTeam];
      kt.kills++;
      let gain = 0;
      if (!v.noBounty) {
        if (v.team < 0) gain = Math.round(v.bounty || v.def.cost * 0.4);
        else gain = v.def.kind === 'general' ? Math.round(v.def.cost * 0.25) : Math.max(1, Math.round(v.def.cost * 0.25));
      }
      if (gain > 0) {
        kt.gold = Math.min(HUNT_GOLD_CAP, kt.gold + gain);
        this.emit({ t: 'bounty', team: killerTeam, x: v.x, y: v.y, amount: gain });
      }
    }
    if (attacker?.alive && this.has(attacker, 'ironWill')) attacker.armor += v.def.kind === 'troop' || v.def.kind === 'beast' ? 2 : 5;
    if (v.camp >= 0 && !this.units.some((u) => u.alive && u.camp === v.camp && u !== v)) this.campT[v.camp] = HUNT_CAMP_RESPAWN;
    if (v.carrying) v.carrying = false;
    if (v.guardian) {
      this.guardian = null;
      this.emit({ t: 'shake', power: 12 });
      this.emit({ t: 'guardianDown' });
      if (this.map.def.unlockAt === undefined) this.treasures.forEach((_, i) => this.unlockTreasure(i));
      if (this.map.def.shrink && this.zoneStart < 0) this.startZone();
    }
    if (v.bridge >= 0) this.collapseBridge(v.bridge);
    if (v.isCastle) this.castleFell(v.team);
  }

  private castleFell(team: number) {
    const t = this.teams[team];
    t.alive = false;
    this.emit({ t: 'castleDown', team });
    this.emit({ t: 'shake', power: 14 });
    this.dropTreasureIf((u) => u.team === team);
  }

  // ───────────────────────── công trình đứng yên ─────────────────────────

  private staticStep(u: HUnit, dt: number) {
    const skill = u.def.skill;
    const T = u.timers;
    const dmg = u.dmg * this.mod(u, 'dmg');
    const foes = () => this.units.filter((e) => e.alive && !e.ghost && e.burrowT <= 0 && this.hostile(u.team, e.team) && this.canHit(u, e));
    const within = (e: HUnit, r: number) => this.dist(e, u) <= r + e.rad * 0.5;
    const tick = (key: string, cd: number) => {
      T[key] = (T[key] ?? 0) - dt * u.haste;
      if (T[key] > 0) return false;
      T[key] = cd;
      return true;
    };
    if (u.life !== Infinity) {
      /* đã xử lý ở stepUnit */
    }
    switch (skill) {
      case 'tower':
      case 'ballista':
      case 'catapult': {
        if (u.atkT > 0) return;
        u.tgtT -= dt;
        let best: HUnit | null = null;
        let bd = Infinity;
        for (const e of foes()) {
          if (e.isStatic && !e.isCastle) continue;
          const d = this.dist(e, u);
          if (d <= u.range + e.rad * 0.5 && d + (e.isStatic ? 150 : 0) < bd) {
            bd = d + (e.isStatic ? 150 : 0);
            best = e;
          }
        }
        if (!best) return;
        u.atkT = u.cd / this.mod(u, 'rate');
        u.attackAnim = 0.3;
        if (skill === 'catapult') {
          this.emit({ t: 'proj', x0: u.x, y0: u.y, x1: best.x, y1: best.y, kind: 'rock' });
          this.emit({ t: 'fx', kind: 'rock', x: best.x, y: best.y, r: 55 });
          this.aoeAt(u, best.x, best.y, 55, dmg, { ranged: true, quiet: true });
        } else {
          this.emit({ t: 'proj', x0: u.x, y0: u.y - 20, x1: best.x, y1: best.y, kind: 'arrow' });
          this.hurt(best, dmg, u, { ranged: true, pierce: skill === 'ballista' ? 0.4 : 0, big: skill === 'ballista' });
        }
        return;
      }
      case 'thorns': {
        if (!tick('thorns', u.cd)) return;
        const hit = foes().filter((e) => !e.isStatic && within(e, u.range));
        if (!hit.length) return void (T.thorns = 0);
        this.emit({ t: 'fx', kind: 'thorns', x: u.x, y: u.y, r: u.range });
        for (const e of hit) this.hurt(e, dmg, u, { aoe: true, pierce: 0.5 });
        return;
      }
      case 'trap': {
        const t = foes().find((e) => !e.isStatic && within(e, u.range));
        if (!t) return;
        this.emit({ t: 'fx', kind: 'thorns', x: u.x, y: u.y, r: 70 });
        this.emit({ t: 'shake', power: 2 });
        for (const e of foes()) if (!e.isStatic && within(e, 70)) { this.hurt(e, dmg, u, { aoe: true }); e.stunT = Math.max(e.stunT, 1.5); }
        u.alive = false;
        u.deadT = 0.05;
        u.vanish = true;
        return;
      }
      case 'firepit': {
        if (!tick('burn', 0.5)) return;
        for (const e of foes()) if (!e.isStatic && within(e, u.range)) this.applyPoison(e, dmg, 1.2, u.team);
        return;
      }
      case 'drum': {
        for (const a of this.units) if (a.alive && a.team === u.team && !a.isStatic && this.dist(a, u) <= u.range) { this.addBuff(a, 'dmg', 1.1, 0.5); this.addBuff(a, 'rate', 1.2, 0.5); }
        return;
      }
      case 'altar': {
        if (!tick('heal', u.cd)) return;
        let any = false;
        for (const a of this.units) if (a.alive && a.team === u.team && !a.isStatic && a.hp < a.maxHp && this.dist(a, u) <= u.range) { this.healUnit(a, u.dmg); any = true; }
        if (any) this.emit({ t: 'fx', kind: 'heal', x: u.x, y: u.y, r: u.range });
        return;
      }
      case 'frost': {
        if (!tick('frost', u.cd)) return;
        const hit = foes().filter((e) => !e.isStatic && within(e, u.range));
        if (!hit.length) return void (T.frost = 0);
        this.emit({ t: 'fx', kind: 'frost', x: u.x, y: u.y, r: u.range });
        for (const e of hit) { this.addBuff(e, 'speed', 0.55, 3); this.addBuff(e, 'rate', 0.75, 3); this.hurt(e, dmg, u, { aoe: true, pierce: 1 }); }
        return;
      }
      default:
        return;
    }
  }

  healUnit(u: HUnit, amount: number) {
    if (!u.alive || u.hp >= u.maxHp) return;
    const real = Math.min(amount, u.maxHp - u.hp);
    u.hp += real;
  }

  // ───────────────────────── kỹ năng chủ động ─────────────────────────

  private nearestEnemy(u: HUnit, r: number): HUnit | null {
    let best: HUnit | null = null;
    let bd = r;
    for (const e of this.units) {
      if (!e.alive || e.ghost || e.burrowT > 0 || e.isStatic || !this.hostile(u.team, e.team) || !this.canHit(u, e)) continue;
      const d = this.dist(u, e);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private enemiesIn(u: HUnit, x: number, y: number, r: number, mobile = true): HUnit[] {
    const out: HUnit[] = [];
    for (const e of this.units) {
      if (!e.alive || e.ghost || e.burrowT > 0 || (mobile && e.isStatic) || !this.hostile(u.team, e.team) || !this.canHit(u, e)) continue;
      if (this.dist(e, { x, y }) <= r) out.push(e);
    }
    return out;
  }

  private alliesIn(u: HUnit, r: number): HUnit[] {
    const out: HUnit[] = [];
    for (const a of this.units) {
      if (a.alive && a.team === u.team && !a.isStatic && !a.ghost && this.dist(a, u) <= r) out.push(a);
    }
    return out;
  }

  /** điểm có nhiều địch nhất trong bán kính 90 */
  private densestOf(list: HUnit[]): HUnit {
    let best = list[0];
    let bn = -1;
    for (const e of list) {
      const n = list.filter((o) => this.dist(o, e) <= 90).length;
      if (n > bn) {
        bn = n;
        best = e;
      }
    }
    return best;
  }

  private castSkills(u: HUnit, dt: number) {
    if (u.def.dmg === 0 && !this.has(u, 'heal') && !this.has(u, 'blessing')) return;
    this.cast(u, u.def.skill, dt);
    if (u.alive && u.def.skill2) this.cast(u, u.def.skill2, dt);
  }

  private cast(u: HUnit, skill: SkillId, dt: number) {
    const cd0 = SKILL_CD[skill];
    if (cd0 === undefined) {
      if (skill === 'monk') {
        // khiên khí tự dựng lại
      }
      return;
    }
    const T = u.timers;
    T[skill] = (T[skill] ?? cd0 * 0.5) - dt;
    if (T[skill] > 0) return;
    const dmgMul = this.mod(u, 'dmg');
    const tgt = u.target ? this.byUid.get(u.target) : undefined;
    const reset = (v = cd0) => void (T[skill] = v);
    const fail = () => void (T[skill] = 0.6);
    const toward = (d: number) => {
      const t = tgt ?? this.nearestEnemy(u, 400);
      const ang = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.face > 0 ? 0 : Math.PI;
      return { x: u.x + Math.cos(ang) * d, y: u.y + Math.sin(ang) * d, ang };
    };
    const say = (key: string, color: number) => this.emit({ t: 'text', x: u.x, y: u.y, key, color, big: true });

    switch (skill) {
      case 'monk': {
        if (u.shield > 0) return fail();
        u.shield = 80 * u.pow;
        return reset();
      }
      case 'palm': {
        if (!tgt || this.dist(u, tgt) > 170) return fail();
        reset();
        u.attackAnim = 0.45;
        const p = toward(95);
        say('fx.palm', 0xffa94d);
        this.emit({ t: 'shake', power: 3 });
        this.emit({ t: 'fx', kind: 'palm', x: u.x, y: u.y, x2: p.x, y2: p.y, r: 95 });
        return void this.aoeAt(u, p.x, p.y, 95, 170 * u.pow * dmgMul, { ranged: false, quiet: true });
      }
      case 'fireAttack': {
        const foes = this.enemiesIn(u, u.x, u.y, 380, false);
        if (!foes.length) return fail();
        reset();
        u.attackAnim = 0.4;
        const best = this.densestOf(foes);
        say('fx.fire', 0xff6a3d);
        this.emit({ t: 'shake', power: 2 });
        this.emit({ t: 'fx', kind: 'fire', x: best.x, y: best.y, r: 90 });
        return void this.aoeAt(u, best.x, best.y, 90, 130 * u.pow * dmgMul, { ranged: true, pierce: 1, quiet: true });
      }
      case 'dragonPalm': {
        if (!tgt || this.dist(u, tgt) > 230) return fail();
        reset();
        u.attackAnim = 0.45;
        const p = toward(110);
        say('fx.dragon', 0x7ad0ff);
        this.emit({ t: 'fx', kind: 'palm', x: u.x, y: u.y, x2: p.x, y2: p.y, r: 90 });
        for (const e of this.enemiesIn(u, p.x, p.y, 90, false)) {
          const was = e.alive;
          this.hurt(e, 140 * u.pow * dmgMul, u, { aoe: true });
          if (was && e.alive && !e.isStatic) this.pushAway(e, u, 90);
        }
        return;
      }
      case 'poisonCloud': {
        const foes = this.enemiesIn(u, u.x, u.y, 420);
        if (!foes.length) return fail();
        reset();
        u.attackAnim = 0.4;
        const c = this.densestOf(foes);
        say('fx.poison', 0x9aff6a);
        this.emit({ t: 'fx', kind: 'poison', x: c.x, y: c.y, r: 100 });
        for (const e of this.enemiesIn(u, c.x, c.y, 100, false)) {
          this.hurt(e, 30 * u.pow * dmgMul, u, { aoe: true, pierce: 1 });
          if (e.alive) this.applyPoison(e, 12 * u.pow, 6, u.team);
        }
        return;
      }
      case 'inferno': {
        if (!tgt || this.dist(u, tgt) > 280) return fail();
        reset();
        u.attackAnim = 0.45;
        const p = toward(130);
        say('fx.inferno', 0xff6a3d);
        this.emit({ t: 'shake', power: 5 });
        this.emit({ t: 'fx', kind: 'fire', x: p.x, y: p.y, r: 130 });
        for (const e of this.enemiesIn(u, p.x, p.y, 130, false)) {
          this.hurt(e, 85 * u.pow * dmgMul, u, { aoe: true });
          if (e.alive) this.applyPoison(e, 10 * u.pow, 4, u.team);
        }
        return;
      }
      case 'tyrant': {
        if (!tgt) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.summon', 0xd070ff);
        for (let i = 0; i < 2; i++) this.spawn(UNITS.samurai, u.team, u.x - u.face * (24 + i * 20), u.y + (i ? 14 : -14), { pow: u.pow * 0.8, life: 30, noBounty: true, owner: u.uid });
        return;
      }
      case 'monkeys': {
        if (!tgt || this.dist(u, tgt) > 500) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.monkeys', 0xffd34d);
        for (let i = 0; i < 2; i++) this.spawn(UNITS.khicon, u.team, u.x + u.face * (16 + i * 18), u.y + (i ? 12 : -12), { pow: 1, hp: u.maxHp * 0.3, dmg: u.dmg * dmgMul * 0.3, life: 5, owner: u.uid, noBounty: true });
        return;
      }
      case 'erlang': {
        if (!tgt || this.dist(u, tgt) > 500) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.erlang', 0x9ad0ff);
        for (const a of this.units) if (a.alive && a.owner === u.uid && a.def.id === 'haothienkhuyen') a.life = 0.01;
        this.spawn(UNITS.haothienkhuyen, u.team, u.x - u.face * 26, u.y, { pow: 1, hp: u.maxHp * 0.5, dmg: u.dmg * dmgMul * 0.5, life: 15, owner: u.uid, noBounty: true });
        for (const s of ['dmg', 'speed', 'armor', 'rate'] as const) this.addBuff(u, s, 1.5, 5);
        return;
      }
      case 'warlord': {
        if (!this.nearestEnemy(u, 500)) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.warcry', 0xffd34d);
        this.emit({ t: 'fx', kind: 'warcry', x: u.x, y: u.y, r: 420 });
        for (const a of this.alliesIn(u, 420)) { this.addBuff(a, 'dmg', 1.25, 5); this.addBuff(a, 'rate', 1.15, 5); }
        return;
      }
      case 'melody': {
        const t = this.nearestEnemy(u, 280);
        if (!t) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.melody', 0xb8a0ff);
        this.emit({ t: 'fx', kind: 'melody', x: t.x, y: t.y, r: 140 });
        for (const e of this.enemiesIn(u, t.x, t.y, 140, false)) {
          this.addBuff(e, 'speed', 0.55, 4);
          this.addBuff(e, 'rate', 0.75, 4);
          this.hurt(e, 55 * u.pow * dmgMul, u, { aoe: true, pierce: 0.3 });
        }
        return;
      }
      case 'dash':
      case 'phantom': {
        if (!tgt || this.dist(u, tgt) > 320 || this.dist(u, tgt) < 90) return fail();
        reset(skill === 'dash' ? 8 : 7);
        u.attackAnim = 0.4;
        say(skill === 'dash' ? 'fx.dash' : 'fx.phantom', 0xfff0b0);
        const maxD = skill === 'dash' ? 260 : 280;
        const p = toward(maxD);
        const x0 = u.x;
        const y0 = u.y;
        let x1 = p.x;
        let y1 = p.y;
        if (!u.fly && this.blockedAt(x1, y1)) {
          x1 = x0 + (x1 - x0) * 0.5;
          y1 = y0 + (y1 - y0) * 0.5;
        }
        const base = (skill === 'dash' ? 110 : 90) * u.pow * dmgMul;
        for (const e of this.units.slice()) {
          if (!e.alive || e.ghost || !this.hostile(u.team, e.team) || !this.canHit(u, e)) continue;
          if (this.segDist(e.x, e.y, x0, y0, x1, y1) <= 32 + e.rad) this.hurt(e, base, u, { aoe: true });
        }
        this.emit({ t: 'fx', kind: 'dash', x: x0, y: y0, x2: x1, y2: y1 });
        u.x = x1;
        u.y = y1;
        u.atkT = 0;
        return;
      }
      case 'stun': {
        const foes = this.enemiesIn(u, u.x, u.y, 290).sort((a, b) => this.dist(a, u) - this.dist(b, u)).slice(0, 3);
        if (!foes.length) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.stun', 0xcfd8ff);
        for (const e of foes) {
          e.stunT = Math.max(e.stunT, 2);
          this.emit({ t: 'fx', kind: 'stun', x: e.x, y: e.y });
        }
        return;
      }
      case 'shieldAura': {
        if (!this.nearestEnemy(u, 320)) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.shield', 0x9ad0ff);
        for (const a of this.alliesIn(u, 170)) {
          a.shield = Math.max(a.shield, 60 * u.pow);
          this.emit({ t: 'fx', kind: 'shield', x: a.x, y: a.y });
        }
        return;
      }
      case 'pairHeal': {
        reset();
        this.healUnit(u, 40 * u.pow);
        const mate = this.units.find((a) => a.alive && a.team === u.team && a.def.id === 'duongqua' && this.dist(a, u) <= 170);
        if (mate) {
          this.healUnit(mate, 50 * u.pow);
          this.emit({ t: 'text', x: u.x, y: u.y, key: 'fx.pair', color: 0xff9ecb });
        }
        return;
      }
      case 'heal': {
        const hurt = this.alliesIn(u, 120).filter((a) => a.hp < a.maxHp);
        if (!hurt.length) return fail();
        reset();
        u.attackAnim = 0.3;
        for (const a of hurt) this.healUnit(a, 15 * u.pow);
        this.emit({ t: 'fx', kind: 'heal', x: u.x, y: u.y, r: 120 });
        return;
      }
      case 'blink':
      case 'skyRoam': {
        const foes = this.enemiesIn(u, u.x, u.y, skill === 'blink' ? 700 : 560, false).filter((e) => this.dist(e, u) > 140);
        if (!foes.length) return fail();
        reset();
        const c = this.densestOf(foes);
        const ang = Math.atan2(c.y - u.y, c.x - u.x);
        const lx = c.x + Math.cos(ang) * 40;
        const ly = c.y + Math.sin(ang) * 40;
        this.emit({ t: 'fx', kind: 'blink', x: u.x, y: u.y });
        if (u.fly || !this.blockedAt(lx, ly)) {
          u.x = lx;
          u.y = ly;
        } else {
          u.x = c.x;
          u.y = c.y;
        }
        u.atkT = 0;
        u.attackAnim = 0.4;
        u.invuln = Math.max(u.invuln, 0.3);
        say(skill === 'blink' ? 'fx.blink' : 'fx.skyroam', skill === 'blink' ? 0xe0b0ff : 0xff9a4d);
        this.emit({ t: 'fx', kind: skill === 'blink' ? 'blink' : 'fire', x: u.x, y: u.y, r: 90 });
        this.aoeAt(u, u.x, u.y, 85, (skill === 'blink' ? 85 : 90) * u.pow * dmgMul, { ranged: false, quiet: true });
        if (skill === 'blink') for (const e of this.enemiesIn(u, u.x, u.y, 85)) e.stunT = Math.max(e.stunT, 0.8);
        return;
      }
      case 'burrow': {
        if (!tgt || this.dist(u, tgt) > 460) return fail();
        reset();
        u.burrowT = 2;
        u.ghost = true;
        say('fx.burrow', 0xd9b27a);
        this.emit({ t: 'fx', kind: 'burrow', x: u.x, y: u.y, r: 50 });
        return;
      }
      case 'thunder': {
        const foes = this.enemiesIn(u, u.x, u.y, 950, false);
        if (!foes.length) return fail();
        reset();
        u.attackAnim = 0.5;
        say('fx.thunder', 0xbfe6ff);
        this.emit({ t: 'shake', power: 5 });
        let n = 0;
        for (const e of foes) {
          if (n++ < 30) this.emit({ t: 'fx', kind: 'bolt', x: e.x, y: e.y, r: 40 });
          this.hurt(e, 60 * u.pow * dmgMul, u, { aoe: true, pierce: 0.5 });
        }
        return;
      }
      case 'blessing': {
        if (!this.nearestEnemy(u, 520)) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.bless', 0x9affc8);
        this.emit({ t: 'fx', kind: 'heal', x: u.x, y: u.y, r: 260 });
        for (const a of this.alliesIn(u, 260)) {
          this.healUnit(a, a.maxHp * 0.1);
          a.shield = Math.max(a.shield, 50 * u.pow);
        }
        return;
      }
      case 'howl': {
        if (!this.nearestEnemy(u, 520)) return fail();
        reset();
        u.attackAnim = 0.4;
        say('fx.howl', 0xffb36b);
        this.emit({ t: 'fx', kind: 'warcry', x: u.x, y: u.y, r: 260 });
        for (const a of this.alliesIn(u, 260)) { this.addBuff(a, 'dmg', 1.2, 5); this.addBuff(a, 'speed', 1.15, 5); }
        return;
      }
      default:
        return;
    }
  }

  private segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
    return Math.hypot(px - (x0 + dx * k), py - (y0 + dy * k));
  }

  private pushAway(e: HUnit, from: HUnit, dist: number) {
    const dx = e.x - from.x;
    const dy = e.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = e.x + (dx / d) * dist;
    const ny = e.y + (dy / d) * dist;
    if (e.fly || !this.blockedAt(nx, ny)) {
      e.x = nx;
      e.y = ny;
    }
  }

  /** độn thổ: lao nhanh về phía địch rồi trồi lên */
  private burrowStep(u: HUnit, dt: number) {
    u.burrowT -= dt;
    const t = this.nearestEnemy({ ...u, ghost: false } as HUnit, 500) ?? (u.target ? this.byUid.get(u.target) : undefined);
    if (t) this.moveTo(u, t.x, t.y, dt, u.speed * 2.6);
    if ((t && this.dist(u, t) <= 50) || u.burrowT <= 0) {
      u.burrowT = 0;
      u.ghost = !!u.def.tags?.includes('ghost');
      u.atkT = 0;
      u.attackAnim = 0.4;
      this.emit({ t: 'text', x: u.x, y: u.y, key: 'fx.emerge', color: 0xd9b27a, big: true });
      this.emit({ t: 'fx', kind: 'burrow', x: u.x, y: u.y, r: 85 });
      this.emit({ t: 'shake', power: 3 });
      this.aoeAt(u, u.x, u.y, 85, 100 * u.pow * this.mod(u, 'dmg'), { ranged: false, quiet: true });
      for (const e of this.enemiesIn(u, u.x, u.y, 85)) e.stunT = Math.max(e.stunT, 1);
    }
  }

  // ───────────────────────── kho báu ─────────────────────────

  private mobile(u: HUnit) {
    return u.alive && !u.isStatic && !u.ghost && u.burrowT <= 0 && u.team >= 0 && !u.owner && u.life === Infinity;
  }

  private unlockTreasure(i: number) {
    const tr = this.treasures[i];
    if (tr.state !== 'locked') return;
    tr.state = 'ground';
    tr.x = tr.spotX;
    tr.y = tr.spotY;
    tr.freeAt = this.time + 1.5;
    this.emit({ t: 'unlock', i });
    this.emit({ t: 'treasure', kind: 'free', team: -1 });
    this.emit({ t: 'text', x: tr.x, y: tr.y, key: 'hunt.fxFree', color: 0xffd34d, big: true });
  }

  private dropTreasureIf(pred: (u: HUnit) => boolean) {
    this.treasures.forEach((tr, i) => {
      if (tr.state !== 'carried') return;
      const carriers = tr.carriers.map((id) => this.byUid.get(id)).filter((u): u is HUnit => !!u);
      if (carriers.some(pred)) this.dropTreasure(i);
    });
  }

  private dropTreasure(i: number) {
    const tr = this.treasures[i];
    const carriers = tr.carriers.map((id) => this.byUid.get(id)).filter((u): u is HUnit => !!u);
    const alive = carriers.filter((c) => c.alive);
    const pos = alive.length ? { x: alive.reduce((a, c) => a + c.x, 0) / alive.length, y: alive.reduce((a, c) => a + c.y, 0) / alive.length } : carriers.length ? { x: carriers[0].x, y: carriers[0].y } : { x: tr.x, y: tr.y };
    for (const c of carriers) c.carrying = false;
    const was = tr.team;
    Object.assign(tr, { state: 'ground', x: pos.x, y: pos.y, carriers: [], team: -1, need: 1, freeAt: this.time + 1.5 });
    this.emit({ t: 'treasure', kind: 'dropped', team: was });
    this.emit({ t: 'text', x: pos.x, y: pos.y, key: 'hunt.fxDrop', color: 0xffd34d, big: true });
  }

  private treasureTick(_dt: number) {
    this.treasures.forEach((tr, i) => this.treasureStep(tr, i));
  }

  private treasureStep(tr: Treasure, i: number) {
    if (tr.state === 'ground' && this.time >= tr.freeAt) {
      // ai đang đứng quanh kho báu
      const near = this.units.filter((u) => this.mobile(u) && !u.carrying && Math.hypot(u.x - tr.x, u.y - tr.y) <= 64 && this.teams[u.team].alive);
      const groups = new Set(near.map((u) => this.teams[u.team].group));
      if (groups.size === 1) {
        const team = near[0].team;
        const same = near.filter((u) => this.teams[u.team].group === this.teams[team].group);
        const general = same.filter((u) => u.def.kind === 'general').sort((a, b) => Math.hypot(a.x - tr.x, a.y - tr.y) - Math.hypot(b.x - tr.x, b.y - tr.y))[0];
        let squad: HUnit[] = [];
        if (general) squad = [general];
        else {
          // quân thường cùng một đội: cần đủ 3 người
          const byTeam = new Map<number, HUnit[]>();
          for (const u of same) if (u.def.kind !== 'general') (byTeam.get(u.team) ?? byTeam.set(u.team, []).get(u.team)!).push(u);
          for (const [, list] of byTeam) {
            if (list.length >= HUNT_CARRY_TROOPS) {
              squad = list.sort((a, b) => Math.hypot(a.x - tr.x, a.y - tr.y) - Math.hypot(b.x - tr.x, b.y - tr.y)).slice(0, HUNT_CARRY_TROOPS);
              break;
            }
          }
        }
        if (squad.length) {
          Object.assign(tr, { state: 'carried', carriers: squad.map((u) => u.uid), team: squad[0].team, need: squad.length, freeAt: 0 });
          this.teams[squad[0].team].carried = true;
          for (const c of squad) c.carrying = true;
          this.emit({ t: 'treasure', kind: 'picked', team: squad[0].team });
          this.emit({ t: 'text', x: tr.x, y: tr.y, key: 'hunt.fxPick', color: 0xffd34d, big: true });
        }
      }
      return;
    }
    if (tr.state !== 'carried') return;
    let carriers = tr.carriers.map((id) => this.byUid.get(id)).filter((u): u is HUnit => !!u && u.alive);
    // bổ sung người khiêng khi có người ngã (quân thường)
    if (carriers.length < tr.need) {
      const isGeneral = tr.need === 1 && this.byUid.get(tr.carriers[0])?.def.kind === 'general';
      if (!isGeneral && carriers.length) {
        const cx = carriers.reduce((a, c) => a + c.x, 0) / carriers.length;
        const cy = carriers.reduce((a, c) => a + c.y, 0) / carriers.length;
        const pool = this.units
          .filter((u) => this.mobile(u) && u.team === tr.team && !u.carrying && u.def.kind !== 'general' && Math.hypot(u.x - cx, u.y - cy) <= 110)
          .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
        for (const p of pool) {
          if (carriers.length >= tr.need) break;
          p.carrying = true;
          carriers.push(p);
        }
      }
      if (carriers.length < tr.need) {
        tr.carriers = carriers.map((c) => c.uid);
        return void this.dropTreasure(i);
      }
    }
    tr.carriers = carriers.map((c) => c.uid);
    tr.x = carriers.reduce((a, c) => a + c.x, 0) / carriers.length;
    tr.y = carriers.reduce((a, c) => a + c.y, 0) / carriers.length;
    // cả nhóm đi chung tốc độ của người chậm nhất, giảm 50%
    const minSp = Math.min(...carriers.map((c) => c.speed * this.mod(c, 'speed')));
    for (const c of carriers) c.carrySpeed = minSp * HUNT_CARRY_SLOW;
    // về tới thành (của mình hoặc đồng minh)
    for (const t of this.teams) {
      if (!t.alive || t.group !== this.teams[tr.team].group) continue;
      if (Math.hypot(t.castle.x - tr.x, t.castle.y - tr.y) <= 95) {
        tr.state = 'delivered';
        this.deliveredBy = tr.team;
        for (const c of carriers) c.carrying = false;
        this.emit({ t: 'treasure', kind: 'delivered', team: tr.team });
        const home = this.units.find((u) => u.uid === t.castleUid);
        if (home) home.hp = Math.min(home.maxHp, home.hp + home.maxHp * 0.25);
        this.teams[tr.team].gold = Math.min(HUNT_GOLD_CAP, this.teams[tr.team].gold + 120);
        if (this.cfg.setup.win === 'treasure') this.finish(this.teams[tr.team].group);
        return;
      }
    }
  }

  // ───────────────────────── thế giới thay đổi: dung nham, thiên thạch, vùng an toàn, điểm kiểm soát ─────────────────────────

  private worldTick(dt: number) {
    const def = this.map.def;
    if (def.unlockAt !== undefined && this.time >= def.unlockAt) this.treasures.forEach((_, i) => this.unlockTreasure(i));
    if (this.map.lava.length) {
      this.lavaT -= dt;
      if (this.lavaT <= 0) {
        this.lavaT = 1;
        this.lavaGrow();
      }
    }
    if (def.meteors) this.meteorTick(dt);
    if (def.shrink && this.zoneStart < 0 && this.time >= HUNT_ZONE.start) this.startZone();
    if (this.zoneStart >= 0) this.zoneTick(dt);
    if (this.points.length) this.pointTick(dt);
  }

  /** gây sát thương theo thời gian, gom 0.5 giây một lần để không tràn hiệu ứng */
  private tickDamage(u: HUnit, key: string, dt: number, perSec: number) {
    u.timers[key] = (u.timers[key] ?? 0) + dt;
    if (u.timers[key] >= 0.5) {
      const t = u.timers[key];
      u.timers[key] = 0;
      this.hurt(u, perSec * t, null, { aoe: true, pierce: 1, dot: true });
    }
  }

  /** ô bị chặn (dung nham / nước) dưới chân: chịu sát thương và tự bò ra ô trống gần nhất */
  private escapeBlocked(u: HUnit, dt: number) {
    const tr = this.grid[this.cellOf(u.x, u.y)];
    if (tr === TR.LAVA) this.tickDamage(u, 'lava', dt, u.maxHp * 0.08);
    else if (tr === TR.WATER) this.tickDamage(u, 'drown', dt, u.maxHp * 0.12);
    if (!u.alive) return;
    const N = HUNT_N;
    const c = this.cellOf(u.x, u.y);
    const cx = c % N;
    const cy = (c / N) | 0;
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (let r = 1; r <= 10 && !best; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
          const nx = cx + ox;
          const ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N || TERRAIN[this.grid[ny * N + nx]].block) continue;
          const px = (nx + 0.5) * HUNT_CELL;
          const py = (ny + 0.5) * HUNT_CELL;
          const d = Math.hypot(px - u.x, py - u.y);
          if (d < bd) {
            bd = d;
            best = { x: px, y: py };
          }
        }
      }
    }
    if (!best) return;
    const step = Math.min(bd, Math.max(u.speed, 60) * 1.5 * dt);
    u.x += ((best.x - u.x) / bd) * step;
    u.y += ((best.y - u.y) / bd) * step;
    u.moving = true;
  }

  private lavaGrow() {
    const changed: number[] = [];
    this.map.lava.forEach((src, i) => {
      if (this.time < src.start) return;
      const r = Math.min(src.max, src.r0 + src.rate * (this.time - src.start));
      this.lavaR[i] = r;
      const cx0 = Math.floor(src.x / HUNT_CELL);
      const cy0 = Math.floor(src.y / HUNT_CELL);
      const span = Math.ceil(r) + 1;
      for (let cy = cy0 - span; cy <= cy0 + span; cy++) {
        for (let cx = cx0 - span; cx <= cx0 + span; cx++) {
          if (cx < 0 || cy < 0 || cx >= HUNT_N || cy >= HUNT_N) continue;
          const px = (cx + 0.5) * HUNT_CELL;
          const py = (cy + 0.5) * HUNT_CELL;
          if (Math.hypot(px - src.x, py - src.y) / HUNT_CELL > r) continue;
          const idx = cy * HUNT_N + cx;
          const cur = this.grid[idx];
          if (cur === TR.LAVA || cur === TR.ROCK || cur === TR.WATER) continue;
          // không phủ sân thành và khu đặt kho báu
          if (this.map.castles.some((c) => Math.hypot(c.x - px, c.y - py) < HUNT_CELL * 4.4)) continue;
          if (this.map.treasures.some((tr) => Math.hypot(tr.x - px, tr.y - py) < HUNT_CELL * 2.4)) continue;
          if (Math.hypot(HUNT_CENTER - px, HUNT_CENTER - py) < HUNT_CELL * 3.8) continue;
          this.grid[idx] = TR.LAVA;
          changed.push(idx);
        }
      }
    });
    if (changed.length) {
      this.fields.clear();
      this.emit({ t: 'terrain', cells: changed });
    }
  }

  private collapseBridge(i: number) {
    const b = this.map.bridges[i];
    const changed: number[] = [];
    for (const c of b.cells) {
      if (this.grid[c] === TR.BRIDGE) {
        this.grid[c] = TR.WATER;
        changed.push(c);
      }
    }
    this.fields.clear();
    this.emit({ t: 'terrain', cells: changed });
    this.emit({ t: 'bridgeDown', x: b.x, y: b.y });
    this.emit({ t: 'text', x: b.x, y: b.y, key: 'hunt.fxBridge', color: 0x9ad8ff, big: true });
    this.emit({ t: 'shake', power: 5 });
  }

  private meteorTick(dt: number) {
    if (this.time < HUNT_METEOR.start) return;
    this.meteorT -= dt;
    if (this.meteorT <= 0) {
      const k = Math.min(1, (this.time - HUNT_METEOR.start) / 400);
      this.meteorT = HUNT_METEOR.every[0] + (HUNT_METEOR.every[1] - HUNT_METEOR.every[0]) * k;
      const mob = this.units.filter((u) => this.mobile(u));
      let x: number;
      let y: number;
      if (mob.length && this.rand() < 0.65) {
        const u = mob[Math.floor(this.rand() * mob.length)];
        x = u.x + (this.rand() - 0.5) * 70;
        y = u.y + (this.rand() - 0.5) * 70;
      } else {
        const a = this.rand() * Math.PI * 2;
        const r = this.rand() * 620;
        x = HUNT_CENTER + Math.cos(a) * r;
        y = HUNT_CENTER + Math.sin(a) * r;
      }
      this.meteors.push({ x, y, t: HUNT_METEOR.warn });
      this.emit({ t: 'meteor', x, y, r: HUNT_METEOR.r, warn: HUNT_METEOR.warn });
    }
    for (const m of this.meteors) m.t -= dt;
    const due = this.meteors.filter((m) => m.t <= 0);
    if (!due.length) return;
    this.meteors = this.meteors.filter((m) => m.t > 0);
    for (const m of due) {
      this.emit({ t: 'fx', kind: 'boom', x: m.x, y: m.y, r: HUNT_METEOR.r });
      this.emit({ t: 'shake', power: 4 });
      for (const e of this.units.slice()) {
        if (!e.alive || e.ghost || Math.hypot(e.x - m.x, e.y - m.y) > HUNT_METEOR.r + e.rad * 0.5) continue;
        this.hurt(e, e.isCastle ? HUNT_METEOR.dmg * 0.3 : HUNT_METEOR.dmg * (e.isStatic ? 0.6 : 1), null, { aoe: true, pierce: 0.5 });
      }
    }
  }

  private startZone() {
    this.zoneStart = this.time;
    this.zoneR = HUNT_ZONE.from;
    this.emit({ t: 'zone' });
    this.emit({ t: 'text', x: HUNT_CENTER, y: HUNT_CENTER - 120, key: 'hunt.fxZone', color: 0xff6a4d, big: true });
  }

  private zoneTick(dt: number) {
    const k = Math.max(0, Math.min(1, (this.time - this.zoneStart) / HUNT_ZONE.dur));
    this.zoneR = HUNT_ZONE.from + (HUNT_ZONE.to - HUNT_ZONE.from) * k;
    for (const u of this.units) {
      if (!u.alive || u.ghost || u.burrowT > 0 || u.team < 0 && !u.guardian) continue;
      if (Math.hypot(u.x - HUNT_CENTER, u.y - HUNT_CENTER) <= this.zoneR) continue;
      this.tickDamage(u, 'zone', dt, u.maxHp * HUNT_ZONE.dps * (u.isCastle ? 0.17 : u.isStatic ? 0.3 : 1));
    }
  }

  private pointTick(dt: number) {
    for (const t of this.teams) t.bonus = 0;
    this.points.forEach((p, i) => {
      const near = new Map<number, number>();
      for (const u of this.units) {
        if (!this.mobile(u) || Math.hypot(u.x - p.x, u.y - p.y) > HUNT_POINT_R || !this.teams[u.team].alive) continue;
        const g = this.teams[u.team].group;
        near.set(g, (near.get(g) ?? 0) + 1);
      }
      if (near.size === 1) {
        const [g, n] = [...near.entries()][0];
        if (p.owner === g) p.prog = Math.min(1, p.prog + dt / 8);
        else {
          p.prog -= dt * (0.12 + 0.04 * n);
          if (p.prog <= 0) {
            p.owner = g;
            p.prog = 0.12;
            this.emit({ t: 'point', i, owner: g });
            this.emit({ t: 'text', x: p.x, y: p.y, key: 'hunt.fxPoint', color: 0xffd34d, big: true });
          }
        }
      }
      if (p.owner >= 0 && p.prog > 0.3) {
        for (const t of this.teams) if (t.alive && t.group === p.owner) t.bonus += HUNT_POINT_GOLD;
        for (const u of this.units) {
          if (this.mobile(u) && u.hp < u.maxHp && this.teams[u.team].group === p.owner && Math.hypot(u.x - p.x, u.y - p.y) <= HUNT_POINT_R * 1.4) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.03 * dt);
        }
      }
    });
  }

  // ───────────────────────── kết thúc ─────────────────────────

  private finish(group: number) {
    if (this.over) return;
    this.over = true;
    this.winnerGroup = group;
    this.emit({ t: 'end', group });
  }

  private checkEnd() {
    if (this.over) return;
    const groups = new Set<number>();
    for (const t of this.teams) if (t.alive) groups.add(t.group);
    if (groups.size <= 1) {
      this.finish(groups.size ? [...groups][0] : -1);
      return;
    }
    // quá giờ: nhóm còn nhiều máu thành nhất thắng
    if (this.time > HUNT_STORM_AT + HUNT_STORM_END) {
      let best = -1;
      let bv = -1;
      for (const g of groups) {
        const v = this.teams.filter((t) => t.alive && t.group === g).reduce((a, t) => a + (this.byUid.get(t.castleUid)?.hp ?? 0), 0);
        if (v > bv) {
          bv = v;
          best = g;
        }
      }
      this.finish(best);
    }
  }

  // ───────────────────────── lệnh của người chơi / đội máy ─────────────────────────

  command(team: number, stance: HStance, rally?: { x: number; y: number }) {
    const t = this.teams[team];
    t.stance = stance;
    if (rally) t.rally = { x: Math.max(40, Math.min(HUNT_SIZE - 40, rally.x)), y: Math.max(40, Math.min(HUNT_SIZE - 40, rally.y)) };
  }

  alive(team: number): HUnit[] {
    return this.units.filter((u) => u.alive && u.team === team && !u.isStatic && !u.owner);
  }

  countOf(team: number) {
    let n = 0;
    for (const u of this.units) if (u.alive && u.team === team && !u.isStatic && !u.owner && u.life === Infinity) n++;
    return n;
  }

  defensesOf(team: number) {
    let n = 0;
    for (const u of this.units) if (u.alive && u.team === team && u.isStatic && !u.isCastle) n++;
    return n;
  }

  generalsOf(team: number) {
    let n = 0;
    for (const u of this.units) if (u.alive && u.team === team && u.def.kind === 'general' && !u.owner) n++;
    return n;
  }

  generalOnField(team: number, id: string) {
    return this.units.some((u) => u.alive && u.team === team && u.def.id === id);
  }

  canDeploy(team: number, id: string): boolean {
    const t = this.teams[team];
    const def = UNITS[id];
    if (!t || !t.alive || !def || this.over) return false;
    if (t.gold < def.cost) return false;
    if (def.kind === 'defense') return this.defensesOf(team) < HUNT_DEFENSE_CAP;
    if (def.kind !== 'troop' && def.kind !== 'general' && def.kind !== 'beast' && def.kind !== 'pet') return false;
    if (this.countOf(team) >= HUNT_UNIT_CAP) return false;
    if (def.kind === 'general') {
      if (this.generalOnField(team, id)) return false;
      if (this.generalsOf(team) >= t.generalCap) return false;
    }
    return true;
  }

  deploy(team: number, id: string): HUnit | null {
    if (!this.canDeploy(team, id)) return null;
    const t = this.teams[team];
    const def = UNITS[id];
    t.gold -= def.cost;
    t.deployed++;
    const dx = HUNT_CENTER - t.castle.x;
    const dy = HUNT_CENTER - t.castle.y;
    const d = Math.hypot(dx, dy) || 1;
    const fx = dx / d;
    const fy = dy / d;
    for (let tries = 0; tries < 8; tries++) {
      const out = def.kind === 'defense' ? 100 + this.rand() * (HUNT_DEFENSE_ZONE - 100) : 84 + this.rand() * 36;
      const side = (this.rand() - 0.5) * (def.kind === 'defense' ? 230 : 120);
      const x = t.castle.x + fx * out - fy * side;
      const y = t.castle.y + fy * out + fx * side;
      if (this.blockedAt(x, y)) continue;
      return this.spawn(def, team, x, y);
    }
    return this.spawn(def, team, t.castle.x + fx * 80, t.castle.y + fy * 80);
  }

  castleHp(team: number): { hp: number; max: number } {
    const c = this.byUid.get(this.teams[team].castleUid);
    return c ? { hp: Math.max(0, c.hp), max: c.maxHp } : { hp: 0, max: HUNT_CASTLE_HP };
  }

  terrainName(x: number, y: number) {
    return TERRAIN[terrainAt(this.grid, x, y)].name;
  }
}
