import { MAX_DEFENSES_PER_LANE, UNIT_LIST, UNITS, levelMul, type SkillId, type UnitDef, flagHpMul, incomeUpgradeMul } from '../data/units';
import { laneCountOf, type Bridge, type Station } from '../data/campaign';
import { BOSS_PHASES, BOSS_SPLIT, bossPhaseCount, type BossPhase } from '../data/boss';
import { BASE_LANE_LEN, LONG_LANE_LEN, OUTPOST, ZONES, rollZones, type LaneZone, type OutpostKind, type ZoneFx } from '../data/lane';
import { GENERAL_SKILLS, GS, GSKILLS, enemyExtraCount, extraSkillsAt, type GSkillId } from '../data/gskills';
import {
  EVENT_ARROW_HP, EVENT_CHANCE, EVENT_GHOSTS, EVENT_GOLD, EVENT_LIGHTNING_STRIKES, EVENT_TIME, FIRE_ZONE, GIANT_AT_HP, GIANT_AT_TIME,
  GIANT_MIN_TIME, LIGHTNING, RANDOM_EVENTS, lightningDamage, WEATHERS, effMul, effSum, envEffects, globalMul, type Effect, type RandomEventId,
} from '../data/terrain';

/** độ dài lane chuẩn; trạm có căn cứ phụ dài hơn (xem Battle.len) */
export const LANE_LEN = BASE_LANE_LEN;
/** số lane mặc định (màn Boss chỉ có 1 lane, xem laneCountOf) */
export const LANE_COUNT = 3;
export type Side = 0 | 1;
export const GOLD_CAP = 100;
/** các mốc giới hạn vàng của người chơi và giá nâng cấp lên mốc kế tiếp (trả bằng vàng trong trận) */
export const CAP_STEPS = [100, 140, 190, 250, 320];
export const CAP_COSTS = [50, 90, 140, 200];
/** nâng giới hạn vàng cũng tăng tốc độ sản xuất vàng (nhân với thu nhập gốc) */
export const CAP_INCOME_MUL = [1, 1.2, 1.4, 1.6, 1.8];
export const PLAYER_START_GOLD = 30;
export const PLAYER_FLAG_HP = 520;
export const PLAYER_INCOME = 2.6;
/** địch vào trận chậm hơn một chút: vàng khởi điểm thấp + thu nhập tăng dần trong giây đầu */
export const ENEMY_START_GOLD = 10;
export const ENEMY_RAMP_SEC = 25;
export const ENEMY_RAMP_FROM = 0.6;
/** thưởng vàng khi hạ quân: lính 25% giá, tướng 20% giá, boss cố định */
export const BOUNTY_TROOP = 0.25;
export const BOUNTY_GENERAL = 0.2;
export const BOUNTY_BOSS = 30;
/** màn Boss: boss xuất hiện khi cờ địch còn ≤ 45% máu hoặc sau 70 giây (không sớm hơn 25 giây) */
export const BOSS_AT_HP = 0.45;
export const BOSS_AT_TIME = 70;
export const BOSS_MIN_TIME = 25;
/** khi boss còn sống, cờ địch chỉ nhận 30% sát thương */
export const BOSS_FLAG_GUARD = 0.3;

export interface Flag {
  hp: number;
  maxHp: number;
  flash: number;
}

type BuffStat = 'dmg' | 'speed' | 'armor' | 'rate';
interface Buff {
  stat: BuffStat;
  mul: number;
  t: number;
}

export interface UnitInst {
  uid: number;
  def: UnitDef;
  side: Side;
  lane: number;
  x: number;
  hp: number;
  maxHp: number;
  dmg: number;
  armor: number;
  speed: number;
  range: number;
  cd: number;
  /** nhân theo cấp/độ khó, áp cho cả kỹ năng */
  pow: number;
  atkTimer: number;
  travelled: number;
  firstHit: boolean;
  alive: boolean;
  /** đếm ngược trước khi xóa khỏi lane */
  deadTimer: number;
  vanish: boolean;
  moving: boolean;
  attackAnim: number;
  hitFlash: number;
  invuln: number;
  revived: boolean;
  enraged: boolean;
  attacks: number;
  /** cho animation: lệch dọc */
  yOff: number;
  timers: Record<string, number>;
  // ── trạng thái
  buffs: Buff[];
  stunT: number;
  shield: number;
  poison: { dps: number; t: number; acc: number; side: Side } | null;
  /** Tôn Ngộ Không: id tướng đang hóa thân và thời gian còn lại */
  form: string | null;
  formT: number;
  /** thú triệu hồi: thời gian tồn tại còn lại */
  life: number;
  /** uid chủ (thú triệu hồi) */
  owner: number;
  /** hạ quân triệu hồi không được thưởng vàng */
  noBounty: boolean;
  /** xác suất né cộng thêm từ địa hình/thời tiết */
  dodge: number;
  /** hồi (+) / mất (−) máu mỗi giây theo tỉ lệ máu tối đa (địa hình) */
  hpRate: number;
  /** kỹ năng mở thêm của tướng (theo cấp, xem data/gskills.ts) */
  gs: GSkillId[];
  /** xuyên giáp cộng thêm / hút máu / phản sát thương từ kỹ năng tướng */
  pierceAdd: number;
  lifesteal: number;
  reflectAdd: number;
  /** Bất Khuất chỉ kích hoạt một lần */
  lsUsed: boolean;
  /** đếm ngược trước khi được rẽ lane lần nữa (đường nối) */
  crossCd: number;
  /** bước mô phỏng đã xử lý đơn vị này (tránh xử lý hai lần khi đổi lane) */
  stepN: number;
  /** bẫy/hố lửa: không bị nhắm tới, không chặn đường */
  ghost: boolean;
  /** boss: kỹ năng chủ động nhận thêm ở các giai đoạn sau, số giai đoạn đã qua, đời phân thân (0 = bản gốc) */
  bonusSkills: SkillId[];
  phase: number;
  gen: number;
}

export interface Lane {
  index: number;
  flags: [Flag, Flag];
  units: UnitInst[];
  winner: Side | null;
  /** địa hình trong lane (vũng lầy, suối thần...): ảnh hưởng quân cả hai phe đứng trong vùng */
  zones: LaneZone[];
}

/** căn cứ phụ của một lane: ai giữ thì nhận ưu đãi theo loại; chiếm bằng cách đứng trong vùng mà không còn quân địch */
export interface Outpost {
  lane: number;
  kind: OutpostKind;
  x: number;
  owner: Side;
  /** tiến độ chiếm: 0 = địch giữ trọn, 1 = ta giữ trọn */
  prog: number;
  contested: boolean;
}

export type FxKind =
  | 'palm' | 'sweep' | 'splash' | 'rockhit' | 'boom' | 'fire' | 'charge' | 'summon'
  | 'enrage' | 'revive' | 'pair' | 'healwave' | 'armor'
  | 'transform' | 'hound' | 'warcry' | 'melody' | 'dash' | 'snipe' | 'stun' | 'shield'
  | 'dragon' | 'poisoncloud' | 'inferno' | 'bolt' | 'thorns' | 'frost';

export type SimEvent =
  | { t: 'hit'; lane: number; x: number; amount: number; victimSide: Side; big: boolean }
  | { t: 'absorb'; lane: number; x: number; amount: number }
  | { t: 'flagHit'; lane: number; side: Side; amount: number }
  | { t: 'proj'; lane: number; from: number; to: number; kind: 'arrow' | 'rock' | 'needle' | 'magic'; y: number }
  | { t: 'aoe'; lane: number; x: number; r: number; color: number }
  | { t: 'heal'; lane: number; x: number; amount: number }
  | { t: 'bounty'; side: Side; lane: number; x: number; amount: number }
  | { t: 'text'; lane: number; x: number; key: string; p?: Record<string, string | number>; color: number; big?: boolean }
  | { t: 'laneEnd'; lane: number; winner: Side }
  | { t: 'spawn'; lane: number; x: number }
  | { t: 'death'; lane: number; x: number; big: boolean }
  | { t: 'shake'; power: number }
  | { t: 'fx'; kind: FxKind; lane: number; x: number; dir: 1 | -1; r?: number; x2?: number }
  | { t: 'boss'; id: string; lane: number; giant?: boolean }
  | { t: 'event'; id: RandomEventId }
  | { t: 'capUp'; cap: number }
  | { t: 'outpost'; lane: number; owner: Side; kind: OutpostKind; x: number }
  | { t: 'phase'; id: string; n: number; max: number }
  | { t: 'zones' }
  | { t: 'cross'; uid: number; from: number; to: number; x: number }
  | { t: 'end'; winner: Side };

export interface BattleConfig {
  station: Station;
  /** cấp độ thẻ của người chơi */
  levels: Record<string, number>;
  /** cấp nâng cấp máu thành trì của người chơi (0..10) */
  flagLevel?: number;
  /** cấp nâng cấp tốc độ sản xuất vàng của người chơi (0..10) */
  incomeLevel?: number;
  /** số tướng tối đa của người chơi cùng lúc trên chiến trường (bỏ trống = không giới hạn) */
  generalCap?: number;
  /** sự kiện ngẫu nhiên: bỏ trống = tung xúc xắc (10–20%), null = không có, hoặc ép một sự kiện (kiểm thử) */
  event?: RandomEventId | null;
  /** địa hình lane: bỏ trống = tung xúc xắc, null = không có, hoặc truyền sẵn (kiểm thử) */
  zones?: LaneZone[][] | null;
}

/** sét đang chờ đánh (có báo trước) */
interface Strike {
  lane: number;
  x: number;
  t: number;
}
/** vùng cháy của thời tiết Mưa Lửa */
interface FireZone {
  lane: number;
  x: number;
  t: number;
  acc: number;
  fxT: number;
  kind: 'fire' | 'poison';
  /** thời gian báo trước trước khi bắt đầu gây sát thương */
  delay: number;
}
/** thiên tai định kỳ do giai đoạn của boss kích hoạt */
interface Hazard {
  lane: number;
  kind: 'fire' | 'poison';
  every: number;
  t: number;
}

interface SpawnOpts {
  pow?: number;
  hp?: number;
  dmg?: number;
  armor?: number;
  speed?: number;
  life?: number;
  owner?: number;
  noBounty?: boolean;
  gen?: number;
}

/** thời gian hồi ban đầu của từng kỹ năng chủ động (giây) */
const SKILL_INIT: Partial<Record<SkillId, number>> = {
  palm: 10, pairHeal: 0, heal: 0, fireAttack: 8, tyrant: 6, monk: 0,
  wukong: 5, monkeys: 10, erlang: 8, warlord: 6, melody: 5, dash: 6, stun: 7, shieldAura: 3,
  dragonPalm: 5, poisonCloud: 5, phantom: 5, inferno: 8,
};

export class Battle {
  lanes: Lane[] = [];
  gold: [number, number] = [PLAYER_START_GOLD, ENEMY_START_GOLD];
  income: [number, number];
  /** mốc giới hạn vàng của người chơi (chỉ số trong CAP_STEPS) */
  capLevel = 0;
  time = 0;
  over = false;
  winner: Side | null = null;
  wins: [number, number] = [0, 0];
  events: SimEvent[] = [];
  kills: [number, number] = [0, 0];
  /** vàng kiếm được từ hạ quân (thống kê) */
  bountyTotal: [number, number] = [0, 0];
  boss: UnitInst | null = null;
  bossSpawned = false;
  /** boss gốc và các bản phân thân (kể cả đã chết) */
  bossKin: UnitInst[] = [];
  private bossBarMax = 0;
  private hazards: Hazard[] = [];
  /** tổng số quân (lính + tướng) địch được phép triển khai ở trạm này */
  enemyBudget: number;
  enemyDeployed = 0;
  private nextUid = 1;
  private tickN = 0;
  /** các đường nối lane của trạm */
  readonly bridges: Bridge[];
  /** độ dài lane (dài hơn ở trạm có căn cứ phụ) và toạ độ cờ / điểm xuất quân */
  readonly len: number;
  readonly flagX: [number, number];
  readonly spawnX: [number, number];
  /** căn cứ phụ (mỗi lane tối đa một) */
  readonly outposts: Outpost[] = [];
  private baseIncome: [number, number];

  // ── địa hình / thời tiết / sự kiện
  /** hiệu ứng đang có hiệu lực (địa hình + thời tiết của trạm) */
  readonly env: Effect[];
  /** hệ số vàng/giây của người chơi (địa hình × nâng cấp ngoài trận); sát thương lửa, sức mạnh băng (toàn cục) */
  readonly incomeMul: number;
  readonly fireMul: number;
  readonly frostMul: number;
  private weatherT: number;
  /** đã hẹn sét cho chu kỳ hiện tại */
  private strikeArmed = false;
  private strikes: Strike[] = [];
  private zones: FireZone[] = [];
  /** sự kiện ngẫu nhiên của trận này (null = không có) và thời điểm kích hoạt */
  readonly randomEvent: RandomEventId | null;
  private eventAt: number;
  eventFired = false;
  /** thời gian còn lại của Kho Vàng (vàng ×2) */
  goldBoostT = 0;
  /** quái khổng lồ (trạm thứ 5) */
  giant: UnitInst | null = null;
  giantSpawned = false;

  constructor(public cfg: BattleConfig) {
    const st = cfg.station;
    const n = laneCountOf(st);
    this.len = st.outposts.length && n > 1 ? LONG_LANE_LEN : BASE_LANE_LEN;
    this.flagX = [0, this.len];
    this.spawnX = [45, this.len - 45];
    // vị trí cầu khai báo theo lane chuẩn 1000: co giãn theo độ dài lane
    this.bridges = n > 1 ? st.bridges.map((b) => ({ ...b, x: (b.x / BASE_LANE_LEN) * this.len })) : [];
    this.env = envEffects(st.theme, st.weather);
    const envIncome = globalMul(this.env, 'income');
    this.incomeMul = envIncome * incomeUpgradeMul(cfg.incomeLevel ?? 0);
    this.fireMul = globalMul(this.env, 'fire');
    this.frostMul = globalMul(this.env, 'frost');
    this.weatherT = WEATHERS[st.weather].event?.every ?? Infinity;
    if (cfg.event !== undefined) this.randomEvent = cfg.event;
    else {
      const chance = EVENT_CHANCE[0] + Math.random() * (EVENT_CHANCE[1] - EVENT_CHANCE[0]);
      this.randomEvent = Math.random() < chance ? RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)].id : null;
    }
    this.eventAt = EVENT_TIME[0] + Math.random() * (EVENT_TIME[1] - EVENT_TIME[0]);
    this.baseIncome = [PLAYER_INCOME * this.incomeMul, st.income * envIncome];
    this.income = [...this.baseIncome];
    this.enemyBudget = st.units;
    const zones = cfg.zones === undefined ? rollZones(this.len, n) : cfg.zones ?? Array.from({ length: n }, () => []);
    // màn Boss chỉ có 1 lane: thành ta là phòng tuyến duy nhất nên bền hơn
    const myFlag = Math.round(PLAYER_FLAG_HP * (n === 1 ? 1.8 : 1) * flagHpMul(this.cfg.flagLevel ?? 0));
    for (let i = 0; i < n; i++) {
      this.lanes.push({
        index: i,
        flags: [
          { hp: myFlag, maxHp: myFlag, flash: 0 },
          { hp: st.flagHp, maxHp: st.flagHp, flash: 0 },
        ],
        units: [],
        winner: null,
        zones: zones[i] ?? [],
      });
    }
    if (n > 1) {
      st.outposts.slice(0, n).forEach((kind, i) => {
        this.outposts.push({ lane: i, kind, x: this.len * OUTPOST.at, owner: 1, prog: 0, contested: false });
      });
    }
    this.refreshIncome();
  }

  /** thu nhập vàng/giây = gốc (× mốc kho vàng) + ưu đãi Mỏ Vàng của các căn cứ đang giữ */
  private refreshIncome() {
    const capMul = CAP_INCOME_MUL[this.capLevel];
    this.income[0] = this.baseIncome[0] * capMul + this.outpostGold(0) * this.incomeMul;
    this.income[1] = this.baseIncome[1] + this.outpostGold(1) * globalMul(this.env, 'income');
  }

  private outpostGold(side: Side): number {
    let n = 0;
    for (const o of this.outposts) if (o.kind === 'gold' && o.owner === side && this.lanes[o.lane].winner === null) n++;
    return n * OUTPOST.gold[side];
  }

  private emit(e: SimEvent) {
    this.events.push(e);
  }

  /** số quân địch chưa triển khai */
  get enemyLeft() {
    return Math.max(0, this.enemyBudget - this.enemyDeployed);
  }

  /** số quân địch còn sống trên chiến trường (không tính công trình) */
  get enemyAlive() {
    let n = 0;
    for (const l of this.lanes) for (const u of l.units) if (u.alive && u.side === 1 && !u.ghost && (u.def.kind === 'troop' || u.def.kind === 'beast' || u.def.kind === 'general')) n++;
    return n;
  }

  /** số lane cần thắng: 2/3 lane, hoặc 1/1 ở màn Boss */
  get needWins() {
    return this.lanes.length === 1 ? 1 : 2;
  }

  goldCap(side: Side) {
    return side === 0 ? CAP_STEPS[this.capLevel] : GOLD_CAP;
  }
  /** giá nâng cấp kho vàng lên mốc kế (null nếu đã tối đa) */
  capUpgradeCost(): number | null {
    return this.capLevel < CAP_COSTS.length ? CAP_COSTS[this.capLevel] : null;
  }
  upgradeCap(): boolean {
    const cost = this.capUpgradeCost();
    if (this.over || cost === null || this.gold[0] < cost) return false;
    this.gold[0] -= cost;
    this.capLevel++;
    this.refreshIncome();
    return true;
  }

  /** kho vàng của người chơi đầy thì tự nâng cấp giới hạn vàng (nếu còn mốc kế tiếp và đủ vàng) */
  private autoUpgradeCap() {
    const cost = this.capUpgradeCost();
    if (cost === null || this.gold[0] < this.goldCap(0) - 0.01 || this.gold[0] < cost) return;
    if (this.upgradeCap()) this.emit({ t: 'capUp', cap: this.goldCap(0) });
  }

  private mulFor(side: Side, id: string): number {
    return side === 0 ? levelMul(this.cfg.levels[id] ?? 1) : this.cfg.station.power;
  }

  /** tướng chỉ xuất hiện ở MỘT lane: đang sống trên chiến trường thì không thả thêm */
  generalOnField(side: Side, id: string): boolean {
    for (const l of this.lanes) for (const u of l.units) if (u.alive && u.side === side && u.def.id === id) return true;
    return false;
  }

  /** số tướng đang sống trên chiến trường của một bên */
  generalsAlive(side: Side): number {
    let n = 0;
    for (const l of this.lanes) for (const u of l.units) if (u.alive && u.side === side && u.def.kind === 'general' && !u.owner) n++;
    return n;
  }

  /** số công trình phòng thủ còn sống của một bên trong lane */
  defensesIn(side: Side, lane: number): number {
    return this.lanes[lane].units.filter((u) => u.alive && u.side === side && u.def.kind === 'defense').length;
  }

  canDeploy(side: Side, id: string, lane: number): boolean {
    const def = UNITS[id];
    if (!def || this.over) return false;
    const l = this.lanes[lane];
    if (!l || l.winner !== null) return false;
    if (this.gold[side] < def.cost) return false;
    if (def.kind === 'defense') return this.defensesIn(side, lane) < MAX_DEFENSES_PER_LANE;
    if (def.kind !== 'troop' && def.kind !== 'general' && def.kind !== 'beast' && def.kind !== 'pet') return false;
    if (side === 1 && this.enemyLeft <= 0) return false;
    if (def.kind === 'general' && this.generalOnField(side, id)) return false;
    if (def.kind === 'general' && side === 0 && this.generalsAlive(0) >= (this.cfg.generalCap ?? 99)) return false;
    return true;
  }

  /** x (tuỳ chọn): vị trí đặt công trình trên lane; lính/tướng luôn xuất hiện ở cờ nhà */
  deploy(side: Side, id: string, lane: number, x?: number): UnitInst | null {
    if (!this.canDeploy(side, id, lane)) return null;
    const def = UNITS[id];
    this.gold[side] -= def.cost;
    if (def.kind === 'defense') {
      const [lo, hi] = this.defenseSpan(side, lane);
      const px = Math.max(lo, Math.min(hi, x ?? (side === 0 ? 190 : this.len - 190)));
      return this.spawn(def, side, lane, px);
    }
    if (side === 1) this.enemyDeployed++;
    const post = this.forwardPost(side, lane, x);
    const at = post ? post.x + (side === 0 ? -24 : 24) : this.spawnX[side];
    return this.spawn(def, side, lane, at + (Math.random() - 0.5) * 14);
  }

  /** đoạn lane được đặt công trình: nửa sân nhà (ta 90–560), mở rộng tới căn cứ tiền đồn đang giữ */
  defenseSpan(side: Side, lane: number): [number, number] {
    const post = this.outposts.find((o) => o.lane === lane && o.kind === 'deploy' && o.owner === side);
    if (side === 0) return [90, Math.max(560, post ? post.x + OUTPOST.deployDefense : 0)];
    return [Math.min(this.len - 560, post ? post.x - OUTPOST.deployDefense : Infinity), this.len - 90];
  }

  /** căn cứ tiền đồn mà `side` đang giữ trong lane và quân thả ra tại đó (ta: phải thả gần căn cứ; địch: luôn xuất quân từ đó) */
  forwardPost(side: Side, lane: number, dropX?: number): Outpost | null {
    const o = this.outposts.find((q) => q.lane === lane && q.kind === 'deploy' && q.owner === side);
    if (!o || this.lanes[lane].winner !== null) return null;
    if (side === 0 && (dropX === undefined || Math.abs(dropX - o.x) > OUTPOST.deployReach)) return null;
    return o;
  }

  /** `side` đang giữ căn cứ loại `kind` ở lane (và lane chưa kết thúc) */
  perk(side: Side, lane: number, kind: OutpostKind): boolean {
    for (const o of this.outposts) if (o.lane === lane && o.kind === kind && o.owner === side) return this.lanes[lane].winner === null;
    return false;
  }

  spawn(def: UnitDef, side: Side, laneIdx: number, x: number, o: SpawnOpts = {}): UnitInst {
    const st = this.cfg.station;
    const pow = o.pow ?? this.mulFor(side, def.id);
    const armorBonus = side === 1 && st.mod === 'armored' ? 6 : 0;
    const speedMul = (side === 1 && st.mod === 'quick' ? 1.2 : 1) * effMul(this.env, 'speed', def);
    const hp = o.hp ?? def.hp * pow * effMul(this.env, 'hp', def);
    // tầm xa giữ nguyên là "tầm xa" (>70) dù bị sương mù/rừng thu hẹp
    const rangeMul = effMul(this.env, 'range', def);
    const range = def.range > 70 ? Math.max(71, Math.round(def.range * rangeMul)) : def.range;
    const u: UnitInst = {
      uid: this.nextUid++,
      def, side, lane: laneIdx, x,
      hp, maxHp: hp,
      dmg: o.dmg ?? def.dmg * pow * effMul(this.env, 'dmg', def), armor: (o.armor ?? def.armor) + armorBonus, speed: (o.speed ?? def.speed) * speedMul,
      range, cd: def.cd,
      dodge: effSum(this.env, 'dodge', def), hpRate: effSum(this.env, 'hpRate', def),
      gs: [], pierceAdd: 0, lifesteal: 0, reflectAdd: 0, lsUsed: false, crossCd: 0, stepN: 0,
      pow,
      atkTimer: 0.3, travelled: 0, firstHit: true,
      alive: true, deadTimer: 0, vanish: false, moving: false,
      attackAnim: 0, hitFlash: 0, invuln: 0, revived: false, enraged: false, attacks: 0,
      yOff: Math.random() * 2 - 1,
      timers: {},
      buffs: [], stunT: 0, shield: 0, poison: null, form: null, formT: 0,
      life: o.life ?? def.life ?? Infinity, owner: o.owner ?? 0, noBounty: !!o.noBounty || def.kind === 'defense',
      ghost: !!def.tags?.includes('ghost'),
      bonusSkills: [], phase: 0, gen: o.gen ?? 0,
    };
    if (def.kind === 'general' && o.hp === undefined) this.applyGSkills(u);
    if (def.kind !== 'defense' && !u.ghost && !o.owner && this.perk(side, laneIdx, 'rally')) this.addBuff(u, 'speed', OUTPOST.rally.speed, OUTPOST.rally.sec);
    if (def.kind === 'defense') u.yOff = def.tags?.includes('ghost') ? (Math.random() - 0.5) * 0.6 : 0;
    const init = SKILL_INIT[def.skill];
    if (init !== undefined) u.timers[def.skill] = init;
    if (def.skill2 && SKILL_INIT[def.skill2] !== undefined) u.timers[def.skill2] = SKILL_INIT[def.skill2]!;
    this.lanes[laneIdx].units.push(u);
    this.emit({ t: 'spawn', lane: laneIdx, x });
    return u;
  }

  update(dt: number) {
    if (this.over) return;
    // chia nhỏ bước để mô phỏng ổn định khi tăng tốc
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
    const boost = this.goldBoostT > 0 ? EVENT_GOLD.mul : 1;
    this.goldBoostT = Math.max(0, this.goldBoostT - dt);
    for (const s of [0, 1] as const) {
      const ramp = s === 1 ? Math.min(1, ENEMY_RAMP_FROM + (1 - ENEMY_RAMP_FROM) * (this.time / ENEMY_RAMP_SEC)) : 1;
      this.gold[s] = Math.min(this.goldCap(s), this.gold[s] + this.income[s] * boost * ramp * dt);
    }
    this.autoUpgradeCap();
    this.bossTick();
    this.phaseTick();
    this.hazardTick(dt);
    this.giantTick();
    this.weatherTick(dt);
    this.eventTick();
    if (this.outposts.length) this.outpostTick(dt);
    for (const lane of this.lanes) {
      for (const f of lane.flags) f.flash = Math.max(0, f.flash - dt);
      if (lane.winner === null) {
        for (const u of lane.units.slice()) {
          // đơn vị vừa rẽ sang lane sau trong cùng bước thì không xử lý lần hai
          if (u.alive && u.stepN !== this.tickN) {
            u.stepN = this.tickN;
            this.stepUnit(this.lanes[u.lane], u, dt);
          }
        }
      }
      for (const u of lane.units) {
        if (!u.alive) u.deadTimer -= dt;
      }
      lane.units = lane.units.filter((u) => u.alive || u.deadTimer > 0);
    }
  }

  /** Màn Boss: boss xuất hiện gần cuối trận */
  private bossTick() {
    const st = this.cfg.station;
    if (!st.boss || !st.bossId || this.bossSpawned || this.over || this.time < BOSS_MIN_TIME) return;
    const lane = this.lanes[0];
    if (lane.winner !== null) return;
    const f = lane.flags[1];
    if (f.hp / f.maxHp <= BOSS_AT_HP || this.time >= BOSS_AT_TIME) {
      this.bossSpawned = true;
      this.boss = this.spawn(UNITS[st.bossId], 1, 0, this.spawnX[1] - 30);
      this.bossKin = [this.boss];
      this.bossBarMax = this.boss.maxHp;
      this.emit({ t: 'boss', id: st.bossId, lane: 0 });
      this.emit({ t: 'shake', power: 10 });
    }
  }

  // ───────────────────────── giai đoạn & phân thân của boss ─────────────────────────

  /** thông tin cho thanh máu boss: máu cả họ boss, số giai đoạn, mốc chuyển giai đoạn */
  bossInfo(): { id: string; hp: number; max: number; phase: number; phases: number; marks: number[]; kin: number } | null {
    const b = this.bossKin[0];
    if (!b) return null;
    let hp = 0;
    let kin = 0;
    for (const k of this.bossKin) {
      if (k.alive) {
        hp += Math.max(0, k.hp);
        kin++;
      }
    }
    const split = this.bossKin.some((k) => k.gen > 0);
    const marks = split ? [] : (BOSS_PHASES[b.def.id] ?? []).map((p) => p.at);
    return { id: b.def.id, hp, max: this.bossBarMax || b.maxHp, phase: b.phase + 1, phases: bossPhaseCount(b.def.id), marks, kin };
  }

  /** boss gốc tụt máu qua ngưỡng thì sang giai đoạn kế (có thể qua nhiều ngưỡng một lúc) */
  private phaseTick() {
    const b = this.boss;
    if (!b || !b.alive || b.gen > 0 || this.over) return;
    const list = BOSS_PHASES[b.def.id];
    while (list && b.alive && b.phase < list.length && b.hp <= b.maxHp * list[b.phase].at) this.enterPhase(b, list[b.phase]);
  }

  private enterPhase(u: UnitInst, p: BossPhase) {
    u.phase++;
    const dir = (u.side === 0 ? 1 : -1) as 1 | -1;
    const bf = p.buff;
    if (bf) {
      if (bf.dmg) u.dmg *= bf.dmg;
      if (bf.speed) u.speed *= bf.speed;
      if (bf.rate) u.cd /= bf.rate;
      if (bf.armor) u.armor += bf.armor;
      if (bf.heal) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * bf.heal);
      // đổi dạng: to hơn (hình vẽ dựng lại theo định nghĩa mới)
      if (bf.scale) u.def = { ...u.def, scale: u.def.scale * bf.scale };
    }
    // vào giai đoạn nổi điên thì bỏ cơ chế nổi điên cũ (tránh cộng dồn hai lần)
    u.enraged = true;
    for (const k of p.skills ?? []) {
      if (!u.bonusSkills.includes(k)) u.bonusSkills.push(k);
      u.timers[k] = SKILL_INIT[k] ?? 4;
    }
    const lane = this.lanes[u.lane];
    if (p.summon) {
      for (let i = 0; i < p.summon.n; i++) this.spawn(UNITS[p.summon.id], u.side, u.lane, u.x - dir * (26 + i * 18), { noBounty: true });
    }
    if (p.zones?.length) {
      const k = this.len / BASE_LANE_LEN;
      p.zones.forEach((kind, i) => {
        const w = (200 + Math.random() * 80) * k;
        const c = this.len * (0.28 + 0.24 * i + Math.random() * 0.06);
        lane.zones.push({ kind, x0: c - w / 2, x1: c + w / 2 });
      });
      lane.zones.sort((a, b) => a.x0 - b.x0);
      this.emit({ t: 'zones' });
    }
    if (p.hazard) this.hazards.push({ lane: u.lane, kind: p.hazard.kind, every: p.hazard.every, t: 1.5 });
    this.emit({ t: 'phase', id: u.def.id, n: u.phase + 1, max: bossPhaseCount(u.def.id) });
    this.emit({ t: 'text', lane: u.lane, x: u.x, key: `phase.${u.def.id}.${u.phase + 1}`, color: 0xff6a4d, big: true });
    this.emit({ t: 'fx', kind: 'enrage', lane: u.lane, x: u.x, dir });
    this.emit({ t: 'shake', power: p.shake ?? 8 });
  }

  /** thiên tai của boss: rơi xuống chỗ quân ta đang đứng, có báo trước */
  private hazardTick(dt: number) {
    if (!this.hazards.length) return;
    for (const h of this.hazards) {
      const lane = this.lanes[h.lane];
      if (lane.winner !== null || !this.bossKin.some((k) => k.alive)) {
        h.every = Infinity;
        continue;
      }
      h.t -= dt;
      if (h.t > 0) continue;
      h.t = h.every;
      const mine = lane.units.filter((e) => e.alive && e.side === 0 && !e.ghost && e.def.kind !== 'defense');
      const x = mine.length ? mine[Math.floor(Math.random() * mine.length)].x + (Math.random() - 0.5) * 60 : undefined;
      this.startFireZone(h.lane, x, h.kind, 1.2);
    }
    this.hazards = this.hazards.filter((h) => h.every !== Infinity);
  }

  /** boss ngã xuống: còn đời phân thân thì tách làm 2 bản nhỏ hơn, hết thì thắng khi cả họ boss đã chết */
  private onBossDown(v: UnitInst) {
    const sp = BOSS_SPLIT[v.def.id];
    if (sp && v.side === 1 && v.gen < sp.gens) {
      const gen = v.gen + 1;
      const def = { ...v.def, scale: v.def.scale * sp.size };
      const kids: UnitInst[] = [];
      for (let i = 0; i < 2; i++) {
        const k = this.spawn(def, 1, v.lane, Math.max(30, Math.min(this.len - 30, v.x + (i ? 30 : -30))), {
          pow: 1, hp: v.maxHp * sp.hp, dmg: v.dmg * sp.dmg, armor: v.armor, speed: v.speed * 1.1, gen,
        });
        k.enraged = true;
        k.bonusSkills = [...v.bonusSkills];
        for (const s of k.bonusSkills) k.timers[s] = SKILL_INIT[s] ?? 4;
        k.invuln = 0.6;
        kids.push(k);
      }
      this.bossKin.push(...kids);
      this.boss = kids[0];
      this.bossBarMax = kids.reduce((a, k) => a + k.maxHp, 0);
      this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.split', color: 0xff9ecb, big: true });
      this.emit({ t: 'fx', kind: 'summon', lane: v.lane, x: v.x, dir: -1 });
      return;
    }
    if (!this.bossKin.some((k) => k.alive)) this.finish(v.side === 1 ? 0 : 1);
  }

  /** quái khổng lồ (trạm thứ 5): xuất hiện ở lane địch đang bị ép nhất khi cờ địch còn ≤ 50% máu hoặc sau 80 giây (không sớm hơn 35 giây) */
  private giantTick() {
    const st = this.cfg.station;
    if (!st.giantId || this.giantSpawned || this.over || this.time < GIANT_MIN_TIME) return;
    let lane: Lane | null = null;
    let low = Infinity;
    for (const l of this.lanes) {
      if (l.winner !== null) continue;
      const r = l.flags[1].hp / l.flags[1].maxHp;
      if (r < low) {
        low = r;
        lane = l;
      }
    }
    if (!lane || (low > GIANT_AT_HP && this.time < GIANT_AT_TIME)) return;
    this.giantSpawned = true;
    this.giant = this.spawn(UNITS[st.giantId], 1, lane.index, this.spawnX[1] - 30);
    this.emit({ t: 'boss', id: st.giantId, lane: lane.index, giant: true });
    this.emit({ t: 'shake', power: 8 });
  }

  // ───────────────────────── thời tiết ─────────────────────────

  private openLanes(): Lane[] {
    return this.lanes.filter((l) => l.winner === null);
  }

  /** hẹn một cú sét ở vị trí ngẫu nhiên (có báo trước) */
  private scheduleStrike(delay: number) {
    const open = this.openLanes();
    if (!open.length) return;
    const lane = open[Math.floor(Math.random() * open.length)].index;
    const x = 150 + Math.random() * (this.len - 300);
    this.strikes.push({ lane, x, t: delay });
    this.emit({ t: 'text', lane, x, key: 'fx.lightningWarn', color: 0xfff0a0 });
  }

  private lightning(s: Strike) {
    const lane = this.lanes[s.lane];
    if (lane.winner !== null) return;
    this.emit({ t: 'fx', kind: 'bolt', lane: s.lane, x: s.x, dir: 1, r: LIGHTNING.radius });
    this.emit({ t: 'text', lane: s.lane, x: s.x, key: 'fx.lightning', color: 0xfff07a, big: true });
    this.emit({ t: 'shake', power: 5 });
    for (const e of lane.units.slice()) {
      if (!e.alive || e.ghost || Math.abs(e.x - s.x) > LIGHTNING.radius) continue;
      this.damage(e, lightningDamage(e.maxHp), null, { aoe: true, pierce: 0.5 });
      if (e.alive && e.def.kind !== 'defense') e.stunT = Math.max(e.stunT, LIGHTNING.stun);
    }
  }

  private weatherTick(dt: number) {
    const ev = WEATHERS[this.cfg.station.weather].event;
    if (ev) {
      this.weatherT -= dt;
      if (ev.kind === 'lightning' && !this.strikeArmed && this.weatherT <= LIGHTNING.warn) {
        this.strikeArmed = true;
        this.scheduleStrike(Math.max(0, this.weatherT));
      }
      if (this.weatherT <= 0) {
        this.weatherT = ev.every;
        this.strikeArmed = false;
        if (ev.kind === 'fireZone') this.startFireZone();
      }
    }
    for (const s of this.strikes) s.t -= dt;
    const due = this.strikes.filter((s) => s.t <= 0);
    if (due.length) {
      this.strikes = this.strikes.filter((s) => s.t > 0);
      for (const s of due) this.lightning(s);
    }
    if (this.zones.length) this.fireZoneTick(dt);
  }

  /** lane (bỏ trống = ngẫu nhiên), tâm vùng (bỏ trống = ngẫu nhiên), loại; vùng của boss có báo trước */
  private startFireZone(laneIdx?: number, atX?: number, kind: 'fire' | 'poison' = 'fire', warn = 0) {
    const open = this.openLanes();
    if (!open.length) return;
    const lane = laneIdx ?? open[Math.floor(Math.random() * open.length)].index;
    if (this.lanes[lane].winner !== null) return;
    const x = atX ?? 150 + Math.random() * (this.len - 300);
    this.zones.push({ lane, x, t: FIRE_ZONE.life, acc: 0, fxT: 0, kind, delay: warn });
    this.emit({ t: 'text', lane, x, key: kind === 'fire' ? 'fx.fireRain' : 'fx.poisonRain', color: kind === 'fire' ? 0xff8a3d : 0x9aff6a, big: true });
    if (warn > 0) this.emit({ t: 'aoe', lane, x, r: FIRE_ZONE.radius, color: kind === 'fire' ? 0xff5a2a : 0x7aff5a });
  }

  private fireZoneTick(dt: number) {
    for (const z of this.zones) {
      const lane = this.lanes[z.lane];
      if (lane.winner !== null) {
        z.t = 0;
        continue;
      }
      if (z.delay > 0) {
        z.delay -= dt;
        continue;
      }
      z.t -= dt;
      z.fxT -= dt;
      if (z.fxT <= 0) {
        z.fxT = 1;
        this.emit({ t: 'fx', kind: z.kind === 'fire' ? 'fire' : 'poisoncloud', lane: z.lane, x: z.x, dir: 1, r: FIRE_ZONE.radius });
      }
      z.acc += dt;
      if (z.acc >= FIRE_ZONE.tick) {
        z.acc -= FIRE_ZONE.tick;
        for (const e of lane.units.slice()) {
          if (!e.alive || e.ghost || e.def.kind === 'boss' || Math.abs(e.x - z.x) > FIRE_ZONE.radius) continue;
          this.damage(e, FIRE_ZONE.dps * FIRE_ZONE.tick * (z.kind === 'fire' ? this.fireMul : 0.8), null, { aoe: true, pierce: 1, dot: true });
        }
      }
    }
    this.zones = this.zones.filter((z) => z.t > 0);
  }

  // ───────────────────────── sự kiện ngẫu nhiên ─────────────────────────

  private eventTick() {
    if (!this.randomEvent || this.eventFired || this.over || this.time < this.eventAt) return;
    const open = this.openLanes();
    if (!open.length) return;
    this.eventFired = true;
    const id = this.randomEvent;
    this.emit({ t: 'event', id });
    const rnd = () => open[Math.floor(Math.random() * open.length)];
    switch (id) {
      case 'dragon': {
        // Long Thần đứng về phía người chơi, xuất hiện ở lane ngẫu nhiên
        const lane = rnd();
        this.spawn(UNITS.longthan, 0, lane.index, this.spawnX[0] + 160, { noBounty: true });
        this.emit({ t: 'shake', power: 8 });
        break;
      }
      case 'goldRush':
        this.goldBoostT = EVENT_GOLD.sec;
        break;
      case 'lightning':
        for (let i = 0; i < EVENT_LIGHTNING_STRIKES; i++) this.scheduleStrike(1 + i * 0.5);
        break;
      case 'arrowRain':
        for (const l of open) {
          for (let i = 0; i < 10; i++) {
            const x = 60 + Math.random() * (this.len - 120);
            this.emit({ t: 'proj', lane: l.index, from: x + 40, to: x, kind: 'arrow', y: Math.random() * 2 - 1 });
          }
          for (const u of l.units) {
            if (!u.alive || u.ghost || u.def.kind === 'defense') continue;
            // không gây chết: để lại tối thiểu 1 máu
            const loss = Math.min(u.maxHp * EVENT_ARROW_HP, u.hp - 1);
            if (loss <= 0) continue;
            u.hp -= loss;
            u.hitFlash = 0.12;
            this.emit({ t: 'hit', lane: l.index, x: u.x, amount: loss, victimSide: u.side, big: false });
          }
        }
        break;
      case 'ghostGate':
        // Quỷ Binh tràn vào phe địch
        for (let i = 0; i < EVENT_GHOSTS; i++) {
          const lane = open[i % open.length];
          this.spawn(UNITS.quybinh, 1, lane.index, this.spawnX[1] - 20 - i * 14, { noBounty: true });
        }
        this.emit({ t: 'shake', power: 6 });
        break;
    }
  }

  // ───────────────────────── trạng thái & tiện ích ─────────────────────────

  /** hệ số tạm thời (buff/debuff) của một chỉ số */
  private mod(u: UnitInst, stat: BuffStat): number {
    let m = 1;
    for (const b of u.buffs) if (b.stat === stat) m *= b.mul;
    if (stat !== 'armor') m *= this.zoneMul(u, stat);
    if (stat === 'rate' && this.outposts.length && this.perk(u.side, u.lane, 'drill')) m *= OUTPOST.drill.rate;
    return m;
  }

  // ───────────────────────── địa hình lane & căn cứ phụ ─────────────────────────

  /** hệ số nhân từ các vùng địa hình lane mà đơn vị đang đứng trong */
  private zoneMul(u: UnitInst, stat: 'speed' | 'dmg' | 'rate' | 'range'): number {
    const zs = this.lanes[u.lane].zones;
    if (!zs.length || u.ghost || u.def.kind === 'defense') return 1;
    let m = 1;
    for (const z of zs) if (u.x >= z.x0 && u.x <= z.x1) m *= ZONES[z.kind].fx[stat] ?? 1;
    return m;
  }

  private zoneSum(u: UnitInst, stat: 'dodge' | 'hpRate'): number {
    const zs = this.lanes[u.lane].zones;
    if (!zs.length || u.ghost || u.def.kind === 'defense') return 0;
    let v = 0;
    for (const z of zs) if (u.x >= z.x0 && u.x <= z.x1) v += (ZONES[z.kind].fx as ZoneFx)[stat] ?? 0;
    return v;
  }

  /** tầm đánh thực tế: địa hình (đồi) và căn cứ Tháp Canh */
  private reach(u: UnitInst): number {
    let r = u.range * this.zoneMul(u, 'range');
    if (this.outposts.length && u.def.kind !== 'defense' && this.perk(u.side, u.lane, 'range')) r *= OUTPOST.range;
    return r;
  }

  /** quân đứng trong vùng chiếm của căn cứ mà phe mình chưa giữ thì dừng lại để chiếm */
  private holdsOutpost(lane: Lane, u: UnitInst): boolean {
    if (!this.outposts.length || u.ghost) return false;
    const o = this.outposts.find((q) => q.lane === lane.index);
    return !!o && o.owner !== u.side && Math.abs(u.x - o.x) <= OUTPOST.radius * 0.5;
  }

  private outpostTick(dt: number) {
    for (const o of this.outposts) {
      const lane = this.lanes[o.lane];
      if (lane.winner !== null) continue;
      let n0 = 0;
      let n1 = 0;
      for (const u of lane.units) {
        if (!u.alive || u.ghost || u.def.kind === 'defense' || Math.abs(u.x - o.x) > OUTPOST.radius) continue;
        if (u.side === 0) n0++;
        else n1++;
      }
      o.contested = n0 > 0 && n1 > 0;
      if (o.contested) continue;
      const n = n0 || n1;
      if (n === 0) {
        // không ai đứng trong căn cứ: tiến độ dở dang từ từ trở về chủ cũ
        const home = o.owner === 0 ? 1 : 0;
        o.prog += Math.sign(home - o.prog) * Math.min(Math.abs(home - o.prog), OUTPOST.drift * dt);
        continue;
      }
      const rate = (Math.min(2, 1 + 0.25 * (n - 1)) / OUTPOST.captureSec) * dt;
      o.prog = Math.max(0, Math.min(1, o.prog + (n0 ? rate : -rate)));
      const next: Side | null = o.prog >= 1 ? 0 : o.prog <= 0 ? 1 : null;
      if (next !== null && next !== o.owner) {
        o.owner = next;
        this.refreshIncome();
        this.emit({ t: 'outpost', lane: o.lane, owner: next, kind: o.kind, x: o.x });
        this.emit({ t: 'text', lane: o.lane, x: o.x, key: next === 0 ? 'fx.outpostWin' : 'fx.outpostLost', color: next === 0 ? 0x7dffb0 : 0xff8a8a, big: true });
        this.emit({ t: 'shake', power: 4 });
      }
    }
  }

  /** đơn vị có kỹ năng này (của bản thân hoặc đang mượn khi hóa thân) */
  has(u: UnitInst, skill: SkillId): boolean {
    return u.def.skill === skill || u.def.skill2 === skill || (u.form !== null && UNITS[u.form].skill === skill);
  }

  private addBuff(u: UnitInst, stat: BuffStat, mul: number, t: number) {
    const ex = u.buffs.find((b) => b.stat === stat && b.mul === mul);
    if (ex) ex.t = Math.max(ex.t, t);
    else u.buffs.push({ stat, mul, t });
  }

  private applyPoison(u: UnitInst, dps: number, t: number, side: Side) {
    if (!u.alive) return;
    if (!u.poison || dps >= u.poison.dps || t > u.poison.t) u.poison = { dps: Math.max(dps, u.poison?.dps ?? 0), t: Math.max(t, u.poison?.t ?? 0), acc: u.poison?.acc ?? 0, side };
  }

  /** đẩy lùi một đơn vị `dist` đơn vị theo hướng `dir` */
  private push(e: UnitInst, dist: number, dir: number) {
    e.x = Math.max(12, Math.min(this.len - 12, e.x + dir * dist));
  }

  private foesAhead(lane: Lane, u: UnitInst, reach: number): UnitInst[] {
    const dir = u.side === 0 ? 1 : -1;
    return lane.units
      .filter((e) => e.alive && e.side !== u.side && !e.ghost && e.def.kind !== 'defense' && (e.x - u.x) * dir >= -10 && (e.x - u.x) * dir <= reach)
      .sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x));
  }

  private bountyOf(v: UnitInst): number {
    if (v.noBounty) return 0;
    switch (v.def.kind) {
      case 'troop':
      case 'beast': return Math.max(1, Math.round(v.def.cost * BOUNTY_TROOP));
      case 'general': return Math.round(v.def.cost * BOUNTY_GENERAL);
      case 'boss': return v.gen ? 6 : BOUNTY_BOSS;
      default: return 0;
    }
  }

  // ───────────────────────── hành vi đơn vị ─────────────────────────

  /** địch gần nhất phía TRƯỚC mặt (behind=false) hoặc phía SAU lưng (behind=true) */
  private nearestEnemy(lane: Lane, u: UnitInst, behind = false): { e: UnitInst; d: number } | null {
    const dir = u.side === 0 ? 1 : -1;
    let best: UnitInst | null = null;
    let bd = Infinity;
    for (const e of lane.units) {
      if (!e.alive || e.side === u.side || e.ghost) continue;
      const rel = (e.x - u.x) * dir;
      if (behind ? rel >= -12 : rel < -12) continue;
      const d = Math.abs(rel);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best ? { e: best, d: bd } : null;
  }

  private stepUnit(lane: Lane, u: UnitInst, dt: number) {
    u.atkTimer -= dt;
    u.crossCd = Math.max(0, u.crossCd - dt);
    u.attackAnim = Math.max(0, u.attackAnim - dt);
    u.hitFlash = Math.max(0, u.hitFlash - dt);
    u.invuln = Math.max(0, u.invuln - dt);
    u.moving = false;

    // buff/debuff, độc, thú triệu hồi, hóa thân
    if (u.buffs.length) {
      for (const b of u.buffs) b.t -= dt;
      u.buffs = u.buffs.filter((b) => b.t > 0);
    }
    if (u.poison) {
      u.poison.t -= dt;
      u.poison.acc += dt;
      if (u.poison.acc >= 0.5) {
        u.poison.acc -= 0.5;
        this.damage(u, u.poison.dps * 0.5, null, { aoe: true, pierce: 1, dot: true, creditSide: u.poison.side });
        if (!u.alive) return;
      }
      if (u.poison && u.poison.t <= 0) u.poison = null;
    }
    if (u.life !== Infinity) {
      u.life -= dt;
      if (u.life <= 0) {
        u.alive = false;
        u.deadTimer = 0.5;
        u.vanish = true;
        this.emit({ t: 'death', lane: lane.index, x: u.x, big: false });
        return;
      }
    }
    const hpRate = u.hpRate + (lane.zones.length ? this.zoneSum(u, 'hpRate') : 0);
    if (hpRate !== 0) {
      // địa hình hồi/mất máu theo thời gian; mất máu không gây chết (còn tối thiểu 10% máu tối đa)
      const next = u.hp + u.maxHp * hpRate * dt;
      u.hp = hpRate > 0 ? Math.min(u.maxHp, next) : Math.max(Math.min(u.hp, u.maxHp * 0.1), next);
    }
    if (u.formT > 0) {
      u.formT -= dt;
      if (u.formT <= 0) this.endForm(u);
    }
    if (u.stunT > 0) {
      u.stunT -= dt;
      return;
    }

    if (u.def.kind === 'defense') {
      this.defenseStep(lane, u, dt);
      return;
    }

    this.tickSkills(lane, u, dt);
    if (!u.alive) return;

    const dir = u.side === 0 ? 1 : -1;

    if (this.has(u, 'heal')) {
      this.moveSupport(lane, u, dt, dir);
      return;
    }

    const rng = this.reach(u);
    const near = this.nearestEnemy(lane, u);
    if (near && near.d <= rng) {
      if (u.atkTimer <= 0) this.attackUnit(lane, u, near.e);
      return;
    }
    // quân đã sát cờ địch thì vẫn ưu tiên đánh cờ (không quay lại đánh quân mới thả phía sau lưng)
    const fx = this.flagX[u.side === 0 ? 1 : 0];
    if (Math.abs(fx - u.x) <= Math.max(rng, 26)) {
      if (u.atkTimer <= 0) this.attackFlag(lane, u);
      return;
    }
    // địch đang phá thành nằm phía sau (quân mới thả ra sinh ở phía trước chúng): quay lại đánh, không bỏ qua
    const back = this.nearestEnemy(lane, u, true);
    if (back && back.d <= rng) {
      if (u.atkTimer <= 0) this.attackUnit(lane, u, back.e);
      return;
    }
    if (this.holdsOutpost(lane, u)) return;
    const sp = u.speed * this.mod(u, 'speed');
    const prevX = u.x;
    u.x += dir * sp * dt;
    u.travelled += sp * dt;
    u.moving = true;
    if (this.bridges.length) this.checkBridge(u, prevX);
  }

  // ───────────────────────── đường nối lane ─────────────────────────

  /** sức mạnh còn sống của một phe trong lane (để quân tự quyết định rẽ sang lane cần chi viện) */
  private lanePower(laneIdx: number, side: Side): number {
    let p = 0;
    for (const e of this.lanes[laneIdx].units) {
      if (e.alive && e.side === side && !e.ghost && e.def.kind !== 'defense') p += (e.hp + e.dmg * 6) / 100;
    }
    return p;
  }

  /** quân vừa đi qua điểm nối: có thể rẽ sang lane kia (ưu tiên lane địch đang đông hơn ta) */
  private checkBridge(u: UnitInst, prevX: number) {
    if (u.crossCd > 0 || u.ghost || u.owner) return;
    for (const b of this.bridges) {
      if (u.lane !== b.a && u.lane !== b.b) continue;
      if ((prevX - b.x) * (u.x - b.x) > 0) continue;
      const to = u.lane === b.a ? b.b : b.a;
      if (this.lanes[to].winner !== null || this.lanes[u.lane].winner !== null) continue;
      const foe: Side = u.side === 0 ? 1 : 0;
      const needHere = this.lanePower(u.lane, foe) - this.lanePower(u.lane, u.side);
      const needThere = this.lanePower(to, foe) - this.lanePower(to, u.side);
      let chance = 0.25;
      if (this.lanePower(u.lane, foe) === 0 && this.lanePower(to, foe) > 0) chance = 0.9;
      else if (needThere > needHere + 4) chance = 0.7;
      else if (needThere < needHere - 4) chance = 0.1;
      if (Math.random() < chance) this.moveLane(u, to);
      return;
    }
  }

  private moveLane(u: UnitInst, to: number) {
    const from = this.lanes[u.lane];
    from.units = from.units.filter((x) => x !== u);
    this.lanes[to].units.push(u);
    this.emit({ t: 'cross', uid: u.uid, from: u.lane, to, x: u.x });
    u.lane = to;
    u.crossCd = 4;
  }

  private moveSupport(lane: Lane, u: UnitInst, dt: number, dir: number) {
    let front = -Infinity;
    for (const a of lane.units) {
      if (!a.alive || a.side !== u.side || a === u || this.has(a, 'heal')) continue;
      front = Math.max(front, u.side === 0 ? a.x : this.len - a.x);
    }
    const progress = u.side === 0 ? u.x : this.len - u.x;
    if (front > -Infinity && progress < front - 55) {
      u.x += dir * u.speed * this.mod(u, 'speed') * dt;
      u.moving = true;
    }
  }

  private projKind(u: UnitInst): 'arrow' | 'rock' | 'needle' | 'magic' {
    const id = u.form ?? u.def.id;
    if (id === 'tieulongnu') return 'needle';
    if (['giacatluong', 'chudu', 'tumayi', 'auduongphong', 'taoist', 'poisoner'].includes(id)) return 'magic';
    return 'arrow';
  }

  private attackUnit(lane: Lane, u: UnitInst, t: UnitInst) {
    u.atkTimer = u.cd / this.mod(u, 'rate');
    u.attackAnim = 0.3;
    u.attacks++;
    if (this.has(u, 'bomb')) return this.explode(lane, u);

    let dmg = u.dmg * this.mod(u, 'dmg');
    const ranged = u.range > 70;
    const dir = u.side === 0 ? 1 : -1;
    let big = false;
    let pierce = 0;

    if (this.has(u, 'berserk')) dmg *= 1 + (1 - u.hp / u.maxHp) * 1.2;
    if (this.has(u, 'charge') && u.firstHit) {
      const m = Math.min(1 + u.travelled / 120, 5);
      dmg *= m;
      big = m > 2;
      if (m > 1.5) {
        this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.charge', p: { m: m.toFixed(1) }, color: 0xffd34d, big: true });
        this.emit({ t: 'shake', power: 2 + m });
        this.emit({ t: 'fx', kind: 'charge', lane: lane.index, x: t.x, dir, r: m });
      }
    }
    if (this.has(u, 'antiCav') && t.def.tags?.includes('cav')) dmg *= 2.2;
    if (u.gs.includes('execute') && t.hp < t.maxHp * GS.execute.below) dmg *= GS.execute.mul;

    if (this.has(u, 'sweep') && u.attacks % 3 === 0) {
      this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.sweep', color: 0x7dffb0, big: true });
      this.emit({ t: 'fx', kind: 'sweep', lane: lane.index, x: u.x, dir });
      this.aoe(lane, u.x + dir * 55, 95, dmg * 1.8, u, { ranged: false, color: 0x7dffb0, quiet: true });
      u.firstHit = false;
      return;
    }
    if (this.has(u, 'splash')) {
      this.emit({ t: 'fx', kind: 'splash', lane: lane.index, x: t.x, dir, r: 60 });
      this.aoe(lane, t.x, 60, dmg * 0.6, u, { ranged: false, color: 0xffb36b, skip: t, noFlag: true, quiet: true });
    }
    if (this.has(u, 'siege')) {
      this.emit({ t: 'proj', lane: lane.index, from: u.x, to: t.x, kind: 'rock', y: u.yOff });
      this.emit({ t: 'fx', kind: 'rockhit', lane: lane.index, x: t.x, dir, r: 55 });
      this.aoe(lane, t.x, 55, dmg, u, { ranged: true, color: 0xc9a070, quiet: true });
      u.firstHit = false;
      return;
    }
    if (this.has(u, 'trample')) {
      this.emit({ t: 'fx', kind: 'rockhit', lane: lane.index, x: t.x, dir, r: 55 });
      this.emit({ t: 'shake', power: 2.5 });
      this.aoe(lane, t.x, 55, dmg, u, { ranged: false, color: 0xc9a070, quiet: true });
      u.firstHit = false;
      return;
    }
    if (this.has(u, 'taoist')) {
      this.emit({ t: 'proj', lane: lane.index, from: u.x, to: t.x, kind: 'magic', y: u.yOff });
      this.emit({ t: 'fx', kind: 'bolt', lane: lane.index, x: t.x, dir });
      this.aoe(lane, t.x, 45, dmg, u, { ranged: true, color: 0x9ad0ff, quiet: true });
      u.firstHit = false;
      return;
    }
    if (this.has(u, 'crossbow')) pierce = Math.max(pierce, 0.5);
    if (this.has(u, 'sniper') && u.attacks % 3 === 0) {
      dmg *= 3;
      pierce = Math.max(pierce, 0.6);
      big = true;
      this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.snipe', color: 0xffd34d, big: true });
      this.emit({ t: 'fx', kind: 'snipe', lane: lane.index, x: t.x, dir });
    }
    if (this.has(u, 'swordSaint')) {
      pierce = Math.max(pierce, 0.5);
      if (Math.random() < 0.2) {
        dmg *= 2.5;
        big = true;
        this.emit({ t: 'text', lane: lane.index, x: t.x, key: 'fx.crit', color: 0xff9a4d });
      }
    }
    u.firstHit = false;

    if (u.pierceAdd > 0) pierce = 1 - (1 - pierce) * (1 - u.pierceAdd);
    if (ranged) this.emit({ t: 'proj', lane: lane.index, from: u.x, to: t.x, kind: this.projKind(u), y: u.yOff });
    this.damage(t, dmg, u, { ranged, big, pierce });
    if (this.has(u, 'poisoner') && t.alive) this.applyPoison(t, 9 * u.pow, 5, u.side);
  }

  private attackFlag(lane: Lane, u: UnitInst) {
    u.atkTimer = u.cd / this.mod(u, 'rate');
    u.attackAnim = 0.3;
    u.attacks++;
    if (this.has(u, 'bomb')) return this.explode(lane, u);
    let dmg = u.dmg * this.mod(u, 'dmg');
    if (this.has(u, 'ninja')) dmg *= 2;
    if (this.has(u, 'siege')) dmg *= 2.5;
    if (this.has(u, 'berserk')) dmg *= 1 + (1 - u.hp / u.maxHp) * 1.2;
    if (this.has(u, 'charge') && u.firstHit) dmg *= Math.min(1 + u.travelled / 120, 5);
    u.firstHit = false;
    if (u.range > 70) {
      const kind = this.has(u, 'siege') ? 'rock' : this.projKind(u);
      this.emit({ t: 'proj', lane: lane.index, from: u.x, to: this.flagX[u.side === 0 ? 1 : 0], kind, y: u.yOff });
    }
    this.damageFlag(lane, u.side === 0 ? 1 : 0, dmg, u.side);
  }

  private explode(lane: Lane, u: UnitInst) {
    const dir = u.side === 0 ? 1 : -1;
    this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.boom', color: 0xff7a3d, big: true });
    this.emit({ t: 'shake', power: 4 });
    this.emit({ t: 'fx', kind: 'boom', lane: lane.index, x: u.x + dir * 18, dir, r: 62 });
    this.aoe(lane, u.x + dir * 18, 62, u.dmg * this.mod(u, 'dmg') * this.fireMul, u, { ranged: false, color: 0xff7a3d, flagMul: 3, quiet: true });
    u.alive = false;
    u.deadTimer = 0.05;
    u.hp = 0;
    this.emit({ t: 'death', lane: lane.index, x: u.x, big: false });
  }

  private aoe(
    lane: Lane, x: number, r: number, dmg: number, attacker: UnitInst,
    o: { ranged: boolean; color: number; flagMul?: number; skip?: UnitInst; noFlag?: boolean; pierce?: number; quiet?: boolean },
  ) {
    if (!o.quiet) this.emit({ t: 'aoe', lane: lane.index, x, r, color: o.color });
    for (const e of lane.units.slice()) {
      if (!e.alive || e.side === attacker.side || e === o.skip || e.ghost) continue;
      if (Math.abs(e.x - x) <= r) this.damage(e, dmg, attacker, { ranged: o.ranged, aoe: true, pierce: o.pierce });
    }
    if (!o.noFlag) {
      const fs: Side = attacker.side === 0 ? 1 : 0;
      if (Math.abs(this.flagX[fs] - x) <= r) this.damageFlag(lane, fs, dmg * (o.flagMul ?? 1), attacker.side);
    }
  }

  /** gây sát thương lên đơn vị; trả về lượng sát thương thực */
  private damage(
    v: UnitInst, raw: number, attacker: UnitInst | null,
    o: { ranged?: boolean; aoe?: boolean; big?: boolean; pierce?: number; dot?: boolean; reflected?: boolean; creditSide?: Side } = {},
  ): number {
    if (!v.alive || v.invuln > 0 || v.ghost) return 0;
    if (!o.aoe && !o.dot) {
      if (Math.random() < (this.has(v, 'ninja') ? 0.3 : 0) + v.dodge + this.zoneSum(v, 'dodge')) {
        this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.dodge', color: 0xbfe9ff });
        return 0;
      }
      if (this.has(v, 'phantom') && Math.random() < 0.25) {
        this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.dodge', color: 0xff9ecb });
        return 0;
      }
    }
    let dmg = raw;
    if (this.has(v, 'shield') && o.ranged) dmg *= 0.5;
    const armor = v.armor * this.mod(v, 'armor') * (1 - (o.pierce ?? 0));
    dmg = Math.max(1, (dmg * 100) / (100 + armor));
    // khiên khí hấp thụ trước
    if (v.shield > 0) {
      const ab = Math.min(v.shield, dmg);
      v.shield -= ab;
      dmg -= ab;
      this.emit({ t: 'absorb', lane: v.lane, x: v.x, amount: ab });
      if (dmg <= 0.01) return 0;
    }
    v.hp -= dmg;
    v.hitFlash = 0.12;
    this.emit({ t: 'hit', lane: v.lane, x: v.x, amount: dmg, victimSide: v.side, big: !!o.big });
    // Hấp Huyết: hồi máu theo sát thương gây ra
    if (attacker && attacker.lifesteal > 0 && attacker.alive && !o.dot && !o.reflected) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * attacker.lifesteal);
    }
    // Bất Khuất: lần đầu xuống dưới ngưỡng máu thì có khiên và tăng sức mạnh
    if (v.hp > 0 && !v.lsUsed && v.gs.includes('lastStand') && v.hp < v.maxHp * GS.lastStand.below) {
      v.lsUsed = true;
      v.shield = Math.max(v.shield, v.maxHp * GS.lastStand.shield);
      this.addBuff(v, 'dmg', GS.lastStand.dmg, GS.lastStand.sec);
      this.addBuff(v, 'speed', GS.lastStand.speed, GS.lastStand.sec);
      this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.g.lastStand', color: 0xffc04d, big: true });
      this.emit({ t: 'fx', kind: 'enrage', lane: v.lane, x: v.x, dir: v.side === 0 ? 1 : -1 });
    }
    // Càn Khôn Đại Na Di (30%) và Phản Chấn: phản một phần sát thương cho kẻ đánh gần
    const refl = (this.has(v, 'reflect') ? 0.3 : 0) + v.reflectAdd;
    if (refl > 0 && attacker && attacker.alive && !o.reflected && !o.dot && Math.abs(attacker.x - v.x) <= 90) {
      this.damage(attacker, dmg * refl, v, { aoe: true, pierce: 1, reflected: true });
    }
    if (v.hp <= 0) this.kill(v, attacker, o.creditSide);
    return dmg;
  }

  private kill(v: UnitInst, attacker: UnitInst | null, creditSide?: Side) {
    if (!v.alive) return;
    if (this.has(v, 'revive') && !v.revived) {
      v.revived = true;
      v.hp = v.maxHp * 0.5;
      v.invuln = 1.5;
      this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.revive', color: 0xffe066, big: true });
      this.emit({ t: 'fx', kind: 'revive', lane: v.lane, x: v.x, dir: v.side === 0 ? 1 : -1 });
      return;
    }
    v.alive = false;
    v.deadTimer = 0.7;
    v.moving = false;
    v.stunT = 0;
    this.emit({ t: 'death', lane: v.lane, x: v.x, big: v.def.kind === 'general' || v.def.kind === 'boss' });
    const credit = attacker?.side ?? creditSide;
    if (credit !== undefined && credit !== v.side) {
      this.kills[credit]++;
      const gain = this.bountyOf(v);
      if (gain > 0) {
        this.gold[credit] = Math.min(this.goldCap(credit), this.gold[credit] + gain);
        this.bountyTotal[credit] += gain;
        this.emit({ t: 'bounty', side: credit, lane: v.lane, x: v.x, amount: gain });
      }
    }
    if (attacker?.alive) this.onKill(attacker, v);
    if (v.def.kind === 'boss' && !this.over) {
      this.emit({ t: 'shake', power: 10 });
      this.onBossDown(v);
    }
  }

  private onKill(a: UnitInst, v: UnitInst) {
    if (this.has(a, 'ironWill')) {
      const g = v.def.kind === 'troop' || v.def.kind === 'beast' ? 2 : 5;
      a.armor += g;
      this.emit({ t: 'text', lane: a.lane, x: a.x, key: 'fx.armor', p: { n: g }, color: 0x9ad0ff });
      this.emit({ t: 'fx', kind: 'armor', lane: a.lane, x: a.x, dir: a.side === 0 ? 1 : -1 });
    }
    if (this.has(a, 'revive')) this.healUnit(a, a.maxHp * 0.12);
  }

  private healUnit(u: UnitInst, amount: number) {
    if (!u.alive || u.hp >= u.maxHp) return;
    const real = Math.min(amount, u.maxHp - u.hp);
    u.hp += real;
    this.emit({ t: 'heal', lane: u.lane, x: u.x, amount: real });
  }

  private damageFlag(lane: Lane, flagSide: Side, dmg: number, attackerSide: Side) {
    if (lane.winner !== null) return;
    // màn Boss: boss còn sống thì cờ địch được bảo vệ
    if (flagSide === 1 && this.bossKin.some((k) => k.alive)) dmg *= BOSS_FLAG_GUARD;
    const f = lane.flags[flagSide];
    f.hp -= dmg;
    f.flash = 0.15;
    this.emit({ t: 'flagHit', lane: lane.index, side: flagSide, amount: dmg });
    if (f.hp <= 0) {
      f.hp = 0;
      this.laneWon(lane, attackerSide);
    }
  }

  private laneWon(lane: Lane, winner: Side) {
    if (lane.winner !== null) return;
    lane.winner = winner;
    this.wins[winner]++;
    this.refreshIncome();
    for (const u of lane.units) {
      if (u.alive) {
        u.alive = false;
        u.vanish = true;
        u.deadTimer = 0.9;
      }
    }
    this.emit({ t: 'laneEnd', lane: lane.index, winner });
    this.emit({ t: 'shake', power: 8 });
    if (this.wins[winner] >= this.needWins) this.finish(winner);
  }

  private finish(winner: Side) {
    if (this.over) return;
    this.over = true;
    this.winner = winner;
    this.emit({ t: 'end', winner });
  }

  // ───────────────────────── kỹ năng chủ động ─────────────────────────

  private tickSkills(lane: Lane, u: UnitInst, dt: number) {
    // Thao Trường: hồi chiêu nhanh hơn
    if (this.outposts.length && this.perk(u.side, lane.index, 'drill')) dt *= OUTPOST.drill.skill;
    this.castSkill(lane, u, u.def.skill, dt);
    if (u.alive && u.def.skill2) this.castSkill(lane, u, u.def.skill2, dt);
    if (u.alive && u.form) this.castSkill(lane, u, UNITS[u.form].skill, dt);
    if (u.alive && u.bonusSkills.length) for (const k of u.bonusSkills) if (u.alive) this.castSkill(lane, u, k, dt);
    if (u.alive && u.gs.length) this.castExtra(lane, u, dt);
  }

  // ───────────────────────── kỹ năng mở thêm của tướng ─────────────────────────

  /** áp các kỹ năng thụ động; tướng ta theo cấp thẻ, tướng địch theo độ sâu của trạm */
  private applyGSkills(u: UnitInst) {
    const id = u.def.id;
    u.gs = u.side === 0
      ? extraSkillsAt(id, this.cfg.levels[id] ?? 1)
      : (GENERAL_SKILLS[id] ?? []).slice(0, enemyExtraCount(this.cfg.station.id));
    for (const k of u.gs) {
      switch (k) {
        case 'ironSkin':
          u.maxHp *= 1 + GS.ironSkin.hp;
          u.hp = u.maxHp;
          u.armor += GS.ironSkin.armor;
          break;
        case 'fury': u.dmg *= 1 + GS.fury.dmg; break;
        case 'swift':
          u.speed *= 1 + GS.swift.speed;
          u.dodge += GS.swift.dodge;
          break;
        case 'regen': u.hpRate += GS.regen.rate; break;
        case 'keen': u.pierceAdd = Math.max(u.pierceAdd, GS.keen.pierce); break;
        case 'lifesteal': u.lifesteal += GS.lifesteal.pct; break;
        case 'thornsAura': u.reflectAdd += GS.thornsAura.reflect; break;
        case 'rapid': u.cd /= 1 + GS.rapid.rate; break;
        default: break;
      }
    }
  }

  private castExtra(lane: Lane, u: UnitInst, dt: number) {
    for (const k of u.gs) {
      if (GSKILLS[k].kind !== 'active') continue;
      const cd = (GS[k] as { cd: number }).cd;
      const key = `g_${k}`;
      u.timers[key] = (u.timers[key] ?? cd * 0.5) - dt;
      if (u.timers[key] > 0) continue;
      u.timers[key] = this.castG(lane, u, k) ? cd : 0;
      if (!u.alive) return;
    }
  }

  /** thi triển một kỹ năng chủ động; trả về false nếu chưa có mục tiêu (thử lại ngay khung sau) */
  private castG(lane: Lane, u: UnitInst, k: GSkillId): boolean {
    const dir = (u.side === 0 ? 1 : -1) as 1 | -1;
    const idx = lane.index;
    const dmgMul = this.mod(u, 'dmg');
    const foes = lane.units.filter((e) => e.alive && e.side !== u.side && !e.ghost && e.def.kind !== 'defense');
    const near = (r: number) => foes.filter((e) => Math.abs(e.x - u.x) <= r);
    const say = (color: number) => this.emit({ t: 'text', lane: idx, x: u.x, key: `fx.g.${k}`, color, big: true });
    switch (k) {
      case 'warcry': {
        if (!foes.length) return false;
        u.attackAnim = 0.4;
        for (const a of lane.units) {
          if (a.alive && a.side === u.side && !a.ghost && a.def.kind !== 'defense' && Math.abs(a.x - u.x) <= GS.warcry.range) this.addBuff(a, 'dmg', GS.warcry.dmg, GS.warcry.sec);
        }
        say(0xffd34d);
        this.emit({ t: 'fx', kind: 'warcry', lane: idx, x: u.x, dir });
        return true;
      }
      case 'guard': {
        if (!near(GS.guard.reach).length) return false;
        u.shield = Math.max(u.shield, u.maxHp * GS.guard.shield);
        say(0x9ad0ff);
        this.emit({ t: 'fx', kind: 'shield', lane: idx, x: u.x, dir });
        return true;
      }
      case 'shockwave': {
        if (!near(GS.shockwave.r).length) return false;
        u.attackAnim = 0.4;
        say(0xffb36b);
        this.emit({ t: 'shake', power: 4 });
        this.emit({ t: 'fx', kind: 'rockhit', lane: idx, x: u.x, dir, r: GS.shockwave.r });
        this.aoe(lane, u.x, GS.shockwave.r, u.dmg * GS.shockwave.mul * dmgMul, u, { ranged: false, color: 0xffb36b, quiet: true, noFlag: true });
        for (const e of near(GS.shockwave.r)) if (e.alive) e.stunT = Math.max(e.stunT, GS.shockwave.stun);
        return true;
      }
      case 'mend': {
        const hurt = lane.units.filter((a) => a.alive && a.side === u.side && !a.ghost && a.def.kind !== 'defense' && a.hp < a.maxHp && Math.abs(a.x - u.x) <= GS.mend.r);
        if (!hurt.length) return false;
        u.attackAnim = 0.3;
        for (const a of hurt) this.healUnit(a, a.maxHp * GS.mend.pct);
        this.healUnit(u, u.maxHp * GS.mend.self);
        say(0x7dffb0);
        this.emit({ t: 'fx', kind: 'healwave', lane: idx, x: u.x, dir, r: GS.mend.r });
        return true;
      }
      case 'bladeStorm': {
        const ahead = this.foesAhead(lane, u, GS.bladeStorm.reach);
        if (!ahead.length) return false;
        const c = this.densest(ahead).x;
        u.attackAnim = 0.4;
        say(0xc8a0ff);
        this.emit({ t: 'fx', kind: 'splash', lane: idx, x: c, dir, r: GS.bladeStorm.r });
        this.emit({ t: 'shake', power: 3 });
        this.aoe(lane, c, GS.bladeStorm.r, u.dmg * GS.bladeStorm.mul * dmgMul, u, { ranged: true, color: 0xc8a0ff, quiet: true, noFlag: true, pierce: 0.3 });
        return true;
      }
      case 'dread': {
        const hit = near(GS.dread.r);
        if (!hit.length) return false;
        u.attackAnim = 0.4;
        say(0xb8a0ff);
        this.emit({ t: 'fx', kind: 'frost', lane: idx, x: u.x, dir, r: GS.dread.r });
        for (const e of hit) {
          this.addBuff(e, 'speed', 1 - GS.dread.slow, GS.dread.sec);
          this.addBuff(e, 'rate', 1 - GS.dread.slow * 0.7, GS.dread.sec);
          this.damage(e, u.dmg * GS.dread.mul * dmgMul, u, { aoe: true, pierce: 0.3 });
        }
        return true;
      }
      default:
        return false;
    }
  }

  private endForm(u: UnitInst) {
    if (!u.form) return;
    this.emit({ t: 'fx', kind: 'transform', lane: u.lane, x: u.x, dir: u.side === 0 ? 1 : -1 });
    u.form = null;
    u.formT = 0;
  }

  private castSkill(lane: Lane, u: UnitInst, skill: SkillId, dt: number) {
    const dir = (u.side === 0 ? 1 : -1) as 1 | -1;
    const T = u.timers;
    /** đếm lùi hồi chiêu; true khi sẵn sàng */
    const ready = () => {
      T[skill] = (T[skill] ?? 0) - dt;
      return T[skill] <= 0;
    };
    const idx = lane.index;
    const eFlag = this.flagX[u.side === 0 ? 1 : 0];
    const foesAny = () => lane.units.some((e) => e.alive && e.side !== u.side && !e.ghost && e.def.kind !== 'defense');
    const dmgMul = this.mod(u, 'dmg');

    switch (skill) {
      case 'monk': {
        if (u.shield > 0) break;
        if (!ready()) break;
        u.shield = 80 * u.pow;
        T.monk = 8;
        break;
      }
      case 'palm': {
        if (!ready()) break;
        const reach = 170;
        const flagNear = Math.abs(eFlag - u.x) <= reach;
        if (!this.foesAhead(lane, u, reach).length && !flagNear) break;
        T.palm = 10;
        u.attackAnim = 0.45;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.palm', color: 0xffa94d, big: true });
        this.emit({ t: 'shake', power: 5 });
        this.emit({ t: 'fx', kind: 'palm', lane: idx, x: u.x, dir, r: 190 });
        this.aoe(lane, u.x + dir * 95, 95, 170 * u.pow * dmgMul, u, { ranged: false, color: 0xffa94d, quiet: true });
        break;
      }
      case 'pairHeal': {
        if (!ready()) break;
        const mate = lane.units.find((a) => a.alive && a.side === u.side && a.def.id === 'duongqua' && Math.abs(a.x - u.x) <= 170);
        if (!mate) {
          T.pairHeal = 0;
          break;
        }
        T.pairHeal = 5;
        this.healUnit(u, 50 * u.pow);
        this.healUnit(mate, 50 * u.pow);
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.pair', color: 0xff9ecb });
        this.emit({ t: 'fx', kind: 'pair', lane: idx, x: u.x, x2: mate.x, dir });
        break;
      }
      case 'heal': {
        if (!ready()) break;
        const hurt = lane.units.filter((a) => a.alive && a.side === u.side && Math.abs(a.x - u.x) <= 120 && a.hp < a.maxHp);
        if (!hurt.length) {
          T.heal = 0;
          break;
        }
        T.heal = 2;
        u.attackAnim = 0.3;
        for (const a of hurt) this.healUnit(a, 15 * u.pow);
        this.emit({ t: 'fx', kind: 'healwave', lane: idx, x: u.x, dir, r: 120 });
        break;
      }
      case 'fireAttack': {
        if (!ready()) break;
        const foes = lane.units.filter((e) => e.alive && e.side !== u.side && !e.ghost);
        if (!foes.length) {
          T.fireAttack = 0;
          break;
        }
        const best = this.densest(foes);
        T.fireAttack = 8;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: idx, x: best.x, key: 'fx.fire', color: 0xff6a3d, big: true });
        this.emit({ t: 'shake', power: 4 });
        this.emit({ t: 'fx', kind: 'fire', lane: idx, x: best.x, dir, r: 90 });
        this.aoe(lane, best.x, 90, 130 * u.pow * dmgMul * this.fireMul, u, { ranged: true, color: 0xff6a3d, pierce: 1, noFlag: true, quiet: true });
        break;
      }
      case 'tyrant': {
        if (!u.enraged && u.hp < u.maxHp * 0.5) {
          u.enraged = true;
          u.dmg *= 1.4;
          u.speed *= 1.4;
          this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.enrage', color: 0xff4d4d, big: true });
          this.emit({ t: 'fx', kind: 'enrage', lane: idx, x: u.x, dir });
          this.emit({ t: 'shake', power: 9 });
        }
        if (!ready()) break;
        T.tyrant = 9;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.summon', color: 0xd070ff, big: true });
        this.emit({ t: 'fx', kind: 'summon', lane: idx, x: u.x - dir * 30, dir });
        for (let i = 0; i < 2; i++) this.spawn(UNITS.samurai, u.side, idx, u.x - dir * (20 + i * 22), { noBounty: true });
        break;
      }

      // ── Tôn Ngộ Không: hóa thân thành một tướng bất kỳ, lập tức dùng kỹ năng của tướng đó
      case 'wukong': {
        if (u.form) break;
        if (!ready()) break;
        if (!foesAny() && Math.abs(eFlag - u.x) > 400) {
          T.wukong = 0;
          break;
        }
        const pool = UNIT_LIST.filter((d) => d.kind === 'general' && d.id !== u.def.id);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        T.wukong = 5;
        u.form = pick.id;
        u.formT = 8;
        T[pick.skill] = 0; // sẵn sàng thi triển ngay
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.transform', p: { id: pick.id }, color: 0xffd34d, big: true });
        this.emit({ t: 'fx', kind: 'transform', lane: idx, x: u.x, dir });
        this.emit({ t: 'shake', power: 4 });
        break;
      }

      // ── Tôn Ngộ Không (kỹ năng 2): thổi lông hóa 2 khỉ con, 30% chỉ số, tồn tại 5 giây
      case 'monkeys': {
        if (!ready()) break;
        if (!this.foesAhead(lane, u, 500).length && Math.abs(eFlag - u.x) > 300) {
          T.monkeys = 0;
          break;
        }
        T.monkeys = 20;
        u.attackAnim = 0.4;
        const cub = UNITS.khicon;
        for (let i = 0; i < 2; i++) {
          this.spawn(cub, u.side, idx, u.x + dir * (14 + i * 20), {
            pow: 1,
            hp: u.maxHp * 0.3,
            dmg: u.dmg * dmgMul * 0.3,
            armor: u.armor * this.mod(u, 'armor') * 0.3,
            speed: cub.speed,
            life: 5,
            owner: u.uid,
            noBounty: true,
          });
        }
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.monkeys', color: 0xffd34d, big: true });
        this.emit({ t: 'fx', kind: 'summon', lane: idx, x: u.x + dir * 20, dir });
        break;
      }

      // ── Dương Tiễn: triệu hồi Hao Thiên Khuyển, tự tăng 50% chỉ số trong 5 giây
      case 'erlang': {
        if (!ready()) break;
        const foes = this.foesAhead(lane, u, 500);
        if (!foes.length && Math.abs(eFlag - u.x) > 300) {
          T.erlang = 0;
          break;
        }
        T.erlang = 14;
        u.attackAnim = 0.4;
        for (const a of lane.units) if (a.alive && a.owner === u.uid) a.life = 0.01; // chỉ giữ một con
        const hound = UNITS.haothienkhuyen;
        this.spawn(hound, u.side, idx, u.x - dir * 24, {
          pow: 1,
          hp: u.maxHp * 0.5,
          dmg: u.dmg * dmgMul * 0.5,
          armor: u.armor * this.mod(u, 'armor') * 0.5,
          speed: hound.speed,
          life: 15,
          owner: u.uid,
          noBounty: true,
        });
        for (const stat of ['dmg', 'speed', 'armor', 'rate'] as const) this.addBuff(u, stat, 1.5, 5);
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.erlang', color: 0x9ad0ff, big: true });
        this.emit({ t: 'fx', kind: 'hound', lane: idx, x: u.x, dir });
        break;
      }

      // ── Tào Tháo: quân ta cùng lane +25% sát thương, +15% tốc độ đánh trong 5 giây
      case 'warlord': {
        if (!ready()) break;
        if (!foesAny()) {
          T.warlord = 0;
          break;
        }
        T.warlord = 11;
        u.attackAnim = 0.4;
        for (const a of lane.units) {
          if (!a.alive || a.side !== u.side) continue;
          this.addBuff(a, 'dmg', 1.25, 5);
          this.addBuff(a, 'rate', 1.15, 5);
        }
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.warcry', color: 0xffd34d, big: true });
        this.emit({ t: 'fx', kind: 'warcry', lane: idx, x: u.x, dir });
        break;
      }

      // ── Chu Du: địch quanh mục tiêu bị chậm và nhận sát thương
      case 'melody': {
        if (!ready()) break;
        const foes = this.foesAhead(lane, u, 260);
        if (!foes.length) {
          T.melody = 0;
          break;
        }
        T.melody = 9;
        u.attackAnim = 0.4;
        const c = foes[0].x;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.melody', color: 0xb8a0ff, big: true });
        this.emit({ t: 'fx', kind: 'melody', lane: idx, x: c, dir, r: 140 });
        for (const e of lane.units.slice()) {
          if (!e.alive || e.side === u.side || Math.abs(e.x - c) > 140) continue;
          this.addBuff(e, 'speed', 0.55, 4);
          this.addBuff(e, 'rate', 0.75, 4);
          this.damage(e, 55 * u.pow * dmgMul, u, { aoe: true, pierce: 0.3 });
        }
        break;
      }

      // ── Mã Siêu / Đông Phương Bất Bại: lướt xuyên đội hình
      case 'dash':
      case 'phantom': {
        if (!ready()) break;
        const maxDist = skill === 'dash' ? 260 : 280;
        const foes = this.foesAhead(lane, u, maxDist + 40);
        if (!foes.length) {
          T[skill] = 0;
          break;
        }
        T[skill] = skill === 'dash' ? 8 : 7;
        const limit = eFlag - dir * 35;
        let x1 = u.x + dir * maxDist;
        x1 = dir > 0 ? Math.min(x1, limit) : Math.max(x1, limit);
        const x0 = u.x;
        const lo = Math.min(x0, x1) - 20;
        const hi = Math.max(x0, x1) + 20;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: idx, x: u.x, key: skill === 'dash' ? 'fx.dash' : 'fx.phantom', color: 0xfff0b0, big: true });
        this.emit({ t: 'fx', kind: 'dash', lane: idx, x: x0, x2: x1, dir });
        this.emit({ t: 'shake', power: 3 });
        const base = (skill === 'dash' ? 110 : 90) * u.pow * dmgMul;
        for (const e of lane.units.slice()) {
          if (e.alive && e.side !== u.side && e.x >= lo && e.x <= hi) this.damage(e, base, u, { aoe: true });
        }
        u.x = x1;
        u.travelled += Math.abs(x1 - x0);
        u.atkTimer = 0;
        break;
      }

      // ── Tư Mã Ý: làm 3 địch gần nhất đứng yên 2 giây
      case 'stun': {
        if (!ready()) break;
        const foes = this.foesAhead(lane, u, 280).slice(0, 3);
        if (!foes.length) {
          T.stun = 0;
          break;
        }
        T.stun = 11;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.stun', color: 0xcfd8ff, big: true });
        for (const e of foes) {
          e.stunT = Math.max(e.stunT, 2);
          e.moving = false;
          this.emit({ t: 'fx', kind: 'stun', lane: idx, x: e.x, dir });
        }
        break;
      }

      // ── Quách Tĩnh: khiên khí cho đồng đội
      case 'shieldAura': {
        if (!ready()) break;
        if (!foesAny()) {
          T.shieldAura = 0;
          break;
        }
        T.shieldAura = 12;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.shield', color: 0x9ad0ff, big: true });
        for (const a of lane.units) {
          if (!a.alive || a.side !== u.side || Math.abs(a.x - u.x) > 170) continue;
          a.shield = Math.max(a.shield, 60 * u.pow);
          this.emit({ t: 'fx', kind: 'shield', lane: idx, x: a.x, dir });
        }
        break;
      }

      // ── Kiều Phong: chưởng rồng đẩy lùi
      case 'dragonPalm': {
        if (!ready()) break;
        const foes = this.foesAhead(lane, u, 220);
        if (!foes.length && Math.abs(eFlag - u.x) > 220) {
          T.dragonPalm = 0;
          break;
        }
        T.dragonPalm = 9;
        u.attackAnim = 0.45;
        const cx = u.x + dir * 110;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.dragon', color: 0x7ad0ff, big: true });
        this.emit({ t: 'shake', power: 6 });
        this.emit({ t: 'fx', kind: 'dragon', lane: idx, x: u.x, dir, r: 200 });
        for (const e of lane.units.slice()) {
          if (!e.alive || e.side === u.side || Math.abs(e.x - cx) > 85) continue;
          const was = e.alive;
          this.damage(e, 140 * u.pow * dmgMul, u, { aoe: true });
          if (was && e.alive) this.push(e, 90, dir);
        }
        if (Math.abs(eFlag - cx) <= 85) this.damageFlag(lane, u.side === 0 ? 1 : 0, 140 * u.pow * dmgMul, u.side);
        break;
      }

      // ── Âu Dương Phong: mây độc lên cụm địch
      case 'poisonCloud': {
        if (!ready()) break;
        const foes = lane.units.filter((e) => e.alive && e.side !== u.side && !e.ghost && Math.abs(e.x - u.x) <= 420);
        if (!foes.length) {
          T.poisonCloud = 0;
          break;
        }
        T.poisonCloud = 9;
        u.attackAnim = 0.4;
        const c = this.densest(foes).x;
        this.emit({ t: 'text', lane: idx, x: c, key: 'fx.poison', color: 0x9aff6a, big: true });
        this.emit({ t: 'fx', kind: 'poisoncloud', lane: idx, x: c, dir, r: 100 });
        for (const e of lane.units.slice()) {
          if (!e.alive || e.side === u.side || Math.abs(e.x - c) > 100) continue;
          this.damage(e, 30 * u.pow * dmgMul, u, { aoe: true, pierce: 1 });
          if (e.alive) this.applyPoison(e, 12 * u.pow, 6, u.side);
        }
        break;
      }

      // ── Ngưu Ma Vương: sóng lửa
      case 'inferno': {
        if (!u.enraged && u.hp < u.maxHp * 0.5) {
          u.enraged = true;
          u.dmg *= 1.3;
          this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.enrage2', color: 0xff4d4d, big: true });
          this.emit({ t: 'fx', kind: 'enrage', lane: idx, x: u.x, dir });
          this.emit({ t: 'shake', power: 9 });
        }
        if (!ready()) break;
        const foes = this.foesAhead(lane, u, 270);
        if (!foes.length) {
          T.inferno = 0;
          break;
        }
        T.inferno = 10;
        u.attackAnim = 0.45;
        const cx = u.x + dir * 130;
        this.emit({ t: 'text', lane: idx, x: u.x, key: 'fx.inferno', color: 0xff6a3d, big: true });
        this.emit({ t: 'shake', power: 8 });
        this.emit({ t: 'fx', kind: 'inferno', lane: idx, x: u.x, dir, r: 260 });
        for (const e of lane.units.slice()) {
          if (!e.alive || e.side === u.side || Math.abs(e.x - cx) > 130) continue;
          this.damage(e, 85 * u.pow * dmgMul * this.fireMul, u, { aoe: true });
          if (e.alive) this.applyPoison(e, 10 * u.pow * this.fireMul, 4, u.side);
        }
        if (Math.abs(eFlag - cx) <= 130) this.damageFlag(lane, u.side === 0 ? 1 : 0, 85 * u.pow * dmgMul * this.fireMul, u.side);
        break;
      }
      default:
        break;
    }
  }

  /** hành vi công trình phòng thủ: đứng yên, chặn đường, bắn, gây hiệu ứng vùng */
  private defenseStep(lane: Lane, u: UnitInst, dt: number) {
    const skill = u.def.skill;
    const idx = lane.index;
    const side = u.side;
    const dir = (side === 0 ? 1 : -1) as 1 | -1;
    const T = u.timers;
    const dmg = u.dmg * this.mod(u, 'dmg');
    const foes = lane.units.filter((e) => e.alive && e.side !== side && !e.ghost);
    const inRange = (e: UnitInst, r: number) => Math.abs(e.x - u.x) <= r;
    const nearest = (r: number) => {
      let best: UnitInst | null = null;
      let bd = Infinity;
      for (const e of foes) {
        const d = Math.abs(e.x - u.x);
        // ưu tiên quân hơn công trình
        const w = d + (e.def.kind === 'defense' ? 200 : 0);
        if (d <= r && w < bd) {
          bd = w;
          best = e;
        }
      }
      return best;
    };
    const cdReady = (key: string, cd: number) => {
      T[key] = (T[key] ?? 0) - dt;
      if (T[key] > 0) return false;
      T[key] = cd;
      return true;
    };

    switch (skill) {
      case 'thorns': {
        T.thorns = (T.thorns ?? 0) - dt;
        if (T.thorns > 0) break;
        const hit = foes.filter((e) => inRange(e, u.range));
        if (!hit.length) {
          T.thorns = 0;
          break;
        }
        T.thorns = u.cd;
        this.emit({ t: 'fx', kind: 'thorns', lane: idx, x: u.x, dir, r: u.range });
        for (const e of hit) this.damage(e, dmg, u, { aoe: true, pierce: 0.5 });
        break;
      }
      case 'tower':
      case 'ballista': {
        if (u.atkTimer > 0) break;
        const t = nearest(u.range);
        if (!t) break;
        u.atkTimer = u.cd / this.mod(u, 'rate');
        u.attackAnim = 0.3;
        this.emit({ t: 'proj', lane: idx, from: u.x, to: t.x, kind: 'arrow', y: u.yOff });
        this.damage(t, dmg, u, { ranged: true, pierce: skill === 'ballista' ? 0.4 : 0, big: skill === 'ballista' });
        break;
      }
      case 'catapult': {
        if (u.atkTimer > 0) break;
        const t = nearest(u.range);
        if (!t) break;
        u.atkTimer = u.cd / this.mod(u, 'rate');
        u.attackAnim = 0.3;
        this.emit({ t: 'proj', lane: idx, from: u.x, to: t.x, kind: 'rock', y: u.yOff });
        this.emit({ t: 'fx', kind: 'rockhit', lane: idx, x: t.x, dir, r: 55 });
        this.aoe(lane, t.x, 55, dmg, u, { ranged: true, color: 0xc9a070, quiet: true });
        break;
      }
      case 'trap': {
        const t = foes.find((e) => e.def.kind !== 'defense' && inRange(e, u.range));
        if (!t) break;
        this.emit({ t: 'fx', kind: 'thorns', lane: idx, x: u.x, dir, r: 70 });
        this.emit({ t: 'shake', power: 2.5 });
        for (const e of foes) {
          if (!inRange(e, 70)) continue;
          this.damage(e, dmg, u, { aoe: true });
          if (e.alive && e.def.kind !== 'defense') e.stunT = Math.max(e.stunT, 1.5);
        }
        u.alive = false;
        u.deadTimer = 0.05;
        u.vanish = true;
        break;
      }
      case 'firepit': {
        if (!cdReady('burn', 0.5)) break;
        for (const e of foes) {
          if (e.def.kind !== 'defense' && inRange(e, u.range)) this.applyPoison(e, dmg * this.fireMul, 1.2, side);
        }
        break;
      }
      case 'drum': {
        for (const a of lane.units) {
          if (!a.alive || a.side !== side || a.ghost || a.def.kind === 'defense' || !inRange(a, u.range)) continue;
          this.addBuff(a, 'dmg', 1.1, 0.5);
          this.addBuff(a, 'rate', 1.2, 0.5);
        }
        break;
      }
      case 'altar': {
        if (!cdReady('heal', u.cd)) break;
        let any = false;
        for (const a of lane.units) {
          if (a.alive && a.side === side && !a.ghost && inRange(a, u.range) && a.hp < a.maxHp) {
            this.healUnit(a, u.dmg);
            any = true;
          }
        }
        if (any) this.emit({ t: 'fx', kind: 'healwave', lane: idx, x: u.x, dir, r: u.range });
        break;
      }
      case 'frost': {
        T.frost = (T.frost ?? 0) - dt;
        if (T.frost > 0) break;
        const hit = foes.filter((e) => e.def.kind !== 'defense' && inRange(e, u.range));
        if (!hit.length) {
          T.frost = 0;
          break;
        }
        T.frost = u.cd;
        this.emit({ t: 'fx', kind: 'frost', lane: idx, x: u.x, dir, r: u.range });
        for (const e of hit) {
          this.addBuff(e, 'speed', Math.max(0.2, 1 - 0.45 * this.frostMul), 3);
          this.addBuff(e, 'rate', Math.max(0.3, 1 - 0.25 * this.frostMul), 3);
          this.damage(e, dmg * this.frostMul, u, { aoe: true, pierce: 1 });
        }
        break;
      }
      default:
        break; // wall: chỉ chắn đường
    }
  }

  /** địch đang ở chỗ đông nhất (nhiều mục tiêu nhất trong bán kính 90) */
  private densest(foes: UnitInst[]): UnitInst {
    let best = foes[0];
    let bn = -1;
    for (const e of foes) {
      const n = foes.filter((o) => Math.abs(o.x - e.x) <= 90).length;
      if (n > bn) {
        bn = n;
        best = e;
      }
    }
    return best;
  }
}
